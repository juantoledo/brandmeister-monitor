// Brandmeister Monitor Web App
class BrandmeisterMonitor {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.monitoredTalkgroups = []; // Array of monitored talkgroup IDs
        this.lastTGActivity = {};
        this.totalCalls = 0;
        this.lastActivityTime = null;
        this.callsignAliases = {}; // Store callsign to alias mappings
        this.activeCalls = {}; // Track active calls by SourceCall to update with new info
        this.transmissionGroups = {}; // Group related transmission events
        this.connectionStartTime = Date.now(); // Track session start time
        
        // Configuration (can be made user-configurable later)
        this.config = {
            minDuration: 4, // minimum duration in seconds
            minSilence: 10, // minimum silence in seconds
            verbose: true, // TEMPORARY: Enable for debugging short transmission issues
            monitorAllTalkgroups: false, // if true, monitor all TGs; if false, use monitoredTalkgroup
            primaryColor: '#2563eb', // Primary color for the interface
            // Memory optimization settings
            maxTransmissionGroups: 200, // Maximum transmission groups to keep in memory
            maxLogEntries: 50, // Maximum activity log entries
            cleanupInterval: 60000, // Cleanup interval in milliseconds (1 minute)
            maxTransmissionAge: 3600000, // Maximum age for completed transmissions (1 hour)
            // Performance monitoring settings
            performanceMonitoringInterval: 30000, // Monitor every 30 seconds
            performanceHistoryLimit: 200, // Keep last 200 performance snapshots (100 minutes)
            slowOperationThreshold: 100 // Log operations taking longer than 100ms
        };

        // Memory cleanup timer
        this.cleanupTimer = null;
        
        // Performance monitoring
        this.performanceMonitor = {
            history: [],
            operationTimes: {},
            startTimes: {},
            timer: null
        };

        this.initializeUI();
        this.loadTalkgroupFromStorage();
        this.loadAliasesFromStorage();
    }

    initializeUI() {
        // Get DOM elements
        this.elements = {
            talkgroupInput: document.getElementById('talkgroup'),
            saveTgBtn: document.getElementById('saveTg'),
            connectBtn: document.getElementById('connectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            clearLogsBtn: document.getElementById('clearLogs'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            currentTg: document.getElementById('currentTg'),
            logContainer: document.getElementById('logContainer'),
            activeContainer: document.getElementById('activeContainer'),
            totalCalls: document.getElementById('totalCalls'),
            lastActivity: document.getElementById('lastActivity'),
            sessionDuration: document.getElementById('sessionDuration'),
            activeTGs: document.getElementById('activeTGs'),
            // Settings elements
            minDurationInput: document.getElementById('minDuration'),
            minSilenceInput: document.getElementById('minSilence'),
            verboseCheckbox: document.getElementById('verbose'),
            monitorAllTalkgroupsCheckbox: document.getElementById('monitorAllTalkgroups'),
            colorPalette: document.getElementById('colorPalette'),
            saveSettingsBtn: document.getElementById('saveSettings'),
            resetSettingsBtn: document.getElementById('resetSettings'),
            settingsContainer: document.getElementById('settingsContainer')
        };

        // Bind event listeners
        this.elements.saveTgBtn.addEventListener('click', () => this.saveTalkgroup());
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        
        // Settings event listeners
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Color palette event listeners
        if (this.elements.colorPalette) {
            const colorOptions = this.elements.colorPalette.querySelectorAll('.color-option');
            colorOptions.forEach(option => {
                option.addEventListener('click', () => this.selectColor(option.dataset.color));
            });
        }
        
        // Real-time settings updates for number inputs
        this.elements.minDurationInput.addEventListener('input', () => this.updateConfigFromUI());
        this.elements.minSilenceInput.addEventListener('input', () => this.updateConfigFromUI());
        
        // Real-time settings updates for checkboxes
        this.elements.verboseCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        this.elements.monitorAllTalkgroupsCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        
        // Load saved settings
        this.loadSettings();
        
        // Allow Enter key to save talkgroup
        this.elements.talkgroupInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTalkgroup();
            }
        });

        // Initialize cleanup timer
        this.startMemoryCleanupTimer();
        
        // Initialize performance monitoring
        this.startPerformanceMonitoring();
    }

    // Helper methods for HTML generation to reduce string operations
    createNoActivityElement(message) {
        const element = document.createElement('p');
        element.className = 'no-activity';
        element.textContent = message;
        return element;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Reusable HTML fragments stored to reduce template creation
    _htmlFragments = {
        statusLive: '<div class="active-status">🔴 LIVE</div>',
        statusCompleted: '<div class="active-status" style="color: #4CAF50;">✅ COMPLETED</div>',
        noActivityActive: 'No active transmissions',
        noActivityLog: 'No transmissions yet. Configure a talkgroup and connect to start monitoring.'
    };

    startMemoryCleanupTimer() {
        // Clear any existing timer
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        // Start periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.performMemoryCleanup();
        }, this.config.cleanupInterval);
    }

    // Memory monitoring and reporting
    getMemoryUsage() {
        const usage = {
            transmissionGroups: Object.keys(this.transmissionGroups).length,
            activeCalls: Object.keys(this.activeCalls).length,
            callsignAliases: Object.keys(this.callsignAliases).length,
            activeTransmissions: this.elements.activeContainer.querySelectorAll('.active-transmission').length,
            logEntries: this.elements.logContainer.querySelectorAll('.log-entry').length
        };

        // Add performance memory API if available
        if (performance.memory) {
            usage.heapUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
            usage.heapTotal = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100;
            usage.heapLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100;
        }

        return usage;
    }

    // Structured logging method with Session ID attribute support
    logWithAttributes(level, message, attributes = {}) {
        const timestamp = new Date().toLocaleString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...attributes
        };

        // Format as JSON-like string for console output
        const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        const attributeString = Object.keys(attributes).length > 0 
            ? ` | ${Object.entries(attributes).map(([key, value]) => `${key}=${value}`).join(', ')}`
            : '';
        
        if (level === 'error') {
            console.error(formattedMessage + attributeString);
        } else {
            console.log(formattedMessage + attributeString);
        }
    }

    // Convenience methods for different log levels
    logDebug(message, attributes = {}) {
        if (this.config.verbose) {
            this.logWithAttributes('debug', message, attributes);
        }
    }

    logInfo(message, attributes = {}) {
        this.logWithAttributes('info', message, attributes);
    }

    logError(message, attributes = {}) {
        this.logWithAttributes('error', message, attributes);
    }

    // Performance monitoring methods
    startPerformanceTimer(operationName) {
        this.performanceMonitor.startTimes[operationName] = performance.now();
    }

    endPerformanceTimer(operationName, metadata = {}) {
        const startTime = this.performanceMonitor.startTimes[operationName];
        if (startTime) {
            const duration = performance.now() - startTime;
            delete this.performanceMonitor.startTimes[operationName];
            
            // Track operation times for trending
            if (!this.performanceMonitor.operationTimes[operationName]) {
                this.performanceMonitor.operationTimes[operationName] = [];
            }
            this.performanceMonitor.operationTimes[operationName].push({
                duration,
                timestamp: Date.now(),
                metadata
            });
            
            // Limit history per operation
            if (this.performanceMonitor.operationTimes[operationName].length > 100) {
                this.performanceMonitor.operationTimes[operationName].shift();
            }
            
            // Log slow operations
            if (duration > this.config.slowOperationThreshold) {
                this.logDebug('Slow operation detected', {
                    operation: operationName,
                    duration: `${duration.toFixed(2)}ms`,
                    threshold: `${this.config.slowOperationThreshold}ms`,
                    ...metadata
                });
            }
            
            return duration;
        }
        return null;
    }

    startPerformanceMonitoring() {
        // Clear any existing timer
        if (this.performanceMonitor.timer) {
            clearInterval(this.performanceMonitor.timer);
        }
        
        // Start periodic performance monitoring
        this.performanceMonitor.timer = setInterval(() => {
            this.capturePerformanceSnapshot();
        }, this.config.performanceMonitoringInterval);
    }

    capturePerformanceSnapshot() {
        const usage = this.getMemoryUsage();
        const snapshot = {
            timestamp: Date.now(),
            memory: usage,
            performance: {
                jsHeapSizeUsed: performance.memory ? performance.memory.usedJSHeapSize : null,
                jsHeapSizeTotal: performance.memory ? performance.memory.totalJSHeapSize : null,
                jsHeapSizeLimit: performance.memory ? performance.memory.jsHeapSizeLimit : null
            },
            domElements: {
                activeTransmissions: document.querySelectorAll('.active-transmission').length,
                logEntries: document.querySelectorAll('.log-entry').length,
                totalElements: document.getElementsByTagName('*').length
            },
            operationStats: this.getOperationStats()
        };
        
        this.performanceMonitor.history.push(snapshot);
        
        // Limit history size
        if (this.performanceMonitor.history.length > this.config.performanceHistoryLimit) {
            this.performanceMonitor.history.shift();
        }
        
        // Check for performance degradation
        this.checkPerformanceTrends(snapshot);
    }

    getOperationStats() {
        const stats = {};
        for (const [operation, times] of Object.entries(this.performanceMonitor.operationTimes)) {
            if (times.length > 0) {
                const recentTimes = times.slice(-10); // Last 10 operations
                const avg = recentTimes.reduce((sum, t) => sum + t.duration, 0) / recentTimes.length;
                const max = Math.max(...recentTimes.map(t => t.duration));
                const min = Math.min(...recentTimes.map(t => t.duration));
                
                stats[operation] = {
                    count: times.length,
                    recentAvg: avg,
                    recentMax: max,
                    recentMin: min
                };
            }
        }
        return stats;
    }

    checkPerformanceTrends(currentSnapshot) {
        if (this.performanceMonitor.history.length < 10) return;
        
        const history = this.performanceMonitor.history;
        const oldSnapshot = history[Math.max(0, history.length - 10)]; // 10 snapshots ago
        
        // Emergency resource limits - prevent runaway memory usage
        this.enforceEmergencyLimits(currentSnapshot);
        
        // Check memory growth
        if (currentSnapshot.memory.transmissionGroups > oldSnapshot.memory.transmissionGroups + 20) {
            this.logDebug('Memory growth detected', {
                component: 'transmissionGroups',
                oldCount: oldSnapshot.memory.transmissionGroups,
                newCount: currentSnapshot.memory.transmissionGroups,
                growth: currentSnapshot.memory.transmissionGroups - oldSnapshot.memory.transmissionGroups
            });
        }
        
        // Check DOM element growth
        if (currentSnapshot.domElements.totalElements > oldSnapshot.domElements.totalElements + 50) {
            this.logDebug('DOM growth detected', {
                component: 'totalElements',
                oldCount: oldSnapshot.domElements.totalElements,
                newCount: currentSnapshot.domElements.totalElements,
                growth: currentSnapshot.domElements.totalElements - oldSnapshot.domElements.totalElements
            });
        }
        
        // Check heap size growth
        if (currentSnapshot.performance.jsHeapSizeUsed && oldSnapshot.performance.jsHeapSizeUsed) {
            const heapGrowth = currentSnapshot.performance.jsHeapSizeUsed - oldSnapshot.performance.jsHeapSizeUsed;
            if (heapGrowth > 10 * 1024 * 1024) { // 10MB growth
                this.logDebug('Heap memory growth detected', {
                    component: 'jsHeapSize',
                    oldSize: `${(oldSnapshot.performance.jsHeapSizeUsed / 1024 / 1024).toFixed(2)}MB`,
                    newSize: `${(currentSnapshot.performance.jsHeapSizeUsed / 1024 / 1024).toFixed(2)}MB`,
                    growth: `${(heapGrowth / 1024 / 1024).toFixed(2)}MB`
                });
            }
        }
    }

    getPerformanceReport() {
        const history = this.performanceMonitor.history;
        if (history.length === 0) return null;
        
        const current = history[history.length - 1];
        const start = history[0];
        const duration = current.timestamp - start.timestamp;
        
        return {
            monitoring: {
                duration: `${(duration / 1000 / 60).toFixed(1)} minutes`,
                snapshots: history.length
            },
            current: current,
            trends: {
                memoryGrowth: this.calculateTrend(history, 'memory.transmissionGroups'),
                domGrowth: this.calculateTrend(history, 'domElements.totalElements'),
                heapGrowth: this.calculateTrend(history, 'performance.jsHeapSizeUsed')
            },
            operations: this.getOperationStats()
        };
    }

    calculateTrend(history, path) {
        if (history.length < 2) return null;
        
        const getValue = (obj, path) => {
            return path.split('.').reduce((o, p) => o && o[p], obj);
        };
        
        const values = history.map(h => getValue(h, path)).filter(v => v != null);
        if (values.length < 2) return null;
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = last - first;
        const percentChange = first > 0 ? ((change / first) * 100) : 0;
        
        return {
            initial: first,
            current: last,
            change,
            percentChange: percentChange.toFixed(2) + '%'
        };
    }

    // Log memory usage for debugging (only in verbose mode)
    logMemoryUsage() {
        if (!this.config.verbose) return;
        
        const usage = this.getMemoryUsage();
        this.logInfo('Memory Usage Report', {
            transmissionGroups: usage.transmissionGroups,
            activeCalls: usage.activeCalls,
            callsignAliases: usage.callsignAliases,
            activeTransmissions: usage.activeTransmissions,
            logEntries: usage.logEntries,
            heapUsedMB: usage.heapUsed,
            heapTotalMB: usage.heapTotal,
            heapLimitMB: usage.heapLimit
        });
    }

    enforceEmergencyLimits(snapshot) {
        let emergencyCleanup = false;
        
        // Emergency limit: Too many transmission groups (potential memory leak)
        if (snapshot.memory.transmissionGroups > this.config.maxTransmissionGroups * 2) {
            this.logError('Emergency: Excessive transmission groups detected', {
                count: snapshot.memory.transmissionGroups,
                limit: this.config.maxTransmissionGroups * 2,
                action: 'forcing aggressive cleanup'
            });
            this.performEmergencyCleanup('transmissionGroups');
            emergencyCleanup = true;
        }
        
        // Emergency limit: Too many DOM elements
        if (snapshot.domElements.totalElements > 5000) {
            this.logError('Emergency: Excessive DOM elements detected', {
                count: snapshot.domElements.totalElements,
                limit: 5000,
                action: 'forcing DOM cleanup'
            });
            this.performEmergencyCleanup('dom');
            emergencyCleanup = true;
        }
        
        // Emergency limit: Heap size approaching limit
        if (snapshot.performance.jsHeapSizeUsed && snapshot.performance.jsHeapSizeLimit) {
            const heapUsagePercent = (snapshot.performance.jsHeapSizeUsed / snapshot.performance.jsHeapSizeLimit) * 100;
            if (heapUsagePercent > 85) {
                this.logError('Emergency: Heap usage critical', {
                    usagePercent: heapUsagePercent.toFixed(2) + '%',
                    usedMB: (snapshot.performance.jsHeapSizeUsed / 1024 / 1024).toFixed(2),
                    limitMB: (snapshot.performance.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
                    action: 'forcing memory cleanup'
                });
                this.performEmergencyCleanup('memory');
                emergencyCleanup = true;
            }
        }
        
        if (emergencyCleanup) {
            // Force garbage collection if available (Chrome DevTools)
            if (window.gc) {
                try {
                    window.gc();
                    this.logDebug('Forced garbage collection executed');
                } catch (e) {
                    this.logDebug('Garbage collection not available');
                }
            }
        }
    }

    performEmergencyCleanup(type) {
        switch (type) {
            case 'transmissionGroups':
                // Keep only the most recent 50 transmission groups
                const keys = Object.keys(this.transmissionGroups);
                const sortedGroups = keys
                    .map(key => ({ key, group: this.transmissionGroups[key] }))
                    .sort((a, b) => (b.group.startTime || 0) - (a.group.startTime || 0));
                
                // Remove all but the 50 most recent
                const toKeep = sortedGroups.slice(0, 50);
                this.transmissionGroups = {};
                toKeep.forEach(item => {
                    this.transmissionGroups[item.key] = item.group;
                });
                
                this.logInfo('Emergency cleanup: transmission groups', {
                    originalCount: keys.length,
                    keptCount: toKeep.length,
                    removedCount: keys.length - toKeep.length
                });
                break;
                
            case 'dom':
                // Remove oldest log entries aggressively
                const logEntries = document.querySelectorAll('.log-entry');
                const keepCount = Math.min(20, this.config.maxLogEntries);
                for (let i = 0; i < logEntries.length - keepCount; i++) {
                    logEntries[i].remove();
                }
                
                // Remove any orphaned elements
                this.performDOMCleanup();
                
                this.logInfo('Emergency cleanup: DOM elements', {
                    removedLogEntries: Math.max(0, logEntries.length - keepCount),
                    remainingLogEntries: keepCount
                });
                break;
                
            case 'memory':
                // Comprehensive emergency cleanup
                this.performEmergencyCleanup('transmissionGroups');
                this.performEmergencyCleanup('dom');
                this.activeCalls = {};
                this.performanceMonitor.operationTimes = {};
                this.performanceMonitor.history = this.performanceMonitor.history.slice(-20);
                
                this.logInfo('Emergency cleanup: comprehensive memory cleanup executed');
                break;
        }
    }

    // Console interface for debugging performance issues
    getPerformanceDebugInfo() {
        return {
            report: this.getPerformanceReport(),
            config: {
                maxTransmissionGroups: this.config.maxTransmissionGroups,
                maxLogEntries: this.config.maxLogEntries,
                cleanupInterval: this.config.cleanupInterval,
                performanceMonitoringInterval: this.config.performanceMonitoringInterval,
                slowOperationThreshold: this.config.slowOperationThreshold
            },
            currentState: {
                transmissionGroups: Object.keys(this.transmissionGroups).length,
                activeCalls: Object.keys(this.activeCalls).length,
                callsignAliases: Object.keys(this.callsignAliases).length,
                domElements: document.querySelectorAll('*').length,
                activeTransmissions: document.querySelectorAll('.active-transmission').length,
                logEntries: document.querySelectorAll('.log-entry').length
            }
        };
    }

    forceCleanup() {
        this.logInfo('Manual cleanup forced');
        this.performMemoryCleanup();
        return this.getPerformanceDebugInfo();
    }

    // Cleanup method called before page unload
    cleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        if (this.performanceMonitor.timer) {
            clearInterval(this.performanceMonitor.timer);
            this.performanceMonitor.timer = null;
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // Clear all memory references
        this.transmissionGroups = {};
        this.activeCalls = {};
        this.callsignAliases = {};
    }

    loadTalkgroupFromStorage() {
        const savedTg = localStorage.getItem('brandmeister_talkgroup');
        const monitorAll = localStorage.getItem('brandmeister_monitor_all') === 'true';
        
        if (savedTg) {
            if (savedTg === 'all' || monitorAll) {
                this.monitoredTalkgroups = [];
                this.config.monitorAllTalkgroups = true;
                this.elements.talkgroupInput.value = 'all';
                this.elements.currentTg.textContent = 'All Talkgroups';
            } else {
                // Parse comma-separated list of talkgroup IDs
                const tgList = savedTg.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
                this.monitoredTalkgroups = tgList;
                this.config.monitorAllTalkgroups = false;
                this.elements.talkgroupInput.value = savedTg;
                
                const displayText = tgList.length === 1 ? 
                    `TG ${tgList[0]}` : 
                    `TGs: ${tgList.join(', ')}`;
                this.elements.currentTg.textContent = displayText;
            }
        }
    }

    loadAliasesFromStorage() {
        const savedAliases = localStorage.getItem('brandmeister_aliases');
        if (savedAliases) {
            try {
                this.callsignAliases = JSON.parse(savedAliases);
            } catch (error) {
                this.logError('Error loading aliases from storage', { error: error.message });
                this.callsignAliases = {};
            }
        }
    }

    saveAliasToStorage(callsign, alias) {
        if (callsign && alias && alias.trim() !== '') {
            this.callsignAliases[callsign] = alias.trim();
            localStorage.setItem('brandmeister_aliases', JSON.stringify(this.callsignAliases));
        }
    }

    getStoredAlias(callsign) {
        return this.callsignAliases[callsign] || '';
    }

    saveTalkgroup() {
        const tgValue = this.elements.talkgroupInput.value.trim();
        if (tgValue === '' || tgValue.toLowerCase() === 'all') {
            // Monitor all talkgroups
            this.monitoredTalkgroups = [];
            this.config.monitorAllTalkgroups = true;
            localStorage.setItem('brandmeister_talkgroup', 'all');
            localStorage.setItem('brandmeister_monitor_all', 'true');
            this.elements.currentTg.textContent = 'All Talkgroups';
            // System message removed - only log transmissions
        } else if (tgValue) {
            // Parse comma-separated list of talkgroup IDs
            const tgList = tgValue.split(',').map(id => id.trim()).filter(id => id !== '');
            const validTalkgroups = [];
            
            for (const tgStr of tgList) {
                if (!isNaN(tgStr) && parseInt(tgStr) > 0) {
                    validTalkgroups.push(parseInt(tgStr));
                } else {
                    alert(`Invalid talkgroup ID: "${tgStr}". Please enter valid numeric talkgroup IDs separated by commas (e.g., "214,220,235") or "all" to monitor all talkgroups`);
                    return; // Exit early if invalid input
                }
            }
            
            if (validTalkgroups.length === 0) {
                alert('Please enter at least one valid talkgroup ID or "all" to monitor all talkgroups');
                return;
            }
            
            // Monitor specific talkgroups
            this.monitoredTalkgroups = validTalkgroups;
            this.config.monitorAllTalkgroups = false;
            localStorage.setItem('brandmeister_talkgroup', validTalkgroups.join(','));
            localStorage.setItem('brandmeister_monitor_all', 'false');
            
            const displayText = validTalkgroups.length === 1 ? 
                `TG ${validTalkgroups[0]}` : 
                `TGs: ${validTalkgroups.join(', ')}`;
            this.elements.currentTg.textContent = displayText;
            
            const logText = validTalkgroups.length === 1 ? 
                `Monitoring talkgroup ${validTalkgroups[0]}` : 
                `Monitoring talkgroups: ${validTalkgroups.join(', ')}`;
            // System message removed - only log transmissions
        } else {
            alert('Please enter valid talkgroup IDs separated by commas (e.g., "214,220,235") or "all" to monitor all talkgroups');
            return; // Exit early if invalid input
        }
        
        // Clear active transmissions when talkgroup changes
        this.clearActiveTransmissions();
        // System message removed - only log transmissions
        
        // Auto-save settings to ensure consistency
        this.saveSettings();
        
        // Log the talkgroup change with structured logging
        this.logInfo('Talkgroup configuration updated', {
            monitorAllTalkgroups: this.config.monitorAllTalkgroups,
            talkgroups: this.config.monitorAllTalkgroups ? 'all' : this.monitoredTalkgroups.join(','),
            action: 'active_transmissions_cleared'
        });
    }

    connect() {
        if (this.isConnected) return;

        // System message removed - only log transmissions
        
        try {
            // Initialize Socket.IO connection
            this.socket = io('https://api.brandmeister.network', {
                path: '/lh/socket.io',
                transports: ['websocket']
            });

            // Connection event handlers
            this.socket.on('connect', () => {
                this.onConnect();
            });

            this.socket.on('disconnect', () => {
                this.onDisconnect();
            });

            this.socket.on('mqtt', (data) => {
                this.onMqttMessage(data);
            });

            this.socket.on('connect_error', (error) => {
                const timestamp = new Date().toLocaleString();
                console.error(`[${timestamp}] Connection error:`, error);
                // System error message removed - only log transmissions
                this.updateConnectionStatus(false);
            });

        } catch (error) {
            const timestamp = new Date().toLocaleString();
            console.error(`[${timestamp}] Socket initialization error:`, error);
            // System error message removed - only log transmissions
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.onDisconnect();
    }

    onConnect() {
        this.logInfo('Connected to Brandmeister network', { connectionStatus: 'established' });
        this.isConnected = true;
        this.updateConnectionStatus(true);
        // System message removed - only log transmissions
        
        this.elements.connectBtn.disabled = true;
        this.elements.disconnectBtn.disabled = false;
    }

    onDisconnect() {
        this.logInfo('Disconnected from Brandmeister network', { connectionStatus: 'lost' });
        this.isConnected = false;
        this.updateConnectionStatus(false);
        // System message removed - only log transmissions
        
        // Cleanup memory when disconnected
        this.performMemoryCleanup();
        
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
    }

    onMqttMessage(data) {
        this.startPerformanceTimer('messageProcessing');
        
        try {
            const call = JSON.parse(data.payload);
            
            // PRIMARY FILTER: Extract talkgroup and event info from actual data
            const tg = call.DestinationID;
            const sessionID = call.SessionID; // Use SessionID as unique identifier
            const event = call.Event;
            const callsign = call.SourceCall;
            
            
            // Only proceed if we should monitor this talkgroup
            if (!this.config.monitorAllTalkgroups && this.monitoredTalkgroups.length > 0 && !this.monitoredTalkgroups.includes(tg)) {
                if (this.config.verbose) {
                    //console.log(`Skipping TG ${tg} - only monitoring TGs: ${this.monitoredTalkgroups.join(', ')}`);
                }
                this.endPerformanceTimer('messageProcessing', { result: 'filtered_out', tg, sessionID });
                return;
            }

            if (this.config.verbose) {
                this.logDebug('Received call data', { 
                    sessionID, 
                    event, 
                    tg, 
                    callsign, 
                    startTime: call.Start, 
                    stopTime: call.Stop 
                });
                console.log(`[${new Date().toLocaleString()}] Raw call data:`, call);
            }


            const startTime = call.Start;
            const stopTime = call.Stop;
            const talkerAlias = call.TalkerAlias || '';
            const sourceID = call.SourceID ? String(call.SourceID) : '';
            const contextID = call.ContextID || '';
            const linkName = call.LinkName || '';
            const linkType = call.LinkType || '';
            const sessionType = call.SessionType || '';
            const now = Math.floor(Date.now() / 1000);

            // First, always check if this message contains alias information and save it
            if (talkerAlias && talkerAlias.trim() !== '') {
                this.saveAliasToStorage(callsign, talkerAlias.trim());
                if (this.config.verbose) {
                    this.logDebug('Received alias', {
                        sessionID,
                        callsign,
                        tg,
                        alias: talkerAlias.trim()
                    });
                }
            }

            // Use SessionID as the primary key for tracking transmissions
            const sessionKey = sessionID;
            let notify = false;

            if (event === 'Session-Stop' && callsign !== '') {
                // Process all Session-Stop events regardless of alias availability
                
                const duration = stopTime - startTime;

                // Log duration info for debugging
                if (this.config.verbose) {
                    this.logDebug('Session-Stop received - IMMEDIATELY removing from active display', {
                        sessionID,
                        callsign,
                        tg,
                        duration: duration.toFixed(1) + 's'
                    });
                }

                // Cancel any pending display timer for this session to prevent race conditions
                if (this.transmissionGroups[sessionKey] && this.transmissionGroups[sessionKey].displayTimer) {
                    clearTimeout(this.transmissionGroups[sessionKey].displayTimer);
                    this.transmissionGroups[sessionKey].displayTimer = null;
                    if (this.config.verbose) {
                        this.logDebug('Cancelled pending display timer', {
                            sessionID,
                            callsign,
                            reason: 'Session-Stop received'
                        });
                    }
                }

                // IMMEDIATELY remove from active display on Session-Stop (regardless of duration)
                this.removeActiveTransmission(sessionKey);
                
                // Only proceed with logging if the key down has been long enough
                if (duration >= this.config.minDuration) {
                    notify = true;
                    // Update the transmission group with completion info
                    this.updateTransmissionGroupComplete(sessionKey, call);
                    // Update the UI to show completion in activity log
                    this.createOrUpdateTransmissionSession(sessionKey, call, 'stop');
                    
                    if (this.config.verbose) {
                        this.logDebug('Session-Stop processing normally', {
                            sessionID,
                            callsign,
                            tg,
                            duration: duration.toFixed(1) + 's',
                            minDuration: this.config.minDuration + 's',
                            action: 'adding to activity log'
                        });
                    }
                } else {
                    // Just clean up short transmissions without logging them
                    if (this.transmissionGroups[sessionKey]) {
                        if (this.config.verbose) {
                            this.logDebug('Session-Stop deleting short transmission', {
                                sessionID,
                                callsign,
                                tg,
                                duration: duration.toFixed(1) + 's',
                                minDuration: this.config.minDuration + 's',
                                previousStatus: this.transmissionGroups[sessionKey].status,
                                action: 'deleting group'
                            });
                        }
                        delete this.transmissionGroups[sessionKey];
                    }
                    
                    if (this.config.verbose) {
                        this.logInfo('Ignored short transmission', {
                            sessionID,
                            callsign,
                            tg,
                            duration: duration.toFixed(1) + 's',
                            minDuration: this.config.minDuration + 's',
                            action: 'removed from active display'
                        });
                    }
                }
            } else if (event === 'Session-Start') {
                // Create transmission session in memory but delay showing in UI
                this.createOrUpdateTransmissionSession(sessionKey, call, 'start');
                
                // Delay showing active transmission to avoid displaying very short ones
                // Use the configured minimum duration as the delay (in seconds)
                const delayMs = this.config.minDuration * 1000;
                
                if (this.config.verbose) {
                    this.logDebug('Session-Start delaying display', {
                        sessionID,
                        callsign,
                        tg,
                        delaySeconds: this.config.minDuration,
                        reason: 'avoid displaying very short transmissions'
                    });
                }
                
                // Store timer reference for potential cancellation
                const displayTimer = setTimeout(() => {
                    // Only show if transmission is still active (not completed/cleared)
                    const group = this.transmissionGroups[sessionKey];
                    if (group && group.status === 'started') {
                        // Double-check that this SessionID is still the active one for this talkgroup
                        // (prevents showing old transmissions if multiple rapid starts occurred)
                        const currentActiveEntries = this.elements.activeContainer.querySelectorAll('.active-transmission');
                        let talkgroupHasActiveTransmission = false;
                        
                        for (const entry of currentActiveEntries) {
                            const activeSessionKey = entry.getAttribute('data-session-key');
                            const activeGroup = this.transmissionGroups[activeSessionKey];
                            if (activeGroup && activeGroup.tg === tg) {
                                talkgroupHasActiveTransmission = true;
                                break;
                            }
                        }
                        
                        // Only show if no other transmission is already active on this talkgroup
                        if (!talkgroupHasActiveTransmission) {
                            if (this.config.verbose) {
                                this.logDebug('Delayed display triggered - showing in UI', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    status: 'transmission still active',
                                    action: 'showing in UI'
                                });
                            }
                            this.createOrUpdateTransmissionGroup(sessionKey, call);
                        } else {
                            if (this.config.verbose) {
                                this.logDebug('Delayed display triggered - NOT showing', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    reason: 'another transmission already active on talkgroup',
                                    action: 'not showing'
                                });
                            }
                        }
                    } else {
                        if (this.config.verbose) {
                            const statusInfo = group ? `status: ${group.status}` : 'group deleted';
                            this.logDebug('Delayed display triggered - transmission no longer active', {
                                sessionID,
                                callsign,
                                tg,
                                currentStatus: statusInfo,
                                action: 'not showing in UI'
                            });
                        }
                    }
                }, delayMs);
                
                // Store timer reference in the group for potential cancellation
                if (this.transmissionGroups[sessionKey]) {
                    this.transmissionGroups[sessionKey].displayTimer = displayTimer;
                }
                
            } else if (event === 'Session-Update') {
                // Update the transmission session
                this.createOrUpdateTransmissionSession(sessionKey, call, 'update');
                
            } else {
                // Handle any other message types that might contain alias updates
                // For SessionID-based tracking, use the sessionKey
                
                // If this message just provided an alias and we have a SessionID-based transmission waiting for it
                if (talkerAlias && talkerAlias.trim() !== '' && sessionID && this.transmissionGroups[sessionKey]) {
                    if (this.config.verbose) {
                        this.logDebug('Alias update for SessionID-based transmission', {
                            sessionID,
                            callsign,
                            tg,
                            alias: talkerAlias.trim(),
                            groupStatus: this.transmissionGroups[sessionKey].status,
                            startTime: this.transmissionGroups[sessionKey].startTime
                        });
                    }
                    
                    // Update the transmission group with alias info
                    this.transmissionGroups[sessionKey].alias = talkerAlias.trim();
                    
                    // Only show in UI if this is an active transmission that should be displayed
                    // Don't show if it's a short transmission that shouldn't be displayed
                    const group = this.transmissionGroups[sessionKey];
                    if (group && group.status === 'started') {
                        // Only show active transmissions that have been running long enough OR have passed the delay period
                        const now = Math.floor(Date.now() / 1000);
                        const elapsedTime = now - group.startTime;
                        if (elapsedTime >= this.config.minDuration) {
                            if (this.config.verbose) {
                                this.logDebug('Showing alias-updated transmission', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    elapsedTime: elapsedTime + 's',
                                    minDuration: this.config.minDuration + 's',
                                    action: 'displaying in UI'
                                });
                            }
                            this.createOrUpdateTransmissionGroup(sessionKey, call);
                        } else {
                            if (this.config.verbose) {
                                this.logDebug('NOT showing alias-updated transmission', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    elapsedTime: elapsedTime + 's',
                                    minDuration: this.config.minDuration + 's',
                                    reason: 'transmission too short'
                                });
                            }
                        }
                    } else if (group && group.status === 'completed') {
                        // Only show completed transmissions that meet the duration requirement
                        const duration = group.stopTime - group.startTime;
                        if (duration >= this.config.minDuration) {
                            if (this.config.verbose) {
                                this.logDebug('Showing alias-updated COMPLETED transmission', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    duration: duration.toFixed(1) + 's',
                                    minDuration: this.config.minDuration + 's',
                                    status: 'completed',
                                    action: 'displaying in UI'
                                });
                            }
                            this.createOrUpdateTransmissionGroup(sessionKey, call);
                        } else {
                            if (this.config.verbose) {
                                this.logDebug('NOT showing alias-updated COMPLETED transmission', {
                                    sessionID,
                                    callsign,
                                    tg,
                                    duration: duration.toFixed(1) + 's',
                                    minDuration: this.config.minDuration + 's',
                                    status: 'completed',
                                    reason: 'transmission too short'
                                });
                            }
                        }
                    }
                }
                
                // Also handle legacy callKey-based tracking for backward compatibility
                const callKey = `${callsign}_${startTime}`;
                
                // If this message just provided an alias and we have a tracked call waiting for it
                if (talkerAlias && talkerAlias.trim() !== '' && this.activeCalls[callKey] && !this.activeCalls[callKey].initialLogEntry) {
                    if (this.config.verbose) {
                        const timestamp = new Date().toLocaleString();
                        console.log(`[${timestamp}] DEBUG: Legacy alias update for callKey-based transmission ${callsign} with alias: ${talkerAlias.trim()}`);
                    }
                    
                    // Update the transmission group with alias info
                    if (this.transmissionGroups[callKey]) {
                        this.transmissionGroups[callKey].alias = talkerAlias.trim();
                        
                        // Apply same duration filtering as above
                        const group = this.transmissionGroups[callKey];
                        if (group && group.status === 'started') {
                            const now = Math.floor(Date.now() / 1000);
                            const elapsedTime = now - group.startTime;
                            if (elapsedTime >= this.config.minDuration) {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: Showing legacy alias-updated transmission for ${callsign} - elapsed time ${elapsedTime}s >= ${this.config.minDuration}s`);
                                }
                                this.createOrUpdateTransmissionGroup(callKey, call);
                            } else {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: NOT showing legacy alias-updated transmission for ${callsign} - elapsed time ${elapsedTime}s < ${this.config.minDuration}s`);
                                }
                            }
                        } else if (group && group.status === 'completed') {
                            const duration = group.stopTime - group.startTime;
                            if (duration >= this.config.minDuration) {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: Showing legacy alias-updated COMPLETED transmission for ${callsign} - duration ${duration.toFixed(1)}s >= ${this.config.minDuration}s`);
                                }
                                this.createOrUpdateTransmissionGroup(callKey, call);
                            } else {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: NOT showing legacy alias-updated COMPLETED transmission for ${callsign} - duration ${duration.toFixed(1)}s < ${this.config.minDuration}s`);
                                }
                            }
                        }
                    }
                }
                
                // Also update any existing transmission group if alias information arrives
                if (this.transmissionGroups[callKey] && talkerAlias && talkerAlias.trim() !== '') {
                    this.transmissionGroups[callKey].alias = talkerAlias.trim();
                    if (this.transmissionGroups[callKey].logEntry) {
                        // Apply duration filtering before updating display
                        const group = this.transmissionGroups[callKey];
                        if (group.status === 'completed') {
                            const duration = group.stopTime - group.startTime;
                            if (duration >= this.config.minDuration) {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: Updating display for completed transmission with alias - duration ${duration.toFixed(1)}s >= ${this.config.minDuration}s`);
                                }
                                this.updateTransmissionGroupDisplay(callKey);
                            } else {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: NOT updating display for short completed transmission with alias - duration ${duration.toFixed(1)}s < ${this.config.minDuration}s`);
                                }
                            }
                        } else if (group.status === 'started') {
                            const now = Math.floor(Date.now() / 1000);
                            const elapsedTime = now - group.startTime;
                            if (elapsedTime >= this.config.minDuration) {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: Updating display for active transmission with alias - elapsed ${elapsedTime}s >= ${this.config.minDuration}s`);
                                }
                                this.updateTransmissionGroupDisplay(callKey);
                            } else {
                                if (this.config.verbose) {
                                    const timestamp = new Date().toLocaleString();
                                    console.log(`[${timestamp}] DEBUG: NOT updating display for short active transmission with alias - elapsed ${elapsedTime}s < ${this.config.minDuration}s`);
                                }
                            }
                        }
                    }
                }
            }
            
            this.endPerformanceTimer('messageProcessing', { 
                result: 'processed', 
                event, 
                sessionID, 
                tg, 
                callsign 
            });

        } catch (error) {
            this.endPerformanceTimer('messageProcessing', { result: 'error' });
            const timestamp = new Date().toLocaleString();
            console.error(`[${timestamp}] Error processing MQTT message:`, error);
        }
    }

    createOrUpdateTransmissionGroup(callKey, call) {
        const group = this.transmissionGroups[callKey];
        if (!group) {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionGroup called for ${callKey} but no group found`);
            }
            return;
        }

        const callsign = group.callsign;
        const sourceName = group.sourceName;
        const sourceID = group.sourceID;
        const tg = group.tg;
        const alias = group.alias;
        
        if (this.config.verbose) {
            const timestamp = new Date().toLocaleString();
            console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionGroup for ${callsign} (SessionID: ${callKey}), status: ${group.status}, startTime: ${group.startTime}, stopTime: ${group.stopTime}`);
            if (group.status === 'completed' && group.stopTime) {
                const duration = group.stopTime - group.startTime;
                console.log(`[${timestamp}] DEBUG: Completed transmission duration: ${duration.toFixed(1)}s, minDuration: ${this.config.minDuration}s`);
            }
        }
        
        // Create title: Radio ID - Source Call
        let titleText = callsign;
        if (sourceID && String(sourceID).trim() !== '') {
            titleText = `${sourceID} ${callsign}`;
        }

        // Create individual field data object instead of concatenated string
        const fieldData = {
            tg: tg,
            sessionID: group.sessionID || '',
            sourceID: sourceID || '',
            sourceName: sourceName || '',
            alias: alias || '',
            linkName: group.linkName || '',
            linkType: group.linkType || '',
            sessionType: group.sessionType || '',
            status: group.status,
            duration: null,
            startTime: group.startTime,
            stopTime: group.stopTime
        };
        
        // Add status and timing info
        if (group.status === 'started') {
            fieldData.status = 'Active';
        } else if (group.status === 'completed') {
            const duration = group.duration || (group.stopTime - group.startTime);
            fieldData.duration = duration;
        }

        const eventType = group.status === 'completed' ? 'Transmission Complete' : 'Transmission Active';
        
        if (group.logEntry) {
            // Update existing log entry (for completed transmissions)
            this.updateLogEntryFields(group.logEntry, titleText, fieldData, eventType);
            
            // Update CSS classes for duration
            if (group.status === 'completed') {
                group.logEntry.className = `log-entry transmission-complete`;
                // Remove from active transmissions
                this.removeActiveTransmission(callKey);
            }
        } else if (group.status === 'completed') {
            // Completed transmissions go to main log
            const logEntry = this.addLogEntryWithFields('transmission-complete', titleText, fieldData, eventType);
            group.logEntry = logEntry;
            // Remove from active transmissions (in case it was there)
            this.removeActiveTransmission(callKey);
        } else {
            // Handle active transmissions
            const existingActiveEntry = this.elements.activeContainer.querySelector(`[data-session-key="${callKey}"]`);
            if (existingActiveEntry) {
                // Update existing active transmission
                if (this.config.verbose) {
                    this.logDebug('Updating existing active transmission', {
                        sessionID: call.SessionID,
                        callsign: call.SourceCall,
                        tg: call.DestinationID,
                        eventType
                    });
                }
                this.updateActiveTransmission(callKey, titleText, fieldData, eventType);
            } else {
                // Create new active transmission
                if (this.config.verbose) {
                    this.logDebug('Creating new active transmission', {
                        sessionID: call.SessionID,
                        callsign: call.SourceCall,
                        tg: call.DestinationID,
                        eventType
                    });
                }
                this.addActiveTransmission(callKey, titleText, fieldData, eventType);
            }
        }
    }

    createOrUpdateTransmissionSession(sessionKey, call, eventType) {
        const callsign = call.SourceCall;
        const sourceName = call.SourceName || '';
        const tg = call.DestinationID;
        const startTime = call.Start;
        const stopTime = call.Stop;
        const talkerAlias = call.TalkerAlias || '';
        const sourceID = call.SourceID ? String(call.SourceID) : '';
        const linkName = call.LinkName || '';
        const linkType = call.LinkType || '';
        const sessionType = call.SessionType || '';
        const contextID = call.ContextID || '';

        if (eventType === 'start') {
            // DMR is half-duplex: clear any existing active transmissions for this talkgroup when a new one starts
            this.clearActiveTransmissionsForTalkgroup(tg);
            
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionSession START for ${callsign} on TG ${tg} - cleared existing transmissions, creating session in memory`);
            }
            
            // Create new session entry
            this.transmissionGroups[sessionKey] = {
                sessionID: call.SessionID,
                callsign,
                sourceName,
                tg,
                startTime,
                stopTime: null,
                duration: null,
                alias: this.getStoredAlias(callsign),
                sourceID,
                linkName,
                linkType,
                sessionType,
                contextID,
                status: 'started',
                logEntry: null
            };

            // Don't immediately show active transmission - this will be handled by delayed display logic
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Session created for ${callsign}, status set to 'started', waiting for delayed display timeout`);
            }

        } else if (eventType === 'update') {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionSession UPDATE for ${callsign} (SessionID: ${sessionKey})`);
            }
            
            // Update existing session or create if not found
            if (!this.transmissionGroups[sessionKey]) {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Session-Update for ${callsign} but no existing session found - creating new one`);
                }
                // Create session if it doesn't exist (missed the start event)
                this.transmissionGroups[sessionKey] = {
                    sessionID: call.SessionID,
                    callsign,
                    sourceName,
                    tg,
                    startTime,
                    stopTime: null,
                    duration: null,
                    alias: this.getStoredAlias(callsign),
                    sourceID,
                    linkName,
                    linkType,
                    sessionType,
                    contextID,
                    status: 'updated',
                    logEntry: null
                };
            } else {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Session-Update for ${callsign} - updating existing session, current status: ${this.transmissionGroups[sessionKey].status}`);
                }
                // Update existing session with any new information
                const existingGroup = this.transmissionGroups[sessionKey];
                
                // Update status
                existingGroup.status = 'updated';
                
                // Update attributes that might have been blank or changed
                if (sourceName && !existingGroup.sourceName) existingGroup.sourceName = sourceName;
                if (sourceID && !existingGroup.sourceID) existingGroup.sourceID = sourceID;
                if (linkName && !existingGroup.linkName) existingGroup.linkName = linkName;
                if (linkType && !existingGroup.linkType) existingGroup.linkType = linkType;
                if (sessionType && !existingGroup.sessionType) existingGroup.sessionType = sessionType;
                if (contextID && !existingGroup.contextID) existingGroup.contextID = contextID;
                
                // Update alias from current message or stored alias
                if (talkerAlias && talkerAlias.trim() !== '') {
                    // New alias provided in this update message
                    existingGroup.alias = talkerAlias.trim();
                } else if (!existingGroup.alias) {
                    // No alias in current message, check stored aliases
                    const currentAlias = this.getStoredAlias(callsign);
                    if (currentAlias) {
                        existingGroup.alias = currentAlias;
                    }
                }
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Updated SessionID ${call.SessionID} attributes for ${callsign}`);
                }
            }

            // Only show in UI if this should be displayed (applying duration filtering)
            const group = this.transmissionGroups[sessionKey];
            if (group && group.status === 'updated') {
                // Only show active transmissions that have been running long enough
                const now = Math.floor(Date.now() / 1000);
                const elapsedTime = now - group.startTime;
                if (elapsedTime >= this.config.minDuration) {
                    if (this.config.verbose) {
                        const timestamp = new Date().toLocaleString();
                        console.log(`[${timestamp}] DEBUG: Showing updated transmission for ${callsign} - elapsed time ${elapsedTime}s >= ${this.config.minDuration}s`);
                    }
                    this.createOrUpdateTransmissionGroup(sessionKey, call);
                } else {
                    if (this.config.verbose) {
                        const timestamp = new Date().toLocaleString();
                        console.log(`[${timestamp}] DEBUG: NOT showing updated transmission for ${callsign} - elapsed time ${elapsedTime}s < ${this.config.minDuration}s (need to wait ${(this.config.minDuration - elapsedTime).toFixed(1)}s more)`);
                    }
                }
            }
        }
    }

    updateTransmissionGroupComplete(sessionKey, call) {
        const group = this.transmissionGroups[sessionKey];
        if (!group) return;

        const duration = call.Stop - call.Start;
        
        // Skip processing if duration is invalid (negative or zero)
        if (duration <= 0) {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] Skipping transmission with invalid duration: ${duration}s`);
            }
            // Clean up invalid transmission
            const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${sessionKey}"]`);
            if (activeEntry) {
                activeEntry.remove();
            }
            delete this.transmissionGroups[sessionKey];
            return;
        }
        
        // Update group with completion info
        group.status = 'completed';
        group.stopTime = call.Stop;
        group.duration = duration;
        
        // Update statistics
        this.totalCalls++;
        this.lastActivityTime = new Date();
        this.updateStats();

        // Update the display
        this.createOrUpdateTransmissionGroup(sessionKey, call);

        // Clean up tracking - SessionID-based tracking doesn't use activeCalls
        const callKey = `${group.callsign}_${group.startTime}`;
        if (this.activeCalls[callKey]) {
            delete this.activeCalls[callKey];
        }

        // Play notification sound
        this.playNotificationSound();
        
        // Trigger memory cleanup if needed
        this.performMemoryCleanup();
    }

    performMemoryCleanup() {
        this.startPerformanceTimer('memoryCleanup');
        
        const now = Date.now();
        const transmissionKeys = Object.keys(this.transmissionGroups);
        let cleanedItems = 0;
        
        // Clean up old transmission groups if we exceed limits
        if (transmissionKeys.length > this.config.maxTransmissionGroups) {
            // Sort by completion time and remove oldest
            const completedGroups = transmissionKeys
                .map(key => ({ key, group: this.transmissionGroups[key] }))
                .filter(item => item.group.status === 'completed')
                .sort((a, b) => (a.group.stopTime || 0) - (b.group.stopTime || 0));
            
            const toRemove = completedGroups.slice(0, Math.max(0, transmissionKeys.length - this.config.maxTransmissionGroups));
            toRemove.forEach(item => {
                delete this.transmissionGroups[item.key];
                cleanedItems++;
            });
        }
        
        // Clean up very old transmissions (more aggressive than before)
        const maxAge = this.config.maxTransmissionAge;
        const veryOldThreshold = maxAge / 2; // Start cleaning at half the max age
        
        transmissionKeys.forEach(key => {
            const group = this.transmissionGroups[key];
            if (group && group.status === 'completed' && group.stopTime) {
                const age = now - (group.stopTime * 1000); // Convert to milliseconds
                if (age > maxAge) {
                    delete this.transmissionGroups[key];
                    cleanedItems++;
                } else if (age > veryOldThreshold && Object.keys(this.transmissionGroups).length > this.config.maxTransmissionGroups * 0.8) {
                    // More aggressive cleanup when approaching limits
                    delete this.transmissionGroups[key];
                    cleanedItems++;
                }
            }
            
            // Clean up stuck sessions (sessions that never completed)
            if (group && (group.status === 'started' || group.status === 'updated')) {
                const sessionAge = now - (group.startTime * 1000);
                if (sessionAge > 600000) { // 10 minutes
                    this.logDebug('Cleaning up stuck session', {
                        sessionID: key,
                        callsign: group.callsign,
                        status: group.status,
                        ageMinutes: (sessionAge / 60000).toFixed(1)
                    });
                    delete this.transmissionGroups[key];
                    cleanedItems++;
                }
            }
        });
        
        // Clean up orphaned active calls
        const activeCallKeys = Object.keys(this.activeCalls);
        activeCallKeys.forEach(key => {
            if (!transmissionKeys.some(tKey => {
                const group = this.transmissionGroups[tKey];
                return group && key === `${group.callsign}_${group.startTime}`;
            })) {
                delete this.activeCalls[key];
                cleanedItems++;
            }
        });
        
        // Enhanced DOM cleanup
        this.performDOMCleanup();
        
        // Clean up performance monitoring data
        this.cleanupPerformanceData();
        
        // Limit activity log entries
        this.limitActivityLogEntries();
        
        const duration = this.endPerformanceTimer('memoryCleanup', {
            itemsCleaned: cleanedItems,
            transmissionGroups: Object.keys(this.transmissionGroups).length,
            activeCalls: Object.keys(this.activeCalls).length
        });
        
        if (cleanedItems > 0 && this.config.verbose) {
            this.logDebug('Memory cleanup completed', {
                itemsCleaned: cleanedItems,
                cleanupTime: `${duration?.toFixed(2)}ms`,
                remainingTransmissions: Object.keys(this.transmissionGroups).length,
                remainingActiveCalls: Object.keys(this.activeCalls).length
            });
        }
    }

    performDOMCleanup() {
        // Remove orphaned DOM elements that might not have been cleaned up
        const activeTransmissionElements = document.querySelectorAll('.active-transmission');
        const logEntryElements = document.querySelectorAll('.log-entry');
        
        // Check for and remove duplicate elements
        const seenSessionKeys = new Set();
        activeTransmissionElements.forEach(element => {
            const sessionKey = element.getAttribute('data-session-key');
            if (seenSessionKeys.has(sessionKey)) {
                element.remove(); // Remove duplicate
            } else {
                seenSessionKeys.add(sessionKey);
                
                // Remove elements for sessions that no longer exist
                if (!this.transmissionGroups[sessionKey]) {
                    element.remove();
                }
            }
        });
        
        // Limit log entries more aggressively if we have too many
        if (logEntryElements.length > this.config.maxLogEntries * 1.2) {
            const excessCount = logEntryElements.length - this.config.maxLogEntries;
            for (let i = 0; i < excessCount; i++) {
                logEntryElements[i].remove();
            }
        }
    }

    cleanupPerformanceData() {
        // Clean up old operation timing data
        for (const [operation, times] of Object.entries(this.performanceMonitor.operationTimes)) {
            if (times.length > 200) { // Increased limit but still bounded
                this.performanceMonitor.operationTimes[operation] = times.slice(-100);
            }
        }
        
        // Clean up performance history if it gets too large
        if (this.performanceMonitor.history.length > this.config.performanceHistoryLimit * 1.2) {
            this.performanceMonitor.history = this.performanceMonitor.history.slice(-this.config.performanceHistoryLimit);
        }
    }

    limitActivityLogEntries() {
        if (!this.elements.logContainer) return;
        
        const entries = this.elements.logContainer.querySelectorAll('.log-entry');
        if (entries.length > this.config.maxLogEntries) {
            // Remove excess entries from the end
            for (let i = this.config.maxLogEntries; i < entries.length; i++) {
                entries[i].remove();
            }
        }
    }

    updateTransmissionGroupDisplay(callKey) {
        const group = this.transmissionGroups[callKey];
        if (!group || !group.logEntry) return;

        this.createOrUpdateTransmissionGroup(callKey, { DestinationID: group.tg });
    }

    handleTransmission(call) {
        const tg = call.DestinationID;
        const callsign = call.SourceCall;
        const startTime = call.Start;
        const stopTime = call.Stop;
        const duration = stopTime - startTime;
        const talkerAlias = call.TalkerAlias || '';
        const sourceID = call.SourceID ? String(call.SourceID) : '';
        const contextID = call.ContextID || '';
        const linkName = call.LinkName || '';
        const linkType = call.LinkType || '';
        const sessionType = call.SessionType || '';

        // Clean up the active call tracking
        const callKey = `${callsign}_${startTime}`;
        if (this.activeCalls[callKey]) {
            delete this.activeCalls[callKey];
        }

        this.totalCalls++;
        this.lastActivityTime = new Date();

        this.totalCalls++;
        this.lastActivityTime = new Date();

        // Update statistics
        this.updateStats();

        // Get effective alias (from current transmission or stored)
        let effectiveAlias = talkerAlias && talkerAlias.trim() !== '' ? talkerAlias.trim() : this.getStoredAlias(callsign);
        
        // Create display name with alias if available
        let displayName = callsign;
        if (sourceID && sourceID !== callsign) {
            displayName = `${callsign} (${sourceID})`;
        }
        if (effectiveAlias) {
            displayName = sourceID ? `${callsign} (${effectiveAlias} - ${sourceID})` : `${callsign} (${effectiveAlias})`;
            // Save new alias if provided in this transmission
            if (talkerAlias && talkerAlias.trim() !== '') {
                this.saveAliasToStorage(callsign, talkerAlias.trim());
            }
        }
        
        // Create detailed log entry with comprehensive information
        let details = `Duration: ${duration.toFixed(1)}s`;
        
        details += ` | TG: ${tg}`;
        
        // Add radio ID if available
        if (sourceID) {
            details += ` | Radio ID: ${sourceID}`;
        }
        
        // Add alias information if available
        if (effectiveAlias) {
            details += ` | Alias: ${effectiveAlias}`;
        }
        
        // Add link/repeater information
        if (linkName) {
            details += ` | Via: ${linkName}`;
        }
        
        if (linkType) {
            details += ` | Link Type: ${linkType}`;
        }
        
        if (sessionType) {
            details += ` | Session: ${sessionType}`;
        }
        
        if (contextID) {
            details += ` | Context: ${contextID}`;
        }
        
        details += ` | Start: ${this.formatTimestamp(startTime)} | Stop: ${this.formatTimestamp(stopTime)}`;
        
        this.addLogEntry('session-stop', displayName, details, 'Transmission Complete');

        // Play notification sound (optional)
        this.playNotificationSound();
    }

    updateExistingCall(callKey, call) {
        const activeCall = this.activeCalls[callKey];
        if (!activeCall || !activeCall.initialLogEntry) return;

        const talkerAlias = call.TalkerAlias || '';
        const sourceID = call.SourceID ? String(call.SourceID) : '';
        const linkName = call.LinkName || '';
        const linkType = call.LinkType || '';
        const sessionType = call.SessionType || '';
        const callsign = call.SourceCall;
        const tg = call.DestinationID;

        // Update with new information if alias is now available
        if (talkerAlias && talkerAlias.trim() !== '') {
            this.saveAliasToStorage(callsign, talkerAlias.trim());
            
            // Create updated display name
            let displayName = callsign;
            if (sourceID && sourceID !== callsign) {
                displayName = `${callsign} (${talkerAlias.trim()} - ${sourceID})`;
            } else {
                displayName = `${callsign} (${talkerAlias.trim()})`;
            }
            
            // Update details with new information
            let startDetails = `Started transmission on TG ${tg}`;
            if (sourceID) startDetails += ` | Radio ID: ${sourceID}`;
            if (linkName) startDetails += ` | Via: ${linkName}`;
            if (linkType) startDetails += ` | Type: ${linkType}`;
            if (sessionType) startDetails += ` | Session: ${sessionType}`;
            startDetails += ` | Alias: ${talkerAlias.trim()} (Updated)`;
            
            // Update the existing log entry
            const logEntry = activeCall.initialLogEntry;
            logEntry.querySelector('.log-callsign').textContent = displayName;
            logEntry.querySelector('.log-details').textContent = startDetails;
            
            // Add visual indicator that this entry was updated
            logEntry.classList.add('updated');
            setTimeout(() => logEntry.classList.remove('updated'), 1000);
        }
    }

    addActiveTransmission(sessionKey, titleText, fieldData, eventType) {
        if (this.config.verbose) {
            const timestamp = new Date().toLocaleString();
            console.log(`[${timestamp}] DEBUG: addActiveTransmission called for ${titleText} (SessionID: ${sessionKey}), TG: ${fieldData.tg}`);
        }
        
        // Remove "no activity" message if it exists
        const noActivityMsg = this.elements.activeContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }

        // Create active transmission entry
        const activeEntry = this.createActiveTransmissionEntry(sessionKey, titleText, fieldData, eventType);
        
        // Add to active container
        this.elements.activeContainer.appendChild(activeEntry);
        
        if (this.config.verbose) {
            const timestamp = new Date().toLocaleString();
            console.log(`[${timestamp}] DEBUG: addActiveTransmission COMPLETED for ${titleText} - active transmission now visible in UI`);
        }
    }

    updateActiveTransmission(sessionKey, titleText, fieldData, eventType) {
        const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${sessionKey}"]`);
        if (activeEntry) {
            // Update the existing active entry completely
            const titleElement = activeEntry.querySelector('.active-title');
            const tgElement = activeEntry.querySelector('.active-tg');
            const identityElement = activeEntry.querySelector('.active-identity');
            
            if (titleElement) titleElement.textContent = titleText;
            if (tgElement) tgElement.textContent = `TG ${fieldData.tg || 'Unknown'}`;
            if (identityElement) {
                identityElement.innerHTML = `
                    ${fieldData.sourceName ? `<div class="source-name">${fieldData.sourceName}</div>` : ''}
                    ${fieldData.alias ? `<div class="talker-alias">${fieldData.alias}</div>` : ''}
                `;
            }
            
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] Updated active transmission for SessionID: ${sessionKey}, Title: ${titleText}`);
            }
        } else {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] No existing active transmission found for SessionID: ${sessionKey}, creating new one`);
            }
            // If we can't find the existing entry, create a new one
            this.addActiveTransmission(sessionKey, titleText, fieldData, eventType);
        }
    }

    removeActiveTransmission(sessionKey) {
        const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${sessionKey}"]`);
        if (activeEntry) {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: removeActiveTransmission - removing active transmission for SessionID: ${sessionKey}`);
            }
            activeEntry.remove();
        } else {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: removeActiveTransmission - no active transmission found for SessionID: ${sessionKey}`);
            }
        }

        // Check if active container is empty and show "no activity" message
        if (this.elements.activeContainer.children.length === 0) {
            this.elements.activeContainer.innerHTML = '<p class="no-activity">No active transmissions</p>';
        }
    }

    clearActiveTransmissions() {
        // Clear the active container
        this.elements.activeContainer.innerHTML = '';
        this.elements.activeContainer.appendChild(this.createNoActivityElement(this._htmlFragments.noActivityActive));
        
        // Clean up any active transmission groups in memory
        for (const sessionKey in this.transmissionGroups) {
            const group = this.transmissionGroups[sessionKey];
            if (group && group.status !== 'completed') {
                // Mark incomplete transmissions as cleared
                group.status = 'cleared';
            }
        }
        
        // Clear active calls tracking
        this.activeCalls = {};
    }

    clearActiveTransmissionsForTalkgroup(talkgroup) {
        if (this.config.verbose) {
            const timestamp = new Date().toLocaleString();
            console.log(`[${timestamp}] DEBUG: clearActiveTransmissionsForTalkgroup(${talkgroup}) - clearing active transmissions for DMR half-duplex rule`);
        }
        
        // Clear active transmissions for the specified talkgroup
        const existingActiveEntries = this.elements.activeContainer.querySelectorAll('.active-transmission');
        existingActiveEntries.forEach(entry => {
            const sessionKey = entry.getAttribute('data-session-key');
            const group = this.transmissionGroups[sessionKey];
            // Remove if it's the same talkgroup (DMR half-duplex rule)
            if (group && group.tg === talkgroup) {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Removing active transmission for SessionID: ${sessionKey} (TG ${talkgroup})`);
                }
                entry.remove();
            }
        });
        
        // Mark any incomplete transmission groups as cleared for this specific talkgroup only
        // Also cancel any pending display timers
        for (const sessionKey in this.transmissionGroups) {
            const group = this.transmissionGroups[sessionKey];
            if (group && group.tg === talkgroup && group.status !== 'completed') {
                // Cancel pending display timer if it exists
                if (group.displayTimer) {
                    clearTimeout(group.displayTimer);
                    group.displayTimer = null;
                    if (this.config.verbose) {
                        const timestamp = new Date().toLocaleString();
                        console.log(`[${timestamp}] DEBUG: Cancelled pending display timer for SessionID: ${sessionKey} due to talkgroup clear`);
                    }
                }
                group.status = 'cleared';
            }
        }
        
        // Show "no activity" message if container is empty
        if (this.elements.activeContainer.children.length === 0) {
            this.elements.activeContainer.appendChild(this.createNoActivityElement(this._htmlFragments.noActivityActive));
        }
    }

    createActiveTransmissionEntry(sessionKey, titleText, fieldData, eventType) {
        const activeEntry = document.createElement('div');
        activeEntry.className = 'active-transmission';
        activeEntry.setAttribute('data-session-key', sessionKey);
        
        activeEntry.innerHTML = `
            <div class="active-header">
                <div class="active-title">${titleText}</div>
                <div class="active-tg">TG ${fieldData.tg || 'Unknown'}</div>
                <div class="active-status">🔴 LIVE</div>
            </div>
            <div class="active-identity">
                ${fieldData.sourceName ? `<div class="source-name">${fieldData.sourceName}</div>` : ''}
                ${fieldData.alias ? `<div class="talker-alias">${fieldData.alias}</div>` : ''}
            </div>
        `;
        
        return activeEntry;
    }

    addLogEntryWithFields(type, callsign, fieldData, event) {
        // Only log actual transmissions, filter out system messages
        const transmissionTypes = ['session-start', 'session-stop', 'transmission-complete'];
        
        if (!transmissionTypes.includes(type)) {
            return; // Skip system messages
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} new`;
        
        const timestamp = new Date().toLocaleString();
        
        // Create structured HTML with new layout
        logEntry.innerHTML = `
            <div class="log-header">
                <div class="log-title">${callsign}${fieldData.sourceName ? ` (${fieldData.sourceName})` : ''}${fieldData.alias ? ` • ${fieldData.alias}` : ''}</div>
                <span class="log-timestamp">${timestamp}</span>
            </div>
            ${this.config.verbose ? `<div class="log-fields">
                <span class="field talkgroup" data-label="TG">${fieldData.tg}</span>
                ${fieldData.sessionID ? `<span class="field session-id" data-label="Session ID">${fieldData.sessionID}</span>` : ''}
                ${fieldData.linkName ? `<span class="field link-name" data-label="Via">${fieldData.linkName}</span>` : ''}
                ${fieldData.linkType ? `<span class="field link-type" data-label="Link Type">${fieldData.linkType}</span>` : ''}
                ${fieldData.sessionType ? `<span class="field session-type" data-label="Session">${fieldData.sessionType}</span>` : ''}
                ${fieldData.status === 'Active' ? `<span class="field status active" data-label="Status">${fieldData.status}</span>` : ''}
                ${fieldData.duration !== null ? `<span class="field duration" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
            </div>` : ''}
            <div class="log-event" style="margin-top: 2px;">${event}</div>
        `;

        // Remove "no activity" message if it exists
        const noActivityMsg = this.elements.logContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }

        // Add new entry at the top
        this.elements.logContainer.insertBefore(logEntry, this.elements.logContainer.firstChild);

        // Remove animation class after animation completes
        setTimeout(() => {
            logEntry.classList.remove('new');
        }, 300);

        // Limit log entries to prevent memory issues using config
        this.limitActivityLogEntries();

        // Return the log entry for potential updates
        return logEntry;
    }

    updateLogEntryFields(logEntry, titleText, fieldData, event) {
        // Update title and event - handle both old and new structures
        const titleElement = logEntry.querySelector('.log-title') || logEntry.querySelector('.log-callsign');
        if (titleElement) {
            titleElement.textContent = titleText;
        }
        
        const eventElement = logEntry.querySelector('.log-event');
        if (eventElement) {
            eventElement.textContent = event;
        }
        
        // Update or create the identity section
        const identityContainer = logEntry.querySelector('.log-identity');
        if (identityContainer) {
            identityContainer.innerHTML = `
                ${fieldData.sourceName ? `<div class="source-name">${fieldData.sourceName}</div>` : ''}
                ${fieldData.alias ? `<div class="talker-alias">${fieldData.alias}</div>` : ''}
            `;
        }
        
        // Update or create the fields container
        const fieldsContainer = logEntry.querySelector('.log-fields');
        if (fieldsContainer) {
            fieldsContainer.innerHTML = this.config.verbose ? `
                <span class="field talkgroup" data-label="TG">${fieldData.tg}</span>
                ${fieldData.sessionID ? `<span class="field session-id" data-label="Session ID">${fieldData.sessionID}</span>` : ''}
                ${fieldData.linkName ? `<span class="field link-name" data-label="Via">${fieldData.linkName}</span>` : ''}
                ${fieldData.linkType ? `<span class="field link-type" data-label="Link Type">${fieldData.linkType}</span>` : ''}
                ${fieldData.sessionType ? `<span class="field session-type" data-label="Session">${fieldData.sessionType}</span>` : ''}
                ${fieldData.status === 'Active' ? `<span class="field status active" data-label="Status">${fieldData.status}</span>` : ''}
                ${fieldData.duration !== null ? `<span class="field duration" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
                ${fieldData.startTime ? `<span class="field start-time" data-label="Start">${this.formatTimestamp(fieldData.startTime)}</span>` : ''}
                ${fieldData.stopTime ? `<span class="field stop-time" data-label="Stop">${this.formatTimestamp(fieldData.stopTime)}</span>` : ''}
            ` : '';
        }
    }

    addLogEntry(type, callsign, details, event) {
        // Only log actual transmissions, filter out system messages
        const transmissionTypes = ['session-start', 'session-stop', 'transmission-complete'];
        
        if (!transmissionTypes.includes(type)) {
            return; // Skip system messages
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} new`;
        
        const timestamp = new Date().toLocaleString();
        
        logEntry.innerHTML = `
            <div class="log-header">
                <span class="log-callsign">${callsign}</span>
                <span class="log-timestamp">${timestamp}</span>
            </div>
            <div class="log-details">${details} • ${event}</div>
        `;

        // Remove "no activity" message if it exists
        const noActivityMsg = this.elements.logContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }

        // Add new entry at the top
        this.elements.logContainer.insertBefore(logEntry, this.elements.logContainer.firstChild);

        // Remove animation class after animation completes
        setTimeout(() => {
            logEntry.classList.remove('new');
        }, 300);

        // Limit log entries to prevent memory issues using config
        this.limitActivityLogEntries();

        // Return the log entry for potential updates
        return logEntry;
    }

    clearLogs() {
        this.elements.logContainer.innerHTML = '';
        this.elements.logContainer.appendChild(this.createNoActivityElement(this._htmlFragments.noActivityLog));
        this.totalCalls = 0;
        this.lastActivityTime = null;
        this.updateStats();
    }

    updateConnectionStatus(connected) {
        this.elements.connectionStatus.className = `status-dot ${connected ? 'connected' : ''}`;
        this.elements.statusText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    formatTime(date) {
        return date.toLocaleString();
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }

    // Update all statistics displays
    updateStats() {
        if (this.elements.totalCalls) {
            this.elements.totalCalls.textContent = this.totalCalls;
        }
        if (this.elements.lastActivity) {
            this.elements.lastActivity.textContent = this.lastActivityTime ? 
                this.formatTime(this.lastActivityTime) : 'Never';
        }
        if (this.elements.activeTGs) {
            const activeTransmissions = Object.keys(this.activeCalls).length;
            const uniqueTGs = new Set();
            Object.values(this.transmissionGroups).forEach(group => {
                if (group.status === 'active') {
                    uniqueTGs.add(group.talkgroup);
                }
            });
            this.elements.activeTGs.textContent = uniqueTGs.size;
        }
    }

    playNotificationSound() {
        // Create a simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            const timestamp = new Date().toLocaleString();
            console.log(`[${timestamp}] Audio notification not supported`);
        }
    }

    // Show subtle autosave indicator
    showAutosaveIndicator() {
        // Create or update autosave indicator
        let indicator = document.getElementById('autosave-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'autosave-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(76, 175, 80, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;
            indicator.textContent = '✓ Autosaved';
            document.body.appendChild(indicator);
        }
        
        // Show and hide the indicator
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    // Settings Management Methods
    loadSettings() {
        const savedSettings = localStorage.getItem('brandmeister-settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                
                // Update config object
                this.config.minDuration = settings.minDuration || 4;
                this.config.minSilence = settings.minSilence || 10;
                this.config.verbose = settings.verbose || false;
                this.config.monitorAllTalkgroups = settings.monitorAllTalkgroups || false;
                this.config.primaryColor = settings.primaryColor || '#2563eb';
                
                // Apply the primary color
                this.applyPrimaryColor(this.config.primaryColor);
                
                // Update UI elements
                this.updateUIFromConfig();
                
            } catch (error) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] Error loading settings from storage:`, error);
                this.resetSettings();
            }
        } else {
            // First time - update UI with default values and apply default color
            this.applyPrimaryColor(this.config.primaryColor);
            this.updateUIFromConfig();
        }
    }

    saveSettings() {
        const settings = {
            minDuration: this.config.minDuration,
            minSilence: this.config.minSilence,
            verbose: this.config.verbose,
            monitorAllTalkgroups: this.config.monitorAllTalkgroups,
            primaryColor: this.config.primaryColor
        };
        
        localStorage.setItem('brandmeister-settings', JSON.stringify(settings));
        
        // Add visual feedback for manual saves
        if (this.elements.saveSettingsBtn && this.elements.saveSettingsBtn.style.pointerEvents !== 'none') {
            // System message removed - only log transmissions
        }
        
        // Structured logging for settings changes
        this.logDebug('Settings saved', {
            minDuration: settings.minDuration,
            minSilence: settings.minSilence,
            verbose: settings.verbose,
            monitorAllTalkgroups: settings.monitorAllTalkgroups,
            autoSave: 'enabled'
        });
    }

    resetSettings() {
        // Reset to default values
        this.config.minDuration = 4;
        this.config.minSilence = 10;
        this.config.verbose = false;
        this.config.monitorAllTalkgroups = false;
        this.config.primaryColor = '#2563eb';
        
        // Apply default color
        this.applyPrimaryColor(this.config.primaryColor);
        
        // Update UI
        this.updateUIFromConfig();
        
        // Save to localStorage
        this.saveSettings();
        
        // System message removed - only log transmissions
    }

    updateConfigFromUI() {
        // Store previous monitoring state to detect changes
        const previousMonitorAllTalkgroups = this.config.monitorAllTalkgroups;
        
        // Update config from UI elements
        this.config.minDuration = parseInt(this.elements.minDurationInput.value) || 4;
        this.config.minSilence = parseInt(this.elements.minSilenceInput.value) || 10;
        this.config.verbose = this.elements.verboseCheckbox.checked;
        this.config.monitorAllTalkgroups = this.elements.monitorAllTalkgroupsCheckbox.checked;
        
        // Clear active transmissions if monitoring scope changed
        if (previousMonitorAllTalkgroups !== this.config.monitorAllTalkgroups) {
            this.clearActiveTransmissions();
            const modeText = this.config.monitorAllTalkgroups ? 
                'Monitor all talkgroups enabled' : 
                'Monitor all talkgroups disabled - now monitoring specific talkgroups';
            // System message removed - only log transmissions
            
            this.logInfo('Monitoring mode changed - active transmissions cleared', {
                newMode: this.config.monitorAllTalkgroups ? 'all_talkgroups' : 'specific_talkgroups',
                action: 'cleared_active_transmissions'
            });
        }
        
        // Auto-save settings when changed
        this.saveSettings();
    }

    updateUIFromConfig() {
        // Update UI elements from config
        this.elements.minDurationInput.value = this.config.minDuration;
        this.elements.minSilenceInput.value = this.config.minSilence;
        this.elements.verboseCheckbox.checked = this.config.verbose;
        this.elements.monitorAllTalkgroupsCheckbox.checked = this.config.monitorAllTalkgroups;
        this.updateColorSelection();
    }

    selectColor(color) {
        this.config.primaryColor = color;
        this.applyPrimaryColor(color);
        this.updateColorSelection();
        this.saveSettings();
        
        // System message removed - only log transmissions
    }

    updateColorSelection() {
        if (this.elements.colorPalette) {
            const colorOptions = this.elements.colorPalette.querySelectorAll('.color-option');
            colorOptions.forEach(option => {
                if (option.dataset.color === this.config.primaryColor) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        }
    }

    applyPrimaryColor(color) {
        // Apply the color to CSS custom property
        document.documentElement.style.setProperty('--primary', color);
        
        // Derive related colors for consistency
        const primaryRgb = this.hexToRgb(color);
        const primaryLight = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`;
        const primaryDark = this.darkenColor(color, 20);
        
        document.documentElement.style.setProperty('--primary-light', primaryLight);
        document.documentElement.style.setProperty('--primary-dark', primaryDark);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    darkenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const factor = (100 - percent) / 100;
        const r = Math.round(rgb.r * factor);
        const g = Math.round(rgb.g * factor);
        const b = Math.round(rgb.b * factor);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

// Global function for collapsible activity log
function toggleActivityLog() {
    const logContainer = document.getElementById('logContainer');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (logContainer.classList.contains('collapsed')) {
        logContainer.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
        logContainer.style.maxHeight = '500px';
    } else {
        logContainer.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        logContainer.style.maxHeight = '0';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.brandmeisterMonitor = new BrandmeisterMonitor();
    
    // Initialize new UI components
    initializeNewInterface();
    
    // Expose performance debugging functions to console
    window.getPerformanceInfo = () => window.brandmeisterMonitor.getPerformanceDebugInfo();
    window.forceCleanup = () => window.brandmeisterMonitor.forceCleanup();
    window.showMemoryTrends = () => {
        const report = window.brandmeisterMonitor.getPerformanceReport();
        if (report && report.trends) {
            console.table(report.trends);
            console.log('Operation Stats:', report.operations);
        }
        return report;
    };
    
    console.log('🔧 Performance debugging commands available:');
    console.log('- getPerformanceInfo() - Get detailed performance report');
    console.log('- forceCleanup() - Force memory cleanup and get status');
    console.log('- showMemoryTrends() - Display memory usage trends');
});

// Initialize new UI interface components
function initializeNewInterface() {
    // Console tab switching
    const consoleTabs = document.querySelectorAll('.console-tab');
    const consolePanes = document.querySelectorAll('.console-pane');
    
    consoleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active from all tabs and panes
            consoleTabs.forEach(t => t.classList.remove('active'));
            consolePanes.forEach(p => p.classList.remove('active'));
            
            // Add active to clicked tab and corresponding pane
            tab.classList.add('active');
            document.getElementById(targetTab + 'Pane').classList.add('active');
            
            window.brandmeisterMonitor.logWithAttributes('Console tab switched', {
                sessionID: window.brandmeisterMonitor.sessionID,
                tab: targetTab
            });
        });
    });
    
    // Console minimize/maximize toggle
    const consoleToggle = document.getElementById('consoleToggle');
    const consolePanel = document.getElementById('consolePanel');
    const appLayout = document.querySelector('.app-layout');
    
    consoleToggle.addEventListener('click', () => {
        const isMinimized = consolePanel.classList.contains('minimized');
        
        if (isMinimized) {
            consolePanel.classList.remove('minimized');
            appLayout.classList.remove('console-minimized');
            consoleToggle.textContent = '▼';
        } else {
            consolePanel.classList.add('minimized');
            appLayout.classList.add('console-minimized');
            consoleToggle.textContent = '▲';
        }
        
        window.brandmeisterMonitor.logWithAttributes('Console panel toggled', {
            sessionID: window.brandmeisterMonitor.sessionID,
            minimized: !isMinimized
        });
    });
    
    // Initialize console panel as collapsed by default
    consolePanel.classList.add('minimized');
    appLayout.classList.add('console-minimized');
    consoleToggle.textContent = '▲';
    
    // Sidebar toggle for desktop collapse and mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile behavior: toggle open/closed
            sidebar.classList.toggle('open');
        } else {
            // Desktop behavior: toggle collapsed/expanded
            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                appLayout.classList.remove('sidebar-collapsed');
                sidebarToggle.innerHTML = '<span class="hamburger-icon">☰</span>';
            } else {
                sidebar.classList.add('collapsed');
                appLayout.classList.add('sidebar-collapsed');
                sidebarToggle.innerHTML = '<span class="hamburger-icon">☰</span>';
            }
        }
        
        window.brandmeisterMonitor.logWithAttributes('Sidebar toggled', {
            sessionID: window.brandmeisterMonitor.sessionID,
            collapsed: sidebar.classList.contains('collapsed'),
            open: sidebar.classList.contains('open'),
            mobile: isMobile
        });
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target) && 
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
    
    // Update session duration in stats
    updateSessionDuration();
    setInterval(updateSessionDuration, 1000);
}

// Update session duration display
function updateSessionDuration() {
    const sessionDurationElement = document.getElementById('sessionDuration');
    if (sessionDurationElement && window.brandmeisterMonitor) {
        const startTime = window.brandmeisterMonitor.connectionStartTime || Date.now();
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        
        sessionDurationElement.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (window.brandmeisterMonitor) {
        window.brandmeisterMonitor.cleanup();
    }
});

// Optional: Log memory usage periodically in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setInterval(() => {
        if (window.brandmeisterMonitor) {
            window.brandmeisterMonitor.logMemoryUsage();
        }
    }, 30000); // Every 30 seconds
}

// Service Worker registration for offline capability (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
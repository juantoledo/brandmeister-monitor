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
        // Session-based tracking - no legacy activeCalls needed
        this.transmissionGroups = {}; // Group related transmission events
        this.connectionStartTime = Date.now(); // Track session start time
        
        // Configuration (can be made user-configurable later)
        this.config = {
            minDuration: 4, // minimum duration in seconds for activity log only
            verbose: true, // TEMPORARY: Enable for debugging short transmission issues
            monitorAllTalkgroups: false, // if true, monitor all TGs; if false, use monitoredTalkgroup
            primaryColor: '#2563eb', // Primary color for the interface
            // Session management settings
            maxInactivityTime: 120000, // Mark as stale after 2 minutes (120 seconds)
            maxSessionAge: 300000, // Auto-complete after 5 minutes (300 seconds)
            sessionCleanupInterval: 60000, // Check for orphaned sessions every minute
            allowMultipleSessionsPerTG: true, // Allow multiple concurrent sessions per talkgroup
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
        this.sessionCleanupTimer = null;
        
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

        // Initialize cleanup timers
        this.startMemoryCleanupTimer();
        this.startSessionCleanupTimer();
        
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
        statusLive: '<span class="card-status live">🔴 LIVE</span>',
        statusCompleted: '<span class="card-status completed">✅ COMPLETED</span>',
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

    startSessionCleanupTimer() {
        // Clear any existing timer
        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
        }
        
        // Start periodic session cleanup
        this.sessionCleanupTimer = setInterval(() => {
            this.performSessionCleanup();
        }, this.config.sessionCleanupInterval);
    }

    // Memory monitoring and reporting
    getMemoryUsage() {
        const usage = {
            transmissionGroups: Object.keys(this.transmissionGroups).length,
            // activeCalls removed - using session-based tracking
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
            // activeCalls: usage.activeCalls, // Removed - using session-based tracking
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
                // this.activeCalls = {}; // Removed - using session-based tracking
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
                // activeCalls: Object.keys(this.activeCalls).length, // Removed - using session-based tracking
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
        
        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
            this.sessionCleanupTimer = null;
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
        // this.activeCalls = {}; // Removed - using session-based tracking
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
            // Sanitize sessionID to ensure valid CSS selector characters only
            const sessionKey = sessionID ? String(sessionID).replace(/[^\w-]/g, '_') : `unknown_${Date.now()}`;
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

                // UI updates handled in createOrUpdateTransmissionSession based on session state
                // IMMEDIATELY mark session as stopped (UI updated by session system)
                
                // Always update UI and session state on Session-Stop
                this.createOrUpdateTransmissionSession(sessionKey, call, 'stop');
                
                // Only log if duration meets minimum (UI cleanup handled by 'stop' handler above)
                if (duration >= this.config.minDuration) {
                    notify = true;
                    
                    if (this.config.verbose) {
                        this.logDebug('Session-Stop logging completed transmission', {
                            sessionID,
                            callsign,
                            tg,
                            duration: duration.toFixed(1) + 's',
                            action: 'added to activity log'
                        });
                    }
                } else {
                    // Short transmission - UI cleanup already handled by 'stop' handler above
                    if (this.config.verbose) {
                        this.logDebug('Session-Stop short transmission - UI cleanup completed', {
                            sessionID,
                            callsign,
                            tg,
                            duration: duration.toFixed(1) + 's',
                            action: 'removed from UI without logging'
                        });
                    }
                }
            } else if (event === 'Session-Start') {
                // Create transmission session in memory but delay showing in UI
                this.createOrUpdateTransmissionSession(sessionKey, call, 'start');
                
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
                    
                    // Update UI immediately for active transmissions
                    const group = this.transmissionGroups[sessionKey];
                    if (group && (group.status === 'started' || group.status === 'active')) {
                        if (this.config.verbose) {
                            this.logDebug('Showing alias-updated transmission immediately', {
                                sessionID,
                                callsign,
                                tg,
                                action: 'updating UI with new alias'
                            });
                        }
                        this.createOrUpdateTransmissionGroup(sessionKey, call);
                    } else if (group && group.status === 'completed') {
                        // Show completed transmissions with alias updates
                        if (this.config.verbose) {
                            this.logDebug('Showing alias-updated COMPLETED transmission', {
                                sessionID,
                                callsign,
                                tg,
                                status: 'completed',
                                action: 'displaying in UI'
                            });
                        }
                        this.createOrUpdateTransmissionGroup(sessionKey, call);
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
            console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionGroup for ${callsign} (SessionID: ${callKey}), ContextID: ${group.contextID || 'N/A'}, status: ${group.status}, startTime: ${group.startTime}, stopTime: ${group.stopTime}`);
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
        if (group.status === 'active') {
            fieldData.status = 'Active';
        } else if (group.status === 'completed') {
            const duration = group.duration || (group.stopTime - group.startTime);
            fieldData.duration = duration;
        }

        const eventType = group.status === 'completed' ? 'Transmission Complete' : 'Transmission Active';
        
        // Direct UI Updates based on session state
        if (group.status === 'completed') {
            // Handle completed transmissions
            if (group.logEntry) {
                // Update existing log entry
                this.updateLogEntryFields(group.logEntry, titleText, fieldData, eventType);
                group.logEntry.className = `log-entry transmission-complete`;
            } else {
                // Create new log entry for completed transmission
                const logEntry = this.addLogEntryWithFields('transmission-complete', titleText, fieldData, eventType);
                group.logEntry = logEntry;
            }
            
            // Remove from active display
            const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(callKey)}"]`);
            if (activeEntry) {
                activeEntry.remove();
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Successfully removed active transmission from UI (SessionID: ${callKey})`);
                }
            } else if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Active transmission not found in UI for removal (SessionID: ${callKey}), selector: [data-session-key="${this.escapeCSSSelector(callKey)}"]`);
                // List all active entries for debugging
                const allActiveEntries = this.elements.activeContainer.querySelectorAll('.active-transmission');
                const sessionKeys = Array.from(allActiveEntries).map(entry => entry.getAttribute('data-session-key')).filter(Boolean);
                console.log(`[${timestamp}] DEBUG: Current active transmission session keys:`, sessionKeys);
            }
            
            // Check if active container is empty
            if (this.elements.activeContainer.children.length === 0) {
                this.elements.activeContainer.innerHTML = '<p class="no-activity">No active transmissions</p>';
            }
            
        } else {
            // Handle active/started transmissions
            const existingActiveEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(callKey)}"]`);
            
            if (existingActiveEntry) {
                // Update existing active transmission UI
                const callsignElement = existingActiveEntry.querySelector('.card-callsign');
                const radioIdElement = existingActiveEntry.querySelector('.card-radio-id');
                const sourceNameElement = existingActiveEntry.querySelector('.card-source-name');
                const tgElement = existingActiveEntry.querySelector('.card-tg');
                const detailsElement = existingActiveEntry.querySelector('.card-details');
                const controlsElement = existingActiveEntry.querySelector('.card-controls');
                
                const callsign = this.extractCallsignFromTitle(titleText);
                const phoneticCallsign = this.callsignToPhonetic(callsign);
                
                if (callsignElement) callsignElement.textContent = callsign;
                if (radioIdElement) radioIdElement.textContent = group.sourceID || 'Unknown ID';
                if (sourceNameElement && sourceName) {
                    sourceNameElement.textContent = sourceName;
                } else if (sourceNameElement && !sourceName) {
                    sourceNameElement.remove();
                } else if (!sourceNameElement && sourceName) {
                    const newSourceNameEl = document.createElement('div');
                    newSourceNameEl.className = 'card-source-name';
                    newSourceNameEl.textContent = sourceName;
                    existingActiveEntry.querySelector('.card-header').insertAdjacentElement('afterend', newSourceNameEl);
                }
                if (tgElement) tgElement.textContent = `TG ${tg || '?'}`;
                if (detailsElement) {
                    detailsElement.innerHTML = `
                        ${alias ? `<div class="card-alias">${alias}</div>` : ''}
                        ${phoneticCallsign ? `<div class="card-phonetic">${phoneticCallsign}</div>` : ''}
                    `;
                }
                
                // Update QRZ link if callsign changed
                if (controlsElement) {
                    const qrzLink = this.createQRZLogbookLink(callsign);
                    controlsElement.innerHTML = `
                        ${qrzLink}
                        <span class="card-tg">TG ${tg || '?'}</span>
                        <span class="card-status live">🔴 LIVE</span>
                    `;
                }
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Updated active transmission UI for SessionID: ${callKey}, ContextID: ${group.contextID || 'N/A'}, Title: ${titleText}`);
                }
                
            } else {
                // Create new active transmission UI
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Creating new active transmission UI for ${titleText} (SessionID: ${callKey}), ContextID: ${group.contextID || 'N/A'}, TG: ${tg}`);
                }
                
                // Remove "no activity" message if it exists
                const noActivityMsg = this.elements.activeContainer.querySelector('.no-activity');
                if (noActivityMsg) {
                    noActivityMsg.remove();
                }

                // Create new active entry
                const activeEntry = document.createElement('div');
                activeEntry.className = 'active-transmission';
                activeEntry.setAttribute('data-session-key', this.escapeCSSSelector(callKey));
                
                // Extract callsign for QRZ link
                const callsign = this.extractCallsignFromTitle(titleText);
                const qrzLink = this.createQRZLogbookLink(callsign);
                const phoneticCallsign = this.callsignToPhonetic(callsign);
                
                activeEntry.innerHTML = `
                    <div class="card-main">
                        <div class="card-header">
                            <div class="card-identity">
                                <div class="card-callsign">${callsign}</div>
                                <div class="card-radio-id">${group.sourceID || 'Unknown ID'}</div>
                            </div>
                            <div class="card-controls">
                                ${qrzLink}
                                <span class="card-tg">TG ${tg || '?'}</span>
                                <span class="card-status live">🔴 LIVE</span>
                            </div>
                        </div>
                        ${sourceName ? `<div class="card-source-name">${sourceName}</div>` : ''}
                        <div class="card-details">
                            ${alias ? `<div class="card-alias">${alias}</div>` : ''}
                            ${phoneticCallsign ? `<div class="card-phonetic">${phoneticCallsign}</div>` : ''}
                        </div>
                    </div>
                `;
                
                // Add to active container
                this.elements.activeContainer.appendChild(activeEntry);
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Created new active transmission UI for ${titleText} - active transmission now visible in UI`);
                }
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
        const linkName = call.LinkName ? String(call.LinkName) : '';
        const linkType = call.LinkType ? String(call.LinkType) : '';
        const sessionType = call.SessionType ? String(call.SessionType) : '';
        const contextID = call.ContextID ? String(call.ContextID) : '';

        if (eventType === 'start') {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionSession START for ${callsign} on TG ${tg} - creating session in memory (SessionID: ${sessionKey}), ContextID: ${contextID || 'N/A'}`);
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
                status: 'active', // Session states: active, stale, orphaned, completed
                state: 'live', // UI states: live, stale, orphaned
                lastUpdateTime: Date.now(),
                createdTime: Date.now(),
                logEntry: null
            };

            // Don't immediately show active transmission - this will be handled by delayed display logic
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Session created for ${callsign}, status set to 'active', will display immediately`);
            }
            
            // Immediately display the active transmission
            this.createOrUpdateTransmissionGroup(sessionKey, call);

        } else if (eventType === 'update') {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionSession UPDATE for ${callsign} (SessionID: ${sessionKey}), ContextID: ${contextID || 'N/A'}`);
                console.log(`[${timestamp}] DEBUG: Session-Update incoming data:`, {
                    sessionID: call.SessionID,
                    event: 'Session-Update',
                    callsign: callsign || 'null',
                    sourceName: sourceName || 'null',
                    sourceID: sourceID || 'null',
                    contextID: contextID || 'null',
                    tg: tg || 'null',
                    startTime: startTime || 'null',
                    stopTime: stopTime || 'null',
                    talkerAlias: talkerAlias || 'null',
                    linkName: linkName || 'null',
                    linkType: linkType || 'null',
                    sessionType: sessionType || 'null',
                    contextID: contextID || 'null'
                });
            }
            
            // Update existing session or create if not found
            if (!this.transmissionGroups[sessionKey]) {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Session-Update for ${callsign} but no existing session found - creating new one, ContextID: ${contextID || 'N/A'}`);
                    console.log(`[${timestamp}] DEBUG: Creating new session from Session-Update with data:`, {
                        sessionID: call.SessionID,
                        reason: 'missed Session-Start event',
                        callsign,
                        sourceName,
                        contextID: contextID || 'null',
                        tg,
                        startTime,
                        sourceID,
                        alias: this.getStoredAlias(callsign),
                        linkName,
                        linkType,
                        sessionType,
                        contextID
                    });
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
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Session created from Session-Update for SessionID ${call.SessionID}:`, {
                        sessionID: call.SessionID,
                        callsign: this.transmissionGroups[sessionKey].callsign,
                        sourceName: this.transmissionGroups[sessionKey].sourceName,
                        contextID: this.transmissionGroups[sessionKey].contextID || 'N/A',
                        tg: this.transmissionGroups[sessionKey].tg,
                        alias: this.transmissionGroups[sessionKey].alias,
                        status: this.transmissionGroups[sessionKey].status,
                        createdFrom: 'Session-Update event'
                    });
                }
            } else {
                // Update existing session with any new information
                const existingGroup = this.transmissionGroups[sessionKey];
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Session-Update for ${callsign} - updating existing session, ContextID: ${contextID || 'N/A'}, current status: ${existingGroup.status}`);
                    console.log(`[${timestamp}] DEBUG: Session-Update field comparison:`, {
                        sessionID: call.SessionID,
                        callsign: { incoming: callsign, existing: existingGroup.callsign },
                        sourceName: { incoming: sourceName, existing: existingGroup.sourceName },
                        sourceID: { incoming: sourceID, existing: existingGroup.sourceID },
                        alias: { incoming: talkerAlias, existing: existingGroup.alias },
                        linkName: { incoming: linkName, existing: existingGroup.linkName },
                        linkType: { incoming: linkType, existing: existingGroup.linkType },
                        sessionType: { incoming: sessionType, existing: existingGroup.sessionType },
                        contextID: { incoming: contextID, existing: existingGroup.contextID }
                    });
                }
                
                // Update timing and status
                existingGroup.status = 'active'; // Keep as active on updates
                existingGroup.lastUpdateTime = Date.now();
                
                // Preserve existing values - only update if current event has non-empty value
                // If current event has empty/null value, keep the existing value
                if (callsign && typeof callsign === 'string' && callsign.trim() !== '') {
                    existingGroup.callsign = callsign;
                } // else keep existing callsign
                
                if (sourceName && typeof sourceName === 'string' && sourceName.trim() !== '') {
                    existingGroup.sourceName = sourceName;
                } // else keep existing sourceName
                
                if (sourceID && typeof sourceID === 'string' && sourceID.trim() !== '') {
                    existingGroup.sourceID = sourceID;
                } else if (sourceID && typeof sourceID === 'number') {
                    existingGroup.sourceID = String(sourceID);
                } // else keep existing sourceID
                
                if (linkName && typeof linkName === 'string' && linkName.trim() !== '') {
                    existingGroup.linkName = linkName;
                } // else keep existing linkName
                
                if (linkType && typeof linkType === 'string' && linkType.trim() !== '') {
                    existingGroup.linkType = linkType;
                } else if (linkType && typeof linkType === 'number') {
                    existingGroup.linkType = String(linkType);
                } // else keep existing linkType
                
                if (sessionType && typeof sessionType === 'string' && sessionType.trim() !== '') {
                    existingGroup.sessionType = sessionType;
                } else if (sessionType && typeof sessionType === 'number') {
                    existingGroup.sessionType = String(sessionType);
                } // else keep existing sessionType
                
                if (contextID && typeof contextID === 'string' && contextID.trim() !== '') {
                    existingGroup.contextID = contextID;
                } else if (contextID && typeof contextID === 'number') {
                    existingGroup.contextID = String(contextID);
                } // else keep existing contextID
                
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
                    const updatedFields = [];
                    const preservedFields = [];
                    
                    // Track which fields were updated vs preserved
                    if (callsign && typeof callsign === 'string' && callsign.trim() !== '') {
                        updatedFields.push(`callsign: "${callsign}"`);
                    } else if (callsign) {
                        preservedFields.push('callsign (preserved existing value)');
                    }
                    
                    if (sourceName && typeof sourceName === 'string' && sourceName.trim() !== '') {
                        updatedFields.push(`sourceName: "${sourceName}"`);
                    } else if (sourceName) {
                        preservedFields.push('sourceName (preserved existing value)');
                    }
                    
                    if (sourceID && (typeof sourceID === 'string' || typeof sourceID === 'number') && String(sourceID).trim() !== '') {
                        updatedFields.push(`sourceID: "${sourceID}"`);
                    } else if (sourceID) {
                        preservedFields.push('sourceID (preserved existing value)');
                    }
                    
                    if (talkerAlias && talkerAlias.trim() !== '') {
                        updatedFields.push(`alias: "${talkerAlias}"`);
                    } else {
                        preservedFields.push('alias (preserved existing value)');
                    }
                    
                    if (linkName && (typeof linkName === 'string' || typeof linkName === 'number') && String(linkName).trim() !== '') {
                        updatedFields.push(`linkName: "${linkName}"`);
                    } else if (linkName) {
                        preservedFields.push('linkName (preserved existing value)');
                    }
                    
                    if (linkType && (typeof linkType === 'string' || typeof linkType === 'number') && String(linkType).trim() !== '') {
                        updatedFields.push(`linkType: "${linkType}"`);
                    } else if (linkType) {
                        preservedFields.push('linkType (preserved existing value)');
                    }
                    
                    if (sessionType && (typeof sessionType === 'string' || typeof sessionType === 'number') && String(sessionType).trim() !== '') {
                        updatedFields.push(`sessionType: "${sessionType}"`);
                    } else if (sessionType) {
                        preservedFields.push('sessionType (preserved existing value)');
                    }
                    
                    if (contextID && (typeof contextID === 'string' || typeof contextID === 'number') && String(contextID).trim() !== '') {
                        updatedFields.push(`contextID: "${contextID}"`);
                    } else if (contextID) {
                        preservedFields.push('contextID (preserved existing value)');
                    }
                    
                    console.log(`[${timestamp}] Session-Update processing complete for SessionID ${call.SessionID}:`, {
                        sessionID: call.SessionID,
                        callsign: existingGroup.callsign,
                        contextID: existingGroup.contextID || 'N/A',
                        fieldsUpdated: updatedFields.length > 0 ? updatedFields : 'none',
                        fieldsPreserved: preservedFields.length > 0 ? preservedFields : 'none',
                        finalAlias: existingGroup.alias,
                        lastUpdateTime: new Date(existingGroup.lastUpdateTime).toLocaleString()
                    });
                }
            }

            // Handle UI updates for Session-Update events - always update
            const group = this.transmissionGroups[sessionKey];
            if (group && group.status === 'active') {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Updating transmission UI for ${group.callsign} (Session-Update)`);
                }
                this.createOrUpdateTransmissionGroup(sessionKey, call);
            } else if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Skipping UI update for Session-Update - group status: ${group ? group.status : 'null'}, sessionKey: ${sessionKey}`);
            }
        } else if (eventType === 'stop') {
            // Handle Session-Stop events - mark session as completed and update UI
            const group = this.transmissionGroups[sessionKey];
            if (group) {
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionSession STOP for ${callsign} (SessionID: ${sessionKey}), ContextID: ${group.contextID || 'N/A'}`);
                }
                
                // Mark session as completed
                group.status = 'completed';
                group.stopTime = stopTime;
                group.duration = stopTime - group.startTime;
                group.lastUpdateTime = Date.now();
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Session marked as completed - duration: ${group.duration.toFixed(1)}s, will remove from active UI`);
                }
                
                // Update UI to remove from active display and move to completed log
                this.createOrUpdateTransmissionGroup(sessionKey, call);
            } else if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Session-Stop for ${callsign} but no existing session found (SessionID: ${sessionKey}), ContextID: ${contextID || 'N/A'}`);
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
            const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
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

        // Session-based tracking - no legacy callKey cleanup needed

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
        
        // Session-based tracking - no legacy activeCalls cleanup needed
        
        // Enhanced DOM cleanup
        this.performDOMCleanup();
        
        // Clean up performance monitoring data
        this.cleanupPerformanceData();
        
        // Limit activity log entries
        this.limitActivityLogEntries();
        
        const duration = this.endPerformanceTimer('memoryCleanup', {
            itemsCleaned: cleanedItems,
            transmissionGroups: Object.keys(this.transmissionGroups).length,
            // activeCalls: Object.keys(this.activeCalls).length // Removed - using session-based tracking
        });
        
        if (cleanedItems > 0 && this.config.verbose) {
            this.logDebug('Memory cleanup completed', {
                itemsCleaned: cleanedItems,
                cleanupTime: `${duration?.toFixed(2)}ms`,
                remainingTransmissions: Object.keys(this.transmissionGroups).length,
                // remainingActiveCalls: Object.keys(this.activeCalls).length // Removed - using session-based tracking
            });
        }
    }

    performSessionCleanup() {
        this.startPerformanceTimer('sessionCleanup');
        
        const now = Date.now();
        let staleSessions = 0;
        let orphanedSessions = 0;
        let autoCompletedSessions = 0;
        
        // Check all active sessions for staleness/orphans
        for (const sessionKey in this.transmissionGroups) {
            const session = this.transmissionGroups[sessionKey];
            if (!session || session.status === 'completed') continue;
            
            const timeSinceUpdate = now - session.lastUpdateTime;
            const totalSessionAge = now - session.createdTime;
            
            // Mark as stale if no updates for configured time
            if (timeSinceUpdate > this.config.maxInactivityTime && session.state === 'live') {
                session.state = 'stale';
                session.status = 'stale';
                staleSessions++;
                this.updateSessionUI(sessionKey, session);
                
                if (this.config.verbose) {
                    this.logDebug('Session marked as stale', {
                        sessionID: session.sessionID,
                        callsign: session.callsign,
                        tg: session.tg,
                        timeSinceUpdate: (timeSinceUpdate / 1000).toFixed(1) + 's',
                        reason: 'no updates received'
                    });
                }
            }
            
            // Auto-complete sessions that are too old
            if (totalSessionAge > this.config.maxSessionAge) {
                session.state = 'orphaned';
                session.status = 'completed';
                session.stopTime = now;
                session.duration = (now - session.startTime) / 1000;
                autoCompletedSessions++;
                
                // Create completion log entry
                this.createCompletionLogEntry(session, 'auto-completed due to age');
                
                // Remove from active UI
                this.removeSessionFromActiveUI(sessionKey);
                
                if (this.config.verbose) {
                    this.logDebug('Session auto-completed (orphaned)', {
                        sessionID: session.sessionID,
                        callsign: session.callsign,
                        tg: session.tg,
                        totalAge: (totalSessionAge / 1000).toFixed(1) + 's',
                        reason: 'maximum session age exceeded'
                    });
                }
                
                orphanedSessions++;
            }
        }
        
        const duration = this.endPerformanceTimer('sessionCleanup', {
            staleSessions,
            orphanedSessions, 
            autoCompletedSessions
        });
        
        if ((staleSessions > 0 || orphanedSessions > 0) && this.config.verbose) {
            this.logDebug('Session cleanup completed', {
                staleSessions,
                orphanedSessions,
                autoCompletedSessions,
                cleanupTime: `${duration?.toFixed(2)}ms`
            });
        }
    }

    updateSessionUI(sessionKey, session) {
        // Find the UI element for this session
        const element = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
        if (!element) return;
        
        // Update visual state based on session state
        element.classList.remove('state-live', 'state-stale', 'state-orphaned');
        element.classList.add(`state-${session.state}`);
        
        // Update status indicator
        const statusElement = element.querySelector('.card-status');
        if (statusElement) {
            switch (session.state) {
                case 'stale':
                    statusElement.innerHTML = '🟡 STALE';
                    statusElement.style.background = 'var(--warning)';
                    break;
                case 'orphaned':
                    statusElement.innerHTML = '⚫ ORPHANED';
                    statusElement.style.background = 'var(--gray-400)';
                    break;
                default:
                    statusElement.innerHTML = '🔴 LIVE';
                    statusElement.style.background = 'var(--error)';
            }
        }
    }

    createCompletionLogEntry(session, reason) {
        const displayName = session.sourceName || session.callsign;
        const details = `Transmission completed • TG ${session.tg} • Duration: ${session.duration?.toFixed(1)}s • Reason: ${reason}`;
        
        this.addLogEntry('transmission-complete', displayName, details, 'Auto-Completed');
    }

    removeSessionFromActiveUI(sessionKey) {
        const element = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
        if (element) {
            element.remove();
        }
        
        // Check if we need to show "no activity" message
        if (this.elements.activeContainer.querySelectorAll('.active-transmission').length === 0) {
            this.elements.activeContainer.appendChild(this.createNoActivityElement(this._htmlFragments.noActivityActive));
        }
        
        this.updateStats();
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

        // Session-based tracking - no legacy activeCalls cleanup needed
        // Sanitize callsign to ensure valid CSS selector characters only
        const sanitizedCallsign = callsign.replace(/[^\w-]/g, '_');
        const callKey = `${sanitizedCallsign}_${startTime}`;
        // Legacy activeCalls tracking removed

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
        // Legacy method - now handled by session-based tracking
        // const activeCall = this.activeCalls[callKey];
        // if (!activeCall || !activeCall.initialLogEntry) return;

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

    // Legacy activeTransmission methods removed - using session-based UI updates

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
        
        // Clear legacy activeCalls tracking - replaced by session-based tracking
        // this.activeCalls = {};
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

    // Legacy createActiveTransmissionEntry removed - using session-based UI

    // Helper function to safely escape strings for CSS selectors
    escapeCSSSelector(str) {
        if (!str) return '';
        // Replace any characters that could cause issues in CSS selectors
        return String(str).replace(/[^\w-]/g, '_');
    }

    // Helper function to convert callsign to phonetic alphabet
    callsignToPhonetic(callsign) {
        if (!callsign) return '';
        
        const phoneticMap = {
            'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
            'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
            'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
            'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
            'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-Ray', 'Y': 'Yankee',
            'Z': 'Zulu', '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
            '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
        };
        
        return callsign.toUpperCase().split('').map(char => {
            return phoneticMap[char] || char;
        }).join('-');
    }

    // Helper function to extract callsign and create QRZ logbook URL
    extractCallsignFromTitle(titleText) {
        // titleText format: "RadioID Callsign" or just "Callsign"
        // Extract the callsign (last part after space, or the whole string if no space)
        const parts = titleText.trim().split(' ');
        return parts[parts.length - 1]; // Get the last part (callsign)
    }
    
    createQRZLogbookLink(callsign) {
        if (!callsign) return '';
        const cleanCallsign = callsign.toUpperCase().trim();
        // Use & instead of ; for better URL compatibility
        return `<a href="https://logbook.qrz.com/logbook/?op=add&addcall=${encodeURIComponent(cleanCallsign)}" target="_blank" class="qrz-link" title="Log ${cleanCallsign} in QRZ Logbook">📋 QRZ</a>`;
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
        
        // Extract callsign for QRZ link and phonetic
        const callsignForQRZ = this.extractCallsignFromTitle(callsign);
        const qrzLink = this.createQRZLogbookLink(callsignForQRZ);
        const phoneticCallsign = this.callsignToPhonetic(callsignForQRZ);
        
        // Parse radio ID and callsign if in "RadioID Callsign" format
        const parts = callsign.trim().split(' ');
        const actualCallsign = parts[parts.length - 1];
        const radioID = parts.length > 1 ? parts[0] : null;
        
        // Determine status badge
        const isActive = fieldData.status === 'Active';
        const statusBadge = isActive 
            ? '<div class="log-card-status live">🔴 LIVE</div>'
            : '<div class="log-card-status completed">✅ COMPLETED</div>';
        
        // Create structured HTML with new card-based layout
        logEntry.innerHTML = `
            <div class="log-card-header">
                <div class="log-card-identity">
                    <div class="log-card-callsign">${actualCallsign}</div>
                    ${radioID ? `<div class="log-card-radio-id">Radio ID: ${radioID}</div>` : ''}
                    <div class="log-card-phonetic">${phoneticCallsign}</div>
                </div>
                <div class="log-card-controls">
                    ${qrzLink}
                    <div class="log-card-tg">TG ${fieldData.tg}</div>
                    ${statusBadge}
                    <div class="log-card-timestamp">${timestamp}</div>
                </div>
            </div>
            ${fieldData.sourceName ? `<div class="log-card-source-name">${fieldData.sourceName}</div>` : ''}
            <div class="log-card-details">
                ${fieldData.alias ? `<div class="log-card-alias">💬 ${fieldData.alias}</div>` : ''}
                ${this.config.verbose ? `<div class="log-card-fields">
                    ${fieldData.sessionID ? `<span class="field session-id" data-label="Session ID">${fieldData.sessionID}</span>` : ''}
                    ${fieldData.linkName ? `<span class="field link-name" data-label="Via">${fieldData.linkName}</span>` : ''}
                    ${fieldData.linkType ? `<span class="field link-type" data-label="Link Type">${fieldData.linkType}</span>` : ''}
                    ${fieldData.sessionType ? `<span class="field session-type" data-label="Session">${fieldData.sessionType}</span>` : ''}
                    ${fieldData.duration !== null ? `<span class="field duration" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
                    ${fieldData.startTime ? `<span class="field start-time" data-label="Start">${this.formatTimestamp(fieldData.startTime)}</span>` : ''}
                    ${fieldData.stopTime ? `<span class="field stop-time" data-label="Stop">${this.formatTimestamp(fieldData.stopTime)}</span>` : ''}
                </div>` : ''}
                <div class="log-card-event">${event}</div>
            </div>
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
        // Update the log entry with new field data using new card structure
        const titleElement = logEntry.querySelector('.log-card-callsign') || logEntry.querySelector('.log-title') || logEntry.querySelector('.log-callsign');
        if (titleElement) {
            // Parse radio ID and callsign if in \"RadioID Callsign\" format
            const parts = titleText.trim().split(' ');
            const actualCallsign = parts[parts.length - 1];
            titleElement.textContent = actualCallsign;
        }

        const fieldsContainer = logEntry.querySelector('.log-card-fields') || logEntry.querySelector('.log-fields');
        const eventElement = logEntry.querySelector('.log-card-event') || logEntry.querySelector('.log-event');
        
        if (fieldsContainer) {
            fieldsContainer.innerHTML = this.config.verbose ? `
                ${fieldData.sessionID ? `<span class=\"field session-id\" data-label=\"Session ID\">${fieldData.sessionID}</span>` : ''}
                ${fieldData.linkName ? `<span class=\"field link-name\" data-label=\"Via\">${fieldData.linkName}</span>` : ''}
                ${fieldData.linkType ? `<span class=\"field link-type\" data-label=\"Link Type\">${fieldData.linkType}</span>` : ''}
                ${fieldData.sessionType ? `<span class=\"field session-type\" data-label=\"Session\">${fieldData.sessionType}</span>` : ''}
                ${fieldData.status === 'Active' ? `<span class=\"field status active\" data-label=\"Status\">${fieldData.status}</span>` : ''}
                ${fieldData.duration !== null ? `<span class=\"field duration\" data-label=\"Duration\">${fieldData.duration.toFixed(1)}s</span>` : ''}
                ${fieldData.startTime ? `<span class=\"field start-time\" data-label=\"Start\">${this.formatTimestamp(fieldData.startTime)}</span>` : ''}
                ${fieldData.stopTime ? `<span class=\"field stop-time\" data-label=\"Stop\">${this.formatTimestamp(fieldData.stopTime)}</span>` : ''}
            ` : '';
        }
        
        if (eventElement) {
            eventElement.textContent = event;
        }
        
        // Update status badge if present
        const statusElement = logEntry.querySelector('.log-card-status');
        if (statusElement) {
            const isActive = fieldData.status === 'Active';
            statusElement.className = `log-card-status ${isActive ? 'live' : 'completed'}`;
            statusElement.innerHTML = isActive ? '🔴 LIVE' : '✅ COMPLETED';
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
        
        // Extract callsign for QRZ link and phonetic
        const callsignForQRZ = this.extractCallsignFromTitle(callsign);
        const qrzLink = this.createQRZLogbookLink(callsignForQRZ);
        const phoneticCallsign = this.callsignToPhonetic(callsignForQRZ);
        
        // Parse radio ID and callsign if in "RadioID Callsign" format
        const parts = callsign.trim().split(' ');
        const actualCallsign = parts[parts.length - 1];
        const radioID = parts.length > 1 ? parts[0] : null;
        
        // Determine if this is a completed transmission
        const isCompleted = type === 'transmission-complete' || event.includes('Complete');
        const statusBadge = isCompleted
            ? '<div class="log-card-status completed">✅ COMPLETED</div>'
            : '<div class="log-card-status live">🔴 LIVE</div>';
        
        logEntry.innerHTML = `
            <div class="log-card-header">
                <div class="log-card-identity">
                    <div class="log-card-callsign">${actualCallsign}</div>
                    ${radioID ? `<div class="log-card-radio-id">Radio ID: ${radioID}</div>` : ''}
                    <div class="log-card-phonetic">${phoneticCallsign}</div>
                </div>
                <div class="log-card-controls">
                    ${qrzLink}
                    ${statusBadge}
                    <div class="log-card-timestamp">${timestamp}</div>
                </div>
            </div>
            <div class="log-card-details">
                <div class="log-card-details-text">${details}</div>
                <div class="log-card-event">${event}</div>
            </div>
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
            // Count active sessions from transmissionGroups
            const uniqueTGs = new Set();
            Object.values(this.transmissionGroups).forEach(group => {
                if (group.status === 'active') {
                    uniqueTGs.add(group.tg);
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
            verbose: settings.verbose,
            monitorAllTalkgroups: settings.monitorAllTalkgroups,
            autoSave: 'enabled'
        });
    }

    resetSettings() {
        // Reset to default values
        this.config.minDuration = 4;
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
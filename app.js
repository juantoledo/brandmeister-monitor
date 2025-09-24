// Brandmeister Monitor Web App
class BrandmeisterMonitor {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.monitoredTalkgroup = null;
        this.lastTGActivity = {};
        this.totalCalls = 0;
        this.lastActivityTime = null;
        this.callsignAliases = {}; // Store callsign to alias mappings
        this.activeCalls = {}; // Track active calls by SourceCall to update with new info
        this.transmissionGroups = {}; // Group related transmission events
        this.durationStats = {
            total: 0,
            brief: 0,  // < 2s
            short: 0,  // 2-10s
            medium: 0, // 10-30s
            long: 0    // > 30s
        };
        
        // Configuration (can be made user-configurable later)
        this.config = {
            minDuration: 4, // minimum duration in seconds
            minSilence: 10, // minimum silence in seconds
            verbose: false,
            showAliasStatus: true, // show when alias is/isn't available
            aliasOnly: true, // only show messages with talker alias
            monitorAllTalkgroups: false // if true, monitor all TGs; if false, use monitoredTalkgroup
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
            totalCalls: document.getElementById('totalCalls'),
            lastActivity: document.getElementById('lastActivity')
        };

        // Bind event listeners
        this.elements.saveTgBtn.addEventListener('click', () => this.saveTalkgroup());
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        
        // Allow Enter key to save talkgroup
        this.elements.talkgroupInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTalkgroup();
            }
        });
    }

    loadTalkgroupFromStorage() {
        const savedTg = localStorage.getItem('brandmeister_talkgroup');
        const monitorAll = localStorage.getItem('brandmeister_monitor_all') === 'true';
        
        if (savedTg) {
            if (savedTg === 'all' || monitorAll) {
                this.monitoredTalkgroup = null;
                this.config.monitorAllTalkgroups = true;
                this.elements.talkgroupInput.value = 'all';
                this.elements.currentTg.textContent = 'All Talkgroups';
            } else {
                this.monitoredTalkgroup = parseInt(savedTg);
                this.config.monitorAllTalkgroups = false;
                this.elements.talkgroupInput.value = savedTg;
                this.elements.currentTg.textContent = savedTg;
            }
        }
    }

    loadAliasesFromStorage() {
        const savedAliases = localStorage.getItem('brandmeister_aliases');
        if (savedAliases) {
            try {
                this.callsignAliases = JSON.parse(savedAliases);
            } catch (error) {
                console.log('Error loading aliases from storage:', error);
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
            this.monitoredTalkgroup = null;
            this.config.monitorAllTalkgroups = true;
            localStorage.setItem('brandmeister_talkgroup', 'all');
            localStorage.setItem('brandmeister_monitor_all', 'true');
            this.elements.currentTg.textContent = 'All Talkgroups';
            this.addLogEntry('system', 'System', `Monitoring all talkgroups`, 'Configuration Updated');
        } else if (tgValue && !isNaN(tgValue)) {
            // Monitor specific talkgroup
            this.monitoredTalkgroup = parseInt(tgValue);
            this.config.monitorAllTalkgroups = false;
            localStorage.setItem('brandmeister_talkgroup', tgValue);
            localStorage.setItem('brandmeister_monitor_all', 'false');
            this.elements.currentTg.textContent = tgValue;
            this.addLogEntry('system', 'System', `Monitoring talkgroup ${tgValue}`, 'Configuration Updated');
        } else {
            alert('Please enter a valid talkgroup ID or "all" to monitor all talkgroups');
        }
    }

    connect() {
        if (this.isConnected) return;

        this.addLogEntry('system', 'System', 'Connecting to Brandmeister network...', 'Connection');
        
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
                console.error('Connection error:', error);
                this.addLogEntry('error', 'System', `Connection failed: ${error.message}`, 'Error');
                this.updateConnectionStatus(false);
            });

        } catch (error) {
            console.error('Socket initialization error:', error);
            this.addLogEntry('error', 'System', `Failed to initialize connection: ${error.message}`, 'Error');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.onDisconnect();
    }

    onConnect() {
        console.log('Connected to Brandmeister network');
        this.isConnected = true;
        this.updateConnectionStatus(true);
        this.addLogEntry('system', 'System', 'Connected to Brandmeister network', 'Connection Established');
        
        this.elements.connectBtn.disabled = true;
        this.elements.disconnectBtn.disabled = false;
    }

    onDisconnect() {
        console.log('Disconnected from Brandmeister network');
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.addLogEntry('system', 'System', 'Disconnected from Brandmeister network', 'Connection Lost');
        
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
    }

    onMqttMessage(data) {
        try {
            const call = JSON.parse(data.payload);
            
            // PRIMARY FILTER: Extract talkgroup and event info from actual data
            const tg = call.DestinationID;
            const sessionID = call.SessionID; // Use SessionID as unique identifier
            const event = call.Event;
            const callsign = call.SourceCall;
            
            
            // Only proceed if we should monitor this talkgroup
            if (!this.config.monitorAllTalkgroups && this.monitoredTalkgroup && tg !== this.monitoredTalkgroup) {
                if (this.config.verbose) {
                    //console.log(`Skipping TG ${tg} - only monitoring TG ${this.monitoredTalkgroup}`);
                }
                return;
            }

            if (this.config.verbose) {
                console.log('Received call data:', call);
                console.log(`Processing event: ${event} | SessionID: ${sessionID} | TG: ${tg} | Callsign: ${callsign}`);
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
                    console.log(`Received alias for ${callsign}: ${talkerAlias.trim()}`);
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
                    console.log(`Call duration: ${duration.toFixed(1)}s from ${callsign} on TG ${tg}`);
                }

                // Only proceed if the key down has been long enough
                if (duration >= this.config.minDuration) {
                    notify = true;
                } else if (this.config.verbose) {
                    console.log(`Ignored short transmission (${duration.toFixed(1)}s) from ${callsign} - minimum is ${this.config.minDuration}s`);
                }

                if (notify) {
                    // Update the transmission group with completion info
                    this.updateTransmissionGroupComplete(sessionKey, call);
                }
            } else if (event === 'Session-Start') {
                // Create or update transmission session using SessionID
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
                        console.log(`Updating SessionID-based transmission group for ${callsign} (SessionID: ${sessionID}) with alias: ${talkerAlias.trim()}`);
                    }
                    
                    // Update the transmission group with alias info
                    this.transmissionGroups[sessionKey].alias = talkerAlias.trim();
                    this.createOrUpdateTransmissionGroup(sessionKey, call);
                }
                
                // Also handle legacy callKey-based tracking for backward compatibility
                const callKey = `${callsign}_${startTime}`;
                
                // If this message just provided an alias and we have a tracked call waiting for it
                if (talkerAlias && talkerAlias.trim() !== '' && this.activeCalls[callKey] && !this.activeCalls[callKey].initialLogEntry) {
                    if (this.config.verbose) {
                        console.log(`Creating delayed transmission group for ${callsign} with alias: ${talkerAlias.trim()}`);
                    }
                    
                    // Update the transmission group with alias info
                    if (this.transmissionGroups[callKey]) {
                        this.transmissionGroups[callKey].alias = talkerAlias.trim();
                        this.createOrUpdateTransmissionGroup(callKey, call);
                    }
                }
                
                // Also update any existing transmission group if alias information arrives
                if (this.transmissionGroups[callKey] && talkerAlias && talkerAlias.trim() !== '') {
                    this.transmissionGroups[callKey].alias = talkerAlias.trim();
                    if (this.transmissionGroups[callKey].logEntry) {
                        this.updateTransmissionGroupDisplay(callKey);
                    }
                }
            }

        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    }

    createOrUpdateTransmissionGroup(callKey, call) {
        const group = this.transmissionGroups[callKey];
        if (!group) return;

        const callsign = group.callsign;
        const sourceName = group.sourceName;
        const sourceID = group.sourceID;
        const tg = group.tg;
        const alias = group.alias;
        
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
            durationClass: '',
            startTime: group.startTime,
            stopTime: group.stopTime
        };
        
        // Add status and timing info
        if (group.status === 'started') {
            fieldData.status = 'Active';
        } else if (group.status === 'completed') {
            const duration = group.duration || (group.stopTime - group.startTime);
            fieldData.duration = duration;
            fieldData.durationClass = this.getDurationClass(duration);
        }

        const eventType = group.status === 'completed' ? 'Transmission Complete' : 'Transmission Active';
        const durationClass = group.status === 'completed' ? this.getDurationClass(group.duration || 0) : '';
        
        if (group.logEntry) {
            // Update existing entry
            this.updateLogEntryFields(group.logEntry, titleText, fieldData, eventType);
            
            // Update CSS classes for duration
            if (group.status === 'completed') {
                group.logEntry.className = `log-entry transmission-complete ${durationClass}`;
            }
        } else {
            // Create new entry
            const logEntry = this.addLogEntryWithFields('transmission-active', titleText, fieldData, eventType, durationClass);
            group.logEntry = logEntry;
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

            // Check if we should display this session start
            const sessionEffectiveAlias = this.getStoredAlias(callsign);
            
            if (this.config.aliasOnly && !sessionEffectiveAlias) {
                if (this.config.verbose) {
                    console.log(`Session-Start from ${callsign} (SessionID: ${call.SessionID}) - waiting for alias in subsequent messages`);
                }
                return; // Don't display yet, but keep tracking
            }

            // Create a grouped transmission entry
            this.createOrUpdateTransmissionGroup(sessionKey, call);

        } else if (eventType === 'update') {
            // Update existing session or create if not found
            if (!this.transmissionGroups[sessionKey]) {
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
                    console.log(`Updated SessionID ${call.SessionID} attributes for ${callsign}`);
                }
            }

            // Always create or update the display since updates might provide missing info
            this.createOrUpdateTransmissionGroup(sessionKey, call);
        }
    }

    updateTransmissionGroupComplete(sessionKey, call) {
        const group = this.transmissionGroups[sessionKey];
        if (!group) return;

        const duration = call.Stop - call.Start;
        
        // Update group with completion info
        group.status = 'completed';
        group.stopTime = call.Stop;
        group.duration = duration;
        
        // Update statistics
        this.totalCalls++;
        this.lastActivityTime = new Date();
        this.elements.totalCalls.textContent = this.totalCalls;
        this.elements.lastActivity.textContent = this.formatTime(this.lastActivityTime);

        // Update duration statistics
        this.durationStats.total++;
        if (duration < 2) {
            this.durationStats.brief++;
        } else if (duration < 10) {
            this.durationStats.short++;
        } else if (duration < 30) {
            this.durationStats.medium++;
        } else {
            this.durationStats.long++;
        }

        // Update the display
        this.createOrUpdateTransmissionGroup(sessionKey, call);

        // Clean up tracking - SessionID-based tracking doesn't use activeCalls
        const callKey = `${group.callsign}_${group.startTime}`;
        if (this.activeCalls[callKey]) {
            delete this.activeCalls[callKey];
        }

        // Play notification sound
        this.playNotificationSound();
        
        // Clean up completed transmission after some time
        setTimeout(() => {
            delete this.transmissionGroups[sessionKey];
        }, 300000); // 5 minutes
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

        // Update duration statistics
        this.durationStats.total++;
        if (duration < 2) {
            this.durationStats.brief++;
        } else if (duration < 10) {
            this.durationStats.short++;
        } else if (duration < 30) {
            this.durationStats.medium++;
        } else {
            this.durationStats.long++;
        }

        // Update statistics
        this.elements.totalCalls.textContent = this.totalCalls;
        this.elements.lastActivity.textContent = this.formatTime(this.lastActivityTime);

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
        
        // Add duration classification
        if (duration < 2) {
            details += ` (Brief)`;
        } else if (duration < 10) {
            details += ` (Short)`;
        } else if (duration < 30) {
            details += ` (Medium)`;
        } else {
            details += ` (Long)`;
        }
        
        details += ` | TG: ${tg}`;
        
        // Add radio ID if available
        if (sourceID) {
            details += ` | Radio ID: ${sourceID}`;
        }
        
        // Add alias information or note when not available
        if (effectiveAlias) {
            details += ` | Alias: ${effectiveAlias}`;
        } else if (this.config.showAliasStatus) {
            details += ` | Alias: Not provided`;
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
        
        this.addLogEntry('session-stop', displayName, details, 'Transmission Complete', this.getDurationClass(duration));

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

    getDurationClass(duration) {
        if (duration < 2) return 'duration-brief';
        if (duration < 10) return 'duration-short';
        if (duration < 30) return 'duration-medium';
        return 'duration-long';
    }

    addLogEntryWithFields(type, callsign, fieldData, event, durationClass = '') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} ${durationClass} new`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Create structured HTML with new layout
        logEntry.innerHTML = `
            <div class="log-header">
                <div class="log-title">${callsign}</div>
                <span class="log-timestamp">${timestamp}</span>
            </div>
            <div class="log-identity">
                ${fieldData.sourceName ? `<div class="source-name">${fieldData.sourceName}</div>` : ''}
                ${fieldData.alias ? `<div class="talker-alias">${fieldData.alias}</div>` : ''}
            </div>
            ${this.config.verbose ? `<div class="log-fields">
                <span class="field talkgroup" data-label="TG">${fieldData.tg}</span>
                ${fieldData.sessionID ? `<span class="field session-id" data-label="Session ID">${fieldData.sessionID}</span>` : ''}
                ${fieldData.linkName ? `<span class="field link-name" data-label="Via">${fieldData.linkName}</span>` : ''}
                ${fieldData.linkType ? `<span class="field link-type" data-label="Link Type">${fieldData.linkType}</span>` : ''}
                ${fieldData.sessionType ? `<span class="field session-type" data-label="Session">${fieldData.sessionType}</span>` : ''}
                ${fieldData.status === 'Active' ? `<span class="field status active" data-label="Status">${fieldData.status}</span>` : ''}
                ${fieldData.duration !== null ? `<span class="field duration ${fieldData.durationClass}" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
                ${fieldData.startTime ? `<span class="field start-time" data-label="Start">${this.formatTimestamp(fieldData.startTime)}</span>` : ''}
                ${fieldData.stopTime ? `<span class="field stop-time" data-label="Stop">${this.formatTimestamp(fieldData.stopTime)}</span>` : ''}
            </div>` : ''}
            <div class="log-event">${event}</div>
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

        // Limit log entries to prevent memory issues
        const maxEntries = 100;
        const entries = this.elements.logContainer.querySelectorAll('.log-entry');
        if (entries.length > maxEntries) {
            for (let i = maxEntries; i < entries.length; i++) {
                entries[i].remove();
            }
        }

        // Return the log entry for potential updates
        return logEntry;
    }

    updateLogEntryFields(logEntry, titleText, fieldData, event) {
        // Update title and event
        logEntry.querySelector('.log-title').textContent = titleText;
        logEntry.querySelector('.log-event').textContent = event;
        
        // Update or create the identity section
        const identityContainer = logEntry.querySelector('.log-identity');
        identityContainer.innerHTML = `
            ${fieldData.sourceName ? `<div class="source-name">${fieldData.sourceName}</div>` : ''}
            ${fieldData.alias ? `<div class="talker-alias">${fieldData.alias}</div>` : ''}
        `;
        
        // Update or create the fields container
        const fieldsContainer = logEntry.querySelector('.log-fields');
        fieldsContainer.innerHTML = this.config.verbose ? `
            <span class="field talkgroup" data-label="TG">${fieldData.tg}</span>
            ${fieldData.sessionID ? `<span class="field session-id" data-label="Session ID">${fieldData.sessionID}</span>` : ''}
            ${fieldData.linkName ? `<span class="field link-name" data-label="Via">${fieldData.linkName}</span>` : ''}
            ${fieldData.linkType ? `<span class="field link-type" data-label="Link Type">${fieldData.linkType}</span>` : ''}
            ${fieldData.sessionType ? `<span class="field session-type" data-label="Session">${fieldData.sessionType}</span>` : ''}
            ${fieldData.status === 'Active' ? `<span class="field status active" data-label="Status">${fieldData.status}</span>` : ''}
            ${fieldData.duration !== null ? `<span class="field duration ${fieldData.durationClass}" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
            ${fieldData.startTime ? `<span class="field start-time" data-label="Start">${this.formatTimestamp(fieldData.startTime)}</span>` : ''}
            ${fieldData.stopTime ? `<span class="field stop-time" data-label="Stop">${this.formatTimestamp(fieldData.stopTime)}</span>` : ''}
        ` : '';
    }

    addLogEntry(type, callsign, details, event, durationClass = '') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} ${durationClass} new`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        logEntry.innerHTML = `
            <div class="log-header">
                <span class="log-callsign">${callsign}</span>
                <span class="log-timestamp">${timestamp}</span>
            </div>
            <div class="log-details">${details}</div>
            <div class="log-event">${event}</div>
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

        // Limit log entries to prevent memory issues
        const maxEntries = 100;
        const entries = this.elements.logContainer.querySelectorAll('.log-entry');
        if (entries.length > maxEntries) {
            for (let i = maxEntries; i < entries.length; i++) {
                entries[i].remove();
            }
        }

        // Return the log entry for potential updates
        return logEntry;
    }

    clearLogs() {
        this.elements.logContainer.innerHTML = '<p class="no-activity">No activity yet. Configure a talkgroup and connect to start monitoring.</p>';
        this.totalCalls = 0;
        this.elements.totalCalls.textContent = '0';
        this.elements.lastActivity.textContent = 'Never';
    }

    updateConnectionStatus(connected) {
        this.elements.connectionStatus.className = `status-dot ${connected ? 'connected' : ''}`;
        this.elements.statusText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    formatTime(date) {
        return date.toLocaleTimeString();
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString();
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
            console.log('Audio notification not supported');
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.brandmeisterMonitor = new BrandmeisterMonitor();
});

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
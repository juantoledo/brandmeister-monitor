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
        
        // Configuration (can be made user-configurable later)
        this.config = {
            minDuration: 4, // minimum duration in seconds
            minSilence: 10, // minimum silence in seconds
            verbose: false,
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
            activeContainer: document.getElementById('activeContainer'),
            totalCalls: document.getElementById('totalCalls'),
            lastActivity: document.getElementById('lastActivity'),
            themeSelect: document.getElementById('themeSelect'),
            // Settings elements
            minDurationInput: document.getElementById('minDuration'),
            minSilenceInput: document.getElementById('minSilence'),
            verboseCheckbox: document.getElementById('verbose'),
            monitorAllTalkgroupsCheckbox: document.getElementById('monitorAllTalkgroups'),
            saveSettingsBtn: document.getElementById('saveSettings'),
            resetSettingsBtn: document.getElementById('resetSettings'),
            settingsContainer: document.getElementById('settingsContainer')
        };

        // Bind event listeners
        this.elements.saveTgBtn.addEventListener('click', () => this.saveTalkgroup());
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        this.elements.themeSelect.addEventListener('change', (e) => this.switchTheme(e.target.value));
        
        // Settings event listeners
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Real-time settings updates for number inputs
        this.elements.minDurationInput.addEventListener('input', () => this.updateConfigFromUI());
        this.elements.minSilenceInput.addEventListener('input', () => this.updateConfigFromUI());
        
        // Real-time settings updates for checkboxes
        this.elements.verboseCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        this.elements.monitorAllTalkgroupsCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        
        // Load saved theme and settings
        this.loadTheme();
        this.loadSettings();
        
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
            this.monitoredTalkgroups = [];
            this.config.monitorAllTalkgroups = true;
            localStorage.setItem('brandmeister_talkgroup', 'all');
            localStorage.setItem('brandmeister_monitor_all', 'true');
            this.elements.currentTg.textContent = 'All Talkgroups';
            this.addLogEntry('system', 'System', `Monitoring all talkgroups`, 'Configuration Updated');
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
            this.addLogEntry('system', 'System', logText, 'Configuration Updated');
        } else {
            alert('Please enter valid talkgroup IDs separated by commas (e.g., "214,220,235") or "all" to monitor all talkgroups');
            return; // Exit early if invalid input
        }
        
        // Clear active transmissions when talkgroup changes
        this.clearActiveTransmissions();
        this.addLogEntry('system', 'System', 'Active transmissions cleared due to talkgroup change', 'Cleared Active');
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
            if (!this.config.monitorAllTalkgroups && this.monitoredTalkgroups.length > 0 && !this.monitoredTalkgroups.includes(tg)) {
                if (this.config.verbose) {
                    //console.log(`Skipping TG ${tg} - only monitoring TGs: ${this.monitoredTalkgroups.join(', ')}`);
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
                    // Update the UI to show completion
                    this.createOrUpdateTransmissionSession(sessionKey, call, 'stop');
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
                    console.log(`Updating existing active transmission for SessionID: ${callKey}`);
                }
                this.updateActiveTransmission(callKey, titleText, fieldData, eventType);
            } else {
                // Create new active transmission
                if (this.config.verbose) {
                    console.log(`Creating new active transmission for SessionID: ${callKey}`);
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

        this.totalCalls++;
        this.lastActivityTime = new Date();

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
        // Remove "no activity" message if it exists
        const noActivityMsg = this.elements.activeContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }

        // Create active transmission entry
        const activeEntry = this.createActiveTransmissionEntry(sessionKey, titleText, fieldData, eventType);
        
        // Add to active container
        this.elements.activeContainer.appendChild(activeEntry);
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
                console.log(`Updated active transmission for SessionID: ${sessionKey}, Title: ${titleText}`);
            }
        } else {
            if (this.config.verbose) {
                console.log(`No existing active transmission found for SessionID: ${sessionKey}, creating new one`);
            }
            // If we can't find the existing entry, create a new one
            this.addActiveTransmission(sessionKey, titleText, fieldData, eventType);
        }
    }

    removeActiveTransmission(sessionKey) {
        const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${sessionKey}"]`);
        if (activeEntry) {
            activeEntry.remove();
        }

        // Check if active container is empty and show "no activity" message
        if (this.elements.activeContainer.children.length === 0) {
            this.elements.activeContainer.innerHTML = '<p class="no-activity">No active transmissions</p>';
        }
    }

    clearActiveTransmissions() {
        // Clear the active container
        this.elements.activeContainer.innerHTML = '<p class="no-activity">No active transmissions</p>';
        
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
        // Clear active transmissions for the specified talkgroup
        const existingActiveEntries = this.elements.activeContainer.querySelectorAll('.active-transmission');
        existingActiveEntries.forEach(entry => {
            const sessionKey = entry.getAttribute('data-session-key');
            const group = this.transmissionGroups[sessionKey];
            // Remove if it's the same talkgroup (DMR half-duplex rule)
            if (group && group.tg === talkgroup) {
                entry.remove();
            }
        });
        
        // Mark any incomplete transmission groups as cleared for this specific talkgroup only
        for (const sessionKey in this.transmissionGroups) {
            const group = this.transmissionGroups[sessionKey];
            if (group && group.tg === talkgroup && group.status !== 'completed') {
                group.status = 'cleared';
            }
        }
        
        // Show "no activity" message if container is empty
        if (this.elements.activeContainer.children.length === 0) {
            this.elements.activeContainer.innerHTML = '<p class="no-activity">No active transmissions</p>';
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
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} new`;
        
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
                ${fieldData.duration !== null ? `<span class="field duration" data-label="Duration">${fieldData.duration.toFixed(1)}s</span>` : ''}
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
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type} new`;
        
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

    // Theme Management Methods
    switchTheme(themeName) {
        document.body.className = `theme-${themeName}`;
        localStorage.setItem('brandmeister-theme', themeName);
        this.elements.themeSelect.value = themeName;
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('brandmeister-theme') || 'material';
        this.switchTheme(savedTheme);
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
                
                // Update UI elements
                this.updateUIFromConfig();
                
            } catch (error) {
                console.log('Error loading settings from storage:', error);
                this.resetSettings();
            }
        } else {
            // First time - update UI with default values
            this.updateUIFromConfig();
        }
    }

    saveSettings() {
        const settings = {
            minDuration: this.config.minDuration,
            minSilence: this.config.minSilence,
            verbose: this.config.verbose,
            monitorAllTalkgroups: this.config.monitorAllTalkgroups
        };
        
        localStorage.setItem('brandmeister-settings', JSON.stringify(settings));
        this.addLogEntry('system', 'System', 'Settings saved successfully', 'Configuration Updated');
    }

    resetSettings() {
        // Reset to default values
        this.config.minDuration = 4;
        this.config.minSilence = 10;
        this.config.verbose = false;
        this.config.monitorAllTalkgroups = false;
        
        // Update UI
        this.updateUIFromConfig();
        
        // Save to localStorage
        this.saveSettings();
        
        this.addLogEntry('system', 'System', 'Settings reset to defaults', 'Configuration Reset');
    }

    updateConfigFromUI() {
        // Update config from UI elements
        this.config.minDuration = parseInt(this.elements.minDurationInput.value) || 4;
        this.config.minSilence = parseInt(this.elements.minSilenceInput.value) || 10;
        this.config.verbose = this.elements.verboseCheckbox.checked;
        this.config.monitorAllTalkgroups = this.elements.monitorAllTalkgroupsCheckbox.checked;
        
        // Auto-save settings when changed
        this.saveSettings();
    }

    updateUIFromConfig() {
        // Update UI elements from config
        this.elements.minDurationInput.value = this.config.minDuration;
        this.elements.minSilenceInput.value = this.config.minSilence;
        this.elements.verboseCheckbox.checked = this.config.verbose;
        this.elements.monitorAllTalkgroupsCheckbox.checked = this.config.monitorAllTalkgroups;
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

// Global function for collapsible settings panel
function toggleSettings() {
    const settingsContainer = document.getElementById('settingsContainer');
    const toggleIcon = document.getElementById('settingsToggleIcon');
    
    if (settingsContainer.classList.contains('collapsed')) {
        settingsContainer.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
        settingsContainer.style.maxHeight = '800px';
    } else {
        settingsContainer.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        settingsContainer.style.maxHeight = '0';
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
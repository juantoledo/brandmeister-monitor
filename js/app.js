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
        
        // RadioID Database for additional user information
        this.radioIDDatabase = {};
        this.radioIDLastUpdate = null;
        this.radioIDUpdateInProgress = false;
        
        // Talkgroup Manager for unified API and static data
        this.talkgroupManager = new TalkgroupManager();
        this.talkgroupUpdateInProgress = false;
        
        // Configuration (loaded from external config file)
        this.config = window.BrandmeisterConfig;

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

        // Call duration tracking
        this.activeCalls = new Map(); // SessionID -> { startTime, callsign, tg, ... }

        // Talk Group Selector state
        this.selectedTalkgroups = new Set();

        // Location & Weather Service
        this.locationWeatherService = null;
        this.weatherLoadTimers = new Map(); // Track delayed weather loading

        this.initializeUI();
        
        // Initialize talkgroup database first, then continue with other initializations
        this.initializeAsync();
    }

    async initializeAsync() {
        try {
            // Initialize TalkgroupManager with static data first
            this.talkgroupManager.initializeWithStaticData(
                window.BRANDMEISTER_TALKGROUPS || {}
            );
            
            // Initialize Location & Weather Service
            if (window.LocationWeatherService) {
                this.locationWeatherService = new window.LocationWeatherService();
                console.log('✅ Location & Weather Service initialized');
            }
            
            // Load talkgroup database from API (this will update the manager)
            await this.loadTalkgroupDatabase();
            
            // Initialize Talk Group Selector after talkgroup manager is ready
            this.initializeTalkGroupSelector();
            
            // Then load other data
            this.loadTalkgroupFromStorage();
            this.loadAliasesFromStorage();
            this.loadRadioIDDatabase();
            
            // Clean old RadioID cache entries on startup
            this.cleanRadioIDCache();
            
            // Update talkgroup status display
            this.updateTalkgroupStatus();
            
            // Initialize local/UTC time display
            this.initializeTimeDisplay();
            
            // Initialize local weather display
            this.initializeLocalWeather();
            
            console.log('✅ Brandmeister Monitor initialization complete');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            // Continue with fallback data
            this.talkgroupManager.initializeWithStaticData(
                window.BRANDMEISTER_TALKGROUPS || {}
            );
            this.initializeTalkGroupSelector(); // Initialize even with fallback data
            this.loadTalkgroupFromStorage();
            this.loadAliasesFromStorage();
            this.loadRadioIDDatabase();
        }
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
            localUtc: document.querySelector('.local-utc'),
            localWeather: document.getElementById('localWeather'),
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
            enableRadioIDLookupCheckbox: document.getElementById('enableRadioIDLookup'),
            radioIDSettings: document.getElementById('radioIDSettings'),
            enableTalkgroupAPICheckbox: document.getElementById('enableTalkgroupAPI'),
            talkgroupSettings: document.getElementById('talkgroupSettings'),
            downloadTalkgroupsBtn: document.getElementById('downloadTalkgroups'),
            clearTalkgroupCacheBtn: document.getElementById('clearTalkgroupCache'),
            talkgroupStatus: document.getElementById('talkgroupStatus'),
            colorPresets: document.getElementById('colorPresets'),
            colorPreview: document.getElementById('colorPreview'),
            colorValue: document.getElementById('colorValue'),
            saveSettingsBtn: document.getElementById('saveSettings'),
            resetSettingsBtn: document.getElementById('resetSettings'),
            settingsContainer: document.getElementById('settingsContainer'),
            // Language selector elements
            languageButton: document.getElementById('languageButton'),
            languageDropdown: document.getElementById('languageDropdown'),
            currentLanguageFlag: document.getElementById('currentLanguageFlag'),
            // Talk Group Selector elements
            tgTabs: document.querySelectorAll('.tg-tab'),
            tgTabContents: document.querySelectorAll('.tg-tab-content'),
            tgSearch: document.getElementById('tgSearch'),
            tgSearchResults: document.getElementById('tgSearchResults'),
            tgSearchList: document.getElementById('tgSearchList'),
            tgSearchControls: document.getElementById('tgSearchControls'),
            tgSelectAll: document.getElementById('tgSelectAll'),
            tgDeselectAll: document.getElementById('tgDeselectAll'),
            tgAddSelected: document.getElementById('tgAddSelected'),
            tgCloseSearch: document.getElementById('tgCloseSearch'),
            tgSelectedList: document.getElementById('tgSelectedList'),
            clearSelection: document.getElementById('clearSelection')
        };

        // Bind event listeners
        this.elements.saveTgBtn.addEventListener('click', () => this.saveTalkgroup());
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        
        // Settings event listeners
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // RadioID event listeners
        if (this.elements.enableRadioIDLookupCheckbox) {
            this.elements.enableRadioIDLookupCheckbox.addEventListener('change', () => this.toggleRadioIDSettings());
        }
        
        // Talkgroup settings event listeners
        if (this.elements.enableTalkgroupAPICheckbox) {
            this.elements.enableTalkgroupAPICheckbox.addEventListener('change', () => this.toggleTalkgroupSettings());
        }
        if (this.elements.downloadTalkgroupsBtn) {
            this.elements.downloadTalkgroupsBtn.addEventListener('click', () => this.downloadTalkgroupDatabase());
        }
        if (this.elements.clearTalkgroupCacheBtn) {
            this.elements.clearTalkgroupCacheBtn.addEventListener('click', () => this.clearTalkgroupCache());
        }
        
        // Color preset picker event listeners
        if (this.elements.colorPresets) {
            this.initializeColorPicker();
        }
        
        // Real-time settings updates for number inputs
        this.elements.minDurationInput.addEventListener('input', () => this.updateConfigFromUI());
        
        // Real-time settings updates for checkboxes
        this.elements.verboseCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        this.elements.monitorAllTalkgroupsCheckbox.addEventListener('change', () => this.updateConfigFromUI());
        
        // Load saved settings
        this.loadSettings();
        
        // Initialize Language System
        this.initializeLanguageSystem();
        
        // Allow Enter key to save talkgroup
        this.elements.talkgroupInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTalkgroup();
            }
        });

        // Sync manual input changes to visual selections
        this.elements.talkgroupInput.addEventListener('input', (e) => {
            this.syncInputToSelectedTalkGroups();
        });

        // Initialize cleanup timers
        this.startMemoryCleanupTimer();
        this.startSessionCleanupTimer();
        this.startChronometerTimer();
        
        // Initialize performance monitoring
        this.startPerformanceMonitoring();
    }

    // Initialize Language System
    initializeLanguageSystem() {
        if (!window.I18n) {
            console.warn('I18n system not available');
            return;
        }

        // Set up language button and dropdown
        if (this.elements.languageButton && this.elements.languageDropdown) {
            // Update current language flag
            this.updateCurrentLanguageFlag();
            
            // Language button click handler
            this.elements.languageButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLanguageDropdown();
            });

            // Language option click handlers
            this.elements.languageDropdown.addEventListener('click', (e) => {
                const langOption = e.target.closest('.language-option');
                if (langOption) {
                    const langCode = langOption.dataset.lang;
                    this.changeLanguage(langCode);
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.language-selector')) {
                    this.hideLanguageDropdown();
                }
            });

            // Listen for language change events
            document.addEventListener('languageChanged', (e) => {
                this.onLanguageChanged(e.detail.language);
            });
        }

        // Initialize UI with current language
        if (window.I18n) {
            window.I18n.updateUI();
        }
    }

    updateCurrentLanguageFlag() {
        if (window.I18n && this.elements.currentLanguageFlag) {
            const currentLang = window.I18n.getCurrentLanguage();
            this.elements.currentLanguageFlag.textContent = currentLang.flag;
        }
    }

    toggleLanguageDropdown() {
        if (this.elements.languageDropdown) {
            this.elements.languageDropdown.classList.toggle('show');
            this.updateLanguageDropdownOptions();
        }
    }

    hideLanguageDropdown() {
        if (this.elements.languageDropdown) {
            this.elements.languageDropdown.classList.remove('show');
        }
    }

    updateLanguageDropdownOptions() {
        if (!window.I18n) return;
        
        const currentLang = window.I18n.getCurrentLanguage();
        const options = this.elements.languageDropdown.querySelectorAll('.language-option');
        
        options.forEach(option => {
            const isActive = option.dataset.lang === currentLang.code;
            option.classList.toggle('active', isActive);
        });
    }

    changeLanguage(langCode) {
        if (window.I18n && window.I18n.setLanguage(langCode)) {
            this.updateCurrentLanguageFlag();
            this.hideLanguageDropdown();
            
            // Update dynamic content that's not handled by the automatic translation
            this.updateDynamicTranslations();
        }
    }

    onLanguageChanged(langCode) {
        // Handle language change for dynamic content
        this.updateDynamicTranslations();
        
        // Update status text based on connection state
        this.updateStatusText();
        
        // Update activity log header if it exists
        this.updateActivityLogHeader();
        
        // Update RadioID status if available
        this.updateRadioIDStatusDisplay();
        
        // Refresh weather displays to show weekdays in new language
        this.refreshWeatherDisplays();
    }

    updateDynamicTranslations() {
        // Update connection status
        this.updateStatusText();
        
        // Update current talkgroup display
        this.updateCurrentTgDisplay();
        
        // Update stats if needed
        this.updateStatsDisplay();
        
        // Update color preset tooltips
        this.updateColorPresetTooltips();
    }

    updateColorPresetTooltips() {
        if (!window.t || !this.elements.colorPresets) return;
        
        const presets = this.elements.colorPresets.querySelectorAll('.color-preset[data-i18n-title]');
        presets.forEach(preset => {
            const key = preset.getAttribute('data-i18n-title');
            preset.title = window.t(key);
        });
    }

    updateDynamicTranslations() {
        // Update connection status
        this.updateStatusText();
        
        // Update current talkgroup display
        this.updateCurrentTgDisplay();
        
        // Update stats if needed
        this.updateStatsDisplay();
    }

    updateStatusText() {
        if (!this.elements.statusText || !window.t) return;
        
        if (this.isConnected) {
            this.elements.statusText.textContent = window.t('header.status.connected');
        } else {
            this.elements.statusText.textContent = window.t('header.status.disconnected');
        }
    }

    updateCurrentTgDisplay() {
        if (!this.elements.currentTg || !window.t) return;
        
        if (this.monitoredTalkgroups.length === 0) {
            this.elements.currentTg.textContent = window.t('sidebar.monitoring.none');
        }
        // Otherwise keep the current talkgroup display as is
    }

    updateStatsDisplay() {
        // Update stats labels if we have the elements and translation function
        if (!window.t) return;
        
        // Update "Never" text for last activity if it's currently showing that
        if (this.elements.lastActivity && this.elements.lastActivity.textContent === 'Never') {
            this.elements.lastActivity.textContent = window.t('stats.never');
        }
    }

    updateActivityLogHeader() {
        // Update activity log header if it exists
        const existingHeader = this.elements.logContainer.querySelector('.log-header-compact');
        if (existingHeader) {
            existingHeader.remove();
            this.addLogHeader();
        }
    }

    updateRadioIDStatusDisplay() {
        // Re-run the RadioID status update to apply new language
        if (this.elements.radioIDStatus) {
            this.updateRadioIDStatus();
        }
    }

    // Initialize Talk Group Selector
    initializeTalkGroupSelector() {
        // Tab switching
        this.elements.tgTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTalkGroupTab(targetTab);
            });
        });

        // Search functionality
        if (this.elements.tgSearch) {
            this.elements.tgSearch.addEventListener('input', (e) => {
                this.handleTalkGroupSearch(e.target.value);
            });

            // Hide search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tg-search-container')) {
                    this.hideTalkGroupSearchResults();
                }
            });
        }

        // Multi-select controls
        if (this.elements.tgSelectAll) {
            this.elements.tgSelectAll.addEventListener('click', () => this.selectAllSearchResults());
        }
        if (this.elements.tgDeselectAll) {
            this.elements.tgDeselectAll.addEventListener('click', () => this.deselectAllSearchResults());
        }
        if (this.elements.tgAddSelected) {
            this.elements.tgAddSelected.addEventListener('click', () => this.addSelectedTalkgroups());
        }
        if (this.elements.tgCloseSearch) {
            this.elements.tgCloseSearch.addEventListener('click', () => this.hideTalkGroupSearchResults());
        }

        // Initialize search state
        this.searchSelectedTalkgroups = new Set();

        // Clear selection button
        if (this.elements.clearSelection) {
            this.elements.clearSelection.addEventListener('click', () => {
                this.clearTalkGroupSelection();
            });
        }

        // Then load saved selections and update visuals
        this.loadSelectedTalkGroupsFromStorage();
        
        // Sync existing talkgroup input with visual selector if no visual selections exist
        this.syncExistingTalkgroupToVisualSelector();
    }

    switchTalkGroupTab(tabName) {
        // Update tab buttons
        this.elements.tgTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.elements.tgTabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }



    handleTalkGroupSearch(query) {
        if (!query.trim()) {
            this.hideTalkGroupSearchResults();
            return;
        }

        if (typeof searchTalkgroups === 'undefined') return;

        const results = searchTalkgroups(query.trim());
        this.showTalkGroupSearchResults(results);
    }

    showTalkGroupSearchResults(results) {
        if (!this.elements.tgSearchResults || !this.elements.tgSearchList) return;

        // Show controls if we have results
        if (this.elements.tgSearchControls) {
            this.elements.tgSearchControls.style.display = results.length > 0 ? 'block' : 'none';
        }

        if (results.length === 0) {
            this.elements.tgSearchList.innerHTML = '<div class="tg-search-result">No talk groups found</div>';
        } else {
            this.elements.tgSearchList.innerHTML = results.map(result => `
                <div class="tg-search-result" data-tg-id="${result.id}">
                    <input type="checkbox" class="tg-search-result-checkbox" data-tg-id="${result.id}">
                    <div class="tg-search-result-content">
                        <div class="tg-search-result-id">${result.id}</div>
                        <div class="tg-search-result-name">${result.name}</div>
                    </div>
                </div>
            `).join('');

            // Add click handlers for rows and checkboxes
            this.elements.tgSearchList.querySelectorAll('.tg-search-result[data-tg-id]').forEach(item => {
                const checkbox = item.querySelector('.tg-search-result-checkbox');
                const tgId = item.dataset.tgId;

                // Handle row click (toggle checkbox)
                item.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        checkbox.checked = !checkbox.checked;
                        this.updateSearchSelection(tgId, checkbox.checked);
                    }
                });

                // Handle checkbox change
                checkbox.addEventListener('change', (e) => {
                    this.updateSearchSelection(tgId, e.target.checked);
                });

                // Restore previous selection state
                if (this.searchSelectedTalkgroups.has(tgId)) {
                    checkbox.checked = true;
                    item.classList.add('selected');
                }
            });
        }

        this.updateSearchControls();
        this.elements.tgSearchResults.classList.add('show');
    }

    hideTalkGroupSearchResults() {
        if (this.elements.tgSearchResults) {
            this.elements.tgSearchResults.classList.remove('show');
            this.searchSelectedTalkgroups.clear();
            if (this.elements.tgSearchControls) {
                this.elements.tgSearchControls.style.display = 'none';
            }
        }
    }

    updateSearchSelection(tgId, selected) {
        const item = this.elements.tgSearchList.querySelector(`.tg-search-result[data-tg-id="${tgId}"]`);
        if (!item) return;

        if (selected) {
            this.searchSelectedTalkgroups.add(tgId);
            item.classList.add('selected');
        } else {
            this.searchSelectedTalkgroups.delete(tgId);
            item.classList.remove('selected');
        }

        this.updateSearchControls();
    }

    updateSearchControls() {
        if (!this.elements.tgAddSelected) return;

        const count = this.searchSelectedTalkgroups.size;
        this.elements.tgAddSelected.textContent = `Add Selected (${count})`;
        this.elements.tgAddSelected.disabled = count === 0;
    }

    selectAllSearchResults() {
        if (!this.elements.tgSearchList) return;

        const checkboxes = this.elements.tgSearchList.querySelectorAll('.tg-search-result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.updateSearchSelection(checkbox.dataset.tgId, true);
        });
    }

    deselectAllSearchResults() {
        if (!this.elements.tgSearchList) return;

        const checkboxes = this.elements.tgSearchList.querySelectorAll('.tg-search-result-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.updateSearchSelection(checkbox.dataset.tgId, false);
        });
    }

    addSelectedTalkgroups() {
        if (this.searchSelectedTalkgroups.size === 0) return;

        // Get talkgroup data for selected IDs
        const selectedTalkgroups = Array.from(this.searchSelectedTalkgroups).map(id => {
            const result = this.elements.tgSearchList.querySelector(`.tg-search-result[data-tg-id="${id}"]`);
            if (result) {
                const name = result.querySelector('.tg-search-result-name').textContent;
                return { id, name };
            }
            return null;
        }).filter(Boolean);

        // Add each selected talkgroup
        selectedTalkgroups.forEach(({ id, name }) => {
            this.toggleTalkGroupSelection(id, name);
        });

        // Clear search and close results
        this.elements.tgSearch.value = '';
        this.hideTalkGroupSearchResults();

        // Show success feedback
        console.log(`✅ Added ${selectedTalkgroups.length} talk groups to selection`);
    }

    toggleTalkGroupSelection(id, name, element = null) {
        if (this.selectedTalkgroups.has(id)) {
            this.selectedTalkgroups.delete(id);
            if (element) element.classList.remove('selected');
        } else {
            this.selectedTalkgroups.add(id);
            if (element) element.classList.add('selected');
        }

        this.updateSelectedTalkGroupsDisplay();
        this.syncSelectedTalkGroupsToInput();
        this.saveSelectedTalkGroupsToStorage();
    }

    updateSelectedTalkGroupsDisplay() {
        if (!this.elements.tgSelectedList) return;

        if (this.selectedTalkgroups.size === 0) {
            this.elements.tgSelectedList.innerHTML = '<span class="tg-selected-empty">No talk groups selected</span>';
            return;
        }

        const tags = Array.from(this.selectedTalkgroups).map(id => {
            const name = typeof getTalkgroupName !== 'undefined' ? getTalkgroupName(id) : `TG ${id}`;
            return `
                <span class="tg-selected-tag">
                    <span class="tg-selected-tag-id">${id}</span>
                    <span class="tg-selected-tag-remove" data-tg-id="${id}"><span class="material-icons small">close</span></span>
                </span>
            `;
        }).join('');

        this.elements.tgSelectedList.innerHTML = tags;

        // Add remove handlers
        this.elements.tgSelectedList.querySelectorAll('.tg-selected-tag-remove').forEach(removeBtn => {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = removeBtn.dataset.tgId;
                this.toggleTalkGroupSelection(id, '', null);
                this.updateTalkGroupSelectionVisuals();
            });
        });
    }

    updateTalkGroupSelectionVisuals() {
        // Update category grid
        this.elements.tgCategoryGrid?.querySelectorAll('.tg-category-item').forEach(item => {
            const id = item.dataset.tgId;
            item.classList.toggle('selected', this.selectedTalkgroups.has(id));
        });
    }

    syncSelectedTalkGroupsToInput() {
        if (this.selectedTalkgroups.size === 0) {
            this.elements.talkgroupInput.value = '';
        } else {
            const sortedIds = Array.from(this.selectedTalkgroups).sort((a, b) => parseInt(a) - parseInt(b));
            this.elements.talkgroupInput.value = sortedIds.join(',');
        }
    }

    syncInputToSelectedTalkGroups() {
        const inputValue = this.elements.talkgroupInput.value.trim();
        
        // Clear current selections
        this.selectedTalkgroups.clear();
        
        if (inputValue && inputValue.toLowerCase() !== 'all') {
            // Parse comma-separated values
            const tgIds = inputValue.split(',')
                .map(id => id.trim())
                .filter(id => id && /^\d+$/.test(id)); // Only valid numeric IDs
            
            // Add to selected set
            tgIds.forEach(id => {
                this.selectedTalkgroups.add(id);
            });
        }
        
        // Update visual display
        this.updateSelectedTalkGroupsDisplay();
        this.updateTalkGroupSelectionVisuals();
        this.saveSelectedTalkGroupsToStorage();
    }

    clearTalkGroupSelection() {
        this.selectedTalkgroups.clear();
        this.updateSelectedTalkGroupsDisplay();
        this.updateTalkGroupSelectionVisuals();
        this.syncSelectedTalkGroupsToInput();
        this.saveSelectedTalkGroupsToStorage();
    }

    syncExistingTalkgroupToVisualSelector() {
        // If no visual selections exist but talkgroup input has value, sync it
        if (this.selectedTalkgroups.size === 0 && this.elements.talkgroupInput.value) {
            const inputValue = this.elements.talkgroupInput.value.trim();
            if (inputValue && inputValue.toLowerCase() !== 'all') {
                // Parse the existing input and add to visual selector
                const tgIds = inputValue.split(',')
                    .map(id => id.trim())
                    .filter(id => id && /^\d+$/.test(id));
                
                tgIds.forEach(id => {
                    this.selectedTalkgroups.add(id);
                });
                
                // Update visual display
                this.updateSelectedTalkGroupsDisplay();
                this.updateTalkGroupSelectionVisuals();
                this.saveSelectedTalkGroupsToStorage();
            }
        }
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
        statusLive: '<span class="card-status live"><span class="material-icons small">fiber_manual_record</span> LIVE</span>',
        statusCompleted: '<span class="card-status completed"><span class="material-icons small">check_circle</span> COMPLETED</span>',
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

    startChronometerTimer() {
        // Clear any existing timer
        if (this.chronometerTimer) {
            clearInterval(this.chronometerTimer);
        }
        
        // Update chronometers every second
        this.chronometerTimer = setInterval(() => {
            this.updateActiveCallChronometers();
        }, 1000);
    }

    updateActiveCallChronometers() {
        // Update duration display for all active transmissions
        const activeTransmissions = Object.keys(this.transmissionGroups).filter(sessionKey => {
            const group = this.transmissionGroups[sessionKey];
            return group && group.status === 'active' && group.startTime;
        });

        if (this.config.verbose && activeTransmissions.length > 0) {
            console.log(`📊 Updating chronometers for ${activeTransmissions.length} active calls`);
        }

        activeTransmissions.forEach(sessionKey => {
            const group = this.transmissionGroups[sessionKey];
            const activeElement = document.getElementById(`active-${sessionKey}`);
            if (activeElement) {
                const now = Math.floor(Date.now() / 1000);
                const currentDuration = now - group.startTime;
                const durationElement = activeElement.querySelector('.call-duration');
                if (durationElement) {
                    durationElement.textContent = this.formatDuration(currentDuration);
                }
            }
        });
    }

    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        }
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
                logEntries: document.querySelectorAll('.log-entry').length,
                radioIDCache: this.getRadioIDCacheStats()
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
        
        // Cleanup time display interval
        this.cleanupTimeDisplay();
        
        // Clear all memory references
        this.transmissionGroups = {};
        // this.activeCalls = {}; // Removed - using session-based tracking
        this.callsignAliases = {};
    }

    // Helper function to animate transmission card removal
    animateTransmissionRemoval(element, callback) {
        if (!element) {
            if (callback) callback();
            return;
        }

        // Add exit animation class
        element.classList.add('exiting');
        
        // Wait for animation to complete, then remove element
        setTimeout(() => {
            element.remove();
            if (callback) callback();
        }, 500); // Match the CSS animation duration
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
        } else {
            // No saved talkgroup - default to TG 91 (Worldwide)
            this.monitoredTalkgroups = [91];
            this.config.monitorAllTalkgroups = false;
            this.elements.talkgroupInput.value = '91';
            this.elements.currentTg.textContent = 'TG 91';
            
            // Also add to visual selection system
            this.selectedTalkgroups.add('91');
            
            if (this.config.verbose) {
                console.log('🌍 No saved talkgroup found - defaulting to TG 91 (Worldwide)');
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

    // Selected Talk Groups Storage
    saveSelectedTalkGroupsToStorage() {
        try {
            const selectedArray = Array.from(this.selectedTalkgroups);
            localStorage.setItem('brandmeister_selected_talkgroups', JSON.stringify(selectedArray));
        } catch (error) {
            this.logError('Error saving selected talk groups to storage', { error: error.message });
        }
    }

    loadSelectedTalkGroupsFromStorage() {
        try {
            const saved = localStorage.getItem('brandmeister_selected_talkgroups');
            if (saved) {
                const selectedArray = JSON.parse(saved);
                this.selectedTalkgroups = new Set(selectedArray);
                // Update display and visuals after loading
                this.updateSelectedTalkGroupsDisplay();
                this.updateTalkGroupSelectionVisuals();
                this.syncSelectedTalkGroupsToInput();
            }
        } catch (error) {
            this.logError('Error loading selected talk groups from storage', { error: error.message });
            this.selectedTalkgroups = new Set();
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
            // Remove all event listeners before disconnecting
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.onDisconnect();
    }

    onConnect() {
        const message = window.t ? window.t('message.connected') : 'Connected to Brandmeister network';
        this.logInfo(message, { connectionStatus: 'established' });
        this.isConnected = true;
        this.updateConnectionStatus(true);
        // System message removed - only log transmissions
        
        // Add header to activity log if it doesn't exist
        if (!this.elements.logContainer.querySelector('.log-header-compact')) {
            this.addLogHeader();
        }
        
        this.elements.connectBtn.disabled = true;
        this.elements.disconnectBtn.disabled = false;
    }

    onDisconnect() {
        const message = window.t ? window.t('message.disconnected') : 'Disconnected from Brandmeister network';
        this.logInfo(message, { connectionStatus: 'lost' });
        this.isConnected = false;
        this.updateConnectionStatus(false);
        // System message removed - only log transmissions
        
        // Clear all active transmissions on disconnect
        this.clearActiveTransmissions();
        
        // Cleanup memory when disconnected
        this.performMemoryCleanup();
        
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
    }

    onMqttMessage(data) {
        // Don't process messages if not connected
        if (!this.isConnected) {
            return;
        }
        
        this.startPerformanceTimer('messageProcessing');
        
        try {
            const call = JSON.parse(data.payload);
            
            // PRIMARY FILTER: Extract talkgroup and event info from actual data
            const tg = call.DestinationID;
            const sessionID = call.SessionID; // Use SessionID as unique identifier
            const event = call.Event;
            const callsign = call.SourceCall;
            const flagSet = call.FlagSet;
            
            // FLAGSET FILTER: Skip transmissions with FlagSet == 1 (indicates transmission errors)
            if (flagSet === 1) {
                if (this.config.verbose) {
                    console.log(`Skipping transmission from ${callsign} on TG ${tg} - FlagSet indicates transmission error`);
                }
                this.endPerformanceTimer('messageProcessing', { result: 'flagset_filtered', tg, sessionID, flagSet });
                return;
            }
            
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
                
                // Always log all transmissions regardless of duration
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

    createOrUpdateTransmissionGroup(sessionKey, call) {
        const group = this.transmissionGroups[sessionKey];
        if (!group) {
            if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionGroup called for ${sessionKey} but no group found`);
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
            console.log(`[${timestamp}] DEBUG: createOrUpdateTransmissionGroup for ${callsign} (SessionID: ${sessionKey}), ContextID: ${group.contextID || 'N/A'}, status: ${group.status}, startTime: ${group.startTime}, stopTime: ${group.stopTime}`);
            if (group.status === 'completed' && group.stopTime) {
                const duration = group.stopTime - group.startTime;
                console.log(`[${timestamp}] DEBUG: Completed transmission duration: ${duration.toFixed(1)}s`);
            }
        }
        
        // Create title: Radio ID - Source Call using accumulated session data
        let titleText = group.callsign || callsign;
        const useSourceID = group.sourceID || sourceID;
        if (useSourceID && String(useSourceID).trim() !== '') {
            titleText = `${useSourceID} ${group.callsign || callsign}`;
        }

        // Create individual field data object using accumulated session data
        const fieldData = {
            tg: tg,
            sessionID: group.sessionID || '',
            sourceID: group.sourceID || sourceID || '',  // Use accumulated data first
            sourceName: group.sourceName || sourceName || '',  // Use accumulated data first
            alias: group.alias || alias || '',  // Use accumulated data first
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
        
        // Debug logging for transmission processing
        if (this.config.verbose) {
            console.log(`🔄 Processing transmission - Status: ${group.status}, Type: ${eventType}, Callsign: ${titleText}`);
            console.log(`📊 Session data accumulated:`, {
                callsign: group.callsign,
                sourceName: group.sourceName,
                sourceID: group.sourceID,
                alias: group.alias,
                linkName: group.linkName,
                sessionID: group.sessionID
            });
        }
        
        // Direct UI Updates based on session state
        if (group.status === 'completed') {
            // Check duration filter before logging
            const duration = fieldData.duration || 0;
            if (duration < this.config.minDuration) {
                if (this.config.verbose) {
                    console.log(`⏱️ Skipping transmission - Duration ${duration}s is below minimum threshold of ${this.config.minDuration}s: ${titleText}`);
                }
                // Remove from active display without logging
                const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
                if (activeEntry) {
                    this.animateTransmissionRemoval(activeEntry);
                }
                return; // Exit early - don't log this transmission
            }
            
            if (this.config.verbose) {
                console.log(`✅ Completed transmission - Adding to activity log: ${titleText}, Duration: ${fieldData.duration}s`);
            }
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
            const activeEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
            if (activeEntry) {
                this.animateTransmissionRemoval(activeEntry);
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] DEBUG: Successfully removed active transmission from UI (SessionID: ${sessionKey})`);
                }
            } else if (this.config.verbose) {
                const timestamp = new Date().toLocaleString();
                console.log(`[${timestamp}] DEBUG: Active transmission not found in UI for removal (SessionID: ${sessionKey}), selector: [data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
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
            const existingActiveEntry = this.elements.activeContainer.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
            
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
                if (radioIdElement) radioIdElement.textContent = group.sourceID || '-';
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
                        <span class="card-status live"><span class="material-icons small">fiber_manual_record</span> LIVE</span>
                    `;
                }
                
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Updated active transmission UI for SessionID: ${sessionKey}, ContextID: ${group.contextID || 'N/A'}, Title: ${titleText}`);
                }
                
            } else {
                // Create new active transmission UI
                if (this.config.verbose) {
                    const timestamp = new Date().toLocaleString();
                    console.log(`[${timestamp}] Creating new active transmission UI for ${titleText} (SessionID: ${sessionKey}), ContextID: ${group.contextID || 'N/A'}, TG: ${tg}`);
                }
                
                // Remove "no activity" message if it exists
                const noActivityMsg = this.elements.activeContainer.querySelector('.no-activity');
                if (noActivityMsg) {
                    noActivityMsg.remove();
                }

                // Create new active entry
                const activeEntry = document.createElement('div');
                activeEntry.className = 'active-transmission';
                activeEntry.id = `active-${sessionKey}`;
                activeEntry.setAttribute('data-session-key', this.escapeCSSSelector(sessionKey));
                
                // Extract callsign for QRZ link
                const callsign = this.extractCallsignFromTitle(titleText);
                const qrzLink = this.createQRZLogbookLink(callsign);
                const phoneticCallsign = this.callsignToPhonetic(callsign);
                
                // Lookup RadioID information
                const radioIdInfo = this.lookupRadioID(group.sourceID);
                let locationInfo = '';
                let flagBackgroundUrl = '';
                let countryCode = '';
                let timeWeatherInfo = '';
                
                if (radioIdInfo) {
                    const city = radioIdInfo.city;
                    const state = radioIdInfo.state;
                    const country = radioIdInfo.country;
                    
                    const locationParts = [city, state, country].filter(part => part && part.trim() !== '');
                    if (locationParts.length > 0) {
                        countryCode = this.getCountryCode(country);
                        // Create flag background URL from flag-icons CDN
                        flagBackgroundUrl = countryCode ? `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${countryCode}.svg` : '';
                        // Make location text clickable for Google search
                        locationInfo = `<div class="card-location card-location-link" title="Click to search location on Google">${locationParts.join(', ')}</div>`;
                        
                        // Add time and weather info placeholder only if not monitoring all talkgroups
                        if (!this.config.monitorAllTalkgroups) {
                            timeWeatherInfo = `<div class="card-time-weather" data-city="${city}" data-state="${state}" data-country="${country}">
                                <span class="time-info"><span class="material-icons small">schedule</span> Loading...</span>
                                <span class="weather-info"><span class="material-icons small">public</span> --°</span>
                            </div>`;
                            
                            // Async load time and weather
                            this.loadTimeWeatherInfo(city, state, country, sessionKey);
                        }
                    }
                }
                
                // Use RadioID name if available, otherwise fallback to group sourceName
                const displayName = radioIdInfo?.name || sourceName;
                
                activeEntry.innerHTML = `
                    <div class="card-main">
                        <div class="card-header">
                            <div class="card-identity">
                                <div class="card-callsign">${callsign}</div>
                                <div class="card-radio-id">${group.sourceID || '-'}</div>
                            </div>
                            <div class="card-controls">
                                ${qrzLink}
                                <span class="card-tg">TG ${tg || '?'}</span>
                                <span class="card-status live"><span class="material-icons small">fiber_manual_record</span> LIVE</span>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="card-left">
                                ${displayName ? `<div class="card-source-name">${displayName}</div>` : ''}
                                ${locationInfo}
                                ${timeWeatherInfo}
                                <div class="card-details">
                                    ${alias ? `<div class="card-alias">${alias}</div>` : ''}
                                    ${phoneticCallsign ? `<div class="card-phonetic">${phoneticCallsign}</div>` : ''}
                                </div>
                            </div>
                            <div class="card-chronometer">
                                <span class="call-duration">0s</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // Apply flag background if available
                if (flagBackgroundUrl) {
                    activeEntry.style.backgroundImage = `url('${flagBackgroundUrl}')`;
                }
                
                // Add to active container at the bottom (newest last)
                this.elements.activeContainer.appendChild(activeEntry);
                
                // Add click handler for location link if it exists
                if (countryCode && radioIdInfo) {
                    const locationLink = activeEntry.querySelector('.card-location-link');
                    if (locationLink) {
                        locationLink.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            const city = radioIdInfo.city;
                            const state = radioIdInfo.state;
                            const country = radioIdInfo.country;
                            const locationParts = [city, state, country].filter(part => part && part.trim() !== '');
                            const searchQuery = locationParts.join(' ');
                            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                            window.open(googleUrl, '_blank');
                        });
                    }
                }
                
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
                this.animateTransmissionRemoval(activeEntry);
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
        
        // Clean up weather loading timers for completed transmissions
        this.cleanupWeatherTimers();
        
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
            
            // Mark as stale if no updates for configured time (internal tracking only)
            if (timeSinceUpdate > this.config.maxInactivityTime && session.state === 'live') {
                session.state = 'stale';
                session.status = 'stale';
                staleSessions++;
                // No UI update - keep sessions looking live until auto-completion
                
                if (this.config.verbose) {
                    this.logDebug('Session marked as stale (internal only)', {
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
                
                // Remove from active UI (no stale state shown)
                this.removeSessionFromActiveUI(sessionKey);
                
                if (this.config.verbose) {
                    this.logDebug('Session auto-completed', {
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
        
        // Keep session data updated but don't show stale/orphaned states in UI
        // The cleanup timers continue to work in the background
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
        
        const entries = this.elements.logContainer.querySelectorAll('.log-entry, .log-entry-compact');
        if (entries.length > this.config.maxLogEntries) {
            // Remove excess entries from the end (but keep header)
            for (let i = this.config.maxLogEntries; i < entries.length; i++) {
                entries[i].remove();
            }
        }
    }

    updateTransmissionGroupDisplay(sessionKey) {
        const group = this.transmissionGroups[sessionKey];
        if (!group || !group.logEntry) return;

        this.createOrUpdateTransmissionGroup(sessionKey, { DestinationID: group.tg });
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
        return `<a href="https://www.qrz.com/db/${encodeURIComponent(cleanCallsign)}" target="_blank" class="qrz-link" title="Look up ${cleanCallsign} on QRZ.com"><span class="material-icons small">assignment</span> QRZ</a>`;
    }

    addLogHeader() {
        // Create compact header for activity log (removed TG and QRZ columns)
        const headerHtml = `
            <div class="log-header-compact">
                <div class="log-time">${window.t ? window.t('activity.log.header.time') : 'Time'}</div>
                <div class="log-call">${window.t ? window.t('activity.log.header.call') : 'Call'}</div>
                <div class="log-name">${window.t ? window.t('activity.log.header.name') : 'Name from Location'}</div>
                <div class="log-alias">${window.t ? window.t('activity.log.header.alias') : 'Alias'}</div>
                <div class="log-duration">${window.t ? window.t('activity.log.header.duration') : 'Duration'}</div>
            </div>
        `;
        
        // Remove any existing "no activity" message
        const noActivityMsg = this.elements.logContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }
        
        // Add header at the beginning of log container
        this.elements.logContainer.insertAdjacentHTML('afterbegin', headerHtml);
    }

    addLogEntryWithFields(type, callsign, fieldData, event) {
        // Only log actual transmissions, filter out system messages
        const transmissionTypes = ['session-start', 'session-stop', 'transmission-complete'];
        
        if (!transmissionTypes.includes(type)) {
            if (this.config.verbose) {
                console.log(`🚫 Skipping event type: ${type} (not in transmissionTypes)`);
            }
            return; // Skip system messages
        }

        // Log all transmissions for debugging (removed duration filter)
        if (this.config.verbose && fieldData.duration !== null) {
            const logMessage = window.t ? 
                `${window.t('activity.log.transmission.from')} ${callsign} (${fieldData.duration.toFixed(1)}s)` :
                `Logging transmission from ${callsign} (${fieldData.duration.toFixed(1)}s)`;
            console.log(`📻 ${logMessage}`);
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry-compact ${type} new`;
        
        const timestamp = new Date().toLocaleString('en-US', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit', 
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // Extract callsign for QRZ link
        const callsignForQRZ = this.extractCallsignFromTitle(callsign);
        const qrzLink = this.createQRZLogbookLink(callsignForQRZ);
        
        // Parse radio ID and callsign if in "RadioID Callsign" format
        const parts = callsign.trim().split(' ');
        const actualCallsign = parts[parts.length - 1];
        const radioID = parts.length > 1 ? parts[0] : null;
        
        // Lookup RadioID information
        const radioIdInfo = radioID ? this.lookupRadioID(radioID) : null;
        let locationText = '-';
        let flagIcon = '<span class="material-icons small">public</span>';
        
        if (radioIdInfo) {
            const city = radioIdInfo.city;
            const state = radioIdInfo.state;
            const country = radioIdInfo.country;
            
            const locationParts = [city, state, country].filter(part => part && part.trim() !== '');
            if (locationParts.length > 0) {
                locationText = locationParts.join(', ');
                const countryCode = this.getCountryCode(country);
                flagIcon = countryCode ? `<span class="fi fi-${countryCode}" title="${country}"></span>` : '<span class="material-icons small">public</span>';
            }
        }
        
        // Get operator name from RadioID database
        const operatorName = radioIdInfo?.name || fieldData.sourceName || '-';
        
        // Talker alias (fallback to empty if not available)
        const talkerAlias = fieldData.alias || '';
        
        // Talk group
        const talkGroup = fieldData.tg ? `TG ${fieldData.tg}` : '-';
        
        // Duration (if available)
        const durationText = fieldData.duration !== null ? `${fieldData.duration.toFixed(1)}s` : '';
        
        // Status indicator
        const isActive = fieldData.status === 'Active';
        const statusIcon = isActive ? '<span class="material-icons small">fiber_manual_record</span>' : '<span class="material-icons small">check_circle</span>';
        
        // Get country code for background flag
        let countryCode = '';
        if (radioIdInfo?.country) {
            countryCode = this.getCountryCode(radioIdInfo.country);
        }
        
        // Create name-location text with proper handling of unknowns
        let nameLocationText;
        if (operatorName === '-' && locationText === '-') {
            nameLocationText = '—';
        } else {
            nameLocationText = `${operatorName} from ${locationText}`;
        }
        
        // Create one-line compact layout with flag background and callsign as QRZ link
        logEntry.innerHTML = `
            <div class="compact-log-line" data-country="${countryCode}" title="${radioIdInfo?.country || '-'}">
                <div class="compact-log-line-left">
                    <span class="compact-timestamp">${timestamp}</span>
                    <a href="https://www.qrz.com/db/${encodeURIComponent(actualCallsign)}" target="_blank" class="compact-callsign qrz-callsign" title="Look up ${actualCallsign} on QRZ.com">${actualCallsign}</a>
                    <span class="compact-talkgroup">${talkGroup}</span>
                </div>
                <div class="compact-log-line-right">
                    ${talkerAlias ? `<span class="compact-alias">💬 ${talkerAlias}</span>` : '<span class="compact-alias-empty">—</span>'}
                    ${durationText ? `<span class="compact-duration">${durationText}</span>` : '<span class="compact-duration-empty">—</span>'}
                </div>
            </div>
        `;

        // Remove "no activity" message if it exists
        const noActivityMsg = this.elements.logContainer.querySelector('.no-activity');
        if (noActivityMsg) {
            noActivityMsg.remove();
        }

        // Add new entry at the bottom
        this.elements.logContainer.appendChild(logEntry);

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
            statusElement.innerHTML = isActive ? '<span class="material-icons small">fiber_manual_record</span> LIVE' : '<span class="material-icons small">check_circle</span> COMPLETED';
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

        // Add new entry at the bottom
        this.elements.logContainer.appendChild(logEntry);

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

    clearActiveTransmissions() {
        // Clear active transmissions UI
        this.elements.activeContainer.innerHTML = '';
        this.elements.activeContainer.appendChild(this.createNoActivityElement(this._htmlFragments.noActivityActive));
        
        // Clear transmission groups data
        this.transmissionGroups = {};
        
        // Reset session tracking
        this.sessionSequence = 0;
        
        if (this.config.verbose) {
            console.log('🧹 Cleared all active transmissions on disconnect');
        }
    }



    updateConnectionStatus(connected) {
        this.elements.connectionStatus.className = `status-dot ${connected ? 'connected' : ''}`;
        if (window.t) {
            this.elements.statusText.textContent = connected ? 
                window.t('header.status.connected') : 
                window.t('header.status.disconnected');
        } else {
            this.elements.statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }
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
                this.config.minDuration = settings.minDuration || 2;
                this.config.verbose = settings.verbose || false;
                this.config.monitorAllTalkgroups = settings.monitorAllTalkgroups || false;
                this.config.enableRadioIDLookup = settings.enableRadioIDLookup !== undefined ? settings.enableRadioIDLookup : true;
                this.config.enableTalkgroupAPI = settings.enableTalkgroupAPI !== undefined ? settings.enableTalkgroupAPI : false;
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
            enableRadioIDLookup: this.config.enableRadioIDLookup,
            enableTalkgroupAPI: this.config.enableTalkgroupAPI,
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

    // Save UI state (sidebar and console) to localStorage
    saveUIState() {
        console.log('🔄 saveUIState called');
        try {
            const sidebar = document.getElementById('sidebar');
            const consolePanel = document.getElementById('consolePanel');
            
            console.log('🔍 Elements found:', {
                sidebar: !!sidebar,
                consolePanel: !!consolePanel,
                sidebarId: sidebar?.id,
                consolePanelId: consolePanel?.id
            });
            
            if (sidebar && consolePanel) {
                const uiState = {
                    sidebarOpen: sidebar.classList.contains('open'),
                    sidebarCollapsed: sidebar.classList.contains('collapsed'),
                    consoleMinimized: consolePanel.classList.contains('minimized'),
                    consoleAutoCollapsed: consolePanel.classList.contains('auto-collapsed'),
                    timestamp: Date.now()
                };
                
                localStorage.setItem('brandmeister-ui-state', JSON.stringify(uiState));
                console.log('✅ UI state saved successfully:', uiState);
            } else {
                console.warn('❌ Missing elements - cannot save UI state');
            }
        } catch (error) {
            console.warn('❌ Failed to save UI state:', error);
        }
    }

    // Restore UI state from localStorage
    restoreUIState() {
        console.log('🔄 restoreUIState called');
        try {
            const savedState = localStorage.getItem('brandmeister-ui-state');
            console.log('💾 Saved state from localStorage:', savedState);
            
            if (!savedState) {
                console.log('❌ No saved UI state found');
                return;
            }

            const uiState = JSON.parse(savedState);
            console.log('📋 Parsed UI state:', uiState);
            
            const sidebar = document.getElementById('sidebar');
            const consolePanel = document.getElementById('consolePanel');
            const appLayout = document.querySelector('.app-layout');
            const consoleToggle = document.getElementById('consoleToggle');

            console.log('🔍 Elements found for restore:', {
                sidebar: !!sidebar,
                consolePanel: !!consolePanel,
                appLayout: !!appLayout,
                consoleToggle: !!consoleToggle
            });

            if (!sidebar || !consolePanel) {
                console.warn('❌ Missing required elements for restore');
                return;
            }

            console.log('🔧 Restoring UI state...');

            // Restore sidebar state
            if (uiState.sidebarOpen) {
                sidebar.classList.add('open');
                console.log('  ↔️ Sidebar: opened');
            } else {
                sidebar.classList.remove('open');
                console.log('  ↔️ Sidebar: closed');
            }

            if (uiState.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                console.log('  ↔️ Sidebar: collapsed');
            } else {
                sidebar.classList.remove('collapsed');
                console.log('  ↔️ Sidebar: expanded');
            }

            // Restore console state
            if (uiState.consoleMinimized) {
                consolePanel.classList.add('minimized');
                if (appLayout) appLayout.classList.add('console-minimized');
                if (consoleToggle) consoleToggle.textContent = '▲';
                console.log('  📱 Console: minimized');
            } else {
                consolePanel.classList.remove('minimized');
                if (appLayout) appLayout.classList.remove('console-minimized');
                if (consoleToggle) consoleToggle.textContent = '▼';
                console.log('  📱 Console: expanded');
            }

            if (uiState.consoleAutoCollapsed) {
                consolePanel.classList.add('auto-collapsed');
                console.log('  📱 Console: auto-collapsed');
            } else {
                consolePanel.classList.remove('auto-collapsed');
                console.log('  📱 Console: not auto-collapsed');
            }

            console.log('✅ UI state restored successfully');
            this.logDebug('UI state restored successfully');
        } catch (error) {
            console.warn('❌ Failed to restore UI state:', error);
        }
    }

    resetSettings() {
        // Reset to default values
        this.config.minDuration = 2; // Reset to 2 seconds default
        this.config.verbose = false;
        this.config.monitorAllTalkgroups = false;
        this.config.enableRadioIDLookup = true;
        this.config.primaryColor = '#0066cc';
        
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
        
        // Check if user is trying to enable "Monitor All Talkgroups"
        const newMonitorAllTalkgroups = this.elements.monitorAllTalkgroupsCheckbox.checked;
        
        // Show warning when enabling "Monitor All Talkgroups"
        if (!previousMonitorAllTalkgroups && newMonitorAllTalkgroups) {
            const confirmed = confirm(
                '⚠️ WARNING: Monitor All Talkgroups\n\n' +
                'This will monitor ALL talkgroup activity on the network!\n\n' +
                '• The UI will become very busy with transmissions\n' +
                '• Performance may be impacted\n' +
                '• Best used for network monitoring purposes\n\n' +
                'Are you sure you want to continue?'
            );
            
            if (!confirmed) {
                // User cancelled - revert the checkbox
                this.elements.monitorAllTalkgroupsCheckbox.checked = false;
                return; // Exit without updating config
            }
        }
        
        // Update config from UI elements
        this.config.minDuration = parseInt(this.elements.minDurationInput.value) || 0;
        this.config.verbose = this.elements.verboseCheckbox.checked;
        this.config.monitorAllTalkgroups = newMonitorAllTalkgroups;
        if (this.elements.enableRadioIDLookupCheckbox) {
            this.config.enableRadioIDLookup = this.elements.enableRadioIDLookupCheckbox.checked;
        }
        
        // Clear active transmissions if monitoring scope changed
        if (previousMonitorAllTalkgroups !== this.config.monitorAllTalkgroups) {
            this.clearActiveTransmissions();
            const modeText = this.config.monitorAllTalkgroups ? 
                'Monitor all talkgroups enabled - UI may become very busy!' : 
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
        if (this.elements.enableRadioIDLookupCheckbox) {
            this.elements.enableRadioIDLookupCheckbox.checked = this.config.enableRadioIDLookup;
        }
        if (this.elements.enableTalkgroupAPICheckbox) {
            this.elements.enableTalkgroupAPICheckbox.checked = this.config.enableTalkgroupAPI;
        }
        this.updateColorSelection();
        this.toggleRadioIDSettings();
        this.updateRadioIDStatus();
        this.toggleTalkgroupSettings();
        this.updateTalkgroupStatus();
    }

    toggleRadioIDSettings() {
        if (this.elements.radioIDSettings && this.elements.enableRadioIDLookupCheckbox) {
            const isEnabled = this.elements.enableRadioIDLookupCheckbox.checked;
            this.config.enableRadioIDLookup = isEnabled;
            this.elements.radioIDSettings.style.display = isEnabled ? 'block' : 'none';
            this.saveSettings();
            
            if (isEnabled) {
                // Auto-download if no database exists
                if (!this.radioIDDatabase) {
                    this.updateRadioIDStatus('Downloading...');
                    this.downloadRadioIDDatabase();
                } else {
                    this.loadRadioIDDatabase();
                }
            } else {
                // Auto-clear cache when disabled
                this.clearRadioIDCache();
            }
        }
    }

    toggleTalkgroupSettings() {
        if (this.elements.talkgroupSettings && this.elements.enableTalkgroupAPICheckbox) {
            const isEnabled = this.elements.enableTalkgroupAPICheckbox.checked;
            this.config.enableTalkgroupAPI = isEnabled;
            this.elements.talkgroupSettings.style.display = isEnabled ? 'block' : 'none';
            this.saveSettings();
            
            // Note: Talkgroup API loads automatically on page load regardless of this setting
            // This setting only controls the visibility of manual download/cache controls
            if (isEnabled) {
                // Update status display when enabled
                this.updateTalkgroupStatus();
            }
        }
    }

    selectColor(color) {
        this.config.primaryColor = color;
        this.applyPrimaryColor(color);
        this.updateColorPreview(color);
        this.updateColorPresets(color);
        this.saveSettings();
        
        // System message removed - only log transmissions
    }

    initializeColorPicker() {
        // Add click event listeners to all color preset buttons
        const colorPresets = this.elements.colorPresets.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.getAttribute('data-color');
                this.selectColor(color);
            });
        });
        
        // Initialize with current color
        this.updateColorPreview(this.config.primaryColor);
        this.updateColorPresets(this.config.primaryColor);
    }
    
    updateColorPreview(color) {
        if (this.elements.colorPreview && this.elements.colorValue) {
            this.elements.colorPreview.style.backgroundColor = color;
            this.elements.colorValue.textContent = color.toUpperCase();
        }
    }
    
    updateColorPresets(selectedColor) {
        if (this.elements.colorPresets) {
            const colorPresets = this.elements.colorPresets.querySelectorAll('.color-preset');
            colorPresets.forEach(preset => {
                const presetColor = preset.getAttribute('data-color');
                if (presetColor.toLowerCase() === selectedColor.toLowerCase()) {
                    preset.classList.add('selected');
                } else {
                    preset.classList.remove('selected');
                }
            });
        }
    }
    
    // Helper function to convert HSL to Hex
    hslToHex(h, s, l) {
        // Normalize values
        h = ((h % 360) + 360) % 360; // Ensure hue is 0-360
        s = Math.max(0, Math.min(100, s)) / 100; // Ensure saturation is 0-1
        l = Math.max(0, Math.min(100, l)) / 100; // Ensure lightness is 0-1
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        
        const toHex = (n) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    // Helper function to convert Hex to HSL
    hexToHsl(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        let s = 0;
        let l = (max + min) / 2;
        
        if (diff !== 0) {
            s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
            
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) * 60;
                    break;
                case g:
                    h = ((b - r) / diff + 2) * 60;
                    break;
                case b:
                    h = ((r - g) / diff + 4) * 60;
                    break;
            }
        }
        
        return { 
            h: Math.round(h), 
            s: Math.round(s * 100), 
            l: Math.round(l * 100) 
        };
    }

    updateColorSelection() {
        // This method is now handled by updateColorPreview and updateColorPresets
        this.updateColorPreview(this.config.primaryColor);
        this.updateColorPresets(this.config.primaryColor);
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

    // RadioID Database Functions
    
    // Initialize RadioID database
    async loadRadioIDDatabase() {
        console.log('🗂️ Initializing RadioID database...');
        
        if (!this.config.enableRadioIDLookup) {
            console.log('RadioID lookup disabled in settings');
            this.updateRadioIDStatus('Disabled');
            return;
        }

        try {
            // Check if we have cached data
            const cachedData = localStorage.getItem('radioIDDatabase');
            const lastUpdate = localStorage.getItem('radioIDLastUpdate');
            
            if (cachedData && lastUpdate) {
                const cacheAge = Date.now() - parseInt(lastUpdate);
                const cacheExpiry = this.config.radioIDCacheExpiry;
                
                console.log(`📋 Loading RadioID database from cache (${Math.round(cacheAge / (1000 * 60 * 60 * 24))} days old)`);
                this.radioIDDatabase = JSON.parse(cachedData);
                this.radioIDLastUpdate = parseInt(lastUpdate);
                this.updateRadioIDStatus();
                
                // Auto-download if cache is expired
                if (cacheAge >= cacheExpiry) {
                    console.log('⏰ Cache expired - downloading fresh RadioID database...');
                    await this.downloadRadioIDDatabase();
                }
                return;
            }

            // No cached data exists
            console.log('� No cached RadioID database found - use Download button to fetch data');
            this.updateRadioIDStatus('Not downloaded - downloading initial data...');
            await this.downloadRadioIDDatabase();
            
        } catch (error) {
            console.error('❌ Failed to initialize RadioID database:', error);
            this.updateRadioIDStatus('Error loading database');
        }
    }

    // Download RadioID database from radioid.net
    async downloadRadioIDDatabase() {
        if (this.radioIDUpdateInProgress) {
            console.log('RadioID download already in progress');
            return;
        }

        this.radioIDUpdateInProgress = true;
        this.updateRadioIDStatus('Downloading...');

        try {
            console.log(`📡 Downloading RadioID database from ${this.config.radioIDDatabaseURL}`);
            
            const response = await fetch(this.config.radioIDDatabaseURL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log(`📊 Downloaded ${csvText.length} characters of CSV data`);

            // Parse the CSV data
            const parsedData = this.parseRadioIDCSV(csvText);
            console.log(`✅ Parsed ${Object.keys(parsedData).length} RadioID records`);

            // Store in memory first
            this.radioIDDatabase = parsedData;
            this.radioIDLastUpdate = Date.now();

            // Try to save to localStorage with quota error handling
            try {
                const dataToStore = JSON.stringify(parsedData);
                const sizeInMB = (dataToStore.length / (1024 * 1024)).toFixed(2);
                console.log(`💾 Attempting to store ${sizeInMB}MB of RadioID data...`);
                
                localStorage.setItem('radioIDDatabase', dataToStore);
                localStorage.setItem('radioIDLastUpdate', this.radioIDLastUpdate.toString());
                console.log('✅ Successfully cached RadioID database to localStorage');
                
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
                    console.warn('⚠️ localStorage quota exceeded - RadioID data stored in memory only (will not persist)');
                    const message = window.t ? 
                        `${Object.keys(parsedData).length.toLocaleString()} ${window.t('radioid.records.memory.only')}` :
                        `${Object.keys(parsedData).length.toLocaleString()} records loaded (memory only)`;
                    this.updateRadioIDStatus(message);
                    return; // Still functional, just won't persist
                } else {
                    throw storageError; // Re-throw other storage errors
                }
            }

            this.updateRadioIDStatus();
            
        } catch (error) {
            console.error('❌ Failed to download RadioID database:', error);
            this.updateRadioIDStatus(`Error: ${error.message}`);
        } finally {
            this.radioIDUpdateInProgress = false;
        }
    }

    // Parse RadioID CSV data
    parseRadioIDCSV(csvText) {
        const database = {};
        const lines = csvText.split('\n');
        
        if (lines.length < 2) {
            throw new Error('Invalid CSV format: insufficient data');
        }

        // Parse header to get column indices
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('📋 CSV Headers:', headers);

        const radioIdIndex = headers.findIndex(h => h.toLowerCase().includes('id'));
        const callsignIndex = headers.findIndex(h => h.toLowerCase().includes('call'));
        const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('fname') || h.toLowerCase().includes('first'));
        const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('lname') || h.toLowerCase().includes('last'));
        const cityIndex = headers.findIndex(h => h.toLowerCase().includes('city'));
        const stateIndex = headers.findIndex(h => h.toLowerCase().includes('state'));
        const countryIndex = headers.findIndex(h => h.toLowerCase().includes('country'));

        console.log(`📊 Column indices - ID:${radioIdIndex}, Call:${callsignIndex}, City:${cityIndex}, State:${stateIndex}, Country:${countryIndex}`);

        let recordCount = 0;
        let skippedCount = 0;

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            
            if (columns.length < headers.length) {
                skippedCount++;
                continue;
            }

            const radioId = columns[radioIdIndex];
            if (!radioId || isNaN(radioId)) {
                skippedCount++;
                continue;
            }

            // Only store essential fields to save space
            const city = cityIndex >= 0 ? columns[cityIndex] : '';
            const state = stateIndex >= 0 ? columns[stateIndex] : '';
            const country = countryIndex >= 0 ? columns[countryIndex] : '';
            
            // Build full name from first and last name
            const firstName = firstNameIndex >= 0 ? columns[firstNameIndex] : '';
            const lastName = lastNameIndex >= 0 ? columns[lastNameIndex] : '';
            const fullName = [firstName, lastName].filter(n => n && n.trim()).join(' ').trim();

            // Only store record if we have location data or name
            if (city || state || country || fullName) {
                database[radioId] = {
                    c: city || '',      // Use short keys to save space
                    s: state || '',     
                    n: country || '',   // 'n' for nation/country
                    m: fullName || ''   // 'm' for name (person)
                };
                recordCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`✅ Parsed ${recordCount} RadioID records with location data, skipped ${skippedCount} records`);
        return database;
    }

    // Lookup RadioID information
    lookupRadioID(radioId) {
        if (!this.config.enableRadioIDLookup) {
            return null;
        }

        const id = radioId.toString();
        
        // First check localStorage cache for resolved data
        const cachedData = this.getRadioIDFromCache(id);
        if (cachedData) {
            if (this.config.verbose) {
                console.log(`📱 Using cached RadioID data for ${id}:`, cachedData);
            }
            return cachedData;
        }
        
        // If not in cache, lookup from database
        if (!this.radioIDDatabase) {
            return null;
        }
        
        const record = this.radioIDDatabase[id];
        if (!record) return null;
        
        // Convert short keys back to full names
        const resolvedData = {
            radioId: id,
            city: record.c || '',
            state: record.s || '',
            country: record.n || '',
            name: record.m || '', // 'm' field contains the full name
            timestamp: Date.now()
        };
        
        // Cache the resolved data in localStorage
        this.saveRadioIDToCache(id, resolvedData);
        
        if (this.config.verbose) {
            console.log(`📱 Resolved and cached RadioID data for ${id}:`, resolvedData);
        }
        
        return resolvedData;
    }

    /**
     * Get RadioID data from localStorage cache
     */
    getRadioIDFromCache(radioId) {
        try {
            const cacheKey = `radioID_${radioId}`;
            const cachedData = localStorage.getItem(cacheKey);
            
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                
                // Cache version check - invalidate old cache format
                const currentCacheVersion = 2; // Increment when structure changes
                if (!parsed.version || parsed.version < currentCacheVersion) {
                    if (this.config.verbose) {
                        console.log(`🔄 Invalidating old cache version for RadioID ${radioId} (v${parsed.version || 1} → v${currentCacheVersion})`);
                    }
                    localStorage.removeItem(cacheKey);
                    return null;
                }
                
                // Check if cache is still valid (30 days)
                const cacheAge = Date.now() - parsed.timestamp;
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
                
                if (cacheAge < maxAge) {
                    return {
                        radioId: parsed.radioId,
                        city: parsed.city || '',
                        state: parsed.state || '',
                        country: parsed.country || '',
                        name: parsed.name || ''
                    };
                } else {
                    // Remove expired cache entry
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (error) {
            console.warn('Error reading RadioID cache:', error);
        }
        
        return null;
    }

    /**
     * Save RadioID data to localStorage cache
     */
    saveRadioIDToCache(radioId, data) {
        try {
            const cacheKey = `radioID_${radioId}`;
            const cacheData = {
                version: 2, // Cache version for future compatibility
                radioId: data.radioId,
                city: data.city || '',
                state: data.state || '',
                country: data.country || '',
                name: data.name || '',
                timestamp: Date.now()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            if (this.config.verbose) {
                console.log(`💾 Cached RadioID data for ${radioId}`);
            }
        } catch (error) {
            console.warn('Error saving RadioID cache:', error);
            // If localStorage is full, try to clean old entries
            this.cleanRadioIDCache();
        }
    }

    /**
     * Clean old RadioID cache entries
     */
    cleanRadioIDCache() {
        try {
            const keysToRemove = [];
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            const currentCacheVersion = 2;
            let versionUpgrades = 0;
            
            // Find old cache entries
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('radioID_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        
                        // Remove entries with old cache version
                        if (!data.version || data.version < currentCacheVersion) {
                            keysToRemove.push(key);
                            versionUpgrades++;
                        }
                        // Remove entries that are too old
                        else if (data.timestamp && (Date.now() - data.timestamp) > maxAge) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        // Invalid data, mark for removal
                        keysToRemove.push(key);
                    }
                }
            }
            
            // Remove old entries
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            if (keysToRemove.length > 0) {
                console.log(`🧹 Cleaned ${keysToRemove.length} old RadioID cache entries (${versionUpgrades} version upgrades, ${keysToRemove.length - versionUpgrades} expired)`);
            }
        } catch (error) {
            console.warn('Error cleaning RadioID cache:', error);
        }
    }

    /**
     * Get RadioID cache statistics
     */
    getRadioIDCacheStats() {
        try {
            let totalCached = 0;
            let totalSize = 0;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            let expiredEntries = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('radioID_')) {
                    totalCached++;
                    const data = localStorage.getItem(key);
                    totalSize += data.length;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.timestamp && (Date.now() - parsed.timestamp) > maxAge) {
                            expiredEntries++;
                        }
                    } catch (e) {
                        expiredEntries++;
                    }
                }
            }
            
            return {
                totalCached,
                totalSize,
                expiredEntries,
                sizeKB: Math.round(totalSize / 1024 * 100) / 100
            };
        } catch (error) {
            console.warn('Error getting RadioID cache stats:', error);
            return { totalCached: 0, totalSize: 0, expiredEntries: 0, sizeKB: 0 };
        }
    }

    // Update RadioID status display
    updateRadioIDStatus(customStatus = null) {
        const statusElement = document.getElementById('radioIDStatus');
        const updateElement = document.getElementById('radioIDLastUpdate');
        
        if (!statusElement || !updateElement) return;

        if (customStatus) {
            statusElement.textContent = customStatus;
            updateElement.textContent = '';
        } else if (this.radioIDDatabase && this.radioIDLastUpdate) {
            const count = Object.keys(this.radioIDDatabase).length;
            const lastUpdate = new Date(this.radioIDLastUpdate);
            const recordsText = window.t ? window.t('radioid.records.loaded') : 'records loaded';
            const updatedText = window.t ? window.t('radioid.updated') : 'Updated:';
            statusElement.textContent = `${count.toLocaleString()} ${recordsText}`;
            updateElement.textContent = `${updatedText} ${lastUpdate.toLocaleDateString()} ${lastUpdate.toLocaleTimeString()}`;
        } else {
            const notLoadedText = window.t ? window.t('radioid.status.notloaded') : 'Not loaded';
            statusElement.textContent = notLoadedText;
            updateElement.textContent = '';
        }
    }

    updateTalkgroupStatus(customStatus = null) {
        const statusElement = document.getElementById('talkgroupStatus');
        
        if (!statusElement) return;

        if (customStatus) {
            statusElement.textContent = customStatus;
        } else {
            const stats = this.talkgroupManager.getStatistics();
            if (stats.isApiDataAvailable && stats.lastUpdate) {
                const lastUpdate = new Date(stats.lastUpdate);
                const recordsText = window.t ? window.t('settings.talkgroup.records.loaded') : 'talkgroups loaded';
                const updatedText = window.t ? window.t('settings.talkgroup.updated') : 'Updated:';
                const sourceText = stats.apiTalkgroups > 0 ? '(API + Static)' : '(Static only)';
                statusElement.innerHTML = `${stats.totalTalkgroups.toLocaleString()} ${recordsText} ${sourceText}<br>${updatedText} ${lastUpdate.toLocaleDateString()} ${lastUpdate.toLocaleTimeString()}`;
            } else {
                const notLoadedText = window.t ? window.t('settings.talkgroup.status.notloaded') : 'Static data only';
                statusElement.textContent = `${stats.totalTalkgroups.toLocaleString()} talkgroups (${notLoadedText})`;
            }
        }
    }

    // Clear RadioID cache
    clearRadioIDCache() {
        console.log('🗑️ Clearing RadioID database cache...');
        
        this.radioIDDatabase = null;
        this.radioIDLastUpdate = null;
        
        localStorage.removeItem('radioIDDatabase');
        localStorage.removeItem('radioIDLastUpdate');
        
        this.updateRadioIDStatus('Cache cleared');
    }

    // Talkgroup Database Functions
    
    // Initialize Talkgroup database
    async loadTalkgroupDatabase() {
        console.log('🗂️ Loading Talkgroup database from API...');
        
        try {
            // Try to load cached API data first
            const cachedData = localStorage.getItem('talkgroupDatabase');
            const lastUpdate = localStorage.getItem('talkgroupLastUpdate');
            
            // Load cached data immediately if available (for instant UI updates)
            if (cachedData && lastUpdate) {
                console.log('📋 Loading cached API talkgroup data...');
                const parsedCachedData = JSON.parse(cachedData);
                this.talkgroupManager.updateWithApiData(parsedCachedData, parseInt(lastUpdate));
            }
            
            // Always try to download fresh data from API
            await this.downloadTalkgroupDatabase();
            
        } catch (error) {
            console.error('❌ Failed to load Talkgroup database from API:', error);
            console.log('🔄 Using static talkgroup data as fallback');
        }
    }

    // Download Talkgroup database from Brandmeister API
    async downloadTalkgroupDatabase() {
        if (this.talkgroupUpdateInProgress) {
            console.log('Talkgroup download already in progress');
            return;
        }

        this.talkgroupUpdateInProgress = true;

        try {
            console.log(`📡 Downloading Talkgroup database from ${this.config.talkgroupDatabaseURL}`);
            
            const response = await fetch(this.config.talkgroupDatabaseURL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const jsonData = await response.json();
            console.log(`📊 Downloaded ${Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length} talkgroups from Brandmeister API`);

            // Convert array to object for faster lookups
            const parsedData = this.parseTalkgroupJSON(jsonData);
            console.log(`✅ Parsed ${Object.keys(parsedData).length} Talkgroup records`);

            // Update TalkgroupManager with fresh API data
            const lastUpdate = Date.now();
            this.talkgroupManager.updateWithApiData(parsedData, lastUpdate);

            // Try to save to localStorage
            try {
                const dataToStore = JSON.stringify(parsedData);
                const sizeInMB = (dataToStore.length / (1024 * 1024)).toFixed(2);
                console.log(`💾 Storing ${sizeInMB}MB of Talkgroup data...`);
                
                localStorage.setItem('talkgroupDatabase', dataToStore);
                localStorage.setItem('talkgroupLastUpdate', lastUpdate.toString());
                
                console.log('✅ Successfully cached Talkgroup database to localStorage');
            } catch (storageError) {
                console.warn('⚠️ Failed to cache Talkgroup database to localStorage:', storageError.message);
            }

        } catch (error) {
            console.error('❌ Failed to download Talkgroup database from API:', error);
            console.log('🔄 Falling back to static talkgroup data for this session');
            console.log('📋 Error details:', {
                message: error.message,
                type: error.constructor.name,
                url: this.config.talkgroupDatabaseURL
            });
            
            // Update status to indicate fallback
            this.updateTalkgroupStatus('API failed - using static data');
            
            // Don't throw the error, allow application to continue with static data
            
        } finally {
            this.talkgroupUpdateInProgress = false;
        }
    }

    // Parse Talkgroup JSON data from Brandmeister API
    parseTalkgroupJSON(jsonData) {
        const talkgroups = {};
        let processedCount = 0;
        let skippedCount = 0;
        
        try {
            console.log('🔍 Parsing talkgroup data:', {
                isArray: Array.isArray(jsonData),
                isObject: typeof jsonData === 'object' && !Array.isArray(jsonData),
                type: typeof jsonData,
                keysLength: typeof jsonData === 'object' ? Object.keys(jsonData).length : 'N/A',
                firstKeys: typeof jsonData === 'object' && !Array.isArray(jsonData) ? Object.keys(jsonData).slice(0, 5) : 'N/A'
            });
            
            // Check if the API returns an object (new format: {"1": "Local", "2": "Cluster"})
            if (typeof jsonData === 'object' && !Array.isArray(jsonData) && jsonData !== null) {
                console.log('📦 Processing object format talkgroup data...');
                Object.entries(jsonData).forEach(([id, name]) => {
                    if (id && name && typeof name === 'string') {
                        talkgroups[id.toString()] = name.trim();
                        processedCount++;
                    } else {
                        skippedCount++;
                        if (skippedCount <= 5) { // Log first 5 problematic entries
                            console.warn('⚠️ Skipping invalid talkgroup entry:', { id, name });
                        }
                    }
                });
            }
            // Fallback: Check if the API returns an array (old format: [{id: 1, name: "Local"}])
            else if (Array.isArray(jsonData)) {
                console.log('� Processing array format talkgroup data...');
                jsonData.forEach((tg, index) => {
                    if (tg && tg.id && tg.name) {
                        talkgroups[tg.id.toString()] = tg.name.trim();
                        processedCount++;
                    } else {
                        skippedCount++;
                        if (index < 5) { // Log first 5 problematic entries
                            console.warn('⚠️ Skipping invalid talkgroup entry:', tg);
                        }
                    }
                });
            } else {
                console.warn('⚠️ Unexpected talkgroup data format, expected object or array, got:', typeof jsonData);
            }
                
            console.log(`📊 Parsing results: ${processedCount} processed, ${skippedCount} skipped`);
        } catch (error) {
            console.error('❌ Error parsing talkgroup JSON:', error);
        }

        return talkgroups;
    }

    // Get talkgroup name using TalkgroupManager
    getTalkgroupName(id) {
        return this.talkgroupManager.getTalkgroupName(id);
    }

    // Clear Talkgroup cache
    clearTalkgroupCache() {
        console.log('🗑️ Clearing Talkgroup database cache...');
        
        // Reset the TalkgroupManager to only static data
        this.talkgroupManager.updateWithApiData({}, null);
        
        localStorage.removeItem('talkgroupDatabase');
        localStorage.removeItem('talkgroupLastUpdate');
        
        this.updateTalkgroupStatus('Cache cleared');
        console.log('✅ Talkgroup cache cleared');
    }

    // Enhanced country name mapping with fuzzy matching and comprehensive coverage
    getCountryCode(countryName) {
        // Use the global country code function from config.js
        return window.getCountryCode(countryName);
    }

    /**
     * Clean up weather loading timers for sessions that no longer exist
     */
    cleanupWeatherTimers() {
        let cleanedTimers = 0;
        
        for (const [sessionKey, timerId] of this.weatherLoadTimers.entries()) {
            // Check if the transmission card still exists
            const transmissionCard = document.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
            if (!transmissionCard) {
                // Clear the timer and remove from map
                clearTimeout(timerId);
                this.weatherLoadTimers.delete(sessionKey);
                cleanedTimers++;
            }
        }
        
        if (cleanedTimers > 0 && this.config.verbose) {
            console.log(`🧹 Cleaned up ${cleanedTimers} orphaned weather timers`);
        }
    }

    /**
     * Refresh weather displays to update weekday language
     */
    refreshWeatherDisplays() {
        if (!this.locationWeatherService || this.config.monitorAllTalkgroups) return;

        // Find all current time displays and refresh them
        const timeElements = document.querySelectorAll('.time-info');
        timeElements.forEach(async (timeElement) => {
            const weatherContainer = timeElement.closest('.card-time-weather');
            if (!weatherContainer) return;

            const city = weatherContainer.dataset.city;
            const state = weatherContainer.dataset.state;
            const country = weatherContainer.dataset.country;

            if (city && country) {
                try {
                    // Force refresh of time display with new language
                    this.locationWeatherService.timezoneCache.clear(); // Clear cache to force refresh
                    const locationInfo = await this.locationWeatherService.getLocationInfo(city, state, country);
                    
                    if (locationInfo && locationInfo.localTime) {
                        timeElement.innerHTML = `<span class="material-icons small">schedule</span> ${locationInfo.localTime}`;
                        timeElement.style.cursor = 'pointer';
                        timeElement.title = 'Powered by World Time API';
                        timeElement.onclick = (e) => {
                            e.stopPropagation();
                            window.open('https://worldtimeapi.org/', '_blank');
                        };
                        timeElement.title = `Local time in ${locationInfo.timezone}`;
                    }
                } catch (error) {
                    console.warn('Failed to refresh time display for language change:', error);
                }
            }
        });
    }

    /**
     * Load time and weather information for a location (with smart delay - instant if cached)
     */
    async loadTimeWeatherInfo(city, state, country, sessionKey) {
        // Skip weather loading if monitoring all talkgroups to avoid API overload
        if (this.config.monitorAllTalkgroups) {
            if (this.config.verbose) {
                console.log('⚠️ Weather loading disabled - monitoring all talkgroups (too many API calls)');
            }
            return;
        }

        if (!this.locationWeatherService || !city || !country) return;

        const timerKey = sessionKey;
        
        // Clear any existing timer for this session
        if (this.weatherLoadTimers.has(timerKey)) {
            clearTimeout(this.weatherLoadTimers.get(timerKey));
        }

        // Check if data is cached - if so, load immediately without delay
        const isCached = this.locationWeatherService.isLocationInfoCached(city, state, country);
        const delay = isCached ? 0 : 5000; // No delay for cached data, 5s for API calls

        if (this.config.verbose) {
            if (isCached) {
                console.log(`🌍 Loading cached time/weather for: ${city}, ${state}, ${country} (instant)`);
            } else {
                console.log(`🌍 Will load time/weather for: ${city}, ${state}, ${country} (5s delay for API calls)`);
            }
        }

        // Set delay (0 seconds for cached, 10 seconds for API calls)
        const timerId = setTimeout(async () => {
            try {
                // Check if the transmission card still exists (user might have closed it)
                const transmissionCard = document.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
                if (!transmissionCard) {
                    this.weatherLoadTimers.delete(timerKey);
                    return;
                }

                console.log(`🌍 Loading time/weather for: ${city}, ${state}, ${country} ${isCached ? '(cached data)' : '(after 5s delay)'}`);
                
                const locationInfo = await this.locationWeatherService.getLocationInfo(city, state, country);
                
                // Double-check the card still exists after the async call
                const currentTransmissionCard = document.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
                if (!currentTransmissionCard) {
                    this.weatherLoadTimers.delete(timerKey);
                    return;
                }

                const timeWeatherElement = currentTransmissionCard.querySelector('.card-time-weather');
                if (!timeWeatherElement) {
                    this.weatherLoadTimers.delete(timerKey);
                    return;
                }

                if (locationInfo) {
                    const timeInfo = timeWeatherElement.querySelector('.time-info');
                    const weatherInfo = timeWeatherElement.querySelector('.weather-info');

                    if (timeInfo) {
                        timeInfo.innerHTML = `<span class="material-icons small">schedule</span> ${locationInfo.localTime}`;
                        timeInfo.title = `Local time in ${locationInfo.timezone} - Powered by World Time API`;
                        timeInfo.style.cursor = 'pointer';
                        
                        // Make time clickable to World Time API
                        timeInfo.onclick = (e) => {
                            e.stopPropagation();
                            window.open('https://worldtimeapi.org/', '_blank');
                        };
                    }

                    if (weatherInfo && locationInfo.weather) {
                        weatherInfo.textContent = `${locationInfo.weather.emoji} ${locationInfo.weather.temperature}°C`;
                        weatherInfo.title = `Current weather conditions - Powered by Open-Meteo`;
                        weatherInfo.style.cursor = 'pointer';
                        
                        // Make weather clickable to Open-Meteo
                        weatherInfo.onclick = (e) => {
                            e.stopPropagation();
                            window.open('https://open-meteo.com/', '_blank');
                        };
                    }

                    console.log(`✅ Updated time/weather for ${city}: ${locationInfo.localTime}, ${locationInfo.weather?.temperature}°C`);
                } else {
                    // Show fallback if data unavailable
                    const timeInfo = timeWeatherElement.querySelector('.time-info');
                    const weatherInfo = timeWeatherElement.querySelector('.weather-info');
                    
                    if (timeInfo) timeInfo.innerHTML = '<span class="material-icons small">schedule</span> --:--';
                    if (weatherInfo) weatherInfo.innerHTML = '<span class="material-icons small">public</span> --°';
                }
            } catch (error) {
                console.warn('Failed to load time/weather info:', error);
                
                // Show error state
                const transmissionCard = document.querySelector(`[data-session-key="${this.escapeCSSSelector(sessionKey)}"]`);
                if (transmissionCard) {
                    const timeWeatherElement = transmissionCard.querySelector('.card-time-weather');
                    if (timeWeatherElement) {
                        const timeInfo = timeWeatherElement.querySelector('.time-info');
                        const weatherInfo = timeWeatherElement.querySelector('.weather-info');
                        
                        if (timeInfo) timeInfo.innerHTML = '<span class="material-icons small">schedule</span> --:--';
                        if (weatherInfo) weatherInfo.innerHTML = '<span class="material-icons small">public</span> --°';
                    }
                }
            } finally {
                // Clean up the timer reference
                this.weatherLoadTimers.delete(timerKey);
            }
        }, delay); // Smart delay: 0ms for cached data, 5000ms for API calls

        // Store the timer reference
        this.weatherLoadTimers.set(timerKey, timerId);
    }

    /**
     * Initialize local/UTC time display in header
     */
    initializeTimeDisplay() {
        if (!this.elements.localUtc) return;

        // Update time immediately
        this.updateTimeDisplay();

        // Update every second
        this.timeDisplayInterval = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    }

    /**
     * Update the local/UTC time display
     */
    updateTimeDisplay() {
        if (!this.elements.localUtc) return;

        const now = new Date();
        
        // Get current language from i18n system (fallback to 'en')
        const currentLang = window.I18n ? window.I18n.getCurrentLanguage()?.code || 'en' : 'en';
        
        // Format local time
        const localTime = now.toLocaleString(currentLang, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Format UTC time
        const utcTime = now.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });

        // Update display
        this.elements.localUtc.innerHTML = `
            <span class="time-local" title="Local Time">🕐 ${localTime}</span>
            <span class="time-separator">|</span>
            <span class="time-utc" title="UTC Time">🌍 ${utcTime} UTC</span>
        `;
    }

    /**
     * Cleanup time display interval
     */
    cleanupTimeDisplay() {
        if (this.timeDisplayInterval) {
            clearInterval(this.timeDisplayInterval);
            this.timeDisplayInterval = null;
        }
    }

    /**
     * Initialize local weather display in footer
     */
    async initializeLocalWeather() {
        if (!this.elements.localWeather || !this.locationWeatherService) return;

        try {
            // Try to get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        await this.updateLocalWeather(lat, lon);
                    },
                    (error) => {
                        console.warn('Geolocation failed:', error);
                        this.showDefaultWeather();
                    },
                    { timeout: 10000, enableHighAccuracy: false }
                );
            } else {
                this.showDefaultWeather();
            }
        } catch (error) {
            console.warn('Failed to initialize local weather:', error);
            this.showDefaultWeather();
        }
    }

    /**
     * Update local weather display with coordinates
     */
    async updateLocalWeather(lat, lon) {
        if (!this.elements.localWeather || !this.locationWeatherService) return;

        try {
            const weather = await this.locationWeatherService.getWeather(lat, lon);
            
            if (weather) {
                const weatherEmoji = this.locationWeatherService.getWeatherEmoji(weather.weathercode);
                const tempC = weather.temperature;
                const tempF = Math.round((tempC * 9/5) + 32);
                const weatherElement = this.elements.localWeather.querySelector('.weather-info');
                
                if (weatherElement) {
                    weatherElement.innerHTML = `${weatherEmoji} ${tempC}°C / ${tempF}°F`;
                    weatherElement.title = `Local weather conditions - Powered by Open-Meteo`;
                    weatherElement.style.cursor = 'pointer';
                    
                    // Make weather clickable to Open-Meteo
                    weatherElement.onclick = (e) => {
                        e.stopPropagation();
                        window.open('https://open-meteo.com/', '_blank');
                    };
                }
            } else {
                this.showDefaultWeather();
            }
        } catch (error) {
            console.warn('Failed to update local weather:', error);
            this.showDefaultWeather();
        }
    }

    /**
     * Show default weather when location/weather unavailable
     */
    showDefaultWeather() {
        if (!this.elements.localWeather) return;
        
        const weatherElement = this.elements.localWeather.querySelector('.weather-info');
        if (weatherElement) {
            weatherElement.innerHTML = `<span class="material-icons small">location_off</span> Local weather unavailable`;
            weatherElement.title = 'Unable to get local weather';
            weatherElement.style.cursor = 'default';
            weatherElement.onclick = null;
        }
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
    
    // Restore UI state from localStorage
    setTimeout(() => {
        window.brandmeisterMonitor.restoreUIState();
    }, 100); // Small delay to ensure UI elements are ready
    
    // Initialize new UI components
    initializeNewInterface();
    
    // Auto-connect on page load for better UX
    setTimeout(() => {
        if (!window.brandmeisterMonitor.isConnected) {
            console.log('🚀 Auto-connecting to Brandmeister network...');
            window.brandmeisterMonitor.connect();
        }
    }, 1000); // Small delay to ensure UI is fully loaded
    
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

    // About Modal functionality
    const aboutModalBtn = document.getElementById('aboutModalBtn');
    const aboutModal = document.getElementById('aboutModal');
    const aboutModalClose = document.getElementById('aboutModalClose');
    
    if (aboutModalBtn && aboutModal && aboutModalClose) {
        // Open modal
        aboutModalBtn.addEventListener('click', () => {
            aboutModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            
            window.brandmeisterMonitor.logWithAttributes('About modal opened', {
                sessionID: window.brandmeisterMonitor.sessionID,
                action: 'modal_open'
            });
        });
        
        // Close modal via close button
        aboutModalClose.addEventListener('click', () => {
            aboutModal.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
            
            window.brandmeisterMonitor.logWithAttributes('About modal closed', {
                sessionID: window.brandmeisterMonitor.sessionID,
                action: 'modal_close'
            });
        });
        
        // Close modal via overlay click
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.remove('show');
                document.body.style.overflow = '';
                
                window.brandmeisterMonitor.logWithAttributes('About modal closed via overlay', {
                    sessionID: window.brandmeisterMonitor.sessionID,
                    action: 'modal_close_overlay'
                });
            }
        });
        
        // Close modal via ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && aboutModal.classList.contains('show')) {
                aboutModal.classList.remove('show');
                document.body.style.overflow = '';
                
                window.brandmeisterMonitor.logWithAttributes('About modal closed via ESC', {
                    sessionID: window.brandmeisterMonitor.sessionID,
                    action: 'modal_close_esc'
                });
            }
        });
    }
    
    // Console minimize/maximize toggle
    const consoleToggle = document.getElementById('consoleToggle');
    const consolePanel = document.getElementById('consolePanel');
    const appLayout = document.querySelector('.app-layout');
    
    consoleToggle.addEventListener('click', () => {
        const isMinimized = consolePanel.classList.contains('minimized');
        const isAutoCollapsed = consolePanel.classList.contains('auto-collapsed');
        const isCollapsed = isMinimized || isAutoCollapsed;
        
        if (isCollapsed) {
            // Expanding console - remove both minimized and auto-collapsed
            consolePanel.classList.remove('minimized');
            consolePanel.classList.remove('auto-collapsed');
            appLayout.classList.remove('console-minimized');
            consoleToggle.textContent = '▼';
        } else {
            // Collapsing console - add minimized (but not auto-collapsed)
            consolePanel.classList.add('minimized');
            appLayout.classList.add('console-minimized');
            consoleToggle.textContent = '▲';
        }
        
        window.brandmeisterMonitor.logWithAttributes('Console panel toggled', {
            sessionID: window.brandmeisterMonitor.sessionID,
            minimized: !isMinimized
        });
        
        // Save UI state after console toggle
        console.log('🔗 Calling saveUIState from console toggle');
        window.brandmeisterMonitor.saveUIState();
    });
    
    // Initialize console panel as open by default
    // Remove the minimized classes to show the console expanded
    consolePanel.classList.remove('minimized');
    appLayout.classList.remove('console-minimized');
    consoleToggle.textContent = '▼';
    
    // Check initial sidebar state and auto-collapse console if needed
    const sidebarElement = document.getElementById('sidebar');
    const initialSidebarExpanded = sidebarElement && !sidebarElement.classList.contains('collapsed') && !appLayout.classList.contains('sidebar-collapsed');
    if (initialSidebarExpanded) {
        consolePanel.classList.add('auto-collapsed');
    }
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        window.brandmeisterMonitor.logWithAttributes('Theme toggled', {
            sessionID: window.brandmeisterMonitor.sessionID,
            theme: newTheme
        });
    });
    
    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    }
    
    // Sidebar toggle for desktop collapse and mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        const isMobile = window.innerWidth <= 768;
        const consolePanelElement = document.getElementById('consolePanel');
        
        console.log('Sidebar toggle clicked:', {
            isCollapsed,
            isMobile,
            windowWidth: window.innerWidth,
            consolePanelElement: !!consolePanelElement
        });
        
        if (isMobile) {
            // Mobile behavior: toggle open/closed
            console.log('Using mobile behavior');
            const wasOpen = sidebar.classList.contains('open');
            sidebar.classList.toggle('open');
            
            // Auto-collapse console logic for mobile
            if (!wasOpen) {
                // Sidebar is now opening - auto-collapse console
                console.log('Mobile: Sidebar opening - auto-collapsing console');
                if (consolePanelElement && !consolePanelElement.classList.contains('minimized')) {
                    consolePanelElement.classList.add('auto-collapsed');
                }
            } else {
                // Sidebar is now closing - remove auto-collapse
                console.log('Mobile: Sidebar closing - removing auto-collapse');
                if (consolePanelElement) {
                    consolePanelElement.classList.remove('auto-collapsed');
                }
            }
        } else {
            console.log('Using desktop behavior');
            // Desktop behavior: toggle collapsed/expanded
            if (isCollapsed) {
                // Expanding sidebar (was collapsed, now expanding)
                console.log('Expanding sidebar - should auto-collapse console');
                sidebar.classList.remove('collapsed');
                appLayout.classList.remove('sidebar-collapsed');
                sidebarToggle.innerHTML = '<span class="hamburger-icon">☰</span>';
                
                // Auto-collapse console when sidebar expands (unless manually minimized)
                if (consolePanelElement && !consolePanelElement.classList.contains('minimized')) {
                    console.log('Adding auto-collapsed class to console');
                    consolePanelElement.classList.add('auto-collapsed');
                } else {
                    console.log('Console not auto-collapsed because:', {
                        consolePanelElement: !!consolePanelElement,
                        isMinimized: consolePanelElement?.classList.contains('minimized')
                    });
                }
            } else {
                // Collapsing sidebar (was expanded, now collapsing)
                console.log('Collapsing sidebar - should remove auto-collapse from console');
                sidebar.classList.add('collapsed');
                appLayout.classList.add('sidebar-collapsed');
                sidebarToggle.innerHTML = '<span class="hamburger-icon">☰</span>';
                
                // Remove auto-collapse when sidebar is collapsed
                if (consolePanelElement) {
                    console.log('Removing auto-collapsed class from console');
                    consolePanelElement.classList.remove('auto-collapsed');
                }
            }
        }
        
        window.brandmeisterMonitor.logWithAttributes('Sidebar toggled', {
            sessionID: window.brandmeisterMonitor.sessionID,
            collapsed: sidebar.classList.contains('collapsed'),
            open: sidebar.classList.contains('open'),
            mobile: isMobile
        });
        
        // Save UI state after sidebar toggle
        console.log('🔗 Calling saveUIState from sidebar toggle');
        window.brandmeisterMonitor.saveUIState();
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
        // Save UI state before cleanup
        console.log('🔗 Calling saveUIState from beforeunload');
        window.brandmeisterMonitor.saveUIState();
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

// Service Worker registration for offline capability and auto-updates
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration);
                
                // Check for updates every 30 seconds
                setInterval(() => {
                    registration.update();
                }, 30000);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New service worker found, installing...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker installed, show update notification
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((registrationError) => {
                console.log('❌ SW registration failed:', registrationError);
            });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'CACHE_UPDATED') {
                console.log('📦 Cache updated to:', event.data.version);
                showUpdateNotification();
            }
        });
    });
}

// Show update notification to user
function showUpdateNotification() {
    // Remove any existing update notification
    const existingNotification = document.querySelector('.update-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create update notification
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span class="material-icons">system_update</span>
            <div class="update-text">
                <strong>App Updated!</strong>
                <p>New features available. Refresh to get the latest version.</p>
            </div>
            <div class="update-actions">
                <button class="btn-update" onclick="window.location.reload()">
                    <span class="material-icons">refresh</span> Refresh Now
                </button>
                <button class="btn-dismiss" onclick="this.closest('.update-notification').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds if not acted upon
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}
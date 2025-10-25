/**
 * First-Time User Onboarding Module
 * Helps new users configure talkgroups based on their location
 */

class OnboardingManager {
    constructor() {
        this.storageKey = 'onboarding_completed';
        this.countryKey = 'user_country';
        this.detectedCountry = null;
        this.modal = null;
        
        // Map country codes to Mobile Country Codes (MCC)
        // These are the first 3 digits of talkgroup IDs in Brandmeister
        this.countryToMCC = {
            'US': '310',  // United States
            'CA': '302',  // Canada
            'GB': '235',  // United Kingdom
            'DE': '262',  // Germany
            'ES': '214',  // Spain
            'FR': '208',  // France
            'IT': '222',  // Italy
            'NL': '204',  // Netherlands
            'BR': '724',  // Brazil
            'AU': '505',  // Australia
            'NZ': '530',  // New Zealand
            'JP': '440',  // Japan
            'CN': '460',  // China
            'IN': '404',  // India
            'MX': '334',  //     Mexico
            'AR': '722',  // Argentina
            'CL': '730',  // Chile
            'CO': '732',  // Colombia
            'PE': '716',  // Peru
            'RU': '250',  // Russia
            'PL': '260',  // Poland
            'SE': '240',  // Sweden
            'NO': '242',  // Norway
            'FI': '244',  // Finland
            'DK': '238',  // Denmark
            'BE': '206',  // Belgium
            'CH': '228',  // Switzerland
            'AT': '232',  // Austria
            'PT': '268',  // Portugal
            'IE': '272',  // Ireland
            'CZ': '230',  // Czech Republic
            'GR': '202',  // Greece
            'TR': '286',  // Turkey
            'ZA': '655',  // South Africa
            'IL': '425',  // Israel
            'KR': '450',  // South Korea
            'TW': '466',  // Taiwan
            'TH': '520',  // Thailand
            'MY': '502',  // Malaysia
            'SG': '525',  // Singapore
            'PH': '515',  // Philippines
            'ID': '510',  // Indonesia
            'VN': '452',  // Vietnam
        };
    }

    /**
     * Check if onboarding should be shown
     */
    shouldShowOnboarding() {
        // Check if user has completed onboarding
        const completed = localStorage.getItem(this.storageKey);
        if (completed === 'true') {
            return false;
        }

        // Check if user has already configured talkgroups (use the app's storage key)
        const savedTalkgroup = localStorage.getItem('brandmeister_talkgroup');
        const selectedTGs = localStorage.getItem('brandmeister_selected_talkgroups');
        
        if (savedTalkgroup || (selectedTGs && selectedTGs !== '[]')) {
            // User has talkgroups configured, mark as completed
            localStorage.setItem(this.storageKey, 'true');
            return false;
        }

        return true;
    }

    /**
     * Detect user's country from IP using multiple free services
     */
    async detectCountry() {
        // Try multiple services in case one fails
        const services = [
            'https://ipapi.co/json/',
            'https://ip-api.com/json/',
            'https://ipwhois.app/json/'
        ];

        for (const service of services) {
            try {
                const response = await fetch(service);
                if (response.ok) {
                    const data = await response.json();
                    // Normalize the country code field name
                    const countryCode = data.country_code || data.countryCode || data.country;
                    if (countryCode) {
                        this.detectedCountry = countryCode;
                        localStorage.setItem(this.countryKey, countryCode);
                        return countryCode;
                    }
                }
            } catch (error) {
                console.log(`Country detection service failed: ${service}`, error);
            }
        }

        // Fallback: check saved country
        const savedCountry = localStorage.getItem(this.countryKey);
        if (savedCountry) {
            this.detectedCountry = savedCountry;
            return savedCountry;
        }

        return null;
    }

    /**
     * Get country name from code
     */
    getCountryName(countryCode) {
        const countries = {
            'US': 'United States',
            'CA': 'Canada',
            'GB': 'United Kingdom',
            'DE': 'Germany',
            'ES': 'Spain',
            'FR': 'France',
            'IT': 'Italy',
            'NL': 'Netherlands',
            'BR': 'Brazil',
            'AU': 'Australia',
            'JP': 'Japan',
            'MX': 'Mexico',
            'AR': 'Argentina',
            'CL': 'Chile',
            'CO': 'Colombia',
            'PE': 'Peru',
            'VE': 'Venezuela',
            'PT': 'Portugal',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
            'PL': 'Poland',
            'RU': 'Russia',
            'CN': 'China',
            'IN': 'India',
            'ZA': 'South Africa',
            'NZ': 'New Zealand',
            'KR': 'South Korea',
            'TW': 'Taiwan',
            'SG': 'Singapore',
            'TH': 'Thailand',
            'MY': 'Malaysia',
            'ID': 'Indonesia'
        };
        return countries[countryCode] || countryCode;
    }

    /**
     * Get talkgroups from Brandmeister app
     */
    getTalkgroupsFromApp() {
        try {
            if (window.brandmeisterMonitor && window.brandmeisterMonitor.talkgroupManager) {
                return window.brandmeisterMonitor.talkgroupManager.getAllTalkgroups();
            }
        } catch (error) {
            console.warn('⚠️ Could not get talkgroups from app:', error);
        }
        return {};
    }

    /**
     * Get recommended talkgroups for a country based on actual Brandmeister data
     */
    getRecommendations(countryCode) {
        const allTalkgroups = this.getTalkgroupsFromApp();
        const mcc = this.countryToMCC[countryCode];
        
        if (!mcc || Object.keys(allTalkgroups).length === 0) {
            // Fallback to popular worldwide talkgroups
            return {
                tgs: [91],
                names: ['Worldwide English']
            };
        }

        // Filter talkgroups that start with the country's MCC
        const countryTalkgroups = [];
        Object.entries(allTalkgroups).forEach(([id, name]) => {
            if (id.startsWith(mcc)) {
                countryTalkgroups.push({ id: parseInt(id), name: name });
            }
        });

        // Sort by ID (lower IDs are usually more important/popular)
        countryTalkgroups.sort((a, b) => a.id - b.id);

        // Take the first 10 talkgroups, or all if less than 10
        const recommended = countryTalkgroups.slice(0, 10);

        // Add some worldwide talkgroups if we have room
        const worldwide = [
            { id: 91, name: allTalkgroups['91'] || 'Worldwide English' }
        ];

        // Combine country + worldwide, limit to 15 total
        const combined = [...recommended, ...worldwide].slice(0, 15);

        return {
            tgs: combined.map(tg => tg.id),
            names: combined.map(tg => tg.name)
        };
    }

    /**
     * Create and show onboarding modal
     */
    async showOnboarding() {
        // Detect country
        await this.detectCountry();

        // Create modal HTML
        this.createModal();

        // Show modal
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 100);
    }

    /**
     * Create modal HTML structure
     */
    createModal() {
        const countryCode = this.detectedCountry || 'DEFAULT';
        const countryName = this.getCountryName(countryCode);
        const recommendations = this.getRecommendations(countryCode);

        this.modal = document.createElement('div');
        this.modal.className = 'onboarding-modal-overlay';
        this.modal.id = 'onboardingModal';

        this.modal.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-header">
                    <h2 data-i18n="onboarding.welcome">👋 Welcome to Brandmeister Monitor!</h2>
                </div>
                <div class="onboarding-content">
                    <p data-i18n="onboarding.intro">Let's get you started by selecting some talkgroups to monitor.</p>
                    
                    <div class="onboarding-section">
                        <div class="onboarding-country">
                            <span class="material-icons">location_on</span>
                            <span data-i18n="onboarding.detected">Detected location:</span>
                            <strong id="detectedCountry">${countryName}</strong>
                        </div>
                        <p class="onboarding-subtitle" data-i18n="onboarding.suggestion">Based on your location, we recommend these popular talkgroups:</p>
                    </div>

                    <div class="onboarding-search">
                        <div class="onboarding-search-box">
                            <span class="material-icons">search</span>
                            <input type="text" id="onboardingSearch" placeholder="Search for more talkgroups..." autocomplete="off">
                            <button class="onboarding-search-clear" id="onboardingSearchClear" style="display: none;">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                        <div class="onboarding-search-results" id="onboardingSearchResults"></div>
                    </div>

                    <div class="onboarding-talkgroups" id="onboardingTalkgroups">
                        ${recommendations.tgs.map((tg, index) => `
                            <label class="onboarding-tg-item">
                                <input type="checkbox" value="${tg}" checked>
                                <span class="tg-badge">TG ${tg}</span>
                                <span class="tg-name">${recommendations.names[index]}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="onboarding-actions">
                        <button class="btn-onboarding-primary" id="onboardingApply">
                            <span class="material-icons">check</span>
                            <span data-i18n="onboarding.apply">Start Monitoring</span>
                        </button>
                        <button class="btn-onboarding-secondary" id="onboardingSkip">
                            <span data-i18n="onboarding.skip">Skip, I'll configure later</span>
                        </button>
                    </div>

                    <div class="onboarding-footer">
                        <p data-i18n="onboarding.hint">💡 You can always change these in the sidebar settings.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Apply translations using the i18n system
        if (window.I18n) {
            window.I18n.updateUI();
        }

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        const applyBtn = document.getElementById('onboardingApply');
        const skipBtn = document.getElementById('onboardingSkip');
        const searchInput = document.getElementById('onboardingSearch');
        const searchClear = document.getElementById('onboardingSearchClear');

        if (!applyBtn || !skipBtn) {
            console.error('❌ Onboarding: Could not find buttons');
            return;
        }

        console.log('✅ Onboarding: Attaching event listeners');

        applyBtn.addEventListener('click', (e) => {
            console.log('🔘 Onboarding: Apply button clicked');
            e.preventDefault();
            this.applyTalkgroups();
        });
        
        skipBtn.addEventListener('click', (e) => {
            console.log('🔘 Onboarding: Skip button clicked');
            e.preventDefault();
            this.skipOnboarding();
        });

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query) {
                    searchClear.style.display = 'flex';
                    this.handleSearch(query);
                } else {
                    searchClear.style.display = 'none';
                    this.clearSearch();
                }
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.style.display = 'none';
                this.clearSearch();
            });
        }

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.skipOnboarding();
            }
        });
    }

    /**
     * Handle talkgroup search
     */
    handleSearch(query) {
        if (typeof searchTalkgroups === 'undefined') {
            console.warn('⚠️ searchTalkgroups function not available');
            return;
        }

        const results = searchTalkgroups(query);
        this.showSearchResults(results);
    }

    /**
     * Show search results
     */
    showSearchResults(results) {
        const searchResultsEl = document.getElementById('onboardingSearchResults');
        if (!searchResultsEl) return;

        if (results.length === 0) {
            searchResultsEl.innerHTML = '<div class="onboarding-search-empty">No talkgroups found</div>';
            searchResultsEl.style.display = 'block';
            return;
        }

        searchResultsEl.innerHTML = results.map(result => `
            <div class="onboarding-search-item" data-tg-id="${result.id}">
                <div class="onboarding-search-item-info">
                    <span class="tg-badge">TG ${result.id}</span>
                    <span class="tg-name">${result.name}</span>
                </div>
                <button class="onboarding-add-btn" data-tg-id="${result.id}" data-tg-name="${result.name}">
                    <span class="material-icons">add</span>
                </button>
            </div>
        `).join('');

        // Add click handlers for add buttons
        searchResultsEl.querySelectorAll('.onboarding-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tgId = btn.dataset.tgId;
                const tgName = btn.dataset.tgName;
                this.addTalkgroupToSelection(tgId, tgName);
            });
        });

        searchResultsEl.style.display = 'block';
    }

    /**
     * Clear search results
     */
    clearSearch() {
        const searchResultsEl = document.getElementById('onboardingSearchResults');
        if (searchResultsEl) {
            searchResultsEl.innerHTML = '';
            searchResultsEl.style.display = 'none';
        }
    }

    /**
     * Add a talkgroup to the selected list
     */
    addTalkgroupToSelection(tgId, tgName) {
        const talkgroupsContainer = document.getElementById('onboardingTalkgroups');
        if (!talkgroupsContainer) return;

        // Check if already exists
        const existing = talkgroupsContainer.querySelector(`input[value="${tgId}"]`);
        if (existing) {
            existing.checked = true;
            // Highlight briefly
            existing.closest('.onboarding-tg-item').style.animation = 'pulse 0.5s';
            setTimeout(() => {
                if (existing.closest('.onboarding-tg-item')) {
                    existing.closest('.onboarding-tg-item').style.animation = '';
                }
            }, 500);
            return;
        }

        // Add new talkgroup to the list
        const newItem = document.createElement('label');
        newItem.className = 'onboarding-tg-item';
        newItem.innerHTML = `
            <input type="checkbox" value="${tgId}" checked>
            <span class="tg-badge">TG ${tgId}</span>
            <span class="tg-name">${tgName}</span>
        `;
        talkgroupsContainer.appendChild(newItem);

        // Scroll to show the new item
        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Apply selected talkgroups and close modal
     */
    applyTalkgroups() {
        const checkboxes = document.querySelectorAll('#onboardingTalkgroups input[type="checkbox"]:checked');
        const selectedTGs = Array.from(checkboxes).map(cb => parseInt(cb.value));

        console.log('📋 Onboarding: Selected talkgroups:', selectedTGs);

        if (selectedTGs.length === 0) {
            alert('Please select at least one talkgroup to monitor.');
            return;
        }

        // Save using the app's storage keys
        // 1. Save to brandmeister_selected_talkgroups (for sidebar display)
        localStorage.setItem('brandmeister_selected_talkgroups', JSON.stringify(selectedTGs));
        
        // 2. Save to brandmeister_talkgroup (for monitoring)
        localStorage.setItem('brandmeister_talkgroup', selectedTGs.join(','));
        localStorage.setItem('brandmeister_monitor_all', 'false');
        
        console.log('💾 Onboarding: Saved to localStorage');
        
        // Reload the app's talkgroup configuration
        if (window.brandmeisterMonitor) {
            console.log('🔄 Onboarding: Reloading app talkgroups');
            
            // Load selected talkgroups into sidebar
            window.brandmeisterMonitor.loadSelectedTalkGroupsFromStorage();
            
            // Load talkgroup for monitoring
            window.brandmeisterMonitor.loadTalkgroupFromStorage();
            
            // Start monitoring with the selected talkgroups
            window.brandmeisterMonitor.startMonitoring(selectedTGs);
        }

        // Mark onboarding as completed
        localStorage.setItem(this.storageKey, 'true');
        console.log('✅ Onboarding: Completed');

        // Close modal
        this.closeModal();
    }

    /**
     * Skip onboarding
     */
    skipOnboarding() {
        // Mark onboarding as completed
        localStorage.setItem(this.storageKey, 'true');

        // Close modal
        this.closeModal();
    }

    /**
     * Close and remove modal
     */
    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
            setTimeout(() => {
                this.modal.remove();
                this.modal = null;
            }, 300);
        }
    }

    /**
     * Initialize onboarding if needed
     */
    async initialize() {
        if (this.shouldShowOnboarding()) {
            // Wait a bit for the main app and i18n to load
            setTimeout(() => {
                this.showOnboarding();
            }, 1000);
        }
    }
}

// Initialize onboarding when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const onboarding = new OnboardingManager();
        onboarding.initialize();
    });
} else {
    const onboarding = new OnboardingManager();
    onboarding.initialize();
}

// Unified Talkgroup Data Manager
// Provides consistent interface for both API and static talkgroup data

class TalkgroupManager {
    constructor() {
        this.apiData = {};
        this.staticData = {};
        this.unifiedData = {};
        this.lastUpdate = null;
        this.isApiDataAvailable = false;
    }

    // Initialize with static data (always available)
    initializeWithStaticData(staticTalkgroups) {
        this.staticData = { ...staticTalkgroups };
        this.rebuildUnifiedData();
    }

    // Update with API data (when available)
    updateWithApiData(apiData, lastUpdate = null) {
        this.apiData = { ...apiData };
        this.lastUpdate = lastUpdate;
        this.isApiDataAvailable = Object.keys(apiData).length > 0;
        this.rebuildUnifiedData();
    }

    // Rebuild unified data with API priority
    rebuildUnifiedData() {
        // Start with static data as base
        this.unifiedData = { ...this.staticData };
        
        // Override with API data where available (API has priority)
        if (this.isApiDataAvailable) {
            Object.assign(this.unifiedData, this.apiData);
        }
    }

    // Get talkgroup name from unified data
    getTalkgroupName(id) {
        const idStr = id.toString();
        return this.unifiedData[idStr] || `TG ${id}`;
    }

    // Search talkgroups in unified data
    searchTalkgroups(query, limit = 50) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        // Search in unified data (API + static)
        Object.entries(this.unifiedData).forEach(([id, name]) => {
            if (id.includes(searchTerm) || name.toLowerCase().includes(searchTerm)) {
                results.push({ 
                    id, 
                    name,
                    source: this.apiData[id] ? 'api' : 'static'
                });
            }
        });

        // Sort results: API data first, then by ID
        results.sort((a, b) => {
            if (a.source !== b.source) {
                return a.source === 'api' ? -1 : 1;
            }
            return parseInt(a.id) - parseInt(b.id);
        });

        return results.slice(0, limit);
    }

    // Get statistics
    getStatistics() {
        return {
            totalTalkgroups: Object.keys(this.unifiedData).length,
            apiTalkgroups: Object.keys(this.apiData).length,
            staticTalkgroups: Object.keys(this.staticData).length,
            lastUpdate: this.lastUpdate,
            isApiDataAvailable: this.isApiDataAvailable
        };
    }

    // Check if API data is fresh (within cache expiry time)
    isApiDataFresh(cacheExpiryMs = 24 * 60 * 60 * 1000) {
        if (!this.lastUpdate) return false;
        return (Date.now() - this.lastUpdate) < cacheExpiryMs;
    }

    // Get all talkgroups (unified data)
    getAllTalkgroups() {
        return { ...this.unifiedData };
    }

    // Export data for caching
    exportForCache() {
        return {
            apiData: this.apiData,
            lastUpdate: this.lastUpdate,
            isApiDataAvailable: this.isApiDataAvailable
        };
    }

    // Import data from cache
    importFromCache(cacheData) {
        if (cacheData.apiData) {
            this.updateWithApiData(cacheData.apiData, cacheData.lastUpdate);
        }
    }
}

// Export for use in main application
window.TalkgroupManager = TalkgroupManager;
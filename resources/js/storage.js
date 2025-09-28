// Storage Utility for Brandmeister Monitor
// Works with both browser localStorage and Neutralino storage API

class StorageManager {
    constructor() {
        this.isNeutralinoApp = typeof Neutralino !== 'undefined' && Neutralino.storage;
        this.cache = new Map(); // In-memory cache for better performance
        
        console.log(`Storage Manager initialized: ${this.isNeutralinoApp ? 'Neutralino' : 'Browser'} mode`);
    }

    async getItem(key) {
        try {
            // Check cache first
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            let value;
            if (this.isNeutralinoApp) {
                // Use Neutralino storage API - handle missing keys gracefully
                try {
                    value = await Neutralino.storage.getData(key);
                } catch (neutralinoError) {
                    // Neutralino throws error for missing keys, treat as null
                    if (neutralinoError.code === 'NE_ST_NOSTKEX' || neutralinoError.message?.includes('Unable to find storage key')) {
                        value = null;
                    } else {
                        throw neutralinoError; // Re-throw other errors
                    }
                }
            } else {
                // Use browser localStorage
                value = localStorage.getItem(key);
            }
            
            // Cache the value (including null values to avoid repeated lookups)
            this.cache.set(key, value);
            
            return value;
        } catch (error) {
            console.warn(`Storage getItem failed for key '${key}':`, error);
            // Fallback to browser localStorage if available
            if (!this.isNeutralinoApp && typeof localStorage !== 'undefined') {
                try {
                    const fallbackValue = localStorage.getItem(key);
                    this.cache.set(key, fallbackValue);
                    return fallbackValue;
                } catch (fallbackError) {
                    console.warn('Fallback localStorage also failed:', fallbackError);
                }
            }
            return null;
        }
    }

    async setItem(key, value) {
        try {
            // Update cache
            this.cache.set(key, value);
            
            if (this.isNeutralinoApp) {
                // Use Neutralino storage API
                await Neutralino.storage.setData(key, value);
                // Track the key for later retrieval
                await this._updateKeysList(key, 'add');
            } else {
                // Use browser localStorage
                localStorage.setItem(key, value);
            }
            
            console.log(`Storage: Saved '${key}'`);
            return true;
        } catch (error) {
            console.error(`Storage setItem failed for key '${key}':`, error);
            // Try fallback to browser localStorage
            if (!this.isNeutralinoApp && typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (fallbackError) {
                    console.error('Fallback storage also failed:', fallbackError);
                }
            }
            return false;
        }
    }

    async removeItem(key) {
        try {
            // Remove from cache
            this.cache.delete(key);
            
            if (this.isNeutralinoApp) {
                // Neutralino doesn't have a remove method, so we set to null
                // But first check if the key exists to avoid unnecessary operations
                try {
                    await Neutralino.storage.getData(key);
                    // Key exists, remove it by setting to null/undefined
                    await Neutralino.storage.setData(key, null);
                } catch (error) {
                    if (error.code === 'NE_ST_NOSTKEX') {
                        // Key doesn't exist, that's fine
                        console.log(`Storage: Key '${key}' already doesn't exist`);
                    } else {
                        throw error;
                    }
                }
                // Update keys list
                await this._updateKeysList(key, 'remove');
            } else {
                // Use browser localStorage
                localStorage.removeItem(key);
            }
            
            console.log(`Storage: Removed '${key}'`);
            return true;
        } catch (error) {
            console.warn(`Storage removeItem failed for key '${key}':`, error);
            return false;
        }
    }

    async clear() {
        try {
            // Clear cache
            this.cache.clear();
            
            if (this.isNeutralinoApp) {
                // Get all keys and remove them (Neutralino doesn't have a clear method)
                const keys = await this.getAllKeys();
                for (const key of keys) {
                    await this.removeItem(key);
                }
            } else {
                // Use browser localStorage
                localStorage.clear();
            }
            
            console.log('Storage: Cleared all data');
            return true;
        } catch (error) {
            console.error('Storage clear failed:', error);
            return false;
        }
    }

    async getAllKeys() {
        try {
            if (this.isNeutralinoApp) {
                // Neutralino doesn't provide a keys() method, so we'll track them
                const keys = await Neutralino.storage.getData('__storage_keys__') || '[]';
                return JSON.parse(keys);
            } else {
                // Use browser localStorage
                return Object.keys(localStorage);
            }
        } catch (error) {
            console.warn('Storage getAllKeys failed:', error);
            return [];
        }
    }

    // Helper method to track keys in Neutralino (since it doesn't have a keys() method)
    async _updateKeysList(key, action = 'add') {
        if (!this.isNeutralinoApp) return;
        
        try {
            let keysData;
            try {
                keysData = await Neutralino.storage.getData('__storage_keys__') || '[]';
            } catch (error) {
                if (error.code === 'NE_ST_NOSTKEX') {
                    // Keys list doesn't exist yet, start with empty array
                    keysData = '[]';
                } else {
                    throw error;
                }
            }
            
            let keys = JSON.parse(keysData);
            
            if (action === 'add' && !keys.includes(key)) {
                keys.push(key);
                await Neutralino.storage.setData('__storage_keys__', JSON.stringify(keys));
            } else if (action === 'remove') {
                keys = keys.filter(k => k !== key);
                await Neutralino.storage.setData('__storage_keys__', JSON.stringify(keys));
            }
        } catch (error) {
            console.warn('Failed to update keys list:', error);
        }
    }
}

// Create a global storage manager instance
const storage = new StorageManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storage;
}
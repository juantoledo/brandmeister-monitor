/**
 * Location & Weather Enhancement for Brandmeister Monitor
 * Adds local time and weather information for transmission locations
 */

class LocationWeatherService {
    constructor() {
        this.geocodeCache = new Map(); // Cache location coordinates
        this.weatherCache = new Map(); // Cache weather data
        this.timezoneCache = new Map(); // Cache timezone data
        this.locationInfoCache = new Map(); // Cache complete location info (coordinates + weather + timezone)
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
        this.timeCacheExpiry = 1 * 60 * 1000; // 1 minute for time updates
        
        // Free APIs (no key required for basic usage)
        this.apis = {
            geocoding: 'https://nominatim.openstreetmap.org/search',
            weather: 'https://api.open-meteo.com/v1/forecast',
            timezone: 'https://worldtimeapi.org/api/timezone'
        };
        
        // Country name mappings for geocoding normalization
        this.countryNameMapping = {
            // Common variations and official names that need normalization
            'korea republic of': 'south korea',
            'republic of korea': 'south korea',
            'korea south': 'south korea',
            'argentina republic': 'argentina',
            'argentine republic': 'argentina',
            'republic of argentina': 'argentina',
            'brazil federative republic': 'brazil',
            'federative republic of brazil': 'brazil',
            'china people\'s republic': 'china',
            'people\'s republic of china': 'china',
            'russian federation': 'russia',
            'russia federation': 'russia',
            'united states of america': 'united states',
            'usa': 'united states',
            'united kingdom great britain': 'united kingdom',
            'great britain': 'united kingdom',
            'britain': 'united kingdom',
            'england': 'united kingdom',
            'scotland': 'united kingdom',
            'wales': 'united kingdom',
            'northern ireland': 'united kingdom',
            'germany federal republic': 'germany',
            'federal republic of germany': 'germany',
            'deutschland': 'germany',
            'france republic': 'france',
            'french republic': 'france',
            'spain kingdom': 'spain',
            'kingdom of spain': 'spain',
            'españa': 'spain',
            'italy republic': 'italy',
            'italian republic': 'italy',
            'italia': 'italy',
            'netherlands kingdom': 'netherlands',
            'kingdom of the netherlands': 'netherlands',
            'holland': 'netherlands',
            'czech republic': 'czechia',
            'slovak republic': 'slovakia',
            'republic of poland': 'poland',
            'polska': 'poland',
            'hungary republic': 'hungary',
            'republic of hungary': 'hungary',
            'romania republic': 'romania',
            'republic of romania': 'romania',
            'ukraine republic': 'ukraine',
            'republic of ukraine': 'ukraine',
            'belarus republic': 'belarus',
            'republic of belarus': 'belarus',
            'turkey republic': 'turkey',
            'republic of turkey': 'turkey',
            'islamic republic of iran': 'iran',
            'iran islamic republic': 'iran',
            'democratic people\'s republic of korea': 'north korea',
            'north korea democratic': 'north korea',
            'vietnam socialist republic': 'vietnam',
            'socialist republic of vietnam': 'vietnam',
            'india republic': 'india',
            'republic of india': 'india',
            'japan state': 'japan',
            'state of japan': 'japan',
            'australia commonwealth': 'australia',
            'commonwealth of australia': 'australia',
            'new zealand dominion': 'new zealand',
            'dominion of new zealand': 'new zealand',
            'canada dominion': 'canada',
            'dominion of canada': 'canada',
            'south africa republic': 'south africa',
            'republic of south africa': 'south africa',
            'egypt arab republic': 'egypt',
            'arab republic of egypt': 'egypt',
            'united arab emirates': 'uae',
            'emirates': 'uae',
            'saudi arabia kingdom': 'saudi arabia',
            'kingdom of saudi arabia': 'saudi arabia'
        };
    }

    /**
     * Normalize country name for better geocoding results
     * @param {string} countryName - Original country name
     * @returns {string} - Normalized country name
     */
    normalizeCountryName(countryName) {
        if (!countryName) return '';
        
        // Convert to lowercase and trim
        let normalized = countryName.trim().toLowerCase();
        
        // Remove common prefixes and suffixes that can confuse geocoding
        normalized = normalized
            .replace(/^(republic of|kingdom of|state of|united|federal republic of|people's republic of|islamic republic of|democratic republic of|socialist republic of|dominion of|commonwealth of|arab republic of)\s+/i, '')
            .replace(/\s+(republic|kingdom|state|federation|emirate|principality|dominion|commonwealth)$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Check direct mapping first
        if (this.countryNameMapping[normalized]) {
            return this.countryNameMapping[normalized];
        }
        
        // Check if any mapping key contains or is contained in the normalized name
        for (const [variant, standardName] of Object.entries(this.countryNameMapping)) {
            if (normalized.includes(variant) || variant.includes(normalized)) {
                return standardName;
            }
        }
        
        // Try substring matching for compound names
        const words = normalized.split(' ').filter(word => word.length > 2);
        for (const [variant, standardName] of Object.entries(this.countryNameMapping)) {
            const variantWords = variant.split(' ');
            // If most significant words match, use the mapping
            const matchingWords = words.filter(word => 
                variantWords.some(vw => vw.includes(word) || word.includes(vw))
            );
            if (matchingWords.length >= Math.min(2, words.length)) {
                return standardName;
            }
        }
        
        // Return the cleaned normalized name if no mapping found
        return normalized;
    }

    /**
     * Get location coordinates from city, state, country
     */
    async getCoordinates(city, state, country) {
        // Normalize country name for better geocoding results
        const normalizedCountry = this.normalizeCountryName(country);
        const locationKey = `${city}, ${state}, ${normalizedCountry}`.toLowerCase();
        
        // Check cache first
        const cached = this.geocodeCache.get(locationKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const query = [city, state, normalizedCountry].filter(Boolean).join(', ');
            const url = `${this.apis.geocoding}?q=${encodeURIComponent(query)}&format=json&limit=1`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
                
                // Cache the result
                this.geocodeCache.set(locationKey, {
                    data: coords,
                    timestamp: Date.now()
                });
                
                return coords;
            }
        } catch (error) {
            console.warn('Geocoding failed:', error);
        }
        
        return null;
    }

    /**
     * Get current weather for coordinates
     */
    async getWeather(lat, lon) {
        const weatherKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        
        // Check cache first
        const cached = this.weatherCache.get(weatherKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const url = `${this.apis.weather}?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.current_weather) {
                const weather = {
                    temperature: Math.round(data.current_weather.temperature),
                    weathercode: data.current_weather.weathercode,
                    windspeed: data.current_weather.windspeed,
                    timezone: data.timezone
                };
                
                // Cache the result
                this.weatherCache.set(weatherKey, {
                    data: weather,
                    timestamp: Date.now()
                });
                
                return weather;
            }
        } catch (error) {
            console.warn('Weather fetch failed:', error);
        }
        
        return null;
    }

    /**
     * Get local time for timezone
     */
    async getLocalTime(timezone) {
        // For time, we only cache the timezone validity, not the actual time
        // since time changes every minute
        const cached = this.timezoneCache.get(timezone);
        const isTimezoneValid = cached && (Date.now() - cached.timestamp) < this.timeCacheExpiry;

        try {
            // Use browser's Intl API for timezone conversion (all local calculation)
            const now = new Date();
            
            // Get current language from i18n system (fallback to 'en')
            const currentLang = window.I18n ? window.I18n.getCurrentLanguage()?.code || 'en' : 'en';
            
            // Get day of the week and time in user's language
            const dayOfWeek = new Intl.DateTimeFormat(currentLang, {
                timeZone: timezone,
                weekday: 'short'
            }).format(now);
            
            const localTime = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);
            
            // Combine day and time
            const fullTimeString = `${dayOfWeek} ${localTime}`;
            
            // Cache the timezone validity (not the time itself)
            if (!isTimezoneValid) {
                this.timezoneCache.set(timezone, {
                    timestamp: Date.now()
                });
            }
            
            return fullTimeString;
        } catch (error) {
            console.warn('Timezone conversion failed:', error);
            
            // Fallback to local time with user's language
            const now = new Date();
            const currentLang = window.I18n ? window.I18n.getCurrentLanguage()?.code || 'en' : 'en';
            
            const dayOfWeek = now.toLocaleDateString(currentLang, { weekday: 'short' });
            const time = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `${dayOfWeek} ${time}`;
        }
    }

    /**
     * Get weather emoji from weather code
     */
    getWeatherEmoji(weathercode) {
        const weatherMap = {
            0: '☀️',    // Clear sky
            1: '🌤️',    // Mainly clear
            2: '⛅',    // Partly cloudy
            3: '☁️',    // Overcast
            45: '🌫️',   // Fog
            48: '🌫️',   // Depositing rime fog
            51: '🌦️',   // Light drizzle
            53: '🌦️',   // Moderate drizzle
            55: '🌧️',   // Dense drizzle
            61: '🌧️',   // Slight rain
            63: '🌧️',   // Moderate rain
            65: '🌧️',   // Heavy rain
            71: '🌨️',   // Slight snow
            73: '🌨️',   // Moderate snow
            75: '❄️',   // Heavy snow
            80: '🌦️',   // Slight rain showers
            81: '🌧️',   // Moderate rain showers
            82: '⛈️',   // Violent rain showers
            95: '⛈️',   // Thunderstorm
            96: '⛈️',   // Thunderstorm with hail
            99: '⛈️'    // Thunderstorm with heavy hail
        };
        
        return weatherMap[weathercode] || '<span class="material-icons small">wb_cloudy</span>';
    }

    /**
     * Get complete location info with time and weather
     */
    async getLocationInfo(city, state, country) {
        // Normalize country name for consistent caching and better geocoding
        const normalizedCountry = this.normalizeCountryName(country);
        const locationKey = `${city}, ${state}, ${normalizedCountry}`.toLowerCase();
        
        // Check if we have cached location info
        const cachedLocationInfo = this.locationInfoCache.get(locationKey);
        if (cachedLocationInfo && (Date.now() - cachedLocationInfo.timestamp) < this.cacheExpiry) {
            // Update only the time if timezone is available (time changes frequently)
            if (cachedLocationInfo.data.timezone) {
                try {
                    const updatedTime = await this.getLocalTime(cachedLocationInfo.data.timezone);
                    return {
                        ...cachedLocationInfo.data,
                        localTime: updatedTime
                    };
                } catch (error) {
                    // If time update fails, return cached data
                    return cachedLocationInfo.data;
                }
            }
            return cachedLocationInfo.data;
        }

        try {
            // Get coordinates
            const coords = await this.getCoordinates(city, state, normalizedCountry);
            if (!coords) return null;

            // Get weather and timezone in parallel
            const [weather] = await Promise.all([
                this.getWeather(coords.lat, coords.lon)
            ]);

            let localTime = 'UTC';
            if (weather && weather.timezone) {
                localTime = await this.getLocalTime(weather.timezone);
            }

            const locationInfo = {
                coordinates: coords,
                weather: weather ? {
                    temperature: weather.temperature,
                    emoji: this.getWeatherEmoji(weather.weathercode),
                    windspeed: weather.windspeed
                } : null,
                localTime: localTime,
                timezone: weather?.timezone || 'UTC'
            };

            // Cache the complete location info
            this.locationInfoCache.set(locationKey, {
                data: locationInfo,
                timestamp: Date.now()
            });

            return locationInfo;
        } catch (error) {
            console.warn('Location info fetch failed:', error);
            return null;
        }
    }

    /**
     * Format time consistently
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * Clear old cache entries
     */
    cleanCache() {
        const now = Date.now();
        
        // Clean geocode, weather, and timezone caches
        [this.geocodeCache, this.weatherCache, this.locationInfoCache].forEach(cache => {
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp > this.cacheExpiry) {
                    cache.delete(key);
                }
            }
        });

        // Clean timezone cache with shorter expiry
        for (const [key, value] of this.timezoneCache.entries()) {
            if (now - value.timestamp > this.timeCacheExpiry) {
                this.timezoneCache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics for debugging
     */
    getCacheStats() {
        return {
            geocode: this.geocodeCache.size,
            weather: this.weatherCache.size,
            timezone: this.timezoneCache.size,
            locationInfo: this.locationInfoCache.size,
            total: this.geocodeCache.size + this.weatherCache.size + this.timezoneCache.size + this.locationInfoCache.size
        };
    }

    /**
     * Check if location info is cached (without fetching)
     */
    isLocationInfoCached(city, state, country) {
        // Normalize country name for consistent cache lookup
        const normalizedCountry = this.normalizeCountryName(country);
        const locationKey = `${city}, ${state}, ${normalizedCountry}`.toLowerCase();
        const cachedLocationInfo = this.locationInfoCache.get(locationKey);
        return cachedLocationInfo && (Date.now() - cachedLocationInfo.timestamp) < this.cacheExpiry;
    }
}

// Export for use in main app
window.LocationWeatherService = LocationWeatherService;
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
    }

    /**
     * Get location coordinates from city, state, country
     */
    async getCoordinates(city, state, country) {
        const locationKey = `${city}, ${state}, ${country}`.toLowerCase();
        
        // Check cache first
        const cached = this.geocodeCache.get(locationKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const query = [city, state, country].filter(Boolean).join(', ');
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
        const locationKey = `${city}, ${state}, ${country}`.toLowerCase();
        
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
            const coords = await this.getCoordinates(city, state, country);
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
        const locationKey = `${city}, ${state}, ${country}`.toLowerCase();
        const cachedLocationInfo = this.locationInfoCache.get(locationKey);
        return cachedLocationInfo && (Date.now() - cachedLocationInfo.timestamp) < this.cacheExpiry;
    }
}

// Export for use in main app
window.LocationWeatherService = LocationWeatherService;
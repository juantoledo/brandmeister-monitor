/**
 * Configuration and Constants for Brandmeister Monitor
 * This file contains all configuration variables and country mappings
 */

// Default application configuration
window.BrandmeisterConfig = {
    // Basic settings
    minDuration: 2, // filter out short transmissions (seconds)
    verbose: false, // Enable verbose console logging for debugging (does not affect activity log)
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
    slowOperationThreshold: 100, // Log operations taking longer than 100ms
    
    // RadioID Database settings
    radioIDDatabaseURL: 'https://radioid.net/static/user.csv',
    radioIDCacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    radioIDMemoryCacheLimit: 500, // Maximum entries to keep in memory cache
    enableRadioIDLookup: true, // Enable RadioID database features
    
    // Talkgroup Database settings
    talkgroupDatabaseURL: 'https://api.brandmeister.network/v2/talkgroup',
    talkgroupCacheExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    enableTalkgroupAPI: false // Show talkgroup management controls (API loads automatically regardless)
};

// Country code mapping for flag icons
window.CountryMapping = {
    // North America
    'united states': 'us',
    'usa': 'us',
    'us': 'us',
    'america': 'us',
    'canada': 'ca',
    'mexico': 'mx',
    
    // Europe
    'united kingdom': 'gb',
    'uk': 'gb',
    'great britain': 'gb',
    'britain': 'gb',
    'england': 'gb',
    'scotland': 'gb',
    'wales': 'gb',
    'northern ireland': 'gb',
    'germany': 'de',
    'deutschland': 'de',
    'france': 'fr',
    'spain': 'es',
    'españa': 'es',
    'italy': 'it',
    'italia': 'it',
    'netherlands': 'nl',
    'holland': 'nl',
    'belgium': 'be',
    'switzerland': 'ch',
    'austria': 'at',
    'sweden': 'se',
    'norway': 'no',
    'denmark': 'dk',
    'finland': 'fi',
    'poland': 'pl',
    'polska': 'pl',
    'czech': 'cz',
    'czechia': 'cz',
    'slovakia': 'sk',
    'hungary': 'hu',
    'romania': 'ro',
    'bulgaria': 'bg',
    'greece': 'gr',
    'portugal': 'pt',
    'ireland': 'ie',
    'croatia': 'hr',
    'slovenia': 'si',
    'serbia': 'rs',
    'bosnia': 'ba',
    'montenegro': 'me',
    'albania': 'al',
    'macedonia': 'mk',
    'north macedonia': 'mk',
    'kosovo': 'xk',
    'estonia': 'ee',
    'latvia': 'lv',
    'lithuania': 'lt',
    'belarus': 'by',
    'ukraine': 'ua',
    'moldova': 'md',
    'russia': 'ru',
    'russian federation': 'ru',
    'turkey': 'tr',
    'turkiye': 'tr',
    'türkiye': 'tr',
    'cyprus': 'cy',
    'malta': 'mt',
    'iceland': 'is',
    'luxembourg': 'lu',
    'monaco': 'mc',
    'liechtenstein': 'li',
    'andorra': 'ad',
    'san marino': 'sm',
    'vatican': 'va',
    
    // Asia
    'china': 'cn',
    'japan': 'jp',
    'south korea': 'kr',
    'korea': 'kr',
    'north korea': 'kp',
    'india': 'in',
    'pakistan': 'pk',
    'bangladesh': 'bd',
    'sri lanka': 'lk',
    'myanmar': 'mm',
    'burma': 'mm',
    'thailand': 'th',
    'vietnam': 'vn',
    'laos': 'la',
    'cambodia': 'kh',
    'malaysia': 'my',
    'singapore': 'sg',
    'indonesia': 'id',
    'philippines': 'ph',
    'taiwan': 'tw',
    'hong kong': 'hk',
    'macau': 'mo',
    'mongolia': 'mn',
    'nepal': 'np',
    'bhutan': 'bt',
    'afghanistan': 'af',
    'iran': 'ir',
    'iraq': 'iq',
    'syria': 'sy',
    'lebanon': 'lb',
    'jordan': 'jo',
    'israel': 'il',
    'palestine': 'ps',
    'saudi arabia': 'sa',
    'kuwait': 'kw',
    'bahrain': 'bh',
    'qatar': 'qa',
    'uae': 'ae',
    'united arab emirates': 'ae',
    'oman': 'om',
    'yemen': 'ye',
    'georgia': 'ge',
    'armenia': 'am',
    'azerbaijan': 'az',
    'kazakhstan': 'kz',
    'kyrgyzstan': 'kg',
    'tajikistan': 'tj',
    'turkmenistan': 'tm',
    'uzbekistan': 'uz',
    
    // Africa
    'south africa': 'za',
    'egypt': 'eg',
    'libya': 'ly',
    'tunisia': 'tn',
    'algeria': 'dz',
    'morocco': 'ma',
    'sudan': 'sd',
    'south sudan': 'ss',
    'ethiopia': 'et',
    'kenya': 'ke',
    'uganda': 'ug',
    'tanzania': 'tz',
    'rwanda': 'rw',
    'burundi': 'bi',
    'somalia': 'so',
    'djibouti': 'dj',
    'eritrea': 'er',
    'nigeria': 'ng',
    'ghana': 'gh',
    'ivory coast': 'ci',
    'côte d\'ivoire': 'ci',
    'senegal': 'sn',
    'mali': 'ml',
    'burkina faso': 'bf',
    'niger': 'ne',
    'chad': 'td',
    'cameroon': 'cm',
    'central african republic': 'cf',
    'equatorial guinea': 'gq',
    'gabon': 'ga',
    'congo': 'cg',
    'democratic republic of congo': 'cd',
    'drc': 'cd',
    'angola': 'ao',
    'zambia': 'zm',
    'zimbabwe': 'zw',
    'botswana': 'bw',
    'namibia': 'na',
    'lesotho': 'ls',
    'swaziland': 'sz',
    'eswatini': 'sz',
    'madagascar': 'mg',
    'mauritius': 'mu',
    'seychelles': 'sc',
    'comoros': 'km',
    
    // Americas
    'argentina': 'ar',
    'brazil': 'br',
    'chile': 'cl',
    'colombia': 'co',
    'venezuela': 've',
    'guyana': 'gy',
    'suriname': 'sr',
    'french guiana': 'gf',
    'peru': 'pe',
    'ecuador': 'ec',
    'bolivia': 'bo',
    'paraguay': 'py',
    'uruguay': 'uy',
    'cuba': 'cu',
    'jamaica': 'jm',
    'haiti': 'ht',
    'dominican republic': 'do',
    'puerto rico': 'pr',
    'trinidad and tobago': 'tt',
    'barbados': 'bb',
    'costa rica': 'cr',
    'panama': 'pa',
    'nicaragua': 'ni',
    'honduras': 'hn',
    'el salvador': 'sv',
    'guatemala': 'gt',
    'belize': 'bz',
    
    // Oceania
    'australia': 'au',
    'new zealand': 'nz',
    'fiji': 'fj',
    'papua new guinea': 'pg',
    'vanuatu': 'vu',
    'solomon islands': 'sb',
    'samoa': 'ws',
    'tonga': 'to',
    'kiribati': 'ki',
    'tuvalu': 'tv',
    'nauru': 'nr',
    'palau': 'pw',
    'marshall islands': 'mh',
    'micronesia': 'fm'
};

/**
 * Get country code from country name using normalized matching
 * @param {string} countryName - The country name to look up
 * @returns {string|null} - The country code or null if not found
 */
window.getCountryCode = function(countryName) {
    if (!countryName) return null;
    
    // Normalize input: trim, lowercase, remove common prefixes/suffixes
    const normalized = countryName.trim().toLowerCase()
        .replace(/^(republic of|kingdom of|state of|united|federal republic of|people's republic of|islamic republic of|democratic republic of|socialist republic of)\s+/i, '')
        .replace(/\s+(republic|kingdom|state|federation|emirate|principality)$/i, '')
        .replace(/\s+/g, ' ');
    
    // 1. Try exact match on normalized input
    let code = window.CountryMapping[normalized];
    if (code) return code;
    
    // 2. Try substring matching for compound names like "Argentina Republic"
    for (const [country, countryCode] of Object.entries(window.CountryMapping)) {
        if (normalized.includes(country) || country.includes(normalized)) {
            return countryCode;
        }
    }
    
    // 3. Try word-based fuzzy matching
    const words = normalized.split(' ');
    for (const [country, countryCode] of Object.entries(window.CountryMapping)) {
        const countryWords = country.split(' ');
        
        // Check if any significant word matches (ignore common words)
        const significantWords = words.filter(word => 
            word.length > 2 && !['the', 'and', 'of', 'for'].includes(word)
        );
        
        for (const word of significantWords) {
            if (countryWords.some(cw => cw.includes(word) || word.includes(cw))) {
                return countryCode;
            }
        }
    }
    
    return null;
};
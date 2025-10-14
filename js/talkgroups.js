// Brandmeister Talk Groups Database
// Complete list of available talk groups from Brandmeister API

const BRANDMEISTER_TALKGROUPS = {
    // Global & Core
    "1": "Local",
    "2": "Cluster",
    "8": "Regional",
    "9": "Local",
    "91": "World-wide",
    "92": "Europe",
    "93": "North America",
    "94": "Asia, Middle East",
    "95": "Australia, New Zealand",
    "98": "Radio Test",

    // European Countries (200-299)
    "202": "Διεθνές Ελλάδα",
    "204": "Nederland",
    "206": "Belgium",
    "208": "France",
    "213": "Andorra",
    "214": "Spain",
    "216": "Hungary",
    "218": "Bosnia and Herzegovina",
    "219": "Croatia",
    "220": "Serbia",
    "222": "Italia",
    "226": "Romania",
    "228": "Switzerland",
    "230": "Czech Republic",
    "231": "Slovak",
    "232": "Austria",
    "235": "UK Call - QSY to 2351 or 2352",
    "238": "Denmark",
    "240": "Sweden",
    "242": "Norway",
    "244": "Finland",
    "246": "Lithuania",
    "247": "Latvia",
    "248": "Estonia",
    "255": "Ukraine",
    "259": "Moldova",
    "260": "Poland",
    "262": "Deutschland",
    "263": "MultiMode DL",
    "264": "DL OPS",
    "265": "265",
    "268": "Portugal",
    "270": "Luxembourg",
    "272": "Ireland",
    "274": "Iceland",
    "276": "Albania",
    "278": "Malta",
    "280": "Cyprus",
    "282": "Georgia",
    "283": "Armenia",
    "284": "Bulgaria",
    "286": "Türkiye",
    "288": "Faroe Islands",
    "292": "San Marino",
    "293": "Slovenia",
    "294": "North Macedonia",
    "295": "Liechtenstein",
    "297": "Montenegro",

    // North America (300-399)
    "302": "Canada Wide",
    "310": "Tac 310 NOT A CALL CHANNEL",
    "311": "TAC 311 USA NO NETS!!!",
    "312": "TAC 312 USA NO NETS!!!",
    "313": "TAC 313 USA NO NETS!!!",
    "314": "TAC 314 USA NO NETS!!!",
    "315": "TAC 315 USA NO NETS!!!",
    "316": "TAC 316 USA NO NETS!!!",
    "317": "TAC 317 USA NO NETS!!!",
    "318": "TAC 318 USA NO NETS!!!",
    "319": "TAC 319 USA NO NETS!!!",
    "330": "Puerto Rico",
    "334": "XE",
    "338": "Jamaica",
    "352": "Grenada",
    "358": "Saint Lucia",
    "362": "Curaçao",
    "364": "Bahamas",
    "368": "Cuba",
    "370": "Dominican Republic",
    "372": "Haiti",
    "374": "Trinidad / Tobago",
    "376": "Turks and Caicos Islands",

    // Asia & Middle East (400-499)
    "400": "Azerbaijan",
    "401": "Kazahstan",
    "404": "India",
    "410": "Pakistan",
    "415": "Lebanon",
    "420": "Saudi Arabia",
    "422": "Oman",
    "425": "Israel",
    "426": "Bahrein",
    "427": "Qatar",
    "430": "United Arab Emirates",
    "440": "Japan",
    "450": "South Korea",
    "452": "Vietnam",
    "454": "Hong Kong",
    "460": "China",
    "470": "Bangladesh",

    // Asia-Pacific (500-599)
    "502": "Malaysia National",
    "505": "Australia",
    "510": "Indonesia",
    "515": "Philippines",
    "520": "Thailand",
    "525": "Singapore",
    "530": "ZL National",

    // Africa (600-699)
    "602": "Egypt",
    "604": "Morocco",
    "655": "South Africa",

    // Central & South America (700-799)
    "704": "Guatemala",
    "706": "El Salvador",
    "708": "Honduras",
    "710": "Nicaragua",
    "712": "Costa Rica",
    "714": "Panama",
    "716": "Perú",
    "722": "Argentina",
    "724": "Brazil Nacional",
    "730": "Chile",
    "732": "República de Colombia",
    "734": "Venezuela",
    "740": "Ecuador",
    "748": "Uruguay",

    // Utility & Special Purpose (800-999)
    "899": "Repeater Testing",
    "901": "WW Tac 1",
    "902": "WW Tac 2",
    "903": "WW Tac 3",
    "907": "JOTA",
    "910": "German",
    "913": "English",
    "914": "Spanish",
    "915": "Portuguese",
    "916": "Italian",
    "918": "YOTA",
    "920": "DL, OE, HB9",
    "922": "Dutch",
    "923": "European English",
    "924": "Swedish",
    "927": "Nordic",
    "930": "PanHellenic Chat",
    "937": "Francophonie",
    "940": "Arabic",
    "955": "WWYL",
    "969": "DMR-Caribbean",
    "971": "Basque",
    "973": "SOTA"
};

// Categorized talk groups for easier navigation
const TALKGROUP_CATEGORIES = {
    "Popular Global": {
        "91": "World-wide",
        "92": "Europe", 
        "93": "North America",
        "94": "Asia, Middle East",
        "95": "Australia, New Zealand",
        "913": "English",
        "923": "European English"
    },
    
    "Major Countries": {
        "204": "Nederland",
        "208": "France",
        "214": "Spain",
        "222": "Italia",
        "235": "UK Call",
        "238": "Denmark",
        "240": "Sweden",
        "242": "Norway",
        "244": "Finland",
        "262": "Deutschland",
        "268": "Portugal",
        "302": "Canada Wide",
        "440": "Japan",
        "450": "South Korea",
        "460": "China",
        "505": "Australia",
        "530": "ZL National",
        "724": "Brazil Nacional"
    },
    
    "Languages": {
        "910": "German",
        "913": "English", 
        "914": "Spanish",
        "915": "Portuguese",
        "916": "Italian",
        "922": "Dutch",
        "924": "Swedish",
        "937": "Francophonie",
        "940": "Arabic"
    },
    
    "Special Interest": {
        "907": "JOTA (Scouts)",
        "918": "YOTA (Youth)",
        "973": "SOTA (Summits)",
        "969": "DMR-Caribbean",
        "955": "WWYL",
        "98": "Radio Test",
        "899": "Repeater Testing"
    },
    
    "Tactical/Emergency": {
        "901": "WW Tac 1",
        "902": "WW Tac 2", 
        "903": "WW Tac 3",
        "310": "Tac 310",
        "311": "TAC 311 USA",
        "312": "TAC 312 USA",
        "313": "TAC 313 USA"
    }
};

// Popular/recommended talk groups for quick selection
const POPULAR_TALKGROUPS = [
    { id: "91", name: "World-wide", description: "Most active global TG" },
    { id: "92", name: "Europe", description: "European activity" },
    { id: "93", name: "North America", description: "USA/Canada activity" },
    { id: "913", name: "English", description: "English language chat" },
    { id: "923", name: "European English", description: "European English chat" },
    { id: "262", name: "Deutschland", description: "Germany national" },
    { id: "214", name: "Spain", description: "Spain national" },
    { id: "222", name: "Italia", description: "Italy national" },
    { id: "208", name: "France", description: "France national" },
    { id: "204", name: "Nederland", description: "Netherlands national" }
];

// Function to get talk group name by ID
function getTalkgroupName(id) {
    // First try to use the TalkgroupManager from the monitor instance
    if (window.brandmeisterMonitor && window.brandmeisterMonitor.talkgroupManager) {
        return window.brandmeisterMonitor.talkgroupManager.getTalkgroupName(id);
    }
    
    // Fallback to static database
    return BRANDMEISTER_TALKGROUPS[id] || `TG ${id}`;
}

// Function to search talk groups
function searchTalkgroups(query) {
    // First try using the TalkgroupManager from the monitor instance
    if (window.brandmeisterMonitor && window.brandmeisterMonitor.talkgroupManager) {
        return window.brandmeisterMonitor.talkgroupManager.searchTalkgroups(query);
    }
    
    // Fallback to static database search
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [id, name] of Object.entries(BRANDMEISTER_TALKGROUPS)) {
        if (id.includes(searchTerm) || name.toLowerCase().includes(searchTerm)) {
            results.push({ id, name, source: 'static' });
        }
    }
    
    return results.slice(0, 50); // Show more results to see API data
}

// Export for use in main application - Browser environment only
window.BRANDMEISTER_TALKGROUPS = BRANDMEISTER_TALKGROUPS;
window.getTalkgroupName = getTalkgroupName;
window.searchTalkgroups = searchTalkgroups;
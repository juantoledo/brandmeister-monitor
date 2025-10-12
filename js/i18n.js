/**
 * Internationalization (i18n) System for Brandmeister Monitor
 * Supports English and Spanish languages
 */

// Language definitions
const Languages = {
    en: {
        name: 'English',
        code: 'en',
        flag: '🇺🇸',
        translations: {
            // Header
            'app.title': 'Brandmeister Monitor',
            'app.subtitle': 'Real-time DMR Talkgroup Activity Monitor',
            'header.status.connected': 'Connected',
            'header.status.disconnected': 'Disconnected',
            'header.status.connecting': 'Connecting...',
            'header.install.tooltip': 'Install App',
            'header.theme.tooltip': 'Toggle Theme',
            'header.menu.tooltip': 'Toggle Menu',
            
            // Sidebar
            'sidebar.title': 'Quick Setup',
            'sidebar.tabs.browse': 'Browse TGs',
            'sidebar.tabs.manual': 'Manual Input',
            'sidebar.search.placeholder': 'Search talk groups...',
            'sidebar.recent.title': 'Recently Selected',
            'sidebar.category.label': 'Browse by Category:',
            'sidebar.category.choose': 'Choose a category...',
            'sidebar.category.popular': 'Popular Global',
            'sidebar.category.countries': 'Major Countries',
            'sidebar.category.languages': 'Languages',
            'sidebar.category.regional': 'Regional',
            'sidebar.category.digital': 'Digital Modes',
            'sidebar.category.regional': 'Regional',
            'sidebar.category.digital': 'Digital Modes',
            'sidebar.category.special': 'Special Events',
            'sidebar.manual.label': 'Talk Group IDs (comma separated):',
            'sidebar.manual.placeholder': 'e.g., 91, 214, 2148',
            'sidebar.manual.help': '💡 Enter comma-separated TG IDs or "all" to monitor everything',
            'sidebar.selected.title': 'Selected Talk Groups',
            'sidebar.selected.empty': 'No talk groups selected',
            'sidebar.save': 'Save & Monitor',
            'sidebar.monitoring': 'Monitoring',
            'sidebar.monitoring.none': 'None',
            'sidebar.controls.title': 'Controls',
            'sidebar.clear.logs': 'Clear Transmission Log',
            'sidebar.monitor.all': 'Monitor All Activity',
            'sidebar.monitor.selected': 'Monitor Selected TGs Only',
            'sidebar.connect': 'Connect',
            'sidebar.disconnect': 'Disconnect',
            'sidebar.clear': 'Clear',
            
            // Main content
            'main.welcome.title': 'Welcome to Brandmeister Monitor',
            'main.welcome.subtitle': 'Configure your monitoring preferences in the sidebar and click Connect to start.',
            'main.activity.title': 'Live Activity',
            'main.activity.empty': 'No activity to display. Make sure you\'re connected and monitoring the right talk groups.',
            'main.stats.calls': 'Total Calls',
            'main.stats.duration': 'Total Duration',
            'main.stats.countries': 'Countries',
            'main.stats.talkgroups': 'Talk Groups',
            
            // Activity items
            'activity.now': 'NOW',
            'activity.seconds': 's',
            'activity.minutes': 'm',
            'activity.hours': 'h',
            'activity.unknown': 'Unknown',
            'activity.country.unknown': 'Unknown Country',
            
            // Settings
            'settings.title': 'Settings',
            'settings.language': 'Language',
            'settings.color.label': 'Primary Color:',
            'settings.color.description': 'Choose from professional monitoring colors',
            'settings.color.blue': 'Professional Blue (Default)',
            'settings.color.green': 'Forest Green',
            'settings.color.purple': 'Purple',
            'settings.color.red': 'Red Alert',
            'settings.color.amber': 'Amber',
            'settings.color.cyan': 'Cyan',
            'settings.color.indigo': 'Indigo',
            'settings.color.gray': 'Neutral Gray',
            'settings.color.charcoal': 'Dark Charcoal',
            'settings.color.teal': 'Teal',
            'settings.duration.label': 'Min Duration (sec):',
            'settings.duration.description': 'Only log transmissions longer than this duration (excludes short kerchunks)',
            'settings.verbose.label': 'Console Verbose Mode',
            'settings.verbose.description': 'Show detailed technical information in browser console (F12)',
            'settings.monitor.all.label': 'Monitor All Talkgroups',
            'settings.monitor.all.description': 'Override specific TG and monitor all activity',
            'settings.radioid.label': 'Enable RadioID Database',
            'settings.radioid.description': 'Download and cache user information from radioid.net',
            'settings.radioid.status.notloaded': 'Not loaded',
            'settings.save': 'Save Settings',
            'settings.reset': 'Reset to Defaults',
            'settings.theme': 'Theme',
            'settings.theme.auto': 'Auto',
            'settings.theme.light': 'Light',
            'settings.theme.dark': 'Dark',
            'settings.notifications': 'Notifications',
            'settings.sound': 'Sound Alerts',
            
            // Main content
            'main.welcome.title': 'Welcome to Brandmeister Monitor',
            'main.welcome.subtitle': 'Configure your monitoring preferences in the sidebar and click Connect to start.',
            'main.welcome.noactivity': 'No active transmissions',
            'main.activity.title': 'Live Activity',
            'main.activity.empty': 'No activity to display. Make sure you\'re connected and monitoring the right talk groups.',
            'main.stats.calls': 'Total Calls',
            'main.stats.duration': 'Total Duration',
            'main.stats.countries': 'Countries',
            'main.stats.talkgroups': 'Talk Groups',
            
            // Console tabs and content
            'console.tab.activity': 'Activity Log',
            'console.tab.stats': 'Statistics',
            'console.tab.debug': 'Debug',
            'console.activity.empty': 'No transmissions yet. Configure a talkgroup and connect to start monitoring.',
            'console.debug.description': 'Debug information and system logs will appear here',
            
            // Statistics
            'stats.total.calls': 'Total Calls:',
            'stats.last.transmission': 'Last Transmission:',
            'stats.session.duration': 'Session Duration:',
            'stats.active.tgs': 'Active TGs:',
            'stats.never': 'Never',
            
            // Messages
            'message.connected': 'Connected to Brandmeister Network',
            'message.disconnected': 'Disconnected from Brandmeister Network',
            'message.error.connection': 'Connection error. Please try again.',
            'message.settings.reset': 'Settings have been reset to defaults',
            'message.install.success': 'App installed successfully!',
            
            // Activity log
            'activity.log.header.time': 'Time',
            'activity.log.header.call': 'Call',
            'activity.log.header.name': 'Name from Location',
            'activity.log.header.alias': 'Alias',
            'activity.log.header.duration': 'Duration',
            'activity.log.transmission.from': 'Logging transmission from',
            
            // RadioID Database
            'radioid.records.loaded': 'records loaded',
            'radioid.records.memory.only': 'records loaded (memory only)',
            'radioid.status.notloaded': 'Not loaded',
            'radioid.updated': 'Updated:',
            
            // Buttons
            'button.ok': 'OK',
            'button.cancel': 'Cancel',
            'button.save': 'Save',
            'button.reset': 'Reset',
            'button.close': 'Close'
        }
    },
    
    es: {
        name: 'Español',
        code: 'es',
        flag: '🇪🇸',
        translations: {
            // Header
            'app.title': 'Monitor Brandmeister',
            'app.subtitle': 'Monitor de Actividad DMR en Tiempo Real',
            'header.status.connected': 'Conectado',
            'header.status.disconnected': 'Desconectado',
            'header.status.connecting': 'Conectando...',
            'header.install.tooltip': 'Instalar App',
            'header.theme.tooltip': 'Cambiar Tema',
            'header.menu.tooltip': 'Alternar Menú',
            
            // Sidebar
            'sidebar.title': 'Configuración Rápida',
            'sidebar.tabs.browse': 'Explorar TGs',
            'sidebar.tabs.manual': 'Entrada Manual',
            'sidebar.search.placeholder': 'Buscar grupos de conversación...',
            'sidebar.recent.title': 'Seleccionados Recientemente',
            'sidebar.category.label': 'Explorar por Categoría:',
            'sidebar.category.choose': 'Elige una categoría...',
            'sidebar.category.popular': 'Populares Globales',
            'sidebar.category.countries': 'Países Principales',
            'sidebar.category.languages': 'Idiomas',
            'sidebar.category.regional': 'Regionales',
            'sidebar.category.digital': 'Modos Digitales',
            'sidebar.category.regional': 'Regionales',
            'sidebar.category.digital': 'Modos Digitales',
            'sidebar.category.special': 'Eventos Especiales',
            'sidebar.manual.label': 'IDs de Grupos de Conversación (separados por comas):',
            'sidebar.manual.placeholder': 'ej., 91, 214, 2148',
            'sidebar.manual.help': '💡 Ingresa IDs de TG separados por comas o "all" para monitorear todo',
            'sidebar.selected.title': 'Grupos de Conversación Seleccionados',
            'sidebar.selected.empty': 'No hay grupos de conversación seleccionados',
            'sidebar.save': 'Guardar y Monitorear',
            'sidebar.monitoring': 'Monitoreando',
            'sidebar.monitoring.none': 'Ninguno',
            'sidebar.controls.title': 'Controles',
            'sidebar.clear.logs': 'Limpiar Registro de Transmisiones',
            'sidebar.monitor.all': 'Monitorear Toda la Actividad',
            'sidebar.monitor.selected': 'Monitorear Solo TGs Seleccionados',
            'sidebar.connect': 'Conectar',
            'sidebar.disconnect': 'Desconectar',
            'sidebar.clear': 'Limpiar',
            
            // Main content
            'main.welcome.title': 'Bienvenido a Monitor Brandmeister',
            'main.welcome.subtitle': 'Configura tus preferencias de monitoreo en el menú lateral y haz clic en Conectar para comenzar.',
            'main.activity.title': 'Actividad en Vivo',
            'main.activity.empty': 'No hay actividad para mostrar. Asegúrate de estar conectado y monitoreando los grupos de conversación correctos.',
            'main.stats.calls': 'Llamadas Totales',
            'main.stats.duration': 'Duración Total',
            'main.stats.countries': 'Países',
            'main.stats.talkgroups': 'Grupos de Conversación',
            
            // Activity items
            'activity.now': 'AHORA',
            'activity.seconds': 's',
            'activity.minutes': 'm',
            'activity.hours': 'h',
            'activity.unknown': 'Desconocido',
            'activity.country.unknown': 'País Desconocido',
            
            // Settings
            'settings.title': 'Configuración',
            'settings.language': 'Idioma',
            'settings.color.label': 'Color Primario:',
            'settings.color.description': 'Elige entre colores profesionales de monitoreo',
            'settings.color.blue': 'Azul Profesional (Predeterminado)',
            'settings.color.green': 'Verde Bosque',
            'settings.color.purple': 'Púrpura',
            'settings.color.red': 'Alerta Roja',
            'settings.color.amber': 'Ámbar',
            'settings.color.cyan': 'Cian',
            'settings.color.indigo': 'Índigo',
            'settings.color.gray': 'Gris Neutro',
            'settings.color.charcoal': 'Carbón Oscuro',
            'settings.color.teal': 'Verde Azulado',
            'settings.duration.label': 'Duración Mín (seg):',
            'settings.duration.description': 'Solo registrar transmisiones más largas que esta duración (excluye kerchunks cortos)',
            'settings.verbose.label': 'Modo Detallado de Consola',
            'settings.verbose.description': 'Mostrar información técnica detallada en la consola del navegador (F12)',
            'settings.monitor.all.label': 'Monitorear Todos los Grupos de Conversación',
            'settings.monitor.all.description': 'Anular TG específico y monitorear toda la actividad',
            'settings.radioid.label': 'Habilitar Base de Datos RadioID',
            'settings.radioid.description': 'Descargar y almacenar información de usuario de radioid.net',
            'settings.radioid.status.notloaded': 'No cargado',
            'settings.save': 'Guardar Configuración',
            'settings.reset': 'Restablecer a Predeterminados',
            'settings.theme': 'Tema',
            'settings.theme.auto': 'Automático',
            'settings.theme.light': 'Claro',
            'settings.theme.dark': 'Oscuro',
            'settings.notifications': 'Notificaciones',
            'settings.sound': 'Alertas de Sonido',
            
            // Main content
            'main.welcome.title': 'Bienvenido a Monitor Brandmeister',
            'main.welcome.subtitle': 'Configura tus preferencias de monitoreo en el menú lateral y haz clic en Conectar para comenzar.',
            'main.welcome.noactivity': 'No hay transmisiones activas',
            'main.activity.title': 'Actividad en Vivo',
            'main.activity.empty': 'No hay actividad para mostrar. Asegúrate de estar conectado y monitoreando los grupos de conversación correctos.',
            'main.stats.calls': 'Llamadas Totales',
            'main.stats.duration': 'Duración Total',
            'main.stats.countries': 'Países',
            'main.stats.talkgroups': 'Grupos de Conversación',
            
            // Console tabs and content
            'console.tab.activity': 'Registro de Actividad',
            'console.tab.stats': 'Estadísticas',
            'console.tab.debug': 'Depuración',
            'console.activity.empty': 'Aún no hay transmisiones. Configura un grupo de conversación y conéctate para comenzar el monitoreo.',
            'console.debug.description': 'La información de depuración y registros del sistema aparecerán aquí',
            
            // Statistics
            'stats.total.calls': 'Llamadas Totales:',
            'stats.last.transmission': 'Última Transmisión:',
            'stats.session.duration': 'Duración de Sesión:',
            'stats.active.tgs': 'TGs Activos:',
            'stats.never': 'Nunca',
            
            // Messages
            'message.connected': 'Conectado a la Red Brandmeister',
            'message.disconnected': 'Desconectado de la Red Brandmeister',
            'message.error.connection': 'Error de conexión. Por favor, inténtalo de nuevo.',
            'message.settings.reset': 'La configuración se ha restablecido a los valores predeterminados',
            'message.install.success': '¡App instalada exitosamente!',
            
            // Activity log
            'activity.log.header.time': 'Hora',
            'activity.log.header.call': 'Indicativo',
            'activity.log.header.name': 'Nombre desde Ubicación',
            'activity.log.header.alias': 'Alias',
            'activity.log.header.duration': 'Duración',
            'activity.log.transmission.from': 'Registrando transmisión de',
            
            // RadioID Database
            'radioid.records.loaded': 'registros cargados',
            'radioid.records.memory.only': 'registros cargados (solo en memoria)',
            'radioid.status.notloaded': 'No cargado',
            'radioid.updated': 'Actualizado:',
            
            // Buttons
            'button.ok': 'OK',
            'button.cancel': 'Cancelar',
            'button.save': 'Guardar',
            'button.reset': 'Restablecer',
            'button.close': 'Cerrar'
        }
    }
};

// Current language state
let currentLanguage = 'en';

/**
 * I18n Manager Class
 */
class I18nManager {
    constructor() {
        this.currentLang = 'en';
        this.languages = Languages;
        this.loadSavedLanguage();
    }
    
    /**
     * Load saved language from localStorage or detect browser language
     */
    loadSavedLanguage() {
        // Try to load from localStorage first
        const savedLang = localStorage.getItem('brandmeister-language');
        if (savedLang && this.languages[savedLang]) {
            this.currentLang = savedLang;
        } else {
            // Detect browser language
            const browserLang = this.detectBrowserLanguage();
            this.currentLang = browserLang;
        }
        
        currentLanguage = this.currentLang;
        console.log(`🌍 Language set to: ${this.languages[this.currentLang].name}`);
    }
    
    /**
     * Detect browser language and return supported language code
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        // Return supported language or default to English
        return this.languages[langCode] ? langCode : 'en';
    }
    
    /**
     * Get translation for a key
     */
    t(key, params = {}) {
        const translation = this.languages[this.currentLang]?.translations[key] || 
                          this.languages['en']?.translations[key] || 
                          key;
        
        // Simple parameter replacement
        return Object.keys(params).reduce((str, param) => {
            return str.replace(`{{${param}}}`, params[param]);
        }, translation);
    }
    
    /**
     * Change language
     */
    setLanguage(langCode) {
        if (!this.languages[langCode]) {
            console.warn(`Language ${langCode} not supported`);
            return false;
        }
        
        this.currentLang = langCode;
        currentLanguage = langCode;
        
        // Save to localStorage
        localStorage.setItem('brandmeister-language', langCode);
        
        // Update document language
        document.documentElement.lang = langCode;
        
        // Trigger UI update
        this.updateUI();
        
        console.log(`🌍 Language changed to: ${this.languages[langCode].name}`);
        return true;
    }
    
    /**
     * Get current language info
     */
    getCurrentLanguage() {
        return this.languages[this.currentLang];
    }
    
    /**
     * Get all available languages
     */
    getAvailableLanguages() {
        return Object.values(this.languages);
    }
    
    /**
     * Update UI with current language
     */
    updateUI() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update all elements with data-i18n-title attribute (for tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // Trigger custom event for app to update dynamic content
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLang }
        }));
    }
}

// Initialize I18n system
const i18n = new I18nManager();

// Make it globally available
window.I18n = i18n;
window.t = (key, params) => i18n.t(key, params);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, Languages };
}
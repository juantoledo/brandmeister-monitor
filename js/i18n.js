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
            'header.status.connected': 'Connected',
            'header.status.disconnected': 'Disconnected',
            'header.status.connecting': 'Connecting...',
            'header.install.tooltip': 'Install App',
            'header.about.tooltip': 'About this application',
            'header.theme.tooltip': 'Switch between light and dark mode',
            'header.menu.tooltip': 'Open settings and configuration menu',
            
            // About Modal
            'about.title': 'About Brandmeister Monitor',
            'about.app.name': 'Brandmeister Monitor',
            'about.version': 'Version 2.0',
            'about.description': 'A real-time monitoring application for Brandmeister DMR network transmissions. Track calls, view operator information, and explore talkgroup activity worldwide.',
            'about.github': 'GitHub Repository',
            'about.brandmeister': 'Brandmeister Network',
            'about.credits': 'Developed with ❤️ by Juan Toledo',
            
            // Sidebar
            'sidebar.title': 'Quick Setup',
            'sidebar.tabs.browse': 'Browse TGs',
            'sidebar.tabs.manual': 'Manual Input',
            'sidebar.selected.tooltip': 'Click on any talkgroup to remove it from monitoring',
            'sidebar.search.placeholder': 'Search talk groups...',
            'sidebar.search.addAll': 'Add All',
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
            'sidebar.controls.title': 'Controls',
            'sidebar.clear.logs': 'Clear Transmission Log',
            'sidebar.monitor.all': 'Monitor All Activity',
            'sidebar.monitor.selected': 'Monitor Selected TGs Only',
            'sidebar.connect': 'Connect',
            'sidebar.disconnect': 'Disconnect',
            'sidebar.clear': 'Clear',
            'sidebar.reset.data': 'Reset Application Data',
            
            // Main content
            'main.welcome.title': 'Welcome to Brandmeister Monitor',
            'main.welcome.subtitle': 'Configure your monitoring preferences in the sidebar and click Connect to start.',
            'main.welcome.noactivity': 'No active transmissions',
            'main.active.tgs.all': 'Monitoring All Talkgroups',
            'main.active.tgs.none': 'No talkgroups selected',
            'main.active.tgs.monitoring': 'Monitoring',
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
            'settings.autoColorFromFlag.label': 'Auto Color from Flag',
            'settings.autoColorFromFlag.description': 'Automatically set primary color from country flag',
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
            'settings.talkgroup.label': 'Show Talkgroup Database Controls',
            'settings.talkgroup.description': 'Display controls for managing Brandmeister API talkgroup data (loads automatically)',
            'settings.talkgroup.status.notloaded': 'Not loaded',
            'settings.talkgroup.records.loaded': 'talkgroups loaded',
            'settings.talkgroup.updated': 'Updated:',
            'settings.talkgroup.download': 'Download Talkgroups',
            'settings.talkgroup.clear': 'Clear Cache',
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
            'console.tab.about': 'About',
            'console.toggle.tooltip': 'Minimize or expand the activity log panel',
            'console.activity.empty': 'No transmissions yet. Configure a talkgroup and connect to start monitoring.',
            'console.debug.description': 'Debug information and system logs will appear here',
            
            // Update notification
            'update.title': 'App Updated!',
            'update.message': 'New features and improvements available. Refresh to get the latest version.',
            'update.refresh': 'Refresh Now',
            'update.dismiss': 'Later',
            
            // About section
            'about.title': 'Brandmeister Monitor',
            'about.version': 'Version 0.13.10',
            'about.developer.title': '👨‍💻 Developer',
            'about.website': 'cd3dxz.radio',
            'about.powered.title': '🤖 Powered by AI',
            'about.powered.description': 'Built with the assistance of Claude Sonnet 4, an AI assistant by Anthropic',
            'about.source.title': '📦 Source Code',
            'about.github': 'View on GitHub',
            'about.features.title': '✨ Features',
            'about.features.realtime': 'Real-time DMR activity monitoring',
            'about.features.pwa': 'Progressive Web App (PWA) support',
            'about.features.multilingual': 'Multi-language interface (English/Spanish)',
            'about.features.responsive': 'Responsive design for all devices',
            'about.features.offline': 'Offline capability with service worker',
            'about.support.title': '💡 Support',
            'about.support.description': 'For issues, feature requests, or contributions, please visit the GitHub repository.',
            'about.tour.title': '🎯 Guided Tour',
            'about.tour.description': 'Take a guided tour to learn about the clickable elements in transmission cards.',
            'about.tour.restart': 'Restart Tour',
            
            // Onboarding
            'onboarding.welcome': '👋 Welcome to Brandmeister Monitor!',
            'onboarding.intro': "Let's get you started by selecting some talkgroups to monitor.",
            'onboarding.detected': 'Detected location:',
            'onboarding.suggestion': 'Based on your location, we recommend these popular talkgroups:',
            'onboarding.apply': 'Start Monitoring',
            'onboarding.skip': "Skip, I'll configure later",
            'onboarding.hint': '💡 You can always change these in the sidebar settings.',
            
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
            
            // Confirmations
            'confirm.reset.message': 'This will delete all application data including settings, talkgroups, and cache. Are you sure?',
            
            // Activity log
            'activity.log.header.time': 'Time',
            'activity.log.header.call': 'Call',
            'activity.log.header.name': 'Name from Location',
            'activity.log.header.alias': 'Alias',
            'activity.log.header.duration': 'Duration',
            'activity.log.transmission.from': 'Logging transmission from',
            
            // Distance
            'distance.away': 'away',
            'distance.km': 'km',
            'distance.mi': 'mi',
            'distance.from.location': 'Distance from your location',
            
            // Tooltips
            'tooltip.lookup.qrz': 'Look up {callsign} on QRZ.com',
            'tooltip.click.lookup.qrz': '🌐 Click to look up {callsign} on QRZ.com',
            'tooltip.open.qrz': '🌐 Open {callsign} profile on QRZ.com',
            'tooltip.view.radioid': 'View {radioId} on RadioID.net',
            'tooltip.view.radioid.details': '🔍 View RadioID {radioId} details on RadioID.net',
            'tooltip.search.location': '🔍 Click to search this location on Google Maps',
            'tooltip.talkgroup': 'Talkgroup {number}',
            'tooltip.transmission.live': 'Transmission in progress',
            
            // Status Messages
            'status.loading': 'Loading...',
            'status.weather.unavailable': 'Local weather unavailable',
            
            // Labels
            'label.radioid': 'RadioID',
            
            // Distance
            'distance.from.location': 'Distance from your location',
            
            // Guided Tour
            'tour.close': 'Close tour',
            'tour.previous': 'Previous',
            'tour.next': 'Next',
            'tour.finish': 'Finish',
            'tour.of': 'of',
            'tour.callsign.title': 'Callsign Link',
            'tour.callsign.description': 'Click on the callsign to look up the operator on QRZ.com and view their profile, license information, and contact details.',
            'tour.radioid.title': 'Radio ID',
            'tour.radioid.description': 'Click on the Radio ID to view details on RadioID.net, including the DMR ID registration and operator information.',
            'tour.qrz.title': 'QRZ Quick Link',
            'tour.qrz.description': 'Quick access button to look up the operator on QRZ.com. Opens the operator\'s profile in a new tab.',
            'tour.talkgroup.title': 'Talkgroup Badge',
            'tour.talkgroup.description': 'This badge shows the talkgroup number. You can click to view more details about this specific talkgroup.',
            'tour.location.title': 'Location Search',
            'tour.location.description': 'Click on the location to search it on Google Maps and see where the transmission is coming from.',
            'tour.distance.title': 'Distance Indicator',
            'tour.distance.description': 'Shows how far the transmission is from your configured base location. Helps you understand the range of the signal.',
            'tour.source.title': 'Operator Name',
            'tour.source.description': 'The name of the operator or station. Click to look up more information about this operator on QRZ.com.',
            'tour.wait.message': 'The guided tour will start with the next transmission received.',
            
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
            'header.status.connected': 'Conectado',
            'header.status.disconnected': 'Desconectado',
            'header.status.connecting': 'Conectando...',
            'header.install.tooltip': 'Instalar App',
            'header.about.tooltip': 'Acerca de esta aplicación',
            'header.theme.tooltip': 'Cambiar entre modo claro y oscuro',
            'header.menu.tooltip': 'Abrir menú de configuración y ajustes',
            
            // About Modal
            'about.title': 'Acerca de Monitor Brandmeister',
            'about.app.name': 'Monitor Brandmeister',
            'about.version': 'Versión 2.0',
            'about.description': 'Una aplicación de monitoreo en tiempo real para las transmisiones de la red DMR Brandmeister. Rastrea llamadas, visualiza información de operadores y explora la actividad de grupos de conversación en todo el mundo.',
            'about.github': 'Repositorio GitHub',
            'about.brandmeister': 'Red Brandmeister',
            'about.credits': 'Desarrollado con ❤️ por Juan Toledo',
            
            // Sidebar
            'sidebar.title': 'Configuración Rápida',
            'sidebar.tabs.browse': 'Explorar TGs',
            'sidebar.tabs.manual': 'Entrada Manual',
            'sidebar.selected.tooltip': 'Haz clic en cualquier grupo para eliminarlo del monitoreo',
            'sidebar.search.placeholder': 'Buscar grupos de conversación...',
            'sidebar.search.addAll': 'Añadir Todos',
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
            'sidebar.controls.title': 'Controles',
            'sidebar.clear.logs': 'Limpiar Registro de Transmisiones',
            'sidebar.monitor.all': 'Monitorear Toda la Actividad',
            'sidebar.monitor.selected': 'Monitorear Solo TGs Seleccionados',
            'sidebar.connect': 'Conectar',
            'sidebar.disconnect': 'Desconectar',
            'sidebar.clear': 'Limpiar',
            'sidebar.reset.data': 'Restablecer Datos de Aplicación',
            
            // Main content
            'main.welcome.title': 'Bienvenido a Monitor Brandmeister',
            'main.welcome.subtitle': 'Configura tus preferencias de monitoreo en el menú lateral y haz clic en Conectar para comenzar.',
            'main.welcome.noactivity': 'No hay transmisiones activas',
            'main.active.tgs.all': 'Monitoreando Todos los Grupos',
            'main.active.tgs.none': 'No hay grupos seleccionados',
            'main.active.tgs.monitoring': 'Monitoreando',
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
            'settings.autoColorFromFlag.label': 'Color Automático desde Bandera',
            'settings.autoColorFromFlag.description': 'Establecer automáticamente el color primario desde la bandera del país',
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
            'settings.talkgroup.label': 'Mostrar Controles de Base de Datos de Grupos',
            'settings.talkgroup.description': 'Mostrar controles para gestionar datos de grupos de la API Brandmeister (carga automática)',
            'settings.talkgroup.status.notloaded': 'No cargado',
            'settings.talkgroup.records.loaded': 'grupos de conversación cargados',
            'settings.talkgroup.updated': 'Actualizado:',
            'settings.talkgroup.download': 'Descargar Grupos de Conversación',
            'settings.talkgroup.clear': 'Limpiar Caché',
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
            'console.tab.about': 'Acerca de',
            'console.toggle.tooltip': 'Minimizar o expandir el panel de registro de actividad',
            'console.activity.empty': 'Aún no hay transmisiones. Configura un grupo de conversación y conéctate para comenzar el monitoreo.',
            'console.debug.description': 'La información de depuración y registros del sistema aparecerán aquí',
            
            // Update notification
            'update.title': '¡Aplicación Actualizada!',
            'update.message': 'Nuevas funciones y mejoras disponibles. Actualiza para obtener la última versión.',
            'update.refresh': 'Actualizar Ahora',
            'update.dismiss': 'Más Tarde',
            
            // About section
            'about.title': 'Monitor Brandmeister',
            'about.version': 'Versión 0.13.10',
            'about.developer.title': '👨‍💻 Desarrollador',
            'about.website': 'cd3dxz.radio',
            'about.powered.title': '🤖 Impulsado por IA',
            'about.powered.description': 'Construido con la asistencia de Claude Sonnet 4, un asistente de IA de Anthropic',
            'about.source.title': '📦 Código Fuente',
            'about.github': 'Ver en GitHub',
            'about.features.title': '✨ Características',
            'about.features.realtime': 'Monitoreo de actividad DMR en tiempo real',
            'about.features.pwa': 'Soporte para Aplicación Web Progresiva (PWA)',
            'about.features.multilingual': 'Interfaz multiidioma (Inglés/Español)',
            'about.features.responsive': 'Diseño responsivo para todos los dispositivos',
            'about.features.offline': 'Capacidad sin conexión con service worker',
            'about.support.title': '💡 Soporte',
            'about.support.description': 'Para problemas, solicitudes de características o contribuciones, visita el repositorio de GitHub.',
            'about.tour.title': '🎯 Tour Guiado',
            'about.tour.description': 'Realiza un tour guiado para conocer los elementos clicables en las tarjetas de transmisión.',
            'about.tour.restart': 'Reiniciar Tour',
            
            // Onboarding
            'onboarding.welcome': '👋 ¡Bienvenido a Brandmeister Monitor!',
            'onboarding.intro': 'Comencemos seleccionando algunos grupos de conversación para monitorear.',
            'onboarding.detected': 'Ubicación detectada:',
            'onboarding.suggestion': 'Basado en tu ubicación, recomendamos estos grupos populares:',
            'onboarding.apply': 'Comenzar Monitoreo',
            'onboarding.skip': 'Omitir, configuraré más tarde',
            'onboarding.hint': '💡 Siempre puedes cambiar esto en la configuración de la barra lateral.',
            
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
            
            // Confirmations
            'confirm.reset.message': 'Esto eliminará todos los datos de la aplicación, incluidas las configuraciones, grupos de conversación y caché. ¿Estás seguro?',
            
            // Activity log
            'activity.log.header.time': 'Hora',
            'activity.log.header.call': 'Indicativo',
            'activity.log.header.name': 'Nombre desde Ubicación',
            'activity.log.header.alias': 'Alias',
            'activity.log.header.duration': 'Duración',
            'activity.log.transmission.from': 'Registrando transmisión de',
            
            // Distance
            'distance.away': 'de distancia',
            'distance.km': 'km',
            'distance.mi': 'mi',
            'distance.from.location': 'Distancia desde tu ubicación',
            
            // Tooltips
            'tooltip.lookup.qrz': 'Buscar {callsign} en QRZ.com',
            'tooltip.click.lookup.qrz': '🌐 Clic para buscar {callsign} en QRZ.com',
            'tooltip.open.qrz': '🌐 Abrir perfil de {callsign} en QRZ.com',
            'tooltip.view.radioid': 'Ver {radioId} en RadioID.net',
            'tooltip.view.radioid.details': '🔍 Ver detalles de RadioID {radioId} en RadioID.net',
            'tooltip.search.location': '🔍 Clic para buscar esta ubicación en Google Maps',
            'tooltip.talkgroup': 'Grupo de conversación {number}',
            'tooltip.transmission.live': 'Transmisión en progreso',
            
            // Status Messages
            'status.loading': 'Cargando...',
            'status.weather.unavailable': 'Clima local no disponible',
            
            // Labels
            'label.radioid': 'RadioID',
            
            // Distance
            'distance.away': 'de distancia',
            'distance.km': 'km',
            'distance.mi': 'mi',
            'distance.from.location': 'Distancia desde tu ubicación',
            
            // Guided Tour
            'tour.close': 'Cerrar tour',
            'tour.previous': 'Anterior',
            'tour.next': 'Siguiente',
            'tour.finish': 'Finalizar',
            'tour.of': 'de',
            'tour.callsign.title': 'Enlace de Indicativo',
            'tour.callsign.description': 'Haz clic en el indicativo para buscar al operador en QRZ.com y ver su perfil, información de licencia y detalles de contacto.',
            'tour.radioid.title': 'ID de Radio',
            'tour.radioid.description': 'Haz clic en el ID de Radio para ver detalles en RadioID.net, incluyendo el registro del DMR ID e información del operador.',
            'tour.qrz.title': 'Enlace Rápido QRZ',
            'tour.qrz.description': 'Botón de acceso rápido para buscar al operador en QRZ.com. Abre el perfil del operador en una nueva pestaña.',
            'tour.talkgroup.title': 'Insignia de Grupo de Conversación',
            'tour.talkgroup.description': 'Esta insignia muestra el número del grupo de conversación. Puedes hacer clic para ver más detalles sobre este grupo específico.',
            'tour.location.title': 'Búsqueda de Ubicación',
            'tour.location.description': 'Haz clic en la ubicación para buscarla en Google Maps y ver de dónde proviene la transmisión.',
            'tour.distance.title': 'Indicador de Distancia',
            'tour.distance.description': 'Muestra la distancia de la transmisión desde tu ubicación base configurada. Te ayuda a entender el alcance de la señal.',
            'tour.source.title': 'Nombre del Operador',
            'tour.source.description': 'El nombre del operador o estación. Haz clic para buscar más información sobre este operador en QRZ.com.',
            'tour.wait.message': 'El tour guiado comenzará con la próxima transmisión recibida.',
            
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
    },
    
    pt: {
        name: 'Português',
        code: 'pt',
        flag: '🇧🇷',
        translations: {
            // Header
            'app.title': 'Monitor Brandmeister',
            'header.status.connected': 'Conectado',
            'header.status.disconnected': 'Desconectado',
            'header.status.connecting': 'Conectando...',
            'header.install.tooltip': 'Instalar App',
            'header.about.tooltip': 'Sobre esta aplicação',
            'header.theme.tooltip': 'Alternar entre modo claro e escuro',
            'header.menu.tooltip': 'Abrir menu de configurações e ajustes',
            
            // About Modal
            'about.title': 'Sobre o Monitor Brandmeister',
            'about.app.name': 'Monitor Brandmeister',
            'about.version': 'Versão 2.0',
            'about.description': 'Uma aplicação de monitoramento em tempo real para transmissões da rede DMR Brandmeister. Acompanhe chamadas, visualize informações de operadores e explore a atividade de grupos de conversa em todo o mundo.',
            'about.github': 'Repositório GitHub',
            'about.brandmeister': 'Rede Brandmeister',
            'about.credits': 'Desenvolvido com ❤️ por Juan Toledo',
            
            // Sidebar
            'sidebar.title': 'Configuração Rápida',
            'sidebar.tabs.browse': 'Explorar TGs',
            'sidebar.tabs.manual': 'Entrada Manual',
            'sidebar.selected.tooltip': 'Clique em qualquer grupo para removê-lo do monitoramento',
            'sidebar.search.placeholder': 'Pesquisar grupos de conversa...',
            'sidebar.search.addAll': 'Adicionar Todos',
            'sidebar.category.label': 'Navegar por Categoria:',
            'sidebar.category.choose': 'Escolha uma categoria...',
            'sidebar.category.popular': 'Global Popular',
            'sidebar.category.countries': 'Países Principais',
            'sidebar.category.languages': 'Idiomas',
            'sidebar.category.regional': 'Regional',
            'sidebar.category.digital': 'Modos Digitais',
            'sidebar.category.special': 'Eventos Especiais',
            'sidebar.manual.label': 'IDs de Grupo de Conversa (separados por vírgula):',
            'sidebar.manual.placeholder': 'ex: 91, 214, 2148',
            'sidebar.manual.help': '💡 Digite IDs de TG separados por vírgula ou "all" para monitorar tudo',
            'sidebar.selected.title': 'Grupos de Conversa Selecionados',
            'sidebar.selected.empty': 'Nenhum grupo de conversa selecionado',
            'sidebar.controls.title': 'Controles',
            'sidebar.clear.logs': 'Limpar Log de Transmissão',
            'sidebar.monitor.all': 'Monitorar Toda Atividade',
            'sidebar.monitor.selected': 'Monitorar Apenas TGs Selecionados',
            'sidebar.reset.data': 'Redefinir Dados do Aplicativo',
            'sidebar.connect': 'Conectar',
            'sidebar.disconnect': 'Desconectar',
            'sidebar.clear': 'Limpar',
            'sidebar.auto.scroll': 'Rolagem Automática',
            'sidebar.filter.callsigns': 'Filtrar por Indicativos',
            'sidebar.filter.placeholder': 'ex: EA1ABC, F1DEF',
            'sidebar.activity.recent': 'Atividade Recente (últimos 20)',
            'sidebar.database.title': 'Base de Dados RadioID',
            'sidebar.database.download': 'Baixar Base de Dados',
            'sidebar.database.clear': 'Limpar Cache',
            
            // Main content
            'main.welcome.title': 'Bem-vindo ao Monitor Brandmeister',
            'main.welcome.subtitle': 'Configure suas preferências de monitoramento na barra lateral e clique em Conectar para começar.',
            'main.welcome.noactivity': 'Nenhuma transmissão ativa',
            'main.active.tgs.all': 'Monitorando Todos os Grupos',
            'main.active.tgs.none': 'Nenhum grupo selecionado',
            'main.active.tgs.monitoring': 'Monitorando',
            'main.realtime.title': 'Atividade em Tempo Real',
            'main.empty.title': 'Nenhuma Transmissão Ainda',
            'main.empty.subtitle': 'Aguardando atividade de talkgroup...',
            'main.empty.help': 'Selecione grupos de conversa na barra lateral para começar o monitoramento',
            'main.install.banner.title': 'Instalar como App',
            'main.install.banner.subtitle': 'Obtenha a melhor experiência instalando o Brandmeister Monitor',
            'main.install.banner.benefits': '✓ Acesso offline ✓ Melhor desempenho ✓ Funciona como app nativo',
            'main.install.banner.install': 'Instalar App',
            'main.install.banner.dismiss': 'Dispensar',
            
            // Transmission details
            'transmission.source': 'Fonte',
            'transmission.destination': 'Destino',
            'transmission.duration': 'Duração',
            'transmission.timestamp': 'Horário',
            'transmission.callsign': 'Indicativo',
            'transmission.talkgroup': 'Grupo de Conversa',
            'transmission.timeslot': 'Slot de Tempo',
            'transmission.loss': 'Perda',
            'transmission.ber': 'BER',
            'transmission.rssi': 'RSSI',
            'transmission.location': 'Localização',
            
            // Console tabs
            'console.tab.activity': 'Log de Atividade',
            'console.tab.stats': 'Estatísticas',
            'console.tab.debug': 'Debug',
            'console.tab.about': 'Sobre',
            'console.toggle.tooltip': 'Minimizar ou expandir o painel de log de atividade',
            
            // Onboarding
            'onboarding.welcome': '👋 Bem-vindo ao Brandmeister Monitor!',
            'onboarding.intro': 'Vamos começar selecionando alguns grupos de conversa para monitorar.',
            'onboarding.detected': 'Localização detectada:',
            'onboarding.suggestion': 'Com base na sua localização, recomendamos estes grupos populares:',
            'onboarding.apply': 'Começar Monitoramento',
            'onboarding.skip': 'Pular, vou configurar mais tarde',
            'onboarding.hint': '💡 Você sempre pode alterar isso nas configurações da barra lateral.',
            
            // Activity log
            'activity.filter.all': 'Todas as Transmissões',
            'activity.filter.voice': 'Apenas Voz',
            'activity.filter.data': 'Apenas Dados',
            'activity.clear.confirm': 'Tem certeza de que deseja limpar o log de atividade?',
            'activity.empty': 'Nenhuma atividade registrada ainda',
            
            // Statistics
            'stats.title': 'Estatísticas de Transmissão',
            'stats.total.transmissions': 'Total de Transmissões',
            'stats.unique.callsigns': 'Indicativos Únicos',
            'stats.active.talkgroups': 'Grupos de Conversa Ativos',
            'stats.avg.duration': 'Duração Média',
            'stats.data.voice.ratio': 'Proporção Dados/Voz',
            'stats.peak.hour': 'Hora de Pico',
            'stats.session.duration': 'Duração da Sessão',
            'stats.reset.confirm': 'Tem certeza de que deseja redefinir as estatísticas?',
            
            // Debug console
            'debug.title': 'Console de Debug',
            'debug.websocket.status': 'Status WebSocket',
            'debug.last.message': 'Última Mensagem',
            'debug.message.count': 'Contagem de Mensagens',
            'debug.error.count': 'Contagem de Erros',
            'debug.connection.time': 'Tempo de Conexão',
            'debug.clear.confirm': 'Tem certeza de que deseja limpar o debug?',
            
            // Update notification
            'update.title': 'App Atualizado!',
            'update.message': 'Novos recursos e melhorias disponíveis. Atualize para obter a versão mais recente.',
            'update.refresh': 'Atualizar Agora',
            'update.dismiss': 'Mais Tarde',
            
            // About section
            'about.title': 'Monitor Brandmeister',
            'about.version': 'v0.13.10',
            'about.developer.title': '👨‍💻 Desenvolvedor',
            'about.developer.info': 'Desenvolvido por CD3DXZ com a assistência do Claude Sonnet 3.5',
            'about.developer.website': 'cd3dxz.radio',
            'about.source.title': '📂 Código Fonte',
            'about.source.github': 'Ver no GitHub',
            'about.features.title': '✨ Funcionalidades',
            'about.feature.realtime': 'Monitoramento em tempo real',
            'about.feature.pwa': 'Suporte para Progressive Web App',
            'about.feature.multilingual': 'Interface multilíngue',
            'about.feature.responsive': 'Design responsivo',
            'about.feature.offline': 'Funcionalidade offline',
            'about.support.title': '🆘 Suporte',
            'about.support.info': 'Para problemas ou sugestões, visite nosso repositório GitHub',
            'about.tour.title': '🎯 Tour Guiado',
            'about.tour.description': 'Faça um tour guiado para conhecer os elementos clicáveis nos cartões de transmissão.',
            'about.tour.restart': 'Reiniciar Tour',
            
            // PWA installation
            'pwa.install.title': 'Instalar App',
            'pwa.install.subtitle': 'Instale o Brandmeister Monitor para uma melhor experiência',
            'pwa.install.benefits.title': 'Benefícios da instalação:',
            'pwa.install.benefit.offline': 'Funciona offline',
            'pwa.install.benefit.performance': 'Melhor desempenho',
            'pwa.install.benefit.native': 'Experiência de app nativo',
            'pwa.install.benefit.updates': 'Atualizações automáticas',
            'pwa.install.instructions.title': 'Como instalar:',
            'pwa.install.chrome.step1': '1. Clique no ícone de instalação na barra de endereço',
            'pwa.install.chrome.step2': '2. Clique em "Instalar" na caixa de diálogo',
            'pwa.install.safari.step1': '1. Toque no botão Compartilhar',
            'pwa.install.safari.step2': '2. Role para baixo e toque em "Adicionar à Tela de Início"',
            'pwa.install.safari.step3': '3. Toque em "Adicionar" para confirmar',
            'pwa.install.firefox.step1': '1. Toque no menu (três pontos)',
            'pwa.install.firefox.step2': '2. Toque em "Instalar"',
            
            // Errors and notifications
            'error.connection.failed': 'Falha na conexão com o servidor',
            'error.connection.lost': 'Conexão perdida. Tentando reconectar...',
            'error.data.invalid': 'Dados inválidos recebidos',
            'error.database.load': 'Erro ao carregar base de dados',
            'notification.connected': 'Conectado ao servidor Brandmeister',
            'notification.disconnected': 'Desconectado do servidor',
            'notification.reconnecting': 'Reconectando...',
            'notification.data.saved': 'Configurações salvas',
            'notification.app.installed': 'App instalado com sucesso!',
            
            // Confirmations
            'confirm.reset.message': 'Isso excluirá todos os dados do aplicativo, incluindo configurações, grupos de conversa e cache. Tem certeza?',
            
            // Settings
            'settings.title': 'Configurações',
            'settings.language': 'Idioma',
            'settings.color.label': 'Cor Primária:',
            'settings.color.description': 'Escolha entre cores profissionais de monitoramento',
            'settings.autoColorFromFlag.label': 'Cor Automática da Bandeira',
            'settings.autoColorFromFlag.description': 'Definir automaticamente a cor primária a partir da bandeira do país',
            'settings.duration.label': 'Duração Mín (seg):',
            'settings.duration.description': 'Registrar apenas transmissões mais longas que esta duração (exclui kerchunks curtos)',
            'settings.verbose.label': 'Modo Verboso do Console',
            'settings.verbose.description': 'Mostrar informações técnicas detalhadas no console do navegador (F12)',
            'settings.monitor.all.label': 'Monitorar Todos os Grupos de Conversa',
            'settings.monitor.all.description': 'Substituir TG específico e monitorar toda atividade',
            'settings.radioid.label': 'Habilitar Base de Dados RadioID',
            'settings.radioid.description': 'Baixar e armazenar informações de usuário do radioid.net',
            'settings.radioid.status.notloaded': 'Não carregado',
            'settings.talkgroup.label': 'Mostrar Controles de Base de Dados de Grupos',
            'settings.talkgroup.description': 'Mostrar controles para gerenciar dados de grupos da API Brandmeister (carregamento automático)',
            'settings.talkgroup.status.notloaded': 'Não carregado',
            'settings.talkgroup.records.loaded': 'grupos de conversa carregados',
            'settings.talkgroup.updated': 'Atualizado:',
            'settings.talkgroup.download': 'Baixar Grupos de Conversa',
            'settings.talkgroup.clear': 'Limpar Cache',
            'settings.save': 'Salvar Configurações',
            'settings.reset': 'Redefinir para Padrões',
            'settings.theme': 'Tema',
            'settings.theme.auto': 'Automático',
            'settings.theme.light': 'Claro',
            'settings.theme.dark': 'Escuro',
            
            // Time and date
            'time.now': 'agora',
            'time.seconds.ago': 'segundos atrás',
            'time.minute.ago': 'minuto atrás',
            'time.minutes.ago': 'minutos atrás',
            'time.hour.ago': 'hora atrás',
            'time.hours.ago': 'horas atrás',
            'time.day.ago': 'dia atrás',
            'time.days.ago': 'dias atrás',
            
            // Distance
            'distance.away': 'de distância',
            'distance.km': 'km',
            'distance.mi': 'mi',
            'distance.from.location': 'Distância da sua localização',
            
            // Tooltips
            'tooltip.lookup.qrz': 'Pesquisar {callsign} no QRZ.com',
            'tooltip.click.lookup.qrz': '🌐 Clique para pesquisar {callsign} no QRZ.com',
            'tooltip.open.qrz': '🌐 Abrir perfil de {callsign} no QRZ.com',
            'tooltip.view.radioid': 'Ver {radioId} no RadioID.net',
            'tooltip.view.radioid.details': '🔍 Ver detalhes do RadioID {radioId} no RadioID.net',
            'tooltip.search.location': '🔍 Clique para pesquisar esta localização no Google Maps',
            'tooltip.talkgroup': 'Grupo de conversa {number}',
            'tooltip.transmission.live': 'Transmissão em andamento',
            
            // Status Messages
            'status.loading': 'Carregando...',
            'status.weather.unavailable': 'Clima local indisponível',
            
            // Labels
            'label.radioid': 'RadioID',
            
            // Guided Tour
            'tour.close': 'Fechar tour',
            'tour.previous': 'Anterior',
            'tour.next': 'Próximo',
            'tour.finish': 'Finalizar',
            'tour.of': 'de',
            'tour.callsign.title': 'Link do Indicativo',
            'tour.callsign.description': 'Clique no indicativo para pesquisar o operador no QRZ.com e ver seu perfil, informações de licença e detalhes de contato.',
            'tour.radioid.title': 'ID de Rádio',
            'tour.radioid.description': 'Clique no ID de Rádio para ver detalhes no RadioID.net, incluindo o registro do DMR ID e informações do operador.',
            'tour.qrz.title': 'Link Rápido QRZ',
            'tour.qrz.description': 'Botão de acesso rápido para procurar o operador no QRZ.com. Abre o perfil do operador em uma nova aba.',
            'tour.talkgroup.title': 'Distintivo de Grupo de Conversa',
            'tour.talkgroup.description': 'Este distintivo mostra o número do grupo de conversa. Você pode clicar para ver mais detalhes sobre este grupo específico.',
            'tour.location.title': 'Pesquisa de Localização',
            'tour.location.description': 'Clique na localização para pesquisá-la no Google Maps e ver de onde a transmissão está vindo.',
            'tour.distance.title': 'Indicador de Distância',
            'tour.distance.description': 'Mostra a distância da transmissão desde sua localização base configurada. Ajuda você a entender o alcance do sinal.',
            'tour.source.title': 'Nome do Operador',
            'tour.source.description': 'O nome do operador ou estação. Clique para pesquisar mais informações sobre este operador no QRZ.com.',
            'tour.wait.message': 'O tour guiado começará com a próxima transmissão recebida.',
            
            // Units
            'unit.seconds': 's',
            'unit.minutes': 'm',
            'unit.hours': 'h',
            'unit.days': 'd',
            'unit.percent': '%',
            'unit.db': 'dB',
            'unit.hz': 'Hz',
            'unit.khz': 'kHz',
            'unit.mhz': 'MHz',
            
            // Countries (partial list for major countries)
            'country.ad': 'Andorra',
            'country.ae': 'Emirados Árabes Unidos',
            'country.af': 'Afeganistão',
            'country.ag': 'Antígua e Barbuda',
            'country.ar': 'Argentina',
            'country.at': 'Áustria',
            'country.au': 'Austrália',
            'country.be': 'Bélgica',
            'country.bg': 'Bulgária',
            'country.br': 'Brasil',
            'country.ca': 'Canadá',
            'country.ch': 'Suíça',
            'country.cl': 'Chile',
            'country.cn': 'China',
            'country.co': 'Colômbia',
            'country.cr': 'Costa Rica',
            'country.cz': 'República Tcheca',
            'country.de': 'Alemanha',
            'country.dk': 'Dinamarca',
            'country.ea': 'Espanha',
            'country.ec': 'Equador',
            'country.ee': 'Estônia',
            'country.es': 'Espanha',
            'country.fi': 'Finlândia',
            'country.fr': 'França',
            'country.gb': 'Reino Unido',
            'country.gr': 'Grécia',
            'country.hr': 'Croácia',
            'country.hu': 'Hungria',
            'country.ie': 'Irlanda',
            'country.il': 'Israel',
            'country.in': 'Índia',
            'country.it': 'Itália',
            'country.jp': 'Japão',
            'country.kr': 'Coreia do Sul',
            'country.lt': 'Lituânia',
            'country.lu': 'Luxemburgo',
            'country.lv': 'Letônia',
            'country.mx': 'México',
            'country.nl': 'Países Baixos',
            'country.no': 'Noruega',
            'country.nz': 'Nova Zelândia',
            'country.pe': 'Peru',
            'country.pl': 'Polônia',
            'country.pt': 'Portugal',
            'country.ro': 'Romênia',
            'country.ru': 'Rússia',
            'country.se': 'Suécia',
            'country.si': 'Eslovênia',
            'country.sk': 'Eslováquia',
            'country.th': 'Tailândia',
            'country.tr': 'Turquia',
            'country.ua': 'Ucrânia',
            'country.us': 'Estados Unidos',
            'country.uy': 'Uruguai',
            'country.ve': 'Venezuela',
            'country.za': 'África do Sul',
            
            // Common buttons and actions
            'button.ok': 'OK',
            'button.cancel': 'Cancelar',
            'button.save': 'Salvar',
            'button.reset': 'Redefinir',
            'button.close': 'Fechar'
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
        
        // Update UI once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateUI();
            });
        } else {
            // DOM already loaded, update immediately
            setTimeout(() => this.updateUI(), 0);
        }
    }
    
    /**
     * Load saved language from localStorage or detect browser language
     */
    loadSavedLanguage() {
        // Try to load from localStorage first
        const savedLang = localStorage.getItem('brandmeister-language');
        if (savedLang && this.languages[savedLang]) {
            this.currentLang = savedLang;
            console.log(`🌍 Loaded saved language: ${this.languages[this.currentLang].name} (${savedLang})`);
        } else {
            // Detect browser language
            const browserLang = this.detectBrowserLanguage();
            this.currentLang = browserLang;
            console.log(`🌍 Detected browser language: ${this.languages[this.currentLang].name} (${browserLang})`);
        }
        
        // Safety check: ensure current language is valid, default to English if not
        if (!this.languages[this.currentLang]) {
            console.warn(`⚠️ Invalid language '${this.currentLang}', defaulting to English`);
            this.currentLang = 'en';
        }
        
        currentLanguage = this.currentLang;
        console.log(`🌍 Final language set to: ${this.languages[this.currentLang].name}`);
    }
    
    /**
     * Detect browser language and return supported language code
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        console.log(`🔍 Browser language detected: ${browserLang} → ${langCode}`);
        
        // Return supported language or default to English
        if (this.languages[langCode]) {
            console.log(`✅ Language ${langCode} is supported`);
            return langCode;
        } else {
            console.log(`⚠️ Language ${langCode} not supported, defaulting to English`);
            return 'en';
        }
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
        // Safety check: ensure current language is valid
        if (!this.languages[this.currentLang]) {
            console.warn(`⚠️ Invalid current language '${this.currentLang}', resetting to English`);
            this.currentLang = 'en';
        }
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
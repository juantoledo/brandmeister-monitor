// Service Worker for Brandmeister Monitor PWA
const CACHE_NAME = 'brandmeister-monitor-v0.9.0'; // Increment this when you make changes
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css', // Fixed path
    '/js/app.js', // Fixed path
    '/js/config.js',
    '/js/i18n.js',
    '/js/talkgroups.js',
    '/js/talkgroup-manager.js',
    '/js/location-weather.js',
    '/js/pwa-install.js',
    '/manifest.json',
    'https://cdn.socket.io/4.7.2/socket.io.min.js',
    'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/css/flag-icons.min.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('PWA: Installing service worker v0.9.0');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('PWA: Caching app resources');
                return cache.addAll(urlsToCache);
            })
    );
    // Force immediate activation of new service worker
    self.skipWaiting();
});

// Activate event - clean old caches and notify clients
self.addEventListener('activate', (event) => {
    console.log('PWA: Activating service worker v0.9.0');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all([
                // Delete old caches
                ...cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('PWA: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                }),
                // Notify all clients about the update
                self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'CACHE_UPDATED',
                            version: CACHE_NAME
                        });
                    });
                })
            ]);
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - network first for app files, cache for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // For your app files (HTML, CSS, JS), try network first
    if (url.pathname.endsWith('.html') || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.js') || 
        url.pathname === '/') {
        
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // If network succeeds, cache the new version
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, fallback to cache
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Ultimate fallback for HTML
                            if (event.request.destination === 'document') {
                                return caches.match('/index.html');
                            }
                        });
                })
        );
    } else {
        // For external resources, use cache first
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request).then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
                })
        );
    }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('PWA: Background sync triggered');
    }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            vibrate: [100, 50, 100]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});
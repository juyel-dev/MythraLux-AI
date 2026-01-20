// Service Worker for Offline AI Assistant
// Version: 3.0.0

const CACHE_NAME = 'offline-ai-v3';
const CORE_CACHE = 'offline-ai-core-v1';

// Core assets that should be cached immediately
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/app.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhiI2B.woff2',
    'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.38/+esm'
];

// File extensions to cache
const CACHEABLE_EXTENSIONS = [
    '.js', '.css', '.html', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'
];

// Model cache configuration
const MODEL_CACHE_CONFIG = {
    name: 'mlc-model-cache',
    version: 1
};

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            // Create core cache
            const coreCache = await caches.open(CORE_CACHE);
            await coreCache.addAll(CORE_ASSETS);
            
            // Skip waiting to activate immediately
            self.skipWaiting();
            
            console.log('[SW] Core assets cached');
        })()
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Clean up old caches
            const cacheKeys = await caches.keys();
            await Promise.all(
                cacheKeys.map((key) => {
                    if (key !== CACHE_NAME && key !== CORE_CACHE) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
            
            // Claim clients immediately
            await self.clients.claim();
            
            console.log('[SW] Activated and ready');
        })()
    );
});

// Fetch event - sophisticated caching strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;

    // Skip MLC model requests (handled by MLC)
    if (event.request.url.includes('/dist/models/')) {
        return;
    }

    event.respondWith(
        (async () => {
            const request = event.request;
            const url = new URL(request.url);
            
            try {
                // Network-first for API calls
                if (url.pathname.includes('/api/')) {
                    return await networkFirst(request);
                }
                
                // Cache-first for core assets
                if (isCoreAsset(url) || request.headers.get('accept')?.includes('text/html')) {
                    return await cacheFirst(request);
                }
                
                // Stale-while-revalidate for CDN assets
                if (isCDNAsset(url)) {
                    return await staleWhileRevalidate(request);
                }
                
                // Network-first for everything else
                return await networkFirst(request);
            } catch (error) {
                console.error('[SW] Fetch failed:', error);
                
                // Return offline page for HTML requests
                if (request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }
                
                throw error;
            }
        })()
    );
});

// Cache strategies
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Update cache in background
        event.waitUntil(
            (async () => {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.put(request, response.clone());
                    }
                } catch (error) {
                    // Silently fail - we have cached version
                }
            })()
        );
        return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.ok) {
        await cache.put(request, response.clone());
    }
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Always fetch in background
    event.waitUntil(
        (async () => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response.clone());
                }
            } catch (error) {
                // Silently fail
            }
        })()
    );
    
    return cachedResponse || fetch(request);
}

// Helper functions
function isCoreAsset(url) {
    return CORE_ASSETS.some(asset => url.href.includes(asset));
}

function isCDNAsset(url) {
    const cdnDomains = [
        'cdn.tailwindcss.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdn.jsdelivr.net'
    ];
    return cdnDomains.some(domain => url.hostname.includes(domain));
}

// Handle background sync (for future offline operations)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-models') {
        event.waitUntil(syncModels());
    }
});

async function syncModels() {
    // Future: Background sync for model updates
    console.log('[SW] Background sync triggered');
}

// Handle push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'Offline AI is ready',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Offline AI', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Periodic background updates
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-check') {
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    try {
        const cache = await caches.open(CORE_CACHE);
        const requests = CORE_ASSETS.map(url => new Request(url));
        const responses = await Promise.all(
            requests.map(request => fetch(request))
        );
        
        // Update cache with new versions
        await Promise.all(
            responses.map((response, index) => {
                if (response.ok) {
                    return cache.put(requests[index], response);
                }
            })
        );
        
        console.log('[SW] Periodic update check completed');
    } catch (error) {
        console.error('[SW] Update check failed:', error);
    }
}

// Precache models on install (optional)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_MODEL') {
        event.waitUntil(cacheModel(event.data.url));
    }
});

async function cacheModel(url) {
    try {
        const response = await fetch(url);
        const cache = await caches.open(MODEL_CACHE_CONFIG.name);
        await cache.put(url, response);
        console.log('[SW] Model cached:', url);
    } catch (error) {
        console.error('[SW] Failed to cache model:', error);
    }
  }

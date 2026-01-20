const CACHE_NAME = 'neurolocal-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Bypass SW for WebLLM model weights and WASM chunks to let WebLLM handle its own caching
    // (HuggingFace, MLC CDN, etc.)
    if (url.hostname.includes('huggingface') || 
        url.hostname.includes('mlc-ai') || 
        url.pathname.endsWith('.bin') || 
        url.pathname.endsWith('.wasm')) {
        return; 
    }

    // 2. Cache-First Strategy for App Shell
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).then((networkResponse) => {
                // Optionally cache new static assets visited
                return networkResponse;
            });
        })
    );
});

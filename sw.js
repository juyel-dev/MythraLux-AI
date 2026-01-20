const CACHE = "offline-ai-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./tailwind.css",
        "./webllm.bundle.js",
        "./manifest.json"
      ])
    )
  );
});

self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

const CACHE_NAME = 'sunuagri-shell-v7';
const CACHEABLE_ORIGINS = new Set([
    self.location.origin,
    'https://unpkg.com',
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
]);
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/icon.svg',
    './css/themes.css',
    './css/style.css',
    './css/responsive.css',
    './js/utils.js',
    './js/navigation.js',
    './js/vente.js',
    './js/marches.js',
    './js/sunumarche.js',
    './js/conseiller.js',
    './js/demo.js',
    './js/account.js',
    './js/app.js'
];
const THIRD_PARTY_ASSETS = [
    'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    'https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        await Promise.all(THIRD_PARTY_ASSETS.map(url => cache.add(url).catch(() => {})));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key.startsWith('sunuagri-shell-') && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || !CACHEABLE_ORIGINS.has(url.origin) || url.pathname.startsWith('/api/')) return;

    event.respondWith(
        fetch(request).then(response => {
            if (response.ok || response.type === 'opaque') {
                const copy = response.clone();
                event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
            }
            return response;
        }).catch(() => caches.match(request).then(cached => {
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('./index.html');
            return Response.error();
        }))
    );
});

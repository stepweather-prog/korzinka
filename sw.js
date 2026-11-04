const CACHE_NAME = 'korzinka-1.3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './images/icon.png',
    './images/lit_cozy.png',
    './images/list.png',
    './images/tick_a_box.png',
    './images/check_mark.png',
    './images/happy_smiley_magnit.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                if (e.request.method === 'GET' && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                }
                return response;
            })
            .catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503, statusText: 'Offline' })))
    );
});

self.addEventListener('message', async (e) => {
    if (!e.data) return;
    if (e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (e.data.type === 'CLEAR_CACHES') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        self.skipWaiting();
        if (e.source) e.source.postMessage({ type: 'CACHES_CLEARED' });
    }
});

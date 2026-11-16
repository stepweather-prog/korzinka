const CACHE_NAME = 'korzinka-1.5'; 
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
    const req = e.request;

    // Кэшируем только GET и только свой домен
    if (req.method !== 'GET') return;
    if (!req.url.startsWith(self.location.origin)) return;

    // sw.js не кэшируем — нужен свежий для проверки версии
    if (req.url.includes('/sw.js')) {
        e.respondWith(fetch(req).catch(() => caches.match(req)));
        return;
    }

    // Стратегия: кэш → сеть → кэш (обновление в фоне)
    e.respondWith(
        caches.match(req).then(cached => {
            const networkFetch = fetch(req)
                .then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                    }
                    return response;
                })
                .catch(() => cached || offlineFallback(req));

            return cached || networkFetch;
        })
    );
});

function offlineFallback(req) {
    if (req.mode === 'navigate') {
        return caches.match('./index.html').then(r => r || new Response(
            '<h1>Офлайн</h1><p>Нет сети, и index.html не в кэше.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ));
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
}

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

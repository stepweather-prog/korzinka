const CACHE_NAME = 'korzinka-v1.3'; // ← при каждом обновлении файлов поднимай версию
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

// Установка: кэшируем всё + сразу активируемся (не ждём закрытия вкладок)
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Активация: удаляем старые кэши, чтобы место не копилось
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: сеть в приоритете, кэш — как fallback
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).then(response => {
            // Кэшируем только успешные GET-запросы
            if (e.request.method === 'GET' && response.status === 200) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
            }
            return response;
        }).catch(() => caches.match(e.request))
    );
});

// Сообщения из основного окна
self.addEventListener('message', async (e) => {
    if (!e.data) return;

    if (e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (e.data.type === 'CLEAR_CACHES') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        self.skipWaiting();
        if (e.source) {
            e.source.postMessage({ type: 'CACHES_CLEARED' });
        }
    }
});

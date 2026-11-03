const CACHE_NAME = 'korzinka-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './images/icon.png',
  './images/lit_cozy.png',
  './images/list.png',
  './images/tick_a_box.png',
  './images/check_mark.png',
  './images/happy_smiley_magnit.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});

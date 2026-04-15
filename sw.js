const CACHE_NAME = 'scanner-mvp-v1';
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    'https://unpkg.com/html5-qrcode'
];

// Instalação: Baixa e guarda os arquivos necessários
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Intercepta as requisições: Retorna do cache se estiver offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna o cache se encontrar, senão vai para a rede
                return response || fetch(event.request);
            })
    );
});
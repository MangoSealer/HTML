const CACHE_NAME = 'to-do-v1';
const urlsToCache = [
  'paginas/to-do.html',
  'index.html',
  'style/main.css',
  'Scripts/app.js',
  'img/icon-512x512.png'
];




self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Armazena todos os arquivos definidos na lista
        return cache.addAll(urlsToCache);
      })
  );
});


self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request) // Tenta encontrar no cache
      .then(response => {
        // Se encontrar no cache, retorna o recurso salvo
        if (response) {
          return response;
        }

        // Caso contrário, vai para a rede para buscar o recurso
        return fetch(event.request);
      })
  );
});



self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Se o arquivo estiver no cache, retorna ele (velocidade)
      if (response) {
        return response;
      }

      // 2. Se NÃO estiver no cache (ex: mercado.html), busca na rede (internet/servidor)
      return fetch(event.request);
    })
  );
})

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



self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Exclui caches não atuais
            return caches.delete(cacheName); 
          }
        })
      );
    })
  );
});
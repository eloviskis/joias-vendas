// Minimal Service Worker - apenas cache de index.html para offline
const CACHE_NAME = 'joias-v5';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/index.html']).catch(() => {
        // Ignorar erros de cache
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Apenas GET
  if (req.method !== 'GET') return;
  
  // API: sempre rede, não cachear
  if (new URL(req.url).pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }
  
  // SPA: trata navegação
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Sucesso: retorna resposta da rede
          if (res.ok) return res;
          // Falha HTTP: tenta cache
          return caches.match('/index.html') || res;
        })
        .catch(() => {
          // Erro de rede: fallback para index cached
          return caches.match('/index.html').catch(() => {
            return new Response('Offline - sem cache disponível', { status: 503 });
          });
        })
    );
    return;
  }
  
  // Assets estáticos: network-first, sem fallback (deixa rede responder ou falhar)
  event.respondWith(fetch(req));
});

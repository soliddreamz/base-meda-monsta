const CACHE_VERSION = 'base-dj-alamo-v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './content.json',
  './manifest.json',
  './dj-alamo.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) =>
        (k.startsWith('static-') && k !== STATIC_CACHE)
          ? caches.delete(k)
          : Promise.resolve()
      )
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/content.json')) {
    event.respondWith(networkFirst(req));
    return;
  }

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    return cached || caches.match('./index.html');
  }
}

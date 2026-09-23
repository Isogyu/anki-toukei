/* anki-toukei オフライン用 Service Worker
 * - GET + 同一オリジンのみ対象
 * - cache-first（ヒットしなければネットワーク→キャッシュに保存）
 * - ナビゲーション要求はキャッシュ済み index.html にフォールバック */
const CACHE = 'anki-toukei-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(async (hit) => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const fallback = await caches.match(
            new URL('./index.html', self.registration.scope).href,
          );
          if (fallback) return fallback;
        }
        throw err;
      }
    }),
  );
});

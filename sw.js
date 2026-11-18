/* Plebes TCG service worker: works offline after the first visit.
   Code and pages: network first (so updates show up), cache as fallback.
   Art and fonts: cache first. */
const CACHE = 'plebes-v5';
const CORE = ['./', 'index.html', 'css/style.css', 'js/sfx.js', 'js/engine.js', 'js/ai.js', 'js/data.js', 'js/net.js', 'js/ui.js',
  'assets/base.png', 'assets/origin.png', 'assets/classic.png', 'assets/u004.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isArt = url.origin === location.origin && /\/assets\//.test(url.pathname);
  if (isArt) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })));
    return;
  }
  if (url.origin === location.origin || url.hostname === 'unpkg.com') {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  }
});

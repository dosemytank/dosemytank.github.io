// Wersja pamięci podręcznej – zmieniaj przy każdym wydaniu, stare cache są kasowane przy aktywacji.
// Od 7.12 prefiks dosemytank-; przy aktywacji kasujemy też stare cache z prefiksem akwarysta-.
// Dane użytkownika są w localStorage (akwa.v4, dmt.lang) – service worker ich nie dotyka, aktualizacja ich nie usuwa.
// 8.5: także niemiecki (de/, i18n-de.js, manifest-de.json).
// 8.0: oba języki offline (i18n.js, i18n-en.js – zmiana języka nie wymaga sieci), strony EN i PL, manifesty EN i PL.
const CACHE = 'dosemytank-v8.5.1';
const FILES = ['./', './index.html', './about.html', './feedback.html', './pl/', './pl/index.html', './pl/o-aplikacji.html', './pl/kontakt.html', './de/', './de/index.html', './de/ueber.html', './de/kontakt.html',
  './site.css', './site.js', './manifest-pl.json', './manifest-de.json', './i18n.js', './i18n-en.js', './i18n-de.js',
  './app.html', './tokens.css', './styles.css', './products.js', './calc.js', './chem.js', './nawozy-dane.js', './logic.js', './diag.js', './store.js', './core.js', './app.js', './tools.js', './clone.js', './pro-wspolne.js', './receptury.js', './woda.js', './nawozy-licz.js', './kalk-wspolne.js', './kalk-makro.js', './kalk-mikro.js', './kalk-gotowe.js', './kalk-receptury.js', './kalk-historia.js', './kalk-nawoz.js', './zakupy.js', './nawozenie.js', './pomoc.js', './odpowiednik.js', './pomoc-ekranow.js', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => (x.startsWith('dosemytank') || x.startsWith('akwarysta')) && x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
// sieć najpierw (świeże pliki), bez sieci – z pamięci podręcznej.
// 8.5.1: przy słabym zasięgu po 3 s odpowiada kopia z pamięci (jeśli jest), a świeży plik i tak trafia do pamięci na następny raz.
const fallback = req => caches.match(req, { ignoreSearch: true }).then(h => h || (req.mode === 'navigate' ? caches.match((p => p.includes('/pl/') ? './pl/' : p.includes('/de/') ? './de/' : './app.html')(new URL(req.url).pathname)) : undefined));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const req = e.request;
  const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(new Promise(resolve => {
    let done = false; const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => caches.match(req, { ignoreSearch: true }).then(finish), 3000);
    net.then(r => { clearTimeout(t); finish(r); })
      .catch(() => { clearTimeout(t); fallback(req).then(h => { if (!done) { done = true; resolve(h || Response.error()); } }); });
  }));
});

"""Strony informacyjne (EN i PL): linki, SEO i wygląd.
- każdy link wewnętrzny i każdy obraz prowadzi do istniejącego pliku, kotwice (#…) istnieją na stronie docelowej,
- jeden <h1>, tytuł, opis, canonical, hreflang EN/PL/x-default wzajemnie zgodne, Open Graph z istniejącym obrazem,
- sitemap.xml zawiera wszystkie strony, robots.txt wskazuje sitemap,
- brak przewijania w poziomie (360 px i 1280 px), brak błędów JS, treść indeksowalna bez JavaScriptu.
Uruchom: python3 tests/e2e_strona.py [katalog_na_zrzuty]"""
import os, sys, re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'shots', 'e2e', 'e2e_strona'); os.makedirs(SHOTS, exist_ok=True)
SITE = 'https://dosemytank.github.io/'
PAGES = ['index.html', 'about.html', 'feedback.html', 'pl/index.html', 'pl/o-aplikacji.html', 'pl/kontakt.html']
PAIRS = {'index.html': 'pl/index.html', 'about.html': 'pl/o-aplikacji.html', 'feedback.html': 'pl/kontakt.html'}
url_of = lambda p: SITE + (p[:-10] if p.endswith('index.html') else p)

class Scan(HTMLParser):
    def __init__(self):
        super().__init__(); self.links, self.ids, self.meta, self.h1, self.alt, self.text = [], set(), {}, 0, [], []
        self._skip = 0
    def handle_starttag(self, tag, a):
        a = dict(a)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag in ('img', 'source'):
            for k in ('src', 'srcset'):
                if a.get(k): self.links.append(a[k].split()[0])
            if tag == 'img' and not a.get('alt'): self.alt.append(a.get('src'))
        if tag == 'link' and a.get('rel') in ('stylesheet', 'icon', 'manifest', 'apple-touch-icon'): self.links.append(a['href'])
        if tag == 'script' and a.get('src'): self.links.append(a['src'])
        if tag == 'link' and a.get('rel') == 'canonical': self.meta['canonical'] = a['href']
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'): self.meta.setdefault('hreflang', {})[a['hreflang']] = a['href']
        if tag == 'meta' and (a.get('property') or a.get('name')): self.meta[a.get('property') or a.get('name')] = a.get('content')
        if tag == 'h1': self.h1 += 1
        if tag in ('script', 'style'): self._skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self._skip -= 1
    def handle_data(self, d):
        if not self._skip: self.text.append(d)

fail = []; parsed = {}
for p in PAGES:
    s = Scan(); s.feed(open(os.path.join(ROOT, p), encoding='utf8').read()); parsed[p] = s
for p, s in parsed.items():
    if s.h1 != 1: fail.append(f'{p}: {s.h1} × <h1>')
    for k in ('description', 'og:title', 'og:description', 'og:image', 'twitter:card'):
        if not s.meta.get(k): fail.append(f'{p}: brak {k}')
    if s.meta.get('canonical') != url_of(p): fail.append(f'{p}: canonical {s.meta.get("canonical")} ≠ {url_of(p)}')
    img = s.meta.get('og:image', '')
    if not img.startswith(SITE) or not os.path.exists(os.path.join(ROOT, img[len(SITE):])): fail.append(f'{p}: og:image {img} nie istnieje')
    if s.alt: fail.append(f'{p}: obrazy bez alt: {s.alt}')
    words = len(' '.join(s.text).split())
    if p.endswith('index.html') and words < 600: fail.append(f'{p}: za mało treści bez JavaScriptu ({words} słów)')
    for href in s.links:
        u = urlparse(href)
        if u.scheme in ('http', 'https', 'mailto'): continue
        path, frag = u.path, u.fragment
        target = os.path.normpath(os.path.join(ROOT, os.path.dirname(p), path)) if path else os.path.join(ROOT, p)
        if path.endswith('/') or os.path.isdir(target): target = os.path.join(target, 'index.html')
        if not os.path.exists(target): fail.append(f'{p}: link {href} → brak pliku'); continue
        if frag and target.endswith('.html'):
            rel = os.path.relpath(target, ROOT)
            ids = parsed[rel].ids if rel in parsed else set(re.findall(r'id="([^"]+)"', open(target, encoding='utf8').read()))
            if frag not in ids and not frag.startswith('/'): fail.append(f'{p}: kotwica {href} nie istnieje')
for en, pl in PAIRS.items():
    for p in (en, pl):
        hl = parsed[p].meta.get('hreflang', {})
        if hl.get('en') != url_of(en) or hl.get('pl') != url_of(pl) or hl.get('x-default') != url_of(en): fail.append(f'{p}: hreflang {hl}')
sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf8').read()
for p in PAGES:
    if f'<loc>{url_of(p)}</loc>' not in sm: fail.append(f'sitemap: brak {url_of(p)}')
if 'Sitemap: https://dosemytank.github.io/sitemap.xml' not in open(os.path.join(ROOT, 'robots.txt')).read(): fail.append('robots.txt bez sitemap')

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in (360, 1280):
        ctx = b.new_context(viewport={'width': w, 'height': 900}, service_workers='block'); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        for p in PAGES:
            pg.goto('file://' + os.path.join(ROOT, p)); pg.wait_for_timeout(150)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            if sw > w: fail.append(f'{p} @{w}px: przewijanie w poziomie ({sw})')
            if w == 360: pg.screenshot(path=os.path.join(SHOTS, p.replace('/', '_') + '.png'), full_page=True)
        if errs: fail.append(f'błędy JS @{w}: {errs}')
        ctx.close()
    # podpowiedź drugiej wersji językowej: przeglądarka PL na stronie EN
    ctx = b.new_context(locale='pl-PL', service_workers='block'); pg = ctx.new_page()
    pg.add_init_script("Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl'] })")
    pg.goto('file://' + os.path.join(ROOT, 'index.html')); pg.wait_for_timeout(150)
    if not pg.is_visible('#altlang'): fail.append('brak podpowiedzi wersji PL dla przeglądarki PL')
    pg.click('#altlang a'); pg.wait_for_timeout(150)
    if pg.evaluate("localStorage.getItem('dmt.lang')") != 'pl': fail.append('wybór PL z podpowiedzi nie zapamiętany')
    ctx.close(); b.close()
if fail: print('BŁĘDY:\n' + '\n'.join(fail)); sys.exit(1)
print(f'OK – {len(PAGES)} stron: linki, SEO, hreflang, sitemap, wygląd 360/1280 px')

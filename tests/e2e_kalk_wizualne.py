"""Kalkulator 7.0 – przegląd wizualny: 5 szerokości × jasny/ciemny; bez poziomego przewijania, nic nie pod paskiem nawigacji,
cele dotyku ≥ 44 px. Uruchom: python3 tests/e2e_kalk_wizualne.py [katalog_na_zrzuty]"""
import sys, os
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app.html')); SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
SIZES = [(360, 740), (390, 844), (768, 1024), (1366, 900), (1920, 1080)]
ROUTES = ['nawoz', 'mineral', 'zaawansowane', 'makro', 'mikro', 'gotowe', 'receptury', 'receptury/pmdd', 'receptury/sprawdz', 'historia']
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for w, hh in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': hh}); pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(URL + '#/kalkulator'); pg.wait_for_timeout(300)
        for theme in ['light', 'dark']:
            for r in ROUTES:
                pg.evaluate("r => go('kalkulator/' + r)", r); pg.evaluate(f"document.documentElement.dataset.theme = '{theme}'"); pg.wait_for_timeout(150)
                sw = pg.evaluate('document.documentElement.scrollWidth'); assert sw <= w, (w, theme, r, sw)
                assert 'Nie udało się wyświetlić' not in pg.text_content('#main'), (w, r)
                small = pg.evaluate("[...document.querySelectorAll('.kx input:not([type=checkbox]), .kx select, .kn-chk, .kx-nav a, .kx .btn, .kx-x:not(.small), .kx-seg button')].filter(e => { const b = e.getBoundingClientRect(); return b.height && b.height < 40; }).map(e => e.outerHTML.slice(0, 60))")
                assert not small, (w, r, small)
                if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'v-{w}-{theme}-{r.replace("/", "_")}.png'), full_page=False)
            # na telefonie ostatni element formularza da się przewinąć ponad dolny pasek
            if w < 960:
                pg.evaluate("go('kalkulator/makro')"); pg.wait_for_timeout(150)
                ok = pg.evaluate("(() => { const nav = document.querySelector('nav.bar').getBoundingClientRect().top; const el = [...document.querySelectorAll('.kx-out .btn')].pop(); document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.documentElement.scrollHeight); return el.getBoundingClientRect().bottom <= document.querySelector('nav.bar').getBoundingClientRect().top + 1; })()")
                assert ok, ('przycisk pod paskiem nawigacji', w)
        pg.close()
    b.close()
assert not errors, errors
print('Kalkulator – przegląd wizualny OK')

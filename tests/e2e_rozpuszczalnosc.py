"""E2E 6.10: sól, która się nie rozpuści, dostaje poprawkę jednym dotknięciem; zakładka Zakupy. Uruchom: python3 tests/e2e_rozpuszczalnosc.py [katalog_na_zrzuty]"""
import sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8766), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None); ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='pl-PL'); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.goto('http://127.0.0.1:8766/app.html'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(500)
    shot = lambda n: SHOTS and pg.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
    T = lambda: pg.inner_text('#main')
    # dokładnie przypadek ze zrzutu: 100 l, butelka 500 ml, dawka 10 ml × 3, NO3 20 / PO4 3 / K 30 z K2SO4 / Mg 10
    pg.evaluate("""() => { const t = tank(); t.V = 100; state.inputs.kalk = { _t: t.id, V: '100', mode: 'make', bottle: '500', dose: '10', n: '3',
      rows: [{k:'NO3',t:'20',src:'KNO3|0'},{k:'PO4',t:'3',src:'KH2PO4|0'},{k:'K',t:'30',src:'K2SO4|0'},{k:'Mg',t:'10',src:'MgSO4|7'}], mrows: [{k:'Fe',t:'0,1',src:'FeDTPA|0'}], items: undefined }; save(); render(); }""")
    pg.wait_for_timeout(300); t = T(); shot('r1-nie-uda-sie')
    assert 'tak się nie uda' in t and 'Ustaw dawkę 14 ml' in t, t[:900]
    assert 'Odważ do butelki' not in t, 'przy soli, która się nie rozpuści, nie pokazujemy gramów'
    assert 'Większa butelka nie pomoże' in t and pg.locator('text=Nie rozpuści się').count() == 0, 'bez dublowania ostrzeżenia'
    pg.click('button:has-text("Ustaw dawkę 14 ml")'); pg.wait_for_timeout(250); t = T()
    assert 'Odważ do butelki 500 ml' in t and 'tak się nie uda' not in t and pg.input_value('input[aria-label="Dawka"]') == '14', t[:900]
    shot('r2-po-poprawce')
    # alternatywa: więcej dawek w tygodniu
    pg.fill('input[aria-label="Dawka"]', '10'); pg.wait_for_timeout(200); assert 'Dawkuj 5× w tygodniu' in T()
    pg.click('button:has-text("Dawkuj 5× w tygodniu")'); pg.wait_for_timeout(200); assert 'Odważ do butelki' in T() and pg.input_value('input[aria-label="Dawek w tygodniu"]') == '5'
    # alternatywa: potas z KCl
    pg.fill('input[aria-label="Dawek w tygodniu"]', '3'); pg.wait_for_timeout(200); pg.click('button:has-text("Potas z KCl zamiast")'); pg.wait_for_timeout(250)
    t = T(); assert 'Odważ do butelki' in t and 'KCl' in t and pg.evaluate("state.inputs.kalk.rows.find(r => r.k === 'K').src") == 'KCl|0', t[:700]
    # przepis EI od razu ustawia działającą dawkę
    pg.evaluate("state.inputs.kalk.rows = [{k:'NO3',t:'10',src:'KNO3|0'}]; state.inputs.kalk.dose = '10'; state.inputs.kalk.n = '3'; save(); render()"); pg.wait_for_timeout(200)
    pg.click('.presetbar >> text=EI'); pg.wait_for_timeout(300); t = T(); assert 'tak się nie uda' not in t and 'Odważ do butelki' in t, t[:700]
    dose = pg.input_value('input[aria-label="Dawka"]'); assert dose not in ('10', ''), 'EI podnosi dawkę: ' + dose
    # Co kupić – karta pod wynikiem
    assert 'Co kupić' in t and 'saletra potasowa' in t and 'na 3 mies.' in t, t[-1500:]
    pg.click('.buycard >> text=6 mies.'); pg.wait_for_timeout(200); assert 'na 6 mies.' in T()
    # zakładka Zakupy: Makro + Mikro razem i wyposażenie
    pg.click('.seg >> text=Zakupy'); pg.wait_for_timeout(250); t = T(); shot('r3-zakupy')
    assert 'Lista zakupów' in t and 'Fe-DTPA' in t and 'Waga 0,01 g' in t and 'Odważ do butelki' not in t, t[:1500]
    assert pg.locator('input[aria-label="Butelka"]').count() == 0 and pg.locator('input[aria-label="Akwarium"]').count() == 1
    # pusta lista
    pg.evaluate("state.inputs.kalk.rows = []; state.inputs.kalk.mrows = []; save(); render()"); pg.wait_for_timeout(200); assert 'Najpierw ustaw' in T()
    # Sprawdź: za mało wody → „Rozpuść w … ml”
    pg.click('.seg >> text=Sprawdź'); pg.evaluate("state.inputs.kalk.items = [{mat:'K2SO4',hyd:0,g:60}]; state.inputs.kalk.bottle = '500'; save(); render()"); pg.wait_for_timeout(200)
    t = T(); assert 'tak się nie uda' in t and 'Rozpuść w 700 ml' in t, t[:700]
    pg.click('button:has-text("Rozpuść w 700 ml")'); pg.wait_for_timeout(200); assert pg.input_value('input[aria-label="Butelka"]') == '700' and 'tak się nie uda' not in T()
    # PMDD: na liście zakupów ocet, nie kwas solny jako zakup
    pg.click('.presetbar >> text=PMDD'); pg.wait_for_timeout(250); t = T(); assert 'ocet spożywczy 10%' in t and 'Co kupić' in t, t[-1200:]
    # 5 zakładek mieści się bez poziomego przewijania na 360 px
    pg.set_viewport_size({'width': 360, 'height': 780}); pg.evaluate("state.inputs.kalk.mode = 'make'; render()"); pg.wait_for_timeout(200)
    sc = pg.evaluate("(() => { const s = document.querySelector('.seg-big'); return [s.scrollWidth, s.clientWidth]; })()"); shot('r4-360'); assert sc[0] <= sc[1] + 1, sc
    assert not errors, errors
    print('E2E rozpuszczalność OK')

"""Testy języka (Playwright, Chromium):
1) wykrywanie języka przy pierwszym uruchomieniu (przeglądarka EN/PL/DE, dotychczasowi użytkownicy, ?lang=),
2) zmiana języka w Ustawieniach i zapamiętanie wyboru, domyślne nazwy przechodzą na nowy język, dane zostają,
3) przejście po wszystkich ekranach w EN z klikaniem przełączników i rozwijanych sekcji: bez błędów JS,
   bez brakujących tłumaczeń (I18N_MISSING) i bez polskiego tekstu w widoku,
4) to samo w PL: brak angielskich wstawek z i18n (sprawdzane przez porównanie z zapisem sprzed 8.0 w i18n_snapshot).
Uruchom: python3 tests/e2e_i18n.py [katalog_na_zrzuty]"""
import os, sys, re, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'app.html')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'shots', 'e2e', 'e2e_i18n'); os.makedirs(SHOTS, exist_ok=True)
src = open(os.path.join(ROOT, 'i18n-en.js'), encoding='utf8').read(); EN = json.loads(src[src.index('{', src.index('I18N_EN')):src.rindex('}') + 1])
W = lambda s: [w.lower() for w in re.findall(r'[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}', s)]
plw, enw = set(), set()
for k, v in EN.items(): plw |= set(W(k)); enw |= set(W(v))
# słowa polskie, które nie występują w angielskich tłumaczeniach (bez symboli chemicznych i nazw handlowych)
PLWORDS = {w for w in plw - enw if len(w) >= 3} | {'nie', 'tak', 'raz', 'albo', 'lub', 'dla', 'przy', 'mam'}
PLWORDS -= {'symfonia', 'złota', 'neocaridina', 'caridina', 'mikro', 'makro', 'intermag', 'floramix', 'mikroplant', 'elvita', 'mikromag', 'rexolin', 'fetrilon', 'combi', 'compo', 'nutrafin', 'spezial', 'rebell', 'plantex'}
DIAC = re.compile('[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]')
ALLOW_LINES = {'Language · Język', 'Polski', 'Symfonia złota'}
SEED = open(os.path.join(ROOT, 'tests', 'i18n_snapshot.py'), encoding='utf8').read().split('SEED = """')[1].split('"""')[0]

def polish(text):
    out = []
    for line in text.split('\n'):
        l = line.strip()
        if not l or l in ALLOW_LINES or l.startswith('Symfonia złota'): continue
        ws = [w for w in W(l) if w in PLWORDS or DIAC.search(w)] + re.findall(r'(?<=[\w₀-₉)]) (i|w|z|o) (?=[\w(])', l)  # polskie spójniki i przyimki
        if ws: out.append((l[:120], ws[:4]))
    return out

fail = []
with sync_playwright() as p:
    b = p.chromium.launch()
    # 1) wykrywanie języka
    for loc, langs, pre, want in [('en-US', ['en-US', 'en'], None, 'en'), ('pl-PL', ['pl-PL', 'pl'], None, 'pl'), ('de-DE', ['de-DE', 'de'], None, 'en'),
                                  ('de-DE', ['de-DE', 'pl'], None, 'pl'), ('en-GB', ['en-GB'], 'akwa.v4', 'pl')]:
        ctx = b.new_context(locale=loc, service_workers='block'); pg = ctx.new_page()
        if pre: pg.goto(URL); pg.evaluate("localStorage.clear(); localStorage.setItem('akwa.v4', JSON.stringify({v:4,tanks:[{id:'t1',name:'Moje akwarium',V:60}],active:'t1',events:{t1:[]},tasks:{t1:[]}}))")
        pg.add_init_script(f"Object.defineProperty(navigator, 'languages', {{ get: () => {json.dumps(langs)} }})")
        pg.goto(URL); pg.wait_for_timeout(200)
        got = pg.evaluate('LANG')
        if got != want: fail.append(f'wykrywanie {loc} {langs} {pre}: {got} ≠ {want}')
        if pre and pg.evaluate('state.tanks[0].V') != 60: fail.append('dane dotychczasowego użytkownika nie wczytane')
        ctx.close()
    ctx = b.new_context(locale='en-US', service_workers='block'); pg = ctx.new_page(); pg.goto(URL + '?lang=pl'); pg.wait_for_timeout(200)
    if pg.evaluate('LANG') != 'pl' or pg.evaluate("localStorage.getItem('dmt.lang')") != 'pl': fail.append('?lang=pl nie działa')
    if pg.evaluate('document.documentElement.lang') != 'pl': fail.append('html lang ≠ pl')
    ctx.close()

    # 2) zmiana języka w Ustawieniach, zapamiętanie, domyślne nazwy, dane bez zmian
    ctx = b.new_context(locale='pl-PL', service_workers='block'); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("addEvent({ type: 'note', date: todayKey(), note: 'abc', tags: ['Glony'] }); save()")
    before = pg.evaluate('JSON.stringify(state.events)')
    pg.goto(URL + '#/info'); pg.wait_for_timeout(200)
    pg.click('main >> text=English'); pg.wait_for_load_state(); pg.wait_for_timeout(400)
    if pg.evaluate('LANG') != 'en': fail.append('przełączenie na EN nie działa')
    if pg.evaluate('state.tanks[0].name') != 'My tank': fail.append('domyślna nazwa zbiornika nie przeszła na EN: ' + pg.evaluate('state.tanks[0].name'))
    if pg.evaluate("state.tasks[state.active].map(k => k.name).join('|')") != 'Macro fertilizer (NPK)|Micro / iron fertilizer|Water change': fail.append('zadania nie przeszły na EN')
    if pg.evaluate("Object.values(state.events)[0][0].tags[0]") != 'Algae': fail.append('tag nie przeszedł na EN')
    if pg.evaluate("Object.values(state.events)[0][0].note") != 'abc': fail.append('treść notatki zmieniona')
    pg.reload(); pg.wait_for_timeout(200)
    if pg.evaluate('LANG') != 'en': fail.append('wybór języka nie zapamiętany')
    if 'Settings' not in pg.inner_text('#main'): fail.append('ekran Ustawień nie po angielsku')
    pg.click('main >> text=Polski'); pg.wait_for_load_state(); pg.wait_for_timeout(400)
    if pg.evaluate('LANG') != 'pl' or pg.evaluate('state.tanks[0].name') != 'Moje akwarium': fail.append('powrót do PL nie działa')
    if pg.evaluate('JSON.stringify(state.events)') != before: fail.append('dane zmieniły się po dwóch zmianach języka')
    if errs: fail.append('błędy JS przy zmianie języka: ' + '; '.join(errs))
    ctx.close()

    # 3) przejście po ekranach EN z klikaniem
    for lang in ['en']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='en-US', service_workers='block'); pg = ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.dismiss())
        pg.add_init_script("try{localStorage.setItem('dmt.lang','%s')}catch(e){}" % lang)
        pg.goto(URL); pg.wait_for_timeout(300)
        for _ in range(3):
            pg.evaluate(SEED); pg.wait_for_timeout(400); pg.evaluate('save()'); pg.reload(); pg.wait_for_timeout(300)
            if pg.evaluate('Object.values(state.events)[0].length') == 25: break
        routes = sorted(set(pg.evaluate('Object.keys(PAGES)') + ['kalkulator/nawoz', 'kalkulator/gotowe', 'kalkulator/receptury', 'kalkulator/historia', 'kalkulator/zaawansowane',
                 'kalkulator/makro', 'kalkulator/mikro', 'kalkulator/mineral', 'kalkulator/zakupy', 'kalkulator/receptury/sprawdz', 'nawozy/receptury/nowa', 'kalkulator/receptury/ei']))
        found = {}; clicks = 0
        def scan(where):
            for sel in ['#main', '.sheet', '#nav', 'header.top', '.toast']:
                for t in pg.eval_on_selector_all(sel, 'els => els.map(e => e.innerText)'):
                    for l, ws in polish(t): found.setdefault(l, set()).add(where)
            # atrybuty widoczne dla czytników ekranu i podpowiedzi
            for t in pg.eval_on_selector_all('[aria-label],[title],[placeholder]', "els => els.map(e => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].filter(Boolean).join('\\n'))"):
                for l, ws in polish(t): found.setdefault('[attr] ' + l, set()).add(where)
        for r in routes:
            pg.evaluate("r => { location.hash = '#/' + r; render(); }", r); pg.wait_for_timeout(150); scan(r)
            # kliknij przełączniki, zakładki i rozwijane sekcje (bez przycisków usuwania i zapisu)
            n = pg.evaluate("""() => { const els = [...document.querySelectorAll('#main [role=radio], #main .chip, #main summary, #main .kx-seg button, #main .kn-tabs button, #main [role=tab]')]
              .filter(e => !['Polski', 'English'].includes(e.textContent.trim()));  // zmiana języka testowana osobno
              els.forEach((e, i) => e.dataset.i18nClick = i); return els.length; }""")
            for i in range(min(n, 30)):
                el = pg.query_selector(f'[data-i18n-click="{i}"]')
                if not el or not el.is_visible(): continue
                try: el.click(timeout=1000); clicks += 1
                except Exception: continue
                pg.wait_for_timeout(60); scan(r + ' (klik)')
        # okna dolne
        pg.evaluate("location.hash = '#/zbiornik'; render()"); pg.wait_for_timeout(150)
        for s in ['openAdd()', 'openTankSheet()', 'openHelp()', 'openMeasure()', 'openWater()', 'editSalt(null)']:
            try: pg.evaluate(s); pg.wait_for_timeout(150); scan(s); pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x => x.remove())")
            except Exception as e: fail.append(f'{s}: {e}')
        # dłuższe angielskie teksty nie mogą rozpychać ekranu w poziomie (telefon 360 px, desktop)
        for w in (360, 1280):
            pg.set_viewport_size({'width': w, 'height': 800})
            for r in routes:
                pg.evaluate("r => { location.hash = '#/' + r; render(); }", r); pg.wait_for_timeout(80)
                sw = pg.evaluate('document.documentElement.scrollWidth')
                if sw > w: fail.append(f'[{lang}] przewijanie w poziomie {r} przy {w}px: {sw}')
        # galony US → litry przy objętości akwarium (tylko EN); obliczenia dalej w litrach
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.evaluate("location.hash = '#/kalkulator/nawoz'; render()"); pg.wait_for_timeout(200)
        pg.click('main >> text=Tank in gallons? Convert to liters'); pg.fill('.sheet input', '20'); pg.click('.sheet >> text=Use liters'); pg.wait_for_timeout(200)
        v = pg.eval_on_selector('main input[aria-label="Water in the tank"]', 'e => e.value')
        if v != '75.7': fail.append(f'galony → litry: pole ma {v!r}, oczekiwano 75.7')
        if 'at 76 L' not in pg.inner_text('main'): fail.append('wynik nie przeliczony na 76 l')
        # regresja 8.0: uwaga o occie zależała od polskiej nazwy kwasu (name.includes('octowy')) – teraz od identyfikatora
        pg.evaluate("state.adv = true; save(); location.hash = '#/woda/kwas'; render()"); pg.wait_for_timeout(200)
        if 'Vinegar is a weak acid' not in pg.inner_text('main'): fail.append('brak uwagi o occie w EN (kwas/KH)')
        miss = pg.evaluate('[...I18N_MISSING]')
        if miss: fail.append(f'[{lang}] brak tłumaczeń ({len(miss)}): ' + ' | '.join(miss[:15]))
        if errs: fail.append(f'[{lang}] błędy JS: ' + ' | '.join(errs[:5]))
        if found: fail.append(f'[{lang}] polski tekst w widoku ({len(found)}):\n  ' + '\n  '.join(f'{l}  ← {", ".join(sorted(w)[:3])}' for l, w in sorted(found.items())[:40]))
        pg.goto(URL + '#/kalkulator/nawoz'); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, f'{lang}-kalkulator.png'))
        print(f'[{lang}] {len(routes)} ekranów, {clicks} kliknięć')
        ctx.close()
    b.close()
# 4) polska wersja bez zmian: tekst wszystkich ekranów (pusty stan i dane przykładowe) identyczny z wersją 7.17 sprzed i18n
#    (poza ekranem Ustawień, do którego w 8.0 doszły język i kontakt)
import subprocess
out = os.path.join(SHOTS, 'ekrany-pl.json')
subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'i18n_snapshot.py'), 'pl', out], check=True, capture_output=True)
ref, now = json.load(open(os.path.join(ROOT, 'tests', 'fixtures', 'ekrany-pl-7.17.json'), encoding='utf8')), json.load(open(out, encoding='utf8'))
diff = [k for k in ref if not k.endswith(':info') and ref[k] != now.get(k)]
if diff: fail.append('polska wersja różni się od 7.17 na ekranach: ' + ', '.join(diff))
if fail: print('BŁĘDY:\n' + '\n'.join(fail)); sys.exit(1)
print('OK – język: wykrywanie, zmiana, zapamiętanie, pełne tłumaczenie EN, polska wersja bez zmian')

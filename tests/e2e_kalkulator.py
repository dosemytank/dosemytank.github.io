"""E2E kalkulatora 7.0 (Chromium, telefon 390×844 z dotykiem, potem desktop). Uruchom: python3 tests/e2e_kalkulator.py [katalog_na_zrzuty]
Makro, Mikro, Gotowe nawozy, Receptury, Historia; poprawki rozpuszczalności, % chelatu, czystość, podział (struwit), zapis, kopiowanie,
migracja z 6.11, stare linki, brak poziomego przewijania, tryb ciemny, offline (Service Worker)."""
import sys, os, threading, http.server, functools, json
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8767), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8767/app.html'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='pl-PL', permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    shot = lambda n: SHOTS and pg.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
    T = lambda: pg.evaluate("(() => { const c = document.querySelector('#main').cloneNode(true); c.querySelectorAll('select').forEach(x => x.remove()); document.body.append(c); const t = c.textContent; c.remove(); return t; })()")
    OUT = lambda: pg.text_content('.kx-out')  # textContent – bez wielkich liter z CSS
    def go(h):
        pg.evaluate("h => go(h)", h); pg.wait_for_timeout(250); t = T()
        assert 'Nie udało się wyświetlić' not in t, h + ': ' + t[:300]
        sw = pg.evaluate('document.documentElement.scrollWidth'); vw = pg.evaluate('window.innerWidth'); assert sw <= vw, (h, sw, vw); return t
    def fill(sel, v): pg.fill(sel, v); pg.wait_for_timeout(150)

    # --- migracja z 6.11: ostatnie wpisy przechodzą do nowych formularzy, stary obiekt zostaje ---
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("""() => { tank().V = 100; state.inputs.kalk = { mode: 'make', bottle: '500', dose: '10', n: '7', rows: [{k:'NO3',t:'12',src:'KNO3|0'}], mrows: [{k:'Fe',t:'0,2',src:'FeDTPA|0'}], items: [{mat:'KNO3',hyd:0,g:5}] };
      delete state.inputs.kx; save(); }""")
    go('kalkulator'); assert pg.evaluate("location.hash") == '#/kalkulator/nawoz', 'start: Zrób nawóz'
    assert pg.evaluate("state.inputs.kx.makro.rows[0].t") == '12' and pg.evaluate("state.inputs.kx.mikro.rows[0].t") == '0,2' and pg.evaluate("state.inputs.kx.rec.items[0].g") == 5
    assert pg.evaluate("state.inputs.kalk.rows[0].t") == '12', 'stary obiekt nietknięty'
    # --- Zrób nawóz: domyślnie z profilu (low-tech → słabe światło bez CO₂), kranówka, 3 razy w tygodniu, podmiana 30% ---
    t = go('kalkulator/nawoz'); o = OUT()
    assert 'Twój przepis' in o and 'Makro · butelka 500 ml' in o and 'Mikro i żelazo · butelka 500 ml' in o and 'Plantex CSM+B' in o and 'z każdej butelki' in o, o[:800]
    assert 'Przewidywana zmiana stężenia' in o and 'zgodnie z planem' in o and 'Cel planu' in o and 'mg/l' in o and 'Zalecenia' in o and 'Najwyżej w wodzie' not in o, o
    assert 'Woda w filtrze' not in T() and 'Dozowanie CO₂' in T() and 'lm na litr' in T()
    # 7.15: próg światła przeliczony na objętość akwarium (100 l) i aktualizowany przy zmianie objętości
    assert 'przy 100 l: 2–4 tys. lm' in T(), T()[:900]
    fill('input[aria-label="Woda w akwarium"]', '1000'); assert 'przy 1000 l: 20–40 tys. lm' in T() and 'świetlówki T5 albo' not in T()
    fill('input[aria-label="Woda w akwarium"]', '')
    pg.click('.kn-card:has-text("Mocne")'); pg.click('.kx-seg[aria-label="Dozowanie CO₂"] >> text=tak'); pg.wait_for_timeout(200)
    assert 'mocnego światła z CO₂' in T() and 'Pilnuj stałej dawki CO₂' in OUT()
    # plan: Oszczędnie (60%) i Własne
    pg.click('.kn-card:has-text("Oszczędnie")'); pg.wait_for_timeout(200); o = OUT(); assert '+9 ' in o and pg.locator('.kn-eff tr.st-ok').count() >= 4, o  # 15 × 0,6
    pg.click('.kn-card:has-text("Własne")'); pg.wait_for_timeout(200); fill('input[aria-label="NO₃"]', '5'); o = OUT(); assert '+5' in o, o
    pg.click('.kn-card:has-text("Więcej")'); pg.wait_for_timeout(200); ei = pg.text_content('.kn-card:has-text("Z zapasem")'); mo = pg.text_content('.kn-card:has-text("Więcej")')
    assert 'NO₃ 17,5' in mo and 'NO₃ 20 ' in ei, (mo, ei)  # mocne: zalecane 15, z zapasem = EI 20, więcej – min(1,5 × 15; w połowie do EI)
    pg.click('.kn-card:has-text("Zalecane")'); pg.wait_for_timeout(200); assert pg.locator('.kn-eff tr.st-ok').count() >= 4
    # szafka: bez K₂SO₄ potas idzie z KNO₃; mikro z listy – chelat z % z etykiety
    pg.uncheck('input[aria-label="K₂SO₄ – siarczan potasu"]'); pg.wait_for_timeout(200); assert 'K₂SO₄' not in pg.text_content('.kx-out .kn-bottle table')
    opts = pg.evaluate("[...document.querySelector('select[aria-label=\"Mikro i żelazo\"]').options].map(o => o.textContent)")
    assert 'nie mam' not in ' '.join(opts) and 'Plantex CSM+B' in opts, opts
    pg.select_option('select[aria-label="Mikro i żelazo"]', 'FeDTPA|0'); pg.wait_for_timeout(200)
    fill('input[aria-label="Ile Fe ma ten produkt (z etykiety)"]', '7'); o = OUT(); assert 'Fe-DTPA 7%' in o and 'Brakuje' not in o, o
    pg.select_option('select[aria-label="Mikro i żelazo"]', 'p:b26'); pg.wait_for_timeout(200)
    # saletra wapniowa zamiast KNO₃ – makro w dwóch butelkach (fosforan wapnia)
    pg.uncheck('input[aria-label="KNO₃ – saletra potasowa"]'); pg.check('input[aria-label="Ca(NO₃)₂·4H₂O – saletra wapniowa"]'); pg.wait_for_timeout(200); o = OUT()
    assert 'Makro 1' in o and 'Makro 2' in o and 'fosforan wapnia' in o and 'Ca(NO₃)₂·4H₂O' in o, o[:600]
    n1 = pg.evaluate("state.recipes.length"); pg.click('button:has-text("Zapisz w Przepisach")'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Wapń'); pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(200)
    rs = pg.evaluate("state.recipes.filter(r => r.name.startsWith('Wapń'))"); assert len(rs) == 3, [r['name'] for r in rs]
    m1 = [r for r in rs if any(i.get('mat') == 'CaNO32' for i in r['items'])][0]; assert not any(i.get('mat') == 'KH2PO4' for i in m1['items']), m1  # Ca i PO₄ nigdy w jednej zapisanej butelce
    pg.evaluate("const ids = state.recipes.filter(r => r.name.startsWith('Wapń')).map(r => r.id); state.recipes = state.recipes.filter(r => !ids.includes(r.id)); state.products = state.products.filter(p => !ids.includes(p.rid)); save()")
    pg.uncheck('input[aria-label="Ca(NO₃)₂·4H₂O – saletra wapniowa"]'); pg.check('input[aria-label="KNO₃ – saletra potasowa"]'); pg.wait_for_timeout(200)
    # forma uwodnienia w szafce
    pg.click('[aria-label="Forma Siarczan magnezu"] button[data-v="MgSO4|0"]'); pg.wait_for_timeout(200); assert 'MgSO₄·7H₂O' not in pg.text_content('.kx-out .kn-bottle table')
    pg.click('[aria-label="Forma Siarczan magnezu"] button[data-v="MgSO4|7"]'); pg.wait_for_timeout(200)
    # mineralizacja to osobne narzędzie: w „Nawóz” nie ma GH/KH ani wody do podmian, jest link
    assert 'Woda do podmian' not in T() and 'GH docelowe' not in T() and 'Mineralizacja wody' in T()
    t = go('kalkulator/mineral'); assert pg.evaluate("document.querySelector('.kx-nav a.on').textContent") == 'Nawozy z soli' and 'Twój przepis' not in t
    fill('input[aria-label="Ile wody RO przygotowujesz"]', '40'); fill('input[aria-label="GH docelowe"]', '6'); fill('input[aria-label="KH docelowe"]', '3'); o = OUT()
    # 40 l: gips 4 × 1,19 = 4,75 g, MgSO₄·7H₂O 3,74 g, KHCO₃ 4,28 g; GH 6, KH 3
    assert 'Na 40 l wody RO dodaj' in o and '4,75' in o and '3,74' in o and '4,28' in o and 'Woda po przygotowaniu' in o and 'GH 6 °dH · KH 3 °dH' in o and 'nie dawka nawozu' in o, o[:700]
    pg.click('.kg-kinds button:has-text("Caridina: GH 5")'); pg.wait_for_timeout(200); o = OUT(); assert 'GH 5 °dH · KH 0 °dH' in o and 'KHCO₃' not in o, o[:500]
    pg.click('.kg-kinds button:has-text("20 l")'); pg.wait_for_timeout(200); assert 'Na 20 l wody RO dodaj' in OUT()
    pg.uncheck('input[aria-label="CaSO₄·2H₂O – gips"]'); pg.wait_for_timeout(200); assert 'Brakuje źródła wapnia' in OUT() and 'GH będzie tylko z magnezu' in OUT()
    pg.check('input[aria-label="CaCl₂·2H₂O – chlorek wapnia"]'); pg.wait_for_timeout(200); assert 'CaCl₂·2H₂O' in OUT() and 'Brakuje' not in OUT()
    assert pg.evaluate("kxState().nawoz.have.includes('CaCl2|2') && !kxState().nawoz.have.some(c => c.startsWith('CaSO4'))"), 'wspólna szafka'
    pg.click('button:has-text("Zapisz ten zestaw")'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Caridina 20'); pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(200)
    fill('input[aria-label="GH docelowe"]', '9'); pg.click('.km-set button:has-text("Caridina 20")'); pg.wait_for_timeout(200); assert 'GH 5 °dH' in OUT()
    pg.check('input[aria-label="CaSO₄·2H₂O – gips"]'); pg.uncheck('input[aria-label="CaCl₂·2H₂O – chlorek wapnia"]'); shot('k01b-mineral'); go('kalkulator/nawoz')
    # na sucho
    pg.click('.kx-seg[aria-label="Jak dawkujesz"] >> text=Na sucho'); pg.wait_for_timeout(200); o = OUT(); assert 'Przy każdej dawce wsyp do akwarium' in o and 'Makro · butelka' not in o, o
    pg.click('.kx-seg[aria-label="Jak dawkujesz"] >> text=Z butelki'); pg.wait_for_timeout(200)
    # zapis i przejście do Makro
    n0 = pg.evaluate("state.recipes.length"); pg.click('button:has-text("Zapisz w Przepisach")'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Kreator'); pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(200)
    assert pg.evaluate("state.recipes.length") == n0 + 2 and pg.evaluate("state.recipes.some(r => r.name === 'Kreator – A makro')"), pg.evaluate("state.recipes.map(r => r.name)")
    rb = pg.evaluate("state.recipes.find(r => r.name === 'Kreator – B mikro i żelazo')"); assert rb and rb['items'][0]['fert']['name'] == 'Plantex CSM+B', rb  # mikro z gotowej mieszanki też zapisane
    assert pg.evaluate("state.products.filter(p => p.source === 'recipe' && p.name.startsWith('Kreator')).length") == 2
    pg.click('button:has-text("Dodaj do planu nawożenia")'); pg.wait_for_timeout(150); assert pg.evaluate("tank().fplan.filter(x => state.products.find(p => p.id === x.pid && p.name.startsWith('Kreator'))).length") == 2
    assert 'W 1 ml:' in OUT() and 'podnosi NO₃ o 1 mg/l' in OUT()
    pg.evaluate("tank().fplan = tank().fplan.filter(x => !state.products.find(p => p.id === x.pid && p.name.startsWith('Kreator'))); save()")
    pg.click('button:has-text("Ustaw sam w Makro")'); pg.wait_for_timeout(250); assert pg.evaluate("location.hash") == '#/kalkulator/makro' and 'Zaawansowane' in pg.text_content('.kx-back')
    assert pg.evaluate("document.querySelector('.kx-nav a.on').textContent") == 'Zaawansowane'
    t = go('kalkulator/zaawansowane'); assert 'Makro' in t and 'Sprawdź butelkę' in t and 'Korekta parametrów akwarium' in t and 'Mineralizacja wody RO' in t
    for href, want in [('#/woda/mineral', 'Twardość z soli'), ('#/pomiary/jednostki', 'Przeliczniki'), ('#/kalkulator/receptury/sprawdz', 'Sprawdź butelkę')]:
        pg.evaluate("state.adv = false; save()"); pg.evaluate(f"location.hash = '{href}'"); pg.wait_for_timeout(250); assert want in T(), (href, T()[:200])
    assert pg.evaluate("document.querySelector('.kx-nav a.on').textContent") == 'Zaawansowane'
    # --- 7.14: Sole → twardość – lista z „Dodaj sól” zamiast 15 pól; 2 g gipsu w 100 l → GH +0,65 °dH (jak dotąd) ---
    pg.evaluate("state.inputs.mineral = { vol: '100' }; save()"); go('woda/mineral')
    assert pg.locator('input[aria-label^="CaSO₄"]').count() == 0 and 'Dodaj sole, które wsypujesz' in T()
    pg.select_option('select[aria-label="Dodaj sól"]', 'CASO4'); pg.fill('input[aria-label^="CaSO₄"]', '2'); pg.wait_for_timeout(150)
    assert '0,65' in T() and pg.evaluate("state.inputs.mineral.list") == ['CASO4'], T()[-400:]
    pg.click('button[aria-label="Usuń CaSO₄·2H₂O"]'); pg.wait_for_timeout(150); assert 'Wpisz gramy soli' in T() and pg.locator('input[aria-label^="CaSO₄"]').count() == 0
    # --- Makro: przykład z audytu 100 l, 500 ml, 10 ml × 7 ---
    pg.evaluate("state.inputs.kx.makro = { per: 'week', bottle: '500', dose: '10', n: '7', rows: null }; save()"); t = go('kalkulator/makro')
    for v in ['11,6', '1,02', '13,2', '21,7']: assert v in OUT(), v + ' | ' + OUT()[:600] + json.dumps(pg.evaluate('state.inputs.kx.makro'))
    o = OUT()
    assert 'NO₃ do PO₄ wychodzi 10 : 1' in o and 'GH o' in o and 'Po jednej dawce (10 ml)' in o and 'Po tygodniu (7 dawek)' in o, o
    shot('k01-makro')
    # na dawkę ↔ na tydzień: przeliczenie pól, gramy bez zmian
    pg.click('.kx-seg >> text=jedną dawką'); pg.wait_for_timeout(200)
    v = pg.input_value('input[aria-label="Przyrost NO₃"]'); assert v == '1,4286' and '11,6' in OUT(), (v, OUT()[:300])
    pg.click('.kx-seg >> text=w tygodniu'); pg.wait_for_timeout(200); assert pg.input_value('input[aria-label="Przyrost NO₃"]') == '10'
    # błąd przy polu
    fill('input[aria-label="Przyrost NO₃"]', 'abc'); assert 'Wpisz liczbę' in T(); fill('input[aria-label="Przyrost NO₃"]', '10')
    # + składnik Ca z Ca(NO₃)₂ → zmienia azot; usunięcie wraca do wyniku
    pg.select_option('select[aria-label="Dodaj składnik"]', 'Ca'); pg.wait_for_timeout(200)
    pg.select_option('select[aria-label="Źródło Ca"]', 'CaNO32|4'); pg.wait_for_timeout(200); o = OUT(); assert 'Ca(NO₃)₂·4H₂O' in o and '11,6' not in o, o
    pg.click('button[aria-label="Usuń Ca"]'); pg.wait_for_timeout(200); assert '11,6' in OUT()
    # forma uwodnienia jako pozycja na liście: MgSO₄·7H₂O 21,7 g → bezwodny 10,6 g, Mg w akwarium bez zmian
    opts = pg.evaluate("[...document.querySelector('select[aria-label=\"Źródło Mg\"]').options].map(o => o.dataset.full || o.textContent)")
    assert 'MgSO₄·7H₂O – Siarczan magnezu, siedmiowodny' in opts and 'MgSO₄ – Siarczan magnezu, bezwodny' in opts, opts
    assert pg.locator('select[aria-label^="Forma"]').count() == 0
    # 7.16: zamknięta lista pokazuje sam wzór, po otwarciu – pełną nazwę
    assert pg.evaluate("document.querySelector('select[aria-label=\"Źródło Mg\"]').selectedOptions[0].textContent") == 'MgSO₄·7H₂O'
    pg.select_option('select[aria-label="Źródło Mg"]', 'MgSO4|0'); pg.wait_for_timeout(200); o = OUT()
    assert '10,6' in o and 'Mg 0,43' in o, o
    pg.select_option('select[aria-label="Źródło Mg"]', 'MgSO4|7'); pg.wait_for_timeout(200); assert '21,7' in OUT()
    # wartości startowe (Lekkie/Średnie/Mocne) – nie receptury
    pg.select_option('select[aria-label="Wstaw typowe wartości"]', 'mid'); pg.wait_for_timeout(200)
    assert [r['t'] for r in pg.evaluate("state.inputs.kx.makro.rows")][:4] == ['10', '1', '10', '3']
    # rozpuszczalność: przypadek ze zrzutu 6.10 – 10 ml × 3, NO₃ 20 / PO₄ 3 / K 30 / Mg 10
    pg.evaluate("""() => { const m = state.inputs.kx.makro; Object.assign(m, { per: 'week', bottle: '500', dose: '10', n: '3', rows: [{k:'NO3',t:'20',src:'KNO3|0'},{k:'PO4',t:'3',src:'KH2PO4|0'},{k:'K',t:'30',src:'K2SO4|0'},{k:'Mg',t:'10',src:'MgSO4|7'}] }); save(); render(); }""")
    pg.wait_for_timeout(250); o = OUT(); shot('k02-nie-rozpusci')
    assert 'rozpuszcza się najwyżej' in o and 'Ustaw dawkę 15,5 ml' in o and 'Większa butelka nic tu nie da' in o, o[:600]
    assert 'też dają K i SO₄' in o and 'bezpieczne 70%' in o and 'bezpiecznie do 70%' in o, o  # C5
    assert '38,8' not in o, 'przy soli, która się nie rozpuści, gramy nie są pokazywane'
    pg.click('button:has-text("Ustaw dawkę 15,5 ml")'); pg.wait_for_timeout(250); assert pg.input_value('input[aria-label="Dawka"]') == '15,5' and 'najwyżej' not in OUT()
    fill('input[aria-label="Dawka"]', '10'); pg.click('button:has-text("Dawkuj 5 razy w tygodniu")'); pg.wait_for_timeout(250); assert pg.input_value('input[aria-label="Dawek w tygodniu"]') == '5'
    fill('input[aria-label="Dawek w tygodniu"]', '3'); pg.click('button:has-text("Potas z KCl zamiast")'); pg.wait_for_timeout(250)
    assert pg.evaluate("state.inputs.kx.makro.rows.find(r => r.k === 'K').src") == 'KCl|0' and 'KCl' in OUT()
    # struwit: MAP + MgSO₄ → podział na dwie butelki (C2)
    pg.evaluate("""() => { Object.assign(state.inputs.kx.makro, { dose: '10', n: '7', rows: [{k:'NH4',t:'0,5',src:'NH4H2PO4|0'},{k:'Mg',t:'3',src:'MgSO4|7'}] }); save(); render(); }"""); pg.wait_for_timeout(250)
    assert 'Zrób dwie butelki' in OUT(), OUT()
    # czystość (tryb zaawansowany, C4)
    pg.evaluate("setAdv(true)"); pg.evaluate("Object.assign(state.inputs.kx.makro, { rows: [{k:'NO3',t:'10',src:'KNO3|0'}] }); save(); render()"); pg.wait_for_timeout(250)
    assert '11,6' in OUT(); fill('input[aria-label="Czystość NO₃"]', '50'); assert '23,3' in OUT() and 'czystość 50%' in OUT()
    pg.evaluate("setAdv(false)")
    # zapis jako receptura (okno z nazwą zamiast prompt)
    pg.evaluate("state.inputs.kx.makro.rows = null; save()"); go('kalkulator/makro')
    pg.click('button:has-text("Zapisz jako przepis")'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Test NPK'); pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(200)
    r = pg.evaluate("state.recipes.find(r => r.name === 'Test NPK')"); assert r and len(r['items']) == 4 and r['vol'] == 500
    pg.click('button:has-text("Kopiuj wynik")'); pg.wait_for_timeout(300); clip = pg.evaluate("navigator.clipboard.readText()")
    assert 'KNO₃: 11,6 g' in clip and 'Po tygodniu: +NO₃ 10' in clip, clip

    # --- Mikro ---
    pg.evaluate("state.inputs.kx.mikro.rows = null; save()"); t = go('kalkulator/mikro'); assert '0,65' in OUT() and 'Fe-DTPA 11%' in OUT() and 'Pierwiastek' in OUT(), OUT()
    fill('input[aria-label="Zawartość Fe w Fe-DTPA 11%, %"]', '7'); assert '1,02' in OUT() and 'Fe-DTPA 7%' in OUT()
    assert pg.evaluate("state.inputs.kx.chel.FeDTPA") == '7'
    go('kalkulator/makro'); go('kalkulator/mikro'); assert pg.input_value('input[aria-label="Zawartość Fe w Fe-DTPA 11%, %"]') == '7', 'zapamiętane'
    pg.select_option('select[aria-label="Dodaj składnik"]', 'Mn'); pg.wait_for_timeout(150); fill('input[aria-label="Przyrost Mn"]', '0,01')
    o = OUT(); assert 'MnSO₄·H₂O' in o and 'to za mało, żeby odważyć' in o, o + json.dumps(pg.evaluate('state.inputs.kx.mikro.rows'))
    pg.select_option('select[aria-label="Źródło Fe"]', 'FeSO4|7'); pg.wait_for_timeout(200); assert 'Wybierz EDTA' in OUT()
    pg.click('.kx-seg >> text=Na₂EDTA·2H₂O'); pg.wait_for_timeout(200); assert 'Na₂EDTA·2H₂O' in OUT() and '1 mol na 1 mol' in OUT()
    shot('k03-mikro')
    pg.click('.kx-seg >> text=Gotowa mieszanka'); pg.wait_for_timeout(200); pg.select_option('select[aria-label="Mieszanka"]', 'b26'); pg.wait_for_timeout(200)
    fill('input[aria-label="Przyrost Fe"]', '0,2'); o = OUT(); assert 'Plantex CSM+B' in o and '2,04' in o and 'Na 1 mg żelaza' in o, o

    # --- 7.15: instrukcja ekranu pod ikoną „?” ---
    go('kalkulator/nawoz'); pg.click('#helpBtn'); pg.wait_for_timeout(150); hs = pg.text_content('.sheet')
    assert 'Przygotuj nawóz' in hs and 'Jak używać' in hs and 'Krok 3' in hs, hs[:300]
    pg.click('.sheet button:has-text("Rozumiem")'); pg.wait_for_timeout(100); assert pg.locator('.sheet').count() == 0
    # --- 7.16: propozycja ustawienia akwarium nad kalkulatorem (nie blokuje) i szybkie ustawienie w 3 pytaniach ---
    pg.evaluate("tank().setup = false; delete state.inputs.setupHide; save()"); t = go('kalkulator/nawoz'); assert 'Pierwszy raz?' in t and 'Twój przepis' in t
    pg.click('.setup-tip button:has-text("Ustaw akwarium")'); pg.wait_for_timeout(150)
    pg.fill('.sheet input[aria-label="Ile wody jest w akwarium?"]', '240'); pg.click('.sheet .tile:has-text("High-tech")'); pg.click('.sheet .chip:has-text("50%")'); pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(250)
    tk = pg.evaluate("({ V: tank().V, type: tank().type, change: tank().change, setup: tank().setup, light: kxState().nawoz.light, co2: kxState().nawoz.co2 })")
    assert tk == {'V': 240, 'type': 'plant_hi', 'change': 50, 'setup': True, 'light': 'high', 'co2': True}, tk
    t = T(); assert 'Pierwszy raz?' not in t and '240 l' in t, t[:600]
    pg.evaluate("Object.assign(tank(), { V: 100, type: 'plant_lo', change: 30, setup: false }); Object.assign(kxState().nawoz, { light: 'low', co2: false, change: '30' }); save()")
    go('kalkulator/nawoz'); pg.click('.setup-tip button:has-text("Licz bez tego")'); pg.wait_for_timeout(150); assert 'Pierwszy raz?' not in T() and pg.evaluate("state.inputs.setupHide") is True
    # --- 7.15: dwie zakładki; dziennik w Akwarium (ostatnie wpisy) i jako podstrona ---
    assert pg.evaluate("[...document.querySelectorAll('nav.bar button[data-s]')].map(b => b.dataset.s)") == ['kalkulator', 'zbiornik']
    t = go('zbiornik'); assert 'Ostatnie wpisy' in t and t.index('Dziś') < t.index('Woda'), t[:600]
    t = go('dziennik'); assert '← Akwarium' in t or 'Akwarium' in t; assert pg.evaluate("document.querySelector('nav.bar button.on').dataset.s") == 'zbiornik'
    # --- Gotowe nawozy ---
    go('kalkulator/gotowe')
    # 7.15: wybrany nawóz na wierzchu, lista po „Zmień nawóz”
    assert pg.locator('.kg-sel').count() == 1 and pg.locator('.kg-list').count() == 0
    pg.click('.kg-sel button:has-text("Zmień nawóz")'); pg.wait_for_timeout(150)
    # wyszukiwanie: nazwa, producent, składnik (bez polskich znaków), filtr rodzaju
    def names(): return pg.evaluate("[...document.querySelectorAll('.kg-item b')].map(b => b.textContent)")
    fill('input[aria-label="Szukaj nawozu"]', 'seachem zelazo'); assert 'Seachem Flourish Iron' in names() and 'Seachem Flourish Potassium' not in names(), names()
    fill('input[aria-label="Szukaj nawozu"]', 'tropica'); assert set(names()) == {'Tropica Premium Nutrition', 'Tropica Specialised Nutrition'}, names()
    fill('input[aria-label="Szukaj nawozu"]', 'xyz123'); assert 'Nic nie pasuje' in pg.text_content('.kg-list')
    fill('input[aria-label="Szukaj nawozu"]', ''); pg.click('.kg-kinds button:has-text("Potas")'); pg.wait_for_timeout(150); assert set(names()) >= {'Seachem Flourish Potassium', 'Easy Life Potassium'} and 'Tropica Premium Nutrition' not in names(), names()
    pg.click('.kg-kinds button:has-text("Wszystkie")'); pg.wait_for_timeout(150)
    pg.click('.kg-item >> nth=0'); pg.wait_for_timeout(150); assert pg.locator('.kg-list').count() == 0 and pg.locator('.kg-sel').count() == 1
    # dawka producenta: Tropica Premium 6 ml / 50 l raz w tygodniu → 120 l: 14,4 ml; K 8,32 g/l × 14,4 / 120 = 1,0 mg/l
    pg.evaluate("V0 = tank().V; tank().V = 120; Object.assign(state.inputs.kx.gotowe, { pid: 'b24', way: 'maker', V: '' }); save(); render()"); pg.wait_for_timeout(250); o = OUT()
    assert '14,4' in o and 'raz w tygodniu' in o and '+K 1 ' in o and '1,2 ml na 10 l' in o, o[:500]
    pg.evaluate("Object.assign(state.inputs.kx.gotowe, { pid: 'b36', way: 'maker' }); save(); render()"); pg.wait_for_timeout(250); o = OUT()
    assert '3 ml' in o and 'nie podaje częstotliwości' in o and 'Fe 0,25' in o, o[:500]  # Flourish Iron 5 ml/200 l → 3 ml w 120 l, Fe 10 g/l × 3 / 120 = 0,25 (producent obiecuje ok. 0,1 – część zużywają rośliny)
    pg.evaluate("tank().V = V0; save()")
    ids = pg.evaluate("kxReady().map(p => p.id)")
    allids = pg.evaluate("kxReady().map(p => p.id)"); assert 'b26' not in allids and 'b31' not in allids, 'ogrodnicze mieszanki tylko w Mikro'
    pg.evaluate("Object.assign(state.inputs.kx.gotowe, { pid: 'b20', way: 'dose', ldose: '1', n: '7' }); save(); render()"); pg.wait_for_timeout(250)
    t = T(); assert '1 ml w 100 l' in t and '0,24' in t, t[:1500]
    pg.click('.kx-seg[aria-label="Tryb"] >> text=Mam cel'); pg.wait_for_timeout(200); pg.select_option('select[aria-label="Składnik celu"]', 'Fe'); fill('input[aria-label="O ile podnieść"]', '0,2')
    o = OUT(); assert '0,12' in o and '0,85' in o, 'Mikro Plus Fe 0,2/tydz: 0,847 ml/tydz. ' + o
    shot('k04-gotowe')
    pg.click('button:has-text("Dodaj do planu nawożenia")'); pg.wait_for_timeout(150); assert any(x['pid'] == 'b20' for x in pg.evaluate("tank().fplan"))
    pg.click('button:has-text("Porównaj z innym nawozem")'); pg.wait_for_timeout(150); assert pg.locator('.kg-list').count() == 1
    fill('input[aria-label="Szukaj nawozu"]', 'Flourish'); pg.click('.kg-item:has-text("Seachem Flourish") >> nth=0'); pg.wait_for_timeout(250); o = OUT()
    assert 'Porównujesz z:' in T() and 'Intermag Mikro Plus' in T(), T()[:800]
    assert 'Porównanie przy tym samym przyroście Fe' in o and 'Intermag Mikro Plus' in o and 'Seachem Flourish' in o, json.dumps(pg.evaluate('state.inputs.kx.gotowe'))
    # C8: Tropica Specialised – azot całkowity liczony jako NO₃
    pg.evaluate("Object.assign(state.inputs.kx.gotowe, { pid: 'b25', way: 'dose', ldose: '1' }); save(); render()"); pg.wait_for_timeout(250)
    assert 'cały liczony jako NO₃' in T(), T()[:600]
    # własny produkt z etykiety: N azotanowy 5%, K₂O 6%, 1,2 g/ml → 2,66 mg/l NO₃ z 1 ml w 100 l
    pg.click('.kg-sel button:has-text("Zmień nawóz")'); pg.click('button:has-text("Mój nawóz z etykiety")'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Ogrodniczy test')
    pg.fill('.sheet input[aria-label="Gęstość"]', '1,2'); pg.fill('.sheet input[aria-label="N azotanowy"]', '5'); pg.fill('.sheet input[aria-label="K₂O"]', '6'); pg.wait_for_timeout(150)
    pg.click('.sheet button:has-text("Zapisz")'); pg.wait_for_timeout(250)
    assert any(p['name'] == 'Ogrodniczy test' for p in pg.evaluate("state.products")) and '2,66' in T(), T()[:1200]

    # --- Receptury ---
    t = go('kalkulator/receptury'); assert 'PMDD' in t and 'PPS-Pro' in t and 'Test NPK' in t
    # Przepisy: wyszukiwanie po nazwie, soli i składniku, rodzaje, stan szafki
    def rnames(): return pg.evaluate("[...document.querySelectorAll('.kr-list .kg-item b')].map(b => b.textContent)")
    fill('input[aria-label="Szukaj przepisu"]', 'pmdd'); assert rnames() == ['PMDD'], rnames()
    fill('input[aria-label="Szukaj przepisu"]', 'zelazo'); assert 'PMDD' in rnames() and 'PPS-Pro (makro)' not in rnames(), rnames()
    fill('input[aria-label="Szukaj przepisu"]', 'KH₂PO₄'); assert 'PPS-Pro (makro)' in rnames() and 'PMDD' not in rnames(), rnames()
    fill('input[aria-label="Szukaj przepisu"]', ''); assert 'do kupienia:' not in pg.text_content('.kr-list'), 'bez listy „mam już” – bez podpowiedzi'
    pg.evaluate("kxState().owned = ['KNO3|0', 'KH2PO4|0', 'K2SO4|0', 'MgSO4|7']; save(); render()"); pg.wait_for_timeout(250)
    assert 'do kupienia:' in pg.text_content('.kr-list') and 'masz wszystkie składniki' in pg.text_content('.kr-list')
    pg.click('.kg-kinds button:has-text("Kompletne")'); pg.wait_for_timeout(200); assert rnames() == ['PMDD'], rnames()
    pg.click('.kg-kinds button:has-text("Wszystkie")'); pg.wait_for_timeout(200)
    # szczegóły: lista zakupów; „mam” inną formę soli – przeliczenie masy przez masę molową (MgSO₄ bezwodny zamiast 7H₂O: 20 g × 120,37 / 246,47 = 9,77 g)
    pg.evaluate("kxState().owned = kxState().owned.filter(c => !c.startsWith('MgSO4')).concat('MgSO4|0'); save()")
    go('kalkulator/receptury/ppspro'); t = pg.text_content('.kx-out .shop-card'); assert 'masz bezwodny – 9,77 g' in t and 'Akwaria z umiarkowanym' in pg.text_content('.kx-form'), t[:800]
    assert 'W 1 ml: NO₃ 40,5' in OUT() and 'Jak przygotować' in OUT() and 'W szafce' not in pg.text_content('.kx-form')
    pg.evaluate("kxState().owned = []; save()")
    # PMDD: wszystko do kupienia; „Policz w Zrób nawóz”: plan własny z tygodniowym efektem przepisu
    go('kalkulator/receptury/pmdd'); assert pg.locator('.kx-out .shop-card .shop-row').count() >= 7 and pg.locator('.kx-out .shop-card .shop-row.own').count() == 0
    go('kalkulator/receptury/ppspro'); pg.locator('button:has-text("Przelicz w „Przygotuj nawóz”")').dispatch_event('click'); pg.wait_for_timeout(300)
    assert pg.evaluate("location.hash") == '#/kalkulator/nawoz' and pg.evaluate("kxState().nawoz.plan") == 'own' and pg.evaluate("kxState().nawoz.manual.NO3") == '7,08', pg.evaluate("kxState().nawoz.manual")
    assert '+7,1' in OUT() or '+7,08' in OUT(), OUT()[:600]
    pg.evaluate("Object.assign(kxState().nawoz, { plan: 'rec', manual: {}, n: 3, dose: '', bottle: '500' }); save()")
    t = go('kalkulator/receptury/pmdd'); assert 'kwasu solnego' in OUT() and 'kwasu cytrynowego' in OUT() and pg.locator('.kx-out .kx-scroll .kx-t tbody tr').count() == 11, OUT()[:800]
    shot('k05-pmdd')
    t = go('kalkulator/receptury/ppspro'); assert pg.input_value('input[aria-label="Dawka"]') == '2,5', '1 ml na 40 l przy 100 l'
    go('kalkulator/receptury/ei'); pg.click('button:has-text("Otwórz w Makro")'); pg.wait_for_timeout(300)
    assert pg.evaluate("location.hash") == '#/kalkulator/makro' and [r['t'] for r in pg.evaluate("state.inputs.kx.makro.rows")] == ['20', '3', '30', '10'] and pg.evaluate("state.inputs.kx.makro.n") == '3'
    assert 'najwyżej' not in OUT(), 'EI od razu z działającą dawką'
    go('kalkulator/receptury/sprawdz'); pg.evaluate("Object.assign(state.inputs.kx.rec, { items: [{mat:'K2SO4',hyd:0,g:60}], bottle: '500' }); save(); render()"); pg.wait_for_timeout(250)
    assert 'Rozpuść w 700 ml' in OUT(); pg.click('button:has-text("Rozpuść w 700 ml")'); pg.wait_for_timeout(250); assert pg.input_value('input[aria-label="Butelka"]') == '700'

    # --- Historia ---
    pg.wait_for_timeout(1700); t = go('kalkulator/historia'); assert 'Ostatnie obliczenia' in t and 'Sprawdź butelkę' in t, t[:800]
    n0 = pg.evaluate("state.calcLog.length"); assert n0 >= 3, n0
    assert pg.evaluate("state.calcLog.every(e => e.id && e.type && e.ts && e.input)")
    pg.locator('.kx-hist').filter(has_text='Makro').first.locator('button:has-text("Otwórz ponownie")').click(); pg.wait_for_timeout(250); assert pg.evaluate("location.hash") == '#/kalkulator/makro'
    go('kalkulator/historia'); pg.locator('.kx-hist button:has-text("Usuń")').first.click(); pg.wait_for_timeout(200); assert pg.evaluate("state.calcLog.length") == n0 - 1
    shot('k06-historia')
    # eksport całości zawiera historię; import starej kopii bez pola działa
    assert pg.evaluate("Array.isArray(JSON.parse(JSON.stringify(state)).calcLog)")
    assert pg.evaluate("(() => { const s = JSON.parse(JSON.stringify(state)); delete s.calcLog; return Array.isArray(migrate(s).calcLog) && migrate(s).calcLog.length === 0; })()")
    # --- 7.4: na sucho, woda w filtrze, EC/TDS i N:P, porównanie z EI i PPS-Pro ---
    pg.evaluate("Object.assign(state.inputs.kx.makro, { how: 'bottle', per: 'week', n: '7', dose: '10', bottle: '500', V: '100', rows: [{k:'NO3',t:'10',src:'KNO3|0'},{k:'PO4',t:'1',src:'KH2PO4|0'},{k:'K',t:'15',src:'K2SO4|0'},{k:'Mg',t:'3',src:'MgSO4|7'}] }); save()")
    go('kalkulator/makro'); o = OUT()
    assert 'N : P' in o and 'µS/cm' in o and 'TDS' in o, o
    pg.click('summary:has-text("Jak to wypada przy EI i PPS-Pro")'); o = OUT(); assert 'U Ciebie' in o and 'PPS-Pro' in o, o
    pg.click('.kx-seg >> text=Na sucho'); pg.wait_for_timeout(200); o = OUT()
    assert 'Wsyp do akwarium przy każdej dawce' in o and '0,23' in o and pg.locator('input[aria-label="Butelka"]').count() == 0, o  # KNO₃ 1,6306 g / 7
    pg.click('.kx-seg >> text=Z butelki'); pg.wait_for_timeout(200); assert '11,6' in OUT()
    # --- forma uwodnienia także poza kalkulatorem: korekta parametrów, edytor receptury ---
    pg.evaluate("setAdv(true)"); go('woda/korekta')
    pg.select_option('select[aria-label="Źródło Mg"]', 'MgSO4|0'); pg.wait_for_timeout(200); assert pg.evaluate("state.inputs.korekta.src.Mg") == 'salt:MgSO4|0'
    go('nawozy/receptury/' + pg.evaluate("state.recipes.find(r => r.name === 'Test NPK').id")); assert 'MgSO4|7' in pg.evaluate("[...document.querySelectorAll('select')].map(s => s.value)")
    pg.evaluate("setAdv(false)")
    # --- stare linki i ostatnio używana sekcja ---
    go('kalkulator/gotowe'); go('zbiornik'); go('kalkulator'); assert pg.evaluate("location.hash") == '#/kalkulator/gotowe'
    go('nawozy/mikro'); assert pg.evaluate("location.hash") == '#/kalkulator/mikro'
    go('nawozy/gotowe'); assert pg.evaluate("location.hash") == '#/kalkulator/gotowe'
    rid = pg.evaluate("state.recipes[0].id"); assert 'Przepis' in go('nawozy/receptury/' + rid)
    go('kalkulator/receptury/' + rid); assert 'Odważ do butelki' in OUT()
    # --- telefon 360 px, tryb ciemny ---
    pg.set_viewport_size({'width': 360, 'height': 740})
    for theme in ['light', 'dark']:
        pg.evaluate(f"document.documentElement.dataset.theme = '{theme}'")
        for r in ['makro', 'mikro', 'gotowe', 'receptury', 'receptury/pmdd', 'receptury/sprawdz', 'historia']: go('kalkulator/' + r)
    # cele dotyku ≥ 44 px (przyciski i pola w formularzu kalkulatora)
    small = pg.evaluate("[...document.querySelectorAll('.kx-form input, .kx-form select, .kx-nav a, .kx-x:not(.small), .kx-out .btn')].filter(e => e.getBoundingClientRect().height && e.getBoundingClientRect().height < 40).map(e => e.outerHTML.slice(0, 80))")
    assert not small, small
    pg.evaluate("document.documentElement.dataset.theme = 'light'")
    assert not errors, errors
    ctx.close()
    # --- offline: Service Worker serwuje aplikację bez sieci ---
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300); pg.evaluate("navigator.serviceWorker.ready.then(() => 1)"); pg.wait_for_timeout(800); pg.reload(); pg.wait_for_timeout(500)
    # --- Przepisy: gotowy nawóz (Intermag Mikro Plus) jako składnik receptury i w „Sprawdź butelkę” ---
    pid = pg.evaluate("allProducts().find(p => p.name === 'Intermag Mikro Plus').id"); n0 = pg.evaluate("state.recipes.length")
    go('nawozy/receptury/nowa'); pg.click('button:has-text("+ Gotowy nawóz")'); pg.wait_for_timeout(150)
    pg.select_option('select[aria-label="Składnik 2"]', 'p:' + pid); pg.wait_for_timeout(150)
    for i, v in [(0, '10'), (1, '20')]: f = pg.locator('.ritem').nth(i).locator('input').first; f.fill(v); f.dispatch_event('input')
    assert 'w ml' in pg.text_content('.ritem >> nth=1')
    pg.click('button:has-text("Zapisz przepis")'); pg.wait_for_timeout(300)
    r = pg.evaluate("state.recipes[state.recipes.length - 1]"); assert pg.evaluate("state.recipes.length") == n0 + 1 and r['items'][1]['fert']['name'] == 'Intermag Mikro Plus' and r['items'][1]['g'] == 20, r
    pg.evaluate("kxState().rec = { bottle: '500', dose: '10', n: '7', _for: '%s' }; tank().V = 100; save()" % r['id']); go('kalkulator/receptury/' + r['id']); o = OUT()
    assert '20 ml' in o and 'Fe 0,094' in o and 'g lub ml' in o, o[:600]  # 23,6 g/l × 20 ml / 500 ml × 10 ml / 100 l
    pg.evaluate("location.reload()"); pg.wait_for_timeout(400); assert pg.evaluate("state.recipes.find(x => x.id === '%s').items[1].fert.ppm.Fe" % r['id']) == 23.6
    go('kalkulator/receptury/sprawdz'); pg.click('button:has-text("+ Gotowy nawóz")'); pg.wait_for_timeout(150)
    pg.select_option('select[aria-label="Składnik 2"]', 'p:' + pid); pg.wait_for_timeout(150); fill('input[aria-label="Ilość 2"]', '600'); pg.dispatch_event('input[aria-label="Ilość 2"]', 'input'); pg.wait_for_timeout(150)
    assert 'Płynnych nawozów jest 600 ml' in OUT(), OUT()[:400]
    pg.evaluate("kxState().rec = {}; state.recipes = state.recipes.filter(x => x.id !== '%s'); save()" % r['id'])
    ctx.set_offline(True); pg.goto(URL + '#/kalkulator/makro'); pg.wait_for_timeout(500)
    assert 'Odważ do butelki' in pg.text_content('#main'), 'offline: ' + pg.inner_text('body')[:300]
    ctx.close(); b.close()
    assert not errors, errors
print('E2E kalkulator 7.0 OK')

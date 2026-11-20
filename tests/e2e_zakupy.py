"""E2E 7.11: od nawozu do listy zakupów bez szafki (Chromium: telefon 390×844 z dotykiem, potem komputer 1280×900).
Czysty start → Nawozy z soli → przepis od razu → lista zakupów z ilościami → „mam” → kopiowanie → łączna lista z sumą (Nawóz + PPS-Pro + mineralizacja),
migracja dawnej szafki, mineralizacja z Mg z nawozu, brak poziomego przewijania. Uruchom: python3 tests/e2e_zakupy.py [katalog_na_zrzuty]"""
import sys, os, threading, http.server, functools, re
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8771), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8771/app.html'
errors = []

def run(b, name, vp, mobile):
    ctx = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale='pl-PL', permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(name + ': ' + str(e))); pg.on('console', lambda m: m.type == 'error' and errors.append(name + ': ' + m.text))
    shot = lambda n: SHOTS and pg.screenshot(path=os.path.join(SHOTS, f'{name}-{n}.png'), full_page=True)
    OUT = lambda: pg.text_content('.kx-out')
    def go(h):
        pg.evaluate("h => go(h)", h); pg.wait_for_timeout(300)
        sw = pg.evaluate('document.documentElement.scrollWidth'); vw = pg.evaluate('window.innerWidth'); assert sw <= vw, (name, h, sw, vw)
        return pg.text_content('#main')
    clip = lambda: pg.evaluate("navigator.clipboard.readText()")

    # czysty start: bez szafki i bez listy posiadanych – przepis i lista zakupów od razu
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("() => { tank().V = 100; save(); }")
    t = go('kalkulator/nawoz')
    assert 'Sole do nawozu' in t and 'Co masz w szafce' not in t and 'można go zostawić' in t, t[:600]
    o = OUT(); assert 'Twój przepis' in o and 'Składniki nawozu' in o and 'do kupienia: 5 z 5' in o, o[:900]
    assert pg.evaluate("kxState().owned.length") == 0, 'czysty start – nic nie jest „posiadane”'
    rows = pg.evaluate("[...document.querySelectorAll('.kx-out .shop-card .shop-row')].map(r => r.textContent)")
    assert len(rows) == 5 and any('KNO₃' in r and 'saletra potasowa' in r and ' g' in r for r in rows) and any('Plantex CSM+B' in r for r in rows), rows
    # ilości na liście = ilości w butelkach
    kno3_bottle = pg.evaluate("[...document.querySelectorAll('.kn-bottle tr')].find(r => r.querySelector('th').textContent === 'KNO₃').querySelector('td').textContent")
    kno3_shop = pg.evaluate("[...document.querySelectorAll('.shop-card .shop-row')].find(r => r.querySelector('b').textContent === 'KNO₃').querySelector('.shop-q').textContent")
    assert kno3_bottle == kno3_shop, (kno3_bottle, kno3_shop)
    shot('01-nawoz')
    # 7.13: lista zakupów w zakładce „Zakupy” wyniku
    pg.click('.kn-tabs button:has-text("Składniki")'); pg.wait_for_timeout(150)
    assert pg.evaluate("document.querySelector('#knp-z').hidden") is False and pg.evaluate("document.querySelector('#knp-p').hidden") is True
    # „mam” – oznacza, nie zmienia przepisu; kopiowanie bez posiadanych
    before = pg.text_content('.kn-bottle')
    pg.locator('.kx-out .shop-card input[aria-label="Mam: KNO₃"]').check(); pg.wait_for_timeout(200)
    assert 'do kupienia: 4 z 5' in OUT() and pg.text_content('.kn-bottle') == before, 'przepis bez zmian'
    assert pg.evaluate("kxState().owned") == ['KNO3|0']
    pg.click('.kx-out .shop-card button:has-text("Kopiuj listę")'); pg.wait_for_timeout(200); c = clip()
    assert c.startswith('Do kupienia – Nawóz') and 'KH₂PO₄ – fosforan monopotasowy (MKP):' in c and '- KNO₃' not in c and 'Mam już: KNO₃' in c, c
    # przepis działa też bez żadnej zaznaczonej soli magnezu – kalkulator nie zależy od listy
    pg.locator('input[aria-label="MgSO₄·7H₂O – siarczan magnezu, sól gorzka"]').uncheck(); pg.wait_for_timeout(200); o = OUT()
    assert 'Brakuje źródła dla: Mg' in o and 'Składniki nawozu' in o and 'MgSO₄' not in pg.text_content('.kx-out .shop-card'), o[:500]
    pg.locator('input[aria-label="MgSO₄·7H₂O – siarczan magnezu, sól gorzka"]').check(); pg.wait_for_timeout(200)
    # wspólna lista: Nawóz + PPS-Pro (KNO₃ w obu – suma)
    pg.click('.kx-out .shop-card button:has-text("Dodaj do łącznej listy")'); pg.wait_for_timeout(200)
    assert 'Łączna lista (1)' in pg.text_content('.kx-out .shop-card') and 'Zaktualizuj na łącznej liście' in pg.text_content('.kx-out .shop-card')
    go('kalkulator/nawoz'); assert 'Łączna lista zakupów: 1 nawóz' in pg.text_content('#main')
    q1 = pg.evaluate("state.inputs.kx.shop.lists[0].items.find(i => i.mat === 'KNO3').g")
    t = go('kalkulator/receptury/ppspro'); o = OUT(); assert 'Lista potrzebnych zakupów' in o and 'Ilości na butelkę 500 ml' in o, o[:500]
    pg.click('.kx-out .shop-card button:has-text("Dodaj do łącznej listy")'); pg.wait_for_timeout(200)
    t = go('kalkulator/zakupy'); assert pg.evaluate("document.querySelector('.kx-nav a.on').textContent") == 'Nawozy z soli'
    assert 'Łączna lista potrzebnych zakupów' in t and 'PPS-Pro (makro)' in t and 'Nawóz – ' in t, t[:600]
    q2 = pg.evaluate("state.inputs.kx.shop.lists[1].items.find(i => i.mat === 'KNO3').g")
    kno3 = pg.evaluate("[...document.querySelectorAll('.shop-row')].find(r => r.querySelector('b').textContent === 'KNO₃')")
    sumtxt = pg.evaluate("[...document.querySelectorAll('.shop-row')].find(r => r.querySelector('b').textContent === 'KNO₃').textContent")
    want = pg.evaluate("x => gfmt(x)", q1 + q2); assert want + ' g' in sumtxt and 'do: Nawóz' in sumtxt and 'PPS-Pro' in sumtxt, (sumtxt, want)
    assert pg.locator('.shop-row:has(b:text-is("KNO₃"))').count() == 1, 'jeden wiersz na składnik'
    # inna forma uwodnienia na liście „mam”: MgSO₄ bezwodny zamiast 7H₂O (PPS-Pro 20 g × 120,37 / 246,47 = 9,77 g)
    go('kalkulator/receptury/ppspro'); pg.locator('.kx-out .shop-card input[aria-label="Mam: MgSO₄·7H₂O"]').check(); pg.wait_for_timeout(200)
    pg.evaluate("kxState().owned = kxState().owned.filter(c => !c.startsWith('MgSO4')).concat('MgSO4|0'); save(); render()"); pg.wait_for_timeout(300)
    assert 'masz bezwodny – 9,77 g' in pg.text_content('.kx-out .shop-card'), pg.text_content('.kx-out .shop-card')
    # Przepisy: lista pokazuje „do kupienia” dopiero, gdy coś jest na liście „mam”
    go('kalkulator/receptury'); assert 'do kupienia:' in pg.text_content('.kr-list')
    # mineralizacja z magnezem z nawozu: suma woda + nawóz trzyma GH
    go('kalkulator/mineral'); pg.fill('input[aria-label="Ile wody RO przygotowujesz"]', '20'); pg.wait_for_timeout(200)
    mg0 = pg.evaluate("[...document.querySelectorAll('.kn-bottle tr')].find(r => r.textContent.includes('MgSO₄')).querySelector('td').textContent")
    pg.select_option('select[aria-label="Nawóz z wapniem lub magnezem"]', 'nawoz'); pg.wait_for_timeout(300); o = OUT()
    assert 'Twardość w akwarium' in o and 'GH 6 °dH · KH 3 °dH' in o and 'Twój nawóz z soli' in o and 'Woda do podmianGH 4,5 °dH' in o and 'zakup' not in pg.text_content('.kn-target'), o[:900]
    assert 'null' not in pg.text_content('.kx-form'), 'krok 4 bez napisu null'
    pg.select_option('select[aria-label="Nawóz z wapniem lub magnezem"]', ''); pg.wait_for_timeout(200); assert 'null' not in pg.text_content('.kx-form') and 'Woda po przygotowaniu' in OUT()
    pg.select_option('select[aria-label="Nawóz z wapniem lub magnezem"]', 'nawoz'); pg.wait_for_timeout(200); o = OUT()
    assert 'Gips wsyp prosto do całej porcji' in o and 'Pozostałe sole (MgSO₄·7H₂O, KHCO₃)' in o and 'Powinno wyjść ok. GH 4,5 °dH i KH 3 °dH' in o, o
    mg1 = pg.evaluate("[...document.querySelectorAll('.kn-bottle tr')].find(r => r.textContent.includes('MgSO₄')).querySelector('td').textContent")
    assert float(mg1.split()[0].replace(',', '.')) < float(mg0.split()[0].replace(',', '.')), (mg0, mg1)
    assert 'Potrzebne sole' in o and 'Ilości na jedną porcję: 20 l' in o
    pg.click('.kx-out .shop-card button:has-text("Dodaj do łącznej listy")'); pg.wait_for_timeout(200); shot('02-mineral')
    t = go('kalkulator/zakupy'); assert 'Mineralizacja 20 l' in t and pg.evaluate("state.inputs.kx.shop.lists.length") == 3
    pg.click('button:has-text("Kopiuj listę")'); pg.wait_for_timeout(200); c = clip(); assert c.startswith('Do kupienia (') and 'gips' in c, c
    shot('03-wspolna')
    pg.click('button[aria-label^="Usuń z listy: PPS-Pro"]'); pg.wait_for_timeout(300); assert pg.evaluate("state.inputs.kx.shop.lists.length") == 2
    pg.on('dialog', lambda d: d.accept()); pg.click('button:has-text("Wyczyść listę")'); pg.wait_for_timeout(300)
    assert 'Lista jest pusta' in pg.text_content('#main') and 'Łączna lista zakupów:' not in go('kalkulator/nawoz')

    # migracja: dawna szafka zmieniona przez użytkownika → lista „mam już”; sam zestaw domyślny → pusta lista
    pg.evaluate("() => { const s = kxState(); delete s.owned; s.nawoz.have = ['KNO3|0', 'KCl|0', 'MgSO4|0']; save(); }"); go('kalkulator/nawoz')
    assert pg.evaluate("kxState().owned") == ['KNO3|0', 'KCl|0', 'MgSO4|0'], pg.evaluate("kxState().owned")
    pg.evaluate("() => { const s = kxState(); delete s.owned; s.nawoz.have = [...KN_HAVE_DEF]; save(); }"); go('kalkulator/nawoz')
    assert pg.evaluate("kxState().owned") == []
    # Gotowe nawozy: rodzaj makro to NPK
    go('kalkulator/gotowe'); pg.click('.kg-sel button:has-text("Zmień nawóz")'); pg.wait_for_timeout(150); t = pg.text_content('#main'); assert 'Makro (NPK)' in t and 'Makro (N, P)' not in t
    pg.click('.kx-form button:has-text("Anuluj")'); pg.wait_for_timeout(150)
    # Gotowe nawozy: wpisana dawka producenta zostaje przy nawozie po przełączeniu nawozu i trybu
    pick = lambda i: (pg.click('.kg-sel button:has-text("Zmień nawóz")'), pg.click(f'.kg-item >> nth={i}'), pg.wait_for_timeout(200))
    pick(1); pg.click('.kx-seg[aria-label="Tryb"] >> text=Dawka producenta'); pg.wait_for_timeout(200)
    lab = lambda l: pg.locator(f'.kx-form label:has(span.lbl:text-is("{l}")) input')
    lab('Producent zaleca').fill('4'); lab('na').fill('50'); lab('Razy w tygodniu').fill('2'); pg.wait_for_timeout(200)
    pick(2); pick(1)
    pg.click('.kx-seg[aria-label="Tryb"] >> text=Moja dawka'); pg.click('.kx-seg[aria-label="Tryb"] >> text=Dawka producenta'); pg.wait_for_timeout(200)
    assert [lab(x).input_value() for x in ['Producent zaleca', 'na', 'Razy w tygodniu']] == ['4', '50', '2'] and OUT().startswith('Dawkuj8 ml2 razy w tygodniu'), OUT()[:200]  # 4 ml na 50 l → 8 ml na 100 l
    # tryb PRO: przełącznik tylko w Narzędziach, które są dostępne z Zaawansowanych
    t = go('info'); assert 'Prosty' not in t
    go('kalkulator/zaawansowane'); assert 'Tryb PRO' in pg.text_content('#main') and pg.text_content('#main').count('Korekta parametrów akwarium') == 1
    ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    run(b, 'tel', {'width': 390, 'height': 844}, True)
    run(b, 'pc', {'width': 1280, 'height': 900}, False)
    b.close()
srv.shutdown()
assert not errors, errors
print('OK e2e_zakupy')

# Pierwsze uruchomienie (pusty stan), brak przewijania w poziomie, brak błędów JS – telefon 360 px i desktop, jasny i ciemny motyw.
import os, sys
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app.html'))
ROUTES = ['kalkulator', 'zbiornik', 'zbiornik/profil', 'zbiornik/plan', 'dziennik', 'narzedzia', 'woda/kumulacja', 'woda/co2', 'nawozy/odpowiednik', 'woda/podmianapro', 'pomoc/rosliny', 'pomoc/glony', 'nawozy/moje', 'info', 'slownik']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for w, theme in [(360, 'light'), (360, 'dark'), (1280, 'light')]:
        pg = b.new_page(viewport={'width': w, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(300)
        for r in ROUTES:
            pg.goto(URL + '#/' + r); pg.wait_for_timeout(150); pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
            sw = pg.evaluate('document.documentElement.scrollWidth'); assert sw <= w, (r, w, sw)
            t = pg.inner_text('#main'); assert 'null' not in t.split() and 'undefined' not in t and 'Nie udało się wyświetlić' not in t, (r, t[:300])
        assert not errs, errs
        pg.goto(URL + '#/zbiornik'); pg.wait_for_timeout(150); t = pg.inner_text('#main')
        assert 'Pierwsze kroki' in t and 'Ustaw objętość' in t, t[:400]
        pg.goto(URL + '#/dziennik'); pg.wait_for_timeout(150); assert 'Dziennik jest pusty' in pg.inner_text('#main')
        pg.goto(URL + '#/kalkulator'); pg.wait_for_timeout(150); t = pg.inner_text('#main')
        assert 'Nawozy z soli' in t and 'Mineralizacja wody' in t and 'Twój przepis' in pg.text_content('#main'), t[:400]
        pg.close()
    # własna sól: bezwodny MgSO4 → wymagane potwierdzenie
    pg = b.new_page(viewport={'width': 390, 'height': 844}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + '#/nawozy/moje'); pg.wait_for_timeout(300); pg.evaluate('editSalt(null)'); pg.wait_for_timeout(150)
    pg.fill('.sheet input[aria-label="Nazwa"]', 'Test MgSO4'); pg.fill('.sheet input[aria-label="Wzór"]', 'MgSO4')
    sels = pg.query_selector_all('.sheet select[aria-label="Składnik"]'); sels[0].select_option('Mg'); pg.click('.sheet >> text=+ Składnik'); pg.wait_for_timeout(100)
    pg.query_selector_all('.sheet select[aria-label="Składnik"]')[1].select_option('SO4'); pg.fill('.sheet input[aria-label="Wzór"]', 'MgSO4'); pg.wait_for_timeout(150)
    t = pg.inner_text('.sheet'); assert '7H₂O' in t and 'Sprawdziłem' in t, t
    pg.click('.sheet >> text=Zapisz'); pg.wait_for_timeout(150); assert pg.evaluate('state.salts.length') == 0
    pg.check('#salt-ok'); pg.click('.sheet >> text=Zapisz'); pg.wait_for_timeout(150); assert pg.evaluate('state.salts.length') == 1
    # eksport bazy nawozów
    with pg.expect_download() as dl:
        pg.click('summary >> text=Przenieś bazę nawozów'); pg.click('text=Zapisz do pliku')
    import json; d = json.load(open(dl.value.path())); assert d['type'] == 'akwarysta-nawozy' and len(d['salts']) == 1
    # test przed podmianą
    pg.evaluate("TASKS().length = 0; TASKS().push({id:'w1',kind:'water',name:'Podmiana wody',mode:'days',days:[0],start:todayKey()}); save()")
    pg.goto(URL + '#/zbiornik/plan'); pg.wait_for_timeout(200); pg.click('text=Dodaj do planu'); pg.wait_for_timeout(150)
    assert any(k['kind'] == 'test' and k['days'] == [6] for k in pg.evaluate('TASKS()'))
    assert not errs, errs
    b.close()
print('UX OK')

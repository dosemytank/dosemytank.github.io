"""Test E2E (Chromium, emulacja telefonu 390x844, dotyk). Uruchom: python3 tests/e2e_mobile.py [katalog_na_zrzuty]
Wymaga: pip install playwright && playwright install chromium. Serwuje katalog projektu na porcie 8765."""
import json, sys, os, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()

D = 86400000
now = int(time.time() * 1000)
def ev(days_ago, **kw):
    ts = now - days_ago * D; d = time.strftime('%Y-%m-%d', time.localtime(ts / 1000)); return {'id': f'e{days_ago}{len(kw)}{kw.get("type")}', 'ts': ts, 'date': d, **kw}
events = []
for w in range(5):
    a = 35 - w * 7
    events += [ev(a, type='measure', NO3=12 + w * 4, PO4=0.8, K=12, pH=6.8, KH=4, GH=7, Mg=6, Ca=25),
               ev(a - 1, type='dose', pid='u1', name='Mój NPK', amount=10, unit='ml', ppm={'NO3': 3.3, 'K': 2.1, 'PO4': 0.2}),
               ev(a - 3, type='dose', pid='u1', name='Mój NPK', amount=10, unit='ml', ppm={'NO3': 3.3, 'K': 2.1, 'PO4': 0.2}),
               ev(a - 5, type='dose', pid='u1', name='Mój NPK', amount=10, unit='ml', ppm={'NO3': 3.3, 'K': 2.1, 'PO4': 0.2}),
               ev(a - 6, type='water', liters=30, frac=0.3)]
V3 = {'v': 3, 'active': 't1', 'theme': 'auto', 'adv': False, 'inputs': {}, 'seg': {},
      'tanks': [{'id': 't1', 'name': 'Hi-tech 112', 'V': 112, 'change': 30, 'type': 'plant_hi', 'targets': {'NO3': [10, 25], 'Mg': [5, 15]}, 'tap': {'NO3': 6}, 'uptake': {}},
                {'id': 't2', 'name': 'Krewetki', 'V': 30, 'change': 20, 'type': 'shrimp_neo', 'targets': {}, 'tap': {}, 'uptake': {}}],
      'events': {'t1': events, 't2': []}, 'tasks': {'t1': [{'id': 'k1', 'kind': 'water', 'name': 'Podmiana', 'mode': 'days', 'days': [0], 'start': '2026-01-01'}], 't2': []},
      'products': [{'id': 'u1', 'name': 'Mój NPK', 'unit': 'ml', 'source': 'recipe', 'ppm': {'NO3': 36.8, 'K': 23.2, 'PO4': 2.2}, 'recipe': {'bottle': 500, 'grams': {'KNO3': 30, 'KH2PO4': 1.6, 'MGSO4_7': 12}}}]}

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True, locale='pl-PL')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append('console: ' + m.text))
    pg.goto('http://127.0.0.1:8765/app.html')
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('akwa.v3', s); }", json.dumps(V3))
    pg.reload(); pg.wait_for_timeout(600)
    st = pg.evaluate("JSON.parse(localStorage.getItem('akwa.v4'))")
    assert st['v'] == 4 and len(st['recipes']) == 1 and st['recipes'][0]['items'][2]['hyd'] == 7, 'migracja v3→v4'
    assert pg.evaluate("localStorage.getItem('akwa.v3') !== null"), 'stary klucz zachowany'
    OPEN = lambda: pg.evaluate("document.querySelectorAll('.srcbox').forEach(d => d.open = true)")  # sole są w składanym bloku
    shot = lambda n: SHOTS and pg.screenshot(path=os.path.join(SHOTS, n + '.png'), full_page=True)
    T = lambda: pg.evaluate("(() => { const c = document.querySelector('#main').cloneNode(true); c.querySelectorAll('select').forEach(x => x.remove()); document.body.append(c); const t = c.innerText; c.remove(); return t; })()")
    def go(h):
        pg.evaluate(f"location.hash = '#/{h}'"); pg.wait_for_timeout(250)
        txt = T(); assert 'Coś poszło nie tak' not in txt, h + ': ' + txt[:300]; return txt
    # tryb prosty
    for h in ['kalkulator', 'zbiornik/panel', 'dziennik/historia', 'dziennik/wykresy', 'dziennik/analiza', 'dziennik/asystent', 'zbiornik/profil', 'zbiornik/plan', 'narzedzia', 'nawozy/kreator', 'nawozy/moje',
              'nawozy/sole', 'woda/korekta', 'woda/sprawdz', 'woda/podmiana', 'woda/co2', 'pomiary/objetosc', 'info', 'slownik']: go(h)
    # ekran startowy = kalkulator (7.0: sekcje Makro/Mikro/Gotowe/Receptury/Historia; szczegóły – tests/e2e_kalkulator.py)
    pg.evaluate("tank().tap = {}; save(); location.hash = ''"); pg.wait_for_timeout(250); t = T()
    assert pg.evaluate('location.hash').startswith('#/kalkulator/') and 'Nawozy z soli' in t and 'Mineralizacja wody' in t and 'Przepisy' in t and 'Twój przepis' in t, t[:400]
    assert not pg.is_visible('#tankBtn')
    go('kalkulator/makro'); pg.fill('input[aria-label="Woda w akwarium"]', '100'); pg.wait_for_timeout(200); t = pg.text_content('.kx-out')
    for v in ['11,6', '1,02', '13,2', '21,7']: assert v in t, v + ' ' + t[:900]
    shot('01-kalkulator-makro')
    pg.evaluate("Object.assign(state.inputs.kx.gotowe, { pid: 'b20', way: 'dose', ldose: '1', n: '7' }); save()"); go('kalkulator/gotowe')
    pg.click('text=Dodaj do planu nawożenia'); pg.wait_for_timeout(150); assert any(x['pid'] == 'b20' for x in pg.evaluate("tank().fplan"))
    shot('01e-gotowe')
    assert 'Woda' in go('zbiornik/panel') and 'Ustawienia' in go('start') and 'Nawozy' in go('zbiornik')
    # tryb PRO
    pg.evaluate("setAdv(true)")
    for h in ['woda/mineral', 'woda/kwas', 'woda/kumulacja', 'pomiary/miareczkowanie', 'pomiary/jednostki',
              'nawozy/moje', 'woda/podmianapro']: go(h)
    go('zbiornik/panel'); shot('02-panel-pro')
    # stare adresy usuniętych ekranów prowadzą do kalkulatora
    for h in ['nawozy/mikro', 'nawozy/gotowe']: go(h); assert pg.evaluate("document.body.dataset.sec") == 'kalkulator', h
    # PMDD i EI – w Recepturach (7.0)
    t = go('kalkulator/receptury/pmdd'); assert 'kwasu solnego' in pg.text_content('.kx-out'); shot('03-pmdd')
    # zrób sam odpowiednik: Seachem Flourish → 2 butelki, porównanie, zapis receptur (7.15: bez cen soli)
    pid = pg.evaluate("allProducts().find(p => p.name === 'Seachem Flourish').id")
    pg.evaluate(f"(state.inputs.odp ||= {{}}).pid = '{pid}'; save()"); t = go('nawozy/odpowiednik')
    assert 'Butelka A' in t and 'Butelka B' in t and 'Oryginał a odpowiednik' in t and 'tyle samo ml z każdej butelki' in t, t[:2000]
    assert 'Cena oryginału' not in T() and 'Ceny soli' not in T(); shot('16-odpowiednik')
    n0 = len(pg.evaluate("state.recipes")); pg.click('text=Zapisz jako 2 przepisy'); pg.wait_for_timeout(300)
    assert len(pg.evaluate("state.recipes")) == n0 + 2 and any(r['name'].startswith('Odpowiednik: Seachem Flourish') for r in pg.evaluate("state.recipes"))
    # szybkie wpisy: podmiana i dawka jednym dotknięciem, „Cofnij” usuwa wpis
    pg.evaluate("tank().fplan = [{pid:'u1', amt:10, n:3}]; tank().change = 30; save()"); t = go('zbiornik'); assert 'Szybki wpis' in t, t[:800]
    n0 = len(pg.evaluate("EV()")); pg.click('.quick >> text=Podmiana 30%'); pg.wait_for_timeout(200)
    assert len(pg.evaluate("EV()")) == n0 + 1 and pg.evaluate("EV().slice(-1)[0].type") == 'water'
    pg.click('.toast.undo >> text=Cofnij'); pg.wait_for_timeout(200); assert len(pg.evaluate("EV()")) == n0, 'cofnięcie'
    pg.click('.quick >> text=Mój NPK 10 ml'); pg.wait_for_timeout(200); e = pg.evaluate("EV().slice(-1)[0]"); assert e['type'] == 'dose' and e['amount'] == 10 and e['ppm']['NO3'] > 0; shot('18-szybki-wpis')
    # skład z etykiety: Nutrafin Plant Gro bez azotanów, AquaVitro Carbonate z HCO₃
    assert pg.evaluate("productById('b22').status") == 'label' and 'NO3' not in pg.evaluate("productById('b22').ppm") and pg.evaluate("productById('b9').ppm.HCO3") == 122
    # baner kopii zapasowej na ekranie Akwarium (dużo wpisów, brak kopii) i „Później”
    pg.evaluate("delete state.lastBackup; delete state.backupSnooze; save()"); t = go('zbiornik'); assert 'Zrób kopię zapasową' in t, t[:600]; shot('17-baner-kopii')
    pg.click('.card.backup >> text=Później'); pg.wait_for_timeout(150); assert 'Zrób kopię zapasową' not in T()
    # narastanie soli: domyślnie SO₄, pobór 0
    t = go('woda/kumulacja'); assert 'Ustali się na' in t and 'SO₄' in t and pg.evaluate("state.inputs.kum.use") in ('0', 0), t[:900]
    # własna sól
    go('nawozy/moje'); pg.click('summary >> text=Własne sole'); pg.click('text=+ Własna sól'); pg.fill('.sheet input[aria-label="Nazwa"]', 'Fosforan dipotasowy 3H2O')
    pg.fill('.sheet input[aria-label="Wzór"]', 'K2HPO4·3H2O'); pg.wait_for_timeout(100)
    assert '228,2' in pg.inner_text('.sheet'), 'M K2HPO4·3H2O'
    pg.select_option('.sheet select >> nth=0', 'K'); pg.fill('.sheet input[aria-label="Liczba"] >> nth=0', '2')
    pg.click('.sheet >> text=+ Składnik'); pg.select_option('.sheet select >> nth=1', 'PO4'); pg.fill('.sheet input[aria-label="Liczba"] >> nth=1', '1')
    pg.click('.sheet >> text=Zapisz'); pg.wait_for_timeout(200)
    assert any(s['name'].startswith('Fosforan dipotasowy') for s in pg.evaluate("state.salts")), 'własna sól zapisana'
    # receptura: nowa
    go('nawozy/receptury/nowa'); pg.fill('input[aria-label="Nazwa"]', 'Makro E2E'); pg.fill('input[aria-label="Objętość końcowa"]', '500')
    pg.fill('input[aria-label="Masa"] >> nth=0', '30'); pg.click('#main >> text=+ Dodaj sól'); pg.fill('input[aria-label="Masa"] >> nth=1', '5'); pg.wait_for_timeout(150)
    t = T(); assert '36,8' in t and '6,98' in t, 'stężenia NO3 36,8 i PO4 6,98 g/l'
    shot('04-receptura')
    pg.click('text=Zapisz przepis'); pg.wait_for_timeout(300)
    rs = pg.evaluate("state.recipes"); r = [x for x in rs if x['name'] == 'Makro E2E'][0]
    assert any(p['rid'] == r['id'] for p in pg.evaluate("state.products") if 'rid' in p), 'nawóz z receptury'
    # edycja i duplikat
    pg.fill('input[aria-label="Masa"] >> nth=0', '25'); pg.click('text=Zapisz przepis'); pg.wait_for_timeout(200)
    assert [x for x in pg.evaluate("state.recipes") if x['id'] == r['id']][0]['items'][0]['g'] == 25, 'edycja'
    pg.click('.btnrow.sticky >> text=Duplikuj'); pg.wait_for_timeout(300); assert any(x['name'] == 'Makro E2E (kopia)' for x in pg.evaluate("state.recipes")), 'duplikat'
    go('nawozy/receptury/' + r['id']); pg.click('.btnrow.sticky >> text=Przygotowałem'); pg.click('.sheet >> text=Zapisz'); pg.wait_for_timeout(200)
    assert len(pg.evaluate("state.batches")) == 1, 'historia partii'; go('nawozy/moje'); assert 'Makro E2E' in T(); shot('05-receptury-lista')
    # korekta
    go('woda/korekta'); pg.click('text=Ostatnie pomiary'); pg.wait_for_timeout(200)
    pg.fill('input[aria-label="Cel"] >> nth=0', '35'); pg.fill('input[aria-label="Cel"] >> nth=2', '20'); pg.wait_for_timeout(200)
    t = T(); assert 'po dodaniu' in t.lower() and 'KNO₃' in t, t[-900:]; shot('06-korekta')
    # podmiana pro → korekta
    go('woda/podmianapro'); pg.click('text=Ostatnie pomiary'); pg.wait_for_timeout(150)
    pg.click('.chip >> text="Kranówka + RO"'); pg.wait_for_timeout(100); pg.fill('input[aria-label="Udział RO"]', '70')
    pg.click('summary >> text=GH, KH, Na, Cl, SO₄'); pg.fill('input[aria-label="Kranówka GH"]', '18'); pg.fill('input[aria-label="Kranówka KH"]', '12'); pg.fill('input[aria-label="Kranówka NO₃"]', '8'); pg.wait_for_timeout(200)
    assert pg.evaluate("tank().water") == 'mix' and pg.evaluate("tank().tap.GH") == 18
    pg.click('text=+ Mineralizator'); pg.wait_for_timeout(100); pg.fill('.ritem input[aria-label="Ilość"]', '1'); pg.wait_for_timeout(200)
    t = T(); assert 'po podmianie' in t.lower() and 'GH +' in t, t[-800:]; shot('07-podmiana-pro')
    pg.click('text=Korekta po podmianie →'); pg.wait_for_timeout(300); assert 'po podmianie' in T()
    # objętość → profil
    go('pomiary/objetosc'); pg.click('text=Zapisz w profilu'); pg.wait_for_timeout(150); assert abs(pg.evaluate("tank().V") - 46.4) < 0.05
    # wnioski w Dzienniku; brak szacowania zużycia
    t = go('dziennik/asystent'); assert 'Wnioski' in t and 'Co sprawdzić najpierw' in t and 'Szacowane' not in t and 'Asystent' not in t and 'szacunek' not in t, t[:1200]; shot('08-wnioski')
    t = go('zbiornik/profil'); assert 'Zużycie składników' not in t
    t = go('zbiornik/nawozenie'); assert 'W wodzie do ok' not in t
    # produkt bez składu
    go('nawozy/moje'); pg.click('text=+ Gotowy nawóz'); pg.fill('.sheet input[aria-label="Nazwa"]', 'QualDrop test'); pg.select_option('.sheet select[aria-label="Producent"]', 'QualDrop')
    pg.select_option('.sheet select[aria-label="Status składu"]', 'incomplete'); pg.click('.sheet >> text=Zapisz'); pg.wait_for_timeout(200)
    assert any(p['name'] == 'QualDrop test' and p['status'] == 'incomplete' for p in pg.evaluate("state.products")); shot('09-nawozy')
    # pomiar z Mg i Ca
    pg.click('.addbtn'); pg.click('text=Pomiar wody'); pg.click('.sheet summary'); pg.fill('.sheet input[aria-label="Magnez Mg"]', '7'); pg.fill('.sheet input[aria-label="Wapń Ca"]', '30')
    pg.click('.sheet >> text=Zapisz pomiar'); pg.wait_for_timeout(300); pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x => x.remove())")
    assert any(e.get('Mg') == 7 and e.get('Ca') == 30 for e in pg.evaluate("EV()")), 'Mg/Ca zapisane'
    # kontroler nawożenia: Mój NPK (u1: NO3 36,8 g/l) 10 ml × 3 + Mikro Plus (b20) 5 ml × 2 w 46,4 l
    go('zbiornik/nawozenie'); pg.evaluate("tank().fplan = [{pid:'u1', amt:10, n:3}, {pid:'b20', amt:5, n:2}]; save(); render()"); pg.wait_for_timeout(250); t = T()
    v = 36.8 * 10 * 3 / 46.4; assert ('%.1f' % v).replace('.', ',') in t or ('%.2f' % v).replace('.', ',') in t, ('NO3 %.2f ' % v) + t[:1500]
    assert 'Podane wg dziennika' in t and 'Skąd pochodzą' in t
    pg.select_option('select[aria-label="Dodaj nawóz"]', 'b12'); pg.wait_for_timeout(150); t = T(); assert 'Brak dawki' in t
    shot('12-kontroler')
    # plan: dawki z Nawożenia → odhaczenie zapisuje dawkę
    go('zbiornik/plan'); t = T()
    if 'Dodaj dawki z listy nawozów' in t:
        pg.click('text=Dodaj dawki z listy nawozów'); pg.wait_for_timeout(200)
        n0 = len([e for e in pg.evaluate("EV()") if e.get('type') == 'dose'])
        pg.evaluate("completeTask(TASKS().find(k => k.pid && k.amt))"); pg.wait_for_timeout(200)
        assert len([e for e in pg.evaluate("EV()") if e.get('type') == 'dose' and e.get('taskId')]) >= 1; shot('15-plan')
    go('woda/podmianapro'); pg.wait_for_timeout(200); t = T(); print('  podmiana z nawozami:', 'Z nawozami z planu' in t or 'Dodaj nawozy' in t)
    # diagnostyka roślin: dziury → kilka przyczyn, nie tylko K
    go('pomoc/rosliny'); pg.click('.chip >> text="Dziury w liściach"'); pg.wait_for_timeout(250); t = T()
    assert 'Brak aktualnych pomiarów' not in t and 'Możliwe przyczyny' in t and 'Uszkodzenia przez zwierzęta' in t and 'Za mało potasu' in t, t[:2000]; shot('13-rosliny')
    pg.click('text=Zapisz w dzienniku'); pg.wait_for_timeout(150); assert any(e.get('type') == 'note' and 'Objawy' in e.get('note', '') for e in pg.evaluate("EV()"))
    go('pomoc/glony'); pg.click('.chip >> text="Sinice (śliski, ciemnozielony nalot o zapachu stęchlizny)"'); pg.wait_for_timeout(250); t = T()
    assert 'Nie obcinaj' in t and 'Słaby przepływ' in t, t[:2000]; shot('14-glony')
    # plan → ics
    go('zbiornik/plan')
    with pg.expect_download() as d: pg.click('text=Pobierz do kalendarza (.ics)')
    ics = open(d.value.path(), encoding='utf-8').read(); assert 'BEGIN:VEVENT' in ics and 'RRULE:FREQ=WEEKLY;BYDAY=SU' in ics
    go('zbiornik/profil'); shot('10-profil')
    # ciemny motyw
    pg.evaluate("state.theme='dark'; save(); applyTheme(); render()"); go('woda/korekta'); shot('11-korekta-ciemny')
    # brak poziomego przewijania
    for h in ['kalkulator', 'zbiornik/panel', 'nawozy/sole', 'woda/korekta', 'woda/podmianapro', 'nawozy/receptury/' + r['id'], 'dziennik', 'woda/kumulacja', 'nawozy/odpowiednik', 'zbiornik/profil']:
        go(h); w = pg.evaluate("document.documentElement.scrollWidth"); assert w <= 391, f'{h}: przewijanie w poziomie ({w}px)'
    b.close()
srv.shutdown()
if errors: print('\n'.join(errors)); sys.exit(1)
print('E2E OK')

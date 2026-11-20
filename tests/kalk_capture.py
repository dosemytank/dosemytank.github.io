# Zapis wyników kalkulatora z działającej aplikacji (czarna skrzynka) – podstawa testów regresji przebudowy 7.0.
# Uruchamia app.html w Chromium, dla każdego przypadku ustawia formularz kalkulatora, renderuje ekran i zapisuje
# dokładne liczby z wywołań silnika (planBottle, solution, doseToPpm, derived, solFix) oraz tekst wyniku.
# Użycie: python3 tests/kalk_capture.py [plik_wyjściowy]   (domyślnie tests/fixtures/kalk-capture.json)
# Fixture wersji 6.11 (tests/fixtures/kalk-6.11.json) wygenerowano tym skryptem na commicie 3aee474 – nie nadpisywać.
# Działa tylko z interfejsem 6.11.x (stary kalkulator.js) – od 7.0 regresję liczb sprawdza tests/nawozy-licz.test.js na zapisanym fixture.
import os, sys, json, copy
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
URL = 'file://' + os.path.join(ROOT, 'app.html')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tests', 'fixtures', 'kalk-capture.json')

BASE = {'V': '100', 'bottle': '500', 'dose': '10', 'n': '7', 'mode': 'make', 'preset': '', 'edta': ''}
MAKRO4 = [{'k': 'NO3', 't': '10', 'src': 'KNO3|0'}, {'k': 'PO4', 't': '1', 'src': 'KH2PO4|0'}, {'k': 'K', 't': '15', 'src': 'K2SO4|0'}, {'k': 'Mg', 't': '3', 'src': 'MgSO4|7'}]
def rows(*over, base=MAKRO4):
    r = copy.deepcopy(base)
    for o in over:
        for x in r:
            if x['k'] == o.get('k'): x.update(o); break
        else: r.append(o)
    return r
def C(name, **kw):
    st = {**BASE, **{k: v for k, v in kw.items() if k not in ('click', 'shrimp')}}
    return {'name': name, 'st': st, 'click': kw.get('click'), 'shrimp': kw.get('shrimp', False)}

CASES = [
  # --- Makro ---
  C('makro: przyklad z audytu', rows=MAKRO4),
  C('makro: K z KCl', rows=rows({'k': 'K', 'src': 'KCl|0'})),
  C('makro: MgSO4 bezwodny', rows=rows({'k': 'Mg', 'src': 'MgSO4|0'})),
  C('makro: MgCl2·6H2O', rows=rows({'k': 'Mg', 'src': 'MgCl2|6'})),
  C('makro: z Ca i NH4', rows=rows({'k': 'Ca', 't': '10', 'src': 'CaCl2|2'}, {'k': 'NH4', 't': '0,2', 'src': 'NH4SO4|0'})),
  C('makro: przecinek dziesietny', rows=rows({'k': 'NO3', 't': '12,5'}, {'k': 'PO4', 't': '0,75'})),
  C('makro: 5 l', V='5', rows=MAKRO4),
  C('makro: 2000 l', V='2000', bottle='1000', dose='20', rows=MAKRO4),
  C('makro: K juz przekroczony przez KNO3', rows=rows({'k': 'NO3', 't': '30'}, {'k': 'K', 't': '5'})),
  C('makro: nie rozpusci sie (dawka 2 ml)', dose='2', rows=MAKRO4),
  C('makro: blisko granicy (dawka 5 ml)', dose='5', rows=MAKRO4),
  C('makro: 3 dawki w tygodniu', n='3', rows=MAKRO4),
  C('makro: dawka wieksza niz butelka', bottle='5', dose='10', rows=MAKRO4),
  C('makro: puste cele', rows=[{'k': 'NO3', 't': '', 'src': 'KNO3|0'}]),
  C('makro: male masy', V='20', bottle='100', dose='10', rows=rows({'k': 'PO4', 't': '0,2'})),
  C('makro: MAP i Mg (struwit)', rows=[{'k': 'NH4', 't': '0,5', 'src': 'NH4H2PO4|0'}, {'k': 'Mg', 't': '3', 'src': 'MgSO4|7'}, {'k': 'K', 't': '5', 'src': 'K2SO4|0'}]),
  # --- Mikro ---
  C('mikro: Fe-DTPA 0,1', mode='micro', mrows=[{'k': 'Fe', 't': '0,1', 'src': 'FeDTPA|0'}]),
  C('mikro: Fe-EDTA 0,2', mode='micro', mrows=[{'k': 'Fe', 't': '0,2', 'src': 'FeEDTA|0'}]),
  C('mikro: Fe-EDDHA 0,2', mode='micro', mrows=[{'k': 'Fe', 't': '0,2', 'src': 'FeEDDHA|0'}]),
  C('mikro: sole + Na2EDTA', mode='micro', edta='Na2EDTA', mrows=[{'k': 'Fe', 't': '0,1', 'src': 'FeSO4|7'}, {'k': 'Mn', 't': '0,03', 'src': 'MnSO4|1'}, {'k': 'Zn', 't': '0,01', 'src': 'ZnSO4|7'},
     {'k': 'Cu', 't': '0,003', 'src': 'CuSO4|5'}, {'k': 'B', 't': '0,02', 'src': 'H3BO3|0'}, {'k': 'Mo', 't': '0,002', 'src': 'Na2MoO4|2'}]),
  C('mikro: sole + Na4EDTA', mode='micro', edta='Na4EDTA', mrows=[{'k': 'Fe', 't': '0,1', 'src': 'FeSO4|7'}, {'k': 'Mn', 't': '0,03', 'src': 'MnSO4|1'}]),
  C('mikro: sole bez EDTA', mode='micro', mrows=[{'k': 'Fe', 't': '0,1', 'src': 'FeSO4|7'}, {'k': 'Mn', 't': '0,03', 'src': 'MnSO4|1'}]),
  C('mikro: CSM+B', mode='micro', mrows=[{'k': 'Fe', 't': '0,2', 'src': 'p:b26'}]),
  C('mikro: Rexolin APN', mode='micro', mrows=[{'k': 'Fe', 't': '0,2', 'src': 'p:b31'}]),
  C('mikro: CSM+B + Fe-DTPA na Mn', mode='micro', mrows=[{'k': 'Fe', 't': '0,2', 'src': 'FeDTPA|0'}, {'k': 'Mn', 't': '0,05', 'src': 'p:b26'}]),
  C('mikro: Cu przy krewetkach', mode='micro', shrimp=True, mrows=[{'k': 'Cu', 't': '0,02', 'src': 'CuSO4|5'}]),
  # --- Sprawdź ---
  C('sprawdz: gramy PPS-Pro', mode='check', items=[{'mat': 'K2SO4', 'hyd': 0, 'g': 29}, {'mat': 'KNO3', 'hyd': 0, 'g': 33}, {'mat': 'KH2PO4', 'hyd': 0, 'g': 3}, {'mat': 'MgSO4', 'hyd': 7, 'g': 20}], dose='2,5'),
  C('sprawdz: Ca + PO4 (podzial)', mode='check', items=[{'mat': 'KNO3', 'hyd': 0, 'g': 10}, {'mat': 'KH2PO4', 'hyd': 0, 'g': 1}, {'mat': 'CaCl2', 'hyd': 2, 'g': 5}]),
  C('sprawdz: Fe + PO4 (podzial)', mode='check', items=[{'mat': 'KH2PO4', 'hyd': 0, 'g': 1}, {'mat': 'FeSO4', 'hyd': 7, 'g': 0.5}, {'mat': 'MnSO4', 'hyd': 1, 'g': 0.1}]),
  C('sprawdz: NH4 + Mg + PO4', mode='check', items=[{'mat': 'NH4H2PO4', 'hyd': 0, 'g': 2}, {'mat': 'MgSO4', 'hyd': 7, 'g': 10}]),
  C('sprawdz: nie rozpusci sie', mode='check', items=[{'mat': 'K2SO4', 'hyd': 0, 'g': 80}]),
  C('sprawdz: pusto', mode='check', items=[{'mat': 'KNO3', 'hyd': 0, 'g': 0}]),
  # --- Szybkie przepisy (klik) ---
  *[C('przepis: ' + p, rows=MAKRO4, mrows=[{'k': 'Fe', 't': '0,1', 'src': 'FeDTPA|0'}], click=p) for p in ['EI', 'PPS-Pro', 'PMDD', 'Lekkie', 'Średnie', 'Mocne']],
  # --- Preparaty: własna etykieta ---
  C('etykieta: plyn %, gestosc 1,2', mode='prep', prep={'pid': '__custom', 'way': 'amount', 'el': 'K', 't': '', 'amt': '', 'ldose': '5',
     'lab': {'form': 'liquid', 'dens': '1,2', 'pct': {'N_NO3': '2', 'N_NH4': '0,5', 'N_amid': '0,3', 'P2O5': '1', 'K2O': '5', 'MgO': '1', 'Fe': '0,1', 'SO3': '2'}}}),
  C('etykieta: plyn g/l, cel K', mode='prep', prep={'pid': '__custom', 'way': 'target', 'el': 'K', 't': '10', 'amt': '', 'ldose': '',
     'lab': {'form': 'liquid', 'unit': 'gl', 'dens': '', 'pct': {'K2O': '50', 'P2O5': '5', 'CaO': '3'}}}),
  C('etykieta: proszek, ilosc', mode='prep', prep={'pid': '__custom', 'way': 'amount', 'el': 'Fe', 't': '', 'amt': '3', 'ldose': '',
     'lab': {'form': 'powder', 'dens': '', 'pct': {'Fe': '7', 'Mn': '2', 'Zn': '0,4', 'Cu': '0,1', 'B': '1,3', 'Mo': '0,06'}}}),
  C('etykieta: proszek, cel Fe', mode='prep', prep={'pid': '__custom', 'way': 'target', 'el': 'Fe', 't': '0,2', 'amt': '', 'ldose': '',
     'lab': {'form': 'powder', 'dens': '', 'pct': {'Fe': '13'}}}),
]
# --- Preparaty: każdy wbudowany produkt przy 3 dawkach + cel (gdy jest Fe albo K) ---
PRODS = json.loads(os.popen(f"node -e \"const {{PRODUCTS}}=require('{ROOT}/products.js');console.log(JSON.stringify(PRODUCTS.map((p,i)=>({{id:'b'+i,unit:p.unit,ppm:p.ppm||{{}}}}))))\"").read())
for p in PRODS:
    liq = p['unit'] != 'g'
    for a in (['1', '5', '10'] if liq else ['1', '5', '10']):
        CASES.append(C(f"produkt {p['id']}: ilosc {a}", mode='prep', prep={'pid': p['id'], 'way': 'amount', 'el': 'Fe', 't': '', 'amt': '' if liq else a, 'ldose': a if liq else '', 'lab': {'form': 'liquid', 'dens': '1,2', 'pct': {}}}))
    el = 'Fe' if p['ppm'].get('Fe', 0) > 0 else 'K' if p['ppm'].get('K', 0) > 0 else None
    if el: CASES.append(C(f"produkt {p['id']}: cel {el}", mode='prep', prep={'pid': p['id'], 'way': 'target', 'el': el, 't': '0,2' if el == 'Fe' else '10', 'amt': '', 'ldose': '', 'lab': {'form': 'liquid', 'dens': '1,2', 'pct': {}}}))

HOOK = """() => { if (window.__hooked) return; window.__hooked = 1; window.__log = [];
  const cl = v => JSON.parse(JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x));
  for (const f of ['planBottle', 'solution', 'doseToPpm', 'derived', 'solFix']) { const o = X[f]; X[f] = (...a) => { const r = o(...a); window.__log.push({ f, a: cl(a), r: cl(r) }); return r; }; } }"""
RUN = """(c) => { state.tanks[0].type = c.shrimp ? 'shrimp_neo' : 'plant_mid'; state.active = state.tanks[0].id; state.adv = false;
  state.inputs.kalk = JSON.parse(JSON.stringify(c.st)); state.inputs.kalk._t = tank().id; window.__log.length = 0; render();
  if (c.click) { const b = [...document.querySelectorAll('.presetbar .chip')].find(x => x.textContent.trim() === c.click); window.__log.length = 0; b.click(); }
  const o = document.querySelector('.col-out'); const s = state.inputs.kalk;
  if (!o || document.querySelector('#main').innerText.includes('Nie udało się wyświetlić')) throw new Error('Ekran kalkulatora się nie wyświetlił: ' + c.name);
  return { log: window.__log.slice(), text: o ? o.innerText : '', st: { mode: s.mode, V: s.V, bottle: s.bottle, dose: s.dose, n: s.n, rows: s.rows, mrows: s.mrows, items: s.items, preset: s.preset } }; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1366, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + '#/kalkulator'); pg.wait_for_timeout(400)
    pg.evaluate("() => { if (!state.tanks.length) return; state.tanks[0].V = 100; save(); }")
    pg.evaluate(HOOK)
    res = []
    for c in CASES:
        r = pg.evaluate(RUN, c); res.append({'name': c['name'], 'input': c['st'], 'click': c['click'], 'shrimp': c['shrimp'], **r})
    assert not errs, errs
    b.close()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'app': open(os.path.join(ROOT, 'package.json')).read().split('"version": "')[1].split('"')[0], 'cases': res}, open(OUT, 'w'), ensure_ascii=False, indent=0)
print(f'{len(res)} przypadków → {OUT}')

"""Zrzut tekstu wszystkich ekranów (pusty stan i dane przykładowe) w wybranym języku – regresja systemu tłumaczeń.
Użycie: python3 tests/i18n_snapshot.py pl|en plik.json
- pl: wynik ma być identyczny z zapisem sprzed wprowadzenia i18n (ten sam tekst, te same liczby),
- en: w tekście nie może zostać polski (sprawdza tests/e2e_i18n.py)."""
import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'app.html')
LANG, OUT = sys.argv[1], sys.argv[2]
SEED = """() => {
  localStorage.clear(); initStore();
  const t = tank(); Object.assign(t, { name: 'Hi-tech', V: 112, type: 'plant_hi', change: 40, setup: true, co2: 'yes' });
  const d0 = new Date(2026, 7, 1);
  const day = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return L.dkey(d); };
  const NO3 = [12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26, 28], PO4 = [0.6, 0.7, 0.6, 0.8, 0.9, 0.8, 1, 1.1, 1, 1.2, 1.2, 1.3];
  NO3.forEach((v, i) => { addEvent({ type: 'measure', date: day(i * 7 + 6), NO3: v, PO4: PO4[i], K: 12 + i, KH: 4, GH: 7, pH: 6.6, Fe: 0.1, Mg: 5, Ca: 20 }); addEvent({ type: 'water', date: day(i * 7), pct: 40 }); });
  addEvent({ type: 'note', date: day(80), note: 'test', tags: ['Glony'] });
  state.adv = true; state.inputs.chart = 'NO3'; save();
}"""
EXTRA = ['kalkulator/nawoz', 'kalkulator/gotowe', 'kalkulator/receptury', 'kalkulator/historia', 'kalkulator/zaawansowane', 'kalkulator/makro', 'kalkulator/mikro', 'kalkulator/mineral', 'kalkulator/zakupy', 'kalkulator/receptury/sprawdz', 'nawozy/receptury/nowa']
SHEETS = ['openAdd()', 'openTankSheet()', 'openHelp()']
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for seed in ['empty', 'demo']:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='pl-PL' if LANG == 'pl' else 'en-US', service_workers='block', timezone_id='Europe/Warsaw')
        ctx.add_init_script("try{localStorage.setItem('dmt.lang','%s')}catch(e){}" % LANG)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        # stała data – wyniki „dni temu” itp. nie zależą od dnia uruchomienia
        pg.clock.set_fixed_time('2026-11-20T12:00:00+01:00')
        pg.goto(URL); pg.wait_for_timeout(300)
        if seed == 'demo':
            for _ in range(3):  # zapis po starcie aplikacji bywa opóźniony – powtórz, aż dane przetrwają przeładowanie
                pg.evaluate(SEED); pg.wait_for_timeout(400); pg.evaluate('save()'); pg.reload(); pg.wait_for_timeout(300)
                if pg.evaluate('Object.values(state.events)[0].length') == 25: break
            else: raise SystemExit('nie udało się zapisać danych przykładowych')
        routes = pg.evaluate('Object.keys(PAGES)') + EXTRA
        for r in sorted(set(routes)):
            pg.evaluate("r => { location.hash = '#/' + r; render(); }", r); pg.wait_for_timeout(120)
            out[f'{seed}:{r}'] = pg.inner_text('#main') + '\n@NAV ' + pg.inner_text('#nav') + '\n@TOP ' + pg.inner_text('header.top')
            for i, s in enumerate(SHEETS):
                if r != 'zbiornik': continue
                pg.evaluate(s); pg.wait_for_timeout(120)
                out[f'{seed}:{r}:{s}'] = '\n'.join(pg.eval_on_selector_all('.sheet', 'els => els.map(e => e.innerText)'))
                pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x => x.remove())")
        out[f'{seed}:errors'] = errs
        ctx.close()
    b.close()
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=0)
print(len(out), 'ekranów →', OUT)

"""E2E 7.17: spójność wyglądu – te same komponenty mają te same style na wszystkich ekranach (wzorzec: Kalkulator → Przygotuj nawóz),
w jasnym i ciemnym motywie, na 360 i 1280 px; bez poziomego przewijania. Uruchom: python3 tests/e2e_spojnosc.py [katalog_na_zrzuty]"""
import sys, os, threading, http.server, functools, json
from playwright.sync_api import sync_playwright
import pl_lang  # noqa: F401 – testy polskiej wersji (od 8.0 domyślny jest EN)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/app.html'
ROUTES = ['kalkulator/nawoz', 'kalkulator/mineral', 'kalkulator/gotowe', 'kalkulator/receptury', 'kalkulator/receptury/ppspro', 'kalkulator/historia', 'kalkulator/zaawansowane', 'kalkulator/makro', 'kalkulator/mikro',
          'kalkulator/receptury/sprawdz', 'zbiornik', 'zbiornik/profil', 'zbiornik/plan', 'dziennik', 'nawozy/moje', 'nawozy/odpowiednik', 'woda/korekta', 'woda/podmianapro', 'woda/mineral', 'woda/co2',
          'woda/kwas', 'woda/kumulacja', 'pomiary/objetosc', 'pomiary/jednostki', 'pomiary/miareczkowanie', 'pomoc/rosliny', 'pomoc/glony', 'info', 'slownik']
# komponent → właściwości, które muszą być takie same wszędzie
COMP = {
  'karta': ('.card:not(.first):not(.tight):not(.empty), .kn-step, .kx-form>.kx-sec, .kx>.kx-sec', ['border-top-left-radius', 'background-color', 'box-shadow']),
  'pole': ('.inp', ['border-top-left-radius', 'background-color']),
  'pole-tekst': ('.inp input:not([type=date]), .inp select', ['font-size', 'min-height']),
  'etykieta': ('.field .lbl, .kn-lbl', ['font-size', 'font-weight', 'color']),
  'przełącznik': ('.kx-seg, .seg:not(.seg-big)', ['background-color', 'border-top-left-radius']),
  'przełącznik-wybrany': ('.kx-seg:not([aria-label="Rodzaj nawozu"]) button.on, .seg:not(.seg-big) button.on', ['background-color', 'color']),
  'przycisk-główny': ('.btn:not(.ghost):not(.danger):not(.small):not(.link)', ['min-height', 'border-top-left-radius', 'background-color']),
  'przycisk-drugorzędny': ('.btn.ghost:not(.small)', ['min-height', 'border-top-left-radius', 'background-color']),
  'nagłówek-karty': ('.card>h2:not(:empty), .kn-h, .kx-h', ['font-size', 'font-weight']),
  'tytuł-ekranu': ('.page-title, .kx-title', ['font-size', 'font-weight']),
}
JS = """C => { const out = {}; for (const [k, [sel, props]] of Object.entries(C)) { const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null && !e.closest('.card-res>h2, .kn-result-h, .kx-out>.kx-h:first-child, .kg-kinds'));
  out[k] = [...new Set(els.map(e => { const s = getComputedStyle(e); return props.map(p => s.getPropertyValue(p)).join(' | '); }))]; } return out; }"""
SEED = """() => { const d = new Date(); for (let i = 0; i < 4; i++) { const x = new Date(d); x.setDate(d.getDate() - 7 * i); addEvent({ type: 'measure', date: L.dkey(x), NO3: 10 + i, PO4: 1, KH: 4, GH: 7, pH: 6.8 }); }
  tank().fplan = [{ pid: 'b20', amt: '5', n: '3' }]; tank().setup = true; state.adv = true; state.inputs.setupHide = true; save(); }"""
fail = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for scheme in ['light', 'dark']:
        for w in [360, 1280]:
            ctx = b.new_context(viewport={'width': w, 'height': 900}, color_scheme=scheme, service_workers='block'); pg = ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300); pg.evaluate(SEED); pg.reload(); pg.wait_for_timeout(300)
            seen = {}
            for r in ROUTES:
                pg.evaluate("h => go(h)", r); pg.wait_for_timeout(200)
                if pg.evaluate('document.documentElement.scrollWidth') > w: fail.append(f'{scheme} {w} {r}: poziome przewijanie')
                for k, vals in pg.evaluate(JS, COMP).items():
                    for v in vals: seen.setdefault(k, {}).setdefault(v, []).append(r)
            for k, vs in seen.items():
                if len(vs) > 1: fail.append(f'{scheme} {w} {k}: {len(vs)} warianty: ' + json.dumps({v: rs[:3] for v, rs in vs.items()}, ensure_ascii=False))
            if errs: fail.append(f'{scheme} {w} błędy JS: {errs[:3]}')
            ctx.close()
    b.close()
for f in fail: print('BŁĄD', f)
print('Spójność OK' if not fail else f'{len(fail)} problemów'); sys.exit(1 if fail else 0)

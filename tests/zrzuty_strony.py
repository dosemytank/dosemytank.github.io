"""Zrzuty na strony startowe (EN: img/en/*.webp, PL: img/*.webp, DE: img/de/*.webp) – jasne i ciemne, z tymi samymi danymi przykładowymi,
oraz podglądy linków 1200×630 (img/og.png – EN, img/og-pl.png – PL, img/og-de.png – DE).
Tylko wybrane języki: LANGS=de python3 tests/zrzuty_strony.py; inna przeglądarka: CHROME=/ścieżka/do/chrome.
Uruchom przy wydaniu, gdy zmienia się wygląd: python3 tests/zrzuty_strony.py  (wymaga Playwright + Pillow).
Dane: akwarium 112 l z CO₂, 12 tygodni pomiarów NO₃ / PO₄ / K / KH / GH / pH, cotygodniowe podmiany."""
import os, io, threading, http.server, functools
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); IMG = os.path.join(ROOT, 'img')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8779), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8779/app.html'
SEED = """() => {
  localStorage.clear(); localStorage.setItem('dmt.lang', LANG); initStore();
  const t = tank(); Object.assign(t, { name: 'Hi-tech', V: 112, type: 'plant_hi', change: 40, setup: true, co2: 'yes' });
  const d0 = new Date(); d0.setDate(d0.getDate() - 84);
  const day = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return L.dkey(d); };
  const NO3 = [12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26, 28], PO4 = [0.6, 0.7, 0.6, 0.8, 0.9, 0.8, 1, 1.1, 1, 1.2, 1.2, 1.3];
  NO3.forEach((v, i) => { addEvent({ type: 'measure', date: day(i * 7 + 6), NO3: v, PO4: PO4[i], K: 12 + i, KH: 4, GH: 7, pH: 6.6 }); addEvent({ type: 'water', date: day(i * 7), pct: 40 }); });
  state.inputs.chart = 'NO3';
  save();
}"""

def cap(pg, path, el=None):
    if el: pg.add_style_tag(content='nav.bar,.kx-pin{display:none!important}')
    else: pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(200)
    png = pg.locator(el).first.screenshot() if el else pg.screenshot()
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.save(path, 'WEBP', quality=82, method=6); return im.size

OG = {
  'en': ('Your aquarium.<br>Your formula.', 'DIY fertilizers from dry salts, commercial fertilizer dosing, RO remineralization and a tank log. Free, no sign-up, works offline.'),
  'pl': ('Twoje akwarium.<br>Twój przepis.', 'Nawozy z soli, dawki gotowych nawozów, mineralizacja wody RO i dziennik akwarium. Za darmo, bez konta, działa offline.'),
  'de': ('Dein Aquarium.<br>Deine Formel.', 'Dünger aus Salzen, Dosierung von Fertigdüngern, Osmosewasser aufhärten und Logbuch. Kostenlos, ohne Anmeldung, offline.'),
}
OUT = {'en': os.path.join(IMG, 'en'), 'pl': IMG, 'de': os.path.join(IMG, 'de')}
LOC = {'en': 'en-US', 'pl': 'pl-PL', 'de': 'de-DE'}
LANGS = [l for l in os.environ.get('LANGS', 'en,pl,de').split(',') if l in OUT]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for lang, out in [(l, OUT[l]) for l in LANGS]:
        os.makedirs(out, exist_ok=True)
        for scheme, suf in [('light', ''), ('dark', '-dark')]:
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme, locale=LOC[lang], service_workers='block')
            ctx.add_init_script(f"try {{ localStorage.setItem('dmt.lang', '{lang}') }} catch (e) {{}}")
            # SHOT_FONT=Roboto: font jak na Androidzie (Inter z cyframi tabelarycznymi rysuje szeroki łącznik: „3 -mal”, „PPS - Pro”)
            if os.environ.get('SHOT_FONT'): ctx.add_init_script("document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'body{font-family:%s,sans-serif}'; document.head.append(s); })" % os.environ['SHOT_FONT'])
            pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(300)
            for _ in range(3):
                pg.evaluate(SEED); pg.wait_for_timeout(400); pg.evaluate('save()'); pg.reload(); pg.wait_for_timeout(400)
                if pg.evaluate('Object.values(state.events)[0].length') == 24: break
            go = lambda h: (pg.evaluate("h => go(h)", h), pg.wait_for_timeout(600))
            go('dziennik'); print(lang, 'wykresy' + suf, cap(pg, os.path.join(out, f'wykresy{suf}.webp')))
            go('woda/korekta'); print(lang, 'korekta' + suf, cap(pg, os.path.join(out, f'korekta{suf}.webp')))
            go('kalkulator/nawoz'); print(lang, 'kalkulator' + suf, cap(pg, os.path.join(out, f'kalkulator{suf}.webp'), '.kx-out'))
            go('kalkulator/mineral'); print(lang, 'mineral' + suf, cap(pg, os.path.join(out, f'mineral{suf}.webp'), '.kx-out'))
            go('kalkulator/gotowe'); print(lang, 'gotowe' + suf, cap(pg, os.path.join(out, f'gotowe{suf}.webp'), '.kx-out'))
            ctx.close()
        # podgląd linku (Facebook, Reddit, komunikatory) 1200×630 – prawdziwe zrzuty na tle marki
        h1, sub = OG[lang]; base = URL.replace('app.html', '')
        rel = {'en': 'img/en/', 'pl': 'img/', 'de': 'img/de/'}[lang]
        ctx = b.new_context(viewport={'width': 1200, 'height': 630}, device_scale_factor=1); pg = ctx.new_page(); pg.goto(base + 'tokens.css')
        pg.set_content(f'''<html><head></head><body style="margin:0;width:1200px;height:630px;overflow:hidden;background:#0e3b2c;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;position:relative">
          <div style="position:absolute;left:72px;top:72px;font-size:30px;font-weight:700;color:#a8e59b;letter-spacing:-.02em">DoseMyTank</div>
          <div style="position:absolute;left:72px;top:176px;font-size:66px;line-height:1.1;font-weight:800;letter-spacing:-.03em">{h1}</div>
          <div style="position:absolute;left:72px;top:400px;width:560px;font-size:26px;line-height:1.4;color:#cfe8d8">{sub}</div>
          <img src="{base}{rel}kalkulator.webp" style="position:absolute;left:684px;top:100px;width:254px;border-radius:16px;box-shadow:0 0 0 2px #2a6a4f">
          <img src="{base}{rel}wykresy.webp" style="position:absolute;left:948px;top:166px;width:254px;border-radius:16px;box-shadow:0 0 0 2px #2a6a4f">
        </body></html>''', wait_until='networkidle'); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(IMG, {'en': 'og.png', 'pl': 'og-pl.png', 'de': 'og-de.png'}[lang])); print(lang, 'og'); ctx.close()
    b.close()
srv.shutdown()

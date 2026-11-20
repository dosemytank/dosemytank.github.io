"""PWA offline i aktualizacja (Playwright, serwer HTTP – service worker nie działa z file://):
1) po pierwszym otwarciu aplikacja, oba języki i strony EN/PL działają bez sieci,
2) zmiana języka bez sieci działa (słownik jest w pamięci podręcznej),
3) nowa wersja service workera kasuje stare cache, a dane użytkownika (localStorage) zostają.
Uruchom: python3 tests/e2e_offline.py"""
import os, sys, threading, http.server, functools, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8781), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8781/'
fail = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None); ctx = b.new_context(locale='en-US'); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'app.html'); pg.evaluate('navigator.serviceWorker.ready'); pg.reload(); pg.wait_for_timeout(800)
    if not pg.evaluate('!!navigator.serviceWorker.controller'): fail.append('service worker nie przejął strony')
    pg.evaluate("addEvent({ type: 'note', date: todayKey(), note: 'offline-test' }); save()")
    pg.goto(BASE); pg.goto(BASE + 'pl/'); pg.wait_for_timeout(300)  # strony startowe do pamięci podręcznej (i tak są w FILES)
    ctx.set_offline(True)
    pg.goto(BASE + 'app.html#/kalkulator/nawoz'); pg.wait_for_timeout(500)
    if 'Make fertilizer' not in pg.inner_text('body'): fail.append('aplikacja EN nie działa offline')
    pg.goto(BASE + 'app.html#/info'); pg.wait_for_timeout(300); pg.click('main >> text=Polski'); pg.wait_for_load_state(); pg.wait_for_timeout(600)
    if pg.evaluate('LANG') != 'pl' or 'Ustawienia' not in pg.inner_text('#main'): fail.append('zmiana języka na PL offline nie działa')
    pg.click('main >> text=English'); pg.wait_for_load_state(); pg.wait_for_timeout(600)
    if pg.evaluate('LANG') != 'en': fail.append('zmiana języka na EN offline nie działa')
    for path, txt in [('', 'Your aquarium. Your formula.'), ('pl/', 'Twoje akwarium. Twój przepis.'), ('about.html', 'About DoseMyTank'), ('pl/kontakt.html', 'Kontakt')]:
        pg.goto(BASE + path); pg.wait_for_timeout(200)
        if txt not in pg.inner_text('body'): fail.append(f'{path or "/"} nie działa offline')
    ctx.set_offline(False)
    # aktualizacja: inna wersja service workera → stare cache usunięte, dane zostają
    v_old = pg.evaluate("caches.keys()")
    # nowa wersja sw.js na dysku (na czas testu), potem przywrócenie
    swp = os.path.join(ROOT, 'sw.js'); orig = open(swp, encoding='utf8').read()
    try:
        open(swp, 'w', encoding='utf8').write(re.sub(r"dosemytank-v[\d.]+", 'dosemytank-v9.9.9-test', orig, count=1))
        pg.goto(BASE + 'app.html'); pg.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())"); pg.wait_for_timeout(3000)
        keys = pg.evaluate("caches.keys()")
    finally:
        open(swp, 'w', encoding='utf8').write(orig)
    if keys != ['dosemytank-v9.9.9-test']: fail.append(f'po aktualizacji cache: {keys} (wcześniej {v_old})')
    pg.reload(); pg.wait_for_timeout(500)
    if 'offline-test' not in pg.evaluate("JSON.stringify(state.events)"): fail.append('dane zniknęły po aktualizacji')
    if errs: fail.append('błędy JS: ' + '; '.join(errs[:5]))
    b.close()
srv.shutdown()
if fail: print('BŁĘDY:\n' + '\n'.join(fail)); sys.exit(1)
print('OK – offline (aplikacja, oba języki, strony EN/PL), zmiana języka bez sieci, aktualizacja bez utraty danych')

"""Testy przeglądarkowe pisane dla polskiej wersji: każda nowa strona Playwrighta startuje z językiem PL
(od 8.0 domyślny jest angielski). Wystarczy `import pl_lang` na początku testu."""
from playwright.sync_api import Browser
SCRIPT = "try { localStorage.setItem('dmt.lang', 'pl') } catch (e) {}"
_new_context, _new_page = Browser.new_context, Browser.new_page
def _ctx(self, *a, **k):
    c = _new_context(self, *a, **k); c.add_init_script(SCRIPT); return c
def _page(self, *a, **k):
    pg = _new_page(self, *a, **k); pg.context.add_init_script(SCRIPT); return pg
Browser.new_context, Browser.new_page = _ctx, _page

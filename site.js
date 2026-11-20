/* DoseMyTank – skrypt stron informacyjnych (EN i PL). Teksty są w HTML strony (atrybuty data-*), skrypt nie zawiera tekstów.
   - ostrzeżenie w przeglądarce Facebooka/Instagrama (instalacja i dane działają tylko w zwykłej przeglądarce),
   - przycisk instalacji (Chrome/Android), ukrywany w zainstalowanej aplikacji,
   - propozycja drugiej wersji językowej, gdy język przeglądarki do niej pasuje (bez przekierowania),
   - rejestracja service workera (strona i aplikacja działają offline). */
(function () {
  // stare adresy z kotwicami (do 7.x polska strona była pod „/”, np. /#instalacja) → polska strona z tą samą sekcją;
  // stara angielska kotwica #install-help → #installation
  if (document.documentElement.lang === 'en') {
    var hs = location.hash.slice(1), PL = ['instalacja', 'funkcje', 'przyklad', 'dla-kogo', 'akwaria', 'pytania'];
    if (PL.indexOf(hs) >= 0) { location.replace('pl/' + (hs === 'pytania' ? '#faq' : '#' + hs)); return; }
    if (hs === 'install-help') location.replace('#installation');
  }
  var $ = function (id) { return document.getElementById(id); };
  var ua = navigator.userAgent || '';
  var fb = $('fb');
  if (fb && /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua)) fb.hidden = false;
  var copy = $('copy');
  if (copy) copy.onclick = function () {
    var url = location.href.split('#')[0];
    var done = function () { copy.textContent = copy.getAttribute('data-done'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt(copy.getAttribute('data-prompt'), url); });
    else prompt(copy.getAttribute('data-prompt'), url);
  };
  var inst = $('install'), howto = $('howto'), dp = null;
  if (inst) {
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) { inst.hidden = true; if (howto) howto.hidden = true; }
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dp = e; inst.hidden = false; if (howto) howto.hidden = true; });
    inst.onclick = function () { if (!dp) return; dp.prompt(); dp.userChoice.finally(function () { dp = null; inst.hidden = true; if (howto) howto.hidden = false; }); };
    window.addEventListener('appinstalled', function () { inst.hidden = true; });
  }
  // druga wersja językowa: tylko podpowiedź, gdy przeglądarka jest w tym języku i użytkownik nie wybrał inaczej
  var alt = $('altlang');
  if (alt) {
    var want = alt.getAttribute('data-lang'), saved = null;
    try { saved = localStorage.getItem('dmt.lang'); } catch (e) {}
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    var first = String(langs[0] || '').toLowerCase().slice(0, 2);
    if ((saved ? saved === want : first === want) && document.documentElement.lang !== want) alt.hidden = false;
  }
  // wybór wersji językowej z przełącznika zapamiętujemy – aplikacja otworzy się w tym języku
  document.querySelectorAll('a[data-setlang]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('dmt.lang', a.getAttribute('data-setlang')); } catch (e) {} });
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register(document.documentElement.getAttribute('data-sw') || 'sw.js').catch(function () {});
})();

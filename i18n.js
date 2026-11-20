/* ===== Języki interfejsu: angielski (domyślny), polski i niemiecki =====
   Każdy tekst widoczny dla użytkownika przechodzi przez tl('tekst po polsku', …argumenty).
   Kluczem jest tekst polski (jak w gettext): w kodzie widać, co się wyświetli, a polski nie potrzebuje słownika.
   Tłumaczenia: i18n-en.js (I18N_EN), i18n-de.js (I18N_DE; brakujący tekst niemiecki → angielski). Argumenty wstawiane są w miejsca {0}, {1}, …
   Wybór języka: ?lang=en|pl|de w adresie → zapisany wybór (dmt.lang) → istniejące dane aplikacji sprzed 8.0 (PL)
   → język przeglądarki → angielski. Zmiana języka przeładowuje stronę (wszystko jest w pamięci podręcznej, działa offline). */
(function (G) {
  const SUP = ['en', 'pl', 'de'], KEY = 'dmt.lang';
  const ls = (() => { try { return G.localStorage; } catch (e) { return null; } })();
  function detect() {
    if (G.DMT_LANG && SUP.includes(G.DMT_LANG)) return G.DMT_LANG; // testy w Node
    if (typeof document === 'undefined') return 'pl';
    try {
      const u = new URL(G.location.href), q = u.searchParams.get('lang');
      if (SUP.includes(q)) {
        ls && ls.setItem(KEY, q);
        // parametr ?lang= tylko ustawia wybór – usuwamy go z adresu, żeby późniejsza zmiana języka w Ustawieniach nie była nadpisywana
        u.searchParams.delete('lang'); try { G.history.replaceState(G.history.state, '', u.pathname + u.search + u.hash); } catch (e) {}
        return q;
      }
    } catch (e) {}
    try { const s = ls && ls.getItem(KEY); if (SUP.includes(s)) return s; } catch (e) {}
    let l = 'en';
    try {
      // dotychczasowi użytkownicy (aplikacja była tylko po polsku) zostają przy polskim
      if (ls && (ls.getItem('akwa.v4') || ls.getItem('akwa.v3') || ls.getItem('akwa.v2'))) l = 'pl';
      else for (const x of (G.navigator.languages && G.navigator.languages.length ? G.navigator.languages : [G.navigator.language || 'en'])) {
        const b = String(x).toLowerCase().slice(0, 2); if (SUP.includes(b)) { l = b; break; }
      }
    } catch (e) {}
    try { ls && ls.setItem(KEY, l); } catch (e) {}
    return l;
  }
  const LANG = detect();
  // formatowanie liczb i dat: PL – pl-PL; EN – angielski wariant z przeglądarki (en-GB, en-AU…) albo en-US
  // DE – niemiecki wariant z przeglądarki (de-DE, de-AT, de-CH) albo de-DE
  let LOCALE = 'pl-PL';
  const browserLocale = (re, def) => { try { return [...(G.navigator.languages || [])].find(x => re.test(x)) || def; } catch (e) { return def; } };
  if (LANG === 'en') LOCALE = browserLocale(/^en-/i, 'en-US');
  if (LANG === 'de') LOCALE = browserLocale(/^de-/i, 'de-DE');
  const MISSING = new Set();
  const req = f => { try { return typeof require === 'function' ? require(f) : {}; } catch (e) { return {}; } };
  function dictOf(l) { return l === 'en' ? (G.I18N_EN || req('./i18n-en.js')) : l === 'de' ? (G.I18N_DE || req('./i18n-de.js')) : null; }
  let D = null, DF = null;
  function tl(key, ...a) {
    let s = key;
    if (LANG !== 'pl') {
      D ||= dictOf(LANG) || {}; let v = D[key];
      if (typeof v !== 'string') { MISSING.add(key); if (LANG !== 'en') { DF ||= dictOf('en') || {}; v = DF[key]; } } // niemiecki bez tłumaczenia → angielski, nie polski
      if (typeof v === 'string') s = v;
    }
    return a.length ? String(s).replace(/\{(\d+)\}/g, (m, i) => i < a.length ? String(a[i]) : m) : s;
  }
  // tekst zapisany w danych (np. domyślna nazwa zadania) – tłumaczony przy wyświetlaniu, jeśli jest w słowniku
  const tlData = s => typeof s === 'string' && s ? tl(s) : s;
  // separator dziesiętny w tekstach i polach (wpisywać można zawsze i przecinkiem, i kropką)
  const DEC = LANG === 'en' ? '.' : ',';
  // liczby: PL bez zmian (pl-PL); EN i DE bez separatora tysięcy, żeby wartość wstawiona do pola dała się odczytać (w DE separatorem tysięcy byłaby kropka)
  const NUMOPT = LANG === 'pl' ? {} : { useGrouping: false };
  const fmtNum = (x, d = 2) => x.toLocaleString(LOCALE, { maximumFractionDigits: d, minimumFractionDigits: 0, ...NUMOPT });
  const UTC = { timeZone: 'UTC' };
  // daty: „20 lis” / „Nov 20”, „piątek, 20 listopada” / „Friday, November 20”, oś wykresu „20.11” / „11/20”
  const fmtDateShort = dt => dt.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', ...UTC });
  const fmtDateLong = dt => dt.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', ...UTC });
  const fmtDayMonth = dt => LANG !== 'en' ? dt.getDate() + '.' + String(dt.getMonth() + 1).padStart(2, '0') : dt.toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric' });
  const fmtTime = dt => dt.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  // klucz daty RRRR-MM-DD → „20.11” (PL) albo „Nov 20” (EN)
  const fmtKeyDM = k => { const [y, m, d] = String(k).split('-').map(Number); return LANG !== 'en' ? String(k).split('-').reverse().slice(0, 2).join('.') : fmtDateShort(new Date(Date.UTC(y, m - 1, d))); };
  /* Zmiana języka. Domyślne nazwy zapisane w danych (zbiornik „Moje akwarium”, zadania „Podmiana wody”, tagi notatek…)
     przechodzą na nowy język, jeśli dokładnie odpowiadają tekstowi ze słownika. Nazwy wpisane przez użytkownika zostają. */
  const RELABEL = ['Moje akwarium', 'Akwarium {0}', 'Nawóz makro (NPK)', 'Nawóz mikro / żelazo', 'Podmiana wody', 'Test wody', 'Test wody przed podmianą',
    'Czyszczenie filtra', 'Przycinanie roślin', 'Wymiana wkładów', 'Czyszczenie szyb', 'Odmulanie dna', 'Inna czynność', 'Inne',
    'Glony', 'Rośliny', 'Zwierzęta', 'CO₂', 'Światło', 'Sprzęt', 'Woda netto', 'Oświetlenie', 'Rodzaj akwarium', 'Objętość netto'];
  function relabel(st, from, to) {
    // z dowolnego języka na dowolny: tekst → klucz polski (słownik języka źródłowego) → tekst w języku docelowym
    const DF = dictOf(from) || {}, DT = dictOf(to) || {}, back = {};
    for (const k of RELABEL) if (DF[k] !== undefined && !(DF[k] in back)) back[DF[k]] = k;
    const map = v => { if (typeof v !== 'string' || !v) return v; const pl = from === 'pl' ? (RELABEL.includes(v) ? v : undefined) : back[v]; if (pl === undefined) return v; return to === 'pl' ? pl : (DT[pl] ?? v); };
    const nm = v => { const m = /^(.*?) (\d+)$/.exec(v || ''); if (m) { const b = map(m[1] + ' {0}'); if (b !== m[1] + ' {0}' && b.includes('{0}')) return b.replace('{0}', m[2]); } return map(v); };
    let n = 0; const set = (o, k, f) => { const v = f(o[k]); if (v !== o[k]) { o[k] = v; n++; } };
    for (const t of st.tanks || []) set(t, 'name', nm);
    for (const id in st.tasks || {}) for (const k of st.tasks[id] || []) set(k, 'name', map);
    for (const id in st.events || {}) for (const e of st.events[id] || []) { if (e.type === 'task') set(e, 'name', map); if (e.type === 'setting') set(e, 'label', map); if (Array.isArray(e.tags)) e.tags = e.tags.map(x => { const y = map(x); if (y !== x) n++; return y; }); }
    return n;
  }
  function setLang(l) {
    if (!SUP.includes(l) || l === LANG) return;
    const done = () => {
      try { const st = typeof state !== 'undefined' ? state : G.state; if (st && typeof save === 'function' && relabel(st, LANG, l)) save(); } catch (e) {}
      try { ls && ls.setItem(KEY, l); } catch (e) {}
      G.location.reload();
    };
    // słownik niemiecki wczytujemy tylko przy interfejsie DE – przy zmianie na DE (albo z DE) dociągamy go, żeby przenieść domyślne nazwy
    if ((l === 'de' || LANG === 'de') && !G.I18N_DE && typeof document !== 'undefined') {
      const sc = document.createElement('script'); sc.src = 'i18n-de.js'; sc.onload = sc.onerror = done; document.head.append(sc);
    } else done();
  }
  if (typeof document !== 'undefined') document.documentElement.lang = LANG;
  Object.assign(G, { tl, tlData, LANG, LOCALE, DEC, setLang, fmtNum, fmtDateShort, fmtDateLong, fmtDayMonth, fmtTime, fmtKeyDM, I18N_MISSING: MISSING, I18N_LANGS: SUP });
  if (typeof module !== 'undefined') module.exports = { tl, tlData, LANG, LOCALE, DEC, setLang, relabel, fmtNum, fmtDayMonth, fmtKeyDM, MISSING };
})(typeof globalThis !== 'undefined' ? globalThis : this);

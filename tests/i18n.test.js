// System tłumaczeń: każdy tekst z kodu ma tłumaczenie EN, placeholdery i znaczniki się zgadzają, zmiana języka przenosi domyślne nazwy.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const EN = require('../i18n-en.js');
const DE = require('../i18n-de.js');
const I = require('../i18n.js');

// klucze tl('…') z kodu: pierwszy argument będący literałem (bez parsera – wystarczy wyrażenie regularne na literały w '…', "…" i `…` bez ${})
function keysIn(src) {
  const out = []; const re = /\btl\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g; let m;
  while ((m = re.exec(src))) out.push(JSON.parse('"' + (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'").replace(/"/g, '\\"').replace(/\\`/g, '`') + '"'));
  return out;
}
const SRC = fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && !/^(i18n|i18n-en|i18n-de|sw|kalkulator)\.js$/.test(f)).map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]);
SRC.push(['app.html', fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8')]);

test('każdy tekst przekazany do tl() ma tłumaczenie angielskie', () => {
  const missing = [];
  for (const [f, src] of SRC) for (const k of keysIn(src)) if (typeof EN[k] !== 'string') missing.push(`${f}: ${k}`);
  assert.deepStrictEqual(missing, []);
});

test('tłumaczenia mają te same placeholdery {n} i znaczniki HTML co tekst polski', () => {
  const bad = [];
  for (const [k, v] of Object.entries(EN)) {
    const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(), tg = s => (s.match(/<\/?[a-z]+/gi) || []).sort().join();
    if (ph(k) !== ph(v) || tg(k) !== tg(v)) bad.push(k);
  }
  assert.deepStrictEqual(bad, []);
});

test('w angielskich tekstach nie ma polskich znaków ani polskiego zapisu liczb (poza nazwą produktu)', () => {
  const bad = Object.entries(EN).filter(([k, v]) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(v) && v !== 'Symfonia złota').map(([k]) => k);
  assert.deepStrictEqual(bad, []);
  // „0,5 mg/l” w polskim tekście → „0.5 mg/L” w angielskim
  const comma = Object.entries(EN).filter(([, v]) => (v.match(/\d,\d+/g) || []).some(x => x.split(',')[1].length !== 3)).map(([k, v]) => v);
  assert.deepStrictEqual(comma, []);
  const litre = Object.entries(EN).filter(([, v]) => /\bmg\/l\b|\bg\/l\b|\d l\b/.test(v)).map(([, v]) => v);
  assert.deepStrictEqual(litre, [], 'jednostki: mg/L, g/L, L');
});

test('tl: polski bez słownika, wstawianie argumentów, brak tłumaczenia → tekst polski', () => {
  assert.strictEqual(I.LANG, 'pl');
  assert.strictEqual(I.tl('{0} dni temu', 3), '3 dni temu');
  assert.strictEqual(I.tl('Dawka {0} ml, {1} {2} w tygodniu.{3}', '2,5', 3, 'razy', ''), 'Dawka 2,5 ml, 3 razy w tygodniu.');
  assert.strictEqual(I.DEC, ',');
});

test('zmiana języka przenosi tylko domyślne nazwy, a dane wpisane przez użytkownika zostają', () => {
  const st = { tanks: [{ name: 'Moje akwarium' }, { name: 'Akwarium 3' }, { name: 'Salon 240' }],
    tasks: { a: [{ name: 'Podmiana wody' }, { name: 'Nawóz makro (NPK)' }, { name: 'Moje zadanie' }] },
    events: { a: [{ type: 'note', note: 'Glony na szybie', tags: ['Glony', 'własny'] }, { type: 'task', name: 'Czyszczenie filtra' }, { type: 'measure', NO3: 10 }] } };
  const orig = JSON.stringify(st);
  global.I18N_EN = EN;
  assert.ok(I.relabel(st, 'pl', 'en') > 0);
  assert.deepStrictEqual(st.tanks.map(t => t.name), ['My tank', 'Tank 3', 'Salon 240']);
  assert.deepStrictEqual(st.tasks.a.map(t => t.name), ['Water change', 'Macro fertilizer (NPK)', 'Moje zadanie']);
  assert.deepStrictEqual(st.events.a[0], { type: 'note', note: 'Glony na szybie', tags: ['Algae', 'własny'] });
  assert.strictEqual(st.events.a[1].name, 'Filter cleaning');
  I.relabel(st, 'en', 'pl');
  assert.strictEqual(JSON.stringify(st), orig);
});

test('angielski: wybór, formatowanie liczb bez separatora tysięcy, kropka dziesiętna', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['-e', `global.DMT_LANG='en'; const I=require(${JSON.stringify(path.join(ROOT, 'i18n.js'))});
    console.log(JSON.stringify([I.LANG, I.DEC, I.fmtNum(12345.678, 1), I.tl('{0} dni temu', 3), I.tl('mg/l'), I.fmtKeyDM('2026-11-20')]))`]).toString();
  assert.deepStrictEqual(JSON.parse(out), ['en', '.', '12345.7', '3 days ago', 'mg/L', 'Nov 20']);
});

test('service worker trzyma pliki wszystkich języków offline', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const f of ['i18n.js', 'i18n-en.js', 'i18n-de.js', 'manifest.json', 'manifest-pl.json', 'manifest-de.json', 'de/', 'de/index.html', 'de/ueber.html', 'de/kontakt.html']) assert.ok(sw.includes(`'./${f}'`), f);
  for (const f of ['manifest-de.json', 'de/index.html', 'de/ueber.html', 'de/kontakt.html']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  const app = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  assert.ok(app.indexOf('i18n-en.js') < app.indexOf('i18n.js"') && app.indexOf('i18n.js"') < app.indexOf('products.js'), 'kolejność skryptów: słownik, i18n, reszta');
});

/* ---------- 8.5: niemiecki ---------- */
test('niemiecki: każdy tekst z angielskiego słownika ma tłumaczenie niemieckie', () => {
  assert.deepStrictEqual(Object.keys(EN).filter(k => typeof DE[k] !== 'string'), []);
  assert.deepStrictEqual(Object.keys(DE).filter(k => !(k in EN)), [], 'w DE nie ma kluczy, których nie ma w EN');
});

test('niemiecki: te same placeholdery {n}, znaczniki HTML i spacje na brzegach co tekst polski', () => {
  const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(), tg = s => (s.match(/<\/?[a-z]+/gi) || []).sort().join();
  const edge = s => [/^\s/.test(s), /\s$/.test(s)].join();
  assert.deepStrictEqual(Object.entries(DE).filter(([k, v]) => ph(k) !== ph(v) || tg(k) !== tg(v) || edge(EN[k]) !== edge(v)).map(([k]) => k), []);
});

test('niemiecki: bez polskich znaków, przecinek dziesiętny, mg/l', () => {
  assert.deepStrictEqual(Object.entries(DE).filter(([, v]) => /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/.test(v) && v !== 'Symfonia złota').map(([k]) => k), []);
  // „0.5” po niemiecku to „0,5” (kropka tylko w wersji programu, np. „v8.5”, i w nazwach produktów)
  assert.deepStrictEqual(Object.values(DE).filter(v => /\d\.\d/.test(v) && !/\bmg\/L\b/.test(v)), []);
  assert.deepStrictEqual(Object.values(DE).filter(v => /\bmg\/L\b|\bg\/L\b/.test(v)), [], 'jednostki: mg/l, g/l');
});

test('niemiecki: wybór, formatowanie liczb i dat, brak tłumaczenia → angielski', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, ['-e', `global.DMT_LANG='de'; const I=require(${JSON.stringify(path.join(ROOT, 'i18n.js'))});
    console.log(JSON.stringify([I.LANG, I.DEC, I.fmtNum(12345.678, 1), I.tl('{0} dni temu', 3), I.tl('mg/l'), I.fmtKeyDM('2026-11-20'), I.tl('Podmiana wody')]))`]).toString();
  assert.deepStrictEqual(JSON.parse(out), ['de', ',', '12345,7', 'vor 3 Tagen', 'mg/l', '20.11', 'Wasserwechsel']);
});

test('zmiana języka DE ↔ EN ↔ PL przenosi domyślne nazwy', () => {
  global.I18N_EN = EN; global.I18N_DE = DE;
  const st = { tanks: [{ name: 'Moje akwarium' }, { name: 'Akwarium 2' }, { name: 'Salon 240' }], tasks: { a: [{ name: 'Podmiana wody' }, { name: 'Moje zadanie' }] },
    events: { a: [{ type: 'note', tags: ['Glony', 'własny'] }, { type: 'task', name: 'Czyszczenie filtra' }] } };
  const orig = JSON.stringify(st);
  I.relabel(st, 'pl', 'de');
  assert.deepStrictEqual(st.tanks.map(t => t.name), ['Mein Aquarium', 'Aquarium 2', 'Salon 240']);
  assert.deepStrictEqual(st.tasks.a.map(t => t.name), ['Wasserwechsel', 'Moje zadanie']);
  assert.deepStrictEqual(st.events.a[0].tags, ['Algen', 'własny']);
  I.relabel(st, 'de', 'en');
  assert.deepStrictEqual(st.tanks.map(t => t.name), ['My tank', 'Tank 2', 'Salon 240']);
  assert.strictEqual(st.events.a[1].name, 'Filter cleaning');
  I.relabel(st, 'en', 'pl');
  assert.strictEqual(JSON.stringify(st), orig);
});

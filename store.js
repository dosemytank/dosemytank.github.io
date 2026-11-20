if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Dane: wersjonowany stan, migracje, zapis z ochroną przed utratą, zbiorniki, zdarzenia, zadania, produkty, receptury =====
   Wersje: v2 (klucz akwa.v2) → v3 (akwa.v3) → v4 (akwa.v4). Starsze klucze NIE są kasowane – zostają jako kopia. */
const SCHEMA = 4, LS = 'akwa.v4', LS_OLDS = ['akwa.v3', 'akwa.v2'], LS_PREV = 'akwa.v4.prev';
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const L = typeof LOGIC !== 'undefined' ? LOGIC : require('./logic.js');

function defTank(name = tl('Moje akwarium')) {
  const id = uid('t');
  return { id, name, V: 100, Vgross: '', change: 30, type: 'plant_lo', tech: '', light: '', density: '', co2type: '', created: '', substrate: '', filter: '', lightW: '', lightH: '', co2: '',
    plants: '', fauna: '', notes: '', fert: [], fplan: [], stock: {}, targets: {}, water: 'tap', tap: {}, ro: {}, roFrac: '' };
}
function defTasks(today) {
  return [
    { id: uid('k'), kind: 'dose_macro', name: tl('Nawóz makro (NPK)'), mode: 'days', days: [1, 3, 5], start: today },
    { id: uid('k'), kind: 'dose_micro', name: tl('Nawóz mikro / żelazo'), mode: 'days', days: [2, 4, 6], start: today },
    { id: uid('k'), kind: 'water', name: tl('Podmiana wody'), mode: 'days', days: [0], start: today },
  ];
}
function blankState() {
  const t = defTank(), today = L.dkey(new Date());
  return { v: SCHEMA, tanks: [t], active: t.id, events: { [t.id]: [] }, tasks: { [t.id]: defTasks(today) }, products: [], salts: [], recipes: [], batches: [], inputs: {}, theme: 'auto', adv: false, seg: {} };
}
const tsOfDate = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd, 12, 0, 0).getTime(); };
const num = v => { const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return typeof x === 'number' && isFinite(x) ? x : undefined; };
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
// identyfikatory soli z v3 (calc.js) → surowiec + liczba H₂O w silniku v4 (chem.js)
const OLD_SALT = { KNO3: ['KNO3', 0], K2SO4: ['K2SO4', 0], KCl: ['KCl', 0], KH2PO4: ['KH2PO4', 0], KHCO3: ['KHCO3', 0], K2CO3: ['K2CO3', 0], NH4NO3: ['NH4NO3', 0],
  MGSO4_7: ['MgSO4', 7], MGSO4: ['MgSO4', 0], MGCL2: ['MgCl2', 6], CASO4: ['CaSO4', 2], CACL2: ['CaCl2', 2], CANO3: ['CaNO32', 4], NAHCO3: ['NaHCO3', 0], NACL: ['NaCl', 0] };

/* ---------- migracja dowolnej znanej wersji → v3 (czysta funkcja, testowana w Node) ---------- */
function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tanks) || !raw.tanks.length) throw new Error(tl('To nie jest kopia danych DoseMyTank.'));
  const s = JSON.parse(JSON.stringify(raw)), today = L.dkey(new Date());
  if (!s.v || s.v < 3) { // v2: journal + sched + done
    s.events = {}; s.tasks = {};
    for (const t of s.tanks) {
      const ev = (s.events[t.id] = []);
      for (const e of (s.journal && s.journal[t.id]) || []) {
        const date = isDate(e.date) ? e.date : today, m = { id: uid('e'), ts: tsOfDate(date), date, type: 'measure' };
        let any = false; for (const k of L.MEASURED) { const v = num(e[k]); if (v !== undefined) { m[k] = v; any = true; } }
        if (e.note) m.note = String(e.note).slice(0, 500);
        if (!any) m.type = 'note';
        if (any || m.note) ev.push(m);
      }
      const sc = t.sched || {}, tasks = (s.tasks[t.id] = []);
      const add = (kind, name, days) => { if (Array.isArray(days) && days.length) tasks.push({ id: uid('k'), kind, name, mode: 'days', days: days.filter(d => d >= 0 && d <= 6), start: today }); };
      add('dose_macro', 'Nawóz makro (NPK)', sc.macro); add('dose_micro', 'Nawóz mikro / żelazo', sc.micro); add('water', 'Podmiana wody', sc.wc);
      // dzisiejsze odhaczenia → zdarzenia wykonania (starsze nie miały historii)
      const d = s.done && s.done[today + ':' + t.id];
      if (d) for (const [k, kind] of [['macro', 'dose_macro'], ['micro', 'dose_micro'], ['wc', 'water']]) { const tk = tasks.find(x => x.kind === kind); if (d[k] && tk) ev.push({ id: uid('e'), ts: Date.now(), date: today, type: 'task', taskId: tk.id, kind, name: tk.name }); }
      delete t.sched;
    }
    // odwołania do produktów po indeksie → po id
    const g = s.inputs && s.inputs.gotowe; if (g && Array.isArray(g.rows)) g.rows = g.rows.map(r => ({ pid: r.pid || 'b' + (r.idx || 0), amount: r.amount, per: r.per }));
    const k = s.inputs && s.inputs.kreator; if (k && k.prod !== undefined && !String(k.prod).match(/^[bu]/)) k.prod = 'b' + k.prod;
    delete s.journal; delete s.done; s.products = s.products || [];
    s.v = 3;
  }
  if (s.v < 4) { // v3 → v4: receptury jako osobne obiekty, własne sole, partie, rozszerzony profil, producent/status nawozów
    s.salts = []; s.recipes = []; s.batches = [];
    for (const p of s.products || []) {
      if (p.source === 'recipe' && p.recipe && p.recipe.grams) {
        const items = Object.entries(p.recipe.grams).filter(([id, g]) => OLD_SALT[id] && g > 0).map(([id, g]) => ({ mat: OLD_SALT[id][0], hyd: OLD_SALT[id][1], purity: 100, g: +g }));
        const r = { id: uid('r'), name: p.name, vol: num(p.recipe.bottle) || 500, items, note: tl('Przeniesione z wersji 3 (receptura zapisana z kalkulatora).'), created: today, updated: today, pid: p.id };
        s.recipes.push(r); p.rid = r.id;
      }
      if (!p.status) p.status = p.source === 'recipe' ? 'recipe' : 'label';
    }
    s.v = 4;
  }
  // normalizacja / naprawa (każda wersja)
  s.tanks = s.tanks.filter(t => t && t.id).map(t => {
    const d = defTank(); const o = { ...d, ...t, id: t.id };
    o.name = String(o.name || tl('Akwarium')).slice(0, 40); o.V = num(o.V) > 0 ? num(o.V) : 100;
    const ch = num(o.change); o.change = ch >= 0 && ch <= 100 ? ch : 30;
    if (!L.PROFILES[o.type]) o.type = 'plant_lo';
    for (const f of ['targets', 'tap', 'ro', 'stock']) if (!o[f] || typeof o[f] !== 'object' || Array.isArray(o[f])) o[f] = {};
    delete o.uptake; // v6.4: aplikacja nie szacuje zużycia – stare pole z kopii jest pomijane
    if (!Array.isArray(o.fert)) o.fert = [];
    if (!Array.isArray(o.fplan)) o.fplan = o.fert.map(pid => ({ pid, amt: '', n: '' }));
    o.fplan = o.fplan.filter(x => x && x.pid);
    if (!['', 'low', 'medium', 'high'].includes(o.tech)) o.tech = '';
    if (!['tap', 'ro', 'mix'].includes(t.water)) { const f = num(o.roFrac) || 0; o.water = f >= 100 ? 'ro' : f > 0 ? 'mix' : 'tap'; }
    return o;
  });
  if (!s.tanks.length) throw new Error(tl('Brak zbiorników w danych.'));
  s.events ||= {}; s.tasks ||= {};
  for (const t of s.tanks) {
    s.events[t.id] = (Array.isArray(s.events[t.id]) ? s.events[t.id] : []).filter(e => e && e.type && isDate(e.date)).map(e => ({ ...e, id: e.id || uid('e'), ts: num(e.ts) || tsOfDate(e.date) }));
    s.tasks[t.id] = (Array.isArray(s.tasks[t.id]) ? s.tasks[t.id] : []).filter(k => k && k.id && k.name);
  }
  if (!s.tanks.some(t => t.id === s.active)) s.active = s.tanks[0].id;
  s.products = (Array.isArray(s.products) ? s.products : []).filter(p => p && p.id && p.name && p.ppm && typeof p.ppm === 'object');
  s.salts = (Array.isArray(s.salts) ? s.salts : []).filter(x => x && x.id && x.name && ((x.el && x.ions) || x.pct));
  s.recipes = (Array.isArray(s.recipes) ? s.recipes : []).filter(r => r && r.id && r.name && Array.isArray(r.items)).map(r => ({ ...r, vol: num(r.vol) > 0 ? num(r.vol) : 500, items: r.items.filter(i => i && (i.mat || (i.fert && i.fert.ppm))).map(i => i.fert ? { fert: { id: String(i.fert.id || ''), name: String(i.fert.name || tl('Nawóz')), unit: i.fert.unit === 'g' ? 'g' : 'ml', ppm: Object.fromEntries(Object.entries(i.fert.ppm).filter(([, v]) => num(v) > 0).map(([k, v]) => [k, num(v)])) }, g: num(i.g) || 0 } : ({ ...i, g: num(i.g) || 0, hyd: num(i.hyd) || 0, purity: num(i.purity) > 0 ? num(i.purity) : 100 })) }));
  s.batches = (Array.isArray(s.batches) ? s.batches : []).filter(b => b && b.id && isDate(b.date));
  // historia obliczeń kalkulatora (7.0): najnowsze na początku, maks. 100; stare kopie bez tego pola – pusta lista
  s.calcLog = (Array.isArray(s.calcLog) ? s.calcLog : []).filter(x => x && x.id && x.type && num(x.ts) > 0 && x.input && typeof x.input === 'object').slice(0, 100);
  s.inputs ||= {}; s.seg ||= {}; s.theme = ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto'; s.adv = !!s.adv;
  return s;
}

/* ---------- wczytanie ---------- */
let state, loadNote = '';
function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(LS); } catch (e) {}
  try {
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { // uszkodzony zapis – spróbuj poprzedniej wersji
    try { const p = localStorage.getItem(LS_PREV); if (p) { loadNote = tl('Bieżący zapis był uszkodzony – przywrócono poprzedni.'); return migrate(JSON.parse(p)); } } catch (e2) {}
  }
  for (const key of LS_OLDS) {
    try { const old = localStorage.getItem(key); if (old) { const s = migrate(JSON.parse(old)); loadNote = tl('Dane z poprzedniej wersji aplikacji zostały przeniesione do wersji 4. Stara kopia pozostała w przeglądarce.'); return s; } }
    catch (e) { loadNote = tl('Nie udało się odczytać starych danych ({0}) – stary zapis nie został usunięty.', key); }
  }
  return blankState();
}
let saveFailed = false, lastGood = null, prevAt = 0;
function save() {
  try {
    const json = JSON.stringify(state);
    if (lastGood && lastGood !== json && Date.now() - prevAt > 600000) { try { localStorage.setItem(LS_PREV, lastGood); prevAt = Date.now(); } catch (e) {} }
    localStorage.setItem(LS, json); lastGood = json;
    if (saveFailed) { saveFailed = false; typeof toast === 'function' && toast(tl('Zapis znów działa')); }
  } catch (e) {
    if (!saveFailed) { saveFailed = true; typeof toast === 'function' && toast(tl('Nie udało się zapisać danych. Zrób kopię zapasową w Ustawieniach.'), 6000); }
  }
}
function initStore() {
  state = loadState();
  try { lastGood = localStorage.getItem(LS); } catch (e) {}
  save();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

/* ---------- przypomnienie o kopii zapasowej ----------
   Dane są tylko w przeglądarce. Kopia „należy się”, gdy jest co tracić (≥ 5 wpisów) i: nigdy jej nie zrobiono,
   minęło ≥ 14 dni i doszły nowe wpisy, albo od kopii doszło ≥ 50 wpisów. „Później” odkłada baner o 3 dni. */
const countEvents = s => Object.values(s.events || {}).reduce((a, x) => a + (x || []).length, 0);
function backupStatus(s, today) {
  const total = countEvents(s), since = s.lastBackup ? L.dnum(today) - L.dnum(s.lastBackup) : null, fresh = total - (s.backupEvents || 0);
  const snoozed = s.backupSnooze && s.backupSnooze > today;
  const due = !snoozed && total >= 5 && (since == null || (since >= 14 && fresh > 0) || fresh >= 50);
  return { due, since, fresh, total };
}
function markBackup(s, today) { s.lastBackup = today; s.backupEvents = countEvents(s); delete s.backupSnooze; }

/* ---------- dostęp ---------- */
const applyTheme = () => { document.documentElement.dataset.theme = state.theme; };
const tank = () => state.tanks.find(t => t.id === state.active) || state.tanks[0];
const EV = (id = tank().id) => (state.events[id] ||= []);
const TASKS = (id = tank().id) => (state.tasks[id] ||= []);
const todayKey = () => L.dkey(new Date());
function addEvent(e, tankId) {
  const date = isDate(e.date) ? e.date : todayKey();
  const ts = date === todayKey() ? Date.now() : tsOfDate(date);
  const ev = { id: uid('e'), ts, ...e, date }; EV(tankId).push(ev); save(); return ev;
}
function removeEvent(id) { const t = tank().id; state.events[t] = EV(t).filter(e => e.id !== id); save(); }
function addTank(name) { const t = defTank(name); state.tanks.push(t); state.events[t.id] = []; state.tasks[t.id] = defTasks(todayKey()); state.active = t.id; save(); return t; }
function removeTank(id) { if (state.tanks.length < 2) return; state.tanks = state.tanks.filter(t => t.id !== id); delete state.events[id]; delete state.tasks[id]; if (state.active === id) state.active = state.tanks[0].id; save(); }

/* ---------- produkty (wbudowane + własne) ---------- */
const BUILTIN_SRC = tl('Skład orientacyjny – producent nie publikuje pełnych danych. Porównaj z etykietą.');
const PRODUCERS = ['ADA', 'API', 'Aqua Art', 'Aqua Rebell', 'AquaVitro', 'Compo', 'Easy-Life', 'Hagen', 'Intermag', 'MasterLine', 'Mikroplant', 'Plantex', 'QualDrop', 'Seachem', 'Sera', 'Tropica', 'Yara', tl('Inny')];
const producerOf = n => { const m = { 'Easy Life': 'Easy-Life', 'Nutrafin': 'Hagen', 'ACS+B': 'Plantex', 'Symfonia': tl('Inny') }; for (const k in m) if (n.startsWith(k)) return m[k]; return PRODUCERS.find(x => n.startsWith(x)) || tl('Inny'); };
const PSTATUS = { verified: [tl('Zweryfikowany'), 'ok'], label: [tl('Z etykiety'), 'info'], recipe: [tl('Własny przepis'), 'ok'], unverified: [tl('Skład orientacyjny'), 'warn'], incomplete: [tl('Wymaga uzupełnienia'), 'bad'] };
// nazwa w listach wyboru: skład orientacyjny (producent nie publikuje pełnego składu) widać od razu, nie dopiero po wybraniu
const pName = p => p.name + (p.status === 'unverified' || (p.source === 'builtin' && !p.status) ? tl(' · skład orientacyjny') : '');
const builtinProducts = () => (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []).map((p, i) => ({ id: 'b' + i, name: p.name, unit: p.unit, ppm: p.ppm, source: 'builtin', note: p.note || BUILTIN_SRC, src: p.src || '', pct: p.pct || null, dens: p.dens || null, producer: p.producer || producerOf(p.name), status: p.status || 'unverified', nNote: p.nNote || null, kind: p.kind || null, doz: p.doz || null }));
const allProducts = () => [...state.products, ...builtinProducts()];
const productById = id => allProducts().find(p => p.id === id);
// ppm: mg/l składnika w 1 l wody po dodaniu 1 ml (płyn) lub 1 g (proszek) = g/l w koncentracie (płyn) / g/kg (proszek)
function doseEffect(p, amount, V) { const out = {}; for (const k in p.ppm) out[k] = p.ppm[k] * amount / V; return out; }

/* ---------- eksport / import samej bazy nawozów (własne sole, receptury, gotowe nawozy) ---------- */
const FERT_TYPE = 'akwarysta-nawozy'; // identyfikator formatu pliku z wcześniejszych wersji – bez zmian, żeby stare pliki dało się wczytać
const fertExport = st => ({ type: FERT_TYPE, version: 1, date: new Date().toISOString().slice(0, 10), salts: st.salts || [], recipes: st.recipes || [], products: (st.products || []).filter(p => !p.rid || (st.recipes || []).some(r => r.id === p.rid)) });
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const numMap = o => isObj(o) && Object.values(o).every(v => typeof v === 'number' && isFinite(v) && v >= 0);
// scala z bieżącą bazą: identyczne pozycje pomija, kolizje id → nowe id (z przepięciem powiązań receptura ↔ produkt ↔ sól)
function fertImport(st, data, uid) {
  if (!isObj(data) || data.type !== FERT_TYPE || !Array.isArray(data.products) || !Array.isArray(data.recipes) || !Array.isArray(data.salts)) throw new Error(tl('To nie jest plik bazy nawozów z tej aplikacji.'));
  const res = { salts: 0, recipes: 0, products: 0, skipped: 0, bad: 0 }, sMap = {}, rMap = {}, pMap = {}, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const take = (arr, list, valid, map, pfx, key) => { for (const x0 of arr) { if (!valid(x0)) { res.bad++; continue; } const x = JSON.parse(JSON.stringify(x0));
    const ex = list.find(y => y.id === x.id); if (ex && same(ex, x)) { res.skipped++; continue; } if (ex || list.some(y => y.name === x.name && same({ ...y, id: 0 }, { ...x, id: 0 }))) { if (!ex) { res.skipped++; continue; } map[x.id] = uid(pfx); x.id = map[x.id]; }
    list.push(x); res[key]++; } };
  st.salts ||= []; st.recipes ||= []; st.products ||= [];
  take(data.salts, st.salts, x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && (isObj(x.el) || numMap(x.pct)), sMap, 's', 'salts');
  take(data.recipes, st.recipes, x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.items) && x.vol > 0, rMap, 'r', 'recipes');
  take(data.products, st.products, x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && ['ml', 'g'].includes(x.unit) && numMap(x.ppm), pMap, 'u', 'products');
  for (const r of st.recipes) { if (r.pid && pMap[r.pid]) r.pid = pMap[r.pid]; for (const it of r.items || []) if (sMap[it.mat]) it.mat = sMap[it.mat]; }
  for (const p of st.products) if (p.rid && rMap[p.rid]) p.rid = rMap[p.rid];
  return res;
}
if (typeof module !== 'undefined') module.exports = { backupStatus, markBackup, migrate, blankState, defTank, SCHEMA, OLD_SALT, producerOf, fertExport, fertImport, FERT_TYPE };

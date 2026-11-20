const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../store.js'), X = require('../chem.js'), Cc = require('../calc.js');

const v3 = () => ({ v: 3, active: 't1', theme: 'dark', adv: true, inputs: { makro: { bottle: '500' } }, seg: {},
  tanks: [{ id: 't1', name: 'Hi-tech 120', V: 112, change: 40, type: 'plant_hi', targets: { NO3: [10, 25] }, tap: { NO3: 8 }, uptake: { NO3: 6 } }],
  events: { t1: [{ id: 'e1', ts: 1, date: '2026-10-01', type: 'measure', NO3: 12, PO4: 0.8 }, { id: 'e2', ts: 2, date: '2026-10-02', type: 'dose', pid: 'u1', ppm: { NO3: 2 } }] },
  tasks: { t1: [{ id: 'k1', kind: 'water', name: 'Podmiana', mode: 'days', days: [0] }] },
  products: [{ id: 'u1', name: 'Mój NPK', unit: 'ml', source: 'recipe', ppm: { NO3: 36.8, K: 23.2 }, recipe: { bottle: 500, grams: { KNO3: 30, KH2PO4: 5, MGSO4_7: 12, CACL2: 0 } } },
    { id: 'u2', name: 'Etykieta X', unit: 'ml', source: 'user', ppm: { Fe: 1 } }] });

test('migracja v3 → v4: dane zachowane, receptura przeniesiona z poprawną formą uwodnienia', () => {
  const s = S.migrate(v3());
  assert.equal(s.v, 4); assert.equal(s.theme, 'dark'); assert.equal(s.adv, true);
  assert.equal(s.events.t1.length, 2); assert.deepEqual(s.tanks[0].targets.NO3, [10, 25]); assert.equal(s.tanks[0].tap.NO3, 8);
  assert.equal(s.recipes.length, 1); const r = s.recipes[0];
  assert.equal(r.vol, 500); assert.equal(r.items.length, 3, 'zerowe pozycje pominięte');
  assert.deepEqual(r.items.find(i => i.mat === 'MgSO4'), { mat: 'MgSO4', hyd: 7, purity: 100, g: 12 });
  assert.equal(s.products.find(p => p.id === 'u1').rid, r.id, 'nawóz powiązany z recepturą');
  assert.equal(s.products.find(p => p.id === 'u2').status, 'label');
  // stężenie z przeniesionej receptury = stężenie liczone starym silnikiem
  const sol = X.solution(r.items, r.vol), old = Cc.mixToIons(0.5, { KNO3: 30, KH2PO4: 5, MGSO4_7: 12 }).ppm; // mg/l w 0,5 l = mg/l
  for (const k of ['NO3', 'K', 'PO4', 'Mg']) assert.ok(Math.abs(sol.conc[k] * 1000 - old[k]) / old[k] < 3e-4, k);
});
test('migracja v3 → v4: nowe pola profilu mają wartości domyślne', () => {
  const t = S.migrate(v3()).tanks[0];
  for (const f of ['ro', 'tap', 'targets']) assert.equal(typeof t[f], 'object');
  assert.deepEqual(t.fert, []); assert.equal(t.Vgross, ''); assert.equal(t.tech, '');
});
test('migracja v2 → v4 (przez v3)', () => {
  const v2 = { tanks: [{ id: 'a', name: 'Stary', V: '60', change: 30, sched: { macro: [1, 4], wc: [6] } }], journal: { a: [{ date: '2026-01-05', NO3: '10', note: 'x' }] }, inputs: { gotowe: { rows: [{ idx: 3, amount: 2, per: 7 }] } } };
  const s = S.migrate(v2);
  assert.equal(s.v, 4); assert.equal(s.tanks[0].V, 60); assert.equal(s.events.a[0].NO3, 10); assert.equal(s.tasks.a.length, 2); assert.equal(s.inputs.gotowe.rows[0].pid, 'b3');
  assert.deepEqual(s.recipes, []); assert.deepEqual(s.salts, []);
});
test('v4 → v4 idempotentne; naprawa uszkodzonych pól', () => {
  const a = S.migrate(v3()), b = S.migrate(JSON.parse(JSON.stringify(a)));
  assert.equal(b.recipes.length, 1); assert.equal(b.recipes[0].id, a.recipes[0].id);
  const bad = JSON.parse(JSON.stringify(a)); bad.recipes.push({ id: 'x' }); bad.salts = 'zepsute'; bad.tanks[0].fert = null; bad.recipes[0].items[0].purity = -5;
  const c = S.migrate(bad); assert.equal(c.recipes.length, 1); assert.deepEqual(c.salts, []); assert.deepEqual(c.tanks[0].fert, []); assert.equal(c.recipes[0].items[0].purity, 100);
});
test('odrzucenie plików, które nie są kopią', () => {
  assert.throws(() => S.migrate(null)); assert.throws(() => S.migrate({ tanks: [] })); assert.throws(() => S.migrate({ foo: 1 }));
});
test('mapowanie starych identyfikatorów soli – wszystkie istnieją w nowej bazie', () => {
  for (const [old, [id, h]] of Object.entries(S.OLD_SALT)) {
    assert.ok(X.MATERIALS[id], id); assert.ok(X.MATERIALS[id].hyd.includes(h), id + ' hyd ' + h);
    assert.ok(Math.abs(X.molarMass(X.mat(id), h) - Cc.SALTS[old].M) / Cc.SALTS[old].M < 3e-4, old + ' masa molowa');
  }
});
test('producent z nazwy produktu', () => {
  assert.equal(S.producerOf('Easy Life Ferro'), 'Easy-Life'); assert.equal(S.producerOf('Tropica Plant Nutrition'), 'Tropica'); assert.equal(S.producerOf('Coś'), 'Inny');
});
test('migracja: rodzaj wody z udziału RO', () => {
  const a = v3(); a.tanks[0].roFrac = 40; assert.equal(S.migrate(a).tanks[0].water, 'mix');
  const b = v3(); b.tanks[0].roFrac = 100; assert.equal(S.migrate(b).tanks[0].water, 'ro');
  assert.equal(S.migrate(v3()).tanks[0].water, 'tap');
});
test('baza nawozów: eksport i import bez duplikatów, kolizje id z przepięciem powiązań', () => {
  const S = require('../store.js');
  const a = { salts: [{ id: 's1', name: 'Moja sól', el: { K: 2, S: 1, O: 4 }, ions: { K: 2, SO4: 1 }, hyd: [0] }], recipes: [{ id: 'r1', name: 'NPK', vol: 500, items: [{ mat: 's1', hyd: 0, g: 5 }], pid: 'u1' }],
    products: [{ id: 'u1', name: 'NPK', unit: 'ml', ppm: { K: 4.5 }, rid: 'r1' }, { id: 'u2', name: 'Ferro', unit: 'ml', ppm: { Fe: 10 } }] };
  const d = S.fertExport(a); assert.equal(d.type, S.FERT_TYPE); assert.equal(d.products.length, 2);
  const b = { salts: [], recipes: [], products: [] }; let n = 0; const uid = p => p + 'X' + (++n);
  let r = S.fertImport(b, JSON.parse(JSON.stringify(d)), uid); assert.deepEqual([r.salts, r.recipes, r.products], [1, 1, 2]);
  r = S.fertImport(b, JSON.parse(JSON.stringify(d)), uid); assert.equal(r.skipped, 4); assert.equal(b.products.length, 2);
  const c = { salts: [{ id: 's1', name: 'Inna', pct: { K: 10 } }], recipes: [{ id: 'r1', name: 'Inna', vol: 100, items: [] }], products: [{ id: 'u1', name: 'Inny', unit: 'g', ppm: { K: 1 } }] };
  S.fertImport(c, JSON.parse(JSON.stringify(d)), uid);
  const rec = c.recipes.find(x => x.name === 'NPK'), prod = c.products.find(x => x.name === 'NPK');
  assert.notEqual(rec.id, 'r1'); assert.equal(rec.pid, prod.id); assert.equal(prod.rid, rec.id); assert.equal(rec.items[0].mat, c.salts.find(x => x.name === 'Moja sól').id);
  assert.throws(() => S.fertImport(b, { type: 'x' }, uid), /nie jest plik/);
  r = S.fertImport(b, { type: S.FERT_TYPE, salts: [], recipes: [], products: [{ id: 'z', name: 'Zły', unit: 'l', ppm: { K: -1 } }] }, uid); assert.equal(r.bad, 1);
});
test('import starej kopii: pole uptake (szacowane zużycie) jest pomijane', () => {
  const s = S.migrate(v3());
  assert.equal('uptake' in s.tanks[0], false); assert.deepEqual(s.tanks[0].tap, { NO3: 8 });
});
test('przypomnienie o kopii: brak kopii, 14 dni z nowymi wpisami, 50 wpisów, „Później”', () => {
  const ev = n => Array.from({ length: n }, (_, i) => ({ id: 'e' + i })), st = (n, o = {}) => ({ events: { t: ev(n) }, ...o });
  assert.equal(S.backupStatus(st(3), '2026-11-18').due, false, 'za mało danych');
  assert.equal(S.backupStatus(st(6), '2026-11-18').due, true, 'nigdy nie zrobiono kopii');
  assert.equal(S.backupStatus(st(10, { lastBackup: '2026-11-01', backupEvents: 10 }), '2026-11-18').due, false, 'brak nowych wpisów');
  assert.equal(S.backupStatus(st(12, { lastBackup: '2026-11-01', backupEvents: 10 }), '2026-11-18').due, true, '17 dni i nowe wpisy');
  assert.equal(S.backupStatus(st(12, { lastBackup: '2026-11-10', backupEvents: 10 }), '2026-11-18').due, false, '8 dni');
  assert.equal(S.backupStatus(st(70, { lastBackup: '2026-11-17', backupEvents: 10 }), '2026-11-18').due, true, '60 nowych wpisów');
  assert.equal(S.backupStatus(st(6, { backupSnooze: '2026-11-20' }), '2026-11-18').due, false, 'odłożone');
  const s = st(8); S.markBackup(s, '2026-11-18'); assert.equal(s.backupEvents, 8); assert.equal(S.backupStatus(s, '2026-11-18').due, false);
});

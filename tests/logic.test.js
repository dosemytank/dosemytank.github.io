const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../logic.js'), D = L.DAY;
const tank = (o = {}) => ({ id: 't', name: 'T', V: 100, change: 30, type: 'plant_lo', targets: {}, tap: {}, ...o });
const T0 = Date.UTC(2026, 9, 1, 12);
const day = n => ({ ts: T0 + n * D, date: new Date(T0 + n * D).toISOString().slice(0, 10) });

test('wolny amoniak zależy od pH (Emerson 1975)', () => {
  const a = L.freeNH3(1, 7, 25).frac, b = L.freeNH3(1, 8, 25).frac; assert.ok(b / a > 9 && b / a < 10.5);
  assert.ok(Math.abs(L.freeNH3(1, 9.25, 25).frac - 0.5) < 0.03);
});
test('ocena Mg i Ca tylko gdy użytkownik ustawi cel', () => {
  assert.equal(L.evaluate(tank(), { Mg: 2 }).length, 0);
  const e = L.evaluate(tank({ targets: { Mg: [5, 15] } }), { Mg: 2 }); assert.equal(e[0].k, 'Mg'); assert.equal(e[0].sev, 'warn');
});
test('eksport .ics: dni tygodnia i co N dni', () => {
  const s = L.icsFor('Akw, 1', [{ id: 'a', name: 'Makro', mode: 'days', days: [1, 3] }, { id: 'b', name: 'Filtr', mode: 'every', every: 14 }, { id: 'c', name: 'Pusty', mode: 'days', days: [] }], '2026-11-17');
  assert.ok(s.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')); assert.ok(s.includes('RRULE:FREQ=DAILY;INTERVAL=14')); assert.ok(s.includes('SUMMARY:Akw\\, 1: Makro'));
  assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, 2); assert.ok(s.includes('DTSTART:20261117T180000')); assert.ok(s.endsWith('\r\n'));
});
test('terminy zadań co N dni i wg dni tygodnia', () => {
  const k = { id: 'k', kind: 'filter', mode: 'every', every: 7, start: '2026-11-01' };
  assert.equal(L.taskStatus(k, [{ type: 'task', taskId: 'k', date: '2026-11-10' }], '2026-11-17').due, true);
  assert.equal(L.taskStatus(k, [{ type: 'task', taskId: 'k', date: '2026-11-12' }], '2026-11-17').due, false);
});
test('woda do podmian: kranówka, RO, miks', () => {
  const t = tank({ tap: { NO3: 20 }, ro: { NO3: 0 }, roFrac: 25 });
  assert.equal(L.tapOf({ ...t, water: 'tap' }, 'NO3'), 20); assert.equal(L.tapOf({ ...t, water: 'ro' }, 'NO3'), 0);
  assert.equal(L.tapOf({ ...t, water: 'mix' }, 'NO3'), 15); assert.equal(L.tapOf({ ...t, water: 'mix' }, 'K'), 0);
});
test('kontroler: suma z kilku nawozów, duplikaty, brakujące dane', () => {
  const P = { a: { name: 'NPK', unit: 'ml', ppm: { NO3: 36.8, PO4: 2.2, K: 26.1 } }, b: { name: 'Mikro', unit: 'ml', ppm: { Fe: 1.2, K: 7 } }, c: { name: 'Pusty', unit: 'ml', ppm: {} } };
  const r = L.planTotals([{ pid: 'a', amt: 10, n: 3 }, { pid: 'b', amt: 5, n: 2 }, { pid: 'c', amt: 5, n: 1 }, { pid: 'x', amt: 1, n: 1 }, { pid: 'a', amt: '', n: 2 }], id => P[id], 100);
  assert.ok(Math.abs(r.total.NO3 - 11.04) < 1e-9); assert.ok(Math.abs(r.total.K - (7.83 + 0.7)) < 1e-9); assert.ok(Math.abs(r.total.Fe - 0.12) < 1e-12);
  assert.deepEqual(r.dup, ['K']); assert.equal(r.by.K.length, 2);
  assert.equal(r.missing.length, 3); assert.ok(r.missing.some(m => /składu/.test(m.reason))); assert.ok(r.missing.some(m => /usunięty/.test(m.reason)));
  assert.equal(L.planTotals([{ pid: 'a', amt: 1, n: 1 }], id => P[id], 0).missing.length, 1);
});
test('kontroler: okres z dziennika i stan ustalony', () => {
  const evs = [{ ...day(1), type: 'dose', pid: 'a', name: 'NPK', amount: 10, ppm: { NO3: 3 } }, { ...day(3), type: 'dose', pid: 'a', name: 'NPK', amount: 10, ppm: { NO3: 3 } }, { ...day(20), type: 'dose', pid: 'a', ppm: { NO3: 3 } }, { ...day(2), type: 'water', frac: 0.3 }];
  const r = L.periodTotals(evs, T0, T0 + 7 * D); assert.equal(r.total.NO3, 6); assert.equal(r.byProduct.a.count, 2); assert.equal(r.byProduct.a.amount, 20);
  assert.equal(L.steadyState(6, 0.3, 0), 20); assert.ok(Math.abs(L.steadyState(6, 0.3, 5) - (6 + 1.5) / 0.3) < 1e-9); assert.equal(L.steadyState(6, 0), null);
});
test('CO₂ jako pasmo: wartość środkowa w pasie, ocena podaje zakres', () => {
  const C = require('../calc.js'), [lo, hi] = C.co2Range(6.8, 4), mid = C.co2(6.8, 4);
  assert.ok(lo < mid && mid < hi); assert.ok(hi / lo > 1.8, 'pH ±0,1 i KH ±0,5 dają szerokie pasmo');
  const e = L.evaluate(tank({ type: 'plant_hi' }), { pH: 6.8, KH: 4 }).find(x => x.k === 'CO2');
  assert.ok(/^Ok\. \d+–\d+ mg\/l/.test(e.msg)); assert.ok(e.lo < e.v && e.v < e.hi);
});
test('trend: przy 3 testach tylko kierunek, od 4 testów tempo', () => {
  const t = tank({ targets: { NO3: [5, 20] } }), mk = vals => vals.map((v, i) => ({ ...day(i * 7), type: 'measure', NO3: v }));
  const r3 = L.trends(t, mk([10, 14, 18]), T0 + 15 * D).find(x => x.k === 'NO3');
  assert.ok(r3 && !/\/tydz/.test(r3.msg) && /rośnie/.test(r3.msg));
  const r4 = L.trends(t, mk([8, 11, 14, 18]), T0 + 22 * D).find(x => x.k === 'NO3');
  assert.ok(r4 && /\/tydz/.test(r4.msg));
});
test('narastanie: stan ustalony bez poboru (sole zachowawcze)', () => {
  assert.equal(L.steadyState(10, 0.5, 20), 40); assert.equal(L.steadyState(0, 0.3, 15), 15);
});

test('zapas nawozu: odejmuje zapisane dawki i liczy dni', () => {
  const now = T0 + 10 * D, st = { left: 100, at: T0 };
  const evs = [{ type: 'dose', pid: 'a', amount: 10, ts: T0 + D }, { type: 'dose', pid: 'a', amount: 10, ts: T0 + 3 * D }, { type: 'dose', pid: 'b', amount: 50, ts: T0 + 3 * D }, { type: 'dose', pid: 'a', amount: 99, ts: T0 - D }];
  const r = L.stockStatus(st, evs, 'a', 14, now); // 14 / tydz. = 2 / dzień
  assert.equal(r.left, 80); assert.equal(r.days, 40); assert.equal(r.perDay, 2);
  assert.equal(L.stockStatus(null, evs, 'a', 14, now), null);
  assert.equal(L.stockStatus({ left: 5, at: T0 }, [{ type: 'dose', pid: 'a', amount: 9, ts: T0 + D }], 'a', 7, now).left, 0);
  assert.equal(L.stockStatus(st, [], 'a', 0, now).days, null);
});

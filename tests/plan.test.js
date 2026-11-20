const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../logic.js');
test('spreadDays: równe rozłożenie dawek', () => {
  assert.deepEqual(P.spreadDays(1), [1]); assert.deepEqual(P.spreadDays(2), [1, 5]); assert.deepEqual(P.spreadDays(3).length, 3);
  assert.deepEqual(P.spreadDays(7).sort(), [0, 1, 2, 3, 4, 5, 6]); assert.deepEqual(P.spreadDays(0), []);
});
test('doseTasksFromPlan: z planu, bez duplikatów, bez zmiany istniejących', () => {
  const prod = id => ({ a: { id: 'a', name: 'NPK', unit: 'ml', kind: 'macro' }, b: { id: 'b', name: 'Fe', unit: 'ml', kind: 'fe' } })[id];
  let i = 0; const uid = () => 'k' + (++i);
  const plan = [{ pid: 'a', amt: 5, n: 3 }, { pid: 'b', amt: 2, n: 2 }, { pid: 'x', amt: 1, n: 1 }, { pid: 'a', amt: 0, n: 1 }];
  const r = P.doseTasksFromPlan(plan, prod, [{ pid: 'b', amt: 9 }], '2026-11-17', uid);
  assert.equal(r.length, 1); assert.equal(r[0].pid, 'a'); assert.equal(r[0].amt, 5); assert.equal(r[0].kind, 'dose_macro'); assert.equal(r[0].days.length, 3);
});
test('zadanie dawki odhaczone wpisem z taskId', () => {
  const task = { id: 'k1', kind: 'dose_macro', mode: 'days', days: [2], start: '2026-11-01' };
  const ev = [{ type: 'dose', taskId: 'k1', date: '2026-11-17' }];
  assert.equal(P.taskStatus(task, ev, '2026-11-17').doneToday, true);
});
test('test wody dzień przed podmianą', () => {
  let i = 0; const uid = () => 't' + (++i);
  const a = P.testBeforeWater({ id: 'w', kind: 'water', mode: 'days', days: [0, 3] }, '2026-11-17', uid);
  assert.deepEqual(a.days, [6, 2]); assert.equal(a.kind, 'test'); assert.equal(a.before, 'w');
  const b = P.testBeforeWater({ id: 'w', kind: 'water', mode: 'every', every: 7, start: '2026-11-20' }, '2026-11-17', uid);
  assert.equal(b.every, 7); assert.equal(b.start, '2026-11-19');
  // podmiana co 7 dni od 18.11 → test 17.11 (dziś) i potem co 7 dni
  const c = P.testBeforeWater({ id: 'w', kind: 'water', mode: 'every', every: 7, start: '2026-11-18' }, '2026-11-17', uid);
  assert.equal(P.taskStatus(c, [], '2026-11-17').due, true);
  assert.equal(P.testBeforeWater({ kind: 'filter' }, '2026-11-17', uid), null);
});

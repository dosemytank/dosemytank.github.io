const test = require('node:test'), assert = require('node:assert/strict');
const D = require('../diag.js');
test('dziury w liściach ≠ automatycznie potas: zawsze kilka przyczyn', () => {
  const r = D.plant({ symptoms: ['holes'], where: 'unknown', params: {} });
  assert.ok(r.causes.length >= 3); assert.ok(r.causes.some(c => c.id === 'pests')); assert.ok(r.causes.some(c => c.id === 'K'));
  assert.ok(r.dataWarn.some(w => /Brak aktualnych pomiarów/.test(w)));
});
test('żółknięcie starych liści + niski NO3 → azot na górze, ale nie jedyny', () => {
  const r = D.plant({ symptoms: ['yellow'], where: 'old', params: { NO3: 1, PO4: 0.5, GH: 6 } });
  assert.equal(r.causes[0].id, 'N'); assert.ok(r.causes.length > 1); assert.ok(r.fert.some(f => /NO₃ 1/.test(f)));
});
test('blade młode liście przy wysokim pH → Fe i dostępność, nie N', () => {
  const r = D.plant({ symptoms: ['pale_new'], where: 'new', params: { pH: 7.9, NO3: 15 } });
  assert.ok(['Fe', 'pH'].includes(r.causes[0].id)); assert.ok(!r.causes.some(c => c.id === 'N'));
});
test('objaw tylko u części gatunków obniża wagę ogólnych niedoborów', () => {
  const a = D.plant({ symptoms: ['yellow'], where: 'old', params: {} }), b = D.plant({ symptoms: ['yellow'], where: 'old', scope: 'some', params: {} });
  assert.ok(b.causes.some(c => c.id === 'species')); assert.ok(b.causes.find(c => c.id === 'N').w < a.causes.find(c => c.id === 'N').w);
});
test('krótkie trwanie i zmiana nawożenia – ostrzeżenia, bezpieczne kroki', () => {
  const r = D.plant({ symptoms: ['melt'], duration: 'short', fertChanged: true, params: { NO3: 10 } });
  assert.ok(r.dataWarn.some(w => /krócej niż tydzień/.test(w))); assert.ok(r.causes.some(c => c.id === 'fertChange')); assert.ok(r.steps.some(s => /jedną rzecz/.test(s)));
  assert.equal(D.plant({ symptoms: [] }).dataWarn[0], 'Nie wybrano objawów.');
});
test('glony: sinice przy niskim NO3 – nie każe obcinać NO3', () => {
  const r = D.algae({ types: ['cyano'], params: { NO3: 2, PO4: 1 }, photo: 7 });
  assert.ok(r.causes.some(c => /mało azotanów/.test(c.title))); assert.ok(r.avoid.some(a => /Nie obcinaj/.test(a)));
  assert.ok(!JSON.stringify(r.steps).match(/ogranicz (NO|nawoż)/i));
});
test('glony: braki danych i młody zbiornik', () => {
  const r = D.algae({ types: ['diatom'], ageWeeks: 4, params: {} });
  assert.ok(r.causes.some(c => /nowego|Młody/.test(c.title))); assert.ok(r.dataWarn.length >= 2);
  assert.equal(D.algae({ types: [] }).dataWarn[0], 'Nie wybrano rodzaju glonów.');
});

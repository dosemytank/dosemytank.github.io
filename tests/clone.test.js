const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../clone.js'), X = require('../chem.js'), { PRODUCTS } = require('../products.js');
const byName = n => PRODUCTS.find(p => p.name === n);

test('NNLS: dokładne rozwiązanie nieujemne i zero tam, gdzie trzeba', () => {
  const x = K.nnls([[1, 0], [0, 1]], [2, 3], [1, 1]); assert.ok(Math.abs(x[0] - 2) < 1e-9 && Math.abs(x[1] - 3) < 1e-9);
  const y = K.nnls([[1, 1]], [-1], [1]); assert.deepEqual(y, [0, 0]);
});
test('odpowiednik nawozu azotowego: ten sam NO₃ i K, bez Ca i NH₄', () => {
  const r = K.cloneOf(byName('Easy Life Nitro').ppm, { bottle: 500 });
  assert.equal(r.split, false); assert.ok(r.match);
  const d = Object.fromEntries(r.diff.map(x => [x.k, x])); assert.ok(Math.abs(d.NO3.dev) < 0.01 && Math.abs(d.K.dev) < 0.01);
  assert.ok(!d.Ca && !d.NH4); assert.ok(r.bottles[0].items.some(i => i.mat === 'KNO3'));
});
test('kompletny nawóz z Ca, PO₄ i mikro: dwie butelki, bez ostrzeżeń o wytrącaniu', () => {
  const r = K.cloneOf(byName('Seachem Flourish').ppm, { bottle: 500 });
  assert.equal(r.split, true); assert.equal(r.bottles.length, 2); assert.ok(r.match);
  const [A, B] = r.bottles; assert.ok(!(A.conc.Ca > 0) && !(B.conc.PO4 > 0), 'Ca i PO₄ w różnych butelkach');
  assert.ok(r.bottles.every(b => !b.warn.some(w => /wytrąc/.test(w.t))));
});
test('metale z siarczanów dostają EDTA (1 mol na mol metalu)', () => {
  const r = K.cloneOf({ Mn: 1 }, { bottle: 1000 }), it = r.bottles[0].items;
  const mn = it.find(i => i.mat === 'MnSO4'), ed = it.find(i => i.mat === 'Na2EDTA'); assert.ok(mn && ed);
  const molMn = mn.g / X.molarMass(X.MATERIALS.MnSO4, 1), molE = ed.g / X.molarMass(X.MATERIALS.Na2EDTA, 2); assert.ok(Math.abs(molMn / molE - 1) < 0.01);
});
test('za mało azotu z azotanów K i Mg: bez zgody nie dodaje NH₄, ze zgodą trafia w NO₃', () => {
  const p = byName('Tropica Specialised Nutrition').ppm, a = K.cloneOf(p, { bottle: 500 }), b = K.cloneOf(p, { bottle: 500, nh4: true });
  const no3 = r => r.diff.find(d => d.k === 'NO3').dev;
  assert.ok(!a.diff.some(d => d.k === 'NH4')); assert.ok(no3(a) < -0.05); assert.ok(Math.abs(no3(b)) < 0.01);
});
test('proszek: sucha mieszanka na 100 g, bez podziału, z wypełniaczem', () => {
  const r = K.cloneOf(byName('Plantex CSM+B').ppm, { powder: true }); assert.equal(r.split, false); assert.ok(r.match);
  const sum = r.bottles[0].items.reduce((a, i) => a + i.g, 0); assert.ok(sum < 100 && Math.abs(sum + r.filler - 100) < 1e-6);
});
test('presety: PPS-Pro przeskalowany, EI z celami tygodniowymi', () => {
  const s = K.presetScale(K.DIY_PRESETS.ppspro, 1000); assert.equal(s.find(i => i.mat === 'KNO3').g, 66);
  assert.deepEqual(K.DIY_PRESETS.ei.week, { NO3: 20, PO4: 3, K: 30, Mg: 10 });
});

/* ---------- 7.0: podział odpowiednika tą samą regułą co kalkulator (X.compat) ---------- */
const FIXC = require('./fixtures/clone-6.11.json');
test('odpowiednik 7.0: żadna butelka nie łamie reguł niezgodności (wszystkie produkty wbudowane)', () => {
  for (const p of PRODUCTS.filter(p => p.ppm && Object.keys(p.ppm).length && p.unit !== 'g')) {
    const r = K.cloneOf(p.ppm, { bottle: 500 });
    for (const b of r.bottles) assert.deepEqual(X.compatIssues(b.conc).map(c => c.code), [], p.name + ' ' + b.label);
  }
});
test('odpowiednik 7.0: względem 6.11 zmieniają się tylko udokumentowane przypadki', () => {
  // ADA Green Brightly lights/shade: NH₄ + Mg + PO₄ (struwit) – teraz dwie butelki; Aqua Rebell Makro Spezial N: same azotany Ca, K, Mg – jedna butelka
  const CHANGED = ['ADA Green Brightly lights|{}', 'ADA Green Brightly shade|{}', 'Aqua Rebell Makro Spezial N|{}'];
  for (const x of FIXC) {
    const r = K.cloneOf(PRODUCTS[+x.id.slice(1)].ppm, { bottle: 500, ...x.opt }), key = x.name + '|' + JSON.stringify(x.opt);
    const now = r.bottles.map(b => ({ label: b.label, items: b.items.map(i => [i.mat + '|' + i.hyd, i.g]) })), old = x.bottles.map(b => ({ label: b.label, items: b.items }));
    if (CHANGED.includes(key)) assert.notDeepEqual(now, old, key + ' powinien się zmienić'); else assert.deepEqual(now, old, key);
  }
  const ada = K.cloneOf(byName('ADA Green Brightly lights').ppm, { bottle: 500 });
  assert.equal(ada.bottles.length, 2); assert.ok(ada.match);
  assert.equal(K.cloneOf(byName('Aqua Rebell Makro Spezial N').ppm, { bottle: 500 }).bottles.length, 1);
  assert.equal(K.cloneConflict(byName('Seachem Flourish').ppm), true); assert.equal(K.cloneConflict(byName('Easy Life Nitro').ppm), false);
});

// Dane kalkulatorów (nawozy-dane.js): jedno źródło przepisów na identyfikatorach chem.js.
const test = require('node:test'), assert = require('node:assert/strict');
const D = require('../nawozy-dane.js'), X = require('../chem.js');
test('wszystkie surowce i formy uwodnienia istnieją w chem.js', () => assert.deepEqual(D.check(), []));
test('PMDD: molibdenian zamieniony na AHM·4H₂O z zachowaniem ilości Mo (0,06 g/l (NH₄)₂Mo₄O₁₃·2H₂O)', () => {
  // M (NH₄)₂Mo₄O₁₃·2H₂O = 2·14,007 + 12·1,008 + 4·95,95 + 15·15,999 ≈ 663,9 g/mol
  const moOrig = 0.06 * 4 * 95.95 / 663.895, ahm = D.PMDD.items.find(i => i.mat === 'AHM');
  assert.ok(Math.abs(ahm.g * X.fractions(X.MATERIALS.AHM, 4).Mo - moOrig) < 1e-9);
  assert.ok(Math.abs(ahm.g - 0.06386) < 1e-4);
});
test('PMDD: skład oryginalnego przepisu (g/l)', () => {
  const g = Object.fromEntries(D.PMDD.items.map(i => [i.mat + '|' + i.hyd, i.g]));
  assert.deepEqual([g['KNO3|0'], g['K2SO4|0'], g['MgSO4|7'], g['FeSO4|7'], g['Na2EDTA|2']], [12, 28, 66, 6.2712, 11.4804]);
});
test('cele startowe i EI – wartości z 6.11', () => {
  assert.deepEqual(D.START.mid.week, { NO3: 10, PO4: 1, K: 10, Mg: 3 }); assert.equal(D.START.high.fe, 0.3);
  for (const lv of ['low', 'mid', 'high']) for (const k in D.START[lv].week) assert.ok(D.START[lv].week[k] < D.DIY.ei.week[k], `${lv} ${k} poniżej EI`);
  assert.deepEqual(D.DIY.ei.week, { NO3: 20, PO4: 3, K: 30, Mg: 10 });
  assert.deepEqual(D.presetScale(D.DIY.ppspro, 250).map(i => i.g), [14.5, 16.5, 1.5, 10]);
});

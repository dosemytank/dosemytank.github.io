// Niezgodności w butelce: jedna reguła (X.compatIssues / X.compat) dla ostrzeżeń i podziału na butelki.
const test = require('node:test'), assert = require('node:assert/strict');
const X = require('../chem.js');
const codes = items => X.compatIssues(X.solution(items, 500).conc).map(c => c.code);
const it = (mat, g, hyd = 0) => ({ mat, hyd, g });

test('reguły: każda para niezgodna daje swój kod, zgodne – nic', () => {
  assert.deepEqual(codes([it('KH2PO4', 1), it('CaCl2', 5, 2)]), ['ca_po4']);
  assert.deepEqual(codes([it('KH2PO4', 1), it('FeSO4', 0.5, 7)]), ['fe_po4']);
  assert.deepEqual(codes([it('KH2PO4', 1), it('MnSO4', 0.1, 1)]), ['met_po4'], 'Mn + PO₄ – w 6.11 bez ostrzeżenia');
  assert.deepEqual(codes([it('KH2PO4', 1), it('ZnSO4', 0.1, 7)]), ['met_po4']);
  assert.deepEqual(codes([it('NH4H2PO4', 2), it('MgSO4', 10, 7)]), ['struvite']);
  assert.deepEqual(codes([it('CaCl2', 5, 2), it('KHCO3', 2)]), ['ca_co3']);
  assert.deepEqual(codes([it('MgSO4', 10, 7), it('K2CO3', 2)]), ['mg_co3']);
  assert.deepEqual(codes([it('FeSO4', 0.5, 7), it('KHCO3', 2)]), ['met_co3']);
  assert.deepEqual(codes([it('KNO3', 10), it('KH2PO4', 1), it('K2SO4', 13), it('MgSO4', 21, 7)]), [], 'typowe makro');
  assert.deepEqual(codes([it('FeSO4', 3, 7), it('MnSO4', 0.5, 1), it('H3BO3', 0.6), it('Na2EDTA', 5.7, 2)]), [], 'typowe mikro');
  assert.deepEqual(codes([it('KH2PO4', 1), it('H3BO3', 0.6)]), [], 'B z PO₄ – zgodne');
});
test('gips: Ca + SO₄ dopiero powyżej iloczynu stężeń 1,4·10⁻⁴ (mol/l)²', () => {
  // 0,05 g CaCl2·2H2O i 0,05 g K2SO4 w 500 ml: (0,068 mmol/0,5 l)·(0,287 mmol/0,5 l) ≈ 7,8·10⁻⁸ – bez ostrzeżenia
  assert.deepEqual(codes([it('CaCl2', 0.05, 2), it('K2SO4', 0.05)]), []);
  assert.deepEqual(codes([it('CaCl2', 5, 2), it('K2SO4', 5)]), ['ca_so4']);
});

test('podział: makro + Ca + mikro → Ca i metale nie trafiają do butelki z fosforanem', () => {
  const r = X.compat([it('KNO3', 10), it('KH2PO4', 1), it('MgSO4', 20, 7), it('CaCl2', 5, 2), it('FeSO4', 0.5, 7), it('Na2EDTA', 0.7, 2)], 500);
  const where = m => r.bottles.findIndex(b => b.items.some(i => i.mat === m));
  assert.equal(where('KNO3'), 0); assert.equal(where('KH2PO4'), 0);
  assert.notEqual(where('CaCl2'), 0); assert.notEqual(where('FeSO4'), 0);
  assert.equal(where('Na2EDTA'), where('FeSO4'), 'EDTA razem z metalem');
  assert.ok(r.issues.length > 0, 'w jednej butelce byłyby niezgodności');
});
test('podział: struwit – MAP i siarczan magnezu w osobnych butelkach (w 6.11 bez podziału)', () => {
  const r = X.compat([it('NH4H2PO4', 2), it('MgSO4', 10, 7), it('KNO3', 5)], 500);
  assert.equal(r.bottles.length, 2); assert.ok(r.bottles.every(b => !(b.conc.NH4 > 0 && b.conc.Mg > 0 && b.conc.PO4 > 0)));
});
test('podział: zgodny zestaw zostaje w jednej butelce; puste i zerowe pozycje pomijane', () => {
  assert.equal(X.compat([it('KNO3', 10), it('K2SO4', 13), it('KH2PO4', 0)], 500).bottles.length, 1);
  assert.equal(X.compat([], 500).bottles.length, 0);
});
test('podział: surowiec niezgodny sam ze sobą dostaje własną butelkę', () => {
  const custom = [{ id: 'u1', name: 'Fosforan wapnia (test)', el: { Ca: 1, H: 4, P: 2, O: 8 }, ions: { Ca: 1, PO4: 2 }, hyd: [0] }];
  const r = X.compat([it('KNO3', 5), it('u1', 1)], 500, custom);
  assert.equal(r.self.length, 1); assert.equal(r.bottles.find(b => b.items.includes(r.self[0])).items.length, 1);
});

// test właściwości: losowe zestawy soli z bazy – żadna butelka nie łamie reguł, każdy surowiec jest dokładnie raz
test('właściwość: 500 losowych zestawów – w żadnej butelce Ca z PO₄/węglanami, metal z PO₄, NH₄+Mg+PO₄', () => {
  let seed = 20261119; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const ids = Object.keys(X.MATERIALS), forms = ids.flatMap(id => X.MATERIALS[id].pct ? [[id, 0]] : X.MATERIALS[id].hyd.map(h => [id, h]));
  const pos = (c, k) => (c[k] || 0) > 0;
  let splits = 0;
  for (let n = 0; n < 500; n++) {
    const k = 2 + Math.floor(rnd() * 7), items = Array.from({ length: k }, () => { const [mat, hyd] = forms[Math.floor(rnd() * forms.length)]; return { mat, hyd, g: +(0.01 + rnd() * 30).toFixed(3) }; });
    const vol = [100, 500, 1000][Math.floor(rnd() * 3)], r = X.compat(items, vol);
    assert.equal(r.bottles.reduce((s, b) => s + b.items.length, 0), items.length, 'każdy surowiec raz');
    for (const b of r.bottles) {
      if (b.items.length === 1 && r.self.includes(b.items[0])) continue;
      const c = X.solution(b.items, vol).conc, metal = ['Fe', 'Mn', 'Zn', 'Cu', 'Co'].some(m => pos(c, m));
      const msg = JSON.stringify(b.items.map(i => i.mat));
      assert.ok(!(pos(c, 'Ca') && (pos(c, 'PO4') || pos(c, 'CO3') || pos(c, 'HCO3'))), 'Ca: ' + msg);
      assert.ok(!(metal && (pos(c, 'PO4') || pos(c, 'CO3') || pos(c, 'HCO3'))), 'metal: ' + msg);
      assert.ok(!(pos(c, 'NH4') && pos(c, 'Mg') && pos(c, 'PO4')), 'struwit: ' + msg);
      assert.ok(!(pos(c, 'Mg') && pos(c, 'CO3')), 'MgCO3: ' + msg);
    }
    if (r.bottles.length > 1) splits++;
  }
  assert.ok(splits > 100, 'za mało przypadków z podziałem: ' + splits);
});

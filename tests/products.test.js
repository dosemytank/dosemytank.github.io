const test = require('node:test'), assert = require('node:assert/strict');
const { PRODUCTS } = require('../products.js'), X = require('../chem.js');
const MG = X.AW.Mg / (X.AW.Mg + X.AW.O);
test('kolejność bazy zachowana (id w dzienniku = indeks)', () => {
  assert.equal(PRODUCTS[0].name, 'ADA Bright K'); assert.equal(PRODUCTS[20].name, 'Intermag Mikro Plus'); assert.equal(PRODUCTS[26].name, 'Plantex CSM+B'); assert.equal(PRODUCTS[28].name, 'Symfonia złota');
});
test('składy z etykiet: mg/l na 1 g (lub ml) w 1 l = % × 10 (× gęstość dla płynów)', () => {
  for (const p of PRODUCTS.filter(x => x.pct)) {
    assert.ok(p.src && p.status === 'label', p.name + ': źródło');
    const k = p.unit === 'ml' ? 10 * p.dens : 10;
    for (const [e, v] of Object.entries(p.pct)) {
      const ion = e === 'MgO' ? 'Mg' : e, exp = (e === 'MgO' ? v * MG : v) * k;
      assert.ok(Math.abs(p.ppm[ion] - exp) / exp < 0.03, `${p.name} ${e}: ${p.ppm[ion]} vs ${exp}`);
    }
  }
});
test('CSM+B: 0,29 g w 100 l ≈ 0,2 mg/l Fe (dawka podawana przez sprzedawców)', () => {
  const p = PRODUCTS.find(x => x.name === 'Plantex CSM+B'); assert.ok(Math.abs(p.ppm.Fe * 0.29 / 100 - 0.203) < 0.005);
});
test('składy z etykiet: źródło przy każdym, azot z EDTA nie jest liczony jako NO₃', () => {
  const { PRODUCTS } = require('../products.js');
  for (const p of PRODUCTS.filter(x => x.status === 'label')) assert.ok(p.src && /^https?:/.test(p.src), p.name + ': brak źródła');
  const n = PRODUCTS.find(p => p.name === 'Nutrafin Plant Gro'); assert.equal(n.status, 'label'); assert.ok(!('NO3' in n.ppm)); assert.equal(n.ppm.Fe, 2.6);
  const c = PRODUCTS.find(p => p.name === 'AquaVitro Carbonate'); assert.equal(c.ppm.K, 78.3); assert.ok(Math.abs(c.ppm.HCO3 - 2 * 61.02) < 0.1);
  assert.equal(PRODUCTS.length, 37, 'kolejność i liczba pozycji bez zmian (id = indeks)');
});

// Niezależna weryfikacja obliczeń (8.0): wartości oczekiwane liczone tutaj od zera z mas atomowych IUPAC
// albo wzięte z opublikowanych przepisów – NIE z funkcji aplikacji. Test pilnuje, żeby obliczenia nie zmieniły się przy przebudowie interfejsu.
const test = require('node:test'), assert = require('node:assert');
const X = require('../chem.js'), C = require('../calc.js'), P = require('../logic.js'), D = require('../nawozy-dane.js');

// masy atomowe IUPAC (wartości konwencjonalne) – przepisane niezależnie
const A = { H: 1.008, B: 10.81, C: 12.011, N: 14.007, O: 15.999, Na: 22.990, Mg: 24.305, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Fe: 55.845, Mn: 54.938, Zn: 65.38, Cu: 63.546, Mo: 95.95 };
const W = 2 * A.H + A.O;
const close = (a, b, rel = 1e-3, msg) => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-9, `${msg || ''} ${a} ≠ ${b}`);

test('masy atomowe i stałe twardości zgodne z IUPAC i definicją °dH (10 mg/l CaO)', () => {
  for (const e in A) close(X.AW[e], A[e], 1e-6, e);
  const CaO = A.Ca + A.O;
  close(X.DH.Ca, 10 * A.Ca / CaO, 1e-6, 'Ca/°dH');           // 7,147 mg/l Ca
  close(X.DH.Mg, 10 * A.Mg / CaO, 1e-6, 'Mg/°dH');           // 4,334 mg/l Mg
  close(X.DH.meq, 10 / (CaO / 2), 1e-6, 'mval/°dH');         // 0,3566
  close(X.DH.Ca, 7.147, 1e-3); close(X.DH.Mg, 4.334, 1e-3);
});

// 1 g soli w 100 l wody – przyrost w mg/l (ppm), liczony ręcznie
const ref = (M, ionMass, n = 1) => 1000 * n * ionMass / M / 100;
const NO3 = A.N + 3 * A.O, PO4 = A.P + 4 * A.O, SO4 = A.S + 4 * A.O, HCO3 = A.H + A.C + 3 * A.O;
const CASES = [
  ['KNO3', 0, A.K + NO3, { NO3: [NO3], K: [A.K] }, { NO3: 6.133, K: 3.867 }],
  ['KH2PO4', 0, A.K + 2 * A.H + PO4, { PO4: [PO4], K: [A.K] }, { PO4: 6.979, K: 2.873 }],
  ['K2SO4', 0, 2 * A.K + SO4, { K: [A.K, 2], SO4: [SO4] }, { K: 4.488 }],
  ['MgSO4', 7, A.Mg + SO4 + 7 * W, { Mg: [A.Mg], SO4: [SO4] }, { Mg: 0.9862 }],
  ['MgSO4', 0, A.Mg + SO4, { Mg: [A.Mg] }, { Mg: 2.019 }],
  ['CaSO4', 2, A.Ca + SO4 + 2 * W, { Ca: [A.Ca] }, { Ca: 2.328 }],
  ['KHCO3', 0, A.K + HCO3, { HCO3: [HCO3], K: [A.K] }, { HCO3: 6.095 }],
];
test('przyrost stężenia z 1 g soli w 100 l – zgodny z obliczeniem ręcznym i wartościami z kalkulatorów EI', () => {
  for (const [id, hyd, M, ions, known] of CASES) {
    const m = X.mat(id); close(X.molarMass(m, hyd), M, 1e-6, `${id}·${hyd}H2O masa molowa`);
    const ppm = X.saltToPpm(m, hyd, 100, 1, 100);
    for (const [k, [im, n]] of Object.entries(ions)) close(ppm[k], ref(M, im, n), 1e-6, `${id} ${k}`);
    for (const [k, v] of Object.entries(known)) close(ppm[k], v, 1e-3, `${id} ${k} ~ ${v}`);
    // odwrotność: gramy dla zadanego przyrostu
    const k0 = Object.keys(ions)[0]; close(X.gramsForPpm(m, hyd, 100, k0, ppm[k0], 100), 1, 1e-9, `${id} gramsForPpm`);
  }
});

test('twardość: 1 g CaSO4·2H2O w 100 l → 0,326 °dH GH; 1 g KHCO3 w 100 l → 0,280 °dKH', () => {
  const gh = X.derived(X.saltToPpm(X.mat('CaSO4'), 2, 100, 1, 100)).GH, kh = X.derived(X.saltToPpm(X.mat('KHCO3'), 0, 100, 1, 100)).KH;
  close(gh, 1000 * A.Ca / (A.Ca + SO4 + 2 * W) / 100 / (10 * A.Ca / (A.Ca + A.O)), 1e-6); close(gh, 0.3257, 1e-3);
  close(kh, 0.2801, 1e-3);
});

test('PPS-Pro: 1 ml makro na 40 l dziennie daje ok. NO₃ 1, PO₄ 0,1, K 1,33, Mg 0,1 mg/l (wartości z opisu systemu)', () => {
  const p = D.DIY.ppspro; let ppm = {};
  for (const it of p.items) { const r = X.saltToPpm(X.mat(it.mat), it.hyd, 100, it.g * p.doseMl / p.bottle, p.perLiters); for (const k in r) ppm[k] = (ppm[k] || 0) + r[k]; }
  close(ppm.NO3, 1.01, 0.01); close(ppm.PO4, 0.105, 0.01); close(ppm.K, 1.33, 0.01); close(ppm.Mg, 0.0986, 0.01);
  // przepis: 29 g K2SO4, 33 g KNO3, 3 g KH2PO4, 20 g MgSO4·7H2O na 500 ml
  assert.deepStrictEqual(p.items.map(i => [i.mat, i.hyd, i.g]), [['K2SO4', 0, 29], ['KNO3', 0, 33], ['KH2PO4', 0, 3], ['MgSO4', 7, 20]]);
  assert.strictEqual(p.bottle, 500); assert.strictEqual(p.perLiters, 40);
});

test('EI: tygodniowe cele NO₃ 20, PO₄ 3, K 30, Mg 10, Fe 0,5 mg/l, 3 dawki w tygodniu', () => {
  assert.deepStrictEqual(D.DIY.ei.week, { NO3: 20, PO4: 3, K: 30, Mg: 10 }); assert.deepStrictEqual(D.DIY.ei.weekMicro, { Fe: 0.5 }); assert.strictEqual(D.DIY.ei.n, 3);
});

test('stary silnik (calc.js) – ręcznie wpisane masy molowe zgadzają się z masami ze wzorów (różnica < 0,05%)', () => {
  const bad = [];
  for (const [id, s] of Object.entries(C.SALTS)) {
    if (!(s.M > 0) || !s.f) continue;
    let M; try { M = X.parseFormula(s.f).M; } catch (e) { continue; }
    if (Math.abs(M - s.M) / s.M > 5e-4) bad.push(`${id}: ${s.f} ${s.M} vs ${M.toFixed(3)}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('CO₂ z pH i KH: 3·KH·10^(7−pH); odwrotność pH dla celu', () => {
  close(C.co2(6.8, 4), 3 * 4 * Math.pow(10, 0.2), 1e-12); close(C.co2(6.8, 4), 19.02, 1e-3);
  close(C.co2(C.phForCo2(25, 4), 4), 25, 1e-9);
  const [lo, hi] = C.co2Range(6.8, 4); assert.ok(lo < C.co2(6.8, 4) && hi > C.co2(6.8, 4));
});

test('wolny amoniak (Emerson 1975): pH 7, 25 °C → ok. 0,56% NH₃', () => {
  const r = P.freeNH3(1, 7, 25); close(r.frac, 1 / (Math.pow(10, 0.09018 + 2729.92 / 298.15 - 7) + 1), 1e-9); close(r.frac, 0.00564, 0.01);
  close(r.nh3, r.frac * 17.031 / 18.039, 1e-9);
});

test('przeliczniki z etykiet: K₂O→K 0,830, P₂O₅→PO₄ 1,338, N→NO₃ 4,427', () => {
  close(C.GARDEN_CONV.K2O, 2 * A.K / (2 * A.K + A.O), 1e-3); close(C.GARDEN_CONV.K2O, 0.830, 1e-3);
  close(C.GARDEN_CONV.P2O5, 2 * PO4 / (2 * A.P + 5 * A.O), 1e-3); close(C.GARDEN_CONV.N_NO3, NO3 / A.N, 1e-3);
});

test('nietypowe wartości: zero, ujemne, puste – brak wyniku zamiast błędnych liczb', () => {
  const m = X.mat('KNO3');
  assert.deepStrictEqual(X.saltToPpm(m, 0, 100, 0, 100), {});
  assert.deepStrictEqual(X.saltToPpm(m, 0, 100, -5, 100), {});
  assert.deepStrictEqual(X.saltToPpm(m, 0, 100, 1, 0), {});
  assert.strictEqual(X.gramsForPpm(m, 0, 100, 'PO4', 1, 100), null);       // KNO₃ nie zawiera PO₄
  close(X.saltToPpm(m, 0, 50, 1, 100).NO3, 6.133 / 2, 1e-3);              // czystość 50%
  close(X.saltToPpm(m, 0, '', 1, 100).NO3, 6.133, 1e-3);                  // pusta czystość = 100%
  assert.deepStrictEqual(X.doseToPpm({ NO3: 10 }, 1, 0), {});
});

test('CSM+B (Plantex / Plant-Prod) – skład zgodny z gwarantowaną analizą producenta: Fe 7%, Mn 2%, Zn 0,4%, Cu 0,1%, B 1,3%, Mo 0,06%', () => {
  const p = require('../products.js').PRODUCTS.find(x => x.name === 'Plantex CSM+B');
  assert.deepStrictEqual(p.ppm, { Fe: 70, Mn: 20, Zn: 4, Cu: 1, B: 13, Mo: 0.6 }); // mg na 1 g
  assert.strictEqual(p.unit, 'g');
});

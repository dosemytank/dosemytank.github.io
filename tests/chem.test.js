// Testy silnika chemii. Wartości oczekiwane policzone niezależnie (tablice mas molowych, ręczne rachunki).
const test = require('node:test'), assert = require('node:assert/strict');
const X = require('../chem.js'), C = require('../calc.js');
const near = (a, b, tol = 1e-3, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg || ''} ${a} ≠ ${b}`);
const M = (id, h) => X.molarMass(X.mat(id), h);

test('masy molowe zgodne z tablicami (bezwodne i hydraty)', () => {
  const ref = [['KNO3', 0, 101.103], ['KH2PO4', 0, 136.084], ['K2SO4', 0, 174.252], ['MgSO4', 0, 120.361], ['MgSO4', 1, 138.376], ['MgSO4', 7, 246.466],
    ['CaCl2', 0, 110.978], ['CaCl2', 2, 147.008], ['CaCl2', 6, 219.068], ['CaSO4', 0, 136.134], ['CaSO4', 0.5, 145.142], ['CaSO4', 2, 172.164],
    ['KCl', 0, 74.548], ['NH4NO3', 0, 80.043], ['CaNO32', 4, 236.146], ['MgCl2', 6, 203.295], ['FeSO4', 7, 278.0], ['CuSO4', 5, 249.68]];
  for (const [id, h, m] of ref) near(M(id, h), m, 2e-4, id + '·' + h);
});
test('udziały masowe: KNO3, KH2PO4, MgSO4·7H2O', () => {
  const f = X.fractions(X.mat('KNO3')); near(f.K, 0.38672, 1e-4); near(f.NO3, 0.61328, 1e-4);
  const g = X.fractions(X.mat('KH2PO4')); near(g.PO4, 0.69788, 1e-4); near(g.K, 0.28731, 1e-4);
  near(X.fractions(X.mat('MgSO4'), 7).Mg, 0.098614, 1e-4); near(X.fractions(X.mat('MgSO4'), 0).Mg, 0.20193, 1e-4);
});
test('zgodność z dotychczasowym silnikiem (calc.js) dla tych samych form', () => {
  for (const [old, id, h, ion] of [['KNO3', 'KNO3', 0, 'NO3'], ['KNO3', 'KNO3', 0, 'K'], ['KH2PO4', 'KH2PO4', 0, 'PO4'], ['K2SO4', 'K2SO4', 0, 'K'], ['MGSO4_7', 'MgSO4', 7, 'Mg'], ['CACL2', 'CaCl2', 2, 'Ca'], ['CASO4', 'CaSO4', 2, 'Ca'], ['NH4NO3', 'NH4NO3', 0, 'NH4']])
    near(X.fractions(X.mat(id), h)[ion], C.fracOf(old, ion), 2e-4, old + ' ' + ion);
});
test('ile soli na cel: +10 mg/l NO3 w 100 l z KNO3 o czystości 99%', () => {
  const g = X.gramsForPpm(X.mat('KNO3'), 0, 99, 'NO3', 10, 100); near(g, 1.6470, 2e-4);
  const p = X.saltToPpm(X.mat('KNO3'), 0, 99, g, 100); near(p.NO3, 10, 1e-9); near(p.K, 10 * 39.098 / 62.004, 1e-4, 'K uboczny');
  assert.equal(X.gramsForPpm(X.mat('KNO3'), 0, 100, 'Mg', 1, 100), null, 'brak jonu → null');
});
test('hydraty: 5 mg/l Mg w 200 l', () => {
  near(X.gramsForPpm(X.mat('MgSO4'), 7, 100, 'Mg', 5, 200), 10.1405, 2e-4);
  near(X.gramsForPpm(X.mat('MgSO4'), 0, 100, 'Mg', 5, 200), 4.9521, 2e-4);
  near(X.hydrateSwap(X.mat('MgSO4'), 10.1405, 7, 0), 4.9521, 2e-4);
});
test('GH z CaCl2·2H2O: 1 g w 100 l', () => {
  const p = X.saltToPpm(X.mat('CaCl2'), 2, 100, 1, 100); near(p.Ca, 2.7263, 2e-4); near(p.Cl, 4.8231, 2e-4);
  near(X.derived(p).GH, 2.7263 / 7.1469, 5e-4);
});
test('pochodne: N, P, S, KH', () => {
  const d = X.derived({ NO3: 10, PO4: 1, SO4: 10, HCO3: 21.76, NH4: 1 });
  near(d.N, 10 * 14.007 / 62.004 + 14.007 / 18.039, 1e-4); near(d.P, 0.32614, 1e-4); near(d.S, 3.3375, 1e-4); near(d.KH, 1.0, 2e-3);
  near(X.derived({ CO3: 10.72 }).KH, 1.0, 3e-3);
});
test('roztwór: 30 g KNO3 + 5 g KH2PO4 w 500 ml', () => {
  const r = X.solution([{ mat: 'KNO3', g: 30 }, { mat: 'KH2PO4', g: 5 }], 500);
  near(r.conc.NO3, 36.797, 2e-4); near(r.conc.PO4, 6.9788, 2e-4); near(r.conc.K, 26.076, 2e-4);
  near(X.doseToPpm(r.conc, 10, 100).NO3, 3.6797, 2e-4); near(X.mlForPpm(r.conc, 'PO4', 1, 100), 14.329, 2e-4);
  assert.equal(r.warn.length, 0);
});
test('roztwór: ostrzeżenia – Ca+PO4, rozpuszczalność, czystość', () => {
  const r = X.solution([{ mat: 'CaCl2', hyd: 2, g: 5 }, { mat: 'KH2PO4', g: 2 }], 500); assert.ok(r.warn.some(w => /fosforan wapnia/.test(w.t)));
  const s = X.solution([{ mat: 'K2SO4', g: 80 }], 500); assert.ok(s.warn.some(w => w.sev === 'bad' && /Nie rozpuści/.test(w.t)));
  const q = X.solution([{ mat: 'KNO3', g: 10, purity: 90 }], 1000); near(q.conc.NO3, 10 * 0.9 * 0.61328, 2e-4);
});
test('korekta: NO3/PO4/K z uwzględnieniem K z KNO3 i KH2PO4', () => {
  const V = 100, s = id => ({ id, unit: 'g', eff: X.saltToPpm(X.mat(id), 0, 100, 1, V) });
  const r = X.correct({ current: { NO3: 5, PO4: 0.3, K: 10 }, target: { NO3: 15, PO4: 1, K: 20 }, sources: [s('KNO3'), s('KH2PO4'), s('K2SO4')], assign: { NO3: 'KNO3', PO4: 'KH2PO4', K: 'K2SO4' } });
  near(r.amounts.KNO3, 1.6305, 2e-4); near(r.amounts.KH2PO4, 0.10030, 5e-4); near(r.amounts.K2SO4, 0.7590, 1e-3);
  near(r.after.NO3, 15, 1e-9); near(r.after.PO4, 1, 1e-9); near(r.after.K, 20, 1e-9); assert.ok(r.after.SO4 > 0, 'siarczany uboczne');
});
test('korekta: K z KNO3 przekracza cel → K2SO4 = 0 i ostrzeżenie', () => {
  const V = 100, s = id => ({ id, unit: 'g', eff: X.saltToPpm(X.mat(id), 0, 100, 1, V) });
  const r = X.correct({ current: { NO3: 5, K: 10 }, target: { NO3: 15, K: 12 }, sources: [s('KNO3'), s('K2SO4')], assign: { NO3: 'KNO3', K: 'K2SO4' } });
  assert.equal(r.amounts.K2SO4, 0); near(r.after.K, 16.3057, 2e-4); assert.ok(r.notes.some(n => n.k === 'K' && n.sev === 'warn'));
});
test('korekta: sprzężenie Ca(NO3)2 → NO3 (źródło przypisane później dostarcza wcześniejszy składnik)', () => {
  const V = 100, s = (id, h = 0) => ({ id, unit: 'g', eff: X.saltToPpm(X.mat(id), h, 100, 1, V) });
  const r = X.correct({ current: {}, target: { NO3: 40, Ca: 10 }, sources: [s('KNO3'), s('CaNO32', 4)], assign: { NO3: 'KNO3', Ca: 'CaNO32' } });
  near(r.after.NO3, 40, 1e-6); near(r.after.Ca, 10, 1e-6);
  near(r.amounts.KNO3, (40 - 10 * 2 * 62.004 / 40.078) * 0.1 / 0.61328, 1e-3, 'KNO3 tylko na brakującą część');
  const r2 = X.correct({ current: {}, target: { NO3: 20, Ca: 10 }, sources: [s('KNO3'), s('CaNO32', 4)], assign: { NO3: 'KNO3', Ca: 'CaNO32' } });
  assert.equal(r2.amounts.KNO3, 0, 'Ca(NO3)2 już przekracza NO3');
});
test('korekta: obecne > cel → bez dawki, informacja o podmianie', () => {
  const r = X.correct({ current: { NO3: 30 }, target: { NO3: 20 }, sources: [{ id: 'a', eff: { NO3: 1 } }], assign: { NO3: 'a' } });
  assert.equal(r.amounts.a, 0); assert.ok(r.notes.some(n => /podmiana/.test(n.t)));
});
test('podmiana i mieszanie wód', () => {
  near(X.waterChange({ NO3: 30 }, { NO3: 5 }, 0.5).NO3, 17.5, 1e-12);
  assert.equal(X.waterChange({}, { NO3: 5 }, 0.5).NO3, null, 'nieznane w akwarium → null');
  const w = X.newWater({ tap: { GH: 18, KH: 14, NO3: 20 }, ro: {}, roFrac: 0.75 }); near(w.comp.GH, 4.5, 1e-12); near(w.comp.KH, 3.5, 1e-12); near(w.comp.NO3, 5, 1e-12);
  const m = X.newWater({ tap: {}, ro: {}, roFrac: 1, minerals: [{ mat: 'CaSO4', hyd: 2, g: 1, perL: 10 }] }); near(m.added.Ca, 23.279, 2e-4); near(m.comp.GH, 3.2572, 5e-4);
  const ions = X.newWater({ tap: { Ca: 71.47, Mg: 8.67 }, roFrac: 0.5 }); near(ions.comp.GH, 6, 2e-3);
});
test('objętość brutto/netto', () => {
  const v = X.volume({ L: 60, W: 30, H: 36, glass: 6, freeTop: 3, substrate: 5 });
  near(v.gross, 64.8, 1e-9); near(v.water, 58.8 * 28.8 * 32.4 / 1000, 1e-9); near(v.substrate, 58.8 * 28.8 * 5 / 1000, 1e-9); near(v.net, 46.399, 1e-4);
  assert.equal(X.volume({ L: 10, W: 1, H: 10, glass: 6 }), null);
});
test('parser wzorów', () => {
  const a = X.parseFormula('Ca(NO3)2·4H2O'); near(a.M, 236.146, 1e-4); assert.equal(a.water, 4);
  near(X.parseFormula('(NH4)6Mo7O24*4H2O').M, 1235.92, 1e-4); near(X.parseFormula('CaSO4·0,5H2O').M, 145.142, 1e-4);
  near(X.parseFormula('KH₂PO₄').M, 136.084, 1e-4); near(X.parseFormula('MgSO4.7H2O').M, 246.466, 1e-4);
  assert.throws(() => X.parseFormula('Xx2')); assert.throws(() => X.parseFormula('Ca(NO3')); assert.throws(() => X.parseFormula(''));
});
test('własna sól: K2HPO4·3H2O jako materiał użytkownika = wbudowany', () => {
  const p = X.parseFormula('K2HPO4'), cu = { id: 's1', name: 'test', el: p.el, ions: { K: 2, PO4: 1 } };
  near(X.fractions(cu, 3).PO4, X.fractions(X.mat('K2HPO4'), 3).PO4, 1e-12);
  const pc = { id: 's2', name: 'chelat', pct: { Fe: 11 } }; near(X.saltToPpm(pc, 0, 100, 1, 100).Fe, 1.1, 1e-12);
});
test('dane wejściowe błędne: zero, ujemne, puste', () => {
  assert.deepEqual(X.saltToPpm(X.mat('KNO3'), 0, 100, 0, 100), {}); assert.deepEqual(X.saltToPpm(X.mat('KNO3'), 0, 100, 1, 0), {});
  assert.equal(X.purityF(0), 1); assert.equal(X.purityF(150), 1); assert.equal(X.purityF('95'), 0.95);
  assert.ok(X.solution([], 0).warn.length);
});
test('źródła mikro: glukonian Fe·2H2O 11,6% Fe, Na2MoO4·2H2O 39,7% Mo', () => {
  const X = require('../chem.js');
  const fe = X.saltToPpm(X.mat('FeGlu'), 2, 100, 1, 1).Fe, mo = X.saltToPpm(X.mat('Na2MoO4'), 2, 100, 1, 1).Mo;
  assert.ok(Math.abs(fe - 115.8) < 0.5, fe); assert.ok(Math.abs(mo - 396.5) < 0.5, mo);
});
test('EDTA do chelatowania: 1 g FeSO4·7H2O → 1,339 g Na2EDTA·2H2O; chelaty pomijane', () => {
  const X = require('../chem.js');
  const mol = X.metalMoles([{ mat: 'FeSO4', hyd: 7, g: 1 }, { mat: 'FeDTPA', g: 5 }, { mat: 'H3BO3', g: 1 }]);
  assert.ok(Math.abs(mol - 1 / 278.01) < 1e-6, mol); assert.ok(Math.abs(X.edtaGrams(mol) - 1.3390) < 0.001);
  assert.ok(Math.abs(X.molarMass(X.mat('Borax'), 10) - 381.37) < 0.05);
  assert.ok(Math.abs(X.saltToPpm(X.mat('Borax'), 10, 100, 1, 1).B - 113.4) < 0.2);
});

test('nowe sole amonowe i sodowe: masy molowe i udziały jonów', () => {
  const X = require('../chem.js'), M = id => X.molarMass(X.MATERIALS[id], 0);
  assert.ok(Math.abs(M('NH4Cl') - 53.49) < 0.05);
  assert.ok(Math.abs(M('NH4H2PO4') - 115.03) < 0.05);
  assert.ok(Math.abs(M('NH42HPO4') - 132.06) < 0.05);
  assert.ok(Math.abs(M('Urea') - 60.06) < 0.05);
  assert.ok(Math.abs(M('NaNO3') - 84.99) < 0.05);
  assert.ok(Math.abs(M('Na2CO3') - 105.99) < 0.05);
  assert.ok(Math.abs(X.fractions(X.MATERIALS.Urea, 0).NH4 - 0.6007) < 0.001);
  const w = X.solution([{ mat: 'NH4H2PO4', hyd: 0, g: 5 }, { mat: 'MgSO4', hyd: 7, g: 10 }], 500).warn;
  assert.ok(w.some(x => /struwit/.test(x.t)));
});

/* ---------- 6.10: rozpuszczalność i lista zakupów ---------- */
const EI = [{ k: 'NO3', t: '20', src: 'KNO3|0' }, { k: 'PO4', t: '3', src: 'KH2PO4|0' }, { k: 'K', t: '30', src: 'K2SO4|0' }, { k: 'Mg', t: '10', src: 'MgSO4|7' }];
const plan = (dose, rows = EI, n = 3, bottle = 500) => X.planBottle({ rows, V: 100, bottle, dose, n });
test('przepis EI w butelce 500 ml, dawka 10 ml × 3: K₂SO₄ 60 g = 108% rozpuszczalności – nie zadziała', () => {
  const p = plan(10), fx = X.solFix(X.solution(p.items, 500).rows);
  near(p.items.find(i => i.mat === 'K2SO4').g, 60.0, 2e-3); assert.equal(fx.level, 'over'); near(fx.ratio, 1.081, 2e-3); assert.equal(fx.worst.mat, 'K2SO4');
});
test('stężenie w butelce zależy od dawki i liczby dawek, nie od wielkości butelki', () => {
  const a = X.solFix(X.solution(plan(10, EI, 3, 500).items, 500).rows).ratio, b = X.solFix(X.solution(plan(10, EI, 3, 2000).items, 2000).rows).ratio;
  near(a, b, 1e-9); const c = X.solFix(X.solution(plan(20).items, 500).rows).ratio; near(c, a / 2, 1e-9, 'dwa razy większa dawka = dwa razy rzadszy roztwór');
});
test('poprawka: factor i zaokrąglona dawka dają roztwór poniżej progu (K₂SO₄ ze wspólnym jonem K⁺ – 70%, pkt C5)', () => {
  // K₂SO₄ w mieszaninie z KNO₃ i KH₂PO₄ (wspólny K⁺) – bezpiecznie do 70% zamiast 80% (6.11: factor 1,351 i 14 ml)
  const fx = X.solFix(X.solution(plan(10).items, 500).rows); near(fx.ratio, 1.081, 2e-3); near(fx.factor, 1.081 / 0.7, 2e-3);
  assert.equal(fx.worst.mat, 'K2SO4'); assert.ok(fx.common.includes('K') && fx.common.includes('SO4')); assert.equal(fx.safe, 0.7);
  const d = X.roundUp(10 * fx.factor, 0.5); assert.equal(d, 15.5);
  assert.equal(X.solFix(X.solution(plan(d).items, 500).rows).level, 'ok');
  assert.notEqual(X.solFix(X.solution(plan(15).items, 500).rows).level, 'ok', '15 ml to jeszcze ok. 72% nasycenia');
  near(fx.limitGL, 111, 5e-3); near(fx.safeGL, 77.7, 5e-3);
});
test('C5: sól bez wspólnego jonu – próg 80% jak dotąd', () => {
  const r = X.solution([{ mat: 'K2SO4', hyd: 0, g: 40 }], 500).rows; assert.deepEqual(r[0].common, []);
  const fx = X.solFix(r); near(fx.ratio, 0.7207, 1e-3); assert.equal(fx.level, 'ok'); assert.equal(fx.safe, 0.8);
  const r2 = X.solution([{ mat: 'K2SO4', hyd: 0, g: 40 }, { mat: 'KNO3', hyd: 0, g: 1 }], 500).rows; assert.equal(X.solFix(r2).level, 'near', 'ten sam K₂SO₄ z KNO₃: powyżej 70%');
  assert.ok(X.solution([{ mat: 'K2SO4', hyd: 0, g: 40 }, { mat: 'KNO3', hyd: 0, g: 1 }], 500).warn.some(w => w.code === 'sol_near'));
});
test('więcej dawek w tygodniu też rozcieńcza: 10 ml × 5 mieści się w limicie', () => {
  assert.equal(X.solFix(X.solution(plan(10, EI, 5).items, 500).rows).level, 'ok');
});
test('wiersze bez limitu rozpuszczalności (chelaty) nie psują solFix', () => {
  const p = X.planBottle({ rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0' }], V: 100, bottle: 500, dose: 10, n: 3 });
  const fx = X.solFix(X.solution(p.items, 500).rows); assert.equal(fx.level, 'ok'); assert.equal(fx.worst, null);
});
test('planBottle: tygodniowe ilości nie zależą od butelki, a EDTA liczy się z soli metali', () => {
  const a = plan(10, EI, 3, 500), b = plan(10, EI, 3, 1000);
  for (const i of a.weekly.items) near(b.weekly.items.find(j => j.mat === i.mat).g, i.g, 1e-9);
  const m = X.planBottle({ rows: [{ k: 'Fe', t: '0,5', src: 'FeSO4|7' }], V: 100, bottle: 500, dose: 10, n: 7, edta: 'Na2EDTA' });
  assert.ok(m.mol > 0); const e = m.items.find(i => i.mat === 'Na2EDTA'); near(e.g, X.edtaGrams(m.mol, 'Na2EDTA', 2), 1e-9); assert.ok(m.weekly.items.some(i => i.mat === 'Na2EDTA'));
});
test('lista zakupów: tygodnie × ilość tygodniowa, sumowanie tej samej soli z Makro i Mikro', () => {
  const p = plan(14), lines = X.shopLines([p, p], 13), kno3 = lines.find(l => l.mat === 'KNO3');
  near(kno3.q, 2 * 13 * p.weekly.items.find(i => i.mat === 'KNO3').g, 1e-9); assert.equal(kno3.unit, 'g');
  near(p.weekly.items.find(i => i.mat === 'KNO3').g, 20 * 100 / 1000 / X.fractions(X.mat('KNO3'), 0).NO3, 1e-3, 'tydzień: 20 mg/l NO₃ w 100 l z KNO₃');
});
test('ile kupić: zaokrąglanie w górę do sensownej porcji', () => {
  assert.deepEqual(X.buyAmount(0.07), { v: 1, unit: 'g', tiny: true }); assert.deepEqual(X.buyAmount(3.2), { v: 4, unit: 'g', tiny: false });
  assert.equal(X.buyAmount(47).v, 50); assert.equal(X.buyAmount(431).v, 440); assert.deepEqual(X.buyAmount(1230), { v: 1.25, unit: 'kg', tiny: false });
  assert.deepEqual(X.buyAmount(1500, 'ml'), { v: 1.5, unit: 'l', tiny: false }); assert.equal(X.buyAmount(0).v, 0);
});
test('7.2: dodatkowe formy handlowe – masy molowe z tablic', () => {
  for (const [id, h, m] of [['Na2CO3', 1, 124.003], ['CuNO32', 2.5, 232.59], ['CoSO4', 1, 173.004], ['Na4EDTA', 4, 452.23]]) near(M(id, h), m, 2e-4, id + '·' + h);
  // ta sama ilość Cu z formy 2,5- i 3-wodnej: masy w stosunku mas molowych
  near(X.hydrateSwap(X.mat('CuNO32'), 1, 2.5, 3), 241.6 / 232.59, 2e-4);
});
test('7.4: EC i TDS z jonów – 1 mmol/l KNO₃ ≈ 145 µS/cm (granicznie), TDS = masa jonów', () => {
  // 1 mmol/l KNO₃ = 39,098 mg/l K + 62,004 mg/l NO₃; λ° K⁺ 73,5 + NO₃⁻ 71,4 = 144,9 µS/cm
  const r = X.ecTds({ K: 39.098, NO3: 62.004 }); near(r.ec, 144.9, 1e-3); near(r.tds, 101.102, 1e-6);
  near(X.ecTds({ Mg: 24.305, SO4: 96.06 }).ec, 266.1, 1e-3, 'MgSO₄ 1 mmol/l');
  assert.equal(X.ecTds({ B: 1 }).ec, 0, 'kwas borowy nie przewodzi'); assert.equal(X.ecTds({}).ec, 0);
});

test('gotowy nawóz w recepturze (it.fert): Intermag Mikro Plus 10 ml w 500 ml', () => {
  const fert = { id: 'b26', name: 'Intermag Mikro Plus', unit: 'ml', ppm: { Fe: 23.6, Mn: 9.5 } };
  const sol = X.solution([{ mat: 'KNO3', hyd: 0, purity: 100, g: 10 }, { fert, g: 10 }], 500);
  assert.ok(Math.abs(sol.conc.Fe - 23.6 * 10 / 500) < 1e-9, 'Fe g/l');
  assert.ok(Math.abs(sol.conc.Mn - 9.5 * 10 / 500) < 1e-9);
  assert.ok(sol.conc.NO3 > 0 && !sol.warn.some(w => w.code === 'fert_vol'));
  assert.ok(X.solution([{ fert, g: 600 }], 500).warn.some(w => w.code === 'fert_vol'));
  const c = X.compat([{ mat: 'KH2PO4', hyd: 0, g: 5 }, { fert, g: 10 }], 500);
  assert.equal(c.bottles.length, 2, 'fosforan i żelazo z gotowego mikro – osobno');
});

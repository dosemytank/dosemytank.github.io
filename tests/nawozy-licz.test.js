// Testy czystych funkcji kalkulatorów (nawozy-licz.js).
// 1) Regresja: te same liczby co wersja 6.11 – fixture tests/fixtures/kalk-6.11.json zapisany z działającej aplikacji (tests/kalk_capture.py).
// 2) Rachunki niezależne: wartości oczekiwane policzone ręcznie z mas atomowych, bez kodu aplikacji.
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../nawozy-licz.js'), X = require('../chem.js'), { PRODUCTS } = require('../products.js');
const FIX = require('./fixtures/kalk-6.11.json').cases, D = require('../nawozy-dane.js');
const prodOf = id => { const i = +String(id).slice(1); return PRODUCTS[i] ? { id, name: PRODUCTS[i].name, unit: PRODUCTS[i].unit, ppm: PRODUCTS[i].ppm, status: PRODUCTS[i].status || 'unverified' } : null; };
const TOL = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b)), `${msg}: ${a} ≠ ${b}`);
const sameMap = (a, b, msg) => { const ks = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]); for (const k of ks) close((a || {})[k] || 0, (b || {})[k] || 0, `${msg} ${k}`); };
const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) && x >= 0 ? x : 0; }; // jak Form.n()
const logOf = (c, f) => c.log.filter(x => x.f === f);
const lastLog = (c, f) => logOf(c, f).at(-1);

test('fixture 6.11 ma komplet przypadków', () => {
  assert.ok(FIX.length >= 180, 'za mało przypadków: ' + FIX.length);
  for (const k of ['make', 'micro', 'check', 'prep']) assert.ok(FIX.some(c => c.input.mode === k && !c.click), 'brak trybu ' + k);
});

test('regresja 6.11: Makro i Mikro – gramy, stężenie butelki, mg/l na dawkę', () => {
  let n = 0;
  for (const c of FIX.filter(c => ['make', 'micro'].includes(c.input.mode) && !c.click)) {
    const s = c.input, V = num(s.V), bottle = num(s.bottle), dose = num(s.dose), nn = Math.round(num(s.n));
    if (!(V > 0 && bottle > 0 && dose > 0 && nn > 0) || dose > bottle) { assert.equal(logOf(c, 'planBottle').length, 0, c.name); continue; }
    const r = L.makro({ rows: s.mode === 'micro' ? s.mrows : s.rows, V, bottle, dose, n: nn, custom: [], prodOf, edta: s.mode === 'micro' ? s.edta : '' });
    const pb = lastLog(c, 'planBottle').r;
    assert.equal(r.items.length, pb.items.length, c.name + ' liczba soli');
    r.items.forEach((it, i) => { assert.equal(it.mat, pb.items[i].mat, c.name); close(it.g, pb.items[i].g, c.name + ' g ' + it.mat); });
    r.prodItems.forEach((it, i) => close(it.a, pb.prodItems[i].a, c.name + ' produkt'));
    if (r.empty) { assert.equal(logOf(c, 'solution').length, 0, c.name); continue; }
    sameMap(r.p, lastLog(c, 'doseToPpm').r, c.name + ' mg/l na dawkę');
    assert.equal(r.fx.level, lastLog(c, 'solFix').r.level, c.name + ' rozpuszczalność');
    n++;
  }
  assert.ok(n >= 20, 'sprawdzono tylko ' + n);
});

test('regresja 6.11: Sprawdź butelkę', () => {
  for (const c of FIX.filter(c => c.input.mode === 'check' && !c.click)) {
    const s = c.input, r = L.sprawdz({ items: s.items, bottle: num(s.bottle), dose: num(s.dose), V: num(s.V), custom: [] });
    sameMap(r.sol.conc, lastLog(c, 'solution').r.conc, c.name + ' g/l');
    if (r.empty) assert.equal(logOf(c, 'doseToPpm').length, 0, c.name); else sameMap(r.p, lastLog(c, 'doseToPpm').r, c.name);
  }
});

test('regresja 6.11: szybkie przepisy ustawiają te same cele, skład i dawkę', () => {
  const ID = { EI: 'ei', 'PPS-Pro': 'ppspro', PMDD: 'pmdd', Lekkie: 'low', Średnie: 'mid', Mocne: 'high' };
  for (const c of FIX.filter(c => c.click)) { // c.input – formularz przed kliknięciem, c.st – po kliknięciu
    const s = c.input, r = L.preset(ID[c.click], { bottle: num(s.bottle), V: num(s.V), n: s.n, dose: num(s.dose), mrows: s.mrows, custom: [], prodOf });
    // C5 (7.0): EI – K₂SO₄ ze wspólnym jonem, próg 70% zamiast 80% → dawka 15,5 ml zamiast 14 ml
    const C5 = { EI: '15,5' }; if (C5[c.click]) { assert.equal(c.st.dose, '14'); assert.equal(r.dose, C5[c.click], c.name); delete r.dose; }
    // 7.8: niższe wartości startowe Lekkie/Średnie/Mocne (DANE.START) – cele i dawka inne niż w 6.11, reszta bez zmian
    const LV = { Lekkie: 'low', Średnie: 'mid', Mocne: 'high' }[c.click];
    if (LV) { const S = D.START[LV]; assert.deepEqual(Object.fromEntries(r.rows.map(x => [x.k, num(x.t)])), S.week, c.name); assert.equal(num(r.mrows.find(x => x.k === 'Fe').t), S.fe); delete r.rows; delete r.mrows; delete r.dose; }
    for (const k in r) assert.deepEqual(r[k], c.st[k], `${c.name} ${k}`);
    if (!('dose' in r) && !C5[c.click] && !LV) assert.equal(c.st.dose, s.dose, c.name + ' dawka bez zmian');
  }
});

test('regresja 6.11: gotowe nawozy i etykiety – dawka, ilość do butelki, mg/l', () => {
  let n = 0;
  for (const c of FIX.filter(c => c.input.mode === 'prep')) {
    const s = c.input, P0 = s.prep, V = num(s.V), nn = Math.round(num(s.n));
    const pr = P0.pid === '__custom' ? { unit: P0.lab.form === 'powder' ? 'g' : 'ml', ppm: L.labelConc(P0.lab) } : prodOf(P0.pid);
    const der = lastLog(c, 'derived'); if (!der) continue; // brak składu albo brak wpisu – nie ma wyniku do porównania
    let pd;
    if (pr.unit !== 'g') { const r = L.produktPlyn({ ppm: pr.ppm, V, n: nn, way: P0.way, el: P0.el, t: P0.t, ldose: P0.ldose }); pd = Object.fromEntries(r.ks.filter(k => r.per1[k] > 0.00005).map(k => [k, r.per1[k] * r.d])); } // 7.10: 6.11 pomijało pierwiastki < 0,00005 mg/l na 1 ml – teraz są w wyniku, tu porównujemy jak w 6.11
    else { const r = L.produktButelka({ ppm: pr.ppm, V, B: num(s.bottle), d: num(s.dose), n: nn, way: P0.way, el: P0.el, t: P0.t, amt: P0.amt }); pd = r.per; }
    sameMap(pd, der.a[0], c.name); n++;
  }
  assert.ok(n >= 100, 'sprawdzono tylko ' + n);
});

/* ---------- rachunki niezależne (masy molowe z tablic: K 39,098, N 14,007, O 15,999, H 1,008, P 30,974, S 32,06, Mg 24,305, Fe 55,845) ---------- */
const M = { KNO3: 101.103, KH2PO4: 136.084, K2SO4: 174.252, MgSO4_7: 246.466, NO3: 62.004, PO4: 94.969, K: 39.098, Mg: 24.305 };
test('niezależnie: przykład z audytu – 100 l, NO₃ 10, PO₄ 1, K 15, Mg 3 mg/l tygodniowo, butelka 500 ml, 10 ml × 7', () => {
  // gramy na tydzień → × (500 / 70) tygodni w butelce
  const f = 500 / 70, kno3 = 10 * 100 / 1000 * M.KNO3 / M.NO3, kh2po4 = 1 * 100 / 1000 * M.KH2PO4 / M.PO4;
  const kRest = 15 - (kno3 * M.K / M.KNO3 + kh2po4 * M.K / M.KH2PO4) * 1000 / 100, k2so4 = kRest * 100 / 1000 * M.K2SO4 / (2 * M.K), mg = 3 * 100 / 1000 * M.MgSO4_7 / M.Mg;
  const r = L.makro({ rows: [{ k: 'NO3', t: '10', src: 'KNO3|0' }, { k: 'PO4', t: '1', src: 'KH2PO4|0' }, { k: 'K', t: '15', src: 'K2SO4|0' }, { k: 'Mg', t: '3', src: 'MgSO4|7' }], V: 100, bottle: 500, dose: 10, n: 7 });
  const g = Object.fromEntries(r.items.map(i => [i.mat, i.g]));
  const rel = (a, b, m) => assert.ok(Math.abs(a / b - 1) < 2e-4, `${m}: ${a} vs ${b}`);
  rel(g.KNO3, kno3 * f, 'KNO3'); rel(g.KH2PO4, kh2po4 * f, 'KH2PO4'); rel(g.K2SO4, k2so4 * f, 'K2SO4'); rel(g.MgSO4, mg * f, 'MgSO4·7H2O');
  rel(g.KNO3, 11.647, 'KNO3 z audytu'); rel(g.MgSO4, 21.73, 'MgSO4 z audytu');
  // odwrotnie: jedna dawka 10 ml × 7 = cele tygodniowe
  for (const [k, v] of [['NO3', 10], ['PO4', 1], ['K', 15], ['Mg', 3]]) assert.ok(Math.abs(r.p[k] * 7 - v) < 1e-9, k);
});
test('niezależnie: Fe-DTPA 11%, Fe 0,1 mg/l tygodniowo w 100 l, butelka 500 ml, 10 ml × 7 → 0,6494 g', () => {
  const r = L.makro({ rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0' }], V: 100, bottle: 500, dose: 10, n: 7 });
  assert.ok(Math.abs(r.items[0].g - 0.1 * 100 / 1000 / 0.11 * 500 / 70) < 1e-9); assert.ok(Math.abs(r.items[0].g - 0.6494) < 1e-4);
});
test('niezależnie: etykieta – P₂O₅, K₂O, N azotanowy, gęstość płynu', () => {
  // 1% P₂O₅ w płynie o gęstości 1,2 = 12 g/l P₂O₅ → PO₄: 12 × 2·94,969/141,943
  const c = L.labelConc({ form: 'liquid', dens: '1,2', pct: { P2O5: '1', K2O: '5', N_NO3: '2' } });
  assert.ok(Math.abs(c.PO4 - 12 * 2 * 94.969 / 141.943) < 2e-3);
  assert.ok(Math.abs(c.K - 60 * 2 * 39.098 / 94.195) < 2e-3);
  assert.ok(Math.abs(c.NO3 - 24 * 62.004 / 14.007) < 2e-3);
  // proszek: % → g/kg; g/l w płynie bez gęstości
  assert.equal(L.labelConc({ form: 'powder', pct: { Fe: '7' } }).Fe, 70);
  assert.equal(L.labelConc({ form: 'liquid', unit: 'gl', pct: { Fe: '3,5' } }).Fe, 3.5);
});
test('niezależnie: gotowy płyn – dawka z celu i mg/l z dawki są odwrotne', () => {
  const ppm = { Fe: 1.5, K: 10 }, a = L.produktPlyn({ ppm, V: 200, n: 7, way: 'target', el: 'Fe', t: '0,21' });
  assert.ok(Math.abs(a.d - 0.21 * 200 / 1.5 / 7) < 1e-12);
  const b = L.produktPlyn({ ppm, V: 200, n: 7, way: 'amount', ldose: String(a.d) });
  assert.ok(Math.abs(b.per1.Fe * b.d * 7 - 0.21) < 1e-12);
  assert.equal(L.produktPlyn({ ppm, V: 200, n: 7, way: 'amount', ldose: '' }).err, 'dose');
  assert.equal(L.produktPlyn({ ppm: {}, V: 200, n: 7 }).err, 'nocomp');
});
test('niezależnie: kwas do PMDD – 2 ml HCl 36% na litr i tyle samo H⁺ w occie i kwasie cytrynowym', () => {
  const a = L.pmddAcid(500), mmol = 1 * 1.179 * 0.36 / 36.461 * 1000;
  assert.equal(a.hcl, 1); assert.ok(Math.abs(a.ocet * 1.0125 * 0.1 / 60.05 * 1000 - mmol) < 1e-9); assert.ok(Math.abs(a.cit / 210.14 * 1000 - mmol) < 1e-9);
});
test('podział na butelki: Ca z PO₄ i PO₄ z metalami, bez konfliktu – null', () => {
  const it = [{ mat: 'KNO3', hyd: 0, g: 10 }, { mat: 'KH2PO4', hyd: 0, g: 1 }, { mat: 'CaCl2', hyd: 2, g: 5 }];
  const s = L.splitBottles(it, 500); assert.deepEqual(s.bottles.map(b => b.items.map(i => i.mat)), [['KNO3', 'KH2PO4'], ['CaCl2']]);
  assert.equal(L.splitBottles(it.slice(0, 2), 500), null);
});
test('przecinek i kropka jako separator', () => { assert.equal(L.n2('0,25'), 0.25); assert.equal(L.n2('0.25'), 0.25); assert.equal(L.n2(''), undefined); });
test('etykieta płynu bez gęstości: 1% = 10 g/l', () => { assert.equal(L.labelConc({ form: 'liquid', dens: '', pct: { Fe: '1' } }).Fe, 10); });
test('dobór dawki: najmniejsza wielokrotność 0,5 ml, przy której każda sól jest poniżej swojego progu (80%, ze wspólnym jonem 70%)', () => {
  for (const [K, d0] of [['25', 2], ['28', 3], ['30', 2], ['30', 5]]) {
    const rows = [{ k: 'NO3', t: '20', src: 'KNO3|0' }, { k: 'PO4', t: '2', src: 'KH2PO4|0' }, { k: 'K', t: K, src: 'K2SO4|0' }, { k: 'Mg', t: '5', src: 'MgSO4|7' }];
    const worst = d => Math.max(...X.solution(X.planBottle({ rows, V: 100, bottle: 500, dose: d, n: 7 }).items, 500).rows.filter(r => r.ratio != null).map(r => r.ratio / X.safeOf(r)));
    const d = L.fitDose({ rows, n: 7, bottle: 500, V: 100, d0 });
    assert.ok(worst(d0) > 1, 'przypadek musi wymagać poprawki'); assert.equal(d % 0.5, 0, 'krok 0,5 ml');
    assert.ok(worst(d) <= 1 + 1e-12, `przy ${d} ml nadal za stężony`); assert.ok(worst(d - 0.5) > 1, `${d - 0.5} ml też by wystarczyło`);
  }
  const rows = [{ k: 'NO3', t: '20', src: 'KNO3|0' }, { k: 'K', t: '30', src: 'K2SO4|0' }], ok = L.fitDose({ rows, n: 7, bottle: 500, V: 100, d0: 50 }); assert.equal(ok, 50, 'bez potrzeby poprawki dawka bez zmian');
});

/* ---------- C3: zawartość chelatu z etykiety, C4: czystość soli (zmiany 7.0) ---------- */
test('C3: Fe-DTPA 7% z etykiety zamiast 11% – więcej gramów, ten sam Fe w akwarium', () => {
  const base = { V: 100, bottle: 500, dose: 10, n: 7 };
  const a = L.makro({ ...base, rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0' }] }), b = L.makro({ ...base, rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0', pct: '7' }] });
  assert.ok(Math.abs(b.items[0].g - 0.1 * 100 / 1000 / 0.07 * 500 / 70) < 1e-12, 'gramy dla 7%');
  assert.ok(Math.abs(b.items[0].g / a.items[0].g - 11 / 7) < 1e-12, 'stosunek 11:7');
  assert.equal(b.items[0].pct, 7); assert.ok(Math.abs(b.p.Fe * 7 - 0.1) < 1e-12, 'Fe tygodniowo = cel');
  assert.ok(!('pct' in a.items[0]), 'bez wpisu – jak w 6.11');
  assert.equal(X.formulaOf(X.itemMat({ mat: 'FeDTPA', pct: '6,5' })), 'Fe-DTPA 6,5%');
  assert.equal(X.itemMat({ mat: 'FeDTPA', pct: '120' }).pct.Fe, 11, 'wartość spoza 0–100 ignorowana');
  assert.equal(X.itemMat({ mat: 'KNO3', pct: '7' }).pct, undefined, 'pct tylko dla chelatów');
});
test('C4: czystość 98% – gramy ×1/0,98, mg/l bez zmian; jony uboczne liczone z tej samej masy', () => {
  const base = { V: 100, bottle: 500, dose: 10, n: 7 }, rows = [{ k: 'NO3', t: '10', src: 'KNO3|0' }, { k: 'K', t: '15', src: 'K2SO4|0' }];
  const a = L.makro({ ...base, rows }), b = L.makro({ ...base, rows: [{ ...rows[0], purity: '98' }, rows[1]] });
  const g = r => Object.fromEntries(r.items.map(i => [i.mat, i.g]));
  assert.ok(Math.abs(g(b).KNO3 - g(a).KNO3 / 0.98) < 1e-12);
  assert.ok(Math.abs(g(b).K2SO4 - g(a).K2SO4) < 1e-12, 'K z KNO3 bez zmian, więc K2SO4 też');
  for (const k of ['NO3', 'K']) assert.ok(Math.abs(b.p[k] - a.p[k]) < 1e-12, k);
  assert.equal(b.items.find(i => i.mat === 'KNO3').purity, 98);
  assert.ok(Math.abs(b.plan.weekly.items.find(i => i.mat === 'KNO3').g * 98 / 100 - a.plan.weekly.items.find(i => i.mat === 'KNO3').g) < 1e-12);
});
test('C3: lista zakupów rozróżnia ten sam chelat o różnej zawartości', () => {
  const p1 = X.planBottle({ rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0', pct: '7' }], V: 100, bottle: 500, dose: 10, n: 7 }), p2 = X.planBottle({ rows: [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0' }], V: 100, bottle: 500, dose: 10, n: 7 });
  const l = X.shopLines([p1, p2], 4); assert.equal(l.length, 2); assert.equal(l.find(x => x.pct === 7).mat, 'FeDTPA');
});

/* ---------- 7.0: funkcje nowych ekranów ---------- */
test('na dawkę ↔ na tydzień: te same gramy, przełącznik nie zmienia wyniku', () => {
  const week = [{ k: 'NO3', t: '10', src: 'KNO3|0' }, { k: 'PO4', t: '', src: 'KH2PO4|0' }], base = { V: 100, bottle: 500, dose: 10, n: 7 };
  const dose = L.convertPer(week, 'week', 'dose', 7); assert.equal(dose[0].t, '1,4286'); assert.equal(dose[1].t, '');
  const a = L.makro({ ...base, rows: week }), b = L.makro({ ...base, rows: L.weekRows([{ k: 'NO3', t: '2', src: 'KNO3|0' }], 'dose', 5) });
  assert.ok(Math.abs(b.items[0].g - L.makro({ ...base, rows: [{ k: 'NO3', t: '10', src: 'KNO3|0' }] }).items[0].g) < 1e-12, '2 mg/l × 5 dawek = 10 mg/l tydzień');
  assert.equal(L.convertPer(dose, 'dose', 'week', 7)[0].t, '10');
  assert.ok(a.items.length === 1);
});
test('„daje”: suma udziałów pozycji = wynik na dawkę', () => {
  const r = L.makro({ rows: [{ k: 'NO3', t: '10', src: 'KNO3|0' }, { k: 'PO4', t: '1', src: 'KH2PO4|0' }, { k: 'K', t: '15', src: 'K2SO4|0' }], V: 100, bottle: 500, dose: 10, n: 7 });
  const sum = {}; for (const it of r.items) { const d = L.daje(it, { bottle: 500, dose: 10, V: 100 }); for (const k in d) sum[k] = (sum[k] || 0) + d[k]; }
  for (const k of ['NO3', 'PO4', 'K', 'SO4']) assert.ok(Math.abs(sum[k] - r.p[k]) < 1e-12, k);
});
test('masa pierwiastka: 1 g FeSO₄·7H₂O = 0,2009 g Fe; Fe-DTPA 7% → 0,07 g', () => {
  assert.ok(Math.abs(L.elementMass({ mat: 'FeSO4', hyd: 7, g: 1 }).Fe - 55.845 / 278.01) < 1e-4);
  assert.ok(Math.abs(L.elementMass({ mat: 'FeDTPA', hyd: 0, g: 1, pct: 7 }).Fe - 0.07) < 1e-12);
});
test('roztwór pośredni: 0,02 g → 1 g w 100 ml, odmierz 2 ml; ≥ 0,05 g – nie trzeba', () => {
  assert.deepEqual(L.posredni(0.02), { stockG: 1, waterMl: 100, takeMl: 2 });
  assert.equal(L.posredni(0.05), null); assert.equal(L.posredni(0.004).waterMl, 250); assert.ok(L.posredni(0.0005).twoStep);
});
test('porównanie produktów: ta sama dawka i ten sam cel', () => {
  const A = { name: 'A', ppm: { Fe: 2, K: 10 } }, B = { name: 'B', ppm: { K: 50 } };
  const d = L.porownaj([A, B], { mode: 'dose', amount: '5', n: 7, V: 100 }); assert.ok(Math.abs(d[0].perDose.Fe - 0.1) < 1e-12); assert.ok(Math.abs(d[1].week.K - 17.5) < 1e-12);
  const t = L.porownaj([A, B], { mode: 'target', el: 'K', t: '1', n: 7, V: 100 }); assert.equal(t[0].amount, 10); assert.equal(t[1].amount, 2);
  assert.equal(L.porownaj([B], { mode: 'target', el: 'Fe', t: '1', n: 7, V: 100 })[0].err, 'noel');
});
test('receptura z gramów: PPS-Pro na 250 ml, dawka 2,5 ml w 100 l – mg/l jak „Sprawdź” w 6.11', () => {
  const r = L.recepturaGram(D.DIY.ppspro.items, 500, { bottle: 250, dose: 2.5, n: 7, V: 100 });
  const old = FIX.find(c => c.name === 'sprawdz: gramy PPS-Pro'); // 500 ml i te same gramy ×2 – to samo stężenie
  for (const k of ['NO3', 'PO4', 'K', 'Mg']) assert.ok(Math.abs(r.p[k] / lastLog(old, 'doseToPpm').r[k] - 1) < 1e-12, k);
  assert.equal(r.split, null); assert.equal(r.doses, 100);
});
test('koncentraty mikro: CSM+B i Rexolin – tak; Flourish i Equilibrium – nie', () => {
  const pr = n => { const i = PRODUCTS.findIndex(p => p.name === n); return { ...PRODUCTS[i], source: 'builtin' }; };
  assert.ok(L.isMicroConc(pr('Plantex CSM+B'))); assert.ok(L.isMicroConc(pr('Yara Rexolin APN')));
  assert.ok(!L.isMicroConc(pr('Seachem Flourish'))); assert.ok(!L.isMicroConc(pr('Seachem Equilibrium')));
  assert.ok(!L.isMicroConc(pr('Intermag Mikro Plus')) && L.isMicroSource(pr('Intermag Mikro Plus')), 'płyn mikro: w Gotowych i jako źródło w Mikro');
});
test('C8: uwaga o formie azotu – N całkowity jako NO₃, mocznik jako NH₄', () => {
  const pr = n => PRODUCTS.find(p => p.name === n);
  assert.match(L.nNotes(pr('Tropica Specialised Nutrition'))[0], /całkowity – cały liczony jako NO₃/);
  assert.match(L.nNotes(pr('AquaVitro Synthesis'))[0], /mocznikowy liczony jako NH₄/);
  assert.deepEqual(L.nNotes(pr('Easy Life Nitro')), []);
  assert.equal(L.nNotes({ pct: { N_amid: '0,5' } }).length, 1); assert.equal(L.nNotes({ pct: { N_NO3: '2' } }).length, 0);
});

/* ---------- 7.4 ---------- */
test('na sucho: przykład z audytu – gramy na jedną dawkę (tydzień / 7), mg/l z dawki × 7 = cel', () => {
  const rows = [{ k: 'NO3', t: '10', src: 'KNO3|0' }, { k: 'PO4', t: '1', src: 'KH2PO4|0' }, { k: 'K', t: '15', src: 'K2SO4|0' }, { k: 'Mg', t: '3', src: 'MgSO4|7' }];
  const r = L.sucho({ rows, V: 100, n: 7 }), g = Object.fromEntries(r.items.map(i => [i.mat, i.g]));
  // KNO₃ na tydzień: 10 mg/l × 100 l = 1 g NO₃ → 1 × 101,103/62,004 = 1,6306 g; na dawkę /7
  assert.ok(Math.abs(g.KNO3 - 1.6306 / 7) < 2e-4, g.KNO3);
  const b = L.makro({ rows, V: 100, bottle: 500, dose: 10, n: 7 }); // butelka = 50 dawek
  for (const it of b.items) assert.ok(Math.abs(it.g / 50 - g[it.mat]) < 1e-12, it.mat);
  for (const [k, v] of [['NO3', 10], ['PO4', 1], ['K', 15], ['Mg', 3]]) assert.ok(Math.abs(r.p[k] * 7 - v) < 1e-9, k);
  assert.ok(L.sucho({ rows: [{ k: 'NO3', t: '', src: 'KNO3|0' }], V: 100, n: 7 }).empty);
});
test('metody: EI z przepisu, PPS-Pro z gramów i dawki 1 ml / 40 l dziennie', () => {
  const m = L.metody(); assert.deepEqual([m.EI.NO3, m.EI.PO4, m.EI.K, m.EI.Mg, m.EI.Fe], [20, 3, 30, 10, 0.5]);
  // PPS-Pro: 33 g KNO₃ w 500 ml = 66 g/l → NO₃ 40,48 g/l; 1 ml / 40 l × 7 → 7,08 mg/l (jak „Sprawdź” w 6.11)
  assert.ok(Math.abs(m['PPS-Pro'].NO3 - 66 * 62.004 / 101.103 / 40 * 7) < 2e-3, m['PPS-Pro'].NO3);
  assert.ok(m['PPS-Pro'].Fe > 0.6 && m['PPS-Pro'].Fe < 0.8, 'Fe z CSM+B: ' + m['PPS-Pro'].Fe);
});

/* ---------- „Zrób nawóz” (kreator) ---------- */
const prodB = id => ({ ...PRODUCTS[+id.slice(1)], id, source: 'builtin' });
const SZAFKA = ['KNO3|0', 'KH2PO4|0', 'K2SO4|0', 'MgSO4|7', 'p:b26'];
test('kreator: poziom z warunków – słabe bez CO₂ lekkie, mocne z CO₂ mocne, reszta średnie', () => {
  assert.equal(L.poziom('low', false), 'low'); assert.equal(L.poziom('high', true), 'high');
  assert.equal(L.poziom('low', true), 'mid'); assert.equal(L.poziom('high', false), 'mid'); assert.equal(L.poziom('mid', true), 'mid');
});
test('kreator: średnie światło, 100 l, 3 dawki – cele z zalecenia trafione, dwie butelki z tą samą dawką', () => {
  const r = L.kreator({ V: 100, light: 'mid', co2: false, change: 0.3, n: 3, have: SZAFKA, prodOf: prodB });
  assert.deepEqual(r.targets, { NO3: 10, PO4: 1, K: 10, Mg: 3, Fe: 0.2 });
  for (const k of ['NO3', 'PO4', 'K', 'Mg', 'Fe']) assert.ok(Math.abs(r.week[k] - r.targets[k]) < 1e-9, k);
  assert.equal(r.A.fx.level, 'ok', 'makro się rozpuści'); assert.equal(r.B.prodItems[0].prod.name, 'Plantex CSM+B');
  assert.ok(r.dose >= 1 && r.bottle / (r.dose * 3) >= 4, 'butelka starcza na kilka tygodni');
  assert.ok(r.effect.every(e => e.st === 'ok')); assert.equal(r.effect.find(e => e.k === 'NO3').rec, 10);
});
test('kreator: suwak i ręczne cele; na sucho = butelka / liczba dawek', () => {
  const a = L.kreator({ V: 100, light: 'mid', n: 3, scale: 0.5, have: SZAFKA, prodOf: prodB }); assert.equal(a.targets.NO3, 5); assert.equal(a.effect.find(e => e.k === 'NO3').st, 'ok', 'ocena względem celu planu'); assert.equal(a.effect.find(e => e.k === 'NO3').rec, 10);
  const b = L.kreator({ V: 100, light: 'mid', n: 3, plan: 'own', manual: { PO4: '0,5' }, have: SZAFKA, prodOf: prodB }); assert.equal(b.targets.PO4, 0.5); assert.equal(b.targets.NO3, 10);
  const c = L.kreator({ V: 100, light: 'mid', n: 3, how: 'dry', have: SZAFKA, prodOf: prodB }), d = L.kreator({ V: 100, light: 'mid', n: 3, dose: 10, bottle: 500, have: SZAFKA, prodOf: prodB });
  const g = r => Object.fromEntries(r.A.items.map(i => [i.mat, i.g]));
  for (const m of ['KNO3', 'KH2PO4', 'K2SO4', 'MgSO4']) assert.ok(Math.abs(g(c)[m] - g(d)[m] / (500 / 10)) < 1e-9, m); // 50 dawek w butelce
});
test('kreator: brak źródła – wiadomo czego, chelat z % z etykiety, FeSO₄ dostaje EDTA', () => {
  const r = L.kreator({ V: 100, light: 'mid', n: 3, have: ['KNO3|0', 'MgSO4|7'], prodOf: prodB });
  assert.deepEqual(r.missing, ['PO4', 'Fe']); assert.match(r.tips[0], /Brakuje źródła dla: PO₄, Fe/);
  const c = L.kreator({ V: 100, light: 'mid', n: 3, have: [...SZAFKA.slice(0, 4), 'FeDTPA|0'], pct: { FeDTPA: '7' }, prodOf: prodB });
  assert.equal(c.B.items[0].pct, 7);
  const e = L.kreator({ V: 100, light: 'mid', n: 3, have: [...SZAFKA.slice(0, 4), 'FeSO4|7', 'Na2EDTA|2'], prodOf: prodB });
  assert.equal(e.edta, 'Na2EDTA'); assert.ok(e.B.items.some(i => i.mat === 'Na2EDTA'));
  const k = L.kreator({ V: 100, light: 'mid', n: 3, have: ['KNO3|0', 'KH2PO4|0', 'MgSO4|7', 'p:b26'], prodOf: prodB });
  assert.equal(k.src.K, 'KNO3|0', 'K bez K₂SO₄ – z KNO₃'); assert.ok(!k.missing.includes('K'));
});
test('kreator: duży zbiornik – dawka podniesiona tak, żeby sole się rozpuściły', () => {
  const r = L.kreator({ V: 400, light: 'high', co2: true, n: 7, have: SZAFKA, prodOf: prodB });
  assert.equal(r.A.fx.level, 'ok'); assert.ok(r.dose >= L.niceDose(500, 7));
});
test('kreator: plany – mniej, zalecane, więcej, EI, własne', () => {
  const t = plan => L.kreator({ V: 100, light: 'mid', n: 3, plan, have: SZAFKA, prodOf: prodB }).targets;
  assert.equal(t('less').NO3, 6); assert.equal(t('rec').NO3, 10);
  assert.deepEqual(t('ei'), { NO3: 20, PO4: 3, K: 30, Mg: 10, Fe: 0.5 }, 'czyste EI');
  assert.deepEqual(t('more'), { NO3: 15, PO4: 1.5, K: 15, Mg: 4.5, Fe: 0.3 });
  assert.deepEqual(L.kreator({ V: 100, light: 'low', n: 3, plan: 'ei', have: SZAFKA, prodOf: prodB }).targets, { NO3: 20, PO4: 3, K: 30, Mg: 10, Fe: 0.5 }, 'przy słabym świetle czyste EI');
  for (const light of ['low', 'mid', 'high']) { const v = ['less', 'rec', 'more', 'ei'].map(p => L.kreator({ V: 100, light, co2: light === 'high', n: 3, plan: p, have: SZAFKA, prodOf: prodB }).targets);
    for (const k of ['NO3', 'PO4', 'K', 'Mg', 'Fe']) for (let i = 1; i < 4; i++) assert.ok(v[i][k] > v[i - 1][k], `${light} ${k}: plan ${i} > ${i - 1}`); }
  const own = L.kreator({ V: 100, light: 'mid', n: 3, plan: 'own', manual: { NO3: '5' }, have: SZAFKA, prodOf: prodB }).targets;
  assert.equal(own.NO3, 5); assert.equal(own.PO4, 1, 'puste pola = zalecenie');
  assert.equal(L.kreator({ V: 100, light: 'mid', n: 3, plan: 'rec', manual: { NO3: '5' }, have: SZAFKA, prodOf: prodB }).targets.NO3, 10, 'ręczne tylko w planie własnym');
});
test('kreator: saletra wapniowa z fosforanem – makro w dwóch butelkach; MAP daje NH₄', () => {
  const r = L.kreator({ V: 100, light: 'mid', n: 3, plan: 'rec', have: ['CaNO32|4', 'KH2PO4|0', 'K2SO4|0', 'MgSO4|7', 'p:b26'], prodOf: prodB });
  assert.equal(r.src.NO3, 'CaNO32|4'); assert.ok(r.A.split && r.A.split.bottles.length >= 2, 'Ca i PO₄ osobno');
  const m = L.kreator({ V: 100, light: 'mid', n: 3, plan: 'rec', have: ['KNO3|0', 'NH4H2PO4|0', 'MgSO4|7', 'p:b26'], prodOf: prodB });
  assert.equal(m.src.PO4, 'NH4H2PO4|0'); assert.ok(m.week.NH4 > 0 && m.tips.some(t => /amon/.test(t)));
});
test('mineralizacja RO: GH 6 i KH 3 z gipsu, siarczanu magnezu i KHCO₃ – liczone niezależnie', () => {
  // GH = Ca/7,147 + Mg/4,336 przy Ca = 3·Mg → Mg = 6 / 0,6504 = 9,225 mg/l, Ca = 27,68 mg/l
  const m = L.mineralizacja({ GH: 6, KH: 3, have: ['CaSO4|2', 'MgSO4|7', 'KHCO3|0'], V: 100, change: 0.3 }), g = Object.fromEntries(m.items.map(i => [i.mat, i.g]));
  assert.ok(Math.abs(g.CaSO4 - 0.02768 * 10 * 172.17 / 40.078) < 2e-3, g.CaSO4); // na 10 l
  assert.ok(Math.abs(g.MgSO4 - 0.009225 * 10 * 246.47 / 24.305) < 2e-3, g.MgSO4);
  // KH 3 °dH = 3 × 0,3566 mmol/l HCO₃ → KHCO₃ 100,115 g/mol
  assert.ok(Math.abs(g.KHCO3 - 3 * 0.35663 * 100.115 / 1000 * 10) < 2e-3, g.KHCO3);
  assert.ok(Math.abs(m.gh - 6) < 1e-9 && Math.abs(m.kh - 3) < 1e-9); assert.equal(m.liters, 30); assert.ok(m.notes[0].includes('Gips'));
  const r = L.kreator({ V: 100, light: 'mid', n: 3, water: 'ro', GH: 6, KH: 3, have: [...SZAFKA, 'CaSO4|2', 'KHCO3|0'], prodOf: prodB });
  assert.ok(r.mineral && r.mineral.items.length === 3); assert.ok(r.tips.some(t => /Woda RO nie zawiera wapnia/.test(t)));
  assert.deepEqual(L.mineralizacja({ have: ['MgSO4|7'] }).missing, ['Ca', 'HCO3']);
  assert.equal(L.kreator({ V: 100, light: 'mid', n: 3, have: SZAFKA, prodOf: prodB }).mineral, null, 'kranówka – bez mineralizacji');
});

test('Zrób nawóz → zapisana receptura daje to samo co przepis (makro z solami, mikro z gotowej mieszanki jako { fert })', () => {
  const r = L.kreator({ V: 120, light: 'mid', n: 3, plan: 'rec', have: SZAFKA, prodOf: prodB, bottle: 500 });
  const A = X.solution(r.A.items, 500), pA = X.doseToPpm(A.conc, r.dose, 120);
  for (const k of ['NO3', 'PO4', 'K', 'Mg']) assert.ok(Math.abs(pA[k] * 3 - r.targets[k]) < 1e-9, k);
  const pr = r.B.prodItems[0], fert = { id: 'x', name: pr.prod.name, unit: pr.prod.unit, ppm: pr.prod.ppm };
  const pB = X.doseToPpm(X.solution([{ fert, g: pr.a }], 500).conc, r.dose, 120);
  assert.ok(Math.abs(pB.Fe * 3 - r.targets.Fe) < 1e-9, 'Fe z zapisanej mieszanki');
  // „W 1 ml” i „ile ml podnosi o 1 mg/l”: stężenie w g/l = mg/ml, 1 mg/l w V l = V mg
  const ml1 = 120 / A.conc.NO3; assert.ok(Math.abs(X.doseToPpm(A.conc, ml1, 120).NO3 - 1) < 1e-12);
});

test('Gotowe nawozy: rodzaj, wyszukiwanie, dawka producenta, pierwiastki śladowe w dużym akwarium', () => {
  const PP = require('../products.js').PRODUCTS, by = n => PP.find(p => p.name === n);
  assert.equal(L.gotKind(by('Seachem Flourish')), 'micro', 'śladowy N to nie NPK');
  assert.equal(L.gotKind(by('Tropica Specialised Nutrition')), 'multi'); assert.equal(L.gotKind(by('AquaVitro Carbonate')), 'kh');
  assert.equal(L.gotKind(by('Seachem Flourish Potassium')), 'k'); assert.equal(L.gotKind(by('Easy Life Ferro')), 'fe'); assert.equal(L.gotKind(by('Seachem Equilibrium')), 'gh');
  const sm = { ...by('Intermag Mikro Plus'), producer: 'Intermag' };
  assert.ok(L.gotMatch(sm, 'zelazo intermag') && L.gotMatch(sm, 'MIEDŹ') && L.gotMatch(sm, 'mikro') && !L.gotMatch(sm, 'azot'));
  // dawka producenta przeliczona: Tropica 6 ml/50 l → 120 l = 14,4 ml; ProFito 10 ml/100 l → 60 l = 6 ml
  assert.equal(L.gotScale(by('Tropica Premium Nutrition').doz, 120), 14.4); assert.equal(L.gotScale(by('Easy Life ProFito').doz, 60), 6);
  // dawki producenta zgodne ze składem tam, gdzie producent podaje efekt: Ferro 5 ml/100 l = +0,5 Fe; Flourish Potassium 5 ml/125 l = +2 K
  const eff = (p, V) => p.ppm[Object.keys(p.ppm)[0]] * L.gotScale(p.doz, V) / V;
  assert.ok(Math.abs(eff(by('Easy Life Ferro'), 100) - 0.5) < 1e-9); assert.ok(Math.abs(eff(by('Seachem Flourish Potassium'), 125) - 2) < 1e-9);
  assert.deepEqual(L.gotDoz({ dose: '1,5 ml / 50 l tyg.' }), { ml: 1.5, perL: 50, n: 1, note: '1,5 ml / 50 l tyg.', own: true });
  assert.equal(L.gotDoz({ dose: 'wg uznania' }), null);
  assert.equal(PP.filter(p => p.doz).length, 7, 'dawka producenta tylko tam, gdzie sprawdzona');
  // 500 l: Mo 0,0208 g/l → 1 ml daje 0,00004 mg/l – wcześniej znikało z wyniku
  const r = L.produktPlyn({ ppm: by('Tropica Premium Nutrition').ppm, V: 500, n: 1, way: 'amount', ldose: '60' });
  assert.ok(r.ks.includes('Mo') && Math.abs(r.per1.Mo * 60 - 0.0208 * 60 / 500) < 1e-12);
});

test('Mineralizacja (osobne narzędzie): cała porcja wody, K₂CO₃ do KH, proporcja Ca : Mg, przypadki niemożliwe', () => {
  // GH 6, KH 3, 40 l: Ca:Mg 3:1 → Mg = 6 / (3/7,147 + 1/4,334) = 9,224 mg/l, Ca 27,67; HCO₃ = 3 × 0,3567 × 61,017 = 65,3 mg/l
  const m = L.mineralizacja({ GH: 6, KH: 3, have: ['CaSO4|2', 'MgSO4|7', 'KHCO3|0'], L: 40 });
  assert.ok(Math.abs(m.gh - 6) < 1e-6 && Math.abs(m.kh - 3) < 1e-6); assert.ok(Math.abs(m.per10.Mg - 9.224) < 0.001 && Math.abs(m.per10.Ca - 27.67) < 0.01);
  const g = Object.fromEntries(m.forL.map(i => [i.mat, i.g])), g10 = Object.fromEntries(m.items.map(i => [i.mat, i.g]));
  for (const k in g) assert.ok(Math.abs(g[k] - 4 * g10[k]) < 1e-12, k + ' × 4 dla 40 l');
  assert.ok(Math.abs(g.CaSO4 - 27.67 * 40 / 1000 / 0.2328) < 0.01, 'gips: Ca 23,28%');
  // K₂CO₃: wcześniej nie trafiał w KH (cel HCO₃, a sól daje CO₃)
  const k = L.mineralizacja({ GH: 6, KH: 3, have: ['CaCl2|2', 'MgSO4|7', 'K2CO3|0'], L: 20 }); assert.ok(Math.abs(k.kh - 3) < 1e-6, 'KH z K₂CO₃ ' + k.kh); assert.ok(!(k.per10.HCO3 > 0) && k.per10.CO3 > 0);
  // Ca : Mg 4 : 1 → Ca/Mg = 4
  const r4 = L.mineralizacja({ GH: 8, KH: 0, ratio: 4, have: ['CaCl2|2', 'MgSO4|7'] }); assert.ok(Math.abs(r4.per10.Ca / r4.per10.Mg - 4) < 1e-9 && Math.abs(r4.gh - 8) < 1e-6 && r4.missing.length === 0);
  // niemożliwe / niekompletne: brak Ca, za dużo gipsu, soda – sód, saletra – NO₃
  assert.ok(L.mineralizacja({ GH: 6, KH: 0, have: ['MgSO4|7'] }).warn.some(w => /wapnia/.test(w)));
  assert.ok(L.mineralizacja({ GH: 100, KH: 0, have: ['CaSO4|2', 'MgSO4|7'] }).warn.some(w => /nie rozpuści/.test(w)));
  assert.ok(L.mineralizacja({ GH: 6, KH: 8, have: ['CaSO4|2', 'MgSO4|7', 'NaHCO3|0'] }).warn.some(w => /sodu/.test(w)));
  assert.ok(L.mineralizacja({ GH: 6, KH: 0, have: ['CaNO32|4', 'MgSO4|7'] }).warn.some(w => /NO₃/.test(w)));
  assert.equal(L.mineralizacja({ GH: 0, KH: 0, have: ['CaSO4|2'] }).items.length, 0);
});

test('Przepisy: przeliczenie 50 g KNO₃ + 10 g KH₂PO₄ / 500 ml → 1000 ml, oryginał bez zmian, stężenie stałe', () => {
  const items = [{ mat: 'KNO3', hyd: 0, purity: 100, g: 50 }, { mat: 'KH2PO4', hyd: 0, purity: 100, g: 10 }], copy = JSON.stringify(items);
  const r = L.recepturaGram(items, 500, { bottle: 1000, dose: 10, n: 3, V: 100 });
  assert.deepEqual(r.items.map(i => i.g), [100, 20]); assert.equal(JSON.stringify(items), copy, 'oryginał nietknięty');
  const r2 = L.recepturaGram(items, 500, { bottle: 250, dose: 10, n: 3, V: 100 }); assert.deepEqual(r2.items.map(i => i.g), [25, 5]);
  // stężenie: 100 g/l KNO₃ → NO₃ 61,33 g/l; 10 ml na 100 l → +6,13 mg/l NO₃; tak samo przy 250 ml
  assert.ok(Math.abs(r.sol.conc.NO3 - 100 * 0.61333) < 0.01 && Math.abs(r.sol.conc.NO3 - r2.sol.conc.NO3) < 1e-9);
  assert.ok(Math.abs(r.p.NO3 - 6.1333) < 0.001); assert.equal(r.doses, 100); assert.ok(Math.abs(r.days - 100 / 3 * 7) < 1e-9);
  // 50 g KNO₃ w 500 ml = 31,6% granicy? 100 g/l, rozpuszczalność 316 g/l → ratio 0,32
  assert.ok(Math.abs(r.sol.rows[0].ratio - 100 / 316) < 0.001);
});

// 7.11: lista zakupów bez magazynu – sumowanie z kilku receptur, „mam już” bez odejmowania, inna forma uwodnienia
test('lista zakupów: sumuje te same składniki z kilku receptur i oznacza posiadane', () => {
  const fert = { id: 'b26', name: 'Plantex CSM+B', unit: 'g' };
  const A = { name: 'Makro', items: [{ mat: 'KNO3', hyd: 0, g: 12.5 }, { mat: 'KH2PO4', hyd: 0, g: 1.5 }, { mat: 'MgSO4', hyd: 7, g: 20 }] };
  const B = { name: 'PPS-Pro', items: [{ mat: 'KNO3', hyd: 0, g: 30 }, { mat: 'MgSO4', hyd: 7, g: 0 }, { fert, g: 2 }] };
  const z = L.zakupy([A, B], []);
  const by = Object.fromEntries(z.map(l => [l.key, l]));
  assert.equal(z.length, 4, 'KNO₃, KH₂PO₄, MgSO₄·7H₂O, CSM+B – zero gramów pomijane');
  close(by['KNO3|0'].q, 42.5, 'KNO₃ zsumowany'); assert.deepEqual(by['KNO3|0'].from, ['Makro', 'PPS-Pro']);
  close(by['MgSO4|7'].q, 20, 'MgSO₄'); assert.deepEqual(by['MgSO4|7'].from, ['Makro']);
  assert.equal(by['p:b26'].unit, 'g'); close(by['p:b26'].q, 2, 'CSM+B');
  assert.ok(z.every(l => l.have === null), 'bez listy „mam” – wszystko do kupienia');
  // „mam już”: sól, gotowy nawóz, inna forma uwodnienia (MgSO₄ bezwodny: 20 g × 120,37 / 246,47 = 9,77 g)
  const z2 = Object.fromEntries(L.zakupy([A, B], ['KNO3|0', 'p:b26', 'MgSO4|0']).map(l => [l.key, l]));
  assert.deepEqual(z2['KNO3|0'].have, {}); assert.deepEqual(z2['p:b26'].have, {}); assert.equal(z2['KH2PO4|0'].have, null);
  assert.equal(z2['MgSO4|7'].have.hyd, 0); close(+(20 * z2['MgSO4|7'].have.k).toFixed(2), 9.77, 'przeliczenie formy');
  close(z2['KNO3|0'].q, 42.5, 'posiadanie niczego nie odejmuje');
  assert.deepEqual(L.zakupy([], []), []); assert.deepEqual(L.zakupy([{ name: 'x', items: [] }], ['KNO3|0']), []);
});

test('mineralizacja z nawozem: Ca i Mg z nawozu odjęte od wody, suma trzyma GH i Ca : Mg', () => {
  const base = { GH: 6, KH: 0, ratio: 3, have: ['CaCl2|2', 'MgSO4|7'], L: 20 };
  const m0 = L.mineralizacja(base), m = L.mineralizacja({ ...base, change: 0.3, fertWeek: { Mg: 1.5 } });
  assert.equal(m0.tank, null, 'bez nawozu – jak wcześniej');
  close(m.tank.fromFert.Mg, 5, 'Mg z nawozu w akwarium = 1,5 / 0,3');
  close(m.per10.Mg, m0.per10.Mg - 5, 'mniej magnezu w wodzie'); close(m.per10.Ca, m0.per10.Ca, 'wapń bez zmian');
  close(m.tank.gh, 6, 'GH w akwarium razem z nawozem'); close(m.tank.Ca / m.tank.Mg, 3, 'Ca : Mg dla sumy');
  assert.ok(m.gh < 6, 'sama woda ma niższe GH');
  // nawóz daje więcej Mg niż cel – woda bez magnezu, ostrzeżenie
  const big = L.mineralizacja({ ...base, change: 0.3, fertWeek: { Mg: 5 } });
  assert.ok(!(big.per10.Mg > 0) && big.missing.length === 0 && big.warn.some(w => /nie potrzebuje magnezu/.test(w)), big.warn);
  // bez podmian nie da się policzyć stanu ustalonego – nic nie odejmujemy
  assert.equal(L.mineralizacja({ ...base, change: 0, fertWeek: { Mg: 1.5 } }).tank, null);
});

test('Gotowe nawozy: rodzaj makro nazywa się NPK', () => {
  assert.equal(Object.fromEntries(L.GOT_KIND).macro, 'Makro (NPK)'); assert.equal(Object.fromEntries(L.GOT_KIND).multi, 'Kompletny (NPK + mikro)');
});

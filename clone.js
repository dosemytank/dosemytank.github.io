if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Odpowiednik gotowego nawozu z soli =====
   Cel: w butelce takie samo stężenie składników (g/l) jak w produkcie – wtedy ta sama dawka w ml daje to samo w akwarium.
   Gdy składniki nie mogą być w jednej butelce – ta sama reguła co w kalkulatorze (X.compat: Ca z PO₄/węglanami/SO₄, metale z PO₄,
   struwit NH₄+Mg+PO₄, Mg z CO₃) – dzielimy na butelki o tej samej objętości: A – makro (N, P, K, Mg), B – Ca, Fe i mikro;
   gdy w którejś nadal jest niezgodność, dzielimy ją dalej (C, D…). Dawka: tyle samo ml z każdej. Węgla organicznego, aminokwasów itp. nie odtwarzamy. */
const _CX = typeof CHEM !== 'undefined' ? CHEM : require('./chem.js');
// surowce do wyboru: A – makro (bez Ca i metali), B – Ca, chelat Fe i mikro. Solver sam dobiera proporcje,
// np. azot bez nadmiaru potasu z Mg(NO₃)₂ albo NH₄NO₃, gdy produkt ma więcej NO₃ niż pozwala sam KNO₃.
const CLONE_A = [['KNO3', 0], ['MgNO32', 6], ['NH4NO3', 0], ['NH4SO4', 0], ['KH2PO4', 0], ['K2SO4', 0], ['KCl', 0], ['MgSO4', 7], ['MgCl2', 6], ['KHCO3', 0]];
const CLONE_BMAT = [['CaCl2', 2], ['CaNO32', 4], ['MnSO4', 1], ['ZnSO4', 7], ['CuSO4', 5], ['H3BO3', 0], ['Na2MoO4', 2], ['CoSO4', 7]];
const CLONE_FE = { FeDTPA: 'Fe-DTPA 11%', FeEDTA: 'Fe-EDTA 13%', FeEDDHA: 'Fe-EDDHA 6%' };
const CLONE_B = ['Ca', 'Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co'];
const CLONE_SIDE = ['Na', 'Cl', 'SO4', 'HCO3', 'CO3'];
const CLONE_OK = ['NO3', 'NH4', 'PO4', 'K', 'Mg', ...CLONE_B, ...CLONE_SIDE];
// czy odpowiednik wymaga kilku butelek – rozstrzyga ta sama reguła co podział w kalkulatorze (po doborze soli)
const cloneConflict = (ppm, o = {}) => cloneOf(ppm, { ...o, split: undefined, powder: false }).split;

// nieujemne najmniejsze kwadraty (Lawson–Hanson): min Σ w_k² (A·x − t)_k², x ≥ 0
function lsq(M, b, P) { // rozwiązanie na kolumnach P (równania normalne, eliminacja Gaussa z wyborem elementu)
  const n = P.length, G = Array.from({ length: n }, (_, a) => [...P.map(c => M.reduce((s, r) => s + r[P[a]] * r[c], 0)), M.reduce((s, r, k) => s + r[P[a]] * b[k], 0)]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(G[r][c]) > Math.abs(G[p][c])) p = r;
    [G[c], G[p]] = [G[p], G[c]]; const d = G[c][c]; if (Math.abs(d) < 1e-300) continue;
    for (let r = 0; r < n; r++) if (r !== c) { const f = G[r][c] / d; if (f) for (let q = c; q <= n; q++) G[r][q] -= f * G[c][q]; }
  }
  return G.map((row, a) => Math.abs(row[a]) < 1e-300 ? 0 : row[n] / row[a]);
}
function nnls(A, t, w) {
  const M = A.map((row, k) => row.map(v => v * w[k])), b = t.map((v, k) => v * w[k]), n = A[0].length;
  const x = new Array(n).fill(0), P = [], Z = new Set([...Array(n).keys()]);
  const grad = () => { const r = b.map((v, k) => v - M[k].reduce((s, a, j) => s + a * x[j], 0)); return Array.from({ length: n }, (_, j) => M.reduce((s, row, k) => s + row[j] * r[k], 0)); };
  for (let outer = 0; outer < 3 * n; outer++) {
    const g = grad(); let jm = -1, gm = 1e-12 * Math.max(1, ...g.map(Math.abs));
    for (const j of Z) if (g[j] > gm) { gm = g[j]; jm = j; }
    if (jm < 0) break;
    P.push(jm); Z.delete(jm);
    for (let inner = 0; inner < 3 * n; inner++) {
      const z = lsq(M, b, P);
      if (z.every(v => v > 0)) { P.forEach((j, a) => x[j] = z[a]); break; }
      let al = Infinity; P.forEach((j, a) => { if (z[a] <= 0) al = Math.min(al, x[j] / (x[j] - z[a])); });
      P.forEach((j, a) => x[j] += al * (z[a] - x[j]));
      for (let a = P.length - 1; a >= 0; a--) if (x[P[a]] <= 1e-15) { x[P[a]] = 0; Z.add(P[a]); P.splice(a, 1); }
    }
  }
  return x;
}

// ppm: skład produktu (g/l = mg/l w 1 l na 1 ml); o: { bottle (ml), split: true/false/undefined = auto, fe: 'FeDTPA'|…, custom }
// auto: najpierw jedna butelka; gdy dobrane sole są niezgodne (X.compat) – podział A/B i, w razie potrzeby, dalszy podział
function cloneOf(ppm, o = {}) {
  if (o.powder || o.split === false) return cloneSolve(ppm, o, false); // proszek = sucha mieszanka, bez podziału
  let r = cloneSolve(ppm, o, o.split === true);
  if (o.split !== true) { if (_CX.compat(r.bottles.flatMap(b => b.items), r.bottle, o.custom || []).bottles.length <= 1) return r; r = cloneSolve(ppm, o, true); }
  return cloneRefine(r, o.custom || []);
}
// butelka A/B, w której nadal jest niezgodność (np. struwit, węglany z Mg) → dalszy podział tą samą regułą
function cloneRefine(r, custom) {
  let more = false;
  const parts = r.bottles.flatMap(b => { const c = _CX.compat(b.items, r.bottle, custom); if (c.bottles.length <= 1) return [b]; more = true; return c.bottles.map(cb => ({ ...b, items: cb.items, _sub: 1 })); });
  if (!more) return r;
  const L = _CX.ION, desc = it => { const c = _CX.solution(it, r.bottle, custom).conc, ks = ['NO3', 'NH4', 'PO4', 'K', 'Mg', 'Ca', 'Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'HCO3', 'CO3'].filter(k => c[k] > 0); return ks.slice(0, 4).map(k => L[k].l).join(', ') + (ks.length > 4 ? '…' : ''); };
  const bottles = parts.map((b, i) => { const sol = _CX.solution(b.items, r.bottle, custom); return { label: 'ABCDEFGH'[i] + ' – ' + (b._sub ? desc(b.items) : b.label.split(' – ')[1]), items: b.items, conc: sol.conc, warn: sol.warn, rows: sol.rows }; });
  return { ...r, bottles };
}
function cloneSolve(ppm, o, split) {
  const bottle = o.bottle > 0 ? o.bottle : 500, custom = o.custom || [], fe = CLONE_FE[o.fe] ? o.fe : 'FeDTPA';
  const want = Object.fromEntries(Object.entries(ppm || {}).filter(([k, v]) => v > 0));
  const powder = !!o.powder;
  // bez Ca i NH₄ w produkcie nie dokładamy ich (Ca z siarczanami daje gips); NH₄ tylko na życzenie (o.nh4) – gdy produkt ma więcej azotu, niż dadzą azotany K i Mg
  const allow = ([id]) => !((/^Ca/.test(id) && !(want.Ca > 0)) || (/^NH4/.test(id) && !(want.NH4 > 0) && !o.nh4) || (id === 'KHCO3' && !(want.HCO3 > 0)));
  const B = [...CLONE_BMAT, [fe, 0]].filter(allow), A0 = CLONE_A.filter(allow);
  const vars = split ? [...A0.map(s => [...s, 0]), ...B.map(s => [...s, 1])] : [...A0, ...B].map(s => [...s, 0]);
  const cols = vars.map(([id, hyd]) => { const m = _CX.mat(id, custom); return m ? _CX.saltToPpm(m, hyd, 100, 1, 1) : {}; }); // mg/l z 1 g w 1 l
  const ions = [...new Set([...Object.keys(want), ...cols.flatMap(c => Object.keys(c))])];
  const tot = Object.values(want).reduce((a, v) => a + v, 0) * 1000 || 1;
  // wagi: najpierw trafić w skład produktu (błąd względny ×100), potem jak najmniej jonów spoza składu (sole towarzyszące Na, Cl, SO₄ – najmniej ważne)
  const w = ions.map(k => want[k] > 0 ? (CLONE_SIDE.includes(k) ? 0.1 : 100) / (want[k] * 1000) : (CLONE_SIDE.includes(k) ? 0.01 : 5) / tot);
  const A = ions.map(k => cols.map(c => c[k] || 0)), t = ions.map(k => (want[k] || 0) * 1000);
  let x = nnls(A, t, w);
  // drugi przebieg bez soli, które dają < 1% każdego składnika produktu (śladowe dodatki nie do odważenia)
  const keep = cols.map((c, j) => x[j] > 0 && ions.some((k, r) => want[k] > 0 && A[r][j] * x[j] >= 0.01 * t[r]));
  if (keep.some((v, j) => !v && x[j] > 0)) { const idx = keep.map((v, j) => v ? j : -1).filter(j => j >= 0), y = nnls(A.map(row => idx.map(j => row[j])), t, w); x = cols.map(() => 0); idx.forEach((j, a2) => x[j] = y[a2]); }
  const bottles = (split ? [[tl('A – makro'), 0], [tl('B – Ca, Fe i mikro'), 1]] : [['', 0]]).map(([label, bi]) => {
    // płyn: gramy na butelkę; proszek: gramy na 100 g mieszanki (skład produktu w g/kg = gramy soli na 1 kg)
    const per = powder ? 0.1 : bottle / 1000;
    const items = vars.map((v, j) => ({ mat: v[0], hyd: v[1], purity: 100, g: x[j] * per, b: v[2] })).filter(i => i.b === bi && i.g >= 0.0005 * per * 2).map(({ b, ...i }) => i);
    // metale z siarczanów bez chelatu wytrącają się – EDTA 1 mol na 1 mol metalu (Mn, Zn, Cu, Co)
    const mol = _CX.metalMoles(items, custom); if (mol > 0) items.push({ mat: 'Na2EDTA', hyd: 2, purity: 100, g: _CX.edtaGrams(mol, 'Na2EDTA', 2) });
    const sol = _CX.solution(items, powder ? 100 : bottle, custom); // proszek: 100 g mieszanki ≈ 100 ml do porównania stężeń
    if (powder) sol.warn = [];
    return { label, items: items.map(i => ({ ...i, g: +i.g.toFixed(4) })), conc: sol.conc, warn: sol.warn, rows: sol.rows };
  }).filter(b => b.items.length);
  const conc = {}; for (const b of bottles) for (const k in b.conc) conc[k] = (conc[k] || 0) + b.conc[k];
  const all = [...new Set([...Object.keys(want), ...Object.keys(conc).filter(k => conc[k] > 1e-6)])];
  const diff = all.map(k => ({ k, orig: want[k] || 0, clone: conc[k] || 0, side: CLONE_SIDE.includes(k), dev: want[k] > 0 ? (conc[k] || 0) / want[k] - 1 : null }));
  const unsupported = Object.keys(want).filter(k => !CLONE_OK.includes(k));
  const match = diff.filter(d => !d.side && d.orig > 0).every(d => Math.abs(d.dev) <= 0.05); // jony towarzyszące (K z KH₂PO₄, SO₄…) pokazujemy osobno
  const filler = powder ? Math.max(0, 100 - bottles.reduce((a, b) => a + b.items.reduce((s1, i) => s1 + i.g, 0), 0)) : null;
  return { bottle, powder, filler, split, fe, bottles, conc, diff, match, unsupported };
}

/* ---------- presety znanych przepisów DIY – jedno źródło: nawozy-dane.js ---------- */
const _CD = typeof DANE !== 'undefined' ? DANE : require('./nawozy-dane.js');
const DIY_PRESETS = _CD.DIY, presetScale = _CD.presetScale;

const CLONE = { CLONE_FE, CLONE_B, cloneConflict, cloneOf, nnls, DIY_PRESETS, PRESETS: DIY_PRESETS, presetScale };
if (typeof module !== 'undefined') module.exports = CLONE;

if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulatory nawozów – czyste funkcje (bez DOM i bez `state`), działają w przeglądarce i w Node (testy).
   Przeniesione 1:1 z kalkulator.js (6.11). Ekrany tylko zbierają dane z formularza i wyświetlają wynik.
   Zależności: chem.js (CHEM), nawozy-dane.js (DANE – przepisy, cele startowe, domyślne źródła). ===== */
const LICZ = (() => {
const X = typeof CHEM !== 'undefined' ? CHEM : require('./chem.js');
const D = typeof DANE !== 'undefined' ? DANE : require('./nawozy-dane.js');
const PRODS = typeof PRODUCTS !== 'undefined' ? PRODUCTS : require('./products.js').PRODUCTS;

// liczba z pola tekstowego: przecinek albo kropka; brak liczby → undefined
const n2 = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : undefined; };
const splitV = v => { const [id, hh] = String(v || '').split('|'); return { id, hyd: +hh || 0 }; };

/* ---------- etykieta gotowego nawozu → stężenie ----------
   skład z etykiety (% masowe albo g/l) → jon w akwarium: [id pola, etykieta, jon, mnożnik] */
const LABEL = [['N_NO3', tl('N azotanowy'), 'NO3', X.IM.NO3 / X.AW.N], ['N_NH4', tl('N amonowy'), 'NH4', X.IM.NH4 / X.AW.N], ['N_amid', tl('N mocznikowy'), 'NH4', X.IM.NH4 / X.AW.N],
  ['P2O5', 'P₂O₅', 'PO4', 2 * X.IM.PO4 / (2 * X.AW.P + 5 * X.AW.O)], ['K2O', 'K₂O', 'K', 2 * X.AW.K / (2 * X.AW.K + X.AW.O)], ['MgO', 'MgO', 'Mg', X.AW.Mg / (X.AW.Mg + X.AW.O)],
  ['CaO', 'CaO', 'Ca', X.AW.Ca / (X.AW.Ca + X.AW.O)],
  ['NO3', tl('NO₃ (jon)'), 'NO3', 1], ['NH4', tl('NH₄ (jon)'), 'NH4', 1], ['P', 'P', 'PO4', X.IM.PO4 / X.AW.P], ['PO4', 'PO₄', 'PO4', 1], ['K', 'K', 'K', 1], ['Mg', 'Mg', 'Mg', 1], ['Ca', 'Ca', 'Ca', 1],
  ['S', 'S', 'SO4', X.IM.SO4 / X.AW.S], ['SO3', 'SO₃', 'SO4', X.IM.SO4 / (X.AW.S + 3 * X.AW.O)], ['SO4', 'SO₄', 'SO4', 1], ['Fe', 'Fe', 'Fe', 1], ['Mn', 'Mn', 'Mn', 1], ['Zn', 'Zn', 'Zn', 1], ['Cu', 'Cu', 'Cu', 1], ['B', 'B', 'B', 1], ['Mo', 'Mo', 'Mo', 1]];
// lab: { form: 'liquid'|'powder', unit: 'pct'|'gl', dens, pct: { id: wartość } }
// wynik: g/l (płyn – 1 ml w 1 l daje tyle mg/l) albo g/kg (proszek – 1 g w 1 l daje tyle mg/l)
function labelConc(lab) {
  const k = lab.form === 'powder' ? 10 : lab.unit === 'gl' ? 1 : 10 * (n2(lab.dens) > 0 ? n2(lab.dens) : 1), out = {};
  for (const [id, , ion, f] of LABEL) { const v = n2((lab.pct || {})[id]); if (v > 0) out[ion] = (out[ion] || 0) + v * k * f; }
  return out;
}

/* ---------- przepis PMDD (nawozy-dane.js) przeliczony na butelkę ---------- */
function pmddItems(bottle) {
  const sc = bottle / D.PMDD.vol;
  return D.PMDD.items.map(({ mat, hyd, g }) => ({ mat, hyd, g: +(g * sc).toFixed(4) }));
}
// kwas do PMDD na butelkę: HCl 36% (ml) i słabsze zamienniki – ocet 10% (ml) i kwas cytrynowy (g), tyle samo H⁺
function pmddAcid(b) { const hcl = 2 * b / 1000, mmol = hcl * 1.179 * 0.36 / 36.461 * 1000; return { hcl, ocet: mmol / (1.0125 * 0.10 / 60.05 * 1000), cit: mmol * 210.14 / 1000 }; }

const NUTR_DEF = D.NUTR_DEF;

/* ---------- dawka ---------- */
// najmniejsza dawka (ml), przy której żadna sól nie przekracza 80% rozpuszczalności (stężenie w butelce zależy od dawki, nie od butelki)
// d0 – dawka z formularza (0 = nie wpisano → 10 ml)
function fitDose({ rows, n, bottle, V, d0, custom = [], prodOf = () => null }) {
  d0 = d0 || 10;
  const rowsOf = d => X.solution(X.planBottle({ rows, V, bottle, dose: d, n, custom, prodOf }).items, bottle, custom).rows, fx = X.solFix(rowsOf(d0));
  if (fx.level === 'ok') return d0;
  const d = X.roundUp(d0 * fx.factor, d0 * fx.factor <= 20 ? 0.5 : 1); return d <= bottle * 0.25 ? d : d0;
}

/* ---------- szybkie przepisy ----------
   ctx: { bottle, V, n (tekst z formularza), dose (liczba z formularza), mrows, custom, prodOf }
   wynik: zmiany stanu formularza { mode, items?, rows?, mrows?, dose?, n? } – wartości tekstowe z przecinkiem jak w polach */
const comma = v => String(v).replace('.', DEC);
function preset(id, ctx) {
  const bottle = ctx.bottle || 500, V = ctx.V, out = { preset: id };
  if (id === 'pmdd') return { ...out, mode: 'check', items: pmddItems(bottle) };
  if (id === 'ppspro') { const Pp = D.DIY.ppspro; return { ...out, mode: 'check', items: D.presetScale(Pp, bottle), dose: comma(+(Pp.doseMl * V / Pp.perLiters).toFixed(1)), n: '7' }; }
  const E = D.DIY.ei, pr = D.START[id], week = id === 'ei' ? E.week : pr.week, fe = id === 'ei' ? E.weekMicro.Fe : pr.fe;
  out.mode = 'make'; out.rows = Object.entries(week).map(([k, v]) => ({ k, t: comma(v), src: NUTR_DEF[k][1] }));
  const n = id === 'ei' ? String(E.n) : ctx.n; if (id === 'ei') out.n = n;
  out.mrows = (ctx.mrows || []).map(r => ({ ...r })); const m = out.mrows.find(r => r.k === 'Fe');
  if (m) m.t = comma(fe); else out.mrows.push({ k: 'Fe', t: comma(fe), src: NUTR_DEF.Fe[1] });
  const d = fitDose({ rows: out.rows, n: +n || 7, bottle, V, d0: ctx.dose, custom: ctx.custom, prodOf: ctx.prodOf });
  if (d !== ctx.dose) out.dose = comma(d);
  return out;
}

/* ---------- Makro i Mikro: cel tygodniowy → gramy do butelki ----------
   wynik: { empty } albo { plan, items, prodItems, sol, fx, p (mg/l na jedną dawkę), mlIn (ml płynnych preparatów w butelce) } */
function makro({ rows, V, bottle, dose, n, custom = [], prodOf = () => null, edta = '' }) {
  const plan = X.planBottle({ rows, V, bottle, dose, n, custom, prodOf, edta }), { items, prodItems } = plan;
  if (!items.length && !prodItems.length) return { plan, items, prodItems, empty: true };
  const sol = X.solution(items, bottle, custom), fx = X.solFix(sol.rows);
  for (const { prod, a } of prodItems) for (const k in prod.ppm) if (prod.ppm[k] > 0) sol.conc[k] = (sol.conc[k] || 0) + prod.ppm[k] * a / bottle;
  const mlIn = prodItems.filter(i => i.prod.unit !== 'g').reduce((s1, i) => s1 + i.a, 0);
  const p = X.doseToPpm(sol.conc, dose, V);
  return { plan, items, prodItems, sol, fx, p, mlIn };
}

/* ---------- Sprawdź butelkę: gramy soli → mg/l na dawkę ---------- */
function sprawdz({ items, bottle, dose, V, custom = [] }) {
  const used = items.filter(i => i.g > 0), sol = X.solution(items, bottle, custom), fx = X.solFix(sol.rows);
  if (!used.length) return { items: used, sol, fx, empty: true };
  return { items: used, sol, fx, p: X.doseToPpm(sol.conc, dose, V) };
}

/* ---------- gotowy nawóz ---------- */
// płyn dawkowany prosto z opakowania; ppm = g/l produktu; way 'target' (cel tygodniowy el = t) albo 'amount' (dawka ldose ml)
// wynik: { per1 (mg/l z 1 ml), ks, d (ml na dawkę) } albo { err: 'nocomp'|'target'|'dose' }
function produktPlyn({ ppm, V, n, way, el, t, ldose }) {
  if (!ppm || !Object.keys(ppm).length) return { err: 'nocomp' };
  const ks = X.ION_ORDER.filter(k => ppm[k] > 0), per1 = Object.fromEntries(ks.map(k => [k, ppm[k] / V])); // 7.10: bez progu – w dużym akwarium wypadały pierwiastki śladowe
  let d;
  if (way === 'target') { const T = n2(t), c = per1[el]; if (!(T > 0) || !(c > 0)) return { ks, per1, err: 'target' }; d = T / (c * n); }
  else { d = n2(ldose); if (!(d > 0)) return { ks, per1, err: 'dose' }; }
  return { ks, per1, d };
}
// preparat rozrabiany w butelce B ml (proszek w g albo płyn w ml), dawka d ml, n× w tygodniu
// wynik: { A (ilość do butelki), per (mg/l na dawkę), ks } albo { err: 'nocomp'|'target'|'amount' }
function produktButelka({ ppm, V, B, d, n, way, el, t, amt }) {
  if (!ppm || !Object.keys(ppm).length) return { err: 'nocomp' };
  let A;
  if (way === 'target') { const T = n2(t), c = ppm[el]; if (!(T > 0) || !(c > 0)) return { err: 'target' }; A = T * V * B / (c * d * n); }
  else { A = n2(amt); if (!(A > 0)) return { err: 'amount' }; }
  const per = {}; for (const k in ppm) per[k] = ppm[k] * A * d / B / V;
  return { A, per, ks: X.ION_ORDER.filter(k => per[k] > 0.00005) };
}

/* ---------- 7.10: gotowe nawozy – rodzaj, wyszukiwanie, dawka producenta ---------- */
const GOT_KIND = [['macro', tl('Makro (NPK)')], ['multi', tl('Kompletny (NPK + mikro)')], ['k', tl('Potas')], ['fe', tl('Żelazo')], ['micro', tl('Mikro')], ['gh', tl('GH, wapń i magnez')], ['kh', 'KH']];
// rodzaj ze składu (pole kind z bazy tylko dla KH, potasu i żelaza – „multi” bywało nadawane nawozom bez N i P):
// węglany → KH; N/P z żelazem → kompletny, bez żelaza → makro; sam K → potas; samo Fe → żelazo; dużo Ca → GH; reszta mikro
function gotKind(p) {
  const c = (p && p.ppm) || {}, has = k => c[k] > 0;
  if (p && ['k', 'fe', 'kh'].includes(p.kind) && !(p.kind === 'k' && has('HCO3'))) return p.kind;
  if (has('HCO3')) return 'kh';
  // N i P liczą się, gdy jest ich wyraźnie więcej niż mikro (Seachem Flourish ma śladowy N 0,07% – to nawóz mikro, nie NPK)
  const sum = ks => ks.reduce((t, k) => t + (c[k] || 0), 0), np = sum(['NO3', 'PO4', 'NH4']) > 0 && sum(['NO3', 'PO4', 'NH4']) >= 5 * sum(MIC_EL), mic = MIC_EL.some(has);
  if (np) return has('Fe') ? 'multi' : 'macro';
  if (has('Ca') && c.Ca >= 10 * (c.Fe || 0) && c.Ca > 5) return 'gh';
  if (has('K') && !mic) return 'k';
  if (has('Fe') && !MIC_EL.filter(k => k !== 'Fe').some(has) && !has('K')) return 'fe';
  return 'micro';
}
// słowa do wyszukiwania składnika (polskie nazwy i wzory)
const GOT_WORDS = { NO3: tl('azot azotan no3 n'), NH4: tl('amon nh4'), PO4: tl('fosfor fosforan po4 p'), K: tl('potas k kalium'), Mg: tl('magnez mg'), Ca: tl('wapń wapn ca'), Fe: tl('żelazo zelazo fe iron'), Mn: tl('mangan mn'), Zn: tl('cynk zn'), Cu: tl('miedź miedz cu'), B: tl('bor b'), Mo: tl('molibden mo'), HCO3: tl('kh węglany weglany') };
const fold = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
// każde słowo zapytania musi pasować do nazwy, producenta, rodzaju albo składnika
function gotMatch(p, q) {
  const words = fold(q).split(/\s+/).filter(Boolean); if (!words.length) return true;
  const kind = (GOT_KIND.find(x => x[0] === gotKind(p)) || [, ''])[1];
  const hay = fold([p.name, p.producer, kind, ...Object.keys(p.ppm || {}).filter(k => p.ppm[k] > 0).map(k => k + ' ' + (GOT_WORDS[k] || ''))].join(' '));
  return words.every(w => hay.includes(w));
}
// dawka producenta: z bazy (doz) albo z tekstu w moim nawozie („1 ml / 50 l tyg.”, „5 ml na 100 l”)
function gotDoz(p) {
  if (!p) return null;
  if (p.doz && p.doz.ml > 0 && p.doz.perL > 0) return p.doz;
  const m = String(p.dose || '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ml|g)\s*(?:\/|na|per|w)\s*(\d+(?:\.\d+)?)\s*l/i);
  return m ? { ml: +m[1], perL: +m[3], n: /codzien|dzienn/i.test(p.dose) ? 7 : /tydz|tyg/i.test(p.dose) ? 1 : undefined, note: p.dose, own: true } : null;
}
// dawka producenta przeliczona na akwarium V l: ilość na raz = ml × V / perL
const gotScale = (doz, V) => doz && V > 0 ? doz.ml * V / doz.perL : NaN;

/* ---------- podział na butelki ----------
   jedna reguła niezgodności z chem.js (X.compat): Ca z PO₄/węglanami/SO₄ (gips), metale z PO₄ i węglanami, NH₄ + Mg + PO₄ (struwit), Mg z CO₃.
   wynik: { bottles: [{ items, conc }], self } albo null, gdy wszystko mieści się w jednej butelce */
function splitBottles(items, bottle, custom = []) {
  const r = X.compat(items, bottle, custom);
  return r.bottles.length > 1 ? r : null;
}

/* ===== 7.0: funkcje nowych ekranów ===== */
// 7.4: dawkowanie na sucho – sole prosto do akwarium, bez butelki. Wynik: gramy na jedną dawkę (tydzień / n).
// planBottle z butelką 1 ml i dawką 1 ml daje f = 1/n, czyli ilości na jedną dawkę.
function sucho({ rows, V, n, custom = [], prodOf = () => null, edta = '' }) {
  const plan = X.planBottle({ rows, V, bottle: 1, dose: 1, n, custom, prodOf, edta }), { items, prodItems } = plan;
  if (!items.length && !prodItems.length) return { plan, items, prodItems, empty: true };
  const p = {};
  for (const it of items) { const m = X.itemMat(it, custom); if (!m) continue; const q = X.saltToPpm(m, it.hyd || 0, it.purity, it.g, V); for (const k in q) p[k] = (p[k] || 0) + q[k]; }
  for (const { prod, a } of prodItems) for (const k in prod.ppm) if (prod.ppm[k] > 0) p[k] = (p[k] || 0) + prod.ppm[k] * a / V;
  return { plan, items, prodItems, p };
}
// 7.4: typowy tydzień w metodach EI i PPS-Pro (mg/l) – do porównania z wynikiem.
// EI – cele tygodniowe z przepisu; PPS-Pro – z przepisu: makro 1 ml, mikro (29 g CSM+B na 500 ml) 0,5 ml na 40 l codziennie.
function metody() {
  const E = D.DIY.ei, Pp = D.DIY.ppspro, conc = X.solution(Pp.items, Pp.bottle).conc, k = Pp.doseMl / Pp.perLiters * Pp.n, pps = {};
  for (const ion in conc) pps[ion] = conc[ion] * k;
  const csm = PRODS.find(p => p.name === 'Plantex CSM+B');
  if (csm) { const gl = 29 / (Pp.bottle / 1000); const km = Pp.microMl / Pp.perLiters * Pp.n; for (const ion in csm.ppm) pps[ion] = (pps[ion] || 0) + gl * csm.ppm[ion] / 1000 * km; }
  return { EI: { ...E.week, ...E.weekMicro }, 'PPS-Pro': pps };
}
/* ---------- plany dawkowania (Ile dawać) ----------
   Mnożnik zalecenia dla poziomu; EI – stałe cele metody; własne – cele wpisane ręcznie (startują od zalecenia). */
// Z zapasem = czyste EI. Więcej = 1,5 × zalecenie, ale najwyżej w połowie drogi do EI.
// Zalecenia (DANE.START) są niższe od EI, więc zawsze: oszczędnie < zalecane < więcej < z zapasem.
const PLANY = { less: { k: 0.6 }, rec: { k: 1 }, more: { mid: true }, ei: { ei: true }, own: { k: 1 } };
function celePlanu(level, plan) {
  const S = D.START[level], P0 = PLANY[plan] || PLANY.rec;
  const rec = { ...S.week, Fe: S.fe }, E = { ...D.DIY.ei.week, Fe: D.DIY.ei.weekMicro.Fe }, o = {};
  for (const [k, v] of Object.entries(rec)) { const top = Math.max(E[k] || 0, v * 1.2);
    o[k] = +(P0.ei ? top : P0.mid ? Math.min(v * 1.5, (v + top) / 2) : v * P0.k).toPrecision(3); }
  return o;
}
/* ---------- mineralizacja wody RO do podmian ----------
   Cel GH (°dH) z Ca i Mg w stosunku masowym ratio : 1 (domyślnie 3 : 1), KH (°dH) z wodorowęglanu albo węglanu.
   Sole: Ca – CaSO₄·2H₂O / CaCl₂ / Ca(NO₃)₂, Mg – MgSO₄ / MgCl₂ / Mg(NO₃)₂, KH – KHCO₃ / NaHCO₃ / K₂CO₃.
   Każda sól liczy się raz (solver X.correct widzi wszystkie jony każdej soli, więc nic nie jest naliczane podwójnie).
   Wynik: stężenia w wodzie (mg/l – nie zależą od objętości), gramy na 10 l, na L litrów (L) i na jedną podmianę (V × change). */
const MIN_SRC = { Ca: ['CaSO4', 'CaCl2', 'CaNO32'], Mg: ['MgSO4', 'MgCl2', 'MgNO32'], HCO3: ['KHCO3', 'NaHCO3', 'K2CO3'] };
// fertWeek (7.11): ile Ca i Mg nawóz dodaje w tygodniu (mg/l). Przy podmianie części wody co tydzień (change) w akwarium
// ustala się ok. fertWeek / change ponad poziom wody do podmian (bez zużycia przez rośliny). Tyle odejmujemy od celu wody,
// żeby GH i proporcja Ca : Mg zgadzały się dla sumy: woda + nawóz.
function mineralizacja({ GH = 6, KH = 3, ratio = 3, have = [], custom = [], V = 0, change = 0, L = 0, fertWeek = null }) {
  GH = n2(GH) >= 0 ? n2(GH) : 6; KH = n2(KH) >= 0 ? n2(KH) : 3; ratio = n2(ratio) > 0 ? n2(ratio) : 3;
  const Mg0 = GH / (ratio / X.DH.Ca + 1 / X.DH.Mg), Ca0 = ratio * Mg0, HCO3 = KH * X.DH.meq * X.IM.HCO3; // mg/l
  const fz = fertWeek && change > 0 ? { Ca: Math.max(0, n2(fertWeek.Ca) || 0) / change, Mg: Math.max(0, n2(fertWeek.Mg) || 0) / change } : null;
  const Ca = fz ? Math.max(0, Ca0 - fz.Ca) : Ca0, Mg = fz ? Math.max(0, Mg0 - fz.Mg) : Mg0;
  const pick = k => { for (const id of MIN_SRC[k]) { const c = have.find(x => String(x).split('|')[0] === id); if (c) return c; } return null; };
  const target = { Ca, Mg, HCO3 }, src = {}, missing = [];
  for (const k of ['Ca', 'Mg', 'HCO3']) { if (!(target[k] > 0)) continue; const c = pick(k); if (c) src[k] = c; else missing.push(k); }
  // 7.10: K₂CO₃ daje CO₃²⁻, nie HCO₃⁻ – do celu KH liczymy zasadowość w równoważniku HCO₃ (1 CO₃ = 2 HCO₃), wcześniej K₂CO₃ nie podnosił KH w rachunku
  const alk = e => { const o = { ...e }; if (o.CO3) { o.HCO3 = (o.HCO3 || 0) + 2 * o.CO3 * X.IM.HCO3 / X.IM.CO3; delete o.CO3; } return o; };
  const codes = [...new Set(Object.values(src))], sources = codes.map(c => { const [id, h] = c.split('|'); const m = X.mat(id, custom); return { id: c, eff: alk(X.saltToPpm(m, +h || 0, 100, 1, 10)) }; }); // 1 g na 10 l
  const r = X.correct({ current: {}, target, sources, assign: src });
  const items = codes.map(c => { const [id, h] = c.split('|'); return { mat: id, hyd: +h || 0, purity: 100, g: r.amounts[c] }; }).filter(i => i.g > 1e-6);
  // stężenia w wodzie z prawdziwych jonów (CO₃ zostaje CO₃ – derived liczy go do KH podwójnie)
  const per10 = {}; for (const i of items) { const p = X.saltToPpm(X.mat(i.mat, custom), i.hyd, 100, i.g, 10); for (const k in p) per10[k] = (per10[k] || 0) + p[k]; }
  const d = X.derived(per10), liters = V > 0 && change > 0 ? V * change : 0, scale = l => items.map(i => ({ ...i, g: i.g * l / 10 }));
  const notes = [], warn = [];
  if (items.some(i => i.mat === 'CaSO4')) notes.push(tl('Gips (CaSO₄) rozpuszcza się powoli. Wsyp go do całej porcji wody i mieszaj kilka minut – nie rób z niego koncentratu w butelce.'));
  const gyps = items.find(i => i.mat === 'CaSO4'); if (gyps) { const anh = gyps.g / 10 * X.molarMass(X.mat('CaSO4'), 0) / X.molarMass(X.mat('CaSO4'), gyps.hyd); if (anh > 1.2) warn.push(`${tl('Tyle gipsu może się nie rozpuścić (ok. {0} g/l, granica to ok. 2 g/l, a rozpuszcza się bardzo wolno). Weź chlorek wapnia albo obniż GH.', String(+anh.toFixed(1)).replace('.', DEC))}`); } // próg 60% granicy, jak SAFE przy butelkach
  if (per10.NO3 > 0.5) warn.push(`${tl('Saletra wapniowa/magnezowa doda do wody ok. {0} mg/l NO₃ – uwzględnij to w nawożeniu.', String(+per10.NO3.toFixed(1)).replace('.', DEC))}`);
  if (per10.Na > 10) warn.push(`${tl('Soda doda ok. {0} mg/l sodu. Przy wysokim KH lepszy jest wodorowęglan potasu.', String(+per10.Na.toFixed(0)))}`);
  if (missing.includes('Ca') && src.Mg) warn.push(tl('Bez soli wapnia GH będzie tylko z magnezu – za mało, a rośliny i krewetki potrzebują wapnia.'));
  let tank = null;
  if (fz) { const sum = { ...per10, Ca: (per10.Ca || 0) + fz.Ca, Mg: (per10.Mg || 0) + fz.Mg }, ds = X.derived(sum); tank = { Ca: sum.Ca, Mg: sum.Mg, gh: ds.GH, fromFert: fz };
    const f1 = v => String(+v.toFixed(1)).replace('.', DEC);
    if (fz.Mg > Mg0 + 0.05) warn.push(`${tl('Sam nawóz daje w akwarium ok. {0} mg/l Mg, a cel to {1} mg/l. Woda do podmian nie potrzebuje magnezu – zmniejsz Mg w nawozie, jeśli chcesz trzymać proporcję.', f1(fz.Mg), f1(Mg0))}`);
    if (fz.Ca > Ca0 + 0.05) warn.push(`${tl('Sam nawóz daje w akwarium ok. {0} mg/l Ca, więcej niż cel {1} mg/l.', f1(fz.Ca), f1(Ca0))}`); }
  return { GH, KH, ratio, target, src, missing, items, per10, gh: d.GH, kh: d.KH, ...X.ecTds(per10), liters, perChange: liters ? scale(liters) : [], L: L > 0 ? L : 0, forL: L > 0 ? scale(L) : [], notes, warn, tank };
}

/* ===== 7.11: lista zakupów z receptur – bez magazynu =====
   lists: [{ name, items }] – pozycje jak w recepturze: { mat, hyd, g, pct? } albo { fert: { id, name, unit }, g }.
   owned: prosta lista „mam już” – kody 'id|hyd' (sól) albo 'p:id' (gotowy nawóz). Niczego nie odejmuje, tylko oznacza.
   Ta sama sól z kilku receptur jest sumowana (X.shopLines). Mam inną formę uwodnienia – ta sama sól, masa przeliczona (k). */
function zakupy(lists, owned = [], custom = []) {
  const ok = i => i && +i.g > 0, L0 = (lists || []).map(l => ({ name: l.name, items: (l.items || []).filter(ok) }));
  const lines = X.shopLines(L0.map(l => ({ weekly: { items: l.items.filter(i => !i.fert), prods: l.items.filter(i => i.fert).map(i => ({ prod: i.fert, a: +i.g })) } })), 1);
  const own = (owned || []).map(String), same = (l, i) => l.prod ? i.fert && i.fert.id === l.prod.id : !i.fert && i.mat === l.mat && (i.hyd || 0) === l.hyd && (+i.pct || 0) === (+l.pct || 0);
  return lines.map(l => {
    const key = l.prod ? 'p:' + l.prod.id : l.mat + '|' + l.hyd, item = l.prod ? { fert: l.prod } : { mat: l.mat, hyd: l.hyd, ...(l.pct ? { pct: l.pct } : {}) };
    let have = null;
    if (l.prod) have = own.includes(key) ? {} : null;
    else { const o = own.map(splitV).find(x => x.id === l.mat), m = o && X.mat(l.mat, custom);
      if (o) have = !m || m.pct || o.hyd === l.hyd ? {} : { hyd: o.hyd, k: X.molarMass(m, o.hyd) / X.molarMass(m, l.hyd) }; }
    return { key, item, unit: l.unit, q: l.q, from: L0.filter(x => x.items.some(i => same(l, i))).map(x => x.name), have };
  });
}

/* ===== „Zrób nawóz” – prosty kalkulator dla laika =====
   Wejście: akwarium (V, światło, CO₂, podmiana, dawek w tygodniu), suwak „mniej / więcej”, ewentualne ręczne cele,
   co jest w szafce (sole z formą uwodnienia, mieszanki/chelaty), butelka albo na sucho.
   Wynik: zalecane cele, dobrane źródła, butelka A (makro) i B (mikro) z jedną dawką dla obu, co to da w akwarium i zalecenia. */
// poziom nawożenia z warunków: słabe światło bez CO₂ → lekkie, mocne z CO₂ → mocne, reszta → średnie
const poziom = (light, co2) => light === 'low' && !co2 ? 'low' : light === 'high' && co2 ? 'high' : 'mid';
// kolejność wyboru źródła dla składnika (pierwsze, które jest w szafce)
const KR_SRC = { NO3: ['KNO3', 'MgNO32', 'CaNO32', 'NaNO3', 'NH4NO3'], PO4: ['KH2PO4', 'K2HPO4', 'NaH2PO4', 'NH4H2PO4'], K: ['K2SO4', 'KCl', 'KNO3', 'KH2PO4'], Mg: ['MgSO4', 'MgCl2', 'MgNO32'] };
const KR_CHEL = ['FeDTPA', 'FeEDTA', 'FeEDDHA', 'FeGlu'];
// ładne dawki: ok. 6 tygodni z butelki
const NICE = [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const niceDose = (bottle, n) => { const want = bottle / (n * 6); return NICE.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a); };
function kreator(o) {
  const n = o.n > 0 ? o.n : 3, V = o.V, custom = o.custom || [], prodOf = o.prodOf || (() => null), have = o.have || [], f = Math.min(Math.max(o.change || 0, 0), 1);
  const level = o.level || poziom(o.light, o.co2), plan = PLANY[o.plan] ? o.plan : 'rec', base = celePlanu(level, 'rec'), targets = {};
  const planT = celePlanu(level, plan), scale = o.scale > 0 ? o.scale : 1;
  for (const k in base) targets[k] = plan === 'own' && o.manual && o.manual[k] != null && o.manual[k] !== '' && n2(o.manual[k]) >= 0 ? n2(o.manual[k]) : planT[k] * scale;
  const pick = k => { for (const id of KR_SRC[k]) { const c = have.find(x => String(x).split('|')[0] === id); if (c) return c; } return null; };
  const src = {}, missing = [];
  for (const k of ['NO3', 'PO4', 'K', 'Mg']) { if (!(targets[k] > 0)) continue; const c = pick(k); if (c) src[k] = c; else missing.push(k); }
  // K bez osobnego źródła, ale z KNO₃/KH₂PO₄ – liczone przez solver; brak liczymy tylko, gdy nic nie daje K
  const macroRows = Object.keys(src).map(k => ({ k, t: String(targets[k]), src: src[k] }));
  // mikro: mieszanka z szafki > chelat Fe > FeSO₄ z EDTA
  const mix = have.find(x => String(x).startsWith('p:')), chel = KR_CHEL.map(id => have.find(x => String(x).split('|')[0] === id)).find(Boolean), feso4 = have.find(x => String(x).startsWith('FeSO4|'));
  const edtaOk = have.some(x => /^Na[24]EDTA\|/.test(x));
  let microRow = null, edta = '';
  if (targets.Fe > 0) {
    if (mix) microRow = { k: 'Fe', t: String(targets.Fe), src: mix };
    else if (chel) microRow = { k: 'Fe', t: String(targets.Fe), src: chel, ...(o.pct && o.pct[String(chel).split('|')[0]] ? { pct: o.pct[String(chel).split('|')[0]] } : {}) };
    else if (feso4) { microRow = { k: 'Fe', t: String(targets.Fe), src: feso4 }; edta = edtaOk ? have.find(x => /^Na[24]EDTA\|/.test(x)).split('|')[0] : ''; }
    else missing.push('Fe');
  }
  const how = o.how === 'dry' ? 'dry' : 'bottle', bottle = o.bottle > 0 ? o.bottle : 500;
  let dose = o.dose > 0 ? o.dose : niceDose(bottle, n), A = null, B = null, p = {};
  if (how === 'bottle') {
    if (!(o.dose > 0) && macroRows.length) dose = fitDose({ rows: macroRows, n, bottle, V, d0: dose, custom, prodOf });
    if (macroRows.length) { A = makro({ rows: macroRows, V, bottle, dose, n, custom, prodOf }); if (!A.empty) A.split = splitBottles(A.items, bottle, custom); }
    if (microRow) B = makro({ rows: [microRow], V, bottle, dose, n, custom, prodOf, edta });
  } else {
    if (macroRows.length) A = sucho({ rows: macroRows, V, n, custom, prodOf });
    if (microRow) B = sucho({ rows: [microRow], V, n, custom, prodOf, edta });
  }
  for (const R of [A, B]) if (R && !R.empty) for (const k in R.p) p[k] = (p[k] || 0) + R.p[k];
  const week = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v * n]));
  // co to da: tydzień na tle celu z wybranego planu (rec – zalecenie dla światła i CO₂, do porównania)
  const effect = ['NO3', 'PO4', 'K', 'Mg', 'Fe'].filter(k => week[k] > 0.00005 || targets[k] > 0).map(k => {
    const v = week[k] || 0, t = targets[k] || 0, st = !(t > 0) ? (v > 0 ? 'high' : '') : v < t * 0.75 ? 'low' : v > t * 1.34 ? 'high' : 'ok';
    return { k, week: v, rec: base[k], target: t, st };
  });
  // woda RO: mineralizacja wody do podmian (GH, KH) z soli z szafki
  const water = ['ro', 'mix', 'tap'].includes(o.water) ? o.water : null, mineral = water && water !== 'tap' ? mineralizacja({ GH: o.GH, KH: o.KH, have, custom, V, change: f }) : null; // 7.10: mineralizacja to osobne narzędzie; tu tylko na żądanie (wsteczna zgodność)
  // zalecenia
  const tips = [], shrimp = !!o.shrimp;
  tips.push(tl('Przez pierwsze 2–3 tygodnie testuj NO₃ i PO₄ raz w tygodniu, zawsze przed podmianą. Jeśli wyniki rosną z tygodnia na tydzień, wybierz plan Oszczędnie. Jeśli NO₃ spada do zera, a nowe liście są blade – plan Więcej.'));
  if (level === 'low') tips.push(tl('Przy słabym świetle bez CO₂ rośliny rosną wolno i pobierają mało składników. Nadmiar sprzyja glonom, dlatego lepiej zacząć od niższej dawki.'));
  if (level === 'high') tips.push(tl('Przy mocnym świetle z CO₂ rośliny pobierają dużo składników. Pilnuj stałej dawki CO₂ przez cały okres świecenia – jego wahania przy mocnym świetle sprzyjają glonom.'));
  if (water === 'ro') tips.push(tl('Woda RO nie zawiera wapnia, magnezu ani węglanów. Każdą porcję do podmiany zmineralizuj (Mineralizacja wody), inaczej GH i KH spadną do zera.'));
  if (water === 'mix') tips.push(tl('Mieszasz RO z kranówką. Mineralizacja jest liczona dla samej wody RO – jeśli dolewasz dużo kranówki, możesz dać mniej soli. Sprawdź GH i KH testem po podmianie.'));
  if (water === 'tap') tips.push(tl('Kranówka zwykle ma dość wapnia i węglanów. Jeśli test pokazuje GH poniżej 4 °dH, wybierz wyżej „RO z kranówką” – pojawi się obliczenie, czym podnieść twardość.'));
  if (f > 0 && f < 0.2) tips.push(`${tl('Podmiana {0}% wody tygodniowo. Przy małych podmianach narastają składniki, których rośliny prawie nie pobierają (siarczany, chlorki, sód) – podmieniaj co najmniej 20–30% albo zmniejsz dawkę.', Math.round(f * 100))}`);
  if (f === 0) tips.push(tl('Bez podmian sole nawozowe narastają w wodzie. Przy regularnym nawożeniu podmieniaj co tydzień 20–50% wody.'));
  if (how === 'bottle') tips.push(tl('Nie mieszaj butelek ze sobą przed dawkowaniem – fosforan z makro wytrąca żelazo z mikro. Dawkuj je osobno, najlepiej o różnych porach.'));
  tips.push(tl('Makro rozpuść w ciepłej wodzie, mikro w wodzie RO lub destylowanej. Roztwór mikro przechowuj w ciemnym miejscu.'));
  if ((week.NH4 || 0) > 0.05) tips.push(`${tl('Saletra amonowa i fosforan monoamonowy (MAP) zawierają amon: ok. {0} mg/l NH₄ tygodniowo. {1}', String(+(week.NH4).toFixed(2)).replace('.', DEC), week.NH4 > 1 ? tl('To dużo przy rybach i krewetkach – wybierz inne źródło azotu lub fosforu.') : tl('Taka ilość jest zwykle szybko pobierana przez rośliny; nie zwiększaj jej.'))}`);
  if (shrimp) tips.push((week.Cu || 0) > 0.01 ? tl('W zbiorniku z krewetkami miedź przekracza 0,01 mg/l tygodniowo. Zmniejsz dawkę mikro albo wybierz mieszankę z mniejszą zawartością Cu.') : tl('Mieszanki mikro zawierają miedź. Przy tej dawce jej ilość jest niska, ale w zbiorniku z krewetkami nie zwiększaj dawki mikro bez potrzeby.'));
  if (missing.length) tips.unshift(`${tl('Brakuje źródła dla: {0}. {1}{2}', missing.map(k => (X.ION[k] || {}).l || k).join(', '), missing.includes('Fe') ? tl('Na mikro wystarczy np. CSM+B albo chelat żelaza (Fe-DTPA). ') : '', missing.some(k => k !== 'Fe') ? tl('Zaznacz w kroku 3 sól, która go zawiera – pojawi się na liście potrzebnych zakupów.') : '')}`.trim());
  return { level, plan, scale, targets, base, water, mineral, src, microRow, edta, missing, how, bottle, dose, n, A, B, p, week, effect, tips };
}

// C8: jak liczony jest azot w produkcie – uwaga do wyniku, gdy forma azotu jest przybliżona
// p.nNote: 'total' – producent podaje tylko N całkowity (liczony jako NO₃); 'urea' – mocznik liczony jako NH₄; etykieta z N_amid – jak 'urea'
function nNotes(p) {
  if (!p) return [];
  const out = [], urea = p.nNote === 'urea' || n2((p.pct || {}).N_amid) > 0;
  if (p.nNote === 'total') out.push(tl('Producent podaje tylko azot całkowity – cały liczony jako NO₃. Część to amon: rzeczywisty NO₃ będzie niższy, a NH₄ wyższy.'));
  if (urea) out.push(tl('Azot mocznikowy liczony jako NH₄ – mocznik rozkłada się w akwarium do amonu.'));
  return out;
}

const fmtIn = v => { if (!isFinite(v)) return ''; const r = +v.toPrecision(5); return String(r).replace('.', DEC); };
// cele w wierszach na dawkę albo na tydzień → zawsze tygodniowe (tak liczy planBottle)
function weekRows(rows, per, n) {
  if (per !== 'dose') return rows;
  return rows.map(r => { const v = n2(r.t); return v >= 0 && String(r.t).trim() !== '' ? { ...r, t: String(v * n) } : r; });
}
// przełącznik „na dawkę / na tydzień”: przelicza wpisane wartości tak, żeby wynik się nie zmienił
function convertPer(rows, from, to, n) {
  if (from === to || !(n > 0)) return rows.map(r => ({ ...r }));
  return rows.map(r => { const v = n2(r.t); return v >= 0 && String(r.t).trim() !== '' ? { ...r, t: fmtIn(to === 'dose' ? v / n : v * n) } : { ...r }; });
}
// mg/l w akwarium z jednej dawki – osobno dla każdej pozycji butelki (sól albo gotowy produkt)
function daje(it, { bottle, dose, V, custom = [] }) {
  if (!(bottle > 0 && V > 0)) return {};
  if (it.prod) { const o = {}; for (const k in it.prod.ppm) if (it.prod.ppm[k] > 0) o[k] = it.prod.ppm[k] * it.a / bottle * dose / V; return o; }
  const m = X.itemMat(it, custom); if (!m) return {};
  const inBottle = X.saltToPpm(m, it.hyd || 0, it.purity, it.g, bottle / 1000), o = {}; // mg/l w butelce
  for (const k in inBottle) o[k] = inBottle[k] / 1000 * dose / V;
  return o;
}
// masa pierwiastka (g) w odważonej soli – do kolumny „pierwiastek” w Mikro
function elementMass(it, custom = []) {
  const m = X.itemMat(it, custom); if (!m) return {};
  const f = X.fractions(m, it.hyd || 0), p = X.purityF(it.purity), o = {};
  for (const k of ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co']) if (f[k] > 0) o[k] = it.g * f[k] * p;
  return o;
}
// roztwór pośredni dla mas trudnych do odważenia (< 0,05 g): 1 g soli w W ml wody, z niego odmierz takeMl
function posredni(g, limit = 0.05) {
  if (!(g > 0) || g >= limit) return null;
  for (const W of [100, 250, 500, 1000]) { const takeMl = g * W; if (takeMl >= 1) return { stockG: 1, waterMl: W, takeMl }; }
  return { stockG: 1, waterMl: 1000, takeMl: g * 1000, twoStep: true }; // < 1 ml nawet z 1 l – potrzebne dwa rozcieńczenia
}
// porównanie gotowych nawozów przy tej samej dawce (ml/g) albo tym samym celu jednego składnika
// o: { mode: 'dose'|'target', amount, el, t (na dawkę), n, V } → [{ prod, amount, perDose, week, err? }]
function porownaj(prods, o) {
  return prods.map(prod => {
    const ppm = prod.ppm || {}; let amount = n2(o.amount);
    if (o.mode === 'target') { const c = ppm[o.el]; if (!(c > 0)) return { prod, err: 'noel' }; amount = n2(o.t) * o.V / c; }
    if (!(amount > 0)) return { prod, err: 'amount' };
    const perDose = {}; for (const k in ppm) if (ppm[k] > 0) perDose[k] = ppm[k] * amount / o.V;
    return { prod, amount, perDose, week: Object.fromEntries(Object.entries(perDose).map(([k, v]) => [k, v * o.n])) };
  });
}
// receptura w gramach (przepis albo moja) przeliczona na butelkę i akwarium
// wynik: { items (gramy do butelki), sol, fx, p (mg/l na dawkę), split (podział X.compat albo null), doses, days }
function recepturaGram(items, srcVol, { bottle, dose, n, V, custom = [] }) {
  const k = bottle / srcVol, scaled = items.filter(i => i.g > 0).map(i => ({ ...i, g: i.g * k }));
  const sol = X.solution(scaled, bottle, custom), fx = X.solFix(sol.rows), p = X.doseToPpm(sol.conc, dose, V), c = X.compat(scaled, bottle, custom);
  return { items: scaled, sol, fx, p, split: c.bottles.length > 1 ? c : null, doses: bottle / dose, days: bottle / dose / n * 7 };
}
// źródło w Mikro: koncentrat mikro (mieszanka albo chelat, proszek lub płyn) – reguła z 6.11
const MIC_EL = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co'], MAC_EL = ['NO3', 'NH4', 'PO4', 'K', 'Mg', 'Ca'];
function isMicroSource(p) {
  if (!p || !p.ppm) return false;
  const m = MIC_EL.reduce((s1, e) => s1 + (p.ppm[e] || 0), 0), M = MAC_EL.reduce((s1, e) => s1 + (p.ppm[e] || 0), 0);
  return (p.source !== 'builtin' && p.source !== 'recipe' && ['micro', 'fe'].includes(p.kind)) || (m >= 20 && M <= 0.6 * m);
}
// ogrodnicza mieszanka lub chelat do rozrabiania (proszek) – tylko w Mikro, nie w Gotowych nawozach.
// Płynne nawozy mikro (np. Intermag Mikro Plus) dawkuje się prosto z butelki – są w obu miejscach.
const isMicroConc = p => !!p && p.unit === 'g' && isMicroSource(p);

return { MIN_SRC, GOT_KIND, gotKind, gotMatch, gotDoz, gotScale, n2, splitV, LABEL, labelConc, pmddItems, pmddAcid, NUTR_DEF, fitDose, preset, makro, sprawdz, produktPlyn, produktButelka, splitBottles, fmtIn, weekRows, convertPer, daje, elementMass, posredni, porownaj, recepturaGram, isMicroConc, isMicroSource, MIC_EL, MAC_EL, nNotes, sucho, metody, poziom, kreator, niceDose, KR_SRC, PLANY, celePlanu, mineralizacja, zakupy };
})();
if (typeof module !== 'undefined') module.exports = LICZ;

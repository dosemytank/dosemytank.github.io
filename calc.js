if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
// Silnik obliczeń – czysta logika (działa w przeglądarce i w Node do testów).
const MM = { K:39.098, Na:22.990, Mg:24.305, Ca:40.078, NH4:18.039, N:14.007, Cl:35.45, NO3:62.005, SO4:96.06,
  PO4:94.971, HCO3:61.017, CO3:60.009, Fe:55.845, Mn:54.938, Cu:63.546, Zn:65.38, Co:58.933, B:10.81, Mo:95.95, P:30.974,
  CaO:56.077, MgO:40.304, K2O:94.196, P2O5:141.945 };
const IONS = ['K','Na','NH4','Mg','Ca','NO3','PO4','Cl','SO4','HCO3','CO3'];
const ION_LABEL = { K:'K', Na:'Na', NH4:'NH₄', Mg:'Mg', Ca:'Ca', NO3:'NO₃', PO4:'PO₄', Cl:'Cl', SO4:'SO₄', HCO3:'HCO₃', CO3:'CO₃',
  Fe:'Fe', Mn:'Mn', Cu:'Cu', Zn:'Zn', Co:'Co', B:'B', Mo:'Mo' };

// M = masa molowa soli (g/mol); ions = liczba jonów w cząsteczce; sol20 = rozpuszczalność g/100 ml wody w 20°C (dane literaturowe);
// maxGL = rekomendowane maksimum w koncentracie g/l (bezpieczny zapas poniżej rozpuszczalności).
const SALTS = {
  KNO3:   { name:tl('Azotan potasu'), f:'KNO₃', M:101.103, ions:{K:1,NO3:1}, sol20:31.6, maxGL:279 },
  K2SO4:  { name:tl('Siarczan potasu'), f:'K₂SO₄', M:174.259, ions:{K:2,SO4:1}, sol20:11.11, maxGL:108 },
  KCl:    { name:tl('Chlorek potasu'), f:'KCl', M:74.551, ions:{K:1,Cl:1}, sol20:31.0, maxGL:279 },
  KH2PO4: { name:tl('Fosforan jednopotasowy'), f:'KH₂PO₄', M:136.086, ions:{K:1,PO4:1}, sol20:22.6, maxGL:154 },
  KHCO3:  { name:tl('Wodorowęglan potasu'), f:'KHCO₃', M:100.115, ions:{K:1,HCO3:1}, sol20:33.3, maxGL:107 },
  K2CO3:  { name:tl('Węglan potasu'), f:'K₂CO₃', M:138.205, ions:{K:2,CO3:1}, sol20:110, maxGL:770 },
  NH4NO3: { name:tl('Azotan amonu'), f:'NH₄NO₃', M:80.043, ions:{NH4:1,NO3:1}, sol20:192, maxGL:217 },
  MGSO4_7:{ name:tl('Siarczan magnezu (7 H₂O)'), f:'MgSO₄·7H₂O', M:246.475, ions:{Mg:1,SO4:1}, sol20:105.5, maxGL:690 },
  MGSO4:  { name:tl('Siarczan magnezu (bezwodny)'), f:'MgSO₄', M:120.366, ions:{Mg:1,SO4:1}, sol20:33.5, maxGL:337 },
  MGCL2:  { name:tl('Chlorek magnezu (6 H₂O)'), f:'MgCl₂·6H₂O', M:203.30, ions:{Mg:1,Cl:2}, sol20:null, maxGL:null },
  CASO4:  { name:tl('Siarczan wapnia (gips, 2 H₂O)'), f:'CaSO₄·2H₂O', M:172.17, ions:{Ca:1,SO4:1}, sol20:0.24, maxGL:2 },
  CACL2:  { name:tl('Chlorek wapnia (2 H₂O)'), f:'CaCl₂·2H₂O', M:147.01, ions:{Ca:1,Cl:2}, sol20:null, maxGL:null },
  CANO3:  { name:tl('Azotan wapnia (4 H₂O)'), f:'Ca(NO₃)₂·4H₂O', M:236.15, ions:{Ca:1,NO3:2}, sol20:null, maxGL:null },
  NAHCO3: { name:tl('Wodorowęglan sodu (soda)'), f:'NaHCO₃', M:84.007, ions:{Na:1,HCO3:1}, sol20:9.6, maxGL:77 },
  NACL:   { name:tl('Chlorek sodu'), f:'NaCl', M:58.443, ions:{Na:1,Cl:1}, sol20:35.9, maxGL:null },
};
const fracOf = (saltId, ion) => { const s = SALTS[saltId]; return ((s.ions[ion] || 0) * MM[ion]) / s.M; };

// Orientacyjne dawki tygodniowe (mg/l) – akwaria roślinne.
const RANGES = {
  K:[5,30], Mg:[5,20], NO3:[5,20], PO4:[0.5,2.5], NH4:[0,1], Fe:[0.1,0.8],
  Mn:[0,0.05], Zn:[0,0.05], Cu:[0,0.02], Mo:[0,0.05], B:[0,0.02], Co:[0,0.01],
};
const TWARDOSC = { dHCaO: 10, // 1°dH = 10 mg/l CaO
  meqPerDH: 10 / (MM.CaO / 2), // mval/l na 1°dH
  HCO3perDH: (10 / (MM.CaO / 2)) * MM.HCO3,
  CO3perDH: (10 / (MM.CaO / 2)) * MM.CO3 / 2,
  CaPerDH: 10 * MM.Ca / MM.CaO, MgPerDH: 10 * MM.Mg / MM.CaO };
// Uwaga: 1°dH = 10 mg/l CaO → Ca 7.147 mg/l, Mg 4.335 mg/l, HCO3 21.76 mg/l.


/* ---------- Mieszanki soli: gramy → jony ---------- */
function mixToIons(V, grams) {
  const ppm = {}; IONS.forEach(i => ppm[i] = 0);
  for (const id in grams) {
    const g = grams[id] || 0; if (!g) continue;
    for (const ion in SALTS[id].ions) ppm[ion] += g * fracOf(id, ion) * 1000 / V;
  }
  const dGH = ppm.Ca / TWARDOSC.CaPerDH + ppm.Mg / TWARDOSC.MgPerDH;
  const dKH = ppm.HCO3 / TWARDOSC.HCO3perDH + ppm.CO3 / TWARDOSC.CO3perDH;
  return { ppm, dGH, dKH };
}

/* ---------- MAKRO: cel tygodniowy → gramy ---------- */
function makroSolve(o) {
  // o: V, bottle, dose, n, t{K,NO3,PO4,Mg}, ksrc, mgsrc
  const { V, bottle, dose, n, t } = o;
  const warnings = [];
  const wk = {};
  wk.KNO3 = t.NO3 * V / 1000 / fracOf('KNO3', 'NO3');
  wk.KH2PO4 = t.PO4 * V / 1000 / fracOf('KH2PO4', 'PO4');
  const kNP = wk.KNO3 * fracOf('KNO3', 'K') + wk.KH2PO4 * fracOf('KH2PO4', 'K');
  const kRest = t.K * V / 1000 - kNP;
  wk[o.ksrc] = kRest > 0 ? kRest / fracOf(o.ksrc, 'K') : 0;
  if (kRest < -1e-9) warnings.push(`${tl('Potas z KNO₃ i KH₂PO₄ ({0} mg/l) przekracza cel K – dodatkowego źródła potasu nie trzeba.', (kNP * 1000 / V).toFixed(1))}`);
  wk[o.mgsrc] = t.Mg * V / 1000 / fracOf(o.mgsrc, 'Mg');
  const f = bottle / (dose * n);          // ile tygodniowych porcji mieści się w butelce
  const bt = {}; for (const k in wk) bt[k] = wk[k] * f;
  return { weekly: wk, bottle: bt, factor: f, days: f * 7, warnings };
}
// stężenia od gramów z butelki (dawka jednorazowa / tygodniowa)
function bottleToPpm(V, gramsBottle, bottle, dose, n) {
  const perDose = mixToIons(V, Object.fromEntries(Object.entries(gramsBottle).map(([k, g]) => [k, g * dose / bottle])));
  const week = {}; IONS.forEach(i => week[i] = perDose.ppm[i] * n);
  return { dose: perDose.ppm, week, dGHweek: perDose.dGH * n, dKHweek: perDose.dKH * n };
}
// kontrola rozpuszczalności: g/l w butelce vs limit
function solCheck(gramsBottle, bottle) {
  const rows = [];
  for (const id in gramsBottle) {
    const g = gramsBottle[id]; if (!(g > 0)) continue;
    const gl = g / (bottle / 1000), s = SALTS[id];
    const lim = s.maxGL || (s.sol20 ? s.sol20 * 10 * 0.8 : null);
    rows.push({ id, gl, lim, ratio: lim ? gl / lim : null, sol: s.sol20 ? s.sol20 * 10 : null });
  }
  return rows;
}

/* ---------- MIKRO / PMDD ---------- */
const MICRO_SALTS = {
  FeSO4:  { name:tl('Siarczan żelazawy'), f:'FeSO₄·7H₂O', M:278.01, el:'Fe', n:1, edta:true },
  MnSO4:  { name:tl('Siarczan manganu'), f:'MnSO₄·H₂O', M:169.02, el:'Mn', n:1, edta:true },
  CuSO4:  { name:tl('Siarczan miedzi'), f:'CuSO₄·5H₂O', M:249.68, el:'Cu', n:1, edta:true },
  ZnSO4:  { name:tl('Siarczan cynku'), f:'ZnSO₄·7H₂O', M:287.55, el:'Zn', n:1, edta:true },
  CoSO4:  { name:tl('Siarczan kobaltu'), f:'CoSO₄·7H₂O', M:281.10, el:'Co', n:1, edta:true },
  H3BO3:  { name:tl('Kwas borowy'), f:'H₃BO₃', M:61.83, el:'B', n:1, edta:false },
  MOLIB:  { name:tl('Molibdenian amonu'), f:'(NH₄)₂Mo₄O₁₃·2H₂O', M:663.9, el:'Mo', n:4, edta:false },
};

/* ---------- Nawozy ogrodnicze (skład z etykiety) ---------- */
const GARDEN_CONV = { // mnożnik: forma podana → forma akwarystyczna
  N_NH4: MM.NH4 / MM.N, N_amid: MM.NH4 / MM.N, N_NO3: MM.NO3 / MM.N,
  K: 1, K2O: 2 * MM.K / MM.K2O, P: MM.PO4 / MM.P, PO4: 1, P2O5: 2 * MM.PO4 / MM.P2O5,
  Mg: 1, MgO: MM.Mg / MM.MgO, Ca: 1, CaO: MM.Ca / MM.CaO };
function gardenPpm(V, gPerL, mlConcPerDose, n) {
  // gPerL: {N_NH4,N_amid,N_NO3,K,K2O,P,PO4,P2O5,Mg,MgO,Ca,CaO,Fe,Mn,Zn,Cu,Mo,B}
  const gl = { NH4:0, NO3:0, K:0, PO4:0, Mg:0, Ca:0, Fe:0, Mn:0, Zn:0, Cu:0, Mo:0, B:0 };
  const c = GARDEN_CONV;
  gl.NH4 = (gPerL.N_NH4 || 0) * c.N_NH4 + (gPerL.N_amid || 0) * c.N_amid;
  gl.NO3 = (gPerL.N_NO3 || 0) * c.N_NO3;
  gl.K = (gPerL.K || 0) + (gPerL.K2O || 0) * c.K2O;
  gl.PO4 = (gPerL.P || 0) * c.P + (gPerL.PO4 || 0) + (gPerL.P2O5 || 0) * c.P2O5;
  gl.Mg = (gPerL.Mg || 0) + (gPerL.MgO || 0) * c.MgO;
  gl.Ca = (gPerL.Ca || 0) + (gPerL.CaO || 0) * c.CaO;
  for (const e of ['Fe','Mn','Zn','Cu','Mo','B']) gl[e] = gPerL[e] || 0;
  const dose = {}, week = {};
  for (const e in gl) { dose[e] = gl[e] * mlConcPerDose / V; week[e] = dose[e] * n; } // g/l × ml / l = mg/l
  const nAsNO3 = (week.NO3 || 0) + (week.NH4 || 0) * (MM.NO3 / MM.NH4);
  return { conc: gl, dose, week, nAsNO3 };
}

/* ---------- Kwasy / KH / CO2 ---------- */
const co2 = (pH, kh) => 3 * kh * Math.pow(10, 7 - pH);
// CO₂ z pH i KH to wyliczenie, nie pomiar: pasmo przy dokładności testów kropelkowych (pH ±0,1, KH ±0,5 °dH)
const co2Range = (pH, kh, dpH = 0.1, dkh = 0.5) => [co2(pH + dpH, Math.max(kh - dkh, 0)), co2(pH - dpH, kh + dkh)];
const phForCo2 = (target, kh) => 7 + Math.log10(3 * kh / target);
const ACIDS = {
  HCl:  { name:tl('Kwas solny HCl'), Meq:36.461, def:10, dens:[[0,0.998],[5,1.023],[10,1.0474],[20,1.098],[30,1.1493],[36,1.179]] },
  H2SO4:{ name:tl('Kwas siarkowy H₂SO₄'), Meq:49.04, def:25, dens:[[0,0.998],[5,1.0318],[10,1.0661],[20,1.1394],[30,1.2185],[50,1.3951],[70,1.6105],[98,1.8361]] },
  HNO3: { name:tl('Kwas azotowy HNO₃'), Meq:63.01, def:10, dens:[[0,0.998],[5,1.0256],[10,1.0543],[20,1.115],[30,1.18],[50,1.31],[65,1.3913]] },
  H3PO4:{ name:tl('Kwas ortofosforowy H₃PO₄'), Meq:97.99, def:10, dens:[[0,0.998],[5,1.0257],[10,1.0532],[20,1.1134],[30,1.1795],[50,1.3351],[75,1.574],[85,1.685]] },
  AcOH: { name:tl('Kwas octowy (ocet)'), Meq:60.05, def:10, dens:[[0,0.998],[5,1.0055],[10,1.0125],[20,1.0263],[50,1.0575],[80,1.07],[100,1.0498]] },
};
function density(acid, pct) {
  const t = ACIDS[acid].dens;
  if (pct <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (pct <= t[i][0]) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (pct - x0) / (x1 - x0);
  }
  return t[t.length - 1][1];
}
function acidForKH(o) { // o: V, khFrom, khTo, acid, pct, pH
  const d = Math.max(o.khFrom - o.khTo, 0);
  const mmol = d * TWARDOSC.meqPerDH * o.V;          // mmol H+
  // H₃PO₄: przy pH 6–7,5 drugi proton (pKa₂ ≈ 7,21) częściowo też reaguje z HCO₃⁻ – liczymy ułamek wg pH końcowego.
  const pHest = o.pH ? 7 + Math.log10(3 * o.khTo / (co2(o.pH, o.khFrom) + d * TWARDOSC.meqPerDH * 44.01)) : 6.8;
  const protons = o.acid === 'H3PO4' ? 1 + 1 / (1 + Math.pow(10, 7.21 - pHest)) : 1;
  const gPure = mmol * ACIDS[o.acid].Meq / protons / 1000;
  const rho = density(o.acid, o.pct);
  const ml = gPure / (o.pct / 100) / rho;
  const co2add = d * TWARDOSC.meqPerDH * 44.01;       // mg/l CO2 (1 mmol HCO3⁻ → 1 mmol CO2)
  let pHafter = null, dpH = null;
  if (o.pH) {
    const c0 = co2(o.pH, o.khFrom), c1 = c0 + co2add;
    pHafter = 7 + Math.log10(3 * o.khTo / c1); dpH = pHafter - o.pH;
  }
  return { d, mmol, gPure, ml, rho, co2add, pHafter, dpH, protons, co2before: o.pH ? co2(o.pH, o.khFrom) : null };
}
function dilute(o) { // o: acid, c1, c2, vFinal(ml)
  const rho2 = density(o.acid, o.c2), rho1 = density(o.acid, o.c1);
  const mFinal = o.vFinal * rho2, mStock = mFinal * o.c2 / o.c1;
  return { stockMl: mStock / rho1, waterMl: mFinal - mStock, mFinal };
}

/* ---------- Podmiany i kumulacja ---------- */
function accumulate(o) { // o: p (0-1), c0, cw, add, use, weeks
  const arr = [o.c0];
  let c = o.c0;
  for (let i = 0; i < o.weeks; i++) { c = (c - o.use) * (1 - o.p) + o.p * o.cw + o.add; if (c < 0) c = 0; arr.push(c); }
  const steady = o.p > 0 ? (o.p * o.cw + o.add - (1 - o.p) * o.use) / o.p : NaN;
  return { arr, steady };
}
const waterChangeNeeded = (c0, ct, cw) => (c0 - ct) / (c0 - cw); // ułamek wymiany

/* ---------- Pomiary: miareczkowanie ---------- */
function titrKH(vw, vHCl, cHCl, eW = 0.05, eT = 0.1) {
  const mgl = cHCl * vHCl / 2 * MM.CaO / vw * 1000;       // mg/l CaO (HCl : CaO = 2 : 1)
  const dKH = mgl / TWARDOSC.dHCaO;
  return { dKH, err: dKH * (eW / vw + eT / vHCl) };
}
function titrGH(o) { // vw, vE, cE (mol/l), vwCa, vECa, eW, eT, eWCa
  const { vw, vE, cE, vwCa, vECa } = o;
  const eW = o.eW ?? 0.05, eT = o.eT ?? 0.05, eWCa = o.eWCa ?? 0.01;
  const gh = cE * vE * MM.CaO / vw * 1000 / TWARDOSC.dHCaO;
  const ca = cE * vECa * MM.Ca / vwCa * 1000;
  const mg = (cE * vE / vw - cE * vECa / vwCa) * MM.Mg * 1000;
  const ghErr = gh * (eW / vw + eT / vE);
  const caErr = ca * (eWCa / vwCa + eT / vECa);
  const mgErr = cE * MM.Mg * 1000 * ((vE / vw) * (eW / vw + eT / vE) + (vECa / vwCa) * (eWCa / vwCa + eT / vECa));
  return { gh, ghErr, ca, caErr, mg, mgErr, ghCa: ca / TWARDOSC.CaPerDH, ghMg: mg / TWARDOSC.MgPerDH, ratio: mg > 0 ? ca / mg : null };
}

const C = { MM, IONS, ION_LABEL, SALTS, fracOf, RANGES, TWARDOSC, mixToIons, makroSolve, bottleToPpm, solCheck,
  MICRO_SALTS, GARDEN_CONV, gardenPpm, co2, co2Range, phForCo2, ACIDS,
  density, acidForKH, dilute, accumulate, waterChangeNeeded, titrKH, titrGH };
if (typeof module !== 'undefined') module.exports = C;

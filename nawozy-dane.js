if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Dane kalkulatorów nawozów – JEDNO źródło przepisów, celów startowych i zakresów (7.0, pkt C1 audytu).
   Wszystkie surowce na identyfikatorach chem.js (CHEM.MATERIALS, forma uwodnienia `hyd`); żadnych ręcznie wpisanych mas molowych.
   Działa w przeglądarce i w Node. Ładowany po chem.js, przed clone.js. ===== */
const DANE = (() => {
const X = typeof CHEM !== 'undefined' ? CHEM : require('./chem.js');

/* ---------- przepisy DIY ----------
   PPS-Pro (Edward, aquaticplantcentral): butelka makro 500 ml – K₂SO₄ 29 g, KNO₃ 33 g, KH₂PO₄ 3 g, MgSO₄·7H₂O 20 g;
   mikro – 29 g CSM+B / 500 ml; makro 1 ml, mikro 0,5 ml na 40 l codziennie (8.5.1: mikro za stroną autora, wcześniej 1 ml).
   EI (T. Barr) – typowe cele tygodniowe: NO₃ 20, PO₄ 3, K 30, Mg 10, Fe 0,5 mg/l; 3× w tygodniu, podmiana 50% raz w tygodniu. */
const DIY = {
  ppspro: { name: tl('PPS-Pro (makro)'), bottle: 500, perLiters: 40, doseMl: 1, microMl: 0.5, n: 7,
    items: [{ mat: 'K2SO4', hyd: 0, g: 29 }, { mat: 'KNO3', hyd: 0, g: 33 }, { mat: 'KH2PO4', hyd: 0, g: 3 }, { mat: 'MgSO4', hyd: 7, g: 20 }],
    note: tl('Mikro robisz w osobnej butelce: 29 g CSM+B na 500 ml, dawka 0,5 ml na 40 l dziennie (tak podaje autor metody; starsze opisy mają 1 ml). Podmiana nie jest konieczna, ale zwykle się ją robi.') },
  ei: { name: 'EI – Estimative Index', n: 3, week: { NO3: 20, PO4: 3, K: 30, Mg: 10 }, weekMicro: { Fe: 0.5 },
    note: tl('Przez tydzień dajesz składniki z zapasem, a potem podmieniasz około połowy wody. Mikro (np. CSM+B) dawkujesz w dni bez makro.') },
};
const presetScale = (p, bottle) => p.items.map(i => ({ ...i, g: +(i.g * bottle / p.bottle).toFixed(3) }));

/* ---------- PMDD ----------
   g na 1000 ml koncentratu + 2 ml HCl 36% na końcu (pmddAcid w nawozy-licz.js).
   Oryginalny przepis podaje molibdenian jako (NH₄)₂Mo₄O₁₃·2H₂O (0,06 g/l); w bazie jest AHM (NH₄)₆Mo₇O₂₄·4H₂O –
   przeliczamy z zachowaniem ilości Mo, masę molową formy z przepisu liczymy z wzoru. */
const PMDD_MO_ORIG = { formula: '(NH4)2Mo4O13·2H2O', g: 0.06, mo: 4 };
const PMDD = { vol: 1000, acidHClml: 2, items: [
  { mat: 'KNO3', hyd: 0, g: 12 }, { mat: 'K2SO4', hyd: 0, g: 28 }, { mat: 'MgSO4', hyd: 7, g: 66 }, { mat: 'FeSO4', hyd: 7, g: 6.2712 },
  { mat: 'MnSO4', hyd: 1, g: 1.1 }, { mat: 'ZnSO4', hyd: 7, g: 0.3 }, { mat: 'CuSO4', hyd: 5, g: 0.0707 }, { mat: 'CoSO4', hyd: 7, g: 0.0048 },
  { mat: 'H3BO3', hyd: 0, g: 1.3384 },
  { mat: 'AHM', hyd: 4, g: PMDD_MO_ORIG.g * (PMDD_MO_ORIG.mo * X.AW.Mo / X.parseFormula(PMDD_MO_ORIG.formula).M) / X.fractions(X.MATERIALS.AHM, 4).Mo },
  { mat: 'Na2EDTA', hyd: 2, g: 11.4804 }] };

/* ---------- cele startowe Makro (Lekkie / Średnie / Mocne) ----------
   Orientacyjne cele tygodniowe (mg/l) – wartości do wypełnienia formularza, nie przepisy. */
const START = {
  // 7.8: mniej niż wcześniej. Słabe ≈ ¼ EI, średnie ≈ ½ EI (PPS-Pro z zapasem), mocne ≈ ¾ EI – EI (NO₃ 20, PO₄ 3) zostaje najwyżej.
  low: { name: tl('Lekkie'), tip: tl('słabe światło, bez CO₂'), week: { NO3: 5, PO4: 0.5, K: 5, Mg: 2 }, fe: 0.1 },
  mid: { name: tl('Średnie'), tip: tl('średnie światło'), week: { NO3: 10, PO4: 1, K: 10, Mg: 3 }, fe: 0.2 },
  high: { name: tl('Mocne'), tip: tl('mocne światło i CO₂'), week: { NO3: 15, PO4: 1.5, K: 20, Mg: 5 }, fe: 0.3 },
};

/* ---------- domyślne cele i źródła w wierszach Makro/Mikro ---------- */
const NUTR_DEF = { NH4: ['0,2', 'NH4SO4|0'], NO3: ['10', 'KNO3|0'], PO4: ['1', 'KH2PO4|0'], K: ['15', 'K2SO4|0'], Mg: ['3', 'MgSO4|7'], Ca: ['10', 'CaCl2|2'], Fe: ['0,1', 'FeDTPA|0'],
  Mn: ['', 'MnSO4|1'], Zn: ['', 'ZnSO4|7'], Cu: ['', 'CuSO4|5'], B: ['', 'H3BO3|0'], Mo: ['', 'Na2MoO4|2'], Co: ['', 'CoSO4|7'] };

/* ---------- orientacyjne dawki TYGODNIOWE (mg/l) w akwarium roślinnym ----------
   Tylko informacja przy wyniku; nie są celem ani proporcją narzucaną przez aplikację. (B i Mo – do weryfikacji, pkt C7 audytu) */
const WEEK_RANGE = { NH4: [0, 1], NO3: [5, 20], PO4: [0.5, 2], K: [5, 30], Mg: [5, 20], Fe: [0.1, 0.8], Mn: [0, 0.05], Zn: [0, 0.05], Cu: [0, 0.02], B: [0, 0.02], Mo: [0, 0.05] };

// spójność danych: każdy surowiec i forma uwodnienia istnieje w chem.js
function check() {
  const bad = [], ok = (mat, hyd) => { const m = X.MATERIALS[mat]; return m && (m.pct ? !hyd : m.hyd.includes(hyd)); };
  for (const it of [...DIY.ppspro.items, ...PMDD.items]) if (!ok(it.mat, it.hyd)) bad.push(it.mat + '|' + it.hyd);
  for (const [, src] of Object.values(NUTR_DEF)) { const [m, h] = src.split('|'); if (!ok(m, +h)) bad.push(src); }
  return bad;
}

return { DIY, presetScale, PMDD, PMDD_MO_ORIG, START, NUTR_DEF, WEEK_RANGE, check };
})();
if (typeof module !== 'undefined') module.exports = DANE;

if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Silnik chemii PRO (v4) – czysta logika, działa w przeglądarce i w Node (testy).
   Zasada: masy molowe NIE są wpisywane ręcznie, tylko liczone z mas atomowych (IUPAC 2021, wartości konwencjonalne)
   i składu związku + liczby cząsteczek wody krystalizacyjnej. Dzięki temu każda forma uwodnienia jest liczona tak samo.
   Założenie: 1 mg/l ≈ 1 ppm (woda słodka, gęstość ≈ 1 kg/l). Stężenia „ppm” w aplikacji to mg/l. ===== */

const CHEM = (() => {
// masy atomowe [g/mol]
const AW = { H: 1.008, B: 10.81, C: 12.011, N: 14.007, O: 15.999, Na: 22.990, Mg: 24.305, P: 30.974, S: 32.06, Cl: 35.45,
  K: 39.098, Ca: 40.078, Mn: 54.938, Fe: 55.845, Co: 58.933, Cu: 63.546, Zn: 65.38, Mo: 95.95 };
const H2O = 2 * AW.H + AW.O; // 18.015

// Jony / formy raportowane (tak jak podają testy akwarystyczne). el = skład pierwiastkowy (do masy jonu).
const ION = {
  NO3: { l: 'NO₃', el: { N: 1, O: 3 } }, NH4: { l: 'NH₄', el: { N: 1, H: 4 } }, PO4: { l: 'PO₄', el: { P: 1, O: 4 } },
  K: { l: 'K', el: { K: 1 } }, Mg: { l: 'Mg', el: { Mg: 1 } }, Ca: { l: 'Ca', el: { Ca: 1 } }, Na: { l: 'Na', el: { Na: 1 } },
  SO4: { l: 'SO₄', el: { S: 1, O: 4 } }, Cl: { l: 'Cl', el: { Cl: 1 } }, HCO3: { l: 'HCO₃', el: { H: 1, C: 1, O: 3 } }, CO3: { l: 'CO₃', el: { C: 1, O: 3 } },
  Fe: { l: 'Fe', el: { Fe: 1 } }, Mn: { l: 'Mn', el: { Mn: 1 } }, Cu: { l: 'Cu', el: { Cu: 1 } }, Zn: { l: 'Zn', el: { Zn: 1 } },
  B: { l: 'B', el: { B: 1 } }, Mo: { l: 'Mo', el: { Mo: 1 } }, Co: { l: 'Co', el: { Co: 1 } },
};
const massOf = el => Object.entries(el).reduce((s, [e, n]) => { if (!(e in AW)) throw new Error(tl('Nieznany pierwiastek: {0}', e)); return s + AW[e] * n; }, 0);
const IM = Object.fromEntries(Object.entries(ION).map(([k, v]) => [k, massOf(v.el)])); // masy jonów
const ION_ORDER = ['NO3', 'NH4', 'PO4', 'K', 'Mg', 'Ca', 'Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co', 'Na', 'SO4', 'Cl', 'HCO3', 'CO3'];
const MACRO = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe'];

// Twardość: 1°dH = 10 mg/l CaO
const DH = { Ca: 10 * AW.Ca / (AW.Ca + AW.O), Mg: 10 * AW.Mg / (AW.Ca + AW.O), meq: 10 / ((AW.Ca + AW.O) / 2) };
// pochodne: N całkowity, P, S, zmiana GH i KH (CO₃²⁻ w wodzie akwariowej przechodzi w HCO₃⁻ – 2 mval/mmol)
function derived(ppm) {
  const g = k => ppm[k] || 0;
  return {
    N: g('NO3') * AW.N / IM.NO3 + g('NH4') * AW.N / IM.NH4, P: g('PO4') * AW.P / IM.PO4, S: g('SO4') * AW.S / IM.SO4,
    GH: g('Ca') / DH.Ca + g('Mg') / DH.Mg, KH: (g('HCO3') / IM.HCO3 + 2 * g('CO3') / IM.CO3) / DH.meq,
    NO3eq: g('NO3') + g('NH4') * IM.NO3 / IM.NH4, // azot amonowy wyrażony jako NO₃ (do porównań)
  };
}

/* ---------- przewodność (EC) i TDS z przyrostu jonów ----------
   EC liczona jon po jonie z granicznych przewodności molowych w 25 °C (λ°, S·cm²/mol, tablice CRC); dla roztworów
   rozcieńczonych jak w akwarium to dobre przybliżenie – miernik pokaże zwykle kilka procent mniej.
   Fosforan przy pH akwarium jest głównie jako H₂PO₄⁻ (λ° 36); B (kwas borowy) nie przewodzi. TDS = suma mg/l jonów. */
const LAMBDA = { NO3: 71.4, NH4: 73.5, PO4: 36, K: 73.5, Mg: 106.1, Ca: 119.0, Na: 50.1, SO4: 160.0, Cl: 76.3, HCO3: 44.5, CO3: 138.6,
  Fe: 107, Mn: 107, Zn: 105.6, Cu: 107.2, Co: 110, Mo: 149, B: 0 };
function ecTds(ppm) {
  let ec = 0, tds = 0;
  for (const k in ppm) { const v = ppm[k] || 0; if (!(v > 0) || !IM[k]) continue; tds += v; ec += v / IM[k] * (LAMBDA[k] || 0); }
  return { ec, tds };
}

/* ---------- parser wzorów: KH2PO4, Ca(NO3)2·4H2O, MgSO4.7H2O, (NH4)6Mo7O24*4H2O, CaSO4·0,5H2O ---------- */
function parseFormula(str) {
  const s = String(str || '').replace(/\s+/g, '').replace(/[₀-₉]/g, c => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)));
  if (!s) throw new Error(tl('Pusty wzór'));
  const parts = s.split(/[·.*•]/).filter(Boolean); const total = {}; let water = 0;
  for (let pi = 0; pi < parts.length; pi++) {
    let p = parts[pi], k = 1; const m = p.match(/^(\d+(?:,\d+)?)(?=[A-Z(])/);
    if (m && pi > 0) { k = parseFloat(m[1].replace(',', '.')); p = p.slice(m[1].length); }
    let i = 0;
    const group = () => {
      const out = {};
      while (i < p.length && p[i] !== ')') {
        let sub;
        if (p[i] === '(') { i++; sub = group(); if (p[i] !== ')') throw new Error(tl('Brak nawiasu zamykającego')); i++; }
        else { const em = p.slice(i).match(/^[A-Z][a-z]?/); if (!em) throw new Error(`${tl('Nieoczekiwany znak „{0}”', p[i])}`); if (!(em[0] in AW)) throw new Error(tl('Nieznany pierwiastek: {0}', em[0])); sub = { [em[0]]: 1 }; i += em[0].length; }
        const nm = p.slice(i).match(/^\d+/); const n = nm ? parseInt(nm[0], 10) : 1; if (nm) i += nm[0].length;
        for (const e in sub) out[e] = (out[e] || 0) + sub[e] * n;
      }
      return out;
    };
    const g = group(); if (i < p.length) throw new Error(tl('Nadmiarowy nawias'));
    if (pi > 0 && Object.keys(g).length === 2 && g.H === 2 && g.O === 1) water += k;
    for (const e in g) total[e] = (total[e] || 0) + g[e] * k;
  }
  return { el: total, M: massOf(total), water };
}

/* ---------- baza surowców ----------
   el = skład formy bezwodnej, ions = jony raportowane na cząsteczkę, hyd = dostępne formy uwodnienia (n H₂O), def = domyślna,
   sol = rozpuszczalność ok. 20 °C w g soli BEZWODNEJ na 100 ml wody (orientacyjnie, z tablic; w mieszaninie zwykle mniej).
   pct = surowce opisane zawartością procentową (chelaty) – skład z etykiety. */
const MATERIALS = {
  KNO3: { name: tl('Azotan potasu'), el: { K: 1, N: 1, O: 3 }, ions: { K: 1, NO3: 1 }, hyd: [0], sol: 31.6, grp: 'makro' },
  KH2PO4: { name: tl('Fosforan monopotasowy'), el: { K: 1, H: 2, P: 1, O: 4 }, ions: { K: 1, PO4: 1 }, hyd: [0], sol: 22.6, grp: 'makro' },
  K2SO4: { name: tl('Siarczan potasu'), el: { K: 2, S: 1, O: 4 }, ions: { K: 2, SO4: 1 }, hyd: [0], sol: 11.1, grp: 'makro' },
  MgSO4: { name: tl('Siarczan magnezu'), el: { Mg: 1, S: 1, O: 4 }, ions: { Mg: 1, SO4: 1 }, hyd: [0, 1, 7], def: 7, sol: 35.1, grp: 'makro' },
  CaCl2: { name: tl('Chlorek wapnia'), el: { Ca: 1, Cl: 2 }, ions: { Ca: 1, Cl: 2 }, hyd: [0, 2, 6], def: 2, sol: 74.5, grp: 'makro' },
  CaSO4: { name: tl('Siarczan wapnia'), el: { Ca: 1, S: 1, O: 4 }, ions: { Ca: 1, SO4: 1 }, hyd: [0, 0.5, 2], def: 2, sol: 0.2, grp: 'makro' },
  KCl: { name: tl('Chlorek potasu'), el: { K: 1, Cl: 1 }, ions: { K: 1, Cl: 1 }, hyd: [0], sol: 34.0, grp: 'makro' },
  NH4SO4: { name: tl('Siarczan amonu'), el: { N: 2, H: 8, S: 1, O: 4 }, ions: { NH4: 2, SO4: 1 }, hyd: [0], sol: 74.4, grp: 'makro', f: '(NH₄)₂SO₄' },
  NH4NO3: { name: tl('Azotan amonu'), el: { N: 2, H: 4, O: 3 }, ions: { NH4: 1, NO3: 1 }, hyd: [0], sol: 192, grp: 'makro', f: 'NH₄NO₃' },
  NH4Cl: { name: tl('Chlorek amonu'), el: { N: 1, H: 4, Cl: 1 }, ions: { NH4: 1, Cl: 1 }, hyd: [0], sol: 37.2, grp: 'makro', f: 'NH₄Cl', note: tl('Odczynnik (salmiak) – w sklepach chemicznych. Chlor dodaje Cl⁻.') },
  NH4H2PO4: { name: tl('Fosforan monoamonowy (MAP)'), el: { N: 1, H: 6, P: 1, O: 4 }, ions: { NH4: 1, PO4: 1 }, hyd: [0], sol: 37.4, grp: 'makro', f: 'NH₄H₂PO₄', note: tl('Rozpuszczalny MAP 12-61-0. Nie mieszać w butelce z Ca ani Mg (struwit).') },
  NH42HPO4: { name: tl('Fosforan diamonowy (DAP)'), el: { N: 2, H: 9, P: 1, O: 4 }, ions: { NH4: 2, PO4: 1 }, hyd: [0], sol: 58, grp: 'makro', f: '(NH₄)₂HPO₄', note: tl('Nawozowy DAP bywa zanieczyszczony – wpisz czystość. Odczyn zasadowy.') },
  Urea: { name: tl('Mocznik'), el: { C: 1, H: 4, N: 2, O: 1 }, ions: { NH4: 2 }, hyd: [0], sol: 108, grp: 'makro', f: 'CO(NH₂)₂', note: tl('Liczony jako NH₄ (po rozkładzie w akwarium). Zawartość N 46%.') },
  NaNO3: { name: tl('Azotan sodu (saletra chilijska)'), el: { Na: 1, N: 1, O: 3 }, ions: { Na: 1, NO3: 1 }, hyd: [0], sol: 91.2, grp: 'makro' },
  NaH2PO4: { name: tl('Fosforan jednosodowy'), el: { Na: 1, H: 2, P: 1, O: 4 }, ions: { Na: 1, PO4: 1 }, hyd: [0, 1, 2], def: 2, sol: 87, grp: 'makro' },
  Na2CO3: { name: tl('Węglan sodu (soda kalcynowana)'), el: { Na: 2, C: 1, O: 3 }, ions: { Na: 2, CO3: 1 }, hyd: [0, 1, 10], def: 0, sol: 21.5, grp: 'bufor' },
  K2HPO4: { name: tl('Fosforan dipotasowy'), el: { K: 2, H: 1, P: 1, O: 4 }, ions: { K: 2, PO4: 1 }, hyd: [0, 3], def: 0, sol: 150, grp: 'makro' },
  MgCl2: { name: tl('Chlorek magnezu'), el: { Mg: 1, Cl: 2 }, ions: { Mg: 1, Cl: 2 }, hyd: [0, 6], def: 6, sol: 54.3, grp: 'makro' },
  MgNO32: { name: tl('Azotan magnezu'), el: { Mg: 1, N: 2, O: 6 }, ions: { Mg: 1, NO3: 2 }, hyd: [0, 6], def: 6, sol: 71, grp: 'makro', f: 'Mg(NO₃)₂' },
  CaNO32: { name: tl('Azotan wapnia'), el: { Ca: 1, N: 2, O: 6 }, ions: { Ca: 1, NO3: 2 }, hyd: [0, 4], def: 4, sol: 121, grp: 'makro', f: 'Ca(NO₃)₂' },
  KHCO3: { name: tl('Wodorowęglan potasu'), el: { K: 1, H: 1, C: 1, O: 3 }, ions: { K: 1, HCO3: 1 }, hyd: [0], sol: 33.2, grp: 'bufor' },
  K2CO3: { name: tl('Węglan potasu'), el: { K: 2, C: 1, O: 3 }, ions: { K: 2, CO3: 1 }, hyd: [0, 1.5], def: 0, sol: 110, grp: 'bufor' },
  NaHCO3: { name: tl('Wodorowęglan sodu (soda)'), el: { Na: 1, H: 1, C: 1, O: 3 }, ions: { Na: 1, HCO3: 1 }, hyd: [0], sol: 9.6, grp: 'bufor' },
  NaCl: { name: tl('Chlorek sodu'), el: { Na: 1, Cl: 1 }, ions: { Na: 1, Cl: 1 }, hyd: [0], sol: 35.9, grp: 'inne' },
  FeSO4: { name: tl('Siarczan żelaza(II)'), el: { Fe: 1, S: 1, O: 4 }, ions: { Fe: 1, SO4: 1 }, hyd: [0, 1, 7], def: 7, sol: 25.6, grp: 'mikro' },
  MnSO4: { name: tl('Siarczan manganu'), el: { Mn: 1, S: 1, O: 4 }, ions: { Mn: 1, SO4: 1 }, hyd: [0, 1, 4], def: 1, sol: 52, grp: 'mikro' },
  ZnSO4: { name: tl('Siarczan cynku'), el: { Zn: 1, S: 1, O: 4 }, ions: { Zn: 1, SO4: 1 }, hyd: [0, 1, 7], def: 7, sol: 57.7, grp: 'mikro' },
  CuSO4: { name: tl('Siarczan miedzi'), el: { Cu: 1, S: 1, O: 4 }, ions: { Cu: 1, SO4: 1 }, hyd: [0, 5], def: 5, sol: 20.3, grp: 'mikro' },
  H3BO3: { name: tl('Kwas borowy'), el: { H: 3, B: 1, O: 3 }, ions: { B: 1 }, hyd: [0], sol: 4.7, grp: 'mikro' },
  AHM: { name: tl('Molibdenian amonu'), el: { N: 6, H: 24, Mo: 7, O: 24 }, ions: { NH4: 6, Mo: 7 }, hyd: [0, 4], def: 4, sol: 40, grp: 'mikro', f: '(NH₄)₆Mo₇O₂₄' },
  FeCl3: { name: tl('Chlorek żelaza(III)'), el: { Fe: 1, Cl: 3 }, ions: { Fe: 1, Cl: 3 }, hyd: [0, 6], def: 6, sol: 92, grp: 'mikro' },
  FeCl2: { name: tl('Chlorek żelaza(II)'), el: { Fe: 1, Cl: 2 }, ions: { Fe: 1, Cl: 2 }, hyd: [0, 4], def: 4, sol: 68, grp: 'mikro' },
  FeNO33: { name: tl('Azotan żelaza(III)'), el: { Fe: 1, N: 3, O: 9 }, ions: { Fe: 1, NO3: 3 }, hyd: [0, 9], def: 9, sol: 82, grp: 'mikro', f: 'Fe(NO₃)₃' },
  MnCl2: { name: tl('Chlorek manganu'), el: { Mn: 1, Cl: 2 }, ions: { Mn: 1, Cl: 2 }, hyd: [0, 4], def: 4, sol: 77, grp: 'mikro' },
  MnNO32: { name: tl('Azotan manganu'), el: { Mn: 1, N: 2, O: 6 }, ions: { Mn: 1, NO3: 2 }, hyd: [0, 4], def: 4, sol: 118, grp: 'mikro', f: 'Mn(NO₃)₂' },
  CuCl2: { name: tl('Chlorek miedzi(II)'), el: { Cu: 1, Cl: 2 }, ions: { Cu: 1, Cl: 2 }, hyd: [0, 2], def: 2, sol: 75, grp: 'mikro' },
  CuNO32: { name: tl('Azotan miedzi(II)'), el: { Cu: 1, N: 2, O: 6 }, ions: { Cu: 1, NO3: 2 }, hyd: [0, 2.5, 3], def: 3, sol: 137, grp: 'mikro', f: 'Cu(NO₃)₂' },
  ZnCl2: { name: tl('Chlorek cynku'), el: { Zn: 1, Cl: 2 }, ions: { Zn: 1, Cl: 2 }, hyd: [0], sol: 395, grp: 'mikro' },
  ZnNO32: { name: tl('Azotan cynku'), el: { Zn: 1, N: 2, O: 6 }, ions: { Zn: 1, NO3: 2 }, hyd: [0, 6], def: 6, sol: 120, grp: 'mikro', f: 'Zn(NO₃)₂' },
  CoSO4: { name: tl('Siarczan kobaltu'), el: { Co: 1, S: 1, O: 4 }, ions: { Co: 1, SO4: 1 }, hyd: [0, 1, 7], def: 7, sol: 36, grp: 'mikro' },
  CoCl2: { name: tl('Chlorek kobaltu'), el: { Co: 1, Cl: 2 }, ions: { Co: 1, Cl: 2 }, hyd: [0, 6], def: 6, sol: 53, grp: 'mikro' },
  Borax: { name: tl('Boraks'), el: { Na: 2, B: 4, O: 7 }, ions: { Na: 2, B: 4 }, hyd: [0, 5, 10], def: 10, sol: 5.1, grp: 'mikro', f: 'Na₂B₄O₇' },
  Na2EDTA: { name: tl('EDTA disodowa (do chelatowania)'), el: { C: 10, H: 14, N: 2, Na: 2, O: 8 }, ions: { Na: 2 }, hyd: [0, 2], def: 2, sol: 10, grp: 'inne', f: 'Na₂EDTA' },
  Na4EDTA: { name: tl('EDTA tetrasodowa (do chelatowania)'), el: { C: 10, H: 12, N: 2, Na: 4, O: 8 }, ions: { Na: 4 }, hyd: [0, 2, 4], def: 2, sol: 50, grp: 'inne', f: 'Na₄EDTA' },
  Na2MoO4: { name: tl('Molibdenian sodu'), el: { Na: 2, Mo: 1, O: 4 }, ions: { Na: 2, Mo: 1 }, hyd: [0, 2], def: 2, sol: 84, grp: 'mikro', f: 'Na₂MoO₄' },
  FeGlu: { name: tl('Glukonian żelaza(II)'), el: { C: 12, H: 22, Fe: 1, O: 14 }, ions: { Fe: 1 }, hyd: [0, 2], def: 2, sol: 10, grp: 'chelat', f: tl('Fe-glukonian'), note: tl('Fe²⁺ związane słabo – działa krótko, dawkuj często.') },
  FeDTPA: { name: tl('Fe-DTPA (chelat)'), pct: { Fe: 11 }, grp: 'chelat', f: 'Fe-DTPA 11%', note: tl('Fe wg etykiety (6–11%).') },
  FeEDTA: { name: tl('Fe-EDTA (chelat)'), pct: { Fe: 13 }, grp: 'chelat', f: 'Fe-EDTA 13%', note: tl('Fe wg etykiety.') },
  FeEDDHA: { name: tl('Fe-EDDHA (chelat)'), pct: { Fe: 6 }, grp: 'chelat', f: 'Fe-EDDHA 6%', note: tl('Fe wg etykiety.') },
  MnEDTA: { name: tl('Mn-EDTA (chelat)'), pct: { Mn: 13 }, grp: 'chelat', f: 'Mn-EDTA 13%', note: tl('Mn wg etykiety.') },
  ZnEDTA: { name: tl('Zn-EDTA (chelat)'), pct: { Zn: 15 }, grp: 'chelat', f: 'Zn-EDTA 15%', note: tl('Zn wg etykiety.') },
  CuEDTA: { name: tl('Cu-EDTA (chelat)'), pct: { Cu: 15 }, grp: 'chelat', f: 'Cu-EDTA 15%', note: tl('Cu wg etykiety.') },
};
const SUB = d => String(d).replace(/\d/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);
const elToFormula = el => Object.entries(el).map(([e, n]) => e + (n === 1 ? '' : SUB(n))).join('');
const hydLabel = n => !n ? '' : '·' + (n === 1 ? '' : String(n).replace('.', DEC)) + 'H₂O';

/* ---------- materiał (wbudowany lub własny) → masa molowa i udziały masowe ---------- */
// custom: { id, name, formula?, el?, ions?, hyd?, pct?, M? } – własne sole użytkownika
function mat(id, custom = []) { const c = custom.find(x => x.id === id); return c || (MATERIALS[id] ? { id, ...MATERIALS[id] } : null); }
function formulaOf(m, hyd = 0) { if (m.pct) return m.f || m.name; return (m.f || (m.el ? elToFormula(m.el) : m.formula || m.name)) + hydLabel(hyd); }
function molarMass(m, hyd = 0) {
  if (m.pct) return null;
  if (m.M > 0) return m.M + hyd * H2O; // własna sól z ręcznie podaną masą (bez wody)
  return massOf(m.el) + hyd * H2O;
}
function fractions(m, hyd = 0) { // udział masowy każdego jonu w surowcu (0–1), bez czystości
  if (m.pct) return Object.fromEntries(Object.entries(m.pct).map(([k, v]) => [k, v / 100]));
  const M = molarMass(m, hyd), out = {};
  for (const k in m.ions) out[k] = m.ions[k] * IM[k] / M;
  return out;
}
// surowiec z pozycji (receptura, butelka): zawartość z etykiety it.pct (%) zastępuje domyślną zawartość chelatu/mieszanki,
// np. Fe-DTPA 6% zamiast 11%. Bez it.pct – surowiec z bazy bez zmian.
// it.fert = { id, name, unit: 'g'|'ml', ppm (mg na 1 g albo 1 ml) } – gotowy nawóz w recepturze; it.g to wtedy gramy albo mililitry.
function itemMat(it, custom = []) {
  if (it && it.fert) { const f = it.fert, pct = {}; for (const k in f.ppm || {}) if (f.ppm[k] > 0) pct[k] = f.ppm[k] / 10; return { id: 'p:' + f.id, name: f.name, f: f.name, pct, unit: f.unit === 'g' ? 'g' : 'ml', fert: true }; }
  const m = mat(it.mat, custom), v = +String(it.pct ?? '').replace(',', '.');
  if (!m || !m.pct || !(v > 0 && v <= 100)) return m;
  const k = Object.keys(m.pct)[0], lab = String(v).replace('.', DEC) + '%';
  return { ...m, pct: { ...m.pct, [k]: v }, f: (m.f || m.name).replace(/\d+(?:[.,]\d+)?\s*%/, lab) + (/%/.test(m.f || m.name) ? '' : ' ' + lab) };
}
const purityF = p => { const x = +p; return x > 0 && x <= 100 ? x / 100 : 1; };

// ile mg/l każdego jonu da `grams` surowca w `V` litrach wody
function saltToPpm(m, hyd, purity, grams, V) {
  const f = fractions(m, hyd), p = purityF(purity), out = {};
  if (!(V > 0) || !(grams > 0)) return out;
  for (const k in f) out[k] = grams * 1000 * f[k] * p / V;
  return out;
}
// ile gramów surowca potrzeba, by podnieść `ion` o `ppm` mg/l w `V` litrach
function gramsForPpm(m, hyd, purity, ion, ppm, V) {
  const f = fractions(m, hyd)[ion]; if (!f) return null;
  return ppm * V / 1000 / (f * purityF(purity));
}
// przeliczenie: ta sama ilość jonu w innej formie uwodnienia
const hydrateSwap = (m, g, fromHyd, toHyd) => g * molarMass(m, toHyd) / molarMass(m, fromHyd);

/* ---------- roztwory (receptury) ----------
   items: [{ mat: id, hyd, purity, g }], vol (ml końcowej objętości) → stężenia w g/l (= mg/ml) */
function solution(items, vol, custom = []) {
  const conc = {}, rows = [], warn = [];
  if (!(vol > 0)) return { conc, rows, warn: [tl('Podaj objętość końcową roztworu.')], derived: derived({}) };
  for (const it of items || []) {
    const m = itemMat(it, custom); if (!m || !(it.g > 0)) continue;
    const p = saltToPpm(m, it.hyd || 0, it.purity, it.g, vol / 1000); // mg/l w roztworze
    for (const k in p) conc[k] = (conc[k] || 0) + p[k] / 1000; // → g/l
    let anh = null, ratio = null;
    if (m.sol && !m.pct) { anh = it.g * purityF(it.purity) * molarMass(m, 0) / molarMass(m, it.hyd || 0); ratio = (anh / (vol / 100)) / m.sol; }
    rows.push({ mat: it.mat, name: m.name, formula: formulaOf(m, it.hyd || 0), g: it.g, gl: it.g / (vol / 1000), ratio, ions: m.ions ? Object.keys(m.ions) : [] });
  }
  // wspólny jon (np. K⁺ z K₂SO₄ i KNO₃, SO₄²⁻ z K₂SO₄ i MgSO₄): w mieszaninie sól rozpuszcza się gorzej niż sama.
  // Dokładnie się tego nie policzy bez danych o układach wieloskładnikowych – oznaczamy i stosujemy niższy próg „bezpiecznie” (solFix).
  for (const r of rows) { if (r.ratio == null) continue; r.common = r.ions.filter(k => rows.some(o => o !== r && o.ratio != null && o.ions.includes(k))); }
  // ostrzeżenia chemiczne – jedna tabela reguł (compatIssues), ta sama co przy podziale na butelki
  for (const c of compatIssues(conc)) warn.push({ sev: c.sev, code: c.code, t: c.t });
  const over = rows.filter(r => r.ratio > 1), near = rows.filter(r => r.ratio > safeOf(r) && r.ratio <= 1);
  if (over.length) warn.push({ sev: 'bad', code: 'sol_over', t: `${tl('Nie rozpuści się: {0}.', over.map(r => r.formula).join(', '))}` });
  if (near.length) warn.push({ sev: 'warn', code: 'sol_near', t: `${tl('Blisko granicy rozpuszczalności: {0}.', near.map(r => r.formula).join(', '))}` });
  const mlIn = (items || []).filter(i => i && i.fert && i.fert.unit !== 'g' && i.g > 0).reduce((s, i) => s + i.g, 0);
  if (mlIn >= vol) warn.push({ sev: 'bad', code: 'fert_vol', t: `${tl('Płynnych nawozów jest {0} ml, a cała butelka ma {1} ml. Zmniejsz ich ilość albo powiększ butelkę.', String(+mlIn.toFixed(1)).replace('.', DEC), String(+vol.toFixed(1)).replace('.', DEC))}` });
  const sumR = rows.reduce((s, r) => s + (r.ratio || 0), 0);
  if (!over.length && rows.length > 1 && sumR > 1.2) warn.push({ sev: 'warn', t: tl('Rozpuszczaj sole po kolei w ciepłej wodzie.') });
  return { conc, rows, warn, derived: derived(conc) };
}
// dawka ml koncentratu (g/l) w zbiorniku V l → mg/l
const doseToPpm = (conc, ml, V) => { const o = {}; if (!(V > 0)) return o; for (const k in conc) o[k] = conc[k] * ml / V; return o; };
const mlForPpm = (conc, ion, ppm, V) => conc[ion] > 0 ? ppm * V / conc[ion] : null;

/* ---------- niezgodności w jednej butelce (koncentrat) ----------
   Jedna tabela reguł dla ostrzeżeń w roztworze (solution) i dla podziału na butelki (compat).
   conc – stężenia w butelce w g/l. Reguła z `need` działa tylko, gdy wszystkie wymienione jony są w roztworze;
   z `with` – gdy jest jon z `a` i jon z `b`. Gips (Ca + SO₄) tylko powyżej iloczynu stężeń molowych 1,4·10⁻⁴ (koncentrat). */
const METALS = ['Fe', 'Mn', 'Zn', 'Cu', 'Co'];
const COMPAT_RULES = [
  { code: 'ca_po4', a: ['Ca'], b: ['PO4'], sev: 'bad', osad: tl('fosforan wapnia'), t: tl('Wapń z fosforanem wytrąci się jako fosforan wapnia. Daj je do osobnych butelek.') },
  { code: 'ca_so4', a: ['Ca'], b: ['SO4'], sev: 'warn', osad: tl('gips'), t: tl('Wapń z siarczanami może wypaść jako gips. Wapń daj osobno.'), when: c => (c.Ca / IM.Ca) * (c.SO4 / IM.SO4) > 1.4e-4 },
  { code: 'struvite', need: ['NH4', 'Mg', 'PO4'], sev: 'warn', osad: tl('struwit'), t: tl('Amon, magnez i fosforan razem mogą wytrącić struwit. Fosforan daj osobno.') },
  { code: 'fe_po4', a: ['Fe'], b: ['PO4'], sev: 'warn', osad: tl('fosforan żelaza'), t: tl('Żelazo z fosforanem się wytrąca. Makro i mikro trzymaj w osobnych butelkach.') },
  { code: 'met_po4', a: ['Mn', 'Zn', 'Cu', 'Co'], b: ['PO4'], sev: 'warn', osad: tl('fosforany metali'), t: tl('Mangan, cynk, miedź i kobalt z fosforanem się wytrącają. Makro i mikro trzymaj osobno.') },
  { code: 'ca_co3', a: ['Ca'], b: ['CO3', 'HCO3'], sev: 'warn', osad: tl('węglan wapnia'), t: tl('Wapń z węglanami wytrąci się jako węglan wapnia.') },
  { code: 'met_co3', a: METALS, b: ['CO3', 'HCO3'], sev: 'warn', osad: tl('węglany metali'), t: tl('Metale z węglanami wytrącają się. Bufor KH daj osobno.') },
  { code: 'mg_co3', a: ['Mg'], b: ['CO3'], sev: 'warn', osad: tl('węglan magnezu'), t: tl('Magnez z węglanem wytrąci się jako węglan magnezu. Bufor KH daj osobno.') },
];
function compatIssues(conc) {
  const has = k => (conc[k] || 0) > 0;
  return COMPAT_RULES.filter(r => (r.need ? r.need.every(has) : r.a.some(has) && r.b.some(has)) && (!r.when || r.when(conc)));
}
// podział surowców na butelki bez niezgodności. Kolejno: każdy surowiec trafia do pierwszej butelki, w której nie łamie
// żadnej reguły (sprawdzane na stężeniach po dodaniu, `vol` ml); jeśli takiej nie ma – do nowej. Surowiec niezgodny sam ze sobą
// (np. własna sól z Ca i PO₄) dostaje osobną butelkę i trafia do `self`.
// EDTA do chelatowania idzie do butelki z metalami (jest w niej potrzebne).
const CHELATORS = ['Na2EDTA', 'Na4EDTA'];
function compat(items, vol, custom = []) {
  const use = (items || []).filter(i => i.g > 0 && itemMat(i, custom)), bottles = [], self = [];
  const concOf = list => { const c = {}; for (const it of list) { const p = saltToPpm(itemMat(it, custom), it.hyd || 0, it.purity, it.g, vol / 1000); for (const k in p) c[k] = (c[k] || 0) + p[k] / 1000; } return c; };
  const hasMetal = list => { const c = concOf(list); return METALS.some(k => c[k] > 0); };
  const order = [...use.filter(i => !CHELATORS.includes(i.mat)), ...use.filter(i => CHELATORS.includes(i.mat))];
  for (const it of order) {
    if (compatIssues(concOf([it])).length) { self.push(it); bottles.push([it]); continue; }
    let b = CHELATORS.includes(it.mat) ? bottles.find(l => hasMetal(l) && !compatIssues(concOf([...l, it])).length) : null;
    if (!b) b = bottles.find(l => !self.includes(l[0]) && !compatIssues(concOf([...l, it])).length);
    if (b) b.push(it); else bottles.push([it]);
  }
  return { bottles: bottles.map(l => ({ items: l, conc: concOf(l) })), self, issues: compatIssues(concOf(use)) };
}

/* ---------- korekta parametrów: aktualne → docelowe ----------
   sources: [{ id, label, unit:'g'|'ml', eff:{ion: mg/l w zbiorniku na 1 jednostkę} }]
   assign: { ion: sourceId } – którym źródłem uzupełniamy dany składnik
   Algorytm: rzutowany Gauss–Seidel – każdy przypisany składnik osiąga cel dokładnie, z uwzględnieniem tego, co dostarczają
   pozostałe źródła (np. K z KNO₃ i KH₂PO₄). Jeśli inne źródła już przekraczają cel, ilość = 0 i pojawia się ostrzeżenie. */
function correct({ current = {}, target = {}, sources = [], assign = {} }) {
  const need = {}, notes = [];
  for (const k in target) {
    const t = target[k], c = current[k] || 0; if (!(t >= 0)) continue;
    need[k] = Math.max(0, t - c);
    if (c > t) notes.push({ k, sev: 'info', t: `${tl('{0}: {1} > cel {2} – obniży tylko podmiana.', ION[k] ? ION[k].l : k, fmt(c), fmt(t))}` });
  }
  const pairs = Object.entries(assign).filter(([k, sid]) => sid && need[k] !== undefined && sources.some(s => s.id === sid));
  const x = Object.fromEntries(sources.map(s => [s.id, 0]));
  const used = new Set(); for (const [, sid] of pairs) { if (used.has(sid)) notes.push({ sev: 'warn', t: tl('To samo źródło dla kilku składników – liczone dla ostatniego.') }); used.add(sid); }
  const owner = {}; for (const [k, sid] of pairs) owner[sid] = k;
  for (let it = 0; it < 500; it++) {
    let delta = 0;
    for (const sid in owner) {
      const k = owner[sid], s = sources.find(z => z.id === sid), a = s.eff[k] || 0;
      if (!(a > 0)) { x[sid] = 0; continue; }
      let other = 0; for (const z of sources) if (z.id !== sid) other += (z.eff[k] || 0) * x[z.id];
      const nx = Math.max(0, (need[k] - other) / a); delta = Math.max(delta, Math.abs(nx - x[sid])); x[sid] = nx;
    }
    if (delta < 1e-12) break;
  }
  const added = {}; for (const s of sources) for (const k in s.eff) added[k] = (added[k] || 0) + s.eff[k] * (x[s.id] || 0);
  const after = {}; for (const k of new Set([...Object.keys(current), ...Object.keys(added)])) after[k] = (current[k] || 0) + (added[k] || 0);
  for (const k in target) {
    if (need[k] > 0 && !(pairs.some(([kk]) => kk === k)) && !((added[k] || 0) >= need[k] - 1e-9)) notes.push({ k, sev: 'warn', t: `${tl('{0}: brak źródła, brakuje {1} mg/l.', ION[k] ? ION[k].l : k, fmt(need[k] - (added[k] || 0)))}` });
    if (target[k] > 0 && (added[k] || 0) > need[k] + Math.max(0.05 * target[k], 0.01) && need[k] >= 0) {
      const own = pairs.find(([kk]) => kk === k);
      notes.push({ k, sev: 'warn', t: `${tl('{0}: z innych źródeł +{1} mg/l → {2} (cel {3}).{4}', ION[k] ? ION[k].l : k, fmt(added[k]), fmt(after[k]), fmt(target[k]), own && x[own[1]] === 0 ? tl(' Źródło niepotrzebne.') : '')}` });
    }
  }
  return { amounts: x, added, after, need, notes, dGH: derived(added).GH, dKH: derived(added).KH };
}
const fmt = v => (Math.round(v * 100) / 100).toString().replace('.', DEC);

/* ---------- podmiana i mineralizacja ----------
   Mieszanie wód i podmiana są liniowe dla jonów zachowawczych (NO₃, PO₄, K, Mg, Ca, Na, Cl, SO₄) i dla GH/KH jako sum. */
function mixWaters(parts) { // parts: [{ frac, comp }] – ułamki objętości (suma 1)
  const out = {}, tot = parts.reduce((s, p) => s + (p.frac > 0 ? p.frac : 0), 0) || 1;
  for (const p of parts) { if (!(p.frac > 0)) continue; for (const k in p.comp) if (typeof p.comp[k] === 'number' && isFinite(p.comp[k])) out[k] = (out[k] || 0) + p.comp[k] * p.frac / tot; }
  return out;
}
// woda do podmiany: mieszanie RO/kran + mineralizatory (g na `perL` litrów nowej wody)
function newWater({ tap = {}, ro = {}, roFrac = 0, minerals = [], custom = [] }) {
  const f = Math.min(Math.max(roFrac, 0), 1), base = mixWaters([{ frac: 1 - f, comp: tap }, { frac: f, comp: ro }]);
  const add = {};
  for (const mi of minerals) { const m = mat(mi.mat, custom); if (!m || !(mi.g > 0) || !(mi.perL > 0)) continue; const p = saltToPpm(m, mi.hyd || 0, mi.purity, mi.g, mi.perL); for (const k in p) add[k] = (add[k] || 0) + p[k]; }
  const out = { ...base }; for (const k in add) out[k] = (out[k] || 0) + add[k];
  const d = derived(add);
  // GH/KH: gdy dla kranówki wpisano GH (test) – mieszamy GH liniowo; gdy nie, a znane są Ca i Mg – liczymy GH z jonów.
  // Bez żadnej z tych danych GH wody nie jest znane (null) – podajemy tylko przyrost z mineralizatorów.
  out.GH = has(tap.GH) ? (base.GH || 0) + d.GH : (has(tap.Ca) || has(tap.Mg)) ? derived(out).GH : (f === 1 && has(ro.GH) ? ro.GH + d.GH : (f === 1 ? d.GH : null));
  out.KH = has(tap.KH) || f === 1 ? (base.KH || 0) + d.KH : null;
  return { comp: out, added: add, dGH: d.GH, dKH: d.KH };
}
const has = v => typeof v === 'number' && isFinite(v);
function waterChange(tankNow = {}, water = {}, frac) { // c' = c(1−f) + f·c_woda
  const f = Math.min(Math.max(frac, 0), 1), out = {};
  for (const k of new Set([...Object.keys(tankNow), ...Object.keys(water)])) {
    const a = tankNow[k], b = water[k];
    if (!has(a) && !has(b)) continue;
    if (!has(a)) { out[k] = null; continue; } // nieznane w akwarium – nie zgadujemy
    out[k] = a * (1 - f) + f * (has(b) ? b : 0);
  }
  return out;
}

/* ---------- objętość: brutto i netto ---------- */
function volume({ L, W, H, glass = 0, freeTop = 0, substrate = 0, decorL = 0, decorPct = 0 }) {
  // wymiary zewnętrzne w cm, szkło w mm
  const g = glass / 10, iL = L - 2 * g, iW = W - 2 * g, iH = H - g;
  if (!(L > 0 && W > 0 && H > 0) || iL <= 0 || iW <= 0 || iH <= 0) return null;
  const gross = L * W * H / 1000, inner = iL * iW * iH / 1000, wH = Math.max(iH - freeTop, 0), water = iL * iW * wH / 1000;
  const sub = iL * iW * Math.min(substrate, wH) / 1000;
  const subWater = sub * 0.3; // woda w porach podłoża – ok. 30% (żwir/aktywne podłoże: 25–40%)
  let net = water - sub - decorL; net -= net * Math.min(Math.max(decorPct, 0), 50) / 100;
  return { gross, inner, water, substrate: sub, subWater, net: Math.max(net, 0), netWithPores: Math.max(net + subWater, 0) };
}

const CHELATABLE = ['Fe', 'Mn', 'Zn', 'Cu', 'Co'];
// mole metali z soli bez chelatu (pct = chelat/mieszanka – pomijane); EDTA wiąże 1:1 molowo
function metalMoles(items, custom = []) {
  let mol = 0;
  for (const it of items || []) { const m = mat(it.mat, custom); if (!m || m.pct || !(it.g > 0)) continue; const f = fractions(m, it.hyd || 0);
    for (const k of CHELATABLE) if (f[k]) mol += it.g * f[k] * purityF(it.purity) / AW[k]; }
  return mol;
}
const edtaGrams = (mol, kind = 'Na2EDTA', hyd = 2) => mol * molarMass(MATERIALS[kind], hyd);

/* ---------- butelka z celu tygodniowego ----------
   rows: [{ k, t, src, purity?, pct? }] – cel tygodniowy (mg/l) i źródło: sól 'id|nH2O' albo gotowy produkt 'p:<id>';
   purity – czystość surowca w % (domyślnie 100), pct – zawartość pierwiastka w chelacie z etykiety w % (domyślnie z bazy).
   Gdy kilka wierszy ma to samo źródło, czystość i zawartość bierzemy z pierwszego.
   Ilości TYGODNIOWE nie zależą od butelki; do butelki trafia tyle tygodni nawozu, ile mieści (f = butelka / (dawka × n)).
   Stężenie w butelce (g/l) zależy więc tylko od ml na tydzień (dawka × n) – większa butelka go nie zmienia. */
function planBottle({ rows, V, bottle, dose, n, custom = [], prodOf = () => null, edta = '' }) {
  const num = x => { const v = parseFloat(String(x).replace(',', '.')); return isFinite(v) ? v : NaN; };
  const split = c => { const [id, hh] = String(c).split('|'); return { id, hyd: +hh || 0 }; };
  const codes = [...new Set(rows.map(r => r.src).filter(Boolean))];
  const opt = c => { const r = rows.find(x => x.src === c) || {}, pu = num(r.purity), pc = num(r.pct); return { purity: pu > 0 && pu <= 100 ? pu : 100, pct: pc > 0 && pc <= 100 ? pc : null }; };
  const sources = codes.map(c => {
    if (c.startsWith('p:')) { const pr = prodOf(c.slice(2)); return pr && pr.ppm ? { id: c, prod: pr, eff: Object.fromEntries(Object.entries(pr.ppm).filter(([, v]) => v > 0).map(([k, v]) => [k, v / V])) } : null; }
    const { id, hyd } = split(c), o = opt(c), m = itemMat({ mat: id, pct: o.pct }, custom);
    return m ? { id: c, purity: o.purity, pct: m.pct && o.pct ? o.pct : null, eff: saltToPpm(m, hyd, o.purity, 1, V) } : null;
  }).filter(Boolean);
  const target = {}, assign = {};
  for (const r of rows) { const v = num(r.t); if (v >= 0 && r.t !== '') { target[r.k] = v; assign[r.k] = r.src; } }
  const res = correct({ current: {}, target, sources, assign }), f = bottle / (dose * n);
  const items = sources.filter(s => !s.prod).map(s => ({ mat: split(s.id).id, hyd: split(s.id).hyd, purity: s.purity, ...(s.pct ? { pct: s.pct } : {}), g: res.amounts[s.id] * f })).filter(i => i.g > 1e-6);
  const prodItems = sources.filter(s => s.prod).map(s => ({ prod: s.prod, a: res.amounts[s.id] * f })).filter(i => i.a > 1e-6);
  const mol = metalMoles(items, custom);
  if (edta && mol > 0) items.push({ mat: edta, hyd: 2, purity: 100, g: edtaGrams(mol, edta, 2) });
  const weekly = { items: items.map(i => ({ mat: i.mat, hyd: i.hyd, ...(i.purity !== 100 ? { purity: i.purity } : {}), ...(i.pct ? { pct: i.pct } : {}), g: i.g / f })), prods: prodItems.map(i => ({ prod: i.prod, a: i.a / f })) };
  return { items, prodItems, weekly, notes: res.notes, mol, f };
}
// ilu tygodniom nawozu wystarczy lista zakupów: plany z planBottle (lub { weekly }) × tygodnie → sumy wg surowca
function shopLines(plans, weeks) {
  const acc = new Map(), add = (key, o, q) => { const e = acc.get(key); if (e) e.q += q; else acc.set(key, { ...o, q }); };
  for (const p of plans) {
    for (const i of p.weekly.items) add(i.mat + '|' + (i.hyd || 0) + (i.pct ? '|' + i.pct : ''), { mat: i.mat, hyd: i.hyd || 0, ...(i.pct ? { pct: i.pct } : {}), unit: 'g' }, i.g * weeks);
    for (const r of p.weekly.prods) add('p:' + r.prod.id, { prod: r.prod, unit: r.prod.unit === 'g' ? 'g' : 'ml' }, r.a * weeks);
  }
  return [...acc.values()];
}
const roundUp = (x, step) => Math.ceil(x / step - 1e-9) * step;
// ile kupić: zaokrąglenie w górę do sensownej porcji (poniżej 1 g – „najmniejsze opakowanie”)
function buyAmount(q, unit = 'g') {
  if (!(q > 0)) return { v: 0, unit, tiny: false };
  if (q < 1) return { v: 1, unit, tiny: true };
  const big = unit === 'ml' ? tl('l') : 'kg';
  if (q < 10) return { v: Math.ceil(q), unit, tiny: false };
  if (q < 100) return { v: roundUp(q, 5), unit, tiny: false };
  if (q < 1000) return { v: roundUp(q, 10), unit, tiny: false };
  return { v: roundUp(q, 50) / 1000, unit: big, tiny: false };
}
/* ---------- rozpuszczalność: co zrobić, gdy sól się nie rozpuści ----------
   rows z solution(); target = bezpieczny udział nasycenia (80%), targetCommon – dla soli ze wspólnym jonem (70%, pkt C5 audytu).
   Najgorsza sól = największy stosunek ratio / próg. factor = o ile razy trzeba rozcieńczyć (dawka × n albo woda w butelce). */
const SAFE = 0.8, SAFE_COMMON = 0.7;
const safeOf = (r, target = SAFE, targetCommon = SAFE_COMMON) => r && r.common && r.common.length ? Math.min(target, targetCommon) : target;
function solFix(rows, target = SAFE, targetCommon = SAFE_COMMON) {
  const rs = (rows || []).filter(r => r.ratio != null && isFinite(r.ratio)), score = r => r.ratio / safeOf(r, target, targetCommon);
  const over = rs.filter(r => r.ratio > 1), pool = over.length ? over : rs; // gdy coś się nie rozpuści – pokazujemy właśnie tę sól
  let worst = null; for (const r of pool) if (!worst || score(r) > score(worst)) worst = r;
  const f = rs.length ? Math.max(...rs.map(score)) : 0, T = safeOf(worst, target, targetCommon);
  return { worst, ratio: worst ? worst.ratio : 0, safe: T, common: worst ? worst.common || [] : [], level: over.length ? 'over' : f > 1 ? 'near' : 'ok', factor: f > 1 ? f : 1,
    limitGL: worst ? worst.gl / worst.ratio : null, safeGL: worst ? worst.gl / worst.ratio * T : null };
}
return { AW, H2O, LAMBDA, ecTds, itemMat, SAFE, SAFE_COMMON, safeOf, COMPAT_RULES, compatIssues, compat, metalMoles, edtaGrams, CHELATABLE, ION, IM, ION_ORDER, MACRO, DH, derived, parseFormula, massOf, MATERIALS, mat, formulaOf, molarMass, fractions, purityF, saltToPpm,
  gramsForPpm, hydrateSwap, solution, doseToPpm, mlForPpm, correct, planBottle, shopLines, buyAmount, roundUp, solFix, mixWaters, newWater, waterChange, volume, hydLabel, elToFormula };
})();
if (typeof module !== 'undefined') module.exports = CHEM;

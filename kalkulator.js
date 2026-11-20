/* ---------- KALKULATOR NAWOZU (ekran startowy) ----------
   Makro/Mikro = cel tygodniowy → ilości do butelki; Preparaty = gotowy nawóz; Sprawdź = zawartość butelki → mg/l. */
const K_SRC = [['K2SO4|0', 'K₂SO₄'], ['KCl|0', 'KCl']], MG_SRC = [['MgSO4|7', 'MgSO₄·7H₂O'], ['MgSO4|0', 'MgSO₄ bezwodny'], ['MgCl2|6', 'MgCl₂·6H₂O']];
const DEF_ITEMS = () => [{ mat: 'KNO3', hyd: 0, g: 0 }, { mat: 'KH2PO4', hyd: 0, g: 0 }, { mat: 'K2SO4', hyd: 0, g: 0 }, { mat: 'MgSO4', hyd: 7, g: 0 }];
function solMeters(rows) {
  return rows.filter(x => x.ratio > 0.5).map(x => `<div class="rb" style="padding:4px 0"><div class="rb-h"><span>${esc(x.formula)}</span><span><small>${fnum(Math.min(x.ratio, 9.99) * 100, 0)}% rozp.</small></span></div><div class="meter ${x.ratio > 1 ? 'bad' : x.ratio > 0.8 ? 'warn' : ''}"><i style="width:${Math.min(x.ratio, 1) * 100}%"></i></div></div>`).join('');
}
// przepis PMDD (g na 1000 ml, calc.js) jako zawartość butelki w zakładce Sprawdź;
// molibdenian z przepisu ((NH₄)₂Mo₄O₁₃·2H₂O) zamieniony na AHM·4H₂O z zachowaniem ilości Mo
const PMDD_MAT = { KNO3: ['KNO3', 0], K2SO4: ['K2SO4', 0], MGSO4_7: ['MgSO4', 7], FeSO4: ['FeSO4', 7], MnSO4: ['MnSO4', 1], ZnSO4: ['ZnSO4', 7], CuSO4: ['CuSO4', 5],
  CoSO4: ['CoSO4', 7], H3BO3: ['H3BO3', 0], MOLIB: ['AHM', 4], EDTA: ['Na2EDTA', 2] };
function pmddItems(bottle) {
  const sc = bottle / 1000, moFix = (4 * X.AW.Mo / C.MICRO_SALTS.MOLIB.M) / X.fractions(X.MATERIALS.AHM, 4).Mo;
  return Object.entries(PMDD_MAT).map(([k, [mat, hyd]]) => ({ mat, hyd, g: +(C.PMDD[k] * sc * (k === 'MOLIB' ? moFix : 1)).toFixed(4) }));
}
function quickRecipe(items, vol) {
  const name = prompt('Nazwa nawozu:', 'Mój nawóz NPK'); if (!name) return;
  const r = { id: uid('r'), name: name.slice(0, 60), vol, items: items.filter(i => i.g > 0).map(i => ({ mat: i.mat, hyd: i.hyd || 0, purity: i.purity || 100, g: +(+i.g).toFixed(3) })), note: '', created: todayKey(), updated: todayKey(), pid: null };
  state.recipes.push(r); syncRecipeProduct(r); save(); toast('Zapisano: ' + r.name);
}
// znane przepisy i cele orientacyjne: [id, nazwa, opis]
const QUICK = [['ei', 'EI', 'Estimative Index – nadmiar co tydzień + podmiana'], ['ppspro', 'PPS-Pro', 'Codzienne małe dawki, 1 ml na 40 l'], ['pmdd', 'PMDD', 'Roztwór z mikro i kwasem, dawkowany codziennie'],
  ['low', 'Lekkie', 'Orientacyjne cele: słabe światło'], ['mid', 'Średnie', 'Orientacyjne cele: średnie światło'], ['high', 'Mocne', 'Orientacyjne cele: mocne światło i CO₂']];
const NUTR = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe'];
// skład z etykiety (% masowe) → jon w akwarium: [etykieta, jon, mnożnik]
const LABEL = [['N_NO3', 'N azotanowy', 'NO3', X.IM.NO3 / X.AW.N], ['N_NH4', 'N amonowy', 'NH4', X.IM.NH4 / X.AW.N], ['N_amid', 'N mocznikowy', 'NH4', X.IM.NH4 / X.AW.N],
  ['P2O5', 'P₂O₅', 'PO4', 2 * X.IM.PO4 / (2 * X.AW.P + 5 * X.AW.O)], ['K2O', 'K₂O', 'K', 2 * X.AW.K / (2 * X.AW.K + X.AW.O)], ['MgO', 'MgO', 'Mg', X.AW.Mg / (X.AW.Mg + X.AW.O)],
  ['CaO', 'CaO', 'Ca', X.AW.Ca / (X.AW.Ca + X.AW.O)],
  ['NO3', 'NO₃ (jon)', 'NO3', 1], ['NH4', 'NH₄ (jon)', 'NH4', 1], ['P', 'P', 'PO4', X.IM.PO4 / X.AW.P], ['PO4', 'PO₄', 'PO4', 1], ['K', 'K', 'K', 1], ['Mg', 'Mg', 'Mg', 1], ['Ca', 'Ca', 'Ca', 1],
  ['S', 'S', 'SO4', X.IM.SO4 / X.AW.S], ['SO3', 'SO₃', 'SO4', X.IM.SO4 / (X.AW.S + 3 * X.AW.O)], ['SO4', 'SO₄', 'SO4', 1], ['Fe', 'Fe', 'Fe', 1], ['Mn', 'Mn', 'Mn', 1], ['Zn', 'Zn', 'Zn', 1], ['Cu', 'Cu', 'Cu', 1], ['B', 'B', 'B', 1], ['Mo', 'Mo', 'Mo', 1]];
// g/l (płyn, na 1 ml w 1 l = mg/l) albo g/kg (proszek, na 1 g w 1 l = mg/l)
function labelConc(lab) {
  const k = lab.form === 'powder' ? 10 : lab.unit === 'gl' ? 1 : 10 * (n2(lab.dens) > 0 ? n2(lab.dens) : 1), out = {};
  for (const [id, , ion, f] of LABEL) { const v = n2((lab.pct || {})[id]); if (v > 0) out[ion] = (out[ion] || 0) + v * k * f; }
  return out;
}
const NUTR_DEF = { NH4: ['0,2', 'NH4SO4|0'], NO3: ['10', 'KNO3|0'], PO4: ['1', 'KH2PO4|0'], K: ['15', 'K2SO4|0'], Mg: ['3', 'MgSO4|7'], Ca: ['10', 'CaCl2|2'], Fe: ['0,1', 'FeDTPA|0'],
  Mn: ['', 'MnSO4|1'], Zn: ['', 'ZnSO4|7'], Cu: ['', 'CuSO4|5'], B: ['', 'H3BO3|0'], Mo: ['', 'Na2MoO4|2'], Co: ['', 'CoSO4|7'] };
// gotowe mieszanki mikro jako źródło w zakładce Mikro: 'p:<id produktu>'
// tylko koncentraty mikro (ogrodnicze mieszanki i chelaty, własne nawozy mikro/Fe); gotowe nawozy akwarystyczne dawkuje się bez rozrabiania (zakładka Preparaty)
const microProds = k => allProducts().filter(p => { if (!p.ppm || !(p.ppm[k] > 0)) return false; const m = MIC.reduce((s1, e) => s1 + (p.ppm[e] || 0), 0), M = MAC.reduce((s1, e) => s1 + (p.ppm[e] || 0), 0);
  return (p.source !== 'builtin' && ['micro', 'fe'].includes(p.kind)) || (m >= 20 && M <= 0.6 * m); });
const MAC = ['NO3', 'NH4', 'PO4', 'K', 'Mg', 'Ca'], MIC = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co'], SIDE_IONS = ['SO4', 'Cl', 'Na', 'HCO3', 'CO3'];
// Orientacyjne dawki TYGODNIOWE (mg/l) dla akwarium roślinnego – spotykane w literaturze hobbystycznej.
// Tylko informacja przy wyniku; nie są celem ani proporcją narzucaną przez aplikację.
const WEEK_RANGE = { NH4: [0, 1], NO3: [5, 20], PO4: [0.5, 2], K: [5, 30], Mg: [5, 20], Fe: [0.1, 0.8], Mn: [0, 0.05], Zn: [0, 0.05], Cu: [0, 0.02], B: [0, 0.02], Mo: [0, 0.05] };
const rngTxt = k => { const r = WEEK_RANGE[k]; return !r ? '' : r[0] > 0 ? `typowo ${fnum(r[0], 2)}–${fnum(r[1], 2)}` : `typowo do ${fnum(r[1], 2)}`; };
// kolor tylko tam, gdzie warto zareagować: mikro (poza Cu) dopiero przy 3× powyżej zakresu
const rngSt = (k, v) => { const r = WEEK_RANGE[k]; if (!r || !(v > 0)) return ''; const hi = ['Mn', 'Zn', 'B', 'Mo'].includes(k) ? r[1] * 3 : r[1]; return v > hi * 1.0001 ? 'over' : r[0] > 0 && v < r[0] * 0.9999 ? 'under' : ''; };
const weekTile = (k, week, dose, hl) => ({ l: ionL(k), v: gfmt(week), sub: dose != null ? `dawka ${gfmt(dose)}` : '', rng: rngTxt(k), st: rngSt(k, week), hl });
const RNG_NOTE = 'Orientacyjna dawka tygodniowa w akwarium roślinnym. Przy słabym świetle i bez CO₂ wystarczy dolna granica. Mikro ponad zakres zwykle nie szkodzi – wyjątkiem jest miedź przy krewetkach.';
const DEF_MROWS = () => [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0' }];
const DEF_ROWS = () => ['NO3', 'PO4', 'K', 'Mg'].map(k => ({ k, t: NUTR_DEF[k][0], src: NUTR_DEF[k][1] }));
function slab(title, rows, foot) {
  return h('section', { class: 'slab' }, h('h3', {}, title), h('div', { class: 'slab-rows' }, rows.map(([l, v, sub]) => h('div', { class: 'slab-row' }, h('span', { html: l }), h('b', {}, v, sub ? h('small', {}, sub) : null)))), foot ? h('p', {}, foot) : null);
}
// Skutki uboczne nawozu: twardość, formy azotu, jony towarzyszące – na dawkę i na tydzień
function extrasCard(pd, n) {
  const d = X.derived(pd), w = v => [gfmt(v), { v: gfmt(v * n), big: 1 }], rows = [];
  if (d.GH > 0.0005) rows.push(['GH wzrośnie o <small>°dH</small>', ...w(d.GH)]);
  if (d.KH > 0.0005) rows.push(['KH wzrośnie o <small>°dH</small>', ...w(d.KH)]);
  if (d.N > 0) { rows.push(['Azot razem jako NO₃ <small>mg/l</small>', ...w(d.NO3eq)], ['Azot jako N <small>mg/l</small>', ...w(d.N)]);
    if (pd.NH4 > 0) rows.push(['w tym NH₄ <small>mg/l</small>', ...w(pd.NH4)]); }
  if (d.P > 0) rows.push(['Fosfor jako P <small>mg/l</small>', ...w(d.P)]);
  for (const k of ['Na', 'SO4', 'Cl']) if (pd[k] > 0.0005) rows.push([`${ionL(k)} <small>mg/l</small>`, ...w(pd[k])]);
  if (!rows.length) return null;
  const ratio = [pd.NO3 > 0 && pd.PO4 > 0 ? `NO₃:PO₄ = ${fnum(pd.NO3 / pd.PO4, 1)}:1` : '', d.N > 0 && d.P > 0 ? `N:P = ${fnum(d.N / d.P, 1)}:1` : ''].filter(Boolean).join(' · ');
  return h('details', { class: 'fold', style: 'margin-bottom:14px', open: state.adv }, h('summary', {}, h('span', {}, 'Szczegóły chemiczne')), h('div', { class: 'fold-b' }, h('div', { html: table(['', 'dawka', 'tydzień'], rows) }), ratio ? h('p', { class: 'note' }, ratio + ' – dla orientacji.') : null));
}
PAGES.kalkulator = root => {
  const st = (state.inputs.kalk ||= {}), t = tank();
  if (st._t !== t.id) Object.assign(st, { _t: t.id, V: String(t.V) });
  st.mode ||= 'make'; if (!Array.isArray(st.items)) st.items = DEF_ITEMS(); if (!Array.isArray(st.rows)) st.rows = DEF_ROWS(); if (!Array.isArray(st.mrows)) st.mrows = DEF_MROWS();
  { const mv = st.rows.filter(r => MIC.includes(r.k)); if (mv.length) { st.rows = st.rows.filter(r => !MIC.includes(r.k)); mv.forEach(r => { const i = st.mrows.findIndex(x => x.k === r.k); if (i >= 0) st.mrows[i] = r; else st.mrows.push(r); }); save(); } }
  st.prep ||= { pid: 'b26', way: 'target', el: 'Fe', t: '0,2', amt: '', lab: { form: 'liquid', dens: '1,2', pct: {} } };
  const F = Form('kalk', update), out = h('div'), rows = () => st.mode === 'micro' ? st.mrows : st.rows;
  const MODE_INFO = { make: 'Własny nawóz NPK z soli: wpisz, ile chcesz dodawać tygodniowo – dostaniesz gramy do butelki.', micro: 'Własny nawóz z żelazem i mikroelementami: z soli, chelatów albo gotowej mieszanki (np. CSM+B).',
    prep: 'Gotowy nawóz: ile dawkować, żeby dostać cel. Proszek rozpuszczasz w butelce, płyn dawkujesz prosto z opakowania.', check: 'Masz już butelkę? Wpisz, ile czego dodałeś – zobaczysz, ile daje dawka.',
    shop: 'Lista zakupów z Twoich celów w Makro i Mikro: co kupić, ile na wybrany okres i czego szukać w sklepie.' };
  if (!MODE_INFO[st.mode]) st.mode = 'make';
  root.append(h('div', { class: 'seg seg-big', role: 'tablist' }, [['make', 'Makro'], ['micro', 'Mikro'], ['prep', 'Preparaty'], ['check', 'Sprawdź'], ['shop', 'Zakupy']].map(([k, tx]) => h('button', { class: st.mode === k ? 'on' : '', role: 'tab', 'aria-selected': String(st.mode === k), onclick: () => { st.mode = k; save(); render(); } }, tx))),
    h('p', { class: 'mode-info' }, MODE_INFO[st.mode]),
    ...(st.mode === 'make' || st.mode === 'check' ? [h('div', { class: 'presetbar' }, h('span', { class: 'lbl' }, 'Szybkie przepisy'),
      h('div', { class: 'chips scroll' }, QUICK.map(([id, tx, tip]) => h('button', { class: 'chip' + (st.preset === id ? ' on' : ''), type: 'button', title: tip, onclick: () => applyPreset(id) }, tx))))] : []));
  const stepH = (n, title, hint) => h('h2', {}, h('span', { class: 'stepn' }, n), title, hint && !state.adv ? h('span', { class: 'unit2' }, hint) : null);
  const liquid = () => { if (st.mode !== 'prep') return false; const pr = prepProduct(); return st.prep.pid === '__custom' ? st.prep.lab.form !== 'powder' : !!pr && pr.unit !== 'g'; };
  const shopMode = st.mode === 'shop';
  root.append(h('section', { class: 'card flat params' }, stepH(1, liquid() || shopMode ? 'Akwarium' : 'Butelka i dawkowanie'), h('div', { class: 'grid4' }, F.num('V', 'Akwarium', { unit: 'l', def: t.V }),
    ...(shopMode ? [] : liquid() ? [F.num('n', 'Dawek w tygodniu', { unit: '×', def: 7 })] : [F.num('bottle', 'Butelka', { unit: 'ml', def: 500 }), F.num('dose', 'Dawka', { unit: 'ml', def: 10 }), F.num('n', 'Dawek w tygodniu', { unit: '×', def: 7 })])),
    liquid() || shopMode || state.adv ? null : h('div', { html: whyH('Co wpisać', 'Butelka – ile roztworu robisz (np. 500 ml). Dawka – ile go wlewasz do akwarium za jednym razem. Dawek w tygodniu – jak często (7 = codziennie). Im większa dawka lub więcej dawek, tym rzadszy roztwór – a rzadszy łatwiej się rozpuszcza.') })));
  const box = h('div', { class: 'stack' });
  if (st.mode === 'make' || st.mode === 'micro') { root.append(h('section', { class: 'card flat' }, stepH(2, 'Ile dodawać tygodniowo', 'mg/l'), box)); drawRows(); }
  else if (st.mode === 'prep') { root.append(h('section', { class: 'card flat' }, stepH(2, 'Preparat'), box)); drawPrep(); }
  else if (st.mode === 'check') { root.append(h('section', { class: 'card flat' }, stepH(2, 'Co jest w butelce'), box)); drawItems(); }
  // preparat: z bazy albo własny skład z etykiety (%)
  function prepProduct() {
    const P0 = st.prep;
    if (P0.pid === '__custom') return { name: 'Nawóz z etykiety', unit: P0.lab.form === 'powder' ? 'g' : 'ml', ppm: labelConc(P0.lab), custom: true };
    return productById(P0.pid);
  }
  function drawPrep() {
    const P0 = st.prep; box.innerHTML = '';
    const all = allProducts(), lab = all.filter(p => p.source === 'builtin' && p.status === 'label'), mine = all.filter(p => p.source !== 'builtin'), rest = all.filter(p => p.source === 'builtin' && p.status !== 'label');
    const og = (l, arr) => arr.length ? h('optgroup', { label: l }, arr.map(p => h('option', { value: p.id }, p.name + (p.unit === 'g' ? ' (proszek)' : '')))) : null;
    const pick = h('select', { 'aria-label': 'Preparat' }, og('Ogrodnicze i chelaty (skład z etykiety)', lab), og('Moje nawozy', mine), og('Akwarystyczne (baza, skład orientacyjny)', rest), h('option', { value: '__custom' }, 'Inny – wpiszę skład z etykiety (%)'));
    const cl = P0.pid !== '__custom' && prepProduct() && Object.keys(prepProduct().ppm || {}).length ? h('a', { href: '#/nawozy/odpowiednik', class: 'small', onclick: () => { (state.inputs.odp ||= {}).pid = P0.pid; save(); } }, 'Zrób sam odpowiednik z soli →') : null;
    pick.value = P0.pid; pick.onchange = () => { P0.pid = pick.value; const p = prepProduct(); if (p && p.ppm && !p.ppm[P0.el]) P0.el = Object.keys(p.ppm)[0] || 'Fe'; save(); render.keepScroll = true; render(); };
    box.append(h('span', { class: 'inp' }, pick));
    if (cl) box.append(h('p', { class: 'note', style: 'margin:0' }, cl));
    const cur = prepProduct();
    if (P0.pid === '__custom') drawLabelInto(box, P0.lab);
    else if (cur) box.append(h('p', { class: 'note', style: 'margin:0' }, pstat(cur), ' ', cur.unit === 'g' ? 'proszek – rozpuszczasz w butelce' : 'płyn – dawkujesz prosto z butelki', cur.src ? h('span', {}, ' · ', h('a', { href: cur.src, target: '_blank', rel: 'noopener' }, 'źródło składu')) : null));
    box.append(h('div', { class: 'chips', style: 'margin:4px 0 0' }, [['target', 'Mam cel'], ['amount', liquid() ? 'Mam dawkę' : 'Mam ilość']].map(([k, tx]) => h('button', { class: 'chip' + (P0.way === k ? ' on' : ''), type: 'button', onclick: () => { P0.way = k; save(); drawPrep(); update(); } }, tx))));
    const els = cur && cur.ppm ? X.ION_ORDER.filter(k => cur.ppm[k] > 0) : [];
    if (P0.way === 'target') {
      if (!els.includes(P0.el) && els.length) P0.el = els.includes('Fe') ? 'Fe' : els[0];
      const sel = h('select', { 'aria-label': 'Składnik celu' }, els.map(k => h('option', { value: k, selected: k === P0.el }, ionL(k)))); sel.onchange = () => { P0.el = sel.value; save(); update(); };
      const tv = inputF('Tygodniowo', 'mg/l', P0.t); tv.inp.oninput = () => { P0.t = tv.val(); save(); update(); };
      box.append(h('div', { class: 'grid' }, selField('Cel dla', sel), tv.el));
    } else {
      const a = liquid() ? inputF('Dawka', 'ml', P0.ldose || '') : inputF('Do butelki', cur && cur.unit === 'g' ? 'g' : 'ml', P0.amt); a.inp.setAttribute('aria-label', 'Ilość preparatu');
      if (liquid()) { a.inp.oninput = () => { P0.ldose = a.val(); save(); update(); }; box.append(h('div', { class: 'grid' }, a.el)); return; } a.inp.oninput = () => { P0.amt = a.val(); save(); update(); };
      box.append(h('div', { class: 'grid' }, a.el));
    }
  }
  function refreshEls() { // lista składników celu po zmianie składu z etykiety
    const sel = $('select[aria-label="Składnik celu"]', root), pr = prepProduct(); if (!sel || !pr) return;
    const els = X.ION_ORDER.filter(k => pr.ppm[k] > 0), now = [...sel.options].map(o => o.value).join();
    if (now === els.join()) return;
    if (!els.includes(st.prep.el) && els.length) st.prep.el = els[0];
    sel.innerHTML = ''; els.forEach(k => sel.append(h('option', { value: k, selected: k === st.prep.el }, ionL(k))));
  }
  function drawLabelInto(box2, L0) {
    box2.append(h('div', { class: 'chips', style: 'margin:0' }, [['liquid', 'Płyn'], ['powder', 'Proszek / granulat']].map(([k, tx]) => h('button', { class: 'chip' + (L0.form === k ? ' on' : ''), type: 'button', onclick: () => { L0.form = k; save(); render.keepScroll = true; render(); } }, tx))));
    const inp = (label, unit, key, obj = L0, ph = '') => { const f = inputF(label, unit, obj[key] || '', { ph }); f.inp.oninput = () => { obj[key] = f.val(); save(); refreshEls(); update(); }; return f.el; };
    const gl = L0.form === 'liquid' && L0.unit === 'gl', u = gl ? 'g/l' : '%';
    if (L0.form === 'liquid') box2.append(h('div', { class: 'chips', style: 'margin:0' }, [['pct', 'Skład w %'], ['gl', 'Skład w g/l']].map(([k, tx]) => h('button', { class: 'chip' + ((L0.unit || 'pct') === k ? ' on' : ''), type: 'button', onclick: () => { L0.unit = k; save(); render.keepScroll = true; render(); } }, tx))));
    if (L0.form === 'liquid' && !gl) box2.append(h('div', { class: 'grid' }, inp('Gęstość', 'g/ml', 'dens', L0, '1,2')));
    const MICRO_L = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'], MAIN_L = ['N_NO3', 'N_NH4', 'N_amid', 'P2O5', 'K2O', 'MgO', 'CaO'], g3 = ids => h('div', { class: 'grid', style: 'margin-top:10px' }, LABEL.filter(([id]) => ids.includes(id)).map(([id, l]) => inp(l, u, id, L0.pct)));
    const OTHER_L = LABEL.map(x => x[0]).filter(id => !MICRO_L.includes(id) && !MAIN_L.includes(id)), has = ids => ids.some(k => n2(L0.pct[k]) > 0);
    box2.append(h('div', { class: 'lbl2', style: 'margin:4px 0 0' }, gl ? 'Skład z etykiety (g/l)' : 'Skład z etykiety (% masy)'), h('div', { class: 'grid' }, LABEL.filter(([id]) => MAIN_L.includes(id)).map(([id, l]) => inp(l, u, id, L0.pct))),
      h('details', { class: 'inner', style: 'margin-top:0', open: has(MICRO_L) }, h('summary', {}, 'Mikroelementy'), g3(MICRO_L)),
      h('details', { class: 'inner', style: 'margin-top:0', open: has(OTHER_L) }, h('summary', {}, 'Inny zapis: jony, P, K, Mg, Ca, siarka'), g3(OTHER_L)));
  }
  root.append(out);
  function drawRows() {
    box.innerHTML = ''; const R = rows(), keys = st.mode === 'micro' ? MIC : MAC, srcRows = [], srcNames = [];
    R.forEach((r, i) => {
      const tIn = h('input', { type: 'text', inputmode: 'decimal', value: r.t, 'aria-label': 'Cel ' + ionL(r.k), placeholder: '0' }); tIn.oninput = () => { r.t = tIn.value; save(); update(); };
      const sel = matSelect(r.src, v => { r.src = v; save(); drawRows(); update(); }, { ion: r.k, label: 'Sól dla ' + ionL(r.k),
        extra: st.mode === 'micro' ? s0 => { const ps = microProds(r.k); if (ps.length) s0.append(h('optgroup', { label: 'Gotowe mieszanki' }, ps.map(p => h('option', { value: 'p:' + p.id }, p.name + (p.unit === 'g' ? ' (proszek)' : ' (płyn)'))))); } : null });
      const pr = String(r.src).startsWith('p:') ? productById(r.src.slice(2)) : null, also = pr ? MIC.filter(e => e !== r.k && pr.ppm[e] > 0) : [];
      const mm0 = !pr && matOf(splitV(r.src).id), mnote = mm0 && mm0.note ? mm0.note : '';
      const hint0 = pr ? `Mieszanka – daje też ${also.map(ionL).join(', ')}. Wiersz dla nich dodaj tylko, gdy chcesz konkretną ilość.` : r.src === 'FeSO4|7' || r.src === 'FeSO4|1' || r.src === 'FeSO4|0' ? 'Bez chelatu Fe szybko się utlenia i wytrąca, szczególnie przy KH powyżej 3°dH.' : '', hint = hint0 || mnote;
      box.append(h('div', { class: 'nrow2' },
        h('div', { class: 'nr-top' }, h('span', { class: 'nkw' }, h('b', { class: 'nk' }, ionL(r.k)), rngTxt(r.k) ? h('small', {}, rngTxt(r.k)) : null), h('span', { class: 'inp' }, tIn, h('i', { class: 'unit' }, 'mg/l / tydz.')),
          h('button', { class: 'xbtn', type: 'button', 'aria-label': 'Usuń ' + ionL(r.k), onclick: () => { R.splice(i, 1); save(); drawRows(); update(); } }, '×')),
        hint ? h('small', { class: 'nr-hint' }, hint) : null));
      srcRows.push(h('div', { class: 'srcrow' }, h('b', { class: 'srck' }, ionL(r.k)), h('span', { class: 'inp src' }, sel)));
      srcNames.push(pr ? pr.name : matName(splitV(r.src).id, splitV(r.src).hyd));
    });
    const miss = keys.filter(k => !R.some(r => r.k === k));
    if (miss.length) box.append(h('div', { class: 'chips addrow' }, miss.map(k => h('button', { class: 'chip add', type: 'button', onclick: () => { R.push({ k, t: NUTR_DEF[k][0], src: NUTR_DEF[k][1] }); save(); drawRows(); update(); } }, '+ ' + ionL(k)))));
    if (srcRows.length) box.append(h('details', { class: 'inner srcbox', open: state.adv }, h('summary', {}, 'Z jakich soli: ' + srcNames.join(', ')), h('div', { class: 'srclist' }, srcRows)));
    if (st.mode === 'make' && st.preset === 'ei') { const E = CLONE.DIY_PRESETS.ei;
      box.append(h('div', { class: 'note' }, 'EI (Estimative Index): ' + E.note + ' Fe 0,5 mg/l tygodniowo ustawione w zakładce Mikro. Podmiana ok. 50% raz w tygodniu, bo EI daje nadmiar.')); }
    if (st.mode === 'make' && ['low', 'mid', 'high'].includes(st.preset)) box.append(h('div', { class: 'note' }, 'Orientacyjne cele tygodniowe dla ' + { low: 'słabego', mid: 'średniego', high: 'mocnego' }[st.preset] + ' oświetlenia i CO₂ – dopasuj do własnych pomiarów i roślin.'));
  }
  // szybki przepis: ustawia cele (Makro) albo skład butelki (Sprawdź), dawkę i zakładkę
  function applyPreset(id) {
    const bottle = F.n('bottle') || 500, V = F.n('V') || t.V;
    if (id === 'pmdd') { st.mode = 'check'; st.items = pmddItems(bottle); }
    else if (id === 'ppspro') { const Pp = CLONE.DIY_PRESETS.ppspro; st.mode = 'check'; st.items = CLONE.presetScale(Pp, bottle); st.dose = String(+(Pp.doseMl * V / Pp.perLiters).toFixed(1)).replace('.', ','); st.n = '7'; }
    else { const E = CLONE.DIY_PRESETS.ei, pr = C.PRESETS[id], week = id === 'ei' ? E.week : { NO3: pr.NO3, PO4: pr.PO4, K: pr.K, Mg: pr.Mg }, fe = id === 'ei' ? E.weekMicro.Fe : pr.Fe;
      st.mode = 'make'; st.rows = Object.entries(week).map(([k, v]) => ({ k, t: String(v).replace('.', ','), src: NUTR_DEF[k][1] })); if (id === 'ei') st.n = String(E.n);
      const m = st.mrows.find(r => r.k === 'Fe'); if (m) m.t = String(fe).replace('.', ','); else st.mrows.push({ k: 'Fe', t: String(fe).replace('.', ','), src: NUTR_DEF.Fe[1] });
      const d = fitDose(st.rows, +st.n || 7, bottle, V); if (d !== F.n('dose')) st.dose = String(d).replace('.', ','); }
    st.preset = id; save(); render();
  }
  // najmniejsza dawka (ml), przy której żadna sól nie przekracza 80% rozpuszczalności (stężenie w butelce zależy od dawki, nie od butelki)
  function fitDose(R, n, bottle, V) {
    const d0 = F.n('dose') || 10, rowsOf = d => X.solution(X.planBottle({ rows: R, V, bottle, dose: d, n, custom: state.salts, prodOf: productById }).items, bottle, state.salts).rows, fx = X.solFix(rowsOf(d0));
    if (fx.level === 'ok') return d0;
    const d = X.roundUp(d0 * fx.factor, d0 * fx.factor <= 20 ? 0.5 : 1); return d <= bottle * 0.25 ? d : d0;
  }
  function addSep(title, list) {
    return h('div', { class: 'addsep', role: 'note' }, h('b', {}, title), h('ul', {}, list.map(([what, why]) => h('li', {}, h('strong', {}, what), ' – ', why))));
  }
  // konflikt soli w jednej butelce → propozycja podziału: A – bez Ca i metali, B – Ca, Fe i mikro
  function splitHint(items, sol, bottle) {
    const META = ['Ca', 'Fe', 'Mn', 'Zn', 'Cu', 'Co', 'B', 'Mo'], c = sol.conc, pos = k => (c[k] || 0) > 0;
    if (!((pos('Ca') && (pos('PO4') || pos('SO4'))) || (pos('PO4') && META.some(k => k !== 'Ca' && pos(k))))) return null;
    const has = i => { const m = matOf(i.mat); if (!m) return false; const f = X.fractions(m, i.hyd || 0); return META.some(k => f[k] > 0); };
    const B = items.filter(has), A = items.filter(i => !has(i)); if (!A.length || !B.length) return null;
    const line = l => l.map(i => `${matName(i.mat, i.hyd)} ${gfmt(i.g)} g`).join(', ');
    return addSep('Podziel na dwie butelki', [['Butelka A', `${line(A)} – uzupełnij do ${fnum(bottle, 0)} ml`], ['Butelka B', `${line(B)} – uzupełnij do ${fnum(bottle, 0)} ml`], ['Dawkowanie', 'tyle samo ml z każdej butelki, najlepiej w osobnych chwilach (albo wlewaj kolejno do akwarium, nie do jednego kubka)']]);
  }
  function drawItems() {
    box.innerHTML = '';
    st.items.forEach((it, i) => {
      const sel = matSelect(it.mat + '|' + (it.hyd || 0), v => { const s = splitV(v); it.mat = s.id; it.hyd = s.hyd; save(); update(); }, { label: 'Sól ' + (i + 1), short: true });
      const g = h('input', { type: 'text', inputmode: 'decimal', value: it.g ? String(it.g).replace('.', ',') : '', placeholder: '0', 'aria-label': 'Masa ' + (i + 1) });
      g.oninput = () => { it.g = n2(g.value) || 0; save(); update(); };
      box.append(h('div', { class: 'srow' }, h('span', { class: 'inp' }, sel), h('span', { class: 'inp' }, g, h('i', { class: 'unit' }, 'g')),
        h('button', { class: 'xbtn', type: 'button', 'aria-label': 'Usuń', onclick: () => { st.items.splice(i, 1); save(); drawItems(); update(); } }, '×')));
      const mn = (matOf(it.mat) || {}).note; if (mn) box.append(h('small', { class: 'nr-hint' }, mn));
    });
    box.append(h('div', { class: 'chips', style: 'margin:0' }, h('button', { class: 'chip add', type: 'button', onclick: () => { st.items.push({ mat: 'KCl', hyd: 0, g: 0 }); save(); drawItems(); } }, '+ Sól'),
      h('button', { class: 'chip', type: 'button', onclick: () => { st.items = DEF_ITEMS(); st.preset = ''; save(); drawItems(); update(); } }, 'Wyczyść')));
    if (st.preset === 'ppspro') { const b = F.n('bottle') || 500;
      box.append(h('div', { class: 'note' }, `PPS-Pro makro przeliczone na ${fnum(b, 0)} ml; dawka 1 ml na 40 l codziennie.`),
        addSep('Dodaj osobno', [['Mikro (CSM+B)', `${fnum(29 * b / 500, 1)} g na ${fnum(b, 0)} ml, osobna butelka, ta sama dawka (1 ml / 40 l dziennie)`], ['Wapń (GH)', 'gdy woda jest miękka – osobno, nie z siarczanami ani fosforanami'], ['KH', 'gdy brakuje – np. KHCO₃ osobno']])); }
    if (st.preset === 'pmdd') { const b = F.n('bottle') || 500, { hcl, ocet, cit } = pmddAcid(b);
      box.append(h('div', { class: 'note' }, `PMDD przeliczony na butelkę ${fnum(b, 0)} ml. Sole rozpuszczaj w osobnych porcjach wody demineralizowanej, zacznij od EDTA. Przechowuj w ciemności.`),
        h('div', { html: alertH('bad', `Na koniec: ${fnum(hcl, 1)} ml kwasu solnego 36% – żrący, z oparami. Okulary, rękawice, wentylacja, kwas dodawaj do wody (nigdy odwrotnie), odmierzaj strzykawką.`) }),
        h('div', { class: 'addsep' }, h('b', {}, 'Słabszy kwas zamiast HCl'), h('div', {}, `Kwas cytrynowy (proszek, monohydrat): ok. ${fnum(cit, 1)} g, albo ocet 10%: ok. ${fnum(ocet, 0)} ml (tyle samo H⁺ co w HCl). Słabszy kwas daje wyższe pH, więc sprawdź papierkiem i dodaj trochę więcej, jeśli roztwór mętnieje. Ocet dodaje węgiel organiczny – roztwór szybciej się psuje, trzymaj go w lodówce.`)),
        addSep('Dodaj osobno', [['Kwas (HCl albo słabszy zamiennik)', `na koniec do tej butelki – patrz ostrzeżenie wyżej`], ['Fosfor (KH₂PO₄)', 'osobna butelka – z żelazem w jednej wytrąca się'], ['Wapń (GH)', 'gdy woda jest miękka – osobno']])); }
    }
  // kwas do PMDD na butelkę: HCl 36% (ml) i słabsze zamienniki – ocet 10% (ml) i kwas cytrynowy (g), tyle samo H⁺
  function pmddAcid(b) { const hcl = 2 * b / 1000, mmol = hcl * 1.179 * 0.36 / 36.461 * 1000; return { hcl, ocet: mmol / (1.0125 * 0.10 / 60.05 * 1000), cit: mmol * 210.14 / 1000 }; }
  // sól nie rozpuści się (over) albo jest blisko nasycenia (near): wyjaśnienie i poprawka jednym dotknięciem
  function fixCard(fx, { mode, bottle, dose, n }) {
    const w = fx.worst, btns = [], set = (id, v) => { F.set(id, String(v).replace('.', ',')); update(); };
    let note = '';
    if (mode === 'check') { const b = X.roundUp(bottle * fx.factor, 50); btns.push([`Rozpuść w ${fnum(b, 0)} ml`, () => set('bottle', b)]); }
    else {
      const d = X.roundUp(dose * fx.factor, dose * fx.factor <= 20 ? 0.5 : 1), nn = Math.ceil(n * fx.factor - 1e-9);
      if (d <= bottle * 0.25) btns.push([`Ustaw dawkę ${fnum(d, 1)} ml`, () => set('dose', d)]);
      if (nn > n && nn <= 7) btns.push([`Dawkuj ${nn}× w tygodniu`, () => set('n', nn)]);
      if (mode === 'make' && w.mat === 'K2SO4' && rows().some(r => r.k === 'K' && r.src === 'K2SO4|0')) {
        btns.push(['Potas z KCl zamiast K₂SO₄', () => { rows().forEach(r => { if (r.k === 'K' && r.src === 'K2SO4|0') r.src = 'KCl|0'; }); save(); drawRows(); update(); }]);
        note = 'Chlorek potasu rozpuszcza się około trzy razy lepiej, ale dodaje chlorki (w akwarium roślinnym zwykle nieszkodliwe).'; }
    }
    const over = fx.level === 'over', gl = fnum(w.gl, 0);
    const body = over ? `Wychodzi ${gl} g/l, a ${w.formula} rozpuszcza się najwyżej ok. ${fnum(fx.limitGL, 0)} g/l (w 20 °C). Bezpiecznie to ${fnum(fx.safeGL, 0)} g/l.`
      : `${gl} g/l przy bezpiecznych ${fnum(fx.safeGL, 0)} g/l. W chłodnym pomieszczeniu sól może zacząć wypadać na dno.`;
    const why = mode === 'check' ? 'Rozpuść te same gramy w większej ilości wody.' : 'Większa butelka nie pomoże – stężenie zależy od tego, ile ml dawkujesz w tygodniu (dawka × liczba dawek).';
    return h('section', { class: 'fixcard ' + fx.level, role: 'alert' }, h('h3', {}, over ? `${w.formula}: tak się nie uda` : `${w.formula}: ${fnum(fx.ratio * 100, 0)}% rozpuszczalności`),
      h('p', {}, `${body} ${why}`),
      btns.length ? h('div', { class: 'chips' }, btns.map(([tx, fn]) => h('button', { class: 'chip', type: 'button', onclick: fn }, tx))) : h('p', {}, 'Ta sól jest za słabo rozpuszczalna na koncentrat – wybierz inne źródło albo dawkuj ją osobno.'),
      note ? h('p', { class: 'fixnote' }, note) : null);
  }
  function update() {
    out.innerHTML = '';
    const V = F.n('V'), n = Math.round(F.n('n'));
    if (st.mode === 'shop') { if (!(V > 0)) { out.innerHTML = alertH('warn', 'Uzupełnij pojemność akwarium.'); return; } return updShop(V); }
    if (liquid()) { if (!(V > 0 && n > 0)) { out.innerHTML = alertH('warn', 'Uzupełnij akwarium i liczbę dawek.'); return; } return updLiquid(V, n); }
    const bottle = F.n('bottle'), dose = F.n('dose');
    if (!(V > 0 && bottle > 0 && dose > 0 && n > 0)) { out.innerHTML = alertH('warn', 'Uzupełnij akwarium, butelkę, dawkę i liczbę dawek.'); return; }
    if (dose > bottle) { out.innerHTML = alertH('warn', 'Dawka większa niż butelka.'); return; }
    const days = fnum(bottle / dose / n * 7, 0), doses = fnum(bottle / dose, 0);
    if (st.mode === 'prep') return updPrep(V, bottle, dose, n, days, doses);
    let items, sol, fx, warn = [], prodItems = [], edtaBox = null, plan = null;
    const fixBox = h('div'), top = h('div'); out.append(fixBox, top); // wyżej niż wynik: poprawka i błędy krytyczne
    const showFix = () => { if (fx.level !== 'ok') fixBox.append(fixCard(fx, { mode: st.mode, bottle, dose, n })); };
    if (st.mode === 'make' || st.mode === 'micro') {
      plan = X.planBottle({ rows: rows(), V, bottle, dose, n, custom: state.salts, prodOf: productById, edta: st.mode === 'micro' ? st.edta : '' });
      ({ items, prodItems } = plan);
      if (!items.length && !prodItems.length) { out.append(h('p', { class: 'note' }, 'Wpisz cel.')); return; }
      const tiny = items.filter(i => i.g < 0.1); if (tiny.length) warn.push(['info', `${tiny.map(i => matName(i.mat, i.hyd) + ' ' + gfmt(i.g) + ' g').join(', ')} – trudno odważyć zwykłą wagą (0,01 g). Zrób większą butelkę albo roztwór pośredni.`]);
      if (st.mode === 'micro' && plan.mol > 0) { const kinds = [['', 'Bez'], ['Na2EDTA', 'Na₂EDTA·2H₂O'], ['Na4EDTA', 'Na₄EDTA·2H₂O']];
        edtaBox = h('section', { class: 'card flat' }, h('h2', {}, 'Chelatowanie'), h('p', { class: 'note', style: 'margin:0 0 10px' }, 'Bez chelatu metale wytrącają się w wodzie z KH. EDTA: 1 mol na 1 mol Fe, Mn, Zn, Cu, Co.'),
          h('div', { class: 'chips', style: 'margin:0' }, kinds.map(([v, l]) => h('button', { class: 'chip' + ((st.edta || '') === v ? ' on' : ''), type: 'button', onclick: () => { st.edta = v; save(); update(); } }, l)))); }
      sol = X.solution(items, bottle, state.salts); fx = X.solFix(sol.rows);
      for (const { prod, a } of prodItems) { for (const k in prod.ppm) if (prod.ppm[k] > 0) sol.conc[k] = (sol.conc[k] || 0) + prod.ppm[k] * a / bottle;
        if (prod.unit === 'g' && a < 0.1) warn.push(['info', `${esc(prod.name)} ${gfmt(a)} g – trudno odważyć. Zrób większą butelkę.`]);
        if (prod.status === 'unverified') warn.push(['info', `${esc(prod.name)}: skład orientacyjny (producent nie publikuje pełnego) – porównaj z etykietą.`]); }
      const mlIn = prodItems.filter(i => i.prod.unit !== 'g').reduce((s1, i) => s1 + i.a, 0);
      if (mlIn >= bottle) warn.push(['bad', `Płynne preparaty to ${gfmt(mlIn)} ml – nie zmieszczą się w butelce ${fnum(bottle, 0)} ml.`]);
      plan.notes.filter(x => x.sev !== 'info').forEach(x => warn.push([x.sev, esc(x.t)]));
      showFix();
      // przy soli, która się nie rozpuści, nie pokazujemy gramów do odważenia – dopiero po poprawce
      if (fx.level !== 'over') out.append(slab(`Odważ do butelki ${fnum(bottle, 0)} ml`, [...items.map(i => [matName(i.mat, i.hyd), gfmt(i.g), ' g']), ...prodItems.map(i => [esc(i.prod.name), gfmt(i.a), ' ' + (i.prod.unit === 'g' ? 'g' : 'ml')])], `Uzupełnij ${sol.conc.PO4 > 0 || sol.conc.Fe > 0 ? 'wodą RO lub destylowaną' : 'wodą'} do ${fnum(bottle, 0)} ml. Wystarczy na ${doses} dawek, ${days} dni.`));
    } else {
      items = st.items.filter(i => i.g > 0); sol = X.solution(st.items, bottle, state.salts); fx = X.solFix(sol.rows);
      if (!items.length) { out.append(h('p', { class: 'note' }, 'Wpisz gramy soli.')); return; }
      showFix();
    }
    const p = X.doseToPpm(sol.conc, dose, V), ks = X.ION_ORDER.filter(k => p[k] > 0.00005), main = ks.filter(k => !SIDE_IONS.includes(k)), side = ks.filter(k => !main.includes(k));
    const eff = h('section', { class: 'card flat' }, h('h2', {}, 'Tygodniowo w akwarium', h('span', { class: 'unit2' }, 'mg/l')),
      h('div', { html: nutGrid(main.map(k => weekTile(k, p[k] * n, p[k]))) + (main.some(k => WEEK_RANGE[k]) ? whyH('Co znaczy „typowo”', RNG_NOTE) : '') +
        `<div class="note">Dawka = ${fnum(dose, 1)} ml, ${n}× w tygodniu.</div>` +
        (side.length ? `<div class="note">Dodatkowo tygodniowo: ${side.map(k => `${ionL(k)} ${gfmt(p[k] * n)}`).join(', ')} mg/l</div>` : '') +
        (st.mode === 'check' ? `<div class="note">${doses} dawek, ${days} dni</div>` : '') + solMeters(sol.rows) }));
    if (st.mode === 'check') {
      out.append(slab('Tygodniowo w akwarium', main.map(k => [ionL(k), gfmt(p[k] * n), ' mg/l']), `Dawka ${fnum(dose, 1)} ml: ${main.map(k => `${ionL(k)} ${gfmt(p[k])}`).join(', ')} mg/l. ${doses} dawek, ${days} dni.`));
      const T0 = P.targetsOf(t), hiK = main.filter(k => T0[k] && p[k] * n > 2 * T0[k][1]);
      if (hiK.length) warn.push(['warn', `Za dużo tygodniowo: ${hiK.map(k => `${ionL(k)} ${gfmt(p[k] * n)} (cel do ${gfmt(T0[k][1])})`).join(', ')} mg/l. Zmniejsz dawkę.`]);
    }
    else { if (edtaBox) out.append(edtaBox); out.append(eff); }
    { const ex = extrasCard(p, n); if (ex) out.append(ex); }
    if (st.mode === 'check' && side.length) out.append(h('p', { class: 'note' }, `Dodatkowo tygodniowo: ${side.map(k => `${ionL(k)} ${gfmt(p[k] * n)}`).join(', ')} mg/l`));
    if (st.mode === 'check') { const m = h('div', { html: solMeters(sol.rows) }); out.append(m); }
    if ((p.NH4 || 0) * n > 1) warn.push(['bad', 'NH₄ > 1 mg/l tygodniowo.']);
    sol.warn.filter(w => !(fx.level !== 'ok' && /^sol_/.test(w.code || ''))).forEach(w => warn.push([w.sev, w.t]));
    const spl = splitHint(items, sol, bottle);
    if ((p.Cu || 0) * n > 0.01 && P.PROFILES[t.type].shrimp) warn.push(['bad', 'Cu – toksyczne dla krewetek.']);
    top.innerHTML = warn.filter(w => w[0] === 'bad').map(([s1, t1]) => alertH(s1, t1)).join('');
    const rest = warn.filter(w => w[0] !== 'bad');
    if (rest.length) out.append(h('div', { html: rest.map(([s1, t1]) => alertH(s1, t1)).join('') }));
    if (spl) out.append(spl);
    if (st.mode === 'make') out.append(addSep('Dodaj osobno', [['Mikro i żelazo', 'zakładka Mikro, osobna butelka – żelazo z fosforanami się wytrąca'], ...(rows().some(r1 => r1.k === 'Ca') ? [] : [['Wapń (GH)', 'gdy woda jest miękka – osobno, nie z siarczanami ani fosforanami']])]));
    if (st.mode === 'micro') out.append(addSep('Dodaj osobno', [['Makro (NO₃, PO₄, K, Mg)', 'zakładka Makro, osobna butelka – fosforany nie mogą być razem z żelazem']]));
    // co kupić: na wybrany okres, z tej butelki
    { const f = bottle / (dose * n), bp = plan || { weekly: { items: items.map(i => ({ mat: i.mat, hyd: i.hyd || 0, g: i.g / f })), prods: [] } };
      let extra = []; if (st.mode === 'check' && st.preset === 'pmdd') { const a = pmddAcid(bottle), nb = buyWeeks(st) / f;
        extra = [{ name: 'Do zakwaszenia: ocet spożywczy 10%', text: `ok. ${fnum(Math.ceil(a.ocet * nb / 10) * 10, 0)} ml`, warn: true,
          hint: `Albo kwas cytrynowy (ok. ${fnum(Math.ceil(a.cit * nb), 0)} g). Kwas solny tylko z okularami, rękawicami i wentylacją – żrący, z oparami.` }]; }
      const bc = buyCard(st, X.shopLines([bp], buyWeeks(st)), { extra, redraw: update, note: `Policzone z celów tygodniowych dla ${fnum(V, 0)} l, zaokrąglone w górę. Wszystko razem, plus waga i butelki: zakładka Zakupy.` });
      if (bc) out.append(bc); }
    out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
        if (!prodItems.length) return quickRecipe(items, bottle);
        const name = prompt('Nazwa nawozu:', 'Mój nawóz mikro'); if (!name) return;
        const ppm = Object.fromEntries(Object.entries(sol.conc).filter(([, v]) => v > 0).map(([k, v]) => [k, +v.toPrecision(6)]));
        state.products.push({ id: uid('u'), name: name.slice(0, 60), unit: 'ml', ppm, kind: 'micro', source: 'user', status: 'label', note: [...items.map(i => `${matName(i.mat, i.hyd)} ${gfmt(i.g)} g`), ...prodItems.map(i => `${i.prod.name} ${gfmt(i.a)} ${i.prod.unit}`)].join(', ') + ` w ${fnum(bottle, 0)} ml` });
        save(); toast('Zapisano: ' + name); } }, 'Zapisz jako nawóz'),
      st.mode !== 'check' && !prodItems.length ? h('button', { class: 'btn link', onclick: () => { st.items = items.map(i => ({ mat: i.mat, hyd: i.hyd, g: +i.g.toFixed(2) })); st.mode = 'check'; save(); render(); } }, 'Sprawdź ten skład') : null));
  }
  // zakładka Zakupy: wszystko z celów Makro i Mikro razem + wyposażenie
  function updShop(V) {
    const bottle = F.n('bottle') || 500, dose = F.n('dose') || 10, nn = Math.round(F.n('n')) || 7;
    const sets = [['Makro', st.rows], ['Mikro', st.mrows]].map(([lab, R]) => [lab, R.filter(r => n2(r.t) > 0)]).filter(([, R]) => R.length);
    const plans = sets.map(([lab, R]) => X.planBottle({ rows: R, V, bottle, dose, n: nn, custom: state.salts, prodOf: productById, edta: lab === 'Mikro' ? st.edta : '' }));
    if (!plans.length) { out.append(h('p', { class: 'note' }, 'Najpierw ustaw, ile czego dodawać tygodniowo – w Makro i Mikro. Lista zakupów policzy się sama.'),
      h('div', { class: 'chips' }, [['make', 'Ustaw Makro'], ['micro', 'Ustaw Mikro']].map(([m, tx]) => h('button', { class: 'chip', type: 'button', onclick: () => { st.mode = m; save(); render(); } }, tx)))); return; }
    const card1 = buyCard(st, X.shopLines(plans, buyWeeks(st)), { redraw: update, title: 'Lista zakupów', note: `Z celów tygodniowych (${sets.map(s => s[0]).join(' + ')}) dla ${fnum(V, 0)} l, zaokrąglone w górę. Zmienisz je w zakładkach Makro i Mikro.` });
    if (card1) out.append(card1);
    out.append(buyGear(plans.length), h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', onclick: () => go('zbiornik') }, 'Zapasy i ceny: Akwarium')));
  }
  function updLiquid(V, n) {
    const P0 = st.prep, pr = prepProduct();
    if (!pr || !pr.ppm || !Object.keys(pr.ppm).length) { out.append(h('p', { class: 'note' }, P0.pid === '__custom' ? 'Wpisz skład z etykiety.' : 'Ten preparat nie ma składu – uzupełnij go w Nawozach.')); return; }
    const ks = X.ION_ORDER.filter(k => pr.ppm[k] / V > 0.00005), per1 = Object.fromEntries(ks.map(k => [k, pr.ppm[k] / V])), warn = [];
    out.append(h('section', { class: 'card flat' }, h('h2', {}, `1 ml na ${fnum(V, 0)} l`, h('span', { class: 'unit2' }, 'mg/l')), h('div', { html: nutGrid(ks.map(k => ({ l: ionL(k), v: gfmt(per1[k]), hl: k === P0.el }))) })));
    let d;
    if (P0.way === 'target') { const T = n2(P0.t), c = per1[P0.el]; if (!(T > 0) || !(c > 0)) { out.append(h('p', { class: 'note' }, 'Wpisz cel tygodniowy.')); return; } d = T / (c * n); }
    else { d = n2(P0.ldose); if (!(d > 0)) { out.append(h('p', { class: 'note' }, 'Wpisz dawkę.')); return; } }
    if (P0.way === 'target') out.append(slab('Dawkuj', [[esc(pr.name), gfmt(d), ' ml']], `${n}× w tygodniu, razem ${gfmt(d * n)} ml na tydzień.`));
    out.append(h('section', { class: 'card flat' }, h('h2', {}, 'Tygodniowo w akwarium', h('span', { class: 'unit2' }, 'mg/l')),
      h('div', { html: nutGrid(ks.map(k => weekTile(k, per1[k] * d * n, per1[k] * d, k === P0.el))) }), h('p', { class: 'note' }, `Dawka ${gfmt(d)} ml, ${n}× w tygodniu.`), h('div', { html: whyH('Co znaczy „typowo”', RNG_NOTE) })));
    { const pd = Object.fromEntries(ks.map(k => [k, per1[k] * d])), ex = extrasCard(pd, n); if (ex) out.append(ex); }
    if (d < 0.1) warn.push(['info', `${gfmt(d)} ml – trudno odmierzyć. Rozcieńcz preparat albo dawkuj rzadziej.`]);
    if ((per1.Cu || 0) * d * n > 0.01 && P.PROFILES[t.type].shrimp) warn.push(['bad', 'Cu – toksyczne dla krewetek.']);
    if ((per1.NH4 || 0) * d * n > 1) warn.push(['bad', 'NH₄ > 1 mg/l tygodniowo.']);
    const T0 = P.targetsOf(t), hiK = ks.filter(k => T0[k] && per1[k] * d * n > 2 * T0[k][1]);
    if (hiK.length) warn.push(['warn', `Za dużo tygodniowo: ${hiK.map(k => `${ionL(k)} ${gfmt(per1[k] * d * n)} (cel do ${gfmt(T0[k][1])})`).join(', ')} mg/l.`]);
    if (pr.status === 'unverified') warn.push(['info', 'Skład orientacyjny (producent nie publikuje pełnego) – porównaj z etykietą.']);
    if (warn.length) out.append(h('div', { html: warn.map(([s1, t1]) => alertH(s1, t1)).join('') }));
    const amt = +d.toPrecision(3);
    out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      let pid = pr.id;
      if (pr.custom) { const name = prompt('Nazwa nawozu:', 'Nawóz z etykiety'); if (!name) return; pid = uid('u'); state.products.push({ id: pid, name: name.slice(0, 60), unit: 'ml', ppm: Object.fromEntries(Object.entries(pr.ppm).map(([k, v]) => [k, +v.toPrecision(6)])), source: 'user', status: 'label', pct: { ...P0.lab.pct }, dens: n2(P0.lab.dens) }); }
      const tk = tank(); tk.fplan ||= []; const ex = tk.fplan.find(x => x.pid === pid);
      if (ex) { ex.amt = amt; ex.n = n; } else tk.fplan.push({ pid, amt, n });
      save(); toast(`Dodano do nawożenia: ${amt} ml × ${n}/tydz.`);
    } }, 'Dodaj do nawożenia akwarium')));
  }
  function updPrep(V, B, d, n, days, doses) {
    const P0 = st.prep, pr = prepProduct();
    if (!pr || !pr.ppm || !Object.keys(pr.ppm).length) { out.append(h('p', { class: 'note' }, P0.pid === '__custom' ? 'Wpisz skład z etykiety.' : 'Ten preparat nie ma składu – uzupełnij go w Nawozach.')); return; }
    let A;
    if (P0.way === 'target') { const T = n2(P0.t), c = pr.ppm[P0.el]; if (!(T > 0) || !(c > 0)) { out.append(h('p', { class: 'note' }, 'Wpisz cel tygodniowy.')); return; } A = T * V * B / (c * d * n); }
    else { A = n2(P0.amt); if (!(A > 0)) { out.append(h('p', { class: 'note' }, 'Wpisz, ile preparatu dajesz do butelki.')); return; } }
    const u = pr.unit === 'g' ? 'g' : 'ml', per = {}; for (const k in pr.ppm) per[k] = pr.ppm[k] * A * d / B / V;
    const ks = X.ION_ORDER.filter(k => per[k] > 0.00005), warn = [];
    out.append(slab(`Do butelki ${fnum(B, 0)} ml`, [[esc(pr.name), gfmt(A), ' ' + u]], (u === 'g' ? `Rozpuść w wodzie RO lub destylowanej i uzupełnij do ${fnum(B, 0)} ml.` : `Odmierz, dolej wody RO lub destylowanej do ${fnum(B, 0)} ml.`) + ` ${doses} dawek, ${days} dni.`));
    out.append(h('section', { class: 'card flat' }, h('h2', {}, 'Tygodniowo w akwarium', h('span', { class: 'unit2' }, 'mg/l')),
      h('div', { html: nutGrid(ks.map(k => weekTile(k, per[k] * n, per[k], k === P0.el))) }), h('p', { class: 'note' }, `Dawka = ${fnum(d, 1)} ml, ${n}× w tygodniu.`), h('div', { html: whyH('Co znaczy „typowo”', RNG_NOTE) })));
    { const ex = extrasCard(per, n); if (ex) out.append(ex); }
    if (u === 'ml' && A >= B) warn.push(['bad', `${gfmt(A)} ml preparatu nie zmieści się w butelce ${fnum(B, 0)} ml. Zwiększ dawkę albo dawkuj preparat bez rozcieńczania.`]);
    else if (u === 'ml' && A > B * 0.5) warn.push(['info', 'Preparat to ponad połowa butelki – możesz dawkować go nierozcieńczonego.']);
    if (u === 'g' && A < 0.2) warn.push(['warn', `${gfmt(A)} g – za mało do odważenia zwykłą wagą. Zrób większą butelkę albo rzadsze dawki.`]);
    if (u === 'g' && A / B * 1000 > 200) { const gl = A / B * 1000, dn = X.roundUp(d * gl / 150, d * gl / 150 <= 20 ? 0.5 : 1);
      warn.push(['warn', `${fnum(gl, 0)} g/l – może się nie rozpuścić. Większa butelka tu nie pomoże (stężenie zależy od dawki): ustaw dawkę ok. ${fnum(dn, 1)} ml albo dawkuj częściej.`]); }
    if ((per.Cu || 0) * n > 0.01 && P.PROFILES[t.type].shrimp) warn.push(['bad', 'Cu – toksyczne dla krewetek.']);
    if ((per.NH4 || 0) * n > 1) warn.push(['bad', 'NH₄ > 1 mg/l tygodniowo.']);
    const T0 = P.targetsOf(t), hiK = ks.filter(k => T0[k] && per[k] * n > 2 * T0[k][1]);
    if (hiK.length) warn.push(['warn', `Za dużo tygodniowo: ${hiK.map(k => `${ionL(k)} ${gfmt(per[k] * n)} (cel do ${gfmt(T0[k][1])})`).join(', ')} mg/l.`]);
    if (pr.status === 'unverified') warn.push(['info', 'Skład orientacyjny (producent nie publikuje pełnego) – porównaj z etykietą.']);
    if (warn.length) out.append(h('div', { html: warn.map(([s1, t1]) => alertH(s1, t1)).join('') }));
    out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      const name = prompt('Nazwa nawozu:', pr.name + ' – rozrobiony'); if (!name) return;
      const ppm = {}; for (const k in pr.ppm) if (pr.ppm[k] > 0) ppm[k] = +(pr.ppm[k] * A / B).toPrecision(6);
      state.products.push({ id: uid('u'), name: name.slice(0, 60), unit: 'ml', ppm, source: 'user', status: pr.status === 'unverified' ? 'unverified' : 'label', note: `${gfmt(A)} ${u} ${pr.name} w ${fnum(B, 0)} ml` });
      save(); toast('Zapisano: ' + name);
    } }, 'Zapisz jako nawóz')));
  }  update();
  root.append(h('div', { class: 'foot-links' }, h('button', { class: 'linkbtn', onclick: () => go('narzedzia') }, 'Więcej narzędzi'), h('button', { class: 'linkbtn', onclick: () => go('nawozy/moje') }, 'Baza nawozów')));
  { const kids = [...root.children], isHead = (k, i) => i < 2 || k.classList.contains('presetbar'), head = kids.filter(isHead), L = h('div', { class: 'col-in' }), R = h('div', { class: 'col-out' });
    const foot = kids[kids.length - 1]; kids.slice(0, -1).filter((k, i) => !isHead(k, i)).forEach(k => (k === out ? R : L).append(k)); root.append(...head, h('div', { class: 'cols' }, L, R), foot); }
};

if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== PRO – wspólne: sole, nazwy surowców, własne sole i drobne pomocnicze. Kolejne pliki PRO: receptury.js, woda.js, kalk-*.js, nawozenie.js, pomoc.js ===== */
/* Obliczenia: chem.js (CHEM), logika: logic.js (P). */
const X = CHEM;
const HYDW = { 0: tl('bezwodny'), 0.5: tl('półwodny'), 1: tl('jednowodny'), 1.5: tl('półtorawodny'), 2: tl('dwuwodny'), 2.5: tl('2,5-wodny'), 3: tl('trójwodny'), 4: tl('czterowodny'), 5: tl('pięciowodny'), 6: tl('sześciowodny'), 7: tl('siedmiowodny'), 10: tl('dziesięciowodny') };
const GRP = [['makro', tl('Makro (N, P, K, Mg, Ca)')], ['bufor', tl('KH / bufor')], ['chelat', tl('Chelaty')], ['mikro', tl('Sole mikro')], ['inne', tl('Inne')]];
const ionL = k => (X.ION[k] ? X.ION[k].l : ({ N: tl('N (całk.)'), P: 'P', S: 'S', GH: 'GH', KH: 'KH' }[k] || k));
const pf = (v, d = 2) => fnum(v, d);
const matOf = id => X.mat(id, state.salts);
const splitV = v => { const [id, hh] = String(v || '').split('|'); return { id, hyd: +hh || 0 }; };
const matName = (id, hyd = 0) => { const m = matOf(id); return m ? X.formulaOf(m, hyd) : tl('(usunięta sól)'); };
// nazwa pozycji (sól albo chelat z zawartością z etykiety it.pct)
const itName = it => it.fert ? it.fert.name : it.pct ? X.formulaOf(X.itemMat(it, state.salts) || { name: tl('(usunięta sól)') }) : matName(it.mat, it.hyd);
// gotowy nawóz w recepturze: kopia składu z chwili dodania (receptura liczy się dalej, nawet gdy nawóz zniknie z listy)
const fertSnap = p => ({ id: p.id, name: p.name, unit: p.unit === 'g' ? 'g' : 'ml', ppm: Object.fromEntries(Object.entries(p.ppm || {}).filter(([, v]) => v > 0)) });
const itUnit = it => it.fert && it.fert.unit !== 'g' ? 'ml' : 'g';
const itVal = it => it.fert ? 'p:' + it.fert.id : it.mat + '|' + (it.hyd || 0);
function setItVal(it, v) {
  if (String(v).startsWith('p:')) { const p = productById(v.slice(2)); if (!p) return; ['mat', 'hyd', 'purity', 'pct'].forEach(k => delete it[k]); it.fert = fertSnap(p); return; }
  const x = splitV(v); if (it.fert || x.id !== it.mat) delete it.pct; delete it.fert; it.mat = x.id; it.hyd = x.hyd; if (!(it.purity > 0)) it.purity = 100;
}
const recItem = i => i.fert ? { fert: fertSnap(i.fert), g: +(+i.g || 0).toFixed(4) } : { mat: i.mat, hyd: i.hyd || 0, purity: i.purity || 100, ...(i.pct ? { pct: i.pct } : {}), g: +(+i.g || 0).toFixed(4) };
const itLine = i => `${itName(i)} ${gfmt(i.g)} ${itUnit(i)}`;
// gotowe nawozy do listy składników receptury: najpierw mikro i żelazo, potem reszta (bez nawozów z moich receptur)
function fertExtra(it) {
  return s => {
    const ps = allProducts().filter(p => p.source !== 'recipe' && p.ppm && Object.values(p.ppm).some(v => v > 0)).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    const opt = p => h('option', { value: 'p:' + p.id }, p.name + (p.unit === 'g' ? ' (g)' : ' (ml)'));
    const mic = ps.filter(LICZ.isMicroSource), rest = ps.filter(p => !LICZ.isMicroSource(p));
    if (it && it.fert && !ps.some(p => p.id === it.fert.id)) s.append(h('option', { value: 'p:' + it.fert.id }, it.fert.name));
    if (mic.length) s.append(h('optgroup', { label: tl('Gotowe nawozy – mikro i żelazo') }, mic.map(opt)));
    if (rest.length) s.append(h('optgroup', { label: tl('Gotowe nawozy – inne') }, rest.map(opt)));
  };
}
const hydText = (m, hh) => m.pct ? '' : m.hyd && m.hyd.length > 1 ? ' (' + (HYDW[hh] || hh + ' H₂O') + ')' : '';

// lista soli do wyboru: każda forma uwodnienia jako osobna pozycja („MgSO₄·7H₂O – Siarczan magnezu, siedmiowodny”).
// value = 'id|nH2O' albo 'p:<id>' (produkt dodany przez o.extra), '' – brak wyboru (o.none). Zwraca { sel, form: null }.
function saltPicker(value, onChange, o = {}) {
  const fits = m => !o.ion || ((m.ions && m.ions[o.ion]) && !(o.ion === 'NH4' && m.grp === 'mikro')) || (m.pct && m.pct[o.ion]);
  const label = (m, hh) => X.formulaOf(m, hh) + ' – ' + m.name + (!m.pct && m.hyd && m.hyd.length > 1 ? ', ' + (HYDW[hh] || hh + ' H₂O') : '');
  const opts = (id, m) => (m.pct ? [0] : m.hyd || [0]).map(hh => h('option', { value: id + '|' + hh }, label(m, hh)));
  const s = h('select', { 'aria-label': o.label || tl('Sól') });
  for (const [g, gl] of GRP) { const items = Object.entries(X.MATERIALS).filter(([, m]) => m.grp === g && fits(m)); if (items.length) s.append(h('optgroup', { label: gl }, items.flatMap(([k, m]) => opts(k, m)))); }
  const mine = state.salts.filter(fits); if (mine.length) s.append(h('optgroup', { label: tl('Moje sole i surowce') }, mine.flatMap(m => opts(m.id, m))));
  if (o.extra) o.extra(s);
  if (o.none) s.prepend(h('option', { value: '' }, o.none));
  const v0 = String(value ?? ''); s.value = v0;
  if (s.value !== v0 && !v0.startsWith('p:')) { const { id } = splitV(v0), m = matOf(id); if (m) s.value = id + '|' + (m.def ?? (m.hyd || [0])[0]); }
  if (s.value === '' && !o.none && s.options.length) s.selectedIndex = 0;
  s.onchange = () => onChange(s.value);
  return { sel: s, form: null };
}
const selField = (label, el, hint) => h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inp' }, el), hint ? h('small', { class: 'hint' }, hint) : null);
const ionsOf = m => m ? Object.keys(m.pct || m.ions) : [];
const ppmRows = (ppm, keys) => (keys || X.ION_ORDER).filter(k => ppm[k] > 0.00005).map(k => [ionL(k), { v: gfmt(ppm[k]), big: 0 }]);
function derivedLine(ppm) {
  const d = X.derived(ppm), parts = [];
  if (d.N > 0) parts.push(`${tl('N {0} mg/l', gfmt(d.N))}`); if (d.P > 0) parts.push(`${tl('P {0} mg/l', gfmt(d.P))}`); if (d.S > 0) parts.push(`${tl('S {0} mg/l', gfmt(d.S))}`);
  if (d.GH > 0.005) parts.push(`GH +${fnum(d.GH, 2)}°dH`); if (d.KH > 0.005) parts.push(`KH +${fnum(d.KH, 2)}°dH`);
  return parts.length ? `<div class="note">${parts.join(' · ')}</div>` : '';
}
const pctOf = v => { const x = n2(v); return x > 0 && x <= 100 ? x : 100; };
const ASSUME = tl('1 mg/l = 1 ppm (woda słodka).');

// wątpliwości przy własnym wzorze: hydrat, pierwiastki bez jonu, jony wyjaśniają małą część masy
function saltDoubts(anh, water, ions, Ma, ionMass) {
  const out = [], same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => Math.abs(a[k] - (b[k] || 0)) < 1e-9); };
  const known = Object.entries(X.MATERIALS).find(([, m]) => m.el && same(m.el, anh));
  if (known) { const [, km] = known, hy = (km.hyd || []).filter(x => x > 0);
    if (!water && km.def > 0) out.push(`${tl('{0} w handlu to zwykle ·{1}H₂O, a wpisany wzór jest bezwodny. Dopisz wodę, jeśli masz hydrat (np. {2}·{3}H2O).', X.formulaOf(km, 0), String(km.def).replace('.', DEC), X.formulaOf(km, 0), km.def)}`);
    else if (water && hy.length && !hy.includes(water)) out.push(`${tl('Nietypowa liczba cząsteczek wody ({0}). Spotykane formy: {1}.', String(water).replace('.', DEC), hy.map(x => '·' + String(x).replace('.', DEC) + 'H₂O').join(', '))}`); }
  const covered = new Set(ions.flatMap(r => Object.keys(X.ION[r.k].el)));
  const missing = Object.keys(anh).filter(e => e !== 'H' && e !== 'O' && !covered.has(e));
  if (missing.length && ions.length) out.push(`${tl('We wzorze jest {0}, ale żaden wybrany jon go nie zawiera – brakuje jonu?', missing.join(', '))}`);
  if (ions.length && ionMass > 0 && ionMass < 0.85 * Ma) out.push(`${tl('Wybrane jony to tylko {0}% masy bezwodnej soli – sprawdź liczby jonów.', fnum(ionMass / Ma * 100, 0))}`);
  return out;
}
function editSalt(m0) {
  const isNew = !m0, m = m0 ? JSON.parse(JSON.stringify(m0)) : { id: uid('s'), name: '', formula: '', el: null, ions: {}, hyd: [0] };
  let kind = m.pct ? 'pct' : 'formula';
  const name = inputF(tl('Nazwa'), '', m.name, { type: 'text', max: 60, ph: tl('np. Fosforan dipotasowy') });
  const formula = inputF(tl('Wzór'), '', m.formula || '', { type: 'text', max: 60, ph: 'K2HPO4·3H2O' });
  const info = h('div', { class: 'note' }), kindBox = h('div'), fBox = h('div', { class: 'stack' }), rows = h('div', { class: 'stack' });
  // niejednoznaczny wzór → wymagane potwierdzenie przed zapisem
  const doubtBox = h('div'), okBox = h('input', { type: 'checkbox', id: 'salt-ok' }); let doubts = [];
  okBox.onchange = () => {};
  const ionKeys = Object.keys(X.ION);
  const list = Object.entries(m.pct || m.ions || {}).map(([k, v]) => ({ k, v })); if (!list.length) list.push({ k: 'K', v: kind === 'pct' ? '' : 1 });
  const drawRows = () => {
    rows.innerHTML = '';
    list.forEach((r, i) => {
      const s = h('select', { 'aria-label': tl('Składnik') }, ionKeys.map(k => h('option', { value: k, selected: k === r.k }, ionL(k)))); s.onchange = () => { r.k = s.value; check(); };
      const v = inputF(kind === 'pct' ? tl('Zawartość') : tl('Liczba'), kind === 'pct' ? '%' : '×', String(r.v ?? '').replace('.', DEC));
      v.inp.oninput = () => { r.v = v.num(); check(); };
      rows.append(h('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr auto;align-items:end' }, selField(tl('Składnik'), s), v.el,
        h('button', { class: 'btn ghost small', type: 'button', 'aria-label': tl('Usuń składnik'), onclick: () => { list.splice(i, 1); drawRows(); check(); } }, '×')));
    });
    rows.append(h('button', { class: 'btn ghost small', type: 'button', onclick: () => { list.push({ k: 'NO3', v: kind === 'pct' ? '' : 1 }); drawRows(); } }, tl('+ Składnik')));
  };
  const drawKind = () => { kindBox.innerHTML = ''; kindBox.append(chips([['formula', tl('Wzór')], ['pct', tl('Zawartość %')]], kind, v => { kind = v; list.forEach(r => r.v = ''); drawKind(); drawRows(); check(); }));
    fBox.innerHTML = ''; if (kind === 'formula') fBox.append(formula.el); };
  let parsed = null;
  function check() {
    parsed = null;
    if (kind === 'formula') {
      try {
        const p = X.parseFormula(formula.val()), anh = { ...p.el }; anh.H = (anh.H || 0) - 2 * p.water; anh.O = (anh.O || 0) - p.water; if (!anh.H) delete anh.H; if (!anh.O) delete anh.O;
        const Ma = X.massOf(anh), ionMass = list.reduce((s, r) => s + (r.v > 0 ? r.v * X.IM[r.k] : 0), 0);
        parsed = { anh, water: p.water };
        doubts = saltDoubts(anh, p.water, list.filter(r => r.v > 0), Ma, ionMass);
        info.innerHTML = `M = <b>${fnum(p.M, 3)} g/mol</b>${p.water ? ` ${tl('(bezwodna {0} + {1} H₂O)', fnum(Ma, 3), fnum(p.water, 1))}` : ''}. ` +
          (ionMass > Ma + 0.5 ? `<span style="color:var(--bad)">${tl('Składniki ({0}) cięższe niż sól.', fnum(ionMass, 2))}</span>` : ionMass > 0 ? `${tl('Składniki: {0} masy.', list.filter(r => r.v > 0).map(r => `${ionL(r.k)} ${fnum(r.v * X.IM[r.k] / p.M * 100, 2)}%`).join(', '))}` : tl('Podaj jony.'));
      } catch (e) { doubts = []; info.innerHTML = formula.val() ? `<span style="color:var(--bad)">${esc(e.message)}</span>` : tl('np. K2HPO4·3H2O'); }
    } else { doubts = []; const sum = list.reduce((s, r) => s + (r.v > 0 ? r.v : 0), 0); info.innerHTML = sum > 100 ? ('<span style="color:var(--bad)">' + tl('Suma powyżej 100%.') + '</span>') : tl('Zawartość wg etykiety.'); }
    doubtBox.innerHTML = ''; okBox.checked = false;
    if (doubts.length) doubtBox.append(h('div', { class: 'alert warn', style: 'margin:0', html: icon('warn') + '<div>' + doubts.map(esc).join('<br>') + '</div>' }),
      h('label', { class: 'check' }, okBox, h('span', {}, tl('Sprawdziłem – wzór i jony są poprawne'))));
  }
  formula.inp.oninput = check;
  drawKind(); drawRows(); check();
  const bg = sheet([h('h3', {}, isNew ? tl('Nowa sól') : tl('Edytuj sól')), h('div', { class: 'stack' }, name.el, kindBox, fBox, h('div', { class: 'sect', style: 'margin:6px 0 0' }, tl('Jony')), rows, info, doubtBox),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      if (!name.val()) { toast(tl('Podaj nazwę')); return; }
      const ok = list.filter(r => r.v > 0); if (!ok.length) { toast(tl('Podaj co najmniej jeden składnik')); return; }
      let o;
      if (kind === 'pct') { if (ok.reduce((s, r) => s + r.v, 0) > 100) { toast(tl('Suma powyżej 100%')); return; } o = { id: m.id, name: name.val(), pct: Object.fromEntries(ok.map(r => [r.k, r.v])), f: name.val(), grp: 'inne', note: tl('Skład wpisany przez Ciebie.') }; }
      else {
        if (!parsed) { toast(tl('Popraw wzór')); return; }
        if (doubts.length && !okBox.checked) { toast(tl('Potwierdź wzór albo go popraw')); okBox.focus(); return; }
        if (ok.reduce((s, r) => s + r.v * X.IM[r.k], 0) > X.massOf(parsed.anh) + 0.5) { toast(tl('Składniki cięższe niż sól – sprawdź')); return; }
        o = { id: m.id, name: name.val(), formula: formula.val(), f: X.elToFormula(parsed.anh), el: parsed.anh, ions: Object.fromEntries(ok.map(r => [r.k, r.v])), hyd: parsed.water ? [parsed.water, 0] : [0], grp: 'inne' };
      }
      const i = state.salts.findIndex(x => x.id === o.id); if (i >= 0) state.salts[i] = o; else state.salts.push(o);
      save(); bg.remove(); render.keepScroll = true; render(); toast(tl('Zapisano sól'));
    } }, tl('Zapisz')), !isNew ? h('button', { class: 'btn danger', onclick: () => {
      const used = state.recipes.filter(r => r.items.some(i => i.mat === m.id));
      if (!confirm(used.length ? `${tl('Używana w: {0}. Usunąć?', used.map(r => r.name).join(', '))}` : tl('Usunąć tę sól?'))) return;
      state.salts = state.salts.filter(x => x.id !== m.id); save(); bg.remove(); render(); } }, tl('Usuń')) : null)]);
}

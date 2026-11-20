if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ---------- KOREKTA PARAMETRÓW ---------- */
const KEYS = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe'];
const DEF_SRC = { NO3: 'salt:KNO3|0', PO4: 'salt:KH2PO4|0', K: 'salt:K2SO4|0', Mg: 'salt:MgSO4|7', Ca: 'salt:CaCl2|2', Fe: 'salt:FeDTPA|0' };
const STEP_MAX = { NO3: 15, PO4: 2, K: 20, Mg: 10, Ca: 20, Fe: 0.3 };
// źródło składnika: sól (z osobnym wyborem formy uwodnienia) albo nawóz; kod 'salt:id|nH2O' / 'prod:id' / ''
function srcSelect(k, value, onChange) {
  const v0 = !value ? '' : value.startsWith('prod:') ? 'p:' + value.slice(5) : value.slice(5);
  return saltPicker(v0, v => onChange(!v ? '' : v.startsWith('p:') ? 'prod:' + v.slice(2) : 'salt:' + v), { ion: k, none: '—', label: tl('Źródło {0}', ionL(k)), formLabel: tl('Forma {0}', ionL(k)), extra: s => {
    const prods = allProducts().filter(p => p.ppm && p.ppm[k] > 0);
    const mine = prods.filter(p => p.source !== 'builtin'), base = prods.filter(p => p.source === 'builtin');
    if (mine.length) s.append(h('optgroup', { label: tl('Moje nawozy i przepisy') }, mine.map(p => h('option', { value: 'p:' + p.id }, `${p.name} (${p.unit})`))));
    if (base.length) s.append(h('optgroup', { label: tl('Baza produktów') }, base.map(p => h('option', { value: 'p:' + p.id }, `${pName(p)} (${p.unit})`))));
  } });
}
function sourceOf(code, V, purity) {
  if (!code) return null;
  if (code.startsWith('prod:')) { const p = productById(code.slice(5)); if (!p) return null; return { id: code, label: p.name, unit: p.unit, eff: Object.fromEntries(Object.entries(p.ppm).map(([k, v]) => [k, v / V])), prod: p }; }
  const { id, hyd } = splitV(code.slice(5)), m = matOf(id); if (!m) return null;
  return { id: code, label: X.formulaOf(m, hyd), unit: 'g', eff: X.saltToPpm(m, hyd, purity, 1, V), salt: { id, hyd, purity } };
}
PAGES['woda/korekta'] = root => {
  const st = (state.inputs.korekta ||= {}); st.cur ||= {}; st.tgt ||= {}; st.src ||= { ...DEF_SRC }; st.pur ||= {};
  if (st._t !== tank().id) Object.assign(st, { _t: tank().id, V: String(tank().V), cur: {}, tgt: {} });
  const out = h('div'), rows = h('div', { class: 'stack' });
  root.append(volLine());
  const V = inputF(tl('Objętość netto'), tl('l'), st.V); V.inp.oninput = () => { st.V = V.val(); save(); update(); };
  const T = P.targetsOf(tank()), A = P.latestValues(EV());
  const fillBtns = h('div', { class: 'btnrow', style: 'margin-top:0' },
    h('button', { class: 'btn ghost small', onclick: () => { let n = 0; for (const k of KEYS) if (A[k]) { st.cur[k] = String(A[k].v).replace('.', DEC); n++; } save(); render.keepScroll = true; render(); toast(n ? tl('Wstawiono') : tl('Brak pomiarów')); } }, tl('Ostatnie pomiary')),
    h('button', { class: 'btn ghost small', onclick: () => { let n = 0; for (const k of KEYS) if (T[k]) { st.tgt[k] = String(+((T[k][0] + T[k][1]) / 2).toFixed(2)).replace('.', DEC); n++; } save(); render.keepScroll = true; render(); toast(n ? tl('Wstawiono') : tl('Brak celów w profilu')); } }, tl('Cele z profilu')));
  if (st.fromChange) fillBtns.append(h('div', { class: 'note', style: 'width:100%' }, tl('„Teraz” = po podmianie ({0})', relDay(st.fromChange))));
  root.append(card(tl('Parametry'), 'test', h('div', { class: 'stack' }, V.el, fillBtns, rows)));
  root.append(card(tl('Dodaj'), 'flask', out));
  for (const k of KEYS) {
    const c = inputF(tl('Teraz'), tl('mg/l'), st.cur[k] || '', { ph: A[k] ? String(A[k].v).replace('.', DEC) : '' }), t = inputF(tl('Cel'), tl('mg/l'), st.tgt[k] || '', { ph: T[k] ? fmtR2(T[k]) : tl('np. {0}', String({ NO3: 15, PO4: 1, K: 15, Mg: 5, Ca: 20, Fe: 0.1 }[k]).replace('.', DEC)) });
    c.inp.oninput = () => { st.cur[k] = c.val(); save(); update(); }; t.inp.oninput = () => { st.tgt[k] = t.val(); save(); update(); };
    const pick = srcSelect(k, st.src[k], v => { st.src[k] = v; save(); render.keepScroll = true; render(); });
    rows.append(h('div', { class: 'ritem' }, h('b', { class: 'rk' }, P.PARAM[k] ? P.PARAM[k].long : ionL(k)), h('div', { class: 'grid' }, c.el, t.el), selField(tl('Źródło'), pick.sel), pick.form ? selField(tl('Forma'), pick.form) : null));
  }
  function update() {
    const Vt = n2(st.V) > 0 ? n2(st.V) : tank().V, cur = {}, tgt = {}, sources = [], assign = {};
    for (const k of KEYS) { const a = n2(st.cur[k]), b = n2(st.tgt[k]); if (a >= 0) cur[k] = a; if (b >= 0 && st.tgt[k] !== '') tgt[k] = b; }
    for (const k of KEYS) if (tgt[k] !== undefined) {
      const s = sourceOf(st.src[k], Vt, 100); if (!s) continue;
      if (!sources.some(z => z.id === s.id)) sources.push(s); assign[k] = s.id;
    }
    const missing = KEYS.filter(k => tgt[k] !== undefined && cur[k] === undefined);
    if (!Object.keys(tgt).length) { out.innerHTML = ('<div class="note" style="margin:0">' + tl('Wpisz „teraz” i „cel”.') + '</div>'); return; }
    if (missing.length) { out.innerHTML = alertH('warn', `${tl('Brak „teraz”: {0}.', missing.map(ionL).join(', '))}`); return; }
    const r = X.correct({ current: cur, target: tgt, sources, assign });
    const used = sources.filter(s => r.amounts[s.id] > 1e-9);
    let html = used.length ? table(['', ''], used.map(s => [esc(s.label) + (s.prod ? '' : ''), { v: s.unit === 'g' ? `${gfmt(r.amounts[s.id])} g <small>${tl('({0} mg)', fnum(r.amounts[s.id] * 1000, r.amounts[s.id] < 1 ? 1 : 0))}</small>` : `${gfmt(r.amounts[s.id])} ${s.unit}`, big: 1 }]))
      : ('<div class="okline" style="margin:0">' + tl('{0} Nic.', icon('check', 18)) + '</div>');
    const shown = X.ION_ORDER.filter(k => (r.added[k] || 0) > 0.0005 || cur[k] !== undefined);
    html += ('<div class="sect" style="margin:16px 0 6px">' + tl('Po dodaniu') + '</div>' + table(['', tl('teraz'), '+', tl('po')], shown.map(k => [ionL(k) + (tgt[k] !== undefined ? ` <small>${tl('cel {0}', gfmt(tgt[k]))}</small>` : ''), cur[k] !== undefined ? gfmt(cur[k]) : '?', r.added[k] > 0.0005 ? '+' + gfmt(r.added[k]) : '—', { v: cur[k] !== undefined ? gfmt(r.after[k]) : '+' + gfmt(r.added[k] || 0), big: tgt[k] !== undefined }])) + (r.dGH > 0.01 || r.dKH > 0.01 ? `<div class="kv"><span>${tl('Twardość')}</span><b>GH +${fnum(r.dGH, 2)} · KH +${fnum(r.dKH, 2)} °dH</b></div>` : ''));
    html += r.notes.map(n => alertH(n.sev, esc(n.t))).join('');
    const big = KEYS.filter(k => (r.added[k] || 0) > STEP_MAX[k]);
    if (big.length || r.dGH > 2) { const days = Math.max(2, ...big.map(k => Math.ceil(r.added[k] / STEP_MAX[k])), Math.ceil(r.dGH / 2)); html += alertH('warn', `${tl('<b>Nie dodawaj wszystkiego naraz.</b> To duża zmiana jak na jeden dzień – nagły skok stężenia{0} stresuje ryby, krewetki i rośliny. Podziel ilości wyżej na {1} równe części i dodawaj jedną dziennie przez {2} dni:', r.dGH > 2 ? tl(' i twardości') : '', days, days)}<ul style="margin:6px 0 0;padding-left:18px">${used.map(s => `<li>${tl('{0}: {1} {2} dziennie', esc(s.label), gfmt(r.amounts[s.id] / days), s.unit)}</li>`).join('')}</ul>${tl('Przed kolejną porcją możesz zrobić test – jeśli wynik jest już w celu, przerwij.')}`); }
    if ((r.added.Cu || 0) > 0.01 && P.PROFILES[tank().type].shrimp) html += alertH('bad', tl('Cu – toksyczne dla krewetek.'));
    if ((r.added.NH4 || 0) > 0.25) html += alertH('warn', `${tl('NH₄ +{0} mg/l. Przy pH > 7,5 rośnie udział NH₃.', gfmt(r.added.NH4))}`);
    if (used.some(s => s.prod && s.prod.source === 'builtin')) html += alertH('info', tl('Skład z bazy – porównaj z etykietą.'));
    out.innerHTML = html;
    if (used.length) out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost small', onclick: () => {
      if (!confirm(tl('Zapisać dawkę w dzienniku (dziś)?'))) return;
      for (const s of used) addEvent({ type: 'dose', pid: s.prod ? s.prod.id : 'salt:' + s.salt.id + '|' + s.salt.hyd, name: s.prod ? s.prod.name : tl('{0} (sól)', s.label), amount: +r.amounts[s.id].toFixed(4), unit: s.unit,
        ppm: Object.fromEntries(Object.entries(s.eff).map(([k, v]) => [k, v * r.amounts[s.id] * (s.prod ? 1 : 1)])), src: s.prod ? tl('nawóz') : `${tl('sól {0}{1}', s.label, s.salt.purity < 100 ? tl(', czystość {0}%', s.salt.purity) : '')}`, note: 'korekta' });
      toast(tl('Zapisano w dzienniku')); } }, tl('Zapisz w dzienniku'))));
  }

  update();
};
const fmtR2 = r => `${String(r[0]).replace('.', DEC)}–${String(r[1]).replace('.', DEC)}`;

/* ---------- PODMIANA I MINERALIZACJA (PRO) ---------- */
const WKEYS = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Na', 'Cl', 'SO4', 'GH', 'KH'];
const wlab = k => k === 'GH' || k === 'KH' ? k : ionL(k), wunit = k => k === 'GH' || k === 'KH' ? '°dH' : tl('mg/l');
PAGES['woda/podmianapro'] = root => {
  const t = tank(), st = (state.inputs.wpro ||= {});
  if (st._t !== t.id) Object.assign(st, { _t: t.id, now: {}, pct: String(t.change), min: [] });
  st.now ||= {}; st.min ||= [];
  const out = h('div'), minBox = h('div', { class: 'stack' });
  root.append(volLine());
  const grid = (obj, keys, ph) => h('div', { class: 'grid3' }, keys.map(k => { const f = inputF(wlab(k), wunit(k), obj[k] !== undefined && obj[k] !== '' ? String(obj[k]).replace('.', DEC) : '', { ph: ph ? ph(k) : '' }); f.inp.oninput = () => { const v = f.num(); if (f.val() === '') delete obj[k]; else if (v >= 0) obj[k] = v; save(); update(); }; return f.el; }));
  const A = P.latestValues(EV());
  root.append(card(tl('Akwarium'), 'test', h('div', { class: 'btnrow', style: 'margin:0 0 12px' }, h('button', { class: 'btn ghost small', onclick: () => { for (const k of WKEYS) if (A[k]) st.now[k] = A[k].v; save(); render.keepScroll = true; render(); } }, tl('Ostatnie pomiary'))),
    grid(st.now, WKEYS, k => A[k] ? String(A[k].v).replace('.', DEC) : ''), null));
  root.append(card(tl('Woda do podmian'), 'drop', waterBox(t, () => update())));
  const drawMin = () => {
    minBox.innerHTML = '';
    st.min.forEach((mi, i) => {
      const pick = saltPicker(mi.mat + '|' + (mi.hyd || 0), v => { const s = splitV(v); mi.mat = s.id; mi.hyd = s.hyd; save(); drawMin(); update(); }, { label: tl('Mineralizator'), formLabel: tl('Forma mineralizatora') }), sel = pick.sel;
      const g = inputF(tl('Ilość'), 'g', mi.g ? String(mi.g).replace('.', DEC) : ''), per = inputF(tl('na'), tl('l'), String(mi.perL || 10).replace('.', DEC));
      g.inp.oninput = () => { mi.g = g.num() || 0; save(); update(); }; per.inp.oninput = () => { mi.perL = per.num() || 0; save(); update(); };
      minBox.append(h('div', { class: 'ritem' }, selField(tl('Sól'), sel), pick.form ? selField(tl('Forma'), pick.form) : null, h('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr auto;align-items:end' }, g.el, per.el, h('button', { class: 'btn ghost small', type: 'button', 'aria-label': tl('Usuń'), onclick: () => { st.min.splice(i, 1); save(); drawMin(); update(); } }, '×'))));
    });
    minBox.append(h('div', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { st.min.push({ mat: 'CaSO4', hyd: 2, g: 0, perL: 10 }); save(); drawMin(); } }, tl('+ Mineralizator')),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => go('kalkulator/mineral') }, tl('Z celu GH'))));
  };
  root.append(card(tl('Mineralizatory'), 'scale', minBox));
  const pct = inputF(tl('Podmiana'), '%', st.pct); pct.inp.oninput = () => { st.pct = pct.val(); save(); update(); };
  const lk = h('select', { 'aria-label': tl('Parametr') }, ['NO3', 'PO4', 'K', 'GH', 'KH'].map(k => h('option', { value: k, selected: k === (st.lk || 'NO3') }, wlab(k))));
  const lt = inputF(tl('Chcę mieć'), '', st.lt || ''), lo = h('div');
  lk.onchange = () => { st.lk = lk.value; save(); update(); }; lt.inp.oninput = () => { st.lt = lt.val(); save(); update(); };
  root.append(card(tl('Podmiana'), 'wave', h('div', { class: 'grid' }, pct.el, h('div', { class: 'field' }, h('span', { class: 'lbl' }, tl('Litry')), h('b', { class: 'pl', id: 'wlit' }, ''))), out));
  root.append(card(tl('Ile wymienić, żeby obniżyć'), 'drop', h('div', { class: 'grid' }, selField(tl('Parametr'), lk), lt.el), lo));
  function update() {
    const f = Math.min(Math.max((n2(st.pct) || 0) / 100, 0), 1), rf = P.roShare(t);
    const w = X.newWater({ tap: t.water === 'ro' ? {} : t.tap, ro: t.ro, roFrac: rf, minerals: st.min, custom: state.salts });
    const nw = Object.fromEntries(WKEYS.map(k => [k, w.comp[k]]).filter(([, v]) => typeof v === 'number'));
    const after = X.waterChange(st.now, nw, f), lit = $('#wlit'); if (lit) lit.textContent = `${tl('{0} l z {1} l', fnum(f * t.V, 0), fnum(t.V, 0))}`;
    const rows = WKEYS.filter(k => typeof st.now[k] === 'number' || typeof nw[k] === 'number');
    const assumed = rows.filter(k => typeof nw[k] !== 'number' && typeof st.now[k] === 'number' && !['GH', 'KH'].includes(k));
    let html = rows.length ? table(['', tl('nowa'), tl('teraz'), tl('po')], rows.map(k => [wlab(k) + ` <small>${wunit(k)}</small>`, typeof nw[k] === 'number' ? gfmt(nw[k]) : assumed.includes(k) ? '0*' : '?', typeof st.now[k] === 'number' ? gfmt(st.now[k]) : '?', { v: after[k] == null ? '?' : gfmt(after[k]), big: 1 }])) : '';
    if (w.dGH > 0.005 || w.dKH > 0.005) html += `<div class="kv"><span>${tl('Mineralizatory')}</span><b>GH +${fnum(w.dGH, 2)} · KH +${fnum(w.dKH, 2)} °dH</b></div><div class="note">${tl('{0} mg/l{1}', ['Ca', 'Mg', 'K', 'Na', 'SO4', 'Cl'].filter(k => w.added[k] > 0).map(k => `${ionL(k)} +${gfmt(w.added[k])}`).join(' · '), w.added.Ca > 0 && w.added.Mg > 0 ? ` · Ca:Mg ${fnum(w.added.Ca / w.added.Mg, 1)}:1` : '')}</div>`;
    if (assumed.length) html += `<div class="note">${tl('* brak danych o wodzie, przyjęto 0')}</div>`;
    if (nw.GH == null && rows.length) html += alertH('info', tl('GH nowej wody: wpisz GH lub Ca i Mg kranówki.'));
    for (const k of ['GH', 'KH']) if (typeof st.now[k] === 'number' && typeof nw[k] === 'number' && Math.abs(nw[k] - st.now[k]) * f > 2) html += alertH('warn', `${tl('{0} zmieni się o {1}°dH – powyżej 2°dH na podmianę.', k, fnum(Math.abs(after[k] - st.now[k]), 1))}`);
    if (f > 0.5) html += alertH('warn', tl('Podmiana > 50%.'));
    if ((nw.NO3 || 0) > 25) html += alertH('info', `${tl('NO₃ w nowej wodzie: {0} mg/l – minimum osiągalne podmianami.', gfmt(nw.NO3))}`);
    if ((nw.PO4 || 0) > 0.5) html += alertH('info', `${tl('PO₄ w nowej wodzie: {0} mg/l.', gfmt(nw.PO4))}`);
    if (w.added.Ca > 0 && st.min.some(m => m.mat === 'CaSO4' && m.g / (m.perL || 1) > 1.5)) html += alertH('warn', tl('CaSO₄: maks. ok. 2 g/l, rozpuszcza się wolno.'));
    { const pt = P.planTotals(t.fplan, productById, t.V), fk = ['NO3', 'PO4', 'K', 'Fe', 'Mg', 'Ca'].filter(k => pt.total[k] > 0 && typeof after[k] === 'number');
      if (fk.length) html += ('<h3 style="margin:14px 0 6px;font-size:15px">' + tl('Z nawozami z planu (tydzień)') + '</h3>' + table(['', tl('po podm.'), tl('+ nawozy'), tl('razem')], fk.map(k => [wlab(k) + ` <small>${wunit(k)}</small>`, gfmt(after[k]), '+' + gfmt(pt.total[k]), { v: gfmt(after[k] + pt.total[k]), big: 1 }])) + '<div class="note">' + tl('Bez poboru przez rośliny – rzeczywiste wartości będą niższe.') + '</div>');
      else if (!(t.fplan || []).length && rows.length) html += ('<div class="note">' + tl('Dodaj nawozy na ekranie Akwarium, żeby zobaczyć stan po tygodniu dawkowania.') + '</div>'); }
    out.innerHTML = html;
    { const k = st.lk || 'NO3', a0 = st.now[k], b0 = n2(st.lt), c0 = nw[k] || 0, fr = isNum(a0) && b0 >= 0 ? C.waterChangeNeeded(a0, b0, c0) : null;
      lo.innerHTML = !isNum(a0) ? `<div class="note">${tl('Wpisz {0} w sekcji „Akwarium” powyżej.', wlab(k))}</div>` : !(b0 >= 0) || st.lt === '' ? '' : b0 >= a0 ? ('<div class="note">' + tl('Cel musi być niższy niż teraz.') + '</div>') :
        !(fr <= 1) ? alertH('warn', `${tl('Nowa woda ma {0} – nie zejdziesz do {1}.', gfmt(c0), gfmt(b0))}`) : `<div class="bigstat" style="margin-top:10px"><b>${fnum(fr * 100, 0)}%</b><span>${tl('{0} l', fnum(fr * t.V, 0))}</span></div>` + (fr > 0.5 ? alertH('warn', tl('Rozbij na 2–3 podmiany.')) : ''); }
    const anyAfter = KEYS.some(k => typeof after[k] === 'number');
    if (anyAfter) out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn small', onclick: () => {
      const k2 = (state.inputs.korekta ||= {}); Object.assign(k2, { _t: tank().id, cur: Object.fromEntries(KEYS.filter(k => typeof after[k] === 'number').map(k => [k, String(+after[k].toFixed(2)).replace('.', DEC)])), fromChange: todayKey() }); k2.tgt ||= {};
      save(); go('woda/korekta'); } }, tl('Korekta po podmianie →'))));
  }
  drawMin(); update();
};

/* ---------- OBJĘTOŚĆ BRUTTO / NETTO ---------- */
PAGES['pomiary/objetosc'] = root => {
  const F = Form('objetosc', update), out = h('div');
  root.append(card(tl('Wymiary'), 'tank', h('div', { class: 'grid3' }, F.num('L', tl('Długość'), { unit: 'cm', def: 60 }), F.num('W', tl('Szerokość'), { unit: 'cm', def: 30 }), F.num('H', tl('Wysokość'), { unit: 'cm', def: 36 })),
    h('div', { class: 'grid', style: 'margin-top:12px' }, F.num('glass', tl('Grubość szkła'), { unit: 'mm', def: 6 }), F.num('free', tl('Lustro wody pod krawędzią'), { unit: 'cm', def: 3 }),
      F.num('sub', tl('Podłoże (średnio)'), { unit: 'cm', def: 5 }), F.num('dec', tl('Dekoracje'), { unit: tl('l'), def: 0 })),
    h('div', { class: 'note' }, tl('Wymiary zewnętrzne.'))), card(tl('Wynik'), 'drop', out));
  function update() {
    const v = X.volume({ L: F.n('L'), W: F.n('W'), H: F.n('H'), glass: F.n('glass'), freeTop: F.n('free'), substrate: F.n('sub'), decorL: F.n('dec') });
    if (!v) { out.innerHTML = alertH('warn', tl('Sprawdź wymiary.')); return; }
    out.innerHTML = `<div class="kv"><span>${tl('Brutto')}</span>${tl('<b>{0} l</b>', fnum(v.gross, 1))}</div><div class="kv"><span>${tl('Wnętrze')}</span>${tl('<b>{0} l</b>', fnum(v.inner, 1))}</div>` +
      `<div class="kv"><span>${tl('Woda (bez podłoża)')}</span>${tl('<b>{0} l</b>', fnum(v.water, 1))}</div><div class="kv"><span>${tl('Podłoże')}</span>${tl('<b>{0} l</b>', fnum(v.substrate, 1))}</div>` +
      `<div class="bigstat" style="margin-top:12px"><b>${fnum(v.net, 0)}</b><span>${tl('l netto')}</span></div>` +
      `<div class="note">${tl('Woda w porach podłoża to ok. {0} l (25–40% jego objętości) – wymienia się powoli, więc do nawożenia przyjmujemy netto bez niej. Filtr kubełkowy i węże dodają zwykle kilka litrów.', fnum(v.subWater, 1))}</div>`;
    out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn small', onclick: () => { const t = tank(), before = t.V; t.V = Math.round(v.net * 10) / 10; t.Vgross = Math.round(v.gross * 10) / 10; save();
      if (before !== t.V) addEvent({ type: 'setting', label: tl('Objętość netto'), from: tl('{0} l', before), to: tl('{0} l', t.V) }); $('#tankname').textContent = tl('{0} · {1} l', t.name, fnum(t.V, 0)); toast(tl('Zapisano')); } }, `${tl('Zapisz w profilu')}`)));
  }
  update();
};

/* ---------- WODA DO PODMIAN: jeden wspólny element (kalkulator, ustawienia, podmiana) ---------- */
const WATER_KEYS = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe', 'Na', 'Cl', 'SO4', 'GH', 'KH'];
const WTYPE = [['tap', tl('Kranówka')], ['ro', 'RO'], ['mix', tl('Kranówka + RO')]];
const isNum = v => typeof v === 'number' && isFinite(v);
const W_MAIN = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe'], W_MORE = ['GH', 'KH', 'Na', 'Cl', 'SO4'];
function waterFields(t, which, keys, ch) {
  const obj = t[which] || (t[which] = {});
  return h('div', { class: 'grid3' }, keys.map(k => {
    const f = inputF(wlab(k), wunit(k), isNum(obj[k]) ? String(obj[k]).replace('.', DEC) : '', { ph: '0' });
    f.inp.setAttribute('aria-label', (which === 'ro' ? 'RO ' : tl('Kranówka ')) + wlab(k));
    f.inp.oninput = () => { const v = f.num(); if (f.val() === '') delete obj[k]; else if (v >= 0) obj[k] = v; else return; t.setup = true; save(); ch(); };
    return f.el;
  }));
}
function waterBox(t, onChange) {
  const box = h('div', { class: 'stack' }), ch = () => onChange && onChange();
  const draw = () => {
    box.innerHTML = '';
    box.append(h('div', { class: 'chips', style: 'margin:0' }, WTYPE.map(([v, l]) => h('button', { class: 'chip' + (t.water === v ? ' on' : ''), type: 'button', onclick: () => { t.water = v; t.setup = true; save(); draw(); ch(); } }, l))));
    if (t.water === 'mix') { const f = inputF(tl('Udział RO'), '%', t.roFrac !== '' && t.roFrac != null ? String(t.roFrac) : '', { ph: '50' }); f.inp.oninput = () => { const v = f.num(); t.roFrac = v >= 0 && v <= 100 ? v : ''; save(); ch(); }; box.append(h('div', { class: 'grid' }, f.el)); }
    if (t.water !== 'ro') box.append(h('div', { class: 'lbl2', style: 'margin:4px 0 0' }, tl('Kranówka – z analizy wody (mg/l)')), waterFields(t, 'tap', W_MAIN, ch),
      h('details', { class: 'inner', style: 'margin-top:0' }, h('summary', {}, 'GH, KH, Na, Cl, SO₄'), h('div', { style: 'margin-top:10px' }, waterFields(t, 'tap', W_MORE, ch))));
    if (t.water !== 'tap') box.append(h('details', { class: 'inner', style: 'margin-top:0' }, h('summary', {}, tl('Woda RO (domyślnie 0)')), h('div', { style: 'margin-top:10px' }, waterFields(t, 'ro', [...W_MAIN, ...W_MORE], ch))));
  };
  draw(); return box;
}
const waterNow = t => Object.fromEntries(WATER_KEYS.map(k => [k, P.tapOf(t, k)]).filter(([, v]) => v > 0));

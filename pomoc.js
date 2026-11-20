if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ---------- POMOC: diagnostyka roślin i glonów (reguły w diag.js) ---------- */
function chipSet(opts, cur, multi, onPick) {
  const box = h('div', { class: 'chips', style: 'margin:0' });
  opts.forEach(([v, l]) => box.append(h('button', { class: 'chip' + ((multi ? (cur || []).includes(v) : cur === v) ? ' on' : ''), type: 'button', onclick: () => onPick(v) }, l)));
  return box;
}
const qBlock = (label, el) => h('div', { class: 'pick' }, h('span', { class: 'lbl' }, label), el);
function lastParams(keys) { const A = P.latestValues(EV()), o = {}, d = {}; for (const k of keys) if (A[k]) { o[k] = A[k].v; d[k] = A[k].date; } if (A.pH && A.KH && A.KH.v > 0) o.CO2 = C.co2(A.pH.v, A.KH.v); return { o, d }; }
function paramInputs(st, keys, onCh) {
  const L0 = lastParams(keys); st.p ||= {};
  return h('div', { class: 'grid3' }, keys.map(k => { const v = st.p[k] ?? (L0.o[k] != null ? String(L0.o[k]).replace('.', DEC) : ''); const f = inputF(P.PARAM[k].l, P.PARAM[k].u, v, { ph: '?' });
    f.inp.oninput = () => { st.p[k] = f.val(); save(); onCh(); }; if (L0.d[k] && st.p[k] == null) f.el.append(h('small', { class: 'hint' }, tl('test {0}', relDay(L0.d[k])))); return f.el; }));
}
const numP = (st, keys) => { const L = lastParams(keys).o; return Object.fromEntries(keys.map(k => [k, st.p[k] == null ? L[k] : n2(st.p[k])]).filter(([, v]) => typeof v === 'number' && isFinite(v))); };
function diagResult(out, r, kind) {
  out.innerHTML = '';
  if (r.dataWarn.length) out.append(h('div', { html: r.dataWarn.map(w => alertH('warn', esc(w))).join('') }));
  if (!r.causes.length) return;
  out.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Możliwe przyczyny')), h('div', {}, r.causes.slice(0, 6).map(c => h('div', { class: 'cause' },
    h('b', {}, c.title, c.level ? h('span', { class: 'pill' + (c.level === 'częściej' ? ' s-ok' : ' s-info'), style: 'margin-left:8px' }, c.level) : null), h('small', {}, Array.isArray(c.why) ? c.why.join(' ') : (c.why || '')))))));
  const list = (title, arr) => arr && arr.length ? h('section', { class: 'card flat' }, h('h2', {}, title), h('ul', { class: 'blist' }, arr.map(x => h('li', {}, x)))) : null;
  [list(tl('Sprawdź'), r.check), list(kind === 'plant' ? tl('Nawożenie') : tl('Czego unikać'), kind === 'plant' ? r.fert : r.avoid), list(tl('Obserwuj'), r.observe), list(tl('Bezpieczne kroki'), r.steps)].forEach(x => x && out.append(x));
}
PAGES['pomoc/rosliny'] = root => {
  const st = (state.inputs.dplant ||= { sym: [], where: 'unknown', scope: 'all', dur: 'mid' }), t = tank(), out = h('div'), KEYS = ['NO3', 'PO4', 'K', 'Fe', 'GH', 'KH', 'pH'];
  const re = () => { save(); render.keepScroll = true; render(); };
  root.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Co widzisz?')), chipSet(DIAG.SYMPTOMS, st.sym, true, v => { st.sym = st.sym.includes(v) ? st.sym.filter(x => x !== v) : [...st.sym, v]; re(); })));
  root.append(h('section', { class: 'card flat' }, h('div', { class: 'stack' },
    qBlock(tl('Na których liściach?'), chipSet([['old', tl('Starych')], ['new', tl('Nowych')], ['both', tl('Na wszystkich')], ['unknown', tl('Nie wiem')]], st.where, false, v => { st.where = v; re(); })),
    qBlock(tl('Których roślin?'), chipSet([['all', tl('Wszystkich')], ['some', tl('Tylko niektórych gatunków')]], st.scope, false, v => { st.scope = v; re(); })),
    qBlock(tl('Od kiedy?'), chipSet([['short', tl('Krócej niż tydzień')], ['mid', tl('1–4 tygodnie')], ['long', tl('Dłużej')]], st.dur, false, v => { st.dur = v; re(); })),
    qBlock(tl('Zmieniane ostatnio nawożenie?'), chipSet([[true, tl('Tak')], [false, tl('Nie')]], st.fert, false, v => { st.fert = v; re(); })),
    qBlock(tl('Zmieniane światło lub CO₂?'), chipSet([[true, tl('Tak')], [false, tl('Nie')]], st.light, false, v => { st.light = v; re(); })))));
  root.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Parametry wody')), paramInputs(st, KEYS, upd), h('p', { class: 'note' }, tl('Wstawione z ostatnich testów. Puste = brak danych.'))));
  root.append(out);
  function upd() {
    const r = DIAG.plant({ symptoms: st.sym, where: st.where, scope: st.scope, duration: st.dur, fertChanged: st.fert === true, lightChanged: st.light === true, co2: t.co2type, params: { ...numP(st, KEYS), CO2: lastParams([]).o.CO2 } });
    diagResult(out, r, 'plant');
    if (r.causes.length) out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', onclick: () => { addEvent({ type: 'note', note: tl('Objawy: {0}. Możliwe: {1}.', st.sym.map(k => DIAG.SYMPTOMS.find(x => x[0] === k)[1].toLowerCase()).join(', '), r.causes.slice(0, 3).map(c => c.title.toLowerCase()).join(', ')), tags: [tl('Rośliny')] }); toast(tl('Zapisano w dzienniku')); } }, tl('Zapisz w dzienniku'))));
  }
  upd();
};
PAGES['pomoc/glony'] = root => {
  const t = tank(), st = (state.inputs.dalgae ||= { types: [] }), out = h('div'), KEYS = ['NO3', 'PO4'];
  const re = () => { save(); render.keepScroll = true; render(); };
  const ageW = t.created ? Math.max(0, Math.round((P.dnum(todayKey()) - P.dnum(t.created)) / 7)) : null;
  st.age ??= ageW != null ? String(ageW) : ''; st.photo ??= String(n2(t.lightH) ?? ''); st.watts ??= String(n2(t.lightW) ?? ''); st.co2 ??= t.co2type || ''; st.change ??= String(t.change);
  root.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Co się pojawiło?')), chipSet(DIAG.ALGAE, st.types, true, v => { st.types = st.types.includes(v) ? st.types.filter(x => x !== v) : [...st.types, v]; re(); })));
  const f = (label, unit, key) => { const x = inputF(label, unit, st[key] || ''); x.inp.oninput = () => { st[key] = x.val(); save(); upd(); }; return x.el; };
  root.append(h('section', { class: 'card flat' }, h('div', { class: 'stack' },
    h('div', { class: 'grid' }, f(tl('Wiek akwarium'), tl('tyg.'), 'age'), f(tl('Światło'), tl('h/dobę'), 'photo'), f(tl('Moc światła'), 'W', 'watts'), f(tl('Podmiana'), tl('%/tydz.'), 'change')),
    qBlock('CO₂', chipSet([['none', tl('Brak')], ['liquid', tl('W płynie')], ['yeast', tl('Drożdże')], ['bottle', tl('Butla')]], st.co2, false, v => { st.co2 = v; re(); })),
    st.co2 === 'bottle' ? qBlock(tl('CO₂ stabilne przez cały dzień?'), chipSet([[true, tl('Tak')], [false, tl('Nie / nie wiem')]], st.co2s, false, v => { st.co2s = v; re(); })) : null,
    qBlock(tl('Kondycja roślin'), chipSet([['good', tl('Rosną dobrze')], ['fair', tl('Średnio')], ['poor', tl('Słabo')]], st.plants, false, v => { st.plants = v; re(); })))));
  const plan = (t.fplan || []).map(x => productById(x.pid)).filter(Boolean);
  root.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Woda i nawożenie')), paramInputs(st, KEYS, upd),
    h('p', { class: 'note' }, (t.substrate ? `${tl('Podłoże: {0}.', t.substrate)} ` : '') + (plan.length ? `${tl('Nawozy: {0}.', plan.map(p => p.name).join(', '))}` : tl('Nie dodano nawozów na ekranie Akwarium.')))));
  root.append(out);
  function upd() {
    const r = DIAG.algae({ types: st.types, ageWeeks: n2(st.age), photo: n2(st.photo), watts: n2(st.watts), V: t.V, co2: st.co2, co2Stable: st.co2 === 'bottle' ? st.co2s === true : undefined, plants: st.plants, change: n2(st.change), params: numP(st, KEYS) });
    diagResult(out, r, 'algae');
  }
  upd();
};

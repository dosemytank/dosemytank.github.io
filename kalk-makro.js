if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – Makro: przyrost (na dawkę albo na tydzień) → sól → gramy do butelki ===== */
const KX_MAC = ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'NH4'];
const kxDefRows = () => ['NO3', 'PO4', 'K', 'Mg'].map(k => ({ k, t: LICZ.NUTR_DEF[k][0], src: LICZ.NUTR_DEF[k][1] }));

// wiersz „składnik – przyrost – sól”: sól widoczna w wierszu (tylko surowce dające ten składnik), pole % przy chelacie, czystość w zaawansowanych
function kxRow(r, i, R, s, ctx) {
  const unit = tl('mg/l'); // 7.15: krótko – „w tygodniu / jedną dawką” wybiera przełącznik nad listą, pełna jednostka nie mieściła się w polu
  const t = kxNum(r, 't', ionL(r.k), unit, { ph: '0', aria: tl('Przyrost {0}', ionL(r.k)), onInput: ctx.update });
  const pick = saltPicker(r.src, v => { const was = splitV(r.src).id; r.src = v; const m1 = matOf(splitV(v).id); if (splitV(v).id !== was) r.pct = m1 && m1.pct ? ((s0().chel ||= {})[splitV(v).id] || '') : ''; save(); ctx.redraw(); }, {
    ion: r.k, label: tl('Źródło {0}', ionL(r.k)), formLabel: tl('Forma {0}', ionL(r.k)), extra: ctx.extra ? s1 => ctx.extra(s1, r) : null }), sel = pick.sel;
  const pr = String(r.src).startsWith('p:') ? productById(r.src.slice(2)) : null, m = !pr && matOf(splitV(r.src).id);
  const kids = [h('div', { class: 'kx-row-top' }, t.el, selField(tl('Z czego'), sel),
    h('button', { class: 'kx-x', type: 'button', 'aria-label': tl('Usuń {0}', ionL(r.k)), onclick: () => { R.splice(i, 1); save(); ctx.redraw(); } }, '×'))];
  if (pick.form) kids.push(h('div', { class: 'kx-form-h' }, selField(tl('Forma'), pick.form), h('small', { class: 'kx-hint' }, tl('Wybierz tę z opakowania. Zmienia się tylko to, ile gramów odważysz.'))));
  if (m && m.pct) {
    const el = Object.keys(m.pct)[0], id = splitV(r.src).id;
    kids.push(kxNum(r, 'pct', `${tl('Ile {0} ma ten chelat (z etykiety)', ionL(el))}`, '%', { ph: fnum(m.pct[el], 1), aria: `${tl('Zawartość {0} w {1}, %', ionL(el), m.f || m.name)}`,
      onInput: () => { (s0().chel ||= {})[id] = r.pct; save(); ctx.update(); }, check: x => x > 100 ? tl('Najwyżej 100%') : '' }).el);
  }
  if (m && !m.pct && ctx.adv) kids.push(kxNum(r, 'purity', tl('Czystość'), '%', { ph: '100', aria: tl('Czystość {0}', ionL(r.k)), onInput: ctx.update, check: x => x > 100 ? tl('Najwyżej 100%') : '' }).el);
  const hint = pr ? `${tl('Ta mieszanka da też {0}.', LICZ.MIC_EL.filter(e => e !== r.k && pr.ppm[e] > 0).map(ionL).join(', '))}` : /^FeSO4\|/.test(r.src) ? tl('Żelazo bez chelatu szybko się utlenia i wypada, zwłaszcza przy KH powyżej 3 °dH. Dodaj EDTA albo wybierz chelat.') : m && m.note && !m.pct ? m.note : '';
  if (hint) kids.push(h('small', { class: 'kx-hint' }, hint));
  return h('div', { class: 'kx-row' }, kids);
}
const s0 = () => kxState();

// wspólna część Makro i Mikro (sole): wiersze, wynik w tabeli
function kxSaltsCalc(root, s, o) {
  const { form, out } = kxLayout(root), tk = kxTank(s, () => update()), RK = () => o.rowsKey ? o.rowsKey() : 'rows';
  const rowsBox = h('div', { class: 'kx-rows' });
  const perSw = h('div');
  const drawPer = () => { perSw.innerHTML = ''; perSw.append(kxChoice([['week', tl('w tygodniu')], ['dose', tl('jedną dawką')]], s.per, v => { for (const k of o.allRows || ['rows']) if (Array.isArray(s[k])) s[k] = LICZ.convertPer(s[k], s.per, v, kxN(s) || 7); if (o.onPer) o.onPer(s.per, v); s.per = v; save(); redraw(); }, tl('Ile podnieść'))); };
  function redraw() {
    rowsBox.innerHTML = ''; drawPer(); if (beforeBox) { beforeBox.innerHTML = ''; const b = o.before(redraw, update); if (b) beforeBox.append(b); }
    if (RK() === 'rows') s.rows.forEach((r, i) => rowsBox.append(kxRow(r, i, s.rows, s, { update, redraw, adv: state.adv, extra: o.extra })));
    const miss = RK() === 'rows' ? o.keys.filter(k => !s.rows.some(r => r.k === k)) : [];
    if (miss.length) { const add = h('select', { 'aria-label': tl('Dodaj składnik') }, h('option', { value: '' }, tl('+ Dodaj składnik')), miss.map(k => h('option', { value: k }, ionL(k))));
      add.onchange = () => { const k = add.value, src = LICZ.NUTR_DEF[k][1], m1 = matOf(splitV(src).id); s.rows.push({ k, t: s.per === 'dose' ? '' : LICZ.NUTR_DEF[k][0], src, ...(m1 && m1.pct && (s.chel || s0().chel || {})[splitV(src).id] ? { pct: s0().chel[splitV(src).id] } : {}) }); save(); redraw(); };
      rowsBox.append(h('span', { class: 'inp kx-add' }, add)); }
    update();
  }
  const beforeBox = o.before ? h('div') : null, afterBox = h('div'), howBox = h('div', { class: 'stack' });
  // dawkowanie: z butelki (roztwór) albo na sucho (sole prosto do akwarium)
  const drawHow = () => { howBox.innerHTML = ''; howBox.append(kxChoice([['bottle', tl('Z butelki')], ['dry', tl('Na sucho')]], s.how || 'bottle', v => { s.how = v; save(); drawHow(); update(); }, tl('Jak dawkujesz')),
    ...(s.how === 'dry' ? [h('p', { class: 'kx-hint' }, tl('Sole wsypujesz bezpośrednio do akwarium. Wynik to gramy na jedną dawkę.'))] : []), kxBottle(s, () => update(), { noBottle: s.how === 'dry' })); };
  form.append(kxSec(tl('Akwarium'), tk.el), kxSec(o.title, h('div', { class: 'kx-per' }, h('span', { class: 'lbl' }, tl('Ile podnieść')), perSw), beforeBox, rowsBox),
    kxSec(tl('Dawkowanie'), howBox, afterBox));
  drawHow();
  const drawAfter = () => { afterBox.innerHTML = ''; const a = o.after && o.after(() => { drawAfter(); update(); }); if (a) afterBox.append(a); };
  if (o.advNote && !state.adv) form.append(h('p', { class: 'note' }, tl('Czystość soli nawozowej (np. 98%) można wpisać w trybie PRO: Zaawansowane → Wszystkie narzędzia.')));
  function update() {
    out.innerHTML = '';
    const V = tk.V(), bottle = n2(s.bottle), dose = n2(s.dose), n = kxN(s);
    if (s.how === 'dry') return dry(V, n);
    if (!(V > 0 && bottle > 0 && dose > 0 && n > 0) || dose > bottle) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz objętość akwarium, butelkę, dawkę i liczbę dawek.'))); return; }
    const R = LICZ.makro({ rows: LICZ.weekRows(s[RK()], s.per, n), V, bottle, dose, n, custom: state.salts, prodOf: productById, edta: o.edta ? s.edta : '' });
    if (R.empty) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz, o ile chcesz podnieść choć jeden składnik.'))); return; }
    const warn = [], { items, prodItems, sol, fx, p, plan } = R, sp = LICZ.splitBottles(items, bottle, state.salts);
    plan.notes.filter(x => x.sev !== 'info').forEach(x => warn.push([x.sev, x.t]));
    // niezgodności pokazuje karta podziału; ostrzeżenie zostaje, gdy podzielić się nie da
    sol.warn.filter(w => !/^sol_/.test(w.code || '') && !(sp && X.COMPAT_RULES.some(r => r.code === w.code))).forEach(w => warn.push([w.sev, w.t]));
    if (R.mlIn >= bottle) warn.push(['bad', `${tl('Same płynne nawozy to {0} ml – nie zmieszczą się w butelce {1} ml.', gfmt(R.mlIn), fnum(bottle, 0))}`]);
    if ((p.NH4 || 0) * n > 1) warn.push(['bad', `${tl('NH₄ wyjdzie {0} mg/l w tygodniu. Powyżej 1 mg/l to już ryzykowne dla ryb i krewetek.', gfmt(p.NH4 * n))}`]);
    if ((p.Cu || 0) * n > 0.01 && P.PROFILES[tank().type].shrimp) warn.push(['bad', tl('Miedź powyżej 0,01 mg/l na tydzień może szkodzić krewetkom.')]);
    for (const { prod } of prodItems) { if (prod.status === 'unverified') warn.push(['info', `${tl('{0}: skład jest przybliżony, sprawdź etykietę.', prod.name)}`]); LICZ.nNotes(prod).forEach(t => warn.push(['info', `${prod.name}: ${t}`])); }
    const tiny = items.filter(i => i.g < 0.1 && !LICZ.posredni(i.g)); if (tiny.length) warn.push(['info', `${tl('{0}: do tego potrzebna waga z dokładnością 0,01 g.', tiny.map(i => itName(i) + ' ' + gfmt(i.g) + ' g').join(', '))}`]);
    const pos = items.map(i => [i, LICZ.posredni(i.g)]).filter(x => x[1]);
    for (const [i, q] of pos) warn.push(['info', `${tl('{0}: {1} g to za mało, żeby odważyć. Rozpuść {2} g w {3} ml wody i odmierz z tego {4} ml.{5}', itName(i), gfmt(i.g), q.stockG, q.waterMl, gfmt(q.takeMl), q.twoStep ? tl(' Wychodzi poniżej 1 ml, więc lepiej zrób większą butelkę.') : '')}`]);
    out.append(...kxAlerts(warn.filter(w => w[0] === 'bad')));
    const fix = kxFix(fx, { s, rows: s.rows, redraw }); if (fix) out.append(fix);
    const ctx = { bottle, dose, V };
    const rows = [...items.map(i => ({ name: itName(i), sub: i.purity && i.purity !== 100 ? `${tl('czystość {0}%', fnum(i.purity, 1))}` : '', amount: fx.level === 'over' ? '—' : gfmt(i.g), gl: gfmt(i.g / bottle * 1000), gives: kxIons(LICZ.daje(i, ctx)),
        ...(o.element ? { gl: Object.entries(LICZ.elementMass(i, state.salts)).map(([k, v]) => `${ionL(k)} ${gfmt(v)} g`).join(' · ') } : {}) })),
      ...prodItems.map(i => ({ name: i.prod.name, amount: gfmt(i.a) + (i.prod.unit === 'g' ? '' : ' ml'), gl: o.element ? '' : gfmt(i.a / bottle * 1000), gives: kxIons(LICZ.daje(i, ctx)) }))];
    const tbl = kxTable(rows, { col1: o.element ? (prodItems.length ? tl('Źródło') : tl('Sól lub chelat')) : prodItems.length ? tl('Sól lub nawóz') : tl('Sól'), ...(o.element ? { col3: tl('Pierwiastek') } : {}) });
    const head = h('h2', { class: 'kx-h' }, `${tl('Odważ do butelki {0} ml', fnum(bottle, 0))}`);
    out.append(head, tbl, h('p', { class: 'kx-note' }, `${tl('Dopełnij {0} do {1} ml. Starczy na {2} {3}, czyli około {4} dni.', sol.conc.PO4 > 0 || sol.conc.Fe > 0 ? tl('wodą RO albo destylowaną') : tl('wodą'), fnum(bottle, 0), fnum(bottle / dose, 0), kxPl(bottle / dose, tl('dawkę'), 'dawki', tl('dawek')), fnum(bottle / dose / n * 7, 0))}`),
      kxGain(p, dose, n) || '', kxExtras(p, n) || '');
    const sl = fx.level === 'over' ? null : kxSplit(sp, bottle); if (sl) out.append(sl);
    const so = kxSol(sol.rows); if (so) out.append(so);
    out.append(...kxAlerts(warn.filter(w => w[0] !== 'bad')));
    if (o.extraOut) { const e = o.extraOut(p, n); if (e) out.append(e); }
    { const mt = kxMethods(p, n); if (mt) out.append(mt); }
    if (o.edta && R.plan.mol > 0) out.append(h('p', { class: 'kx-note' }, s.edta ? tl('EDTA: 1 mol na 1 mol metali z soli.') : tl('Metale z siarczanów bez chelatu wypadną z roztworu. Wybierz EDTA niżej, w sekcji Roztwór.')));
    const sumTxt = fx.level === 'over' ? '' : kxPinText([...items.map(i => gfmt(i.g)), ...prodItems.map(i => gfmt(i.a))]);
    const text = [`${tl('{0}: akwarium {1} l, butelka {2} ml, dawka {3} ml, {4} {5} w tygodniu', o.name, fnum(V, 0), fnum(bottle, 0), fnum(dose, 2), n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, `${tl('Odważ do {0} ml:', fnum(bottle, 0))}`,
      ...items.map(i => `- ${itName(i)}: ${gfmt(i.g)} g`), ...prodItems.map(i => `- ${i.prod.name}: ${gfmt(i.a)} ${i.prod.unit === 'g' ? 'g' : 'ml'}`),
      `${tl('Po jednej dawce: +{0} mg/l', kxIons(p))}`, `${tl('Po tygodniu: +{0} mg/l', kxIons(p, kxMain(p), n))}`, ...(sp ? [tl('Podziel na butelki: {0}', sp.bottles.map((b, k) => 'ABCDEFGH'[k] + ': ' + b.items.map(i => itName(i)).join(', ')).join('; '))] : []),
      ...warn.map(w => '! ' + w[1])].join('\n');
    out.append(kxActions([[tl('Kopiuj wynik'), () => kxCopy(text)],
      fx.level !== 'over' && !prodItems.length ? [tl('Zapisz jako przepis'), () => kxSaveRecipe(items, bottle, o.defName), 'btn'] : null,
      fx.level !== 'over' && prodItems.length ? [tl('Zapisz jako nawóz'), () => kxNameSheet(tl('Zapisz jako nawóz'), o.defName, name => {
        const ppm = Object.fromEntries(Object.entries(sol.conc).filter(([, v]) => v > 0).map(([k, v]) => [k, +v.toPrecision(6)]));
        state.products.push({ id: uid('u'), name, unit: 'ml', ppm, kind: 'micro', source: 'user', status: 'label', note: [...items.map(i => `${itName(i)} ${gfmt(i.g)} g`), ...prodItems.map(i => `${i.prod.name} ${gfmt(i.a)} ${i.prod.unit}`)].join(', ') + ` ${tl('w {0} ml', fnum(bottle, 0))}` });
        save(); toast(tl('Zapisano: {0}', name)); }), 'btn'] : null]));
    kxPin(out, sumTxt, head);
    kxLog(o.type, s, sumTxt || tl('Sól się nie rozpuści, trzeba zmienić dawkę'), text);
  }
  // na sucho: gramy na dawkę i na tydzień, bez butelki, rozpuszczalności i podziału
  function dry(V, n) {
    if (!(V > 0 && n > 0)) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz objętość akwarium i liczbę dawek.'))); return; }
    const R = LICZ.sucho({ rows: LICZ.weekRows(s[RK()], s.per, n), V, n, custom: state.salts, prodOf: productById, edta: o.edta ? s.edta : '' });
    if (R.empty) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz, o ile chcesz podnieść choć jeden składnik.'))); return; }
    const { items, prodItems, p, plan } = R, warn = [];
    plan.notes.filter(x => x.sev !== 'info').forEach(x => warn.push([x.sev, x.t]));
    if ((p.NH4 || 0) * n > 1) warn.push(['bad', `${tl('NH₄ wyjdzie {0} mg/l w tygodniu. Powyżej 1 mg/l to już ryzykowne dla ryb i krewetek.', gfmt(p.NH4 * n))}`]);
    if ((p.Cu || 0) * n > 0.01 && P.PROFILES[tank().type].shrimp) warn.push(['bad', tl('Miedź powyżej 0,01 mg/l na tydzień może szkodzić krewetkom.')]);
    const tiny = items.filter(i => i.g < 0.05);
    if (tiny.length) warn.push(['info', `${tl('{0}: takiej ilości nie odważysz zwykłą wagą. Przy tak małych masach wygodniej dawkować z butelki.', tiny.map(i => `${itName(i)} ${gfmt(i.g)} g`).join(', '))}`]);
    for (const { prod } of prodItems) LICZ.nNotes(prod).forEach(t => warn.push(['info', `${prod.name}: ${t}`]));
    const head = h('h2', { class: 'kx-h' }, tl('Wsyp do akwarium przy każdej dawce'));
    out.append(...kxAlerts(warn.filter(w => w[0] === 'bad')), head,
      kxTable([...items.map(i => ({ name: itName(i), sub: i.purity && i.purity !== 100 ? `${tl('czystość {0}%', fnum(i.purity, 1))}` : '', amount: gfmt(i.g), gl: gfmt(i.g * n), gives: kxIons(LICZ.daje({ ...i }, { bottle: 1000, dose: 1000, V })) })),
        ...prodItems.map(i => ({ name: i.prod.name, amount: gfmt(i.a) + (i.prod.unit === 'g' ? '' : ' ml'), gl: gfmt(i.a * n), gives: kxIons(LICZ.daje(i, { bottle: 1, dose: 1, V })) }))],
        { col1: o.element ? tl('Sól lub chelat') : tl('Sól'), unit: tl('g na dawkę'), col3: tl('W tygodniu (g)') }),
      h('p', { class: 'kx-note' }, `${tl('{0} {1} w tygodniu. Sole rozsyp w miejscu z dobrym przepływem, każdą osobno.', n, kxPl(n, tl('dawka'), 'dawki', tl('dawek')))}`),
      kxGain(p, null, n) || '', kxExtras(p, n) || '');
    if (o.extraOut) { const e = o.extraOut(p, n); if (e) out.append(e); }
    { const mt = kxMethods(p, n); if (mt) out.append(mt); }
    out.append(...kxAlerts(warn.filter(w => w[0] !== 'bad')));
    const text = [`${tl('{0} na sucho: akwarium {1} l, {2} {3} w tygodniu.', o.name, fnum(V, 0), n, kxPl(n, tl('dawka'), 'dawki', tl('dawek')))}`, tl('Na jedną dawkę:'), ...items.map(i => `- ${itName(i)}: ${gfmt(i.g)} g`),
      ...prodItems.map(i => `- ${i.prod.name}: ${gfmt(i.a)} ${i.prod.unit === 'g' ? 'g' : 'ml'}`), `${tl('Po jednej dawce: +{0} mg/l', kxIons(p))}`, `${tl('Po tygodniu: +{0} mg/l', kxIons(p, kxMain(p), n))}`].join('\n');
    out.append(kxActions([[tl('Kopiuj wynik'), () => kxCopy(text), 'btn']]));
    const sum = tl('Na dawkę: {0}{1} g', items.slice(0, 4).map(i => gfmt(i.g)).join(' · '), items.length > 4 ? ' …' : '');
    kxPin(out, sum, head); kxLog(o.type, s, sum, text);
  }
  drawAfter(); redraw();
}

KX.makro = root => {
  const s = kxState().makro; if (!Array.isArray(s.rows) || !s.rows.length && !s._cleared) s.rows = kxDefRows(); s.per ||= 'week';
  kxSaltsCalc(root, s, { type: 'makro', name: tl('Makro'), title: tl('Co dodać'), keys: KX_MAC, defName: tl('Mój nawóz NPK'), advNote: true,
    before: redraw => { const sel = h('select', { 'aria-label': tl('Wstaw typowe wartości') }, h('option', { value: '' }, tl('Wstaw typowe wartości…')),
        Object.entries(DANE.START).map(([id, x]) => h('option', { value: id }, `${x.name} – ${x.tip}`)));
      sel.onchange = () => { const x = DANE.START[sel.value]; if (!x) return; const n = kxN(s) || 7;
        s.rows = LICZ.convertPer(Object.entries(x.week).map(([k, v]) => { const old = s.rows.find(r => r.k === k); return { ...(old || {}), k, t: String(v).replace('.', DEC), src: old ? old.src : LICZ.NUTR_DEF[k][1] }; }), 'week', s.per, n);
        save(); redraw(); toast(`${tl('Wstawione wartości „{0}”. To punkt wyjścia – popraw je według testów wody.', x.name)}`); };
      return h('span', { class: 'inp kx-start' }, sel); } });
};

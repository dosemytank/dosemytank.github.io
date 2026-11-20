if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Odpowiednik gotowego nawozu („zrób sam”) i koszt nawożenia =====
   Obliczenia: clone.js (CLONE). Koszt nawożenia: tylko z ceny opakowania gotowego nawozu (zł / ml lub g). 7.15: bez cen soli. */
const K_ = CLONE;
const prices = () => (state.prices ||= { prod: {}, salt: {} });
// koszt 1 ml (lub 1 g) produktu albo receptury; null = brak cen
function unitCost(p) {
  if (!p) return null;
  const pr = prices().prod[p.id] || {}, price = n2(pr.zl ?? p.price), pack = n2(pr.pack ?? p.pack);
  if (price > 0 && pack > 0) return price / pack;
  return null; // 7.15: bez cen soli – przepisy z soli nie mają kosztu
}
const perMonth = (ml, n) => ml * n * 52 / 12;
const zl = v => tl('{0} zł', fnum(v, v < 10 ? 2 : 0));

PAGES['nawozy/odpowiednik'] = root => {
  const st = (state.inputs.odp ||= {}), all = allProducts().filter(p => p.ppm && Object.values(p.ppm).some(v => v > 0) && !p.rid);
  if (!all.some(p => p.id === st.pid)) st.pid = (all.find(p => p.status === 'label') || all[0] || {}).id;
  st.bottle ||= '500'; st.split ||= 'auto'; st.fe ||= 'FeDTPA'; st.dose ||= '1'; st.n ||= '7';
  const p = productById(st.pid); if (!p) { root.append(card(tl('Brak nawozów ze składem'), 'pack', h('p', { class: 'sub' }, tl('Dodaj nawóz ze składem w Bazie nawozów.')))); return; }
  const powder = p.unit === 'g', out = h('div'), redraw = () => { save(); render.keepScroll = true; render(); };
  const og = (l, arr) => arr.length ? h('optgroup', { label: l }, arr.map(x => h('option', { value: x.id, selected: x.id === st.pid }, pName(x) + (x.unit === 'g' ? tl(' (proszek)') : '')))) : null;
  const sel = h('select', { 'aria-label': tl('Nawóz do odtworzenia') }, og(tl('Moje nawozy'), all.filter(x => x.source !== 'builtin')), og(tl('Skład z etykiety'), all.filter(x => x.source === 'builtin' && x.status === 'label')),
    og(tl('Skład orientacyjny'), all.filter(x => x.source === 'builtin' && x.status !== 'label')));
  sel.onchange = () => { st.pid = sel.value; redraw(); };
  const num = (k, label, unit) => { const f = inputF(label, unit, st[k]); f.inp.oninput = () => { st[k] = f.val(); save(); calc(); }; return f.el; };
  root.append(card(tl('Który nawóz'), 'pack', h('span', { class: 'inp' }, sel),
    p.status === 'unverified' ? h('div', { class: 'alert warn', html: (icon('warn', 18) + '<div>' + tl('Skład orientacyjny – producent nie publikuje pełnych danych. Odpowiednik będzie tylko tak dobry jak te liczby.') + '</div>') }) : null,
    ...LICZ.nNotes(p).map(t => h('div', { class: 'note' }, t)),
    h('div', { class: 'grid', style: 'margin-top:12px' }, powder ? null : num('bottle', tl('Butelka'), 'ml'), num('dose', tl('Twoja dawka'), p.unit), num('n', tl('Dawek w tygodniu'), '×'))));
  const opts = h('div', { class: 'stack' });
  const nAuto = powder ? 1 : K_.cloneOf(p.ppm, { bottle: n2(st.bottle) || 500, fe: st.fe, nh4: !!st.nh4, custom: state.salts }).bottles.length;
  if (nAuto > 1) opts.append(h('div', { class: 'lbl2' }, tl('Butelki')), chips([['auto', tl('{0} (zalecane)', nAuto === 2 ? tl('Dwie') : tl('{0} butelki', nAuto))], ['one', tl('Jedna')]], st.split === 'one' ? 'one' : 'auto', v => { st.split = v; redraw(); }));
  if ((p.ppm.Fe || 0) > 0) opts.append(h('div', { class: 'lbl2' }, tl('Żelazo')), chips(Object.entries(K_.CLONE_FE), st.fe, v => { st.fe = v; redraw(); }));
  if ((p.ppm.NO3 || 0) > 0 && !(p.ppm.NH4 > 0)) opts.append(h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!st.nh4, onchange: e => { st.nh4 = e.target.checked; redraw(); } }), tl(' Pozwól na azotan amonu, gdy brakuje azotu')));
  if (opts.childNodes.length) root.append(card(tl('Ustawienia'), 'flask', opts));
  root.append(out);
  function calc() {
    out.innerHTML = '';
    const bottle = n2(st.bottle) || 500, dose = n2(st.dose) || 0, n = Math.round(n2(st.n)) || 0;
    const r = K_.cloneOf(p.ppm, { bottle, powder, split: st.split === 'one' ? false : undefined, fe: st.fe, nh4: !!st.nh4, custom: state.salts });
    // przepis
    for (const b of r.bottles) {
      const title = powder ? tl('Wymieszaj na 100 g') : `${b.label ? (tl('Butelka {0} –', b.label) + ' ') : tl('Odważ do butelki ')}${fnum(bottle, 0)} ml`;
      const rows = b.items.map(i => [matName(i.mat, i.hyd), gfmt(i.g), ' g']);
      if (powder && r.filler > 0.5) rows.push([tl('wypełniacz (np. glukoza, siarczan potasu)'), gfmt(r.filler), ' g']);
      out.append(slab(title, rows, powder ? tl('Sucha mieszanka – dawkuj jak oryginał.') : `${tl('Rozpuszczaj po kolei w wodzie RO lub destylowanej{0}; uzupełnij do {1} ml.', b.items.some(i => i.mat === 'Na2EDTA') ? tl(', zacznij od EDTA') : '', fnum(bottle, 0))}`));
      const tiny = b.items.filter(i => i.g < 0.1); if (tiny.length) out.append(h('div', { html: alertH('info', `${tl('{0} – poniżej 0,1 g, trudno odważyć. {1}', tiny.map(i => matName(i.mat, i.hyd)).join(', '), powder ? tl('Zrób większą porcję.') : tl('Zrób większą butelkę albo roztwór pośredni.'))}`) }));
      if (b.warn.length) out.append(h('div', { html: b.warn.map(w => alertH(w.sev, esc(w.t))).join('') }));
    }
    if (r.split) { const L0 = r.bottles.map(b => b.label.split(' ')[0]);
      out.append(h('div', { html: alertH('info', `${tl('Dawkuj <b>tyle samo ml z każdej butelki</b>, ile oryginału (np. {0}). {1}, bo w jednej składniki by się wytrąciły.', L0.map(l => `${gfmt(dose)} ml ${l}`).join(' + '), L0.length === 2 ? tl('Dwie butelki') : tl('{0} butelki', L0.length))}`) })); }
    // porównanie
    const pct = d => d.dev == null ? tl('dodatkowo') : Math.abs(d.dev) < 0.005 ? tl('tak samo') : `${d.dev > 0 ? '+' : '−'}${fnum(Math.abs(d.dev) * 100, 0)}%`;
    const main = r.diff.filter(d => !d.side), side = r.diff.filter(d => d.side);
    out.append(card(tl('Oryginał a odpowiednik'), 'chart', h('div', { class: 'sub' }, powder ? tl('g na kg') : tl('g/l (= mg/l w akwarium na 1 ml w 1 l)')),
      h('div', { html: table(['', tl('Oryginał'), tl('Odpowiednik'), ''], [...main, ...side].map(d => [ionL(d.k) + (d.side ? (' ' + '<small>' + tl('jon towarzyszący') + '</small>') : ''), gfmt(d.orig), gfmt(d.clone),
        { v: pct(d), big: d.dev != null && Math.abs(d.dev) > 0.05 ? 1 : 0 }])) }),
      h('div', { html: r.match ? alertH('ok', tl('Składniki odżywcze odtworzone (±5%).')) : alertH('warn', tl('Nie wszystko da się odtworzyć prostymi solami – różnice w tabeli.{0}', main.some(d => d.k === 'NO3' && d.dev < -0.05) && !st.nh4 ? tl(' Producent ma pewnie część azotu jako amon lub mocznik – zaznacz „Pozwól na azotan amonu”.') : '')) }),
      r.unsupported.length ? h('div', { class: 'note' }, tl('Pominięte (brak prostej soli): {0}.', r.unsupported.map(ionL).join(', '))) : null,
      p.source === 'builtin' || p.kind === 'aqua' ? h('div', { class: 'note' }, tl('Węgla organicznego, aminokwasów, konserwantów i stabilizatorów pH z oryginału nie odtworzysz – odpowiednik ma tylko składniki mineralne.')) : null));
    if (powder) out.append(h('div', { class: 'note' }, `${tl('Mieszanka: {0} g soli na 100 g.', gfmt(r.bottles.reduce((a, b) => a + b.items.reduce((s1, i) => s1 + i.g, 0), 0)))}`));
    // zapis
    if (!powder) out.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      const base = tl('Odpowiednik: {0}', p.name);
      for (const b of r.bottles) {
        const rc = { id: uid('r'), name: (base + (b.label ? ' (' + b.label.split(' ')[0] + ')' : '')).slice(0, 60), vol: bottle, items: b.items, note: `${tl('Odpowiednik składu {0} (sole). Dawka jak oryginał{1}.', p.name, r.split ? tl(', z każdej butelki') : '')}`, created: todayKey(), updated: todayKey(), pid: null };
        state.recipes.push(rc); syncRecipeProduct(rc);
      }
      save(); toast(r.bottles.length > 1 ? `${tl('Zapisano {0} przepisy', r.bottles.length)}` : tl('Zapisano przepis')); go('nawozy/moje');
    } }, r.bottles.length > 1 ? `${tl('Zapisz jako {0} przepisy', r.bottles.length)}` : tl('Zapisz jako przepis'))));
  }
  calc();
};

if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ---------- RECEPTURY I ROZTWORY ---------- */
let rDraft = null;
const recipeConc = r => X.solution(r.items, r.vol, state.salts);
function syncRecipeProduct(r) { // receptura → nawóz do dziennika (stężenia w g/l = mg/ml)
  const sol = recipeConc(r), ppm = {}; for (const k in sol.conc) if (sol.conc[k] > 0) ppm[k] = +sol.conc[k].toPrecision(6);
  let p = state.products.find(x => x.rid === r.id || (r.pid && x.id === r.pid));
  const o = { name: r.name, unit: 'ml', ppm, source: 'recipe', status: 'recipe', rid: r.id, note: `${tl('receptura: {0} w {1} ml', r.items.filter(i => i.g > 0).map(itLine).join(', '), fnum(r.vol, 0))}` };
  if (p) Object.assign(p, o); else { p = { id: uid('u'), ...o }; state.products.push(p); }
  r.pid = p.id; return p;
}
PAGES['nawozy/receptury'] = root => {
  const id = location.hash.split('/')[3];
  if (id) return recipeEditor(root, id);
  go('nawozy/moje');
};
function recipesList(root) {
  rDraft = null;
  root.append(h('h2', { class: 'h2', style: 'margin-top:4px' }, tl('Przepisy')));
  if (!state.recipes.length) root.append(h('p', { class: 'note', style: 'margin:0 4px 8px' }, tl('Brak. Zapisz przepis z kalkulatora (Przygotuj nawóz, Makro, Mikro, Przepisy) albo dodaj nowy.')));
  if (state.recipes.length) root.append(h('section', { class: 'card flat' }, state.recipes.map(r => {
    const sol = recipeConc(r), top = X.ION_ORDER.filter(k => sol.conc[k] > 0 && !['SO4', 'Cl', 'Na'].includes(k)).slice(0, 5);
    const lastB = state.batches.filter(b => b.rid === r.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return h('button', { class: 'trow', style: 'width:100%;text-align:left', onclick: () => go('nawozy/receptury/' + r.id) }, h('span', { class: 'ti', html: icon('flask', 20) }),
      h('span', { class: 'tx' }, h('b', {}, r.name), h('small', {}, tl('{0}{1} g/l{2}', `${fnum(r.vol, 0)} ml: `, top.map(k => `${ionL(k)} ${gfmt(sol.conc[k])}`).join(', ') || '—', lastB ? `${tl(', robiona {0}', relDay(lastB.date))}` : '')),
        sol.warn.some(w => w.sev === 'bad') ? h('small', { style: 'color:var(--bad)' }, sol.warn.find(w => w.sev === 'bad').t) : null), h('span', { class: 'go', html: icon('chevr', 18) }));
  })));
  const hist = [...state.batches].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 30);
  if (hist.length) root.append(h('section', { class: 'card' }, h('h2', {}, ico('book', 18), tl('Przygotowane partie')),
    hist.length ? h('div', { class: 'evlist' }, hist.map(b => h('button', { class: 'evrow', onclick: () => showBatch(b) }, h('span', { class: 'evi', html: icon('flask', 18) }),
      h('span', { class: 'evt' }, h('b', {}, b.name), h('span', {}, `${tl('{0} ml · {1}', fnum(b.vol, 0), b.items.filter(i => i.g > 0).map(itLine).join(', '))}`), b.note ? h('span', { class: 'evn' }, b.note) : null), h('small', {}, relDay(b.date)))))
      : h('p', { class: 'note', style: 'margin:0' }, tl('Brak.'))));
}
function duplicateRecipe(r) {
  const c = { ...JSON.parse(JSON.stringify(r)), id: uid('r'), name: (tl('{0} (kopia)', r.name)).slice(0, 60), pid: null, created: todayKey(), updated: todayKey() };
  state.recipes.push(c); save(); toast(tl('Utworzono kopię – możesz ją zmienić')); go('nawozy/receptury/' + c.id);
}
function openBatch(r) {
  const d = dateF(), vol = inputF(tl('Objętość partii'), 'ml', String(r.vol)), note = inputF(tl('Notatka'), '', '', { type: 'text', max: 200, ph: tl('np. woda RO') }), out = h('div');
  const upd = () => { const v = vol.num(), k = v > 0 ? v / r.vol : 0; out.innerHTML = k ? table([tl('Składnik'), tl('Odważ')], r.items.filter(i => i.g > 0).map(i => [esc(itName(i)) + (i.purity < 100 ? ` <small>(${fnum(i.purity, 1)}%)</small>` : ''), { v: gfmt(i.g * k) + ' ' + itUnit(i), big: 1 }])) +
    `<div class="note">${tl('Rozpuść w {0} ml, uzupełnij do {1} ml.', fnum(v * 0.7, 0), fnum(v, 0))}</div>` : alertH('warn', tl('Podaj objętość.')); };
  vol.inp.oninput = upd; upd();
  const bg = sheet([h('h3', {}, tl('Przygotowano: {0}', r.name)), h('div', { class: 'stack' }, d.el, vol.el, out, note.el), h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: () => {
    const v = vol.num(); if (!(v > 0)) { toast(tl('Podaj objętość')); return; } const k = v / r.vol;
    state.batches.push({ id: uid('p'), ts: Date.now(), rid: r.id, name: r.name, date: d.val() || todayKey(), vol: v, items: r.items.map(i => ({ ...i, g: +(i.g * k).toFixed(4) })), note: note.val(), tankId: tank().id });
    save(); bg.remove(); render.keepScroll = true; render(); toast(tl('Zapisano partię'));
  } }, tl('Zapisz')))]);
}
function showBatch(b) {
  const sol = X.solution(b.items, b.vol, state.salts);
  const bg = sheet([h('h3', {}, b.name), h('div', { class: 'note', style: 'margin-top:-6px' }, tl('{0} · {1} ml', dayLong(b.date), fnum(b.vol, 0))),
    h('div', { html: table([tl('Składnik'), tl('Ilość')], b.items.filter(i => i.g > 0).map(i => [esc(itName(i)), gfmt(i.g) + ' ' + itUnit(i)])) + table([tl('Składnik'), tl('g/l')], ppmRows(sol.conc)) }), b.note ? h('p', {}, b.note) : null,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn danger', onclick: () => { if (confirm(tl('Usunąć wpis z historii?'))) { state.batches = state.batches.filter(x => x.id !== b.id); save(); bg.remove(); render.keepScroll = true; render(); } } }, tl('Usuń')), h('button', { class: 'btn ghost', onclick: () => bg.remove() }, tl('Zamknij')))]);
}
function recipeEditor(root, id) {
  const src = id === 'nowa' ? null : state.recipes.find(r => r.id === id);
  if (id !== 'nowa' && !src) { root.append(alertH('warn', tl('Nie znaleziono przepisu.'))); return; }
  if (!rDraft || rDraft._for !== id) rDraft = src ? { ...JSON.parse(JSON.stringify(src)), _for: id } : { _for: id, id: uid('r'), name: tl('Mój nawóz'), vol: 500, note: '', items: [{ mat: 'KNO3', hyd: 0, purity: 100, g: 0 }] };
  const r = rDraft, st = (state.inputs.recDose ||= {});
  const name = inputF(tl('Nazwa'), '', r.name, { type: 'text', max: 60 }), vol = inputF(tl('Objętość końcowa'), 'ml', String(r.vol).replace('.', DEC));
  const note = h('textarea', { rows: 2, maxlength: 1000, placeholder: '' }); note.value = r.note || '';
  name.inp.oninput = () => { r.name = name.val(); }; vol.inp.oninput = () => { r.vol = vol.num() || 0; update(); }; note.oninput = () => { r.note = note.value; };
  const itemsBox = h('div', { class: 'stack' }), out = h('div'), dose = h('div');
  const drawItems = () => {
    itemsBox.innerHTML = '';
    r.items.forEach((it, i) => {
      const pick = saltPicker(itVal(it), v => { setItVal(it, v); drawItems(); update(); }, { label: tl('Składnik {0}', i + 1), extra: fertExtra(it) }), sel = pick.sel;
      if (!it.fert && !matOf(it.mat)) sel.prepend(h('option', { value: it.mat, selected: true }, tl('(tej soli już nie ma w bazie)')));
      sel.value = itVal(it);
      const g = inputF(it.fert ? tl('Ilość') : tl('Masa'), itUnit(it), it.g ? String(it.g).replace('.', DEC) : ''), pu = it.fert ? null : inputF(tl('Czystość'), '%', String(it.purity ?? 100).replace('.', DEC));
      g.inp.oninput = () => { it.g = g.num() || 0; update(); }; if (pu) pu.inp.oninput = () => { it.purity = pctOf(pu.val()); update(); };
      itemsBox.append(h('div', { class: 'ritem' }, selField(tl('Składnik {0}', i + 1), sel), h('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr auto;align-items:end' }, g.el, pu ? pu.el : h('span', { class: 'note' }, it.fert.unit === 'g' ? tl('w gramach') : tl('w ml – wlicza się w objętość butelki')),
        h('button', { class: 'btn ghost small', type: 'button', 'aria-label': tl('Usuń składnik {0}', i + 1), onclick: () => { r.items.splice(i, 1); drawItems(); update(); } }, '×'))));
    });
    const firstFert = () => { const p = allProducts().find(p => p.source !== 'recipe' && LICZ.isMicroSource(p)); return p ? { fert: fertSnap(p), g: 0 } : null; };
    itemsBox.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { r.items.push({ mat: 'KH2PO4', hyd: 0, purity: 100, g: 0 }); drawItems(); update(); } }, tl('+ Dodaj sól')),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { const f = firstFert(); if (!f) return; r.items.push(f); drawItems(); update(); } }, tl('+ Gotowy nawóz'))),
      h('p', { class: 'note' }, tl('Gotowy nawóz (np. płynne mikro albo chelat w proszku) dodasz obok soli – wybierz go z listy składnika.')));
  };
  root.append(card(src ? tl('Receptura') : tl('Nowa receptura'), 'flask', h('div', { class: 'stack' }, name.el, vol.el, h('div', { class: 'sect', style: 'margin:8px 0 0' }, tl('Składniki')), itemsBox,
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Jak przygotować i uwagi')), h('span', { class: 'inp' }, note)))));
  root.append(card(tl('Stężenie'), 'chart', out));
  const doseMl = inputF(tl('Dawka'), 'ml', st.ml || '5'), V = inputF(tl('Akwarium'), tl('l'), String(tank().V)), tIon = h('select', {}), tPpm = inputF(tl('Przyrost'), tl('mg/l'), st.tp || '1'), nW = inputF(tl('Dawek/tydz.'), '×', st.n || '3');
  doseMl.inp.oninput = () => { st.ml = doseMl.val(); save(); update(); }; V.inp.oninput = update; tPpm.inp.oninput = () => { st.tp = tPpm.val(); save(); update(); }; nW.inp.oninput = () => { st.n = nW.val(); save(); update(); }; tIon.onchange = () => { st.ion = tIon.value; save(); update(); };
  root.append(card(tl('Dawkowanie'), 'drop', h('div', { class: 'grid' }, doseMl.el, V.el, nW.el), dose,
    h('div', { class: 'sect', style: 'margin:16px 0 8px' }, tl('ml na przyrost')), h('div', { class: 'grid' }, selField(tl('Składnik'), tIon), tPpm.el), h('div', { class: 'tml' })));
  const msg = h('div');
  root.append(msg, h('div', { class: 'btnrow sticky' }, h('button', { class: 'btn', onclick: () => saveR(false) }, tl('Zapisz przepis')),
    src ? h('button', { class: 'btn ghost', onclick: () => { saveR(true); duplicateRecipe(state.recipes.find(x => x.id === r.id)); } }, tl('Duplikuj')) : null,
    src ? h('button', { class: 'btn ghost', onclick: () => { saveR(true); openBatch(state.recipes.find(x => x.id === r.id)); } }, tl('Przygotowałem')) : null,
    src ? h('button', { class: 'btn danger', onclick: () => { if (!confirm(tl('Usunąć przepis? Wpisy w dzienniku zostaną.'))) return; state.recipes = state.recipes.filter(x => x.id !== r.id); const p = state.products.find(x => x.rid === r.id); if (p) delete p.rid; rDraft = null; save(); go('nawozy/receptury'); } }, tl('Usuń')) : null));
  function saveR(silent) {
    if (!r.name) { toast(tl('Podaj nazwę')); return; } if (!(r.vol > 0)) { toast(tl('Podaj objętość')); return; }
    if (!r.items.some(i => i.g > 0)) { toast(tl('Wpisz ilość co najmniej jednego składnika')); return; }
    const o = { id: r.id, name: r.name.slice(0, 60), vol: r.vol, note: r.note || '', items: r.items.map(recItem), created: r.created || todayKey(), updated: todayKey(), pid: r.pid || null };
    const i = state.recipes.findIndex(x => x.id === o.id); if (i >= 0) state.recipes[i] = o; else state.recipes.push(o);
    syncRecipeProduct(o); save(); rDraft = null;
    if (!silent) { toast(tl('Zapisano. Nawóz „{0}” jest w Bazie nawozów.', o.name)); if (id === 'nowa') go('nawozy/receptury/' + o.id); else { render.keepScroll = true; render(); } }
  }
  function update() {
    const sol = X.solution(r.items, r.vol, state.salts), ks = X.ION_ORDER.filter(k => sol.conc[k] > 0), Vt = V.num() || tank().V;
    out.innerHTML = !ks.length ? '' :
      table(['', tl('g/l'), `${tl('1 ml / {0} l', fnum(Vt, 0))}`], ks.map(k => [ionL(k), { v: gfmt(sol.conc[k]), big: 1 }, tl('+{0} mg/l', gfmt(sol.conc[k] / Vt))])) +
      (() => { const d = sol.derived; return ([d.N > 0 && 'N ' + gfmt(d.N), d.P > 0 && 'P ' + gfmt(d.P), d.S > 0 && 'S ' + gfmt(d.S)].filter(Boolean).length ? `<div class="note">${tl('{0} g/l', [d.N > 0 && 'N ' + gfmt(d.N), d.P > 0 && 'P ' + gfmt(d.P), d.S > 0 && 'S ' + gfmt(d.S)].filter(Boolean).join(' · '))}</div>` : ''); })() +
      sol.rows.filter(x => x.ratio != null).map(x => `<div class="rb" style="padding:6px 0"><div class="rb-h"><span>${esc(x.formula)}</span><span><small>${fnum(Math.min(x.ratio, 9.99) * 100, 0)}% max</small></span></div><div class="meter ${x.ratio > 1 ? 'bad' : x.ratio > 0.8 ? 'warn' : ''}"><i style="width:${Math.min(x.ratio, 1) * 100}%"></i></div></div>`).join('') +
      sol.warn.map(w => alertH(w.sev, w.t)).join('');
    const ml = doseMl.num() || 0, n = Math.max(1, Math.round(n2(nW.val()) || 1)), per = X.doseToPpm(sol.conc, ml, Vt);
    dose.innerHTML = ks.length && ml > 0 ? table(['', tl('dawka'), `${tl('tydzień ({0}×)', n)}`], ks.filter(k => per[k] > 0.00005).map(k => [ionL(k), '+' + gfmt(per[k]), '+' + gfmt(per[k] * n)])) +
      `<div class="note">${tl('{0} dawek · {1} tyg.', fnum(r.vol / ml, 0), fnum(r.vol / ml / n, 1))}</div>` + (per.NH4 * n > 1 ? alertH('bad', tl('NH₄ > 1 mg/l tygodniowo.')) : '') : '';
    const cur = st.ion && ks.includes(st.ion) ? st.ion : ks[0]; tIon.innerHTML = ''; ks.forEach(k => tIon.append(h('option', { value: k, selected: k === cur }, ionL(k))));
    const need = cur ? X.mlForPpm(sol.conc, cur, n2(tPpm.val()) || 0, Vt) : null, tml = $('.tml', root);
    if (tml) tml.innerHTML = need != null && need > 0 ? `<div class="bigstat" style="margin-top:10px"><b>${gfmt(need)}</b><span>ml</span></div><div class="note" style="margin-top:0">${tl('Dodatkowo: {0} mg/l.', ks.filter(k => k !== cur).map(k => `${ionL(k)} +${gfmt(sol.conc[k] * need / Vt)}`).join(', ') || '—')}</div>` : '';
  }
  drawItems(); update();
}

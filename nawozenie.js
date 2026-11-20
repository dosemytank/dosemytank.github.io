if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ---------- KONTROLER NAWOŻENIA (Akwarium → Nawożenie) ----------
   Wszystkie nawozy stosowane w akwarium + dawka planu → suma składników, źródła, duplikaty, braki danych,
   porównanie z dziennikiem (co faktycznie podano). Dodane ≠ zmierzone. */
const BASE5 = ['NO3', 'PO4', 'K', 'Mg', 'Fe'];
// sole, których rośliny prawie nie pobierają: przy stałym nawożeniu i podmianach ustalają się na (dodatek + p·woda) / p
const SALT_KEYS = ['SO4', 'Cl', 'Na', 'GH', 'KH'];
function saltBuild(total, pw, t) {
  const d = X.derived(total), add = k => k === 'GH' || k === 'KH' ? d[k] || 0 : total[k] || 0;
  const rows = SALT_KEYS.filter(k => add(k) > 0.0005).map(k => { const u = k === 'GH' || k === 'KH' ? '°dH' : tl('mg/l'), ss = P.steadyState(add(k), pw, P.tapOf(t, k));
    return `<div class="kv"><span>${k === 'GH' || k === 'KH' ? k : ionL(k)} <small>${tl('+{0} {1}/tydz.', gfmt(add(k)), u)}</small></span><b>${ss != null ? tl('ustali się ok. {0} {1}', gfmt(ss), u) : tl('bez podmian rośnie')}</b></div>`; });
  if (!rows.length) return null;
  return h('details', { class: 'inner' }, h('summary', {}, tl('Sole, które narastają przy podmianach')), h('div', { style: 'margin-top:10px', html: rows.join('') +
    `<div class="note">${tl('Przy podmianie {0}% tygodniowo, z wodą do podmian z profilu. Rośliny tych jonów prawie nie pobierają, więc test pokaże podobnie.', fnum(pw * 100, 0))} <a href="#/woda/kumulacja">${tl('Przebieg w czasie')}</a></div>` }));
}
PAGES['zbiornik/nawozenie'] = root => {
  const t = tank(), V = t.V, st = (state.inputs.ctrl ||= { per: 7 }); t.fplan ||= [];
  const syncFert = () => { t.fert = t.fplan.map(x => x.pid); };
  const listBox = h('div', { class: 'stack' }), out = h('div');
  root.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Nawozy')), listBox));
  const stockBox = h('div');
  root.append(stockBox, out);
  const packOf = p => n2((prices().prod[p.id] || {}).pack ?? p.pack) || 0, priceOf = p => n2((prices().prod[p.id] || {}).zl ?? p.price) || 0;
  const planWeek = it => (+n2(it.amt) || 0) * (+n2(it.n) || 0);
  function drawStock() {
    stockBox.innerHTML = '';
    const items = t.fplan.filter(it => productById(it.pid) && planWeek(it) > 0); if (!items.length) return;
    t.stock ||= {}; const now = Date.now(), evs = EV(), low = [];
    const rows = items.map(it => {
      const p = productById(it.pid), u = p.unit === 'g' ? 'g' : 'ml', st = t.stock[p.id], stat = h('small', { class: 'nr-hint' });
      const inp = h('input', { type: 'text', inputmode: 'decimal', value: st ? String(+(+st.left).toPrecision(4)).replace('.', DEC) : '', placeholder: '?', 'aria-label': tl('Zostało: {0}', p.name) });
      const paint = () => { const r = P.stockStatus(t.stock[p.id], EV(), p.id, planWeek(it), Date.now());
        stat.textContent = !r ? '' : r.days == null ? '' : r.left <= 0 ? tl('Skończył się.') : `${tl('Zostało ok. {0} {1}, starczy na ok. {2} {3} (do {4}).', gfmt(r.left), u, r.days, P.plural(r.days, tl('dzień'), tl('dni'), tl('dni')), fmtKeyDM(r.runout))}`;
        stat.style.color = r && r.days != null && r.days <= 7 ? 'var(--bad)' : ''; };
      inp.oninput = () => { const v = n2(inp.value); if (inp.value.trim() === '') delete t.stock[p.id]; else if (v >= 0) t.stock[p.id] = { left: v, at: Date.now() }; save(); paint(); drawShop(); };
      paint();
      const pk = h('input', { type: 'text', inputmode: 'decimal', value: packOf(p) ? String(packOf(p)).replace('.', DEC) : '', placeholder: u, 'aria-label': tl('Opakowanie {0}', p.name) }), pr = h('input', { type: 'text', inputmode: 'decimal', value: priceOf(p) ? String(priceOf(p)).replace('.', DEC) : '', placeholder: tl('zł'), 'aria-label': tl('Cena {0}', p.name) });
      const savePrice = () => { const o = (prices().prod[p.id] ||= {}); o.pack = n2(pk.value) || ''; o.zl = n2(pr.value) || ''; save(); drawShop(); update(true); };
      pk.oninput = savePrice; pr.oninput = savePrice;
      const full = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { const k = packOf(p) || n2(pk.value); if (!(k > 0)) { toast(tl('Najpierw wpisz wielkość opakowania')); return; } t.stock[p.id] = { left: k, at: Date.now() }; save(); drawStock(); } }, tl('Nowe opakowanie'));
      return h('div', { class: 'ritem' }, h('div', { class: 'fname' }, h('b', {}, p.name), h('small', { style: 'display:block' }, `${tl('plan: {0} {1} / tydz.', gfmt(planWeek(it)), u)}`)),
        h('div', { class: 'grid', style: 'grid-template-columns:1fr auto;align-items:end' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Zostało')), h('span', { class: 'inp' }, inp, h('i', { class: 'unit' }, u))), full), stat,
        h('details', { class: 'inner' }, h('summary', {}, tl('Opakowanie i cena')), h('div', { class: 'grid', style: 'margin-top:10px' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Opakowanie')), h('span', { class: 'inp' }, pk, h('i', { class: 'unit' }, u))), h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Cena')), h('span', { class: 'inp' }, pr, h('i', { class: 'unit' }, tl('zł')))))));
    });
    const shop = h('div'); drawShop.box = shop;
    // 7.12: zapasy są dodatkiem – zwinięte, dopóki nic w nich nie wpisano
    const used = Object.keys(t.stock).some(id => t.fplan.some(it => it.pid === id));
    stockBox.append(h('details', { class: 'card flat stockfold', open: used }, h('summary', {}, h('h2', { style: 'display:inline' }, tl('Zapasy')), h('span', { class: 'unit2' }, used ? '' : 'opcjonalnie')),
      h('p', { class: 'note', style: 'margin:10px 0' }, tl('Wpisz, ile zostało w butelce, a aplikacja pokaże, na ile dni wystarczy. Zapas zmniejsza się o dawki zapisane w dzienniku.')), h('div', { class: 'stack' }, rows)), shop);
    drawShop();
  }
  function drawShop() {
    const box = drawShop.box; if (!box) return; box.innerHTML = '';
    const lines = []; let sum = 0, noPrice = 0;
    for (const it of t.fplan) { const p = productById(it.pid), r = p && P.stockStatus((t.stock || {})[p.id], EV(), p.id, planWeek(it), Date.now()); if (!r || r.days == null || r.days > 14) continue;
      const u = p.unit === 'g' ? 'g' : 'ml', pack = packOf(p), price = priceOf(p); if (price > 0) sum += price; else noPrice++;
      lines.push(`${p.name}${pack ? ' ' + gfmt(pack) + ' ' + u : ''}${price > 0 ? ' – ' + zl(price) : ''} (${r.days <= 0 ? tl('skończył się') : tl('starczy na {0} dni', r.days)})`); }
    if (!lines.length) return;
    box.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Kończy się'), h('span', { class: 'unit2' }, tl('zostało na 14 dni lub mniej'))), h('div', { class: 'stack' }, lines.map(l => h('div', { class: 'kv' }, h('span', {}, l)))),
      sum > 0 ? h('p', { class: 'note' }, `${tl('Razem ok. {0}{1}.', zl(sum), noPrice ? ` ${tl('(bez {0} bez ceny)', noPrice)}` : '')}`) : null,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost small', onclick: () => { const txt = tl('Kończy się:\n{0}', lines.map(l => '- ' + l).join('\n')); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(tl('Skopiowano listę')), () => toast(tl('Nie udało się skopiować'))); } }, tl('Kopiuj listę')))));
  }
  function drawList() {
    listBox.innerHTML = '';
    if (!t.fplan.length) listBox.append(h('p', { class: 'note', style: 'margin:0' }, tl('Dodaj nawozy, których używasz.')));
    t.fplan.forEach((it, i) => {
      const p = productById(it.pid), u = p ? p.unit : '';
      const amt = h('input', { type: 'text', inputmode: 'decimal', value: it.amt === '' ? '' : String(it.amt).replace('.', DEC), placeholder: '0', 'aria-label': tl('Dawka {0}', p ? p.name : '') });
      const nn = h('input', { type: 'text', inputmode: 'numeric', value: it.n === '' ? '' : String(it.n), placeholder: '0', 'aria-label': tl('Dawek w tygodniu {0}', p ? p.name : '') });
      const ch = (field, el) => () => { const before = it[field], v = n2(el.value); it[field] = v > 0 ? v : ''; save(); update();
        if (p && before !== it[field] && before !== '' && it[field] !== '') clearTimeout(ch.t), ch.t = setTimeout(() => addEvent({ type: 'setting', label: tl('Dawka: {0}', p.name), from: `${before}${field === 'amt' ? ' ' + u : tl('×/tydz.')}`, to: `${it[field]}${field === 'amt' ? ' ' + u : tl('×/tydz.')}` }), 1500); };
      amt.oninput = ch('amt', amt); nn.oninput = ch('n', nn);
      listBox.append(h('div', { class: 'frow' }, h('div', { class: 'fname' }, h('b', {}, p ? p.name : tl('(usunięty nawóz)')), p ? h('small', {}, [(FKIND.find(k => k[0] === p.kind) || [, ''])[1], p.status === 'incomplete' || !Object.keys(p.ppm || {}).length ? tl('brak składu') : p.status === 'unverified' ? tl('skład orientacyjny – sprawdź etykietę') : ''].filter(Boolean).join(', ')) : null),
        h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Dawka')), h('span', { class: 'inp' }, amt, h('i', { class: 'unit' }, u))), h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Razy w tygodniu')), h('span', { class: 'inp' }, nn, h('i', { class: 'unit' }, '×'))),
        h('button', { class: 'xbtn', type: 'button', 'aria-label': tl('Usuń z planu'), onclick: () => { t.fplan.splice(i, 1); syncFert(); save(); drawList(); update(); drawStock(); } }, '×')));
    });
    const avail = allProducts().filter(p => !t.fplan.some(x => x.pid === p.id));
    const add = h('select', { 'aria-label': tl('Dodaj nawóz'), id: 'fplan-add' }, h('option', { value: '' }, tl('+ Dodaj nawóz')),
      h('optgroup', { label: tl('Moje') }, avail.filter(p => p.source !== 'builtin').map(p => h('option', { value: p.id }, pName(p)))),
      h('optgroup', { label: tl('Baza') }, avail.filter(p => p.source === 'builtin').map(p => h('option', { value: p.id }, pName(p)))));
    add.onchange = () => { if (!add.value) return; t.fplan.push({ pid: add.value, amt: '', n: '' }); syncFert(); save(); drawList(); update(); drawStock(); };
    listBox.append(h('span', { class: 'inp' }, add), h('button', { class: 'linkbtn', type: 'button', onclick: () => editProduct(null) }, tl('Brak na liście? Wpisz własny skład')));
  }
  function update(keepStock) {
    out.innerHTML = '';
    const r = P.planTotals(t.fplan, productById, V), pw = Math.min(Math.max((+t.change || 0) / 100, 0), 1), T0 = P.targetsOf(t);
    const keys = [...BASE5, ...X.ION_ORDER.filter(k => !BASE5.includes(k) && r.total[k] > 0.00005 && !['SO4', 'Cl', 'Na'].includes(k))];
    const none = BASE5.filter(k => !(r.total[k] > 0));
    const tiles = keys.filter(k => r.total[k] > 0 && !LICZ.MIC_EL.includes(k)).map(k => {
      const v = r.total[k] || 0;
      return { l: ionL(k), v: v > 0 ? gfmt(v) : '—', sub: v > 0 ? '' : tl('nie podajesz'), rng: rngTxt(k), st: rngSt(k, v), hl: (r.dup || []).includes(k) };
    });
    // mikro: drobne kafelki – ekran nie rośnie przy mieszankach z 6–7 pierwiastkami
    const micro = keys.filter(k => r.total[k] > 0 && LICZ.MIC_EL.includes(k)).map(k => { const v = r.total[k];
      const R0 = DANE.WEEK_RANGE[k], rs = R0 ? (R0[0] > 0 ? `${fnum(R0[0], 2)}–${fnum(R0[1], 2)}` : `≤ ${fnum(R0[1], 2)}`) : '';
      return { l: ionL(k), v: gfmt(v), sub: '', rng: rs, st: rngSt(k, v), hl: (r.dup || []).includes(k) }; });
    if (tiles.length || micro.length) out.append(h('section', { class: 'card flat' }, h('h2', {}, tl('Dodajesz tygodniowo'), h('span', { class: 'unit2' }, tl('mg/l'))), tiles.length ? h('div', { html: nutGrid(tiles) }) : null,
      micro.length ? h('div', { class: 'mini', html: (tiles.length ? ('<div class="lbl2" style="margin:12px 0 6px">' + tl('Mikroelementy') + '</div>') : '') + nutGrid(micro) }) : null, none.length ? h('p', { class: 'note' }, tl('Nie dodajesz: {0}.', none.map(ionL).join(', '))) : null,
      h('div', { html: whyH(tl('Co znaczą te liczby'), `${tl('Tyle składnika wlewasz w tygodniu. Ile zostaje w wodzie, zależy od roślin – to pokaże test, nie kalkulator. {0}', RNG_NOTE)}`) }), saltBuild(r.total, pw, t)));
    const msgs = [];
    for (const m of r.missing) msgs.push(['warn', `${esc(m.name || tl('Nawóz'))}: ${m.reason}`]);
    for (const k of r.dup || []) msgs.push(['info', `${tl('{0} z {1} nawozów: {2} mg/l. Sprawdź, czy łącznie nie za dużo.', ionL(k), r.by[k].length, r.by[k].map(b => `${esc(b.name)} ${gfmt(b.v)}`).join(', '))}`]);
    if (msgs.length) out.append(h('div', { html: msgs.map(([a, b]) => alertH(a, b)).join('') }));
    // koszt nawożenia z cen opakowań gotowych nawozów
    { let sum = 0, known = 0, unknown = 0; for (const it of t.fplan || []) { const pr = productById(it.pid), c = pr ? unitCost(pr) : null, a = +n2(it.amt), nn = +n2(it.n); if (!(a > 0 && nn > 0) || (pr && pr.rid)) continue; if (c != null) { sum += c * a * nn * 52 / 12; known++; } else unknown++; }
      if (known) out.append(h('div', { class: 'kv' }, h('span', {}, tl('Koszt nawożenia')), h('b', {}, `${tl('ok. {0} / tydz. · {1} / mies.{2}', zl(sum * 12 / 52), zl(sum), unknown ? ` ${tl('(bez {0} {1} bez ceny)', unknown, P.plural(unknown, tl('nawozu'), tl('nawozów'), tl('nawozów')))}` : '')}`)));
      else if (unknown) out.append(h('p', { class: 'note' }, tl('Koszt nawożenia: wpisz cenę opakowania przy nawozie (Baza nawozów).'))); }
    // źródła składników
    const srcRows = Object.keys(r.by).filter(k => !['SO4', 'Cl', 'Na'].includes(k) || state.adv).sort((a, b) => X.ION_ORDER.indexOf(a) - X.ION_ORDER.indexOf(b));
    if (srcRows.length) out.append(h('div', { class: 'folds', style: 'margin-bottom:14px' }, fold(tl('Skąd pochodzą składniki'), 'pack',
      h('div', { html: srcRows.map(k => { const tot = r.total[k]; return `<div class="kv"><span>${ionL(k)}</span><b style="font-weight:500;text-align:right">${r.by[k].map(b => `${esc(b.name)} ${gfmt(b.v)} <small>(${fnum(b.v / tot * 100, 0)}%)</small>`).join('<br>')}</b></div>`; }).join('') +
        (state.adv ? (() => { const d = X.derived(r.total); return `<div class="note">${tl('W przeliczeniu na pierwiastki: N {0}, P {1}{2} mg/l tygodniowo.', gfmt(d.N), gfmt(d.P), d.S > 0 ? ', S ' + gfmt(d.S) : '')}</div>`; })() : '') }))));
    // co faktycznie podano
    const now = Date.now(), per = st.per || 7, pt = P.periodTotals(EV(), now - per * P.DAY, now), wks = per / 7;
    const sec = h('div', {}, h('p', { class: 'note', style: 'margin:0 0 8px' }, tl('mg/l na tydzień, z zapisanych dawek')),
      h('div', { class: 'chips' }, [[7, tl('7 dni')], [30, tl('30 dni')]].map(([v, l]) => h('button', { class: 'chip' + (per === v ? ' on' : ''), type: 'button', onclick: () => { st.per = v; save(); update(); } }, l))));
    const ak = keys.filter(k => (pt.total[k] || 0) > 0 || (r.total[k] || 0) > 0);
    if (!Object.keys(pt.byProduct).length) sec.append(h('p', { class: 'note', style: 'margin:0' }, tl('Brak zapisanych dawek. Zapisujesz je przyciskiem + albo odhaczając zadanie.')));
    else sec.append(h('div', { html: nutGrid(ak.map(k => ({ l: ionL(k), v: gfmt((pt.total[k] || 0) / wks), sub: r.total[k] ? `plan ${gfmt(r.total[k])}` : tl('poza planem') }))) }),
      h('p', { class: 'note' }, Object.values(pt.byProduct).map(b => `${esc(b.name)}: ${b.count}× (${gfmt(b.amount)} ${b.unit || ''})`).join(', ') + '.'));
    out.append(h('div', { class: 'folds', style: 'margin-bottom:14px' }, fold(tl('Podane wg dziennika'), 'book', sec)));
    if (keepStock !== true) drawStock();
  }
  drawList(); update(); drawStock();
};

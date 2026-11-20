if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – Mikro: gotowa mieszanka (CSM+B, Rexolin…) albo pojedyncze sole i chelaty → gramy do butelki ===== */
const kxMicroProds = () => allProducts().filter(p => LICZ.isMicroSource(p) && LICZ.MIC_EL.some(k => p.ppm[k] > 0));

KX.mikro = root => {
  const s = kxState().mikro; s.per ||= 'week'; s.src ||= 'salts';
  if (!Array.isArray(s.rows) || !s.rows.length) s.rows = [{ k: 'Fe', t: '0,1', src: 'FeDTPA|0', ...(kxState().chel.FeDTPA ? { pct: kxState().chel.FeDTPA } : {}) }];
  const prods = kxMicroProds();
  if (!prods.some(p => p.id === s.prod)) s.prod = (prods[0] || {}).id || '';
  // tryb mieszanki: jeden wiersz z produktem jako źródłem; pozostałe pierwiastki wynikają z proporcji
  const mixRow = () => { const pr = productById(s.prod); if (pr && !(pr.ppm[s.el] > 0)) s.el = LICZ.MIC_EL.find(k => pr.ppm[k] > 0) || 'Fe'; return [{ k: s.el, t: s.t ?? '', src: 'p:' + s.prod }]; };
  Object.defineProperty(s, '_mix', { get: mixRow, configurable: true, enumerable: false });
  kxSaltsCalc(root, s, { type: 'mikro', name: tl('Mikro'), title: tl('Co dodać'), keys: LICZ.MIC_EL, defName: tl('Mój nawóz mikro'), edta: true, element: true, advNote: true,
    allRows: ['rows'], onPer: (from, to) => { s.t = LICZ.convertPer([{ t: s.t ?? '' }], from, to, kxN(s) || 7)[0].t; },
    rowsKey: () => s.src === 'mix' ? '_mix' : 'rows',
    before: (redraw, update) => {
      const box = h('div', { class: 'stack' }, kxChoice([['mix', tl('Gotowa mieszanka')], ['salts', tl('Sole i chelaty')]], s.src, v => { s.src = v; save(); redraw(); }, tl('Źródło')));
      if (s.src === 'mix') {
        if (!prods.length) { box.append(h('p', { class: 'note' }, tl('W bazie nie ma żadnej mieszanki. Dodaj swoją w Bazie nawozów jako nawóz mikro.'))); return box; }
        const sel = h('select', { 'aria-label': tl('Mieszanka') }, prods.map(p => h('option', { value: p.id, selected: p.id === s.prod }, p.name + (p.unit === 'g' ? tl(' (proszek)') : tl(' (płyn)')))));
        sel.onchange = () => { s.prod = sel.value; save(); redraw(); };
        const pr = productById(s.prod), els = LICZ.MIC_EL.filter(k => pr && pr.ppm[k] > 0);
        const elSel = h('select', { 'aria-label': tl('Pierwiastek celu') }, els.map(k => h('option', { value: k, selected: k === s.el }, ionL(k))));
        elSel.onchange = () => { s.el = elSel.value; save(); redraw(); };
        const t = kxNum(s, 't', tl('O ile podnieść'), tl('mg/l'), { ph: '0,1', aria: tl('Przyrost {0}', ionL(s.el)), onInput: update });
        box.append(selField(tl('Mieszanka'), sel), h('div', { class: 'grid' }, selField(tl('Licz według'), elSel), t.el),
          pr ? h('p', { class: 'kx-hint' }, tl('Skład: {0}. Pozostałe pierwiastki dostaniesz w tych samych proporcjach.', els.map(k => `${ionL(k)} ${gfmt(pr.ppm[k] / (pr.unit === 'g' ? 10 : 1))}${pr.unit === 'g' ? '%' : tl(' g/l')}`).join(', '))) : null);
      }
      return box;
    },
    after: redrawAfter => s.src === 'mix' ? null : h('div', { class: 'kx-edta' }, h('span', { class: 'lbl' }, tl('EDTA do metali z soli (1 mol na 1 mol Fe, Mn, Zn, Cu i Co)')),
      kxChoice([['', tl('Bez EDTA')], ['Na2EDTA', 'Na₂EDTA·2H₂O'], ['Na4EDTA', 'Na₄EDTA·2H₂O']], s.edta || '', v => { s.edta = v; save(); redrawAfter(); }, 'EDTA')),
    extraOut: (p, n) => p.Fe > 0 && LICZ.MIC_EL.some(k => k !== 'Fe' && p[k] > 0) ? h('p', { class: 'kx-extra' }, tl('Na 1 mg żelaza przypada: {0}.', LICZ.MIC_EL.filter(k => k !== 'Fe' && p[k] > 0).map(k => `${ionL(k)} ${fnum(p[k] / p.Fe, 3)} mg`).join(', '))) : null,
    extra: (sel, r) => { const ps = prods.filter(p => p.ppm[r.k] > 0); if (ps.length) sel.append(h('optgroup', { label: tl('Gotowe mieszanki') }, ps.map(p => h('option', { value: 'p:' + p.id, selected: r.src === 'p:' + p.id }, p.name)))); } });
};

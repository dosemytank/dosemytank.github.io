if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – Historia obliczeń (state.calcLog) i przygotowane partie receptur (state.batches) ===== */
KX.historia = root => {
  const L0 = state.calcLog || [], when = ts => { const d = new Date(ts); return relDay(P.dkey(d)) + ', ' + fmtTime(d); };
  const reopen = e => {
    const s = kxState();
    if (e.type === 'receptura') { if (e.input.id === 'sprawdz') Object.assign(s.rec, { items: e.input.items, bottle: e.input.bottle, dose: e.input.dose, n: e.input.n });
      else Object.assign(s.rec, { _for: e.input.id, bottle: e.input.bottle, dose: e.input.dose, n: e.input.n });
      save(); go('kalkulator/receptury/' + e.input.id); return; }
    s[e.type] = JSON.parse(JSON.stringify(e.input)); if (e.tankId && state.tanks.some(t => t.id === e.tankId)) { state.active = e.tankId; s[e.type]._t = e.tankId; }
    save(); go('kalkulator/' + e.type);
  };
  const item = e => h('li', { class: 'kx-hist' }, h('div', { class: 'kx-hist-h' }, h('b', {}, KX_TYPE[e.type] || e.type), h('small', {}, `${when(e.ts)} · ${e.tank || ''}`)),
    h('div', {}, e.sum || ''),
    h('div', { class: 'kx-acts' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => reopen(e) }, tl('Otwórz ponownie')),
      e.text ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => kxCopy(e.text) }, tl('Kopiuj')) : null,
      h('button', { class: 'btn ghost small', type: 'button', 'aria-label': tl('Usuń wpis z historii'), onclick: () => { state.calcLog = (state.calcLog || []).filter(x => x.id !== e.id); save(); render.keepScroll = true; render(); } }, tl('Usuń'))));
  root.append(kxSec(tl('Ostatnie obliczenia'), L0.length ? h('ul', { class: 'kx-histlist' }, L0.map(item))
    : h('p', { class: 'note' }, tl('Brak obliczeń. Każde obliczenie z kalkulatora zapisuje się tu automatycznie (100 ostatnich).')),
    L0.length ? h('div', { class: 'kx-acts' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (confirm(tl('Wyczyścić całą historię obliczeń?'))) { state.calcLog = []; save(); render(); } } }, tl('Wyczyść historię'))) : null));
  const B = [...state.batches].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 30);
  root.append(kxSec(tl('Przygotowane partie'), B.length ? h('ul', { class: 'kx-histlist' }, B.map(b => h('li', { class: 'kx-hist' }, h('div', { class: 'kx-hist-h' }, h('b', {}, b.name), h('small', {}, `${tl('{0} · {1} ml', relDay(b.date), fnum(b.vol, 0))}`)),
    h('div', {}, b.items.filter(i => i.g > 0).map(i => `${itName(i)} ${gfmt(i.g)} g`).join(', ')), h('div', { class: 'kx-acts' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => showBatch(b) }, tl('Szczegóły'))))))
    : h('p', { class: 'note' }, tl('Brak. Kiedy zrobisz butelkę z własnego przepisu, wybierz w nim „Przygotowałem”.'))));
};

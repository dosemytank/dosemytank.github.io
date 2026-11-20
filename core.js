if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Wspólne komponenty interfejsu ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k]; if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}
const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  leaf: '<path d="M5 21c0-9 5-15 15-16 0 9-5 15-14 16"/><path d="M5 21c2-5 5-8 9-10"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.7 2.7 0 0 0 2.5 2"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M9 8h7M9 12h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  chev: '<path d="M6 9l6 6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
  wave: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-3 5-2"/><path d="M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-3 5-2"/>',
  co2: '<circle cx="8" cy="12" r="4"/><circle cx="17" cy="8" r="2.5"/><circle cx="17" cy="16" r="2.5"/>',
  mix: '<path d="M4 4h16l-6 8v6l-4 2v-8z"/>', chart: '<path d="M4 20V4M4 20h16M8 15l4-5 3 3 5-6"/>',
  pack: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', garden: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/>',
  test: '<path d="M14 3l7 7-9 9a3 3 0 0 1-4 0l-3-3a3 3 0 0 1 0-4z"/><path d="M8 11l5 5"/>', swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  acid: '<path d="M9 3h6M10 3v5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-10V3"/><path d="M9 14h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', chevr: '<path d="M9 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', tank: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10c3 1.5 6 1.5 9 0s6-1.5 9 0"/>', tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  cup: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3v2M12 3v2"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
};
const icon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
const ico = (n, s) => h('span', { html: icon(n, s), style: 'display:inline-flex' });

/* ---------- formatowanie ---------- */
const fnum = (x, d = 2) => isFinite(x) ? fmtNum(x, d) : '—';
const gfmt = x => !(x > 0) ? '0' : x < 0.01 ? fnum(x, 4) : x < 0.1 ? fnum(x, 3) : x < 10 ? fnum(x, 2) : fnum(x, 1);
const alertH = (kind, text) => `<div class="alert ${kind}">${icon(kind === 'ok' ? 'info' : kind === 'info' ? 'info' : 'warn', 18)}<div>${text}</div></div>`;
function rbar(label, val, range, unit = tl('mg/l'), note = '') {
  const [lo, hi] = range, max = Math.max(hi * 1.5, val * 1.08, 0.0001);
  let cls = '', st = '';
  if (val > 0) { cls = val < lo ? 'low' : val > hi ? 'high' : 'ok'; st = cls === 'low' ? tl('poniżej zakresu') : cls === 'high' ? tl('powyżej zakresu') : tl('w zakresie'); }
  const pos = Math.min(val / max, 1) * 100;
  return `<div class="rb ${cls}"><div class="rb-h"><span>${label}<em>${lo > 0 ? lo + '–' : '≤ '}${hi} ${unit}${note}</em></span><span><b>${gfmt(val)}</b> <small>${unit}</small> <span class="st">${st}</span></span></div>
  <div class="rb-t"><div class="rb-ok" style="left:${lo / max * 100}%;width:${(hi - lo) / max * 100}%"></div>${val > 0 ? `<div class="rb-m" style="left:${pos}%"></div>` : ''}</div></div>`;
}
const table = (head, rows, cls = '') => `<table class="t ${cls}"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => { const o = c !== null && typeof c === 'object'; return `<td${o && c.big ? ' class="big"' : ''}>${o ? c.v : c}</td>`; }).join('')}</tr>`).join('')}</table>`;
// kafelki wyników: [{ k, l, v, sub, hl }] – składnik, wartość główna, podpis, wyróżnienie
// krótka etykieta, objaśnienie po dotknięciu
const whyH = (label, text) => `<details class="why"><summary>${label}</summary><p>${text}</p></details>`;
const nutGrid = (items, unit = tl('mg/l')) => `<div class="nutgrid">${items.map(i => `<div class="nut${i.hl ? ' hl' : ''}${i.st ? ' ' + i.st : ''}"><span>${i.l}</span><b>${i.v}</b>${i.sub ? `<small>${i.sub}</small>` : ''}${i.rng ? `<small class="rng">${i.rng}</small>` : ''}</div>`).join('')}</div>`;
// komunikat z przyciskiem „Cofnij” (np. po szybkim wpisie)
function undoToast(msg, undo, ms = 6000) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = h('div', { class: 'toast undo', role: 'status' }, h('span', {}, msg), h('button', { type: 'button', onclick: () => { t.remove(); undo(); } }, tl('Cofnij')));
  document.body.append(t); setTimeout(() => t.remove(), ms);
}
function toast(msg, ms = 2200) { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); }

/* ---------- formularze ---------- */
function Form(key, onChange) {
  const store = (state.inputs[key] ||= {}), refs = {};
  const api = {
    store, refs,
    num(id, label, o = {}) {
      if (store[id] === undefined) store[id] = String(o.def ?? '').replace('.', DEC);
      const inp = h('input', { type: 'text', inputmode: 'decimal', value: store[id], autocomplete: 'off', 'aria-label': label });
      inp.addEventListener('input', () => { store[id] = inp.value; save(); onChange(); });
      refs[id] = inp;
      return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inp' }, inp, o.unit ? h('i', { class: 'unit' }, o.unit) : null), o.hint ? h('small', { class: 'hint' }, o.hint) : null);
    },
    sel(id, label, opts, def) {
      if (store[id] === undefined) store[id] = String(def ?? opts[0][0]);
      const s = h('select', { 'aria-label': label }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(store[id]) }, t)));
      s.addEventListener('change', () => { store[id] = s.value; save(); onChange(); });
      refs[id] = s;
      return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inp' }, s));
    },
    n(id) { const v = parseFloat(String(store[id]).replace(',', '.')); return isFinite(v) && v >= 0 ? v : 0; },
    s(id) { return store[id]; },
    set(id, v) { store[id] = String(v); if (refs[id]) refs[id].value = String(v); save(); },
  };
  return api;
}
// 7.17: wybór jednej z kilku opcji w formularzu = przełącznik segmentowy (.kx-seg, jak w „Przygotuj nawóz”);
// kind = 'filter' – pigułki filtrów nad listą (Dziennik, Baza nawozów, Gotowe nawozy)
function chips(options, current, onPick, kind) {
  if (kind === 'filter') { const wrap = h('div', { class: 'chips' });
    options.forEach(([v, t]) => wrap.append(h('button', { class: 'chip' + (v === current ? ' on' : ''), type: 'button', onclick: () => onPick(v) }, t))); return wrap; }
  return h('div', { class: 'kx-seg wrap', role: 'radiogroup' }, options.map(([v, t]) => h('button', { class: v === current ? 'on' : '', type: 'button', role: 'radio', 'aria-checked': String(v === current), onclick: () => onPick(v) }, t)));
}
// 7.14: szkic wykresu w pustych stanach – pokazuje, co powstanie po kilku testach (bez danych, tylko kształt)
const emptyChart = () => h('div', { class: 'echart', 'aria-hidden': 'true', html: ('<svg viewBox="0 0 320 104">' + '<rect class="eb" x="0" y="30" width="320" height="38" rx="6"/>' + '<text x="8" y="22">' + tl('NO₃ · pasek = cel z profilu') + '</text>' + '<polyline class="el" points="10,72 58,66 106,58 154,55 202,48 250,51 310,43"/>' + '<line class="ea" x1="0" y1="98" x2="320" y2="98"/>' + '</svg>') });
// 7.17: link powrotu w kalkulatorze – ten sam wygląd co przycisk „wstecz” w reszcie aplikacji (zielony, chevron)
const backLink = (href, label) => h('a', { class: 'kx-back', href }, h('span', { html: icon('chevr', 16), style: 'display:inline-flex;transform:rotate(180deg)' }), label);
// 7.17: karty z wynikiem obliczeń dostają nagłówek jak „Twój przepis” w „Przygotuj nawóz”
const RES_CARDS = new Set([tl('Wynik'), tl('Stężenie CO₂'), tl('Ile kwasu'), tl('Przebieg w czasie'), tl('Dodaj'), tl('Stężenie'), tl('Ile wymienić, żeby obniżyć')]);
const card = (title, iconName, ...kids) => h('section', { class: 'card' + (RES_CARDS.has(title) ? ' card-res' : '') }, title ? h('h2', {}, iconName ? ico(iconName, 18) : null, title) : null, ...kids);
const volLine = () => h('div', { class: 'volline' }, h('span', { html: `${tl('{0}<b>{1} l</b> · {2}', icon('drop', 16), fnum(tank().V, 1), esc(tank().name))}` }),
  h('button', { class: 'linkbtn', onclick: openTankSheet }, tl('Zmień')));

/* 8.0: galony US → litry. Aplikacja liczy zawsze w litrach; galony to tylko przeliczenie przy wpisywaniu objętości zbiornika.
   Pokazywane w wersji angielskiej (w Polsce objętość podaje się w litrach). Ustawia wartość pola i wywołuje jego zdarzenia. */
const US_GAL = 3.785411784;
function galHelper(inp) {
  if (typeof LANG === 'undefined' || LANG !== 'en') return null;
  return h('button', { type: 'button', class: 'linkbtn gal', onclick: () => {
    const g = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': tl('Galony US'), placeholder: '20' }), out = h('p', { class: 'help-o', 'aria-live': 'polite' });
    const L = () => { const x = parseFloat(String(g.value).replace(',', '.')); return x > 0 ? x * US_GAL : 0; };
    g.addEventListener('input', () => { out.textContent = L() ? tl('{0} galonów US = {1} l', fnum(parseFloat(g.value.replace(',', '.')), 2), fnum(L(), 1)) : ''; });
    const bg = sheet([h('h3', {}, tl('Przelicz galony na litry')), h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Galony US')), h('span', { class: 'inp' }, g, h('i', { class: 'unit' }, 'gal'))), out,
      h('p', { class: 'note' }, tl('Aplikacja liczy w litrach. 1 galon US = 3,785 l. Wpisz objętość wody bez podłoża i dekoracji.')),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => { const l = L(); if (!l) { toast(tl('Wpisz liczbę galonów')); return; }
        inp.value = String(+l.toFixed(1)).replace('.', DEC); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); bg.remove(); } }, tl('Wstaw litry')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => bg.remove() }, tl('Anuluj')))]);
    setTimeout(() => g.focus(), 50);
  } }, tl('Masz galony? Przelicz na litry'));
}

/* ---------- wykres liniowy SVG ---------- */
function lineChart(pts, o = {}) { // pts: [{x:label,y:number}]
  const W = 320, H = 150, L = 30, R = 18, T = 10, B = 22;
  if (pts.length < 1) return '';
  const ys = pts.map(p => p.y); let lo = o.min ?? Math.min(...ys), hi = o.max ?? Math.max(...ys);
  if (o.band) { lo = Math.min(lo, o.band[0]); hi = Math.max(hi, o.band[1]); }
  if (hi === lo) { hi += 1; lo -= 1; } const pad = (hi - lo) * 0.1; if (o.min === undefined) lo -= pad; if (o.max === undefined) hi += pad;
  const X = i => L + (pts.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (pts.length - 1)), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || tl('wykres'))}">`;
  for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 4}" y="${y + 3}" text-anchor="end">${fnum(v, hi - lo < 5 ? 1 : 0)}</text>`; }
  if (o.band) s += `<rect class="band" x="${L}" width="${W - L - R}" y="${Y(o.band[1])}" height="${Y(o.band[0]) - Y(o.band[1])}"/>`;
  if (o.ref !== undefined) s += `<line class="ref" x1="${L}" x2="${W - R}" y1="${Y(o.ref)}" y2="${Y(o.ref)}"/>`;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  if (pts.length > 1) s += `<path class="area" d="${path}L${X(pts.length - 1)},${H - B}L${X(0)},${H - B}Z"/>`;
  s += `<path class="line" d="${path}"/>`;
  const step = Math.max(1, Math.ceil(pts.length / 6));
  pts.forEach((p, i) => {
    if (pts.length <= 40) s += `<circle class="dot" cx="${X(i)}" cy="${Y(p.y)}" r="2.6"/>`;
    if (i % step === 0 || i === pts.length - 1) s += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${esc(p.x)}</text>`;
  });
  return s + '</svg>';
}

/* ---------- wykres w czasie: zmierzone (punkty), szacunek (przerywana), podmiany i dawki (znaczniki) ---------- */
function timeChart(d, o = {}) {
  const W = 330, H = 170, L = 32, R = 10, T = 10, B = 30, from = o.from, to = o.to;
  const vals = d.meas.filter(p => p.ts >= from).flatMap(p => [p.v, p.hi ?? p.v]);
  if (!vals.length) return '';
  let lo = Math.min(0, ...vals), hi = Math.max(...vals, o.band ? o.band[1] : 0); if (hi === lo) hi = lo + 1; hi += (hi - lo) * 0.08;
  const X = ts => L + (ts - from) / (to - from) * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || tl('wykres'))}">`;
  for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 4}" y="${y + 3}" text-anchor="end">${fnum(v, hi - lo < 3 ? 2 : hi - lo < 20 ? 1 : 0)}</text>`; }
  if (o.band) s += `<rect class="band" x="${L}" width="${W - L - R}" y="${Y(o.band[1])}" height="${Math.max(Y(o.band[0]) - Y(o.band[1]), 0)}"/>`;
  for (const w of d.waters) if (w.ts >= from) s += `<line class="wchg" x1="${X(w.ts)}" x2="${X(w.ts)}" y1="${T}" y2="${H - B}"/>`;
  for (const q of d.doses) if (q.ts >= from) s += `<path class="dmark" d="M${X(q.ts) - 3},${H - B + 7}l3,-5l3,5z"/>`;
  const m = d.meas.filter(p => p.ts >= from), rng = m.filter(p => p.lo != null && p.hi != null);
  // pasmo niepewności (np. CO₂ wyliczone z pH i KH)
  if (rng.length > 1) s += `<path class="band2" d="${rng.map((p, i) => `${i ? 'L' : 'M'}${X(p.ts).toFixed(1)},${Y(p.hi).toFixed(1)}`).join('')}${[...rng].reverse().map(p => `L${X(p.ts).toFixed(1)},${Y(p.lo).toFixed(1)}`).join('')}Z"/>`;
  rng.forEach(p => { s += `<line class="whisk" x1="${X(p.ts)}" x2="${X(p.ts)}" y1="${Y(p.hi)}" y2="${Y(p.lo)}"/>`; });
  if (m.length > 1) s += `<path class="line" d="${m.map((p, i) => `${i ? 'L' : 'M'}${X(p.ts).toFixed(1)},${Y(p.v).toFixed(1)}`).join('')}"/>`;
  m.forEach(p => { s += `<circle class="dot" cx="${X(p.ts)}" cy="${Y(p.v)}" r="3.2"/>`; });
  const fmtD = ts => fmtDayMonth(new Date(ts));
  for (let i = 0; i <= 3; i++) { const ts = from + (to - from) * i / 3; s += `<text x="${X(ts)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}">${fmtD(ts)}</text>`; }
  return s + '</svg><div class="legend"><span><i class="lg-m"></i>' + (rng.length ? tl('wyliczone (pasmo)') : tl('zmierzone')) + '</span>' + (d.waters.some(w => w.ts >= from) ? ('<span>' + '<i class="lg-w">' + '</i>' + tl('podmiana') + '</span>') : '') + (d.doses.some(q => q.ts >= from) ? ('<span>' + '<i class="lg-d">' + '</i>' + tl('dawka') + '</span>') : '') + '</div>';
}

/* ---------- okno dolne ---------- */
function sheet(content) {
  const bg = h('div', { class: 'sheet-bg', onclick: e => { if (e.target === bg) bg.remove(); } }, h('div', { class: 'sheet' }, content));
  document.body.append(bg); return bg;
}

/* 7.16: listy wyboru soli pokazują tylko wzór (np. „KNO₃”); pełna nazwa („KNO₃ – Azotan potasu”) dopiero po otwarciu listy.
   Dotyczy opcji w formacie „wzór – nazwa”, gdzie wzór to jedno słowo zaczynające się wielką literą. */
function selNames(sel, full) {
  for (const o of sel.options) {
    if (o.dataset.full === undefined) { const i = o.textContent.indexOf(' – '), a = i > 0 ? o.textContent.slice(0, i) : '';
      o.dataset.full = /^[A-Z][^\s–]*$/.test(a) ? o.textContent : ''; if (o.dataset.full) { o.dataset.short = a; if (!o.title) o.title = o.dataset.full; } }
    if (o.dataset.full) o.textContent = full ? o.dataset.full : o.dataset.short;
  }
}
['mousedown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, e => { if (e.target.tagName === 'SELECT') selNames(e.target, true); }, true));
['change', 'focusout'].forEach(ev => document.addEventListener(ev, e => { if (e.target.tagName === 'SELECT') selNames(e.target, false); }, true));
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) (n.tagName === 'SELECT' ? [n] : n.querySelectorAll('select')).forEach(s => { if (document.activeElement !== s) selNames(s, false); }); })
  .observe(document.documentElement, { childList: true, subtree: true });

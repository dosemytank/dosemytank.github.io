if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – część wspólna: router sekcji, akwarium, pola, wynik w tabeli, kopiowanie, zapis, historia =====
   Ekrany: kalk-makro.js, kalk-mikro.js, kalk-gotowe.js, kalk-receptury.js, kalk-historia.js. Obliczenia: nawozy-licz.js (LICZ). */
const KX_SECTIONS = [['nawoz', tl('Nawozy z soli')], ['gotowe', tl('Gotowe nawozy')], ['receptury', tl('Przepisy')], ['historia', tl('Historia')], ['zaawansowane', tl('Zaawansowane')]];
// podstrony bez własnej zakładki: która zakładka jest wtedy podświetlona
const KX_PARENT = { makro: 'zaawansowane', mikro: 'zaawansowane', mineral: 'nawoz', zakupy: 'nawoz' }; // 7.11: wspólna lista zakupów // 7.10: mineralizacja wody obok „Zrób nawóz”, w tej samej zakładce
const KX = {}; // ekrany: KX.makro(root), …
const KX_SIDE = ['Na', 'SO4', 'Cl', 'HCO3', 'CO3'];
const kxMain = p => X.ION_ORDER.filter(k => (p[k] || 0) > 0.00005 && !KX_SIDE.includes(k));
const kxSide = p => X.ION_ORDER.filter(k => (p[k] || 0) > 0.00005 && KX_SIDE.includes(k));
const kxIons = (p, ks = kxMain(p), mult = 1) => ks.map(k => `${ionL(k)} ${gfmt(p[k] * mult)}`).join(' · ');

/* ---------- stan formularzy ----------
   state.inputs.kx – nowe formularze; state.inputs.kalk (6.11) zostaje nietknięty (powrót do 6.11 działa).
   Przy pierwszym otwarciu ostatnie wpisy z 6.11 są kopiowane do nowych formularzy. */
function kxState() {
  const s = (state.inputs.kx ||= {});
  if (!s._mig) {
    const o = state.inputs.kalk || {};
    s.makro = { per: 'week', bottle: o.bottle || '500', dose: o.dose || '10', n: o.n || '7', rows: Array.isArray(o.rows) && o.rows.length ? JSON.parse(JSON.stringify(o.rows)) : null };
    const mr = Array.isArray(o.mrows) ? JSON.parse(JSON.stringify(o.mrows)) : null, mix = mr && mr.find(r => String(r.src).startsWith('p:'));
    s.mikro = { per: 'week', bottle: o.bottle || '500', dose: o.dose || '10', n: o.n || '7', edta: o.edta || '',
      src: mix ? 'mix' : 'salts', prod: mix ? mix.src.slice(2) : 'b26', el: mix ? mix.k : 'Fe', t: mix ? mix.t : '0,1', rows: mr && !mix && mr.length ? mr : null };
    const pr = o.prep || {};
    s.gotowe = { pid: pr.pid && pr.pid !== '__custom' && !LICZ.isMicroConc(productById(pr.pid)) ? pr.pid : '', way: pr.way === 'target' ? 'target' : 'dose', ldose: pr.ldose || '5', el: pr.el || 'Fe', t: '', per: 'week', n: o.n || '7', cmp: [] };
    s.rec = { open: '', bottle: o.bottle || '500', dose: o.dose || '10', n: o.n || '7', items: Array.isArray(o.items) ? JSON.parse(JSON.stringify(o.items)) : [{ mat: 'KNO3', hyd: 0, g: 0 }] };
    s.chel = { ...(o.chel || {}) }; s._mig = 1; save();
  }
  return s;
}

/* ---------- router: #/kalkulator/<sekcja>, #/kalkulator → ostatnio używana ---------- */
PAGES.kalkulator = root => {
  const raw = location.hash.replace(/^#\/?/, ''), path = ALIAS[raw] || raw; // stare adresy (nawozy/mikro…) → nowe
  const parts = path.split('/'), s = kxState(); if (!s._v75) { s._v75 = 1; s.last = 'nawoz'; save(); } // 7.5: „Zrób nawóz” na start
  const sub = parts[1], cur = KX[sub] ? sub : (KX[s.last] ? s.last : 'nawoz'), tab = cur === 'receptury' && parts[2] === 'sprawdz' ? 'zaawansowane' : KX_PARENT[cur] || cur;
  const want = 'kalkulator/' + cur + (sub === cur && parts[2] ? '/' + parts[2] : '');
  if (raw !== want) history.replaceState(null, '', '#/' + want);
  if (s.last !== cur) { s.last = cur; save(); }
  root.classList.add('kx');
  root.append(h('nav', { class: 'kx-nav', 'aria-label': tl('Kalkulatory') }, KX_SECTIONS.map(([k, l]) =>
    h('a', { href: '#/kalkulator/' + k, class: k === tab ? 'on' : '', 'aria-current': k === tab ? 'page' : null }, l))));
  if (KX_PARENT[cur] === 'zaawansowane') root.append(backLink('#/kalkulator/zaawansowane', tl('Zaawansowane')));
  KX[cur](root);
};

/* ---------- układ: formularz | wynik ---------- */
function kxLayout(root) {
  const form = h('div', { class: 'kx-form' }), out = h('div', { class: 'kx-out', 'aria-live': 'polite' });
  root.append(h('div', { class: 'kx-cols' }, form, out));
  return { form, out };
}
const kxSec = (title, ...kids) => h('section', { class: 'kx-sec' }, title ? h('h2', { class: 'kx-h' }, title) : null, ...kids);

// pole liczby: zapis do obj[key] przy każdej zmianie; przecinek i kropka; błąd przy polu
function kxNum(obj, key, label, unit, o = {}) {
  const f = inputF(label, unit, obj[key] ?? '', { ph: o.ph || '', hint: o.hint });
  if (o.aria) f.inp.setAttribute('aria-label', o.aria);
  const err = h('small', { class: 'kx-err', role: 'alert' });
  const check = () => { const v = f.val(), x = n2(v); err.textContent = v !== '' && (x === undefined || x < 0) ? tl('Wpisz liczbę, np. 0,5') : o.check ? o.check(x) || '' : ''; f.el.classList.toggle('bad', !!err.textContent); };
  f.inp.addEventListener('input', () => { obj[key] = f.val(); save(); check(); o.onInput && o.onInput(); });
  f.el.append(err); check(); f.check = check; return f;
}
function kxChoice(opts, cur, onPick, label) {
  return h('div', { class: 'kx-seg', role: 'radiogroup', 'aria-label': label || null }, opts.map(([v, l]) =>
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === cur), class: v === cur ? 'on' : '', onclick: () => onPick(v) }, l)));
}

// akwarium: wybór zbiornika (gdy jest kilka) albo litry netto; domyślnie objętość z profilu
function kxTank(s, onChange) {
  const t = tank(); if (s._t !== t.id) { s._t = t.id; s.V = ''; }
  const f = kxNum(s, 'V', tl('Woda w akwarium'), tl('l'), { ph: fnum(t.V, 0), onInput: onChange, hint: s.V ? '' : `${tl('Z ustawień akwarium: {0} l', fnum(t.V, 0))}`, check: x => x > 0 && (x < 1 || x > 20000) ? tl('To nie wygląda na litry akwarium (1–20 000 l)') : '' });
  const kids = [f.el];
  if (state.tanks.length > 1) {
    const sel = h('select', { 'aria-label': tl('Zbiornik') }, state.tanks.map(x => h('option', { value: x.id, selected: x.id === t.id }, `${tl('{0} · {1} l', x.name, fnum(x.V, 0))}`)));
    sel.onchange = () => { state.active = sel.value; save(); render.keepScroll = true; render(); };
    kids.unshift(selField(tl('Zbiornik'), sel));
  }
  const gal = galHelper(f.inp);
  return { el: gal ? h('div', {}, h('div', { class: 'grid' }, kids), gal) : h('div', { class: 'grid' }, kids), V: () => n2(s.V) > 0 ? n2(s.V) : t.V };
}
// roztwór: butelka, dawka, dawek w tygodniu
function kxBottle(s, onChange, o = {}) {
  const b = o.noBottle ? null : kxNum(s, 'bottle', tl('Butelka'), 'ml', { ph: '500', onInput: onChange });
  const d = o.noBottle ? null : kxNum(s, 'dose', tl('Dawka'), 'ml', { ph: '10', onInput: onChange, check: x => x > 0 && n2(s.bottle) > 0 && x > n2(s.bottle) ? tl('Dawka nie może być większa od butelki') : '' });
  const n = kxNum(s, 'n', tl('Dawek w tygodniu'), '×', { ph: '7', onInput: onChange, check: x => x > 21 ? tl('Najwyżej 21 dawek') : '' });
  return h('div', { class: o.noBottle ? 'grid' : 'grid3' }, b && b.el, d && d.el, n.el);
}
const kxN = s => { const v = Math.round(n2(s.n)); return v > 0 ? v : 0; };

/* ---------- wynik ---------- */
// lista ostrzeżeń: krytyczne nad tabelą, reszta pod wynikiem
const kxAlerts = list => list.map(([sev, t]) => h('div', { class: 'kx-msg ' + sev, role: sev === 'bad' ? 'alert' : null }, t));
// tabela pozycji: [{ name, amount, unit, gl, gives, sub }]
function kxTable(rows, o = {}) {
  const head = [o.col1 || tl('Sól'), `${tl('Odważ ({0})', o.unit || 'g')}`, o.col3 || tl('W butelce (g/l)'), o.col4 || tl('Jedna dawka (mg/l)')];
  return h('div', { class: 'kx-scroll' }, h('table', { class: 'kx-t' }, h('thead', {}, h('tr', {}, head.map(x => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map(r => h('tr', { class: r.cls || '' }, h('th', { scope: 'row' }, r.name, r.sub ? h('small', {}, r.sub) : null),
      h('td', { class: 'num strong' }, r.amount), h('td', { class: 'num' }, r.gl ?? ''), h('td', { class: 'gives' }, r.gives || ''))))));
}
// dwa wiersze przyrostu: jedna dawka i tydzień
function kxGain(p, dose, n, unit = 'ml') {
  const ks = kxMain(p); if (!ks.length) return null;
  return h('dl', { class: 'kx-gain' },
    h('dt', {}, dose == null ? tl('Po jednej dawce') : `${tl('Po jednej dawce ({0} {1})', gfmt(dose), unit)}`), h('dd', {}, '+' + kxIons(p, ks), h('small', {}, tl(' mg/l'))),
    h('dt', {}, `${tl('Po tygodniu ({0} {1})', n, kxPl(n, tl('dawka'), 'dawki', tl('dawek')))}`), h('dd', {}, '+' + kxIons(p, ks, n), h('small', {}, tl(' mg/l'))));
}
// skutki uboczne: twardość, azot, jony towarzyszące, proporcja NO₃:PO₄
function kxExtras(p, n) {
  const d = X.derived(p), add = [], txt = [];
  if (d.GH > 0.0005) add.push(tl('GH o {0} °dH', gfmt(d.GH * n))); if (d.KH > 0.0005) add.push(tl('KH o {0} °dH', gfmt(d.KH * n)));
  const side = kxSide(p); if (side.length) add.push(side.map(k => `${tl('{0} o {1} mg/l', ionL(k), gfmt(p[k] * n))}`).join(', '));
  if (add.length) txt.push(`${tl('W tygodniu wzrośnie też {0}.', add.join(', '))}`);
  if (p.NO3 > 0 && p.PO4 > 0) txt.push(`${tl('NO₃ do PO₄ wychodzi {0} : 1, a sam azot do fosforu (N : P) {1} : 1.', fnum(p.NO3 / p.PO4, 1), fnum(d.N / d.P, 1))}`);
  const e = X.ecTds(p);
  if (e.ec > 0.5) txt.push(`${tl('Przewodność wzrośnie w tygodniu o ok. {0} µS/cm, a TDS o {1} mg/l. Miernik pokaże zwykle kilka procent mniej.', fnum(e.ec * n, 0), fnum(e.tds * n, 0))}`);
  return txt.length ? h('p', { class: 'kx-extra' }, txt.join(' ')) : null;
}
// porównanie tygodnia z typowymi wartościami EI i PPS-Pro (mg/l)
function kxMethods(p, n) {
  const M = LICZ.metody(), ks = ['NO3', 'PO4', 'K', 'Mg', 'Fe'].filter(k => (p[k] || 0) * n > 0.00005); if (!ks.length) return null;
  return h('details', { class: 'kx-adv kx-meth' }, h('summary', {}, tl('Jak to wypada przy EI i PPS-Pro')),
    h('table', { class: 'kx-t small' }, h('thead', {}, h('tr', {}, [tl('W tygodniu (mg/l)'), tl('U Ciebie'), 'EI', 'PPS-Pro'].map(x => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, ks.map(k => h('tr', {}, h('th', { scope: 'row' }, ionL(k)), h('td', { class: 'num strong' }, gfmt(p[k] * n)), ...['EI', 'PPS-Pro'].map(m => h('td', { class: 'num' }, M[m][k] > 0 ? gfmt(M[m][k]) : '—')))))),
    h('p', { class: 'kx-hint' }, tl('EI daje z zapasem i zakłada podmianę połowy wody co tydzień. PPS-Pro to małe codzienne dawki i niewielkie podmiany. Przy słabym świetle bez CO₂ zwykle wystarcza mniej niż w obu.')));
}
// rozpuszczalność soli w butelce (tylko powyżej 50%); przy wspólnym jonie – orientacyjnie, próg 70% (pkt C5)
const kxCommon = r => (r.common || []).map(k => X.ION[k] ? X.ION[k].l : k).join(tl(' i '));
function kxSol(rows) {
  const r = (rows || []).filter(x => x.ratio > 0.5); if (!r.length) return null;
  return h('ul', { class: 'kx-solu' }, r.map(x => h('li', { class: x.ratio > 1 ? 'bad' : x.ratio > X.safeOf(x) ? 'warn' : '' }, (x.ratio > 1 ? `${tl('{0} przekracza granicę rozpuszczalności ({1}% w 20 °C).', x.formula, fnum(Math.min(x.ratio, 9.99) * 100, 0))}` : `${tl('{0} jest na {1}% granicy rozpuszczalności (w 20 °C).', x.formula, fnum(x.ratio * 100, 0))}`) +
    (x.common && x.common.length ? ` ${tl('Inne sole w butelce też dają {0}, więc prawdziwa granica jest niższa – bezpiecznie do {1}%.', kxCommon(x), fnum(X.safeOf(x) * 100, 0))}` : ''))));
}
// poprawka, gdy sól się nie rozpuści: większa dawka, częstsze dawki, KCl zamiast K₂SO₄
function kxFix(fx, { s, rows, redraw, check }) {
  if (fx.level === 'ok') return null;
  const w = fx.worst, over = fx.level === 'over', dose = n2(s.dose), n = kxN(s), bottle = n2(s.bottle), btns = [];
  const set = (k, v) => { s[k] = String(v).replace('.', DEC); save(); render.keepScroll = true; render(); };
  if (check) btns.push([`${tl('Rozpuść w {0} ml', fnum(X.roundUp(bottle * fx.factor, 50), 0))}`, () => set('bottle', X.roundUp(bottle * fx.factor, 50))]);
  else {
    const d = X.roundUp(dose * fx.factor, dose * fx.factor <= 20 ? 0.5 : 1), nn = Math.ceil(n * fx.factor - 1e-9);
    if (d <= bottle * 0.25) btns.push([`${tl('Ustaw dawkę {0} ml', fnum(d, 1))}`, () => set('dose', d)]);
    if (nn > n && nn <= 7) btns.push([`${tl('Dawkuj {0} razy w tygodniu', nn)}`, () => set('n', nn)]);
    if (rows && w.mat === 'K2SO4' && rows.some(r => r.k === 'K' && r.src === 'K2SO4|0')) btns.push([tl('Potas z KCl zamiast K₂SO₄'), () => { rows.forEach(r => { if (r.k === 'K' && r.src === 'K2SO4|0') r.src = 'KCl|0'; }); save(); redraw(); }]);
  }
  const cm = fx.common && fx.common.length ? ` ${tl('Inne sole w butelce też dają {0}, więc w mieszaninie rozpuści się mniej niż podają tabele – przyjęto bezpieczne {1}%, czyli {2} g/l.', kxCommon(fx), fnum(fx.safe * 100, 0), fnum(fx.safeGL, 0))}` : '';
  const body = (over ? `${tl('{0} się nie rozpuści: potrzeba {1} g/l, a w 20 °C rozpuszcza się najwyżej ok. {2} g/l.', w.formula, fnum(w.gl, 0), fnum(fx.limitGL, 0))}` : `${tl('{0} jest blisko granicy rozpuszczalności ({1}%). W chłodnym miejscu może wypaść na dno.', w.formula, fnum(fx.ratio * 100, 0))}`) + cm;
  const why = check ? tl('Rozpuść te same gramy w większej ilości wody.') : tl('Większa butelka nic tu nie da. Liczy się, ile ml roztworu wlewasz w tygodniu – zwiększ dawkę albo dawkuj częściej.');
  return h('div', { class: 'kx-msg ' + (over ? 'bad' : 'warn'), role: 'alert' }, h('div', {}, body + ' ' + why),
    btns.length ? h('div', { class: 'kx-acts' }, btns.map(([t, fn]) => h('button', { class: 'btn ghost small', type: 'button', onclick: fn }, t))) : h('div', {}, tl('Tej soli nie da się tak stężyć. Wybierz inną albo dodawaj ją osobno.')));
}
// podział na butelki (X.compat)
function kxSplit(sp, bottle) {
  if (!sp) return null;
  const N = sp.bottles.length;
  const why = [...new Set(sp.issues.map(x => x.osad).filter(Boolean))];
  return h('div', { class: 'kx-msg warn' }, h('b', {}, N === 2 ? tl('Zrób dwie butelki') : `${tl('Zrób {0} butelki', N)}`),
    h('ol', { class: 'kx-split' }, sp.bottles.map(b => h('li', {}, b.items.map(itLine).join(', ') + `${tl(', dopełnij wodą do {0} ml.', fnum(bottle, 0))}`))),
    sp.self.length ? h('div', {}, `${tl('{0} wytrąca się nawet sam w stężonym roztworze. Rozpuszczaj go tuż przed dodaniem.', sp.self.map(i => itName(i)).join(', '))}`) : null,
    h('div', {}, `${tl('Z każdej butelki wlewaj tę samą dawkę, ale osobno – nie mieszaj ich w kubku.{0}', why.length ? ` ${tl('W jednej butelce wypadłby {0}.', kxAnd(why))}` : '')}`));
}

/* ---------- akcje: kopiuj, zapisz, więcej ---------- */
function kxCopy(text) {
  const ok = () => toast(tl('Skopiowane')), fb = () => { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast(tl('Nie udało się skopiować')); } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fb); else fb();
}
// okno z nazwą zamiast prompt()
function kxNameSheet(title, def, onSave, hint) {
  const f = inputF(tl('Nazwa'), '', def, { type: 'text', max: 60 }), err = h('small', { class: 'kx-err', role: 'alert' });
  const go1 = () => { const v = f.val(); if (!v) { err.textContent = tl('Wpisz nazwę'); f.inp.focus(); return; } bg.remove(); onSave(v.slice(0, 60)); };
  f.inp.addEventListener('keydown', e => { if (e.key === 'Enter') go1(); });
  const bg = sheet([h('h3', {}, title), f.el, err, hint ? h('p', { class: 'note' }, hint) : null,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: go1 }, tl('Zapisz')), h('button', { class: 'btn ghost', type: 'button', onclick: () => bg.remove() }, tl('Anuluj')))]);
  setTimeout(() => f.inp.focus(), 50);
}
// receptura z pozycji (sole w gramach na butelkę) → Moje receptury + nawóz do dziennika
function kxSaveRecipe(items, vol, def) {
  kxNameSheet(tl('Zapisz jako przepis'), def, name => {
    const r = { id: uid('r'), name, vol, items: items.filter(i => i.g > 0).map(recItem), note: '', created: todayKey(), updated: todayKey(), pid: null };
    state.recipes.push(r); syncRecipeProduct(r); save(); toast(`${tl('Zapisano „{0}” w Przepisach', name)}`);
  }, tl('Znajdziesz go w Przepisach. Nawóz z niego pojawi się też w Bazie nawozów, więc wpiszesz go do dziennika i planu nawożenia.'));
}
function kxAddToPlan(pid, amt, n, unit = 'ml') {
  const tk = tank(); tk.fplan ||= []; const ex = tk.fplan.find(x => x.pid === pid);
  if (ex) { ex.amt = amt; ex.n = n; } else tk.fplan.push({ pid, amt, n });
  save(); toast(`${tl('Dodano do planu ({0}): {1} {2}, {3} {4} w tygodniu', tk.name, fnum(amt, 2), unit, n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`);
}
// wyliczenie: „a, b i c”
const kxAnd = l => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + tl(' i ') + l[l.length - 1];
// liczba mnoga: 1 dawka, 2–4 dawki, 5 dawek (12–14 dawek)
const kxPl = (n, one, few, many) => { n = Math.abs(Math.round(n)); return n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many; };
function kxActions(list) { return h('div', { class: 'kx-acts main' }, list.filter(Boolean).map(([t, fn, cls]) => h('button', { class: 'btn ' + (cls || 'ghost'), type: 'button', onclick: fn }, t))); }

/* ---------- podsumowanie przypięte na telefonie (widoczne, gdy tabela wyniku jest poza ekranem) ---------- */
// krótkie podsumowanie do paska: najwyżej 4 masy
const kxPinText = vals => `${tl('Odważ: {0}{1} g', vals.slice(0, 4).join(' · '), vals.length > 4 ? ' …' : '')}`;
function kxPin(out, text, target) {
  if (!text) return;
  const bar = h('button', { class: 'kx-pin', type: 'button', onclick: () => target.scrollIntoView({ block: 'start' }) }, text);
  out.append(bar);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => es.forEach(e => bar.classList.toggle('hide', e.isIntersecting || e.boundingClientRect.top < 0)), { threshold: 0 }); io.observe(target); }
}

/* ---------- historia obliczeń ----------
   state.calcLog: najnowsze na początku, maks. 100. Wpis powstaje po chwili bez zmian w formularzu; kolejne zmiany tego samego
   kalkulatora w ciągu 15 minut aktualizują ostatni wpis zamiast dodawać nowy. */
let kxLogT = null, kxLogP = null;
function kxLogFlush() { clearTimeout(kxLogT); if (kxLogP) { const f = kxLogP; kxLogP = null; f(); } }
function kxLog(type, input, sum, text) {
  if (kxLogP && kxLogP.type !== type) kxLogFlush(); // inny kalkulator – poprzednie obliczenie zapisz od razu
  clearTimeout(kxLogT);
  const snap = JSON.parse(JSON.stringify(input)), tk = tank();
  kxLogP = () => {
    const L0 = (state.calcLog ||= []), now = Date.now(), e = { type, ts: now, tank: tk.name, tankId: tk.id, input: snap, sum, text };
    if (L0[0] && L0[0].type === type && now - L0[0].ts < 15 * 60000 && (type !== 'receptura' || (L0[0].input || {}).id === snap.id)) Object.assign(L0[0], e); else L0.unshift({ id: uid('c'), ...e });
    if (L0.length > 100) L0.length = 100; save();
  };
  kxLogP.type = type; kxLogT = setTimeout(kxLogFlush, 1500);
}
// bez zapisu przy zamykaniu karty: nie nadpisujemy danych zmienionych w innej karcie; tracimy najwyżej obliczenie z ostatnich 1,5 s
const KX_TYPE = { nawoz: tl('Przygotuj nawóz'), mineral: tl('Mineralizacja wody'), makro: tl('Makro'), mikro: tl('Mikro'), gotowe: tl('Gotowy nawóz'), receptura: tl('Przepis') };

/* ---------- pomocnicze dla innych ekranów (plan nawożenia, odpowiednik) – przeniesione z kalkulator.js 6.11 ---------- */
const rngTxt = k => { const r = DANE.WEEK_RANGE[k]; return !r ? '' : r[0] > 0 ? `${tl('typowo {0}–{1}', fnum(r[0], 2), fnum(r[1], 2))}` : `${tl('typowo do {0}', fnum(r[1], 2))}`; };
// kolor tylko tam, gdzie warto zareagować: mikro (poza Cu) dopiero przy 3× powyżej zakresu
const rngSt = (k, v) => { const r = DANE.WEEK_RANGE[k]; if (!r || !(v > 0)) return ''; const hi = ['Mn', 'Zn', 'B', 'Mo'].includes(k) ? r[1] * 3 : r[1]; return v > hi * 1.0001 ? 'over' : r[0] > 0 && v < r[0] * 0.9999 ? 'under' : ''; };
const RNG_NOTE = tl('Orientacyjna dawka tygodniowa w akwarium roślinnym. Przy słabym świetle i bez CO₂ wystarczy dolna granica. Mikro ponad zakres zwykle nie szkodzi – wyjątkiem jest miedź przy krewetkach.');
function slab(title, rows, foot) {
  return h('section', { class: 'slab' }, h('h3', {}, title), h('div', { class: 'slab-rows' }, rows.map(([l, v, sub]) => h('div', { class: 'slab-row' }, h('span', { html: l }), h('b', {}, v, sub ? h('small', {}, sub) : null)))), foot ? h('p', {}, foot) : null);
}

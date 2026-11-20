if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Aplikacja: router, panel, dziennik, szybkie dodawanie, zbiornik, plan pielęgnacji, moje nawozy, info ===== */
const P = LOGIC;
const FIELD_ORDER = ['pH', 'KH', 'GH', 'NO3', 'PO4', 'temp', 'K', 'Fe', 'Mg', 'Ca', 'NH4', 'NO2'];
const plabel = k => P.PARAM[k].l, punit = k => P.PARAM[k].u;
const pv = (k, v) => fnum(v, P.PARAM[k]?.d ?? 2);
const SEVC = { bad: 'bad', warn: 'warn', info: 'info', ok: 'ok' };
const relDay = d => { const n = P.dnum(todayKey()) - P.dnum(d); return n === 0 ? tl('dziś') : n === 1 ? tl('wczoraj') : n === -1 ? tl('jutro') : n > 1 && n < 7 ? tl('{0} dni temu', n) : n < -1 && n > -7 ? tl('za {0} dni', -n) : fmtDateShort(new Date(P.dnum(d) * P.DAY)); };
const dayLong = d => fmtDateLong(new Date(P.dnum(d) * P.DAY));
const n2 = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : undefined; };
function inputF(label, unit, value = '', o = {}) {
  const inp = h('input', { type: o.type || 'text', inputmode: o.type ? null : 'decimal', value: value ?? '', placeholder: o.ph || '', 'aria-label': label, maxlength: o.max || null });
  const el = h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inp' }, inp, unit ? h('i', { class: 'unit' }, unit) : null), o.hint ? h('small', { class: 'hint' }, o.hint) : null);
  return { el, inp, num: () => n2(inp.value), val: () => inp.value.trim() };
}
const dateF = (v = todayKey()) => { const f = inputF(tl('Data'), '', v, { type: 'date' }); f.inp.max = todayKey(); return f; };

/* ---------- zbiorniki ---------- */
function openTankSheet() {
  const bg = sheet(null), box = $('.sheet', bg);
  const draw = () => {
    box.innerHTML = ''; box.append(h('h3', {}, tl('Twoje zbiorniki')));
    state.tanks.forEach(x => box.append(h('button', { class: 'tankrow' + (x.id === state.active ? ' on' : ''), onclick: () => { state.active = x.id; save(); bg.remove(); render(); } },
      ico('tank', 20), h('span', { style: 'flex:1;display:flex;flex-direction:column' }, h('b', {}, x.name), h('small', { style: 'color:var(--mut)' }, P.PROFILES[x.type].name)), h('span', { class: 'pill' }, tl('{0} l', fnum(x.V, 0))))));
    box.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn', onclick: () => { addTank(tl('Akwarium {0}', state.tanks.length + 1)); bg.remove(); go('zbiornik/profil'); toast(tl('Dodano zbiornik – uzupełnij jego ustawienia')); } }, tl('+ Nowy zbiornik')),
      h('button', { class: 'btn ghost', onclick: () => { bg.remove(); go('zbiornik/profil'); } }, tl('Edytuj profil'))));
  };
  draw();
}

/* ---------- router ---------- */
// 7.15: dwie zakładki – Dziennik jest częścią Akwarium (ostatnie wpisy), pełny dziennik to podstrona Akwarium
const NAV = [['kalkulator', tl('Kalkulator'), 'flask'], ['+', tl('Dodaj'), 'plus'], ['zbiornik', tl('Akwarium'), 'tank']];
// podstrony z przyciskiem „wstecz” (tytuł, sekcja nadrzędna); stare adresy prowadzą do nowych ekranów
const SUBS = { 'zbiornik/profil': [tl('Ustawienia akwarium'), 'zbiornik'], 'zbiornik/plan': [tl('Plan pielęgnacji'), 'zbiornik'], 'dziennik': [tl('Dziennik'), 'zbiornik'] };
const ALIAS = { 'zbiornik/panel': 'zbiornik', 'zbiornik/nawozenie': 'zbiornik', 'start': 'zbiornik', 'dziennik/historia': 'dziennik', 'dziennik/wykresy': 'dziennik', 'dziennik/analiza': 'dziennik', 'dziennik/asystent': 'dziennik', 'dziennik/wnioski': 'dziennik',
  'nawozy/mikro': 'kalkulator/mikro', 'nawozy/gotowe': 'kalkulator/gotowe',
  // 8.0: angielskie adresy do linków (np. app.html#/calculator/remineralization)
  'calculator': 'kalkulator', 'calculator/fertilizer': 'kalkulator/nawoz', 'calculator/commercial': 'kalkulator/gotowe', 'calculator/recipes': 'kalkulator/receptury',
  'calculator/history': 'kalkulator/historia', 'calculator/advanced': 'kalkulator/zaawansowane', 'calculator/macro': 'kalkulator/makro', 'calculator/micro': 'kalkulator/mikro',
  'calculator/remineralization': 'kalkulator/mineral', 'calculator/shopping': 'kalkulator/zakupy', 'calculator/check-bottle': 'kalkulator/receptury/sprawdz',
  'tank': 'zbiornik', 'tank/settings': 'zbiornik/profil', 'tank/schedule': 'zbiornik/plan', 'log': 'dziennik', 'tools': 'narzedzia', 'settings': 'info', 'glossary': 'slownik',
  'tools/diy-clone': 'nawozy/odpowiednik', 'tools/library': 'nawozy/moje', 'tools/correction': 'woda/korekta', 'tools/water-change': 'woda/podmianapro', 'tools/hardness': 'woda/mineral',
  'tools/acid': 'woda/kwas', 'tools/build-up': 'woda/kumulacja', 'tools/co2': 'woda/co2', 'tools/titration': 'pomiary/miareczkowanie', 'tools/units': 'pomiary/jednostki',
  'tools/volume': 'pomiary/objetosc', 'help/plants': 'pomoc/rosliny', 'help/algae': 'pomoc/glony' };
const TOOL_HOME = { 'woda/podmianapro': 'zbiornik', 'pomoc/rosliny': 'zbiornik', 'pomoc/glony': 'zbiornik', 'nawozy/moje': 'zbiornik' };
const TOOL_TITLES = {
  'nawozy/moje': [tl('Baza nawozów'), ''], 'nawozy/receptury': [tl('Przepis'), ''], 'nawozy/odpowiednik': [tl('Zrób sam odpowiednik'), tl('Gotowy nawóz odtworzony z soli – ten sam skład, ta sama dawka.')],
  'woda/korekta': [tl('Korekta parametrów akwarium'), tl('Ile składnika dodać do wody w zbiorniku, żeby zmienić wynik testu na docelowy. Do przygotowania wody RO przed podmianą służy Mineralizacja wody.')], 'woda/podmianapro': [tl('Podmiana wody'), ''],
  'woda/mineral': [tl('Twardość z soli'), tl('Wpisujesz gramy soli – dostajesz GH, KH i skład jonów w danej objętości wody.')], 'woda/kwas': [tl('Kwas / KH'), tl('Obniżanie KH – domyślnie ocet; mocne kwasy z ostrzeżeniem.')], 'woda/co2': ['CO₂', tl('Z pH i KH.')],
  'woda/kumulacja': [tl('Narastanie soli'), tl('SO₄, Cl, Na i twardość przy stałym nawożeniu i podmianach.')],
  'pomiary/miareczkowanie': [tl('Miareczkowanie'), tl('KH, GH, Ca, Mg z własnych testów.')], 'pomiary/jednostki': [tl('Przeliczniki'), tl('Jednostki twardości i formy pierwiastków.')],
  'pomiary/objetosc': [tl('Objętość'), tl('Brutto i netto z wymiarów.')],
  'pomoc/rosliny': [tl('Problemy z roślinami'), ''], 'pomoc/glony': [tl('Glony'), ''],
};
const SIMPLE_TOOLS = ['nawozy/odpowiednik', 'pomoc/rosliny', 'pomoc/glony', 'nawozy/moje', 'nawozy/receptury', 'woda/korekta', 'woda/podmianapro', 'woda/co2', 'pomiary/objetosc', 'woda/mineral', 'pomiary/jednostki']; // 7.10: dwa ostatnie – z zakładki Zaawansowane
const PAGES = {};
// „Wnioski” to sekcja Dziennika – przejście przewija do niej
function goWnioski() { render.anchor = 'wnioski'; go('dziennik'); }
function go(path) { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; }
function buildNav() {
  const nav = $('#nav'); nav.innerHTML = ''; const box = h('div');
  NAV.forEach(([k, t, i]) => box.append(k === '+' ? h('button', { class: 'addbtn', 'aria-label': tl('Dodaj wpis'), onclick: () => openAdd() }, h('span', { class: 'ni', html: icon('plus', 26) })) :
    h('button', { 'data-s': k, onclick: () => go(k) }, h('span', { class: 'ni', html: icon(i, 22) }), t)));
  nav.append(box);
}
function setAdv(v) { state.adv = v; save(); render(); }
function render() {
  let path = location.hash.replace(/^#\/?/, '').split('?')[0]; if (ALIAS[path]) { path = ALIAS[path]; if (/^[a-z]/.test(location.hash.slice(2)) && !path.startsWith('kalkulator')) history.replaceState(null, '', '#/' + path); }
  const parts = path.split('/'), sec = parts[0] || 'kalkulator', tab = parts[1];
  const backBtn = (label, to) => h('button', { class: 'back', onclick: () => history.length > 1 ? history.back() : go(to) }, h('span', { html: icon('chevr', 16), style: 'display:inline-flex;transform:rotate(180deg)' }), label);
  const main = $('#main'); main.innerHTML = ''; main.dataset.sec = sec; document.body.dataset.sec = sec;
  $('#tankname').textContent = tl('{0} · {1} l', tank().name, fnum(tank().V, 0));
  $('#tankBtn').hidden = !['zbiornik', 'dziennik'].includes(sec) && !TOOL_HOME[path];
  let key = path, navSec = sec;
  if (['nawozy', 'woda', 'pomiary', 'pomoc'].includes(sec)) {
    key = sec + '/' + tab; navSec = TOOL_HOME[key] || 'kalkulator';
    if (!PAGES[key] || (!state.adv && !SIMPLE_TOOLS.includes(key))) { key = 'narzedzia'; navSec = 'kalkulator'; main.append(backBtn(tl('Kalkulator'), 'kalkulator')); }
    else {
      const t = TOOL_TITLES[key], sub = key === 'nawozy/receptury' && parts[2], home = TOOL_HOME[key];
      main.append(sub ? backBtn(tl('Nawozy'), 'nawozy/moje') : backBtn(home ? tl('Akwarium') : tl('Zaawansowane'), home || 'kalkulator/zaawansowane'),
        h('h1', { class: 'page-title' }, sub ? (parts[2] === 'nowa' ? tl('Nowy przepis') : tl('Przepis')) : t[0]), ...(sub || !t[1] ? [] : [h('p', { class: 'page-sub' }, t[1])]));
    }
  } else if (SUBS[key]) { const [title, up] = SUBS[key]; navSec = up; main.append(backBtn(up === 'zbiornik' ? tl('Akwarium') : tl('Dziennik'), up), h('h1', { class: 'page-title' }, title)); }
  else if (key === 'narzedzia' || key === 'info' || key === 'slownik') { navSec = 'kalkulator'; main.append(backBtn(tl('Kalkulator'), 'kalkulator')); }
  else if (!PAGES[key]) { key = 'kalkulator'; navSec = 'kalkulator'; }
  document.querySelectorAll('nav.bar button[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === navSec));
  const root = h('div'); main.append(root);
  try { PAGES[key](root); } catch (e) { root.append(h('div', { class: 'alert bad', html: (icon('warn') + '<div>' + tl('<b>Nie udało się wyświetlić tego ekranu.</b><br>Twoje dane są zapisane. Wróć i spróbuj ponownie; jeśli to się powtarza, zrób kopię w Ustawieniach.') + '<details class="why">' + '<summary>' + tl('Szczegóły') + '</summary>' + '<p>' + esc(e.message) + '</p>' + '</details>' + '</div>') })); console.error(e); }
  const anc = render.anchor && document.getElementById(render.anchor); render.anchor = null;
  if (anc) anc.scrollIntoView(); else if (!render.keepScroll) window.scrollTo(0, 0); render.keepScroll = false;
  scrollFade(main);
}
window.addEventListener('hashchange', render);
/* 7.13: paski przewijane w bok (zakładki kalkulatora, filtry dziennika) – zanikanie przy krawędzi, za którą jest jeszcze treść; aktywna zakładka zawsze widoczna */
const SCROLLERS = '.kx-nav,.chips.scroll';
function fadeOne(el) { const r = el.scrollWidth - el.clientWidth - el.scrollLeft; el.classList.toggle('fade-l', el.scrollLeft > 4); el.classList.toggle('fade-r', r > 4); }
function scrollFade(root) { root.querySelectorAll(SCROLLERS).forEach(el => { const on = el.querySelector('.on'); if (on && !el.dataset.sf) { el.dataset.sf = '1'; const x = on.offsetLeft + on.offsetWidth - el.clientWidth + 24; if (x > 0) el.scrollLeft = x; } fadeOne(el); }); }
document.addEventListener('scroll', e => { if (e.target.matches && e.target.matches(SCROLLERS)) fadeOne(e.target); }, true);
window.addEventListener('resize', () => scrollFade(document));
// klawiatura ekranowa: chowamy dolny pasek, żeby nie zasłaniał pola
document.addEventListener('focusin', e => { if (e.target.matches('input:not([type=date]):not([type=checkbox]),textarea')) document.body.classList.add('kb'); });
document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input,textarea')) document.body.classList.remove('kb'); }, 50));

/* ---------- opis zdarzeń ---------- */
const CARE = { filter: tl('Czyszczenie filtra'), trim: tl('Przycinanie roślin'), media: tl('Wymiana wkładów'), glass: tl('Czyszczenie szyb'), substrate: tl('Odmulanie dna'), other: tl('Inna czynność') };
const TAGS = [tl('Glony'), tl('Rośliny'), tl('Zwierzęta'), 'CO₂', tl('Światło'), tl('Sprzęt')];
function evInfo(e) {
  if (e.type === 'measure') return ['test', tl('Pomiar'), FIELD_ORDER.filter(k => typeof e[k] === 'number').map(k => `${plabel(k)} <b>${pv(k, e[k])}</b>`).join(' · ')];
  if (e.type === 'water') return ['wave', tl('Podmiana wody'), `${tl('<b>{0} l</b> ({1}%)', fnum(e.liters, 0), fnum(e.frac * 100, 0))}`];
  if (e.type === 'dose') return ['leaf', tl('Nawóz: {0}', esc(e.name)), `<b>${fnum(e.amount, 2)} ${e.unit}</b>` + (e.ppm ? (' ' + tl('· {0} mg/l', Object.entries(e.ppm).filter(([, v]) => v >= 0.005).slice(0, 4).map(([k, v]) => `${elLbl(k)} +${gfmt(v)}`).join(', '))) : '')];
  if (e.type === 'care') return [P.TASK_KINDS[e.kind]?.icon || 'cal', e.name || CARE[e.kind] || tl('Czynność'), ''];
  if (e.type === 'task') return ['check', esc(e.name || tl('Zadanie wykonane')), ''];
  if (e.type === 'setting') return ['edit', tl('Zmiana: {0}', esc(e.label)), `${esc(e.from || '—')} → <b>${esc(e.to || '—')}</b>`];
  return ['note', tl('Notatka'), ''];
}
function evRow(e, onTap) {
  const [i, t, d] = evInfo(e);
  return h('button', { class: 'evrow', onclick: onTap }, h('span', { class: 'evi', html: icon(i, 18) }),
    h('span', { class: 'evt' }, h('b', { html: t }), d ? h('span', { html: d }) : null, e.note ? h('span', { class: 'evn' }, e.note) : null,
      e.tags && e.tags.length ? h('span', { class: 'tags' }, e.tags.map(x => h('i', {}, tlData(x)))) : null),
    h('small', {}, relDay(e.date)));
}
function openEvent(e) {
  const [, t, d] = evInfo(e);
  const bg = sheet([h('h3', { html: t }), h('div', { class: 'note', style: 'margin-top:-6px' }, dayLong(e.date)), d ? h('p', { html: d }) : null, e.note ? h('p', {}, e.note) : null,
    e.type === 'dose' && e.src ? h('div', { class: 'note' }, tl('Skład: {0}', e.src)) : null,
    h('div', { class: 'btnrow' },
      e.type === 'measure' ? h('button', { class: 'btn', onclick: () => { bg.remove(); openMeasure(e); } }, tl('Edytuj')) : null,
      h('button', { class: 'btn danger', onclick: () => { if (confirm(tl('Usunąć ten wpis?'))) { removeEvent(e.id); bg.remove(); render.keepScroll = true; render(); toast(tl('Usunięto wpis')); } } }, tl('Usuń')),
      h('button', { class: 'btn ghost', onclick: () => bg.remove() }, tl('Zamknij')))]);
}

/* ---------- szybkie dodawanie ---------- */
function openAdd() {
  const opt = (i, t, d, fn) => h('button', { class: 'action', onclick: () => { bg.remove(); fn(); } }, h('span', { class: 'ti', html: icon(i, 22) }), h('span', { class: 'tx' }, h('b', {}, t), h('span', { class: 'd' }, d)));
  const bg = sheet([h('h3', {}, tl('Dodaj do dziennika – {0}', tank().name)), h('div', { class: 'actions' },
    opt('test', tl('Pomiar wody'), tl('Wyniki testów z oceną'), () => openMeasure()), opt('wave', tl('Podmiana wody'), tl('Ile litrów wymieniłeś(-aś)'), () => openWater()),
    opt('leaf', tl('Nawóz'), tl('Co i ile dodałeś(-aś)'), () => openDose()), opt('cal', tl('Czynność'), tl('Filtr, przycinanie, wkłady…'), () => openCare()),
    opt('note', tl('Notatka / obserwacja'), tl('Glony, rośliny, zwierzęta, zmiany'), () => openNote()))]);
}
function afterSave(msg) { toast(msg); render.keepScroll = true; render(); }
function openMeasure(edit) {
  const d = dateF(edit ? edit.date : todayKey()), F = {};
  const mk = k => (F[k] = inputF(P.PARAM[k].long || P.PARAM[k].l, punit(k), edit && typeof edit[k] === 'number' ? String(edit[k]).replace('.', DEC) : '')).el;
  const MORE = ['K', 'Fe', 'Mg', 'Ca', 'NH4', 'NO2'];
  const more = h('details', { class: 'inner', open: edit && MORE.some(k => typeof edit[k] === 'number') }, h('summary', {}, tl('Więcej parametrów (K, Fe, Mg, Ca, amoniak, azotyny)')), h('div', { class: 'grid', style: 'margin-top:12px' }, MORE.map(mk)));
  const note = inputF(tl('Notatka'), '', edit?.note || '', { type: 'text', ph: tl('np. test JBL, po podmianie'), max: 300 });
  const res = h('div');
  const bg = sheet([h('h3', {}, edit ? tl('Edytuj pomiar') : tl('Nowy pomiar')), h('div', { class: 'stack' }, d.el, h('div', { class: 'grid' }, ['pH', 'KH', 'GH', 'NO3', 'PO4', 'temp'].map(mk)), more, note.el),
    h('div', { class: 'note' }, tl('Puste pola pomijam.')), res,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: saveM }, tl('Zapisz pomiar')))]);
  function saveM() {
    const e = { type: 'measure', date: d.val() || todayKey() }; let any = false, badv = [];
    for (const k of FIELD_ORDER) { const v = F[k].num(); if (F[k].val() === '') continue; if (v === undefined || v < 0 || (k === 'pH' && (v < 3 || v > 10)) || (k === 'temp' && v > 40)) { badv.push(plabel(k)); continue; } e[k] = v; any = true; }
    if (badv.length) { res.innerHTML = alertH('bad', tl('Sprawdź wartości: {0}.', badv.join(', '))); return; }
    if (!any) { res.innerHTML = alertH('warn', tl('Wpisz co najmniej jeden wynik.')); return; }
    if (note.val()) e.note = note.val();
    if (P.dnum(e.date) > P.dnum(todayKey())) { res.innerHTML = alertH('warn', tl('Data nie może być z przyszłości.')); return; }
    if (edit) { const arr = EV(), i = arr.findIndex(x => x.id === edit.id); arr[i] = { ...e, id: edit.id, ts: edit.date === e.date ? edit.ts : tsOfDate(e.date) }; save(); }
    else addEvent(e);
    const ev = P.evaluate(tank(), e).filter(x => x.sev !== 'ok');
    bg.remove();
    if (ev.length) { sheetVerdict(tl('Zapisano. Na co zwrócić uwagę:'), ev); render.keepScroll = true; render(); }
    else afterSave(tl('Zapisano pomiar – wszystko w celu'));
  }
}
function verdictHTML(items) {
  return items.map(i => `<div class="vd ${SEVC[i.sev] === 'info' ? 'warn' : SEVC[i.sev]}"><span class="dot">${icon(i.sev === 'ok' ? 'check' : i.sev === 'info' ? 'info' : 'warn', 16)}</span><div><b>${P.PARAM[i.k]?.long || plabel(i.k)}${i.v !== undefined ? `<span class="val">${pv(i.k, i.v)} ${punit(i.k)}</span>` : ''}</b><p>${esc(i.msg)}</p></div></div>`).join('');
}
function sheetVerdict(title, items) {
  const bg = sheet([h('h3', {}, title), h('div', { html: verdictHTML(items) }), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { bg.remove(); goWnioski(); } }, tl('Pełna analiza')), h('button', { class: 'btn ghost', onclick: () => bg.remove() }, 'OK'))]);
}
function openWater(pre = {}) {
  const t = tank(), d = dateF(), l = inputF(tl('Wymienione'), tl('l'), fnum(t.V * t.change / 100, 0).replace(/\s/g, '')), note = inputF(tl('Notatka'), '', '', { type: 'text', ph: tl('np. RO + kran 50/50, odmulanie'), max: 300 });
  const info = h('div', { class: 'note' }); const upd = () => { const v = l.num(); info.textContent = v > 0 ? `${tl('To {0}% z {1} l.', fnum(v / t.V * 100, 0), fnum(t.V, 0))}` + (v / t.V > 0.5 ? tl(' Duża podmiana – pilnuj tej samej temperatury i uzdatniacza.') : '') : ''; };
  l.inp.oninput = upd; upd();
  const bg = sheet([h('h3', {}, tl('Podmiana wody')), h('div', { class: 'stack' }, d.el, l.el, info, note.el), h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: () => {
    const v = l.num(); if (!(v > 0) || v > t.V) { info.innerHTML = alertH('bad', `${tl('Podaj ilość od 0 do {0} l.', fnum(t.V, 0))}`); return; }
    addEvent({ type: 'water', date: d.val(), liters: v, frac: v / t.V, ...(note.val() ? { note: note.val() } : {}) }); bg.remove(); afterSave(tl('Zapisano podmianę'));
  } }, tl('Zapisz podmianę')))]);
}
function openDose(pre = {}) {
  const t = tank(), list = allProducts(), recent = [...new Set(EV().filter(e => e.type === 'dose').sort((a, b) => b.ts - a.ts).map(e => e.pid))].filter(id => productById(id)).slice(0, 5);
  const used = (t.fplan || []).map(x => x.pid).filter(id => productById(id) && !recent.includes(id));
  const sel = h('select', { 'aria-label': tl('Nawóz') }, recent.length ? h('optgroup', { label: tl('Ostatnio używane') }, recent.map(id => h('option', { value: id }, productById(id).name))) : null,
    used.length ? h('optgroup', { label: tl('Stosowane w tym zbiorniku') }, used.map(id => h('option', { value: id }, productById(id).name))) : null,
    state.products.length ? h('optgroup', { label: tl('Moje nawozy') }, state.products.map(p => h('option', { value: p.id }, pName(p)))) : null,
    h('optgroup', { label: tl('Baza produktów') }, builtinProducts().map(p => h('option', { value: p.id }, pName(p)))));
  if (pre.pid && productById(pre.pid)) sel.value = pre.pid;
  const d = dateF(), amt = inputF(tl('Ilość'), '', ''), kind = h('select', {}, [['', tl('— nie zaliczaj —')], ['dose_macro', tl('Nawóz makro (NPK)')], ['dose_micro', tl('Nawóz mikro / żelazo')]].map(([v, x]) => h('option', { value: v }, x)));
  kind.value = pre.taskKind || '';
  const out = h('div'), unitEl = $('.unit', amt.el) || h('i', { class: 'unit' }); if (!$('.unit', amt.el)) $('.inp', amt.el).append(unitEl);
  const upd = () => {
    const p = productById(sel.value); unitEl.textContent = p.unit;
    const empty = !Object.keys(p.ppm || {}).length ? alertH('warn', tl('Brak składu – dawka nie wpłynie na obliczenia.')) : '';
    const a = amt.num(); if (!(a > 0)) { out.innerHTML = empty + `<div class="note">${p.source === 'builtin' ? tl('Skład z bazy: {0}', esc(p.note)) : p.note ? tl('Źródło składu: {0}', esc(p.note)) : ''}${p.dose ? tl('<br>Producent zaleca: {0}', esc(p.dose)) : ''}</div>`; return; }
    const eff = doseEffect(p, a, t.V);
    out.innerHTML = `<div class="kv"><span>${tl('Doda w {0} l', fnum(t.V, 0))}</span><b>${Object.entries(eff).filter(([, v]) => v >= 0.0005).map(([k, v]) => `${elLbl(k)} +${gfmt(v)}`).join(', ') || '—'} <small>${tl('mg/l')}</small></b></div>` + (eff.Cu > 0.01 && P.PROFILES[t.type].shrimp ? alertH('bad', tl('Uwaga: miedź groźna dla krewetek.')) : '');
  };
  sel.onchange = upd; amt.inp.oninput = upd;
  const bg = sheet([h('h3', {}, tl('Dodany nawóz')), h('div', { class: 'stack' }, d.el, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Nawóz')), h('span', { class: 'inp' }, sel)), amt.el,
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Zalicz zadanie z planu')), h('span', { class: 'inp' }, kind))), out,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: () => {
      const p = productById(sel.value), a = amt.num(); if (!(a > 0)) { out.innerHTML = alertH('warn', tl('Podaj ilość.')); return; }
      addEvent({ type: 'dose', date: d.val(), pid: p.id, name: p.name, amount: a, unit: p.unit, ppm: doseEffect(p, a, t.V), src: p.source === 'builtin' ? tl('baza produktów') : p.source === 'recipe' ? tl('własny przepis') : tl('wpisany przez użytkownika'), ...(kind.value ? { taskKind: kind.value } : {}) });
      bg.remove(); afterSave(tl('Zapisano nawożenie'));
    } }, tl('Zapisz'))), h('button', { class: 'linkbtn', onclick: () => { bg.remove(); go('nawozy/moje'); } }, tl('Brak nawozu na liście – dodaj własny'))]);
  upd();
}
function openCare(pre = {}) {
  const d = dateF(), sel = h('select', {}, Object.entries(CARE).map(([k, v]) => h('option', { value: k }, v))); if (pre.kind) sel.value = pre.kind;
  const note = inputF(tl('Notatka'), '', '', { type: 'text', max: 300 });
  const bg = sheet([h('h3', {}, tl('Czynność pielęgnacyjna')), h('div', { class: 'stack' }, d.el, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Co zrobiłeś(-aś)')), h('span', { class: 'inp' }, sel)), note.el),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: () => { addEvent({ type: 'care', date: d.val(), kind: sel.value, name: CARE[sel.value], ...(note.val() ? { note: note.val() } : {}) }); bg.remove(); afterSave(tl('Zapisano')); } }, tl('Zapisz')))]);
}
function openNote() {
  const d = dateF(), ta = h('textarea', { rows: 4, maxlength: 1000, placeholder: '' }), on = new Set();
  const tags = h('div', { class: 'chips' }, TAGS.map(t => { const b = h('button', { class: 'chip', type: 'button' }, t); b.onclick = () => { on.has(t) ? on.delete(t) : on.add(t); b.classList.toggle('on'); }; return b; }));
  const bg = sheet([h('h3', {}, tl('Notatka / obserwacja')), h('div', { class: 'stack' }, d.el, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Treść')), h('span', { class: 'inp' }, ta)), tags),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn block', onclick: () => { const v = ta.value.trim(); if (!v) { toast(tl('Wpisz treść notatki')); return; } addEvent({ type: 'note', date: d.val(), note: v, tags: [...on] }); bg.remove(); afterSave(tl('Zapisano notatkę')); } }, tl('Zapisz')))]);
}
function completeTask(task) {
  const k = P.TASK_KINDS[task.kind] || {};
  if (k.log === 'water') return openWater();
  if (k.log === 'dose' && task.pid && task.amt > 0) { const p = productById(task.pid); if (p) { addEvent({ type: 'dose', pid: p.id, name: p.name, amount: task.amt, unit: p.unit, ppm: doseEffect(p, task.amt, tank().V), taskKind: task.kind, taskId: task.id }); afterSave(`${tl('Podano: {0} {1} {2}', p.name, fnum(task.amt, 2), p.unit)}`); return; } }
  if (k.log === 'dose') return openDose({ taskKind: task.kind, pid: (EV().filter(e => e.type === 'dose' && e.taskKind === task.kind).sort((a, b) => b.ts - a.ts)[0] || {}).pid });
  if (k.log === 'measure') return openMeasure();
  addEvent({ type: 'care', kind: task.kind, taskId: task.id, name: task.name }); afterSave(tl('Odhaczono: {0}', task.name));
}

/* ---------- Ko-fi: jednorazowa prośba o wsparcie (8.2) ----------
   Tylko dla osób, które naprawdę używają aplikacji: 3 zapisane przepisy albo ≥ 3 dni używania i ≥ 14 dni od pierwszego otwarcia.
   Pokazuje się na ekranie Akwarium (nie w kalkulatorze), po kliknięciu „Wesprzyj” albo „Nie pokazuj więcej” nie wraca nigdy.
   Osobny klucz w localStorage – nie trafia do kopii zapasowej i nie zmienia schematu danych. */
const KOFI_URL = 'https://ko-fi.com/dosemytank', KOFI_KEY = 'dmt.kofi';
const kofiGet = () => { try { return JSON.parse(localStorage.getItem(KOFI_KEY)) || {}; } catch (e) { return {}; } };
const kofiSet = o => { try { localStorage.setItem(KOFI_KEY, JSON.stringify(o)); } catch (e) {} };
function kofiTrack() {
  const k = kofiGet(), d = new Date().toISOString().slice(0, 10);
  if (!k.first) { k.first = d; k.days = 0; }
  if (k.last !== d) { k.last = d; k.days = (k.days || 0) + 1; kofiSet(k); }
}
function kofiDue() {
  const k = kofiGet(); if (k.off || !k.first) return false;
  const age = (Date.now() - Date.parse(k.first)) / 864e5;
  return (state.recipes || []).length >= 3 || ((k.days || 0) >= 3 && age >= 14);
}
function kofiCard() {
  const off = () => { const k = kofiGet(); k.off = 1; kofiSet(k); };
  const el = h('section', { class: 'card kofi-ask' }, h('h2', {}, ico('cup', 18), tl('DoseMyTank się przydaje?')),
    h('p', { class: 'sub', style: 'margin:0 0 12px' }, tl('Aplikacja jest darmowa, bez reklam i konta. Jeśli chcesz, możesz postawić kawę – to pomaga w rozwoju kolejnych wersji.')),
    h('div', { class: 'btnrow', style: 'margin:0' },
      h('a', { class: 'btn', href: KOFI_URL, target: '_blank', rel: 'noopener', style: 'text-decoration:none', onclick: () => { off(); setTimeout(() => el.remove(), 300); } }, tl('Postaw kawę na Ko-fi')),
      h('button', { class: 'btn ghost', onclick: () => { off(); el.remove(); toast(tl('Nie pokażemy tego więcej. Link do Ko-fi jest w Ustawieniach.'), 3500); } }, tl('Nie pokazuj więcej'))));
  return el;
}

/* ---------- START: panel zbiornika ---------- */
const lrow = (to, label, d) => h('button', { class: 'lrow', onclick: () => go(to) }, h('span', {}, label), d ? h('small', {}, d) : null, h('i', { html: icon('chevr', 16) }));
PAGES.zbiornik = root => {
  const t = tank(), prof = P.PROFILES[t.type];
  root.append(h('div', { class: 'phead' }, h('div', {}, h('h1', { class: 'page-title' }, t.name),
    h('p', { class: 'page-sub' }, `${tl('{0} · {1} l · podmiana {2}% / tydz.', prof.short || prof.name, fnum(t.V, 0), fnum(+t.change || 0, 0))}`)),
    h('button', { class: 'iconbtn ring', title: tl('Ustawienia akwarium'), onclick: () => go('zbiornik/profil'), html: (icon('sliders', 20) + '<span class="sr-only">' + tl('Ustawienia') + '</span>') })));
  // pierwsze kroki – dopóki zbiornik nie jest opisany
  const evs0 = EV(), steps = [[t.setup, tl('Ustaw objętość i rodzaj akwarium'), () => openSetup()], [(t.fplan || []).length > 0, tl('Dodaj nawozy, których używasz'), null], [evs0.some(e => e.type === 'measure'), tl('Wpisz pierwszy test wody'), () => openMeasure()]];
  const nDone = steps.filter(x => x[0]).length;
  if (steps.some(x => !x[0])) root.append(h('section', { class: 'card first' }, h('h2', {}, tl('Pierwsze kroki'), h('span', { class: 'fprog' }, tl('{0} z {1}', nDone, steps.length))),
    h('div', { class: 'fbar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(steps.length), 'aria-valuenow': String(nDone), 'aria-label': tl('Postęp pierwszych kroków') }, h('i', { style: `width:${Math.max(4, nDone / steps.length * 100)}%` })), h('ol', { class: 'fsteps' }, steps.map(([done, label, act]) =>
    h('li', { class: done ? 'done' : '' }, done ? h('span', {}, label) : h('button', { class: 'linkbtn', onclick: () => typeof act === 'function' ? act() : act ? go(act) : $('#fplan-add')?.focus() }, label))))));
  const L = h('div', { class: 'col-in' }), R = h('div', { class: 'col-out' });
  PAGES.start(L, true);
  // 7.16: wykres i wnioski zwinięte – na wierzchu kafelki „Woda”; stan rozwinięcia zapamiętany
  if (EV().some(e => e.type === 'measure')) { const body = h('div', { class: 'fold-b' }), d = h('details', { class: 'fold', id: 'wykres', open: !!state.inputs.akwChart }, h('summary', {}, tl('Wykres i wnioski')), body);
    d.addEventListener('toggle', () => { state.inputs.akwChart = d.open; save(); }); PAGES['dziennik/wykresy'](body, true); wnioski(body); L.append(d); }
  R.append(h('h2', { class: 'h2', id: 'wpisy' }, tl('Ostatnie wpisy'))); PAGES['dziennik/historia'](R, 5);
  PAGES['zbiornik/nawozenie'](R);
  root.append(h('div', { class: 'cols' }, L, R));
  if (kofiDue()) R.append(kofiCard());
  R.append(h('h2', { class: 'h2' }, tl('Narzędzia')), h('div', { class: 'lrows' }, lrow('woda/podmianapro', tl('Podmiana wody'), tl('co zmieni, ile wymienić')), lrow('pomoc/rosliny', tl('Coś nie tak z roślinami')), lrow('pomoc/glony', tl('Glony')),
    lrow('zbiornik/plan', tl('Plan pielęgnacji'), tl('przypomnienia, kalendarz')), lrow('nawozy/moje', tl('Baza nawozów'), tl('przepisy, gotowe nawozy, sole'))));
};
PAGES.dziennik = root => {
  root.append(h('p', { class: 'page-sub' }, tl('Wszystkie testy wody, podmiany, dawki i notatki tego akwarium. Nowy wpis dodasz przyciskiem „+”.')));
  if (EV().some(e => e.type === 'measure')) { PAGES['dziennik/wykresy'](root, true); wnioski(root); }
  root.append(h('h2', { class: 'h2' }, tl('Wpisy')));
  PAGES['dziennik/historia'](root);
};
PAGES.start = (root, embedded) => {
  const t = tank(), evs = EV(), now = Date.now(), A = P.analyze(t, evs, now), today = todayKey(), prof = P.PROFILES[t.type];
  const age = t.created ? (() => { const dd = P.dnum(today) - P.dnum(t.created); if (dd < 0) return ''; const m = Math.floor(dd / 30.44); return m >= 12 ? `${tl('{0} r. {1} mies.', Math.floor(m / 12), m % 12)}` : m >= 1 ? `${tl('{0} mies.', m)}` : `${tl('{0} dni', dd)}`; })() : '';
  if (!embedded) root.append(h('div', { class: 'hero' }, h('div', {}, h('small', {}, dayLong(today)), h('h1', { class: 'page-title', style: 'margin:2px 0 6px' }, t.name),
    h('div', { class: 'heromet' }, h('span', { class: 'pill' }, prof.name), h('span', {}, tl('{0} l', fnum(t.V, 0))), age ? h('span', {}, tl('od {0}', age)) : null))));
  { const bb = backupBanner(); if (bb) root.append(bb); }
  // status
  const st = h('section', { class: 'card' }, h('h2', {}, tl('Woda')));
  if (A.empty) st.append(emptyChart(), h('p', { class: 'sub', style: 'margin:8px 0 12px' }, tl('Brak pomiarów. Po 2–3 testach zobaczysz tu wyniki z celem i podpowiedź, co sprawdzić najpierw.')), h('button', { class: 'btn', onclick: () => openMeasure() }, tl('Dodaj pomiar')));
  else {
    const ks = [...new Set(A.issues.filter(i => i.sev === 'bad' || i.sev === 'warn').map(i => i.k))], names = ks.map(k => P.PARAM[k] ? plabel(k) : k === 'CO2' ? 'CO₂' : k);
    const sum = A.worst === 'bad' ? ['bad', tl('Pilne: {0}', names.join(', '))] : ks.length ? ['warn', tl('Sprawdź: {0}', names.join(', '))] : ['ok', tl('Wszystko w celu')];
    st.append(h('div', { class: 'summary ' + sum[0], onclick: () => goWnioski(), style: 'cursor:pointer' }, h('span', { html: icon(sum[0] === 'ok' ? 'check' : 'warn', 22) }), h('span', { style: 'flex:1' }, sum[1]), h('span', { html: icon('chevr', 18) })));
    const T = P.targetsOf(t), grid = h('div', { class: 'ptiles' });
    const keys = FIELD_ORDER.filter(k => A.last[k]), newest = keys.map(k => A.last[k].date).sort().pop();
    st.firstChild.append(h('span', { class: 'unit2' }, tl('test {0}', relDay(newest))));
    if (A.last.pH && A.last.KH && A.last.KH.v > 0 && Math.abs(A.last.pH.ts - A.last.KH.ts) <= 2 * P.DAY) keys.splice(Math.min(keys.length, 6), 0, 'CO2');
    for (const k of keys) {
      const L0 = k === 'CO2' ? { v: C.co2(A.last.pH.v, A.last.KH.v), ts: Math.min(A.last.pH.ts, A.last.KH.ts), date: A.last.pH.date } : A.last[k];
      const ev = A.evals.find(e => e.k === k), sev = ev ? ev.sev : 'ok', prev = L0.prev, delta = prev ? L0.v - prev.v : 0;
      const arrow = prev && Math.abs(delta) > 1e-9 ? `<span class="delta">${icon(delta > 0 ? 'up' : 'down', 12)}${pv(k, Math.abs(delta))}</span>` : '';
      grid.append(h('button', { class: 'ptile s-' + sev, onclick: () => { state.inputs.chart = k === 'CO2' ? 'CO2' : k; save(); go('dziennik'); } },
        h('span', { class: 'pl' }, plabel(k), h('i', { class: 'sd' })), h('b', { html: (k === 'CO2' ? C.co2Range(A.last.pH.v, A.last.KH.v).map(x => fnum(x, 0)).join('–') : pv(k, L0.v)) + `<small> ${punit(k)}</small>` }),
        h('span', { class: 'pm', html: (T[k] ? tl('cel {0}–{1}', fnum(T[k][0], 2), fnum(T[k][1], 2)) : '') + arrow }), L0.date !== newest ? h('span', { class: 'pa' }, relDay(L0.date)) : null));
    }
    st.append(grid);
    if (A.stale.length) st.append(h('div', { class: 'note' }, `${tl('Bez testu > 30 dni: {0}.', A.stale.map(plabel).join(', '))}`));
    st.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn small', onclick: () => openMeasure() }, tl('+ Pomiar')), h('button', { class: 'btn ghost small', onclick: () => goWnioski() }, tl('Wnioski'))));
  }
  // zadania (7.15: najpierw „Dziś”, potem stan wody)
  const tasks = TASKS().map(k => ({ k, s: P.taskStatus(k, evs, today) }));
  const due = tasks.filter(x => x.s.due).sort((a, b) => b.s.overdue - a.s.overdue), next = tasks.filter(x => !x.s.due && x.s.next).sort((a, b) => a.s.next.localeCompare(b.s.next)).slice(0, 3);
  const tc = h('section', { class: 'card' }, h('h2', {}, tl('Dziś')));
  if (!due.length) tc.append(h('div', { class: 'okline', html: icon('check', 18) + (tasks.length ? tl('Na dziś wszystko zrobione.') : tl('Brak zaplanowanych czynności.')) }));
  due.forEach(({ k, s }) => tc.append(h('div', { class: 'trow' }, h('span', { class: 'ti', html: icon(P.TASK_KINDS[k.kind]?.icon || 'cal', 20) }),
    h('span', { class: 'tx' }, h('b', {}, k.name), h('small', { class: s.overdue ? 'late' : '' }, s.overdue ? `${tl('zaległe {0} {1}', s.overdue, s.overdue === 1 ? tl('dzień') : tl('dni'))}` : tl('dziś'))),
    h('button', { class: 'checkbtn', 'aria-label': tl('Zrobione: {0}', k.name), html: icon('check', 22), onclick: () => completeTask(k) }))));
  if (next.length) tc.append(h('div', { class: 'upnext' }, tl('Dalej: {0}', next.map(({ k, s }) => `${k.name} – ${relDay(s.next)}`).join(' · '))));
  if (!tasks.length) tc.append(h('button', { class: 'linkbtn', onclick: () => go('zbiornik/plan') }, tl('Ustaw plan pielęgnacji')));
  root.append(tc);
  const qc = quickEntries(t, tasks); if (qc) root.append(qc);
  root.append(st);
};
/* ---------- szybkie wpisy: jedno dotknięcie zamiast formularza, z „Cofnij” ---------- */
function quickDose(it, tasks) {
  const t = tank(), p = productById(it.pid), amt = +n2(it.amt); if (!p || !(amt > 0)) return null;
  const tk = (tasks || []).find(x => x.k.pid === p.id && x.s.due) || (tasks || []).find(x => x.k.pid === p.id);
  return addEvent({ type: 'dose', pid: p.id, name: p.name, amount: amt, unit: p.unit, ppm: doseEffect(p, amt, t.V), ...(tk ? { taskKind: tk.k.kind, taskId: tk.k.id } : {}), quick: true });
}
function stockLeftTxt(t, it) { const p = productById(it.pid), r = p && P.stockStatus((t.stock || {})[p.id], EV(), p.id, (+n2(it.amt) || 0) * (+n2(it.n) || 0), Date.now()); return r ? ` ${tl('· zostało ok. {0} {1}', gfmt(r.left), p.unit)}` : ''; }
function lowStock(t) { return (t.fplan || []).map(it => { const p = productById(it.pid), r = p && P.stockStatus((t.stock || {})[p.id], EV(), p.id, (+n2(it.amt) || 0) * (+n2(it.n) || 0), Date.now()); return r && r.days != null && r.days <= 7 ? `${p.name} (${r.days <= 0 ? tl('skończył się') : r.days + ' ' + P.plural(r.days, tl('dzień'), tl('dni'), tl('dni'))})` : null; }).filter(Boolean); }
function quickEntries(t, tasks) {
  const plan = (t.fplan || []).filter(it => productById(it.pid) && +n2(it.amt) > 0), ch = +t.change || 0, today = todayKey(), evs = EV();
  if (!plan.length && !(ch > 0)) return null;
  const done = (pred) => evs.some(e => e.date === today && pred(e));
  const undoAll = ids => { ids.forEach(id => removeEvent(id)); toast(tl('Cofnięto')); render.keepScroll = true; render(); };
  const box = h('div', { class: 'quick' });
  if (ch > 0) { const L = t.V * ch / 100, was = done(e => e.type === 'water');
    box.append(h('button', { class: 'chip' + (was ? ' on' : ''), type: 'button', onclick: () => { const e = addEvent({ type: 'water', liters: +L.toFixed(1), frac: ch / 100, quick: true }); render.keepScroll = true; render(); undoToast(`${tl('Zapisano podmianę {0}% ({1} l)', fnum(ch, 0), fnum(L, 0))}`, () => undoAll([e.id])); } },
      (was ? '✓ ' : '') + `${tl('Podmiana {0}%', fnum(ch, 0))}`)); }
  for (const it of plan.slice(0, 4)) { const p = productById(it.pid), was = done(e => e.type === 'dose' && e.pid === p.id);
    box.append(h('button', { class: 'chip' + (was ? ' on' : ''), type: 'button', onclick: () => { const e = quickDose(it, tasks); render.keepScroll = true; render(); if (e) undoToast(`${tl('Podano: {0} {1} {2}{3}', p.name, gfmt(e.amount), p.unit, stockLeftTxt(t, it))}`, () => undoAll([e.id])); } },
      `${was ? '✓ ' : ''}${p.name} ${gfmt(+n2(it.amt))} ${p.unit}`)); }
  if (plan.length > 1) box.append(h('button', { class: 'chip', type: 'button', onclick: () => { const ids = plan.map(it => quickDose(it, tasks)).filter(Boolean).map(e => e.id); render.keepScroll = true; render(); undoToast(`${tl('Zapisano {0} dawki z planu', ids.length)}`, () => undoAll(ids)); } }, tl('Wszystkie nawozy z planu')));
  return h('section', { class: 'card' }, h('h2', {}, tl('Szybki wpis'), h('span', { class: 'unit2' }, tl('jedno dotknięcie, dziś'))), box,
    (() => { const lo = lowStock(t); return lo.length ? h('div', { html: alertH('warn', `${tl('Kończy się: {0}.', esc(lo.join(', ')))} <a href="#/zbiornik/nawozenie">${tl('Zapasy')}</a>`) }) : null; })(),
    h('div', { class: 'note' }, tl('Inną ilość lub datę wpiszesz przyciskiem „+” na dole. Dawki pochodzą z listy nawozów akwarium.')));
}
const action = (link, i, t, d) => h('button', { class: 'action', onclick: () => go(link) }, h('span', { class: 'ti', html: icon(i, 22) }), h('span', { class: 'tx' }, h('b', {}, t), h('span', { class: 'd' }, d)), h('span', { class: 'go', html: icon('chevr', 20) }));

/* ---------- DZIENNIK: historia ---------- */
const FILTERS = [['all', tl('Wszystko')], ['measure', tl('Pomiary')], ['water', tl('Podmiany')], ['dose', tl('Nawozy')], ['care', tl('Pielęgnacja')], ['note', tl('Notatki')]];
PAGES['dziennik/historia'] = (root, lim) => {
  if (lim) { // 7.15: skrót w Akwarium – kilka ostatnich wpisów i link do całego dziennika
    const evs = EV().slice().sort((a, b) => b.ts - a.ts);
    if (!evs.length) { root.append(h('section', { class: 'card' }, h('p', { class: 'sub', style: 'margin:0' }, tl('Brak wpisów. Testy wody, podmiany i dawki dodasz przyciskiem „+” na dole – z nich powstają wykresy i wnioski.')))); return; }
    root.append(h('section', { class: 'card tight' }, h('div', { class: 'evlist' }, evs.slice(0, lim).map(e => evRow(e, () => openEvent(e))))),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => go('dziennik') }, `${tl('Cały dziennik ({0} {1})', evs.length, evs.length === 1 ? 'wpis' : P.plural(evs.length, tl('wpis'), tl('wpisy'), tl('wpisów')))}`));
    return;
  }
  const f = state.inputs.histF || 'all', list = h('div');
  root.append(h('div', { class: 'chips scroll' }, FILTERS.map(([k, t]) => h('button', { class: 'chip' + (k === f ? ' on' : ''), onclick: () => { state.inputs.histF = k; save(); render.keepScroll = true; render(); } }, t))));
  const match = e => f === 'all' || e.type === f || (f === 'care' && (e.type === 'task')) || (f === 'note' && e.type === 'setting');
  const evs = EV().filter(match).sort((a, b) => b.ts - a.ts);
  if (!evs.length) { root.append(h('section', { class: 'card empty' }, h('h2', {}, f === 'all' ? tl('Dziennik jest pusty') : tl('Brak wpisów tego rodzaju')), f === 'all' ? emptyChart() : null, h('p', { class: 'sub', style: 'margin:0 0 14px' }, tl('Tu zapisujesz testy wody, podmiany i dawki nawozów. Z nich powstają wykresy i wnioski.')), h('div', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'btn', onclick: () => openMeasure() }, tl('Dodaj test wody')), h('button', { class: 'btn ghost', onclick: openAdd }, tl('Inny wpis'))))); return; }
  let lastD = null, card0 = null, shown = 0, limit = state.inputs.histN || 60;
  for (const e of evs) {
    if (shown >= limit) break;
    if (e.date !== lastD) { lastD = e.date; card0 = h('div', { class: 'evlist' }); list.append(h('div', { class: 'dayh' }, dayLong(e.date)), h('section', { class: 'card tight' }, card0)); }
    card0.append(evRow(e, () => openEvent(e))); shown++;
  }
  root.append(list);
  if (evs.length > limit) root.append(h('button', { class: 'btn ghost block', onclick: () => { state.inputs.histN = limit + 60; render.keepScroll = true; render(); } }, `${tl('Pokaż starsze ({0})', evs.length - limit)}`));
};

/* ---------- DZIENNIK: wykresy ---------- */
PAGES['dziennik/wykresy'] = (root, compact) => {
  const t = tank(), evs = EV(), T = P.targetsOf(t), k = state.inputs.chart || 'NO3', per = state.inputs.chartP || 90, now = Date.now();
  const params = FIELD_ORDER.filter(x => P.series(evs, x).length).concat(P.series(evs, 'pH').length && P.series(evs, 'KH').length ? ['CO2'] : []);
  if (!params.length) { root.append(h('section', { class: 'card' }, h('p', { class: 'sub', style: 'margin:0 0 12px' }, tl('Wykresy pojawią się po dodaniu pomiarów.')), h('button', { class: 'btn', onclick: () => openMeasure() }, tl('Dodaj pomiar')))); return; }
  const key = params.includes(k) ? k : params[0];
  const sel = (s, v) => { Object.assign(state.inputs, s); save(); render.keepScroll = true; render(); };
  root.append(h('div', { class: 'chips scroll' }, params.map(x => h('button', { class: 'chip' + (x === key ? ' on' : ''), onclick: () => sel({ chart: x }) }, plabel(x)))),
    h('div', { class: 'chips' }, [[30, tl('30 dni')], [90, tl('3 mies.')], [365, tl('Rok')], [0, tl('Wszystko')]].map(([v, l]) => h('button', { class: 'chip small' + (v === per ? ' on' : ''), onclick: () => sel({ chartP: v }) }, l))));
  let s = key === 'CO2' ? (() => { const out = []; for (const e of evs) if (e.type === 'measure' && typeof e.pH === 'number' && typeof e.KH === 'number' && e.KH > 0) { const [lo, hi] = C.co2Range(e.pH, e.KH); out.push({ ts: e.ts, date: e.date, v: C.co2(e.pH, e.KH), lo, hi }); } return out.sort((a, b) => a.ts - b.ts); })() : P.series(evs, key);
  const from = per ? now - per * P.DAY : -Infinity, cur = s.filter(p => p.ts >= from), prev = per ? s.filter(p => p.ts >= from - per * P.DAY && p.ts < from) : [];
  const c = h('section', { class: 'card' }, h('h2', {}, ico('chart', 18), P.PARAM[key].long || plabel(key)));
  if (!cur.length) c.append(h('p', { class: 'sub' }, tl('Brak pomiarów w tym okresie.')));
  else {
    const marks = ['NO3', 'PO4', 'K', 'Fe', 'Mg', 'Ca'].includes(key), from2 = per ? now - per * P.DAY : Math.min(...cur.map(p => p.ts)) - P.DAY;
    const d = { meas: s.map(p => ({ ts: p.ts, v: p.v, lo: p.lo, hi: p.hi })), est: [],
      doses: marks ? evs.filter(e => e.type === 'dose' && e.ppm && e.ppm[key]).map(e => ({ ts: e.ts })) : [], waters: evs.filter(e => e.type === 'water' && e.frac > 0).map(e => ({ ts: e.ts })) };
    c.insertAdjacentHTML('beforeend', timeChart(d, { from: from2, to: now, band: T[key], label: plabel(key) }));
    if (key === 'CO2') c.append(h('div', { html: whyH(tl('Dlaczego pasmo'), tl('CO₂ jest wyliczane z pH i KH, nie mierzone. Przy dokładności testów kropelkowych (pH ±0,1, KH ±0,5 °dH) wynik mieści się w zaznaczonym pasie. Kwasy z torfu, liści i podłoża zawyżają wynik.')) }));
    const vs = cur.map(p => p.v), avg = vs.reduce((a, b) => a + b) / vs.length, pavg = prev.length ? prev.reduce((a, b) => a + b.v, 0) / prev.length : null;
    c.append(h('div', { class: 'stats' }, ...[[tl('Ostatni'), vs[vs.length - 1]], [tl('Średnia'), avg], ['Min', Math.min(...vs)], ['Max', Math.max(...vs)]].map(([l, v]) => h('div', {}, h('small', {}, l), h('b', {}, pv(key, v))))));
    if (pavg !== null) { const d = avg - pavg; c.append(h('div', { class: 'note' }, `${tl('Średnia vs poprzednie {0} dni: {1} → {2} ({3}{4} {5}).', per, pv(key, pavg), pv(key, avg), d >= 0 ? '+' : '−', pv(key, Math.abs(d)), punit(key))}`)); }
    if (T[key]) c.append(h('div', { class: 'note' }, `${tl('Pas: cel {0}–{1} {2}', fnum(T[key][0], 2), fnum(T[key][1], 2), punit(key))}`));
  }
  root.append(c);
  if (compact) return;
  // podmiany i nawożenie w okresie
  const inP = e => e.ts >= from, wcs = evs.filter(e => e.type === 'water' && inP(e)), doses = evs.filter(e => e.type === 'dose' && inP(e));
  const days = per || Math.max(7, (now - Math.min(...evs.map(e => e.ts))) / P.DAY), weeks = days / 7;
  const totals = {}; doses.forEach(e => { for (const x in e.ppm || {}) totals[x] = (totals[x] || 0) + e.ppm[x]; });
  root.append(h('section', { class: 'card' }, h('h2', {}, ico('wave', 18), tl('Podmiany i nawożenie w okresie')),
    h('div', { class: 'kv' }, h('span', {}, tl('Podmiany')), h('b', {}, `${tl('{0} × · średnio {1}% tygodniowo', wcs.length, fnum(wcs.reduce((a, e) => a + e.frac, 0) / weeks * 100, 0))}`)),
    h('div', { class: 'kv' }, h('span', {}, tl('Nawożenie')), h('b', {}, tl('{0} dawek', doses.length))),
    Object.keys(totals).length ? h('div', { class: 'note' }, tl('Średnio dodawane tygodniowo: {0} mg/l.', ['NO3', 'PO4', 'K', 'Mg', 'Fe'].filter(x => totals[x]).map(x => `${elLbl(x)} ${gfmt(totals[x] / weeks)}`).join(' · '))) : null));
  // zmiany ustawień i obserwacje w okresie
  const notes = evs.filter(e => (e.type === 'setting' || e.type === 'note') && inP(e)).sort((a, b) => b.ts - a.ts).slice(0, 8);
  if (notes.length) root.append(h('section', { class: 'card' }, h('h2', {}, ico('note', 18), tl('Zmiany i obserwacje w tym czasie')), h('div', { class: 'evlist' }, notes.map(e => evRow(e, () => openEvent(e))))));
};

/* ---------- DZIENNIK: wnioski (sekcja pod wykresem, tylko z wpisanych testów) ---------- */
function wnioski(root) {
  const t = tank(), evs = EV(), A = P.analyze(t, evs);
  root.append(h('h2', { class: 'h2', id: 'wnioski' }, tl('Wnioski'), h('span', { class: 'unit2', style: 'margin-left:8px' }, `${tl('cele: {0} ·', P.PROFILES[t.type].short || P.PROFILES[t.type].name)} `, h('a', { href: '#/zbiornik/profil' }, tl('zmień')))));
  if (A.empty) return;
  const order = A.issues.filter(i => i.sev === 'bad' || i.sev === 'warn');
  root.append(h('section', { class: 'card' }, h('h2', {}, ico('warn', 18), tl('Co sprawdzić najpierw')),
    order.length ? h('ol', { class: 'steps' }, order.map(i => h('li', {}, h('div', { html: `<b>${P.PARAM[i.k]?.long || plabel(i.k)}</b><br><span style="color:var(--mut)">${esc(i.msg)}</span>` })))) : h('div', { class: 'okline', html: tl('{0}Nic pilnego.', icon('check', 18)) })));
  const tr = A.issues.filter(i => i.kind === 'trend' || (i.sev === 'info' && !i.kind));
  if (tr.length) root.append(h('section', { class: 'card' }, h('h2', {}, ico('chart', 18), tl('Trendy i uwagi')), h('div', { html: verdictHTML(tr) })));
  root.append(h('details', { class: 'card' }, h('summary', {}, tl('Ostatnie wyniki – ocena każdego parametru')), h('div', { html: verdictHTML(A.evals), style: 'margin-top:10px' }),
    A.stale.length ? h('div', { class: 'note' }, tl('Ponad 30 dni bez testu: {0}.', A.stale.map(plabel).join(', '))) : null));
}

/* ---------- ZBIORNIK: profil ---------- */
const fold = (title, iconName, ...kids) => h('details', { class: 'fold' }, h('summary', {}, ico(iconName, 18), h('span', {}, title)), h('div', { class: 'fold-b' }, ...kids));
/* 7.16: szybkie ustawienie akwarium – 3 pytania w oknie; otwierane z „Pierwszych kroków” i z propozycji nad kalkulatorem. Nic nie jest wymagane. */
function openSetup(after) {
  const t = tank(), d = { V: t.V, type: t.type, change: t.change ?? 30 };
  const vF = inputF(tl('Ile wody jest w akwarium?'), tl('l'), String(d.V || '').replace('.', DEC), { ph: '100', hint: tl('Netto – bez podłoża i dekoracji. Zwykle ok. 80–90% pojemności zbiornika.') });
  const typeBox = h('div', { class: 'tiles t3' }), chBox = h('div', { class: 'chips' }), chF = inputF(tl('Inna wartość'), tl('% / tydz.'), String(d.change), { ph: '30' });
  const drawType = () => { typeBox.innerHTML = ''; ['plant_lo', 'plant_mid', 'plant_hi'].forEach(k => { const p = P.PROFILES[k]; typeBox.append(h('button', { class: 'tile' + (d.type === k ? ' on' : ''), type: 'button', onclick: () => { d.type = k; drawType(); } }, h('b', {}, p.short || p.name), h('small', {}, TYPE_INFO[k]))); });
    typeBox.append(...['shrimp_neo', 'shrimp_cari', 'fish'].map(k => h('button', { class: 'chip' + (d.type === k ? ' on' : ''), type: 'button', style: 'grid-column:auto', onclick: () => { d.type = k; drawType(); } }, P.PROFILES[k].short || P.PROFILES[k].name))); };
  const drawCh = () => { chBox.innerHTML = ''; chBox.append(...[10, 20, 30, 50].map(v => h('button', { class: 'chip' + (+d.change === v ? ' on' : ''), type: 'button', onclick: () => { d.change = v; chF.inp.value = String(v); drawCh(); } }, v + '%'))); };
  chF.inp.addEventListener('input', () => { d.change = n2(chF.val()) ?? ''; drawCh(); });
  drawType(); drawCh();
  const bg = sheet([h('h3', {}, tl('Twoje akwarium')), h('p', { class: 'help-o' }, tl('Trzy pytania. Odpowiedzi podstawią się w kalkulatorach i posłużą do oceny testów wody. Wszystko zmienisz później w ustawieniach akwarium.')),
    h('div', { class: 'stack' }, h('h4', { class: 'help-h' }, tl('1. Objętość')), vF.el, galHelper(vF.inp), h('h4', { class: 'help-h' }, tl('2. Rodzaj akwarium')), typeBox, h('h4', { class: 'help-h' }, tl('3. Podmiana wody co tydzień')), chBox, chF.el),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => {
      const V = n2(vF.val()), ch = n2(chF.val());
      if (!(V > 0 && V <= 100000)) { toast(tl('Wpisz objętość w litrach')); vF.inp.focus(); return; }
      Object.assign(t, { V, type: d.type, tech: { plant_lo: 'low', plant_mid: 'medium', plant_hi: 'high' }[d.type] || '', change: ch >= 0 && ch <= 100 ? ch : t.change, setup: true });
      const g = kxState(); if (g.nawoz) { const k0 = knDefaults(t); Object.assign(g.nawoz, { light: k0.light, co2: k0.co2, V: '', change: String(t.change ?? 30) }); }
      save(); bg.remove(); toast(tl('Zapisano – wartości podstawione w kalkulatorach')); if (after) after(); else { render.keepScroll = true; render(); }
    } }, tl('Zapisz')), h('button', { class: 'btn ghost', type: 'button', onclick: () => bg.remove() }, tl('Nie teraz')))]);
  setTimeout(() => vF.inp.focus(), 50);
}
const TYPE_INFO = { plant_lo: tl('Bez CO₂, umiarkowane światło'), plant_mid: tl('Węgiel w płynie lub trochę CO₂'), plant_hi: tl('Butla CO₂, mocne światło'), shrimp_neo: tl('Woda średnio twarda'), shrimp_cari: tl('Miękka woda, aktywne podłoże'), fish: tl('Mało roślin') };
PAGES['zbiornik/profil'] = root => {
  const t = tank(), prof = () => P.PROFILES[t.type];
  const bind = (label, field, unit, o = {}) => {
    const f = inputF(label, unit, typeof t[field] === 'number' ? String(t[field]).replace('.', DEC) : (t[field] ?? ''), o); (bind.refs ||= {})[field] = f.inp;
    f.inp.addEventListener('change', () => {
      let v = f.val(); if (o.numeric) { const x = n2(v); if (!(x > 0) || (o.max && x > o.max)) { f.inp.value = t[field]; toast(tl('Niepoprawna wartość')); return; } v = x; }
      const before = String(t[field] ?? ''); t[field] = v; t.setup = true; save();
      if (o.track && before !== String(v)) addEvent({ type: 'setting', label, from: before + (before && unit ? ' ' + unit : ''), to: v + (v && unit ? ' ' + unit : '') });
      $('#tankname').textContent = tl('{0} · {1} l', t.name, fnum(t.V, 0));
    });
    return f.el;
  };
  root.append(h('section', { class: 'card' }, h('div', { class: 'stack' }, bind(tl('Nazwa'), 'name', '', { type: 'text', max: 40 }),
    h('div', { class: 'grid' }, bind(tl('Woda netto'), 'V', tl('l'), { numeric: true, max: 100000, track: true }), bind(tl('Podmiana'), 'change', tl('% / tydz.'), { numeric: true, max: 100 })), galHelper(bind.refs.V)),
    h('button', { class: 'linkbtn', onclick: () => go('pomiary/objetosc') }, tl('Policz z wymiarów'))));
  // rodzaj
  const setType = k => { const p = P.PROFILES[k], before = P.PROFILES[t.type].name; t.type = k; t.tech = { plant_lo: 'low', plant_mid: 'medium', plant_hi: 'high' }[k] || ''; t.setup = true; save();
    if (before !== p.name) addEvent({ type: 'setting', label: tl('Rodzaj akwarium'), from: before, to: p.name }); render.keepScroll = true; render(); };
  const typeBox = h('div', { class: 'tiles t3' });
  ['plant_lo', 'plant_mid', 'plant_hi'].forEach(k => { const p = P.PROFILES[k]; typeBox.append(h('button', { class: 'tile' + (t.type === k ? ' on' : ''), type: 'button', onclick: () => setType(k) }, h('b', {}, p.short || p.name), h('small', {}, TYPE_INFO[k] || ''))); });
  const other = ['shrimp_neo', 'shrimp_cari', 'fish'];
  root.append(h('h2', { class: 'h2' }, tl('Rodzaj')), typeBox, h('div', { class: 'chips', style: 'margin-top:10px' }, h('span', { class: 'lbl', style: 'align-self:center;margin-right:4px' }, tl('albo')),
    other.map(k => h('button', { class: 'chip' + (t.type === k ? ' on' : ''), type: 'button', onclick: () => setType(k) }, P.PROFILES[k].short || P.PROFILES[k].name))));
  // światło i rośliny
  const pick = (label, field, opts) => { const box = h('div', { class: 'pick' }); const draw = () => { box.innerHTML = ''; box.append(h('span', { class: 'lbl' }, label), chips(opts, t[field], v => { const before = t[field]; t[field] = t[field] === v ? '' : v; save(); if (before !== t[field]) addEvent({ type: 'setting', label, from: (opts.find(o => o[0] === before) || [, '—'])[1], to: (opts.find(o => o[0] === t[field]) || [, '—'])[1] }); draw(); })); }; draw(); return box; };
  const lightBox = h('div', { class: 'stack' },
    pick(tl('Światło'), 'light', [['low', tl('Słabe')], ['medium', tl('Średnie')], ['high', tl('Mocne')]]),
    pick(tl('Rośliny'), 'density', [['low', tl('Mało')], ['medium', tl('Średnio')], ['high', tl('Gęsto')]]),
    pick('CO₂', 'co2type', [['none', tl('Brak')], ['liquid', tl('W płynie')], ['yeast', tl('Drożdże')], ['bottle', tl('Butla')]]));
  // więcej
  const ta = (label, field, ph) => { const el = h('textarea', { rows: 3, maxlength: 2000, placeholder: ph }); el.value = t[field] || ''; el.onchange = () => { t[field] = el.value; save(); }; return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inp' }, el)); };
  const T = P.targetsOf(t), def = prof().t, tg = h('div', { class: 'stack' });
  for (const k of ['NO3', 'PO4', 'K', 'Mg', 'Ca', 'Fe', 'pH', 'KH', 'GH', 'CO2', 'temp']) {
    const cur = T[k] || ['', ''], dd = def[k];
    const lo = inputF(tl('{0} od', plabel(k)), punit(k), t.targets[k] ? String(cur[0]).replace('.', DEC) : '', { ph: dd ? String(dd[0]).replace('.', DEC) : '—' });
    const hi = inputF(tl('do'), punit(k), t.targets[k] ? String(cur[1]).replace('.', DEC) : '', { ph: dd ? String(dd[1]).replace('.', DEC) : '—' });
    const ch = () => { const a = lo.num(), b = hi.num(); if (lo.val() === '' && hi.val() === '') { delete t.targets[k]; save(); return; } const A2 = a ?? (dd ? dd[0] : 0), B2 = b ?? (dd ? dd[1] : A2); if (A2 > B2) { toast(tl('„Od” musi być mniejsze niż „do”')); return; } t.targets[k] = [A2, B2]; save(); };
    lo.inp.onchange = ch; hi.inp.onchange = ch; tg.append(h('div', { class: 'grid' }, lo.el, hi.el));
  }
  const fb = h('div', { class: 'chips' }), drawF = () => { fb.innerHTML = ''; t.fert = t.fert.filter(id => productById(id));
    t.fert.forEach(id => fb.append(h('button', { class: 'chip on', type: 'button', onclick: () => { t.fert = t.fert.filter(x => x !== id); save(); drawF(); } }, productById(id).name + ' ×')));
    const add = h('select', { 'aria-label': tl('Dodaj nawóz') }, h('option', { value: '' }, tl('Dodaj nawóz')), allProducts().filter(p => !t.fert.includes(p.id)).map(p => h('option', { value: p.id }, pName(p))));
    add.onchange = () => { if (add.value) { t.fert.push(add.value); save(); drawF(); } }; fb.append(h('span', { class: 'inp', style: 'flex:1;min-width:180px' }, add)); };
  drawF();
  root.append(h('h2', { class: 'h2' }, tl('Więcej')), h('div', { class: 'folds' },
    fold(tl('Światło, rośliny, CO₂'), 'leaf', lightBox),
    fold(tl('Cele parametrów'), 'test', h('div', { class: 'note', style: 'margin:0 0 12px' }, tl('Puste = domyślne dla rodzaju.')), tg,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost small', onclick: () => { t.targets = {}; save(); render.keepScroll = true; render(); toast(tl('Przywrócono domyślne cele')); } }, tl('Przywróć domyślne')))),
    fold(tl('Woda do podmian'), 'drop', waterBox(t)),
    fold(tl('Wyposażenie'), 'tools', h('div', { class: 'stack' },
      h('div', { class: 'grid' }, bind(tl('Oświetlenie'), 'lightW', 'W', { type: 'text', max: 20, track: true }), bind(tl('Światło'), 'lightH', tl('h/dobę'), { type: 'text', max: 10, track: true })),
      bind(tl('CO₂ – szczegóły'), 'co2', '', { type: 'text', max: 60, ph: tl('np. 1 bąbel/s, 8:00–15:00'), track: true }),
      bind(tl('Filtr'), 'filter', '', { type: 'text', max: 80 }), bind(tl('Podłoże'), 'substrate', '', { type: 'text', max: 80 }),
      h('div', { class: 'grid' }, bind(tl('Objętość brutto'), 'Vgross', tl('l'), { type: 'text', max: 10 }), bind(tl('Data założenia'), 'created', '', { type: 'date' })))),
    fold(tl('Rośliny i obsada'), 'garden', h('div', { class: 'stack' }, ta(tl('Rośliny'), 'plants', ''), ta(tl('Zwierzęta'), 'fauna', ''))),
    fold(tl('Notatki'), 'note', ta(tl('Notatki'), 'notes', ''))));
  if (state.tanks.length > 1) root.append(h('button', { class: 'btn danger block', style: 'margin-top:18px', onclick: () => { if (confirm(`${tl('Usunąć „{0}” z dziennikiem?', t.name)}`)) { removeTank(t.id); go('kalkulator'); } } }, tl('Usuń akwarium')));
};

/* ---------- ZBIORNIK: plan pielęgnacji ---------- */
const DAYS = [[1, tl('Pn')], [2, tl('Wt')], [3, tl('Śr')], [4, tl('Cz')], [5, tl('Pt')], [6, tl('So')], [0, tl('Nd')]];
PAGES['zbiornik/plan'] = root => {
  const evs = EV(), today = todayKey(), list = TASKS();
  const c = h('section', { class: 'card' }, h('h2', {}, ico('cal', 18), tl('Czynności')));
  if (!list.length) c.append(h('p', { class: 'sub' }, tl('Brak zaplanowanych czynności.')));
  list.forEach(k => {
    const s = P.taskStatus(k, evs, today), when = k.mode === 'every' ? `${tl('co {0} dni', k.every)}` : DAYS.filter(d => (k.days || []).includes(d[0])).map(d => d[1]).join(', ');
    c.append(h('button', { class: 'trow', style: 'width:100%;text-align:left', onclick: () => editTask(k) }, h('span', { class: 'ti', html: icon(P.TASK_KINDS[k.kind]?.icon || 'cal', 20) }),
      h('span', { class: 'tx' }, h('b', {}, k.name + (k.pid && k.amt ? ` · ${fnum(k.amt, 2)} ${k.unit || ''}` : '')), h('small', { class: s.due && s.overdue ? 'late' : '' }, `${when} · ${s.due ? (s.overdue ? tl('zaległe') : tl('dziś')) : s.next ? tl('następne {0}', relDay(s.next)) : ''}${s.last ? (' ' + tl('· ostatnio {0}', relDay(s.last))) : ''}`)),
      h('span', { class: 'go', html: icon('edit', 18) })));
  });
  const gen = P.doseTasksFromPlan(tank().fplan, productById, list, today, () => uid('k'));
  c.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => editTask(null) }, tl('+ Dodaj czynność')),
    gen.length ? h('button', { class: 'btn ghost', onclick: () => { TASKS().push(...gen); save(); toast(`${tl('Dodano {0} {1} z listy nawozów', gen.length, P.plural(gen.length, tl('dawkę'), tl('dawki'), tl('dawek')))}`); render.keepScroll = true; render(); } }, tl('Dodaj dawki z listy nawozów')) : null));
  const wt = list.find(k => k.kind === 'water');
  if (wt && !list.some(k => k.kind === 'test')) { const tb = P.testBeforeWater(wt, today, () => uid('k'));
    if (tb) c.append(h('div', { class: 'tip' }, h('span', {}, tl('Test wody dzień przed podmianą pokazuje, ile składników zostaje po tygodniu.')), h('button', { class: 'btn ghost small', onclick: () => { TASKS().push(tb); save(); toast(tl('Dodano test przed podmianą')); render.keepScroll = true; render(); } }, tl('Dodaj do planu')))); }
  root.append(c);
  const done = evs.filter(e => e.type === 'task' || e.type === 'care' || e.type === 'water' || (e.type === 'dose' && e.taskKind)).sort((a, b) => b.ts - a.ts).slice(0, 15);
  if (done.length) root.append(h('section', { class: 'card' }, h('h2', {}, ico('check', 18), tl('Ostatnio wykonane')), h('div', { class: 'evlist' }, done.map(e => evRow(e, () => openEvent(e))))));
  const hour = inputF(tl('Godzina przypomnienia'), ':00', String(state.inputs.icsH ?? 18)); hour.inp.onchange = () => { const v = Math.round(hour.num()); state.inputs.icsH = v >= 0 && v <= 23 ? v : 18; save(); };
  root.append(h('section', { class: 'card' }, h('h2', {}, ico('cal', 18), tl('Przypomnienia')),
    h('div', { class: 'sub' }, tl('Plik .ics dla kalendarza w telefonie (powtarzanie + alarm).')),
    h('div', { class: 'grid' }, hour.el), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      if (!list.length) { toast(tl('Brak czynności w planie')); return; }
      download(`plan-${tank().name.replace(/[^\wąćęłńóśźż-]+/gi, '_')}.ics`, P.icsFor(tank().name, list, today, state.inputs.icsH ?? 18), 'text/calendar'); toast(tl('Pobrano plik kalendarza'));
    } }, tl('Pobierz do kalendarza (.ics)'))),
    h('div', { class: 'note' }, tl('Po zmianie planu pobierz ponownie.'))));
};
function editTask(k) {
  const isNew = !k; k = k ? { ...k } : { id: uid('k'), kind: 'filter', name: P.TASK_KINDS.filter.name, mode: 'every', every: 14, days: [], start: todayKey() };
  const kindSel = h('select', {}, Object.entries(P.TASK_KINDS).map(([v, x]) => h('option', { value: v }, x.name))); kindSel.value = k.kind;
  const name = inputF(tl('Nazwa'), '', k.name, { type: 'text', max: 40 }), every = inputF(tl('Co ile dni'), tl('dni'), k.every || 7);
  const modeBox = h('div'), daysBox = h('div', { class: 'days' }), everyBox = h('div', {}, every.el);
  const prods = allProducts(), psel = h('select', {}, [h('option', { value: '' }, tl('— wybierz przy odhaczaniu —')), ...prods.map(p => h('option', { value: p.id }, pName(p)))]); psel.value = k.pid || '';
  const amt = inputF(tl('Dawka'), k.unit || 'ml', k.amt ? String(k.amt).replace('.', DEC) : ''), doseBox = h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Nawóz')), h('span', { class: 'inp' }, psel)), amt.el);
  const showDose = () => { doseBox.style.display = P.TASK_KINDS[kindSel.value]?.log === 'dose' ? '' : 'none'; }; showDose();
  kindSel.onchange = () => { showDose(); if (Object.values(P.TASK_KINDS).some(x => x.name === name.val()) || !name.val()) name.inp.value = P.TASK_KINDS[kindSel.value].name; };
  const draw = () => {
    modeBox.innerHTML = ''; modeBox.append(chips([['days', tl('Dni tygodnia')], ['every', tl('Co N dni')]], k.mode, v => { k.mode = v; draw(); }));
    daysBox.innerHTML = ''; DAYS.forEach(([d, l]) => { const b = h('button', { class: 'day' + ((k.days || []).includes(d) ? ' on' : ''), type: 'button' }, l); b.onclick = () => { k.days = (k.days || []).includes(d) ? k.days.filter(x => x !== d) : [...(k.days || []), d]; b.classList.toggle('on'); }; daysBox.append(b); });
    daysBox.style.display = k.mode === 'days' ? '' : 'none'; everyBox.style.display = k.mode === 'every' ? '' : 'none';
  };
  draw();
  const bg = sheet([h('h3', {}, isNew ? tl('Nowa czynność') : tl('Edytuj czynność')), h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Rodzaj')), h('span', { class: 'inp' }, kindSel)), name.el, doseBox, modeBox, daysBox, everyBox),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      k.kind = kindSel.value; k.name = name.val() || P.TASK_KINDS[k.kind].name;
      if (P.TASK_KINDS[k.kind].log === 'dose' && psel.value) { const p = productById(psel.value); k.pid = p.id; k.unit = p.unit; k.amt = amt.num() > 0 ? amt.num() : undefined; } else { delete k.pid; delete k.amt; delete k.unit; }
      if (k.mode === 'every') { const n = Math.round(every.num()); if (!(n >= 1 && n <= 365)) { toast(tl('Podaj od 1 do 365 dni')); return; } k.every = n; } else if (!(k.days || []).length) { toast(tl('Wybierz co najmniej jeden dzień')); return; }
      const arr = TASKS(), i = arr.findIndex(x => x.id === k.id); if (i >= 0) arr[i] = k; else arr.push(k); save(); bg.remove(); render.keepScroll = true; render();
    } }, tl('Zapisz')), !isNew ? h('button', { class: 'btn danger', onclick: () => { state.tasks[tank().id] = TASKS().filter(x => x.id !== k.id); save(); bg.remove(); render.keepScroll = true; render(); } }, tl('Usuń')) : null)]);
}

/* ---------- NARZĘDZIA ---------- */
/* 7.16: jedno miejsce na wszystkie narzędzia (zakładka Zaawansowane; „narzedzia” pokazuje to samo) – każde narzędzie raz.
   Mineralizacja RO jest w „Nawozy z soli”, a podmiana, plan pielęgnacji, baza nawozów i pomoc – w Akwarium. */
function toolsHub(root) {
  const row = (to, l, d) => lrow(to, l, d), pro = state.adv;
  const grp = (title, ...rows) => root.append(h('h2', { class: 'h2' }, title), h('div', { class: 'lrows' }, ...rows.filter(Boolean)));
  root.append(h('h1', { class: 'page-title' }, tl('Zaawansowane')),
    h('p', { class: 'page-sub' }, tl('Narzędzia dla tych, którzy chcą samodzielnie dobrać każdą sól i każdy cel. Jeśli dopiero zaczynasz, skorzystaj z zakładki „Nawozy z soli” – dobierze sole i dawkę za Ciebie.')));
  grp(tl('Własny nawóz – sól po soli'),
    row('kalkulator/makro', tl('Makro: azot, fosfor, potas, magnez'), tl('Ustalasz cel dla NO₃, PO₄, K, Mg i Ca oraz sól dla każdego składnika. Wynik: gramy do butelki albo na sucho.')),
    row('kalkulator/mikro', tl('Mikro i żelazo'), tl('Żelazo i mikroelementy z soli, chelatów albo gotowej mieszanki, z EDTA tam, gdzie jest potrzebne.')),
    row('nawozy/odpowiednik', tl('Zrób sam odpowiednik'), tl('Gotowy nawóz odtworzony z soli – ten sam skład i ta sama dawka.')),
    row('kalkulator/receptury/sprawdz', tl('Sprawdź butelkę'), tl('Wpisujesz, ile czego rozpuściłeś. Dostajesz stężenie w butelce, efekt dawki w akwarium i ostrzeżenie przed wytrącaniem.')));
  grp(tl('Woda i parametry'),
    row('woda/korekta', tl('Korekta parametrów akwarium'), tl('Na podstawie wyniku testu: ile składnika dodać jednorazowo, żeby osiągnąć wartość docelową.')),
    row('woda/mineral', tl('Twardość z soli'), tl('Wpisujesz gramy soli, dostajesz GH, KH i skład jonów w danej objętości wody.')),
    row('woda/co2', tl('CO₂ z pH i KH'), tl('Szacowane stężenie CO₂ z wyników testu pH i KH.')),
    pro ? row('woda/kwas', tl('Obniżanie KH kwasem'), tl('Ile kwasu (domyślnie octu) dodać, żeby obniżyć KH wody, z zasadami bezpieczeństwa.')) : null,
    pro ? row('woda/kumulacja', tl('Narastanie soli'), tl('Jak przy stałym nawożeniu i podmianach rosną SO₄, Cl, Na i twardość.')) : null);
  grp(tl('Pomiary i przeliczniki'),
    row('pomiary/jednostki', tl('Jednostki z etykiet nawozów'), tl('N ↔ NO₃, P ↔ PO₄ ↔ P₂O₅, K ↔ K₂O, °dH ↔ mg/l.')),
    row('pomiary/objetosc', tl('Objętość zbiornika'), tl('Objętość brutto i netto z wymiarów.')),
    pro ? row('pomiary/miareczkowanie', tl('Miareczkowanie'), tl('KH, GH, Ca i Mg z własnych testów kroplowych.')) : null);
  grp(tl('Aplikacja'),
    h('button', { class: 'lrow', type: 'button', onclick: () => setAdv(!state.adv) }, h('span', {}, tl('Tryb PRO')), h('small', {}, state.adv ? tl('Włączony: obniżanie KH, narastanie soli, miareczkowanie i czystość soli w Makro i Mikro.') : tl('Dodaje obniżanie KH kwasem, narastanie soli, miareczkowanie i czystość soli.')), h('i', { class: 'sw' + (state.adv ? ' on' : '') })),
    row('slownik', tl('Słowniczek'), tl('Pojęcia używane w aplikacji.')));
  root.append(h('p', { class: 'note' }, tl('Mineralizacja wody RO jest w zakładce „Nawozy z soli”. Podmiana wody, plan pielęgnacji, baza nawozów i pomoc przy problemach z roślinami – w zakładce Akwarium. Wygląd i kopia zapasowa – pod ikoną zębatki u góry.')));
}
PAGES.narzedzia = root => toolsHub(root);

/* ---------- MOJE NAWOZY ---------- */
const COMP = [['NO3', tl('Azot'), [['NO3', 'NO₃'], ['N', tl('N (azotanowy)')]]], ['NH4', tl('Azot amonowy'), [['NH4', 'NH₄'], ['N', tl('N (amonowy)')]]], ['PO4', tl('Fosfor'), [['PO4', 'PO₄'], ['P', 'P'], ['P2O5', 'P₂O₅']]],
  ['K', tl('Potas'), [['K', 'K'], ['K2O', 'K₂O']]], ['Mg', tl('Magnez'), [['Mg', 'Mg'], ['MgO', 'MgO']]], ['Ca', tl('Wapń'), [['Ca', 'Ca'], ['CaO', 'CaO']]], ['Fe', tl('Żelazo'), [['Fe', 'Fe']]], ['Mn', tl('Mangan'), [['Mn', 'Mn']]], ['Cu', tl('Miedź'), [['Cu', 'Cu']]],
  ['Zn', tl('Cynk'), [['Zn', 'Zn']]], ['B', tl('Bor'), [['B', 'B']]], ['Mo', tl('Molibden'), [['Mo', 'Mo']]]];
const FORM_F = { NO3: { NO3: 1, N: C.MM.NO3 / C.MM.N }, NH4: { NH4: 1, N: C.MM.NH4 / C.MM.N }, PO4: { PO4: 1, P: C.MM.PO4 / C.MM.P, P2O5: 2 * C.MM.PO4 / C.MM.P2O5 }, K: { K: 1, K2O: 2 * C.MM.K / C.MM.K2O }, Mg: { Mg: 1, MgO: C.MM.Mg / C.MM.MgO }, Ca: { Ca: 1, CaO: C.MM.Ca / C.MM.CaO } };
const FKIND = [['macro', tl('Makro (NPK)')], ['micro', tl('Mikro')], ['fe', tl('Żelazo')], ['k', tl('Potas')], ['n', tl('Azot')], ['p', tl('Fosfor')], ['mg', tl('Magnez')], ['multi', tl('Wieloskładnikowy')], ['diy', tl('Własny z soli')]];
const pstat = p => { const x = PSTATUS[p.status || (p.source === 'builtin' ? 'unverified' : p.source === 'recipe' ? 'recipe' : 'label')] || PSTATUS.label; return h('span', { class: 'pill s-' + x[1] }, x[0]); };
const compLine = p => Object.keys(p.ppm || {}).length ? Object.entries(p.ppm).filter(([k, v]) => v > 0 && !['SO4', 'Cl', 'Na'].includes(k)).slice(0, 6).map(([k, v]) => `${elLbl(k)} ${gfmt(v)}`).join(', ') + (p.unit === 'ml' ? tl(' g/l') : ' g/kg') : tl('skład nieuzupełniony');
PAGES['nawozy/moje'] = root => {
  const st = (state.inputs.prodF ||= { q: '', prod: '' });
  root.append(h('div', { class: 'btnrow', style: 'margin:0 0 14px' }, h('button', { class: 'btn', onclick: () => go('nawozy/receptury/nowa') }, tl('+ Przepis')), h('button', { class: 'btn ghost', onclick: () => editProduct(null) }, tl('+ Gotowy nawóz'))));
  recipesList(root);
  const mine = state.products.filter(p => !p.rid);
  if (mine.length) root.append(h('h2', { class: 'h2' }, tl('Gotowe nawozy')), h('section', { class: 'card flat' }, mine.map(p => h('button', { class: 'trow', style: 'width:100%;text-align:left', onclick: () => editProduct(p) }, h('span', { class: 'ti', html: icon('pack', 20) }),
    h('span', { class: 'tx' }, h('b', {}, p.name, ' ', pstat(p)), h('small', {}, [p.producer, compLine(p)].filter(Boolean).join(', '))), h('span', { class: 'go', html: icon('edit', 18) })))));
  const salts = h('div', {}, state.salts.map(m => h('button', { class: 'trow', style: 'width:100%;text-align:left', onclick: () => editSalt(m) }, h('span', { class: 'ti', html: icon('flask', 20) }),
    h('span', { class: 'tx' }, h('b', {}, X.formulaOf(m, 0)), h('small', {}, m.name)), h('span', { class: 'go', html: icon('edit', 18) }))),
    h('button', { class: 'btn ghost small', onclick: () => editSalt(null) }, tl('+ Własna sól')));
  const fin = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', 'aria-label': tl('Plik bazy nawozów') });
  fin.onchange = () => { const f = fin.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => {
    try { const r = fertImport(state, JSON.parse(rd.result), uid); save(); render.keepScroll = true; render();
      toast(r.salts + r.recipes + r.products ? `${tl('Dodano: {0} nawozów, {1} przepisów, {2} soli{3}', r.products, r.recipes, r.salts, r.skipped ? ` ${tl('(pominięto {0} – już są)', r.skipped)}` : '')}` : r.skipped ? tl('Wszystko z pliku już jest w bazie') : tl('Plik nie zawiera nawozów'));
    } catch (e) { toast(e instanceof SyntaxError ? tl('Plik jest uszkodzony albo to nie JSON') : e.message, 3500); } }; rd.readAsText(f); fin.value = ''; };
  const io = h('div', { class: 'stack' }, h('p', { class: 'note', style: 'margin:0' }, tl('Same nawozy, przepisy i sole – bez dziennika i ustawień akwarium. Przyda się do przeniesienia na inny telefon albo podzielenia się przepisem.')),
    h('div', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'btn ghost small', onclick: () => {
      const d = fertExport(state); if (!d.products.length && !d.recipes.length && !d.salts.length) { toast(tl('Brak własnych nawozów do zapisania')); return; }
      download(tl('nawozy-{0}.json', todayKey()), JSON.stringify(d, null, 1), 'application/json'); toast(tl('Zapisano plik z nawozami')); } }, tl('Zapisz do pliku')),
      h('button', { class: 'btn ghost small', onclick: () => fin.click() }, tl('Wczytaj z pliku')), fin));
  const folds = h('div', { class: 'folds' }, fold(`${tl('Własne sole ({0})', state.salts.length)}`, 'flask', salts), fold(tl('Przenieś bazę nawozów'), 'pack', io));
  root.append(h('h2', { class: 'h2' }, tl('Więcej')), folds);
  // baza
  const b = builtinProducts(), list = h('div', { class: 'evlist' }), q = h('input', { type: 'search', placeholder: tl('Szukaj…'), value: st.q, 'aria-label': tl('Szukaj w bazie') });
  const prods = [...new Set(b.map(p => p.producer))].sort();
  const drawList = () => { list.innerHTML = ''; const f = b.filter(p => (!st.prod || p.producer === st.prod) && (!st.q || p.name.toLowerCase().includes(st.q.toLowerCase())));
    f.forEach(p => list.append(h('button', { class: 'evrow', onclick: () => editProduct({ ...p, id: null, name: tl('{0} (mój)', p.name), source: 'user', status: p.status === 'label' ? 'label' : 'unverified', note: p.src ? tl('z bazy: {0}', p.src) : tl('skopiowane z bazy – sprawdź z etykietą') }) },
      h('span', { class: 'evt' }, h('b', {}, p.name, ' ', pstat(p)), h('span', {}, compLine(p)), p.src ? h('span', { class: 'evn' }, p.note || '') : null), h('small', {}, tl('Dodaj do moich')))));
    if (!f.length) list.append(h('p', { class: 'note' }, tl('Brak wyników.'))); };
  q.oninput = () => { st.q = q.value; save(); drawList(); };
  const pc = h('div'); const drawP = () => { pc.innerHTML = ''; pc.append(chips([['', tl('Wszyscy')], ...prods.map(x => [x, x])], st.prod, v => { st.prod = v; save(); drawP(); drawList(); }, 'filter')); }; drawP(); drawList();
  folds.append(fold(`${tl('Baza produktów ({0})', b.length)}`, 'pack',
    h('div', { class: 'alert warn', html: icon('warn', 18) + '<div>' + esc(BUILTIN_SRC) + '</div>' }),
    h('div', { style: 'margin-top:12px' }, h('span', { class: 'inp' }, q)), h('div', { class: 'chips scroll', style: 'margin-top:10px' }, pc), list,
    h('div', { class: 'note' }, tl('Brak produktu na liście: dodaj go przyciskiem „+ Gotowy nawóz” ze statusem „Wymaga uzupełnienia”. Ten sam skład z soli oblicza '), h('a', { href: '#/nawozy/odpowiednik' }, tl('Zrób sam odpowiednik'))))); 
};
function editProduct(p) {
  const isNew = !p || !p.id; p = p ? JSON.parse(JSON.stringify(p)) : { name: '', unit: 'ml', ppm: {}, source: 'user', note: '', status: 'label' };
  const name = inputF(tl('Nazwa'), '', p.name, { type: 'text', max: 60 }), note = inputF(tl('Źródło składu'), '', p.note || '', { type: 'text', max: 120, ph: tl('np. etykieta 2026, strona producenta') });
  const prodSel = h('select', { 'aria-label': tl('Producent') }, h('option', { value: '' }, tl('— producent —')), PRODUCERS.map(x => h('option', { value: x, selected: x === p.producer }, x)));
  const dose = inputF(tl('Zalecane dawkowanie (producent)'), '', p.dose || '', { type: 'text', max: 120, ph: tl('np. 1 ml / 50 l tyg.') });
  const kindSel = h('select', { 'aria-label': tl('Rodzaj nawozu') }, h('option', { value: '' }, tl('— rodzaj —')), FKIND.map(([v, l]) => h('option', { value: v, selected: v === p.kind }, l)));
  const pack = inputF(tl('Opakowanie'), tl('ml / g'), p.pack || '', { ph: tl('np. 500') }), price = inputF(tl('Cena opakowania'), tl('zł'), p.price || '', { ph: tl('do kosztu') });
  const own = h('textarea', { rows: 2, maxlength: 1000, placeholder: '' }); own.value = p.own || '';
  const statSel = h('select', { 'aria-label': tl('Status składu') }, Object.entries(PSTATUS).filter(([k]) => k !== 'recipe').map(([k, v]) => h('option', { value: k, selected: k === (p.status || 'label') }, v[0])));
  let unit = p.unit, mode = 'gl';
  const dens = inputF(tl('Gęstość (dla %)'), 'kg/l', '1,1', { hint: tl('jeśli nie znasz, zostaw 1,1') }), unitBox = h('div'), modeBox = h('div'), rows = {};
  const grid = h('div', { class: 'stack' });
  COMP.forEach(([k, l, forms]) => {
    const f = inputF(l, '', p.ppm[k] ? String(+p.ppm[k].toPrecision(4)).replace('.', DEC) : ''); const s = h('select', { 'aria-label': tl('{0} – forma', l) }, forms.map(([v, t]) => h('option', { value: v }, t)));
    rows[k] = { f, s }; grid.append(h('div', { class: 'grid' }, f.el, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('podany jako')), h('span', { class: 'inp' }, s))));
  });
  const drawUnit = () => { unitBox.innerHTML = ''; unitBox.append(chips([['ml', tl('Płyn (ml)')], ['g', tl('Proszek (g)')]], unit, v => { unit = v; drawUnit(); })); modeBox.innerHTML = ''; modeBox.append(chips(unit === 'ml' ? [['gl', tl('g/l (= mg/ml)')], ['pct', tl('% masowe')]] : [['pct', tl('% masowe')]], unit === 'g' ? 'pct' : mode, v => { mode = v; drawUnit(); })); if (unit === 'g') mode = 'pct'; dens.el.style.display = unit === 'ml' && mode === 'pct' ? '' : 'none'; };
  drawUnit();
  // szybki kalkulator: ile składników da X ml / g
  const qa = inputF(tl('Ilość'), unit, '5'), qv = inputF(tl('w akwarium'), tl('l'), String(tank().V)), qo = h('div');
  const read = () => { const ppm = {}, d = n2(dens.val()) || 1.1; for (const [k] of COMP) { const v = rows[k].f.num(); if (rows[k].f.val() === '' || !(v >= 0)) continue; const conv = (FORM_F[k] || {})[rows[k].s.value] ?? 1; const base = mode === 'pct' ? (unit === 'ml' ? v * d * 10 : v * 10) : v; if (base * conv > 0) ppm[k] = (ppm[k] || 0) + base * conv; } return ppm; };
  const calc = () => { const a = qa.num(), V = qv.num(), ppm = read(); qo.innerHTML = a > 0 && V > 0 && Object.keys(ppm).length ? ('<div class="note">' + tl('{0} mg/l', Object.entries(ppm).map(([k, v]) => `${elLbl(k)} +${gfmt(v * a / V)}`).join(' · ')) + '</div>') : ''; };
  qa.inp.oninput = calc; qv.inp.oninput = calc; grid.addEventListener('input', calc); grid.addEventListener('change', calc);
  const bg = sheet([h('h3', {}, isNew ? tl('Nowy nawóz') : tl('Edytuj nawóz')), h('div', { class: 'stack' }, name.el, h('div', { class: 'grid' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Producent')), h('span', { class: 'inp' }, prodSel)),
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Status składu')), h('span', { class: 'inp' }, statSel))), unitBox, modeBox, dens.el,
    h('div', { class: 'grid' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Rodzaj')), h('span', { class: 'inp' }, kindSel)), pack.el), h('div', { class: 'grid' }, price.el),
    h('div', { class: 'note', style: 'margin:0' }, tl('Tylko wartości z etykiety.')), grid, note.el, dose.el,
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, tl('Moje notatki')), h('span', { class: 'inp' }, own)),
    h('details', { class: 'inner' }, h('summary', {}, tl('Efekt dawki')), h('div', { class: 'grid', style: 'margin-top:10px' }, qa.el, qv.el), qo)),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => {
      if (!name.val()) { toast(tl('Podaj nazwę')); return; }
      for (const [k] of COMP) if (rows[k].f.val() !== '' && !(rows[k].f.num() >= 0)) { toast(tl('Niepoprawna wartość: {0}', k)); return; }
      const ppm = read();
      if (!Object.keys(ppm).length && statSel.value !== 'incomplete') { toast(tl('Wpisz skład albo wybierz status „Wymaga uzupełnienia”')); return; }
      const out = { id: p.id || uid('u'), name: name.val(), unit, ppm, source: p.source === 'recipe' ? 'recipe' : 'user', note: note.val(), producer: prodSel.value, dose: dose.val(), own: own.value, kind: kindSel.value, pack: n2(pack.val()) > 0 ? n2(pack.val()) : '', price: n2(price.val()) > 0 ? n2(price.val()) : '', status: Object.keys(ppm).length ? statSel.value : 'incomplete', ...(p.recipe ? { recipe: p.recipe } : {}), ...(p.rid ? { rid: p.rid } : {}) };
      const i = state.products.findIndex(x => x.id === out.id); if (i >= 0) state.products[i] = out; else state.products.push(out); save(); bg.remove(); render.keepScroll = true; render(); toast(tl('Zapisano nawóz'));
    } }, tl('Zapisz')), !isNew && Object.keys(p.ppm || {}).length ? h('button', { class: 'btn ghost', onclick: () => { (state.inputs.odp ||= {}).pid = p.id; save(); bg.remove(); go('nawozy/odpowiednik'); } }, tl('Zrób odpowiednik')) : null, !isNew ? h('button', { class: 'btn danger', onclick: () => { if (confirm(tl('Usunąć nawóz? Wpisy w dzienniku zostaną.'))) { state.products = state.products.filter(x => x.id !== p.id); save(); bg.remove(); render(); } } }, tl('Usuń')) : null)]);
  calc();
}
// receptura z kalkulatora (stare identyfikatory calc.js) → receptura v4 + nawóz do dziennika
function saveRecipe(defName, grams, bottle) {
  const name = prompt(tl('Nazwa nawozu:'), defName); if (!name) return;
  const map = { KNO3: ['KNO3', 0], K2SO4: ['K2SO4', 0], KCl: ['KCl', 0], KH2PO4: ['KH2PO4', 0], KHCO3: ['KHCO3', 0], K2CO3: ['K2CO3', 0], NH4NO3: ['NH4NO3', 0], MGSO4_7: ['MgSO4', 7], MGSO4: ['MgSO4', 0], MGCL2: ['MgCl2', 6], CASO4: ['CaSO4', 2], CACL2: ['CaCl2', 2], CANO3: ['CaNO32', 4], NAHCO3: ['NaHCO3', 0], NACL: ['NaCl', 0] };
  const items = Object.entries(grams).filter(([id, g]) => map[id] && g > 0).map(([id, g]) => ({ mat: map[id][0], hyd: map[id][1], purity: 100, g: +(+g).toFixed(3) }));
  const r = { id: uid('r'), name: name.slice(0, 60), vol: bottle, items, note: tl('Zapisane z kalkulatora.'), created: todayKey(), updated: todayKey(), pid: null };
  state.recipes.push(r); syncRecipeProduct(r); save(); toast(tl('Zapisano przepis'));
}

/* ---------- INFO / KOPIA / SŁOWNIK ---------- */
function download(name, text, type) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); }
// kopia: na telefonie przez menu „Udostępnij” (Dysk, iCloud, mail), gdzie indziej – pobranie pliku
async function exportJSON() {
  const name = `${tl('dosemytank-kopia-{0}.json', todayKey())}`, text = JSON.stringify(state);
  let file = null; try { file = new File([text], name, { type: 'application/json' }); } catch (e) {}
  if (file && navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: tl('Kopia danych DoseMyTank') }); }
    catch (e) { if (e && e.name === 'AbortError') return; download(name, text, 'application/json'); }
  } else download(name, text, 'application/json');
  markBackup(state, todayKey()); save(); toast(tl('Kopia zapisana')); render.keepScroll = true; render();
}
// czy przeglądarka może sama usunąć dane (np. Safari po tygodniu nieużywania)
async function storageGuard() {
  try { if (!navigator.storage || !navigator.storage.persisted) return null; if (await navigator.storage.persisted()) return true; return navigator.storage.persist ? await navigator.storage.persist() : false; } catch (e) { return null; }
}
function backupBanner() {
  const b = backupStatus(state, todayKey()); if (!b.due) return null;
  const txt = b.since == null ? `${tl('Masz {0} wpisów i jeszcze żadnej kopii.', b.total)}` : `${tl('Ostatnia kopia {0}, od tego czasu {1} {2}.', relDay(state.lastBackup), b.fresh, P.plural(b.fresh, tl('nowy wpis'), tl('nowe wpisy'), tl('nowych wpisów')))}`;
  return h('section', { class: 'card backup' }, h('div', { class: 'alert warn', style: 'margin:0', html: icon('warn', 18) + `<div>${tl('<b>Zrób kopię zapasową.</b><br>{0} Dane są tylko w tej przeglądarce – zmiana telefonu albo wyczyszczenie przeglądarki je usunie.', esc(txt))}</div>` }),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn small', onclick: exportJSON }, tl('Zapisz kopię')),
      h('button', { class: 'btn ghost small', onclick: () => { state.backupSnooze = P.dfrom(P.dnum(todayKey()) + 3); save(); render.keepScroll = true; render(); } }, tl('Później'))));
}
function exportCSV() {
  const dec = v => typeof v === 'number' ? String(v).replace('.', DEC) : '', q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [[tl('data'), tl('typ'), ...FIELD_ORDER, tl('litry'), tl('nawóz'), tl('ilość'), tl('jednostka'), tl('notatka')].join(';')];
  [...EV()].sort((a, b) => a.ts - b.ts).forEach(e => rows.push([e.date, e.type, ...FIELD_ORDER.map(k => dec(e[k])), dec(e.liters), q(e.name || e.label || ''), dec(e.amount), e.unit || '', q(e.note || (e.tags || []).join(', '))].join(';')));
  download(`${tl('dziennik-{0}.csv', tank().name)}`, '﻿' + rows.join('\n'), 'text/csv');
}
function importJSON(ev) {
  const f = ev.target.files[0]; if (!f) return;
  f.text().then(txt => {
    const s = migrate(JSON.parse(txt));
    const n = s.tanks.length, m = Object.values(s.events).reduce((a, x) => a + x.length, 0);
    if (!confirm(`${tl('Plik zawiera {0} zbiorn. i {1} wpisów. Zastąpić nimi obecne dane? Obecne dane zostaną zachowane jako kopia awaryjna w przeglądarce.', n, m)}`)) return;
    try { localStorage.setItem(LS_PREV, JSON.stringify(state)); } catch (e) {}
    state = s; save(); applyTheme(); render(); toast(tl('Wczytano kopię'));
  }).catch(e => toast(tl('Nie udało się wczytać: {0}', e.message || tl('zły plik')), 4000));
  ev.target.value = '';
}
PAGES.info = root => {
  root.append(h('h1', { class: 'page-title' }, tl('Ustawienia')));
  // 8.0: język – nazwy języków zawsze w ich własnym języku; zmiana działa offline (przeładowanie z pamięci podręcznej)
  root.append(card('Language · Język', 'globe', chips([['en', 'English'], ['pl', 'Polski']], LANG, v => setLang(v)), h('div', { class: 'sub', style: 'margin-top:8px' }, tl('Wybór jest zapamiętany w tej przeglądarce. Liczby i daty są wyświetlane w formacie wybranego języka.'))));
  // 7.12: przełącznik trybu PRO tylko w Narzędziach – tam widać, co dodaje; w Ustawieniach niczego nie zmieniał na ekranie
  root.append(card(tl('Wygląd'), 'sun', chips([['auto', tl('Jak system')], ['light', tl('Jasny')], ['dark', tl('Ciemny')]], state.theme, v => { state.theme = v; save(); applyTheme(); render(); })));
  const total = Object.values(state.events).reduce((a, x) => a + x.length, 0);
  const guard = h('div', { class: 'note' }, tl('Sprawdzanie ochrony danych…'));
  storageGuard().then(v => { guard.textContent = v === true ? tl('Przeglądarka nie usunie tych danych sama. Kopia nadal chroni przed zmianą telefonu i wyczyszczeniem przeglądarki.')
    : v === false ? tl('Przeglądarka może sama usunąć te dane, gdy strona długo nie jest używana (Safari: ok. 7 dni). Dodaj aplikację do ekranu głównego i rób kopie.') : tl('Nie da się sprawdzić, czy przeglądarka chroni dane – rób kopie.'); });
  root.append(card(tl('Kopia zapasowa'), 'pack', h('div', { class: 'sub' }, `${tl('Dane są tylko w tej przeglądarce ({0} zbiorn., {1} wpisów). {2}', state.tanks.length, total, state.lastBackup ? tl('Ostatnia kopia: {0}.', relDay(state.lastBackup)) : tl('Nie zrobiono jeszcze kopii.'))}`), guard,
    h('div', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'btn', onclick: exportJSON }, tl('Zapisz kopię')), h('button', { class: 'btn ghost', onclick: () => $('#imp').click() }, tl('Wczytaj kopię')),
      h('button', { class: 'btn ghost', onclick: exportCSV }, tl('Dziennik do Excela (CSV)')), h('input', { id: 'imp', type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: importJSON }))));
  // 8.0: strona aplikacji, o aplikacji, zgłoszenia (GitHub Issues z wypełnionym opisem: wersja, przeglądarka, język – bez danych z akwarium)
  const pl = LANG === 'pl', site = pl ? 'pl/' : '', repo = 'https://github.com/dosemytank/dosemytank.github.io/issues/new';
  const env = `DoseMyTank ${APP_VERSION} · ${LANG} · ${navigator.userAgent} · ${innerWidth}×${innerHeight}${matchMedia('(display-mode: standalone)').matches ? ' · PWA' : ''}`;
  const issue = (label, title, body) => `${repo}?labels=${label}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const linkRow = (href, title, sub) => h('a', { class: 'lrow', style: 'color:inherit;text-decoration:none', href, target: href.startsWith('http') ? '_blank' : null, rel: href.startsWith('http') ? 'noopener' : null },
    h('span', {}, title), sub ? h('small', {}, sub) : null, h('i', { html: icon('chevr', 16) }));
  root.append(h('h2', { class: 'h2' }, tl('Pomoc i kontakt')), h('div', { class: 'lrows' },
    linkRow(issue('bug', tl('Błąd: '), tl('**Co się stało?**\n\n**Czego się spodziewałeś?**\n\n**Kroki**\n1. \n\n**Obliczenie (jeśli dotyczy)** – wklej wynik z przycisku „Kopiuj wynik”\n\n---\n{0}', env)), tl('Zgłoś błąd'), tl('GitHub – wersja i przeglądarka wpiszą się same')),
    // 8.3: mail – bez konta na GitHubie; temat i opis wypełnione, z wersją i przeglądarką
    linkRow(`mailto:dosemytank@gmail.com?subject=${encodeURIComponent('DoseMyTank: ')}&body=${encodeURIComponent(tl('Co się stało (albo czego brakuje)?\n\n\nKroki / szczegóły:\n\n\n---\n{0}', env))}`, tl('Napisz maila'), tl('dosemytank@gmail.com – bez konta na GitHubie')),
    linkRow(issue('enhancement', tl('Pomysł: '), tl('**Co chcesz zrobić?**\n\n**Dlaczego to się przyda?**\n\n---\n{0}', env)), tl('Zaproponuj funkcję albo nawóz do bazy'), ''),
    linkRow(site ? site + 'o-aplikacji.html' : 'about.html', tl('O aplikacji'), tl('Jak liczy, skąd dane o nawozach, prywatność')),
    linkRow(site || './', tl('Strona DoseMyTank'), tl('Opis funkcji, instalacja, pytania')),
    // 8.1: wsparcie projektu (Ko-fi) – link zewnętrzny
    linkRow('https://ko-fi.com/dosemytank', tl('Postaw kawę na Ko-fi'), tl('Aplikacja jest darmowa, bez reklam. Kawa pomaga w rozwoju.'))));
  root.append(h('section', { class: 'card prose' }, h('h2', {}, ico('info', 18), tl('Założenia')), h('ul', { style: 'padding-left:18px;margin:0' },
    h('li', {}, tl('Obliczenia są dokładne dla wpisanych danych. Wynik w akwarium zależy od czystości i formy soli, składu z etykiety, dokładności wagi i testów.')),
    h('li', {}, tl('1 mg/l = 1 ppm (woda słodka); koncentraty w g/l.')),
    h('li', {}, tl('Masy molowe z mas atomowych IUPAC 2021, osobno dla każdej formy uwodnienia.')),
    h('li', {}, tl('Baza produktów: skład ze stron producentów i etykiet (oznaczony źródłem); pozostałe pozycje orientacyjne.')),
    h('li', {}, tl('Wolny NH₃: Emerson i in. (1975). CO₂ = 3·KH·10^(7−pH).')),
    h('li', {}, tl('H₃PO₄: drugi proton wg pKa₂ = 7,21.')),
    h('li', {}, tl('Narastanie przy podmianach: c = (dawka + p·c_woda) / p – rzetelne dla soli, których rośliny nie pobierają (Na, Cl, SO₄, twardość). Aplikacja nie szacuje poboru przez rośliny – stan NO₃, PO₄, K i Fe pokazuje tylko test.')))));
  root.append(h('div', { class: 'note', style: 'text-align:center' }, tl('DoseMyTank {0} · dane w wersji {1} · {2} {3}, {4} własnych soli', APP_VERSION, SCHEMA, state.recipes.length, P.plural(state.recipes.length, tl('przepis'), tl('przepisy'), tl('przepisów')), state.salts.length)));
};
const GLOSS = [
  [tl('Podmiana wody'), tl('Wymiana części wody w akwarium na świeżą, uzdatnioną. Zwykle raz w tygodniu 20–50%. Usuwa nadmiar azotanów i innych substancji.')],
  ['pH', tl('Kwasowość wody. 7 to woda obojętna. Właściwy zakres zależy od gatunków – ważne, żeby nie skakało gwałtownie.')],
  [tl('KH (twardość węglanowa)'), tl('„Bufor”, który chroni pH przed nagłymi zmianami. Mierzy się w °dH. W zbiornikach z CO₂ przy bardzo niskim KH pH może nagle spaść. Wyjątek: krewetki Caridina na aktywnym podłożu żyją przy KH ≈ 0.')],
  [tl('GH (twardość ogólna)'), tl('Ile w wodzie jest wapnia i magnezu – roślinom i zwierzętom są potrzebne. Mierzy się w °dH.')],
  ['°dH', tl('Stopień niemiecki – jednostka twardości wody. 1°dH to ok. 17,8 mg/l CaCO₃.')],
  [tl('NO₃ (azotany)'), tl('Główne źródło azotu dla roślin; powstają też z odchodów ryb. Za mało – rośliny słabo rosną, za dużo – glony i stres zwierząt.')],
  [tl('PO₄ (fosforany)'), tl('Rośliny potrzebują ich niewiele. Ich nadmiar przy słabym wzroście roślin sprzyja glonom.')],
  [tl('Amon / amoniak'), tl('NH₄⁺ (amon) jest mało szkodliwy, NH₃ (wolny amoniak) jest trujący. Im wyższe pH i temperatura, tym więcej NH₃ – dlatego ten sam wynik testu może być groźny lub nie.')],
  [tl('Azotyny (NO₂)'), tl('Trujący produkt pośredni rozkładu. W dojrzałym akwarium ≈ 0.')],
  [tl('Makro i mikro'), tl('Nawozy makro: azot, fosfor, potas, magnez. Mikro: żelazo i drobne ilości metali.')],
  ['CO₂', tl('Gaz, z którego rośliny budują ciało. W akwariach z butlą zwykle 20–35 mg/l. Za dużo szkodzi rybom.')],
  [tl('ppm = mg/l'), tl('To samo: miligramy substancji w jednym litrze wody.')],
  [tl('Woda RO'), tl('Woda po odwróconej osmozie – prawie bez soli. Przed podmianą miesza się ją z kranówką albo mineralizuje solami, żeby miała zadane GH i KH.')],
  [tl('Chelat'), tl('Postać żelaza i innych metali, dzięki której nie wytrącają się w wodzie (np. Fe-DTPA).')],
];
PAGES.slownik = root => { root.append(h('h1', { class: 'page-title' }, tl('Słowniczek')), h('section', { class: 'card' }, h('dl', { class: 'gl', style: 'margin:0', html: GLOSS.map(([t, d], i) => `<dt${i ? '' : ' style="margin-top:0"'}>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('') }))); };

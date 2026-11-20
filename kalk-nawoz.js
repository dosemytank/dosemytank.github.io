if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator nawozów z soli („Przygotuj nawóz”, dawniej „Zrób nawóz”): prosty ekran dla początkujących =====
   Cztery kroki: akwarium → ile dawać (plan) → z czego (sole, na start gotowy zestaw) → jak dawkujesz. Obok osobny panel „Twój przepis” z listą zakupów.
   7.11: krok 3 to wybór soli do przepisu, nie magazyn. Co użytkownik już ma, zaznacza na liście zakupów (zakupy.js) – na wynik to nie wpływa.
   Obliczenia: LICZ.kreator i LICZ.mineralizacja (nawozy-licz.js). Własne cele sól po soli – Zaawansowane → Makro / Mikro. */
// 7.15: światło opisane roślinami i lumenami na litr – bez przykładów lamp, bo „dwie świetlówki” to co innego przy 60 l i przy 1000 l.
// Podpowiedź przelicza próg na objętość akwarium (knLightHint), przelicza się przy zmianie objętości.
const KN_LIGHT = [
  { v: 'low', title: tl('Słabe'), desc: tl('Rosną głównie rośliny wolne i cieniolubne: anubiasy, paprocie, mchy, kryptokoryny.'), lm: [0, 20] },
  { v: 'mid', title: tl('Średnie'), desc: tl('Większość roślin łodygowych rośnie w umiarkowanym tempie, także bez CO₂.'), lm: [20, 40] },
  { v: 'high', title: tl('Mocne'), desc: tl('Rośliny czerwone i okrywowe. Szybki wzrost wymaga CO₂ i regularnego nawożenia.'), lm: [40, null] }];
const knLm = x => x >= 1000 ? `${tl('{0} tys.', fnum(x / 1000, x % 1000 ? 1 : 0))}` : fnum(x, 0);
function knLightHint(o, V) {
  const [a, b] = o.lm, perL = !a ? `${tl('do {0} lm na litr', b)}` : b ? `${tl('{0}–{1} lm na litr', a, b)}` : `${tl('ponad {0} lm na litr', a)}`;
  if (!(V > 0)) return perL;
  const rng = (x, y) => y >= 1000 ? `${tl('{0}–{1} tys.', fnum(x / 1000, 1), fnum(y / 1000, 1))}` : `${fnum(x, 0)}–${fnum(y, 0)}`;
  return `${tl('{0} · przy {1} l: {2} lm', perL, fnum(V, 0), !a ? tl('do {0}', knLm(b * V)) : b ? rng(a * V, b * V) : tl('ponad {0}', knLm(a * V)))}`;
}
const KN_WATER = [ // od 7.10 nieużywane w „Zrób nawóz” – mineralizacja ma własne narzędzie
  { v: 'tap', title: tl('Kranówka'), desc: tl('Podmieniasz wodą z kranu, ewentualnie odstaną albo uzdatnioną.') },
  { v: 'ro', title: tl('Woda RO'), desc: tl('Woda z osmozy albo demineralizowana. Trzeba ją zmineralizować.') },
  { v: 'mix', title: tl('RO z kranówką'), desc: tl('Mieszasz osmozę z kranówką, żeby zmiękczyć wodę.') }];
const KN_PLAN = [
  { v: 'less', title: tl('Oszczędnie'), desc: tl('Mało roślin albo gatunki wolno rosnące. Także wtedy, gdy po nawożeniu pojawiają się glony.') },
  { v: 'rec', title: tl('Zalecane'), desc: tl('Typowa dawka przy Twoim świetle. Od niej zacznij i koryguj po testach.') },
  { v: 'more', title: tl('Więcej'), desc: tl('Gęsto obsadzone akwarium z szybko rosnącymi roślinami, w którym testy NO₃ i PO₄ pokazują zero.') },
  { v: 'ei', title: tl('Z zapasem (EI)'), desc: tl('Celowy nadmiar, żeby żaden składnik nie ograniczał wzrostu. Tylko przy mocnym świetle z CO₂ i podmianie ok. 50% wody co tydzień.') },
  { v: 'own', title: tl('Własne'), desc: tl('Własne wartości w mg/l na tydzień.') }];
const KN_N = [[1, tl('raz')], [3, tl('3 razy')], [7, tl('codziennie')]];
// sole w szafce: [kod domyślny, nazwa potoczna]; forma uwodnienia wybierana z listy przy soli
// najpierw to, co jest w każdym sklepie ogrodniczym; w „Inne sole” – rzadziej spotykane
const KN_MACRO = [['KNO3|0', tl('saletra potasowa')], ['KH2PO4|0', tl('fosforan monopotasowy (MKP)')], ['K2SO4|0', tl('siarczan potasu')], ['MgSO4|7', tl('siarczan magnezu, sól gorzka')],
  ['CaNO32|4', tl('saletra wapniowa')], ['MgNO32|6', tl('saletra magnezowa')], ['KCl|0', tl('chlorek potasu, sól potasowa')], ['NH4NO3|0', tl('saletra amonowa')], ['NH4H2PO4|0', tl('fosforan monoamonowy (MAP)')]];
const KN_MORE = [['K2HPO4|0', tl('fosforan dipotasowy')], ['NaH2PO4|2', tl('fosforan jednosodowy')], ['MgCl2|6', tl('chlorek magnezu')], ['NaNO3|0', tl('saletra sodowa (chilijska)')]];
const KN_MIN = [['CaSO4|2', tl('gips – wapń')], ['CaCl2|2', tl('chlorek wapnia')], ['KHCO3|0', tl('wodorowęglan potasu – KH')], ['NaHCO3|0', tl('soda oczyszczona – KH')]];
const KN_FE = [['FeDTPA|0', tl('chelat żelaza')], ['FeEDTA|0', tl('chelat żelaza')], ['FeEDDHA|0', tl('chelat żelaza')], ['FeSO4|7', tl('siarczan żelaza z EDTA')]];
const KN_LEVEL = { low: tl('słabego światła bez CO₂'), mid: tl('średnich warunków'), high: tl('mocnego światła z CO₂') };
const KN_HARD = { plant_lo: [6, 3], plant_mid: [6, 3], plant_hi: [6, 3], shrimp_neo: [8, 4], shrimp_cari: [5, 0], fish: [8, 5] };
// zestaw na start – najprostsze sole dostępne w sklepie ogrodniczym; z nim przepis liczy się od razu, bez wybierania
const KN_HAVE_DEF = ['KNO3|0', 'KH2PO4|0', 'K2SO4|0', 'MgSO4|7', 'CaSO4|2', 'KHCO3|0'];
const knAmt = r => r.amount + (/\sml$/.test(r.amount) ? '' : ' g');
const knIons = t => ['NO3', 'PO4', 'K', 'Mg', 'Fe'].map(k => `${ionL(k)} ${gfmt(t[k])}`).join(' · ');
function knDefaults(t) {
  const lv = { plant_lo: ['low', false], plant_mid: ['mid', false], plant_hi: ['high', true] }[t.type] || ['low', false], hd = KN_HARD[t.type] || [6, 3];
  return { light: lv[0], co2: lv[1], n: 3, plan: 'rec', manual: {}, how: 'bottle', bottle: '500', dose: '', water: ['ro', 'mix'].includes(t.water) ? t.water : 'tap',
    GH: String(hd[0]), KH: String(hd[1]), have: [...KN_HAVE_DEF], micro: 'p:b26', pct: {} };
}
// przepis z ustawień „Nawóz” – jedno miejsce wywołania LICZ.kreator (ekran Nawóz i nawóz w Mineralizacji wody)
function knRun(s, V) {
  const have = [...s.have, s.micro, ...(splitV(s.micro).id === 'FeSO4' ? ['Na2EDTA|2'] : [])];
  return LICZ.kreator({ V, light: s.light, co2: !!s.co2, change: (n2(s.change) || 0) / 100, n: +s.n || 3, plan: s.plan, manual: s.manual || {}, have, pct: s.pct || {},
    how: s.how, bottle: n2(s.bottle) || 500, dose: n2(s.dose) || 0, custom: state.salts, prodOf: productById, shrimp: !!P.PROFILES[tank().type].shrimp });
}
// kafelek w szafce: pole wyboru, wzór i nazwa; dla soli z kilkoma formami – lista form z pełnym wzorem
function knTile(s, [code, nick], redraw) {
const has = c => s.have.some(x => x.split('|')[0] === c.split('|')[0]), cur = c => s.have.find(x => x.split('|')[0] === c.split('|')[0]) || c;
  const id = code.split('|')[0], m = matOf(id); if (!m) return null;
  const on = has(code), val = cur(code), hyd = splitV(val).hyd, multi = !m.pct && m.hyd && m.hyd.length > 1;
  const chk = h('input', { type: 'checkbox', checked: on, 'aria-label': X.formulaOf(m, hyd) + ' – ' + nick });
  chk.onchange = () => { s.have = s.have.filter(x => x.split('|')[0] !== id); if (chk.checked) s.have.push(val); save(); redraw(); };
  // 7.15: forma uwodnienia jako widoczny przełącznik z pytaniem (wcześniej lista rozwijana wyglądała jak zwykły tekst); przy niezaznaczonej soli znacznik „N formy”
  let formSel = null;
  if (multi && on) { const pick = v => { s.have = s.have.filter(x => x.split('|')[0] !== id); s.have.push(v); save(); redraw(); };
    // 7.16: jeden wiersz – krótkie etykiety (bezwodny, ·2H₂O…), pełna nazwa w podpowiedzi
    formSel = h('div', { class: 'kn-forms' }, h('span', { class: 'kn-forms-q' }, tl('Forma z opakowania:')),
      h('div', { class: 'kn-hyd', role: 'radiogroup', 'aria-label': tl('Forma {0}', m.name) }, m.hyd.map(hh => { const v = id + '|' + hh, sel = val === v;
        return h('button', { type: 'button', role: 'radio', 'aria-checked': String(sel), class: sel ? 'on' : '', 'data-v': v, title: HYDW[hh] || tl('{0}-wodny', hh), onclick: () => pick(v) }, hh ? X.hydLabel(hh) : tl('bezwodny')); }))); }
  return h('div', { class: 'kn-tile' + (on ? ' on' : '') + (formSel ? ' wide' : '') }, h('label', { class: 'kn-chk' }, chk, h('span', {}, h('b', {}, X.formulaOf(m, multi ? hyd : 0)), h('small', {}, nick), multi && !on ? h('i', { class: 'kn-badge' }, m.hyd.length < 5 ? tl('{0} formy', m.hyd.length) : tl('{0} form', m.hyd.length)) : null)),
    formSel);
}

// karty wyboru (jedna z kilku): [{ v, title, desc, hint, sub }]
function knCards(opts, cur, set, label, cls = '') {
  return h('div', { class: 'kn-cards ' + cls, role: 'radiogroup', 'aria-label': label }, opts.map(o => h('button', { type: 'button', role: 'radio', 'aria-checked': String(o.v === cur), class: 'kn-card' + (o.v === cur ? ' on' : ''), onclick: () => set(o.v) },
    h('b', {}, o.title), o.sub ? h('span', { class: 'kn-card-sub' }, o.sub) : null, o.desc ? h('span', {}, o.desc) : null, o.hint ? h('small', {}, o.hint) : null)));
}

let KN_TAB = 'p'; // zakładka wyniku „Zrób nawóz” – pamiętana do przeładowania strony
KX.nawoz = root => {
  const g = kxState(), t = tank(); g.nawoz ||= knDefaults(t); const s = g.nawoz; s.manual ||= {}; s.pct ||= {}; s.have ||= [];
  if (s.micro === undefined) { s.micro = s.have.find(x => x.startsWith('p:')) || KN_FE.map(c => c[0]).find(c => s.have.some(x => x.split('|')[0] === c.split('|')[0])) || 'p:b26'; s.have = s.have.filter(x => !x.startsWith('p:')); }
  if (g.useMicro) { s.micro = g.useMicro; delete g.useMicro; save(); } // z Gotowych nawozów albo Przepisów
  if (!s.plan) s.plan = Object.values(s.manual).some(v => v !== '' && v != null) ? 'own' : 'rec';
  if (s.water === undefined) Object.assign(s, { water: ['ro', 'mix'].includes(t.water) ? t.water : 'tap', GH: String((KN_HARD[t.type] || [6, 3])[0]), KH: String((KN_HARD[t.type] || [6, 3])[1]) });
  if (s._tc !== t.id) { s._tc = t.id; s.change = String(t.change ?? 30); }
  root.append(knSwitch('nawoz'));
  // 7.16: przy pierwszym wejściu – propozycja ustawienia akwarium (3 pytania); kalkulator działa i bez tego, na wartościach domyślnych
  if (!t.setup && !state.inputs.setupHide) root.append(h('div', { class: 'tip setup-tip' }, h('span', {}, h('b', {}, tl('Pierwszy raz? ')), `${tl('Liczysz dla domyślnego akwarium {0} l. Odpowiedz na 3 pytania o swoje akwarium, a objętość, podmiana, światło i CO₂ podstawią się same.', fnum(t.V, 0))}`),
    h('span', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'btn small', type: 'button', onclick: () => openSetup(() => { render.keepScroll = true; render(); }) }, tl('Ustaw akwarium')),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { state.inputs.setupHide = true; save(); render.keepScroll = true; render(); } }, tl('Licz bez tego')))));
  const { form, out } = kxLayout(root); out.classList.add('kn-result');
  const tk = kxTank(s, () => update());
  const step = (n, title, body) => h('section', { class: 'kn-step' }, h('h2', { class: 'kn-h' }, h('span', { class: 'kn-n' }, String(n)), title), body);
  const set = (k, v) => { s[k] = v; save(); redraw(); };
  const box1 = h('div', { class: 'kn-body' }), box2 = h('div', { class: 'kn-body' }), box3 = h('div', { class: 'kn-body' }), box4 = h('div', { class: 'kn-body' });
  const has = code => s.have.some(x => x.split('|')[0] === code.split('|')[0]);
  const cur = code => s.have.find(x => x.split('|')[0] === code.split('|')[0]) || code;
  const tile = x => knTile(s, x, redraw);
  function redraw() {
    const lv = LICZ.poziom(s.light, s.co2);
    // 1. akwarium
    box1.innerHTML = ''; box1.append(tk.el,
      h('div', { class: 'kn-q' }, h('span', { class: 'kn-lbl' }, tl('Światło')), knCards(KN_LIGHT.map(o => ({ ...o, hint: knLightHint(o, tk.V()) })), s.light, v => set('light', v), tl('Światło'), 'list'),
        h('p', { class: 'kx-hint' }, tl('Lumeny podaje producent lampy na opakowaniu albo w opisie. Świetlówka T5 daje ok. 80 lm na wat (np. 54 W to ok. 4450 lm). W zbiorniku głębszym niż ok. 60 cm do dna dociera mniej światła – wybierz poziom niżej.'))),
      h('div', { class: 'kn-q' }, h('span', { class: 'kn-lbl' }, tl('Dozowanie CO₂')), kxChoice([[false, tl('nie')], [true, tl('tak')]], !!s.co2, v => set('co2', v), tl('Dozowanie CO₂'))),
      h('div', { class: 'kn-row2' }, kxNum(s, 'change', tl('Podmiana co tydzień'), '%', { ph: '30', onInput: () => update(), check: x => x > 100 ? tl('Najwyżej 100%') : '' }).el,
        h('div', { class: 'kn-q' }, h('span', { class: 'kn-lbl' }, tl('Dawki w tygodniu')), kxChoice(KN_N, +s.n || 3, v => set('n', v), tl('Ile razy w tygodniu')))));
    box1.append(h('p', { class: 'kx-hint' }, tl('Podmiany wodą RO: ilość soli do wody oblicza '), h('a', { href: '#/kalkulator/mineral' }, tl('Mineralizacja wody')), '.'));
    // 2. ile dawać
    box2.innerHTML = '';
    box2.append(h('p', { class: 'kx-hint' }, `${tl('Wartości to przyrost stężenia w akwarium w mg/l na tydzień, dla {0}.', KN_LEVEL[lv])}`),
      knCards(KN_PLAN.map(o => ({ ...o, sub: o.v === 'own' ? null : knIons(LICZ.celePlanu(lv, o.v)) })), s.plan, v => set('plan', v), tl('Ile dawać'), 'plans'));
    if (s.plan === 'own') { const R0 = LICZ.celePlanu(lv, 'rec');
      box2.append(h('div', { class: 'grid3 kn-own' }, ['NO3', 'PO4', 'K', 'Mg', 'Fe'].map(k => kxNum(s.manual, k, ionL(k), tl('mg/l'), { ph: gfmt(R0[k]), onInput: () => update() }).el)),
        h('p', { class: 'kx-hint' }, tl('Puste pole – przyjmowana jest wartość zalecana.'))); }
    if (s.plan === 'ei') box2.append(h('div', { class: 'kx-msg ' + (LICZ.poziom(s.light, !!s.co2) === 'high' ? 'info' : 'warn') }, tl('{0}EI zakłada podmianę ok. 50% wody co tydzień. Przy mniejszych podmianach składniki będą się zbierać.', LICZ.poziom(s.light, !!s.co2) === 'high' ? '' : tl('EI jest pomyślane dla mocnego światła z CO₂. Przy Twoim świetle rośliny nie zużyją tyle, a nadmiar posłuży glonom – wybierz raczej Zalecane albo Więcej. '))));
    // 3. z czego (wybór soli do przepisu; na start zestaw domyślny)
    box3.innerHTML = '';
    const mixes = kxMicroProds(), microSel = h('select', { 'aria-label': tl('Mikro i żelazo') },
      mixes.length ? h('optgroup', { label: tl('Gotowe mieszanki') }, mixes.map(p => h('option', { value: 'p:' + p.id, selected: s.micro === 'p:' + p.id }, p.name))) : null,
      h('optgroup', { label: tl('Chelaty i sole') }, KN_FE.map(([c, nick]) => { const m = matOf(c.split('|')[0]); return h('option', { value: c, selected: s.micro === c }, (m.pct ? m.f || m.name : X.formulaOf(m, splitV(c).hyd)) + ' – ' + nick); })));
    microSel.onchange = () => set('micro', microSel.value);
    const chel = !String(s.micro).startsWith('p:') && matOf(splitV(s.micro).id), pctF = chel && chel.pct ? kxNum(s.pct, splitV(s.micro).id, `${tl('Ile {0} ma ten produkt (z etykiety)', ionL(Object.keys(chel.pct)[0]))}`, '%', { ph: fnum(Object.values(chel.pct)[0], 1), onInput: () => update() }).el : null;
    box3.append(h('p', { class: 'kx-hint' }, tl('Domyślnie zaznaczony jest podstawowy zestaw soli dostępnych w sklepach ogrodniczych – można go zostawić. Zaznacz inne sole, jeśli masz je do dyspozycji; przepis przeliczy się sam. Lista potrzebnych zakupów jest pod wynikiem.')),
      h('div', { class: 'kn-grp' }, h('h3', { class: 'kn-grp-h' }, h('span', { class: 'kn-tag' }, 'A'), tl('Makro'), h('small', {}, tl('azot, fosfor, potas, magnez – butelka A'))),
        h('div', { class: 'kn-tiles' }, KN_MACRO.map(tile)),
        h('details', { class: 'kx-adv', open: KN_MORE.some(c => has(c[0])) }, h('summary', {}, tl('Więcej soli makro')), h('div', { class: 'kn-tiles' }, KN_MORE.map(tile)))),
      h('div', { class: 'kn-grp' }, h('h3', { class: 'kn-grp-h' }, h('span', { class: 'kn-tag' }, 'B'), tl('Mikro i żelazo'), h('small', {}, tl('żelazo, mangan, cynk, bor i inne – butelka B'))),
      h('div', { class: 'kn-q' }, selField(tl('Źródło mikro'), microSel), pctF, splitV(s.micro).id === 'FeSO4' ? h('p', { class: 'kx-hint' }, tl('Siarczan żelaza bez chelatu szybko się wytrąca – do przepisu dodawane jest EDTA.')) : null)));
    // 4. dawkowanie
    box4.innerHTML = '';
    box4.append(kxChoice([['bottle', tl('Z butelki')], ['dry', tl('Na sucho')]], s.how || 'bottle', v => set('how', v), tl('Jak dawkujesz')),
      s.how === 'dry' ? h('p', { class: 'kx-hint' }, tl('Sole wsypujesz prosto do akwarium. Wygodne przy dużych zbiornikach, przy małych porcje są trudne do odważenia.'))
        : h('div', { class: 'grid' }, kxNum(s, 'bottle', tl('Butelka'), 'ml', { ph: '500', onInput: () => update(), check: x => x > 0 && (x < 50 || x > 5000) ? tl('Butelka 50–5000 ml') : '' }).el, kxNum(s, 'dose', tl('Dawka'), 'ml', { ph: 'auto', onInput: () => update(), check: x => x > 0 && x > (n2(s.bottle) || 500) / 4 ? tl('Za duża jak na butelkę – to cała ćwiartka. Sprawdź, czy to ml.') : '' }).el));
    update();
  }
  form.append(step(1, tl('Twoje akwarium'), box1), step(2, tl('Dawka tygodniowa'), box2), step(3, tl('Sole do nawozu'), box3), step(4, tl('Jak dawkujesz'), box4));

  function update() {
    out.innerHTML = '';
    box1.querySelectorAll(`[aria-label="${tl('Światło')}"] .kn-card small`).forEach((el, i) => { if (KN_LIGHT[i]) el.textContent = knLightHint(KN_LIGHT[i], tk.V()); });
    const V = tk.V(), n = +s.n || 3, planT = (t0 => t0 ? t0[0].toLowerCase() + t0.slice(1) : '')(KN_PLAN.find(x => x.v === s.plan)?.title), freq = KN_N.find(x => x[0] === n)?.[1] || tl('{0} razy', n), freqW = n === 7 ? tl('codziennie') : tl('{0} w tygodniu', freq);
    // 7.13: nagłówek wyniku – na wierzchu dawka (najważniejsza liczba), pod nią akwarium i plan
    const hd = h('div', { class: 'kn-result-h' }, h('h2', {}, tl('Twój przepis'))), subL = `${tl('{0} l · {1} · {2} {3} w tygodniu', fnum(V || 0, 0), planT, n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`;
    out.append(hd);
    if (!(V > 0)) { hd.append(h('p', {}, subL)); out.append(h('p', { class: 'kx-empty' }, tl('Wpisz, ile wody jest w akwarium.'))); return; }
    const R = knRun(s, V);
    const A = R.A && !R.A.empty ? R.A : null, B = R.B && !R.B.empty ? R.B : null, dry = R.how === 'dry';
    if (R.missing.length) out.append(h('div', { class: 'kx-msg warn' }, R.tips[0]));
    if (!A && !B) { hd.append(h('p', {}, subL)); out.append(h('p', { class: 'kx-empty' }, tl('Wybierz w kroku 3, z czego zrobić nawóz.'))); return; }
    const row = i => ({ name: i.prod ? i.prod.name : itName(i), amount: i.prod ? gfmt(i.a) + (i.prod.unit === 'g' ? '' : ' ml') : gfmt(i.g) + (i.fert && i.fert.unit !== 'g' ? ' ml' : '') });
    const tbl = list => h('table', { class: 'kx-t kn-t' }, h('tbody', {}, list.map(r => h('tr', {}, h('th', { scope: 'row' }, r.name), h('td', { class: 'num strong' }, knAmt(r))))));
    const bad = !dry && A && A.fx && A.fx.level === 'over', head = h('div', { class: 'kn-anchor' });
    // butelki do zrobienia: makro (czasem w kilku częściach, gdy sole by się wytrąciły) i mikro; gotowe nawozy jako pozycje { fert }
    const toIt = i => i.prod ? { fert: fertSnap(i.prod), g: i.a } : i, bottles = [];
    if (!dry && !bad && A) (A.split ? A.split.bottles.map(b0 => b0.items) : [[...A.items, ...A.prodItems.map(toIt)]]).forEach((list, i, all) => bottles.push({ kind: 'macro', title: tl('Makro{0}', all.length > 1 ? ' ' + (i + 1) : ''), list }));
    if (!dry && B) bottles.push({ kind: 'micro', title: tl('Mikro i żelazo'), list: [...B.items, ...B.prodItems.map(toIt)] });
    bottles.forEach((b0, i) => { b0.tag = 'ABCD'[i]; });
    if (dry) hd.append(h('p', { class: 'kn-big' }, h('b', {}, n === 7 ? tl('codziennie') : freq), h('span', {}, n === 7 ? tl('na sucho') : tl('w tygodniu, na sucho'))), h('p', {}, `${tl('{0} l · {1}', fnum(V, 0), planT)}`));
    else if (bad) hd.append(h('p', {}, subL));
    else hd.append(h('p', { class: 'kn-big' }, h('b', {}, `${gfmt(R.dose)} ml`), h('span', {}, `${bottles.length > 1 ? tl('z każdej butelki, ') : ''}${freqW}`)),
      h('p', {}, `${tl('{0} l · {1} · butelka {2} ml starczy na ok. {3} tyg.', fnum(V, 0), planT, fnum(R.bottle, 0), fnum(R.bottle / (R.dose * n), 0))}`));
    out.append(head);
    // 7.13: zakładki wyniku – przepis, zakupy, co to da; bez przewijania czterech długich bloków
    const P = { p: h('div', { class: 'kn-panel', role: 'tabpanel', id: 'knp-p', 'aria-label': tl('Przepis') }), z: h('div', { class: 'kn-panel', role: 'tabpanel', id: 'knp-z', 'aria-label': tl('Składniki') }), e: h('div', { class: 'kn-panel', role: 'tabpanel', id: 'knp-e', 'aria-label': tl('Efekt') }) };
    const tabs = h('div', { class: 'kn-tabs', role: 'tablist', 'aria-label': tl('Wynik') }), showTab = k => { KN_TAB = k; Object.entries(P).forEach(([x, el]) => { el.hidden = x !== k; }); [...tabs.children].forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }); };
    [['p', tl('Przepis')], ['z', tl('Składniki')], ['e', tl('Efekt')]].forEach(([k, t0]) => tabs.append(h('button', { type: 'button', role: 'tab', 'data-k': k, 'aria-controls': 'knp-' + k, onclick: () => showTab(k) }, t0)));
    out.append(tabs, P.p, P.z, P.e);
    if (!dry) {
      if (bad) P.p.append(h('div', { class: 'kx-msg bad', role: 'alert' }, `${tl('Przy tej butelce i dawce sole się nie rozpuszczą. Zostaw pole „Dawka” puste (dawka zostanie dobrana automatycznie) albo wpisz większą (np. {0} ml).', fnum(X.roundUp(R.dose * A.fx.factor, 1), 0))}`));
      for (const b0 of bottles) {
        const c = X.solution(b0.list, R.bottle, state.salts).conc, ks = ['NO3', 'PO4', 'K', 'Mg', 'Fe', 'Mn'].filter(k => c[k] > 0), k1 = ['NO3', 'PO4', 'Fe', 'K', 'Mg'].find(k => c[k] > 0);
        P.p.append(h('div', { class: 'kn-bottle' }, h('h3', {}, h('span', { class: 'kn-tag' }, b0.tag), `${tl('{0} · butelka {1} ml', b0.title, fnum(R.bottle, 0))}`), tbl(b0.list.map(row)),
          h('p', { class: 'kx-note' }, b0.kind === 'micro' ? `${tl('Rozpuść w wodzie RO albo destylowanej{0} i dopełnij do {1} ml.', b0.list.some(i => /EDTA/.test(i.mat || '')) ? tl(', zaczynając od EDTA,') : '', fnum(R.bottle, 0))}` : `${tl('Rozpuść w ciepłej wodzie i dopełnij do {0} ml.', fnum(R.bottle, 0))}`),
          ks.length ? h('p', { class: 'kn-conc' }, `${tl('W 1 ml: {0} mg.', ks.map(k => `${ionL(k)} ${gfmt(c[k])}`).join(' · '))}` + (k1 ? (st => ` ${tl('{0} ml podnosi {1} o {2} mg/l w {3} l.', gfmt(st * V / c[k1]), ionL(k1), fnum(st, 1), fnum(V, 0))}`)(k1 === 'Fe' ? 0.1 : 1) : '')) : null));
      }
      if (A && A.split && !bad) { const why = [...new Set(A.split.issues.map(x => x.osad).filter(Boolean))]; P.p.append(h('p', { class: 'kx-hint' }, `${tl('Makro idzie do {0} butelek{1}. Każdą rozpuszczaj osobno.', A.split.bottles.length, why.length ? `${tl(', bo w jednej wypadłby {0}', kxAnd(why))}` : '')}`)); }
      if (!bad) P.z.append(kxShopCard({ title: tl('Składniki nawozu'), name: `${tl('Nawóz – {0}', tank().name)}`, items: bottles.flatMap(b0 => b0.list), note: bottles.length > 1 ? `${tl('Ilości na {0} butelki po {1} ml.', bottles.length, fnum(R.bottle, 0))}` : `${tl('Ilości na butelkę {0} ml.', fnum(R.bottle, 0))}` }));
    } else {
      P.p.append(h('div', { class: 'kn-bottle' }, h('h3', {}, `${tl('Przy każdej dawce wsyp do akwarium')}`), tbl([...(A ? [...A.items, ...A.prodItems] : []), ...(B ? [...B.items, ...B.prodItems] : [])].map(row))),
        h('p', { class: 'kx-note' }, tl('Sole rozsyp w miejscu z dobrym przepływem.')));
      const tiny = [...(A ? A.items : []), ...(B ? B.items : []), ...(B ? B.prodItems.filter(i => i.prod.unit === 'g').map(i => ({ ...i, g: i.a })) : [])].filter(i => i.g < 0.05);
      if (tiny.length) P.p.append(h('div', { class: 'kx-msg info' }, `${tl('{0}: to za mało, żeby odważyć zwykłą wagą. Mikro wygodniej dawkować z butelki.', tiny.map(i => i.prod ? i.prod.name : itName(i)).join(', '))}`));
      P.z.append(kxShopCard({ title: tl('Składniki nawozu'), name: `${tl('Nawóz na sucho – {0}', tank().name)}`, items: [...(A ? [...A.items, ...A.prodItems] : []), ...(B ? [...B.items, ...B.prodItems] : [])].map(i => ({ ...toIt(i), g: (i.prod ? i.a : i.g) * n * 4 })), note: tl('Ilości na 4 tygodnie dawkowania.') }));
    }
    for (const X0 of [A, B]) if (X0 && X0.prodItems) for (const { prod } of X0.prodItems) LICZ.nNotes(prod).forEach(t0 => P.p.append(h('p', { class: 'kx-hint' }, `${prod.name}: ${t0}`)));
    // co to da w akwarium
    const ST = { ok: tl('zgodnie z planem'), low: tl('mniej niż w planie'), high: tl('więcej niż w planie') };
    P.e.append(h('h3', { class: 'kn-title' }, tl('Przewidywana zmiana stężenia')),
      h('table', { class: 'kx-t kn-eff' }, h('thead', {}, h('tr', {}, [tl('Składnik'), tl('Dodasz w tygodniu'), tl('Cel planu')].map(x => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, R.effect.map(e => h('tr', { class: 'st-' + e.st, title: ST[e.st] || '' }, h('th', { scope: 'row' }, h('i', { class: 'kn-dot', 'aria-hidden': 'true' }), ionL(e.k)),
          h('td', { class: 'num strong' }, h('span', { class: 'kn-v' }, '+' + gfmt(e.week)), h('small', {}, tl(' mg/l')), h('span', { class: 'sr-only' }, ' – ' + (ST[e.st] || ''))), h('td', { class: 'num' }, e.target > 0 ? gfmt(e.target) : '–', e.target > 0 ? h('small', {}, tl(' mg/l')) : null))))),
      h('p', { class: 'kn-legend' }, h('span', { class: 'st-ok' }, h('i', { class: 'kn-dot' }), tl('zgodnie z planem')), h('span', { class: 'st-low' }, h('i', { class: 'kn-dot' }), tl('za mało')), h('span', { class: 'st-high' }, h('i', { class: 'kn-dot' }), tl('za dużo'))),
      h('p', { class: 'kx-hint' }, tl('Cel to plan z kroku 2. Nadwyżka pojawia się zwykle wtedy, gdy jedna sól dostarcza dwóch składników naraz (np. KNO₃ – azotu i potasu). To suma dodanych składników, a nie stężenie w wodzie: rośliny część pobiorą, więc test pokaże mniej.')),
      (() => { const ex = kxExtras(R.p, n), me = kxMethods(R.p, n); return ex || me ? h('details', { class: 'kx-adv kn-more' }, h('summary', {}, tl('Twardość, przewodność i porównanie z EI')), ex || '', me || '') : ''; })());
    // zalecenia
    P.e.append(h('h3', { class: 'kn-title' }, tl('Zalecenia')), h('ul', { class: 'kn-tips' }, R.tips.filter((x, i) => !(R.missing.length && i === 0)).map(x => h('li', {}, x))));
    // akcje
    const lines = [];
    if (!dry) { bottles.forEach(b0 => lines.push(`${tl('Butelka {0} – {1} ({2} ml):', b0.tag, b0.title.toLowerCase(), fnum(R.bottle, 0))}`, ...b0.list.map(i => `- ${row(i).name}: ${knAmt(row(i))}`)));
      lines.push(`${tl('Dawka: {0} ml{1}, {2} {3} w tygodniu.', gfmt(R.dose), bottles.length > 1 ? tl(' z każdej butelki, osobno') : '', n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`); }
    else lines.push(`${tl('Na sucho, {0} {1} w tygodniu, przy każdej dawce:', n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, ...[...(A ? [...A.items, ...A.prodItems] : []), ...(B ? [...B.items, ...B.prodItems] : [])].map(i => `- ${row(i).name}: ${knAmt(row(i))}`));
    lines.push(`${tl('Co tydzień w akwarium ({0} l): +{1} mg/l', fnum(V, 0), kxIons(R.week))}`);
    const text = lines.join('\n');
    const saved = h('div');
    const saveBoth = () => kxNameSheet(tl('Zapisz przepis'), tl('Mój nawóz'), name => {
      const pids = bottles.map(b0 => { const r = { id: uid('r'), name: (bottles.length > 1 ? `${name} – ${b0.tag} ${b0.title.toLowerCase()}` : name).slice(0, 60), vol: R.bottle, items: b0.list.map(recItem),
        note: `${tl('Dawka {0} ml, {1} {2} w tygodniu.{3}', gfmt(R.dose), n, kxPl(n, 'raz', tl('razy'), tl('razy')), bottles.length > 1 ? tl(' Butelki wlewaj osobno.') : '')}`, created: todayKey(), updated: todayKey(), pid: null };
        state.recipes.push(r); return syncRecipeProduct(r).id; });
      save(); toast(bottles.length > 1 ? `${tl('Zapisano {0} butelki w Przepisach', bottles.length)}` : tl('Zapisano w Przepisach'));
      saved.innerHTML = ''; saved.append(h('div', { class: 'kx-msg info' }, `${tl('Zapisane. {0} w Przepisach i w Bazie nawozów – możesz je wpisywać do dziennika.', bottles.length > 1 ? tl('Butelki są') : tl('Butelka jest'))}`,
        h('div', { class: 'kx-acts' }, h('button', { class: 'btn small', type: 'button', onclick: () => { pids.forEach(pid => kxAddToPlan(pid, R.dose, n)); } }, tl('Dodaj do planu nawożenia')), h('a', { class: 'btn ghost small', href: '#/kalkulator/receptury' }, tl('Otwórz Przepisy'))))); });
    if (!P.z.childNodes.length) P.z.append(h('p', { class: 'kx-empty' }, tl('Lista składników pojawi się, gdy sole się rozpuszczą – popraw dawkę w zakładce Przepis.')));
    showTab(KN_TAB);
    P.p.append(kxActions([[tl('Kopiuj przepis'), () => kxCopy(text)], !dry && !bad && bottles.length ? [tl('Zapisz w Przepisach'), saveBoth, 'btn'] : null,
      [tl('Ustaw sam w Makro'), () => { const m = kxState().makro; Object.assign(m, { per: 'week', n: String(n), how: s.how, bottle: String(R.bottle), dose: String(R.dose).replace('.', DEC),
        rows: Object.entries(R.src).map(([k, v]) => ({ k, t: String(+R.targets[k].toFixed(3)).replace('.', DEC), src: v })) }); save(); go('kalkulator/makro'); }]]), saved);
    kxPin(out, dry ? `${tl('Na sucho, {0} {1} w tygodniu', n, kxPl(n, 'raz', tl('razy'), tl('razy')))}` : `${tl('Dawka {0} ml{1}, {2} {3} w tygodniu', gfmt(R.dose), bottles.length > 1 ? tl(' z każdej butelki') : '', n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, head);
    kxLog('nawoz', s, (A ? A.items.map(i => `${itName(i)} ${gfmt(i.g)} g`).slice(0, 3).join(', ') : '') + (dry ? tl(' (na sucho)') : tl('; dawka {0} ml', gfmt(R.dose))), text);
  }
  redraw();
};

// pierwsza zakładka: dwa osobne narzędzia – nawóz (koncentrat do dawkowania) i mineralizacja (cała porcja wody RO do podmiany)
function knSwitch(cur) {
  const it = (k, title, desc) => h('a', { class: 'kn-sw' + (k === cur ? ' on' : ''), href: '#/kalkulator/' + k, 'aria-current': k === cur ? 'page' : null }, h('b', {}, title), h('span', {}, desc));
  const nl = kxShopLists().length;
  return h('div', {}, h('nav', { class: 'kn-switch', 'aria-label': tl('Co przygotowujesz') }, it('nawoz', tl('Przygotuj nawóz'), tl('Ilość soli do butelki i dawka do akwarium')), it('mineral', tl('Mineralizacja wody'), tl('Sole do całej porcji wody RO przed podmianą'))),
    nl ? h('a', { class: 'kn-shoplink', href: '#/kalkulator/zakupy' }, `${tl('Łączna lista zakupów: {0} {1} →', nl, kxPl(nl, tl('nawóz'), 'nawozy', tl('nawozów')))}`) : null);
}

/* ===== Mineralizacja wody: cała porcja wody RO do podmiany (LICZ.mineralizacja) =====
   Wybór soli wspólny z „Nawóz” (kxState().nawoz.have) – zaznaczenie widać w obu miejscach.
   7.11: opcjonalnie Ca i Mg z nawozu (przepis z „Nawóz” albo gotowy nawóz), żeby GH i Ca : Mg zgadzały się dla sumy woda + nawóz. */
const KM_SALTS = [[tl('Wapń (GH)'), [['CaSO4|2', tl('gips')], ['CaCl2|2', tl('chlorek wapnia')], ['CaNO32|4', tl('saletra wapniowa – doda NO₃')]]],
  [tl('Magnez (GH)'), [['MgSO4|7', tl('siarczan magnezu, sól gorzka')], ['MgCl2|6', tl('chlorek magnezu')]]],
  [tl('Węglany (KH)'), [['KHCO3|0', tl('wodorowęglan potasu')], ['NaHCO3|0', tl('soda oczyszczona – doda sód')], ['K2CO3|0', tl('węglan potasu (potaż)')]]]];
const KM_PRESET = [[tl('Rośliny'), 6, 3], ['Neocaridina', 8, 4], ['Caridina', 5, 0], [tl('Miękka'), 3, 1]];
KX.mineral = root => {
  const g = kxState(), t = tank(); g.nawoz ||= knDefaults(t); const sh = g.nawoz; sh.have ||= [];
  const hd = KN_HARD[t.type] || [6, 3], m = (g.mineral ||= { L: '', GH: sh.GH || String(hd[0]), KH: sh.KH || String(hd[1]), ratio: '3', sets: [] }); m.sets ||= [];
  const defL = Math.round((t.V || 0) * ((n2(sh.change) ?? t.change ?? 30) / 100)) || 20;
  root.append(knSwitch('mineral'));
  const { form, out } = kxLayout(root); out.classList.add('kn-result');
  const step = (n, title, body) => h('section', { class: 'kn-step' }, h('h2', { class: 'kn-h' }, h('span', { class: 'kn-n' }, String(n)), title), body);
  const b1 = h('div', { class: 'kn-body' }), b2 = h('div', { class: 'kn-body' }), b3 = h('div', { class: 'kn-body' }), b4 = h('div', { class: 'kn-body' });
  m.fert ||= ''; m.fml ||= '';
  const chg = () => (n2(sh.change) ?? t.change ?? 30) / 100;
  // Ca i Mg z nawozu na tydzień (mg/l): przepis z „Nawóz” (knRun) albo gotowy nawóz × ml na tydzień
  const fertWeek = () => {
    if (m.fert === 'nawoz') { const R = knRun(sh, n2(sh.V) > 0 ? n2(sh.V) : t.V); return { Ca: R.week.Ca || 0, Mg: R.week.Mg || 0, name: tl('Twój nawóz z soli') }; }
    if (String(m.fert).startsWith('p:')) { const p = productById(m.fert.slice(2)), ml = n2(m.fml); if (!p || !(ml > 0) || !(t.V > 0)) return null;
      return { Ca: (p.ppm.Ca || 0) * ml / t.V, Mg: (p.ppm.Mg || 0) * ml / t.V, name: p.name }; }
    return null;
  };
  const redraw = () => { draw(); };
  function draw() {
    b1.innerHTML = ''; b2.innerHTML = ''; b3.innerHTML = ''; b4.innerHTML = '';
    const caMg = allProducts().filter(p => p.ppm && ((p.ppm.Mg || 0) > 0 || (p.ppm.Ca || 0) > 0) && p.source !== 'recipe');
    const fsel = h('select', { 'aria-label': tl('Nawóz z wapniem lub magnezem') }, h('option', { value: '', selected: !m.fert }, tl('Nie uwzględniaj')), h('option', { value: 'nawoz', selected: m.fert === 'nawoz' }, tl('Twój nawóz z soli (policzony w „Przygotuj nawóz”)')),
      caMg.length ? h('optgroup', { label: tl('Gotowe nawozy z Ca lub Mg') }, caMg.map(p => h('option', { value: 'p:' + p.id, selected: m.fert === 'p:' + p.id }, p.name))) : null);
    fsel.onchange = () => { m.fert = fsel.value; save(); draw(); };
    b4.append(...[h('p', { class: 'kx-hint' }, tl('Nawozy NPK często zawierają magnez, czasem wapń. Wybierz nawóz, który dawkujesz – jego Ca i Mg zostaną odjęte od mineralizacji, tak by GH i stosunek Ca : Mg dotyczyły wody w akwarium, a nie samej wody do podmian.')), selField(tl('Nawóz, który dawkujesz'), fsel),
      String(m.fert).startsWith('p:') ? kxNum(m, 'fml', tl('Ile dajesz w tygodniu'), productById(m.fert.slice(2))?.unit === 'g' ? 'g' : 'ml', { ph: '0', onInput: update }).el : null,
      m.fert ? h('p', { class: 'kx-hint' }, `${tl('Liczone przy podmianie {0}% wody co tydzień. Rośliny część pobiorą, więc wynik jest orientacyjny.', fnum(chg() * 100, 0))}`) : null].filter(Boolean)); // append() wypisałby null jako tekst „null”
    const Lf = kxNum(m, 'L', tl('Ile wody RO przygotowujesz'), tl('l'), { ph: String(defL), hint: m.L ? '' : `${tl('Jedna podmiana w Twoim akwarium: ok. {0} l', defL)}`, onInput: update, check: x => x > 2000 ? tl('Najwyżej 2000 l naraz') : '' });
    b1.append(Lf.el, h('div', { class: 'kg-kinds' }, kxChoice([10, 20, 40, 60, 100].map(v => [String(v), tl('{0} l', v)]), m.L, v => { m.L = v; save(); draw(); }, tl('Szybki wybór objętości'))));
    b2.append(h('div', { class: 'grid' }, kxNum(m, 'GH', tl('GH docelowe'), '°dH', { ph: String(hd[0]), onInput: update, check: x => x > 30 ? tl('Najwyżej ok. 30 °dH') : '' }).el,
      kxNum(m, 'KH', tl('KH docelowe'), '°dH', { ph: String(hd[1]), onInput: update, check: x => x > 20 ? tl('Najwyżej ok. 20 °dH') : '' }).el),
      h('div', { class: 'kg-kinds' }, kxChoice(KM_PRESET.map(([l, a, b]) => [l, `${l}: GH ${a} · KH ${b}`]), KM_PRESET.find(([, a, b]) => n2(m.GH) === a && n2(m.KH) === b)?.[0] || '', v => { const x = KM_PRESET.find(p => p[0] === v); m.GH = String(x[1]); m.KH = String(x[2]); save(); draw(); }, tl('Typowe twardości'))),
      h('details', { class: 'kx-adv' }, h('summary', {}, tl('Proporcja wapnia do magnezu')), h('p', { class: 'kx-hint' }, tl('Masowo, Ca : Mg. Zwykle 3 : 1 – tak jak w większości kranówek. Krewetki i rośliny dobrze znoszą 2–4 : 1.')),
        kxChoice([['2', '2 : 1'], ['3', '3 : 1'], ['4', '4 : 1']], m.ratio || '3', v => { m.ratio = v; save(); draw(); }, 'Ca : Mg')));
    b3.append(h('p', { class: 'kx-hint' }, tl('Domyślnie: gips, siarczan magnezu i wodorowęglan potasu. Z każdej grupy używana jest pierwsza zaznaczona sól. Wybór jest wspólny z „Przygotuj nawóz”.')),
      ...KM_SALTS.flatMap(([title, list]) => [h('h3', { class: 'kn-sub' }, title), h('div', { class: 'kn-tiles' }, list.map(x => knTile(sh, x, redraw)))]));
    update();
  }
  form.append(step(1, tl('Objętość wody'), b1), step(2, tl('Docelowe GH i KH'), b2), step(3, tl('Sole do mineralizacji'), b3), step(4, tl('Wapń i magnez z nawozu'), b4));
  function update() {
    out.innerHTML = '';
    const Lw = n2(m.L) > 0 ? n2(m.L) : defL, FW = fertWeek(), M = LICZ.mineralizacja({ GH: m.GH === '' ? hd[0] : m.GH, KH: m.KH === '' ? hd[1] : m.KH, ratio: m.ratio, have: sh.have, custom: state.salts, L: Lw, change: chg(), fertWeek: FW });
    out.append(h('div', { class: 'kn-result-h' }, h('h2', {}, tl('Woda do podmiany')), h('p', {}, `${tl('{0} l wody RO · GH {1} · KH {2} °dH', fnum(Lw, 0), fnum(M.GH, 1), fnum(M.KH, 1))}`)));
    const NAMES = { Ca: tl('wapnia (gips, chlorek wapnia albo saletra wapniowa)'), Mg: tl('magnezu (siarczan albo chlorek magnezu)'), HCO3: tl('węglanów do KH (wodorowęglan potasu albo soda)') };
    if (M.missing.length) out.append(h('div', { class: 'kx-msg warn' }, `${tl('Brakuje źródła {0}. Zaznacz je w kroku 3 – bez tego woda nie będzie miała zadanego {1}.', kxAnd(M.missing.map(k => NAMES[k])), M.missing.includes('HCO3') && M.missing.length === 1 ? 'KH' : 'GH')}`));
    if (!M.items.length) { out.append(h('p', { class: 'kx-empty' }, M.GH === 0 && M.KH === 0 ? tl('Przy GH 0 i KH 0 nic nie dodajesz – to czysta woda RO.') : tl('Wybierz w kroku 3 sole do mineralizacji.'))); return; }
    const tbl = list => h('table', { class: 'kx-t kn-t' }, h('tbody', {}, list.map(i => h('tr', {}, h('th', { scope: 'row' }, itName(i)), h('td', { class: 'num strong' }, gfmt(i.g) + ' g')))));
    out.append(h('div', { class: 'kn-bottle' }, h('h3', {}, `${tl('Na {0} l wody RO dodaj', fnum(Lw, 0))}`), tbl(M.forL),
      h('p', { class: 'kx-note' }, `${tl('To ilości na całą porcję wody, nie dawka nawozu. Na każde 10 l: {0}.', M.items.map(i => `${itName(i)} ${gfmt(i.g)} g`).join(', '))}`)));
    // 7.12: na wierzchu to, co będzie w akwarium – z nawozem suma woda + nawóz, bez nawozu sama woda do podmian
    const withF = M.tank && (FW.Ca > 0.0005 || FW.Mg > 0.0005), ghT = withF ? M.tank.gh : M.gh, caT = withF ? M.tank.Ca : M.per10.Ca || 0, mgT = withF ? M.tank.Mg : M.per10.Mg || 0;
    // 7.15: wynik w trzech wierszach – co daje woda do podmian, co nawóz, co razem w akwarium (wcześniej jeden akapit)
    const fk = withF ? ['Ca', 'Mg'].filter(k => FW[k] > 0.0005) : [], row = (dt, dd) => [h('dt', {}, dt), h('dd', {}, dd)];
    out.append(h('div', { class: 'kn-target' }, h('span', { class: 'kn-target-l' }, withF ? tl('Twardość w akwarium') : tl('Woda po przygotowaniu')),
      h('b', { class: 'kn-target-v' }, `GH ${fnum(ghT, 1)} °dH · KH ${fnum(M.kh, 1)} °dH`),
      h('dl', { class: 'kn-target-dl' },
        ...(withF ? [...row(tl('Woda do podmian'), `GH ${fnum(M.gh, 1)} °dH · KH ${fnum(M.kh, 1)} °dH`), ...row(FW.name, fk.map(k => `${tl('+{0} mg/l {1}', gfmt(M.tank.fromFert[k]), k)}`).join(' · '))] : []),
        ...row(withF ? tl('Razem Ca i Mg') : tl('Ca i Mg'), `${tl('Ca {0} · Mg {1} mg/l', gfmt(caT), gfmt(mgT))}` + (mgT > 0 ? ` (${fnum(caT / mgT, 1)} : 1)` : '')),
        ...row(tl('Przewodność wody'), `${tl('ok. {0} µS/cm · TDS ok. {1} mg/l', fnum(M.ec, 0), fnum(M.tds, 0))}`)),
      withF ? h('span', { class: 'kn-target-s' }, `${tl('Nawóz dodaje co tydzień {0}; przy cotygodniowych podmianach w akwarium utrzymuje się poziom podany wyżej.', fk.map(k => `${tl('{0} {1} mg/l', k, gfmt(FW[k]))}`).join(tl(' i ')))}`) : null));
    if (M.tank && !withF) out.append(h('p', { class: 'kx-hint' }, `${tl('{0}: ten nawóz nie daje wapnia ani magnezu – woda bez zmian.', FW.name)}`));
    else if (m.fert && !FW) out.append(h('p', { class: 'kx-hint' }, tl('Wpisz, ile nawozu dajesz w tygodniu, żeby uwzględnić jego wapń i magnez.')));
    else if (m.fert && !(chg() > 0)) out.append(h('p', { class: 'kx-hint' }, tl('Bez podmian nie da się policzyć, ile Ca i Mg z nawozu zostaje w akwarium – wpisz podmianę w ustawieniach akwarium.')));
    const ions = X.ION_ORDER.filter(k => M.per10[k] > 0.05);
    out.append(h('details', { class: 'kx-adv kn-more' }, h('summary', {}, tl('Skład wody w mg/l')), h('table', { class: 'kx-t small' }, h('tbody', {}, ions.map(k => h('tr', {}, h('th', { scope: 'row' }, ionL(k)), h('td', { class: 'num' }, tl('{0} mg/l', gfmt(M.per10[k])))))))));
    out.append(...M.warn.map(w => h('div', { class: 'kx-msg warn' }, w)));
    // 7.12: instrukcja dla początkującego – kolejność zależy od wybranych soli
    const gyp = M.items.find(i => i.mat === 'CaSO4'), rest = M.forL.filter(i => i.mat !== 'CaSO4'), small = M.forL.some(i => i.g < 1);
    const steps = [`${tl('Odważ sole na wadze kuchennej z dokładnością do 0,1 g{0}. Sprawdź, czy forma soli na opakowaniu zgadza się z tą w tabeli, np. MgSO₄·7H₂O.', small ? tl(' (ilości poniżej 1 g – na wadze 0,01 g)') : '')}`,
      `${tl('Nalej {0} l wody RO do czystego pojemnika używanego tylko do akwarium – bez resztek detergentu.', fnum(Lw, 0))}`,
      ...(gyp ? [tl('Gips wsyp prosto do całej porcji wody i mieszaj kilka minut. Rozpuszcza się powoli; lekkie zmętnienie powinno zniknąć. Nie rozpuszczaj go w małej ilości wody, bo się nie rozpuści.')] : []),
      ...(rest.length ? [`${tl('{0} ({1}) rozpuść w szklance ciepłej wody RO, wlej do pojemnika i zamieszaj.{2}', gyp ? tl('Pozostałe sole') : rest.length > 1 ? tl('Sole') : tl('Sól'), rest.map(i => itName(i)).join(', '), rest.some(i => i.mat === 'CaCl2') ? tl(' Chlorek wapnia przy rozpuszczaniu mocno się nagrzewa – wsypuj go do wody powoli.') : '')}`] : []),
      tl('Wyrównaj temperaturę z wodą w akwarium. Nie wsypuj soli bezpośrednio do zbiornika.'),
      `${tl('Przy pierwszym przygotowaniu zmierz GH i KH testem kroplowym. Powinno wyjść ok. GH {0} °dH i KH {1} °dH. Jeśli wynik różni się o więcej niż 1–2 °dH, sprawdź formę soli i wagę.', fnum(M.gh, 1), fnum(M.kh, 1))}`];
    out.append(h('h3', { class: 'kn-title' }, tl('Jak przygotować')), h('ol', { class: 'kn-tips' }, steps.map(x => h('li', {}, x))));
    out.append(kxShopCard({ title: tl('Potrzebne sole'), name: `${tl('Mineralizacja {0} l', fnum(Lw, 0))}`, items: M.forL, note: `${tl('Ilości na jedną porcję: {0} l wody RO.', fnum(Lw, 0))}` }));
    const text = [`${tl('Mineralizacja: {0} l wody RO, cel GH {1} °dH, KH {2} °dH (Ca : Mg {3} : 1)', fnum(Lw, 0), fnum(M.GH, 1), fnum(M.KH, 1), M.ratio)}`, ...M.forL.map(i => `- ${itName(i)}: ${gfmt(i.g)} g`), `${tl('Wynik: GH {0} °dH, KH {1} °dH, ok. {2} µS/cm', fnum(M.gh, 1), fnum(M.kh, 1), fnum(M.ec, 0))}`].join('\n');
    const cur = h('div');
    out.append(kxActions([[tl('Kopiuj przepis'), () => kxCopy(text)], [tl('Zapisz ten zestaw'), () => kxNameSheet(tl('Zapisz zestaw mineralizacji'), `GH ${fnum(M.GH, 0)} KH ${fnum(M.KH, 0)}`, name => {
      m.sets = m.sets.filter(x => x.name !== name); m.sets.push({ name, GH: m.GH, KH: m.KH, ratio: m.ratio, L: m.L, have: sh.have.filter(c => KM_SALTS.some(([, l]) => l.some(([k]) => k.split('|')[0] === c.split('|')[0]))) }); save(); toast(tl('Zapisano: {0}', name)); draw(); }), 'btn']]), cur);
    if (m.sets.length) out.append(h('h3', { class: 'kn-title' }, tl('Moje zestawy')), h('div', { class: 'kx-acts' }, m.sets.map(x => h('span', { class: 'km-set' },
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { Object.assign(m, { GH: x.GH, KH: x.KH, ratio: x.ratio, L: x.L }); for (const c of x.have || []) { sh.have = sh.have.filter(y => y.split('|')[0] !== c.split('|')[0]); sh.have.push(c); } save(); draw(); } }, x.name),
      h('button', { class: 'kx-x', type: 'button', 'aria-label': tl('Usuń zestaw {0}', x.name), onclick: () => { m.sets = m.sets.filter(y => y !== x); save(); draw(); } }, '×')))));
    kxLog('mineral', m, `${tl('Mineralizacja {0} l: GH {1}, KH {2}', fnum(Lw, 0), fnum(M.GH, 1), fnum(M.KH, 1))}`, text);
  }
  draw();
};

// Zaawansowane: tylko narzędzia, których nie ma w podstawowych ekranach. Wszystkie liczą tym samym silnikiem (chem.js) i biorą sole z tej samej bazy.
KX.zaawansowane = root => toolsHub(root); // 7.16: wspólne z „narzedzia” (app.js)


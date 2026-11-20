if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – Receptury: wbudowane (EI, PPS-Pro, PMDD) i moje; skalowanie do butelki i akwarium; „Sprawdź butelkę” =====
   Adres: #/kalkulator/receptury/<id> – id: ei, ppspro, pmdd, sprawdz albo id mojej receptury. Edycja mojej receptury: dotychczasowy edytor (#/nawozy/receptury/<id>). */
const KX_BUILTIN = {
  ei: { name: 'EI – Estimative Index', desc: tl('Nawozisz z zapasem, raz w tygodniu podmieniasz połowę wody'), kind: 'targets', use: tl('Mocne światło z CO₂, dużo szybko rosnących roślin.') },
  ppspro: { name: tl('PPS-Pro (makro)'), desc: tl('Małe codzienne dawki, 1 ml na 40 l'), kind: 'grams', use: tl('Akwaria z umiarkowanym światłem, które nie chcą dużych podmian. Mikro w osobnej butelce.'),
    prep: [tl('Wsyp sole do ok. 400 ml ciepłej wody RO albo destylowanej.'), tl('Mieszaj, aż się rozpuszczą, i dopełnij do pełnej objętości.'), tl('Mikro (CSM+B) rozpuść w osobnej butelce.')] },
  pmdd: { name: 'PMDD', desc: tl('Makro i mikro w jednej butelce, z kwasem, dawka codzienna'), kind: 'grams', use: tl('Akwaria bez dodatku fosforu (fosfor z karmy i od ryb). Bez fosforanów, dlatego żelazo może być w tej samej butelce.'),
    prep: [tl('Do ok. 700 ml wody RO wsyp najpierw EDTA i rozpuść.'), tl('Dodaj po kolei sole mikro, potem makro – każdą do rozpuszczenia.'), tl('Dopełnij do pełnej objętości i na koniec dodaj kwas (niżej).')] },
};
const kxRecItems = id => id === 'ppspro' ? { items: DANE.DIY.ppspro.items, vol: DANE.DIY.ppspro.bottle } : id === 'pmdd' ? { items: DANE.PMDD.items, vol: DANE.PMDD.vol } : (() => { const r = state.recipes.find(x => x.id === id); return r ? { items: r.items, vol: r.vol, r } : null; })();

KX.receptury = root => {
  const id = location.hash.replace(/^#\/?/, '').split('/')[2];
  if (!id) return kxRecList(root);
  if (id === 'sprawdz') return kxCheckBottle(root);
  if (id === 'ei') return kxRecEI(root);
  const src = kxRecItems(id);
  if (!src) { root.append(h('p', { class: 'kx-empty' }, tl('Nie znaleziono przepisu.')), backLink('#/kalkulator/receptury', tl('Wszystkie przepisy'))); return; }
  kxRecGrams(root, id, src);
};

// 7.10: rodzaj receptury ze składu w butelce (g/l) – te same rodzaje co w Gotowych nawozach plus pojedyncze makro
const KR_KIND = [['N', tl('Azotowe')], ['P', tl('Fosforowe')], ['K', tl('Potasowe')], ['Mg', tl('Magnezowe')], ['macro', tl('Makro (kilka)')], ['micro', tl('Mikro i żelazo')], ['multi', tl('Kompletne')], ['other', tl('Inne')]];
function kxRecKind(conc) {
  const has = k => (conc[k] || 0) > 0, mic = LICZ.MIC_EL.some(has), mac = ['NO3', 'NH4', 'PO4', 'K', 'Mg'].filter(has);
  const n = has('NO3') || has('NH4'), pk = ['PO4', 'K', 'Mg'].filter(has);
  if (mic && (n || has('PO4'))) return 'multi';
  if (mic) return 'micro';
  if (!mac.length) return 'other';
  if (n && (has('PO4') || pk.length > 1)) return 'macro';
  if (n) return 'N'; if (has('PO4')) return 'P'; if (has('K') && !has('Mg')) return 'K'; if (has('Mg') && !has('K')) return 'Mg';
  return 'macro';
}
// 7.11: czego z receptury nie ma na liście „mam już” (kxOwned, zakupy.js) – tylko do podpowiedzi na liście przepisów
const kxRecToBuy = items => LICZ.zakupy([{ name: '', items }], kxOwned(), state.salts).filter(l => !l.have);
function kxRecList(root) {
  const st = (kxState().recL ||= { q: '', kind: '' });
  const all = [...Object.entries(KX_BUILTIN).map(([k, x]) => { const src = kxRecItems(k); return { id: k, name: x.name, sub: x.desc, builtin: true, items: src ? src.items : [], vol: src ? src.vol : 0, targets: x.kind === 'targets' }; }),
    ...state.recipes.map(r => ({ id: r.id, name: r.name, sub: r.note || '', items: r.items, vol: r.vol }))];
  for (const r of all) { r.conc = r.targets ? { ...DANE.DIY.ei.week, Fe: 1 } : X.solution(r.items, r.vol, state.salts).conc; r.kind = r.targets ? 'macro' : kxRecKind(r.conc); }
  const words = r => [r.name, r.sub, (KR_KIND.find(k => k[0] === r.kind) || [])[1], ...r.items.map(i => itName(i) + ' ' + (i.fert ? '' : (matOf(i.mat) || {}).name || '')), ...Object.keys(r.conc).filter(k => r.conc[k] > 0)].join(' ');
  const fold = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const WORDS = { NO3: tl('azot azotan'), PO4: tl('fosfor fosforan'), K: tl('potas'), Mg: tl('magnez'), Fe: tl('zelazo'), Ca: tl('wapn') };
  const match = r => fold(st.q).split(/\s+/).filter(Boolean).every(w => fold(words(r) + ' ' + Object.keys(r.conc).filter(k => r.conc[k] > 0).map(k => WORDS[k] || '').join(' ')).includes(w));
  const listBox = h('div', { class: 'kg-list kr-list' });
  const draw = () => { listBox.innerHTML = '';
    const f = all.filter(r => (!st.kind || r.kind === st.kind || (st.kind === 'mine' && !r.builtin)) && match(r));
    if (!f.length) { listBox.append(h('p', { class: 'kx-empty' }, all.length > 3 ? tl('Nic nie pasuje do wyszukiwania.') : tl('Brak przepisów.'))); return; }
    const mine = kxOwned().length > 0; // bez listy „mam już” nie straszymy „brakuje: wszystko”
    f.forEach(r => { const miss = r.targets || !mine ? [] : kxRecToBuy(r.items), top = kxMain(r.conc).filter(k => r.conc[k] >= 0.01).slice(0, 4);
      listBox.append(h('a', { class: 'kg-item', href: '#/kalkulator/receptury/' + r.id }, h('span', { class: 'kg-name' }, h('b', {}, r.name), h('small', {}, [r.builtin ? tl('znany przepis') : tl('mój'), (KR_KIND.find(k => k[0] === r.kind) || [])[1]].join(' · '))),
        h('span', { class: 'kg-meta' }, r.targets ? tl('cele tygodniowe – gramy liczy Makro') : tl('{0}{1} g/l', `${tl('{0} ml ·', fnum(r.vol, 0))} `, top.map(k => `${ionL(k)} ${gfmt(r.conc[k])}`).join(', ')),
          r.targets || !mine ? null : miss.length ? h('em', { class: 'kg-warn' }, tl('do kupienia: {0}', miss.map(x => itName(x.item)).join(', '))) : h('em', {}, tl('masz wszystkie składniki'))))); }); };
  const qi = h('input', { type: 'search', 'aria-label': tl('Szukaj przepisu'), placeholder: tl('Szukaj: nazwa, sól, „potas”, „żelazo”…'), value: st.q, class: 'kg-q' }); qi.oninput = () => { st.q = qi.value; save(); draw(); };
  const kinds = [['', tl('Wszystkie')], ...KR_KIND.filter(([k]) => all.some(r => r.kind === k)), ...(state.recipes.length ? [['mine', tl('Moje')]] : [])];
  root.append(kxSec(tl('Przepisy'), h('p', { class: 'kx-hint' }, tl('Znane przepisy (EI, PPS-Pro, PMDD) i Twoje własne. Otwórz przepis, żeby przeliczyć go na swoją butelkę i akwarium i zobaczyć listę potrzebnych soli.')), qi,
      h('div', { class: 'kg-kinds' }, kxChoice(kinds, st.kind, v => { st.kind = v; save(); render.keepScroll = true; render(); }, tl('Rodzaj przepisu'))), listBox,
      h('div', { class: 'kx-acts' }, h('a', { class: 'btn small', href: '#/nawozy/receptury/nowa' }, tl('+ Nowy przepis')))));
  draw();
}
const kxTO = items => items.some(i => i.fert) ? { col1: tl('Składnik'), unit: tl('g lub ml') } : {};
const kxBack = () => backLink('#/kalkulator/receptury', tl('Przepisy'));

// przepis/receptura w gramach: skład oryginalny → butelka → dawka w akwarium
function kxRecGrams(root, id, src) {
  const s = (kxState().rec ||= {}), V0 = tank().V;
  if (s._for !== id) { s._for = id; s.bottle = String(src.vol).replace('.', DEC);
    if (id === 'ppspro') { s.dose = String(+(DANE.DIY.ppspro.doseMl * V0 / DANE.DIY.ppspro.perLiters).toFixed(1)).replace('.', DEC); s.n = '7'; } save(); }
  const title = KX_BUILTIN[id] ? KX_BUILTIN[id].name : src.r.name;
  root.append(kxBack(), h('h1', { class: 'kx-title' }, title));
  const { form, out } = kxLayout(root), tk = kxTank(s, () => update());
  const B0 = KX_BUILTIN[id];
  form.append(kxSec(tl('Przepis'), (B0 && B0.use) || (src.r && src.r.note) ? h('p', { class: 'kx-note' }, B0 && B0.use ? B0.use : src.r.note) : null,
      h('table', { class: 'kx-t small' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, tl('Składnik')), h('th', { scope: 'col' }, tl('Oryginał')))),
        h('tbody', {}, src.items.filter(i => i.g > 0).map(i => h('tr', {}, h('th', { scope: 'row' }, itName(i)), h('td', { class: 'num' }, gfmt(i.g) + ' ' + itUnit(i)))))),
      h('p', { class: 'kx-hint' }, `${tl('Na {0} ml roztworu.', fnum(src.vol, 0))}` + (id === 'ppspro' ? ' ' + DANE.DIY.ppspro.note : id === 'pmdd' ? tl(' Na koniec 2 ml kwasu solnego 36% na litr.') : ''))),
    kxSec(tl('Akwarium'), tk.el), kxSec(tl('Roztwór'), kxBottle(s, () => update())));
  function update() {
    out.innerHTML = '';
    const V = tk.V(), bottle = n2(s.bottle), dose = n2(s.dose), n = kxN(s);
    if (!(V > 0 && bottle > 0 && dose > 0 && n > 0) || dose > bottle) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz objętość akwarium, butelkę, dawkę i liczbę dawek.'))); return; }
    const R = LICZ.recepturaGram(src.items, src.vol, { bottle, dose, n, V, custom: state.salts }), warn = [];
    R.sol.warn.filter(w => !/^sol_/.test(w.code || '') && !(R.split && X.COMPAT_RULES.some(r => r.code === w.code))).forEach(w => warn.push([w.sev, w.t]));
    if ((R.p.NH4 || 0) * n > 1) warn.push(['bad', `${tl('NH₄ wyjdzie {0} mg/l w tygodniu. Powyżej 1 mg/l to już ryzykowne dla ryb i krewetek.', gfmt(R.p.NH4 * n))}`]);
    if ((R.p.Cu || 0) * n > 0.01 && P.PROFILES[tank().type].shrimp) warn.push(['bad', tl('Miedź powyżej 0,01 mg/l na tydzień może szkodzić krewetkom.')]);
    out.append(...kxAlerts(warn.filter(w => w[0] === 'bad')));
    const fix = kxFix(R.fx, { s, check: true }); if (fix) out.append(fix);
    const head = h('h2', { class: 'kx-h' }, `${tl('Odważ do butelki {0} ml', fnum(bottle, 0))}`);
    out.append(head, kxTable(R.items.map(i => ({ name: itName(i), amount: gfmt(i.g) + (R.items.some(x => x.fert) ? ' ' + itUnit(i) : ''), gl: i.fert ? '' : gfmt(i.g / bottle * 1000), gives: kxIons(LICZ.daje(i, { bottle, dose, V })) })), kxTO(R.items)),
      h('p', { class: 'kn-conc' }, `${tl('W 1 ml: {0} mg.', kxMain(R.sol.conc).map(k => `${ionL(k)} ${gfmt(R.sol.conc[k])}`).join(' · '))} ` + ((k1 => k1 ? `${tl('{0} ml podnosi {1} o {2} mg/l w {3} l.', gfmt(V / R.sol.conc[k1] * (k1 === 'Fe' ? 0.1 : 1)), ionL(k1), k1 === 'Fe' ? '0,1' : '1', fnum(V, 0))}` : '')(['NO3', 'PO4', 'K', 'Fe', 'Mg'].find(k => R.sol.conc[k] > 0)))),
      h('p', { class: 'kx-note' }, `${tl('Starczy na {0} {1} po {2} ml, czyli około {3} dni.', fnum(R.doses, 0), kxPl(R.doses, tl('dawkę'), 'dawki', tl('dawek')), fnum(dose, 2), fnum(R.days, 0))}`),
      h('h3', { class: 'kn-title' }, tl('Jak przygotować')), h('ol', { class: 'kn-tips' }, ((B0 && B0.prep) || [`${tl('Wsyp składniki po kolei do ok. {0} ml ciepłej wody RO albo destylowanej.', fnum(bottle * 0.8, 0))}`, tl('Mieszaj, aż każdy się rozpuści, zanim dodasz następny.'), `${tl('Dopełnij wodą do {0} ml i podpisz butelkę (nazwa, data, dawka).', fnum(bottle, 0))}`]).map(x => h('li', {}, x))),
      kxGain(R.p, dose, n) || '', kxExtras(R.p, n) || '', kxMethods(R.p, n) || '');
    if (id === 'pmdd') { const a = LICZ.pmddAcid(bottle);
      out.append(h('div', { class: 'kx-msg bad', role: 'alert' }, `${tl('Na koniec {0} ml kwasu solnego 36%. Jest żrący i paruje: załóż okulary i rękawice, pracuj przy otwartym oknie, odmierzaj strzykawką i zawsze wlewaj kwas do wody, nigdy odwrotnie.', fnum(a.hcl, 1))}`),
        h('div', { class: 'kx-msg info' }, `${tl('Bezpieczniej: zamiast kwasu solnego ok. {0} g kwasu cytrynowego albo ok. {1} ml octu 10% – to ta sama ilość kwasu. Słabszy kwas daje wyższe pH, więc sprawdź papierkiem i dodaj trochę więcej, jeśli roztwór mętnieje. Z octem roztwór szybciej się psuje, trzymaj go w lodówce.', fnum(a.cit, 1), fnum(a.ocet, 0))}`),
        h('p', { class: 'kx-note' }, tl('Sole rozpuszczaj po kolei w wodzie demineralizowanej, zaczynając od EDTA. Trzymaj butelkę w ciemnym miejscu. Fosfor (KH₂PO₄) i wapń daj do osobnych butelek.'))); }
    const sl = kxSplit(R.split, bottle); if (sl) out.append(sl);
    const so = kxSol(R.sol.rows); if (so) out.append(so);
    out.append(...kxAlerts(warn.filter(w => w[0] !== 'bad')));
    out.append(kxShopCard({ name: title, items: R.items, note: `${tl('Ilości na butelkę {0} ml.{1}', fnum(bottle, 0), id === 'pmdd' ? tl(' Do tego kwas – patrz wyżej.') : '')}` }));
    const text = [`${tl('{0}: akwarium {1} l, butelka {2} ml, dawka {3} ml, {4} {5} w tygodniu', title, fnum(V, 0), fnum(bottle, 0), fnum(dose, 2), n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, ...R.items.map(i => `- ${itName(i)}: ${gfmt(i.g)} ${itUnit(i)}`),
      ...(id === 'pmdd' ? [`${tl('- na koniec kwas solny 36%: {0} ml (albo słabszy kwas)', fnum(LICZ.pmddAcid(bottle).hcl, 1))}`] : []), `${tl('Po jednej dawce: +{0} mg/l', kxIons(R.p))}`, `${tl('Po tygodniu: +{0} mg/l', kxIons(R.p, kxMain(R.p), n))}`].join('\n');
    const copyMine = () => kxNameSheet(tl('Zapisz jako mój przepis'), title + (src.r ? tl(' (kopia)') : ''), name => {
      const r = { id: uid('r'), name, vol: bottle, items: R.items.map(recItem), note: id === 'pmdd' ? `${tl('Na koniec {0} ml HCl 36% (albo słabszy kwas).', fnum(LICZ.pmddAcid(bottle).hcl, 1))}` : '', created: todayKey(), updated: todayKey(), pid: null };
      state.recipes.push(r); syncRecipeProduct(r); save(); toast(tl('Zapisano: {0}', name)); go('nawozy/receptury/' + r.id); });
    const toNawoz = () => { const nw = (kxState().nawoz ||= knDefaults(tank())); const wk = Object.fromEntries(['NO3', 'PO4', 'K', 'Mg', 'Fe'].map(k => [k, String(+((R.p[k] || 0) * n).toPrecision(3)).replace('.', DEC)]));
      Object.assign(nw, { plan: 'own', manual: wk, n: [1, 3, 7].includes(n) ? n : 7, bottle: String(bottle), dose: String(dose).replace('.', DEC) });
      for (const i of R.items) if (!i.fert && !nw.have.some(c => splitV(c).id === i.mat)) nw.have.push(i.mat + '|' + (i.hyd || 0)); save(); toast(tl('Ustawione w „Przygotuj nawóz” jako plan własny')); go('kalkulator/nawoz'); };
    out.append(kxActions([[tl('Kopiuj wynik'), () => kxCopy(text)], src.r ? [tl('Edytuj'), () => go('nawozy/receptury/' + id), 'btn'] : [tl('Zapisz jako moją'), copyMine, 'btn'], [tl('Przelicz w „Przygotuj nawóz”'), toNawoz],
      src.r ? [tl('Przygotowałem'), () => openBatch(src.r)] : null, src.r ? [tl('Dodaj do planu nawożenia'), () => { const p = syncRecipeProduct(src.r); kxAddToPlan(p.id, dose, n); }] : null]));
    kxPin(out, kxPinText(R.items.map(i => gfmt(i.g))), head);
    kxLog('receptura', { id, bottle: s.bottle, dose: s.dose, n: s.n }, `${tl('{0}: butelka {1} ml, dawka {2} ml, {3} {4} w tygodniu', title, fnum(bottle, 0), gfmt(dose), n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, text);
  }
  update();
}

// EI: przepis zapisany jako cele tygodniowe – gramy liczy Makro
function kxRecEI(root) {
  const E = DANE.DIY.ei;
  root.append(kxBack(), h('h1', { class: 'kx-title' }, KX_BUILTIN.ei.name));
  root.append(kxSec(tl('Cele tygodniowe'), h('table', { class: 'kx-t small' }, h('tbody', {}, [...Object.entries(E.week), ...Object.entries(E.weekMicro)].map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, ionL(k)), h('td', { class: 'num' }, tl('{0} mg/l', fnum(v, 2)))))))),
    h('p', { class: 'kx-hint' }, `${tl('{0} Makro dawkujesz {1} razy w tygodniu.', E.note, E.n)}`),
    kxActions([[tl('Otwórz w Makro'), () => { const m = kxState().makro, mi = kxState().mikro, n = E.n;
      m.per = 'week'; m.n = String(n); m.rows = Object.entries(E.week).map(([k, v]) => ({ k, t: String(v).replace('.', DEC), src: LICZ.NUTR_DEF[k][1] }));
      const fe = (mi.rows ||= []).find(r => r.k === 'Fe'); if (fe) fe.t = String(E.weekMicro.Fe).replace('.', DEC); else mi.rows.push({ k: 'Fe', t: String(E.weekMicro.Fe).replace('.', DEC), src: LICZ.NUTR_DEF.Fe[1] }); mi.per = 'week';
      const d = LICZ.fitDose({ rows: m.rows, n, bottle: n2(m.bottle) || 500, V: n2(m.V) || tank().V, d0: n2(m.dose), custom: state.salts, prodOf: productById }); m.dose = String(d).replace('.', DEC);
      save(); toast(`${tl('Wstawiono EI do Makro, a żelazo {0} mg/l do Mikro', fnum(E.weekMicro.Fe, 1))}`); go('kalkulator/makro'); }, 'btn']]));
}

// Sprawdź butelkę: gramy soli → g/l, mg/l na dawkę i tydzień
function kxCheckBottle(root) {
  const s = (kxState().rec ||= {}); if (!Array.isArray(s.items) || !s.items.length) s.items = [{ mat: 'KNO3', hyd: 0, g: 0 }];
  root.append(backLink('#/kalkulator/zaawansowane', tl('Zaawansowane')), h('h1', { class: 'kx-title' }, tl('Sprawdź butelkę')));
  const { form, out } = kxLayout(root), tk = kxTank(s, () => update()), box = h('div', { class: 'kx-rows' });
  function draw() {
    box.innerHTML = '';
    s.items.forEach((it, i) => {
      const pick = saltPicker(itVal(it), v => { setItVal(it, v); save(); draw(); }, { label: tl('Składnik {0}', i + 1), extra: fertExtra(it) }), sel = pick.sel; sel.value = itVal(it);
      const gObj = { g: it.g ? String(it.g).replace('.', DEC) : '' };
      const g = kxNum(gObj, 'g', it.fert ? tl('Ilość') : tl('Masa'), itUnit(it), { ph: '0', aria: (it.fert ? tl('Ilość ') : tl('Masa ')) + (i + 1), onInput: () => { it.g = n2(gObj.g) || 0; save(); update(); } });
      const m = it.fert ? null : matOf(it.mat), pctF = m && m.pct ? kxNum(it, 'pct', `${tl('{0} w produkcie', ionL(Object.keys(m.pct)[0]))}`, '%', { ph: fnum(Object.values(m.pct)[0], 1), onInput: update }).el : null;
      box.append(h('div', { class: 'kx-row' }, h('div', { class: 'kx-row-top' }, selField(tl('Składnik'), sel), g.el, h('button', { class: 'kx-x', type: 'button', 'aria-label': tl('Usuń składnik {0}', i + 1), onclick: () => { s.items.splice(i, 1); save(); draw(); } }, '×')),
        pick.form ? h('div', { class: 'kx-form-h' }, selField(tl('Forma'), pick.form)) : null, pctF));
    });
    box.append(h('div', { class: 'kx-acts' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { s.items.push({ mat: 'KH2PO4', hyd: 0, g: 0 }); save(); draw(); } }, tl('+ Sól')),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { const p = allProducts().find(p => p.source !== 'recipe' && LICZ.isMicroSource(p)); if (!p) return; s.items.push({ fert: fertSnap(p), g: 0 }); save(); draw(); } }, tl('+ Gotowy nawóz')),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { s.items = [{ mat: 'KNO3', hyd: 0, g: 0 }]; save(); draw(); } }, tl('Wyczyść'))));
    update();
  }
  form.append(kxSec(tl('Co jest w butelce'), box), kxSec(tl('Akwarium'), tk.el), kxSec(tl('Roztwór'), kxBottle(s, () => update())));
  function update() {
    out.innerHTML = '';
    const V = tk.V(), bottle = n2(s.bottle), dose = n2(s.dose), n = kxN(s);
    if (!(V > 0 && bottle > 0 && dose > 0 && n > 0) || dose > bottle) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz objętość akwarium, butelkę, dawkę i liczbę dawek.'))); return; }
    const R = LICZ.sprawdz({ items: s.items, bottle, dose, V, custom: state.salts });
    if (R.empty) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz, ile każdego składnika jest w butelce.'))); return; }
    const sp = LICZ.splitBottles(R.items, bottle, state.salts), warn = [];
    R.sol.warn.filter(w => !/^sol_/.test(w.code || '') && !(sp && X.COMPAT_RULES.some(r => r.code === w.code))).forEach(w => warn.push([w.sev, w.t]));
    const T0 = P.targetsOf(tank()), hi = kxMain(R.p).filter(k => T0[k] && R.p[k] * n > 2 * T0[k][1]);
    if (hi.length) warn.push(['warn', `${tl('Sporo jak na tydzień: {0}. Zmniejsz dawkę.', hi.map(k => `${tl('{0} {1} mg/l, a cel to najwyżej {2}', ionL(k), gfmt(R.p[k] * n), gfmt(T0[k][1]))}`).join('; '))}`]);
    out.append(...kxAlerts(warn.filter(w => w[0] === 'bad')));
    const fix = kxFix(R.fx, { s, check: true }); if (fix) out.append(fix);
    const head = h('h2', { class: 'kx-h' }, tl('Przewidywana zmiana stężenia'));
    out.append(head, kxTable(R.items.map(i => ({ name: itName(i), amount: gfmt(i.g) + (R.items.some(x => x.fert) ? ' ' + itUnit(i) : ''), gl: i.fert ? '' : gfmt(i.g / bottle * 1000), gives: kxIons(LICZ.daje(i, { bottle, dose, V })) })), kxTO(R.items)),
      kxGain(R.p, dose, n) || '', kxExtras(R.p, n) || '', kxMethods(R.p, n) || '', h('p', { class: 'kx-note' }, `${tl('Starczy na {0} {1}, czyli około {2} dni.', fnum(bottle / dose, 0), kxPl(bottle / dose, tl('dawkę'), 'dawki', tl('dawek')), fnum(bottle / dose / n * 7, 0))}`));
    const sl = kxSplit(sp, bottle); if (sl) out.append(sl);
    const so = kxSol(R.sol.rows); if (so) out.append(so);
    out.append(...kxAlerts(warn.filter(w => w[0] !== 'bad')));
    const text = [`${tl('Butelka {0} ml, akwarium {1} l, dawka {2} ml, {3} {4} w tygodniu', fnum(bottle, 0), fnum(V, 0), fnum(dose, 2), n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, ...R.items.map(i => `- ${itName(i)}: ${gfmt(i.g)} ${itUnit(i)}`), `${tl('Po jednej dawce: +{0} mg/l', kxIons(R.p))}`, `${tl('Po tygodniu: +{0} mg/l', kxIons(R.p, kxMain(R.p), n))}`].join('\n');
    out.append(kxActions([[tl('Kopiuj wynik'), () => kxCopy(text)], [tl('Zapisz jako przepis'), () => kxSaveRecipe(R.items, bottle, tl('Moja butelka')), 'btn']]));
    kxLog('receptura', { id: 'sprawdz', items: s.items, bottle: s.bottle, dose: s.dose, n: s.n }, `${tl('Sprawdź butelkę: {0} {1} w {2} ml', R.items.length, kxPl(R.items.length, tl('składnik'), tl('składniki'), tl('składników')), fnum(bottle, 0))}`, text);
  }
  draw();
}

if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Narzędzia: nawozy, woda, testy ===== */
const S = C.SALTS, MS = C.MICRO_SALTS, nm = id => S[id] ? S[id] : (MS[id] || { f: 'EDTA 2Na·2H₂O', name: tl('Wersenian disodowy') });
const saltLbl = id => `${nm(id).f}<br><small>${nm(id).name}</small>`;
const elLbl = e => C.ION_LABEL[e] || e;

/* ---------- TWARDOŚĆ / MINERALIZATOR ---------- */
const MIN_SALTS = ['CASO4', 'CACL2', 'MGSO4_7', 'MGCL2', 'NAHCO3', 'KHCO3', 'K2SO4', 'KCl', 'KNO3', 'KH2PO4', 'CANO3', 'NH4NO3', 'NACL', 'MGSO4', 'K2CO3'];
PAGES['woda/mineral'] = root => {
  if ((state.inputs.mineral ||= {})._t !== tank().id) Object.assign(state.inputs.mineral, { _t: tank().id, vol: String(tank().V) });
  const F = Form('mineral', update), out = h('div'), modeBox = h('div'), gBox = h('div'), saltsCard = h('div');
  if (!F.s('mode') || !F.store._v710) { F.store.mode = 'salts'; F.store._v710 = 1; save(); } // 7.10: „cel → sole” liczy Mineralizacja wody (Przygotuj); tu zostaje analiza wpisanych soli
  root.append(volLine(), h('div', { html: alertH('info', (tl('To narzędzie liczy w drugą stronę: co dadzą gramy soli, które wsypałeś. Jeśli dopiero przygotowujesz wodę RO do podmiany i znasz docelowe GH i KH, użyj') + ' ' + '<a href="#/kalkulator/mineral">' + tl('Mineralizacji wody') + '</a>' + '.')) }));
  // 7.14: tylko sole, które wsypujesz – zamiast 15 pól z zerami lista z „Dodaj sól” (wartości dalej w g_<sól>, stare wpisy się pokazują)
  const saltsBox = h('div', { class: 'stack' }), sHtml = card(tl('Sole do wsypania'), 'scale', saltsBox);
  const shownSalts = () => MIN_SALTS.filter(id => (F.store.list || []).includes(id) || F.n('g_' + id) > 0);
  function drawSalts(focusId) {
    saltsBox.innerHTML = ''; const list = shownSalts(), rest = MIN_SALTS.filter(id => !list.includes(id));
    if (!list.length) saltsBox.append(h('p', { class: 'note', style: 'margin:0' }, tl('Dodaj sole, które wsypujesz do wody – zobaczysz, o ile zmieni się GH, KH i skład jonów.')));
    list.forEach(id => {
      if (F.store['g_' + id] === '0') F.store['g_' + id] = '';
      const fld = F.num('g_' + id, `${S[id].f} – ${S[id].name}`, { unit: 'g' });
      saltsBox.append(h('div', { class: 'srow2' }, fld, h('button', { type: 'button', class: 'xbtn', 'aria-label': tl('Usuń {0}', S[id].f), onclick: () => { F.store['g_' + id] = ''; F.store.list = (F.store.list || []).filter(x => x !== id); save(); drawSalts(); update(); } }, '×')));
      if (id === focusId) setTimeout(() => F.refs['g_' + id].focus(), 0);
    });
    if (rest.length) { const sel = h('select', { 'aria-label': tl('Dodaj sól') }, h('option', { value: '' }, tl('+ Dodaj sól')), rest.map(id => h('option', { value: id }, `${S[id].f} – ${S[id].name}`)));
      sel.onchange = () => { if (!sel.value) return; (F.store.list ||= []).push(sel.value); save(); drawSalts(sel.value); };
      saltsBox.append(h('span', { class: 'inp addsalt' }, sel)); }
  }
  drawSalts();
  const gHtml = card(tl('Cel zmiany twardości'), 'leaf', h('div', { class: 'grid' },
    F.num('dgh', tl('Wzrost GH'), { unit: '°dH', def: 3 }), F.num('ratio', tl('Stosunek Ca : Mg'), { unit: ': 1', def: 4 }),
    F.sel('casrc', tl('Źródło Ca'), [['CASO4', tl('CaSO₄·2H₂O (gips)')], ['CACL2', 'CaCl₂·2H₂O'], ['CANO3', 'Ca(NO₃)₂·4H₂O']], 'CASO4'),
    F.sel('mgsrc', tl('Źródło Mg'), [['MGSO4_7', 'MgSO₄·7H₂O'], ['MGCL2', 'MgCl₂·6H₂O']], 'MGSO4_7'),
    F.num('dkh', tl('Wzrost KH'), { unit: '°dH', def: 0 }), F.sel('khsrc', tl('Źródło KH'), [['NAHCO3', tl('NaHCO₃ (soda)')], ['KHCO3', 'KHCO₃']], 'NAHCO3')),
    h('div', { class: 'note' }, tl('1°dH = 7,15 mg/l Ca = 4,34 mg/l Mg.')));
  const drawMode = () => { modeBox.innerHTML = ''; modeBox.append(chips([['goal', tl('Cel → sole')], ['salts', tl('Sole → efekt')]], F.s('mode'), v => { F.store.mode = v; save(); drawMode(); update(); })); gHtml.style.display = F.s('mode') === 'goal' ? '' : 'none'; sHtml.style.display = F.s('mode') === 'salts' ? '' : 'none'; };
  root.append(card(tl('Tryb'), 'mix', modeBox, h('div', { class: 'grid', style: 'margin-top:4px' }, F.num('vol', tl('Objętość wody'), { unit: tl('l'), def: tank().V, hint: tl('akwarium lub woda do podmiany') }))), gHtml, sHtml, card(tl('Wynik'), 'chart', out));
  function update() {
    const vol = F.n('vol') || tank().V;
    if (F.s('mode') === 'goal') {
      const dgh = F.n('dgh'), ra = F.n('ratio') || 4, g = {};
      const mg = dgh / (ra / C.TWARDOSC.CaPerDH + 1 / C.TWARDOSC.MgPerDH), ca = mg * ra;
      if (dgh > 0) { g[F.s('casrc')] = ca * vol / 1000 / C.fracOf(F.s('casrc'), 'Ca'); g[F.s('mgsrc')] = mg * vol / 1000 / C.fracOf(F.s('mgsrc'), 'Mg'); }
      if (F.n('dkh') > 0) g[F.s('khsrc')] = F.n('dkh') * C.TWARDOSC.HCO3perDH * vol / 1000 / C.fracOf(F.s('khsrc'), 'HCO3');
      const m = C.mixToIons(vol, g);
      out.innerHTML = (Object.keys(g).length ? table([tl('Sól'), tl('Wsypać')], Object.keys(g).map(id => [saltLbl(id), { v: gfmt(g[id]) + ' g', big: 1 }])) + `<div class="note">${tl('Na {0} l wody. Efekt: Ca {1}, Mg {2}, Na {3}, K {4} mg/l · SO₄ {5}, Cl {6}, NO₃ {7} mg/l.', fnum(vol, 0), gfmt(m.ppm.Ca), gfmt(m.ppm.Mg), gfmt(m.ppm.Na), gfmt(m.ppm.K), gfmt(m.ppm.SO4), gfmt(m.ppm.Cl), gfmt(m.ppm.NO3))}</div>` : ('<div class="note" style="margin:0">' + tl('Podaj wzrost GH i/lub KH.') + '</div>')) +
        (g.CASO4 ? alertH('info', `${tl('CaSO₄: maks. ok. 2 g/l, rozpuszcza się wolno.')}`) : '') +
        (m.ppm.SO4 > 200 ? alertH('warn', tl('Siarczany powyżej ok. 200 mg/l – lepiej część soli zastąpić chlorkami.')) : '') + (m.ppm.Cl > 150 ? alertH('warn', tl('Chlorki powyżej ok. 150 mg/l – lepiej zmienić część soli na siarczany.')) : '');
    } else {
      const g = {}; MIN_SALTS.forEach(id => g[id] = F.n('g_' + id));
      const m = C.mixToIons(vol, g);
      const any = Object.values(g).some(x => x > 0);
      const ions = C.IONS.filter(i => m.ppm[i] > 0);
      out.innerHTML = !any ? ('<div class="note" style="margin:0">' + tl('Wpisz gramy soli powyżej.') + '</div>') :
        `<div class="grid"><div><div class="lbl" style="font-size:12px;color:var(--mut)">${tl('Zmiana GH')}</div><div class="bigstat"><b>${fnum(m.dGH, 2)}</b><span>°dH</span></div></div><div><div class="lbl" style="font-size:12px;color:var(--mut)">${tl('Zmiana KH')}</div><div class="bigstat"><b>${fnum(m.dKH, 2)}</b><span>°dH</span></div></div></div>` +
        table([tl('Jon'), tl('mg/l')], ions.map(i => [elLbl(i), gfmt(m.ppm[i])])) + (m.ppm.Ca > 0 && m.ppm.Mg > 0 ? `<div class="kv"><span>Ca : Mg</span><b>${fnum(m.ppm.Ca / m.ppm.Mg, 1)} : 1</b></div>` : '') +
        (m.ppm.SO4 > 200 ? alertH('warn', tl('Siarczany > 200 mg/l.')) : '') + (m.ppm.Cl > 150 ? alertH('warn', tl('Chlorki > 150 mg/l.')) : '');
    }
  }
  drawMode(); update();
};

/* ---------- KWAS / KH ---------- */
// ostrzeżenia zależne od kwasu; słabszy zamiennik: ocet (kwas octowy)
function acidSafety(key, short) {
  const base = tl('Okulary i rękawice, wentylacja. Zawsze kwas do wody, nigdy odwrotnie. Trzymaj z dala od dzieci i zwierząt.');
  const per = { HCl: tl('Stężony HCl (36%) wydziela żrące opary – otwieraj przy otwartym oknie.'), H2SO4: tl('H₂SO₄ bardzo mocno się nagrzewa przy rozcieńczaniu i powoduje poważne oparzenia. Zdecydowanie lepiej użyć octu.'),
    HNO3: tl('HNO₃ jest silnym utleniaczem i dodaje azotany do wody. Lepiej użyć octu.'), H3PO4: tl('H₃PO₄ dodaje fosforany do akwarium – uwzględnij je w nawożeniu.'), AcOH: tl('Ocet jest najłagodniejszy w tej liście; stężony (kwas octowy lodowaty) już nie.') }[key] || '';
  if (short) return alertH(key === 'AcOH' ? 'info' : 'warn', base + ' ' + per);
  return alertH(key === 'AcOH' ? 'info' : 'bad', base + ' ' + per + (key === 'AcOH' ? '' : tl(' Wybierz ocet 10%, jeśli nie musisz użyć mocniejszego kwasu. Maks. 10%, do wody na podmianę.')));
}
PAGES['woda/kwas'] = root => {
  if ((state.inputs.kwas ||= {})._t !== tank().id) Object.assign(state.inputs.kwas, { _t: tank().id, vol: String(tank().V) });
  const F = Form('kwas', update), F2 = Form('kwas2', upd2), out = h('div'), out2 = h('div'); let lastAcid = null;
  const acidOpts = Object.entries(C.ACIDS).map(([k, v]) => [k, v.name]);
  root.append(volLine());
  const safe = h('div');
  root.append(safe);
  root.append(card(tl('Obniżanie twardości węglanowej (KH)'), 'acid', h('div', { class: 'grid' },
    F.num('vol', tl('Objętość wody'), { unit: tl('l'), def: tank().V }), F.num('ph', tl('Aktualne pH'), { def: 7 }),
    F.num('kh0', tl('KH teraz'), { unit: '°dH', def: 8 }), F.num('kh1', tl('KH docelowe'), { unit: '°dH', def: 5 }),
    F.sel('acid', tl('Kwas'), acidOpts, 'AcOH'), F.num('pct', tl('Stężenie kwasu'), { unit: '%', def: 10 }))), card(tl('Ile kwasu'), 'flask', out));
  root.append(card(tl('Rozcieńczanie kwasu'), 'drop', h('div', { class: 'grid' }, F2.sel('acid', tl('Kwas'), acidOpts, 'AcOH'), F2.num('vf', tl('Chcę uzyskać'), { unit: 'ml', def: 500 }), F2.num('c1', tl('Stężenie zakupionego'), { unit: '%', def: 10 }), F2.num('c2', tl('Stężenie docelowe'), { unit: '%', def: 5 })), out2));
  function update() {
    if (lastAcid !== null && lastAcid !== F.s('acid')) F.set('pct', C.ACIDS[F.s('acid')].def);
    lastAcid = F.s('acid');
    safe.innerHTML = acidSafety(lastAcid);
    const vol = F.n('vol'), ph = F.n('ph'), kh0 = F.n('kh0'), kh1 = F.n('kh1'), pct = F.n('pct') || 1;
    const r = C.acidForKH({ V: vol, khFrom: kh0, khTo: kh1, acid: F.s('acid'), pct, pH: ph || null });
    let h2 = '';
    if (r.d <= 0) h2 = ('<div class="note" style="margin:0">' + tl('KH docelowe musi być niższe niż obecne.') + '</div>');
    else {
      h2 = `<div class="bigstat"><b>${fnum(r.ml, r.ml < 10 ? 2 : 1)}</b><span>${tl('ml roztworu {0}% ({1} g czystego)', fnum(pct, 0), fnum(r.gPure, 2))}</span></div>` +
        `<div class="kv"><span>${tl('Spadek KH')}</span><b>${fnum(r.d, 1)} °dH</b></div><div class="kv"><span>${tl('Wydzieli się CO₂')}</span>${tl('<b>{0} mg/l</b>', fnum(r.co2add, 0))}</div>` +
        (r.pHafter ? `<div class="kv"><span>${tl('pH tuż po (zanim CO₂ ulotni się)')}</span><b>${fnum(r.pHafter, 2)} <small>(${r.dpH > 0 ? '+' : ''}${fnum(r.dpH, 2)})</small></b></div>` : '') +
        (F.s('acid') === 'H3PO4' ? `<div class="note">${tl('H₃PO₄: przyjęto {0} H⁺ na cząsteczkę (drugi proton reaguje częściowo przy pH ok. {1}). Doda też ok. {2} mg/l PO₄ – uwzględnij w nawożeniu.', fnum(r.protons, 2), fnum(r.pHafter || 6.8, 1), fnum(r.mmol / r.protons * 94.97 / vol, 1))}</div>` : '');
      if (kh1 < 3) h2 += alertH('bad', tl('KH < 3°dH – ryzyko nagłego spadku pH.'));
      if (F.s('acid') !== 'AcOH') { const r2 = C.acidForKH({ V: vol, khFrom: kh0, khTo: kh1, acid: 'AcOH', pct: 10, pH: ph || null });
        h2 += `<div class="addsep">${tl('<b>Bezpieczniejsza opcja: ocet 10%</b>Ok. {0} ml octu 10% zamiast kwasu {1}. Ocet jest słabszy i trudniej o gwałtowny spadek pH, ale dodaje węgiel organiczny (bakterie, mętnienie) – dawkuj porcjami i testuj pH.', fnum(r2.ml, r2.ml < 10 ? 2 : 1), esc(C.ACIDS[F.s('acid')].name))}</div>`; }
      if (r.dpH !== null && r.dpH < -0.3) { const days = Math.ceil(-r.dpH / 0.3); h2 += alertH('warn', `${tl('Spadek pH przekracza zalecane 0,3 na dobę. Rozbij na ok. {0} dni (po ~{1} ml dziennie), testuj pH i KH przed każdą porcją.', days, fnum(r.ml / days, 1))}`); }
      if (r.co2add + (r.co2before || 0) > 50) h2 += alertH('warn', tl('Chwilowo CO₂ > 50 mg/l – napowietrzaj.'));
      h2 += `<div class="note">${tl('Obliczenie zakłada, że KH tworzą wyłącznie wodorowęglany. {0}Rozważ dodanie do wody do podmiany (kilka–kilkanaście litrów).', F.s('acid') === 'AcOH' ? tl('Ocet jest kwasem słabym – wynik przybliżony. ') : '')}</div>`;
    }
    out.innerHTML = h2;
  }
  function upd2() {
    const r = C.dilute({ acid: F2.s('acid'), c1: F2.n('c1') || 1, c2: F2.n('c2') || 1, vFinal: F2.n('vf') });
    if (F2.n('c2') >= F2.n('c1')) { out2.innerHTML = ('<div class="note" style="margin:10px 0 0">' + tl('Stężenie docelowe musi być niższe niż zakupionego.') + '</div>'); return; }
    out2.innerHTML = `<div class="kv"><span>${tl('Odmierz kwasu {0}%', fnum(F2.n('c1'), 0))}</span><b>${fnum(r.stockMl, r.stockMl < 10 ? 2 : 1)} ml</b></div><div class="kv"><span>${tl('Wlej do wody')}</span><b>${fnum(r.waterMl, 0)} ml</b></div>` +
      acidSafety(F2.s('acid'), true);
  }
  update(); upd2();
};

/* ---------- NARASTANIE SOLI PRZY PODMIANACH ----------
   Dotyczy jonów, których rośliny praktycznie nie pobierają (SO₄, Cl, Na) oraz twardości: c = c·(1−p) + p·c_woda + dodatek.
   Dla NO₃/PO₄/K/Fe wynik byłby tylko sufitem – ich stan pokazuje test, nie model. Pobór domyślnie 0. */
const ACC_KEYS = [['SO4', 'SO₄', tl('mg/l')], ['Cl', 'Cl', tl('mg/l')], ['Na', 'Na', tl('mg/l')], ['GH', 'GH', '°dH'], ['KH', 'KH', '°dH']];
function accDefaults(k) { // woda do podmian z profilu + tygodniowy dodatek z planu nawożenia
  const t = tank(), r = P.planTotals(t.fplan, productById, t.V), d = X.derived(r.total);
  const add = k === 'GH' || k === 'KH' ? d[k] || 0 : r.total[k] || 0;
  return { cw: P.tapOf(t, k), add };
}
PAGES['woda/kumulacja'] = root => {
  const F = Form('kum', update), out = h('div'), kb = h('div'), fields = h('div');
  if (!ACC_KEYS.some(([k]) => k === F.store.k)) F.store.k = 'SO4';
  const unitOf = () => ACC_KEYS.find(([k]) => k === F.store.k)[2];
  const pick = k => { const d = accDefaults(k); Object.assign(F.store, { k, cw: gfmt(d.cw).replace(/\s/g, ''), add: gfmt(d.add).replace(/\s/g, ''), use: '0' }); save(); draw(); };
  const draw = () => {
    kb.innerHTML = ''; kb.append(chips(ACC_KEYS.map(([k, l]) => [k, l]), F.store.k, pick));
    fields.innerHTML = ''; const u = unitOf();
    fields.append(h('div', { class: 'grid' }, F.num('p', tl('Podmiana tygodniowo'), { unit: '%', def: tank().change }), F.num('c0', tl('Teraz w akwarium'), { unit: u, def: 0, hint: tl('z testu lub analizy') }),
      F.num('cw', tl('W wodzie do podmian'), { unit: u, def: 0, hint: tl('z profilu zbiornika; RO ≈ 0') }), F.num('add', tl('Dodatek / tydzień'), { unit: u, def: 0, hint: tl('z planu nawożenia') }),
      F.num('wk', tl('Liczba tygodni'), { def: 26 })),
      h('details', { class: 'inner' }, h('summary', {}, tl('Pobór (zwykle 0)')), h('div', { style: 'margin-top:10px' }, F.num('use', tl('Ubywa tygodniowo'), { unit: u, def: 0, hint: tl('tylko jeśli znasz z testów') }))));
    update();
  };
  root.append(volLine(), card(tl('Co narasta'), 'wave', h('div', { class: 'sub' }, tl('Sole, których rośliny prawie nie pobierają. Wartości startowe z profilu i planu nawożenia.')), kb, fields), card(tl('Przebieg w czasie'), 'chart', out));
  function update() {
    const p = Math.min(F.n('p'), 100) / 100, weeks = Math.min(Math.max(Math.round(F.n('wk')) || 26, 1), 104), u = unitOf();
    const r = C.accumulate({ p, c0: F.n('c0'), cw: F.n('cw'), add: F.n('add'), use: F.n('use'), weeks });
    const pts = r.arr.map((y, i) => ({ x: i === 0 ? 'start' : String(i), y }));
    let reach = null; const tgt = r.steady, c0 = F.n('c0');
    if (isFinite(tgt) && tgt >= 0) for (let i = 0; i < r.arr.length; i++) if (Math.abs(r.arr[i] - tgt) <= 0.05 * Math.max(Math.abs(tgt - c0), 0.0001)) { reach = i; break; }
    if (!(p > 0)) { out.innerHTML = alertH('warn', tl('Bez podmian sól narasta bez końca – wpisz % podmiany.')); return; }
    out.innerHTML = ('' + lineChart(pts, { ref: isFinite(tgt) ? tgt : undefined, label: tl('narastanie') }) + `<div class="kv"><span>${tl('Ustali się na')}</span><b>${isFinite(tgt) ? fnum(Math.max(tgt, 0), 1) : '—'} ${u}</b></div>` + `<div class="kv"><span>${tl('Po {0} tyg.', weeks)}</span><b>${fnum(r.arr[r.arr.length - 1], 1)} ${u}</b></div>` + (reach != null ? `<div class="kv"><span>${tl('95% tej wartości po')}</span>${tl('<b>{0} tyg.</b>', reach)}</div>` : '') + '<div class="note">' + tl('Co tydzień: podmiana rozcieńcza, nawóz dodaje. Linia przerywana: wartość, na której się ustali. Większa podmiana = niższy poziom.') + '</div>');
  }
  draw();
};

/* ---------- CO2 ---------- */
PAGES['woda/co2'] = root => {
  const F = Form('co2', update), out = h('div'), tbl = h('div');
  root.append(card(tl('pH i KH'), 'co2', h('div', { class: 'grid3' }, F.num('ph', 'pH', { def: 6.8 }), F.num('kh', 'KH', { unit: '°dH', def: 4 }), F.num('tg', tl('Cel CO₂'), { unit: tl('mg/l'), def: 25 }))), card(tl('Stężenie CO₂'), 'chart', out), h('details', { class: 'card' }, h('summary', {}, tl('Tabela CO₂ (dla ciekawych)')), tbl));
  function update() {
    const ph = F.n('ph'), kh = F.n('kh'), v = C.co2(ph, kh);
    const st = v < 15 ? ['info', tl('Za mało dla roślin wymagających CO₂ (zwykle 15–35 mg/l).')] : v <= 35 ? ['ok', tl('Zakres typowy dla akwariów roślinnych (15–35 mg/l).')] : v <= 50 ? ['warn', tl('Wysokie stężenie – obserwuj ryby, zwłaszcza w nocy.')] : ['bad', tl('Niebezpiecznie wysokie dla ryb – zmniejsz dozowanie i napowietrz.')];
    const [rl, rh] = C.co2Range(ph, kh);
    out.innerHTML = ('' + `<div class="bigstat"><b>${fnum(rl, 0)}–${fnum(rh, 0)}</b><span>${tl('mg/l CO₂ (środek {0})', fnum(v, 1))}</span></div>` + alertH(st[0], st[1]) + `<div class="kv"><span>${tl('pH dla celu {0} mg/l (przy KH {1})', fnum(F.n('tg'), 0), fnum(kh, 1))}</span><b>${fnum(C.phForCo2(F.n('tg') || 25, kh), 2)}</b></div>` + '<div class="note">' + tl('CO₂ = 3 · KH · 10<sup>(7 − pH)</sup>. Pasmo: pH ±0,1 i KH ±0,5 °dH – typowa dokładność testów kropelkowych. Bez butli zwykle 3–10 mg/l; torf, liście i aktywne podłoże zawyżają wynik.') + '</div>');
    const phs = []; for (let x = 6.0; x <= 7.601; x += 0.1) phs.push(Math.round(x * 10) / 10);
    let t = '<div class="heat"><table><tr><th>pH\\KH</th>' + [1, 2, 3, 4, 5, 6, 8, 10, 12].map(k => `<th>${k}</th>`).join('') + '</tr>';
    phs.forEach(p => { t += `<tr><th>${p.toFixed(1)}</th>` + [1, 2, 3, 4, 5, 6, 8, 10, 12].map(k => { const c = C.co2(p, k), cl = c < 15 ? tl('l') : c <= 35 ? 'o' : c <= 50 ? 'h' : 'd'; return `<td class="${cl}${Math.abs(p - ph) < 0.05 && k === Math.round(kh) ? ' cur' : ''}">${fnum(c, c < 10 ? 1 : 0)}</td>`; }).join('') + '</tr>'; });
    tbl.innerHTML = (t + '</table>' + '</div>' + '<div class="note">' + tl('Niebieskie: &lt; 15 · zielone: 15–35 · pomarańczowe: 35–50 · czerwone: &gt; 50 mg/l.') + '</div>');
  }
  update();
};

/* ---------- MIARECZKOWANIE ---------- */
PAGES['pomiary/miareczkowanie'] = root => {
  const F = Form('titr', update), o1 = h('div'), o2 = h('div');
  root.append(h('div', { class: 'alert info', html: (icon('info', 18) + '<div>' + tl('KH – HCl, GH/Ca – EDTA. Wpisz ml z biurety.') + '</div>') }),
    h('div', { html: alertH('warn', tl('Do miareczkowania użyj rozcieńczonego HCl (0,02 mol/l, ok. 0,07%) kupionego jako odczynnik. Stężonego kwasu solnego nie rozcieńczaj na oko – okulary, rękawice, kwas do wody. Zużyty roztwór wylej z dużą ilością wody.')) }));
  root.append(card(tl('Twardość węglanowa KH'), 'test', h('div', { class: 'grid3' }, F.num('vw', tl('Próbka wody'), { unit: 'ml', def: 25 }), F.num('vh', tl('Zużyty HCl'), { unit: 'ml', def: 1.8 }), F.num('ch', tl('Stężenie HCl'), { unit: 'mol/l', def: 0.02 }),
    F.num('ew', tl('Błąd pipety'), { unit: 'ml', def: 0.05 }), F.num('et', tl('Błąd biurety'), { unit: 'ml', def: 0.1 })), o1));
  root.append(card(tl('Twardość ogólna GH, Ca, Mg'), 'test', h('div', { class: 'grid3' }, F.num('gw', tl('Próbka (Ca+Mg)'), { unit: 'ml', def: 25 }), F.num('ge', tl('Zużyty EDTA'), { unit: 'ml', def: 3.7 }), F.num('gc', tl('Stężenie EDTA'), { unit: 'mol/l', def: 0.01 }),
    F.num('cw', tl('Próbka (Ca)'), { unit: 'ml', def: 25 }), F.num('ce', tl('EDTA na Ca'), { unit: 'ml', def: 3.3 }), F.num('ge2', tl('Błąd biurety'), { unit: 'ml', def: 0.05 })), o2));
  root.append(h('details', { class: 'card' }, h('summary', {}, tl('Standardowa procedura')), h('div', { class: 'prose' },
    h('p', { html: tl('<b>KH:</b> do 25 ml wody (pipeta) dodaj kilka kropli barwnika KH. Dodawaj kwas z biurety, mieszając, do pierwszej zmiany barwy (żółta → łososiowa).') }),
    h('p', { html: tl('<b>GH (Ca+Mg):</b> 25 ml wody + bufor GH + barwnik; dodawaj EDTA do zmiany z różowej na niebieską (nie fioletową).') }),
    h('p', { html: tl('<b>Ca:</b> 25 ml wody + bufor Ca, barwnik tuż przed pomiarem; EDTA do zmiany z różowej na niebieską. Mg = różnica GH i Ca.') }),
    h('p', { html: tl('Błąd wyniku liczony z dokładności pipety i biurety.') }))));
  function update() {
    const k = F.n('vw') > 0 && F.n('vh') > 0 ? C.titrKH(F.n('vw'), F.n('vh'), F.n('ch'), F.n('ew'), F.n('et')) : null;
    o1.innerHTML = k ? `<div class="bigstat"><b>${fnum(k.dKH, 2)}</b><span>± ${fnum(k.err, 2)} °dH</span></div><div class="note" style="margin-top:0">${tl('≈ {0} mg/l CaCO₃ · {1} mg/l HCO₃', fnum(k.dKH * 17.848, 0), fnum(k.dKH * C.TWARDOSC.HCO3perDH, 0))}</div>` : ('<div class="note" style="margin:10px 0 0">' + tl('Wpisz objętości.') + '</div>');
    const ok = F.n('gw') > 0 && F.n('ge') > 0 && F.n('cw') > 0 && F.n('ce') > 0;
    if (!ok) { o2.innerHTML = ('<div class="note" style="margin:10px 0 0">' + tl('Wpisz objętości.') + '</div>'); return; }
    const g = C.titrGH({ vw: F.n('gw'), vE: F.n('ge'), cE: F.n('gc'), vwCa: F.n('cw'), vECa: F.n('ce'), eT: F.n('ge2') });
    o2.innerHTML = `<div class="grid"><div><div class="bigstat"><b>${fnum(g.gh, 2)}</b><span>± ${fnum(g.ghErr, 2)} °dH</span></div><small class="hint">${tl('GH ogólna')}</small></div></div>` +
      `<div class="kv"><span>${tl('Wapń Ca')}</span>${tl('<b>{0} ± {1} mg/l</b>', fnum(g.ca, 1), fnum(g.caErr, 1))}</div><div class="kv"><span>${tl('Magnez Mg')}</span>${tl('<b>{0} mg/l</b>', g.mg >= 0 ? fnum(g.mg, 2) + ' ± ' + fnum(g.mgErr, 2) : '—')}</div>` +
      `<div class="kv"><span>${tl('GH z Ca / z Mg')}</span><b>${fnum(g.ghCa, 2)} / ${fnum(g.ghMg, 2)} °dH</b></div>` + (g.ratio ? `<div class="kv"><span>${tl('Stosunek Ca : Mg')}</span><b>${fnum(g.ratio, 1)} : 1</b></div>` : '') +
      (g.mg < 0 ? alertH('warn', tl('Mg wyszło ujemne – EDTA na Ca przekracza EDTA na GH. Powtórz pomiar.')) : '') +
      (g.ratio && (g.ratio > 6 || g.ratio < 2) ? alertH('info', `Ca : Mg = ${fnum(g.ratio, 1)} : 1.`) : '');
  }
  update();
};

/* ---------- PRZELICZNIKI ---------- */
PAGES['pomiary/jednostki'] = root => {
  const F = Form('jedn', update), out = h('div');
  const dhPer = { dh: 1, f: 1 / 1.7848, e: 1 / 1.2521, ppm: 1 / 17.848, mmol: 5.6077, meq: 2.8039 };
  const labels = [['dh', tl('°dH (niemieckie)')], ['f', tl('°f (francuskie)')], ['e', tl('°e (angielskie)')], ['ppm', tl('mg/l CaCO₃ (ppm)')], ['mmol', tl('mmol/l')], ['meq', 'mval/l']];
  root.append(card(tl('Twardość wody'), 'scale', h('div', { class: 'grid' }, F.num('v', tl('Wartość'), { def: 8 }), F.sel('u', tl('Jednostka'), labels, 'dh')), out));
  const pairs = [['NO₃', 'N-NO₃', C.MM.N / C.MM.NO3], ['NH₄', 'N-NH₄', C.MM.N / C.MM.NH4], ['PO₄', 'P', C.MM.P / C.MM.PO4], ['P₂O₅', 'PO₄', 2 * C.MM.PO4 / C.MM.P2O5], ['K₂O', 'K', 2 * C.MM.K / C.MM.K2O], ['MgO', 'Mg', C.MM.Mg / C.MM.MgO], ['CaO', 'Ca', C.MM.Ca / C.MM.CaO]];
  const pbox = card(tl('Formy pierwiastków'), 'swap', h('div', { class: 'sub' }, tl('Wpisz w dowolne pole – drugie przeliczy się samo.')));
  pairs.forEach(([a, b, k]) => {
    const ia = h('input', { type: 'text', inputmode: 'decimal', value: '1' }), ib = h('input', { type: 'text', inputmode: 'decimal', value: fnum(k, 4).replace(/\s/g, '') });
    const num = e => parseFloat(e.value.replace(',', '.'));
    ia.oninput = () => { const x = num(ia); ib.value = isFinite(x) ? +(x * k).toPrecision(5) : ''; }; ib.oninput = () => { const x = num(ib); ia.value = isFinite(x) ? +(x / k).toPrecision(5) : ''; };
    pbox.append(h('div', { class: 'grid', style: 'margin-bottom:8px' }, h('label', { class: 'field' }, h('span', { class: 'lbl' }, a), h('span', { class: 'inp' }, ia, h('i', { class: 'unit' }, 'mg'))), h('label', { class: 'field' }, h('span', { class: 'lbl' }, b), h('span', { class: 'inp' }, ib, h('i', { class: 'unit' }, 'mg')))));
  });
  root.append(pbox);
  function update() {
    const dh = F.n('v') * dhPer[F.s('u')];
    out.innerHTML = '<div style="margin-top:10px">' + labels.map(([k, t]) => `<div class="kv"><span>${t}</span><b>${fnum(dh / dhPer[k], k === 'mmol' || k === 'meq' ? 3 : 2)}</b></div>`).join('') + '</div>' +
      `<div class="note">${tl('1°dH = 10 mg/l CaO = 17,85 mg/l CaCO₃. Dla KH: 1°dH ≈ {0} mg/l HCO₃. Dla GH: 1°dH ≈ {1} mg/l Ca lub {2} mg/l Mg.', fnum(C.TWARDOSC.HCO3perDH, 1), fnum(C.TWARDOSC.CaPerDH, 2), fnum(C.TWARDOSC.MgPerDH, 2))}</div>`;
  }
  update();
};



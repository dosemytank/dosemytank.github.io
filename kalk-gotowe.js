if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Kalkulator 7.0 – Gotowe nawozy: dawka → mg/l albo cel → dawka; porównanie do 3 produktów; własny produkt z etykiety =====
   Bez soli i receptur: ogrodnicze mieszanki i chelaty są źródłem w Mikro, nawozy z receptur – w Recepturach. */
const KX_COMP = ['NO3', 'NH4', 'PO4', 'K', 'Mg', 'Ca', 'Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'];
const kxReady = () => allProducts().filter(p => p.source !== 'recipe' && !p.rid && !LICZ.isMicroConc(p));
const kxUnit = p => p && p.unit === 'g' ? 'g' : 'ml';

KX.gotowe = root => {
  const s = kxState().gotowe, list = kxReady(); s.cmp ||= []; s.way ||= 'maker'; s.per ||= 'week';
  if (!list.some(p => p.id === s.pid)) s.pid = (list.find(p => p.status === 'label' && Object.keys(p.ppm || {}).length) || list.find(p => Object.keys(p.ppm || {}).length) || list[0] || {}).id || '';
  s.cmp = s.cmp.filter(id => list.some(p => p.id === id));
  const { form, out } = kxLayout(root), tk = kxTank(s, () => update()); out.classList.add('kn-result');
  const prodBox = h('div', { class: 'stack' }), modeBox = h('div', { class: 'stack' }), powBox = h('div');
  const cur = () => productById(s.pid);
  // wybór nawozu: wyszukiwarka (nazwa, producent, rodzaj, składnik) i filtr rodzaju; lista kart zamiast dwóch list rozwijanych
  const KIND = Object.fromEntries(LICZ.GOT_KIND), kindOf = p => LICZ.gotKind(p);
  const mainLine = p => Object.entries(p.ppm || {}).filter(([k, v]) => v > 0 && !['SO4', 'Cl', 'Na', 'HCO3'].includes(k)).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => ionL(k)).join(', ');
  function drawProd() {
    prodBox.innerHTML = '';
    const p0 = cur(), q = s.q || '', kf = s.kind || '';
    const qi = h('input', { type: 'search', 'aria-label': tl('Szukaj nawozu'), placeholder: tl('Szukaj: nazwa, producent, „żelazo”, „potas”…'), value: q });
    qi.oninput = () => { s.q = qi.value; save(); drawList(); };
    const kinds = [['', tl('Wszystkie')], ...LICZ.GOT_KIND.filter(([k]) => list.some(p => kindOf(p) === k)), ...(list.some(p => p.source !== 'builtin') ? [['mine', tl('Moje')]] : [])];
    const listBox = h('div', { class: 'kg-list', role: 'listbox', 'aria-label': tl('Nawozy') });
    function drawList() {
      listBox.innerHTML = '';
      const f = list.filter(p => (!s.kind || (s.kind === 'mine' ? p.source !== 'builtin' : kindOf(p) === s.kind)) && LICZ.gotMatch(p, s.q || '')).sort((x, y) => x.name.localeCompare(y.name, 'pl'));
      if (!f.length) { listBox.append(h('p', { class: 'kx-empty' }, tl('Nic nie pasuje. Zmień wyszukiwanie albo dodaj swój nawóz z etykiety.'))); return; }
      f.forEach(p => { const on = p.id === s.pid, unv = p.status === 'unverified', none = !Object.keys(p.ppm || {}).length;
        listBox.append(h('button', { type: 'button', role: 'option', 'aria-selected': String(on), class: 'kg-item' + (on ? ' on' : ''), onclick: () => { s.pid = p.id; s.pick = false; save(); drawProd(); drawMode(); update(); } },
          h('span', { class: 'kg-name' }, h('b', {}, p.name), h('small', {}, [p.producer, KIND[kindOf(p)]].filter(Boolean).join(' · '))),
          h('span', { class: 'kg-meta' }, none ? tl('brak składu') : mainLine(p), unv ? h('em', { class: 'kg-warn' }, tl('skład orientacyjny')) : null, LICZ.gotDoz(p) ? h('em', {}, tl('dawka producenta')) : null))); });
    }
    const picking = s.pick || !p0;
    if (picking) {
      prodBox.append(qi, h('div', { class: 'kg-kinds' }, kxChoice(kinds, kf, v => { s.kind = v; save(); drawProd(); }, tl('Rodzaj nawozu'))), listBox,
        h('div', { class: 'kx-acts' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => kxLabelSheet(id => { s.pid = id; s.pick = false; save(); render.keepScroll = true; render(); }) }, tl('+ Mój nawóz z etykiety')),
          p0 ? h('button', { class: 'linkbtn', type: 'button', onclick: () => { s.pick = false; save(); drawProd(); } }, tl('Anuluj')) : null));
      drawList(); requestAnimationFrame(() => { const on = listBox.querySelector('.on'); if (on) listBox.scrollTop = on.offsetTop - listBox.offsetTop - 8; });
      return;
    }
    if (p0) {
      const has = p0.ppm || {}, unv = p0.status === 'unverified', u = kxUnit(p0), dz = LICZ.gotDoz(p0);
      prodBox.append(h('div', { class: 'kg-sel' }, h('div', { class: 'kg-sel-h' }, h('div', {}, h('b', {}, p0.name), h('small', {}, [p0.producer, KIND[kindOf(p0)], u === 'g' ? tl('proszek') : tl('płyn')].filter(Boolean).join(' · '))),
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => { s.pick = true; save(); drawProd(); prodBox.querySelector('input[type=search]')?.focus(); } }, tl('Zmień nawóz'))),
        h('p', { class: 'kg-sel-m' }, Object.keys(has).length ? tl('Zawiera: {0}', mainLine(p0)) : tl('Brak składu'), ' ', pstat(p0), p0.src ? h('a', { href: p0.src, target: '_blank', rel: 'noopener' }, tl('źródło')) : null),
        h('p', { class: 'kx-note' }, dz ? `${tl('Producent: {0} {1} na {2} l{3}.', fnum(dz.ml, 2), u, fnum(dz.perL, 0), dz.note ? ', ' + dz.note : '')}` : tl('Producent nie podaje dawki w bazie – wpisz swoją albo licz według celu.')),
        h('details', { class: 'kx-adv' }, h('summary', {}, tl('Pełny skład')),
          h('table', { class: 'kx-t small' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, tl('Składnik')), h('th', { scope: 'col' }, u === 'g' ? tl('mg w 1 g') : tl('mg w 1 ml')), h('th', { scope: 'col' }, `${tl('1 {0} w {1} l', u, fnum(tk.V(), 0))}`))),
            h('tbody', {}, KX_COMP.filter(k => has[k] > 0).map(k => h('tr', {}, h('th', { scope: 'row' }, ionL(k)), h('td', { class: 'num' }, gfmt(has[k])), h('td', { class: 'num' }, tl('+{0} mg/l', gfmt(has[k] / tk.V()))))))),
          p0.note ? h('p', { class: 'kx-hint' }, p0.note) : null),
        unv ? h('div', { class: 'kx-msg warn' }, tl('Producent nie podaje pełnego składu. Liczby są przybliżone – wyniki traktuj orientacyjnie i porównaj z etykietą.')) : null,
        ...LICZ.nNotes(p0).map(t => h('p', { class: 'kx-hint' }, t))));
    }
    prodBox.append(h('div', { class: 'kx-acts' }, p0 && p0.source === 'user' && typeof editProduct === 'function' ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => editProduct(p0) }, tl('Edytuj mój nawóz')) : null,
      // 7.16: porównanie widoczne od razu – po kliknięciu wybierasz drugi nawóz; lista porównywanych pod spodem
      p0 && s.cmp.filter(id => id !== p0.id).length < 2 ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (!s.cmp.includes(p0.id)) s.cmp.push(p0.id); s.pick = true; save(); drawProd(); toast(tl('Wybierz nawóz do porównania')); prodBox.querySelector('input[type=search]')?.focus(); } }, tl('Porównaj z innym nawozem')) : null));
    const others = p0 ? s.cmp.filter(id => id !== p0.id).map(productById).filter(Boolean) : [];
    if (others.length) prodBox.append(h('div', { class: 'kg-cmp' }, h('span', {}, tl('Porównujesz z:')), others.map(o => h('span', { class: 'chip small' }, o.name,
      h('button', { type: 'button', class: 'kg-cmp-x', 'aria-label': tl('Usuń z porównania {0}', o.name), onclick: () => { s.cmp = s.cmp.filter(x => x !== o.id); save(); drawProd(); update(); } }, '×'))), h('small', {}, tl('Tabela porównania jest pod wynikiem.'))));
  }
  function drawMode() {
    modeBox.innerHTML = ''; powBox.innerHTML = '';
    const p0 = cur(), u = kxUnit(p0), els = p0 ? KX_COMP.filter(k => (p0.ppm || {})[k] > 0) : [];
    const dz = LICZ.gotDoz(p0), nChk = x => x > 21 ? tl('Najwyżej 21 dawek w tygodniu') : '';
    modeBox.append(kxChoice([['maker', tl('Dawka producenta')], ['dose', tl('Moja dawka')], ['target', tl('Mam cel')]], s.way, v => { s.way = v; save(); drawMode(); update(); }, tl('Tryb')));
    if (s.way === 'maker') { const mk = (s.mk ||= {});
      // 7.12: wpisana dawka zostaje przy nawozie – wcześniej przełączenie nawozu albo trybu kasowało wpisane wartości
      if (mk._for !== p0?.id) { const by = (s.mkBy ||= {}); if (mk._for) by[mk._for] = { ml: mk.ml, perL: mk.perL, n: mk.n };
        const own = p0 && by[p0.id]; Object.assign(mk, own || { ml: dz ? String(dz.ml).replace('.', DEC) : '', perL: dz ? String(dz.perL) : '', n: dz && dz.n ? String(dz.n) : '' }, { _for: p0?.id }); save(); }
      modeBox.append(h('p', { class: 'kx-hint' }, dz ? (dz.own ? tl('Z opisu Twojego nawozu. Popraw, jeśli etykieta mówi inaczej.') : tl('Z opisu producenta. Popraw, jeśli Twoja etykieta mówi inaczej.')) : tl('Przepisz dawkę z etykiety, np. 5 ml na 100 l.')),
        h('div', { class: 'grid3' }, kxNum(mk, 'ml', tl('Producent zaleca'), u, { ph: '5', onInput: update }).el, kxNum(mk, 'perL', tl('na'), tl('l wody'), { ph: '100', onInput: update }).el,
          kxNum(mk, 'n', tl('Razy w tygodniu'), '×', { ph: dz && !dz.n ? tl('nie podaje') : '1', onInput: update, check: nChk }).el)); }
    else if (s.way === 'dose') modeBox.append(h('div', { class: 'grid' }, kxNum(s, 'ldose', tl('Dawka'), u, { ph: '5', onInput: update }).el, kxNum(s, 'n', tl('Dawek w tygodniu'), '×', { ph: '7', onInput: update, check: nChk }).el));
    else {
      if (!els.includes(s.el)) s.el = els.includes('Fe') ? 'Fe' : els[0] || 'Fe';
      const sel = h('select', { 'aria-label': tl('Składnik celu') }, els.map(k => h('option', { value: k, selected: k === s.el }, ionL(k)))); sel.onchange = () => { s.el = sel.value; save(); update(); };
      modeBox.append(kxChoice([['week', tl('w tygodniu')], ['dose', tl('jedną dawką')]], s.per, v => { s.t = LICZ.convertPer([{ t: s.t ?? '' }], s.per, v, kxN(s) || 7)[0].t; s.per = v; save(); drawMode(); update(); }, tl('Ile podnieść')),
        h('div', { class: 'grid3' }, selField(tl('Licz według'), sel), kxNum(s, 't', tl('O ile podnieść'), tl('mg/l'), { ph: '0,1', onInput: update }).el, kxNum(s, 'n', tl('Dawek w tygodniu'), '×', { ph: '7', onInput: update, check: x => x > 21 ? tl('Najwyżej 21 dawek w tygodniu') : '' }).el));
    }
    if (p0 && u === 'g') { const pw = (s.pow ||= { on: false, bottle: '500', dose: '10', amt: '' });
      const d = h('details', { class: 'kx-adv', open: pw.on }, h('summary', {}, tl('Rozpuszczam proszek w butelce')),
        h('div', { class: 'grid3' }, kxNum(pw, 'bottle', tl('Butelka'), 'ml', { ph: '500', onInput: update }).el, kxNum(pw, 'dose', tl('Dawka roztworu'), 'ml', { ph: '10', onInput: update }).el,
          s.way === 'dose' ? kxNum(pw, 'amt', tl('Proszku do butelki'), 'g', { ph: '5', onInput: update }).el : null));
      d.addEventListener('toggle', () => { pw.on = d.open; save(); update(); }); powBox.append(d); }
  }
  const step = (n, title, ...body) => h('section', { class: 'kn-step' }, h('h2', { class: 'kn-h' }, h('span', { class: 'kn-n' }, String(n)), title), h('div', { class: 'kn-body' }, ...body));
  form.append(step(1, tl('Nawóz'), prodBox), step(2, tl('Akwarium i dawka'), tk.el, modeBox, powBox));

  function update() {
    out.innerHTML = '';
    const p0 = cur(), V = tk.V(), mk = s.mk || {}, maker = s.way === 'maker', n = maker ? (Math.round(n2(mk.n)) || 1) : kxN(s);
    const mkDose = maker && n2(mk.ml) > 0 && n2(mk.perL) > 0 ? n2(mk.ml) * V / n2(mk.perL) : NaN;
    if (!p0) { out.append(h('p', { class: 'kx-empty' }, tl('Wybierz nawóz albo dodaj swój z etykiety.'))); return; }
    if (!Object.keys(p0.ppm || {}).length) { out.append(h('p', { class: 'kx-empty' }, tl('Ten nawóz nie ma wpisanego składu. Uzupełnij go w Bazie nawozów.'))); return; }
    if (!(V > 0 && n > 0)) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz objętość akwarium i liczbę dawek.'))); return; }
    const u = kxUnit(p0), pw = s.pow || {}, tPer = n2(s.t) > 0 ? (s.per === 'dose' ? n2(s.t) : n2(s.t) / n) : NaN, warn = [];
    let perDose, amount, hd, text = [];
    const freqT = k => k === 1 ? tl('raz w tygodniu') : k === 7 ? tl('codziennie') : `${tl('{0} razy w tygodniu', k)}`;
    if (u === 'g' && pw.on) { // proszek rozpuszczony w butelce
      const B = n2(pw.bottle), d = n2(pw.dose);
      if (!(B > 0 && d > 0) || d > B) { out.append(h('p', { class: 'kx-empty' }, tl('Wpisz butelkę i dawkę roztworu.'))); return; }
      const R = LICZ.produktButelka({ ppm: p0.ppm, V, B, d, n, way: s.way === 'target' ? 'target' : 'amount', el: s.el, t: String(tPer * n), amt: pw.amt });
      if (R.err) { out.append(h('p', { class: 'kx-empty' }, R.err === 'target' ? tl('Wpisz, o ile chcesz podnieść.') : tl('Wpisz, ile proszku dajesz do butelki.'))); return; }
      perDose = R.per; amount = d; hd = h('div', { class: 'kn-result-h' }, h('h2', {}, `${tl('Do butelki {0} ml', fnum(B, 0))}`), h('p', { class: 'kn-big' }, h('b', {}, `${gfmt(R.A)} g`), h('span', {}, tl('proszku'))), h('p', {}, `${tl('{0} · dawka roztworu {1} ml, {2}', p0.name, fnum(d, 2), freqT(n))}`));
      out.append(hd, kxTable([{ name: p0.name, amount: gfmt(R.A), gl: gfmt(R.A / B * 1000), gives: kxIons(perDose) }], { col1: tl('Nawóz') }), h('p', { class: 'kx-note' }, `${tl('Rozpuść w wodzie RO albo destylowanej i dopełnij do {0} ml. Przy dawce {1} ml starczy na {2} {3}.', fnum(B, 0), fnum(d, 2), fnum(B / d, 0), kxPl(B / d, tl('dawkę'), 'dawki', tl('dawek')))}`));
      if (R.A / B * 1000 > 200) warn.push(['warn', `${tl('{0} g/l to dużo – proszek może się nie rozpuścić. Zwiększ dawkę roztworu albo dawkuj częściej.', fnum(R.A / B * 1000, 0))}`]);
      if (R.A < 0.2) warn.push(['warn', `${tl('{0} g to za mało na zwykłą wagę kuchenną.', gfmt(R.A))}`]);
      text.push(`${tl('{0}: {1} g do {2} ml, dawka {3} ml, {4} {5} w tygodniu, akwarium {6} l', p0.name, gfmt(R.A), fnum(B, 0), fnum(d, 2), n, kxPl(n, 'raz', tl('razy'), tl('razy')), fnum(V, 0))}`);
    } else {
      const R = LICZ.produktPlyn({ ppm: p0.ppm, V, n, way: s.way === 'target' ? 'target' : 'amount', el: s.el, t: String(tPer * n), ldose: maker ? String(mkDose) : s.ldose });
      if (R.err) { out.append(h('p', { class: 'kx-empty' }, R.err === 'target' ? tl('Wpisz, o ile chcesz podnieść.') : maker ? tl('Wpisz dawkę z etykiety: ile ml na ile litrów.') : `${tl('Wpisz dawkę w {0}.', u)}`)); return; }
      amount = R.d; perDose = Object.fromEntries(R.ks.map(k => [k, R.per1[k] * R.d]));
      hd = h('div', { class: 'kn-result-h' }, h('h2', {}, s.way === 'dose' ? tl('Twoja dawka') : tl('Dawkuj')), h('p', { class: 'kn-big' }, h('b', {}, `${gfmt(amount)} ${u}`), h('span', {}, freqT(n))),
        h('p', {}, p0.name + (n > 1 ? ` ${tl('· razem {0} {1} na tydzień', gfmt(amount * n), u)}` : '')));
      out.append(hd);
      out.append(h('p', { class: 'kx-note' }, `${tl('To {0} {1} na 10 l i {2} {3} na 100 l wody.', gfmt(amount / V * 10), u, gfmt(amount / V * 100), u)}` + (maker && !(n2(mk.n) > 0) ? tl(' Producent nie podaje częstotliwości – przyjęto raz w tygodniu.') : '')));
      const dzR = LICZ.gotDoz(p0); if (dzR && !maker) { const ref = LICZ.gotScale(dzR, V); out.append(h('p', { class: 'kx-note' }, `${tl('Producent zaleca u Ciebie {0} {1}{2}. Ta dawka to {3}% tygodniowej dawki producenta.', gfmt(ref), u, dzR.n ? (dzR.n === 1 ? tl(', raz w tygodniu') : `${tl(', {0} razy w tygodniu', dzR.n)}`) : '', fnum(amount * n / (ref * (dzR.n || 1)) * 100, 0))}`)); }
      if (amount < 0.1) warn.push(['info', `${tl('{0} {1} trudno dokładnie odmierzyć. Rozcieńcz nawóz albo dawkuj rzadziej, a więcej naraz.', gfmt(amount), u)}`]);
      text.push(`${tl('{0}: {1} {2}, {3} {4} w tygodniu, akwarium {5} l', p0.name, gfmt(amount), u, n, kxPl(n, 'raz', tl('razy'), tl('razy')), fnum(V, 0))}`);
    }
    out.append(kxGain(perDose, amount, n, pw.on && u === 'g' ? 'ml' : u) || '', kxExtras(perDose, n) || '');
    { const mt = kxMethods(perDose, n); if (mt) out.append(mt); }
    if ((perDose.Cu || 0) * n > 0.01 && P.PROFILES[tank().type].shrimp) warn.push(['bad', tl('Miedź powyżej 0,01 mg/l na tydzień może szkodzić krewetkom.')]);
    if ((perDose.NH4 || 0) * n > 1) warn.push(['bad', `${tl('NH₄ wyjdzie {0} mg/l w tygodniu. Powyżej 1 mg/l to już ryzykowne dla ryb i krewetek.', gfmt(perDose.NH4 * n))}`]);
    const T0 = P.targetsOf(tank()), hi = kxMain(perDose).filter(k => T0[k] && perDose[k] * n > 2 * T0[k][1]);
    if (hi.length) warn.push(['warn', `${tl('Sporo jak na tydzień: {0}.', hi.map(k => `${tl('{0} {1} mg/l, a cel to najwyżej {2}', ionL(k), gfmt(perDose[k] * n), gfmt(T0[k][1]))}`).join('; '))}`]);
    if (p0.status === 'unverified') warn.push(['info', tl('Skład jest przybliżony, sprawdź etykietę.')]);
    if (perDose.NO3 > 0 || perDose.NH4 > 0) LICZ.nNotes(p0).forEach(t => warn.push(['info', t]));
    hd.after(...kxAlerts(warn.filter(w => w[0] === 'bad'))); out.append(...kxAlerts(warn.filter(w => w[0] !== 'bad')));
    text.push(`${tl('Po jednej dawce: +{0} mg/l', kxIons(perDose))}`, `${tl('Po tygodniu: +{0} mg/l', kxIons(perDose, kxMain(perDose), n))}`, ...warn.map(w => '! ' + w[1]));
    const planAmt = +amount.toPrecision(3);
    out.append(kxActions([[tl('Kopiuj wynik'), () => kxCopy(text.join('\n'))],
      [tl('Dodaj do planu nawożenia'), () => kxAddToPlan(p0.id, planAmt, n, u), 'btn'],
      LICZ.isMicroSource(p0) ? [tl('Użyj jako mikro w „Przygotuj nawóz”'), () => { kxState().useMicro = 'p:' + p0.id; save(); toast(tl('Ustawione w „Przygotuj nawóz”: krok 3 → Mikro i żelazo')); go('kalkulator/nawoz'); }] : null,
      [tl('Zrób odpowiednik z soli'), () => { (state.inputs.odp ||= {}).pid = p0.id; save(); go('nawozy/odpowiednik'); }]]));
    // porównanie
    const cmp = [p0.id, ...s.cmp.filter(id => id !== p0.id)].map(productById).filter(Boolean);
    if (cmp.length > 1) {
      const mode = s.way === 'target' ? { mode: 'target', el: s.el, t: tPer } : { mode: 'dose', amount: s.ldose };
      const res = LICZ.porownaj(cmp, { ...mode, n, V }), ks = KX_COMP.filter(k => res.some(r => r.week && r.week[k] > 0.00005));
      out.append(h('h2', { class: 'kx-h' }, s.way === 'target' ? `${tl('Porównanie przy tym samym przyroście {0}', ionL(s.el))}` : `${tl('Porównanie przy dawce {0}', s.ldose || '–')}`),
        h('div', { class: 'kx-scroll' }, h('table', { class: 'kx-t cmp' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, tl('W tygodniu (mg/l)')), res.map(r => h('th', { scope: 'col' }, r.prod.name,
          r.prod.id !== p0.id ? h('button', { class: 'kx-x small', type: 'button', 'aria-label': tl('Usuń z porównania {0}', r.prod.name), onclick: () => { s.cmp = s.cmp.filter(x => x !== r.prod.id); save(); drawProd(); update(); } }, '×') : null)))),
          h('tbody', {}, h('tr', {}, h('th', { scope: 'row' }, tl('Dawka')), res.map(r => h('td', { class: 'num strong' }, r.err ? (r.err === 'noel' ? `${tl('nie ma {0}', ionL(s.el))}` : '—') : `${gfmt(r.amount)} ${kxUnit(r.prod)}`))),
            ks.map(k => h('tr', {}, h('th', { scope: 'row' }, ionL(k)), res.map(r => h('td', { class: 'num' }, r.week && r.week[k] > 0.00005 ? gfmt(r.week[k]) : r.err ? '' : r.prod.status === 'unverified' ? tl('brak danych') : '—'))))))));
    }
    kxLog('gotowe', s, `${tl('{0}: {1} {2}, {3} {4} w tygodniu', p0.name, gfmt(amount), pw.on && u === 'g' ? 'ml' : u, n, kxPl(n, 'raz', tl('razy'), tl('razy')))}`, text.join('\n'));
  }
  drawProd(); drawMode(); update();
};

// własny produkt z etykiety: % m/m z gęstością albo g/l (płyn), % (proszek); przeliczenie bez zmian (LICZ.labelConc)
function kxLabelSheet(onSaved) {
  const L0 = { form: 'liquid', unit: 'pct', dens: '', pct: {} }, name = inputF(tl('Nazwa'), '', '', { type: 'text', max: 60, ph: tl('nazwa z opakowania') }), body = h('div', { class: 'stack' }), res = h('p', { class: 'kx-hint' });
  const MAIN = ['N_NO3', 'N_NH4', 'N_amid', 'P2O5', 'K2O', 'MgO', 'CaO'], MICRO = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo'], OTHER = LICZ.LABEL.map(x => x[0]).filter(id => !MAIN.includes(id) && !MICRO.includes(id));
  const prev = () => { const c = LICZ.labelConc(L0), ks = X.ION_ORDER.filter(k => c[k] > 0); res.textContent = (ks.length ? `${tl('Skład ({0}):', L0.form === 'powder' ? 'g/kg' : tl('g/l'))} ` + ks.map(k => `${ionL(k)} ${gfmt(c[k])}`).join(' · ') : tl('Wpisz skład z etykiety.')) + LICZ.nNotes({ pct: L0.pct }).map(t => ' ' + t).join(''); };
  const fld = ids => h('div', { class: 'grid' }, LICZ.LABEL.filter(([id]) => ids.includes(id)).map(([id, l]) => kxNum(L0.pct, id, l, L0.form === 'liquid' && L0.unit === 'gl' ? tl('g/l') : '%', { onInput: prev }).el));
  const draw = () => { body.innerHTML = '';
    body.append(kxChoice([['liquid', tl('Płyn')], ['powder', tl('Proszek / granulat')]], L0.form, v => { L0.form = v; draw(); }, tl('Postać')));
    if (L0.form === 'liquid') body.append(kxChoice([['pct', tl('Skład w %')], ['gl', tl('Skład w g/l')]], L0.unit, v => { L0.unit = v; draw(); }, tl('Jednostka')));
    if (L0.form === 'liquid' && L0.unit === 'pct') body.append(kxNum(L0, 'dens', tl('Gęstość'), 'g/ml', { ph: '1,2', hint: tl('Podana na etykiecie lub w karcie produktu. Bez niej przyjmowane jest 1 g/ml.'), onInput: prev }).el);
    body.append(fld(MAIN), h('details', { class: 'kx-adv' }, h('summary', {}, tl('Mikroelementy')), fld(MICRO)), h('details', { class: 'kx-adv' }, h('summary', {}, tl('Inny zapis: jony, P, K, Mg, Ca, siarka')), fld(OTHER)), res); prev(); };
  draw();
  const bg = sheet([h('h3', {}, tl('Mój nawóz z etykiety')), name.el, body, h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: () => {
    const nm = name.val(), ppm = LICZ.labelConc(L0); if (!nm) { toast(tl('Wpisz nazwę')); return; } if (!Object.keys(ppm).length) { toast(tl('Wpisz skład z etykiety')); return; }
    const id = uid('u'); state.products.push({ id, name: nm.slice(0, 60), unit: L0.form === 'powder' ? 'g' : 'ml', ppm: Object.fromEntries(Object.entries(ppm).map(([k, v]) => [k, +v.toPrecision(6)])), source: 'user', status: 'label', pct: { ...L0.pct }, dens: n2(L0.dens) || null, producer: tl('Moje nawozy') });
    save(); bg.remove(); toast(tl('Dodano: {0}', nm)); onSaved(id); } }, tl('Zapisz')), h('button', { class: 'btn ghost', type: 'button', onclick: () => bg.remove() }, tl('Anuluj')))]);
}

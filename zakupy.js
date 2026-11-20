if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== 7.11: Lista potrzebnych zakupów z przepisu – bez magazynu =====
   Po przygotowaniu nawozu (Nawóz, Mineralizacja wody, Przepisy) pod przepisem jest lista: składnik, ile go potrzeba, jak go szukać w sklepie.
   „Mam” przy składniku zapisuje go na prostej liście posiadanych (state.inputs.kx.owned: kody 'id|hyd' albo 'p:id') – nic nie odejmuje,
   nie liczy zapasów, tylko oznacza, czego nie trzeba kupować. Kalkulatory od tej listy nie zależą.
   Łączna lista (#/kalkulator/zakupy, state.inputs.kx.shop.lists) łączy kilka nawozów i sumuje te same składniki.
   Obliczenia: LICZ.zakupy (nawozy-licz.js) → X.shopLines (chem.js). */
// nazwa, pod którą sól łatwiej znaleźć w sklepie
const BUY_NAME = {
  KNO3: tl('saletra potasowa (azotan potasu)'), KH2PO4: tl('fosforan monopotasowy (MKP)'), K2SO4: tl('siarczan potasu'), KCl: tl('chlorek potasu'),
  MgSO4: tl('siarczan magnezu (sól gorzka)'), CaCl2: tl('chlorek wapnia'), CaSO4: tl('gips (siarczan wapnia)'), KHCO3: tl('wodorowęglan potasu'), NaHCO3: tl('soda oczyszczona'),
  K2CO3: tl('węglan potasu (potaż)'), CaNO32: tl('saletra wapniowa'), MgNO32: tl('saletra magnezowa'), NH4NO3: tl('saletra amonowa'), NH4H2PO4: tl('fosforan monoamonowy (MAP)'),
  K2HPO4: tl('fosforan dipotasowy'), NaH2PO4: tl('fosforan jednosodowy'), MgCl2: tl('chlorek magnezu'), NaNO3: tl('saletra sodowa (chilijska)'), H3BO3: tl('kwas borowy'),
  Na2EDTA: tl('EDTA disodowa'), Na4EDTA: tl('EDTA tetrasodowa'), FeSO4: tl('siarczan żelaza'),
};
function buyName(item) {
  if (item.fert) return tl('gotowy nawóz – nazwa z opakowania');
  const m = matOf(item.mat); if (!m) return '';
  return BUY_NAME[item.mat] || (m.pct ? tl('{0} – sprawdź % na opakowaniu', m.name) : m.name);
}

// lista „mam już”; przy pierwszym uruchomieniu 7.11 przejmuje dawną szafkę, jeśli ktoś ją zmieniał (sam zestaw domyślny = nic nie wpisał)
function kxOwned() {
  const s = kxState();
  if (!Array.isArray(s.owned)) {
    const nw = s.nawoz, sig = a => JSON.stringify([...a].sort()), touched = nw && Array.isArray(nw.have) && sig(nw.have) !== sig(KN_HAVE_DEF);
    s.owned = touched ? [...new Set([...nw.have, ...(nw.micro && nw.micro !== 'p:b26' ? [nw.micro] : [])])] : []; save();
  }
  return s.owned;
}
const kxIsOwned = key => kxOwned().some(c => c === key || (!key.startsWith('p:') && splitV(c).id === splitV(key).id));
function kxSetOwned(key, on) {
  const s = kxState(); kxOwned();
  s.owned = s.owned.filter(c => key.startsWith('p:') ? c !== key : splitV(c).id !== splitV(key).id); // jedna forma soli na liście
  if (on) s.owned.push(key); save();
}
const kxShopLists = () => ((kxState().shop ||= { lists: [] }).lists ||= []);
const kxShopAmt = l => gfmt(l.q) + ' ' + l.unit;

// tekst do skopiowania: tylko to, czego nie zaznaczono jako „mam”
function kxShopText(lines, title) {
  const buy = lines.filter(l => !l.have), have = lines.filter(l => l.have);
  const row = l => { const n = buyName(l.item); return `- ${itName(l.item)}${n && !l.item.fert ? ' – ' + n : ''}: ${kxShopAmt(l)}`; };
  return [title, ...(buy.length ? buy.map(row) : [tl('(wszystko już mam)')]), ...(have.length ? ['', tl('Mam już: {0}', have.map(l => itName(l.item)).join(', '))] : [])].join('\n');
}

// wiersze listy z polem „Mam”; onToggle – co odświeżyć po zmianie
function kxShopRows(lines, onToggle, { from = false } = {}) {
  return h('ul', { class: 'shop-list' }, lines.map(l => {
    const name = itName(l.item), chk = h('input', { type: 'checkbox', checked: !!l.have, 'aria-label': tl('Mam: {0}', name) });
    chk.onchange = () => { kxSetOwned(l.key, chk.checked); onToggle(); };
    const sub = [buyName(l.item), from && l.from.length ? tl('do: {0}', l.from.join(', ')) : ''].filter(Boolean).join(' · ');
    return h('li', { class: 'shop-row' + (l.have ? ' own' : '') },
      h('label', { class: 'shop-chk' }, chk, h('span', {}, tl('mam'))),
      h('span', { class: 'shop-name' }, h('b', {}, name), sub ? h('small', {}, sub) : null,
        l.have && l.have.k ? h('small', { class: 'shop-form' }, `${tl('masz {0} – {1} g', HYDW[l.have.hyd] || l.have.hyd + '-wodny', gfmt(l.q * l.have.k))}`) : null),
      h('b', { class: 'shop-q' }, kxShopAmt(l)));
  }));
}

/* karta „Lista potrzebnych zakupów” pod przepisem
   name – nazwa na łącznej liście; items – pozycje przepisu (g na przepis); note – na co są te ilości */
function kxShopCard({ name, items, note, title = tl('Lista potrzebnych zakupów') }) {
  const box = h('section', { class: 'shop-card', 'aria-label': tl('Lista potrzebnych zakupów') });
  const draw = () => {
    box.innerHTML = '';
    const lines = LICZ.zakupy([{ name, items }], kxOwned(), state.salts); if (!lines.length) return;
    const left = lines.filter(l => !l.have).length, lists = kxShopLists(), on = lists.find(x => x.name === name);
    box.append(h('div', { class: 'shop-h' }, h('h3', {}, title), h('span', {}, left ? `${tl('do kupienia: {0} z {1}', left, lines.length)}` : tl('masz wszystko'))),
      note ? h('p', { class: 'kx-hint' }, note) : null,
      kxShopRows(lines, draw),
      h('p', { class: 'kx-hint' }, tl('Zaznacz „mam” przy tym, co już masz – nie trafi do skopiowanej listy.')),
      h('div', { class: 'kx-acts' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => kxCopy(kxShopText(lines, `${tl('Do kupienia – {0}:', name)}`)) }, tl('Kopiuj listę')),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { kxShopAdd(name, items); draw(); } }, on ? tl('Zaktualizuj na łącznej liście') : tl('Dodaj do łącznej listy')),
        lists.length ? h('a', { class: 'btn ghost small', href: '#/kalkulator/zakupy' }, `${tl('Łączna lista ({0})', lists.length)}`) : null));
  };
  draw(); return box;
}
function kxShopAdd(name, items) {
  const lists = kxShopLists(), rec = { id: uid('z'), name, items: items.filter(i => +i.g > 0).map(recItem), ts: Date.now() }, i = lists.findIndex(x => x.name === name);
  if (i >= 0) lists[i] = { ...rec, id: lists[i].id }; else lists.push(rec);
  save(); toast(i >= 0 ? tl('Zaktualizowano na łącznej liście') : `${tl('Dodano do łącznej listy ({0})', lists.length)}`);
}

// łączna lista: kilka nawozów razem, te same składniki zsumowane
KX.zakupy = root => {
  const lists = kxShopLists();
  root.append(backLink('#/kalkulator/nawoz', tl('Nawozy z soli')), h('h1', { class: 'kx-title' }, tl('Łączna lista potrzebnych zakupów')));
  if (!lists.length) { root.append(h('p', { class: 'kx-empty' }, tl('Lista jest pusta. Policz nawóz w zakładce „Nawozy z soli” albo otwórz przepis i pod listą potrzebnych zakupów wybierz „Dodaj do łącznej listy”.'))); return; }
  const lines = LICZ.zakupy(lists, kxOwned(), state.salts), left = lines.filter(l => !l.have).length, redo = () => { render.keepScroll = true; render(); };
  root.append(h('div', { class: 'kx-cols one' }, h('div', { class: 'kx-out' },
    h('section', { class: 'shop-card' }, h('div', { class: 'shop-h' }, h('h3', {}, tl('Razem')), h('span', {}, left ? `${tl('do kupienia: {0} z {1}', left, lines.length)}` : tl('masz wszystko'))),
      h('p', { class: 'kx-hint' }, tl('Ten sam składnik z kilku nawozów jest zsumowany. Ilości wystarczą na jedno przygotowanie każdego nawozu.')),
      kxShopRows(lines, redo, { from: true }),
      h('div', { class: 'kx-acts' }, h('button', { class: 'btn small', type: 'button', onclick: () => kxCopy(kxShopText(lines, tl('Do kupienia ({0}):', lists.map(x => x.name).join(', ')))) }, tl('Kopiuj listę')),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (confirm(tl('Usunąć wszystkie nawozy z łącznej listy?'))) { kxState().shop.lists = []; save(); render(); } } }, tl('Wyczyść listę')))),
    h('section', { class: 'shop-card' }, h('h3', {}, tl('Nawozy na liście')),
      h('ul', { class: 'shop-list' }, lists.map(x => h('li', { class: 'shop-row' }, h('span', { class: 'shop-name' }, h('b', {}, x.name), h('small', {}, x.items.map(i => `${itName(i)} ${gfmt(i.g)} ${itUnit(i)}`).join(', '))),
        h('button', { class: 'kx-x', type: 'button', 'aria-label': tl('Usuń z listy: {0}', x.name), onclick: () => { kxState().shop.lists = lists.filter(y => y !== x); save(); redo(); } }, '×'))))))));
};

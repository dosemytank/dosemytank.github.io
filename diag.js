if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== Diagnostyka roślin i glonów – reguły, bez interfejsu (testowane w Node).
   Zasady: objaw ≠ jeden niedobór; zawsze kilka możliwych przyczyn z uzasadnieniem; przy braku danych – wprost to mówimy;
   kroki bezpieczne: jedna zmiana naraz, test przed zmianą, odczekać 1–2 tygodnie. Treści napisane od podstaw. ===== */
const DIAG = (() => {
  const SYMPTOMS = [['holes', tl('Dziury w liściach')], ['yellow', tl('Żółknięcie liści')], ['pale_new', tl('Blade lub białe młode liście')], ['deform', tl('Zdeformowane nowe przyrosty')],
    ['stunted', tl('Zahamowany wzrost')], ['melt', tl('Rozpuszczanie się liści')], ['roots', tl('Słabe korzenie')], ['old_die', tl('Obumieranie starszych liści')], ['discolor', tl('Nietypowe przebarwienia')]];
  const ALGAE = [['thread', tl('Glony nitkowate')], ['spot', tl('Zielone punkty na szybach i liściach')], ['bloom', tl('Zielona woda (zakwit)')], ['cyano', tl('Sinice (śliski, ciemnozielony nalot o zapachu stęchlizny)')],
    ['diatom', tl('Brązowy, łatwo ścieralny nalot')], ['film', tl('Kępki lub pędzelki na brzegach liści i dekoracjach')], ['other', tl('Inny osad')]];
  const num = v => typeof v === 'number' && isFinite(v);

  function plant(inp) {
    const s = new Set(inp.symptoms || []), where = inp.where || 'unknown', p = inp.params || {}, out = { causes: [], check: [], fert: [], observe: [], steps: [], dataWarn: [] };
    const cause = (id, title, why, w = 1) => { const c = out.causes.find(x => x.id === id); if (c) { c.w += w; if (why && !c.why.includes(why)) c.why.push(why); } else out.causes.push({ id, title, why: why ? [why] : [], w }); };
    const check = t => { if (!out.check.includes(t)) out.check.push(t); };
    if (!s.size) { out.dataWarn.push(tl('Nie wybrano objawów.')); return out; }
    const old = where === 'old', young = where === 'new';
    // objawy → kandydaci (nigdy jeden)
    if (s.has('yellow')) {
      if (!young) { cause('N', tl('Za mało azotu'), tl('Żółkną najpierw starsze liście – azot roślina przenosi do nowych przyrostów.'), old ? 2 : 1); cause('Mg', tl('Za mało magnezu'), tl('Żółknięcie między nerwami starszych liści.'), old ? 1.5 : 0.8); }
      if (!old) { cause('Fe', tl('Za mało dostępnego żelaza'), tl('Żółkną młode liście, nerwy zostają zielone.'), young ? 2 : 0.8); }
      cause('light', tl('Za mało światła w dolnej części roślin'), tl('Dolne liście w cieniu żółkną i odpadają – to nie zawsze niedobór.'), 0.7);
    }
    if (s.has('pale_new')) { cause('Fe', tl('Za mało dostępnego żelaza'), tl('Blade nowe liście to częsty objaw braku Fe lub Mn.'), 2); cause('Mn', tl('Za mało manganu'), tl('Podobny obraz jak przy Fe, często razem.'), 1); cause('pH', tl('Mikroelementy niedostępne przy wysokim pH'), tl('Przy pH powyżej ok. 7,5 część żelaza (szczególnie z EDTA) przestaje być dostępna.'), 0.6); }
    if (s.has('deform')) { cause('CaB', tl('Za mało wapnia lub boru'), tl('Wapń i bor nie przemieszczają się w roślinie, więc braki widać na wierzchołkach.'), 1.5); cause('co2swing', tl('Wahania CO₂'), tl('Skoki CO₂ w ciągu dnia często deformują przyrosty roślin łodygowych.'), 1); cause('pests', tl('Uszkodzenia przez zwierzęta'), tl('Ślimaki i niektóre ryby uszkadzają młode liście.'), 0.5); }
    if (s.has('holes')) { cause('K', tl('Za mało potasu'), tl('Drobne dziurki na starszych liściach, często z żółtymi brzegami.'), old ? 1.2 : 0.8); cause('pests', tl('Uszkodzenia przez zwierzęta'), tl('Ślimaki, krewetki lub ryby obgryzają liście – sprawdź po zgaszeniu światła.'), 1); cause('co2', tl('Za mało CO₂ / węgla'), tl('Słabo rosnące, „głodne” liście łatwiej się perforują.'), 0.7); cause('age', tl('Naturalne starzenie liści'), tl('Najstarsze liście zamierają, gdy roślina rośnie.'), 0.5); }
    if (s.has('melt')) { cause('adapt', tl('Adaptacja po posadzeniu'), tl('Rośliny z hodowli nawodnej gubią liście po przeniesieniu pod wodę (np. zwartki).'), 1.5); cause('shock', tl('Nagła zmiana warunków'), tl('Duża podmiana, inna woda, skok temperatury lub CO₂.'), 1.2); cause('co2', tl('Za mało CO₂ / węgla'), tl('Przy słabym zaopatrzeniu w węgiel liście się rozpadają.'), 0.6); }
    if (s.has('stunted')) { cause('co2', tl('Za mało CO₂ / węgla'), tl('Najczęstszy czynnik ograniczający wzrost w akwarium roślinnym.'), 1.2); cause('light', tl('Za mało światła'), tl('Bez światła nawożenie nie przyspieszy wzrostu.'), 1); cause('N', tl('Za mało azotu'), tl('Spowolniony wzrost i bladozielone liście.'), 0.7); cause('P', tl('Za mało fosforu'), tl('Wzrost staje, starsze liście ciemnieją, czasem zielone punkty na szybach.'), 0.7); }
    if (s.has('roots')) { cause('substrate', tl('Wyczerpane lub zbyt zbite podłoże'), tl('Rośliny korzeniowe pobierają dużo z podłoża; stare podłoże bywa ubogie lub beztlenowe.'), 1.5); cause('temp', tl('Za wysoka temperatura lub mało tlenu'), tl('Korzenie gniją przy słabym natlenieniu.'), 0.6); }
    if (s.has('old_die')) { cause('age', tl('Naturalne starzenie liści'), tl('Pojedyncze najstarsze liście to normalny obieg.'), 1); cause('N', tl('Za mało azotu'), tl('Gdy obumiera wiele starszych liści naraz.'), 0.8); cause('K', tl('Za mało potasu'), tl('Brzegi starszych liści brązowieją i dziurawieją.'), 0.6); cause('light', tl('Za mało światła w dolnej części roślin'), tl('Zacienione dolne partie.'), 0.6); }
    if (s.has('discolor')) { cause('lightHigh', tl('Mocne światło (często naturalne)'), tl('Wiele roślin czerwienieje przy mocnym świetle – to nie musi być problem.'), 1); cause('N', tl('Mało azotu'), tl('Czerwienienie u niektórych gatunków nasila się przy małej ilości NO₃.'), 0.6); cause('algae', tl('Nalot glonów lub okrzemek'), tl('Brązowy nalot na liściach to częściej glony niż przebarwienie.'), 0.6); }
    // kontekst
    if (inp.scope === 'some') { cause('species', tl('Wymagania konkretnego gatunku'), tl('Objawy tylko u części gatunków – częściej wynikają z ich potrzeb (światło, CO₂, twardość) niż z ogólnego niedoboru.'), 1.5); out.causes.forEach(c => { if (['N', 'K', 'Mg', 'P'].includes(c.id)) c.w *= 0.7; }); }
    if (inp.fertChanged) { cause('fertChange', tl('Niedawna zmiana nawożenia'), tl('Objawy zaczęły się po zmianie nawozu lub dawki.'), 2); out.fert.push(tl('Po zmianie nawożenia odczekaj 1–2 tygodnie przed kolejną korektą – rośliny reagują z opóźnieniem.')); }
    if (inp.lightChanged) { cause('balance', tl('Zmiana światła lub CO₂ bez dopasowania reszty'), tl('Więcej światła zwiększa zapotrzebowanie na CO₂ i składniki.'), 2); }
    if (inp.duration === 'short') out.dataWarn.push(tl('Objawy trwają krócej niż tydzień – mogą być przejściowe (adaptacja, przesadzenie). Obserwuj, zanim coś zmienisz.'));
    // parametry
    const have = ['NO3', 'PO4', 'K', 'Fe', 'GH', 'KH', 'pH'].filter(k => num(p[k]));
    if (!have.length) out.dataWarn.push(tl('Brak aktualnych pomiarów – bez nich przyczyny są tylko przypuszczeniami. Zrób test NO₃, PO₄, GH, KH i pH.'));
    if (num(p.NO3)) { if (p.NO3 < 3) { cause('N', tl('Za mało azotu'), `${tl('Test pokazuje NO₃ {0} mg/l.', p.NO3)}`, 1.5); out.fert.push(`${tl('NO₃ {0} mg/l jest bardzo niski – sprawdź, czy nawóz makro dostarcza azot.', p.NO3)}`); } else if (s.has('yellow') && old) out.causes.forEach(c => { if (c.id === 'N') c.w *= 0.6; }); if (p.NO3 > 50) out.fert.push(`${tl('NO₃ {0} mg/l – bardzo wysoko; to nie niedobór azotu. Sprawdź podmiany i karmienie.', p.NO3)}`); }
    if (num(p.PO4) && p.PO4 < 0.1) cause('P', tl('Za mało fosforu'), `${tl('Test pokazuje PO₄ {0} mg/l.', p.PO4)}`, 1.2);
    if (num(p.GH) && p.GH < 3) { cause('CaB', tl('Za mało wapnia lub boru'), `${tl('GH {0}°dH – miękka woda, mało Ca i Mg.', p.GH)}`, 1); cause('Mg', tl('Za mało magnezu'), `GH ${p.GH}°dH.`, 0.8); }
    if (num(p.pH) && p.pH > 7.6 && (s.has('pale_new') || (s.has('yellow') && young))) cause('pH', tl('Mikroelementy niedostępne przy wysokim pH'), `pH ${p.pH}.`, 1);
    if (num(p.Fe) && p.Fe === 0 && s.has('pale_new')) cause('Fe', tl('Za mało dostępnego żelaza'), tl('Test Fe pokazuje 0 (testy Fe bywają mało czułe).'), 0.5);
    if (num(p.CO2) && p.CO2 < 10 && inp.co2 === 'bottle') cause('co2', tl('Za mało CO₂ / węgla'), `${tl('Wyliczone CO₂ ok. {0} mg/l przy butli.', Math.round(p.CO2))}`, 1);
    // co sprawdzić
    const ids = new Set(out.causes.map(c => c.id));
    if (ids.has('N') || ids.has('P') || ids.has('K')) check(tl('NO₃ i PO₄ (test), dawki makro z kontrolera nawożenia'));
    if (ids.has('Fe') || ids.has('Mn') || ids.has('pH')) check(tl('pH oraz to, czy nawóz mikro ma Fe i Mn w formie chelatu'));
    if (ids.has('Mg') || ids.has('CaB')) check(tl('GH i stosunek Ca do Mg w wodzie do podmian'));
    if (ids.has('co2') || ids.has('co2swing') || ids.has('balance')) check(tl('CO₂: pH i KH rano i przed końcem świecenia; czy CO₂ startuje przed światłem'));
    if (ids.has('light') || ids.has('lightHigh') || ids.has('balance')) check(tl('Czas świecenia i to, czy dolne partie roślin dostają światło'));
    if (ids.has('pests')) check(tl('Zwierzęta – obejrzyj liście wieczorem i rano'));
    if (ids.has('substrate')) check(tl('Wiek podłoża; czy rośliny korzeniowe dostają nawóz w podłożu'));
    // obserwacje i kroki
    out.observe.push(tl('Gdzie pojawiają się zmiany: nowe czy stare liście, jeden gatunek czy wszystkie.'), tl('Zrób zdjęcie i notatkę w dzienniku – za tydzień porównasz.'));
    out.steps.push(tl('Zmieniaj jedną rzecz naraz i odczekaj 1–2 tygodnie.'), tl('Przed zmianą dawki zrób test – nie zmieniaj nawożenia na podstawie samego wyglądu.'), tl('Duże jednorazowe zmiany parametrów szkodzą bardziej niż niedobór – koryguj stopniowo.'));
    out.causes.sort((a, b) => b.w - a.w); out.causes.forEach((c, i) => { c.level = i < 2 && c.w >= 1.5 ? tl('częściej') : tl('możliwe'); });
    if (out.causes.length > 1) out.dataWarn.push(tl('Objawy pasują do kilku przyczyn – często działa więcej niż jedna naraz.'));
    return out;
  }

  function algae(inp) {
    const t = new Set(inp.types || []), p = inp.params || {}, out = { causes: [], check: [], steps: [], dataWarn: [], avoid: [] };
    const cause = (title, why) => { if (!out.causes.some(c => c.title === title)) out.causes.push({ title, why }); };
    const check = x => { if (!out.check.includes(x)) out.check.push(x); };
    if (!t.size) { out.dataWarn.push(tl('Nie wybrano rodzaju glonów.')); return out; }
    const young = num(inp.ageWeeks) && inp.ageWeeks < 10, longLight = num(inp.photo) && inp.photo > 8, wpl = num(inp.watts) && num(inp.V) && inp.V > 0 ? inp.watts / inp.V : null;
    if (young) cause(tl('Młody zbiornik'), `${tl('Akwarium ma ok. {0} tyg. – równowaga biologiczna dopiero się ustala; część nalotów mija sama.', inp.ageWeeks)}`);
    if (longLight) cause(tl('Długi czas świecenia'), `${tl('{0} h dziennie. Wiele zbiorników dobrze działa przy 6–8 h.', inp.photo)}`);
    if (inp.plants === 'poor') cause(tl('Słaba kondycja roślin'), tl('Gdy rośliny nie rosną, składniki i światło wykorzystują glony. Najpierw przywróć wzrost roślin.'));
    if (inp.co2 === 'bottle' && inp.co2Stable === false) cause(tl('Niestabilne CO₂'), tl('Wahania CO₂ (wyczerpująca się butla, start po włączeniu światła) sprzyjają nalotom.'));
    if (t.has('thread')) { cause(tl('Brak równowagi światło – CO₂ – składniki'), tl('Nitkowate często pojawiają się, gdy światła jest więcej niż rośliny są w stanie wykorzystać.')); check(tl('Czas i moc światła; CO₂ (pH i KH); czy rośliny przyrastają')); }
    if (t.has('spot')) { if (num(p.PO4) && p.PO4 < 0.3) cause(tl('Mało fosforanów przy mocnym świetle'), `${tl('PO₄ {0} mg/l. Zielone punkty często towarzyszą niskiemu PO₄.', p.PO4)}`); else cause(tl('Mocne lub długie światło'), tl('Punkty na szybach pojawiają się nawet w zdrowych zbiornikach – czyść szyby regularnie.')); check(tl('PO₄ (test), czas świecenia')); }
    if (t.has('bloom')) { cause(tl('Skok amoniaku lub nadmiar materii organicznej'), tl('Zakwit często startuje po przekarmieniu, czyszczeniu filtra lub w nowym zbiorniku.')); cause(tl('Światło słoneczne'), tl('Bezpośrednie słońce na zbiorniku sprzyja zakwitom.')); check(tl('NH₄ i NO₂ (test), karmienie, położenie zbiornika')); }
    if (t.has('cyano')) { if (num(p.NO3) && p.NO3 < 5) cause(tl('Bardzo mało azotanów'), `${tl('NO₃ {0} mg/l – sinice dobrze radzą sobie przy braku azotu. Nie ograniczaj NO₃ dalej.', p.NO3)}`); cause(tl('Słaby przepływ i zalegające resztki'), tl('Sinice lubią miejsca bez ruchu wody i z osadem.')); check(tl('NO₃ (test), przepływ w zakamarkach, czystość podłoża i filtra')); }
    if (t.has('diatom')) { cause(young ? tl('Typowe dla nowego zbiornika') : tl('Krzemiany lub mało światła'), young ? tl('Okrzemki zwykle znikają same po kilku tygodniach.') : tl('Brązowy nalot pojawia się przy krzemianach w wodzie lub słabym świetle.')); check(tl('Skład wody do podmian (krzemiany), siła światła')); }
    if (t.has('film')) { cause(tl('Wahania CO₂ lub dużo materii organicznej'), tl('Kępki i pędzelki często rosną tam, gdzie CO₂ się waha lub gromadzi się osad.')); check(tl('Stabilność CO₂ w ciągu dnia, przepływ, czyszczenie filtra')); }
    if (t.has('other')) { cause(tl('Nieokreślony nalot'), tl('Bez opisu trudno wskazać przyczynę – zrób zdjęcie i porównaj z opisami glonów.')); }
    if (num(inp.change) && inp.change < 15) cause(tl('Rzadkie lub małe podmiany'), `${tl('{0}% tygodniowo – materia organiczna może się gromadzić.', inp.change)}`);
    if (wpl != null && wpl > 0.8 && inp.co2 !== 'bottle') cause(tl('Mocne światło bez CO₂'), `${tl('Ok. {0} W/l bez dozowania CO₂ – rośliny nie nadążają.', Math.round(wpl * 100) / 100)}`);
    if (!num(p.NO3) || !num(p.PO4)) out.dataWarn.push(tl('Brak testu NO₃ lub PO₄ – bez nich nie wiadomo, czy składników jest za dużo, czy za mało.'));
    if (!num(inp.photo)) out.dataWarn.push(tl('Podaj czas świecenia – to jeden z najważniejszych czynników.'));
    out.avoid.push(tl('Nie obcinaj od razu NO₃, PO₄ ani mikroelementów – niedobór osłabia rośliny i często pogarsza sytuację.'), tl('Nie zmieniaj kilku rzeczy jednocześnie – nie dowiesz się, co pomogło.'));
    out.steps.push(tl('Usuń mechanicznie, ile się da, i zrób podmianę.'), tl('Wybierz jedną zmianę (np. skrócenie światła o 1 h) i obserwuj 1–2 tygodnie.'), tl('Zapisuj obserwacje w dzienniku – łatwiej powiązać je ze zmianami.'));
    return out;
  }
  return { SYMPTOMS, ALGAE, plant, algae };
})();
if (typeof module !== 'undefined') module.exports = DIAG;

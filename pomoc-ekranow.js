if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
/* ===== 7.15: instrukcje ekranów – ikona „?” w nagłówku otwiera opis bieżącego ekranu =====
   Każdy wpis: t – tytuł, o – do czego służy, k – kroki, u – na co uważać. Klucz = trasa (najdłuższe pasujące dopasowanie). */
const HELP = {
  'kalkulator/nawoz': { t: tl('Przygotuj nawóz'),
    o: tl('Liczy, ile soli rozpuścić w butelkach makro i mikro oraz ile ml dawać do akwarium. Dobiera sole i dawkę do światła, CO₂ i podmian – nie musisz znać przepisów.'),
    k: [tl('Krok 1: wpisz objętość wody w akwarium, wybierz poziom światła, CO₂, podmianę i liczbę dawek w tygodniu.'),
      tl('Krok 2: wybierz plan. „Zalecane” to bezpieczny start; „Oszczędnie” przy małej liczbie roślin, „Więcej” przy szybkim wzroście, „Z zapasem (EI)” tylko przy mocnym świetle z CO₂ i dużych podmianach.'),
      tl('Krok 3: zostaw domyślne sole albo zaznacz te, które masz. Przy solach z kilkoma formami wybierz tę z opakowania (np. siedmiowodny MgSO₄·7H₂O).'),
      tl('Krok 4: wybierz dawkowanie z butelki albo na sucho. Pole „Dawka” możesz zostawić puste – aplikacja dobierze dawkę tak, żeby sole się rozpuściły.'),
      tl('Wynik: zakładka „Przepis” – co odważyć do butelek; „Składniki” – lista soli z zaznaczaniem, co masz; „Efekt” – o ile wzrosną NO₃, PO₄, K, Mg i Fe w tygodniu oraz zalecenia.')],
    u: [tl('Makro i mikro trzymaj w osobnych butelkach i dawkuj o różnych porach – żelazo wytrąca się z fosforanami.'), tl('Przez pierwsze 2–3 tygodnie rób testy NO₃ i PO₄ przed podmianą i koryguj plan.'), tl('Wynik to suma dodanych składników, a nie stężenie w wodzie – rośliny część pobiorą.')] },
  'kalkulator/mineral': { t: tl('Mineralizacja wody RO'),
    o: tl('Liczy, ile soli dodać do porcji wody RO (z osmozy albo demineralizowanej), żeby przed podmianą miała docelowe GH i KH.'),
    k: [tl('Wpisz, ile litrów wody przygotowujesz – zwykle tyle, ile wymieniasz przy jednej podmianie.'), tl('Ustaw docelowe GH i KH albo wybierz gotowy zestaw (rośliny, krewetki).'), tl('Zostaw domyślne sole albo wybierz inne źródło wapnia, magnezu i węglanów.'), tl('Jeśli Twój nawóz zawiera magnez lub wapń, wybierz go w kroku 4 – aplikacja odejmie tę część, żeby twardość w akwarium się zgadzała.'), tl('Postępuj według sekcji „Jak przygotować” i przy pierwszym razie sprawdź GH i KH testem.')],
    u: [tl('Gips rozpuszcza się powoli – wsyp go do całej porcji wody i mieszaj kilka minut.'), tl('Nie wsypuj soli bezpośrednio do akwarium z rybami.')] },
  'kalkulator/gotowe': { t: tl('Gotowe nawozy'),
    o: tl('Przelicza dawkę gotowego nawozu na Twoje akwarium i pokazuje, o ile wzrosną składniki. Działa też odwrotnie: ile nawozu dać, żeby podnieść wybrany składnik o zadaną wartość.'),
    k: [tl('Krok 1: sprawdź wybrany nawóz albo kliknij „Zmień nawóz” i wyszukaj go po nazwie, producencie lub składniku (np. „żelazo”). Brak na liście? Dodaj „Mój nawóz z etykiety”.'), tl('Krok 2: wpisz objętość akwarium i wybierz tryb: „Dawka producenta” (przepisz z etykiety), „Moja dawka” (ile faktycznie dajesz) albo „Mam cel” (o ile podnieść wybrany składnik).'), tl('Wynik pokazuje dawkę, przyrost po jednej dawce i po tygodniu. „Dodaj do planu nawożenia” zapisze nawóz w Akwarium.'), tl('„Porównaj z innym nawozem” – wybierz drugi (i trzeci) nawóz; tabela pod wynikiem pokaże, ile każdego trzeba i co dodaje przy tej samej dawce albo tym samym przyroście.')],
    u: [tl('Przy nawozach oznaczonych „skład orientacyjny” producent nie podaje pełnego składu – traktuj wynik jako przybliżony.'), tl('Miedź powyżej 0,01 mg/l tygodniowo może szkodzić krewetkom.')] },
  'kalkulator/receptury/sprawdz': { t: tl('Sprawdź butelkę'),
    o: tl('Dla butelki, którą już zrobiłeś: pokazuje stężenie w butelce, przyrost składników po dawce i ostrzega, gdy sole mogą się wytrącić albo nie rozpuścić.'),
    k: [tl('Dodaj każdy składnik i wpisz, ile gramów rozpuściłeś.'), tl('Wpisz pojemność butelki, dawkę w ml i liczbę dawek w tygodniu.'), tl('Przeczytaj ostrzeżenia o rozpuszczalności i niezgodnych solach.')], u: [] },
  'kalkulator/receptury': { t: tl('Przepisy'),
    o: tl('Znane przepisy (EI, PPS-Pro, PMDD) i Twoje własne. Każdy przepis przeliczysz na swoją butelkę i akwarium.'),
    k: [tl('Wyszukaj przepis po nazwie albo soli. Filtry zawężają listę do rodzaju przepisu, np. „Kompletne” – makro i mikro w jednym.'), tl('Otwórz przepis, ustaw butelkę i dawkę – zobaczysz gramy soli i przyrost składników.'), tl('Własny przepis zapiszesz z „Przygotuj nawóz” („Zapisz w Przepisach”) albo przyciskiem „+ Nowy przepis”.'), tl('Po zrobieniu butelki wybierz „Przygotowałem” – partia trafi do Historii.')], u: [] },
  'kalkulator/historia': { t: tl('Historia'),
    o: tl('Ostatnie obliczenia (do 100) i przygotowane partie nawozów. Pozwala wrócić do wcześniejszego wyniku bez wpisywania danych od nowa.'),
    k: [tl('„Otwórz ponownie” wczytuje obliczenie z tymi samymi danymi.'), tl('„Kopiuj” kopiuje wynik jako tekst, np. do notatek.'), tl('Przygotowane partie dodajesz w przepisie przyciskiem „Przygotowałem”.')], u: [tl('Historia jest zapisana tylko w tej przeglądarce. Kopię zapasową zrobisz w Ustawieniach (ikona zębatki u góry).')] },
  'kalkulator/zaawansowane': { t: tl('Zaawansowane'),
    o: tl('Narzędzia dla osób, które chcą samodzielnie dobrać każdą sól i cel albo przeanalizować gotową butelkę. Początkującym wystarczy zakładka „Nawozy z soli”.'),
    k: [tl('Własny nawóz: Makro i Mikro sól po soli, odpowiednik gotowego nawozu z soli, analiza zrobionej butelki.'), tl('Woda i parametry: korekta wyniku testu, twardość z soli, CO₂ z pH i KH.'), tl('Pomiary i przeliczniki: jednostki z etykiet, objętość zbiornika.'), tl('Tryb PRO dodaje obniżanie KH kwasem, narastanie soli, miareczkowanie i czystość soli.')], u: [tl('Każde narzędzie jest w aplikacji w jednym miejscu: mineralizacja RO w „Nawozy z soli”, podmiana i plan pielęgnacji w Akwarium, ustawienia pod zębatką.')] },
  'kalkulator/makro': { t: tl('Makro'),
    o: tl('Własny nawóz makro: ustalasz cel dla każdego składnika i wybierasz sól, z której ma pochodzić. Wynik to gramy do butelki albo na sucho.'),
    k: [tl('Wpisz objętość akwarium.'), tl('Wybierz, czy cele dotyczą całego tygodnia, czy jednej dawki. „Wstaw typowe wartości” wypełni cele z gotowych planów.'), tl('Dla każdego składnika wpisz cel w mg/l i wybierz sól. „+ Dodaj składnik” dodaje kolejny.'), tl('Ustaw butelkę, dawkę i liczbę dawek – wynik pokaże gramy i przyrost.')], u: [tl('Jedna sól często daje dwa składniki (np. KNO₃ – azot i potas). Sprawdź przyrost w wyniku, a nie tylko cel.')] },
  'kalkulator/mikro': { t: tl('Mikro i żelazo'),
    o: tl('Własny nawóz mikro: żelazo i mikroelementy z soli, chelatów albo gotowej mieszanki.'),
    k: [tl('Wybierz źródło: gotową mieszankę (np. CSM+B) albo pojedyncze chelaty i sole.'), tl('Wpisz cel dla żelaza; pozostałe pierwiastki aplikacja pokaże w proporcji do Fe.'), tl('Ustaw butelkę i dawkę.')], u: [tl('Siarczany metali bez chelatu szybko się wytrącają – aplikacja doda EDTA, jeśli trzeba.')] },
  'kalkulator/zakupy': { t: tl('Łączna lista'),
    o: tl('Zbiera sole z kilku przepisów w jedną listę i sumuje ilości tego samego składnika.'),
    k: [tl('Pod przepisem wybierz „Dodaj do łącznej listy”.'), tl('Zaznacz „mam” przy tym, co już masz – nie trafi do skopiowanej listy.'), tl('„Kopiuj listę” kopiuje ją jako tekst.')], u: [] },
  'zbiornik': { t: tl('Akwarium'),
    o: tl('Wszystko o Twoim zbiorniku w jednym miejscu, od góry: co zrobić dziś, stan wody z wykresem i wnioskami, ostatnie wpisy z dziennika, nawozy, które dawkujesz, i narzędzia do pielęgnacji.'),
    k: [tl('Najpierw przejdź „Pierwsze kroki”: objętość i rodzaj akwarium (ikona ustawień obok nazwy), nawozy, pierwszy test wody.'), tl('„Dziś” pokazuje zaplanowane dawki i podmiany. Kliknij ✓, gdy coś zrobisz – wpis trafi do dziennika. „Szybki wpis” zapisuje typową podmianę albo dawkę jednym dotknięciem.'), tl('„Woda” pokazuje ostatnie wyniki na tle celu dla Twojego typu akwarium; kliknięcie kafelka otwiera wykres.'), tl('W karcie „Nawozy” dodaj nawozy, których używasz, z dawką i liczbą dawek – z nich powstaje plan „Dziś”.'), tl('Nowy test wody, podmianę, dawkę albo notatkę dodasz przyciskiem „+”. „Cały dziennik” otwiera pełną historię.')], u: [tl('Kilka akwariów przełączasz przyciskiem z nazwą zbiornika na górze.')] },
  'dziennik': { t: tl('Dziennik akwarium'),
    o: tl('Historia Twojego akwarium: testy wody, podmiany, dawki nawozów i notatki. Z wpisów powstają wykresy z pasmem celu i wnioski, co sprawdzić najpierw.'),
    k: [tl('Wpis dodasz przyciskiem „+” na dole: test wody, podmianę, dawkę albo notatkę.'), tl('Nad listą wybierz parametr i okres wykresu.'), tl('Filtry „Pomiary”, „Podmiany”, „Nawozy” zawężają listę wpisów.')], u: [tl('Testuj zawsze o tej samej porze i przed podmianą – wyniki będą porównywalne.')] },
  'woda/mineral': { t: tl('Twardość z soli'),
    o: tl('Działa odwrotnie niż Mineralizacja: wpisujesz, ile gramów soli wsypałeś do danej objętości wody, a aplikacja podaje wzrost GH, KH i skład jonów.'),
    k: [tl('Wpisz objętość wody.'), tl('Dodaj sole przyciskiem „+ Dodaj sól” i wpisz gramy.'), tl('Odczytaj zmianę GH i KH oraz stężenia jonów.')], u: [tl('Siarczany powyżej ok. 200 mg/l i chlorki powyżej ok. 150 mg/l – lepiej zmienić część soli.')] },
  'woda/korekta': { t: tl('Korekta parametrów akwarium'),
    o: tl('Na podstawie wyniku testu liczy, ile składnika dodać jednorazowo do akwarium, żeby osiągnąć wartość docelową.'),
    k: [tl('Wpisz objętość netto (bez podłoża i dekoracji).'), tl('Dla wybranego parametru wpisz wynik testu i cel, wybierz źródło.'), tl('Odczytaj, ile dodać i jak zmienią się parametry.')], u: [tl('Przy dużej zmianie aplikacja podzieli dawkę na kilka dni – dodawaj jedną porcję dziennie, a przed kolejną zrób test.')] },
};
function helpFor(path) {
  const k = Object.keys(HELP).filter(x => path === x || path.startsWith(x + '/')).sort((a, b) => b.length - a.length)[0];
  return HELP[k] || { t: 'DoseMyTank', o: tl('Kalkulator nawozów z soli, gotowe nawozy, mineralizacja wody i dziennik akwarium roślinnego. Dane zapisują się tylko w tej przeglądarce.'),
    k: [tl('Kalkulator – policz nawóz z soli, dawkę gotowego nawozu albo mineralizację wody.'), tl('Akwarium – plan na dziś, stan wody, dziennik wpisów i nawozy, które dawkujesz.'), tl('Przycisk „+” – nowy test wody, podmiana, dawka albo notatka.')], u: [] };
}
function openHelp() {
  const path = location.hash.replace(/^#\/?/, '') || 'kalkulator/nawoz', H = helpFor(path);
  sheet([h('h3', {}, H.t), h('p', { class: 'help-o' }, H.o),
    H.k.length ? [h('h4', { class: 'help-h' }, tl('Jak używać')), h('ol', { class: 'help-l' }, H.k.map(x => h('li', {}, x)))] : null,
    H.u.length ? [h('h4', { class: 'help-h' }, tl('Warto wiedzieć')), h('ul', { class: 'help-l' }, H.u.map(x => h('li', {}, x)))] : null,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn block', type: 'button', onclick: e => e.target.closest('.sheet-bg').remove() }, tl('Rozumiem')))].flat().filter(Boolean));
}

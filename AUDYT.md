# DoseMyTank (dawniej Akwarysta) – audyt i plan rozwoju (v4.0 PRO, 17.11.2026; historia v3.0 niżej)


## Wersja 8.5.1 – poprawki z audytu 8.5 (20.11.2026)
- Język przy pierwszym uruchomieniu: `app.html` wybiera język tak samo jak `i18n.js` (cała lista `navigator.languages`, dane `akwa.v2–v4` → PL). Wcześniej np. przeglądarka „fr, de” dawała niemiecki interfejs bez niemieckiego słownika i angielski manifest.
- Słowniki tylko dla potrzebnego języka: PL bez słownika, EN – `i18n-en.js`, DE – oba; przy zmianie języka brakujące są dociągane (`setLang`).
- Boraks: rozpuszczalność 2,6 g formy bezwodnej / 100 ml (było 5,1 – wartość dla dekahydratu); test w `weryfikacja.test.js`.
- PPS-Pro: mikro 0,5 ml na 40 l dziennie (za stroną autora metody; było 1 ml), makro bez zmian (1 ml). Zmienia porównanie „Jak to wypada przy EI i PPS-Pro” (Fe 0,355 zamiast 0,71 mg/l na tydzień) i opis przepisu.
- Wzory własnych soli: ułamek wody z kropką (`CuSO4.2.5H2O`, `CaSO4·0.5H2O`) działa jak z przecinkiem.
- Service worker: przy słabym zasięgu po 3 s odpowiada kopia z pamięci, świeży plik zapisuje się na następny raz.
- Dostępność: niewidoczny nagłówek h1 na ekranach bez tytułu, pełny kontrast podpisów w kartach wyboru, paski zdjęć i zrzutów na stronach startowych dostępne z klawiatury, baner innej wersji językowej jako `<aside>`.
- Porządki: przywrócone GitHub Actions (`.github/workflows/test.yml`: `npm test` i testy przeglądarkowe, zrzuty jako artefakt); usunięty martwy `kalkulator.js`; 8 nieużywanych tekstów usuniętych ze słowników EN/DE (stare szablony zgłoszeń z GitHuba); README bez linku do GitHub Issues.

## Wersja 8.4.1 – licznik odwiedzin (20.11.2026)
- Cloudflare Web Analytics (bez ciasteczek) na stronach informacyjnych EN/PL i 404; aplikacja (app.html) bez licznika. Poprawione zdania o prywatności na stronach startowych i w O aplikacji.

## Wersja 8.4 – bez linków do GitHuba (20.11.2026)
- Zgłoszenia tylko mailem (dosemytank@gmail.com): w aplikacji „Zgłoś błąd” i „Zaproponuj funkcję” otwierają mail z szablonem i danymi technicznymi; strony Feedback/Kontakt – dwie karty mailto. Usunięte linki do repozytorium i GitHub Issues ze stron i aplikacji (repozytorium pozostaje publiczne – wymóg darmowego GitHub Pages).

## Wersja 8.3 – zgłoszenia mailem (20.11.2026)
- Adres dosemytank@gmail.com: karta „Email / Napisz maila” na stronach Feedback i Kontakt (temat i szablon opisu wypełnione), wzmianka w O aplikacji, wiersz „Napisz maila” w Ustawieniach aplikacji (z wersją, językiem i przeglądarką). GitHub Issues zostają jako druga droga.
- Historia repozytorium zastąpiona jednym commitem (bez loginu i maila autora).

## Wersja 8.2.1 – stare adresy (20.11.2026)
- Stare linki z kotwicami polskiej strony pod „/” (np. dosemytank.github.io/#instalacja, #funkcje, #pytania) przenoszą na /pl/ z tą samą sekcją.
- Angielska sekcja instalacji: #installation (stara #install-help przekierowuje). Nie #install – ten identyfikator ma przycisk instalacji.

## Wersja 8.2 – Ko-fi bardziej widoczne (20.11.2026)
- Strony startowe: „Support” / „Wesprzyj” z ikoną kawy w górnym menu (na telefonie jedyny widoczny link menu) i krótki pasek pod zdjęciami akwariów.
- Aplikacja: jednorazowa karta „DoseMyTank się przydaje?” na ekranie Akwarium – tylko po 3 zapisanych przepisach albo po ≥ 3 dniach używania i ≥ 14 dniach od pierwszego otwarcia. Po „Postaw kawę” lub „Nie pokazuj więcej” nie wraca (klucz `dmt.kofi` w localStorage, poza kopią zapasową i schematem danych). Bez okienek przy starcie i banerów w kalkulatorze.

## Wersja 8.1 – zdjęcia, Ko-fi, porządki (20.11.2026)
- Strony startowe EN i PL: sekcja ze zdjęciami akwariów autora (WebP, bez metadanych, leniwe ładowanie, poza pamięcią offline). Na telefonie przewijane w poziomie.
- Ko-fi (ko-fi.com/dosemytank): w FAQ „Czy jest darmowa?”, jako karta obok „O aplikacji” i „Kontakt”, w stopce stron startowych i w Ustawieniach aplikacji (Pomoc i kontakt).
- Baza nawozów: napis „kopiuj” → „Dodaj do moich” (EN: „Add to mine”).
- `_config.yml`: AUDYT.md, STAN_I_PLAN.md, README.md, testy i zrzuty nie są publikowane na stronie. Usunięty `tests/__pycache__`, dodany `.gitignore`.

## 0p. Wersja 7.0 – przebudowa kalkulatora (19.11.2026)

Na podstawie audytu kalkulatora z 18.11.2026 (Etap 1). Silnik `chem.js` bez zmian we wzorach; zmieniona warstwa ekranu i dane.

**Struktura:** `nawozy-dane.js` (przepisy, cele startowe, zakresy – jedno źródło na identyfikatorach `chem.js`), `nawozy-licz.js` (czyste funkcje kalkulatorów, testowane w Node), `kalk-wspolne.js` + `kalk-makro.js`, `kalk-mikro.js`, `kalk-gotowe.js`, `kalk-receptury.js`, `kalk-historia.js`. Usunięte: `kalkulator.js`, `zakupy.js` (lista zakupów z kalkulatora – decyzja: usunąć; zapasy i lista zakupów w Akwarium bez zmian).

**Trasy:** `#/kalkulator/makro|mikro|gotowe|receptury[/id]|historia`; `#/kalkulator` – ostatnio używana sekcja; `nawozy/mikro`, `nawozy/gotowe`, `nawozy/receptury/<id>`, `nawozy/odpowiednik` działają.

**Poprawki zmieniające wyniki (zaakceptowane):**
- C2 – jedna tabela reguł niezgodności (`X.COMPAT_RULES`, `compatIssues`, `compat`) dla ostrzeżeń i podziału na butelki; nowe: Mn/Zn/Cu/Co + PO₄, metale i Mg z węglanami, struwit dzielony automatycznie. Test właściwości: 500 losowych zestawów.
- C3 – zawartość pierwiastka w chelacie z etykiety (`item.pct`), zapamiętywana.
- C4 – czystość soli w Makro/Mikro (tryb zaawansowany).
- C1 – PMDD: molibdenian przeliczany z masą molową liczoną z wzoru (było ręcznie 663,9; różnica poniżej zaokrąglenia do 0,0001 g).

**Regresja względem 6.11:** `tests/fixtures/kalk-6.11.json` (188 przypadków zapisanych z działającej aplikacji na 3aee474), porównanie w `tests/nawozy-licz.test.js` z tolerancją 1e-9. Zamierzone różnice: 4 przypadki (C2).

**Nowe w interfejsie:** przyrost na dawkę albo na tydzień; sól wybierana w wierszu; wynik jako tabela (Odważ, g/l w butelce, „daje” na dawkę) + dwa wiersze przyrostu; roztwór pośredni dla mas < 0,05 g; kolumna masy pierwiastka w Mikro; proporcje mikro do Fe zamiast kolorowania zakresów (C7); porównanie do 3 gotowych nawozów; własny produkt z etykiety w oknie; „Kopiuj wynik”; zapis przez okno z nazwą zamiast `prompt()`; historia obliczeń (`state.calcLog`, maks. 100, w eksporcie całości; import kopii bez pola działa). SCHEMA bez zmian (4); `state.inputs.kalk` z 6.11 zostaje nietknięty.

**7.1 (19.11.2026):**
- Odpowiednik z soli (`clone.js`) dzieli butelki tą samą regułą (`X.compat`): najpierw jedna butelka, gdy dobrane sole są niezgodne – A/B, a gdy w którejś nadal jest niezgodność – dalej (C, D…). Względem 6.11 (`tests/fixtures/clone-6.11.json`, 66 przypadków) zmieniły się 3: ADA Green Brightly lights i shade – struwit, teraz 2 butelki; Aqua Rebell Makro Spezial N – same azotany Ca, K, Mg, teraz 1 butelka (dawna reguła dzieliła Ca od K i Mg zawsze).
- C8: pole `nNote` w bazie (`total` – Tropica Specialised, `urea` – AquaVitro Synthesis) i N mocznikowy z etykiety → uwaga w Gotowych nawozach, Makro/Mikro (mieszanki) i Odpowiedniku.
- C5: sole ze wspólnym jonem (np. K₂SO₄ z KNO₃, SO₄ z MgSO₄) oznaczone jako orientacyjne, próg „bezpiecznie” 70% zamiast 80% (`X.SAFE_COMMON`, `solFix`). Zmienia podpowiadane dawki: EI w 100 l, butelka 500 ml, 3× w tygodniu – 15,5 ml zamiast 14 ml. W 188 przypadkach z fixture 6.11 poziom rozpuszczalności się nie zmienił; zmieniła się tylko dawka EI.

**7.2 (19.11.2026):** sól i forma uwodnienia jako dwa osobne pola w Makro, Mikro i „Sprawdź butelkę” (`saltPicker` w `pro-wspolne.js`); pole „Forma” tylko dla surowców z kilkoma formami, przy zmianie soli forma domyślna albo ta sama. Testy przeglądarkowe w GitHub Actions (`tests/e2e_all.py`, Playwright 1.63, zrzuty jako artefakt).

**7.3 (19.11.2026):** osobny wybór formy uwodnienia przy każdej soli w całej aplikacji (kalkulator, edytor receptur, korekta parametrów, mineralizatory w podmianie); `matSelect` usunięty. Nowe formy handlowe: Na₂CO₃·H₂O, Cu(NO₃)₂·2,5H₂O, CoSO₄·H₂O, Na₄EDTA·4H₂O. Napisy kalkulatora przepisane prostym językiem (nagłówki tabel, przyrost, rozpuszczalność, podział na butelki z nazwą osadu, liczba mnoga). Strona startowa: nowe teksty, zrzut kalkulatora i obraz podglądu linku (og.png).

**7.4 (19.11.2026)** – z porównania z aquarium.tools i Rotala Butterfly: dawkowanie na sucho w Makro i Mikro (`LICZ.sucho`, gramy na dawkę), woda w filtrze lub sumpie doliczana do objętości, przyrost EC (jon po jonie, λ° w 25 °C) i TDS w tygodniu (`X.ecTds`), proporcja N : P obok NO₃ : PO₄, tabela „Jak to wypada przy EI i PPS-Pro” (`LICZ.metody`). Świadomie pominięte: kopiowanie cudzych baz nawozów, łyżeczki zamiast gramów (brak gęstości nasypowych), konta.

**7.17 (19.11.2026) – jeden system wyglądu (wzorzec: Kalkulator → Przygotuj nawóz).** Obliczenia, dane, zapis i adresy bez zmian.
- `tokens.css`: dodane zmienne typografii i odstępów (`--fs-xs…--fs-hero`, `--pad-card`, `--gap`, `--ctl`, `--r-sm`); te same wartości w jasnym i ciemnym motywie.
- `styles.css`: blok „SYSTEM KOMPONENTÓW” – wspólne karty, nagłówki, pola (16 px, 44 px), etykiety, przełączniki segmentowe, filtry, kafle wyboru, komunikaty, rozwijane sekcje, nagłówek wyniku (pas jak „Twój przepis”), tabele, arkusze; usunięte nadpisania rozmiarów pól i etykiet w Akwarium, Korekcie i Makro/Mikro; 76 zdublowanych deklaracji usuniętych.
- `core.js`: `chips()` domyślnie rysuje przełącznik segmentowy (filtr listy tylko w Bazie nawozów), `backLink()` dla powrotów, karty wyników z pasem nagłówka.
- Nowy test `tests/e2e_spojnosc.py` (w `e2e_all.py`): 29 ekranów × jasny/ciemny × 360/1280 px – te same komponenty mają te same style, brak poziomego przewijania i błędów JS.

**7.16 (19.11.2026) – start dla nowych użytkowników, porządek w narzędziach.**
- Ustawienie akwarium w 3 pytaniach (objętość, rodzaj, podmiana) w oknie. Nic nie blokuje: kalkulator działa od razu na wartościach domyślnych, a nad nim jest zamykana propozycja „Pierwszy raz? Ustaw akwarium / Licz bez tego”. To samo okno otwiera pierwszy z „Pierwszych kroków”. Po zapisaniu światło i CO₂ w „Przygotuj nawóz” dobierają się do rodzaju akwarium.
- Akwarium: wykres i wnioski zwinięte („Wykres i wnioski”), stan zapamiętany.
- Jedno miejsce na narzędzia: zakładka Zaawansowane (adres `#/narzedzia` pokazuje to samo); każde narzędzie raz. Mineralizacja RO tylko w „Nawozy z soli”, podmiana, plan, baza nawozów i pomoc – w Akwarium. Ustawienia pod ikoną zębatki w nagłówku.
- Listy wyboru soli pokazują sam wzór, pełna nazwa po otwarciu listy (`selNames` w core.js).
- Forma uwodnienia w jednym wierszu małych przycisków („bezwodny”, „·7H₂O”).
- Gotowe nawozy: „Porównaj z innym nawozem” od razu otwiera wybór drugiego nawozu; pod wybranym nawozem lista „Porównujesz z:” z usuwaniem (wcześniej „Dodaj do porównania” nic nie pokazywał, dopóki nie wybrało się innego nawozu).
- Korekta parametrów: zamiast „Rozłóż na 2 dni” – wyjaśnienie, dlaczego nie dawać naraz, i porcje dzienne dla każdego składnika.

**7.15 (19.11.2026) – poprawki po przeglądzie wersji 7.14.**
- Światło w „Przygotuj nawóz” opisane roślinami i lumenami na litr, bez przykładów lamp (dwie świetlówki T5 przy 1000 l to słabe światło). Podpowiedź przelicza próg na objętość („20–40 lm na litr · przy 1000 l: 20–40 tys. lm”); pod kafelkami: skąd wziąć lumeny i że przy głębokości powyżej ok. 60 cm warto wybrać poziom niżej.
- Forma uwodnienia soli: przełącznik „Jaka forma jest na opakowaniu?” zamiast niewidocznej listy; przy niezaznaczonej soli znacznik „2 formy”.
- Usunięte ceny soli (karta listy, łączna lista, mineralizacja, Zrób sam odpowiednik); koszt nawożenia liczony tylko z ceny opakowania gotowego nawozu. Zapisane ceny zostają w danych, nie są używane.
- Wynik „Przygotuj nawóz”: zakładka „Składniki” (zamiast „Zakupy”), poprawione „codziennie” i nazwa planu EI.
- Mineralizacja: wynik w trzech wierszach (woda do podmian, nawóz, razem), „Twój nawóz z soli” zamiast „Nawóz z »Przygotuj nawóz«”, lista „Potrzebne sole”.
- Gotowe nawozy: kroki w kartach; wybrany nawóz na wierzchu, lista do wyboru po „Zmień nawóz”; wynik z dawką w nagłówku jak w „Przygotuj nawóz”; tryby w pełnej szerokości.
- Pola celu (Makro, Mikro, Gotowe): jednostka „mg/l” – okres wybiera przełącznik; wartości mieszczą się w polach.
- Przepisy, Historia, Zaawansowane: karty i listy jak w reszcie aplikacji; Zaawansowane z nowymi opisami (co wpisujesz → co dostajesz); „Sole → twardość” to „Twardość z soli”.
- Instrukcje: ikona „?” w nagłówku otwiera opis bieżącego ekranu – do czego służy, jak używać, na co uważać (`pomoc-ekranow.js`).
- Nawigacja: dwie zakładki (Kalkulator, Akwarium) i „+” pośrodku. Dziennik połączony z Akwarium: od góry Dziś → Szybki wpis → Woda (wyniki, wykres, wnioski) → Ostatnie wpisy (5) → Nawozy → Narzędzia. Pełny dziennik to podstrona „Cały dziennik” (`#/dziennik`, stare adresy działają).

**7.14 (19.11.2026) – dokończenie audytu graficznego.**
- Sole → twardość: zamiast 15 pól z zerami lista wsypywanych soli z „+ Dodaj sól” i usuwaniem (wartości w tych samych polach `g_<sól>` – stare wpisy się pokazują).
- Makro (Zaawansowane): składnik, wartość i sól w jednym wierszu od 360 px szerokości.
- Moje akwarium: postęp Pierwszych kroków („0 z 3” + pasek), w pustej karcie Woda szkic wykresu z celem; Nawozy – jedna lista „+ Dodaj nawóz” i link „Brak na liście? Wpisz własny skład”. Pusty Dziennik też ze szkicem.
- Przyciski: trzy rodzaje (główny, drugorzędny z obrysem, tekstowy) w dwóch wysokościach 48 i 40 px w całej aplikacji, także w kalkulatorze.
- `styles.css`: usunięte 88 deklaracji nadpisanych później przez regułę o tym samym selektorze. Sprawdzone porównaniem stylów wyliczonych przez przeglądarkę: 23 ekrany × 2 szerokości × 2 motywy, 23 330 elementów – bez różnic (poza położeniem punktów wykresu zależnym od godziny).
- `img/og.png` (podgląd linku) w nowym wyglądzie – generowany przez `tests/zrzuty_strony.py` razem z pozostałymi zrzutami.

**7.13 (19.11.2026) – wygląd: jeden zestaw kolorów i spójny kalkulator** (audyt graficzny z 19.11.2026, etapy 1–2 i część 3).
- `tokens.css` – jedyne źródło kolorów, promieni i cieni dla `app.html` i `index.html`. Ciemny motyw ręczny i systemowy mają te same wartości (wcześniej część reguł działała tylko przy `data-theme=dark`). `styles.css` bez palet i bez reguł zależnych od motywu – pilnuje tego `tests/tokens.test.js`.
- Poprawki: nazwa marki czytelna w motywie systemowym (B1), `color-scheme` – pola wyboru w kolorach motywu (B2), zanikanie przy krawędzi przewijanych zakładek i filtrów + aktywna zakładka zawsze widoczna (B3, B5), placeholder dawki „auto” (B4).
- Skala: czcionki bez połówek pikseli, promienie 10 / 14 / 20 px, mocniejsze obramowania przycisków i pól (`--line-strong`), karty z obrysem i lekkim cieniem, tekst pomocniczy ciemniejszy (kontrast ≥ 5 : 1 także na polach).
- Kalkulator: sekcje „Zaawansowanych” w kartach jak „Zrób nawóz”, te same pola i przełączniki; w kafelkach światła i planu opis tylko przy wybranym. Wynik „Zrób nawóz”: dawka na wierzchu (ciemnozielony nagłówek, w ciemnym motywie ciemny), zakładki Przepis / Zakupy / Efekt zamiast czterech bloków pod sobą. Pasek dawki na dole w kolorze nagłówka wyniku.
- Moje akwarium: Ustawienia jako ikona; w listach narzędzi opis pod nazwą, bez ucinania.
- Strona startowa: kolory z `tokens.css`, sekcja „Co policzysz” (3 karty + lista pozostałych narzędzi zamiast 7 długich opisów), zrzuty w wersji jasnej i ciemnej (`<picture>`), generowane skryptem `tests/zrzuty_strony.py` na stałych danych przykładowych – uruchamiać przy zmianach wyglądu.
- Desktop: szerokości zostają dwie – 720 px dla list i formularzy, 1100 px dla Kalkulatora i Akwarium (formularz obok wyniku); treść i nagłówek są wyśrodkowane w obszarze obok paska nawigacji.
- Wyniki obliczeń bez zmian (testy jednostkowe i fixture 6.11 bez różnic).

**7.12 (19.11.2026) – marka DoseMyTank, nazewnictwo, teksty i UX.**
- Marka: jedyna nazwa to DoseMyTank – nagłówek aplikacji i strony, tytuły, opisy SEO i podglądu linku (og:url poprawiony z nieistniejącego `/Akwarium/` na adres strony), manifest PWA, nazwa pliku kopii zapasowej, komunikaty, obrazek podglądu `img/og.png` i nagłówki na zrzutach `img/wykresy.webp`, `img/korekta.webp`. Celowo bez zmian (zgodność danych): typ pliku bazy nawozów `akwarysta-nawozy`, domena UID w pliku .ics (kalendarz rozpoznaje wcześniej zaimportowane wydarzenia), klucz zapisu w przeglądarce. Cache Service Workera: prefiks `dosemytank-`, stare `akwarysta-` kasowane przy aktywacji.
- Strona główna: nagłówek „Obliczaj. Przygotowuj. Kontroluj.”, funkcje w kolejności: nawozy z soli i lista potrzebnych zakupów, gotowe nawozy, mineralizacja wody, dziennik akwarium, przepisy, pozostałe narzędzia. Zapasy nie są już prezentowane jako funkcja. Nowe FAQ: od czego zacząć, mineralizacja a korekta, dokładność (rachunek vs dane wejściowe), brak gwarancji wyników biologicznych.
- Nazwy: zakładka „Nawozy z soli” (dawniej „Przygotuj”), ekran „Przygotuj nawóz” (dawniej „Zrób nawóz”), „Przepisy”/„przepis” zamiast przemiennie „Receptury”/„receptura”, „Baza nawozów” zamiast „Moje nawozy” jako nazwy miejsca, „Lista potrzebnych zakupów” i „łączna lista” (dawniej „Lista zakupów”/„wspólna lista”), „Korekta parametrów akwarium”, „Dziennik akwarium” na stronie, „tryb PRO” zamiast „tryb zaawansowany”.
- Mineralizacja i korekta rozdzielone w opisach i w menu: Narzędzia → „Przygotowanie wody” (Mineralizacja wody, Podmiana wody, Sole → twardość, Narastanie soli) i „Akwarium” (Korekta parametrów akwarium, CO₂, obniżanie KH). Zaawansowane: osobne grupy „Przygotowanie wody” i „Korekta parametrów akwarium”.
- Koszt przygotowania nawozu pod listą potrzebnych zakupów: ze zwykłych cen soli (zł/kg, te same `state.prices.salt` co w „Zrób sam odpowiednik”) i cen opakowań gotowych nawozów (`unitCost`). Bez nowego algorytmu.
- Zapasy w Akwarium zwinięte („opcjonalnie”), dopóki nic w nich nie wpisano; karta „Do kupienia” → „Kończy się”, żeby nie myliła się z listą potrzebnych zakupów.
- Mineralizacja: wynik w wyróżnionej ramce – z nawozem „W akwarium (woda + nawóz)” z GH, KH, Ca, Mg i Ca : Mg, pod spodem sama woda do podmian. Instrukcja dla początkującego zależna od soli (waga, czysty pojemnik, gips do całej porcji, reszta rozpuszczona w szklance, nagrzewanie CaCl₂, kontrola testem z oczekiwanym GH i KH). Poprawka: krok 4 wypisywał „nullnull” przy „Nie uwzględniaj”.
- Przygotuj nawóz, krok 3 („Sole do nawozu”): wyraźne grupy „A Makro” i „B Mikro i żelazo”.
- Gotowe nawozy: wpisana dawka producenta zostaje przy nawozie po zmianie nawozu albo trybu (wcześniej znikała). Tryb PRO: przełącznik usunięty z Ustawień (nic tam nie zmieniał), zostaje w Narzędziach, które są teraz dostępne z Zaawansowanych („Wszystkie narzędzia”).
- Styl tekstów: bez pierwszej osoby aplikacji („liczę”, „dobiorę”, „pokażę” → forma bezosobowa), bez pytań retorycznych w podpowiedziach, nagłówki wyników „Przewidywana zmiana stężenia”, nazwy kroków opisujące dane (Dawka tygodniowa, Sole do nawozu, Objętość wody, Docelowe GH i KH, Sole do mineralizacji), zalecenia bez obietnic biologicznych.
- Komunikaty: ostrzeżenie o miedzi „może szkodzić” zamiast pewnego skutku; Założenia w Ustawieniach – dokładność obliczeń a dokładność danych; słowniczek „Woda RO” (mineralizacja, nie tylko mieszanie); błąd zapisu kieruje do Ustawień (było „Info”).
- Do decyzji: nazwa zakładki „Nawozy z soli” obejmuje też Mineralizację wody; zrzut `img/kalkulator.webp` pokazuje starszy układ ekranu (bez marki w kadrze); martwe pliki `kalkulator.js` i `calc.js`-owe fragmenty 6.11 nadal w repozytorium; zapasy w Akwarium – zostawić jako opcję czy usunąć.
- Testy: 132 jednostkowe, 5/5 przeglądarkowych (teksty w testach zaktualizowane do nowych nazw, test braku „null” i nowej instrukcji mineralizacji).

**7.11 (19.11.2026) – lista zakupów zamiast szafki.** Cel aplikacji: przygotować nawóz, poznać recepturę i wiedzieć, co kupić – bez prowadzenia magazynu.
- Krok 3 w „Nawóz” to „Z czego zrobić nawóz”: wybór soli do przepisu (`kxState().nawoz.have`, dane bez zmian), na start gotowy zestaw `KN_HAVE_DEF` (KNO₃, KH₂PO₄, K₂SO₄, MgSO₄·7H₂O, CSM+B; w Mineralizacji gips, sól gorzka, KHCO₃). Przepis liczy się od razu, bez wpisywania czegokolwiek. `knRun()` – jedno wywołanie `LICZ.kreator` dla „Nawóz” i Mineralizacji.
- Pod każdym przepisem (Nawóz z butelki i na sucho – na 4 tygodnie, Mineralizacja wody, Przepisy) karta „Lista zakupów” (`zakupy.js`, `kxShopCard`): składnik, ilość na przepis, nazwa sklepowa, pole „mam”, „Kopiuj listę” (tylko to, czego nie zaznaczono), „Dodaj do wspólnej listy”.
- Wspólna lista `#/kalkulator/zakupy` (`state.inputs.kx.shop.lists`): kilka nawozów, te same składniki zsumowane, przy każdym – do których nawozów; usuwanie pojedynczego nawozu, „Wyczyść listę”. Link pod przełącznikiem w Przygotuj, gdy lista nie jest pusta.
- Prosta lista „mam już” `state.inputs.kx.owned` (kody `id|hyd`, `p:id`): tylko oznacza pozycje na liście zakupów, nic nie odejmuje, żaden kalkulator od niej nie zależy. Inna forma uwodnienia = ta sama sól, masa przeliczona przez masę molową. Migracja: dawna szafka zmieniona przez użytkownika → „mam już”; sam zestaw domyślny → pusta lista.
- Obliczenia: `LICZ.zakupy(lists, owned)` na `X.shopLines` (bez nowej logiki sumowania). Usunięte z Przepisów: kolumna „W szafce” i „Mam je – dopisz do szafki”; na liście przepisów „do kupienia: …” tylko, gdy lista „mam już” coś zawiera.
- Mineralizacja wody, krok 4 „Nawóz też daje Ca i Mg?”: przepis z „Nawóz” albo gotowy nawóz z Ca/Mg (ml lub g na tydzień). `LICZ.mineralizacja({ fertWeek, change })` odejmuje od wody Ca i Mg, które nawóz utrzymuje w akwarium (tydzień / podmiana, bez zużycia przez rośliny) – GH i Ca : Mg liczą się dla sumy woda + nawóz.
- Gotowe nawozy: rodzaje „Makro (NPK)” i „Kompletny (NPK + mikro)” zamiast „Makro (N, P)”. Do grupy trafia nawóz z wyraźnym N lub P; potas nie jest warunkiem, dlatego część pozycji ma tylko N albo P+K – rzeczywisty skład jest pod nazwą.
- Poza zakresem (świadomie): stany magazynowe, historia zakupów, odejmowanie gramów. Zapasy gotowych nawozów w module Akwarium (6.9) zostają bez zmian.
- Testy: 3 nowe jednostkowe (sumowanie, „mam”, inna forma, mineralizacja z nawozem, NPK), `tests/e2e_zakupy.py` (telefon i komputer: czysty start → przepis → lista → „mam” → kopiowanie → wspólna lista z sumą → mineralizacja z Mg z nawozu → migracja).

**7.10 (19.11.2026) – audyt Gotowych nawozów, Przepisów i Zaawansowanych; mineralizacja jako osobne narzędzie.**
- Pierwsza zakładka „Przygotuj”: przełącznik Nawóz (koncentrat do dawkowania) | Mineralizacja wody (cała porcja RO do podmiany). Z „Zrób nawóz” zniknęły woda do podmian, GH/KH i sole mineralizujące. `KX.mineral` + `LICZ.mineralizacja` z objętością `L`, proporcją Ca : Mg, ostrzeżeniami (brak Ca, gips > 1,2 g/l, Na z sody, NO₃ z saletry) i poprawką K₂CO₃ (dawał CO₃, a cel był w HCO₃ – KH się nie liczył). Szafka wspólna z „Nawóz”. Zestawy mineralizacji do zapisania.
- Gotowe nawozy: wyszukiwarka (nazwa, producent, rodzaj, składnik, bez polskich znaków), filtr rodzaju (`LICZ.gotKind` ze składu – śladowy N w Flourish to nie NPK), lista kart, pełny skład pod „Pełny skład”, tryb „Dawka producenta” (`doz` w products.js tylko dla 7 nawozów sprawdzonych u źródła; dla własnych z pola „Zalecane dawkowanie”), ml na 10 l i 100 l, porównanie z dawką producenta, „Użyj jako mikro w Zrób nawóz”, „Edytuj mój nawóz”. Poprawka: `produktPlyn` gubił pierwiastki śladowe w dużych akwariach (próg 0,00005 mg/l na 1 ml). AquaVitro Carbonate: rodzaj KH.
- Przepisy: wyszukiwarka i rodzaje (azotowe, fosforowe, potasowe, magnezowe, makro, mikro, kompletne), stan szafki na liście i w szczegółach (z przeliczeniem innej formy uwodnienia przez masę molową), „Mam je – dopisz do szafki”, przeznaczenie i „Jak przygotować”, stężenie w 1 ml, „Policz w Zrób nawóz” (plan własny z tygodniowym efektem przepisu). Test przeliczania 50 g KNO₃ + 10 g KH₂PO₄ / 500 → 1000 ml.
- Zaawansowane: pogrupowane (Nawóz sól po soli, Analiza, Woda w akwarium, Przeliczniki). Sprawdź butelkę tylko tu (wcześniej też w Przepisach). Stary mineralizator (woda/mineral) zostaje jako „Sole → twardość”; „cel → sole” liczy Mineralizacja wody.

**7.9 (19.11.2026) – audyt „Zrób nawóz”.** Sprawdzone niezależnie masy molowe i udziały jonów (KNO₃, KH₂PO₄, K₂SO₄, MgSO₄·7H₂O, CaCl₂ 0/2/6, KCl, CaSO₄·2H₂O, Ca(NO₃)₂·4H₂O, Mg(NO₃)₂·6H₂O, NH₄NO₃, MAP, K₂HPO₄) – zgodne z tablicami. Błędy krytyczne poprawione: 1) „Zapisz w Przepisach” zapisywało makro rozdzielone na dwie butelki (np. saletra wapniowa + fosforan) jako jedną recepturę – teraz każda butelka osobno; 2) „Kopiuj przepis” też łączył te butelki; 3) mikro z gotowej mieszanki (np. CSM+B) nie było zapisywane – teraz jest jako pozycja { fert }. Dodane: przy każdej butelce stężenie w 1 ml i ile ml podnosi NO₃ o 1 mg/l (Fe o 0,1 mg/l), po zapisie przycisk „Dodaj do planu nawożenia”, walidacja objętości akwarium (1–20 000 l), butelki (50–5000 ml), dawki (≤ ¼ butelki), GH ≤ 25 i KH ≤ 15. Szczegóły (twardość, EC, porównanie z EI) zwinięte. Test: zapisana receptura daje te same mg/l co przepis.

**7.8 (19.11.2026) – niższe dawki startowe.** `DANE.START` (Zrób nawóz i „Wstaw typowe wartości” w Makro): słabe NO₃ 5 / PO₄ 0,5 / K 5 / Mg 2 / Fe 0,1, średnie 10 / 1 / 10 / 3 / 0,2, mocne 15 / 1,5 / 20 / 5 / 0,3 mg/l na tydzień – wszystkie poniżej EI. Z zapasem = czyste EI (bez podbijania do 1,5 × zalecenie), Więcej = min(1,5 × zalecenie, połowa drogi do EI). Przy EI bez mocnego światła z CO₂ – ostrzeżenie. Nowe opisy planów. Regresja 6.11 dla Lekkie/Średnie/Mocne porównuje cele z nowym START.

**7.7 (19.11.2026) – Przepisy z gotowymi nawozami, plany i szafka.** W recepturze (edytor i „Sprawdź butelkę”) obok soli można dodać gotowy nawóz, np. Intermag Mikro Plus (ml) albo chelat w proszku (g): pozycja `{ fert: { id, name, unit, ppm }, g }` z kopią składu, liczona przez `X.itemMat` jak surowiec z `pct` (ppm/10), z podziałem na butelki i ostrzeżeniem, gdy płynów jest więcej niż butelki. Plany: Więcej = połowa drogi między zaleceniem a „Z zapasem”, Z zapasem = EI, ale co najmniej 1,5 × zalecenie – kolejność planów zawsze rosnąca. Szafka: saletra wapniowa, magnezowa, amonowa, MAP, chlorek potasu na wierzchu; saletra wapniowa z fosforanem/siarczanem daje makro w dwóch butelkach; MAP i saletra amonowa – uwaga o NH₄. „Co to da w akwarium”: wartości z jednostką, ocena kolorem względem celu planu. Mineralizacja RO w wyróżnionej ramce. Opisy światła bez zakładania LED.

**7.6 (19.11.2026) – dopracowane „Zrób nawóz”.** Bez pola „woda w filtrze/sumpie”. Światło to karty z opisem, jakie to lampy i rośliny, oraz orientacyjną liczbą lm na litr. Zamiast „CO₂ z butli” jest „Dozowanie CO₂”. Woda do podmian: kranówka, RO albo RO z kranówką. Przy RO dochodzi mineralizacja (`LICZ.mineralizacja`: GH/KH docelowe, Ca:Mg 3:1, gips, CaCl₂, KHCO₃, NaHCO₃, MgSO₄ z szafki; gramy na 10 l i na jedną podmianę). „Ile dawać” to plany do wybrania (Oszczędnie 60%, Zalecane, Więcej 140%, Z zapasem jak EI, Własne liczby), bez suwaka. Mikro to jedna lista „Mikro i żelazo” (mieszanki, chelaty, FeSO₄ z EDTA), bez „nie mam”. Wynik to osobny panel „Twój przepis” z butelkami A/B, dawką, tabelą „Co to da w akwarium” (bez kolumny „najwyżej w wodzie”), mineralizacją i zaleceniami.

**7.5 (19.11.2026) – „Zrób nawóz” dla początkujących.** Nowa pierwsza zakładka (`kalk-nawoz.js`, logika `LICZ.kreator`): 1) akwarium – objętość, światło, CO₂, podmiana, ile razy w tygodniu; 2) ile dawać – zalecenie z `DANE.START` dla poziomu (słabe bez CO₂ / średnie / mocne z CO₂), suwak 50–150% i opcjonalne ręczne cele; 3) co masz w szafce – zaznaczasz sole (forma uwodnienia z listy) i mieszankę mikro albo chelat; aplikacja sama dobiera źródła (`KR_SRC`), K może pochodzić z KNO₃; 4) z butelki albo na sucho – dawka dobierana sama (ok. 6 tygodni z butelki, podniesiona, jeśli sole by się nie rozpuściły). Wynik: butelka A (makro) i B (mikro) z tą samą dawką, „Co to da w akwarium” (tydzień, zalecenie, ocena, najwyżej w wodzie przy podmianie = tydzień / podmiana), EC/TDS, porównanie z EI i PPS-Pro, zalecenia. Nawigacja: Zrób nawóz, Gotowe nawozy, Przepisy, Historia, Zaawansowane (Makro, Mikro, Sprawdź butelkę, Korekta). Formy uwodnienia z powrotem jako pozycje listy soli (bez osobnego pola „Forma”).

**Otwarte:** weryfikacja składu CSM+B i ilości PPS-Pro z oryginałem, test na fizycznych telefonach, temperatura przechowywania (dane rozpuszczalności tylko dla 20 °C).

## 0o. Wersja 6.3 – weryfikacja składów i domknięcia (17.11.2026)

Składy sprawdzone ze stron producentów i opisów dawkowania (pole src przy produkcie, status „z etykiety”):
- Tropica Premium Nutrition i Specialised Nutrition (dawniej Plant Nutrition / Plant Nutrition+) – deklaracja % m/m, gęstość 1,04. Poprawione Mn i Cu (wcześniej błędne).
- Seachem Equilibrium – dodany Ca 8,06% (wcześniej brak), K 19,5%.
- Easy Life Ferro – Fe 10 mg/l na ml (wcześniej 5). Nitro, Fosfo, Potassium – potwierdzone; z Fosfo usunięty K (producent go nie podaje).
- AquaVitro Activate (dodany K 8,8), Propel, Synthesis (azot rozbity na azotany i amon/mocznik).
- API Leaf Zone, Aqua Rebell Makro Spezial N (dodany Ca).
- Nowe: Seachem Flourish, Flourish Potassium, Flourish Iron.
- Bez publicznego składu (orientacyjne): ADA Green Brightly, AquaVitro Carbonate, Easy Life ProFito, Hagen/Nutrafin Plant Gro, Intermag Mikro i Floramix, Mikroplant Expert, Sera Florena, Symfonia złota.

Funkcje:
- Własna sól: przy wątpliwym wzorze (bezwodna forma soli zwykle sprzedawanej jako hydrat, nietypowa liczba H₂O, pierwiastek bez jonu, jony wyjaśniają < 85% masy) zapis wymaga zaznaczenia „Sprawdziłem”.
- Baza nawozów: zapis do pliku i wczytanie samych nawozów, receptur i soli; pomija duplikaty, przy kolizji id nadaje nowe i przepina powiązania.
- Plan: przycisk „Dodaj do planu” tworzy test wody dzień przed podmianą.
- Narzędzia: listy wyboru soli na całą szerokość.
- Teksty bez odwołań do osób i arkuszy; tabela szczegółów nazwana „Szczegóły chemiczne”, bez progów SO₄/Cl.

Testy: 55 jednostkowych, E2E telefon, E2E UX (z nowymi scenariuszami: sól, eksport, test przed podmianą).

## 0n. Wersja 6.2 – dokończenie punktów z audytu (17.11.2026)

- Desktop (od 960 px): nawigacja jako pasek boczny z przyciskiem „+” na górze zamiast dolnego paska.
- Akwarium: mikroelementy w „Dodajesz tygodniowo” jako małe kafelki z krótkim zakresem (np. „≤ 0,05”); „w wodzie do ok.” dla mikro tylko w PRO – ekran nie rośnie przy mieszankach mikro.
- Narzędzia: zamiast dużej karty „Moje akwarium — 100 l wody netto” jedna linia „100 l · nazwa · Zmień”.
- Statystyki (wykres, asystent) przy 360–420 px w 2 kolumnach – etykiety się nie ucinają.
- Domyślne wartości w polach z przecinkiem dziesiętnym (0,02 zamiast 0.02).

Zostaje: formularze narzędzi PRO mają układ sprzed 6.x (działają, wyglądają spójnie), wybór soli w wąskich polach ucina długie nazwy.

## 0m. Wersja 6.1 – audyt UX/UI i poprawki (17.11.2026)

Metoda: przegląd wszystkich ekranów (27 adresów, tryb prosty i PRO) przy 360, 430 i 1280 px, w jasnym i ciemnym motywie; automatyczne sprawdzenie przewijania w poziomie, błędów JS, małych celów dotyku i ekranów z błędem modułu.

Krytyczne
- Pierwsze uruchomienie bez wskazówki, od czego zacząć → karta „Pierwsze kroki” w Akwarium (objętość i rodzaj, nawozy, pierwszy test), znika po wykonaniu.
- Kalkulator: brak informacji, do czego służy tryb i co wpisać (butelka/dawka) → opis trybu pod przełącznikiem, kroki 1–2 w nagłówkach, „Co wpisać” w trybie prostym.
- Pod tytułem narzędzi wyświetlało się „null” → poprawione.

Ważne
- Stan wody: „1 parametr do uwagi” bez nazwy → „Sprawdź: CO₂” / „Pilne: …”; data testu raz w nagłówku zamiast w każdym kafelku.
- Nawozy w Akwarium: pola dawki bez podpisu → „Dawka” i „Razy w tygodniu”; kafelki tylko dla składników, które faktycznie dodajesz, reszta w jednym zdaniu.
- Mikroelementy (Mn, Zn, B, Mo) podświetlane już przy małym przekroczeniu zakresu → kolor dopiero przy 3× powyżej (Cu i makro bez zmian).
- Tabela „Twardość, azot, pozostałe jony” zwinięta w trybie prostym, rozwinięta w PRO.
- Pusty dziennik → opis i przyciski „Dodaj test wody” / „Inny wpis”.
- Błąd modułu → zwykły język, szczegóły techniczne zwinięte.
- Teksty odwołujące się do nieistniejących zakładek („Nawożenie”) → poprawione.
- Klawiatura ekranowa: dolny pasek chowa się podczas wpisywania.

Kosmetyczne
- Statystyki wykresu wychodziły poza ekran przy 360 px → siatka dopasowana.
- Przycisk „wstecz” 31 px → 44 px.
- Ikony w nagłówkach kart usunięte (zostały tam, gdzie oznaczają rodzaj wpisu lub zadania).
- Desktop: Kalkulator i Akwarium w dwóch kolumnach (wynik kalkulatora przyklejony obok formularza), szerszy nagłówek.
- Dostępność: role zakładek w Kalkulatorze, wyłączenie animacji przy „ograniczaj ruch”.

Bez zmian: silnik chemii, wzory, algorytmy dawek, schemat danych i migracje, kopie zapasowe, tryb offline.

Testy: 53 jednostkowe, E2E telefon, nowy `tests/e2e_ux.py` (pierwsze uruchomienie, brak przewijania w poziomie i błędów JS na 13 ekranach, 360 px jasny/ciemny i 1280 px).

Do dalszej pracy: na desktopie dolny pasek nawigacji (można przenieść na bok), długi ekran Akwarium przy wielu nawozach, wąska tabela asystenta przy 360 px, narzędzia PRO (tools.js) mają jeszcze starszy układ formularzy.

## 0l. Wersja 6.0 – uproszczenie (17.11.2026)

1. Nawigacja: 3 zakładki (Kalkulator, Akwarium, Dziennik) + przycisk „+”. Bez podzakładek.
   - Akwarium: jeden ekran – woda (ostatnie testy), dziś do zrobienia, nawozy z dawkami i sumą tygodniową, lista: podmiana wody, problemy z roślinami, glony, plan, baza nawozów. Ustawienia osobno (przycisk w nagłówku).
   - Dziennik: wykres na górze, pod nim wpisy; „Wnioski” = analiza + asystent.
   - Narzędzia: z Kalkulatora („Więcej narzędzi”), lista bez ikon. Stare adresy (#/zbiornik/panel, #/dziennik/analiza…) prowadzą do nowych ekranów.
2. Nawozy w jednym miejscu: lista nawozów z dawkami tylko w Akwarium; baza nawozów z Akwarium i z Kalkulatora. Usunięto „Stosowane nawozy” z ustawień i „Sumę gotowych nawozów” z listy narzędzi (dubel).
3. Tekst: objaśnienia zwinięte pod „ⓘ” (zakresy „typowo”, linia szacunku na wykresie, „w wodzie do ok.”), krótsze podtytuły i komunikaty.
4. Wygląd: jasny, niski nagłówek; karty bez obramowań; listy z liniami zamiast kafli z ikonami; sekcje rozwijane bez ikon.
5. Ustawienia: nazwa, objętość, podmiana, rodzaj (3 kafle + krewetki/rybne jako opcja); światło, rośliny i CO₂ w „Więcej”.

## 0k. Wersja 5.6 – elementy z arkusza (17.11.2026)

- Wynik (Makro, Mikro, Sprawdź, Preparaty): tabela „Twardość, azot, pozostałe jony” – dawka i tydzień: wzrost GH i KH, azot razem jako NO₃ i jako N, NH₄, fosfor jako P, Na, SO₄ (do 200 bez obaw), Cl (do 150 bez obaw); NO₃:PO₄ i N:P tylko informacyjnie.
- Mikro: chlorki i azotany Fe, Mn, Cu, Zn; Fe(II) i Fe(III); kobalt (siarczan, chlorek); boraks Na₂B₄O₇·10H₂O.
- Chelatowanie: gdy w butelce są sole metali bez chelatu – opcja dodania Na₂EDTA·2H₂O albo Na₄EDTA·2H₂O w ilości 1 mol na 1 mol metalu (Fe, Mn, Zn, Cu, Co); sód z EDTA wliczany do wyniku.
- Skład z etykiety (preparat ogrodniczy): płyn w % (z gęstością) albo w g/l; oprócz form nawozowych (N, P₂O₅, K₂O, MgO, CaO) także jony (NO₃, NH₄, PO₄), P, K, Mg, Ca oraz siarka (S, SO₃, SO₄).

Nie przeniesione: osobne Fe(II)/Fe(III) w podsumowaniu, „Inny 1–3”, zakładki Węgiel i Pomiary (Twardość, Miareczkowanie i Przeliczniki są w Narzędziach w trybie PRO).

## 0j. Wersja 5.5 – sugerowane poziomy (17.11.2026)

Przy celu i w kafelkach wyniku (Makro, Mikro, Preparaty, Nawożenie) – „typowo” jako dawka tygodniowa orientacyjnie: NO₃ 5–20, PO₄ 0,5–2, K 5–30, Mg 5–20, Fe 0,1–0,8, Mn/Zn/Mo do 0,05, Cu/B do 0,02 mg/l. Powyżej zakresu – obramowanie i pomarańczowy opis, poniżej – niebieski. Tylko informacja: aplikacja nie ustawia celów ani proporcji. Ca bez zakresu (zwykle pochodzi z wody).

## 0i. Wersja 5.4 – audyt Kalkulatora (17.11.2026)

| # | Problem | Zmiana |
|---|---|---|
| 1 | Wiersz celu w jednej linii (pierwiastek, cel, sól, ×) – na wąskim ekranie nazwa soli ucięta pod strzałką listy, elementy na siebie nachodzą | Wiersz w dwóch liniach: pierwiastek + cel + × u góry, źródło na całą szerokość pod spodem, z pełną nazwą |
| 2 | Lista źródeł Fe: jedna grupa „Mikro i żelazo”, chelaty pomieszane z solami | Grupy: Chelaty / Sole mikro / Gotowe mieszanki. Nowy glukonian żelaza(II). Przy FeSO₄ uwaga o utlenianiu bez chelatu |
| 3 | Mieszanka (np. CSM+B) wybrana dla Fe daje też inne pierwiastki – nie było tego widać przy wierszu | Pod wierszem: „Mieszanka – daje też Mn, Zn, Cu, B, Mo” |
| 4 | Ustawienia butelki 2×2 zajmowały pół ekranu na szerokim widoku | 4 pola w jednym rzędzie od 520 px, mniejsze etykiety |
| 5 | Stały alert „Rozrabiaj na RO” przy każdym wyniku – szum | Informacja w stopce wyniku („Uzupełnij wodą RO lub destylowaną…”) |
| 6 | Dwa równorzędne przyciski pod wynikiem | Jeden główny („Zapisz jako nawóz”), „Sprawdź ten skład” jako link |
| 7 | Komunikat „z innych soli” przy mieszankach | „z innych źródeł” |

Do rozważenia: baner „Ustaw akwarium” w Kalkulatorze (kalkulator ma własną objętość), ukrycie „Sprawdź” w trybie prostym.

## 0h. Wersja 5.3 – źródła mikro (17.11.2026)

- Mikro: oprócz soli można wybrać gotowe koncentraty mikro (Intermag Mikro, Mikro Plus, Plantex CSM+B, NutriTrace, Mikrochelat Fe-13, Rexolin APN, Fetrilon Combi 2, MikroMag) i własne nawozy mikro/Fe. Mieszanka liczona w całości – pokrywa też pozostałe pierwiastki, a sole dobierane są tylko na brakującą resztę.
- Gotowe nawozy akwarystyczne (np. Easy Life Ferro, Tropica) nie trafiają do Mikro – dawkuje się je bez rozrabiania w zakładce Preparaty. Mieszanki z dużą ilością K/Mg/Ca (np. Equilibrium) też nie.
- Nowe surowce: molibdenian sodu Na₂MoO₄·2H₂O (domyślne źródło Mo), chelaty Mn-EDTA 13%, Zn-EDTA 15%, Cu-EDTA 15% (zawartość wg etykiety).
- Przełącznik akwarium ukryty w Kalkulatorze i Narzędziach (kalkulator ma własną objętość).

## 0g. Wersja 5.1 – Kalkulator: Makro, Mikro, Preparaty (17.11.2026)

- Kalkulator ma zakładki Makro, Mikro, Preparaty, Sprawdź. Usunięto z niego wodę do podmian (zostaje w Podmianie wody i Ustawieniach).
- Mikro z soli: Fe (chelaty, FeSO₄), Mn, Zn, Cu, B, Mo – cel tygodniowy → gramy do butelki; ostrzeżenie, gdy ilość jest za mała do odważenia.
- Preparaty płynne: bez butelki – ile daje 1 ml w danym akwarium, dawka na cel tygodniowy, przycisk „Dodaj do nawożenia akwarium”. Rozrabianie w butelce tylko dla proszków.

## 0f. Wersja 5.0 – kontrola i analiza nawożenia (17.11.2026)

**Etap 1 – Kontroler nawożenia** (Akwarium → Nawożenie): lista stosowanych nawozów z dawką i liczbą dawek w tygodniu, suma składników z wszystkich nawozów (bez podwójnego liczenia, każdy pierwiastek przeliczany raz z ppm produktu), ostrzeżenia o brakującym składzie i o tym samym składniku z kilku nawozów, górna granica stanu ustalonego, porównanie z dziennikiem (7/30 dni). Własne nawozy: rodzaj, opakowanie, status składu.

**Etap 2 – Analiza**: wykresy NO₃/PO₄/K/Fe/Mg/Ca – pomiary (punkty) oddzielone od szacunku (linia przerywana), podmiany i dawki na osi. Szacunek liczony z dawek, podmian i wody; zużycie roślin z par pomiarów. Szacunek nigdy nie jest pokazywany jako pomiar.

**Etap 3 – Problemy z roślinami** (Narzędzia → Problemy): objawy + pytania (które liście, które rośliny, od kiedy, zmiany nawożenia/światła/CO₂) + ostatnie testy → kilka możliwych przyczyn z uzasadnieniem, co sprawdzić, uwagi o nawożeniu, obserwacje, bezpieczne kroki. Żaden objaw nie prowadzi do jednej przyczyny; brak testów i krótki czas trwania są wprost zgłaszane. Wynik można zapisać w dzienniku. Reguły w `diag.js` (testy w `tests/diag.test.js`).

**Etap 4 – Problemy z glonami**: rodzaj nalotu + wiek zbiornika, światło (h, W), CO₂ i jego stabilność, podmiany, kondycja roślin, NO₃/PO₄, nawozy z planu → możliwe przyczyny, co sprawdzić, czego unikać (bez automatycznego obcinania NO₃/PO₄/mikro, jedna zmiana naraz).

**Etap 5 – Podmiana i plan**: podmiana wody pokazuje stan po podmianie oraz po tygodniu dawkowania nawozów z planu (bez poboru roślin). Plan: przycisk „Dawki z zakładki Nawożenie” tworzy zadania z nawozem i dawką, rozłożone równo w tygodniu (istniejących nie zmienia). Odhaczenie zadania z nawozem od razu zapisuje dawkę w dzienniku. Wskazówka o teście przed podmianą. Aplikacja nigdy sama nie zmienia dawek.

**Etap 6**: wersja 5.0, cache `akwarysta-v5.0` (nowy plik `diag.js` w trybie offline), 51 testów jednostkowych, test E2E na telefonie.

**Pozostało**:
- edytor własnej soli: potwierdzenie przy niejednoznacznym wzorze (np. hydraty),
- eksport/import samej bazy nawozów (teraz jest pełna kopia zapasowa),
- zadania „test przed podmianą” tworzone automatycznie dzień przed podmianą (teraz tylko wskazówka),
- składy części preparatów w bazie wymagają potwierdzenia z etykiety (oznaczone statusem).

## 0e. Wersja 4.5 – rozrabianie preparatu (17.11.2026)
- Kalkulator ma trzy tryby: Z soli / Z preparatu / Sprawdź.
- „Z preparatu” (jak arkusz referencyjny „Ogrodnicze”): wybór preparatu (ogrodnicze i chelaty z etykiety, moje nawozy, baza akwarystyczna albo własny skład %), „Mam cel” (składnik + mg/l tygodniowo → ile g/ml do butelki) lub „Mam ilość” (g/ml do butelki → mg/l). Wynik: ile odważyć/odmierzyć, uzupełnić wodą RO do objętości butelki, mg/l na dawkę i tydzień dla wszystkich składników; zapis jako nawóz.
- Wzór: ilość = cel × V × butelka / (zawartość mg/l na 1 g|ml × dawka × dawek/tydz.). Przykład: CSM+B, Fe 0,2 mg/l/tydz., 100 l, 500 ml, 10 ml × 7 → 2,04 g; Mikro Plus → 6,05 ml.
- „Sprawdź” – tylko sole (etykieta przeniesiona do „Z preparatu”).

## 0d. Wersja 4.4 – preparaty ogrodnicze w bazie (17.11.2026)
Zweryfikowane ze źródłem (status „Z etykiety”, pole src, skład % i mg/l):
- Intermag Mikro Plus – zaktualizowany do bieżącego składu producenta (Fe 2,0%, Mn 0,8%, Zn 0,3%, Cu 0,1%, B 0,2%, Mo 0,05%; 23,6 g/l Fe; gęstość 1,18).
- Plantex CSM+B (dawniej „ACS+B”) – Fe 7,0%, Mn 2,0%, Zn 0,4%, Cu 0,1%, B 1,3%, Mo 0,06% (Plant-Prod).
- Nowe: Plantex NutriTrace CSM (bez boru), Intermag Mikrochelat Fe-13, Yara Rexolin APN, Compo Fetrilon Combi 2, Elvita MikroMag.
- Symfonia złota – bez zmian (arkusz referencyjny 2013), status „Niezweryfikowany”: nie znaleziono etykiety producenta.
- „Sprawdź nawóz → Etykieta (%)”: wybór preparatu z bazy wypełnia skład, formę i gęstość; link do źródła.
- Test: mg/l na gram/ml = % × 10 (× gęstość) dla wszystkich pozycji z etykiety; kolejność bazy zachowana (id w dzienniku).

## 0c. Wersja 4.3 (17.11.2026)
- Woda do podmian w Kalkulatorze: pola kranówki (NO₃, PO₄, K, Mg, Ca, Fe; GH, KH, Na, Cl, SO₄ zwinięte) od razu w karcie; pod nimi wynik „Podmiana X% dodaje co tydzień: … – odejmuję od celu”. Wcześniej bez wpisanej analizy wybór wody nic nie zmieniał i nie było tego widać.
- „Sprawdź nawóz” → „Etykieta (%)”: nawozy ogrodnicze i inne opisane procentami (N azotanowy / amonowy / mocznikowy, P₂O₅, K₂O, MgO, CaO, mikro). Płyn (gęstość, dawka prosto do akwarium) albo proszek (g w butelce). Zapis jako nawóz. Zastępuje osobny kalkulator „Nawozy ogrodnicze”.
- Ostrzeżenie, gdy tygodniowa dawka przekracza 2× górny cel akwarium.

## 0b. Wersja 4.2 – woda i porządki (17.11.2026)
- Woda do podmian: najpierw wybór Kranówka / RO / Kranówka + RO, potem parametry (analiza wody w osobnym oknie). Jeden wspólny element w Kalkulatorze, Ustawieniach akwarium i Podmianie; dane zapisane raz w akwarium (`water`, `tap`, `ro`, `roFrac`).
- Kalkulator „Przygotuj”: to, co wnosi woda z podmian (podmiana % × stężenie w wodzie), jest odejmowane od celu; tabela nawóz / woda / razem. Ostrzeżenie, by butelkę z PO₄ lub Fe rozrabiać na RO, gdy kranówka jest twarda.
- Usunięto czystość soli z Kalkulatora i Korekty (została w recepturach).
- Usunięte duplikaty: Makro NPK i Jak nawozić (= Kalkulator), Kalkulator soli (= Korekta + Kalkulator; własne sole → Nawozy), Sprawdź wodę (= pomiar w dzienniku z oceną), prosta Podmiana i RO + kran (= Podmiana wody), „Ile wymienić” z Kumulacji (→ Podmiana wody), osobny ekran Receptury (→ Nawozy).
- Akwarium → Stan: tylko parametry i zadania; szacunki i wnioski są w Dziennik → Analiza, asystent w Dziennik → Asystent.

## 0a. Wersja 4.1 – układ i wygląd (17.11.2026)
- Ekran startowy = Kalkulator nawozu: „Przygotuj nawóz” (cel → gramy soli, jak arkusz Podstawowe) i „Sprawdź nawóz” (gramy → mg/l, jak arkusz Rozpuszczanie). Wynik zgodny z arkuszem (100 l, 500 ml, 10 ml × 7: KNO₃ 11,6 g, KH₂PO₄ 1,02 g, K₂SO₄ 13,2 g, MgSO₄·7H₂O 21,7 g).
- W „Przygotuj” każdy składnik (NO₃, PO₄, K, Mg, Ca, Fe) ma własny wybór soli spośród wszystkich zawierających ten składnik (także własne sole); składniki dodaje się/usuwa.
- Zakładka Akwarium: Ustawienia (nazwa, objętość, podmiana, rodzaj: low/medium/high-tech, krewetki, rybne; światło, rośliny, CO₂) + zwinięte sekcje „Więcej”; Stan; Plan. Dodany profil medium-tech.
- Nowa paleta: mech #0E3B2C, liść #1B7A4C, kiełek #A8E59B, tło #E9F2EB; wynik jako ciemnozielona etykieta.

## 0. Wersja 4.0 PRO – co zmieniono (17.11.2026)

### Analiza v3 – błędy i braki znalezione przed rozbudową
| # | Problem | Waga | Rozwiązanie w v4 |
|---|---|---|---|
| 1 | Sole z jedną, „zaszytą” formą uwodnienia (np. CaCl₂ tylko ·2H₂O, CaSO₄ tylko ·2H₂O); masy molowe wpisane ręcznie | wysoka | `chem.js`: masy molowe liczone z mas atomowych IUPAC + n·H₂O; wybór formy dla każdej soli |
| 2 | Brak czystości surowca | wysoka | czystość (%) w kalkulatorze soli, recepturach, korekcie, mineralizatorach |
| 3 | Brak własnych soli | średnia | „Moje sole”: wzór chemiczny (parser, np. `Ca(NO3)2·4H2O`) albo zawartość % z etykiety |
| 4 | Mg i Ca nie były mierzone ani oceniane | wysoka | Mg, Ca w pomiarach, celach, wykresach, analizie, asystencie |
| 5 | Ostrzeżenie o „właściwym” NO₃:PO₄ 8–16:1 (arbitralna proporcja) | średnia | stosunek pokazywany tylko informacyjnie |
| 6 | Receptura = jednorazowy zapis nawozu; brak edycji, duplikowania, historii partii | średnia | receptury jako osobne obiekty + historia przygotowanych roztworów; nawóz synchronizowany z recepturą |
| 7 | Brak korekty „teraz → cel” z uwzględnieniem składników ubocznych | wysoka | moduł Korekta (rzutowany Gauss–Seidel: każdy cel dokładnie, nadmiar z innych soli → 0 + ostrzeżenie) |
| 8 | Podmiana nie łączyła RO, kranówki i mineralizatorów z NO₃/PO₄/K/Mg/Ca wody źródłowej | średnia | Podmiana i mineralizacja PRO → wynik przenoszony do korekty nawożenia |
| 9 | Szacowanie stężeń uwzględniało tylko kranówkę, bez udziału RO | niska | woda do podmian = kran·(1−f) + RO·f (`tapOf`) |
| 10 | Brak objętości brutto/kalkulatora netto, poziomu techniki, światła, obsady roślin, stosowanych nawozów | średnia | rozszerzony profil + kalkulator objętości |
| 11 | Brak przypomnień | średnia | eksport planu do kalendarza (.ics, RRULE + alarm) – niezawodne bez serwera |
| 12 | W repozytorium brak testów, o których mówił audyt v3 | średnia | `tests/` – 33 testy jednostkowe + test E2E na emulowanym telefonie |
| 13 | Produkty: brak producenta, statusu wiarygodności, dawkowania, notatek; nie dało się zapisać produktu bez składu | średnia | producent, status (zweryfikowany / z etykiety / niezweryfikowany / wymaga uzupełnienia), dawkowanie, notatki |

Bez zmian (działały poprawnie i zostały): makro/mikro/PMDD, gotowe i ogrodnicze, kwas/KH (z poprawką H₃PO₄), twardość, RO+kran, kumulacja, CO₂, miareczkowanie, przeliczniki, dziennik, analiza, plan, kopia zapasowa.

### Nowe moduły
- **Kalkulator soli** (tryb prosty i PRO): cel mg/l → gramy/mg albo gramy → mg/l; wszystkie składniki uboczne, N/P/S, ΔGH/ΔKH; przeliczenie na inne formy uwodnienia; ostrzeżenia (NH₄, Cu, duże jednorazowe zmiany).
- **Roztwory i receptury** (PRO): stężenia g/l (= mg/ml), efekt 1 ml w akwarium, dawka → mg/l (jednorazowo i tygodniowo), ml na zadany przyrost, rozpuszczalność, niezgodności (Ca+PO₄, Ca+SO₄, Fe+PO₄, Ca+węglany); zapisz/edytuj/duplikuj/usuń; „Przygotowałem” → historia partii (skalowanie mas do objętości partii).
- **Korekta parametrów**: NO₃, PO₄, K, Mg, Ca, Fe – teraz i cel wpisuje użytkownik (bez uniwersalnych wartości); źródło: sól (forma + czystość), mój nawóz/receptura albo produkt z bazy; przewidywane parametry z jonami ubocznymi; podział dużej dawki na dni; „Dodałem – zapisz w dzienniku”.
- **Podmiana i mineralizacja** (PRO): kranówka + RO (udział %) + mineralizatory → skład nowej wody, GH/KH, parametry po podmianie; nieznane wartości oznaczane (nie zgadujemy); przejście do korekty z parametrami po podmianie.
- **Objętość brutto/netto**: wymiary, szkło, poziom wody, podłoże, dekoracje → zapis do profilu.
- **Asystent nawożenia** (Dziennik → Asystent): średnia dawka i podmiany z 4 tygodni, zużycie z par pomiarów (bilans: start + nawóz − podmiany vs test), kumulacja (trend i stan ustalony), propozycja zmiany dawki maks. ±25% na raz z uzasadnieniem i poziomem pewności; brak propozycji bez danych o zużyciu.

### Założenia v4
- 1 mg/l ≈ 1 ppm (woda słodka, gęstość ≈ 1 kg/l); koncentraty podawane w g/l.
- Masy atomowe: IUPAC 2021 (wartości konwencjonalne). H₂O = 18,015 g/mol.
- Rozpuszczalność: orientacyjna, 20 °C, w g soli bezwodnej na 100 ml wody; w mieszaninie zwykle mniejsza.
- Stan ustalony: c = (dawka + p·c_woda − (1−p)·zużycie) / p (ten sam model co kumulacja v3).
- Składy produktów z bazy pozostają oznaczone jako niezweryfikowane; nowych składów nie dopisano (brak wiarygodnych danych) – użytkownik może dodać produkt ze statusem „Wymaga uzupełnienia”.

### Dane
- Schemat 4, klucz `akwa.v4`; migracja v2→v3→v4. Klucze `akwa.v3` i `akwa.v2` NIE są kasowane.
- Nowe kolekcje: `salts`, `recipes`, `batches`; receptury z v3 przeniesione z mapowaniem form (np. MGSO4_7 → MgSO₄·7H₂O) – stężenia identyczne jak w v3 (test).

### Testy
- `npm test` (Node ≥ 18): 33 testy – masy molowe vs tablice, udziały masowe, zgodność z silnikiem v3, przykłady liczone niezależnie, korekta (w tym przypadki nadmiaru i sprzężeń), podmiana, mieszanie wód, objętość, parser wzorów, błędne dane, migracje v2/v3→v4, asystent, eksport .ics.
- `python3 tests/e2e_mobile.py` – Chromium 390×844 z dotykiem: migracja realnych danych v3, wszystkie ekrany w trybie prostym i PRO, kalkulator soli z czystością, własna sól, receptura (zapis, edycja, duplikat, partia), korekta, podmiana PRO → korekta, objętość → profil, asystent, produkt bez składu, pomiar Mg/Ca, eksport .ics, motyw ciemny, brak przewijania w poziomie; zero błędów JS.
- Nie testowano na fizycznych telefonach (iOS Safari, Android Chrome).

---

## 1. Stan wyjściowy (v2)
Pliki: index.html, styles.css, products.js (29 nawozów z arkusza referencyjnego), calc.js (silnik), ui.js (stan, router, start, dziennik), tools.js (kalkulatory). Dane: jeden klucz localStorage `akwa.v2`, bez numeru wersji.

### Mocne strony
- Silnik obliczeń zgodny z arkuszem referencyjnym (makro, PMDD, kumulacja, miareczkowanie, CO₂ – sprawdzone testami).
- Działa offline, instalowalna PWA, wiele zbiorników, eksport/import.
- Tryb prosty i zaawansowany, czytelny wygląd mobilny.

### Błędy i niedociągnięcia
| # | Problem | Waga |
|---|---|---|
| 1 | **Kwas fosforowy**: liczony jako 1 H⁺ na cząsteczkę. Przy pH 6,5–7,5 drugi proton (pKa₂ ≈ 7,21) reaguje częściowo (1,16–1,66 H⁺) → zalecana dawka zawyżona o 15–40%, czyli większy spadek KH niż planowany. | wysoka |
| 2 | **Amoniak oceniany bez pH i temperatury.** Toksyczny jest wolny NH₃; ten sam wynik testu przy pH 6,5 jest ~10× mniej groźny niż przy 7,5. Fałszywe alarmy i brak alarmu przy wysokim pH. | wysoka |
| 3 | Ocena wyników jedna dla wszystkich akwariów (np. KH < 2 „groźne” także dla Caridin na aktywnym podłożu; NO₃ < 5 „za mało” w rybnym). | wysoka |
| 4 | „Sprawdź wodę → zapisz” gubiło NH₄ i NO₂. | średnia |
| 5 | Brak wersjonowania i migracji danych; błąd zapisu (pełna pamięć) był cicho ignorowany; import bez walidacji i bez kopii awaryjnej. | wysoka |
| 6 | Kalkulatory Twardość i Kwas zapamiętywały objętość pierwszego zbiornika. | niska |
| 7 | Harmonogram tylko wg dni tygodnia, bez historii wykonań; mapa „zrobione” rosła bez końca. | średnia |
| 8 | CO₂ wyliczane z pH i KH z różnych dni. | średnia |
| 9 | CSV z kropką dziesiętną (źle w polskim Excelu). | niska |
| 10 | Produkty z bazy bez oznaczenia źródła; brak własnych produktów. | średnia |

### Sprawdzone i poprawne (bez zmian)
ppm = mg/l; przeliczenia N↔NO₃, P↔PO₄↔P₂O₅, K↔K₂O, Mg↔MgO; 1°dH = 10 mg/l CaO = 7,15 mg/l Ca = 4,34 mg/l Mg = 0,357 mmol/l HCO₃⁻·… ; mieszanie RO+kran (liniowe dla jonów zachowawczych); kumulacja c' = (c − zużycie)(1 − p) + p·c_w + dodatek (zgodna z arkuszem); jednorazowa podmiana f = (c₀ − c_cel)/(c₀ − c_w); miareczkowanie KH (2 HCl : 1 CaO) i GH/Ca (EDTA 1:1); rozcieńczanie kwasów przez masy i gęstości; CO₂ = 3·KH·10^(7−pH) (założenie: KH tylko z wodorowęglanów – opisane w aplikacji).

## 2. Ranking ulepszeń (wartość dla użytkownika)
1. Dziennik zdarzeń (pomiary, podmiany, nawozy, czynności, notatki) przypisany do zbiornika + szybkie dodawanie „+”.
2. Panel zbiornika: wskaźniki parametrów, zmiany, zadania na dziś, wnioski.
3. Analiza wg profilu zbiornika: cele, wolny NH₃, nagłe zmiany, trendy, „co sprawdzić najpierw”.
4. Bezpieczeństwo danych: wersja schematu, migracja, kopia awaryjna, walidacja importu.
5. Poprawki obliczeń (H₃PO₄, NH₃, pary pH/KH).
6. Plan pielęgnacji: dni tygodnia lub „co N dni”, historia wykonań, auto-odhaczanie.
7. Historia nawożenia + szacowane stężenia z podmianami i zużyciem (wyliczanym z pomiarów).
8. Własne nawozy i receptury, oznaczanie źródła składu.
9. Profil zbiornika: typ, cele, światło, CO₂ (zmiany logowane), podłoże, filtr, rośliny, obsada, woda do podmian.
10. Zdjęcia i porównywanie wyglądu (etap 3).

## 3. Plan wdrożenia
- **Etap 1 – WDROŻONY (v3.0):** punkty 1–6 i 9.
- **Etap 2 – WDROŻONY (v3.0):** punkty 7–8.
- **Etap 3:** zdjęcia w IndexedDB (kompresja ~1200 px), oś czasu zdjęć i porównanie „przed/po”, eksport kopii ze zdjęciami (osobny plik).
- **Etap 4:** własne sole w kalkulatorach, planer dawek dzienny/tygodniowy z „podaj teraz”, porównanie dwóch dowolnych okresów na jednym wykresie, edycja wszystkich typów wpisów.

## 4. Czego nie robić (na razie)
- **Powiadomienia push** – bez serwera i z ograniczeniami iOS są zawodne; obiecywanie przypomnień, które nie przyjdą, szkodzi.
- **Baza gatunków z wymaganiami** – duże ryzyko nieźródłowych danych; zamiast tego własne cele w profilu.
- **Automatyczne „uzupełnianie” składów produktów** – tylko etykieta lub wpis użytkownika, z oznaczeniem źródła.
- **Automatyczne dawki leków/chemii korygującej pH** – ryzyko dla zwierząt; aplikacja zaleca tylko bezpieczne kroki (podmiana, ograniczenie karmienia, powtórzenie testu, stopniowe zmiany).
- **Synchronizacja w chmurze / konta** – wymaga infrastruktury; kopia JSON wystarcza.
- **Framework** – obecny kod (~2,3 tys. linii) nie uzasadnia zmiany.

## 5. Założenia merytoryczne v3
- Cele parametrów: orientacyjne, zależne od typu (high-tech, low-tech, Neocaridina, Caridina, rybne), edytowalne.
- Wolny amoniak: pKa = 0,09018 + 2729,92/T[K] (Emerson i in., 1975); test traktowany jako suma NH₄⁺+NH₃ podana jako NH₄. Progi: >0,02 mg/l uwaga, >0,05 mg/l groźnie. Ocena tylko z pH z tego samego okresu (≤ 2 dni).
- H₃PO₄: H⁺ na cząsteczkę = 1 + 1/(1+10^(7,21 − pH_końcowe)).
- Szacowanie stężeń: od ostatniego pomiaru, dawki (mg/l zapisane w chwili dawki), podmiany c·(1−f)+f·c_woda, zużycie netto liniowo w czasie; wynik ≥ 0. Zużycie wyliczane z par pomiarów 3–21 dni z zapisanymi dawkami/podmianami.

## 6. Dane i wersje
- Klucz `akwa.v3` (schemat 3). Stary `akwa.v2` nie jest kasowany. Kopia poprzedniego stanu `akwa.v3.prev` (co ≥ 10 min, przy imporcie zawsze). Uszkodzony zapis → automatyczne przywrócenie poprzedniego.
- Service Worker: cache `akwarysta-v3.0`, stare kasowane przy aktywacji, sieć najpierw.

## 7. Testy
- 31 testów jednostkowych logiki (migracja v2→v3, naprawa danych, NH₃, ocena wg profilu, trendy, symulacja, zużycie, terminy zadań, H₃PO₄) + wcześniejsze testy silnika zgodności z arkuszem.
- Test E2E w Chromium z emulacją telefonu 390×844 (dotyk): migracja realnych danych v2, wszystkie 24 ekrany, zapis pomiaru/podmiany/nawozu/notatki, receptura → „Moje nawozy”, tryb zaawansowany, motyw ciemny. Brak błędów JS.
- Nie testowano na fizycznych telefonach (iOS Safari, Android Chrome) – do zrobienia przez użytkownika.

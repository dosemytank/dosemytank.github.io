# DoseMyTank (dawniej Akwarysta) – stan aplikacji i plan dalszych prac (20.11.2026, wersja 8.0)

Stan wg repozytorium: wersja 6.9, ok. 4,7 tys. linii JS, 65 testów jednostkowych (przechodzą), 2 testy E2E (telefon, UX). Szczegóły i uzasadnienia starszych decyzji: `AUDYT.md` oraz dokumenty audytu v3 i v6 w projekcie.


## 8.0 – wersja międzynarodowa (20.11.2026)

Angielski jest językiem domyślnym, polski w pełni obsługiwany. Obliczenia, dane i zapis bez zmian (test: tekst 80 ekranów PL identyczny z 7.17).
- [x] System języków: `i18n.js` + `i18n-en.js` (2 180 tekstów). Każdy tekst w `tl('tekst po polsku', …)`; klucz = polski tekst. Wybór: `?lang=` → zapisany (`dmt.lang`) → dotychczasowi użytkownicy (dane `akwa.v*`) = PL → język przeglądarki → EN. Zmiana w Ustawieniach, offline, z przeniesieniem domyślnych nazw (zbiornik, zadania, tagi).
- [x] Liczby i daty wg języka (`DEC`, `fmtNum`, `fmtDate*`); pola przyjmują przecinek i kropkę. EN: mg/L, L. Galony US – przelicznik przy objętości zbiornika (obliczenia zawsze w litrach).
- [x] Strony: `index.html` (EN), `pl/index.html`, `about.html`, `feedback.html`, `pl/o-aplikacji.html`, `pl/kontakt.html`, `404.html`; `site.css`, `site.js`. Zrzuty EN w `img/en/`, podglądy linków `img/og.png` (EN), `img/og-pl.png`.
- [x] SEO: tytuły, opisy, canonical, hreflang EN/PL/x-default, Open Graph, Twitter Cards, `sitemap.xml`, `robots.txt`, dane strukturalne (WebApplication).
- [x] PWA: `manifest.json` (EN) i `manifest-pl.json` (wybierany w `app.html`), skróty, zrzuty; `sw.js` 8.0.0 z oboma językami i stronami.
- [x] Udostępnianie: przycisk linku do bieżącego ekranu, angielskie adresy (`#/calculator/remineralization`, `#/tools/co2` …). Zgłaszanie błędów: Ustawienia → Pomoc i kontakt (GitHub Issues z wersją i przeglądarką), `.github/ISSUE_TEMPLATE`.
- [x] Testy: `tests/i18n.test.js`, `tests/weryfikacja.test.js` (niezależna weryfikacja chemii), `tests/e2e_i18n.py`, `tests/e2e_strona.py`, `tests/e2e_offline.py`; dotychczasowe testy E2E działają w PL (`tests/pl_lang.py`).
- [ ] Do decyzji: dawka mikro PPS-Pro (oryginał: 0,5 ml / 40 l, w aplikacji 1 ml), autor i kontakt poza GitHubem, własna domena, waluta kosztu w EN.

## 0. Przebudowa kalkulatora 7.0 – postęp (19.11.2026)

Plan i uzasadnienia: audyt kalkulatora z 18.11.2026 (Etap 1). Decyzje: Zakupy usunięte z kalkulatora; ogrodnicze mieszanki i chelaty tylko w Mikro; Lekkie/Średnie/Mocne jako wartości startowe Makro; narzędzia na `calc.js` poza zakresem; poprawki C2–C4 wchodzą.

- [x] Krok 1. Fixture wyników 6.11: `tests/kalk_capture.py` → `tests/fixtures/kalk-6.11.json` (188 przypadków, wygenerowany na 3aee474). Porównanie: `tests/kalk_diff.py`.
- [x] Krok 2. `nawozy-licz.js` (LICZ) – obliczenia przeniesione 1:1 z `kalkulator.js`; 0 różnic w 188 przypadkach.
- [x] Krok 3. C2: jedna reguła niezgodności `X.compatIssues` / `X.compat` w `chem.js` (ostrzeżenia w `solution()` i podział na butelki). Nowe: Mn/Zn/Cu/Co + PO₄, struwit dzielony automatycznie, metale i Mg z węglanami. Zamierzone różnice względem 6.11: 4 przypadki (struwit ×2, Mn + PO₄, NH₄ z Ca i Mg → 3 butelki).
- [x] C3: zawartość chelatu z etykiety (`row.pct`, zapamiętywana w `kalk.chel`), C4: czystość soli w Makro/Mikro (`row.purity`, tryb zaawansowany). Bez wpisu – wyniki jak w 6.11.
- [x] Krok 4. `nawozy-dane.js` – przepisy (EI, PPS-Pro, PMDD), cele startowe, domyślne źródła i zakresy na identyfikatorach `chem.js` (C1). Z `calc.js` usunięte PMDD i PRESETS; molibdenian PMDD przeliczany z wzoru. Wyniki bez zmian.
- [x] Krok 5. Ekrany Makro, Mikro, Gotowe nawozy, Receptury, Historia (`kalk-*.js`); usunięte `kalkulator.js` i `zakupy.js`. E2E: `tests/e2e_kalkulator.py`, wizualny: `tests/e2e_kalk_wizualne.py` (5 szerokości × jasny/ciemny).
- [x] Krok 6–7. Style `.kx-`, wersja 7.0.0 (package.json, sw.js, APP_VERSION), AUDYT.md.
- [x] 7.1: `clone.js` na `X.compat` (3 zmienione odpowiedniki z 66), C8 (forma azotu), C5 (wspólny jon – próg 70%).
- [x] 7.2: osobny wybór formy uwodnienia; testy przeglądarkowe w GitHub Actions (`npm run test:e2e` lokalnie).
- [x] 7.3: forma uwodnienia przy każdej soli w całej aplikacji, napisy po ludzku, strona startowa.
- [x] 7.4: na sucho, woda w filtrze, EC/TDS, N : P, porównanie z EI i PPS-Pro.
- [x] 7.5: „Zrób nawóz” dla początkujących (zalecenia, szafka – od 7.11 wybór soli z zestawem na start, automatyczna dawka, co to da, zalecenia); stare kalkulatory w „Zaawansowane”.
- [ ] Otwarte: weryfikacja CSM+B i PPS-Pro, test na fizycznym iPhonie i Androidzie.
- [x] Krok 8. GitHub Actions: `npm test`.

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

## 1. Co jest (działa)

**Kalkulator** (7.0) – Przygotuj (Nawóz, Mineralizacja wody, lista zakupów i wspólna lista od 7.11), Makro, Mikro (sole, chelaty, mieszanki, EDTA), Gotowe nawozy (dawka ↔ cel, porównanie, etykieta), Receptury (EI, PPS-Pro, PMDD, moje, „Sprawdź butelkę”), Historia obliczeń. Przepisy PMDD, PPS-Pro i EI z blokiem „Dodaj osobno”. Przy konflikcie soli w jednej butelce (Ca + PO₄/SO₄, Fe + PO₄) podpowiedź podziału na butelki A i B. Silnik zgodny z arkuszem, tryb prosty i PRO.
**Sole** – 37+ surowców, w tym od 6.7: chlorek amonu, MAP, DAP, mocznik, azotan sodu, fosforan jednosodowy, węglan sodu. Ostrzeżenie o struwicie (NH₄ + Mg + PO₄).
**Akwarium** – status wody, zadania „Dziś”, **Szybki wpis** jednym dotknięciem (podmiana, dawki z planu, cofnięcie), lista nawozów z dawkami i sumą tygodniową, **zapasy nawozów** („starczy na N dni”, lista zakupów, ostrzeżenie na ekranie głównym), **koszt nawożenia** (zł/tydz. i zł/mies.), podmiana wody, problemy z roślinami, glony, plan pielęgnacji (+ .ics), baza nawozów (receptury, własne sole, eksport i import).
**Dziennik** – pomiary, podmiany, dawki, notatki, wykresy z pasmem celu, filtry, eksport CSV.
**Ocena** – cele wg rodzaju zbiornika, wolny NH₃ (Emerson), skoki parametrów, „co sprawdzić najpierw”.
**Narzędzia PRO** – twardość, kwas/KH (domyślnie ocet, ostrzeżenia dla mocnych kwasów), miareczkowanie, przeliczniki, objętość, kumulacja, CO₂, korekta parametrów.
**Dane** – localStorage, migracje, kopia poprzedniego stanu, eksport/import JSON, przypomnienie o kopii zapasowej, prośba o trwały storage, offline (Service Worker), wiele zbiorników, motyw ciemny.

**Zasada obowiązująca w całej aplikacji:** wszędzie, gdzie aplikacja każe dodać kwas, pokazuje ostrzeżenia bezpieczeństwa albo proponuje słabszy kwas (ocet 10%, kwas cytrynowy).

## 2. Zrobione od ostatniego planu

- Porządki z poprzedniego planu: usunięte szacowanie zużycia, PMDD jako preset w Sprawdź, baza z oznaczeniem składów orientacyjnych (pigułka statusu).
- Szybkie wpisy z ekranu głównego, koszt nawożenia, przypomnienie o kopii (były już w 6.x).
- 6.7: nowe sole, wiersz NH₄, odstępy w Sprawdź, blok „Dodaj osobno”.
- 6.8: ostrzeżenia i słabsze zamienniki dla kwasów (PMDD, Kwas/KH, miareczkowanie).
- 6.10: sól, która się nie rozpuści (np. K₂SO₄ 108%), dostaje kartę z poprawką jednym dotknięciem (dawka, liczba dawek, KCl zamiast K₂SO₄, w Sprawdź – więcej wody); gramy do odważenia nie pokazują się, dopóki się nie uda; przepis EI od razu ustawia działającą dawkę. Nowa zakładka Zakupy i karta „Co kupić” pod wynikiem (ilości na 1/3/6 mies., czego szukać i gdzie, waga i butelki). Zasada: stężenie w butelce zależy od dawki × liczby dawek, nie od wielkości butelki.
- 6.9: zapasy i lista zakupów, koszt tygodniowy, podział recepty na butelki, „Dodaj osobno” w Makro i Mikro, ocet jako domyślny kwas.

## 3. Do zrobienia – jakość i bezpieczeństwo

- **Test na prawdziwych telefonach** (iOS Safari, Android Chrome): instalacja PWA, klawiatura, tryb offline, aktualizacja SW. Dotąd tylko emulacja Chromium.
- **GitHub Actions**: `npm test` przy każdym pushu (brak katalogu `.github`).
- ~~Martwy plik `pro.js`~~ – usunięty w 6.9.1 (nie był ładowany; funkcje są w receptury.js, woda.js, kalkulator.js, nawozenie.js).
- **Składy orientacyjne produktów** (część bazy bez publicznego składu): oznaczyć wyraźniej albo uzupełnić z etykiet.
- Napis „kopiuj” w bazie produktów jest mylący – to „skopiuj do moich nawozów i edytuj”. Zmienić na „Dodaj do moich”.
- Test kontrastu i rozmiaru celów dotyku w trybie ciemnym; etykiety ARIA na wykresach.
- Przypadek NH₄ + Mg + PO₄ (struwit) dostaje tylko ostrzeżenie, bez automatycznego podziału (wymaga trzeciej butelki).
- Zapasy liczą się z dawek zapisanych w dzienniku; bez zapisu dawek zapas się nie zmniejsza (jest o tym info w aplikacji). Można dodać odejmowanie według planu, jeśli zapis dawek okaże się zbyt rzadki.

## 4. Pomysły na nowe funkcje (tylko z danych wpisanych przez użytkownika)

| # | Funkcja | Wartość | Koszt |
|---|---|---|---|
| 1 | **Zdjęcia zbiornika** (IndexedDB, kompresja ~1200 px), oś czasu i porównanie przed/po, eksport osobnym plikiem | wysoka | duży |
| 2 | **Szablony zbiorników** (Neocaridina, Caridina, low-tech, high-tech) wypełniające cele, plan i wodę | średnia | średni |
| 3 | **Raport do druku/PDF** (parametry, podmiany, dawki z ostatnich 30 dni) | średnia | średni |
| 4 | **Edycja wszystkich typów wpisów** w dzienniku | średnia | mały |
| 5 | **Kalkulator mieszania wody RO + kranówka** na docelowe GH/KH (częściowo jest w Podmianie) | średnia | mały |
| 6 | **Porównanie dwóch okresów** na jednym wykresie | niska | średni |

## 5. Czego nie robić

- Szacowania zużycia, stężeń „teraz” i automatycznych korekt dawek z testów.
- Powiadomień push (bez serwera zawodne), kont i chmury, bazy gatunków z wymaganiami, frameworka.
- Dozowania chemii korygującej pH. Jeśli aplikacja już proponuje kwas, to z ostrzeżeniem i słabszą opcją (ocet).

## 6. Proponowana kolejność

1. Test na telefonach + GitHub Actions + zmiana napisu „kopiuj” (§3).
2. Edycja wpisów w dzienniku i mieszanie wody RO + kranówka (#4, #5).
3. Zdjęcia zbiornika (#1) jako osobny etap.

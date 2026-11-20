if (typeof tl === 'undefined' && typeof require === 'function') require('./i18n.js'); // tłumaczenia w testach Node
// Gotowe nawozy: mg/l w 1 l wody na 1 ml (płyny = g/l) lub 1 g (proszki = g/kg) nawozu.
// status 'label' = skład ze strony producenta, etykiety albo podanego przez producenta efektu dawki (pole src); pozostałe – orientacyjne.
// doz = dawka producenta { ml, perL, n (razy w tygodniu, brak = producent nie podaje), src, note } – tylko sprawdzona u źródła, nie zgadywana.
// UWAGA: kolejność ma znaczenie (id = 'b' + indeks w dzienniku) – nowe pozycje tylko na końcu.
const PRODUCTS = [
 {
  "name": "ADA Bright K",
  "unit": "ml",
  "ppm": {
   "K": 68
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("ADA Green Brightly lights"),
  "unit": "ml",
  "ppm": {
   "K": 2.4,
   "NH4": 0.86,
   "NO3": 4.34,
   "PO4": 3.9
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("ADA Green Brightly shade"),
  "unit": "ml",
  "ppm": {
   "K": 3.1,
   "NH4": 0.11,
   "NO3": 4.38,
   "PO4": 2.4
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("ADA Green Brightly step 1"),
  "unit": "ml",
  "ppm": {
   "K": 0.08,
   "Fe": 0.19
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("ADA Green Brightly step 2"),
  "unit": "ml",
  "ppm": {
   "K": 0.08,
   "Fe": 0.31
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("ADA Green Brightly step 3"),
  "unit": "ml",
  "ppm": {
   "K": 0.97,
   "Fe": 0.34
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": "API Leaf Zone",
  "unit": "ml",
  "ppm": {
   "K": 24.9,
   "Fe": 1
  },
  "status": "label",
  "dens": 1,
  "pct": {
   "K": 2.49,
   "Fe": 0.1
  },
  "src": "https://www.thatpetplace.com/leaf-zone-16oz-500ml",
  "note": tl("Etykieta: K₂O 3% (K 2,49%), Fe 0,1% (EDTA). Gęstość przyjęta 1,0.")
 },
 {
  "name": tl("Aqua Rebell Makro Spezial N"),
  "unit": "ml",
  "ppm": {
   "NO3": 50,
   "K": 10,
   "Ca": 5,
   "Mg": 1.65
  },
  "status": "label",
  "src": "https://www.azaqua.nl/en/plant-fertilizer-and-additves/makro-spezial-n",
  "note": tl("Wg producenta: 1 ml na 50 l daje NO₃ 1, K 0,2, Ca 0,1, Mg 0,033 mg/l (sprzedawcy podają też Mg 0,07 – sprawdź etykietę).")
 },
 {
  "name": "AquaVitro Activate",
  "unit": "ml",
  "ppm": {
   "PO4": 18.4,
   "K": 8.8
  },
  "status": "label",
  "src": "https://www.pricecheck.co.za/offers/241149770/Aquavitro+Plant+Activate+350ML",
  "note": tl("Wg producenta: P 6000 mg/l, K 8800 mg/l.")
 },
 {
  "name": "AquaVitro Carbonate",
  "unit": "ml",
  "ppm": {
   "K": 78.3,
   "HCO3": 122.0
  },
  "note": tl("Wg producenta: wodorowęglan potasu, 2000 meq/l (5600 °dKH) i 78 300 mg/l K. HCO₃ przeliczone z 2 mol/l."),
  "status": "label",
  "producer": "AquaVitro",
  "kind": "kh",
  "src": "https://www.natureaquariums.com.au/products/aquavitro-carbonate-1l"
 },
 {
  "name": "AquaVitro Propel",
  "unit": "ml",
  "ppm": {
   "Fe": 10
  },
  "status": "label",
  "src": "https://www.premiumbuces.com/en/aquavitro-propel-350ml/",
  "note": tl("Wg producenta: Fe 10 000 mg/l (żelazo dwuwartościowe).")
 },
 {
  "name": "AquaVitro Synthesis",
  "nNote": "urea",
  "unit": "ml",
  "ppm": {
   "NO3": 35.41,
   "NH4": 30.91
  },
  "status": "label",
  "src": "https://www.premiumbuces.com/en/?p=3226",
  "note": tl("Wg producenta: N 32 000 mg/l – 25% azotany, 25% amon, 50% mocznik (tu liczony jako NH₄).")
 },
 {
  "name": tl("Easy Life Ferro"),
  "unit": "ml",
  "ppm": {
   "Fe": 10
  },
  "status": "label",
  "src": "https://www.aquasabi.com/easy-life-ferro",
  "note": tl("Wg producenta: 5 ml na 100 l podnosi Fe o 0,5 mg/l."),
  "doz": {
   "ml": 5,
   "perL": 100,
   "n": 1,
   "src": "https://www.aquasabi.com/easy-life-ferro",
   "note": tl("raz w tygodniu; podnosi Fe o 0,5 mg/l")
  }
 },
 {
  "name": tl("Easy Life Fosfo"),
  "unit": "ml",
  "ppm": {
   "PO4": 5
  },
  "status": "label",
  "src": "https://aquasabi.com/Easy-Life-Fosfo",
  "note": tl("Wg producenta: 10 ml na 500 l podnosi PO₄ o 0,1 mg/l. Zawartość K nie jest podana.")
 },
 {
  "name": tl("Easy Life Nitro"),
  "unit": "ml",
  "ppm": {
   "NO3": 100,
   "K": 65
  },
  "status": "label",
  "src": "https://aquasabi.com/Easy-Life-Nitro",
  "note": tl("Wg producenta: 10 ml na 500 l podnosi NO₃ o 2 mg/l i K o 1,3 mg/l.")
 },
 {
  "name": tl("Easy Life Potassium"),
  "unit": "ml",
  "ppm": {
   "K": 40
  },
  "status": "label",
  "src": "https://aquasabi.com/Easy-Life-Potassium",
  "note": tl("Wg producenta: 10 ml na 100 l podnosi K o 4 mg/l.")
 },
 {
  "name": tl("Easy Life ProFito"),
  "unit": "ml",
  "ppm": {
   "K": 7,
   "Mg": 0.9,
   "Fe": 1.2,
   "Mn": 0.4,
   "Cu": 0.02,
   "Zn": 0.02,
   "B": 0.08,
   "Mo": 0.02,
   "Co": 0.01
  },
  "note": tl("Producent podaje tylko: bez azotanów i fosforanów, z Fe, K, Mg i Mn w chelatach (sprawdzone 11.2026). Liczby orientacyjne."),
  "doz": {
   "ml": 10,
   "perL": 100,
   "n": 1,
   "src": "https://aquasabi.com/Easy-Life-ProFito",
   "note": tl("raz w tygodniu albo 1/7 dawki codziennie; na początek 1/3 dawki")
  }
 },
 {
  "name": tl("Hagen / Fluval Plant Gro+"),
  "unit": "ml",
  "ppm": {
   "K": 3.32,
   "PO4": 0.134,
   "Fe": 6.5,
   "Mn": 0.5,
   "Zn": 0.03,
   "Cu": 0.005,
   "B": 0.01,
   "Mo": 0.007
  },
  "note": tl("Gwarantowany skład Fluval Plant Gro+ (% m/m): K₂O 0,4; P₂O₅ 0,01; Fe 0,65; Mn 0,05; Zn 0,003; Cu 0,0005; B 0,001; Mo 0,0007. Azot 0,3% z EDTA, nie z azotanów. Gęstość przyjęta 1,0."),
  "status": "label",
  "dens": 1,
  "pct": {
   "Fe": 0.65,
   "Mn": 0.05,
   "Zn": 0.003,
   "Cu": 0.0005,
   "B": 0.001,
   "Mo": 0.0007
  },
  "src": "https://www.thetechden.com.au/products/fluval-groplant-micro-nutrients-250ml"
 },
 {
  "name": tl("Intermag Floramix (Rośliny wodne)"),
  "unit": "ml",
  "ppm": {
   "Mg": 5.7,
   "Fe": 2.3,
   "Mn": 0.95,
   "Cu": 0.14,
   "Zn": 0.33,
   "B": 0.27,
   "Mo": 0.05
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("Intermag Mikro"),
  "unit": "ml",
  "ppm": {
   "Fe": 15,
   "Mn": 5.4,
   "Cu": 1,
   "Zn": 1,
   "B": 2,
   "Mo": 0.3
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("Intermag Mikro Plus"),
  "unit": "ml",
  "ppm": {
   "Fe": 23.6,
   "Mn": 9.5,
   "Zn": 3.5,
   "Cu": 1.2,
   "B": 2.3,
   "Mo": 0.59
  },
  "producer": "Intermag",
  "status": "label",
  "dens": 1.18,
  "pct": {
   "Fe": 2,
   "Mn": 0.8,
   "Zn": 0.3,
   "Cu": 0.1,
   "B": 0.2,
   "Mo": 0.05
  },
  "src": "https://intermag.pl/produkt/mikro-plus/",
  "note": tl("Skład wg producenta (g/l i % m/m).")
 },
 {
  "name": tl("Mikroplant Expert"),
  "unit": "ml",
  "ppm": {
   "K": 20,
   "Mg": 2,
   "NO3": 4.97,
   "Fe": 1.5,
   "Mn": 0.4,
   "Cu": 0.05,
   "Zn": 0.02,
   "B": 0.15,
   "Mo": 0.02,
   "Co": 0.01
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("Nutrafin Plant Gro"),
  "unit": "ml",
  "ppm": {
   "Fe": 2.6,
   "Mn": 0.5,
   "Zn": 0.03,
   "Cu": 0.005,
   "B": 0.005,
   "Mo": 0.007
  },
  "note": tl("Gwarantowany skład % m/m (Fe 0,26; Mn 0,05; Zn 0,003; Cu 0,0005; B 0,0005; Mo 0,0007). Azot 0,15% pochodzi z EDTA (chelat), nie z azotanów. Gęstość przyjęta 1,0."),
  "status": "label",
  "dens": 1,
  "pct": {
   "Fe": 0.26,
   "Mn": 0.05,
   "Zn": 0.003,
   "Cu": 0.0005,
   "B": 0.0005,
   "Mo": 0.0007
  },
  "src": "https://piscespets.com/products/nutrafin-plant-gro-essential-micro-nutrient-250ml"
 },
 {
  "name": tl("Sera Florena"),
  "unit": "ml",
  "ppm": {
   "Fe": 3.06,
   "Mn": 0.02
  },
  "note": tl("Producent nie publikuje składu (sprawdzone 11.2026) – wartości orientacyjne, porównaj z etykietą.")
 },
 {
  "name": tl("Tropica Premium Nutrition"),
  "unit": "ml",
  "ppm": {
   "K": 8.32,
   "Mg": 4.16,
   "Fe": 0.728,
   "Mn": 0.416,
   "Cu": 0.0624,
   "Zn": 0.0208,
   "B": 0.0416,
   "Mo": 0.0208
  },
  "status": "label",
  "dens": 1.04,
  "pct": {
   "K": 0.8,
   "Mg": 0.4,
   "Fe": 0.07,
   "Mn": 0.04,
   "Cu": 0.006,
   "Zn": 0.002,
   "B": 0.004,
   "Mo": 0.002
  },
  "src": "https://www.aquascaperi.sk/user/documents/upload/614-615-616-617 New bottles EN.pdf",
  "note": tl("Dawniej Plant Nutrition. Deklaracja % m/m: K 0,8; Mg 0,4; S 0,9; Fe 0,07; Mn 0,04; Cu 0,006… Gęstość 1,04 (250 ml = 260 g)."),
  "doz": {
   "ml": 6,
   "perL": 50,
   "n": 1,
   "src": "https://tropica.com/en/plant-care/liquid-fertilisers/premium-nutrition/",
   "note": tl("raz w tygodniu, przy podmianie")
  }
 },
 {
  "name": tl("Tropica Specialised Nutrition"),
  "nNote": "total",
  "unit": "ml",
  "ppm": {
   "K": 10.4,
   "Mg": 4.16,
   "Fe": 0.728,
   "Mn": 0.416,
   "Cu": 0.0624,
   "Zn": 0.0208,
   "B": 0.0416,
   "Mo": 0.0208,
   "NO3": 59.85,
   "PO4": 3.189
  },
  "status": "label",
  "dens": 1.04,
  "pct": {
   "K": 1,
   "Mg": 0.4,
   "Fe": 0.07,
   "Mn": 0.04,
   "Cu": 0.006,
   "Zn": 0.002,
   "B": 0.004,
   "Mo": 0.002
  },
  "src": "https://tropica.com/en/plant-care/liquid-fertilisers/specialised-nutrition/",
  "note": tl("Dawniej Plant Nutrition+. N 1,3% (azotany i amon – tu cały jako NO₃), P 0,1%, K 1,0%, Mg 0,4% m/m. Gęstość 1,04."),
  "doz": {
   "ml": 6,
   "perL": 50,
   "n": 1,
   "src": "https://tropica.com/en/plant-care/liquid-fertilisers/specialised-nutrition/",
   "note": tl("raz w tygodniu, przy podmianie; przy glonach o połowę mniej")
  }
 },
 {
  "name": tl("Plantex CSM+B"),
  "unit": "g",
  "ppm": {
   "Fe": 70,
   "Mn": 20,
   "Zn": 4,
   "Cu": 1,
   "B": 13,
   "Mo": 0.6
  },
  "producer": "Plantex",
  "status": "label",
  "pct": {
   "Fe": 7,
   "Mn": 2,
   "Zn": 0.4,
   "Cu": 0.1,
   "B": 1.3,
   "Mo": 0.06
  },
  "src": "https://www.plantprod.com/product/plant-prod-chelated-micronutrient-mix/",
  "note": tl("Gwarantowana analiza producenta (Plant-Prod Chelated Micronutrient Mix = CSM+B).")
 },
 {
  "name": tl("Seachem Equilibrium"),
  "unit": "g",
  "ppm": {
   "K": 195,
   "Ca": 80.6,
   "Mg": 24.1,
   "Fe": 1.1,
   "Mn": 0.6
  },
  "status": "label",
  "pct": {
   "K": 19.5,
   "Ca": 8.06,
   "Mg": 2.41,
   "Fe": 0.11,
   "Mn": 0.06
  },
  "src": "https://www.seachem.com/equilibrium.php",
  "note": tl("Gwarantowany skład: K₂O 23% (K 19,5%), Ca 8,06%, Mg 2,41%, Fe 0,11%, Mn 0,06%.")
 },
 {
  "name": tl("Symfonia złota"),
  "unit": "g",
  "ppm": {
   "Mg": 100,
   "Fe": 11.74,
   "Mn": 7.18,
   "Cu": 1.63,
   "Zn": 1.89,
   "B": 1.88,
   "Mo": 0.24,
   "Co": 0.04
  },
  "producer": tl("Inny"),
  "status": "unverified",
  "note": tl("Nie znaleziono etykiety producenta – wartości orientacyjne, porównaj z opakowaniem.")
 },
 {
  "name": tl("Plantex NutriTrace CSM (bez boru)"),
  "unit": "g",
  "producer": "Plantex",
  "status": "label",
  "pct": {
   "MgO": 2.49,
   "Fe": 7,
   "Mn": 2,
   "Zn": 0.4,
   "Cu": 0.1,
   "Mo": 0.06
  },
  "ppm": {
   "Mg": 15,
   "Fe": 70,
   "Mn": 20,
   "Zn": 4,
   "Cu": 1,
   "Mo": 0.6
  },
  "src": "https://www.plantprod.com/product/plantex-nutritrace-csm",
  "note": tl("Gwarantowana analiza producenta. Bez boru – przy RO dodaj B osobno.")
 },
 {
  "name": tl("Intermag Mikrochelat Fe-13"),
  "unit": "g",
  "producer": "Intermag",
  "status": "label",
  "pct": {
   "Fe": 13
  },
  "ppm": {
   "Fe": 130
  },
  "src": "https://intermag.pl/?p=1372",
  "note": tl("Fe-EDTA 13%. Wg producenta.")
 },
 {
  "name": tl("Yara Rexolin APN"),
  "unit": "g",
  "producer": "Yara",
  "status": "label",
  "pct": {
   "Fe": 6,
   "Mn": 2.4,
   "Zn": 1.3,
   "Cu": 0.25,
   "B": 0.85,
   "Mo": 0.25
  },
  "ppm": {
   "Fe": 60,
   "Mn": 24,
   "Zn": 13,
   "Cu": 2.5,
   "B": 8.5,
   "Mo": 2.5
  },
  "src": "https://www.eurofins-agro.com/uploads/downloads/Fifth_article-micronutrients-nutrient-solutions-for-greenhouse-crops-global-5-en1.pdf",
  "note": tl("Fe-DTPA, Mn-DTPA, Zn/Cu-EDTA. Skład z zestawienia Eurofins – porównaj z etykietą.")
 },
 {
  "name": tl("Compo Fetrilon Combi 2"),
  "unit": "g",
  "producer": "Compo",
  "status": "label",
  "pct": {
   "MgO": 2.2,
   "Fe": 4,
   "Mn": 3,
   "Zn": 4,
   "Cu": 0.5,
   "B": 1.5,
   "Mo": 0.05
  },
  "ppm": {
   "Mg": 13.3,
   "Fe": 40,
   "Mn": 30,
   "Zn": 40,
   "Cu": 5,
   "B": 15,
   "Mo": 0.5
  },
  "src": "https://www.palmtalk.org/forum/applications/core/interface/file/attachment.php?id=170455",
  "note": tl("Etykieta producenta (EDTA). Dużo Zn i Cu – ostrożnie przy krewetkach.")
 },
 {
  "name": tl("Elvita MikroMag"),
  "unit": "g",
  "producer": tl("Inny"),
  "status": "label",
  "pct": {
   "MgO": 9,
   "Fe": 4,
   "Mn": 4,
   "Zn": 2,
   "Cu": 1,
   "B": 0.5,
   "Mo": 0.1
  },
  "ppm": {
   "Mg": 54.3,
   "Fe": 40,
   "Mn": 40,
   "Zn": 20,
   "Cu": 10,
   "B": 5,
   "Mo": 1
  },
  "src": "https://www.agrolok.pl/products/3486/Elvita MikroMag.pdf",
  "note": tl("Etykieta (EDTA). Cu 1% – nie dla krewetek.")
 },
 {
  "name": tl("Seachem Flourish"),
  "unit": "ml",
  "producer": "Seachem",
  "kind": "multi",
  "status": "label",
  "dens": 1,
  "pct": {
   "K": 0.307,
   "Ca": 0.14,
   "Mg": 0.11,
   "Fe": 0.32,
   "Mn": 0.0118,
   "Cu": 0.0001,
   "Zn": 0.0007,
   "B": 0.009,
   "Mo": 0.0009,
   "Co": 0.0004,
   "Na": 0.13,
   "Cl": 1.15
  },
  "ppm": {
   "K": 3.07,
   "Ca": 1.4,
   "Mg": 1.1,
   "Fe": 3.2,
   "Mn": 0.118,
   "Cu": 0.001,
   "Zn": 0.007,
   "B": 0.09,
   "Mo": 0.009,
   "Co": 0.004,
   "Na": 1.3,
   "Cl": 11.5,
   "NO3": 3.099,
   "PO4": 0.1338
  },
  "src": "https://www.aqualifesupport.com/detail.php?ID=20",
  "note": tl("Gwarantowany skład (N 0,07%, P₂O₅ 0,01%, K₂O 0,37%, Fe 0,32%…). Gęstość przyjęta 1,0."),
  "doz": {
   "ml": 5,
   "perL": 250,
   "n": 2,
   "src": "https://seachem.zendesk.com/hc/en-us/articles/115000194653-Info-Seachem-Flourish-Dosing-Instructions",
   "note": tl("1–2 razy w tygodniu")
  }
 },
 {
  "name": tl("Seachem Flourish Potassium"),
  "unit": "ml",
  "producer": "Seachem",
  "kind": "k",
  "status": "label",
  "ppm": {
   "K": 50
  },
  "src": "https://www.natureaquariums.com.au/products/seachem-flourish-potassium",
  "note": tl("Wg producenta: K 50 000 mg/l (z siarczanu potasu)."),
  "doz": {
   "ml": 5,
   "perL": 125,
   "src": "https://www.seachem.com/flourish-potassium.php",
   "note": tl("producent: podnosi K o 2 mg/l; częstotliwości nie podaje")
  }
 },
 {
  "name": tl("Seachem Flourish Iron"),
  "unit": "ml",
  "producer": "Seachem",
  "kind": "fe",
  "status": "label",
  "ppm": {
   "Fe": 10
  },
  "src": "https://seachem.com/flourish-iron.php",
  "note": tl("Wg producenta: Fe 10 000 mg/l (glukonian żelaza)."),
  "doz": {
   "ml": 5,
   "perL": 200,
   "src": "https://seachem.com/flourish-iron.php",
   "note": tl("producent: tyle, by utrzymać ok. 0,1 mg/l Fe; częstotliwości nie podaje")
  }
 }
];
if (typeof module!=='undefined') module.exports.PRODUCTS = PRODUCTS;

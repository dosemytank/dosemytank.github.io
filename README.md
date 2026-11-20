# DoseMyTank

**Your aquarium. Your formula.** Free aquarium tools for planted tank enthusiasts – <https://dosemytank.github.io/>

DoseMyTank is a web app (installable PWA) that works offline and keeps all data in the browser. No account, no ads, no tracking. English is the default language, with full Polish and German support.

- **DIY fertilizers from dry salts** – EI (Estimative Index), PPS-Pro, PMDD or your own targets: grams per bottle, ml per dose, expected weekly mg/L (ppm), precipitation and solubility warnings, shopping list.
- **RO water remineralization** – salts for a target GH, KH and Ca : Mg ratio.
- **Commercial fertilizer dosing** – 37 products, dose scaled to your tank, comparison, your own products from the label.
- **Tank log** – tests, water changes, doses, charts with target ranges, care schedule with calendar export.
- Tools: bottle concentration check, DIY clone of a commercial fertilizer, parameter correction, CO₂ from pH/KH, unit converters, tank volume, titration and more.

## Structure

| File | Purpose |
|---|---|
| `index.html`, `about.html`, `feedback.html` | English website (static, indexable) |
| `de/index.html`, `de/ueber.html`, `de/kontakt.html` | German website |
| `pl/` | Polish website (`index.html`, `o-aplikacji.html`, `kontakt.html`) |
| `app.html` | The app (single page, hash routes such as `#/calculator/remineralization`) |
| `i18n.js`, `i18n-en.js`, `i18n-de.js` | Language system, English and German dictionaries (dictionaries are loaded only when needed: none for Polish, `i18n-en.js` for English, both for German – a missing German string falls back to English) |
| `chem.js`, `calc.js`, `nawozy-*.js`, `logic.js`, `clone.js` | Calculation engine (pure functions, tested in Node) |
| `kalk-*.js`, `app.js`, `tools.js`, `woda.js`, … | Screens |
| `sw.js`, `manifest.json`, `manifest-pl.json`, `manifest-de.json` | PWA: offline cache, install |
| `tests/` | Unit tests (Node) and browser tests (Playwright) |

## Languages

Every user-visible string goes through `tl()`. The key is the Polish source text (gettext style), the English text lives in `i18n-en.js`:

```js
toast(tl('Zapisano pomiar'));                       // → "Test saved"
tl('{0} ml podnosi {1} o {2} mg/l w {3} l.', ml, ion, ppm, V)
```

To add a string: write it in Polish inside `tl()` and add the English translation to `i18n-en.js` and the German one to `i18n-de.js` (decimal comma, `mg/l`, informal “du”). `npm test` fails when a translation is missing or its `{0}` placeholders / HTML tags don't match.

Language selection: `?lang=en|pl|de` → saved choice (`localStorage['dmt.lang']`) → existing pre-8.0 data (Polish) → browser language → English. Switching language in Settings reloads from the offline cache; default names (tank, tasks, note tags) are converted to the new language, user-entered text is never changed. Numbers and dates follow the language (decimal comma in Polish and German, point in English); input fields accept both.

## Calculations

Molar masses are computed from formulas with IUPAC 2021 atomic weights; each hydrate is a separate form. 1 mg/L = 1 ppm, 1 °dH = 10 mg/L CaO. All internal calculations use liters, grams and mg/L – US gallons are converted only when the tank volume is entered. `tests/weryfikacja.test.js` checks the engine against independently hand-calculated values and published PPS-Pro/EI numbers.

## Development

```bash
npm test                     # unit tests (Node 20+)
pip install -r tests/requirements-e2e.txt && python -m playwright install chromium
npm run test:e2e             # browser tests: both languages, mobile layout, offline, website links/SEO
python3 tests/zrzuty_strony.py   # regenerate website screenshots (EN + PL) and link previews
```

GitHub Actions (`.github/workflows/test.yml`) runs the unit and browser tests on every push.

No build step and no dependencies at runtime. Release: bump the version in `package.json`, `sw.js` (`CACHE`) and `app.html` (`APP_VERSION`).

## Feedback

Bugs and ideas: dosemytank@gmail.com or the [feedback page](https://dosemytank.github.io/feedback.html).

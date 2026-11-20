// 7.13: jedno źródło kolorów – tokens.css. Ciemny motyw ręczny (data-theme=dark) i systemowy (auto) muszą mieć te same wartości,
// a styles.css nie może mieć reguł zależnych od motywu ani własnych palet (to była przyczyna różnic między „dark” i „auto”).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (css, start) => { const i = css.indexOf(start); assert.ok(i >= 0, start); const a = css.indexOf('{', i + start.length - 1), b = css.indexOf('}', a); return css.slice(a + 1, b).replace(/\s+/g, ''); };

test('tokens.css: ciemny ręczny = ciemny systemowy', () => {
  const t = read('tokens.css');
  assert.strictEqual(block(t, ':root[data-theme=dark]{'), block(t, '@media(prefers-color-scheme:dark){:root[data-theme=auto]{'));
});

test('tokens.css: jasny i ciemny definiują te same zmienne', () => {
  const t = read('tokens.css'), names = b => b.split(';').filter(Boolean).map(x => x.split(':')[0]).sort();
  const light = names(block(t, ':root{')).filter(n => n.startsWith('--')), dark = names(block(t, ':root[data-theme=dark]{')).filter(n => n.startsWith('--'));
  for (const n of dark) assert.ok(light.includes(n), n + ' brak w jasnym');
});

test('styles.css bez palet i reguł zależnych od motywu', () => {
  const s = read('styles.css');
  assert.ok(!/data-theme/.test(s), 'data-theme w styles.css');
  assert.ok(!/(^|\})\s*:root\s*\{/.test(s), ':root w styles.css');
});

test('obie strony ładują tokens.css przed własnymi stylami, a service worker trzyma go offline', () => {
  for (const f of ['app.html', 'index.html']) { const x = read(f); assert.ok(x.includes('href="tokens.css"'), f); assert.ok(/data-theme="auto"/.test(x), f + ': data-theme'); }
  const a = read('app.html'); assert.ok(a.indexOf('tokens.css') < a.indexOf('styles.css'));
  assert.ok(read('sw.js').includes("'./tokens.css'"));
});

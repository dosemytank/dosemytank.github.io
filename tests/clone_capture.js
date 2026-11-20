// Zapis wyników „Zrób sam odpowiednik” (clone.js) dla wszystkich wbudowanych produktów – podstawa porównania przed/po zmianie reguły podziału.
// Użycie: node tests/clone_capture.js plik.json
const K = require('../clone.js'), { PRODUCTS } = require('../products.js'), fs = require('fs');
const out = [];
for (const [i, p] of PRODUCTS.entries()) {
  if (!p.ppm || !Object.keys(p.ppm).length) continue;
  const powder = p.unit === 'g';
  for (const opt of powder ? [{ powder: true }] : [{}, { split: false }]) {
    const r = K.cloneOf(p.ppm, { bottle: 500, ...opt });
    out.push({ id: 'b' + i, name: p.name, opt, split: r.split, match: r.match,
      bottles: r.bottles.map(b => ({ label: b.label, items: b.items.map(x => [x.mat + '|' + x.hyd, x.g]), warn: b.warn.map(w => w.t) })),
      diff: r.diff.filter(d => !d.side && d.orig > 0).map(d => [d.k, +d.dev.toFixed(4)]) });
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 0)); console.log(out.length + ' przypadków → ' + process.argv[2]);

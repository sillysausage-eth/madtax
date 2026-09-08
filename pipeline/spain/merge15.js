/* Refreshes who.corp (corporate tax by company type, AEAT table 8.5).

   Reads  corp_types.json  (python3 extract_corp.py)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   merge8.js folded the first extraction in and cannot be re-run (its inputs were
   throwaway). This replaces who.corp.years wholesale from a fresh extraction.
   Overlapping years are compared: a provisional year may move (AEAT revises "(p)"
   columns in the next edition); a final year that moves by more than 0.1% is a
   changed layout and stops the run. Years the fresh file does not carry are
   dropped, never carried forward. */
const fs = require('fs');
const path = require('path');
const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const fresh = JSON.parse(fs.readFileSync(path.join(__dirname, 'corp_types.json'), 'utf8'));
const old = (b.who && b.who.corp && b.who.corp.years) || {};

const bad = [], revised = [];
for (const [y, rec] of Object.entries(fresh)) {
  const o = old[y]; if (!o) continue;
  for (const bk of ['total', 'groups', 'standalone']) for (const f of ['profit', 'base', 'tax']) {
    const a = o[bk] && o[bk][f], c = rec[bk][f];
    if (a == null || c == null) continue;
    if (Math.abs(a - c) > Math.abs(a) * 1e-3) (o.prov || rec.prov ? revised : bad).push(`${y}/${bk}.${f} ${a} -> ${c}`);
  }
}
if (bad.length) { console.error(`final years disagree with the shipped bundle:\n  ${bad.join('\n  ')}`); process.exit(1); }

const fy = Object.keys(fresh).sort(), oy = Object.keys(old).sort();
b.who.corp = { ...b.who.corp, kind: 'company', years: fresh,
  src: 'AEAT — Informe Anual de Recaudación Tributaria, cuadro 8.5 (Impuesto sobre Sociedades por tipo de sociedad); (p) = provisional' };
fs.writeFileSync(BUNDLE, JSON.stringify(b));
console.log(`who.corp: ${fy[0]}-${fy[fy.length - 1]} (was ${oy[0]}-${oy[oy.length - 1]}) · provisional: ${fy.filter(y => fresh[y].prov).join(', ') || 'none'}`);
if (revised.length) console.log(`  provisional revisions accepted: ${revised.length}` + revised.slice(0, 3).map(r => '\n    ' + r).join(''));
const added = fy.filter(y => !old[y]); if (added.length) console.log(`  new year(s): ${added.join(', ')}`);

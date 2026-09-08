/* Keeps only the revenue years the map can show in full.

   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   THE RULE
   --------
   A revenue year is published when every one of these holds:
     - Eurostat has split the year by tax (natParts.detail), so the national
       composition is real rather than two pending aggregates;
     - every community on the map (Ceuta and Melilla excepted: they have no
       regional government and no CONPREL file) carries a figure for every
       territorial part — the AEAT heads, the regional own taxes, the municipal
       layer and the foral substitution where it applies.
   A year that fails is REMOVED from the revenue console, not shown with holes.
   The headline for such a year is a real published figure, but a map that is
   half absent and a composition that is two aggregates is not the picture this
   console makes, and a reader cannot tell a gap from a zero at a glance.

   What was removed and why is recorded in `dropped`, so the fact is in the
   bundle rather than in someone's memory.

   The rule is also written back as `national2[y].complete`, which the console
   already reads for its "(P)" marker: after this step every published year is
   complete and the marker has nothing to mark. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));

const TERRITORIAL = ['irpf', 'vat', 'corp', 'excise', 'propTax', 'inherit', 'otherProd', 'otherProdTax', 'otherCurr', 'sales'];
const CITIES = new Set(['18', '19']);

function why(y) {
  const reasons = [];
  if (!b.natParts[y] || !b.natParts[y].detail) reasons.push('no per-tax split published (Eurostat gov_10a_taxag)');
  const holes = {};
  for (const r of b.regions) {
    if (CITIES.has(r.id)) continue;
    const p = r.parts[y];
    for (const k of TERRITORIAL) if (!p || p[k] == null) (holes[k] ??= []).push(r.id);
  }
  for (const [k, ids] of Object.entries(holes)) {
    reasons.push(`${k} absent for ${ids.length === 17 ? 'every community' : ids.join(', ')}`);
  }
  return reasons;
}

const all = [...new Set([...b.revYears, ...Object.keys(b.natParts)])].sort();
const dropped = b.dropped && b.dropped.revenue ? { ...b.dropped.revenue } : {};
const keep = [];
for (const y of all) {
  const reasons = why(y);
  if (reasons.length) dropped[y] = reasons; else keep.push(y);
}
if (!keep.length) throw new Error('no revenue year is complete — refusing to empty the console');

const drop = all.filter((y) => !keep.includes(y));
const yearKeyed = ['natParts', 'mapAgg', 'natSub', 'national2', 'revNational', 'natRev', 'gg'];
for (const y of drop) {
  for (const k of yearKeyed) if (b[k]) delete b[k][y];
  for (const r of b.regions) for (const k of ['parts', 'rev', 'rev2']) if (r[k]) delete r[k][y];
  /* The "who pays" tables are indexed by the selected year, so a year the picker
     cannot reach is dead weight. The series themselves are AEAT's and are not
     otherwise changed. */
  for (const w of Object.values(b.who || {})) if (w.years) delete w.years[y];
}
b.revYears = keep;
for (const y of keep) if (b.national2[y]) b.national2[y].complete = true;

/* Coverage strings restated from what the bundle now carries. */
const span = (ys) => (ys.length ? `${ys[0]}-${ys[ys.length - 1]}` : 'none');
b.coverage = {
  ...b.coverage,
  state: span(keep), regional: span(keep), local: span(keep),
  nationalHeadline: span(keep), nationalTaxDetail: span(keep),
};
b.dropped = { ...(b.dropped || {}), revenue: dropped,
  rule: 'a revenue year is published only when Eurostat has split it by tax and every community carries every territorial part' };

fs.writeFileSync(BUNDLE, JSON.stringify(b));
console.log(`revenue years published: ${span(keep)} (${keep.length})`);
for (const [y, reasons] of Object.entries(dropped).sort()) {
  console.log(`  dropped ${y}:`);
  reasons.forEach((r) => console.log('    - ' + r));
}

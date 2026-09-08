/* Puts the local layer (CONPREL) under every detailed year, not just 2019 on.

   Reads  local_owntax.json  (python3 extract_local.py over local/ccaa/EL{year}C{n}.xls*)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   WHAT THIS CHANGES AND WHY
   -------------------------
   Three of the seventeen parts carry municipal money: `propTax` is IBI, and IBI
   only; `otherProdTax` adds the other local own taxes (IAE, vehicles, plusvalía,
   ICIO) to the regional D.29 levies; `sales` adds council fees and charges to
   the State's. All three came from CONPREL's definitive liquidations, which the
   first build only fetched for 2019-2023, so 2012-2018 showed IBI as absent in
   every community and the other two parts a third short. CONPREL publishes
   definitive liquidations back to 2002 in the same account structure (Orden
   EHA/3565/2008 applies from 2010), so the early years are simply filled from
   the same source by the same extractor — nothing is estimated or carried back.

   TWO SOURCES FOR THE SAME EUROS
   ------------------------------
   The Basque and Navarrese parts are rebuilt by merge12.js from a snapshot of
   their pre-foral values (`foral.baseline`). The municipal parts are outside the
   foral tables, so the backfill applies to that snapshot too; both routes are
   patched so the result does not depend on which of the two scripts ran last.

   YEARS THAT ALREADY HAD THE LAYER
   --------------------------------
   For those, the fresh extraction is not written but CHECKED: IBI and fees must
   reproduce the shipped figures to the million, or the run fails. A definitive
   liquidation that moves is a changed source layout, never a revision. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const loc = JSON.parse(fs.readFileSync(path.join(__dirname, 'local_owntax.json'), 'utf8'));

const PARTS = b.PARTS;
const FIELDS = ['propTax', 'otherProdTax', 'sales'];
const years = Object.keys(loc).sort().filter((y) => b.natParts[y] && b.natParts[y].detail);
if (!years.length) throw new Error('local_owntax.json carries no detailed year');

/* Pre-local values of the three parts, per region-year, so a second run starts
   from the same place as the first. */
b.local = b.local || { baseline: {} };
const base = b.local.baseline;

/* The AEAT-side tally kept alongside the parts. Restated from the extraction
   whether the layer is being written or was already in: a year whose parts
   arrived with the municipal layer already under them (2024) otherwise keeps a
   null local tally, and national2 sums that year's councils as zero. */
const tally = (r, y, l) => {
  const v = r.rev2 && r.rev2[y];
  if (!v) return;
  v.lt = l.ownTax; v.ibi = l.ibi; v.lf = l.fees;
  const have = v.st != null && v.rg != null && v.lt != null && v.lf != null;
  v.total = have ? v.st[0] + v.rg + v.lt + v.lf : null;
  v.partial = !have;
  v.missing = [v.st == null && 'state', v.rg == null && 'regional', v.lt == null && 'local', v.lf == null && 'fees'].filter(Boolean);
};

const foralIds = new Set((b.foral && b.foral.ids) || []);
const targets = (r, y) => {
  /* Every record that holds this region-year's parts: the live one, and for the
     foral regions the pre-foral snapshot merge12.js rebuilds from. */
  const out = [r.parts[y]];
  if (foralIds.has(r.id) && b.foral.baseline[r.id] && b.foral.baseline[r.id][y]) out.push(b.foral.baseline[r.id][y]);
  return out;
};

const mismatches = [];
const filled = {};
for (const y of years) {
  for (const r of b.regions) {
    const l = loc[y][r.id];
    const recs = targets(r, y);
    /* Restore BEFORE deciding whether there is anything to apply: a region the
       fresh extraction no longer carries (CONPREL's all-zero Navarre tables for
       2013-2014) must go back to absent, not keep the value a previous run wrote. */
    ((base[r.id] ??= {})[y] ??= recs.map((p) => Object.fromEntries(FIELDS.map((f) => [f, p[f]]))));
    const before = base[r.id][y];
    recs.forEach((p, i) => { for (const f of FIELDS) p[f] = before[i][f]; p.total = PARTS.reduce((a, k) => a + (p[k] || 0), 0); });
    if (!l) {                                          // Ceuta, Melilla, or an empty published table
      const v = r.rev2 && r.rev2[y];
      if (v && before[recs.length - 1].propTax == null) {
        v.lt = null; v.ibi = null; v.lf = null; v.total = null; v.partial = true;
        v.missing = [v.st == null && 'state', v.rg == null && 'regional', 'local', 'fees'].filter(Boolean);
      }
      continue;
    }

    const st = r.rev[y];                                // AEAT heads: [tot,irpf,is,iva,iiee,otros,tasas]
    const hadLocal = before[recs.length - 1].propTax != null;
    if (hadLocal) {
      /* The layer is already in. Prove the fresh extraction is the same data. */
      const ref = before[recs.length - 1];
      if (Math.abs(ref.propTax - l.ibi) > 1) mismatches.push(`${y} ${r.es}: IBI ${ref.propTax} -> ${l.ibi}`);
      if (st && Math.abs(ref.sales - (l.fees + st[6])) > 1) mismatches.push(`${y} ${r.es}: fees ${ref.sales - st[6]} -> ${l.fees}`);
      /* Same data, so the tally is restated from it rather than left absent. */
      tally(r, y, l);
      continue;
    }
    recs.forEach((p, i) => {
      p.propTax = l.ibi;
      p.otherProdTax = (before[i].otherProdTax || 0) + (l.ownTax - l.ibi);
      /* For the foral regions the live record's `sales` already carries the
         treasury's fee block on top; adding the municipal fees to both records
         keeps that addition intact. */
      p.sales = (before[i].sales || 0) + l.fees;
      p.total = PARTS.reduce((a, k) => a + (p[k] || 0), 0);
    });
    (filled[y] ??= []).push(r.id);

    tally(r, y, l);
  }
  if (b.national2 && b.national2[y]) {
    const n = b.national2[y];
    const sum = (k) => b.regions.reduce((a, r) => a + ((r.rev2[y] && r.rev2[y][k]) || 0), 0);
    n.lt = sum('lt'); n.ibi = sum('ibi'); n.lf = sum('lf');
    n.total = n.st + n.rg + n.lt + n.lf;
    n.complete = b.regions.every((r) => !r.rev2[y] || !r.rev2[y].partial || ['18', '19'].includes(r.id));
  }
}

if (mismatches.length) {
  console.error(`CONPREL re-extraction disagrees with the shipped layer in ${mismatches.length} places:`);
  mismatches.slice(0, 12).forEach((m) => console.error('  ' + m));
  process.exit(1);
}

/* mapAgg is a pure function of the regions and the national headline. */
for (const y of b.revYears) {
  b.mapAgg[y] = {};
  for (const k of [...PARTS, 'total']) {
    const mapped = b.regions.reduce((a, r) => a + (r.parts[y][k] || 0), 0);
    const nat = k === 'total' ? b.natParts[y].total : b.natParts[y][k];
    b.mapAgg[y][k] = { mapped, offmap: nat - mapped, nat };
  }
}

b.local.years = years;
b.local.src = 'Ministerio de Hacienda — CONPREL, liquidaciones definitivas de las entidades locales por comunidad autónoma (Tabla 2, recaudación líquida)';
b.coverage = { ...b.coverage, local: `${years[0]}-${years[years.length - 1]}` };

fs.writeFileSync(BUNDLE, JSON.stringify(b));

const bn = (v) => (v / 1000).toFixed(1);
console.log(`local layer: ${years[0]}-${years[years.length - 1]} · ` +
  `${Object.keys(filled).length ? 'filled ' + Object.keys(filled).join(', ') : 'nothing to fill'} · ` +
  `${years.length - Object.keys(filled).length} years re-checked against the shipped figures`);
for (const y of years) {
  const m = b.mapAgg[y];
  console.log(`  ${y}  IBI on the map ${bn(m.propTax.mapped).padStart(6)}bn of ${bn(m.propTax.nat)}bn` +
    `   other production taxes ${(m.otherProdTax.mapped / m.otherProdTax.nat * 100).toFixed(0).padStart(4)}%` +
    `   fees ${(m.sales.mapped / m.sales.nat * 100).toFixed(0).padStart(3)}%` + (filled[y] ? '   <- filled' : ''));
}

/* Puts the Basque and Navarrese tax take on the map.

   Reads  foral.json  (python3 extract_foral.py)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent:
   it recomputes the two regions from the foral source and the untouched local
   layer every run, never from its own previous output.

   WHAT THIS CHANGES AND WHY
   -------------------------
   Every other region's tax figures come from AEAT collection by delegación. In
   Álava, Bizkaia, Gipuzkoa and Navarre, AEAT collects almost nothing — the
   Diputaciones Forales and the Hacienda Foral de Navarra do, under the Concierto
   and the Convenio Económico. What the AEAT series carries for those two
   communities is a residual: 1,463 M€ of IRPF for the Basque Country in 2023
   against the 7,086 M€ its Diputaciones actually collected, and VAT that is
   NEGATIVE because refunds outrun collection once the Concierto adjustment is
   booked. Reading that as "the tax raised in the Basque Country" describes who
   administers the tax, not what was raised there.

   SUPERSEDE, DO NOT ADD
   ---------------------
   Where a foral figure exists it REPLACES the value built from the AEAT and
   regional-accounts layers; the two are never summed. Both sides book the
   Concierto/Convenio adjustment flows — OCTE's VAT line already contains the
   `Ajuste` settled with the State, and AEAT's negative VAT in the same territory
   is the mirror of part of that same flow — so adding them would double-count
   the adjustment with the wrong sign. The same holds for Navarre's inheritance
   and wealth taxes, where the regional-accounts layer and the Hacienda Foral
   report the same euros by two routes (2023: D.91 59 M€ against the Hacienda's
   59.4 M€; D.59 35 M€ against 34.7 M€).

   WHAT THE FORAL SOURCE DOES NOT COVER, AND SO IS LEFT ALONE
   ----------------------------------------------------------
   `propTax` is municipal property tax (IBI). It is not a concerted tax, appears
   in neither foral table, and comes from CONPREL for these regions exactly as it
   does for every other. Untouched.

   `otherProdTax` carries municipal levies (IAE, vehicles, plusvalía) alongside
   regional D.29 taxes. The foral tables' own D.29-family lines — deposits at
   credit institutions, electricity production, fluorinated gases, the financial
   transactions and digital services taxes, landfill — cannot be added to it
   without risking a double count against those same levies arriving through the
   local and regional layers, and nothing published splits the two apart. So they
   are OMITTED, and the omission is recorded in `foral.omitted` per year rather
   than left for a reader to discover. It is small: 131 M€ for the Basque Country
   and 27 M€ for Navarre in 2023, against a combined take of 23.3 bn€.

   `sales` is added to rather than replaced. The foral "Tasas y otros ingresos"
   block — gaming fees, surcharges, late-payment interest, penalties — overlaps
   neither the municipal fees nor the AEAT fee line already in that bucket.

   YEARS WITHOUT A SOURCE
   ----------------------
   The Basque series runs 2012-2025; Navarre's memorias only publish this table
   from 2016. For a year with no foral figure the superseded parts are set to
   `null`, not left holding the AEAT residual: absent is absent, and a €149 M
   residual sitting next to a €1.5 bn real figure in the next year would read as
   a collapse that never happened. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const foral = JSON.parse(fs.readFileSync(path.join(__dirname, 'foral.json'), 'utf8'));

/* Region ids as the geometry carries them. */
const FORAL_IDS = { '16': 'País Vasco', '15': 'Navarra' };

/* The parts the collecting treasury publishes in full, which therefore replace
   whatever the AEAT and regional-accounts layers had for these two regions. */
const SUPERSEDED = ['irpf', 'corp', 'vat', 'excise', 'inherit', 'otherCurr', 'otherProd'];
/* Added to, because the foral block does not overlap what is already there. */
const ADDITIVE = ['sales'];
/* Read from the foral source but deliberately not folded in — see the header. */
const OMITTED = ['otherProdTax'];

const PARTS = b.PARTS;
const years = b.revYears;

/* Thousands of euros in both foral sources; € millions everywhere in the bundle. */
const M = (v) => Math.round(v / 1000);

/* `sales` is added to rather than replaced, so a second run would add it twice.
   Snapshot the two regions' original parts the first time and always rebuild from
   that snapshot, which makes the script idempotent and leaves the pre-foral
   figures in the bundle for `verify.js` to test the substitution against. */
const baseline = (b.foral && b.foral.baseline) || Object.fromEntries(
  Object.keys(FORAL_IDS).map((id) => {
    const r = b.regions.find((x) => x.id === id);
    if (!r) throw new Error(`region ${id} not in the bundle`);
    return [id, JSON.parse(JSON.stringify(r.parts))];
  }),
);
for (const id of Object.keys(FORAL_IDS)) {
  const r = b.regions.find((x) => x.id === id);
  r.parts = JSON.parse(JSON.stringify(baseline[id]));
}

const omitted = {};
const covered = {};

for (const [id, name] of Object.entries(FORAL_IDS)) {
  const region = b.regions.find((x) => x.id === id);
  const src = foral[id] || {};
  covered[id] = [];

  for (const y of years) {
    const p = region.parts[y];
    const f = src[y];
    /* Years the national side has not split by tax carry `null` for every fine
       part already, for every region. Leave them exactly as they are — there is
       no national figure for the foral value to sit against. */
    if (!b.natParts[y].detail) continue;

    if (!f) {
      for (const k of [...SUPERSEDED, ...ADDITIVE]) p[k] = null;
      /* The municipal and regional layers still hold a figure or two for these
         years, but a total built from them alone would read as a community that
         raised 25 M€ — so the total is absent, not the sum of what survived. */
      p.total = null;
      continue;
    }
    {
      covered[id].push(y);
      for (const k of SUPERSEDED) p[k] = f[k] === undefined ? null : M(f[k]);
      for (const k of ADDITIVE) {
        if (f[k] === undefined) continue;
        p[k] = (p[k] || 0) + M(f[k]);
      }
      const off = OMITTED.reduce((a, k) => a + (f[k] || 0), 0);
      if (off) ((omitted[id] ??= {})[y] = M(off));
    }
    /* Always restated from the parts, including in the no-source case: the
       nulled parts must leave the total too, or it would keep quoting money
       the region no longer reports. */
    p.total = PARTS.reduce((a, k) => a + (p[k] || 0), 0);
  }
}

/* mapAgg is a pure function of the regions and the national headline, so it is
   rebuilt from scratch — exactly as merge6.js builds it — rather than patched. */
for (const y of years) {
  b.mapAgg[y] = {};
  for (const k of [...PARTS, 'total']) {
    const mapped = b.regions.reduce((a, r) => a + (r.parts[y][k] || 0), 0);
    const nat = k === 'total' ? b.natParts[y].total : b.natParts[y][k];
    b.mapAgg[y][k] = { mapped, offmap: nat - mapped, nat };
  }
}

b.foral = {
  ids: Object.keys(FORAL_IDS),
  baseline,
  covered,
  superseded: SUPERSEDED,
  additive: ADDITIVE,
  omitted,
  omittedWhat: OMITTED,
  src: foral.src,
  srcYear: foral.srcYear || {},
};
/* The slim record the console reads: which years actually carry a foral figure,
   and who published it. `b.foral` above keeps the baseline and the omissions for
   verify.js; none of that belongs in the browser bundle. */
/* `srcYear` names the publication each year's figure was read from: the
   treasury's own table, or — for Navarre before its memorias begin — the
   Ministry's series of the same figures, which the extractor admitted only
   after it reproduced the memoria in every year both cover. */
b.foralCoverage = { ids: Object.keys(FORAL_IDS), covered, src: foral.src, srcYear: foral.srcYear || {} };

b.coverage = {
  ...b.coverage,
  foralBasque: covered['16'].length
    ? `${covered['16'][0]}-${covered['16'][covered['16'].length - 1]}`
    : 'none',
  foralNavarre: covered['15'].length
    ? `${covered['15'][0]}-${covered['15'][covered['15'].length - 1]}`
    : 'none',
};

fs.writeFileSync(BUNDLE, JSON.stringify(b));

const bn = (v) => (v / 1000).toFixed(1);
console.log('foral coverage:  Basque ' + b.coverage.foralBasque +
            '   Navarre ' + b.coverage.foralNavarre);
for (const [id, name] of Object.entries(FORAL_IDS)) {
  const r = b.regions.find((x) => x.id === id);
  console.log(`\n${id} ${name}  (€bn, region total)`);
  for (const y of years) {
    if (!b.natParts[y].detail) continue;
    const now = r.parts[y].total;
    console.log(`  ${y}  was ${bn(baseline[id][y].total).padStart(6)}   now ` +
                `${(now == null ? '—' : bn(now)).padStart(6)}` +
                (omitted[id] && omitted[id][y] ? `   omitted ${omitted[id][y]} M` : ''));
  }
}
const y = years.find((v) => b.natParts[v].detail && foral['15'][v] && foral['16'][v]);
console.log(`\n${y} IRPF on the map: ` +
  `${bn(b.mapAgg[y].irpf.mapped)}bn of ${bn(b.mapAgg[y].irpf.nat)}bn national, ` +
  `unattributed ${bn(b.mapAgg[y].irpf.offmap)}bn ` +
  `(${(b.mapAgg[y].irpf.offmap / b.mapAgg[y].irpf.nat * 100).toFixed(1)}%)`);

/* Debt interest, lifted out of general public services and given its own top-level
   part of the spending composition.

   Reads  eurostat_gov_10a_exp_GF01.json, eurostat_gov_10a_exp_GF0107.json
          (fetched here and cached; --offline reuses them)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   WHY THIS EXISTS
   ---------------
   COFOG division 01 is €92.6bn in 2024, and €39.6bn of it — 43% — is one line:
   `GF0107 Intereses de la deuda pública`. Reading the composition, "general public
   services" is therefore the third largest thing government spends money on, and
   nearly half of it is not a service at all. The ring hid the single largest
   non-social-protection line in the accounts inside a residual-sounding name.

   Interest is a published child of the division in the same Eurostat table, in the
   same sector and on the same accrual basis, so lifting it out is a subtraction of
   one published figure from another and never an estimate. The seven remaining
   sub-functions sum to the remainder exactly, every year, and this step refuses to
   write unless they do.

   WHAT IS PUBLISHED AND WHAT IS NOT
   ---------------------------------
   `gov_10a_exp` publishes GF0107 for the consolidated total and for each of the four
   government tiers, so the console can say who pays the interest. It does not publish
   it by Autonomous Region, and neither does IGAE: the per-community file is titled
   *Gasto por divisiones COFOG* and stops at the division. So the map cannot draw
   interest, and cannot take it out of what it draws for division 01 either — the
   community figures there are the whole division, interest included. Both facts are
   carried here as flags and said in the panel; nothing is apportioned.

   IGAE's per-community table does carry a `D.41 Intereses` row, which falls entirely
   in division 01, but D.41 is not GF0107: for the regional subsector in 2024 D.41 is
   7,469 against GF0107's 6,758. They are two published measures of different things
   (COFOG 01.7 is public debt *transactions*), and substituting one for the other to
   manufacture a territorial split would be exactly the kind of plug this pipeline
   exists to prevent.

   Usage: node merge20.js [--offline] */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp';
const Q = '?format=JSON&geo=ES&unit=MIO_EUR&na_item=TE&sinceTimePeriod=2012&lang=EN';

/** The division and the child lifted out of it. */
const PARENT = 'GF01';
const CHILD = 'GF0107';

/** The four tiers, under the names the bundle already uses for them elsewhere. */
const TIERS = { central: 'S1311', regional: 'S1312', local: 'S1313', socsec: 'S1314' };

async function grab(code) {
  const cache = path.join(__dirname, `eurostat_gov_10a_exp_${code}.json`);
  if (process.argv.includes('--offline')) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const r = await fetch(`${API}${Q}&cofog99=${code}`);
  if (!r.ok) throw new Error(`gov_10a_exp ${code}: HTTP ${r.status}`);
  const j = await r.json();
  fs.writeFileSync(cache, JSON.stringify(j));
  return j;
}

/* JSON-stat: `value` is flat and row-major over the declared dimensions, so a stride
   per dimension makes the lookup independent of their order. The same reader as
   extract_natsub.js and merge19.js, deliberately — one file, one way of reading it. */
function reader(j) {
  const dims = j.id, sizes = j.size;
  const stride = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));
  const iS = dims.indexOf('sector'), iT = dims.indexOf('time');
  const sec = j.dimension.sector.category, tm = j.dimension.time.category;
  return {
    years: Object.keys(tm.index).sort(),
    get: (s, y) => {
      if (sec.index[s] == null || tm.index[y] == null) return null;
      const v = j.value[sec.index[s] * stride[iS] + tm.index[y] * stride[iT]];
      return v == null ? null : v;
    },
  };
}

(async () => {
  const [pj, cj] = await Promise.all([grab(PARENT), grab(CHILD)]);
  const P = reader(pj), C = reader(cj);
  const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));

  /* The years the spending console already publishes. This step adds a part to an
     existing composition; it never extends or shortens the series that composition
     runs over. */
  const years = Object.keys(b.spendNational).sort();

  /* Every tier, every year, or nothing. A part that appears for some years and not
     others would be a hole in the ring, and the ring is a partition of a total. */
  const sectors = ['S13', ...Object.values(TIERS)];
  const missing = [];
  for (const y of years)
    for (const s of sectors)
      if (P.get(s, y) == null || C.get(s, y) == null) missing.push(`${s} ${y}`);
  if (missing.length) {
    console.error(`gov_10a_exp does not publish ${PARENT}/${CHILD} for ${missing.join(', ')}`);
    process.exit(1);
  }

  const out = { code: CHILD, parent: PARENT, years, nat: {}, parentNat: {}, tiers: {} };
  for (const y of years) {
    out.nat[y] = C.get('S13', y);
    out.parentNat[y] = P.get('S13', y);
    out.tiers[y] = {};
    for (const [k, s] of Object.entries(TIERS))
      out.tiers[y][k] = { parent: P.get(s, y), int: C.get(s, y) };
  }

  /* ---------------------------------------------------------------- tie-outs -- */

  /* The figure lifted out must be the one the bundle already carries for that code.
     If Eurostat has revised the sub-function since the bundle's COFOG detail was
     extracted, the ring and the sub-table would state two different numbers for the
     same line, and the reader would have no way to tell which. */
  const drift = years.filter((y) => Math.abs((b.spendSub[y]?.[CHILD] ?? NaN) - out.nat[y]) > 0.5);
  if (drift.length) {
    console.error(`${CHILD} disagrees with spendSub for ${drift.join(', ')} — one of them is a stale vintage`);
    process.exit(1);
  }

  /* Same for the division it comes out of: `spendNational[y][1]`, index 1 being
     division 01. */
  const parentDrift = years.filter((y) => Math.abs(b.spendNational[y][1] - out.parentNat[y]) > 0.5);
  if (parentDrift.length) {
    console.error(`${PARENT} disagrees with spendNational for ${parentDrift.join(', ')}`);
    process.exit(1);
  }

  /* The remainder is a real published quantity, not a leftover: the division's other
     seven sub-functions must sum to it exactly. This is what makes the split a
     partition rather than a subtraction. */
  const subBad = years.filter((y) => {
    const rest = Object.entries(b.spendSub[y])
      .filter(([k]) => k.startsWith(PARENT) && k.length === 6 && k !== CHILD)
      .reduce((a, [, v]) => a + v, 0);
    return Math.abs(rest - (out.parentNat[y] - out.nat[y])) > 1;
  });
  if (subBad.length) {
    console.error(`${PARENT} minus ${CHILD} is not the sum of its other sub-functions for ${subBad.join(', ')}`);
    process.exit(1);
  }

  /* A child cannot exceed its parent, in any tier, in any year. */
  const overflow = [];
  for (const y of years)
    for (const [k, t] of Object.entries(out.tiers[y]))
      if (t.int > t.parent) overflow.push(`${k} ${y}`);
  if (overflow.length) {
    console.error(`${CHILD} exceeds ${PARENT} for ${overflow.join(', ')}`);
    process.exit(1);
  }

  out.src = `Eurostat gov_10a_exp · ${PARENT} and ${CHILD} · sectors S13, ${Object.values(TIERS).join(', ')} · MIO_EUR · na_item TE`;
  out.updated = cj.updated;
  /* Said here rather than in the console, so the reason travels with the figures.
     The map draws the regional subsector; this part is not in it, and the division it
     came out of still carries it there. */
  out.noTerritorial = true;

  b.spendInt = out;
  fs.writeFileSync(BUNDLE, JSON.stringify(b));

  const y = years[years.length - 1];
  const t = out.tiers[y];
  const elim = Object.values(t).reduce((a, x) => a + x.int, 0) - out.nat[y];
  console.log(`spendInt: ${years[0]}-${y} (${years.length} years) from ${out.src}`);
  console.log(`  dataset updated ${out.updated}`);
  console.log(`  ${y}: ${PARENT} ${out.parentNat[y]} = services ${out.parentNat[y] - out.nat[y]} + interest ${out.nat[y]} M€`);
  console.log(`  ${y} interest by tier: central ${t.central.int} · regional ${t.regional.int} · local ${t.local.int} · social security ${t.socsec.int}, less ${elim} eliminated`);
  console.log('  no territorial split is published for a COFOG sub-function — the map cannot draw this part');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

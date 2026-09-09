/* The general-government headline as a series: total revenue, total expenditure and
   net lending/borrowing, every year Eurostat publishes them for.

   Reads  eurostat_gov_10a_main.json  (cached by extract_natsub.js — the same file,
                                       the same request, the same accrual basis)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   WHY THIS EXISTS SEPARATELY FROM `gg`
   ------------------------------------
   `gg` is built by merge14 from `natParts`, and merge16 then prunes it along with the
   revenue console's years. That prune is a statement about the MAP: a year is dropped
   when some community has no territorial figure for some component, because a map that
   is half absent is not a picture. It is not a statement about the headline — merge16's
   own header says so ("the headline for such a year is a real published figure").

   So `gg` today runs 2012, 2015-2024: 2013 and 2014 are gone because CONPREL's Navarre
   tables are all-zero, and 2025 because Eurostat has not split it by tax yet. All three
   years' TR, TE and B9 are published, unflagged, and sitting in the extract. A chart of
   the headline drawn off `gg` would break its line across two years the source has
   figures for, and stop a year short of the debt screen — it would draw a gap that does
   not exist and hide a year that does.

   `headline` is therefore the unpruned series, read straight from Eurostat and never
   touched by merge16. Nothing here is estimated: B9 is Eurostat's own published
   balance, asserted to equal TR - TE rather than computed as it, and the step refuses
   to write if the two disagree anywhere or if the series it read has a hole in it.

   Usage: node merge19.js */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const CACHE = path.join(__dirname, 'eurostat_gov_10a_main.json');

/* The three ESA 2010 items the screen names, and nothing else: total revenue, total
   expenditure, and the balance between them. */
const ITEMS = { rev: 'TR', exp: 'TE', def: 'B9' };

/* JSON-stat: `value` is flat and row-major over the declared dimensions, so a stride
   per dimension makes the lookup independent of their order. Same reader as
   extract_natsub.js — deliberately, so both read the file the same way. */
function reader(j) {
  const dims = j.id, sizes = j.size;
  const stride = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));
  const iNa = dims.indexOf('na_item'), iT = dims.indexOf('time');
  const na = j.dimension.na_item.category, tm = j.dimension.time.category;
  return {
    years: Object.keys(tm.index).sort(),
    get: (c, y) => {
      if (na.index[c] == null || tm.index[y] == null) return null;
      const v = j.value[na.index[c] * stride[iNa] + tm.index[y] * stride[iT]];
      return v == null ? null : v;
    },
    /* Eurostat flags an observation it does not consider final. None of TR, TE or B9
       carries one today; if one appears we want to know rather than publish it silently. */
    flag: (c, y) => {
      if (na.index[c] == null || tm.index[y] == null) return null;
      const s = j.status;
      return s ? s[na.index[c] * stride[iNa] + tm.index[y] * stride[iT]] ?? null : null;
    },
  };
}

if (!fs.existsSync(CACHE)) {
  console.error(`missing ${path.basename(CACHE)} — run: node extract_natsub.js`);
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const M = reader(j);
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));

/* A year belongs to the series only when all three items are published for it: two
   thirds of a headline is not a headline, and a chart cannot draw a balance whose
   revenue is missing. */
const years = M.years.filter((y) => Object.values(ITEMS).every((c) => M.get(c, y) != null));
if (!years.length) {
  console.error('gov_10a_main carries no year with TR, TE and B9 all published');
  process.exit(1);
}

/* No holes inside the range. A series with a gap is a fact the console must draw as
   one, and this step is not the place to discover it quietly. */
const span = Number(years[years.length - 1]) - Number(years[0]) + 1;
if (span !== years.length) {
  const have = new Set(years);
  const holes = Array.from({ length: span }, (_, i) => String(Number(years[0]) + i))
    .filter((y) => !have.has(y));
  console.error(`gov_10a_main has no TR/TE/B9 for ${holes.join(', ')} inside ${years[0]}-${years[years.length - 1]}`);
  process.exit(1);
}

const flagged = [];
const out = { years, rev: {}, exp: {}, def: {} };
for (const y of years) {
  for (const [k, code] of Object.entries(ITEMS)) {
    out[k][y] = M.get(code, y);
    const f = M.flag(code, y);
    if (f) flagged.push(`${code} ${y} (${f})`);
  }
}

/* B9 is published, not derived. Asserting the identity is how we know we read the
   right three items off the right sector — a mismatch means the file changed under us. */
const broken = years.filter((y) => Math.abs(out.rev[y] - out.exp[y] - out.def[y]) > 0.5);
if (broken.length) {
  console.error('B9 is not TR - TE for ' + broken.map((y) =>
    `${y} (${out.rev[y]} - ${out.exp[y]} = ${out.rev[y] - out.exp[y]}, published ${out.def[y]})`).join('; '));
  process.exit(1);
}

/* Where merge14's headline survives merge16's prune it must be this same figure. If
   the two ever disagree, one of them is reading a revised vintage and the console
   would state two different totals for one year on two different screens. */
const drift = Object.keys(b.gg || {}).filter((y) =>
  out.rev[y] == null || out.exp[y] == null ||
  Math.abs(b.gg[y].rev - out.rev[y]) > 0.5 || Math.abs(b.gg[y].exp - out.exp[y]) > 0.5);
if (drift.length) {
  console.error('gg and gov_10a_main disagree for ' + drift.join(', '));
  process.exit(1);
}

out.src = 'Eurostat gov_10a_main · sector S13 · MIO_EUR · items TR, TE and B9';
out.updated = j.updated;

b.headline = out;
fs.writeFileSync(BUNDLE, JSON.stringify(b));

const gg = Object.keys(b.gg || {});
const extra = years.filter((y) => !gg.includes(y));
console.log(`headline: ${years[0]}-${years[years.length - 1]} (${years.length} years) from ${out.src}`);
console.log(`  dataset updated ${out.updated}${flagged.length ? ` · flagged: ${flagged.join(', ')}` : ' · no observation flagged'}`);
console.log(`  ${extra.length ? `carries ${extra.join(', ')}, which merge16 prunes from gg for the revenue map` : 'same years as gg'}`);
console.log(`  latest: rev ${out.rev[years[years.length - 1]]} · exp ${out.exp[years[years.length - 1]]} · def ${out.def[years[years.length - 1]]} M€`);

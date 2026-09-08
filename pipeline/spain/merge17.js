/* The "fees, public prices and sales" bucket in three published cuts, none of them
   estimated, each reconciled to a figure already in the bundle.

   Reads  sales_tier.json      (node extract_sales_tier.js — Eurostat gov_10a_main by subsector)
          ccaa_owntax.json     (python3 extract_owntax.py — IGAE A_CCAA_Det_{y}.xlsx, Tabla1a)
          local_owntax.json    (python3 extract_local.py  — CONPREL Tabla 2, chapter 3 by article)
          local_fees_art.json  (same run — the files' own article labels)
   Reads and rewrites data/derived/es-fiscal-bundle.json in place. Idempotent: the block
   is rebuilt from the inputs on every run. Run after merge16.js, which fixes the years.

   WHAT THE THREE CUTS ARE
   -----------------------
   tier    Who charges it. The same two ESA items that partition the bucket nationally
           (P11_P12 market output and own-use output; P131 part-payments for non-market
           output such as tuition, co-payments and administrative fees), per government
           subsector. Same dataset and basis as the bucket, so S1311+S1312+S1313+S1314
           equals natParts.sales to the million in every year — asserted.
   region  What each autonomous community's government charges: P.11, P.12 and P.131
           from the IGAE per-community accounts that already feed the regional tax layer.
           The seventeen communities sum to the Eurostat S1312 row exactly in every year
           2012-2024 — asserted. NOT folded into the map's `sales` part: that part is
           built from cash sources (AEAT's territorial fee line, CONPREL chapter 3, the
           foral treasuries' fee block) and mixing in this accrual figure without first
           settling the overlap with the foral block would be a plug. It is published
           beside the map figure as the community's own published number, and the
           console says which figure is which.
   local   What the community's councils charge, by kind: CONPREL chapter 3 by article
           (Orden EHA/3565/2008), cash basis, the same column merge13.js reads. The
           articles reproduce the chapter exactly in thousands; rounded to millions one
           by one they can drift from the rounded chapter total by a few million, so the
           total is carried alongside and the tolerance is stated, not hidden.

   P.12 is not money received — it is the value of what a government produced for its
   own use (own-account software, construction, R&D), imputed by national accounts. It
   sits inside the national headline because Eurostat's P11_P12 does; the label says so. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const tierSrc = JSON.parse(fs.readFileSync(path.join(__dirname, 'sales_tier.json'), 'utf8'));
const ccaa = JSON.parse(fs.readFileSync(path.join(__dirname, 'ccaa_owntax.json'), 'utf8'));
const loc = JSON.parse(fs.readFileSync(path.join(__dirname, 'local_owntax.json'), 'utf8'));
const art = JSON.parse(fs.readFileSync(path.join(__dirname, 'local_fees_art.json'), 'utf8'));

const TIERS = ['S1311', 'S1312', 'S1313', 'S1314'];
const ITEMS = ['P11_P12', 'P131'];
const ART_TOL = 5; // € millions: nine articles each rounded to the million

const years = Object.keys(b.natParts).filter((y) => b.natParts[y].detail).sort();
if (!years.length) throw new Error('no detailed year in natParts');

const fail = (m) => { throw new Error(m); };
const sum = (o, ks) => ks.reduce((a, k) => a + (o[k] || 0), 0);

/* ---- tier: Σ subsectors = the bucket -------------------------------------- */
const tier = {};
for (const y of years) {
  const rec = tierSrc.years[y];
  if (!rec) fail(`sales_tier.json has no ${y}`);
  const out = {};
  for (const s of TIERS) out[s] = { P11_P12: rec[s].P11_P12, P131: rec[s].P131 };
  const tot = TIERS.reduce((a, s) => a + out[s].P11_P12 + out[s].P131, 0);
  if (tot !== b.natParts[y].sales) fail(`${y}: tiers ${tot} vs natParts.sales ${b.natParts[y].sales}`);
  for (const it of ITEMS) {
    const nat = ((b.natSub[y] || {}).sales || []).find((r) => r[0] === it);
    if (nat && TIERS.reduce((a, s) => a + out[s][it], 0) !== nat[1]) fail(`${y} ${it}: tiers do not reproduce natSub`);
  }
  tier[y] = out;
}

/* ---- region: Σ communities = the S1312 row -------------------------------- */
const region = {};
const regionIds = b.regions.filter((r) => ccaa[years[0]] && ccaa[years[0]][r.id]).map((r) => r.id);
for (const y of years) {
  const src = ccaa[y];
  if (!src) fail(`ccaa_owntax.json has no ${y}`);
  const out = {};
  for (const id of Object.keys(src)) {
    if (id === 'ES') continue;
    const r = src[id];
    if (!['P.11', 'P.12', 'P.131'].every((k) => typeof r[k] === 'number')) fail(`${y} ${id}: P.11/P.12/P.131 missing — rerun extract_owntax.py`);
    out[id] = { P11: r['P.11'], P12: r['P.12'], P131: r['P.131'] };
  }
  if (Object.keys(out).length !== 17) fail(`${y}: ${Object.keys(out).length} communities, expected 17`);
  const m = Object.values(out).reduce((a, r) => a + r.P11 + r.P12, 0);
  const p = Object.values(out).reduce((a, r) => a + r.P131, 0);
  if (m !== tier[y].S1312.P11_P12 || p !== tier[y].S1312.P131)
    fail(`${y}: communities ${m}/${p} vs Eurostat S1312 ${tier[y].S1312.P11_P12}/${tier[y].S1312.P131}`);
  region[y] = out;
}

/* ---- local: articles reproduce the chapter each community's map figure carries */
const local = {};
let worst = 0;
for (const y of years) {
  const src = loc[y];
  if (!src) fail(`local_owntax.json has no ${y}`);
  const out = {};
  for (const [id, r] of Object.entries(src)) {
    if (!r.feesArt) fail(`${y} ${id}: feesArt missing — rerun extract_local.py`);
    const d = Math.abs(sum(r.feesArt, Object.keys(r.feesArt)) - r.fees);
    if (d > ART_TOL) fail(`${y} ${id}: articles ${sum(r.feesArt, Object.keys(r.feesArt))} vs chapter ${r.fees}`);
    worst = Math.max(worst, d);
    out[id] = { total: r.fees, art: r.feesArt };
  }
  local[y] = out;
}
for (const c of art.codes) if (!art.labels[c]) fail(`article ${c} has no label in the source`);

/* ---- the two ESA labels the console shows for this bucket, in plain words ----
   merge9.js carries the same strings; a fresh build and this patch agree. */
b.subLab.es.P11_P12 = 'Ventas de bienes y servicios (y lo producido para uso propio)';
b.subLab.en.P11_P12 = 'Sales of goods and services (and output kept for own use)';
b.subLab.es.P131 = 'Pagos parciales por servicios públicos: matrículas, copagos, tasas';
b.subLab.en.P131 = 'Part-payments for public services: tuition, co-payments, fees';

b.salesDetail = {
  years,
  tier,
  region,
  local,
  artCodes: art.codes,
  artSrc: art.labels,
  artTol: ART_TOL,
  src: {
    tier: `Eurostat gov_10a_main, sectors S1311-S1314, items P11_P12 and P131, MIO_EUR (dataset ${tierSrc.updated})`,
    region: 'IGAE, Administración Regional (S.1312) detalle por comunidad, A_CCAA_Det_{year}.xlsx Tabla1a, P.11/P.12/P.131',
    local: 'CONPREL liquidaciones definitivas por comunidad, Tabla 2, capítulo 3 por artículo, recaudación líquida',
  },
};

fs.writeFileSync(BUNDLE, JSON.stringify(b));
const last = years[years.length - 1];
const T = tier[last];
console.log(`salesDetail ${years[0]}-${last} · tiers = bucket, communities = S1312, articles = chapter (worst drift ${worst} M€)`);
console.log(`\n${last} who charges the ${(b.natParts[last].sales / 1000).toFixed(1)} bn€ (bn€):`);
for (const s of TIERS) console.log(`  ${s}  ${((T[s].P11_P12 + T[s].P131) / 1000).toFixed(1).padStart(6)}`);
const top = Object.entries(region[last]).sort((a, b2) => (b2[1].P11 + b2[1].P12 + b2[1].P131) - (a[1].P11 + a[1].P12 + a[1].P131)).slice(0, 5);
console.log(`\n${last} regional governments' own charges, top five (bn€, P.11+P.12+P.131):`);
for (const [id, r] of top) console.log(`  ${id}  ${((r.P11 + r.P12 + r.P131) / 1000).toFixed(2)}   of which own-use output ${(r.P12 / 1000).toFixed(2)}`);
const nat = {};
for (const r of Object.values(local[last])) for (const [c, v] of Object.entries(r.art)) nat[c] = (nat[c] || 0) + v;
console.log(`\n${last} council charges by article, all communities (bn€):`);
for (const c of art.codes) console.log(`  ${c}  ${((nat[c] || 0) / 1000).toFixed(2).padStart(6)}  ${art.labels[c]}`);

/* The spending map becomes a map of territories, not of one tier.

   Reads  local_spend.json        (python3 extract_local_spend.py — CONPREL Tablas 2, 3 and 4)
          local_spend_areas.json  (same run — the files' own programme-area labels)
   Reads and rewrites data/derived/es-fiscal-bundle.json in place. Idempotent: every
   block is rebuilt from the inputs on every run. Run after merge7's aggregates exist
   (they are in the shipped bundle) and after merge16.js has fixed the years.

   WHAT THIS CHANGES AND WHY
   -------------------------
   Until now the spending map drew the regional government tier (S.1312) and put
   the other three tiers beside it as coins. Councils sit inside communities, so
   "councils" was never money without a territory — it was money the map had not
   been given. Every territory now carries what is spent in it by the two tiers
   that have one:

     regions[].local[y]  what the community's local entities spent (CONPREL), as
                         one figure per programme area and one net figure after
                         the transfers that would count twice are taken out
     spendTerr[y]        the reconciliation for the whole map: the regional tier,
                         the net local layer, the one State coin, and what is in
                         that coin — central government, Social Security, the
                         part of the local tier the territorial layer cannot
                         reach, and the inter-tier elimination

   The identity the console relies on, for every year:

     Σ regional + Σ localNet + state = national (consolidated S.13)

   holds because `state` is defined as the remainder — and the remainder is then
   opened up, not left as a plug: central + socsec + adj + localRest reproduce it
   to the euro, where each of the four is a published figure or the difference
   between two published figures (localRest = S.1313 − Σ localNet).

   WHAT IS NETTED, AND WHAT IS NOT
   -------------------------------
   Taken out of the local layer: transfers to another tier of government (the
   Basque Diputaciones Forales' ~€12bn a year to the Basque Government above all)
   and transfers received from the community government, because both legs are
   already inside the regional figure the map carries. See extract_local_spend.py.
   NOT taken out: the regional tier's own transfers to the State (the Basque cupo
   and Navarrese aportación) — the IGAE per-community figure is carried as
   published, and reconstructing regional accounts is not this project's job.

   YEARS WITH A NAMED GAP
   ----------------------
   CONPREL's table is published but zero on every line for Navarre in 2013 and
   2014 and for Melilla in 2022. Those territories carry the regional tier only
   (Melilla: nothing) for that year, `spendTerr[y].partial` names them, and the
   difference lands in `localRest` where the console can say so. Nothing is
   carried forward or filled in. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const loc = JSON.parse(fs.readFileSync(path.join(__dirname, 'local_spend.json'), 'utf8'));
const areas = JSON.parse(fs.readFileSync(path.join(__dirname, 'local_spend_areas.json'), 'utf8'));

const fail = (m) => { throw new Error(m); };
const years = b.spendYears;
const CITIES = ['18', '19'];

for (const y of years) if (!loc[y]) fail(`local_spend.json has no ${y} — rerun extract_local_spend.py`);

/* ---- the programme areas, labelled from the files ------------------------- */
const AREA_EN = {
  '0': 'Public debt',
  '1': 'Basic public services',
  '2': 'Social protection and promotion',
  '3': 'Preferential public goods (health, education, culture)',
  '4': 'Economic action',
  '9': 'General administration',
};
for (const c of areas.codes) {
  if (!areas.labels[c]) fail(`area ${c} has no label in the source`);
  if (!AREA_EN[c]) fail(`area ${c} has no English label — add it here`);
}
b.localAreas = {
  codes: areas.codes,
  es: Object.fromEntries(areas.codes.map((c) => [c, areas.labels[c].replace(/\s+/g, ' ')])),
  en: Object.fromEntries(areas.codes.map((c) => [c, AREA_EN[c]])),
};

/* ---- per territory ------------------------------------------------------- */
const spendTerr = {};
for (const y of years) {
  const A = b.spendAgg[y] && b.spendAgg[y].TOTAL;
  if (!A) fail(`spendAgg has no TOTAL for ${y}`);
  let regional = 0, localNet = 0;
  const partial = [], missing = [];
  for (const r of b.regions) {
    r.local = r.local || {};
    const rec = loc[y][r.id] || null;
    if (rec) {
      for (const k of ['total', 'nonfin', 'fin', 'toGov', 'fromCA', 'net', 'areas'])
        if (rec[k] === undefined) fail(`${y} ${r.id}: ${k} missing — rerun extract_local_spend.py`);
      if (rec.net <= 0) fail(`${y} ${r.id}: net local spending ${rec.net} is not positive`);
      if (Math.abs(rec.nonfin - rec.toGov - rec.fromCA - rec.net) > 1) fail(`${y} ${r.id}: net does not follow from its parts`);
      const aSum = Object.values(rec.areas).reduce((a, v) => a + v, 0);
      if (Math.abs(aSum - rec.nonfin) > areas.codes.length) fail(`${y} ${r.id}: areas ${aSum} vs non-financial ${rec.nonfin}`);
      r.local[y] = rec;
      localNet += rec.net;
    } else {
      r.local[y] = null;
    }
    const s = r.spend[y];
    if (s) regional += s[0];
    if (s && !rec) partial.push(r.id);
    if (!s && !rec) missing.push(r.id);
    if (!s && !CITIES.includes(r.id)) fail(`${y} ${r.id}: a community without a regional figure`);
  }
  if (Math.abs(regional - A.mapped) > 1) fail(`${y}: Σ regional ${regional} vs spendAgg.mapped ${A.mapped}`);
  const mapped = regional + localNet;
  const state = A.nat - mapped;
  const localRest = A.local - localNet;
  if (Math.abs(A.central + A.socsec + A.adj + localRest - state) > 1) fail(`${y}: the coin does not decompose`);
  spendTerr[y] = {
    nat: A.nat, mapped, regional, localNet, state,
    central: A.central, socsec: A.socsec, adj: A.adj,
    localTier: A.local, localRest,
    partial, missing,
  };
}
b.spendTerr = spendTerr;

/* Years the local layer covers, for the coverage statement. */
b.coverage.localSpend = `${years[0]}-${years[years.length - 1]}`;

fs.writeFileSync(BUNDLE, JSON.stringify(b));
console.log(`merge18: territorial spending under ${years.length} years, ${b.regions.length} territories`);
const f = (v) => (v / 1000).toFixed(1).padStart(7);
console.log('  year   national  onMap regional  local   coin  central  socsec    adj  locRest  gaps');
for (const y of years) {
  const t = spendTerr[y];
  console.log(`  ${y} ${f(t.nat)}${f(t.mapped)}${f(t.regional)}${f(t.localNet)}${f(t.state)}${f(t.central)}${f(t.socsec)}${f(t.adj)}${f(t.localRest)}  ${[...t.partial, ...t.missing].join(',') || '-'}`);
}

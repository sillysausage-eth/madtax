/* Regional GDP and population by year, from Eurostat, and the general-government
   headline by year from the bundle's own national accounts.

   Reads   eurostat_nama_10r_2gdp.json      regional GDP at market prices, € millions
           eurostat_demo_r_pjanaggr3.json   population on 1 January
   Fetches both unless --offline. Reads and rewrites the bundle in place. Idempotent.

   WHY
   ---
   Every region carried ONE population (1 January 2024) and ONE GDP (2023), and
   the console divided every year's revenue and spending by them: €-per-resident
   in 2012 used the population of 2024, and %-of-GDP in 2012 used the GDP of 2023.
   Per-capita and %GDP are ratios of two measurements of the same year or they are
   not those ratios. Both series are published for every NUTS2 region and every
   year the bundle covers, so there was nothing to estimate — only to look up.

   Population is the headcount on 1 January of the year (Eurostat's regional
   series publishes no other), and the console says so. GDP is at current market
   prices; the latest year is flagged provisional where Eurostat flags it.

   The scalar `gdp` and `pop` fields are removed. A single-vintage number on a
   multi-year record is the defect this script exists to remove. */

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const GEO = ['ES61','ES24','ES12','ES53','ES70','ES13','ES41','ES42','ES51','ES52','ES43','ES11','ES30','ES62','ES22','ES21','ES23','ES63','ES64'];
const Q = '?format=JSON&lang=EN&sinceTimePeriod=2007&' + GEO.map((g) => 'geo=' + g).join('&');

async function grab(ds, extra) {
  const cache = path.join(__dirname, `eurostat_${ds}.json`);
  if (process.argv.includes('--offline')) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const r = await fetch(API + ds + Q + extra);
  if (!r.ok) throw new Error(`${ds}: HTTP ${r.status}`);
  const j = await r.json();
  fs.writeFileSync(cache, JSON.stringify(j));
  return j;
}
/* JSON-stat, row-major over the declared dimensions. */
function reader(j) {
  const dims = j.id, sizes = j.size;
  const stride = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));
  const iG = dims.indexOf('geo'), iT = dims.indexOf('time');
  const geo = j.dimension.geo.category.index, tm = j.dimension.time.category.index;
  const status = j.status || {};
  return {
    years: Object.keys(tm).sort(),
    get: (g, y) => {
      if (geo[g] == null || tm[y] == null) return [null, null];
      const idx = geo[g] * stride[iG] + tm[y] * stride[iT];
      const v = j.value[idx];
      return [v == null ? null : v, status[idx] || null];
    },
  };
}

(async () => {
  const [gdpJ, popJ] = await Promise.all([
    grab('nama_10r_2gdp', '&unit=MIO_EUR'),
    grab('demo_r_pjanaggr3', '&sex=T&age=TOTAL'),
  ]);
  const G = reader(gdpJ), P = reader(popJ);
  const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));

  /* Every year any console can select. A year the series has not reached yet
     (Eurostat publishes regional GDP about fourteen months after the year ends)
     is reported, not fatal: merge16.js drops revenue years without full data,
     and a year with no denominator is one of them. A hole INSIDE the published
     range is a broken fetch and stops the run. */
  const need = [...new Set([...b.revYears, ...b.spendYears])].sort();
  const lastG = G.years[G.years.length - 1], lastP = P.years[P.years.length - 1];
  const gaps = [], pending = [];
  for (const r of b.regions) {
    const gdp = {}, pop = {}, prov = [];
    for (const y of G.years) { const [v, s] = G.get(r.nuts, y); if (v != null) { gdp[y] = Math.round(v); if (s === 'p') prov.push(y); } }
    for (const y of P.years) { const [v] = P.get(r.nuts, y); if (v != null) pop[y] = v; }
    for (const y of need) {
      if (gdp[y] == null) (y > lastG ? pending : gaps).push(`${r.nuts} gdp ${y}`);
      if (pop[y] == null) (y > lastP ? pending : gaps).push(`${r.nuts} pop ${y}`);
    }
    r.macro = {
      gdp, pop,
      gdpProvisional: prov,
      src: {
        gdp: 'Eurostat nama_10r_2gdp — regional GDP at current market prices, € million',
        pop: 'Eurostat demo_r_pjanaggr3 — population on 1 January',
      },
      updated: { gdp: gdpJ.updated, pop: popJ.updated },
    };
    delete r.gdp;
    delete r.pop;
  }
  if (gaps.length) {
    console.error(`macro series missing for ${gaps.length} region-years inside the published range:`);
    gaps.slice(0, 10).forEach((g) => console.error('  ' + g));
    process.exit(1);
  }
  if (pending.length) {
    const ys = [...new Set(pending.map((g) => g.split(' ')[2]))].sort();
    console.log(`note: Eurostat has not yet published the denominators for ${ys.join(', ')} ` +
      `(GDP to ${lastG}, population to ${lastP}); those years have no per-capita or %GDP reading`);
  }

  /* The general-government headline: what Eurostat publishes as total revenue and
     expenditure, exactly, for every year the national accounts cover — replacing
     six hand-copied values rounded to €100m. */
  b.gg = {};
  for (const y of Object.keys(b.natParts).sort()) {
    b.gg[y] = { rev: b.natParts[y].published, exp: b.natParts[y].expenditure };
  }

  fs.writeFileSync(BUNDLE, JSON.stringify(b));
  const r0 = b.regions.find((r) => r.id === '13');
  const gy = Object.keys(r0.macro.gdp), py = Object.keys(r0.macro.pop);
  console.log(`macro: GDP ${gy[0]}-${gy[gy.length - 1]} (provisional: ${r0.macro.gdpProvisional.join(', ') || 'none'}) · ` +
    `population ${py[0]}-${py[py.length - 1]} · ${b.regions.length} regions, no gaps over ${need[0]}-${need[need.length - 1]}`);
  console.log(`  Madrid  GDP 2012 ${r0.macro.gdp['2012']} -> 2024 ${r0.macro.gdp['2024']} M€ · pop 2012 ${r0.macro.pop['2012']} -> 2025 ${r0.macro.pop['2025']}`);
  const gk = Object.keys(b.gg);
  console.log(`gg: ${gk[0]}-${gk[gk.length - 1]} from the national accounts (${gk.length} years)`);
})();

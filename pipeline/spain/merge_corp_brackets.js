/* Restructures who.corp so the console can show corporate tax by turnover bracket.

   Reads  corp_brackets.json  (python3 extract_corp_brackets.py)
   Reads and rewrites  data/derived/es-fiscal-bundle.json  in place. Idempotent.

   Before:  who.corp = {kind:'company', years: <table 8.5: total/groups/standalone>}
   After:   who.corp = {kind:'company', years: <17 turnover brackets, 2016-2023>,
                        types: <the table 8.5 series, 2008-2024, kept for tie-outs>}

   `years` is what the console renders and what decides whether a year has a
   breakdown at all, as in every other who.* bucket. Table 8.5 is the Informe
   Anual's summary of this very statistic, so for every year both carry, the
   bracket Total must reproduce the 8.5 total. A year that does not agree is a
   changed layout, or the wrong table, and stops the run — nothing is written.

   Re-running with a fresh extraction replaces `years` wholesale. Years the fresh
   file does not carry are dropped, never carried forward.

   Named for what it does, not numbered: merge17.js was taken by the fees bucket
   in a parallel session and this script was overwritten once. */
const fs = require('fs');
const path = require('path');
const BUNDLE = path.join(__dirname, '../../data/derived/es-fiscal-bundle.json');
const b = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const fresh = JSON.parse(fs.readFileSync(path.join(__dirname, 'corp_brackets.json'), 'utf8'));

/* AEAT's announced date for the next edition (2024 data), from the open-data
   catalogue page. The console shows it in place of the table for years the
   series does not carry. Update it when the edition lands or the date moves. */
const NEXT_RELEASE = '2026-10';

const corp = b.who && b.who.corp;
if (!corp || corp.kind !== 'company') { console.error('who.corp missing or not kind:company'); process.exit(1); }

/* The table 8.5 series lives in .years until this script first runs, in .types after. */
const isTypes = (ys) => Object.values(ys).every((r) => r && r.total && 'groups' in r && !('rows' in r));
const types = corp.types && isTypes(corp.types) ? corp.types
  : corp.years && isTypes(corp.years) ? corp.years : null;
if (!types) { console.error('cannot find the table 8.5 series (total/groups/standalone) in who.corp'); process.exit(1); }

/* Tax and taxable base must agree to the rounding of both sources (8.5 rounds to
   €0.01m, the statistic to €0.001m). "Beneficio" is allowed to differ from 8.5's
   "Resultado contable positivo" by up to 1%: the 2025 edition of the Informe
   Anual revised 2016 (0.87%) and 2018 (0.01%) while the statistic did not. Both
   are AEAT's own figures; the console shows the statistic's, and the difference
   is written into the bundle as a fact rather than smoothed away. */
const bad = [], profitDiff = {};
for (const [y, rec] of Object.entries(fresh)) {
  const t = types[y] && types[y].total;
  if (!t || t.profit == null) continue;
  for (const f of ['base', 'tax']) {
    if (Math.abs(rec.total[f] - t[f]) > 0.011) bad.push(`${y}/${f}: brackets ${rec.total[f]} vs table 8.5 ${t[f]}`);
  }
  const dp = rec.total.profit - t.profit;
  if (Math.abs(dp) > 0.011) {
    if (Math.abs(dp) > Math.abs(t.profit) * 0.01) bad.push(`${y}/profit: brackets ${rec.total.profit} vs table 8.5 ${t.profit} (>1%)`);
    else profitDiff[y] = { brackets: rec.total.profit, table85: t.profit };
  }
}
if (bad.length) { console.error(`bracket totals disagree with table 8.5:\n  ${bad.join('\n  ')}`); process.exit(1); }

const fy = Object.keys(fresh).sort();
const ty = Object.keys(types).sort();
b.who.corp = {
  kind: 'company',
  years: fresh,
  types,
  src: 'AEAT — Cuentas anuales consolidadas del Impuesto sobre Sociedades, "Principales variables por Cifra de Negocio y por signo del resultado contable" (RC, sector and group filters at Total); thousands of euros in the source, millions here',
  typesSrc: corp.typesSrc || corp.src || 'AEAT — Informe Anual de Recaudación Tributaria, cuadro 8.5 (Impuesto sobre Sociedades por tipo de sociedad); (p) = provisional',
  /* Years where the statistic's Beneficio and table 8.5's Resultado contable positivo differ (€m). Tax and base agree in every year. */
  profitDiff,
  nextRelease: NEXT_RELEASE,
};
fs.writeFileSync(BUNDLE, JSON.stringify(b));
console.log(`who.corp.years: turnover brackets ${fy[0]}-${fy[fy.length - 1]} (${fresh[fy[fy.length - 1]].rows.length} brackets) · next edition ${NEXT_RELEASE}`);
console.log(`who.corp.types: table 8.5 ${ty[0]}-${ty[ty.length - 1]} · tax and base tie out for ${fy.filter((y) => types[y] && types[y].total.profit != null).join(', ')}`);
for (const [y, d] of Object.entries(profitDiff)) console.log(`  profit differs in ${y}: statistic ${d.brackets} vs table 8.5 ${d.table85} (${((d.brackets - d.table85) / d.table85 * 100).toFixed(2)}%)`);

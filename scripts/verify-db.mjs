#!/usr/bin/env node
//
// verify-db.mjs — the M4 gate. Recomputes key identities FROM THE LIVE
// SUPABASE MIRROR, over the ANON key (the same key the public site would
// use), and checks each one against data/derived/es-fiscal-bundle.json —
// the bundle is truth, never the database. Also proves the mirror really is
// read-only: an anon write attempt must be rejected.
//
//   node --env-file=.env.local scripts/verify-db.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. This is
// deliberately the public key, not the service role — every read below is a
// read anyone visiting the site could make.
//
// Every numeric check compares two things that should be EXACTLY equal (to
// float precision): a value queried from the database, and the same value
// computed independently from the bundle. No tolerance is invented anywhere
// — where the underlying data itself is only approximately consistent (e.g.
// two different AEAT populations), the check says so and does not pretend to
// reconcile them. PASS/FAIL per check, non-zero exit on any FAIL.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_PATH = path.join(ROOT, 'data/derived/es-fiscal-bundle.json');

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log('  PASS  ' + name + (detail ? '   ' + detail : ''));
  } else {
    fail++;
    console.log('  FAIL  ' + name + (detail ? '   ' + detail : ''));
  }
}

// Both sides originate from the same JSON literals (bundle -> seed -> numeric
// column -> PostgREST -> JS number), so equality should be exact; the epsilon
// only absorbs binary floating-point representation, never real tolerance.
const EPS = 1e-6;
const close = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= EPS;
const allClose = (pairs) => pairs.every(([a, b]) => close(a, b));
const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: 3 }) : String(v));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY; run with --env-file=.env.local');
    process.exit(1);
  }
  const db = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const B = JSON.parse(readFileSync(BUNDLE_PATH, 'utf8'));

  const sum = (rows, field) => rows.reduce((s, r) => s + Number(r[field]), 0);

  async function select(table, columns, filters) {
    let q = db.from(table).select(columns);
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    const { data, error } = await q;
    if (error) throw new Error(`query ${table} (${JSON.stringify(filters)}) failed: ${error.code ?? '?'} ${error.message}`);
    return data;
  }

  async function selectOne(table, columns, filters) {
    const rows = await select(table, columns, filters);
    if (rows.length !== 1) throw new Error(`${table} (${JSON.stringify(filters)}) returned ${rows.length} rows, expected 1`);
    return rows[0];
  }

  // ---- A. debt instrument split reproduces the consolidated stock ---------
  console.log('\n=== A. DEBT: instrument split sums to debt_stock (bundle-exact) ===');
  for (const y of ['2010', '2018', '2025']) {
    const dbRows = await select('debt_instrument', 'amount_mn', { year: Number(y) });
    const dbSum = sum(dbRows, 'amount_mn');
    const dbStock = await selectOne('debt_stock', 'total_mn', { year: Number(y) });
    const bundleSum = B.debt.instr[y].reduce((s, [, v]) => s + v, 0);
    const bundleTotal = B.debt.total[y];
    check(
      `debt_instrument Σ = debt_stock.total_mn (${y})`,
      allClose([
        [dbSum, bundleSum],
        [dbStock.total_mn, bundleTotal],
        [dbSum, dbStock.total_mn],
      ]),
      `DB Σ${fmt(dbSum)} = DB total ${fmt(dbStock.total_mn)}; bundle Σ${fmt(bundleSum)} = bundle total ${fmt(bundleTotal)}`
    );
  }

  // ---- B. debt tier: gross - elimination = consolidated -------------------
  console.log('\n=== B. DEBT: tier gross − elimination = consolidated (bundle-exact) ===');
  for (const y of ['2010', '2018', '2025']) {
    const dbTotal = await selectOne('debt_tier_total', 'gross_mn,consolidated_mn,elimination_mn', { year: Number(y) });
    const bt = B.debt.tier[y];
    check(
      `debt_tier_total: gross − elim = consolidated (${y})`,
      allClose([
        [dbTotal.gross_mn - dbTotal.elimination_mn, dbTotal.consolidated_mn],
        [dbTotal.gross_mn, bt.gross],
        [dbTotal.consolidated_mn, bt.consolidated],
        [dbTotal.elimination_mn, bt.elim],
      ]),
      `DB gross ${fmt(dbTotal.gross_mn)} − elim ${fmt(dbTotal.elimination_mn)} = ${fmt(dbTotal.gross_mn - dbTotal.elimination_mn)} vs consolidated ${fmt(dbTotal.consolidated_mn)}`
    );
  }

  // ---- C. debt interest: gross - elimination = total -----------------------
  console.log('\n=== C. DEBT: interest gross − elimination = total (bundle-exact) ===');
  for (const y of ['2010', '2018', '2025']) {
    const dbTotal = await selectOne('debt_interest_total', 'gross_mn,total_mn,elimination_mn', { year: Number(y) });
    const bi = B.debt.interest[y];
    check(
      `debt_interest_total: gross − elim = total (${y})`,
      allClose([
        [dbTotal.gross_mn - dbTotal.elimination_mn, dbTotal.total_mn],
        [dbTotal.gross_mn, bi.gross],
        [dbTotal.total_mn, bi.total],
        [dbTotal.elimination_mn, bi.elim],
      ]),
      `DB gross ${fmt(dbTotal.gross_mn)} − elim ${fmt(dbTotal.elimination_mn)} = ${fmt(dbTotal.gross_mn - dbTotal.elimination_mn)} vs total ${fmt(dbTotal.total_mn)}`
    );
  }

  // ---- D. debt holders sum to the published total --------------------------
  console.log('\n=== D. DEBT: holders sum to their stated total (bundle-exact) ===');
  {
    const rows = await select('debt_holders', 'amount_mn', {});
    const dbSum = sum(rows, 'amount_mn');
    const meta = await selectOne('debt_holders_meta', 'total_mn', { id: 1 });
    const bundleSum = B.debt.holders.rows.reduce((s, [, v]) => s + v, 0);
    check(
      'debt_holders Σ = debt_holders_meta.total_mn = bundle total',
      allClose([
        [dbSum, meta.total_mn],
        [dbSum, bundleSum],
        [meta.total_mn, B.debt.holders.total],
      ]),
      `DB Σ${fmt(dbSum)} = meta total ${fmt(meta.total_mn)}; bundle Σ${fmt(bundleSum)} = bundle total ${fmt(B.debt.holders.total)}`
    );
  }

  // ---- E. natSub children sum to their natParts bucket ---------------------
  console.log('\n=== E. REVENUE: natSub children sum to their natParts bucket (bundle-exact) ===');
  for (const [y, part] of [
    ['2018', 'sales'],
    ['2020', 'eu'],
    ['2025', 'propInc'],
  ]) {
    const rows = await select('nat_revenue_sub', 'amount_mn', { year: Number(y), part });
    const dbSum = sum(rows, 'amount_mn');
    const parent = await selectOne('nat_revenue_parts', 'amount_mn', { year: Number(y), part });
    const bundleChildSum = B.natSub[y][part].reduce((s, [, v]) => s + v, 0);
    const bundleParent = B.natParts[y][part];
    check(
      `nat_revenue_sub Σ = nat_revenue_parts (${y} ${part})`,
      allClose([
        [dbSum, bundleChildSum],
        [parent.amount_mn, bundleParent],
        [dbSum, parent.amount_mn],
      ]),
      `DB Σ${fmt(dbSum)} = DB parent ${fmt(parent.amount_mn)}; bundle Σ${fmt(bundleChildSum)} = bundle parent ${fmt(bundleParent)}`
    );
  }

  // ---- F. who.irpf decile TOT (2023) ----------------------------------------
  console.log('\n=== F. WHO PAYS: IRPF decile TOT ties to the bundle (2023) ===');
  {
    const cols =
      'taxpayers,income_eur,tax_eur,rate_pct,src_work_eur,src_cap_mob_eur,src_cap_inm_eur,src_biz_eur,src_gains_eur,src_imputed_eur';
    const row = await selectOne('who_irpf_decile', cols, { year: 2023, band: 'TOT' });
    const b = B.who.irpf.deciles['2023'].TOT;
    check(
      'who_irpf_decile TOT (2023) matches bundle exactly',
      allClose([
        [row.taxpayers, b.n],
        [row.income_eur, b.income],
        [row.tax_eur, b.tax],
        [row.rate_pct, b.rate],
        [row.src_work_eur, b.src.work],
        [row.src_cap_mob_eur, b.src.capMob],
        [row.src_cap_inm_eur, b.src.capInm],
        [row.src_biz_eur, b.src.biz],
        [row.src_gains_eur, b.src.gains],
        [row.src_imputed_eur, b.src.imputed],
      ]),
      `DB tax_eur ${fmt(row.tax_eur)} vs bundle ${fmt(b.tax)}; DB taxpayers ${fmt(row.taxpayers)} vs bundle ${fmt(b.n)}`
    );
  }

  // ---- G. who.irpf bracket total (2023) --------------------------------------
  console.log('\n=== G. WHO PAYS: IRPF bracket total ties to the bundle (2023) ===');
  {
    const row = await selectOne('who_irpf_bracket_total', 'returns,tax_eur,avg_eur', { year: 2023 });
    const b = B.who.irpf.brackets['2023'].total;
    check(
      'who_irpf_bracket_total (2023) matches bundle exactly',
      allClose([
        [row.returns, b.n],
        [row.tax_eur, b.tax],
        [row.avg_eur, b.avg],
      ]),
      `DB returns ${fmt(row.returns)} tax_eur ${fmt(row.tax_eur)} vs bundle n ${fmt(b.n)} tax ${fmt(b.tax)}`
    );
    // Named explicitly by the spec as a "ties to" check, not an "equals" check:
    // deciles count declarants, brackets count returns (incl. non-payers) — a
    // different population, by the bundle's own documentation (see
    // supabase/migrations/0002 comment on who_irpf_bracket). So this is
    // reported as a fact about the gap, not asserted to be zero.
    const decileTot = B.who.irpf.deciles['2023'].TOT;
    console.log(
      `        info  decile TOT tax_eur ${fmt(decileTot.tax)} vs bracket total tax_eur ${fmt(b.tax)} — ` +
        `Δ ${fmt(b.tax - decileTot.tax)} (different populations by design, not a tie-out)`
    );
  }

  // ---- H. cofog_spend divisions sum to national_spend TOTAL ------------------
  console.log('\n=== H. SPENDING: COFOG divisions sum to the national TOTAL (bundle-exact) ===');
  for (const y of ['2012', '2024']) {
    const divCodes = B.divisions.map((d) => `GF${d}`);
    const rows = await select('cofog_spend', 'cofog,amount_mn', { year: Number(y) });
    const divRows = rows.filter((r) => divCodes.includes(r.cofog));
    const dbSum = sum(divRows, 'amount_mn');
    const total = await selectOne('national_spend', 'amount_mn', { year: Number(y), cofog: 'TOTAL' });
    const bundleDivSum = divCodes.reduce((s, c) => s + B.spendSub[y][c], 0);
    const bundleTotal = B.spendNational[y][0];
    check(
      `cofog_spend divisions Σ = national_spend TOTAL (${y})`,
      allClose([
        [dbSum, bundleDivSum],
        [total.amount_mn, bundleTotal],
        [dbSum, total.amount_mn],
      ]),
      `DB Σdivisions ${fmt(dbSum)} = DB TOTAL ${fmt(total.amount_mn)}; bundle Σ${fmt(bundleDivSum)} = bundle TOTAL ${fmt(bundleTotal)}`
    );
  }

  // ---- I. cofog_spend group children sum to their division (GF03) ------------
  console.log('\n=== I. SPENDING: COFOG group children sum to their division, GF03 (bundle-exact) ===');
  for (const y of ['2012', '2024']) {
    const rows = await select('cofog_spend', 'cofog,amount_mn', { year: Number(y) });
    const children = rows.filter((r) => r.cofog.startsWith('GF03') && r.cofog.length === 6);
    const dbChildSum = sum(children, 'amount_mn');
    const division = rows.find((r) => r.cofog === 'GF03');
    const bundleChildren = Object.keys(B.spendSub[y]).filter((c) => c.startsWith('GF03') && c.length === 6);
    const bundleChildSum = bundleChildren.reduce((s, c) => s + B.spendSub[y][c], 0);
    const bundleDivision = B.spendSub[y].GF03;
    check(
      `cofog_spend GF03 children Σ = GF03 division (${y})`,
      allClose([
        [dbChildSum, bundleChildSum],
        [division.amount_mn, bundleDivision],
        [dbChildSum, division.amount_mn],
      ]),
      `DB Σchildren ${fmt(dbChildSum)} = DB GF03 ${fmt(division.amount_mn)}; bundle Σ${fmt(bundleChildSum)} = bundle GF03 ${fmt(bundleDivision)}`
    );
  }

  // ---- J. regional_revenue_parts sum to nat_revenue_map_agg.mapped_mn --------
  console.log('\n=== J. REGIONAL: revenue-part sums tie to nat_revenue_map_agg (bundle-exact) ===');
  for (const [y, part] of [
    ['2018', 'sales'],
    ['2024', 'sales'],
  ]) {
    const rows = await select('regional_revenue_parts', 'amount_mn', { year: Number(y), part });
    const dbSum = sum(rows.filter((r) => r.amount_mn != null), 'amount_mn');
    const agg = await selectOne('nat_revenue_map_agg', 'mapped_mn', { year: Number(y), part });
    const bundleSum = B.regions.reduce((s, r) => s + (r.parts[y]?.[part] ?? 0), 0);
    const bundleMapped = B.mapAgg[y][part].mapped;
    check(
      `regional_revenue_parts Σ = nat_revenue_map_agg.mapped_mn (${y} ${part})`,
      allClose([
        [dbSum, bundleSum],
        [agg.mapped_mn, bundleMapped],
        [dbSum, agg.mapped_mn],
      ]),
      `DB Σregions ${fmt(dbSum)} = DB mapped ${fmt(agg.mapped_mn)}; bundle Σ${fmt(bundleSum)} = bundle mapped ${fmt(bundleMapped)}`
    );
  }

  // ---- K. regional_revenue_parts (all parts) sum to nat_revenue_map_agg_total
  console.log('\n=== K. REGIONAL: all-parts sum ties to nat_revenue_map_agg_total (bundle-exact, 2024) ===');
  {
    const y = '2024';
    const rows = await select('regional_revenue_parts', 'amount_mn', { year: Number(y) });
    const dbSum = sum(rows.filter((r) => r.amount_mn != null), 'amount_mn');
    const total = await selectOne('nat_revenue_map_agg_total', 'mapped_mn', { year: Number(y) });
    let bundleSum = 0;
    for (const r of B.regions) for (const part of B.PARTS) bundleSum += r.parts[y]?.[part] ?? 0;
    const bundleMapped = B.mapAgg[y].total.mapped;
    check(
      `regional_revenue_parts Σ(all parts) = nat_revenue_map_agg_total.mapped_mn (${y})`,
      allClose([
        [dbSum, bundleSum],
        [total.mapped_mn, bundleMapped],
        [dbSum, total.mapped_mn],
      ]),
      `DB Σ${fmt(dbSum)} = DB mapped total ${fmt(total.mapped_mn)}; bundle Σ${fmt(bundleSum)} = bundle mapped total ${fmt(bundleMapped)}`
    );
  }

  // ---- L. regional_revenue_tier sums to nat_revenue_tier (complete year) -----
  console.log('\n=== L. REGIONAL: per-tier sums tie to nat_revenue_tier, a complete year (2022) ===');
  {
    const y = '2022';
    const rows = await select('regional_revenue_tier', 'regional_mn,local_tax_mn,ibi_mn,local_fee_mn,eu_mn', { year: Number(y) });
    const dbTiers = {
      rg: sum(rows.filter((r) => r.regional_mn != null), 'regional_mn'),
      lt: sum(rows.filter((r) => r.local_tax_mn != null), 'local_tax_mn'),
      ibi: sum(rows.filter((r) => r.ibi_mn != null), 'ibi_mn'),
      lf: sum(rows.filter((r) => r.local_fee_mn != null), 'local_fee_mn'),
      eu: sum(rows.filter((r) => r.eu_mn != null), 'eu_mn'),
    };
    const nat = await selectOne('nat_revenue_tier', 'regional_mn,local_tax_mn,ibi_mn,local_fee_mn,eu_mn', { year: Number(y) });
    const bTiers = { rg: 0, lt: 0, ibi: 0, lf: 0, eu: 0 };
    for (const r of B.regions) {
      const o = r.rev2[y];
      if (!o) continue;
      for (const k of Object.keys(bTiers)) if (o[k] != null) bTiers[k] += o[k];
    }
    const bNat = B.national2[y];
    check(
      `regional_revenue_tier Σ(rg,lt,ibi,lf,eu) = nat_revenue_tier (${y})`,
      allClose([
        [dbTiers.rg, nat.regional_mn],
        [dbTiers.lt, nat.local_tax_mn],
        [dbTiers.ibi, nat.ibi_mn],
        [dbTiers.lf, nat.local_fee_mn],
        [dbTiers.eu, nat.eu_mn],
        [bTiers.rg, bNat.rg],
        [bTiers.lt, bNat.lt],
        [bTiers.ibi, bNat.ibi],
        [bTiers.lf, bNat.lf],
        [bTiers.eu, bNat.eu],
      ]),
      `DB Σrg ${fmt(dbTiers.rg)}/lt ${fmt(dbTiers.lt)}/ibi ${fmt(dbTiers.ibi)}/lf ${fmt(dbTiers.lf)}/eu ${fmt(dbTiers.eu)}`
    );
  }
  {
    const y = '2022';
    const rows = await select('regional_revenue_tier', 'state_total_mn', { year: Number(y) });
    const dbStateSum = sum(rows.filter((r) => r.state_total_mn != null), 'state_total_mn');
    const nat = await selectOne('nat_revenue_tier', 'state_mn', { year: Number(y) });
    let bStateSum = 0;
    for (const r of B.regions) {
      const st = r.rev2[y]?.st;
      if (Array.isArray(st) && st[0] != null) bStateSum += st[0];
    }
    check(
      `regional_revenue_tier.state_total_mn Σ = nat_revenue_tier.state_mn (${y})`,
      allClose([
        [dbStateSum, nat.state_mn],
        [bStateSum, B.national2[y].st],
        [dbStateSum, bStateSum],
      ]),
      `DB Σstate ${fmt(dbStateSum)} vs DB national state_mn ${fmt(nat.state_mn)}; bundle Σ${fmt(bStateSum)} vs bundle st ${fmt(B.national2[y].st)}`
    );
  }

  // ---- N. region_macro carries the year's own denominators -------------------
  console.log('\n=== N. REGION_MACRO: per-year population and GDP, bundle-exact ===');
  {
    const years = [...new Set([...B.revYears, ...B.spendYears])].sort();
    for (const y of [years[0], years[years.length - 1]]) {
      const rows = await select('region_macro', 'region_id,pop,gdp_mn', { year: Number(y) });
      const dbPop = sum(rows.filter((r) => r.pop != null), 'pop');
      const dbGdp = sum(rows.filter((r) => r.gdp_mn != null), 'gdp_mn');
      const bPop = B.regions.reduce((a, r) => a + (r.macro.pop[y] ?? 0), 0);
      const bGdp = B.regions.reduce((a, r) => a + (r.macro.gdp[y] ?? 0), 0);
      check(
        `region_macro Σpop and Σgdp_mn = bundle regions[].macro (${y})`,
        rows.length === B.regions.length && allClose([[dbPop, bPop], [dbGdp, bGdp]]),
        `${rows.length} regions; DB Σpop ${fmt(dbPop)} vs bundle ${fmt(bPop)}; DB Σgdp ${fmt(dbGdp)} vs bundle ${fmt(bGdp)}`
      );
    }
    // The single-vintage scalars are gone from region: selecting them must fail.
    const probe = await db.from('region').select('gdp_mn,pop').limit(1);
    check(
      'region no longer carries a single-vintage gdp_mn/pop',
      probe.error != null,
      probe.error ? `column lookup rejected (${probe.error.code ?? probe.error.message.slice(0, 40)})` : 'columns still present — 0007 not applied'
    );
  }

  // ---- M. anon writes must be rejected ---------------------------------------
  console.log('\n=== M. SECURITY: anon can read, cannot write (RLS + revoked grants) ===');
  {
    const ins = await db.from('coverage_note').insert({ key: '__verify_db_probe__', kind: 'note', value: 'x' });
    check(
      'anon INSERT rejected',
      ins.error != null && ins.error.code === '42501',
      ins.error ? `error class ${ins.error.code} (insufficient_privilege)` : 'INSERT SUCCEEDED — this must never happen'
    );
    const upd = await db.from('coverage_note').update({ value: 'x' }).eq('key', 'euNote');
    check(
      'anon UPDATE rejected',
      upd.error != null && upd.error.code === '42501',
      upd.error ? `error class ${upd.error.code} (insufficient_privilege)` : 'UPDATE SUCCEEDED — this must never happen'
    );
    const del = await db.from('coverage_note').delete().eq('key', 'euNote');
    check(
      'anon DELETE rejected',
      del.error != null && del.error.code === '42501',
      del.error ? `error class ${del.error.code} (insufficient_privilege)` : 'DELETE SUCCEEDED — this must never happen'
    );
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`\nVERIFY-DB FAILED: ${err.stack ?? err.message}`);
  process.exit(1);
});

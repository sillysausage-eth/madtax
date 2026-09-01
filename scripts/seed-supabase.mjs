#!/usr/bin/env node
//
// seed-supabase.mjs — load data/derived/es-fiscal-bundle.json and
// data/registry/sources.yml into the Supabase mirror.
//
//   node --env-file=.env.local scripts/seed-supabase.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Neither is ever
// printed. The service role bypasses RLS; no other role can write these tables.
//
// The run wipes and reloads every section table in one pass, so it is idempotent
// and the database can never drift into a half-old, half-new state: deletes run
// in reverse dependency order, inserts in dependency order, and each table's
// inserted row count is asserted against the count computed from the bundle
// before the write. Any mismatch, any Postgres error, any failed assertion exits
// non-zero without writing anything further.
//
// Nothing here rounds, interpolates or reconciles. Values go in exactly as the
// bundle carries them; where the bundle has null, null is written, because a
// declared gap is a fact this project publishes rather than fills.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_PATH = path.join(ROOT, 'data/derived/es-fiscal-bundle.json');
const REGISTRY_PATH = path.join(ROOT, 'data/registry/sources.yml');
const BATCH = 500;

// ---------------------------------------------------------------------------
// A YAML subset parser.
//
// sources.yml is the only YAML this project reads, and adding a dependency for
// it is not an option (package.json is shared with a concurrent workstream). So
// this covers exactly the constructs that file uses: block maps, block
// sequences, inline maps in sequences, flow maps and sequences, folded (>) and
// literal (|) scalars, and comments. It refuses anything it does not recognise
// instead of guessing. When js-yaml happens to be resolvable (it ships as a
// transitive dependency of eslint) the result is cross-checked against it, so a
// silent divergence cannot survive a local or CI run.
// ---------------------------------------------------------------------------

function stripComment(text) {
  let quote = null;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  return text;
}

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => stripComment(line).trim() === '';

function splitFlow(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  const tail = body.slice(start);
  if (tail.trim() !== '' || parts.length > 0) parts.push(tail);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  if (s.startsWith('{')) {
    if (!s.endsWith('}')) throw new Error(`unterminated flow mapping: ${s}`);
    const out = {};
    for (const part of splitFlow(s.slice(1, -1))) {
      const at = part.indexOf(':');
      if (at < 0) throw new Error(`flow mapping entry without a key: ${part}`);
      out[part.slice(0, at).trim()] = parseScalar(part.slice(at + 1));
    }
    return out;
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new Error(`unterminated flow sequence: ${s}`);
    return splitFlow(s.slice(1, -1)).map(parseScalar);
  }
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

function readBlockScalar(lines, i, style, parentIndent) {
  // Returns [text, nextIndex]. Chomping is always "clip": one trailing newline.
  const body = [];
  let contentIndent = null;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push('');
      i++;
      continue;
    }
    const ind = indentOf(line);
    if (ind <= parentIndent) break;
    if (contentIndent === null) contentIndent = ind;
    if (ind < contentIndent) break;
    body.push(line.slice(contentIndent));
    i++;
  }
  while (body.length && body[body.length - 1] === '') body.pop();
  if (style === '|') return [body.join('\n') + '\n', i];
  const folded = [];
  let run = [];
  for (const line of body) {
    if (line === '') {
      folded.push(run.join(' '));
      run = [];
      folded.push('');
    } else run.push(line.trim());
  }
  folded.push(run.join(' '));
  return [folded.join('\n').replace(/\n\n/g, '\n') + '\n', i];
}

function parseNode(lines, i, indent) {
  while (i < lines.length && isBlank(lines[i])) i++;
  if (i >= lines.length) return [null, i];
  const body = stripComment(lines[i]).trim();
  return body.startsWith('- ') || body === '-'
    ? parseSequence(lines, i, indent)
    : parseMapping(lines, i, indent);
}

function parseMapping(lines, i, indent) {
  const out = {};
  while (i < lines.length) {
    if (isBlank(lines[i])) {
      i++;
      continue;
    }
    const ind = indentOf(lines[i]);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`unexpected indent at line ${i + 1}: ${lines[i]}`);
    const body = stripComment(lines[i]).trim();
    const at = body.search(/:(\s|$)/);
    if (at < 0) throw new Error(`expected "key: value" at line ${i + 1}: ${lines[i]}`);
    const key = body.slice(0, at).trim();
    const rest = body.slice(at + 1).trim();
    i++;
    if (rest === '>' || rest === '|') {
      [out[key], i] = readBlockScalar(lines, i, rest, ind);
    } else if (rest === '') {
      let j = i;
      while (j < lines.length && isBlank(lines[j])) j++;
      if (j < lines.length && indentOf(lines[j]) > ind) [out[key], i] = parseNode(lines, j, indentOf(lines[j]));
      else out[key] = null;
    } else {
      out[key] = parseScalar(rest);
    }
  }
  return [out, i];
}

function parseSequence(lines, i, indent) {
  const out = [];
  while (i < lines.length) {
    if (isBlank(lines[i])) {
      i++;
      continue;
    }
    const ind = indentOf(lines[i]);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`unexpected indent at line ${i + 1}: ${lines[i]}`);
    const body = stripComment(lines[i]).trim();
    if (!body.startsWith('- ') && body !== '-') break;
    const rest = body.slice(1).trim();
    if (rest === '') {
      let j = i + 1;
      while (j < lines.length && isBlank(lines[j])) j++;
      if (j >= lines.length || indentOf(lines[j]) <= ind) throw new Error(`empty sequence item at line ${i + 1}`);
      const [value, next] = parseNode(lines, j, indentOf(lines[j]));
      out.push(value);
      i = next;
    } else if (rest === '>' || rest === '|') {
      const [value, next] = readBlockScalar(lines, i + 1, rest, ind);
      out.push(value);
      i = next;
    } else if (/^[A-Za-z_][A-Za-z0-9_]*:(\s|$)/.test(rest)) {
      // "- key: value" — an inline mapping. Rewrite the dash as whitespace and
      // parse the item as an ordinary mapping starting on this same line.
      const childIndent = lines[i].indexOf('-') + 2;
      const patched = lines.slice();
      patched[i] = ' '.repeat(childIndent) + rest;
      const [value, next] = parseMapping(patched, i, childIndent);
      out.push(value);
      i = next;
    } else {
      out.push(parseScalar(rest));
      i++;
    }
  }
  return [out, i];
}

export function parseYaml(text) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && isBlank(lines[i])) i++;
  const [value] = parseNode(lines, i, indentOf(lines[i] ?? ''));
  return value ?? {};
}

async function crossCheckYaml(text, parsed) {
  let jsYaml;
  try {
    jsYaml = (await import('js-yaml')).default;
  } catch {
    return 'skipped (js-yaml not resolvable)';
  }
  const normalise = (v) =>
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : Array.isArray(v)
        ? v.map(normalise)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, normalise(v[k])]))
          : typeof v === 'string'
            ? v.trimEnd()
            : v;
  const mine = JSON.stringify(normalise(parsed));
  const theirs = JSON.stringify(normalise(jsYaml.load(text)));
  if (mine !== theirs) {
    for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
      if (mine[i] !== theirs[i]) {
        throw new Error(
          `YAML parser disagrees with js-yaml at offset ${i}:\n  mine:   …${mine.slice(Math.max(0, i - 60), i + 60)}…\n  js-yaml:…${theirs.slice(Math.max(0, i - 60), i + 60)}…`
        );
      }
    }
  }
  return 'matches js-yaml';
}

// ---------------------------------------------------------------------------
// Row building
// ---------------------------------------------------------------------------

const fail = (msg) => {
  throw new Error(msg);
};
const text = (v) => (v == null ? null : String(v).trimEnd());
const yearNum = (y) => {
  const n = Number(y);
  if (!Number.isInteger(n) || n < 1900 || n > 2200) fail(`not a year: ${y}`);
  return n;
};

function resolveSource(sources, needle) {
  const hits = sources.filter(
    (s) => (s.endpoint ?? '').includes(needle) || (s.index_url ?? '').includes(needle) || (s.pdf_pattern ?? '').includes(needle)
  );
  if (hits.length !== 1) {
    fail(`source resolution for "${needle}" matched ${hits.length} registry entries; refusing to guess`);
  }
  return hits[0].id;
}

export function build(B, registry) {
  const spec = [];
  const add = (table, pk, rows) => spec.push({ table, pk, rows });

  // ---- registry ----------------------------------------------------------
  if (!Array.isArray(registry.sources)) fail('sources.yml has no `sources:` list');
  if (!Array.isArray(registry.gaps)) fail('sources.yml has no `gaps:` list');

  const sources = registry.sources.map((s) => {
    for (const req of ['id', 'name', 'publisher', 'grade']) {
      if (!s[req]) fail(`registry entry ${s.id ?? '(no id)'} is missing ${req}`);
    }
    if (!['A', 'B', 'C'].includes(s.grade)) fail(`registry entry ${s.id} has grade ${s.grade}`);
    const coverage = s.coverage ?? null;
    return {
      id: s.id,
      name: text(s.name),
      publisher: text(s.publisher),
      grade: s.grade,
      verified: s.verified ?? null,
      phase: s.phase ?? null,
      perspective: text(s.perspective),
      basis: text(s.basis),
      cadence: text(s.cadence),
      licence: text(s.licence),
      endpoint: text(s.endpoint),
      index_url: text(s.index),
      coverage_from: coverage && typeof coverage.from === 'number' ? coverage.from : null,
      coverage_to: coverage && typeof coverage.to === 'number' ? coverage.to : null,
      coverage_raw: coverage,
      caveats: Array.isArray(s.caveats) ? s.caveats.map(text) : null,
      notes: text(s.notes),
      // not persisted, used only for provenance resolution below
      pdf_pattern: text(s.pdf_pattern),
    };
  });
  const sourcesForResolution = sources.map((s) => ({ ...s }));
  add('source', 'id', sources.map(({ pdf_pattern, ...row }) => row)); // eslint-disable-line no-unused-vars

  add(
    'source_gap',
    'id',
    registry.gaps.map((g) => ({
      id: g.id,
      what: text(g.what),
      why_it_matters: text(g.why_it_matters),
      status: text(g.status),
      blocks_phase: g.blocks_phase ?? null,
    }))
  );

  // ---- dimensions --------------------------------------------------------
  add('revenue_part', 'code', B.PARTS.map((code, i) => ({ code, ordinal: i })));
  add('state_tax', 'code', B.revTaxes.map((code, i) => ({ code, ordinal: i })));
  add(
    'econ_item',
    'code',
    B.econKeys.map((code, i) => ({
      code,
      ordinal: i,
      label_es: B.econES[code] ?? fail(`econ label missing: ${code}`),
      label_en: B.econEN[code] ?? fail(`econ label missing: ${code}`),
    }))
  );

  const cofogUsed = new Set(['TOTAL']);
  for (const d of B.divisions) cofogUsed.add(`GF${d}`);
  for (const year of Object.keys(B.spendSub)) for (const c of Object.keys(B.spendSub[year])) cofogUsed.add(c);
  for (const c of Object.keys(B.spendSubES)) cofogUsed.add(c);
  for (const c of Object.keys(B.spendSubEN)) cofogUsed.add(c);
  const cofogRows = [...cofogUsed]
    .sort()
    .map((code) => {
      const level = code === 'TOTAL' ? 0 : code.length === 4 ? 1 : code.length === 6 ? 2 : fail(`unrecognised COFOG code: ${code}`);
      return {
        code,
        level,
        parent_code: level === 0 ? null : level === 1 ? 'TOTAL' : `GF${code.slice(2, 4)}`,
        label_es: B.spendSubES[code] ?? null,
        label_en: B.spendSubEN[code] ?? null,
        division_label_es: level === 1 ? (B.divES[code.slice(2)] ?? null) : null,
        division_label_en: level === 1 ? (B.divEN[code.slice(2)] ?? null) : null,
        note_es: B.spendNoteES[code] ?? null,
        note_en: B.spendNoteEN[code] ?? null,
      };
    })
    .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code)); // parents before children (self FK)
  add('cofog_item', 'code', cofogRows);

  add(
    'region',
    'id',
    B.regions.map((r) => ({
      id: r.id,
      nuts: r.nuts,
      name_es: r.es,
      name_en: r.en,
      foral: r.foral,
      inset: r.inset,
      gdp_mn: r.gdp,
      pop: r.pop,
      centroid_x: r.cx,
      centroid_y: r.cy,
      bbox_x0: r.bbox[0],
      bbox_y0: r.bbox[1],
      bbox_x1: r.bbox[2],
      bbox_y1: r.bbox[3],
    }))
  );

  const subCodes = new Set([...Object.keys(B.subSrc), ...Object.keys(B.subLab.es), ...Object.keys(B.subLab.en)]);
  add(
    'nat_revenue_sub_item',
    'code',
    [...subCodes].sort().map((code) => ({
      code,
      label_es: B.subLab.es[code] ?? null,
      label_en: B.subLab.en[code] ?? null,
      source_item: B.subSrc[code] ?? null,
    }))
  );

  add(
    'who_excise_product',
    'code',
    Object.keys(B.who.excise.labES).sort().map((code) => ({
      code,
      label_es: B.who.excise.labES[code],
      label_en: B.who.excise.labEN[code] ?? fail(`excise label_en missing: ${code}`),
    }))
  );
  add(
    'who_vat_rate',
    'code',
    Object.keys(B.who.vat.labES).sort().map((code) => ({
      code,
      label_es: B.who.vat.labES[code],
      label_en: B.who.vat.labEN[code] ?? fail(`vat label_en missing: ${code}`),
    }))
  );
  add(
    'debt_holder_sector',
    'code',
    Object.keys(B.debt.holders.labES).sort().map((code) => ({
      code,
      label_es: B.debt.holders.labES[code],
      label_en: B.debt.holders.labEN[code] ?? fail(`holder label_en missing: ${code}`),
    }))
  );

  // ---- national headlines -------------------------------------------------
  add(
    'gg_headline',
    'year',
    Object.keys(B.gg).map((y) => ({ year: yearNum(y), revenue_mn: B.gg[y].rev, expenditure_mn: B.gg[y].exp }))
  );

  add(
    'nat_revenue_headline',
    'year',
    Object.keys(B.natRev).map((y) => {
      const o = B.natRev[y];
      return {
        year: yearNum(y),
        total_mn: o.total,
        expenditure_mn: o.expenditure,
        deficit_mn: o.deficit,
        taxes_mn: o.taxes,
        social_mn: o.social,
        sales_mn: o.sales,
        property_mn: o.property,
        transfers_mn: o.transfers,
        eu_in_mn: o.euIn,
        mapped_mn: o.mapped,
        unmapped_mn: o.unmapped,
      };
    })
  );

  add(
    'nat_revenue_year',
    'year',
    Object.keys(B.natParts).map((y) => {
      const o = B.natParts[y];
      return {
        year: yearNum(y),
        has_detail: o.detail,
        total_mn: o.total,
        published_mn: o.published,
        residual_mn: o.residual,
        expenditure_mn: o.expenditure,
        deficit_mn: o.deficit,
      };
    })
  );

  const partRows = [];
  for (const y of Object.keys(B.natParts)) {
    for (const part of B.PARTS) {
      const v = B.natParts[y][part];
      if (v == null) fail(`natParts ${y}.${part} is absent — the bundle promises all 17 parts every year`);
      partRows.push({ year: yearNum(y), part, amount_mn: v });
    }
  }
  add('nat_revenue_parts', 'year', partRows);

  const subRows = [];
  for (const y of Object.keys(B.natSub)) {
    for (const part of Object.keys(B.natSub[y])) {
      for (const [code, amount] of B.natSub[y][part]) {
        if (!subCodes.has(code)) fail(`natSub code ${code} has no dictionary entry`);
        subRows.push({ year: yearNum(y), part, code, amount_mn: amount });
      }
    }
  }
  add('nat_revenue_sub', 'year', subRows);

  const mapRows = [];
  const mapTotals = [];
  for (const y of Object.keys(B.mapAgg)) {
    for (const part of B.PARTS) {
      const m = B.mapAgg[y][part] ?? fail(`mapAgg ${y}.${part} missing`);
      mapRows.push({ year: yearNum(y), part, mapped_mn: m.mapped, offmap_mn: m.offmap, nat_mn: m.nat });
    }
    const t = B.mapAgg[y].total ?? fail(`mapAgg ${y}.total missing`);
    mapTotals.push({ year: yearNum(y), mapped_mn: t.mapped, offmap_mn: t.offmap, nat_mn: t.nat });
  }
  add('nat_revenue_map_agg', 'year', mapRows);
  add('nat_revenue_map_agg_total', 'year', mapTotals);

  const stateTaxRows = [];
  for (const y of Object.keys(B.revNational)) {
    const vec = B.revNational[y];
    if (vec.length !== B.revTaxes.length) fail(`revNational ${y} has ${vec.length} columns, expected ${B.revTaxes.length}`);
    B.revTaxes.forEach((tax, i) => stateTaxRows.push({ year: yearNum(y), tax, amount_mn: vec[i] }));
  }
  add('nat_revenue_state_tax', 'year', stateTaxRows);

  add(
    'nat_revenue_tier',
    'year',
    Object.keys(B.national2).map((y) => {
      const o = B.national2[y];
      return {
        year: yearNum(y),
        state_mn: o.st,
        regional_mn: o.rg,
        local_tax_mn: o.lt,
        ibi_mn: o.ibi,
        local_fee_mn: o.lf,
        eu_mn: o.eu,
        eu_unassigned_mn: o.euUnassigned,
        total_mn: o.total,
        complete: o.complete,
      };
    })
  );

  // ---- by region ----------------------------------------------------------
  const regRev = [];
  const regTier = [];
  const regParts = [];
  const regSpend = [];
  const regEcon = [];
  for (const r of B.regions) {
    for (const y of Object.keys(r.rev)) {
      const vec = r.rev[y];
      if (vec == null) continue;
      B.revTaxes.forEach((tax, i) => regRev.push({ region_id: r.id, year: yearNum(y), tax, amount_mn: vec[i] }));
    }
    for (const y of Object.keys(r.rev2)) {
      const o = r.rev2[y];
      if (o == null) continue;
      regTier.push({
        region_id: r.id,
        year: yearNum(y),
        state_total_mn: Array.isArray(o.st) ? o.st[0] : null,
        regional_mn: o.rg,
        local_tax_mn: o.lt,
        ibi_mn: o.ibi,
        local_fee_mn: o.lf,
        eu_mn: o.eu,
        total_mn: o.total,
        partial: o.partial,
        missing: o.missing ?? [],
        parts_total_mn: r.parts[y]?.total ?? null,
      });
    }
    for (const y of Object.keys(r.parts)) {
      const o = r.parts[y];
      if (o == null) continue;
      for (const part of B.PARTS) regParts.push({ region_id: r.id, year: yearNum(y), part, amount_mn: o[part] ?? null });
    }
    for (const y of Object.keys(r.spend)) {
      const vec = r.spend[y];
      if (vec == null) continue;
      vec.forEach((amount, i) =>
        regSpend.push({ region_id: r.id, year: yearNum(y), cofog: i === 0 ? 'TOTAL' : `GF${B.divisions[i - 1]}`, amount_mn: amount })
      );
    }
    for (const y of Object.keys(r.econ)) {
      const vec = r.econ[y];
      if (vec == null) continue;
      B.econKeys.forEach((econ, i) => regEcon.push({ region_id: r.id, year: yearNum(y), econ, amount_mn: vec[i] }));
    }
  }
  add('regional_revenue', 'region_id', regRev);
  add('regional_revenue_tier', 'region_id', regTier);
  add('regional_revenue_parts', 'region_id', regParts);
  add('regional_spend', 'region_id', regSpend);
  add('regional_econ', 'region_id', regEcon);

  // ---- expenditure --------------------------------------------------------
  const natSpend = [];
  for (const y of Object.keys(B.spendNational)) {
    B.spendNational[y].forEach((amount, i) =>
      natSpend.push({ year: yearNum(y), cofog: i === 0 ? 'TOTAL' : `GF${B.divisions[i - 1]}`, amount_mn: amount })
    );
  }
  add('national_spend', 'year', natSpend);

  // spendBySector carries no year stamp. Find the year its S13 vector matches
  // exactly, and refuse to load anything if that is not exactly one year.
  const sectorYears = Object.keys(B.spendNational).filter(
    (y) => JSON.stringify(B.spendNational[y]) === JSON.stringify(B.spendBySector.S13)
  );
  if (sectorYears.length !== 1) {
    fail(`spendBySector.S13 matches ${sectorYears.length} years of spendNational; the year stamp cannot be established`);
  }
  const sectorYear = yearNum(sectorYears[0]);
  const sectorRows = [];
  for (const sector of Object.keys(B.spendBySector)) {
    B.spendBySector[sector].forEach((amount, i) =>
      sectorRows.push({ sector, year: sectorYear, cofog: i === 0 ? 'TOTAL' : `GF${B.divisions[i - 1]}`, amount_mn: amount })
    );
  }
  add('sector_spend', 'sector', sectorRows);

  const cofogRowsFact = [];
  for (const y of Object.keys(B.spendSub)) {
    for (const [cofog, amount] of Object.entries(B.spendSub[y])) {
      cofogRowsFact.push({ year: yearNum(y), cofog, amount_mn: amount });
    }
  }
  add('cofog_spend', 'year', cofogRowsFact);

  const aggRows = [];
  for (const y of Object.keys(B.spendAgg)) {
    for (const [cofog, o] of Object.entries(B.spendAgg[y])) {
      aggRows.push({
        year: yearNum(y),
        cofog,
        nat_mn: o.nat,
        mapped_mn: o.mapped,
        central_mn: o.central,
        local_mn: o.local,
        socsec_mn: o.socsec,
        adj_mn: o.adj,
      });
    }
  }
  add('cofog_spend_agg', 'year', aggRows);

  // ---- who pays -----------------------------------------------------------
  const decileRows = [];
  for (const y of Object.keys(B.who.irpf.deciles)) {
    for (const [band, o] of Object.entries(B.who.irpf.deciles[y])) {
      decileRows.push({
        year: yearNum(y),
        band,
        limit_eur: o.limit,
        taxpayers: o.n,
        income_eur: o.income,
        tax_eur: o.tax,
        rate_pct: o.rate,
        src_work_eur: o.src.work,
        src_cap_mob_eur: o.src.capMob,
        src_cap_inm_eur: o.src.capInm,
        src_biz_eur: o.src.biz,
        src_gains_eur: o.src.gains,
        src_imputed_eur: o.src.imputed,
      });
    }
  }
  add('who_irpf_decile', 'year', decileRows);

  const bracketRows = [];
  const bracketTotals = [];
  for (const y of Object.keys(B.who.irpf.brackets)) {
    const o = B.who.irpf.brackets[y];
    for (const r of o.rows) {
      bracketRows.push({
        year: yearNum(y),
        bracket: r.k,
        lo_eur: r.lo,
        hi_eur: r.hi,
        returns: r.n,
        returns_pct: r.nPct,
        payers: r.payers,
        tax_eur: r.tax,
        tax_pct: r.taxPct,
        avg_eur: r.avg,
      });
    }
    bracketTotals.push({ year: yearNum(y), returns: o.total.n, tax_eur: o.total.tax, avg_eur: o.total.avg });
  }
  add('who_irpf_bracket', 'year', bracketRows);
  add('who_irpf_bracket_total', 'year', bracketTotals);

  const corpRows = [];
  for (const y of Object.keys(B.who.corp.years)) {
    for (const segment of ['total', 'groups', 'standalone']) {
      const o = B.who.corp.years[y][segment] ?? fail(`corp ${y}.${segment} missing`);
      corpRows.push({
        year: yearNum(y),
        segment,
        profit_mn: o.profit,
        base_mn: o.base,
        tax_mn: o.tax,
        rate_base_pct: o.rateBase,
        rate_profit_pct: o.rateProfit,
        exempt_mn: o.exempt,
        losses_mn: o.losses,
      });
    }
  }
  add('who_corp', 'year', corpRows);

  const socialRows = [];
  for (const y of Object.keys(B.who.social.years)) {
    for (const [code, amount] of Object.entries(B.who.social.years[y])) {
      socialRows.push({ year: yearNum(y), code, amount_mn: amount });
    }
  }
  add('who_social', 'year', socialRows);

  const exciseRows = [];
  const exciseTotals = [];
  for (const y of Object.keys(B.who.excise.years)) {
    const o = B.who.excise.years[y];
    for (const [product, amount] of o.rows) exciseRows.push({ year: yearNum(y), product, amount_mn: amount });
    exciseTotals.push({ year: yearNum(y), total_mn: o.total, provisional: o.prov === true });
  }
  add('who_excise', 'year', exciseRows);
  add('who_excise_total', 'year', exciseTotals);

  const vatRows = [];
  const vatTotals = [];
  for (const y of Object.keys(B.who.vat.years)) {
    const o = B.who.vat.years[y];
    for (const [rate, amount] of o.rows) vatRows.push({ year: yearNum(y), rate, amount_mn: amount });
    vatTotals.push({
      year: yearNum(y),
      total_mn: o.total,
      provisional: o.prov === true,
      accrued_mn: o.accrued,
      special_mn: o.special,
      foral_mn: o.foral,
      adj_other_mn: o.adjOther,
    });
  }
  add('who_vat', 'year', vatRows);
  add('who_vat_total', 'year', vatTotals);

  const scaleRows = [];
  for (const scale of ['general', 'savings']) {
    B.irpfScale[scale].forEach((b, i) =>
      scaleRows.push({
        scale,
        year: yearNum(B.irpfScale.year),
        ordinal: i,
        from_eur: b.from,
        to_eur: b.to,
        rate_pct: b.rate,
      })
    );
  }
  add('irpf_scale_band', 'scale', scaleRows);

  add(
    'madrid_scale_band',
    'year',
    B.madridScale.bands.map((b, i) => ({
      year: yearNum(B.madridScale.year),
      region_name: B.madridScale.region,
      ordinal: i,
      from_eur: b.from,
      to_eur: b.to,
      state_rate_pct: b.state,
      region_rate_pct: b.region,
      rate_pct: b.rate,
    }))
  );

  // ---- debt ---------------------------------------------------------------
  const D = B.debt;
  add(
    'debt_stock',
    'year',
    D.years.map((y) => ({
      year: yearNum(y),
      total_mn: D.total[y] ?? fail(`debt.total missing ${y}`),
      pc_gdp: D.pcGdp[y] ?? fail(`debt.pcGdp missing ${y}`),
      interest_pc_gdp: D.intPcGdp[y] ?? fail(`debt.intPcGdp missing ${y}`),
    }))
  );

  const instrRows = [];
  for (const y of D.years) for (const [instrument, amount] of D.instr[y]) instrRows.push({ year: yearNum(y), instrument, amount_mn: amount });
  add('debt_instrument', 'year', instrRows);

  const tierRows = [];
  const tierTotals = [];
  const intRows = [];
  const intTotals = [];
  for (const y of D.years) {
    const t = D.tier[y];
    for (const tier of ['S1311', 'S1312', 'S1313', 'S1314']) tierRows.push({ year: yearNum(y), tier, amount_mn: t[tier] });
    tierTotals.push({ year: yearNum(y), gross_mn: t.gross, consolidated_mn: t.consolidated, elimination_mn: t.elim });
    const i = D.interest[y];
    for (const tier of ['S1311', 'S1312', 'S1313', 'S1314']) intRows.push({ year: yearNum(y), tier, amount_mn: i[tier] });
    intTotals.push({ year: yearNum(y), total_mn: i.total, gross_mn: i.gross, elimination_mn: i.elim });
  }
  add('debt_tier', 'year', tierRows);
  add('debt_tier_total', 'year', tierTotals);
  add('debt_interest', 'year', intRows);
  add('debt_interest_total', 'year', intTotals);

  add(
    'debt_maturity',
    'maturity_year',
    D.maturity.rows.map(([y, amount]) => ({
      maturity_year: yearNum(y),
      amount_mn: amount,
      as_of: D.maturity.asOf,
      scope: D.maturity.scope,
      basis: D.maturity.basis ?? null,
    }))
  );
  add('debt_maturity_meta', 'id', [
    {
      id: 1,
      as_of: D.maturity.asOf,
      avg_life_years: D.maturity.avgLife,
      avg_life_as_of: D.maturity.avgLifeAsOf,
      total_laddered_mn: D.maturity.totalLaddered,
      n_securities: D.maturity.nSecurities,
      scope: D.maturity.scope,
    },
  ]);
  add('debt_cost', 'id', [
    {
      id: 1,
      as_of: D.cost.asOf,
      avg_cost_pct: D.cost.avgCost,
      avg_cost_new_pct: D.cost.avgCostNew,
      scope: D.cost.scope,
      basis: D.cost.basis ?? null,
    },
  ]);

  const holderSourceId = resolveSource(sourcesForResolution, 'be1113');
  add(
    'debt_holders',
    'sector',
    D.holders.rows.map(([sector, amount]) => ({
      sector,
      amount_mn: amount,
      as_of: D.holders.asOf,
      scope: D.holders.scope,
      basis: D.holders.basis,
      source_id: holderSourceId,
    }))
  );
  add('debt_holders_meta', 'id', [
    {
      id: 1,
      as_of: D.holders.asOf,
      scope: D.holders.scope,
      basis: D.holders.basis,
      total_mn: D.holders.total,
      note_es: D.holders.noteES,
      note_en: D.holders.noteEN,
      src_table: D.holders.src.table,
      src_unit: D.holders.src.unit,
      src_basis: D.holders.src.basis,
      source_id: holderSourceId,
    },
  ]);
  add('debt_meta', 'id', [
    {
      id: 1,
      ref_year: yearNum(D.ref),
      src_dataset: D.srcEDP.dataset,
      src_unit: D.srcEDP.unit,
      src_basis: D.srcEDP.basis,
    },
  ]);

  const debtDatasets = D.srcEDP.dataset.split('+').map((s) => s.trim()).filter(Boolean);
  if (debtDatasets.length === 0) fail('debt.srcEDP.dataset names no dataset');
  add(
    'debt_meta_source',
    'source_id',
    debtDatasets.map((d) => ({ source_id: resolveSource(sourcesForResolution, d) }))
  );

  // ---- coverage -----------------------------------------------------------
  const coverageRows = Object.keys(B.coverage).map((key) => ({ key, kind: 'coverage', value: B.coverage[key] }));
  coverageRows.push({ key: 'euNote', kind: 'note', value: B.euNote });
  add('coverage_note', 'key', coverageRows);

  return spec;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function waitForSchemaCache(db, table) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    const { error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (!error) return;
    if (error.code !== 'PGRST205' && error.code !== 'PGRST202') {
      throw new Error(`probe on ${table} failed: ${error.code ?? '?'} ${error.message}`);
    }
    process.stdout.write(`  PostgREST schema cache not ready (attempt ${attempt}/12), waiting…\n`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`PostgREST never exposed public.${table}; run NOTIFY pgrst, 'reload schema' and retry`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; run with --env-file=.env.local');
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const bundleText = readFileSync(BUNDLE_PATH, 'utf8');
  const registryText = readFileSync(REGISTRY_PATH, 'utf8');
  const bundle = JSON.parse(bundleText);
  const registry = parseYaml(registryText);
  console.log(`registry: ${registry.sources.length} sources, ${registry.gaps.length} declared gaps — parser ${await crossCheckYaml(registryText, registry)}`);

  const spec = build(bundle, registry);
  const total = spec.reduce((a, s) => a + s.rows.length, 0);
  console.log(`built ${total.toLocaleString('en-GB')} rows across ${spec.length} tables from the bundle\n`);

  await waitForSchemaCache(db, spec[0].table);

  // Wipe in reverse dependency order. PostgREST refuses an unfiltered delete, so
  // each one filters on a NOT NULL key column, which matches every row.
  for (const { table, pk } of [...spec].reverse()) {
    const { error } = await db.from(table).delete().not(pk, 'is', null);
    if (error) throw new Error(`delete from ${table} failed: ${error.code ?? '?'} ${error.message}`);
  }
  console.log(`cleared ${spec.length} tables\n`);

  let loaded = 0;
  for (const { table, rows } of spec) {
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await db.from(table).insert(rows.slice(i, i + BATCH));
      if (error) throw new Error(`insert into ${table} failed at row ${i}: ${error.code ?? '?'} ${error.message}`);
    }
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`count of ${table} failed: ${error.code ?? '?'} ${error.message}`);
    if (count !== rows.length) {
      throw new Error(`${table}: expected ${rows.length} rows from the bundle, database holds ${count}`);
    }
    loaded += count;
    console.log(`  ${table.padEnd(28)} ${String(count).padStart(6)}`);
  }

  console.log(`\nseeded ${loaded.toLocaleString('en-GB')} rows across ${spec.length} tables`);
}

main().catch((err) => {
  console.error(`\nSEED FAILED: ${err.message}`);
  process.exit(1);
});

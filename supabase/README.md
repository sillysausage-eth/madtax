# Supabase — MadTax data mirror

The Supabase project (`aiompjijqoyjnighvgfv`) is a **read-only mirror** of
`data/derived/es-fiscal-bundle.json`, the pipeline's single source of truth.
V1 of the site makes **zero** PostgREST calls — the mirror exists so the data
is queryable independently of the static site, and so search-style features
can read it post-V1 without a pipeline rewrite. See the migration plan,
Architecture decisions §1 and §4, for the full rationale.

This project is **never run locally**. There is no `supabase start`, no
Docker, no linked project. Every command below targets the hosted project
directly over `SUPABASE_DB_URL` (migrations, via the CLI) or the Supabase
client libraries (seed and verify, over PostgREST). There is no
`supabase link`, no CLI access token, and the Supabase MCP server is not
required for any of this — it has a known upstream OAuth bug in this
environment and is not depended on.

## Running each step locally

All three commands read credentials from `.env.local` at run time and never
print them. Copy `.env.example` to `.env.local` and fill in the six vars
first (see `.env.example` for exactly which ones and where they come from).

```bash
# 1. Apply migrations (supabase/migrations/*.sql -> the live project)
set -a; . ./.env.local; set +a
npx supabase db push --db-url "$SUPABASE_DB_URL" --yes

# 2. Seed: truncate-then-reload every section table from the bundle
node --env-file=.env.local scripts/seed-supabase.mjs

# 3. Verify: recompute ≥15 identities from the DB (anon key) and check
#    against the bundle; also proves anon writes are rejected
node --env-file=.env.local scripts/verify-db.mjs
```

`npx supabase migration list --db-url "$SUPABASE_DB_URL"` shows which
migrations are applied remotely without changing anything.

The same three steps run in CI via manual dispatch of
`.github/workflows/db.yml` — see "GitHub secrets" below.

### Adding a migration

Never edit a migration that has already been applied anywhere (local runs
against the hosted project count). Add a new numbered file instead
(`000N_description.sql`, following the existing `0001`…`0006` sequence, not
the CLI's default timestamp naming — this project's migrations are numbered
by hand) and run step 1 again.

## Schema map — table ↔ bundle section

Every table is a straight reshape of one bundle section into rows: no
rounding, no interpolation, no derived measures. `scripts/seed-supabase.mjs`
asserts the row count it inserts against a count it computes independently
from the bundle, for every table, every run.

| Table(s) | Bundle section | Notes |
|---|---|---|
| `source`, `source_gap` | `data/registry/sources.yml` `sources:` / `gaps:` | Not from the bundle — the ingestion registry itself. Two tables because a gap is a declared absence, not a source. |
| `revenue_part` | `PARTS` | Dimension: the 17 revenue buckets. |
| `state_tax` | `revTaxes` | Dimension: AEAT tax-head columns. |
| `econ_item` | `econKeys`/`econES`/`econEN` | Dimension: ESA economic-transaction codes. |
| `cofog_item` | `divES`/`divEN`, `spendSubES`/`spendSubEN`, `spendNoteES`/`spendNoteEN` | COFOG hierarchy, TOTAL/division/group. Two independent English label sets are both kept (0005) — see "Honest provenance" below. |
| `region` | `regions[]` (identity/geometry fields only) | SVG path geometry and the map viewport (`H`/`W`/`CB`) stay in the bundle only — the DB carries centroid/bbox, not paths. |
| `nat_revenue_sub_item` | `subLab`, `subSrc` | Dimension for the national revenue drill-down. |
| `who_excise_product`, `who_vat_rate`, `debt_holder_sector` | `who.excise.labES/EN`, `who.vat.labES/EN`, `debt.holders.labES/EN` | Small label dimensions. |
| `gg_headline` | `gg` | GG revenue/expenditure headline. |
| `nat_revenue_headline`, `nat_revenue_year`, `nat_revenue_parts`, `nat_revenue_sub`, `nat_revenue_map_agg(_total)`, `nat_revenue_state_tax`, `nat_revenue_tier` | `natRev`, `natParts`, `natSub`, `mapAgg`, `revNational`, `national2` | National revenue, several shapes of the same underlying money. |
| `regional_revenue`, `regional_revenue_tier`, `regional_revenue_parts`, `regional_spend`, `regional_econ` | `regions[].rev/.rev2/.parts/.spend/.econ` | Per-region series. Ceuta/Melilla carry no COFOG/econ rows — the bundle has none for them. |
| `national_spend`, `sector_spend`, `cofog_spend`, `cofog_spend_agg` | `spendNational`, `spendBySector`, `spendSub`, `spendAgg` | `sector_spend`'s year is asserted, not stamped — see "Honest provenance". |
| `who_irpf_decile`, `who_irpf_bracket(_total)`, `who_corp`, `who_social`, `who_excise(_total)`, `who_vat(_total)`, `irpf_scale_band`, `madrid_scale_band` | `who.irpf.deciles/.brackets`, `who.corp`, `who.social`, `who.excise`, `who.vat`, `irpfScale`, `madridScale` | Who-pays micro-tables. Deciles and brackets count different populations — never sum across them. |
| `debt_stock`, `debt_instrument`, `debt_tier(_total)`, `debt_interest(_total)`, `debt_maturity(_meta)`, `debt_cost`, `debt_holders(_meta)`, `debt_meta`, `debt_meta_source` | `debt.*` | Debt section. `debt_tier`/`debt_interest` are gross by subsector and sum ABOVE the consolidated headline by design — never rescale them, the elimination is a separate carried column. |
| `coverage_note` | `coverage`, `euNote` | The bundle's own declared coverage gaps and treatment notes — published as facts, not smoothed over. |

## Honest provenance

House rule: a `source_id` foreign key appears **only** where the bundle
genuinely records, at the row level, which registry entry a figure came
from. As implemented, that is exactly three places:

- `debt_holders` / `debt_holders_meta` → bundle `debt.holders.src` names
  Banco de España table 11.13 (`be1113`), which resolves to exactly one
  registry entry.
- `debt_meta_source` → bundle `debt.srcEDP.dataset` names two Eurostat
  datasets (`gov_10dd_edpt1`, `gov_10a_main`), each resolving to exactly one
  registry entry — a table, not a single column, because a single FK would
  have had to drop one of the two.

Everywhere else — `nat_revenue_sub_item.source_item`, for instance, which
carries the bundle's `subSrc` text verbatim — provenance is either a table
`COMMENT` naming the pipeline stage that produced the section, or genuine
row-level text that is deliberately **not** a foreign key, because the
bundle does not record which single registry entry it came from and turning
it into an FK would be a guess dressed up as a fact. `scripts/seed-supabase.mjs`
resolves the three real FKs by matching the bundle's own source name against
the registry's `endpoint`/`index_url`/`pdf_pattern` fields and refuses to
write anything if a name matches zero or more than one entry.

Two more instances of the same discipline worth knowing about, both found
while writing the seed script (not anticipated by the original schema):

- `cofog_item` carries **two independently-sourced English label sets**
  for the ten COFOG divisions (`label_en` = full COFOG wording from
  `spendSubEN`, `division_label_en` = the console's short wording from
  `divEN`) rather than merging them into one column and silently dropping
  the other (migration `0005`).
- `sector_spend.year` has no stamp in the bundle at all (`spendBySector`
  carries a single unstamped vector per subsector). The seed asserts which
  year it belongs to by finding the exact match against `spendNational`'s
  `S13` vector, and refuses to load anything if that match is not unique —
  a tested fact, not an assumed one.

## The star-schema migration path

These are section-shaped tables, not the `fact_flow` + ltree star schema
from the 03-doc design. That schema needs a pipeline rewrite that archives
snapshot files and records a locator (dataset, table, cell) for every
extracted figure; today's bundle rows don't carry that, so loading them into
`fact_flow` now would fabricate provenance the bundle doesn't have.

Post-V1, when the extractors are rewritten to snapshot-then-parse: the star
schema is built alongside these tables, backfilled by re-extraction with
real locators, and once it's trustworthy these section tables are replaced
by **views of identical names and columns** over `fact_flow`. The PostgREST
contract does not change; nothing that reads these tables today has to
change when that happens. Source of truth flips from the bundle to the
database at that point, not before.

The empty `raw-sources` storage bucket (migration `0004`) exists for the
same reason and is deliberately left empty now: filling it with fresh
re-downloads today would attach this week's files to figures that were
actually extracted from a different retrieval — provenance theatre. It
starts being populated when the archive-then-parse rewrite lands.

## GitHub secrets

`.github/workflows/db.yml` is `workflow_dispatch`-only (a manual refresh
run from the Actions tab, never on every push — see the workflow file for
why). It needs these repository secrets, matching `.env.example`:

| Secret | Used by |
|---|---|
| `SUPABASE_DB_URL` | `npx supabase db push` (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | seed and verify (PostgREST base URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | seed only — bypasses RLS to write |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | verify only — proves the public read path and that writes are rejected |

None of these are ever echoed, logged, or written to a file by any script in
this directory.

-- 0001_sources.sql — the source registry.
--
-- Mirrors data/registry/sources.yml, which is the single source of truth for
-- ingestion. Two blocks live in that file and they are NOT the same thing, so
-- they get two tables: `sources:` (endpoints that are actually ingested) and
-- `gaps:` (declared holes that block a phase). Collapsing the gaps into the
-- source list would present a known gap as a working source.
--
-- Nothing here is written by the application. Rows are loaded by
-- scripts/seed-supabase.mjs with the service-role key; RLS (0003) makes every
-- table public-read and writable by nobody but the service role.

create table public.source (
  id            text primary key,
  name          text not null,
  publisher     text not null,
  grade         text not null check (grade in ('A', 'B', 'C')),
  verified      date,
  phase         smallint,
  perspective   text,
  basis         text,
  cadence       text,
  licence       text,
  endpoint      text,
  index_url     text,
  coverage_from smallint,
  coverage_to   smallint,
  coverage_raw  jsonb,
  caveats       text[],
  notes         text
);

comment on table public.source is
  'Ingestion source catalogue, loaded verbatim from the `sources:` block of data/registry/sources.yml. Provenance: data/registry/sources.yml (hand-maintained registry); no figure in this database is derived from this table.';
comment on column public.source.grade is
  'A = API or stable machine-readable endpoint; B = stable bulk files needing a parser; C = PDF or interactive only, cross-check use. Registry''s own scale.';
comment on column public.source.verified is
  'Date the endpoint was last confirmed working by hand. Null where the registry records none.';
comment on column public.source.coverage_from is
  'Parsed from the registry''s `coverage: {from: …, to: …}`. Null where the entry states coverage in other terms — coverage_raw always holds the entry as written.';
comment on column public.source.coverage_raw is
  'The registry''s `coverage` mapping exactly as written, so entries that do not use from/to (e.g. bdns_grants) are not silently flattened to null.';
comment on column public.source.index_url is
  'Landing/index page, for sources published without a machine-readable endpoint.';

create table public.source_gap (
  id             text primary key,
  what           text not null,
  why_it_matters text not null,
  status         text not null,
  blocks_phase   smallint
);

comment on table public.source_gap is
  'Declared, unclosed gaps in the source registry — the `gaps:` block of data/registry/sources.yml. These are named absences, not sources: nothing in this project may be labelled complete while a gap that blocks its phase is open. Provenance: data/registry/sources.yml.';

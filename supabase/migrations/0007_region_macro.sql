-- 0007_region_macro.sql — one population and one GDP per region and year.
--
-- region carried a single gdp_mn and a single pop (bundle regions[].gdp and
-- .pop): GDP of 2023 and the headcount of 1 January 2024, applied by the console
-- to every year from 2012. A per-capita figure for 2012 divided by the residents
-- of 2024 is not a per-capita figure. pipeline/spain/merge14.js replaced the two
-- scalars with Eurostat's regional series by year (nama_10r_2gdp at current
-- market prices; demo_r_pjanaggr3, population on 1 January), so the mirror does
-- the same: the scalar columns go, and a (region, year) table takes their place.
--
-- Nulls are honest: a year Eurostat has not yet published for a series is a
-- missing row or a null cell, never the previous year's value carried forward.

create table public.region_macro (
  region_id       text     not null references public.region (id),
  year            smallint not null,
  gdp_mn          numeric,
  gdp_provisional boolean  not null default false,
  pop             bigint,
  primary key (region_id, year)
);
comment on table public.region_macro is
  'Regional GDP (current market prices, € million; Eurostat nama_10r_2gdp) and population on 1 January (Eurostat demo_r_pjanaggr3) by region and year, from bundle regions[].macro. The denominators behind every per-capita and %GDP reading; each figure is divided by its own year''s values only.';
comment on column public.region_macro.gdp_mn is
  'Null where Eurostat has not yet published the year (regional GDP lags about fourteen months). Never carried forward.';
comment on column public.region_macro.gdp_provisional is
  'True where Eurostat flags the value provisional (status p) at extraction.';
comment on column public.region_macro.pop is
  'Residents on 1 January of the year. Null where not yet published.';
create index region_macro_year_idx on public.region_macro (year);

alter table public.region
  drop column gdp_mn,
  drop column pop;
comment on table public.region is
  'The 19 Spanish autonomous communities and autonomous cities, from bundle regions[]. Provenance: pipeline/spain/build_map.js (geometry, identity). GDP and population live in region_macro, by year.';

-- Same access model as every other table (0003): world-readable, nobody writes.
alter table public.region_macro enable row level security;
create policy region_macro_public_read on public.region_macro
  for select to anon, authenticated using (true);
grant select on public.region_macro to anon, authenticated;
revoke insert, update, delete, truncate on public.region_macro from anon, authenticated;

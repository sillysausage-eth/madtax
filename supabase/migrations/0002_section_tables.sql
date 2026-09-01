-- 0002_section_tables.sql — section-shaped mirror of data/derived/es-fiscal-bundle.json.
--
-- ARCHITECTURE (plan §1). The bundle is the single source of truth. These tables
-- are a queryable MIRROR of it: one table per bundle section, reshaped into rows
-- and nothing else. No rounding, no interpolation, no derived measures — every
-- number below is byte-identical to the bundle, and scripts/verify-db.mjs proves
-- it by recomputing identities from this database and comparing them to the
-- bundle exactly.
--
-- PROVENANCE (house rule). `source_id` foreign keys appear ONLY where the bundle
-- genuinely records which publication a figure came from:
--   * debt_holders / debt_holders_meta  — bundle debt.holders.src names BdE table
--     11.13 (be1113), which resolves to exactly one registry entry.
--   * debt_meta_source                  — bundle debt.srcEDP names two Eurostat
--     datasets (gov_10dd_edpt1, gov_10a_main), each resolving to exactly one entry.
-- Everywhere else the bundle carries no row-level locator, so provenance is stated
-- in these table COMMENTs (naming the pipeline stage that produced the section)
-- and NOT as a fabricated foreign key. Post-V1, when the extractors archive
-- snapshots and record locators, the star schema arrives alongside and these
-- tables become views with identical names and columns.
--
-- UNITS. `*_mn` = millions of euro, exactly as the bundle carries them (Eurostat
-- MIO_EUR). `*_eur` = euro, used by the AEAT micro-tables (IRPF deciles and
-- brackets) which publish at euro resolution. `*_pct` = percent as published.
-- Monetary columns are `numeric`, never float: the bundle carries one decimal on
-- the debt series and exact arithmetic is the whole point.

-- ---------------------------------------------------------------- dimensions --

create table public.revenue_part (
  code    text primary key,
  ordinal smallint not null unique
);
comment on table public.revenue_part is
  'The 17 revenue buckets the console splits national revenue into. Codes and order from bundle PARTS. Provenance: pipeline/spain/bundle.js.';

create table public.state_tax (
  code    text primary key,
  ordinal smallint not null unique
);
comment on table public.state_tax is
  'AEAT state-tax column codes (TOTAL, IRPF, IS, IVA, IIEE, OTROS, TASAS) and their order, from bundle revTaxes. Provenance: pipeline/spain/extract.js (AEAT collection by region).';

create table public.econ_item (
  code     text primary key,
  ordinal  smallint not null unique,
  label_es text not null,
  label_en text not null
);
comment on table public.econ_item is
  'ESA 2010 economic-transaction codes used for regional expenditure (D.1, P.2, …), with the console''s bilingual labels. From bundle econKeys / econES / econEN.';

create table public.cofog_item (
  code        text primary key,
  level       smallint not null check (level between 0 and 2),
  parent_code text references public.cofog_item (code),
  label_es    text,
  label_en    text,
  note_es     text,
  note_en     text
);
comment on table public.cofog_item is
  'COFOG hierarchy used across the spending console: level 0 = TOTAL, level 1 = GF01..GF10 divisions, level 2 = groups. Labels from bundle divES/divEN (level 1) and spendSubES/spendSubEN (level 2, plus level-1 English); notes from spendNoteES/spendNoteEN.';
comment on column public.cofog_item.label_es is
  'Null where the bundle carries no Spanish label for the code — a real gap, not a placeholder.';
create index cofog_item_parent_code_idx on public.cofog_item (parent_code);

create table public.region (
  id         text primary key,
  nuts       text not null unique,
  name_es    text not null,
  name_en    text not null,
  foral      boolean not null,
  inset      boolean not null,
  gdp_mn     numeric not null,
  pop        bigint  not null,
  centroid_x numeric not null,
  centroid_y numeric not null,
  bbox_x0    numeric not null,
  bbox_y0    numeric not null,
  bbox_x1    numeric not null,
  bbox_y1    numeric not null
);
comment on table public.region is
  'The 19 Spanish autonomous communities and autonomous cities, from bundle regions[]. Provenance: pipeline/spain/build_map.js (geometry, identity) + extractors (gdp, pop).';
comment on column public.region.foral is
  'True for Basque Country and Navarre, which collect their own taxes under the Concierto/Convenio — their state-tax figures are not comparable with the common-regime regions.';
comment on column public.region.centroid_x is
  'Map-canvas coordinate, not a geographic one: the bundle''s 1000x700 SVG viewport. Carried so the DB mirror is complete; the SVG path geometry itself stays in the bundle.';

create table public.nat_revenue_sub_item (
  code        text primary key,
  label_es    text,
  label_en    text,
  source_item text
);
comment on table public.nat_revenue_sub_item is
  'Sub-item dictionary for the national revenue drill-down: bundle subLab (console labels) and subSrc (the publisher''s own name for the item). Provenance: pipeline/spain/extract_natsub.js.';
comment on column public.nat_revenue_sub_item.source_item is
  'The publisher''s own description of the item (bundle subSrc) — genuine row-level provenance text. Deliberately NOT a source_id foreign key: these codes come from more than one Eurostat dataset and the bundle does not record which, so a single FK would be an invention.';
comment on column public.nat_revenue_sub_item.label_es is
  'Null where the bundle carries no console label for the code (subSrc covers more codes than subLab).';

create table public.who_excise_product (
  code     text primary key,
  label_es text not null,
  label_en text not null
);
comment on table public.who_excise_product is 'Excise duty product codes and bilingual labels, from bundle who.excise.labES / labEN.';

create table public.who_vat_rate (
  code     text primary key,
  label_es text not null,
  label_en text not null
);
comment on table public.who_vat_rate is 'VAT rate-band codes and bilingual labels, from bundle who.vat.labES / labEN.';

create table public.debt_holder_sector (
  code     text primary key,
  label_es text not null,
  label_en text not null
);
comment on table public.debt_holder_sector is 'Debt holder-sector codes and bilingual labels, from bundle debt.holders.labES / labEN.';

-- ------------------------------------------------------- national headlines --

create table public.gg_headline (
  year            smallint primary key,
  revenue_mn      numeric not null,
  expenditure_mn  numeric not null
);
comment on table public.gg_headline is
  'General government revenue and expenditure headline, from bundle gg. Provenance: Eurostat gov_10a_main via pipeline/spain/extract.js.';

create table public.nat_revenue_headline (
  year            smallint primary key,
  total_mn        numeric not null,
  expenditure_mn  numeric not null,
  deficit_mn      numeric not null,
  taxes_mn        numeric not null,
  social_mn       numeric not null,
  sales_mn        numeric not null,
  property_mn     numeric not null,
  transfers_mn    numeric not null,
  eu_in_mn        numeric not null,
  mapped_mn       numeric,
  unmapped_mn     numeric
);
comment on table public.nat_revenue_headline is
  'National revenue headline block, from bundle natRev. Provenance: pipeline/spain/bundle.js over Eurostat gov_10a_main / gov_10a_taxag.';
comment on column public.nat_revenue_headline.mapped_mn is
  'Revenue attributable to a territory. Null for the years where the bundle carries no territorial mapping — a declared gap, never a plug.';

create table public.nat_revenue_year (
  year            smallint primary key,
  has_detail      boolean not null,
  total_mn        numeric not null,
  published_mn    numeric not null,
  residual_mn     numeric not null,
  expenditure_mn  numeric not null,
  deficit_mn      numeric not null
);
comment on table public.nat_revenue_year is
  'Per-year scalars carried alongside the revenue-part split, from bundle natParts (total / published / residual / expenditure / deficit / detail). residual_mn is the bundle''s own reconciliation of the part split against the published total.';

create table public.nat_revenue_parts (
  year      smallint not null,
  part      text     not null references public.revenue_part (code),
  amount_mn numeric  not null,
  primary key (year, part)
);
comment on table public.nat_revenue_parts is
  'National revenue split into the 17 console buckets, from bundle natParts. Sums to nat_revenue_year.total_mn exactly.';
create index nat_revenue_parts_part_idx on public.nat_revenue_parts (part);

create table public.nat_revenue_sub (
  year      smallint not null,
  part      text     not null references public.revenue_part (code),
  code      text     not null references public.nat_revenue_sub_item (code),
  amount_mn numeric  not null,
  primary key (year, part, code)
);
comment on table public.nat_revenue_sub is
  'Drill-down of a revenue bucket into publisher sub-items, from bundle natSub. Children sum to the parent nat_revenue_parts row exactly. Only the buckets the bundle actually decomposes appear here; the absence of a bucket for a year is a real gap, not a zero.';
create index nat_revenue_sub_code_idx on public.nat_revenue_sub (code);
create index nat_revenue_sub_part_idx on public.nat_revenue_sub (part);

create table public.nat_revenue_map_agg (
  year       smallint not null,
  part       text     not null references public.revenue_part (code),
  mapped_mn  numeric  not null,
  offmap_mn  numeric  not null,
  nat_mn     numeric  not null,
  primary key (year, part)
);
comment on table public.nat_revenue_map_agg is
  'Per-bucket split of national revenue into the part that lands on the map and the part that does not, from bundle mapAgg. mapped_mn + offmap_mn = nat_mn, and nat_mn equals the nat_revenue_parts figure.';
create index nat_revenue_map_agg_part_idx on public.nat_revenue_map_agg (part);

create table public.nat_revenue_map_agg_total (
  year      smallint primary key,
  mapped_mn numeric not null,
  offmap_mn numeric not null,
  nat_mn    numeric not null
);
comment on table public.nat_revenue_map_agg_total is
  'The all-buckets total of bundle mapAgg. Kept out of nat_revenue_map_agg so an aggregate never masquerades as a revenue part.';

create table public.nat_revenue_state_tax (
  year      smallint not null,
  tax       text     not null references public.state_tax (code),
  amount_mn numeric  not null,
  primary key (year, tax)
);
comment on table public.nat_revenue_state_tax is
  'National state-tax collection vector, from bundle revNational. AEAT cash basis — not comparable with the national-accounts figures in nat_revenue_parts; do not present the two side by side unlabelled.';
create index nat_revenue_state_tax_tax_idx on public.nat_revenue_state_tax (tax);

create table public.nat_revenue_tier (
  year             smallint primary key,
  state_mn         numeric,
  regional_mn      numeric,
  local_tax_mn     numeric,
  ibi_mn           numeric,
  local_fee_mn     numeric,
  eu_mn            numeric,
  eu_unassigned_mn numeric,
  total_mn         numeric,
  complete         boolean not null
);
comment on table public.nat_revenue_tier is
  'Territorially-mapped revenue by collecting tier, from bundle national2 (st / rg / lt / ibi / lf / eu / euUnassigned / total / complete). `complete` is the bundle''s own declaration that every tier is present for that year.';

-- --------------------------------------------------------------- by region --

create table public.regional_revenue (
  region_id text     not null references public.region (id),
  year      smallint not null,
  tax       text     not null references public.state_tax (code),
  amount_mn numeric  not null,
  primary key (region_id, year, tax)
);
comment on table public.regional_revenue is
  'State tax collected in each region, from bundle regions[].rev. Provenance: AEAT collection by autonomous community, via pipeline/spain/extract.js. Components need not sum to the TOTAL column to the euro — AEAT publishes each column rounded independently and the bundle carries them as published.';
create index regional_revenue_year_tax_idx on public.regional_revenue (year, tax);

create table public.regional_revenue_tier (
  region_id       text     not null references public.region (id),
  year            smallint not null,
  state_total_mn  numeric,
  regional_mn     numeric,
  local_tax_mn    numeric,
  ibi_mn          numeric,
  local_fee_mn    numeric,
  eu_mn           numeric,
  total_mn        numeric,
  partial         boolean  not null,
  missing         text[]   not null,
  parts_total_mn  numeric,
  primary key (region_id, year)
);
comment on table public.regional_revenue_tier is
  'Per region-year revenue by collecting tier, from bundle regions[].rev2, plus the bucket-split total from regions[].parts. `partial` and `missing` are the bundle''s own declaration of which tiers it could not source for that year — the reason total_mn is null, stated rather than filled in.';
comment on column public.regional_revenue_tier.state_total_mn is
  'The TOTAL element of the region''s state-tax vector for that year; the full vector is in regional_revenue.';
comment on column public.regional_revenue_tier.parts_total_mn is
  'Total of the region''s revenue-part split (bundle regions[].parts.total). Deliberately differs from total_mn: the part split covers a different perimeter, and reconciling them by adjustment would be a plug.';
create index regional_revenue_tier_year_idx on public.regional_revenue_tier (year);

create table public.regional_revenue_parts (
  region_id text     not null references public.region (id),
  year      smallint not null,
  part      text     not null references public.revenue_part (code),
  amount_mn numeric,
  primary key (region_id, year, part)
);
comment on table public.regional_revenue_parts is
  'Region-level revenue split into the 17 console buckets, from bundle regions[].parts. Summed across regions this equals nat_revenue_map_agg.mapped_mn exactly.';
comment on column public.regional_revenue_parts.amount_mn is
  'Null means the bucket has no territorial split at all (social contributions, EU receipts, property income and so on). The row exists so the absence is queryable; it is never a zero.';
create index regional_revenue_parts_year_part_idx on public.regional_revenue_parts (year, part);

create table public.regional_spend (
  region_id text     not null references public.region (id),
  year      smallint not null,
  cofog     text     not null references public.cofog_item (code),
  amount_mn numeric  not null,
  primary key (region_id, year, cofog)
);
comment on table public.regional_spend is
  'Regional government expenditure by COFOG division, from bundle regions[].spend. Ceuta and Melilla carry no rows: the bundle has no COFOG series for them, and an absent region is not a zero one.';
create index regional_spend_year_cofog_idx on public.regional_spend (year, cofog);

create table public.regional_econ (
  region_id text     not null references public.region (id),
  year      smallint not null,
  econ      text     not null references public.econ_item (code),
  amount_mn numeric  not null,
  primary key (region_id, year, econ)
);
comment on table public.regional_econ is
  'Regional government expenditure by ESA economic transaction, from bundle regions[].econ. Same coverage as regional_spend: no rows for Ceuta and Melilla.';
create index regional_econ_year_econ_idx on public.regional_econ (year, econ);

-- ------------------------------------------------------------- expenditure --

create table public.national_spend (
  year      smallint not null,
  cofog     text     not null references public.cofog_item (code),
  amount_mn numeric  not null,
  primary key (year, cofog)
);
comment on table public.national_spend is
  'General government expenditure by COFOG division, from bundle spendNational (TOTAL plus the ten divisions). Provenance: Eurostat gov_10a_exp via pipeline/spain/extract_cofog.py.';
create index national_spend_cofog_idx on public.national_spend (cofog);

create table public.sector_spend (
  sector    text     not null,
  year      smallint not null,
  cofog     text     not null references public.cofog_item (code),
  amount_mn numeric  not null,
  primary key (sector, year, cofog)
);
comment on table public.sector_spend is
  'Expenditure by COFOG division for each ESA subsector (S13, S1311, S1312, S1313, S1314), from bundle spendBySector. The bundle carries a single unstamped year here; the seed asserts the S13 vector equals national_spend for the year it records, and fails rather than assume.';
comment on column public.sector_spend.year is
  'The year the seed proved this vector belongs to by exact match against spendNational — a tested fact, not an assumption.';
create index sector_spend_year_cofog_idx on public.sector_spend (year, cofog);

create table public.cofog_spend (
  year      smallint not null,
  cofog     text     not null references public.cofog_item (code),
  amount_mn numeric  not null,
  primary key (year, cofog)
);
comment on table public.cofog_spend is
  'General government expenditure at COFOG division AND group level, from bundle spendSub. Group children sum to their division exactly; divisions sum to national_spend TOTAL exactly.';
create index cofog_spend_cofog_idx on public.cofog_spend (cofog);

create table public.cofog_spend_agg (
  year       smallint not null,
  cofog      text     not null references public.cofog_item (code),
  nat_mn     numeric  not null,
  mapped_mn  numeric  not null,
  central_mn numeric  not null,
  local_mn   numeric  not null,
  socsec_mn  numeric  not null,
  adj_mn     numeric  not null,
  primary key (year, cofog)
);
comment on table public.cofog_spend_agg is
  'Expenditure by COFOG division split across tiers, from bundle spendAgg. mapped_mn is the regional tier (equal to the sum over regional_spend); adj_mn is the consolidation adjustment the publisher applies, carried as published — mapped + central + local + socsec + adj = nat exactly.';
create index cofog_spend_agg_cofog_idx on public.cofog_spend_agg (cofog);

-- ------------------------------------------------------------ who pays it --

create table public.who_irpf_decile (
  year            smallint not null,
  band            text     not null,
  limit_eur       numeric,
  taxpayers       bigint   not null,
  income_eur      numeric  not null,
  tax_eur         numeric  not null,
  rate_pct        numeric  not null,
  src_work_eur    numeric  not null,
  src_cap_mob_eur numeric  not null,
  src_cap_inm_eur numeric  not null,
  src_biz_eur     numeric  not null,
  src_gains_eur   numeric  not null,
  src_imputed_eur numeric  not null,
  primary key (year, band)
);
comment on table public.who_irpf_decile is
  'Personal income tax by income decile and top percentile (D01..D10, P99, P999, P9999, TOT), from bundle who.irpf.deciles. Provenance: AEAT IRPF declarant statistics via pipeline/spain/extract_who.py. Figures are in euro, not millions. P99/P999/P9999 are subsets of D10 and TOT is the whole population — they overlap by construction and must never be added together.';
comment on column public.who_irpf_decile.limit_eur is
  'Upper income limit of the band. Null for the open-topped bands (D10 and TOT), where the publisher states none.';
create index who_irpf_decile_band_idx on public.who_irpf_decile (band);

create table public.who_irpf_bracket (
  year        smallint not null,
  bracket     text     not null,
  lo_eur      numeric,
  hi_eur      numeric,
  returns     bigint   not null,
  returns_pct numeric  not null,
  payers      bigint   not null,
  tax_eur     numeric  not null,
  tax_pct     numeric  not null,
  avg_eur     numeric  not null,
  primary key (year, bracket)
);
comment on table public.who_irpf_bracket is
  'Personal income tax by declared-income bracket, from bundle who.irpf.brackets. A different population from who_irpf_decile: this counts returns (including non-payers and negative income), the deciles count declarants. Provenance: AEAT via pipeline/spain/extract_brackets.py.';
comment on column public.who_irpf_bracket.lo_eur is 'Null on the open-bottomed bracket (negative income).';
comment on column public.who_irpf_bracket.hi_eur is 'Null on the open-topped bracket.';

create table public.who_irpf_bracket_total (
  year    smallint primary key,
  returns bigint  not null,
  tax_eur numeric not null,
  avg_eur numeric not null
);
comment on table public.who_irpf_bracket_total is 'The all-brackets total published alongside who_irpf_bracket (bundle who.irpf.brackets[year].total).';

create table public.who_corp (
  year            smallint not null,
  segment         text     not null check (segment in ('total', 'groups', 'standalone')),
  profit_mn       numeric,
  base_mn         numeric,
  tax_mn          numeric,
  rate_base_pct   numeric,
  rate_profit_pct numeric,
  exempt_mn       numeric,
  losses_mn       numeric,
  primary key (year, segment)
);
comment on table public.who_corp is
  'Corporate income tax by filer type, from bundle who.corp. `groups` are consolidated tax groups, `standalone` everything else, `total` the sum as published. Provenance: AEAT annual accounts statistics via pipeline/spain/extract_corp.py.';
comment on column public.who_corp.profit_mn is
  'Null for the years the publisher has not released (1995-2007) — the row exists to state the gap.';

create table public.who_social (
  year      smallint not null,
  code      text     not null,
  amount_mn numeric  not null,
  primary key (year, code)
);
comment on table public.who_social is
  'Social contributions by payer type, from bundle who.social. Codes are an ESA hierarchy (D61 = D611 + D612 + D613; D613 = D613C + VOLUNTARY; D613C = D613CE + D613CN + D613CS) — parents and children are both stored, so never sum the whole table. No foreign key to nat_revenue_sub_item: the bundle carries no console label for these aggregate codes.';
create index who_social_code_idx on public.who_social (code);

create table public.who_excise (
  year      smallint not null,
  product   text     not null references public.who_excise_product (code),
  amount_mn numeric  not null,
  primary key (year, product)
);
comment on table public.who_excise is 'Excise duties by product, from bundle who.excise.years[].rows. Provenance: AEAT via pipeline/spain/extract_who.py.';
create index who_excise_product_idx on public.who_excise (product);

create table public.who_excise_total (
  year        smallint primary key,
  total_mn    numeric not null,
  provisional boolean not null
);
comment on table public.who_excise_total is
  'The published excise total and its provisional flag. Carried separately because the publisher rounds each product line independently, so the product rows need not sum to it to the euro — the difference is the publisher''s rounding, never reallocated.';

create table public.who_vat (
  year      smallint not null,
  rate      text     not null references public.who_vat_rate (code),
  amount_mn numeric  not null,
  primary key (year, rate)
);
comment on table public.who_vat is 'VAT by rate band, from bundle who.vat.years[].rows. Provenance: AEAT via pipeline/spain/extract_who.py.';
create index who_vat_rate_idx on public.who_vat (rate);

create table public.who_vat_total (
  year         smallint primary key,
  total_mn     numeric not null,
  provisional  boolean not null,
  accrued_mn   numeric not null,
  special_mn   numeric not null,
  foral_mn     numeric not null,
  adj_other_mn numeric not null
);
comment on table public.who_vat_total is
  'The published VAT total with the publisher''s own reconciling lines (accrued, special regimes, foral settlement, other adjustments), from bundle who.vat.years. Carried as published: these lines do not close on total_mn to the euro and are not adjusted to make them.';

create table public.irpf_scale_band (
  scale     text     not null check (scale in ('general', 'savings')),
  year      smallint not null,
  ordinal   smallint not null,
  from_eur  numeric  not null,
  to_eur    numeric,
  rate_pct  numeric  not null,
  primary key (scale, year, ordinal)
);
comment on table public.irpf_scale_band is
  'Statutory state IRPF rate scales, from bundle irpfScale. to_eur is null on the open-topped band.';

create table public.madrid_scale_band (
  year            smallint not null,
  region_name     text     not null,
  ordinal         smallint not null,
  from_eur        numeric  not null,
  to_eur          numeric,
  state_rate_pct  numeric  not null,
  region_rate_pct numeric  not null,
  rate_pct        numeric  not null,
  primary key (year, ordinal)
);
comment on table public.madrid_scale_band is
  'Combined state + regional IRPF scale for the Comunidad de Madrid, from bundle madridScale — the worked example the console uses to show that the effective scale is regional. Only this one region is carried; the bundle has no others.';

-- -------------------------------------------------------------------- debt --

create table public.debt_stock (
  year             smallint primary key,
  total_mn         numeric not null,
  pc_gdp           numeric not null,
  interest_pc_gdp  numeric not null
);
comment on table public.debt_stock is
  'EDP consolidated gross general-government debt at face value, from bundle debt.total / debt.pcGdp / debt.intPcGdp. Provenance: Eurostat gov_10dd_edpt1 and gov_10a_main via pipeline/spain/extract_debt.js — see debt_meta and debt_meta_source.';

create table public.debt_instrument (
  year       smallint not null,
  instrument text     not null,
  amount_mn  numeric  not null,
  primary key (year, instrument)
);
comment on table public.debt_instrument is
  'Debt stock partitioned by instrument (GD_F2 currency and deposits, F31/F32 short and long-term securities, F41/F42 short and long-term loans), from bundle debt.instr. The partition is exhaustive; it reproduces debt_stock.total_mn to within the publisher''s own rounding (at most 0.1 MIO_EUR), which is carried, not scaled away.';
create index debt_instrument_instrument_idx on public.debt_instrument (instrument);

create table public.debt_tier (
  year      smallint not null,
  tier      text     not null check (tier in ('S1311', 'S1312', 'S1313', 'S1314')),
  amount_mn numeric  not null,
  primary key (year, tier)
);
comment on table public.debt_tier is
  'Debt by government subsector, from bundle debt.tier. These are GROSS figures and deliberately sum ABOVE the consolidated headline, because one tier holding another''s paper is netted out. Never rescale them — the elimination is carried explicitly in debt_tier_total.';

create table public.debt_tier_total (
  year            smallint primary key,
  gross_mn        numeric not null,
  consolidated_mn numeric not null,
  elimination_mn  numeric not null
);
comment on table public.debt_tier_total is
  'The subsector aggregation of bundle debt.tier: gross (sum of the four tiers), the elimination of intra-government holdings, and the consolidated total. gross - elimination = consolidated, and consolidated equals debt_stock.total_mn.';

create table public.debt_interest (
  year      smallint not null,
  tier      text     not null check (tier in ('S1311', 'S1312', 'S1313', 'S1314')),
  amount_mn numeric  not null,
  primary key (year, tier)
);
comment on table public.debt_interest is
  'Interest paid (D41PAY) by government subsector, from bundle debt.interest. Gross, on the same perimeter and with the same elimination behaviour as debt_tier.';

create table public.debt_interest_total (
  year           smallint primary key,
  total_mn       numeric not null,
  gross_mn       numeric not null,
  elimination_mn numeric not null
);
comment on table public.debt_interest_total is
  'Aggregation of bundle debt.interest: gross - elimination = total (consolidated interest).';

create table public.debt_maturity (
  maturity_year smallint primary key,
  amount_mn     numeric  not null,
  as_of         date     not null,
  scope         text     not null,
  basis         text
);
comment on table public.debt_maturity is
  'Redemption ladder — nominal falling due in each future year, from bundle debt.maturity.rows. SCOPE TRAP: scope is `state`, roughly 1.52tn, NOT the 1.70tn general-government headline in debt_stock. Rebuilt security-by-security from the Tesoro''s valores-en-circulacion listing because the bulletin publishes the ladder as an image; provenance: pipeline/spain/extract_tesoro.py.';
comment on column public.debt_maturity.as_of is
  'Vintage stamp carried from bundle debt.maturity.asOf. The ladder is a single snapshot; every row shares it.';
comment on column public.debt_maturity.basis is
  'Null: the bundle carries no valuation-basis stamp for the ladder. Stated as a null rather than guessed from the neighbouring tables.';

create table public.debt_maturity_meta (
  id                smallint primary key check (id = 1),
  as_of             date    not null,
  avg_life_years    numeric not null,
  avg_life_as_of    text    not null,
  total_laddered_mn numeric not null,
  n_securities      integer not null,
  scope             text    not null
);
comment on table public.debt_maturity_meta is
  'Single-row header for debt_maturity (bundle debt.maturity): snapshot date, average life and its own separate vintage, the laddered total and the number of securities behind it.';

create table public.debt_cost (
  id                smallint primary key check (id = 1),
  as_of             text    not null,
  avg_cost_pct      numeric not null,
  avg_cost_new_pct  numeric not null,
  scope             text    not null
);
comment on table public.debt_cost is
  'Average cost of the outstanding debt and of new issuance, from bundle debt.cost. The Tesoro is the only publisher of these; scope is `state`, not general government. as_of is a month (YYYY-MM) as published, kept as text rather than promoted to a false day precision.';

create table public.debt_holders (
  sector    text    primary key references public.debt_holder_sector (code),
  amount_mn numeric not null,
  as_of     text    not null,
  scope     text    not null,
  basis     text    not null,
  source_id text    not null references public.source (id)
);
comment on table public.debt_holders is
  'Who holds the debt, from bundle debt.holders.rows. Same perimeter, valuation and date as debt_stock, so the rows close on the headline at 100%. Bonds held by the ECB itself count as rest of the world, not as central-bank holdings.';
comment on column public.debt_holders.source_id is
  'Honest provenance: the bundle names Banco de España table 11.13 (be1113) as the source of this split, which resolves to exactly one registry entry. This is one of only three places in the schema where a source foreign key is warranted.';
create index debt_holders_source_id_idx on public.debt_holders (source_id);

create table public.debt_holders_meta (
  id        smallint primary key check (id = 1),
  as_of     text    not null,
  scope     text    not null,
  basis     text    not null,
  total_mn  numeric not null,
  note_es   text    not null,
  note_en   text    not null,
  src_table text    not null,
  src_unit  text    not null,
  src_basis text    not null,
  source_id text    not null references public.source (id)
);
comment on table public.debt_holders_meta is
  'Single-row header for debt_holders (bundle debt.holders): stamps, the published total, the bilingual methodology note shown with the chart, and the publisher''s own description of table, unit and basis.';
comment on column public.debt_holders_meta.src_table is
  'The publisher''s own identification of the table, verbatim from the bundle, so the source_id resolution above stays auditable rather than having to be trusted.';
create index debt_holders_meta_source_id_idx on public.debt_holders_meta (source_id);

create table public.debt_meta (
  id          smallint primary key check (id = 1),
  ref_year    smallint not null,
  src_dataset text     not null,
  src_unit    text     not null,
  src_basis   text     not null
);
comment on table public.debt_meta is
  'Single-row header for the debt section (bundle debt.ref and debt.srcEDP): the reference year the console opens on, and the publisher''s own description of dataset, unit and basis.';

create table public.debt_meta_source (
  source_id text primary key references public.source (id)
);
comment on table public.debt_meta_source is
  'The registry entries behind the debt section. bundle debt.srcEDP names two Eurostat datasets in one string, each resolving to exactly one registry entry — so the link is a table, not a column that would have had to pick one and drop the other.';

-- -------------------------------------------------------------- coverage --

create table public.coverage_note (
  key   text primary key,
  kind  text not null check (kind in ('coverage', 'note')),
  value text
);
comment on table public.coverage_note is
  'The bundle''s own declarations about what it does and does not cover: kind=coverage rows are the year ranges from bundle coverage, kind=note rows are its accompanying treatment notes (bundle euNote).';
comment on column public.coverage_note.value is
  'Null where the bundle declares no coverage at all. The row exists precisely so the gap is a published fact — social contributions have no territorial split, and that null is the honest answer, not a missing row.';

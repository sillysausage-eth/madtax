# Spain pipeline — prototype scripts

Throwaway-quality scripts that produced the Phase-1 prototype data. They are here because
they encode real, hard-won knowledge about the sources; they get rewritten properly in
Phase 0 against the schema in `docs/03-implementation-plan.md`.

## Run order

```bash
# 1. geometry — 19 autonomous communities, Mercator, simplified, Canaries as an inset
curl -sL -o es_ccaa.geojson \
  https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-communities.geojson
node build_map.js          # -> map_paths.json   (42.7KB of SVG path data)

# 2. real AEAT collection by territory, monthly + annual, 2007-2025
#    published by AEAT, redistributed with a clean API by ISTAC (Canary statistics office)
curl -sL -o aeat_reg.csv \
  https://datos.canarias.es/api/estadisticas/statistical-resources/v1.0/datasets/ISTAC/E32001A_000003/1.42.csv
node extract.js            # -> aeat_regional.json  (104MB CSV -> annual, by tax head)

# 3. join with Eurostat regional GDP + population
node bundle.js             # -> bundle.json

# 4. per-bucket detail (adds to data/derived/es-fiscal-bundle.json in place)
node extract_natsub.js     # -> nat_sub.json      Eurostat ESA children of every bucket
curl -sL -o who/Cuadros_IART24.xlsx \
  https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2024/Cuadros_IART24.xlsx
python3 extract_aeat_detail.py   # -> aeat_detail.json  excise by product, VAT by rate
node merge9.js             # -> folds both into the derived bundle
node merge10.js            # -> renames who.irpf.years to .brackets (idempotent, see below)
python3 extract_corp.py    # -> corp_types.json   table 8.5, incl. the provisional "(p)" column
node merge15.js            # -> who.corp.types refreshed; final years must reproduce the shipped figures
python3 extract_corp_brackets.py  # -> corp_brackets.json  AEAT consolidated statistic, 17 turnover brackets, 2016-
node merge_corp_brackets.js            # -> who.corp.years = brackets (rendered), .types = table 8.5 (tie-out only)

# 5. the municipal layer under every year (CONPREL definitive liquidations, 2012-2024)
#    19 files per year: CCAA=01..19 (18/19 are Ceuta and Melilla, skipped by title).
U=https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL/Consulta/DescargaFichero
for y in $(seq 2012 2024); do for c in $(seq -w 1 19); do
  (cd local/ccaa && curl -sk -L -A "Mozilla/5.0" -J -O "$U?CCAA=$c&TipoDato=Liquidaciones&Ejercicio=$y&TipoPublicacion=Definitiva")
done; done
python3 extract_local.py   # -> local_owntax.json   (xlrd 1.2 for .xls, openpyxl for 2024's .xlsx)
node merge13.js            # -> IBI, local own taxes and fees under 2012-2018; 2019-2024 re-checked

# 6. the two territories AEAT does not collect in
#    Their own treasuries publish the real figures; AEAT's series carries only the
#    residual the State still collects there. See the header of extract_foral.py.
python3 -m venv ../../.venv && ../../.venv/bin/pip install pypdf cryptography openpyxl xlrd==1.2.0
../../.venv/bin/python extract_foral.py   # -> foral.json  OCTE (PDF) + HFN memorias (HTML) + DGT series (xlsm)
node merge12.js            # -> swaps the residual for the foral figure (idempotent)

# 7. denominators by year, and the headline from the bundle's own national accounts
node merge14.js            # -> regions[].macro (Eurostat regional GDP + population), gg

# 8. publish only the complete years — drops 2025 (headline only) and 2013-2014
#    (CONPREL's Navarre tables are all-zero, i.e. absent; see docs/05)
node merge16.js            # -> revYears, national2.complete, coverage, dropped

# 9. the fees, public prices and sales bucket in the three cuts its sources publish
#    (who charges it; each community government's own charges; council charges by kind)
node extract_sales_tier.js   # -> sales_tier.json   Eurostat gov_10a_main P11_P12 + P131 by subsector
#    extract_owntax.py (step 1) now also reads P.11/P.12/P.131 per community from the same IGAE files;
#    extract_local.py (step 5) now also emits chapter 3 by article and the files' own article labels.
node merge17.js            # -> salesDetail; tiers = bucket, 17 communities = S1312, articles = chapter

# 8. the spending map becomes a map of territories: councils join the regional tier
python3 extract_local_spend.py   # -> local_spend.json, local_spend_areas.json (CONPREL Tablas 2, 3, 4; step 5's files)
node merge18.js                  # -> regions[].local, spendTerr; regions + State coin = S13, every year

# 9. the headline as a series, unpruned — what the home screen draws
#    Reads the gov_10a_main file extract_natsub.js already cached (step 4). Separate
#    from `gg` because merge16's prune is about the revenue MAP: 2013, 2014 and 2025
#    have a published headline and belong on a chart that has no map.
node merge19.js            # -> headline (TR, TE, B9 by year); B9 asserted = TR - TE

node verify.js             # tie-outs, must be 0 fail
```

`prototype/console.html` is no longer rebuilt: the prototype is frozen at the pre-foral
bundle and its `gdp`/`pop` scalars, and the Next.js app is the console. `build_console.js`
stays for the record.

### `merge_corp_brackets.js` — corporate tax by turnover bracket

`who.corp.years` is AEAT's *Cuentas anuales consolidadas del Impuesto sobre Sociedades*,
table "Principales variables por Cifra de Negocio y por signo del resultado contable" with
every filter at Total: seventeen turnover brackets from "0 - 50" to "> 1.000.000" thousand
euros, a tax group counted once and a company outside a group counted once. It exists
from 2016. Table 8.5 of the Informe Anual (`extract_corp.py`, now `who.corp.types`) is
the same statistic summarised by company type, so `merge_corp_brackets.js` refuses to write unless
the bracket Total reproduces 8.5's tax and taxable base to the rounding of both sources
in every shared year. "Beneficio" is allowed to differ from 8.5's "Resultado contable
positivo" by up to 1%: the 2025 Informe revised 2016 (0.87%) and 2018 (0.01%) and the
statistic did not. The difference is written to `who.corp.profitDiff`, not smoothed.

The site is HTML only and every page name is a hash that changes by year, so
`extract_corp_brackets.py` walks the menu by label and stops on any missing entry.
Columns are read by header: 2016-2018 lack "Empresas con Cuota Líquida Positiva" (`nPos`
is null there) and head the base column "Base imponible" instead of "Base imponible
positiva". The same table is published once per sector behind the page's "Sector" filter,
and those five CNAE groupings partition the census, so the extractor reads them too and
stores filers, profit and tax per bracket under `sectors`. AEAT withholds a cell marked
"SE" (secreto estadístico) where a sector-and-bracket cell has too few filers to publish:
two such cells exist, both `tax` in 2020, and they are carried as null and flagged with
`secSE` rather than zeroed — the sum check is skipped for those brackets and verify.js
counts them. AEAT publishes no ranking by profit and no company names; the console merges
the seventeen brackets into seven bands (cuts at 50k, 300k, 1M, 10M, 100M, 1bn) and opens
each bracket above €100M by sector — exact sums of published rows, nothing interpolated.

### `merge10.js` — why `who.irpf` has two named datasets

Every other `who.*` bucket keeps its year-indexed series in `.years`, and the console
picks the displayed year from it. `who.irpf` did not: `.years` held the AEAT *fixed
bracket* table, which is published for a single year, while the multi-year decile series
sat beside it in `.deciles`. The console indexed the year off `.years`, so **every
selected year clamped to 2023** and twenty years of decile data in the bundle were
unreachable behind a permanent stale-year tag.

`merge10.js` renames that field for what it is:

```
who.irpf = {kind:'brackets', deciles:{2003..2023}, brackets:{2023}}
```

It rewrites the bundle in place and is a no-op on a bundle already in this shape, so it
is safe to leave in the run order. `whoBlock()` now takes the year from `.deciles`; the
bracket table is never rendered and exists only for the tie-outs in section K of
`verify.js` (bracket total must equal the decile total for the year both cover).

To fold in a refreshed decile extraction:

```bash
curl -sL -o who/DistribucionesIRPF.xlsx \
  https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Estadisticas/Recaudacion_Tributaria/Informes_anuales/DistribucionesIRPF.xlsx
python3 extract_who.py                      # -> irpf_deciles.json
node merge10.js --deciles=irpf_deciles.json
```

That **replaces** `who.irpf.deciles` wholesale and refuses to write unless every year
present in both the fresh file and the shipped bundle agrees to within rounding — the
guard that catches a changed source layout shifting a column. Years the fresh file does
not carry are dropped, never back-filled.

**Where that file actually lives.** Not under `/static_files/AEAT/Estudios/…` with the
other statistics — it is an annex to the *Informe Anual de Recaudación Tributaria*, under
`/static_files/Sede/Tema/Estadisticas/Recaudacion_Tributaria/Informes_anuales/`. The link
is published on the [Informes anuales de Recaudación Tributaria](https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informes_anuales_de_Recaudacion_Tributaria.shtml)
catalog page — watch that page for the refresh, not the declarants catalog.

**The two IRPF publications are not interchangeable.** *Estadística de los declarantes del
IRPF* already carries ejercicio 2024, but it breaks income down by **tramos de
rendimiento** — it has no `D01–D10 / P99 / P999 / P9999` structure and will not drop into
the `datos` schema. It is the source of `who.irpf.brackets`, not a newer decile series.
Do not reach for it when the decile file looks stale.

`extract_natsub.js --offline` reuses the cached `eurostat_*.json` instead of refetching.

## Where each bucket's detail comes from

Two different kinds of breakdown, kept apart on purpose:

| Kind | Source | Basis | Reconciles? |
|---|---|---|---|
| `natSub` | Eurostat `gov_10a_taxag` / `gov_10a_main` child codes | same as the bucket (ESA 2010, S13, accrual) | **exactly** — asserted per bucket per year |
| `who.*` | AEAT annual report tables | AEAT's own (state accrual or cash) | **no** — carries its own total and states the gap |

The ESA route is a true partition, so the UI shows percentages of the bucket. The AEAT
route is administrative detail that national accounts do not publish (excise by product,
VAT by rate, IRPF by income band, corporate tax by company type); it is narrower than the
ESA bucket because the foral treasuries collect their own and ESA scope is wider. Never
rescale AEAT figures to close that gap — show the gap.

`social` is deliberately **excluded** from `natSub`: `who.social` is already built from the
same D61 children, so including both would print the same six numbers twice.

`propTax` (IBI) has no breakdown anywhere — `D29A` is atomic in ESA and the tax is
municipal, so AEAT does not publish it either.

### `salesDetail` — the fees bucket, three ways

"Tasas, precios públicos y ventas" is the bucket whose name says least about what is in
it, and its ESA partition is only two rows. `merge17.js` adds three published cuts, each
tied to a figure already in the bundle and asserted in `verify.js` §R:

| Cut | Source | Reconciles to |
|---|---|---|
| `tier` — who charges it | Eurostat `gov_10a_main`, sectors S1311–S1314, items `P11_P12` and `P131` | `natParts.sales`, **exactly**, every year; per item, the `natSub` rows |
| `region` — what each community's government charges | IGAE `A_CCAA_Det_{y}.xlsx` Tabla1a, rows P.11 / P.12 / P.131 (the same files as the regional tax layer) | the Eurostat S1312 row, **exactly**, 2012–2024 |
| `local` — what its councils charge, by kind | CONPREL Tabla 2, chapter 3 articles 30–39, recaudación líquida | the chapter total inside the community's map figure, within 5 M€ of per-article rounding |

**`region` is not folded into the map.** The map's `sales` part is cash — AEAT's
territorial fee line plus CONPREL chapter 3 plus the foral fee block — and the IGAE figure
is accrual national accounts whose P.131 overlaps the foral block. Adding it without
settling that overlap would be a plug, so the console shows it beside the map figure and
says which is which. Folding it in is a deliberate future step, not an oversight.

**P.12 is not cash.** It is the imputed value of what a government produced for its own
use (own-account software, construction, R&D). It sits inside the national headline because
Eurostat's `P11_P12` does; the console's label says so.

## Things learned the hard way

- **Units.** `OBS_VALUE` is in **thousands of euros**, not euros and not millions.
- **CSV quoting.** Several `PRESUPUESTO_PARTIDA` labels contain commas
  (`"Ingresos por tributos, tasas y precios públicos"`). Naive splitting corrupts the
  column offsets — the parser must handle quotes.
- **Annual rows** are the ones where `TIME_PERIOD_CODE` matches `^\d{4}$`. Everything else
  is monthly cumulative and will double-count if mixed in.
- **Territory codes are NUTS.** 4 characters = autonomous community (`ES30`), 5 = province
  (`ES301`). Filter deliberately or you sum a region and its provinces together.
- **The regional sum does not equal the national total** — €285.2bn vs €294.7bn for 2024.
  The ~€9.5bn gap is centrally-assigned collection with no territory. Surface it; never
  silently scale regions up to close it.
- **Two figures need a permanent health warning**, and the UI enforces both:
  - *Madrid* is 44% of national collection because large companies file at their
    registered office. It measures where tax is declared, not where value was created.
  - *Navarre and the Basque Country* run foral regimes. AEAT's figures there are a
    residual — Navarre's VAT is **negative** (refunds exceed state collection). The
    bundle carries their own treasuries' figures instead (`extract_foral.py`,
    `merge12.js`); the residual is superseded, never summed.

## Spending layer

```bash
# per-community COFOG functional spending, one file per year
BASE=https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/CCAA-A
for y in $(seq 2012 2024); do
  curl -sk -L -A "Mozilla/5.0" -o cofog_ccaa/d_$y.xlsx "$BASE/COFOG_A_Detalle_CCAA_$y.xlsx"
done
python3 extract_cofog.py    # -> cofog_regional.json
node merge.js               # -> bundle2.json  (revenue + spending + geometry)
```

### Gotchas
- **Sheet titles drift between years.** `Comunitat Valenciana` in recent files,
  `Comunidad Valenciana` in older ones. Match on a normalised, accent-stripped key and
  keep aliases — a silent miss costs you a whole region (Valencia is €28bn).
- **The header row floats** between rows 5 and 11. Find it by matching the year in column A.
- **`COFOG_A_CCAA.xlsx` is aggregate only** — it is the whole regional subsector by year,
  not per community. Per-community means one download per year.
- **Values are € millions** here, unlike the AEAT feed which is € thousands.
- **Tie-out**: sum of the 17 communities must equal the `ADMINISTRACIÓN REGIONAL (S.1312)`
  sheet, and that in turn equals Eurostat `gov_10a_exp` S1312 exactly (€268.0bn for 2024).
  Both currently pass.
- **Never sum the four government tiers.** They double-count ~€250bn of transfers between
  levels. Use the consolidated S13 figure.

### The local tier on the spending map — `extract_local_spend.py`, `merge18.js`

The map shows what is spent *in* a territory, whoever spends it. The regional tier is the
IGAE file above; the local tier is CONPREL's per-community consolidated liquidation, the
same download as the revenue layer (step 5): Tabla 3 obligations by chapter and article,
Tabla 2 income articles 45/75, Tabla 4 obligations by programme area. Columns are found by
header text ("Obligaciones Reconocidas Netas", "Derechos Reconocidos Netos") because the
.xls and .xlsx formats are one column apart; the region comes from the title, never from
the `C##` in the file name.

What goes on the map per territory is `nonfin − toGov − fromCA`:

| | Why |
|---|---|
| chapters 1–7 only | 8–9 (financial assets, debt repayment) are not expenditure in national accounts |
| − transfers to other tiers (arts 42/72, 43/73, 45/75, 46/76) | spent by the recipient, already on the map or in the coin; the Basque Diputaciones' ~€13bn to the Basque Government above all |
| − transfers received from the community government (income arts 45/75) | the community already books them as its spending in the IGAE figure |

`merge18.js` writes `regions[].local[y]` and `spendTerr[y]` and refuses to write unless
Σ regional = `spendAgg.mapped`, the coin decomposes exactly into central + Social Security +
elimination + councils' remainder, every net figure is positive and the areas partition
the non-financial total. `verify.js` §U repeats the identity for every year and asserts the
net local layer never exceeds the national-accounts local tier (it runs 66–75%). All-zero
tables — Navarre 2013-2014, Melilla 2022 — are absent, named in `spendTerr[y].partial`, and
must be exactly those three: a new one is news, not a default.

## Verification

```bash
node verify.js                # or from repo root: node pipeline/spain/verify.js
```

30 checks. Exits non-zero on any failure, so it can gate a build. It exists because two
real defects shipped into the first prototype and were only caught by writing it:

- **Five tax heads were shown where the source has nine**, losing €11.5bn (non-resident
  income tax, customs duties, other direct, other indirect). The composition bars didn't
  sum to the headline. Fixed by carrying the real source lines as an `OTROS` head — never
  plug a residual to make a total tie.
- **The spending ladder implied the four government tiers add up.** They don't: they sum
  to €975.7bn against a consolidated €725.0bn, because ~€250.7bn is transfers between
  levels. Any view that sums tiers must show the elimination explicitly.

Rule of thumb this encodes: **a total you did not test is a total you got wrong.**

## Unified revenue layer

One figure per territory covering every administration that levies tax there. Four sources,
deliberately non-overlapping:

```bash
# 1. regional own-managed taxes (ITP/AJD, inheritance, wealth, gambling, IGIC)
#    IGAE national accounts, per community, 2012-2024
for y in $(seq 2012 2024); do
  curl -sk -L -A "Mozilla/5.0" -o ccaa_rev/r_$y.xlsx \
    ".../Documents/CCAA-A/A_CCAA_Det_$y.xlsx"
done
python3 extract_owntax.py     # -> ccaa_owntax.json

# 2. local own taxes and fees (IBI, vehicles, plusvalía, IAE, ICIO + chapter 3)
#    CONPREL, per community, 2019-2023
U=https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL/Consulta/DescargaFichero
curl -sk -L "$U?CCAA=01&TipoDato=Liquidaciones&Ejercicio=2023&TipoPublicacion=Definitiva"
python3 extract_local.py      # -> local_owntax.json

# 3. EU payments by NUTS2 region, 2012-2022
curl -G https://cohesiondata.ec.europa.eu/resource/tc55-7ysv.json \
  --data-urlencode "\$where=country='ES'" ...

node merge3.js && node verify.js
```

### The double-count trap — read before touching this
Both the regional and local accounts contain **their share of national taxes**, which is
already inside AEAT territorial collection:

- Regional: `D.51` is the community's ceded share of income tax. **Excluded.** Only
  `D.211 D.212 D.214 D.29 D.59 D.91` are counted — the taxes the region itself manages.
- Local: accounts `100 101 102` (income, corporate) and `210 220.xx` (VAT, excise) are the
  municipal share of state taxes. **Excluded** — €19.3bn in 2023. Only genuinely local
  levies count.

Naively adding chapter totals would have overstated revenue by roughly €50bn.

### Other traps
- **CONPREL's `C##` codes are NOT INE codes.** Resolve the region from the title inside the
  file (row 2), never from the filename. Getting this wrong silently swapped La Rioja for
  Valencia and Galicia for Madrid, and the numbers still looked superficially plausible.
- **Units differ per source**: AEAT thousands, CONPREL thousands, IGAE millions, EU euros.
- **Region names differ per workbook**, including a source typo ("Comunitat Valencia").
  `regions.py` does substring resolution and `assert_complete()` fails loudly if any of
  the 17 is missing. Three separate silent drops happened before this existed.
- **EU funds are inbound transfers, not tax raised here.** Kept as a separate layer and
  asserted to be outside the raised total.

### The municipal layer runs 2012-2024 (`merge13.js`)
CONPREL publishes definitive liquidations back to 2002 in the same account structure, so
the 2019-2023 window of the first build was a fetch limit, not a source limit. `merge13.js`
fills 2012-2018 from the same extractor and, for the years that already had the layer,
re-extracts and requires IBI and fees to reproduce the shipped figures to the million —
a definitive liquidation that moves is a changed layout, not a revision. An all-zero
table (Navarre 2013, 2014) is returned as absent by `extract_local.py`, never as €0.
Two things it makes visible rather than hides: `otherProdTax` runs above the ESA bucket in 2015-2019
(the CONPREL own-tax block mixes ESA codes; see docs/05), and the AEAT-side tally
(`national2`) is recomputed so `complete` is true for every published year.

### Known gap: social contributions
~€210bn a year — the single largest source of public revenue — is **not published by
territory**. TGSS reports nationally only. It is declared as `coverage.social = null`
rather than defaulted to zero, and `verify.js` asserts that. Including it would require
modelling from affiliation and average contribution bases; that would be our estimate,
not an official figure.

## Debt layer

```bash
node extract_debt.js         # -> debt_edp.json      Eurostat EDP stock + interest, 1995-2025
python3 extract_tesoro.py    # -> debt_tesoro.json   maturity ladder, average life, average cost
node extract_holders.js      # -> debt_holders.json  holder split (needs debt_edp.json)
node merge11.js              # -> folds all three into the derived bundle
node verify.js               # section L covers the debt tie-outs
node build_console.js
```

All three take `--offline` to replay their snapshots (`eurostat_debt_*.json`, `tesoro/`, `bde/`).
`extract_tesoro.py` shells out to `curl`, like the COFOG and CONPREL downloads above —
Python's `urllib` has no CA bundle on this machine and fails every HTTPS fetch with
`CERTIFICATE_VERIFY_FAILED`. Certificates are still verified; `-k` is not used.

Debt is a **stock**, not a flow: it is what is owed on one date. That is why the console's
Deuda tab has no fiscal-year picker — the control is hidden rather than left inert, and
each panel states its own reference date, because the sources behind them are published
on different clocks.

### The consolidation trap — the same shape as the spending one
The four government tiers **do not sum to the debt total**, and must never be scaled so
they do:

| 2025 | € bn |
|---|---|
| Central government | 1,562.6 |
| Autonomous communities | 341.6 |
| Local councils | 20.7 |
| Social security | 136.2 |
| **Gross sum** | **2,061.1** |
| **Consolidated (S13, the headline)** | **1,698.2** |
| Eliminated on consolidation | 362.9 |

The €362.9bn gap is one tier's debt held by another — overwhelmingly State lending to the
regions (regional liquidity funds) and to the Social Security system. The UI shows the
gross ring with the elimination stated underneath, exactly as the spending ladder does.

Interest behaves identically: €43.9bn paid gross against €40.3bn consolidated in 2025, the
€3.6bn difference being interest the regions pay the State.

By contrast the **instrument split is a true partition** and ties to the euro — `verify.js`
asserts it for every one of the 31 years, not just the headline one.

### Perimeter: what Eurostat does not publish
The EDP feed covers all four tiers but says nothing about **residual maturity, the average
cost of the debt, or who holds it**. Those come from the Treasury and the Banco de España
and cover a **narrower perimeter** — Tesoro publishes *State* debt, which is smaller than
general government. `merge11.js` therefore stamps `scope` on each of those blocks and
`verify.js` fails if it is missing: a State-only holder split rendered as if it covered the
whole €1.7tn would be the worst kind of quiet error. While a block is absent the screen
says so in place rather than leaving a blank panel or interpolating.

### The Tesoro bulletin — `extract_tesoro.py`

One bulletin, 19 fixed-URL `.xlsx` files, **overwritten in place every month with no
archive**. No API, no CSV. Raw downloads are snapshotted into `tesoro/` (gitignored) so
last month's figures can still be reproduced. Traps, each of which cost a debugging round:

- **`14.xlsx` (maturity profile) and `08.xlsx` (FX) are a single embedded PNG.** The
  workbook has literally zero data cells. The ladder is therefore built security by
  security from the [valores en circulación](https://www.tesoro.es/deuda-publica/valores-del-tesoro/valores-en-circulacion)
  HTML list, which is finer than the chart was anyway — 78 ISINs with exact amounts.
- **`NN` is a position in the bulletin, not an identity.** Insert one table upstream and
  every later number silently points at different data. `want()` checks the A1 title on
  every file and refuses to read one that has moved.
- **`03.xlsx` alternates rate rows with nominal-outstanding rows** (footnote: "las cifras
  entre paréntesis corresponden al nominal en circulación"). `1179884` there is € millions.
  Rows are keyed off the FECHA column and every rate passes a `-5 < v < 25` sanity band.
- **Use the ES mirror only.** ES is `1.558.033,45` and `DD/MM/YYYY`; EN is `1,558,033.45`
  and `MM/DD/YYYY`. `04/09/2026` means September on one and April on the other, so mixing
  mirrors moves €8.6bn of Letras into the wrong ladder year without any error.
- **The securities list has two snapshot dates**, one per table — Letras and Bonos are
  refreshed on different days. The later is carried; neither is presented as "the" date.
- **The current ladder year is partial.** A mid-year snapshot holds only the redemptions
  still to come, which is most of the ladder's -0.7pp gap against `14.xlsx` for 2026.

The extractor prints its ladder against the official `14.xlsx` percentages every run. They
differ by up to ±0.8pp because the chart's denominator includes the loans and FX debt the
securities list has no rows for, on a different date. That is a fact about two perimeters;
it is printed, never closed by rescaling.

### Who holds it — Banco de España, not Tesoro

`extract_holders.js` reads **BdE table 11.13** (`be1113.csv`), EDP debt by counterpart
sector, and *not* Tesoro's own holder table, because of the perimeter:

| | Perimeter | Dec-2025 |
|---|---|---|
| BdE 11.13 | consolidated general government, EDP face value | €1,698.2bn |
| Tesoro table 07 | book-entry State debt only | €1,480.6bn |

BdE is the **same aggregate as the Eurostat headline already in the bundle**, so the split
closes at 100% against the number the page shows — and `extract_holders.js` asserts that
equality rather than trusting it. Tesoro table 07 is ~€218bn narrower (no regional, local or
social-security debt, no loans or FX debt, stripped bonds at principal only), so a donut
built from it could not honestly be labelled a split of the headline. Its finer 12-way
investor split (households, insurers, pension funds) is worth a second panel one day, on
its own clearly-labelled perimeter.

- **The published series are nested, not siblings.** `Banco de España` sits *inside*
  `instituciones financieras`. Adding the six series as a partition double-counts €346.6bn.
  The four exclusive slices are BdE, financial-institutions **minus** BdE, other residents,
  and rest of the world. Both identities are asserted to the euro.
- **Units are thousands of euros**, unlike everything else in the debt layer.
- **ISO-8859-1**, and some files in this catalogue mix latin-1 and UTF-8 within one line.
  latin-1 decodes any byte at all, so a sentinel check catches mojibake rather than letting
  `Banco de EspaÃ±a` reach the labels.
- **The last two rows are `FUENTE` and `NOTAS`** and are asserted before being dropped.
- **Bonds held by the ECB itself count as rest of the world**, not as central-bank
  holdings — only the Banco de España's own Eurosystem portfolio is in `bde`.
- **Series break at 2016** in every Spanish holder table (Iberclear → Securities Holdings
  Statistics), documented by both publishers. Only the reference quarter is published here,
  so no unbroken series is drawn across it.

The reference quarter is not hardcoded: it is Q4 of whatever year the EDP headline already
quotes, so the donut and the hero figure can never be a year apart.

## Data vintages — check these before assuming a year is missing

Sources publish on different clocks. As of August 2026:

| Source | Latest | Re-checked |
|---|---|---|
| Eurostat `gov_10a_main` (headline) | 2025 | 2026-09-08 — 2022-2025 identical to the bundle |
| Eurostat `gov_10a_taxag` (per-tax split) | 2024 | 2026-09-08 — 2025 not yet published |
| Eurostat `gov_10a_exp` (COFOG) | 2024 | 2026-09-08 |
| Eurostat `nama_10r_2gdp` (regional GDP) | 2024 (p) | 2026-09-08 — now by year |
| Eurostat `demo_r_pjanaggr3` (regional population, 1 Jan) | 2025 | 2026-09-08 — now by year |
| AEAT territorial collection (via ISTAC 1.42, lastUpdate 2026-08-06) | 2025 | 2026-09-08 |
| IGAE `A_CCAA_Det_YYYY.xlsx` (regional accounts) | 2025 | 2026-09-08 |
| IGAE `COFOG_A_Detalle_CCAA_YYYY.xlsx` (regional spending) | 2024 | 2026-09-08 — 2025 404 |
| CONPREL local liquidations (definitive) | 2024 | 2026-09-08 — 2025 HTTP 500; **2012-2018 backfilled** |
| OCTE (Basque tributos concertados) | 2025 | 2026-09-08 |
| Hacienda Foral de Navarra, Cuadro 15 | 2024 (memoria 2025 not out) | 2026-09-08 — **2015 added** (memoria 2016) |
| DGT series (Navarre 2012-2014) | 2023 | 2026-09-08 — new |
| AEAT `Cuadros_IART25_es_es.xlsx` (excise by product, VAT by rate, corp) | excise 2025 · VAT 2024 · corp 2024 (p) | 2026-09-08 — **new edition** |
| AEAT `DistribucionesIRPF.xlsx` (IRPF by decile/percentile) | **2024** | 2026-09-08 — refreshed upstream 2026-09-03 |
| AEAT IRPF *tramos de rendimiento* (`who.irpf.brackets`) | 2023 | — |
| AEAT *Cuentas anuales consolidadas del IS*, by turnover bracket (`who.corp.years`) | 2023 (2024 due 2026-10) | 2026-09-08 — new |
| Eurostat `gov_10dd_edpt1` (EDP debt stock, by instrument and tier) | 2025 | 2026-09-08 |
| Eurostat `gov_10a_main` D41PAY (interest) | 2025 | 2026-09-08 |
| Tesoro bulletin (average life, cost, ladder) | 2026-08 | 2026-09-08 — refreshed |
| Banco de España 11.13 (holders) | 2025-12 | 2026-09-08 |

**Published revenue years are 2012 and 2015-2024.** 2025 has a headline but no per-tax
split, no CONPREL, no foral memoria; 2013-2014 have no Navarrese municipal layer anywhere
the Ministry publishes (CONPREL's table is all zeros; *Haciendas Locales en cifras* leaves
Navarre blank). `merge16.js` drops them and records why in `bundle.dropped`.
The IRPF decile series reached 2024 with AEAT's 2026-09-03 refresh; every overlapping
value of 2003-2023 matched the shipped bundle exactly before the new year was admitted.

Two consequences the pipeline handles explicitly:
- Years with headline but no detailed split route the aggregate into `taxProdPending` /
  `taxIncPending` so the total still reconciles. Never drop the aggregate to keep a
  breakdown tidy.
- `territorial()` sums whatever component sources exist for a year rather than returning
  null when any one is missing; the shortfall lands in the off-map remainder.

### CONPREL changed format in 2024
Files are `.xlsx` from 2024 (openpyxl) and `.xls` before (xlrd 1.2). The region title also
moved — row 2 col 1 in the old files, row 3 col 2 in the new ones — so the resolver scans
a block of cells rather than a fixed one. **CONPREL's `C##` codes are not stable across
years either**: `EL2023C13` is Madrid, `EL2024C13` is Murcia. Always resolve from the title
inside the file.

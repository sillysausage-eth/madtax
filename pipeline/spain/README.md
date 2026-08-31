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
node verify.js             # 97 tie-outs, must be 0 fail
node build_console.js      # -> prototype/console.html
```

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
  - *Navarre and the Basque Country* run foral regimes. State figures there are residual
    and Navarre is **negative** (refunds exceed state collection). Their real data lives
    with their own tax authorities and is not yet integrated.

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

| Source | Latest |
|---|---|
| Eurostat `gov_10a_main` (headline) | 2025 |
| Eurostat `gov_10a_taxag` (per-tax split) | 2024 |
| Eurostat `gov_10a_exp` (COFOG) | 2024 |
| AEAT territorial collection | 2025 |
| IGAE `A_CCAA_Det_YYYY.xlsx` (regional accounts) | 2025 |
| IGAE `COFOG_A_Detalle_CCAA_YYYY.xlsx` (regional spending) | 2024 |
| CONPREL local liquidations (definitive) | 2024 |
| AEAT `DistribucionesIRPF.xlsx` (IRPF by decile/percentile) | **2023** — re-checked 2026-08-31 |
| AEAT IRPF *tramos de rendimiento* (`who.irpf.brackets`) | 2023 |
| Eurostat `gov_10dd_edpt1` (EDP debt stock, by instrument and tier) | 2025 |
| Eurostat `gov_10a_main` D41PAY (interest) | 2025 |

**The IRPF decile series is genuinely stuck at 2023, not missed.** Re-downloaded and
re-extracted on 2026-08-31: the current upstream file (`last-modified 2025-07-01`) still
contains exactly ejercicios 2003–2023, and `merge10.js --deciles=` confirmed every
overlapping value matches the shipped bundle. Sibling files in the same AEAT directory
have been refreshed since, so the folder is live and this one file simply has not moved.
Tax year 2024 is therefore **absent, not zero**: the console clamps to 2023 and shows its
amber stale-year tag for 2024/2025. Nothing is interpolated to cover the gap.

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

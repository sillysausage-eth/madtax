# MadTax — Spain Data Source Map

> Every source below was probed on 2026-08-29. "Verified" means I hit the endpoint or
> page myself and confirmed the response, format and coverage — not that a search result
> claimed it exists.

## Legend

| Grade | Meaning |
|---|---|
| **A** | Machine-readable API or stable file URL, versioned, low-friction. Automate and forget. |
| **B** | Stable bulk files, but Excel/XML/Access — needs a parser and will break on format drift. |
| **C** | PDF or interactive-only. Needs extraction and manual QA. Use as a cross-check, not a primary feed. |

---

## Tier 1 — Revenue (build these first)

### 1.1 Eurostat — government finance statistics · Grade A · **VERIFIED LIVE**
The consolidated, EU-comparable backbone. This is our top-of-tree number and our
independent check on everything else.

```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?format=JSON&geo=ES&unit=MIO_EUR&sector=S13&lang=EN
```

| Dataset | Gives us |
|---|---|
| `gov_10a_main` | Total revenue and expenditure, all national-accounts aggregates |
| `gov_10a_taxag` | Full tax-by-tax revenue decomposition (D2, D5, D61, D91 and every child) |
| `gov_10a_exp` | Expenditure by COFOG function × economic transaction |

Coverage 1995→2024, annual, JSON-stat. Also available by subsector (`S1311` central,
`S1312` regional, `S1313` local, `S1314` social security) — which is exactly how we split
the four tiers consistently. **Confirmed returning Spain 2024 data during research.**

### 1.2 Agencia Tributaria — Annual Tax Collection Report · Grade B/C · **VERIFIED**
`https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informes_anuales_de_Recaudacion_Tributaria.shtml`

Coverage 1999→2025. The report itself is PDF (grade C) but ships Excel annexes (grade B)
that are the actually valuable part:

- Cuadros (main tables) · Revenue by regional delegation · Recognised rights
- **Salary distribution, national and by autonomous community** ← feeds Pillar 2
- **IRPF declaration distribution** ← feeds Pillar 2
- IRPF/IS allocation to the Catholic Church and social purposes

PDF URL pattern: `/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_{YYYY}/IART{YY}_es_es.pdf`

Next annual publication: April 2027 for FY2026.

### 1.3 AEAT collection by region and province · Grade A/B · **VERIFIED (HTTP 200)**
`https://datos.gob.es/en/catalogo/a05003423-recaudacion-tributaria-del-estado-acumulada-comunidades-autonomas-y-provincias-por-periodos`

Monthly and annual from 2007. This is our revenue-geography layer.

### 1.4 IGAE — budget execution · Grade B
`https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadPublica/CPE/EjecucionPresupuestaria/`

Monthly, quarterly and annual execution of the State budget, plus consolidated monthly
non-financial operations for central + regional + social security. Excel and PDF.

### 1.5 Presupuestos Generales del Estado · Grade B
`https://www.sepg.pap.hacienda.gob.es/sitios/sepg/es-ES/Presupuestos/PGE/`

The budget as approved, in both HTML ("serie roja") and **XML with a published schema**
(`PGE_XML_Presupuestos.xsd`) — the XML is the route worth taking, since it carries the
full economic × organic × programme classification tree rather than rendered tables.

### 1.6 Central de Información Económico-Financiera · Grade B/C · **VERIFIED**
`https://www.hacienda.gob.es/es-ES/CDI/Paginas/centraldeinformacion.aspx`

The Ministry's own hub covering all four tiers — national accounting, budgets,
execution, liquidations, fiscal rules, tax collection, debt, personnel and pensions.
Excel, PDF and PowerBI. Best used as a discovery index and cross-check.

### 1.7 INE — Tempus3 statistical API · Grade A · **VERIFIED LIVE**
`https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES` — returns JSON.

Not fiscal data, but essential: population (per-capita figures), GDP (% of GDP), and CPI
(constant-price series). Without this, year toggling is misleading.

### 1.8 Gaps we must close for national completeness
- **Haciendas Forales** (Basque Country, Navarre) — they collect their own taxes and are
  excluded from most AEAT series. Separate portals, no unified API. Needed before we can
  claim any figure is "Spain".
- **Social Security (TGSS)** — €210bn of contributions, absent from AEAT data entirely.
  Sourced via IGAE and the Social Security budget.

---

## Tier 2 — Who contributes

### 2.1 IRPF declarant statistics · Grade B · **VERIFIED (pages exist)**
Three nested granularities, all official, all bracketed — no individuals named:

| Dataset | Granularity |
|---|---|
| `Estadistica_de_los_declarantes_del_IRPF` | National + autonomous community, by income bracket |
| `Estadistica_de_los_declarantes_del_IRPF_por_municipios` | Per municipality |
| `Estadistica_del_IRPF_por_codigo_postal` | **Per postcode**, largest municipalities |

Built from the model 100 return and the model 190 annual summary. Postcode-level income
data is a genuinely strong asset — very few countries publish at that resolution.

### 2.2 Corporate income tax statistics · Grade B · **VERIFIED**
`Estadística de cuentas anuales (no) consolidadas del Impuesto sobre Sociedades`

Census-level, built from every model 200 return. Critically, it publishes **14 turnover
brackets** (*tramos de ingresos*), by sector and by autonomous community, and isolates
**large companies** (turnover > €6,010,121.04). It carries accounting result, adjustments,
tax base and final liability — so we can compute **effective tax rate by company size**
from official figures without modelling anything.

This is exactly the "private companies by revenue bracket" ask, and it is available.

### 2.3 Named companies, lawfully
- **CNMV XBRL filings** (`https://www.cnmv.es/portal/xbrl/`) — annual and interim financial
  statements for every listed issuer, in XBRL and PDF. Gives tax paid per listed company.
  Grade B; XBRL parsing is real work but the payoff is named, audited figures.
- **Art. 95-bis debtors list** — published annually in H1 by AEAT, naming every person and
  company owing more than €600,000. The one lawful named-individual dataset. Grade C
  (PDF), small enough to parse reliably.
- **Registro Mercantil** — full accounts for private companies exist but are paid,
  per-document. Not viable at scale. This is why turnover brackets are the answer for
  private companies.

---

## Tier 3 — Where it goes

### 3.1 Public contracts — PLACSP · Grade B · **VERIFIED (HTTP 200, `application/zip`)**
```
https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3_{YYYY}.zip
https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3_{YYYYMM}.zip
```
Four datasets: tenders from contractor profiles, tenders aggregated from regional
platforms, **minor contracts**, and the contractor-profile registry. Zipped ATOM/XML,
**annual archives 2012→2026**, monthly for the current and previous year, updated daily.
Entry point inside each archive is `licitacionesPerfilesContratanteCompleto3.atom`;
max 500 entries per file; a tender reappears each time it is modified, so ingestion must
**deduplicate by tender ID and keep the latest version**.

> **Operational gotcha found during research:** the TLS chain is issued by FNMT-RCM, which
> is missing from several default trust stores — `curl` on macOS fails with exit 60 while
> OpenSSL verifies fine. The ingestion container must ship the FNMT root explicitly. Do
> not "fix" this by disabling verification.

### 3.2 Grants and subsidies — BDNS API · Grade A · **VERIFIED LIVE, returning real data**
```
https://www.infosubvenciones.es/bdnstrans/api/convocatorias/busqueda?page=0&pageSize=..
https://www.infosubvenciones.es/bdnstrans/api/concesiones/busqueda?page=0&pageSize=..
```
REST, JSON, **no authentication, no published rate limit**. Roughly 10.5 million grant
awards across ~350,000 calls; state sector from 2014, all administrations from 2016.

Each award record carries beneficiary tax ID and name, amount, aid instrument, date, the
granting body at three hierarchical levels, and a link to the legal basis. Confirmed with
a live query returning awards dated the previous day.

**This is the highest-value single source in the whole project** — it is the one place
where public money is published euro-by-euro with a named counterparty, across every tier
of government, through a clean API. Pillar 3's granular layer should be built on it first.

### 3.3 Expenditure by function — Eurostat COFOG · Grade A · **VERIFIED LIVE**
`gov_10a_exp`, described above. Health, defence, education, social protection etc.,
cross-classified by economic transaction, comparable across the EU. Our functional spine.

### 3.4 Local government budgets — CONPREL · Grade B · **VERIFIED**
`https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL`

**2002→2026**, per individual local entity at maximum detail, distinguishing town
councils, provincial councils, island councils and metropolitan areas. Both budgets and
liquidations.

Formats: Excel for aggregates, **Microsoft Access (.mdb) for the per-entity detail**.
Parsing requires `mdbtools`. Awkward but tractable, and it is the only route to
~8,100 municipalities. Expect a 12–24 month lag.

### 3.5 Regional government spending by function — IGAE COFOG · Grade B · **VERIFIED, INGESTED**
```
.../Publicaciones/Documents/CCAA-A/COFOG_A_Detalle_CCAA_{YYYY}.xlsx    # per-community, 2012→2024
.../Publicaciones/Documents/CCAA-A/COFOG_A_CCAA.xlsx                   # aggregate series, 1995→
```
One sheet per autonomous community. COFOG divisions as columns, economic classification
(salaries, goods and services, investment, transfers) as rows, € millions. This is the
source behind the prototype's spending map.

Gotchas: sheet titles vary by year (`Comunitat Valenciana` vs `Comunidad Valenciana`), the
header row floats between rows 5–11, and the multi-year file is **aggregate only** — per
community requires downloading each annual file.

**Tie-out passes exactly**: the published regional aggregate is €268.0bn for 2024, which
equals Eurostat's S1312 figure to the decimal.

### 3.5b Regional government execution — CIMCANET · Grade B
Monthly execution for the autonomous communities, published via IGAE/datos.gob.es. Still
to be ingested; the COFOG files above cover the annual functional view.

### 3.6 EU recovery funds — ELISA · Grade B/C
`https://planderecuperacion.gob.es/ejecucion/elisa-el-plan-en-cifras`
Recovery Plan execution by lever, sector, company size and region. Interactive dashboard;
extraction needed. Worth doing because NextGenEU money is heavily scrutinised.

### 3.7 Discovery — datos.gob.es catalogue API · Grade A · **VERIFIED (HTTP 200, JSON)**
`https://datos.gob.es/apidata/catalog/dataset/publisher/{publisherId}`
Used to monitor for new and changed datasets from AEAT, IGAE and Hacienda rather than
discovering breakage by accident.

---

## Prior art worth knowing

**Civio's *¿Dónde van mis impuestos?*** (`dondevanmisimpuestos.es`) is the incumbent. It
covers central administration and Social Security, budget and execution, built on code
originally opened by Aragón Open Data. It is good, and it defines the bar.

Where MadTax should differ:
1. **Revenue is a first-class product**, not a footnote to spending.
2. **Who pays**, via income and turnover brackets — Civio does not really do this.
3. **Transaction-level traceability** from budget line to named contract and grant.
4. **The Traceability Score** — measuring and publishing the gap, rather than ignoring it.
5. **Bilingual and reusable** for a second country.

---

## Summary of what is genuinely achievable

| Ask from the brief | Verdict |
|---|---|
| Total revenue and all its sources | **Yes**, fully, 1995→2024, four tiers |
| Which taxes raise the most | **Yes**, fully |
| Which income segments contribute most | **Yes** — national, regional, municipal, postcode |
| Which companies contribute most | **Partly** — turnover brackets and sectors officially; named only for listed companies and statutory debtors |
| Which individuals contribute most | **No** — unlawful. Brackets instead, as agreed |
| Expenditure by category | **Yes**, COFOG and national programme tree |
| Expenditure by location | **Yes** for region/province; municipal at 12–24 month lag |
| Expenditure at project level | **Yes** for contracts and grants; ~25–35% of total spend |
| Exact reconciliation of every cent | **No** — not published anywhere. Replaced by the Traceability Score |

# Reconciliation — why the numbers differ

> The question that will be asked most often, answered once, with the arithmetic.
> Live in the prototype as the **lens bridge** ("¿Por qué no cuadra?").

Spain's public finances produce several correct, mutually inconsistent totals for what
sounds like the same thing. This is the single biggest source of misreading in fiscal
journalism, and MadTax's job is to make it obvious rather than to pick one number and hope.

## Who actually generates the revenue

### Income tax — three views of who pays

Spain's statutory IRPF brackets cannot carry a headcount, for three reasons that are
properties of the tax rather than gaps in the data:

- They apply to **taxable base**, not gross income — after the personal allowance and reductions.
- They are **marginal**: everyone with taxable income passes through the lowest band, so a
  per-band population would be cumulative, not a partition.
- There is **no single national scale**. The state sets one half; each autonomous community
  sets the other.

AEAT publishes no distribution against the legal scale — verified down to table 505,
*base liquidable general sometida a gravamen*, which is still cut by AEAT's own income
buckets. So the interface offers three views instead.

**1. Deciles** — ten equal tenths, 1.67m filers each. Exact.

**2. Quintiles** — five equal fifths, merged from decile pairs. Exact, and easier to read:

| Annual income | People | Tax | Avg rate | % of all IRPF |
|---|---:|---:|---:|---:|
| Up to €16,420 | 3,330,186 | €2.6bn | 6.8% | 2.2% |
| €16,420 – €22,477 | 3,330,189 | €7.9bn | 12.0% | 6.7% |
| €22,477 – €29,940 | 3,330,186 | €13.2bn | 15.4% | 11.3% |
| €29,940 – €41,445 | 3,330,184 | €22.5bn | 19.1% | 19.2% |
| **Over €41,445** | 3,330,183 | **€71.4bn** | 27.9% | **60.7%** |

The top fifth of earners pays 60.7% of all income tax.

**3. Madrid bands** — the scale actually applied in the Comunidad de Madrid, state half
plus regional half. Rates are exact; Madrid has the lowest regional scale in Spain.

| Taxable base | State | Madrid | Total marginal |
|---|---:|---:|---:|
| Up to €12,450 | 9.5% | 8.5% | **18.0%** |
| €12,450 – €13,362 | 12.0% | 8.5% | 20.5% |
| €13,362 – €19,005 | 12.0% | 10.7% | 22.7% |
| €19,005 – €20,200 | 12.0% | 12.8% | 24.8% |
| €20,200 – €35,200 | 15.0% | 12.8% | 27.8% |
| €35,200 – €35,426 | 18.5% | 12.8% | 31.3% |
| €35,426 – €57,320 | 18.5% | 17.4% | 35.9% |
| €57,320 – €60,000 | 18.5% | 20.5% | 39.0% |
| €60,000 – €300,000 | 22.5% | 20.5% | 43.0% |
| Over €300,000 | 24.5% | 20.5% | **45.0%** |

That tab also shows how many filers reach each threshold. **Those two columns are the only
estimated figures in MadTax**, interpolated from the decile distribution, and are labelled
as such in the interface — AEAT publishes no headcount at these boundaries, and the scale
applies to taxable base while the distribution is gross income.

### Corporate tax — by company type (AEAT table 8.5, 2023)

| | Profit €bn | Tax base €bn | Tax €bn | Rate on base | Rate on profit |
|---|---:|---:|---:|---:|---:|
| Consolidated groups | 160.0 | 56.4 | 11.5 | 20.5% | **7.2%** |
| Standalone companies | 132.0 | 105.3 | 23.7 | 22.5% | **17.9%** |
| All companies | 292.0 | 161.7 | 35.2 | 21.8% | 12.1% |

Large groups make **55% of the profits but pay 33% of the tax**. The gap is mostly the
double-taxation exemption, which removes €91.0bn of profit before tax is calculated —
subsidiary profit already taxed abroad. This is a legal mechanism, not avoidance, and the
interface says so.

### Social contributions — by payer (Eurostat, 2024)
Employers 72.1% · employees 14.7% · self-employed 6.0% · non-employed 3.5% ·
imputed public sector 3.3% · voluntary 0.4%. Components sum **exactly** to the €210.3bn
total in all 13 years.

**Nearly three-quarters of the largest revenue source in Spain is paid by employers**, and
it appears on a payslip as employer cost rather than a deduction — so almost nobody
experiences it as their own tax.

### What is not published
- **VAT and excise by income level** — no official statistic exists. Described, never estimated.
- **Named private companies** — Art. 95 LGT. Turnover and company-type brackets instead.
- **Named listed companies** — obtainable from CNMV filings; not yet ingested.

## Total revenue and its 17 parts

Every euro of public revenue lands in exactly one part. The parts are mutually exclusive
and exhaustive: they sum to the published total with a residual of **zero**, in every year
from **2012 to 2025**. This is asserted by `verify.js` group H.

### Data vintage, and why 2025 looks different
Eurostat publishes the headline aggregates (`gov_10a_main`) about a year ahead of the
detailed per-tax split (`gov_10a_taxag`) and COFOG (`gov_10a_exp`). As of August 2026:

| Series | Latest year |
|---|---|
| National headline revenue and expenditure | **2025** |
| Detailed tax split (VAT, income tax, corporate…) | 2024 |
| COFOG expenditure by function | 2024 |
| AEAT state collection by territory | 2025 |
| IGAE regional accounts by community | 2025 |
| CONPREL local liquidations | 2024 |

So 2025 carries two extra parts — **`taxProdPending`** and **`taxIncPending`** — holding
the production-tax and income-tax aggregates whose breakdown Eurostat has not yet
released. The fine parts are zeroed in that year, the aggregates are not dropped, and the
total still reconciles to the euro. The interface labels both blocks "detalle pendiente"
and the timeline dims years lacking full detail. The harness asserts that pending years
carry the aggregate with fine parts zeroed, and that detailed years carry zero in the
pending blocks.

Spain 2023 (Eurostat national accounts, ESA 2010):

| # | Part | What is actually in it | € bn | % |
|--:|---|---|---:|---:|
| 1 | Social contributions | Employer and employee payments into Social Security | 197.0 | 31.3% |
| 2 | Personal income tax | Wages, pensions, self-employment, savings income | 134.4 | 21.3% |
| 3 | VAT | Value added tax on consumption | 96.0 | 15.2% |
| 4 | Corporate income tax | Tax on company profits | 43.5 | 6.9% |
| 5 | Fees, charges and sales | Tuition, co-payments, admissions, licences, sales of public services | 32.5 | 5.2% |
| 6 | Excise duties | Fuel, tobacco, alcohol, electricity, coal | 23.9 | 3.8% |
| 7 | European funds | Transfers received from the EU: cohesion, farm support, Next Generation | 21.4 | 3.4% |
| 8 | Transfer, insurance, gambling and registration taxes | Property transfer and stamp duty, insurance premiums, gambling, vehicle registration | 18.3 | 2.9% |
| 9 | Property income | Interest, dividends from public companies, rents | 14.2 | 2.3% |
| 10 | Property tax (IBI) | Municipal tax on land and buildings | 14.0 | 2.2% |
| 11 | Business rates and other production taxes | Business activity tax, environmental levies | 13.4 | 2.1% |
| 12 | Other transfers received | Current and capital transfers not from the EU | 10.5 | 1.7% |
| 13 | Inheritance and gift tax | Inheritances, gifts, other capital levies | 5.6 | 0.9% |
| 14 | Wealth, vehicle and other current taxes | Wealth tax, household vehicle tax | 5.2 | 0.8% |
| 15 | Import duties | Customs duties on imported goods | 0.3 | 0.0% |
| | **TOTAL PUBLIC REVENUE** | | **630.2** | **100%** |

### How exclusivity is guaranteed
The parts are built from the ESA hierarchy by taking each leaf exactly once and
subtracting children from parents where a parent would otherwise double count:

```
excise            = D214A
other product tax = D214 − D214A          ← excise removed from its parent
property tax      = D29A
other production  = D29  − D29A           ← property tax removed from its parent
personal income   = D51A_C1
corporate income  = D51B_C2
other current     = D59 + (D51 − D51A_C1 − D51B_C2)
inheritance       = D91
EU funds          = D7REC_S212 + D9REC_S212
other transfers   = (D7REC + D9REC − D91) − EU funds   ← capital taxes and EU removed
```

Structural checks confirm the hierarchy before the split is applied:
`D211+D212+D214+D29 = D2`, `D51+D59 = D5`, `personal+corporate = D51`,
`D2+D5+D91 = total tax`. All pass.

## The map adds up to the topline

Selecting any part shows its territorial split on the map, plus **off-map cards** for the
share with no territory. Regions + cards = the national figure, for every part and every
year — 208 combinations checked, zero failures.

| Card | 2023 | Why it has no territory |
|---|---:|---|
| Social Security | €197.0bn | Collected by the Social Security Treasury, which publishes national figures only |
| European Union | €21.4bn | The Commission pays the **Member State**, not the communities |
| Rest with no regional split | €103.0bn | Central government property income, non-EU transfers, customs, Basque and Navarrese foral collection, and the cash-vs-accrual difference |
| **On the map** | **€308.8bn** | State, regional and local taxes with a territorial source |
| **= National total** | **€630.2bn** | |

Property tax is **96.7% mapped**; social contributions and EU funds are 0% mapped by
construction, and the harness asserts both.

## Two levels, and the rule that separates them

**National is complete. Territorial is a subset.** Anything that cannot honestly be
assigned to one community lives only at the top level and never appears on the map.

### The national topline — every year 2012–2024, complete

Spain 2023, from Eurostat national accounts (ESA 2010). The identity holds exactly in
every year:

| | € bn |
|---|---:|
| Taxes — income, VAT, corporate, excise, transfer, property, all of them | 354.5 |
| + Social contributions — Social Security, the largest single source | 197.0 |
| + Fees, charges and sales | 32.5 |
| + Property income — public interest, dividends, rents | 14.2 |
| + Transfers received — *includes EU funds* | 32.0 |
| **= Total public revenue** | **630.2** |
| ▸ of which attributable to a territory (the map) | 318.8 |
| ▸ of which not attributable to any territory | 311.4 |

Roughly **half of all public revenue has no regional split at all**, and saying so plainly
is more useful than a map that quietly omits it.

### Why EU funds are a national figure, not a map layer
The European Commission pays the **Member State**, not the autonomous communities. Money
enters the Spanish budget circuit and is then distributed to managing authorities — which
are sometimes regional, sometimes central. Cohesion Open Data does attribute spending to
NUTS2 regions, but that is *where money was spent*, not *who was paid*. Putting it on the
map would imply Brussels writes cheques to Andalusia. It doesn't. €15.0bn in 2023, shown
as a national inflow inside "transfers received".

The same rule removed social contributions from the map: €197bn, national only.

## Unified territorial revenue (what the map does carry)

Which administration collects a tax is an administrative detail, not something a citizen
should have to learn. The console's headline is therefore **everything raised in a
territory**, assembled from four sources chosen so they cannot overlap:

| Component | Source | Coverage | 2022 |
|---|---|---|---:|
| State taxes collected in the territory | AEAT via ISTAC | 2007–2025 | €248.3bn |
| Regional own-managed taxes — transfer, inheritance, wealth, gambling, IGIC | IGAE national accounts by community | 2012–2024 | €24.6bn |
| Local taxes — property (IBI), vehicles, capital gains, business rates, construction | CONPREL, per community | 2019–2023 | €20.8bn |
| Local fees, charges and fines | CONPREL chapter 3 | 2019–2023 | €9.1bn |
| **Total raised** | | **complete 2019–2022** | **€302.7bn** |
| *EU funds received* — inbound, not raised here | EU Cohesion Open Data by NUTS2 | 2012–2022 | *€8.1bn* |

### Why these cannot double count
Both the regional and local accounts contain **their share of national taxes**, already
inside AEAT's territorial figure:

- **Regional**: `D.51` is the community's ceded share of income tax — €9.3bn for Andalusia
  alone. Excluded. Only taxes the region itself manages are counted.
- **Local**: accounts `100/101/102` (income, corporate) and `210/220.xx` (VAT, excise) are
  the municipal share of state taxes — €19.3bn nationally in 2023. Excluded.

Adding the published chapter totals naively would have overstated revenue by roughly
€50bn. `verify.js` group H asserts the components sum exactly to the published total, that
EU funds sit outside it, and that a year with any component missing publishes **no** total
rather than a partial sum.

### The one big gap: social contributions
Roughly **€210bn a year** — the largest single source of public revenue — is **not
published by territory**. TGSS reports nationally only. It is recorded as
`coverage.social = null`, surfaced as a permanent advisory in the interface, and asserted
by the harness to be a declared gap rather than a silent zero. Including it would mean
modelling from affiliation counts and average contribution bases: our estimate, not an
official figure. That remains a deliberate choice, not an oversight.

## Revenue, 2024 — the lens ladder

| | € bn | |
|---|---:|---|
| AEAT state tax collection | **294.7** | cash basis, common territory — *what the map shows* |
| + Taxes AEAT does not collect | 86.6 | foral (Basque Country, Navarre) + regional (transfer, inheritance, wealth) + local (property, vehicle, capital gains) |
| **= All tax receipts, all tiers** | **381.3** | accrual, Eurostat `D2 + D5 + D91` |
| + Social contributions | 210.3 | collected by Social Security, absent from all AEAT data |
| **= Taxes + social contributions** | **591.7** | |
| + Non-tax revenue | 82.0 | fees, sales, fines, property income, EU transfers |
| **= Total general government revenue** | **673.7** | Eurostat `gov_10a_main`, S13 |

Three separate reasons the first line is not the last:
1. **Scope** — AEAT collects for the State. Regions and councils levy their own taxes.
2. **Territory** — the Basque Country and Navarre collect their own under the *Concierto*
   and *Convenio Económico*, and pay a quota to the State. They are largely absent.
3. **Basis** — AEAT reports cash received; national accounts report accrued entitlement.

Add a fourth that bites in the other direction: much of the €294.7bn AEAT collects is
subsequently **handed to the regions** under the financing system. It is state *collection*,
not state *income*.

## Spending, 2024

| Tier | € bn | |
|---|---:|---|
| Central government (S1311) | 357.7 | |
| Regional government (S1312) | **268.0** | *what the map shows* — runs health and education |
| Local government (S1313) | 97.1 | |
| Social security funds (S1314) | 252.8 | pensions and benefits |
| Sum of tiers | 975.6 | |
| **Consolidated total (S13)** | **725.0** | after eliminating ~€250bn of transfers between tiers |

**Never sum the tiers.** Central government's "general public services" alone appears as
€253.1bn unconsolidated, most of which is money handed to the regions and then spent again
by them. Consolidated, that function is €92.6bn.

## Spending: sub-functions and who actually spends it

### Granularity
Eurostat publishes 69 COFOG sub-functions for Spain, and they sum to their divisions
exactly in all 130 division-years checked. Social protection stops being an abstraction:

| Social protection €297.5bn (2024) | € bn |
|---|---:|
| Old-age pensions | 165.1 |
| Sickness and disability | 44.0 |
| Survivor pensions | 35.4 |
| Unemployment | 24.1 |
| Family and children | 15.3 |
| Social exclusion | 10.9 |
| Other, housing, R&D | 2.8 |

**Old-age pensions alone are the largest single spending line in the Spanish state** —
larger than all health spending, and 23% of everything government spends.

Health splits into hospital services €43.7bn, outpatient €37.3bn, medical products
€15.1bn. General public services is 43% debt interest (€39.6bn).

### Who spends it, and what has no region
Every function decomposes as **map (regional) + Social Security + central + local +
consolidation adjustment = national**, checked across 143 function-years with zero
failures. The adjustment is zero everywhere except general public services, which is where
central government books the money it hands to the regions.

| Function 2024 | National | On map | Social Security | Central | Local |
|---|---:|---:|---:|---:|---:|
| Social protection | 297.5 | 19.1 | **238.8** | 29.5 | 10.0 |
| Health | 102.9 | **96.5** | 2.0 | 3.6 | 0.9 |
| General public services | 92.6 | 49.3 | 8.8 | 253.1* | 32.1 |
| Economic affairs | 80.9 | 25.5 | 3.1 | 34.1 | 18.1 |
| Education | 65.9 | **59.8** | 0.0 | 2.7 | 3.4 |
| Public order and safety | 28.6 | 7.0 | 0.0 | 15.0 | 6.6 |
| Recreation and culture | 19.2 | 4.3 | 0.0 | 3.4 | 11.5 |
| Environment | 15.5 | 3.5 | 0.0 | 2.0 | 10.1 |
| **Defence** | **14.2** | **0.0** | 0.0 | **14.2** | 0.0 |
| Housing and communities | 7.6 | 3.1 | 0.0 | 0.2 | 4.3 |

\* offset by the −€250.8bn consolidation adjustment, which is entirely within this row.

Defence is the clean case: 100% central, nothing on the map, and the interface says so
with a single off-map card rather than an empty map.

## Where spending actually goes, 2024

| COFOG function | € bn | Regional share |
|---|---:|---:|
| Social protection | 297.5 | 6% (mostly Social Security) |
| Health | 102.9 | **94%** |
| General public services | 92.6 | — |
| Economic affairs | 80.9 | 32% |
| Education | 65.9 | **91%** |
| Public order and safety | 28.6 | 24% |
| Recreation and culture | 19.2 | 22% |
| Environment | 15.5 | 23% |
| Defence | 14.2 | 0% |
| Housing and communities | 7.6 | 41% |

Health and education are almost entirely regional. That is why the spending map is a map
of regional governments — it is the tier a citizen actually meets.

## Is €725bn plausible at all?

Four independent sanity checks, all passing:

| Check | Result |
|---|---|
| Expenditure as % of GDP | 45.5% (GDP €1,594.3bn) — normal for Spain; EU average ~49% |
| Revenue as % of GDP | 42.3% |
| Deficit as % of GDP | 3.2% — matches Spain's officially reported 2024 deficit |
| Accounting identity `TR − TE = B9` | holds exactly |
| Spending per resident | €14,918 |

## The tie-out harness

`pipeline/spain/verify.js` — **30 checks, currently 30 pass / 0 fail**. Run it from the
repo root or from `pipeline/spain/`; it exits non-zero on any failure, so it can gate a
build. Groups:

- **A. Headline identities** — the deficit identity and every ratio inside a plausible band.
- **B. No double counting** — asserts the published headline equals the *consolidated*
  S13 figure and explicitly is **not** the sum of the four tiers (€975.7bn).
- **C. COFOG consistency** — the ten functions must sum to the total, every year.
- **D. Regional tie-out** — the 17 communities must sum to Eurostat S1312, and each
  region's own functions must sum to its own total.
- **E. Revenue tie-out** — every tax head must sum back to the AEAT total, and the
  regional gap must be disclosed rather than closed.
- **F. Bridge arithmetic** — every rung of both ladders must actually add up.
- **G. No silent nulls** — missing cells must be exactly the two expected ones.

### Two real defects this harness caught

1. **€11.5bn of revenue was missing.** The prototype showed five tax heads (income,
   corporate, VAT, excise, fees) summing to €283.2bn against a €294.7bn total. Four real
   source lines had been dropped: non-resident income tax (€4.0bn), customs duties
   (€2.6bn), other indirect (€3.3bn) and other direct (€1.5bn). They are now carried as an
   **Otros** head built from the actual source lines — *not* plugged as a residual — and
   test E asserts the sum ties to 0.1%.

2. **The spending ladder implied the tiers added up.** It showed four tiers with `+` and
   then `=` the consolidated total, which is false by €250.7bn. It now shows the tier sum
   explicitly, flagged **"NOT public spending — counts transfers twice"**, then subtracts
   the eliminations to reach €725.0bn.

| Check | Result |
|---|---|
| Sum of 17 regions vs IGAE published regional aggregate | €268.1bn vs €268.0bn — **pass** |
| IGAE regional aggregate vs Eurostat S1312 | **exact** |
| COFOG divisions vs total, 2012/2020/2024 | **exact** |
| AEAT tax heads vs total, 2012/2019/2024 | **exact** (after fix 1) |
| Bridge ladder end value vs Eurostat S13 revenue | €673.7bn — **exact** |
| Sum of regions vs AEAT national collection | €285.2bn vs €294.7bn — **€9.5bn unallocated**, published as a figure rather than smoothed away |

## Known gaps
- **Foral revenue** is not yet integrated; Basque and Navarrese state figures are residual
  and Navarre is negative. Their own tax authorities publish the real data separately.
- **Ceuta and Melilla** have no regional government; their spending sits in local
  government and is absent from the regional map by construction, not by omission.
- **Regional spending is not the whole story for a territory** — it excludes what the
  State, Social Security and councils spend there. Pensions, notably, do not appear.

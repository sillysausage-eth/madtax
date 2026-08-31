# MadTax — Scope & Requirements (v1, Spain)

> Status: draft for approval · Owner: Alex · Last updated: 2026-08-29

## 1. What MadTax is

A public transparency dashboard that lets a citizen answer, without any prior knowledge
of public accounting:

1. **How much money does my government take in, and where does it come from?**
2. **Who actually pays it?**
3. **Where does it go, and can I follow it to the end?**

Spain is the pilot country. Every design decision must be checked against the question
"does this generalise to country #2?" — but we optimise for Spain first and refactor for
generality when we actually have a second country.

## 2. Agreed direction

| Decision | Choice |
|---|---|
| Build order | **Revenue first**, top-down: totals → sources → composition. Expenditure second. |
| Government tier | **Central government first**, then Social Security, then CCAA, then local. |
| Depth strategy | Start at the top of the tree, deepen progressively. Ship a correct shallow layer before an incorrect deep one. |
| Individuals | **Never named.** Income brackets, deciles and other objective segments only. |
| Companies | Named where lawfully public (listed-company filings, recipients of public money, statutory debtor lists). Otherwise revenue/turnover brackets. |
| Stack | Next.js (web) + Supabase/Postgres (data) + Python (ingestion). |
| Languages | Bilingual `es-ES` (default) and `en`, built in from day one. |
| Audience | A curious citizen on a phone. Analysts and journalists are a welcome secondary audience, never the primary one. |

## 3. The three product pillars

### Pillar 1 — Revenue
Total public revenue for a chosen year, decomposed into every source: taxes, social
contributions, fees, fines, property income, asset sales, EU transfers. Toggle across
years, in nominal and real terms, absolute and per-capita and as % of GDP.

**Anchor (verified from Eurostat, 2024, general government):**

| | € bn |
|---|---:|
| Total revenue | **673.7** |
| — Taxes and social contributions | 591.7 |
| — — Total tax receipts | 381.3 |
| — — — Taxes on income, wealth (D5) | 198.7 |
| — — — — Personal income (IRPF-equivalent) | 145.9 |
| — — — — Corporate income (IS-equivalent) | 47.5 |
| — — — Taxes on production & imports (D2) | 176.9 |
| — — — — VAT | 102.5 |
| — — — — Excise duties | 26.5 |
| — — Net social contributions | 210.3 |
| — Non-tax revenue (residual) | ~82.0 |
| Total expenditure | 725.0 |
| **Deficit** | **−51.3** |

Two things this table already tells us, and which most Spanish "where do my taxes go"
sites get wrong:
- **Social contributions are the single largest revenue line (€210bn).** Any dashboard
  built only on Agencia Tributaria data silently omits a third of public revenue.
- **The government spends more than it receives.** Revenue and expenditure views must
  never be presented as two halves of the same pie, or the deficit disappears.

### Pillar 2 — Tax breakdown (who contributes)
- **By tax**: which taxes raise the most, in level and in change over time.
- **By income segment**: number of taxpayers, income declared and tax paid per income
  bracket; effective average rate by bracket. Available nationally, by autonomous
  community, by municipality, and by postcode for the largest cities.
- **By company segment**: number of companies, profit, tax base and tax paid per
  turnover bracket (14 official brackets), by sector and by region; large companies
  (turnover > €6,010,121.04) isolated as their own class.
- **By named company**, only where lawful: listed companies' tax paid from their own
  filings; the statutory list of debtors owing more than €600,000.
- **By geography**: revenue collected per province and autonomous community.

### Pillar 3 — Expenditure breakdown (where it goes)
- **By purpose**: COFOG functional classification (health, defence, education, pensions…)
  and Spain's own policy/programme tree.
- **By economic nature**: staff costs, goods and services, interest, transfers, investment.
- **By body**: ministry → agency → programme.
- **By place**: autonomous community, province, municipality.
- **By transaction**: individual contracts and individual grants, with named counterparties.

## 4. Hard constraints — read before promising anything

These are not implementation difficulties; they are properties of the world. The product
must be designed around them rather than pretending they don't exist.

### 4.1 "Every single cent" is not achievable, and we should say so loudly
Spain does not publish its general ledger. What it publishes is:
- budget lines and their execution (aggregated), plus
- certain **classes** of individual transaction: public contracts above the minor-contract
  threshold, and grants/subsidies.

Public payroll (~€150bn) and pensions and social transfers (~€200bn+) are published only
in aggregate — and individual pensions *should* never be published. Contracts and grants
together plausibly account for something in the region of a quarter to a third of total
expenditure.

**Our answer: the Traceability Score.** For every branch of the spending tree we display
what share is traceable down to named transactions, and we name the rest honestly
("€X of this programme is salaries, published only as a total"). Turning the gap into a
visible, measurable metric is more useful — and more defensible — than a fake euro-exact
reconciliation. It also creates a campaigning artefact: a ranked list of the least
traceable spending in Spain.

### 4.2 Individual tax data is protected by law
Article 95 of the *Ley General Tributaria* makes individual tax data confidential. There
is exactly one statutory exception: Art. 95-bis, the annual list of debtors owing more
than €600,000, which names both people and companies. We use brackets and segments
everywhere else. This matches the direction already agreed.

### 4.3 There is no single true number for "revenue"
The same underlying reality produces materially different totals depending on the lens:

| Lens | What it measures | Rough 2024 scale |
|---|---|---|
| National accounts (SEC 2010), general government | All four tiers consolidated, accrual basis | €673.7bn |
| Central government budget | The State's own budget, cash/obligations basis | far smaller |
| Agencia Tributaria collection | What the tax agency banked, cash basis | ~€290bn |

They differ because of: **transfers to regions** (much of what AEAT collects is handed to
the autonomous communities and municipalities under the financing system, via advance
payments and a definitive settlement two years later); **the foral regimes** (the Basque
Country and Navarre collect their own taxes and pay a quota to the State, so they are
absent from most AEAT series); **social contributions** (collected by Social Security, not
AEAT); and **cash versus accrual**.

**Our answer: `perspective` is a first-class dimension of the data model.** Every figure
in MadTax carries the lens it was measured through, and the UI never mixes two lenses in
one chart without saying so. This is the single most important accuracy decision in the
project.

### 4.4 Fiscal data is revised
Published figures change after the fact. We store a `vintage` on every observation so
that a chart someone screenshotted in March still explains itself in November.

### 4.5 Data lag varies enormously by tier
Central government executes monthly with roughly a one-to-two month lag. Municipal
liquidations arrive one to two years later. The UI must show data age per view rather
than implying everything is equally fresh.

## 5. Out of scope for v1
- Countries other than Spain (architecture stays country-agnostic; content does not).
- Forecasting, or any modelled/estimated figure presented alongside official ones. If we
  add modelling later it goes in a visually distinct, clearly-labelled layer.
- Political commentary, party attribution, or editorialising.
- User accounts, personalisation stored server-side, or anything that collects a salary
  figure a visitor types in. The "what this means for me" calculator runs entirely in the
  browser and stores nothing.

## 6. What "done" looks like for v1
1. A visitor lands, sees Spain's total revenue for a chosen year, and can drill from
   €673.7bn down to any published sub-component without ever hitting a dead end or an
   unexplained number.
2. Every figure on screen has a one-click path to the exact source file, table and
   download date that produced it.
3. Year toggling works across the entire revenue tree, in nominal, real and per-capita terms.
4. Automated tie-out tests prove our totals equal the officially published totals, and the
   build fails if they drift.
5. It is genuinely pleasant on a phone.

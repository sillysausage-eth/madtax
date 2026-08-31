# MadTax

**A public transparency dashboard for national public finances.** Where the money comes
from, who contributes it, and where it goes — for any citizen, without prior knowledge of
public accounting.

Pilot country: **Spain**. The architecture is country-agnostic; the content is not, yet.

## Status

Planning complete, pre-implementation.

| Document | What it covers |
|---|---|
| [Scope & requirements](docs/01-scope.md) | What we're building, the agreed direction, and the hard constraints we design around |
| [Data source map](docs/02-data-sources.md) | Every Spanish source, graded and verified, with what each one can and cannot answer |
| [Implementation plan](docs/03-implementation-plan.md) | Architecture, accuracy programme, UX, and phasing |
| [UI/UX direction](docs/04-ui-ux.md) | The OPEN SOURCE visual system, and what the prototype does |
| [Reconciliation](docs/05-reconciliation.md) | Why €294.7bn, €381.3bn and €673.7bn are all correct |
| [Source registry](data/registry/sources.yml) | Machine-readable source definitions that drive ingestion |

## The three pillars

1. **Revenue** — every source of public money, from taxes to fees to EU transfers.
2. **Who contributes** — by tax, by income bracket, by company turnover bracket, by place.
   Never by named individual: Spanish tax law forbids it, and it's the right call anyway.
3. **Where it goes** — by purpose, by body, by place, and down to individual contracts and
   grants with named recipients.

## Two things worth knowing up front

**No country publishes every cent.** Spain publishes budget lines plus certain classes of
individual transaction (contracts, grants) — not its general ledger. Instead of faking a
complete reconciliation, MadTax publishes a **Traceability Score** for every branch of
spending: how much is traceable to named transactions, and an honest account of the rest.

**There is no single true number for "revenue."** National accounts, the central
government budget, and tax-agency collection measure different things and disagree by
hundreds of billions. Every figure in MadTax carries the lens it was measured through, and
the site never mixes two lenses in one chart without saying so.

## Anchor figures (Spain 2024, general government, source: Eurostat)

| | € bn |
|---|---:|
| Total revenue | 673.7 |
| Total expenditure | 725.0 |
| Deficit | −51.3 |
| Taxes and social contributions | 591.7 |
| — Social contributions | 210.3 |
| — Personal income tax | 145.9 |
| — VAT | 102.5 |
| — Corporate income tax | 47.5 |

## Verification

```bash
node pipeline/spain/verify.js
```
76 tie-out checks over the published bundle — accounting identities, no-double-counting
assertions, COFOG and regional sums, bridge arithmetic. Exits non-zero on failure.
Currently **76 pass / 0 fail**.

## Prototype

`prototype/console.html` — a working tactical console with **both layers on real data**:

- **Revenue** — total public revenue split into **exhaustive, non-overlapping parts** that
  sum to the published total with zero residual, every year **2012–2025**. Map shows the
  territorial split of any part; off-map cards carry the rest, so regions + cards always
  equal the national figure. Every region and every off-map card opens a full tax breakdown.
- **Spending** — general government by COFOG function drilling into **69 sub-functions**
  (old-age pensions, hospital services, debt interest…), with off-map cards for spending
  that has no region: Social Security, central government (defence, debt), councils.
- **Lens bridge** — an on-screen reconciliation from €294.7bn to €673.7bn, and from
  €725.0bn to the regional tier the map shows.

Three metrics, year scrubber, bilingual ES/EN, keyboard navigable. One self-contained
133KB file, no dependencies. Open it in a browser.

Pipeline that produced its data: `pipeline/spain/` (read its README before rerunning —
the source has several traps).

## Getting started

Not yet scaffolded. See [the plan](docs/03-implementation-plan.md#part-d--phasing) for
Phase 0. Copy `.env.example` to `.env.local` and fill in Supabase credentials when it is.

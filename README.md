# MadTax

**A public transparency dashboard for national public finances.** Where the money comes
from, who contributes it, and where it goes — for any citizen, without prior knowledge of
public accounting.

Pilot country: **Spain**. The architecture is country-agnostic; the content is not, yet.

## Status

Migration to Next.js complete — see [Web app](#web-app). All three consoles — revenue,
spending and debt — are live. Revenue is published for 2012 and 2015-2024, spending for
2012-2024, debt for 1995-2025; every published year is complete for every community, and
the years that are not (2013-2014, 2025) are dropped with their reasons recorded in the
bundle rather than shown with holes.

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
Tie-out checks over the published bundle — accounting identities, no-double-counting
assertions, COFOG and regional sums, bridge arithmetic, debt perimeters and stamps. Exits
non-zero on failure. Currently **156 pass / 1 warn / 0 fail**.

It is also the build gate: `npm run build` runs it first (`prebuild`), so a bundle that
fails a tie-out cannot produce a site — locally or in CI.

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

## Web app

The production site is a Next.js 16 app at the repo root (`src/`). It was ported from the
prototype milestone by milestone and has since moved past it: `prototype/console.html`
is **frozen at the pre-foral bundle** and is no longer the reference — the app's own
tie-outs (`pipeline/spain/verify.js`) are. Nothing in `pipeline/` or `data/` is edited to
make the app easier to write.

All three consoles are ported: **revenue** (map, off-map coins, dossier, composition ring
with the ESA drill and the who-pays tables), **spending** (COFOG composition and its 69
sub-functions, regional spending map, the four remainder coins, per-region dossier) and
**debt** (stock, five stats, the 31-year debt/GDP trend, four rings, the 28-year maturity
ladder). Debt is behind a flag and off in production builds — see [Feature flags](#feature-flags).

### Dev loop

```bash
npm install
npm run dev            # http://localhost:3000 → /es/revenue
```

`predev` splits the bundle if `src/data/generated/` is missing; it does not re-run the
156 tie-outs on every restart. `npm run build` does, through `prebuild`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `data:verify` → `data:split` → `next build` |
| `npm run lint` | ESLint (app only; `pipeline/`, `prototype/`, `data/` are ignored) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run data:verify` | `node pipeline/spain/verify.js` — the 156-check gate |
| `npm run data:split` | Bundle → `src/data/generated/*.json` |

### How data reaches the screen

```
pipeline/spain/*            extractors and merges (read-only here)
  └─ data/derived/es-fiscal-bundle.json      the single source of truth, committed
       └─ pipeline/spain/verify.js           156 tie-outs — the gate
            └─ scripts/split-bundle.mjs      partition, no arithmetic
                 └─ src/data/generated/{map,revenue,spending,debt,who,meta}.json
                      └─ src/app/[locale]/{revenue,spending,debt}   static pages
```

`src/data/generated/` is **gitignored**: the bundle stays the only committed data artifact,
and each route code-splits on its own section. The split performs no arithmetic, rounding
or defaulting — a key missing from the bundle fails the build loudly rather than rendering
an empty panel. The site reads no database at runtime or build time.

Routing is path-prefix locales with no middleware — `/` → `/es` → `/es/revenue`; `es` and
`en` are prerendered. UI strings live in `src/i18n/{es,en}.ts`, extracted verbatim from the
prototype's `T` table.

Copy `.env.example` to `.env.local` for Supabase credentials. The V1 app makes zero
PostgREST calls; the DB is a mirror (see the migration plan).

### Modes

| Route | What it shows | State in the URL |
|---|---|---|
| `/[locale]/revenue` | Public revenue by component, its territorial split, and who generates each one | `?y=` year · `?r=` region or coin · `?f=` component |
| `/[locale]/spending` | General-government spending by COFOG function and its regional tier | `?y=` year · `?r=` region or coin · `?f=` function |
| `/[locale]/debt` | What is owed on one reference date, to whom, when it falls due and at what rate | none — debt is a stock, so the screen carries no fiscal year and no picker |

Console state travels through `history.replaceState`, not the router: the App Router has no
shallow navigation, so `router.replace` would remount the island and leave the console an
interaction behind the reader. Spanish writes a plain year everywhere; "FY" is an English
accounting habit and says nothing to a Spanish reader.

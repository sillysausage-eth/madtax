# MadTax — Implementation Plan

> Two tracks run in parallel and meet at the API boundary: **the pipeline** (getting
> numbers right) and **the product** (making them feel obvious). Neither waits for the
> other. The contract between them is the published aggregate schema, agreed in Phase 0.

---

# Part A — Architecture

## A.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Web | **Next.js 15, App Router, TypeScript, Tailwind** | Server components mean charts arrive as HTML, not as a JS bundle that then fetches. Best-in-class i18n routing for `es`/`en`. |
| Charts | **visx + d3-scale**, hand-composed | Chart libraries fight you the moment you want a custom drill interaction. visx gives d3 power with React ergonomics and no runtime chart engine. |
| Database | **Supabase (Postgres 15+)** | Postgres with `ltree` for the classification hierarchies, `pg_trgm` + `tsvector` for counterparty search, PostgREST for zero-effort read APIs, RLS to make everything public-read and nothing writable. |
| Object storage | **Supabase Storage** | Immutable archive of every raw source file we ever downloaded. This is what makes provenance real rather than aspirational. |
| Scheduling | **Supabase `pg_cron` + Edge Functions** for triggers; **GitHub Actions** for the heavy ETL runs | Long-running Access/XML parsing does not belong in an edge function. |
| Ingestion | **Python 3.13** (`httpx`, `polars`, `lxml`, `openpyxl`, `mdbtools`) | Every source is Excel, XML or Access. This is Python's home turf, and polars handles the multi-million-row contract/grant tables comfortably. |
| Analytics build | **DuckDB** in CI | Runs the aggregation and reconciliation queries over Parquet during the build, emits both the static JSON bundles and the Postgres load files. Fast, zero infra. |
| Hosting | **Vercel** | Matches Next.js, edge caching for the static aggregates. |

**The performance shape that matters:** roughly 95% of page views hit precomputed
aggregates. Those are built in CI into static JSON per `(year, perspective, node)` and
served from CDN — no database in the request path at all. Supabase is queried only for
the long tail: individual contract and grant search, counterparty pages, and municipal
detail. This is why the site will feel instant on a phone on mobile data, which is the
actual target environment.

## A.2 Data model

The whole design turns on one idea from the scope doc: **a number is meaningless without
its lens.** So `perspective` is not metadata, it is part of the primary key.

```
dim_perspective   gg_sec2010 | central_budget | aeat_cash | ss_budget | ccaa_budget | local_budget
dim_basis         accrual | cash | obligations_recognised | rights_recognised
dim_stage         budget_initial | budget_final | executed
dim_tier          central | regional | local | social_security | consolidated
```

Hierarchical dimensions, all bilingual, all using Postgres `ltree` for
ancestor/descendant queries in one indexed hop:

```
dim_entity      ministry → agency → unit          (organic classification)
dim_economic    chapter → article → concept → subconcept
dim_function    COFOG group → class  ·  policy → programme → subprogramme
dim_geo         country → CCAA → province → municipality   (INE + NUTS codes)
dim_tax         mapped to national-accounts codes (D2, D51, D211, D61 …)
dim_segment     income brackets · turnover brackets · company size class
```

Three fact tables:

```sql
fact_flow (                       -- the spine: revenue and expenditure
  flow_type, perspective, basis, stage, year, period,
  entity_id, economic_id, function_id, geo_id, tax_id,
  amount_eur numeric(18,2),
  vintage date,                   -- publication date of this figure
  extraction_id                   -- → exact source file, sheet, cell
)

fact_segment (                    -- who pays: brackets, never people
  year, segment_id, tax_id, geo_id,
  taxpayers bigint, income_declared numeric, tax_paid numeric,
  effective_rate numeric generated,
  vintage, extraction_id
)

fact_transaction (                -- named euros: contracts and grants
  txn_type,                       -- contract | grant
  source_ref,                     -- PLACSP tender id | BDNS award id
  awarding_entity_id, counterparty_id,
  amount_eur, awarded_on, cpv_code, geo_id,
  function_id,                    -- mapped, with a confidence score
  version, superseded_by,         -- PLACSP republishes on every modification
  vintage, extraction_id
)
```

Provenance, which is not optional:

```sql
src_source      (id, name, publisher, url_pattern, grade, licence, cadence)
src_snapshot    (id, source_id, fetched_at, url, sha256, storage_path, bytes)
src_extraction  (id, snapshot_id, locator)   -- "sheet 'Cuadro 3', row 14, col F"
```

Every single figure MadTax displays joins back through `extraction_id` to a file we still
hold, with a checksum. If we cannot show a citizen where a number came from, we do not
publish the number.

## A.3 Where credentials go

Three places, and nothing sensitive is ever committed:

**1. `.env.local` — local development** (git-ignored; `.env.example` is committed as the
template):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>     # public by design, RLS-protected
SUPABASE_SERVICE_ROLE_KEY=<service key>      # server-only, NEVER prefixed NEXT_PUBLIC_
SUPABASE_DB_URL=postgresql://...             # ETL loads only
```

**2. Vercel → Project → Settings → Environment Variables** — the same keys, scoped to
Production / Preview / Development. Only the two `NEXT_PUBLIC_*` values are ever exposed
to the browser.

**3. GitHub → Settings → Secrets and variables → Actions** — `SUPABASE_DB_URL` and
`SUPABASE_SERVICE_ROLE_KEY` for the ingestion workflows.

Get the values from Supabase → Project Settings → API and → Database.

> Alternative worth considering: this environment has an `acommerce` skill that
> provisions GitHub + Vercel + Supabase together and keeps every credential in an
> encrypted local vault rather than plaintext `.env` files. If you want that instead of
> hand-managed env files, say so and I will use it for the scaffold.

---

# Part B — The pipeline, and how we make it accurate

Accuracy is the entire product. A beautiful dashboard with a wrong number is worse than
no dashboard, because it launders the error into every article that cites it.

## B.1 Ingestion pattern — the same five steps for every source

```
fetch → archive → parse → normalise → reconcile
```

1. **fetch** — with the source's own quirks handled explicitly (the FNMT root certificate
   for PLACSP; BDNS pagination; INE's ISO-8859-15 CSVs).
2. **archive** — write the raw bytes to Supabase Storage with a SHA-256 before parsing
   anything. Re-runs are then reproducible offline and drift is detectable by checksum.
3. **parse** — source-specific, into a common intermediate Parquet shape.
4. **normalise** — map onto our dimensions. Every mapping lives in a reviewed YAML
   crosswalk under `data/registry/`, never inline in code, because these mappings are
   editorial decisions that people will (rightly) want to audit.
5. **reconcile** — run the tie-outs below. **A failing tie-out blocks publication.**

## B.2 The five accuracy mechanisms

**1. Tie-outs as tests.** Every aggregate must equal the officially published total for
the same thing. Sum of chapters equals published revenue total; sum of COFOG functions
equals published expenditure; sum of provinces equals the national figure. Tolerance
0.01%, enforced in CI. This catches the overwhelming majority of parsing errors, because
a mis-parsed Excel row almost never happens to sum correctly.

**2. Golden numbers.** A hand-transcribed file of headline figures read off official PDFs
by a human, asserted against pipeline output. It is the only defence against a systematic
error that is internally consistent — the class of bug that tie-outs cannot see.

**3. Cross-source triangulation.** Three independent bodies publish overlapping views of
the same reality. Where Eurostat, IGAE and AEAT should agree, we assert they do; where
they legitimately differ, we **document why in the UI** rather than silently picking one.
Those documented differences are genuinely interesting content, not an embarrassment —
"why does the tax agency say €290bn and Eurostat say €381bn?" is a great explainer.

**4. Vintage tracking.** Fiscal figures get revised. Every row carries the publication
date it came from, so we can show a revision history rather than mutating history.

**5. Never impute, never interpolate.** A missing value renders as "not published",
which is itself information, and links to the reason. No smoothing, no filling.

## B.3 The Traceability Score

For each node of the spending tree:

```
traceability = Σ(matched named transactions) / total executed spend
```

Matching contracts and grants back to budget programmes is the hard, interesting part —
it needs entity resolution on awarding bodies and a mapping from CPV codes and grant
policy areas onto the programme tree, each carrying a confidence level. We publish the
score, the confidence, and the unmatched remainder with its explanation ("staff costs,
published only in aggregate").

This turns the brief's impossible "every cent" goal into a measurable, honest, and
frankly more newsworthy metric.

## B.4 Counterparty resolution

Contract and grant data names the same company many different ways. We normalise on the
tax ID (NIF/CIF) where present, fuzzy-match names with `pg_trgm` where it is not, and
maintain a reviewed alias table. Every counterparty page states its own match confidence.
Corporate group structure (parent/subsidiary) is a v2 problem — worth flagging early
because "which *group* got the most public money" is the question everyone asks, and
answering it naively is how you get a correction published against you.

---

# Part C — Product and UX

## C.1 The spine

One sentence drives the whole information architecture:

> **In 2024 Spain took in €673.7bn, spent €725.0bn, and the difference was borrowed.**

Everything is a drill-down from that sentence, and the deficit is visible from the first
screen rather than discovered on page nine.

## C.2 Design principles

1. **One idea per screen.** Public finance loses people through density, not complexity.
2. **Always answer "compared to what?"** A number alone is noise. Every figure carries at
   least one anchor: per person, share of the parent, or change on last year. The user
   picks their preferred anchor once and the whole site adopts it.
3. **Never a dead end.** Every element is either drillable or explains why it is the
   bottom.
4. **Sources are part of the design, not a legal footer.** Every chart has a source
   affordance opening the exact file, table and download date.
5. **Plain language first, technical term second.** "Money the government collects from
   companies' profits" *(Impuesto sobre Sociedades)*. Never the reverse.
6. **Mobile is the design target.** Desktop is mobile with more room, not the other way round.

## C.3 Key screens

**1. Home — the whole picture.**
A single flow visual: revenue sources on the left, government in the middle, spending
categories on the right, deficit as an explicit inflow. Year scrubber along the bottom.
Every band clickable. On mobile it becomes a vertical stack of proportional bars — the
same model, not a cut-down one.

**2. Revenue.** The €673.7bn tree, drillable to the deepest published level. Toggles for
nominal/real, absolute/per-capita/%GDP. Prominent, permanent framing of *which lens* is
in view, with a one-tap explanation of why the tax agency's number differs.

**3. Who pays.** Income brackets across the x-axis; number of taxpayers, income and tax
paid; effective rate as an overlay. A companion view for companies by turnover bracket,
with effective rate by company size — a chart that will get attention on its own.
Geographic view down to postcode for the largest cities.

**4. Where it goes.** COFOG and programme tree, with the **Traceability Score** shown on
every node as a first-class metric.

**5. Follow the money.** Search over contracts and grants. Filter by body, place, sector,
amount, year. Counterparty pages showing everything an organisation has received.

**6. What this means for me.** Enter a gross salary; see estimated income tax and social
contributions, and where that specific euro amount goes across categories. **Runs entirely
in the browser, stores nothing, sends nothing.** This is the feature that gets shared, and
it is also the one where a privacy mistake would be fatal — so there is no server involved
at all, and we say so on the page.

**7. Methodology.** Every source, every mapping decision, every known limitation, the
Traceability Score definition, and the tie-out results from the latest build, published
openly. Trust is the product.

## C.4 Craft details that decide whether this feels premium

- **Motion with meaning.** Drill-downs animate the parent rectangle into the child view so
  the user never loses their place. Nothing animates for decoration. Full respect for
  `prefers-reduced-motion`.
- **Colour carries meaning, not brand.** One hue family for revenue, one for spending,
  reserved semantic colours for deficit and surplus. Sequential ramps for magnitude,
  diverging only for change. Verified for contrast in light and dark, and checked against
  the common colour-vision deficiencies — a civic site does not get to fail this.
- **Numbers are typography.** Tabular figures, locale-correct separators (`1.234,56` in
  Spanish, `1,234.56` in English), consistent magnitude language, never more precision
  than the source supports.
- **Skeletons that match final layout** so nothing reflows.
- **Every view is a URL.** Deep links to any node/year/lens combination, with generated
  social cards, because that is how this spreads.
- **Performance budget:** LCP < 1.5s on 4G, interaction to next paint < 200ms, initial JS
  under 150KB gzipped. Enforced in CI with Lighthouse, not aspired to in a doc.
- **Accessibility:** WCAG 2.2 AA. Every chart has a keyboard path and a screen-reader data
  table equivalent. Public information belongs to everyone.

---

# Part D — Phasing

| Phase | Deliverable | Rough effort |
|---|---|---|
| **0 — Foundations** | Repo, Next.js + Supabase scaffold, i18n routing, schema and dimensions, provenance tables, source registry, CI with a first tie-out. Design system and chart primitives. | ~1 week |
| **1 — Revenue, top-down** | Eurostat backbone (1995→2024) for all four tiers. Home flow visual, revenue tree, year toggle, real/per-capita/%GDP. Methodology page live from day one. **First shippable, genuinely useful site.** | ~2 weeks |
| **2 — Revenue, deep** | AEAT annual collection + regional/provincial detail. IGAE execution. PGE XML. The three-lens reconciliation and its explainer. Foral regimes and Social Security closed out. | ~2 weeks |
| **3 — Who pays** | IRPF by bracket, region, municipality, postcode. Corporate tax by turnover bracket and sector with effective rates. "What this means for me" calculator. | ~2–3 weeks |
| **4 — Where it goes** | COFOG and programme trees, economic classification, expenditure by body. | ~2 weeks |
| **5 — Follow the money** | BDNS grants ingested in full (start here — grade A API, ~10.5M rows, named counterparties). PLACSP contracts. Counterparty resolution, search, Traceability Score v1. | ~3–4 weeks |
| **6 — Territory** | CCAA execution, CONPREL municipal data via `mdbtools`, map views. | ~2–3 weeks |
| **7 — Hardening** | Automated refresh schedules, revision tracking, public data downloads and an open API, performance and accessibility audits. | ~2 weeks |

**Sequencing logic:** Phase 1 alone produces a site that is already accurate, already
useful, and already better than nothing — every later phase deepens it without a rewrite,
because the perspective-aware data model was there from the start. Within Phase 5, BDNS
comes before PLACSP: it is a clean JSON API with named counterparties versus zipped ATOM
archives with versioning quirks, so it delivers the "follow the money" experience for a
fraction of the effort.

## Immediate next steps
1. Approve or amend this plan.
2. Confirm credential handling — hand-managed `.env` files, or the encrypted-vault route.
3. I scaffold Phase 0 and ship Phase 1 end-to-end against live Eurostat data, so there is
   a real, correct, deployed site to react to before we go deep.

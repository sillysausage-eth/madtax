# MadTax — UI/UX Direction

> Working prototype with real data: `prototype/console.html`
> Codename for the visual system: **OPEN SOURCE**.

---

## 1. The concept

Every intelligence system ever built exists to *keep* secrets. This one is pointed the
other way: same instrumentation, same cold precision, aimed at money that was always
supposed to be public.

That inversion is the whole idea, and it's what stops the aesthetic from being arbitrary
cosplay. The page opens with a classification banner that reads:

```
UNCLASSIFIED // PUBLIC RELEASE // OPEN SOURCE — DATOS PÚBLICOS
```

*Open source* is the intelligence term for material gathered from public record — and it
also reads as "open data". The joke lands both ways, and it tells the visitor what they're
looking at before they read a single number.

Practical consequence: the tactical styling has to earn its place by making data *more*
legible, never less. Corner brackets, reticles and readouts are how real operational
displays direct attention. The moment a flourish stops directing attention it comes out.

---

## 2. Visual system

### Palette
Deliberately **not** the hacker-green-on-black cliché. Grounded instead in real military
display conventions — cold dark ground, phosphor cyan for data, amber reserved for things
that need a human decision, red for outflow and negatives.

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#070B0E` | Deep blue-black ground, never pure black |
| `--panel` | `#0B1218` | Panel fill |
| `--rule` / `--rule2` | `#1B2E3A` / `#274150` | Hairlines and panel edges |
| `--ink` / `--ink2` / `--mute` | `#C9DCE5` / `#8FA9B6` / `#5A7280` | Cool three-step text ramp |
| **`--cy`** | **`#3FC8DC`** | **Primary. Data, revenue, inbound** |
| **`--am`** | **`#F0A82E`** | **Attention. Advisories, selection, anomalies** |
| `--rd` | `#E8455F` | Outflow, deficits, negative values |
| `--mag` | `#B47BE8` | Foral regimes — a category, not a severity |
| `--gn` | `#5FD08A` | Live-feed indicator only |

Semantic colour is kept separate from the accent: amber never means "highlight, isn't that
nice", it means *a human needs to know something before reading this number*.

The choropleth ramp runs `#09151C → #50DEF4`, dark base to saturated peak. It deliberately
**never reaches white** — a near-white top stop reads as a hole punched in the map rather
than as the hottest target. Regions above 55% intensity get a Gaussian glow, and every
region's stroke brightness tracks its own value, so the map reads as lit contours on a
dark field rather than a pastel infographic.

### Typography
Three faces, all technical, none of them the usual suspects.

| Role | Face | Why |
|---|---|---|
| Display | **Saira Condensed** 700/800, uppercase | Condensed grotesque — reads like equipment labelling. Carries the big numerals. |
| UI / body | **Barlow** 300–600 | Humanist, slightly squarish, holds up small. |
| Data | **JetBrains Mono** 400/500/700 | Tabular figures throughout. Every readout, label and code. |

Wide letter-spacing on uppercase mono labels does the heavy lifting for the military feel —
more than any decoration does.

### Layout — the console
```
┌─ classification banner ─────────────────────────────┐
│  MADTAX · codename            status readout · ES/EN│
├─────────────────────────────────────────────────────┤
│  6 hero stats — the whole national picture in one row│
├──────────┬───────────────────────────┬──────────────┤
│ CONTROL  │   TACTICAL MAP            │  DOSSIER     │
│ metric   │   grid · reticle · glow   │  selected    │
│ tax head │   HUD readout block       │  territory   │
├──────────┴───────────────────────────┴──────────────┤
│  TIME SERIES — 19 years, click to scrub             │
└─────────────────────────────────────────────────────┘
```
Summary before detail, always. Collapses to a single column under 860px, map above dossier.

---

## 3. What the prototype actually does

Not a mockup — it runs on **real AEAT collection data, 2007–2025**, all 19 territories.

- **Clickable map** of all 17 autonomous communities plus Ceuta and Melilla, Canaries in a
  proper inset. Hover reveals labels; click opens the dossier, snaps an amber reticle to
  the centroid, draws corner brackets around the bounding box and runs a single scan sweep.
- **Three metrics** — absolute, per resident, % of regional GDP. Each recolours the map.
- **Six tax heads** — all, income tax, corporate, VAT, excise, fees. Every figure in the
  dossier follows the selected head.
- **19-year timeline**, click or arrow-key to scrub. Bar heights are national collection.
- **Dossier** — headline figure, national share, rank, population, regional GDP, and a
  composition breakdown by tax head.
- **Bilingual ES/EN**, instant switch, including locale-correct number formatting
  (`€294,7 MM` vs `€294.7bn`).
- **Keyboard**: ←/→ scrub years, Enter/Space select a focused region, Esc deselects.

### The advisory system — the most important part
The data contains two traps that would discredit the project if shown naked, so the
interface refuses to show them naked:

- **Madrid is 44.24% of all state collection.** Not because Madrid pays it, but because
  large companies file at their registered office. A permanent amber `EFECTO SEDE`
  advisory fires on selection and an `!` flag sits on the map.
- **Navarre is −€1.0bn.** It runs a foral regime; state figures there are residual and
  refunds exceed them. Magenta `F` flag, plus a foral advisory and a negative-value
  advisory.

A third flag reports the **€9.5bn that doesn't reconcile** to any region — real,
centrally-assigned collection. It sits in the hero row as a first-class number.

This is the Traceability Score philosophy applied to the interface: *make the gaps and the
distortions the loudest thing on the screen*, because they are the most interesting thing
on the screen.

---

## 3b. The spending layer

A mode switch in the masthead flips the whole console between **INGRESOS** and **GASTO**.
The accent token swaps cyan → amber and every panel re-reads from the spending series;
semantic colours (red for deficits and negatives, magenta for foral) do not move, because
they mean the same thing in both modes.

- **Hero** — total government spending €725.0bn, social protection, health, education,
  the regional share, and the deficit as its own tile.
- **Rail** — the ten COFOG functions replace the tax heads.
- **Map** — regional government spending, 2012–2024, all 17 communities. Ceuta and Melilla
  render as no-data with a flag, because they have no regional government at all.
- **Dossier** — gains a second breakdown: *what the money is spent on* (salaries, goods
  and services, investment, benefits in kind), not just which function it went to.

### The lens bridge
The single most important addition. A permanent strip under the hero states which lens is
in view, with a button that expands a reconciliation ladder:

- In revenue mode: €294.7bn AEAT → +€86.6bn taxes AEAT doesn't collect → €381.3bn all tax
  → +€210.3bn social contributions → +€82.0bn non-tax → **€673.7bn**.
- In spending mode: the four tiers, with the €250bn of inter-tier transfers that must be
  eliminated, and the regional tier the map actually shows highlighted.

The rung representing what's currently on screen is highlighted amber, so the answer to
"why doesn't this match the number I saw elsewhere?" is always one click away. This exists
because the question was asked within minutes of the first prototype — which is exactly
the evidence that it needed to be built.

## 3c. One number, and a bar that is the breakdown

The topline is a single figure — **€630.2bn**, FY2023 — set at 48–86px. Six competing
stat tiles were six things to read before understanding anything; one number is the answer
to "how much money is there", and everything else is a decomposition of it.

The stacked bar directly beneath **is** the breakdown control. Under it a readout line
names whatever band the cursor is over, with its description, value and share — so the
structure is explorable without expanding anything. The itemised legend stays behind a
chevron, collapsed by default, and clicking any band opens an explainer (rank, per-resident
figure, how much appears on the map) rather than filtering the map.

Both modes share the component: revenue shows its parts, spending shows the ten COFOG
functions. Same headline, same bar, same interactions.

### Two collisions worth remembering
- **`display` in CSS beats the `hidden` attribute.** Any collapsible needs its own
  `[hidden] { display:none }`, and disclosure state must be checked with
  `getComputedStyle().display` — `el.hidden` only confirms the attribute was written.
- **Reusing a class name silently restyles the other thing that uses it.** A new
  `.readout` for the bar rewrote the masthead's `.readout` into a grid and mangled the
  header. New components get their own prefix (`.cread`).

## 3d. Editorial neutrality — a hard rule

Data tables carry **no interpretive commentary and no highlighted rows**. No callout
sentences telling the reader which figure matters, no amber row drawing the eye to the top
bracket. The numbers are the product; the framing is not.

Factual methodological notes stay, and are wanted: data coverage, why two sources give
different totals, what a figure excludes. The line is that describing *what a number is*
belongs on the page, while telling the reader *what it means* does not. A transparency
tool loses its authority the moment it starts arguing a case.

Total rows read simply **Total**.

## 4. Where this goes next

| | |
|---|---|
| **Spending by tier on the map** | Overlay central + Social Security spending per territory so the map shows all public money spent in a place, not just the regional share. |
| **Restore filtering, deliberately** | If slicing the map by tax type comes back it needs its own explicit control — never a side effect of clicking the legend. |
| **Drill to province** | Provincial geometry and data are already fetched — `ES301` etc. are in the same feed. Click a region to zoom, same interaction model one level down. |
| **Sankey overlay** | The €673.7bn → government → €725.0bn flow as a full-screen mode. |
| **Counterparty search** | Once BDNS lands: a target-acquisition pattern over named recipients of public money. |
| **"What this means for me"** | Salary in, your contribution and its destinations out — entirely client-side, storing nothing. |
| **Traceability Score** | Rendered as a signal-strength meter per spending branch. |

## 5. Deliberate constraints
- Motion never exceeds ~600ms and every animation respects `prefers-reduced-motion`.
- Single visual world by choice — this is a committed dark tactical design, so it paints
  every colour explicitly rather than inheriting anything from the host.
- No chart library. Hand-composed SVG, which is why the map is 42.7KB rather than a
  300KB dependency.
- The whole prototype is one 92KB self-contained file with zero runtime dependencies.

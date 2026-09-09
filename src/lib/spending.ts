import type { Dict, Locale } from "@/i18n";
import type { Metric } from "@/lib/metric";
import type {
  LocalSpend,
  Millions,
  RegionSpending,
  SpendAggEntry,
  SpendTerrEntry,
  YearKey,
} from "@/lib/types";
import {
  divEN,
  divES,
  divisions,
  localAreas,
  spendAgg,
  spendInt,
  spendNational,
  spendTerr,
  spendNoteEN,
  spendNoteES,
  spendSub,
  spendSubEN,
  spendSubES,
  spendYears,
} from "@/data/spending";
import { pctGdp, perCapita } from "@/lib/macro";

/**
 * The spending model, ported 1:1 from prototype/console.tpl.html (`MODE==='exp'`).
 *
 * Every function here reads the bundle and returns what it read. The only
 * arithmetic is the arithmetic the prototype performs — shares of a total and the
 * per-capita and %GDP metrics. Nothing is estimated, interpolated, defaulted or
 * rescaled, and the COFOG divisions are never summed across government tiers.
 */

/**
 * One colour per COFOG division, fixed, so a colour means the same thing in the
 * ring, the legend, the explainer swatch and the dossier bars.
 *
 * Retuned from the prototype's palette on the same rule M2 applied to the revenue
 * parts: five of its ten entries were cyans a shade apart, and two of the
 * remaining five were the reserved semantic colours (amber means attention,
 * magenta means a foral regime). Hue *and* lightness vary between neighbours, so
 * the set still separates for a reader with red-green or blue-yellow colour
 * blindness. Every colour clears 3.6:1 against the panel it is drawn on, and the
 * text-bearing legend beside it stays on the ink tokens.
 */
export const COFOG_COLOR: string[] = [
  "#3CC7DD", // 01 general public services — cyan
  "#97A5BA", // 02 defence — blue-grey
  "#6E67C1", // 03 public order and safety — indigo
  "#E2D75A", // 04 economic affairs — yellow
  "#72CA97", // 05 environmental protection — spring green
  "#D4815E", // 06 housing and community — terracotta
  "#E170A8", // 07 health — pink
  "#9EEBFA", // 08 recreation and culture — ice
  "#82CB4D", // 09 education — yellow-green
  "#6C8DEF", // 10 social protection — blue
];

/* ------------------------------------------------------ debt interest -------
 *
 * `GF0107 Intereses de la deuda pública` is a published child of division 01 and,
 * at €39.6bn in 2024, 43% of it — in that year the fourth largest single sub-function
 * in the accounts, behind old-age pensions, sickness and disability, and hospital
 * services. Left inside the division it had no name of its own on the screen, filed
 * under a heading that reads like administration. It is lifted out and drawn as a
 * part of the composition in its own right: the ring's eleventh coin.
 *
 * Both halves are published figures. The bundle carries the division and the
 * sub-function from the same Eurostat table, and `merge20.js` refuses to write
 * unless the division's other seven sub-functions sum to the remainder exactly.
 * Nothing here divides one figure into two.
 */

/** The filter key the interest coin, the ring and the URL use. */
export const INT_KEY = "gfint";
/** The COFOG code behind that key, and the division it comes out of. */
export const INT_CODE = spendInt.code;
export const INT_PARENT = spendInt.parent;
/** True when the reader is filtered to interest. */
export const isInt = (focus: string | null): boolean => focus === INT_KEY;

/**
 * The interest coin's colour: the debt mode's violet, not a new entry in the COFOG
 * palette. A reader who has seen the debt screen meets the same colour here, which
 * is the point of the part — this slice of spending *is* the debt.
 */
export const INT_COLOR = "#B47BE8";

/**
 * The part's name. Eurostat's own English label for `GF0107` is "public debt
 * transactions", which does not say interest, and its Spanish one is a literal
 * translation of it; the bundle's sub-table already calls the line by its plain
 * name in Spanish. A coin in the ring has to say what it is at a glance, so both
 * locales name it the same way here and the panel's first sentence gives the code
 * and what the code covers.
 */
export const intLabel = (t: Dict): string => t.expIntName;

/** What the year's interest is, and who paid it. Every figure is Eurostat's. */
export interface IntModel {
  nat: Millions;
  central: Millions;
  regional: Millions;
  local: Millions;
  socsec: Millions;
  /** Tiers less the consolidated total: interest one tier pays another. */
  elim: Millions;
}

export function intOf(y: YearKey): IntModel {
  const sy = spendInt.nat[y] ? y : spendYears[spendYears.length - 1];
  const t = spendInt.tiers[sy];
  const nat = spendInt.nat[sy];
  const tiers = {
    central: t.central.int,
    regional: t.regional.int,
    local: t.local.int,
    socsec: t.socsec.int,
  };
  return {
    nat,
    ...tiers,
    elim: tiers.central + tiers.regional + tiers.local + tiers.socsec - nat,
  };
}

/**
 * Division 01 with the interest taken out — every figure published, none derived
 * from another. `nat` is the division less the sub-function; each tier's share is
 * that tier's division less that tier's interest.
 *
 * `mapped` is the regional subsector's own services figure, which is **not** what
 * the map shades: no source splits a COFOG sub-function by Autonomous Region, so
 * each community's figure there is still the whole division, interest and all. The
 * panel says that in place rather than letting the difference pass as a residual.
 */
export function servicesAgg(y: YearKey): SpendAggEntry | undefined {
  const a = spendAggOf(y, INT_PARENT);
  if (!a) return undefined;
  const sy = spendInt.nat[y] ? y : spendYears[spendYears.length - 1];
  const t = spendInt.tiers[sy];
  const nat = a.nat - spendInt.nat[sy];
  const mapped = t.regional.parent - t.regional.int;
  const central = a.central - t.central.int;
  const local = a.local - t.local.int;
  const socsec = a.socsec - t.socsec.int;
  return {
    nat,
    mapped,
    central,
    local,
    socsec,
    adj: nat - mapped - central - local - socsec,
  };
}

/** The prototype's `divisions` lookup: the division's name in the reader's language. */
export const divLabel = (locale: Locale, code: string): string =>
  (locale === "es" ? divES : divEN)[code];

/**
 * The prototype's `spendYear()`. Spending data ends a year earlier than revenue,
 * so a year that reached this screen from elsewhere is never indexed blind: the
 * console falls back to the latest year that exists rather than throwing.
 */
export const spendYear = (y: YearKey): YearKey =>
  spendNational[y] ? y : spendYears[spendYears.length - 1];

/** The prototype's `spendNat()`: the national COFOG row for a year. */
export const spendNat = (y: YearKey): number[] => spendNational[spendYear(y)];

/** The prototype's `val()` for spending: `null` where the region publishes nothing. */
export function spendVal(
  r: RegionSpending | undefined,
  y: YearKey,
  slice: number,
): Millions | null {
  const s = r && r.spend[y];
  return s ? s[slice] : null;
}

/** The prototype's `metricVal()` for spending. */
export function spendMetricVal(
  r: RegionSpending | undefined,
  y: YearKey,
  slice: number,
  metric: Metric,
): number | null {
  const v = spendVal(r, y, slice);
  if (v === null || v === undefined) return null;
  if (metric === "total") return v;
  if (metric === "pc") return perCapita(v, r?.macro, y);
  return pctGdp(v, r?.macro, y);
}

/** Spending uses the softer gamma for every metric — the prototype's `scale()`. */
export const SPEND_GAMMA = 0.8;

/**
 * The COFOG code the off-map remainder and its dossier are cut by: the focused
 * division, or the whole of spending when nothing is focused. The prototype's
 * `'GF'+focus.slice(2)` / `'TOTAL'`.
 */
export const aggCode = (focus: string | null): string =>
  isInt(focus)
    ? INT_CODE
    : focus && focus.startsWith("gf")
      ? "GF" + focus.slice(2)
      : "TOTAL";

/** The prototype's `D.spendAgg[year]?year:spendYears[last]` fallback, then the lookup. */
export function spendAggOf(y: YearKey, code: string): SpendAggEntry | undefined {
  const sy = spendAgg[y] ? y : spendYears[spendYears.length - 1];
  return spendAgg[sy] && spendAgg[sy][code];
}

/** The same fallback for the sub-function table. */
export const spendSubYear = (y: YearKey): YearKey =>
  spendSub[y] ? y : spendYears[spendYears.length - 1];

/**
 * The slice of `regions[].spend[year]` the filter selects: 0 is the whole of
 * spending, 1…10 are the COFOG divisions in `divisions` order. The same index
 * the national row `spendNational[year]` is laid out in, so the map, the coins
 * and the panel all read one number set.
 */
export const spendSlice = (focus: string | null): number =>
  focus && !isInt(focus) && focus.startsWith("gf")
    ? divisions.indexOf(focus.slice(2)) + 1
    : 0;

/**
 * Whether the part the console is filtered to has no territorial figure at all.
 *
 * Interest is the case, and it is a different fact from `spendNoSplit`: the
 * Autonomous Regions do pay interest — €6.8bn of it in 2024, published — but no
 * source places a COFOG sub-function in a community. Eurostat publishes the split
 * by tier and stops; IGAE's per-community file is by division and stops. So the
 * figure exists, the map just cannot carry it, and the panel says exactly that
 * rather than borrowing defence's sentence, which claims the tier spends nothing.
 */
export const spendNoTerritory = (focus: string | null): boolean =>
  isInt(focus) && spendInt.noTerritorial;

/**
 * Whether nothing at all of this function is spent through the tier the map
 * draws — `spendAgg[...].mapped === 0`.
 *
 * Defence is the case: `GF02` is `mapped: 0` in every published year. The region
 * arrays do carry a literal `0` there, but that zero is not a measurement of a
 * community's defence spending — it is the absence of the function from the
 * autonomous subsector altogether. Painting it as a zero would put nineteen
 * measured-looking zeroes on the map, so the console reads it as no data and the
 * panel says why, in place.
 */
export const spendNoSplit = (y: YearKey, code: string): boolean =>
  /* Interest has no `spendAgg` row of its own and must not fall through to this
     sentence: it is absent from the map for a different reason, which
     `spendNoTerritory` carries. */
  code !== INT_CODE && (spendAggOf(y, code)?.mapped ?? 0) === 0;

/**
 * The reconciliation the panel should read for a filter: division 01 without its
 * interest where that is what is being shown, and the bundle's own row otherwise.
 */
export const spendAggFor = (y: YearKey, focus: string | null): SpendAggEntry | undefined =>
  focus === "gf" + INT_PARENT.slice(2)
    ? servicesAgg(y)
    : spendAggOf(y, aggCode(focus));

/** One COFOG division of the national headline, ready to draw. */
export interface SpendRow {
  k: string;
  v: Millions;
  nm: string;
  desc: string;
  c: string;
}

export interface SpendCompModel {
  total: Millions;
  /**
   * The line under the caption, or nothing.
   *
   * It is not a description of the perimeter — that is said once, in the
   * footer, exactly as on the revenue side. It carries one fact and only
   * appears when that fact holds. Nothing declares itself here today, so it is
   * always absent; the field stays because the caption is where a gap of this
   * kind would be said.
   */
  sub: string | null;
  /** The year actually read, which is not always the year asked for. */
  year: YearKey;
  rows: SpendRow[];
}

/**
 * The prototype's `compModel()` for spending mode: every COFOG division with a
 * non-zero figure, largest first. The divisions are an exact partition of the
 * consolidated general-government total because the bundle says so — nothing here
 * makes them one.
 */
export function spendCompModel(
  locale: Locale,
  t: Dict,
  year: YearKey,
): SpendCompModel {
  const sy = spendYear(year);
  const sp = spendNational[sy];
  const int = intOf(sy).nat;
  return {
    total: sp[0],
    sub: null,
    year: sy,
    rows: divisions
      .map((d, i) => ({
        k: "gf" + d,
        /* Division 01 is drawn without the interest, which is the part below. Both
           figures are published; the eleven parts still sum to the total, because
           what one loses the other carries. */
        v: d === INT_PARENT.slice(2) ? sp[i + 1] - int : sp[i + 1],
        nm: divLabel(locale, d),
        desc: "",
        c: COFOG_COLOR[i],
      }))
      .concat({ k: INT_KEY, v: int, nm: intLabel(t), desc: "", c: INT_COLOR })
      .filter((r) => Math.abs(r.v) > 0)
      .sort((a, b) => b.v - a.v),
  };
}

/** The prototype's `sliceLabel()` for spending. Slice 0 is every function. */
export const spendSliceLabel = (locale: Locale, t: Dict, i: number): string =>
  i === 0 ? t.fnAll : divLabel(locale, divisions[i - 1]);

/**
 * The sub-functions of one division, largest first — the prototype's filter in
 * `paintExplainer()`. `GF07` selects `GF0701`…`GF0706`: the six-character codes
 * under it, and never the division's own row.
 */
export function subFunctions(
  y: YearKey,
  division: string,
): [string, number][] {
  const sb = spendSub[spendSubYear(y)] || {};
  return (Object.entries(sb) as [string, number][])
    .filter(
      ([k, v]) =>
        k.startsWith(division) &&
        k.length === 6 &&
        Math.abs(v) > 0 &&
        /* Interest has left this table: it is a part of the composition in its own
           right, so listing it here too would show it twice and make the rows sum
           to more than the figure above them. */
        k !== INT_CODE,
    )
    .sort((a, b) => b[1] - a[1]);
}

/**
 * The sub-function's official name. Spanish falls back to the English label where
 * the translation is not in the bundle — the prototype's rule, kept so a missing
 * string shows the official name rather than a bare code.
 */
export const subFunctionLabel = (locale: Locale, code: string): string =>
  locale === "es" ? spendSubES[code] || spendSubEN[code] : spendSubEN[code];

/** The bundle's own footnote about a sub-function, where it carries one. */
export const subFunctionNote = (locale: Locale, code: string): string | undefined =>
  (locale === "es" ? spendNoteES : spendNoteEN)[code];

/**
 * The year the console opens on: the latest year the bundle publishes national
 * COFOG spending for. Stated as the rule rather than pinned to a literal, so the
 * console moves on by itself when the next year lands.
 */
export const OPENING_YEAR_EXP: YearKey = spendYears[spendYears.length - 1];

/* ------------------------------------------------ the map of territories -- */

/**
 * The year's reconciliation for the whole of spending: the two tiers on the map,
 * the one State coin, and what is inside the coin. Same year fallback as the
 * other spending lookups.
 */
export const spendTerrOf = (y: YearKey): SpendTerrEntry => spendTerr[spendYear(y)];

/** What the territory's local entities spent, or null where the table is absent. */
export const localOf = (r: RegionSpending | undefined, y: YearKey): LocalSpend | null =>
  (r && r.local && r.local[y]) || null;

/**
 * What is spent in the territory, whoever spends it: the regional government's
 * figure plus the net local layer. A territory with neither figure is `null` —
 * absent, not zero. One tier present and the other absent is a figure with a
 * named gap (`spendTerrOf(y).partial`), and the dossier says so.
 */
export function terrVal(r: RegionSpending | undefined, y: YearKey): Millions | null {
  const s = r && r.spend[y];
  const l = localOf(r, y);
  if (!s && !l) return null;
  return (s ? s[0] : 0) + (l ? l.net : 0);
}

/** `terrVal` under the metric the map reads. */
export function terrMetricVal(
  r: RegionSpending | undefined,
  y: YearKey,
  metric: Metric,
): number | null {
  const v = terrVal(r, y);
  if (v === null) return null;
  if (metric === "total") return v;
  if (metric === "pc") return perCapita(v, r?.macro, y);
  return pctGdp(v, r?.macro, y);
}

/**
 * The State coin's figure for the current reading. Unfiltered it is everything
 * the territories do not carry — central government, Social Security, the part
 * of the local tier the territorial layer does not reach, less the elimination.
 * Filtered to a function it is that function's spending outside the regional
 * tier, because councils' spending has no published functional split by
 * territory and so cannot be placed on the map for one function.
 */
export function stateCoinValue(y: YearKey, focus: string | null): Millions | null {
  const sy = spendYear(y);
  if (!focus) return spendTerrOf(sy).state;
  /* Interest is not on the map at all, so the coin beside it is the whole of it. */
  if (isInt(focus)) return intOf(sy).nat;
  const a = focus === "gf" + INT_PARENT.slice(2) ? servicesAgg(sy) : spendAggOf(sy, aggCode(focus));
  return a ? a.nat - a.mapped : null;
}

/** The programme area's name in the reader's language, from the bundle. */
export const localAreaLabel = (locale: Locale, code: string): string =>
  (locale === "es" ? localAreas.es : localAreas.en)[code] || code;

/** The two autonomous cities: on the map with their own budget, no regional tier. */
export const isCity = (id: string): boolean => id === "18" || id === "19";

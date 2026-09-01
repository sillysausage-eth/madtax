import type { Dict, Locale } from "@/i18n";
import type { Metric } from "@/lib/metric";
import type {
  Millions,
  RegionSpending,
  SpendAggEntry,
  YearKey,
} from "@/lib/types";
import {
  divEN,
  divES,
  divisions,
  spendAgg,
  spendNational,
  spendNoteEN,
  spendNoteES,
  spendSub,
  spendSubEN,
  spendSubES,
  spendYears,
} from "@/data/spending";

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
  if (metric === "pc") return r && r.pop ? (v * 1e6) / r.pop : null;
  return r && r.gdp ? (v / r.gdp) * 100 : null;
}

/** Spending uses the softer gamma for every metric — the prototype's `scale()`. */
export const SPEND_GAMMA = 0.8;

/**
 * The COFOG code the off-map remainder and its dossier are cut by: the focused
 * division, or the whole of spending when nothing is focused. The prototype's
 * `'GF'+focus.slice(2)` / `'TOTAL'`.
 */
export const aggCode = (focus: string | null): string =>
  focus && focus.startsWith("gf") ? "GF" + focus.slice(2) : "TOTAL";

/** The prototype's `D.spendAgg[year]?year:spendYears[last]` fallback, then the lookup. */
export function spendAggOf(y: YearKey, code: string): SpendAggEntry | undefined {
  const sy = spendAgg[y] ? y : spendYears[spendYears.length - 1];
  return spendAgg[sy] && spendAgg[sy][code];
}

/** The same fallback for the sub-function table. */
export const spendSubYear = (y: YearKey): YearKey =>
  spendSub[y] ? y : spendYears[spendYears.length - 1];

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
  sub: string;
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
  return {
    total: sp[0],
    sub: t.expSub,
    year: sy,
    rows: divisions
      .map((d, i) => ({
        k: "gf" + d,
        v: sp[i + 1],
        nm: divLabel(locale, d),
        desc: "",
        c: COFOG_COLOR[i],
      }))
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
      ([k, v]) => k.startsWith(division) && k.length === 6 && Math.abs(v) > 0,
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

import type { Dict } from "@/i18n";
import type { Metric } from "@/lib/metric";
import type {
  MapAggEntry,
  Millions,
  PartKey,
  RegionRevenue,
  YearKey,
} from "@/lib/types";
import { PARTS, mapAgg, natParts, national2, revYears } from "@/data/revenue";

/**
 * The revenue model, ported 1:1 from prototype/console.tpl.html.
 *
 * Every function here reads the bundle and returns what it read. The only
 * arithmetic is the arithmetic the prototype performs — shares of a total, the
 * per-capita and %GDP metrics, and the differences the console states in words.
 * Nothing is estimated, interpolated, defaulted or rescaled.
 */

/**
 * One colour per revenue component, fixed, so a colour means the same thing in
 * the ring, the legend, the explainer swatch and the dossier bars.
 *
 * Retuned from the prototype's palette, which opened with four near-identical
 * cyans for the four largest components — exactly the slices that most need
 * telling apart. Hue *and* lightness vary between neighbours, so the set still
 * separates for a reader with red-green or blue-yellow colour blindness, and
 * for anyone on a poor screen. Every colour clears 4.5:1 against the console
 * background.
 *
 * The three semantic colours are reserved and appear nowhere here: amber means
 * attention, red means a negative figure, magenta means a foral regime.
 */
export const PART_COLOR: Record<string, string> = {
  social: "#3CC7DD", //        cyan
  irpf: "#6C8DEF", //          blue
  vat: "#82CB4D", //           yellow-green
  corp: "#E170A8", //          pink
  sales: "#30B59B", //         teal
  excise: "#E2D75A", //        yellow
  eu: "#CD6CD0", //            orchid
  otherProd: "#2F87C6", //     azure
  propInc: "#72CA97", //       spring green
  propTax: "#9EEBFA", //       ice
  otherProdTax: "#6E67C1", //  indigo
  otherTransfer: "#D4815E", // terracotta
  inherit: "#A7B356", //       olive
  otherCurr: "#97A5BA", //     blue-grey
  customs: "#62A790", //       slate green
  taxProdPending: "#79A857", // muted yellow-green, the vat family
  taxIncPending: "#6C7CAC", //  muted blue, the irpf family
};
/**
 * The prototype's `REV_SLICES`: the total, then one entry per component. The
 * console renders no slice control (see `docs` in RevenueExplorer), so slice 0
 * is the only one reachable — but the indexing is the prototype's and the map
 * reads through it unchanged.
 */
export const REV_SLICES: { k: PartKey | "total" }[] = [
  { k: "total" as PartKey | "total" },
  ...PARTS.map((k) => ({ k })),
];

/** The prototype's `revVal`. `undefined` and a missing year both mean "absent". */
export function revVal(
  r: RegionRevenue,
  y: YearKey,
  k: PartKey | "total",
): Millions | null {
  const p = r.parts && r.parts[y];
  if (!p) return null;
  const v = p[k];
  return v === undefined ? null : v;
}

/** The prototype's `natVal`. */
export function natVal(y: YearKey, k: PartKey | "total"): Millions | null {
  const n = natParts[y];
  if (!n) return null;
  if (k === "total") return n.total;
  const v = n[k];
  return typeof v === "number" ? v : null;
}

/** The prototype's `mapAgg(y,k)`, with its zero-filled fallback. */
export function mapAggOf(y: YearKey, k: PartKey | "total"): MapAggEntry {
  return (mapAgg[y] && mapAgg[y][k]) || { mapped: 0, offmap: 0, nat: 0 };
}

/** A component of the national headline, ready to draw. */
export interface CompRow {
  k: PartKey;
  v: Millions;
  nm: string;
  desc: string;
  c: string;
}

export interface CompModel {
  total: Millions;
  sub: string;
  rows: CompRow[];
}

/**
 * The prototype's `compModel()` for revenue mode: every component with a
 * non-zero figure, largest first. The parts sum exactly to `total` because the
 * bundle says so — nothing here makes them.
 */
export function compModel(t: Dict, year: YearKey): CompModel {
  const n = natParts[year];
  return {
    total: n.total,
    sub: n.detail ? t.rvTotalSub : t.rvPending,
    rows: PARTS.filter((k) => Math.abs(n[k] as number) > 0)
      .map((k) => ({
        k,
        v: n[k] as number,
        nm: t.pt[k as keyof Dict["pt"]][0],
        desc: t.pt[k as keyof Dict["pt"]][1],
        c: PART_COLOR[k],
      }))
      .sort((a, b) => b.v - a.v),
  };
}

/** The component label used by the dossier sub-line — the prototype's `sliceLabel`. */
export function sliceLabel(t: Dict, i: number): string {
  return i === 0
    ? t.rvTotal
    : t.pt[REV_SLICES[i].k as keyof Dict["pt"]][0];
}

/* The metric and its formatter are mode-agnostic and live in `lib/metric`; they
   are re-exported here so the revenue components keep one import. */
export { fmtMetric, type Metric } from "@/lib/metric";

/** The prototype's `metricVal`. Per-capita converts € millions to € per resident. */
export function metricVal(
  r: RegionRevenue,
  y: YearKey,
  slice: number,
  metric: Metric,
): number | null {
  const v = revVal(r, y, REV_SLICES[slice].k);
  if (v === null || v === undefined) return null;
  if (metric === "total") return v;
  if (metric === "pc") return r.pop ? (v * 1e6) / r.pop : null;
  return r.gdp ? (v / r.gdp) * 100 : null;
}

/** Revenue absolute totals get the harder gamma; the other two metrics do not. */
export const metricGamma = (metric: Metric): number =>
  metric === "total" ? 0.55 : 0.8;

/**
 * The year the console opens on: the latest one whose territorial coverage is
 * complete. That is the prototype's opening year, stated as the rule behind it
 * rather than pinned to a literal — the moment the next year's regional and
 * local figures land, the console opens on that year instead.
 */
export const OPENING_YEAR: YearKey =
  [...revYears].reverse().find((y) => national2[y]?.complete) ??
  revYears[revYears.length - 1];

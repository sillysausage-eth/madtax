import type { YearKey } from "@/lib/types";

/**
 * The debt screen's palettes and its one piece of chart geometry, ported from
 * prototype/console.tpl.html (`DEBT_TIER_C`, `DEBT_INSTR_C`, `DEBT_HOLD_C`,
 * `debtTrend`).
 *
 * Debt is a stock, not a flow: everything on this screen describes what is owed
 * on one reference date, so nothing here takes a fiscal year as a parameter
 * except the trend, whose whole subject is the passage of time.
 */

/**
 * Violet throughout — the mode's own accent — but every stop lightened until it
 * clears 3:1 against the card it is drawn on. The prototype's ramp ran down to
 * `#4A2E75` and `#3E2A55`, which sit at 1.6:1 and 1.4:1 on the panel: the last
 * two slices of every ring were effectively invisible. Hue varies alongside
 * lightness so the set separates without relying on brightness alone.
 */
export const DEBT_TIER_C: Record<string, string> = {
  S1311: "#B47BE8", // central government — the accent violet
  S1312: "#6C8DEF", // regions — blue
  S1313: "#E2A0D8", // councils — mauve
  S1314: "#A99BC4", // social security — lavender grey
};

/** Securities are the violet pair, loans the blue pair, cash the grey. */
export const DEBT_INSTR_C: Record<string, string> = {
  GD_F32: "#B47BE8", // long-term securities
  GD_F31: "#D9B8F5", // short-term securities
  GD_F42: "#6C8DEF", // long-term loans
  GD_F41: "#9EB6F5", // short-term loans
  GD_F2: "#A99BC4", // currency and deposits
};

/** Holders keep source order, so the ramp is indexed rather than keyed. */
export const DEBT_HOLD_C: string[] = [
  "#B47BE8",
  "#6C8DEF",
  "#D9B8F5",
  "#C98FD8",
  "#7FB3E8",
  "#E2A0D8",
  "#A99BC4",
];

/** Any instrument the bundle adds before this map does keeps the accent violet. */
export const DEBT_INSTR_FALLBACK = "#B47BE8";

/** The four government tiers, in the order the rings and the notes read them. */
export const TIERS = ["S1311", "S1312", "S1313", "S1314"] as const;

/* ------------------------------------------------------------------ trend -- */

/**
 * Debt as a share of GDP, every year Eurostat publishes it.
 *
 * Both series are published figures — the ratio is Eurostat's own, not one
 * divided out here. The geometry below is the prototype's `debtTrend()`,
 * viewBox and all; only the label sizes are retuned, because SVG text scales
 * with the canvas and the prototype's 3.4px dropped far under the readable
 * minimum on a phone.
 */
export const TREND = { W: 300, H: 54, PL: 4, PR: 4, PT: 6, PB: 8 } as const;

export interface TrendMark {
  /** Index into the plotted series. */
  i: number;
  year: YearKey;
  value: number;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

export interface TrendModel {
  years: YearKey[];
  first: YearKey;
  last: YearKey;
  line: string;
  area: string;
  marks: TrendMark[];
}

/**
 * `null` when there are fewer than five published points — the prototype draws
 * no chart rather than a line through three dots.
 */
export function debtTrend(
  years: YearKey[],
  pcGdp: Record<YearKey, number>,
): TrendModel | null {
  const ys = years.filter((y) => pcGdp[y] != null);
  if (ys.length < 5) return null;

  const { W, H, PL, PR, PT, PB } = TREND;
  const vals = ys.map((y) => pcGdp[y]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const x = (i: number) => PL + (i * (W - PL - PR)) / (ys.length - 1);
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo || 1)) * (H - PT - PB);

  const pts = ys.map((yr, i) => [x(i), y(pcGdp[yr])] as const);
  const line = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2))
    .join(" ");
  const area =
    line +
    ` L${x(ys.length - 1).toFixed(2)} ${(H - PB).toFixed(2)} L${x(0).toFixed(
      2,
    )} ${(H - PB).toFixed(2)} Z`;

  const iLo = vals.indexOf(lo);
  const iHi = vals.indexOf(hi);
  const iLast = ys.length - 1;
  /* Only draw the low and high markers when they are far enough from the latest
     point not to collide with its label. */
  const far = (i: number) => Math.abs(i - iLast) > 2;

  const mark = (i: number, anchor: TrendMark["anchor"]): TrendMark => ({
    i,
    year: ys[i],
    value: vals[i],
    x: x(i),
    y: y(vals[i]),
    anchor,
  });

  const marks: TrendMark[] = [];
  if (far(iLo)) marks.push(mark(iLo, "middle"));
  if (far(iHi)) marks.push(mark(iHi, "middle"));
  marks.push(mark(iLast, "end"));

  return { years: ys, first: ys[0], last: ys[iLast], line, area, marks };
}

/** The label's x, nudged off the point the way the prototype nudges it. */
export const markLabelX = (m: TrendMark): number =>
  m.anchor === "end" ? m.x - 1.6 : m.anchor === "start" ? m.x + 1.6 : m.x;

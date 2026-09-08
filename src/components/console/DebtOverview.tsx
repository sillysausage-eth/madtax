"use client";

import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import DebtTrend, { type TrendPoint } from "./DebtTrend";

/**
 * The top of the debt screen: the headline stock and the chart it is read off.
 *
 * The chart is the control. The stock and its share of GDP are published for
 * every year Eurostat has, so pointing at a year on the line moves the headline
 * to that year — the reader gets thirty-one readings out of one screen instead
 * of one reading and a shape. Leaving the chart returns them to the latest year;
 * the label carries the year it is for, so the screen never states a figure
 * without saying which year it belongs to.
 *
 * The interest bill used to sit here as a stat tile. It is a series, not a
 * single figure, so it is a line on the chart instead, with its reading in the
 * chart's own legend — one place, and thirty-one years of it rather than one.
 */
export default function DebtOverview({
  points,
  refYear,
  locale,
  X,
}: {
  /** One row per published year: the share of GDP, the stock, the interest. */
  points: TrendPoint[];
  /** The reference year — where the screen sits when nothing is being read. */
  refYear: string;
  locale: Locale;
  X: Dict["dbt"];
}) {
  const [at, setAt] = useState<number | null>(null);

  const home = points.findIndex((p) => p.year === refYear);
  const cur = points[at ?? (home >= 0 ? home : points.length - 1)];

  return (
    <>
      {/* No year picker: debt is a stock, and the chart below already names the
          year every figure here is for. */}
      <div className="dhero">
        <div className="k">{X.heroK}</div>
        <div className="fig">
          <span className="big">{eur(locale, cur.total)}</span>
          <span className="pc">
            {cur.v != null ? `${nf(locale, cur.v, 1)}% ${X.ofGdp}` : ""}
          </span>
          <span className="asof">{X.asOf.replace("{Y}", cur.year)}</span>
        </div>
      </div>

      <DebtTrend points={points} at={at} onAt={setAt} locale={locale} X={X} />
    </>
  );
}

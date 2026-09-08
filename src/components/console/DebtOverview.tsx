"use client";

import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import DebtTrend, { type TrendPoint } from "./DebtTrend";

/**
 * The top of the debt screen: the headline stock, the two figures that qualify
 * it, and the chart that reads all three.
 *
 * The chart is the control. Every figure above it is published for every year
 * Eurostat has, so pointing at a year on the line moves the headline, the share
 * of GDP and the interest bill to that year — the reader gets thirty-one
 * readings out of one screen instead of one reading and a shape. Leaving the
 * chart returns them to the latest year; each label carries the year it is for,
 * so the screen never states a figure without saying which year it belongs to.
 *
 * Average life is not part of that: it is a single published figure at its own
 * date, with no annual series behind it, so it does not move and says so.
 */
export default function DebtOverview({
  points,
  refYear,
  life,
  locale,
  X,
}: {
  /** One row per published year: the share of GDP, the stock, the interest. */
  points: TrendPoint[];
  /** The reference year — where the screen sits when nothing is being read. */
  refYear: string;
  /** Average life, already formatted, or null when the source has none. */
  life: { v: string; n: string; none?: boolean };
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

      <div className="dstats">
        <div className="dstat">
          <span className="sk">{X.sInt}</span>
          <div className="sv">{eur(locale, cur.interest)}</div>
          <span className="sn">{X.sIntN.replace("{Y}", cur.year)}</span>
        </div>
        <div className="dstat">
          <span className="sk">{X.sLife}</span>
          <div className={life.none ? "sv none" : "sv"}>{life.v}</div>
          <span className="sn">{life.n}</span>
        </div>
      </div>

      <DebtTrend points={points} at={at} onAt={setAt} locale={locale} X={X} />
    </>
  );
}

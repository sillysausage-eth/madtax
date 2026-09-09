"use client";

import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur } from "@/lib/format";
import OverviewTrend, { KEYS, type OverviewPoint } from "./OverviewTrend";

/**
 * The top of the home screen: why the site exists, the three figures it is about, and
 * the chart those figures are read off.
 *
 * Centred, and the only centred block on the site. Every console below is a left-aligned
 * instrument panel; this is the one place that states a purpose rather than reading out
 * a measurement, and it is set apart accordingly.
 *
 * The chart is the control, as it is on the debt screen. The three headline figures are
 * the latest year until a reader points at another one, and then they are that year's —
 * fourteen readings out of one screen instead of one reading and a shape. The label
 * under them carries the year, so the screen never states a figure without saying which
 * year it belongs to.
 *
 * Nothing here interprets the numbers. The hero says what the three are and the chart
 * says what they have done; which of those facts matters is the reader's to decide.
 */
export default function OverviewHeadline({
  points,
  locale,
  X,
}: {
  points: OverviewPoint[];
  locale: Locale;
  X: Dict["ov"];
}) {
  const [at, setAt] = useState<number | null>(null);

  const label: Record<(typeof KEYS)[number], string> = {
    rev: X.sRev,
    exp: X.sExp,
    def: X.sDef,
  };
  const cur = points[at ?? points.length - 1];

  return (
    <>
      <div className="ohero">
        {/* Why the site exists, then what is actually on this screen. One is what a
            reader remembers, the other is what they can check. */}
        <h2 className="head">{X.head}</h2>
        <p className="lead">{X.lead}</p>

        {/* The three figures the whole site is a decomposition of. They read the year
            under the pointer when the chart has one, and the latest year otherwise. */}
        <div className="ofigs">
          {KEYS.map((k) => {
            const v = cur[k];
            return (
              <div key={k} className={`ofig ${k}`}>
                <span className="n">{label[k]}</span>
                <span className="v">{v == null ? X.noPub : eur(locale, v)}</span>
              </div>
            );
          })}
        </div>

        {/* The year those three readings are for. Just the year — no accounting
            prefix in front of it — and set to be read at a glance, because it is
            the figures' own label rather than a caption. */}
        <div className="year">{cur.year}</div>
      </div>

      <OverviewTrend points={points} at={at} onAt={setAt} locale={locale} X={X} />
    </>
  );
}

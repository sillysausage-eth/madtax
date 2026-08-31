"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import type { CompRow } from "@/lib/revenue";
import { natSub, subLab } from "@/data/revenue";
import type { YearKey } from "@/lib/types";
import WhoBlock, { type Tab } from "./WhoBlock";
import type { WhoSort } from "./WhoPaysTable";

/**
 * The explainer panel, ported from the prototype's `paintExplainer()`: what the
 * focused component is, what it is worth, the official ESA breakdown beneath it,
 * and the who-pays drill-down.
 *
 * Opening it does not filter the map. The map is driven by the slice, the
 * explainer by the focus — clicking a part of the ring answers "what is this",
 * it does not re-cut the territory.
 */

export default function Explainer({
  row,
  total,
  locale,
  t,
  year,
  tab,
  onTab,
  sort,
  onSort,
  onClose,
}: {
  row: CompRow;
  total: number;
  locale: Locale;
  t: Dict;
  year: YearKey;
  tab: Tab;
  onTab: (t: Tab) => void;
  sort: WhoSort;
  onSort: (col: string) => void;
  onClose: () => void;
}) {
  /* Official ESA children of this bucket. Only ever shown for the year on screen —
     the parts are an exact partition of the figure above, never a stale one. */
  const subs = (natSub[year] || {})[row.k] || [];
  const mx = subs.length ? Math.max(...subs.map((x) => Math.abs(x[1]))) : 0;

  return (
    <div className="expl">
      <span className="swatch" style={{ background: row.c }} />
      <div>
        <h4>{row.nm}</h4>
        <div className="amt">
          {eur(locale, row.v)} · {nf(locale, (row.v / total) * 100, 1)}
          {t.fOfTotal}
        </div>
      </div>

      {subs.length > 1 ? (
        <div className="subs">
          <span className="subs-h">{t.subsH}</span>
          {subs.map(([code, v]) => (
            <div className="subrow" key={code}>
              <span className="sn">{subLab[locale][code] || code}</span>
              <span className="sv">{eur(locale, v)}</span>
              <span className="sp">{nf(locale, (v / row.v) * 100, 1)}%</span>
              <span className="sbar">
                <i
                  style={{
                    width: `${Math.max(1, (Math.abs(v) / mx) * 100)}%`,
                    background: row.c,
                  }}
                />
              </span>
            </div>
          ))}
          <p className="subs-src">{t.subsSrc}</p>
        </div>
      ) : null}

      <WhoBlock
        k={row.k}
        locale={locale}
        t={t}
        year={year}
        tab={tab}
        onTab={onTab}
        sort={sort}
        onSort={onSort}
      />

      <button className="close" onClick={onClose}>
        {t.fClose}
      </button>
    </div>
  );
}

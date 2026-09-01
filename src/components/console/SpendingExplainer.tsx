"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import {
  subFunctionLabel,
  subFunctionNote,
  subFunctions,
  type SpendRow,
} from "@/lib/spending";
import type { YearKey } from "@/lib/types";

/**
 * The explainer panel for a COFOG division, ported from the prototype's
 * `paintExplainer()` on its `MODE!=='rev'` branch: what the function is, what it
 * is worth, and the official sub-functions beneath it.
 *
 * Opening it does not filter the map — the map draws total regional spending
 * either way. It does re-cut the coins beside the map, because the money with no
 * territorial split is a different set for each function.
 *
 * There is no who-pays block here: the AEAT detail answers who generates a
 * revenue, and nothing equivalent is published for who receives a spend.
 */
export default function SpendingExplainer({
  row,
  total,
  locale,
  t,
  year,
  onClose,
}: {
  row: SpendRow;
  total: number;
  locale: Locale;
  t: Dict;
  year: YearKey;
  onClose: () => void;
}) {
  /* `gf07` on screen is `GF07` in the bundle. Its children are the six-character
     codes under it, and the division's own row is never one of them. */
  const division = "GF" + row.k.slice(2);
  const subs = subFunctions(year, division);
  /* The prototype scales the bars against the largest row, which is the first
     after the sort — signed, not absolute, exactly as it reads it. */
  const mx = subs.length ? subs[0][1] : 0;

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

      {subs.length ? (
        <div className="subs">
          <span className="subs-h">{t.subsH}</span>
          {subs.map(([code, v]) => {
            const note = subFunctionNote(locale, code);
            return (
              <div className="subrow" key={code}>
                <span className="sn">
                  {subFunctionLabel(locale, code) || code}
                  {note ? <i>{note}</i> : null}
                </span>
                <span className="sv">{eur(locale, v)}</span>
                <span className="sp">{nf(locale, (v / row.v) * 100, 1)}%</span>
                <span className="sbar">
                  <i
                    style={{
                      width: `${Math.max(1, (v / mx) * 100)}%`,
                      background: row.c,
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <button className="close" onClick={onClose}>
        {t.fClose}
      </button>
    </div>
  );
}

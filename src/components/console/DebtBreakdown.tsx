"use client";

import { useState } from "react";
import type { Locale } from "@/i18n";
import { eur } from "@/lib/format";
import Donut, { type DonutSlice } from "./Donut";

/**
 * The one breakdown block on the debt screen: three questions about the same
 * stock, one answered at a time.
 *
 * M3 stacked them — three rings side by side, then a redemption calendar, then
 * a fourth ring — which made the screen a scroll through everything the bundle
 * holds. Here the questions are a tab strip, so the reader picks one and reads
 * it at full width, and each view states its own perimeter and reference date:
 * the sources behind them are published on different clocks and none of them
 * shares the headline's.
 *
 * The views arrive fully modelled from the server. This component owns only
 * which one is open and which slice is focused — view state, like the who-pays
 * tabs in revenue, not an address.
 */

/** A ring: a published partition of some total, with that total in the middle. */
export interface DebtRing {
  rows: DonutSlice[];
  total: number;
  centre: string;
}

export interface DebtView {
  k: string;
  /** The question, short enough to be a tab. */
  tab: string;
  /** What the figures under it are, in one line. */
  sub: string;
  /** Perimeter and reference date — never the same for two views. */
  scope: string;
  /** Exactly one of these three: a ring, a calendar, or a named gap. */
  ring?: DebtRing;
  /** The redemption calendar: one published year per row, in calendar order. */
  calendar?: [string, number][];
  gap?: string;
  gapTag?: string;
  noteTag?: string;
  note?: string;
}

export default function DebtBreakdown({
  title,
  views,
  locale,
}: {
  title: string;
  views: DebtView[];
  locale: Locale;
}) {
  const [open, setOpen] = useState(views[0].k);
  const [focus, setFocus] = useState<string | null>(null);

  const view = views.find((v) => v.k === open) ?? views[0];

  /* Changing the question clears what was focused inside the old one: a slice
     key means nothing to the next ring. */
  const show = (k: string) => {
    setOpen(k);
    setFocus(null);
  };

  return (
    <div className="dsec">
      <div className="dsec-h">
        <span className="t">{title}</span>
        <span className="x">{view.scope}</span>
      </div>

      <div className="wtabs">
        {views.map((v) => (
          <button
            key={v.k}
            className="wtb"
            aria-pressed={v.k === view.k}
            onClick={() => show(v.k)}
          >
            {v.tab}
          </button>
        ))}
      </div>

      <div className="dview">
        <div className="dview-q">{view.sub}</div>

        {view.ring ? (
          <Donut
            rows={view.ring.rows}
            total={view.ring.total}
            floor={0.7}
            absShares
            centre={view.ring.centre}
            aria={`${view.tab} — ${view.ring.centre}`}
            locale={locale}
            focus={focus}
            /* Pressing the same slice again clears it, as everywhere else in
               the console. */
            onFocus={(k) => setFocus((f) => (f === k ? null : k))}
          />
        ) : null}

        {view.calendar ? <Calendar rows={view.calendar} locale={locale} /> : null}

        {view.gap ? (
          <div className="dgap">
            <span className="tag">{view.gapTag}</span>
            {view.gap}
          </div>
        ) : null}

        {view.note ? (
          <div className="dnote">
            {view.noteTag ? <b>{view.noteTag}</b> : null}
            {view.noteTag ? " — " : null}
            {view.note}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * What falls due, year by year, at face value. A stock falling due over time is
 * a timeline, so it stays bars — one row for every year the published calendar
 * carries, out past 2070. A year the source has no securities maturing in has
 * no row: a zero bar would read as a published zero.
 *
 * The years beyond the first decade take the dimmer fill. They are the same
 * fact at a different distance, not a lesser one.
 */
function Calendar({
  rows,
  locale,
}: {
  rows: [string, number][];
  locale: Locale;
}) {
  const peak = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="mat">
      {rows.map(([y, v], i) => (
        <div className={i >= 10 ? "matr far" : "matr"} key={y}>
          <span className="my">{y}</span>
          <span className="mt">
            <span
              className="mf"
              style={{ width: `${Math.max(0.6, (v / peak) * 100)}%` }}
            />
          </span>
          <span className="mv">{eur(locale, v)}</span>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Locale } from "@/i18n";
import { eur } from "@/lib/format";
import Donut, { type DonutSlice } from "./Donut";

/**
 * The one breakdown block on the debt screen: four questions about the same
 * stock, one answered at a time.
 *
 * M3 stacked them — three rings side by side, then a twenty-eight row
 * redemption calendar, then a fourth ring — which made the screen a scroll
 * through everything the bundle holds and put two rings of the same four
 * government tiers on it. Here the questions are a tab strip, so the reader
 * picks one and reads it at full width, and each view states its own perimeter
 * and reference date: the four sources behind them are published on different
 * clocks and none of them shares the headline's.
 *
 * The views arrive fully modelled from the server. This component owns only
 * which one is open, which slice is focused, and which maturity period is
 * expanded — view state, like the who-pays tabs in revenue, not an address.
 */

/** A ring: a published partition of some total, with that total in the middle. */
export interface DebtRing {
  rows: DonutSlice[];
  total: number;
  centre: string;
  centreSub?: string;
}

/** One folded period of the redemption calendar, with its years inside it. */
export interface DebtPeriod {
  k: string;
  label: string;
  v: number;
  years: [string, number][];
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
  periods?: DebtPeriod[];
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
  const [period, setPeriod] = useState<string | null>(null);

  const view = views.find((v) => v.k === open) ?? views[0];

  /* Changing the question clears what was focused inside the old one: a slice
     key means nothing to the next ring, and a period means nothing to a ring at
     all. */
  const show = (k: string) => {
    setOpen(k);
    setFocus(null);
    setPeriod(null);
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
            centreSub={view.ring.centreSub}
            aria={`${view.tab} — ${view.ring.centre}`}
            locale={locale}
            focus={focus}
            /* Pressing the same slice again clears it, as everywhere else in
               the console. */
            onFocus={(k) => setFocus((f) => (f === k ? null : k))}
          />
        ) : null}

        {view.periods ? (
          <Calendar
            periods={view.periods}
            locale={locale}
            open={period}
            onOpen={(k) => setPeriod((p) => (p === k ? null : k))}
          />
        ) : null}

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
 * What falls due, by period. A stock falling due over time is a timeline, so it
 * stays bars.
 *
 * Every bar on this chart — period and year alike — is drawn against the same
 * peak, so a year inside a period can never out-draw the period holding it.
 */
function Calendar({
  periods,
  locale,
  open,
  onOpen,
}: {
  periods: DebtPeriod[];
  locale: Locale;
  open: string | null;
  onOpen: (k: string) => void;
}) {
  const peak = Math.max(...periods.map((p) => p.v));
  const width = (v: number) => `${Math.max(0.6, (v / peak) * 100)}%`;

  return (
    <div className="mat">
      {periods.map((p) => {
        /* The nearest period is often a single year — the rest of the current
           one. Opening it would show the same bar and the same figure again, so
           it is a reading rather than a control and carries no caret. */
        const many = p.years.length > 1;
        const on = many && open === p.k;
        const bar = (
          <>
            <span className="mt">
              <span className="mf" style={{ width: width(p.v) }} />
            </span>
            <span className="mv">{eur(locale, p.v)}</span>
          </>
        );
        return (
          <div key={p.k}>
            {many ? (
              <button className="matr grp" aria-expanded={on} onClick={() => onOpen(p.k)}>
                <span className="my">
                  <i className={on ? "mc on" : "mc"} aria-hidden>
                    ▸
                  </i>
                  {p.label}
                </span>
                {bar}
              </button>
            ) : (
              <div className="matr">
                <span className="my">
                  <i className="mc" aria-hidden />
                  {p.label}
                </span>
                {bar}
              </div>
            )}

            {on ? (
              <div className="matsub">
                {p.years.map(([y, v]) => (
                  <div className="matr far" key={y}>
                    <span className="my">{y}</span>
                    <span className="mt">
                      <span className="mf" style={{ width: width(v) }} />
                    </span>
                    <span className="mv">{eur(locale, v)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

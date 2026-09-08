"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur, nf, nf0 } from "@/lib/format";
import type { YearKey } from "@/lib/types";

/**
 * The stock over time, on two axes: what is owed in euros on the left, and what
 * it is as a share of GDP on the right.
 *
 * Both are published figures — the ratio is Eurostat's own, not one divided out
 * here — and they are two different facts. The level has risen in all but two
 * years since 1995; the ratio fell through thirteen of them, because GDP was
 * growing faster than the debt was. One line would have to pick a story. Two,
 * each with its own labelled axis in its own colour, let the reader see both.
 *
 * The earlier version was a 300×54 viewBox with three labels pinned over it: no
 * y axis, no x axis, no way to read any year but the three that carried a label.
 *
 * The chart is drawn at measured pixel width rather than scaled from a fixed
 * viewBox, because SVG text scales with the canvas: a viewBox that fits a
 * desktop puts the tick labels at 4px on a phone. A ResizeObserver hands the
 * real width over after mount; the first render — the server's and the
 * hydrating client's alike — uses one constant, so the static HTML carries a
 * complete chart and nothing shifts under the reader except the width.
 *
 * The year being read is the parent's state, not this component's: the figures
 * above the chart are readings of the same year, so one place owns it.
 */

const DEFAULT_W = 1120;
/** Gutters for the axis labels. A phone cannot spare 52px on each side. */
const PAD = { l: 54, r: 52, t: 36, b: 30 } as const;
const PAD_SM = { l: 46, r: 42, t: 32, b: 26 } as const;
const NARROW = 620;
/** Both axes take the same number of gaps, so their gridlines are one set. */
const GAPS = 5;
/** Tried in order; the first step whose top clears the series wins. */
const NICE = [1, 2, 2.5, 3, 4, 5, 10] as const;

/**
 * A top that is a round multiple of `GAPS`, so every tick is a round number and
 * the two axes can share one set of gridlines. Zero is always the baseline: a
 * truncated one would exaggerate every move on the chart.
 */
function axis(max: number): { step: number; top: number } {
  const mag = Math.pow(10, Math.floor(Math.log10(max / GAPS)));
  for (const m of NICE) {
    const step = m * mag;
    if (step * GAPS >= max) return { step, top: step * GAPS };
  }
  return { step: 10 * mag, top: 10 * mag * GAPS };
}

/**
 * One published year. Both series are plotted, and the stock and the interest
 * bill are also what the figures above the chart read.
 */
export interface TrendPoint {
  year: YearKey;
  /** Debt as a share of GDP, per cent. */
  v: number;
  /** Consolidated gross debt, € millions. */
  total: number;
  interest: number | null;
}

export default function DebtTrend({
  points,
  at,
  onAt,
  locale,
  X,
}: {
  points: TrendPoint[];
  /** Index of the year being read, or null when nothing is. */
  at: number | null;
  onAt: (i: number | null) => void;
  locale: Locale;
  X: Dict["dbt"];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(DEFAULT_W);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    /* Floored well below any real panel width: a floor above the container's
       own width would push the chart out past its right edge. */
    const measure = (px: number) => setW(Math.max(240, Math.round(px)));
    const ro = new ResizeObserver((es) => measure(es[0].contentRect.width));
    ro.observe(el);
    measure(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const narrow = w < NARROW;
  const h = narrow ? 210 : 260;
  const pad = narrow ? PAD_SM : PAD;

  const g = useMemo(() => {
    /* The level is held in € millions and read in € billions, which is what the
       left axis is labelled in: the ticks stay four digits instead of seven. */
    const L = axis(Math.max(...points.map((p) => p.total)) / 1000);
    const P = axis(Math.max(...points.map((p) => p.v)));

    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const px = (i: number) => pad.l + (i * iw) / (n - 1);
    /** `f` is 0 at the baseline and 1 at the top of either axis. */
    const py = (f: number) => pad.t + (1 - f) * ih;
    const yL = (m: number) => py(m / 1000 / L.top);
    const yP = (v: number) => py(v / P.top);

    const path = (y: (v: number) => number, val: (p: TrendPoint) => number) =>
      points
        .map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${y(val(p)).toFixed(1)}`)
        .join(" ");

    const line = path(yL, (p) => p.total);
    const base = py(0).toFixed(1);

    /* One position per gridline; each axis labels it in its own unit. */
    const ticks = Array.from({ length: GAPS + 1 }, (_, i) => ({
      f: i / GAPS,
      y: py(i / GAPS),
      bn: (L.top / GAPS) * i,
      pc: (P.top / GAPS) * i,
    }));

    /* Every fifth year, and the last one whatever it is: the latest reading is
       the one the reader came for, so its year is never left unlabelled. Every
       tenth on a phone, where five would overlap. */
    const every = narrow ? 10 : 5;
    const xTicks = points
      .map((p, i) => ({ i, year: p.year }))
      .filter(({ i, year }) => Number(year) % every === 0 || i === n - 1);

    return {
      px,
      py,
      yL,
      yP,
      line,
      area: `${line} L${px(n - 1).toFixed(1)} ${base} L${px(0).toFixed(1)} ${base} Z`,
      pcLine: path(yP, (p) => p.v),
      ticks,
      xTicks,
    };
  }, [h, n, narrow, pad, points, w]);

  /* The nearest year to the pointer, so the readout tracks the lines rather
     than needing a hit on a 4px dot. */
  const track = useCallback(
    (clientX: number, target: HTMLElement) => {
      const r = target.getBoundingClientRect();
      const t = (clientX - r.left - pad.l) / (w - pad.l - pad.r);
      onAt(Math.min(n - 1, Math.max(0, Math.round(t * (n - 1)))));
    },
    [n, onAt, pad, w],
  );

  const onKey = (e: React.KeyboardEvent) => {
    const step = (d: number) =>
      onAt(Math.min(n - 1, Math.max(0, (at == null ? (d > 0 ? -1 : n) : at) + d)));
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Home") onAt(0);
    else if (e.key === "End") onAt(n - 1);
    else if (e.key === "Escape") onAt(null);
    else return;
    e.preventDefault();
  };

  const cur = at != null ? points[at] : null;
  const last = points[n - 1];
  /* Which end of the plot the lines have left free. Early years put both low or
     mid, later years put both high, so one test on the higher of the two is
     enough to keep the readout off them. */
  const readoutLow =
    cur != null &&
    Math.min(g.yL(cur.total), g.yP(cur.v)) < pad.t + (h - pad.t - pad.b) * 0.4;
  const say = (p: TrendPoint) =>
    `${p.year}: ${eur(locale, p.total)}, ${nf(locale, p.v, 1)}% ${X.ofGdp}`;

  return (
    <div className="dtrend">
      <div className="th">
        <span className="t">{X.trendK}</span>
        <span className="x">
          {points[0].year}–{last.year} · {X.trendSrc}
        </span>
      </div>

      <div
        className="plot"
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={`${X.trendK}. ${say(points[0])}. ${say(last)}. ${X.trendNav}`}
        onKeyDown={onKey}
        onPointerMove={(e) => track(e.clientX, e.currentTarget)}
        onPointerDown={(e) => track(e.clientX, e.currentTarget)}
        onPointerLeave={() => onAt(null)}
        onPointerCancel={() => onAt(null)}
        onBlur={() => onAt(null)}
      >
        <svg width={w} height={h} role="img" aria-hidden>
          {/* One gridline per tick, labelled in € on the left and in per cent on
              the right — each in its own series' colour, so the axis says which
              line it belongs to with no legend to cross-reference. */}
          {g.ticks.map((tk) => (
            <g key={tk.f}>
              <line
                className={tk.f === 0 ? "ax" : "gl"}
                x1={pad.l}
                y1={tk.y}
                x2={w - pad.r}
                y2={tk.y}
              />
              <text className="yl lv" x={pad.l - 8} y={tk.y} dy="0.32em">
                {nf0(locale, tk.bn)}
              </text>
              <text className="yl pc" x={w - pad.r + 8} y={tk.y} dy="0.32em">
                {nf0(locale, tk.pc)}%
              </text>
            </g>
          ))}

          {/* What each axis counts, once, at the head of it. Both are anchored
              to the canvas edge rather than to the tick column, so neither can
              be clipped by a gutter sized for the ticks alone. */}
          <text className="au lv" x={0} y={pad.t - 13}>
            {X.unitBn}
          </text>
          <text className="au pc" x={w} y={pad.t - 13}>
            {X.unitPc}
          </text>

          <path className="ar" d={g.area} />
          <path className="ln lv" d={g.line} />
          <path className="ln pc" d={g.pcLine} />

          {/* X axis: a tick and a year every five years. */}
          {g.xTicks.map(({ i, year }) => (
            <g key={year}>
              <line
                className="tk"
                x1={g.px(i)}
                y1={g.py(0)}
                x2={g.px(i)}
                y2={g.py(0) + 4}
              />
              <text className="xl" x={g.px(i)} y={g.py(0) + 17}>
                {year}
              </text>
            </g>
          ))}

          {/* The latest reading always carries its dots: they are where the
              figures at the top of the screen come from. */}
          <circle className="pt lv" cx={g.px(n - 1)} cy={g.yL(last.total)} r="3" />
          <circle className="pt pc" cx={g.px(n - 1)} cy={g.yP(last.v)} r="3" />

          {cur ? (
            <g>
              <line
                className="cross"
                x1={g.px(at!)}
                y1={pad.t}
                x2={g.px(at!)}
                y2={g.py(0)}
              />
              <circle className="pt lv on" cx={g.px(at!)} cy={g.yL(cur.total)} r="4.5" />
              <circle className="pt pc on" cx={g.px(at!)} cy={g.yP(cur.v)} r="4.5" />
            </g>
          ) : null}
        </svg>

        {/* Pinned to whichever end of the plot the lines have left free, rather
            than to either line: the box carries both readings, and chasing one
            of two crossing lines with something this size would cover the
            other. */}
        {cur ? (
          <div
            className={readoutLow ? "dtt low" : "dtt"}
            style={{
              left: Math.min(w - pad.r - 60, Math.max(pad.l + 60, g.px(at!))),
              top: readoutLow ? g.py(0) : pad.t,
            }}
          >
            <i>{cur.year}</i>
            <b className="lv">{eur(locale, cur.total)}</b>
            <b className="pc">
              {nf(locale, cur.v, 1)}% {X.ofGdp}
            </b>
          </div>
        ) : null}

        {/* The readout the pointer gives sighted readers, given to a screen
            reader as it changes. */}
        <p className="sr-only" aria-live="polite">
          {cur ? say(cur) : ""}
        </p>
      </div>
    </div>
  );
}

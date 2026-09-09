"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur, nf0 } from "@/lib/format";
import type { YearKey } from "@/lib/types";

/**
 * The public accounts over time: three published series on one axis.
 *
 * All three are euros of the same year on the same accrual basis, so they share one
 * scale and can be read against each other directly — the vertical gap between revenue
 * and spending *is* the balance drawn below them. That is the whole reason this screen
 * exists and the reason it has no second axis: a ratio on the right would make the gap
 * mean nothing.
 *
 * The balance is Eurostat's published B.9, plotted at its own sign. It is negative in
 * every year the series covers, so it sits below zero and the axis carries a negative
 * range. Zero is drawn as the axis line rather than as the floor: a chart whose bottom
 * edge was the lowest deficit would put the balance and the two flows on scales that
 * only look like one.
 *
 * A null breaks the line rather than being bridged — see `DebtTrend`, which this chart
 * follows in every mechanical detail: measured pixel width rather than a scaled viewBox,
 * so axis text is text at a real size; a ResizeObserver after mount, so the server's
 * HTML already carries a complete chart; runs rather than one path, so no segment is
 * drawn across a year no source published. The series is complete for 2012-2025 today
 * and `verify.js` asserts it has no hole, so the runs are one run each.
 *
 * Simpler than the debt chart in two ways, both deliberate. There are no series
 * switches: one axis serves all three, so turning one off would rescale nothing and buy
 * nothing. And there is no floating readout box: the hero above the chart is the
 * readout, so the pointer only has to say which year is being read and the key below it
 * only has to say which colour is which.
 */

const DEFAULT_W = 1120;
const PAD = { l: 60, r: 18, t: 34, b: 30 } as const;
const PAD_SM = { l: 48, r: 12, t: 30, b: 26 } as const;
const NARROW = 620;
/** The most gridlines the axis may use; the step chosen decides how many it takes. */
const GAPS_MAX = 6;
/** Tried in order; the first step that spans the series in `GAPS_MAX` gaps wins. */
const NICE = [1, 2, 2.5, 4, 5, 10] as const;

/**
 * A round step, and a floor and ceiling that are whole multiples of it. Because both
 * ends are multiples of the step, zero is always one of the gridlines — which is what
 * lets the balance be read against the line it is a shortfall from.
 */
function axis(min: number, max: number): { step: number; lo: number; hi: number } {
  const span = Math.max(max - min, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(span / GAPS_MAX)));
  for (const m of NICE) {
    const step = m * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    if (Math.round((hi - lo) / step) <= GAPS_MAX) return { step, lo, hi };
  }
  const step = 10 * mag;
  return {
    step,
    lo: Math.floor(min / step) * step,
    hi: Math.ceil(max / step) * step,
  };
}

/** One published year. Every series the chart draws is a field on it. */
export interface OverviewPoint {
  year: YearKey;
  /** Total revenue, € millions. */
  rev: number | null;
  /** Total expenditure, € millions. */
  exp: number | null;
  /** Net lending (+) / net borrowing (−), € millions, as published. */
  def: number | null;
}

/**
 * The three series, in reading order: what came in, what went out, the gap. Exported
 * because the hero reads the same three in the same order — one definition, so the key
 * under the chart and the figures above it can never fall out of step.
 */
export const KEYS = ["rev", "exp", "def"] as const;
type Key = (typeof KEYS)[number];

const VAL: Record<Key, (p: OverviewPoint) => number | null> = {
  rev: (p) => p.rev,
  exp: (p) => p.exp,
  def: (p) => p.def,
};

export default function OverviewTrend({
  points,
  at,
  onAt,
  locale,
  X,
}: {
  points: OverviewPoint[];
  /** Index of the year being read, or null when nothing is. */
  at: number | null;
  onAt: (i: number | null) => void;
  locale: Locale;
  X: Dict["ov"];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(DEFAULT_W);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    /* Floored well below any real panel width: a floor above the container's own
       width would push the chart out past its right edge. */
    const measure = (px: number) => setW(Math.max(240, Math.round(px)));
    const ro = new ResizeObserver((es) => measure(es[0].contentRect.width));
    ro.observe(el);
    measure(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const narrow = w < NARROW;
  const h = narrow ? 230 : 300;
  const pad = narrow ? PAD_SM : PAD;

  const label: Record<Key, string> = { rev: X.sRev, exp: X.sExp, def: X.sDef };

  const g = useMemo(() => {
    /* Held in € millions, read in € billions — which is what the axis is labelled
       in, so its ticks stay three digits rather than seven. */
    const vals = KEYS.flatMap((k) => points.map((p) => VAL[k](p))).filter(
      (v): v is number => v != null,
    );
    /* Zero is forced into the range from both sides: it is the line the balance is
       measured from, so it is on the chart whatever the series happen to do. */
    const A = axis(Math.min(0, ...vals) / 1000, Math.max(0, ...vals) / 1000);

    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const px = (i: number) => pad.l + (i * iw) / (n - 1);
    /** `v` is € billions on the one axis every series shares. */
    const py = (v: number) => pad.t + ((A.hi - v) / (A.hi - A.lo)) * ih;
    const y = (v: number) => py(v / 1000);

    /* One run per unbroken stretch of published years: a gap ends the run and the
       next value opens a new one, so nothing is drawn across a year no source has a
       figure for. */
    const path = (k: Key) => {
      let d = "";
      let open = false;
      points.forEach((p, i) => {
        const v = VAL[k](p);
        if (v == null) {
          open = false;
          return;
        }
        d += `${open ? "L" : "M"}${px(i).toFixed(1)} ${y(v).toFixed(1)} `;
        open = true;
      });
      return d.trim();
    };

    /* The balance is washed in down to zero, because the quantity it measures is the
       area between the line and zero. Only where the run is unbroken: a wash under a
       series with a hole in it would shade a figure nobody published. */
    const zero = py(0).toFixed(1);
    const solid = points.every((p) => p.def != null);
    const area = solid
      ? `${path("def")} L${px(n - 1).toFixed(1)} ${zero} L${px(0).toFixed(1)} ${zero} Z`
      : null;

    const steps = Math.round((A.hi - A.lo) / A.step);
    const ticks = Array.from({ length: steps + 1 }, (_, i) => {
      const bn = A.lo + A.step * i;
      return { bn, y: py(bn) };
    });

    /* Every second year, and the last one whatever it is: the latest reading is the
       one the reader came for, so its year is never left unlabelled. Every fifth on a
       phone, where two would overlap. */
    const every = narrow ? 5 : 2;
    const xTicks = points
      .map((p, i) => ({ i, year: p.year }))
      .filter(({ i, year }) => Number(year) % every === 0 || i === n - 1);

    return { px, py, y, path, area, ticks, xTicks, zero: py(0) };
  }, [h, n, narrow, pad, points, w]);

  /* The nearest year to the pointer, so the readout tracks the lines rather than
     needing a hit on a 4px dot. */
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
  /* The key doubles as the readout, so it reads the year under the pointer when there
     is one and the latest year when there is not. */
  const read = cur ?? last;

  const say = (p: OverviewPoint) =>
    [
      `${p.year}:`,
      ...KEYS.map((k) => {
        const v = VAL[k](p);
        return `${label[k]} ${v == null ? X.noPub : eur(locale, v)}`;
      }),
    ].join(" ");

  return (
    <div className="otrend">
      <div className="th">
        <span className="t">{X.k}</span>
        <span className="x">
          {points[0].year}–{last.year} · {X.src}
        </span>
      </div>

      {/* The key names the colours and nothing else. The figures live in the hero
          above, which reads the same year this chart is pointing at — printing them
          twice on one screen would be two places to disagree. There is no switch on it
          either: one axis serves all three, so hiding a series would rescale nothing. */}
      <div className="okey">
        {KEYS.map((k) => (
          <div key={k} className={`oki ${k}`}>
            <i className="sw" aria-hidden />
            <span className="nm">{label[k]}</span>
          </div>
        ))}
        <div className="oyr">{read.year}</div>
      </div>

      <div
        className="plot"
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={`${X.k}. ${say(points[0])}. ${say(last)}. ${X.nav}`}
        onKeyDown={onKey}
        onPointerMove={(e) => track(e.clientX, e.currentTarget)}
        onPointerDown={(e) => track(e.clientX, e.currentTarget)}
        onPointerLeave={() => onAt(null)}
        onPointerCancel={() => onAt(null)}
        onBlur={() => onAt(null)}
      >
        <svg width={w} height={h} role="img" aria-hidden>
          {/* One gridline per tick, labelled in € billions. Zero is the axis line:
              it is what the balance is a shortfall from. */}
          {g.ticks.map((tk) => (
            <g key={tk.bn}>
              <line
                className={tk.bn === 0 ? "ax" : "gl"}
                x1={pad.l}
                y1={tk.y}
                x2={w - pad.r}
                y2={tk.y}
              />
              <text className="yl" x={pad.l - 8} y={tk.y} dy="0.32em">
                {nf0(locale, tk.bn)}
              </text>
            </g>
          ))}

          {/* What the axis counts, once, at the head of it. Anchored to the canvas
              edge rather than to the tick column, so a gutter sized for the ticks
              alone cannot clip it. */}
          <text className="au" x={0} y={pad.t - 13}>
            {X.unitBn}
          </text>

          {g.area ? <path className="ar" d={g.area} /> : null}
          {KEYS.map((k) => (
            <path key={k} className={`ln ${k}`} d={g.path(k)} />
          ))}

          {/* X axis: a tick and a year every second year, along the zero line the
              series are read against. */}
          {g.xTicks.map(({ i, year }) => (
            <g key={year}>
              <line
                className="tk"
                x1={g.px(i)}
                y1={h - pad.b}
                x2={g.px(i)}
                y2={h - pad.b + 4}
              />
              <text className="xl" x={g.px(i)} y={h - pad.b + 17}>
                {year}
              </text>
            </g>
          ))}

          {/* The latest reading always carries its dots: they are where the figures
              in the key come from when nothing is being pointed at. */}
          {KEYS.map((k) => {
            const v = VAL[k](last);
            return v == null ? null : (
              <circle key={k} className={`pt ${k}`} cx={g.px(n - 1)} cy={g.y(v)} r="3" />
            );
          })}

          {cur ? (
            <g>
              <line
                className="cross"
                x1={g.px(at!)}
                y1={pad.t}
                x2={g.px(at!)}
                y2={h - pad.b}
              />
              {KEYS.map((k) => {
                const v = VAL[k](cur);
                return v == null ? null : (
                  <circle
                    key={k}
                    className={`pt on ${k}`}
                    cx={g.px(at!)}
                    cy={g.y(v)}
                    r="4.5"
                  />
                );
              })}
            </g>
          ) : null}
        </svg>

        {/* The readout the pointer gives sighted readers, given to a screen reader as
            it changes. */}
        <p className="sr-only" aria-live="polite">
          {cur ? say(cur) : ""}
        </p>
      </div>
    </div>
  );
}

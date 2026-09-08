"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { eur, nf, nf0 } from "@/lib/format";
import type { YearKey } from "@/lib/types";

/**
 * The debt over time: three published series, on two axes, each one switchable.
 *
 * What is owed and what it costs to owe it are both in euros and read off the
 * left axis; the share of GDP is a ratio and reads off the right. All three are
 * Eurostat's own figures — the ratio is published, not divided out here — and
 * they are three different facts. The level has risen in all but two years
 * since 1995; the ratio fell through thirteen of them, because GDP was growing
 * faster than the debt was; the interest bill fell for most of the decade the
 * stock doubled in, because rates fell faster than the stock grew. One line
 * would have to pick a story.
 *
 * The switches are what make three series on two axes readable. Each axis is
 * scaled to the series actually showing on it, so turning the stock off rescales
 * the euro axis from €2,000bn to €50bn and the interest bill — 2% of the stock,
 * a flat line against it — fills the chart. Nothing is rescaled to flatter a
 * series while another shares its axis: the flatness is the fact.
 *
 * A null breaks the line rather than being bridged: an interpolated segment
 * would draw a figure no source published. Every series is complete for
 * 1995-2025 today, so the runs are one run each.
 *
 * The chart is drawn at measured pixel width rather than scaled from a fixed
 * viewBox, because SVG text scales with the canvas: a viewBox that fits a
 * desktop puts the tick labels at 4px on a phone. A ResizeObserver hands the
 * real width over after mount; the first render — the server's and the
 * hydrating client's alike — uses one constant, so the static HTML carries a
 * complete chart and nothing shifts under the reader except the width.
 *
 * The year being read is the parent's state, not this component's: the headline
 * above the chart is a reading of the same year, so one place owns it. Which
 * series are showing is this component's own — it is how the chart is drawn, not
 * what the screen is about.
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

/** One published year. Every series the chart can draw is a field on it. */
export interface TrendPoint {
  year: YearKey;
  /** Debt as a share of GDP, per cent. */
  v: number;
  /** Consolidated gross debt, € millions. */
  total: number;
  /** Interest paid in the year, € millions. */
  interest: number | null;
}

/**
 * A year a series has no published figure for. The chip and the readout row are
 * too narrow for the prose form, which the spoken text carries instead: nothing
 * is drawn or written where no figure exists.
 */
const DASH = "—";

/** The three series, in legend order. */
const KEYS = ["lv", "int", "pc"] as const;
type Key = (typeof KEYS)[number];

/** Which axis each is read off: `l` is euros, `r` is per cent. */
const AXIS: Record<Key, "l" | "r"> = { lv: "l", int: "l", pc: "r" };

const VAL: Record<Key, (p: TrendPoint) => number | null> = {
  lv: (p) => p.total,
  int: (p) => p.interest,
  pc: (p) => p.v,
};

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
  const [on, setOn] = useState<Record<Key, boolean>>({
    lv: true,
    int: true,
    pc: true,
  });

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

  const shown = KEYS.filter((k) => on[k]);

  const label: Record<Key, string> = { lv: X.sLv, int: X.sInt, pc: X.sPc };
  const fmt: Record<Key, (v: number) => string> = {
    lv: (v) => eur(locale, v),
    int: (v) => eur(locale, v),
    pc: (v) => `${nf(locale, v, 1)}%`,
  };

  const g = useMemo(() => {
    /* Each axis is scaled to the series showing on it, so a switch is not a
       cosmetic filter: it is what makes the remaining series readable. The
       euro series are held in € millions and read in € billions, which is what
       the left axis is labelled in — the ticks stay four digits, not seven. */
    const div = (side: "l" | "r") => (side === "l" ? 1000 : 1);
    const top = (side: "l" | "r") => {
      const vals = KEYS.filter((k) => on[k] && AXIS[k] === side)
        .flatMap((k) => points.map((p) => VAL[k](p)))
        .filter((v): v is number => v != null);
      return vals.length ? axis(Math.max(...vals) / div(side)) : null;
    };
    const L = top("l");
    const R = top("r");

    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const px = (i: number) => pad.l + (i * iw) / (n - 1);
    /** `f` is 0 at the baseline and 1 at the top of either axis. */
    const py = (f: number) => pad.t + (1 - f) * ih;
    /** A series' y, in the units of the axis it is read off. */
    const y = (k: Key, v: number) => {
      const a = AXIS[k];
      const t = a === "l" ? L : R;
      return py(v / div(a) / t!.top);
    };

    /* One run per unbroken stretch of published years: a gap ends the run and
       the next value opens a new one, so nothing is drawn across a year no
       source has a figure for. */
    const path = (k: Key) => {
      let d = "";
      let open = false;
      points.forEach((p, i) => {
        const v = VAL[k](p);
        if (v == null) {
          open = false;
          return;
        }
        d += `${open ? "L" : "M"}${px(i).toFixed(1)} ${y(k, v).toFixed(1)} `;
        open = true;
      });
      return d.trim();
    };

    /* Only the stock carries a fill, and only where it is unbroken: a wash
       under a series with a hole in it would shade a quantity nobody
       published. */
    const filled = points.map((p, i) => (VAL.lv(p) == null ? -1 : i)).filter((i) => i >= 0);
    const solid = filled.length === n;
    const base = py(0).toFixed(1);
    const area =
      on.lv && L && solid
        ? `${path("lv")} L${px(n - 1).toFixed(1)} ${base} L${px(0).toFixed(1)} ${base} Z`
        : null;

    /* One position per gridline, whichever axes are showing; each labels it in
       its own unit. Geometry, so the grid never disappears with a series. */
    const ticks = Array.from({ length: GAPS + 1 }, (_, i) => ({
      f: i / GAPS,
      y: py(i / GAPS),
      bn: L ? (L.top / GAPS) * i : null,
      pc: R ? (R.top / GAPS) * i : null,
    }));

    /* Every fifth year, and the last one whatever it is: the latest reading is
       the one the reader came for, so its year is never left unlabelled. Every
       tenth on a phone, where five would overlap. */
    const every = narrow ? 10 : 5;
    const xTicks = points
      .map((p, i) => ({ i, year: p.year }))
      .filter(({ i, year }) => Number(year) % every === 0 || i === n - 1);

    return { px, py, y, path, area, ticks, xTicks, hasL: !!L, hasR: !!R };
  }, [h, n, narrow, on, pad, points, w]);

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
  /* The legend doubles as the readout, so it reads the year under the pointer
     when there is one and the latest year when there is not. */
  const read = cur ?? last;

  /* Which end of the plot the series have left free, taken over the ones
     actually showing: the readout carries every visible reading at once, so it
     is pinned clear of them rather than chasing one of three crossing lines. */
  const ys = cur
    ? shown.map((k) => {
        const v = VAL[k](cur);
        return v == null ? Infinity : g.y(k, v);
      })
    : [];
  const readoutLow =
    ys.length > 0 && Math.min(...ys) < pad.t + (h - pad.t - pad.b) * 0.4;

  const say = (p: TrendPoint) =>
    [
      `${p.year}:`,
      ...shown.map((k) => {
        const v = VAL[k](p);
        return `${label[k]} ${v == null ? X.noPub : fmt[k](v)}`;
      }),
    ].join(" ");

  /* The last series showing cannot be switched off: an empty chart is not a
     reading, and a dead click is not an answer. The button says so rather than
     ignoring the press. */
  const sole = shown.length === 1;
  const toggle = (k: Key) => {
    if (on[k] && sole) return;
    setOn((s) => ({ ...s, [k]: !s[k] }));
  };

  /* Each axis is tinted with its series' colour, so a reader never has to work
     out which line a scale belongs to. With both euro series on one axis there
     is no single owner, so it goes neutral rather than claiming one. */
  const lTint = on.lv && on.int ? "" : on.lv ? " lv" : on.int ? " int" : "";

  return (
    <div className="dtrend">
      <div className="th">
        <span className="t">{X.trendK}</span>
        <span className="x">
          {points[0].year}–{last.year} · {X.trendSrc}
        </span>
      </div>

      {/* The switches, each carrying its own reading of the year in view. With
          the stock and the interest bill sharing an axis, the figure in the
          legend is what keeps the smaller of the two legible while the larger
          is showing. */}
      <div className="lgnd" role="group" aria-label={X.trendPick}>
        {KEYS.map((k) => {
          const v = VAL[k](read);
          return (
            <button
              key={k}
              className={`lgb ${k}`}
              aria-pressed={on[k]}
              aria-disabled={on[k] && sole}
              onClick={() => toggle(k)}
            >
              <i className="sw" aria-hidden />
              <span className="nm">{label[k]}</span>
              <b className="vv">{v == null ? DASH : fmt[k](v)}</b>
            </button>
          );
        })}
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
          {/* One gridline per tick, labelled in € on the left and in per cent
              on the right — but only on the side that has a series to label. */}
          {g.ticks.map((tk) => (
            <g key={tk.f}>
              <line
                className={tk.f === 0 ? "ax" : "gl"}
                x1={pad.l}
                y1={tk.y}
                x2={w - pad.r}
                y2={tk.y}
              />
              {tk.bn != null ? (
                <text className={`yl l${lTint}`} x={pad.l - 8} y={tk.y} dy="0.32em">
                  {nf0(locale, tk.bn)}
                </text>
              ) : null}
              {tk.pc != null ? (
                <text className="yl r pc" x={w - pad.r + 8} y={tk.y} dy="0.32em">
                  {nf0(locale, tk.pc)}%
                </text>
              ) : null}
            </g>
          ))}

          {/* What each axis counts, once, at the head of it. Both are anchored
              to the canvas edge rather than to the tick column, so neither can
              be clipped by a gutter sized for the ticks alone. */}
          {g.hasL ? (
            <text className={`au l${lTint}`} x={0} y={pad.t - 13}>
              {X.unitBn}
            </text>
          ) : null}
          {g.hasR ? (
            <text className="au r pc" x={w} y={pad.t - 13}>
              {X.unitPc}
            </text>
          ) : null}

          {g.area ? <path className="ar" d={g.area} /> : null}
          {shown.map((k) => (
            <path key={k} className={`ln ${k}`} d={g.path(k)} />
          ))}

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
          {shown.map((k) => {
            const v = VAL[k](last);
            return v == null ? null : (
              <circle
                key={k}
                className={`pt ${k}`}
                cx={g.px(n - 1)}
                cy={g.y(k, v)}
                r="3"
              />
            );
          })}

          {cur ? (
            <g>
              <line
                className="cross"
                x1={g.px(at!)}
                y1={pad.t}
                x2={g.px(at!)}
                y2={g.py(0)}
              />
              {shown.map((k) => {
                const v = VAL[k](cur);
                return v == null ? null : (
                  <circle
                    key={k}
                    className={`pt on ${k}`}
                    cx={g.px(at!)}
                    cy={g.y(k, v)}
                    r="4.5"
                  />
                );
              })}
            </g>
          ) : null}
        </svg>

        {/* Pinned to whichever end of the plot the series have left free, rather
            than to any one of them: the box carries every visible reading, and
            chasing one line with something this size would cover the others. */}
        {cur ? (
          <div
            className={readoutLow ? "dtt low" : "dtt"}
            style={{
              left: Math.min(w - pad.r - 60, Math.max(pad.l + 60, g.px(at!))),
              top: readoutLow ? g.py(0) : pad.t,
            }}
          >
            <i>{cur.year}</i>
            {shown.map((k) => {
              const v = VAL[k](cur);
              return (
                <b key={k} className={k}>
                  {v == null ? DASH : fmt[k](v)}
                </b>
              );
            })}
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

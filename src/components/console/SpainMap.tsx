"use client";

import { useEffect, useRef, useState } from "react";
import type { RegionGeometry } from "@/lib/types";
import type { Ramp } from "@/lib/ramp";

/**
 * The tactical map, ported from the prototype's `buildMap` / `paintMap` /
 * `paintLabels` / `paintFlags` / `paintHud` / `paintReticle`.
 *
 * The geometry is the pipeline's, reused verbatim from `map.json` — nothing here
 * projects, simplifies or moves a path. Everything mode-specific arrives as a
 * prop: the value for a region, how to format it, the colour scale, the stroke
 * accent, the advisory flags and the HUD rows. Spending mode passes its own set.
 */

/** An advisory marker pinned to a region: Madrid's `!`, a foral `F`, a missing `?`. */
export interface MapFlag {
  id: string;
  /** Circle centre, relative to the region centroid. */
  dx: number;
  dy: number;
  r: number;
  /** Baseline of the glyph, relative to the circle centre. */
  ty: number;
  text: string;
  fill?: string;
  textFill?: string;
}


export default function SpainMap({
  W,
  H,
  CB,
  regions,
  name,
  label,
  nudge,
  value,
  fmt,
  colour,
  intensity,
  accentRgb,
  selected,
  onSelect,
  flags,
  hudRows,
  hudAccent,
  ariaLabel,
  railWidth = 0,
  rail = null,
}: {
  W: number;
  H: number;
  CB: { x: number; y: number; w: number; h: number };
  regions: RegionGeometry[];
  /** Region name in the reader's language, for the tooltip and the a11y name. */
  name: (r: RegionGeometry) => string;
  /** The short form printed on the map itself. */
  label: (r: RegionGeometry) => string;
  /** Where to put that label, and whether it needs the smaller size. */
  nudge: (r: RegionGeometry) => { dx: number; dy: number; tight: boolean };
  /** The metric value on screen, or `null` where nothing is published. */
  value: (r: RegionGeometry) => number | null;
  fmt: (v: number | null) => string;
  /** `null` = no data, `"neg"` = refunds exceeded collection, else a colour. */
  colour: (v: number | null) => string | null | "neg";
  intensity: (v: number | null) => number;
  /** Top ramp stop; the region stroke brightens towards it with intensity. */
  accentRgb: readonly [number, number, number];
  selected: string | null;
  onSelect: (id: string) => void;
  flags: MapFlag[];
  hudRows: [string, string][];
  hudAccent: string;
  ariaLabel: string;
  /**
   * Map units reserved to the left of the country. The geometry is never
   * recomputed — the canvas grows on the negative side and the whole map,
   * Canaries inset included, is translated across by this much.
   */
  railWidth?: number;
  /** What goes in that space: the off-map coins. */
  rail?: React.ReactNode;
}) {
  const [hover, setHover] = useState<string | null>(null);

  /* The grid runs across the rail too, so the coins sit on the same graticule
     as the country rather than on a blank margin. */
  const gridLeft = -Math.ceil(railWidth / 50) * 50;
  const grid: React.ReactNode[] = [];
  for (let x = gridLeft; x <= W; x += 50)
    grid.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} />);
  for (let y = 0; y <= H; y += 50)
    grid.push(<line key={`h${y}`} x1={gridLeft} y1={y} x2={W} y2={y} />);

  /* The console's selection may be an off-map coin, which is not a region: match
     against the geometry rather than against a naming convention. */
  const selRegion = selected ? (regions.find((r) => r.id === selected) ?? null) : null;
  const sel = selRegion ? selRegion.id : null;

  return (
    <div className="mapwrap">
      <svg
        className="map"
        viewBox={`0 0 ${W + railWidth} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={ariaLabel}
      >
        <defs>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${railWidth} 0)`}>
        <g className="mgrid">{grid}</g>
        <rect className="inset-box" x={CB.x} y={CB.y} width={CB.w} height={CB.h} />
        <text className="inset-lbl" x={CB.x + 4} y={CB.y - 5}>
          CANARIAS · INSET
        </text>

        <g id="regs">
          {regions.map((r) => {
            const v = value(r);
            const c = colour(v);
            const i = intensity(v);
            const style: React.CSSProperties =
              c === null
                ? {}
                : c === "neg"
                  ? { fill: "var(--rd-dim)", stroke: "#8E2C3C", strokeWidth: "1.1" }
                  : {
                      fill: c,
                      stroke:
                        i > 0.06
                          ? `rgba(${accentRgb[0]},${accentRgb[1]},${accentRgb[2]},${(
                              0.18 + 0.62 * i
                            ).toFixed(2)})`
                          : "#0A1419",
                      strokeWidth: (0.9 + 1.5 * i).toFixed(2),
                    };
            if (i > 0.55) style.filter = "url(#glow)";
            return (
              <path
                key={r.id}
                className={`reg${c === null ? " nodata" : ""}${sel === r.id ? " sel" : ""}`}
                id={`r-${r.id}`}
                data-id={r.id}
                d={r.d}
                tabIndex={0}
                role="button"
                aria-label={name(r)}
                aria-pressed={sel === r.id}
                style={style}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.id);
                  }
                }}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
              >
                <title>{name(r)}</title>
              </path>
            );
          })}
        </g>

        {/* Every region is labelled, at rest, with its short name and its
            figure. Hover and selection only change the emphasis. */}
        <g id="labels">
          {regions.map((r) => {
            const v = value(r);
            const n = nudge(r);
            const on = hover === r.id || sel === r.id;
            const cls = n.tight ? " tight" : "";
            return (
              <g key={r.id} className={on ? "lbl on" : "lbl"}>
                <text className={`reg-lbl${cls}`} x={r.cx + n.dx} y={r.cy + n.dy - 5}>
                  {label(r)}
                </text>
                {v != null ? (
                  <text className={`reg-val${cls}`} x={r.cx + n.dx} y={r.cy + n.dy + 8}>
                    {fmt(v)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        <g id="flags">
          {flags.map((f) => {
            const r = regions.find((x) => x.id === f.id);
            if (!r) return null;
            return (
              <g className="flag" key={`${f.id}-${f.text}`}>
                <circle
                  cx={r.cx + f.dx}
                  cy={r.cy + f.dy}
                  r={f.r}
                  style={f.fill ? { fill: f.fill } : undefined}
                />
                <text
                  x={r.cx + f.dx}
                  y={r.cy + f.dy + f.ty}
                  style={f.textFill ? { fill: f.textFill } : undefined}
                >
                  {f.text}
                </text>
              </g>
            );
          })}
        </g>

        <Reticle W={W} H={H} region={selRegion ?? null} />

        <g id="hud">
          {/* The frame grows with however many rows the mode gives it. */}
          <g
            className="hudg"
            transform={`translate(${W - 232} ${H - (hudRows.length * 19 + 14)})`}
          >
            <path d="M0 8 L0 0 L10 0" fill="none" stroke="#274150" />
            <path d="M212 0 L222 0 L222 8" fill="none" stroke="#274150" />
            <path
              d={`M0 ${hudRows.length * 19 - 6} L0 ${hudRows.length * 19 + 2} L10 ${hudRows.length * 19 + 2}`}
              fill="none"
              stroke="#274150"
            />
            <path
              d={`M212 ${hudRows.length * 19 + 2} L222 ${hudRows.length * 19 + 2} L222 ${hudRows.length * 19 - 6}`}
              fill="none"
              stroke="#274150"
            />
            {hudRows.map((row, i) => (
              <g key={row[0]}>
                <text
                  x="8"
                  y={20 + i * 19}
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="10"
                  letterSpacing="1.2"
                  fill="#849AA6"
                >
                  {row[0]}
                </text>
                <text
                  x="214"
                  y={20 + i * 19}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11"
                  fill={i === hudRows.length - 1 ? hudAccent : "#A6BEC9"}
                >
                  {row[1]}
                </text>
              </g>
            ))}
          </g>
        </g>
        </g>

        {/* Last, so it sits above the graticule and the country outlines. */}
        {rail}
      </svg>
    </div>
  );
}

/**
 * The crosshair and corner brackets around the selected region, and the single
 * sweep that runs down it once on selection. The sweep is a Web Animations call
 * so it plays exactly once per selection and leaves nothing behind — and it is
 * skipped outright when the reader has asked for reduced motion.
 */
function Reticle({
  W,
  H,
  region,
}: {
  W: number;
  H: number;
  region: RegionGeometry | null;
}) {
  const rect = useRef<SVGRectElement | null>(null);
  const id = region?.id ?? null;
  const bbox = region?.bbox;

  useEffect(() => {
    const el = rect.current;
    if (!el || !bbox) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const p = 7;
    el.animate(
      [
        { transform: "translateY(0px)", opacity: 0 },
        { transform: "translateY(6px)", opacity: 0.7 },
        { transform: `translateY(${bbox[3] - bbox[1] + p * 2}px)`, opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(.3,0,.2,1)" },
    );
  }, [id, bbox]);

  if (!region) return null;
  const [x0, y0, x1, y1] = region.bbox;
  const p = 7;
  const K = 13;
  const corner = (ax: number, ay: number, dx: number, dy: number) =>
    `M${ax + dx * K} ${ay} L${ax} ${ay} L${ax} ${ay + dy * K}`;

  return (
    <>
      <g id="retic" className="retic">
        <line x1={0} y1={region.cy} x2={W} y2={region.cy} opacity=".28" />
        <line x1={region.cx} y1={0} x2={region.cx} y2={H} opacity=".28" />
        <circle cx={region.cx} cy={region.cy} r={9} />
        <circle cx={region.cx} cy={region.cy} r={1.6} style={{ fill: "var(--am)" }} />
        <path className="brk" d={corner(x0 - p, y0 - p, 1, 1)} />
        <path className="brk" d={corner(x1 + p, y0 - p, -1, 1)} />
        <path className="brk" d={corner(x0 - p, y1 + p, 1, -1)} />
        <path className="brk" d={corner(x1 + p, y1 + p, -1, -1)} />
      </g>
      <g id="sweep" className="sweep">
        <rect
          ref={rect}
          key={id ?? "none"}
          x={x0 - p}
          y={y0 - p}
          width={x1 - x0 + p * 2}
          height={3}
          fill="var(--am)"
          opacity=".55"
        />
      </g>
    </>
  );
}

/** The ramp swatch under the map. Takes the mode's ramp, so spending reuses it. */
export function RampLegend({
  ramp,
  lo,
  hi,
}: {
  ramp: Ramp;
  lo: string;
  hi: string;
}) {
  const stops: string[] = [];
  for (let i = 0; i <= 10; i++) stops.push(ramp(i / 10));
  return (
    <div className="mapbar">
      <div className="legend">
        <span>{lo}</span>
        <div
          className="ramp"
          style={{ background: `linear-gradient(90deg,${stops.join(",")})` }}
        />
        <span>{hi}</span>
      </div>
    </div>
  );
}

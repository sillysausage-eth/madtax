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

/** An advisory marker pinned to an autonomous region: today only spending mode's `?` for a year with nothing published. */
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
  /** Hover text. A one-glyph badge means nothing until it says what it marks. */
  title?: string;
}


/**
 * How far the drawing is pulled back out of the space the coin rail reserves.
 *
 * Cropping the canvas to the geography (`CANVAS_W`) left the country flush
 * against the panel beside it while all the slack stayed on the coin side: 46
 * units to the coin, 10 to the edge. This moves the whole drawing — country,
 * Canaries inset, HUD and graticule together — back by half that difference, so
 * both gaps come out at 28. It shifts content inside the canvas; the viewBox is
 * untouched, so nothing is rescaled and the crop is unaffected.
 */
const PULL = 18;

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
     as the country rather than on a blank margin — and it runs `PULL` further
     right than the map's own width, because the pull moves the whole group left
     and the graticule still has to reach the edge of the canvas. */
  const gridLeft = -Math.ceil((railWidth - PULL) / 50) * 50;
  const gridRight = W + PULL;
  const grid: React.ReactNode[] = [];
  for (let x = gridLeft; x <= gridRight; x += 50)
    grid.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} />);
  for (let y = 0; y <= H; y += 50)
    grid.push(<line key={`h${y}`} x1={gridLeft} y1={y} x2={gridRight} y2={y} />);

  /* The console's selection may be an off-map coin, which is not a region: match
     against the geometry rather than against a naming convention. */
  const selRegion = selected ? (regions.find((r) => r.id === selected) ?? null) : null;
  const sel = selRegion ? selRegion.id : null;
  const hoverRegion = hover ? (regions.find((r) => r.id === hover) ?? null) : null;

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

        <g transform={`translate(${railWidth - PULL} 0)`}>
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
              />
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
                {f.title ? <title>{f.title}</title> : null}
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

        <Reticle W={W + PULL} H={H} region={selRegion ?? null} />

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

        {/* Above even the rail: whatever is under the pointer says its own name,
            and no flag, reticle, HUD frame or coin can be drawn over it. */}
        {hoverRegion ? (
          <NamePlate
            region={hoverRegion}
            text={name(hoverRegion)}
            W={W}
            H={H}
            dx={railWidth - PULL}
          />
        ) : null}
      </svg>
    </div>
  );
}

/**
 * The hovered region's full name, on a plate drawn after everything else.
 *
 * It replaces the SVG `<title>` this map used to carry. A `<title>` is drawn by
 * the browser, not by us: it is unstyled, it arrives a second late, and it lands
 * where the browser chooses rather than beside the thing it names. The accessible
 * name is unaffected — every region already carries `aria-label`.
 *
 * The plate sits above the region's bounding box, not over its centre, so it
 * never covers the abbreviation and figure already on the region; and it is
 * clamped to the canvas, so a region at an edge pushes it inwards instead of off
 * the map. The width is derived from the string because SVG cannot lay out a box
 * around text on its own — the text is centred in it, so any error is symmetric.
 */
function NamePlate({
  region,
  text,
  W,
  H,
  dx,
}: {
  region: RegionGeometry;
  text: string;
  W: number;
  H: number;
  dx: number;
}) {
  const PAD = 10;
  const BOX = 23;
  /* JetBrains Mono at 12px with 0.08em tracking: 0.6em per glyph plus the
     tracking. */
  const w = Math.ceil(text.length * (12 * 0.6 + 0.96)) + PAD * 2;
  const x = Math.min(Math.max(region.cx - w / 2, 2), W - w - 2);
  const y = Math.min(Math.max(region.bbox[1] - BOX - 9, 2), H - BOX - 2);
  return (
    <g className="nameplate" transform={`translate(${dx} 0)`}>
      <rect x={x} y={y} width={w} height={BOX} />
      <text x={x + w / 2} y={y + BOX / 2 + 4.2} textAnchor="middle">
        {text}
      </text>
    </g>
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

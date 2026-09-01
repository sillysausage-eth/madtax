"use client";

import { SpainShield } from "./coinGlyphs";

/**
 * The rail of pressable coins down the left of the map: the money that has no
 * territory.
 *
 * The map is not the whole number. What no source splits by community is real
 * money, so it sits beside the country rather than being left out of it — the
 * regions on the map plus these coins are the national figure, always. Pressing
 * one opens its detail exactly as pressing a region does, and says why it cannot
 * be drawn on the map.
 *
 * Mode-agnostic: the caller supplies the items and the accent. Spending's
 * remainder set (social security, central, local, inter-tier transfers) uses the
 * amber tone; revenue's single Spanish-state coin uses its own.
 */

export type CoinGlyph = "social" | "central" | "local" | "adjust" | "gov";

export interface MapCoin {
  /** Selection id, carried in `?r=`. Must not collide with a region id. */
  id: string;
  /** Short title, printed under the coin. */
  title: string;
  /** The amount, already formatted for the locale. */
  value: string;
  glyph: CoinGlyph;
  /** Long-form accessible name — what the panel will say when pressed. */
  aria: string;
}

/** Coin geometry, in map units. `WIDTH` is the rail the map is shifted right by. */
export const COIN_RAIL_WIDTH = 150;
const R = 44;
/** Coin bottom to the first title baseline, then the line box of each text row. */
const LABEL_GAP = 20;
const LINE = 19;
const AMOUNT = 24;
/** Gap between one coin's last text row and the next coin's disc. */
const GAP = 34;
/**
 * The map's own height in map units. The rail spans it in full: the Canaries
 * inset sits at x≥174, clear of the 150-unit rail, so nothing else competes for
 * this column and the coins can use all of it.
 */
const RAIL_H = 700;
/**
 * How far the geography's leftmost point sits beyond the end of the rail. The
 * empty column a reader sees is that much wider than the rail itself, so
 * centring on the rail alone would push the coins toward the panel edge and
 * leave the slack on their right; sharing the overhang splits it evenly.
 *
 * It is 13 because `SpainMap` pulls the whole map group left by `PULL` (18) —
 * the geography starts at root 163, the rail ends at 150. **This tracks that
 * pull**: change `PULL`, the canvas crop, or the projection, and this wants
 * re-measuring as `regions.x − railWidth` in root coordinates. It is a constant
 * rather than a derived value only because the rail cannot see the map's
 * geometry from here.
 */
const RAIL_OVERHANG = 13;

/** Disc plus the text rows beneath it, for a title of `lines` lines. */
const blockH = (lines: number) => 2 * R + LABEL_GAP + lines * LINE + AMOUNT;

const GLYPH: Record<CoinGlyph, React.ReactNode> = {
  social: (
    <>
      <path d="M12 3.5c2.2 1.7 4.3 2.4 6.5 2.4v6.3c0 3.7-2.4 6.7-6.5 8.3-4.1-1.6-6.5-4.6-6.5-8.3V5.9C7.7 5.9 9.8 5.2 12 3.5Z" />
      <path d="M9.2 12.2h5.6M12 9.4v5.6" />
    </>
  ),
  /* Drawn by the coin as a coloured mark, not as a monoline glyph. */
  gov: null,
  central: (
    <path d="M4 20h16M5.5 20V9.5M9.5 20V9.5M14.5 20V9.5M18.5 20V9.5M3 9.5 12 3.6l9 5.9ZM3.4 20h17.2" />
  ),
  local: (
    <path d="M3.5 20.2h17M6 20.2V11l4-3 4 3v9.2M14 20.2V13h4v7.2M8.2 13.6h1.4M8.2 16.4h1.4" />
  ),
  adjust: (
    <>
      <path d="M5 8.5h14M5 15.5h14" />
      <path d="M9 5.5 6.5 8.5 9 11.5M15 12.5l2.5 3-2.5 3" />
    </>
  ),
};

export default function MapCoins({
  items,
  selected,
  onSelect,
  width = COIN_RAIL_WIDTH,
}: {
  items: MapCoin[];
  /** The console's selection, which may be a region rather than a coin. */
  selected: string | null;
  onSelect: (id: string) => void;
  width?: number;
}) {
  const cx = (width + RAIL_OVERHANG) / 2;
  /* Lay the coins out as one group centred down the rail. With a single coin —
     the usual case since the components moved into the legend — that puts it in
     the middle of the empty column beside the mainland rather than tucked up
     against the top edge. Each block is measured from its own title, so a
     two-line name does not push the next coin into it. */
  const heights = items.map((c) => blockH(c.title.split("\n").length));
  const groupH =
    heights.reduce((a, h) => a + h, 0) + GAP * Math.max(0, items.length - 1);
  /* Written as a fold rather than a running accumulator: reassigning a local
     during render trips react-hooks/immutability, and the list is three items
     at most so the quadratic walk costs nothing. */
  const top = Math.max(0, (RAIL_H - groupH) / 2);
  const centres = heights.map(
    (_, i) => top + heights.slice(0, i).reduce((a, h) => a + h + GAP, 0) + R,
  );
  return (
    <g id="coins">
      {items.map((c, i) => {
        const cy = centres[i];
        const on = selected === c.id;
        return (
          <g
            key={c.id}
            className={`coin${c.glyph === "gov" ? " gov" : ""}${on ? " on" : ""}`}
            data-coin={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={c.aria}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
          >
            <circle className="coin-face" cx={cx} cy={cy} r={R} />
            {c.glyph === "gov" ? (
              <g transform={`translate(${cx} ${cy})`}>
                <SpainShield r={R - 1} />
              </g>
            ) : (
              <g
                className={`coin-gl${c.glyph === "social" ? " ss" : ""}`}
                transform={`translate(${cx - 13.5} ${cy - 13.5}) scale(1.125)`}
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {GLYPH[c.glyph]}
              </g>
            )}
            {/* A title too long for the rail is given as two lines by the
                caller; the amount then drops by one line rather than colliding
                with it. */}
            {c.title.split("\n").map((line, j) => (
              <text
                className="coin-t"
                key={j}
                x={cx}
                y={cy + R + LABEL_GAP + j * LINE}
              >
                {line}
              </text>
            ))}
            {/* One line below the last title line — the same constants `blockH`
                measures with, so the centring cannot drift from what is drawn. */}
            <text
              className="coin-v"
              x={cx}
              y={cy + R + LABEL_GAP + c.title.split("\n").length * LINE}
            >
              {c.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

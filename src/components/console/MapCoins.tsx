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
const R = 27;
const PITCH = 118;
const TOP = 132;

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
  const cx = width / 2;
  return (
    <g id="coins">
      {items.map((c, i) => {
        const cy = TOP + i * PITCH;
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
                <SpainShield r={R - 6} uid={`rail-${c.id}`} />
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
              <text className="coin-t" key={j} x={cx} y={cy + R + 18 + j * 19}>
                {line}
              </text>
            ))}
            <text
              className="coin-v"
              x={cx}
              y={cy + R + 38 + (c.title.split("\n").length - 1) * 19}
            >
              {c.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

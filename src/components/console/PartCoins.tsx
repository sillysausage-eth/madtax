"use client";

import { EuEmblem, PART_GLYPH } from "./coinGlyphs";

/**
 * The composition legend, as a grid of pressable coins — one per revenue
 * component beside the ring.
 *
 * This is the console's filter control, and it is the only one: pressing a coin
 * re-cuts the map to that component and opens its breakdown in the panel.
 * Filtering is never a side effect of reading something else — you press the
 * thing you want.
 *
 * Each coin carries its component's palette colour on the ring and its own
 * glyph, so colour and shape both identify it. Every coin prints its amount and
 * its share of the total: the icon is a handle, never a substitute for the
 * figure.
 */

export interface PartCoin {
  /** The `PARTS` key, carried in `?f=`. */
  k: string;
  /** The component's name. */
  nm: string;
  /** The one-line description, as the button's title. */
  desc: string;
  /** The amount, already formatted for the locale. */
  value: string;
  /** Its share of the national total, already formatted, without the sign. */
  pct: string;
  colour: string;
}

const FACE = 44;
const C = FACE / 2;
const R = 20;

function CoinFace({ p }: { p: PartCoin }) {
  const glyph = PART_GLYPH[p.k];
  return (
    <svg className="pcoin-f" viewBox={`0 0 ${FACE} ${FACE}`} aria-hidden="true">
      <circle className="pcoin-face" cx={C} cy={C} r={R} style={{ stroke: p.colour }} />
      {glyph === null || glyph === undefined ? (
        /* European funds carry the real emblem rather than a drawn stand-in. */
        <g transform={`translate(${C} ${C})`}>
          <EuEmblem r={R - 5} />
        </g>
      ) : (
        <g
          className="pcoin-gl"
          transform={`translate(${C - 12} ${C - 12})`}
          fill="none"
          stroke={p.colour}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {glyph}
        </g>
      )}
    </svg>
  );
}

export default function PartCoins({
  items,
  selected,
  onSelect,
  total,
  hint,
}: {
  items: PartCoin[];
  /** The component being filtered on, or nothing. */
  selected: string | null;
  onSelect: (k: string) => void;
  /** The row under the grid: the figure the shares are shares of. */
  total: { label: string; value: string };
  hint: string;
}) {
  return (
    <div className="pcoins-wrap">
      <div className="pcoins">
        {items.map((p) => {
          const on = selected === p.k;
          return (
            <button
              key={p.k}
              type="button"
              className={`pcoin${on ? " on" : ""}${selected && !on ? " dim" : ""}`}
              data-p={p.k}
              aria-pressed={on}
              title={p.desc}
              onClick={() => onSelect(p.k)}
            >
              <CoinFace p={p} />
              <span className="pcoin-b">
                <span className="pcoin-n">{p.nm}</span>
                <span className="pcoin-r">
                  <span className="pcoin-v">{p.value}</span>
                  <span className="pcoin-p">{p.pct}%</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="pcoins-tot">
        <span className="nm">{total.label}</span>
        <span className="vv">{total.value}</span>
        <span className="pp">100%</span>
      </div>
      <p className="pcoins-hint">{hint}</p>
    </div>
  );
}

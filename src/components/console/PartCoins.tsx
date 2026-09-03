"use client";

import { EuEmblem, PART_GLYPH } from "./coinGlyphs";

/**
 * The composition legend, as a grid of pressable coins — one per component
 * beside the ring.
 *
 * This is the console's filter control, and it is the only one: pressing a coin
 * re-cuts the map to that component and opens its breakdown in the panel.
 * Filtering is never a side effect of reading something else — you press the
 * thing you want.
 *
 * The total is a coin like the others, first in the grid: asking for the whole
 * back is the same gesture as asking for a part, not a separate widget under the
 * legend. It carries no amount, because the amount it stands for is the figure in
 * the middle of the ring beside it.
 *
 * Each coin carries its component's palette colour on the ring and its own
 * glyph, so colour and shape both identify it. Every coin prints its amount and
 * its share of the total: the icon is a handle, never a substitute for the
 * figure.
 *
 * Mode-agnostic: the caller supplies the items and the glyph set. Revenue passes
 * its seventeen components and `PART_GLYPH`; spending passes the ten COFOG
 * divisions and `COFOG_GLYPH`. The taxonomies are genuinely different — only the
 * interaction is shared, and only the interaction lives here.
 */

export interface PartCoin {
  /** The component key, carried in `?f=`. */
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

/**
 * The total's face colour: a bright neutral, not the mode accent. The accent is
 * cyan, which is also social contributions' palette colour — the two coins are
 * neighbours in the grid, and one of them has to be the odd one out.
 */
const TOTAL_INK = "#EAFAFF";

const FACE = 44;
const C = FACE / 2;
const R = 20;

export type GlyphSet = Record<string, React.ReactNode>;

function CoinFace({ p, glyphs }: { p: PartCoin; glyphs: GlyphSet }) {
  const glyph = glyphs[p.k];
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

/** The total's face: the neutral ring, not a component colour. */
function TotalFace({ glyphs }: { glyphs: GlyphSet }) {
  return (
    <svg className="pcoin-f" viewBox={`0 0 ${FACE} ${FACE}`} aria-hidden="true">
      <circle className="pcoin-face" cx={C} cy={C} r={R} style={{ stroke: TOTAL_INK }} />
      <g
        className="pcoin-gl"
        transform={`translate(${C - 12} ${C - 12})`}
        fill="none"
        stroke={TOTAL_INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyphs.total}
      </g>
    </svg>
  );
}

export default function PartCoins({
  items,
  selected,
  onSelect,
  total,
  onTotal,
  glyphs = PART_GLYPH,
}: {
  items: PartCoin[];
  /** The component being filtered on, or nothing. */
  selected: string | null;
  onSelect: (k: string) => void;
  /** The first coin: the whole the shares are shares of. */
  total: { label: string; desc: string };
  /** Press the total coin: back to the unfiltered reading. */
  onTotal: () => void;
  /**
   * One glyph per item key, plus `total`. A key mapped to `null` is drawn as the
   * European emblem, which is a coloured mark rather than a monoline glyph.
   */
  glyphs?: GlyphSet;
}) {
  return (
    <div className="pcoins-wrap">
      <div className="pcoins">
        <button
          type="button"
          className={`pcoin pcoin-total${selected ? "" : " on"}`}
          aria-pressed={!selected}
          title={total.desc}
          onClick={onTotal}
        >
          <TotalFace glyphs={glyphs} />
          <span className="pcoin-b">
            <span className="pcoin-n">{total.label}</span>
            <span className="pcoin-r">
              <span className="pcoin-p">100%</span>
            </span>
          </span>
        </button>
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
              <CoinFace p={p} glyphs={glyphs} />
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
    </div>
  );
}

"use client";

/**
 * The rail of pressable coins down the left of the map: the money that has no
 * territory.
 *
 * The map is not the whole number. Social contributions, EU transfers and the
 * unallocated remainder are real revenue with no published regional split, so
 * they sit beside the country rather than being left out of it — the regions on
 * the map plus these coins are the national figure, always. Pressing one opens
 * its dossier exactly as pressing a region does, and says why it cannot be drawn
 * on the map.
 *
 * Mode-agnostic: the caller supplies the items and the accent. Spending's own
 * remainder set (social security, central, local, inter-tier transfers) plugs
 * into the same rail in M3.
 */

export type CoinGlyph =
  | "social"
  | "eu"
  | "rest"
  | "central"
  | "local"
  | "adjust";

export interface MapCoin {
  /** Selection id, carried in `?r=`. Must not collide with a region id. */
  id: string;
  /** Short title, printed under the coin. */
  title: string;
  /** The amount, already formatted for the locale. */
  value: string;
  glyph: CoinGlyph;
  /** Long-form accessible name — what the dossier will say when pressed. */
  aria: string;
}

/** Coin geometry, in map units. `WIDTH` is the rail the map is shifted right by. */
export const COIN_RAIL_WIDTH = 150;
const R = 27;
const PITCH = 118;
const TOP = 132;

/**
 * The European emblem, constructed from its published geometric specification
 * rather than traced: a circle of twelve five-pointed stars on an azure field,
 * the stars' centres on a circle of radius one third of the field height, each
 * star with a circumradius of one eighteenth of that height and one point up.
 * Colours are the official ones — Reflex Blue #003399, Yellow #FFCC00.
 *
 * Here the "field height" is the emblem disc's diameter, so the proportions
 * hold at any coin size.
 */
function euStarPath(cr: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? cr : cr * 0.381966; // pentagram inner/outer ratio
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join("L")}Z`;
}

function EuEmblem({ r }: { r: number }) {
  const ring = (r * 2) / 3; //  star centres: one third of the field height
  const cr = (r * 2) / 18; // star circumradius: one eighteenth of it
  const star = euStarPath(cr);
  return (
    <g className="eu-emblem">
      {/* A thin lighter rim: Reflex Blue is nearly as dark as the console
          background, and without it the field has no edge. */}
      <circle cx="0" cy="0" r={r} fill="#003399" stroke="#4B6FD0" strokeWidth="1" />
      {[...Array(12)].map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        return (
          <path
            key={i}
            d={star}
            fill="#FFCC00"
            transform={`translate(${(ring * Math.cos(a)).toFixed(3)} ${(ring * Math.sin(a)).toFixed(3)})`}
          />
        );
      })}
    </g>
  );
}

const GLYPH: Record<CoinGlyph, React.ReactNode> = {
  social: (
    <>
      <path d="M12 3.5c2.2 1.7 4.3 2.4 6.5 2.4v6.3c0 3.7-2.4 6.7-6.5 8.3-4.1-1.6-6.5-4.6-6.5-8.3V5.9C7.7 5.9 9.8 5.2 12 3.5Z" />
      <path d="M9.2 12.2h5.6M12 9.4v5.6" />
    </>
  ),
  eu: null,
  rest: (
    <path d="M4 19.5h16M6 19.5V9.8M10 19.5V9.8M14 19.5V9.8M18 19.5V9.8M3.2 9.8 12 4.5l8.8 5.3Z" />
  ),
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
            className={`coin${on ? " on" : ""}`}
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
            {c.glyph === "eu" ? (
              <g transform={`translate(${cx} ${cy})`}>
                <EuEmblem r={R - 7} />
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
            <text className="coin-t" x={cx} y={cy + R + 18}>
              {c.title}
            </text>
            <text className="coin-v" x={cx} y={cy + R + 38}>
              {c.value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * The coin iconography: one monoline glyph per revenue component, the European
 * emblem, and the Spanish state mark.
 *
 * Every glyph is hand-composed SVG on a 24 × 24 box, drawn with a single stroke
 * weight and no fills, so the whole set reads as one family at coin size. The
 * caller supplies the colour: each component carries its own palette colour on
 * the ring AND its own glyph, so a reader who cannot separate two hues still has
 * the shape, and a reader who cannot read the label still has the colour.
 *
 * Nothing here is decorative shorthand for a number. The glyph identifies which
 * bucket a figure belongs to; the figure itself is always printed beside it.
 */

/* ------------------------------------------------------------------ EU ---- */

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

export function EuEmblem({ r }: { r: number }) {
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

/* -------------------------------------------------------------- Spain ----- */

/**
 * The Spanish state mark on the map coin.
 *
 * NOT the official coat of arms. The escudo is quartered heraldry — castle,
 * lion, chains, pomegranate, an inescutcheon of fleurs-de-lis, the Pillars of
 * Hercules with their scroll, and a royal crown — and none of it survives at the
 * ~44px this coin is drawn at. A traced approximation would be a mangled version
 * of a state emblem, which is worse than not drawing it, so this is a plain
 * heraldic shield carrying the flag's own bands and proportions: red, gold at
 * double height, red. It says "the Spanish state" without imitating the escudo.
 *
 * Colours are the flag's: Rojo #AA151B, Gualda #F1BF00. The outline takes a
 * lighter gold so the silhouette holds against the dark console background.
 *
 * `uid` makes the clip path unique on a page that draws more than one shield. It
 * is passed explicitly rather than generated, so the server and the client agree.
 */
export const SHIELD_RED = "#AA151B";
export const SHIELD_GOLD = "#F1BF00";
export const SHIELD_EDGE = "#F6D24A";

/** A 24 × 28 Iberian shield: square shoulders, sides falling to a round point. */
const SHIELD_PATH =
  "M2 2H22V14.6C22 20.2 17.6 24.4 12 26.6 6.4 24.4 2 20.2 2 14.6Z";

export function SpainShield({ r, uid }: { r: number; uid: string }) {
  /* The shield box is 24 wide by 28 high; scale it to sit inside a disc of
     radius `r` with the same margin top and bottom. */
  const s = (r * 2) / 30;
  const id = `essh-${uid}`;
  return (
    <g
      className="es-shield"
      transform={`translate(${(-12 * s).toFixed(3)} ${(-14 * s).toFixed(3)}) scale(${s.toFixed(4)})`}
    >
      <defs>
        <clipPath id={id}>
          <path d={SHIELD_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="24" height="28" fill={SHIELD_RED} />
        <rect x="0" y="8.2" width="24" height="12.3" fill={SHIELD_GOLD} />
      </g>
      <path d={SHIELD_PATH} fill="none" stroke={SHIELD_EDGE} strokeWidth="1.4" />
    </g>
  );
}

/* --------------------------------------------------- component glyphs ----- */

const cart = (
  <>
    <path d="M2.6 4.6h2.5l2.7 10.2h9.6l1.9-7.4H6.5" />
    <circle cx="9.6" cy="18.8" r="1.5" />
    <circle cx="16.4" cy="18.8" r="1.5" />
  </>
);

const payslip = (
  <>
    <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="1.8" />
    <circle cx="9" cy="10.4" r="2.1" />
    <path d="M5.9 16.2a3.2 3.2 0 0 1 6.2 0" />
    <path d="M14.8 10h3.8M14.8 13.2h3.8M14.8 16.2h2.4" />
  </>
);

/** The "detail not yet published" badge the two aggregate buckets carry. */
const clockBadge = (
  <>
    <circle cx="18.4" cy="18.4" r="4.4" />
    <path d="M18.4 16v2.6l1.8 1.1" />
  </>
);

/** A base glyph pulled back to make room for the pending badge. */
const pending = (base: React.ReactNode) => (
  <>
    <g transform="translate(-1.4 -2.2) scale(0.84)">{base}</g>
    {clockBadge}
  </>
);

/**
 * One glyph per key in `PARTS`, plus `total` for the unfiltered reading. `eu` is
 * null because the European emblem is a coloured mark, not a monoline glyph, and
 * is drawn by the coin itself.
 */
export const PART_GLYPH: Record<string, React.ReactNode> = {
  /* Social contributions — the people who pay them. */
  social: (
    <>
      <circle cx="8.6" cy="8.8" r="3.2" />
      <path d="M2.8 20.4a5.8 5.8 0 0 1 11.6 0" />
      <circle cx="17.4" cy="10.6" r="2.5" />
      <path d="M15.6 20.4c0-2.6 1.6-4.4 4.2-4.4 1 0 1.8.2 2.4.6" />
    </>
  ),
  /* Personal income tax — a payslip with a name on it. */
  irpf: payslip,
  /* VAT — the trolley it is charged on. */
  vat: cart,
  /* Corporate income tax — the company. */
  corp: (
    <>
      <path d="M5.2 20.4V4.6h9.2v15.8" />
      <path d="M14.4 9.8h4.6v10.6" />
      <path d="M3.2 20.4h17.6" />
      <path d="M7.8 8h1.6M11.2 8h1.6M7.8 11.4h1.6M11.2 11.4h1.6M7.8 14.8h1.6M11.2 14.8h1.6M16.2 13h1.2M16.2 16.4h1.2" />
    </>
  ),
  /* Fees, charges and sales — the ticket you are given for them. */
  sales: (
    <>
      <path d="M3.4 7.4H20.6v3.3a1.7 1.7 0 0 0 0 3.4v3.3H3.4v-3.3a1.7 1.7 0 0 1 0-3.4Z" />
      <path d="M8.8 8.8v6.4" strokeDasharray="1.6 1.9" />
    </>
  ),
  /* Excise duties — fuel, the largest of them. */
  excise: (
    <>
      <path d="M4.6 20.4V6.4a1.6 1.6 0 0 1 1.6-1.6h5.4a1.6 1.6 0 0 1 1.6 1.6v14" />
      <path d="M3.2 20.4h12" />
      <rect x="6.6" y="7.4" width="4.6" height="3.6" />
      <path d="M13.4 9.8h2.4a1.4 1.4 0 0 1 1.4 1.4v5.2a1.6 1.6 0 0 0 3.2 0V9.4l-2.2-2.4" />
    </>
  ),
  /* European funds — the emblem, drawn by the coin. */
  eu: null,
  /* Transfer, insurance, gambling and registration taxes — money changing hands. */
  otherProd: (
    <>
      <path d="M4 8.8h13.4M14.4 5.6 17.6 8.8l-3.2 3.2" />
      <path d="M20 15.6H6.6M9.6 12.4 6.4 15.6l3.2 3.2" />
    </>
  ),
  /* Property income — interest, dividends and rents. */
  propInc: (
    <>
      <ellipse cx="12" cy="6.8" rx="7.4" ry="2.8" />
      <path d="M4.6 6.8v4.6c0 1.5 3.3 2.8 7.4 2.8s7.4-1.3 7.4-2.8V6.8" />
      <path d="M4.6 11.4v4.6c0 1.5 3.3 2.8 7.4 2.8s7.4-1.3 7.4-2.8v-4.6" />
    </>
  ),
  /* Property tax — the building it is levied on. */
  propTax: (
    <>
      <path d="M3.4 10.8 12 4.2l8.6 6.6" />
      <path d="M5.8 12.6v7.8h12.4v-7.8" />
      <path d="M10 20.4v-4.6h4v4.6" />
    </>
  ),
  /* Business rates and other production taxes — the plant they attach to. */
  otherProdTax: (
    <>
      <path d="M3.6 20.2V10.8l5.2 3.2v-3.2l5.2 3.2v-3.2l5.2 3.2v6.2Z" />
      <path d="M16.4 8.6V4.4h2.6v4.4" />
      <path d="M2.6 20.2h18.8" />
    </>
  ),
  /* Other transfers received — money coming in. */
  otherTransfer: (
    <>
      <path d="M12 3.8v9.6M8.4 10l3.6 3.4L15.6 10" />
      <path d="M3.8 15v3.6a1.6 1.6 0 0 0 1.6 1.6h13.2a1.6 1.6 0 0 0 1.6-1.6V15" />
    </>
  ),
  /* Inheritance and gift tax — the deed and its seal. */
  inherit: (
    <>
      <path d="M6 3.8h7.4l4.2 4.2v8.4H6Z" />
      <path d="M13.4 3.8V8h4.2" />
      <path d="M8.6 10.4h6M8.6 13h4" />
      <circle cx="16.2" cy="17.4" r="2.6" />
      <path d="M15 19.6l-.6 2.6 1.8-1 1.8 1-.6-2.6" />
    </>
  ),
  /* Wealth, vehicle and other current taxes — what is held rather than earned. */
  otherCurr: (
    <>
      <path d="M3.6 7.6a1.8 1.8 0 0 1 1.8-1.8h11.2v2.4" />
      <path d="M3.6 7.6v10.2a1.8 1.8 0 0 0 1.8 1.8h13.2a1.6 1.6 0 0 0 1.6-1.6V9.8a1.6 1.6 0 0 0-1.6-1.6H3.6" />
      <circle cx="16.4" cy="13.6" r="1.2" />
    </>
  ),
  /* Import duties — what they are charged on arriving. */
  customs: (
    <>
      <path d="M2.8 16.6h18.4l-2 4H4.8Z" />
      <path d="M6 16.6V13h5.4v3.6M11.4 16.6V13h5.4v3.6" />
      <path d="M8.6 13V9.6h5.2V13" />
    </>
  ),
  /* The two aggregates Eurostat has not yet split: the family's own glyph, with
     the badge that says the detail is still to come. */
  taxProdPending: pending(cart),
  taxIncPending: pending(payslip),
};

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
 * The Spanish state mark on the map coin: the official escudo, as published.
 *
 * An earlier version drew a plain red-gold-red heraldic shield instead, on the
 * grounds that the real arms — quartered castle, lion, chains and pomegranate,
 * an inescutcheon of fleurs-de-lis, the Pillars of Hercules and a royal crown —
 * could not survive coin size and that tracing them would produce a mangled
 * state emblem. Half of that still holds: the fine detail does blur. But the
 * arms are vector all the way down, so the silhouette, crown and quartering
 * read at 40px and resolve completely on zoom, and using the emblem itself is
 * honest in a way an approximation of it never is.
 *
 * Gualda #F1BF00 stays exported: the panel's bars use it for the share this
 * coin holds, so the bar and the coin are the same colour.
 */
export const SHIELD_GOLD = "#F1BF00";

/* The real emblem, served as a static asset rather than inlined: the official
   escudo is 494 paths, and at ~150KB it belongs in the browser cache, not in
   the JS bundle. It is the arms as published, not a tracing — the detail below
   coin size blurs, but the silhouette, crown and quartering read, and zooming
   resolves it properly because it stays vector all the way down. */
const ESCUDO_HREF = "/escudo-espana.svg";

export function SpainShield({ r }: { r: number }) {
  /* Square, centred on the coin, filling most of the disc — the arms need the
     room. `pointer-events: none` keeps the button underneath clickable. */
  const side = r * 2 * 0.96;
  return (
    <image
      className="es-shield"
      href={ESCUDO_HREF}
      x={-side / 2}
      y={-side / 2}
      width={side}
      height={side}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    />
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
  /* The whole reading: the ring itself, with the parts it is cut into. Not one
     of the components — the coin that stands for all of them. */
  total: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 12V2.8" />
      <path d="M12 12l8 4.6" />
      <path d="M12 12L4 16.6" />
    </>
  ),
};

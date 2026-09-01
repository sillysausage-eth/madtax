/**
 * Hand-written types for the sections emitted by `scripts/split-bundle.mjs`.
 *
 * Policy: what M1 actually consumes is typed precisely. Everything M2/M3 will
 * consume is declared as an opaque record keyed the way the bundle keys it, and is
 * tightened when the component that reads it is ported. A guessed-wrong type is
 * worse than an honest `unknown` — it invites the compiler to bless a shape the
 * bundle never had.
 *
 * `verify.js` (121 checks) is the contract these types describe.
 */

/** A four-digit year used as an object key throughout the bundle. */
export type YearKey = string;

/** Values are € millions everywhere in the bundle unless a comment says otherwise. */
export type Millions = number;

/* ------------------------------------------------------------------ shared -- */

/** General-government headline, ESA 2010 S13, consolidated. */
export interface GgYear {
  rev: Millions;
  exp: Millions;
}
export type Gg = Record<YearKey, GgYear>;

/* -------------------------------------------------------------------- meta -- */

export interface MetaSection {
  generatedAt: string;
  bundlePath: string;
  bundleBytes: number;
  years: {
    rev: YearKey[];
    spend: YearKey[];
    /** Sorted ascending — the last entry is the latest published year. */
    gg: YearKey[];
    debt: YearKey[];
  };
  /** The year the debt stock is quoted at; debt has no fiscal-year picker. */
  debtRef: YearKey;
  gg: Gg;
}

/* --------------------------------------------------------------------- map -- */

/** Geometry only. The numbers for a region live in the mode section that draws them. */
export interface RegionGeometry {
  id: string;
  nuts: string;
  /** Spanish name. */
  es: string;
  /** English name. */
  en: string;
  /** SVG path data, pre-projected (Mercator, simplified) by the pipeline. */
  d: string;
  cx: number;
  cy: number;
  bbox: [number, number, number, number];
  /** True for the Canaries, drawn in the inset box `CB`. */
  inset: boolean;
  /** True for Navarre and the Basque Country — foral regimes, state figures residual. */
  foral: boolean;
}

export interface MapSection {
  W: number;
  H: number;
  /** Canaries inset box. */
  CB: { x: number; y: number; w: number; h: number };
  regions: RegionGeometry[];
}

/* ----------------------------------------------------------------- revenue -- */

/** One of the 17 non-overlapping revenue components; see `PARTS`. */
export type PartKey = string;

/**
 * National revenue by component for a year, plus the reconciliation fields the
 * console states rather than hides (`residual`, `published`, `deficit`).
 * Component keys are the `PARTS` entries; the named fields are always present.
 */
export type NatPartsYear = Record<PartKey, number | boolean> & {
  total: Millions;
  published: Millions;
  residual: Millions;
  expenditure: Millions;
  deficit: Millions;
  detail: boolean;
};
export type NatParts = Record<YearKey, NatPartsYear>;

/**
 * Per-region revenue payload.
 *
 * A part is `null` when no territorial figure is published for it — absent, not
 * zero. The console renders `—`, never a filled-in number.
 */
export interface RegionRevenue {
  gdp: number;
  pop: number;
  /** AEAT tax heads by year, ordered as `revTaxes`. Unused by the console. */
  rev: Record<YearKey, number[]>;
  rev2: unknown;
  /** Unified revenue by `PARTS` key, by year, plus the region's `total`. */
  parts: Record<YearKey, Record<PartKey, number | null>>;
}

/**
 * How much of a component has a territorial split and how much does not.
 * `mapped + offmap = nat` by construction; nothing here is rescaled to close.
 */
export interface MapAggEntry {
  mapped: Millions;
  offmap: Millions;
  nat: Millions;
}

/** `[ESA code, amount]` — the official children of one revenue component. */
export type SubRow = [string, Millions];

/** The AEAT cash-basis national tally. `complete` marks a full year; `(P)` if not. */
export interface National2Year {
  st: Millions;
  rg: Millions;
  lt: Millions;
  ibi: Millions;
  lf: Millions;
  eu: Millions;
  euUnassigned: Millions;
  total: Millions;
  complete: boolean;
}

/** Coverage windows per source. `social` is `null` — absent by territory, not zero. */
export interface Coverage {
  state: string;
  regional: string;
  local: string;
  nationalHeadline: string;
  nationalTaxDetail: string;
  euByRegion: string;
  social: string | null;
}

export interface RevenueSection {
  revYears: YearKey[];
  revTaxes: string[];
  revNational: Record<YearKey, unknown>;
  gg: Gg;
  natRev: Record<YearKey, unknown>;
  PARTS: PartKey[];
  natParts: NatParts;
  /** Official ESA children per component, per year. Absent where not published. */
  natSub: Record<YearKey, Record<PartKey, SubRow[]>>;
  subLab: { es: Record<string, string>; en: Record<string, string> };
  subSrc: Record<string, unknown>;
  mapAgg: Record<YearKey, Record<PartKey | "total", MapAggEntry>>;
  coverage: Coverage;
  euNote: string;
  national2: Record<YearKey, National2Year>;
  regions: Record<string, RegionRevenue>;
}

/* ---------------------------------------------------------------- spending -- */

/**
 * Per-region spending payload.
 *
 * A year is `null` where the region has no regional government at all — Ceuta and
 * Melilla, whose spending is recorded in the local subsector. Absent, not zero:
 * the map flags them and the dossier says why.
 */
export interface RegionSpending {
  /** COFOG divisions by year; index 0 is the total, 1..10 follow `divisions`. */
  spend: Record<YearKey, number[] | null>;
  /** Economic-transaction split by year, ordered as `econKeys`. */
  econ: Record<YearKey, number[] | null>;
  gdp: number;
  pop: number;
}

/**
 * How much of a COFOG division the map can show, and where the rest is spent.
 * `mapped + central + local + socsec + adj = nat`; the negative `adj` is the
 * inter-tier transfer that national accounts eliminate. Nothing is rescaled.
 */
export interface SpendAggEntry {
  nat: Millions;
  mapped: Millions;
  central: Millions;
  local: Millions;
  socsec: Millions;
  adj: Millions;
}

export interface SpendingSection {
  spendYears: YearKey[];
  /** Index 0 is the total, 1..10 follow `divisions`. */
  spendNational: Record<YearKey, number[]>;
  /** COFOG by government tier. Carried by the bundle; the console does not read it. */
  spendBySector: Record<string, number[]>;
  /** COFOG division codes, "01".."10". */
  divisions: string[];
  divES: Record<string, string>;
  divEN: Record<string, string>;
  /** Flat map of COFOG codes to amounts: `GF07` and its `GF07xx` children alike. */
  spendSub: Record<YearKey, Record<string, number>>;
  spendSubES: Record<string, string>;
  spendSubEN: Record<string, string>;
  spendNoteES: Record<string, string>;
  spendNoteEN: Record<string, string>;
  /** Keyed `TOTAL` and `GF01`..`GF10`. */
  spendAgg: Record<YearKey, Record<string, SpendAggEntry>>;
  econKeys: string[];
  econES: Record<string, string>;
  econEN: Record<string, string>;
  regions: Record<string, RegionSpending>;
}

/* -------------------------------------------------------------------- debt -- */

/** `[code, amount]` — instrument or holder rows keep source order. */
export type CodedRow = [string, Millions];

/** Debt by government tier. The tiers do not sum to the headline; `elim` says why. */
export interface DebtTier {
  S1311: Millions;
  S1312: Millions;
  S1313: Millions;
  S1314: Millions;
  /** Sum of the four tiers — never presented as the total. */
  gross: Millions;
  /** The headline: consolidated S13. */
  consolidated: Millions;
  /** gross − consolidated: one tier's debt held by another. */
  elim: Millions;
}

/**
 * Interest paid in a year. Eurostat can publish the consolidated total before the
 * split by tier lands, so everything but the total is optional — the console
 * drops the ring and names the gap rather than drawing an empty one.
 */
export interface DebtInterestYear {
  total: Millions;
  S1311?: Millions;
  S1312?: Millions;
  S1313?: Millions;
  S1314?: Millions;
  gross?: Millions;
  elim?: Millions;
}

/**
 * Every narrower-perimeter block stamps its own scope and reference date.
 *
 * `rows` is the redemption calendar, one `[year, amount]` per year that has one.
 * The first year is partial — it carries only what is left to fall due after
 * `asOf` — which is why `totalLaddered` is published rather than summed here.
 */
export interface DebtMaturity {
  asOf: string;
  avgLife: number | null;
  avgLifeAsOf: string;
  rows: CodedRow[];
  totalLaddered?: Millions;
  nSecurities?: number;
  scope?: string;
}

export interface DebtCost {
  asOf: string;
  avgCost: number | null;
  avgCostNew: number | null;
  scope: string;
}

export interface DebtHolders {
  asOf: string;
  scope: string;
  basis: string;
  total: Millions;
  rows: CodedRow[];
  labES: Record<string, string>;
  labEN: Record<string, string>;
  note: boolean;
  noteES?: string;
  noteEN?: string;
}

export interface DebtSection {
  debt: {
    /** The year the stock is quoted at. */
    ref: YearKey;
    years: YearKey[];
    /** EDP consolidated gross debt at face value, ESA 2010 S13, € millions. */
    total: Record<YearKey, Millions>;
    /** Published by Eurostat, not computed here. */
    pcGdp: Record<YearKey, number>;
    /** Published by Eurostat, not computed here. */
    intPcGdp: Record<YearKey, number>;
    /** A true partition, asserted to the euro for every year. */
    instr: Record<YearKey, CodedRow[]>;
    tier: Record<YearKey, DebtTier>;
    interest: Record<YearKey, DebtInterestYear | undefined>;
    srcEDP: { dataset: string; unit: string; basis: string };
    /* The three narrower-perimeter blocks are all present today. They stay
       optional so the console's named-gap paths remain reachable: when a source
       is withdrawn the screen says so, it does not fall back to a guess. */
    maturity?: DebtMaturity;
    cost?: DebtCost;
    holders?: DebtHolders;
  };
}

/* --------------------------------------------------------------------- who -- */

/**
 * AEAT administrative detail: who generates each revenue component.
 *
 * Each block is published on its own basis and with its own total, which is not
 * the ESA figure in the headline. The console states the gap in words; nothing
 * here is ever rescaled to make the two agree.
 */

/** One income band. `limit` is its upper bound in €; `null` on the top row. */
export interface DecileRow {
  limit: number | null;
  /** Taxpayers. Absolute units — euros here, not millions. */
  n: number;
  income: number;
  tax: number;
  rate: number;
  src: Record<string, number>;
}

/** Deciles D01–D10, AEAT's published percentile cuts, and the total. */
export type DecileYear = Record<string, DecileRow | undefined> & {
  TOT?: DecileRow;
};

export interface CorpEntry {
  profit: Millions;
  base: Millions;
  tax: Millions;
  rateBase: number | null;
  rateProfit: number | null;
  exempt: Millions;
  losses: Millions;
}
export interface CorpYear {
  total?: CorpEntry;
  groups?: CorpEntry;
  standalone?: CorpEntry;
}

/** Social contributions by payer, ESA D61 codes. `D61` is the published total. */
export type PayerYear = Record<string, number | undefined> & { D61?: Millions };

/** AEAT accrued state basis, by product. `prov` marks a provisional year. */
export interface AeatYear {
  total: Millions;
  prov?: boolean;
  rows: CodedRow[];
}

/** VAT by rate. The general regime only; the rest is named, not folded in. */
export interface VatYear extends AeatYear {
  accrued: Millions;
  special: Millions;
  foral: Millions;
  adjOther: Millions;
}

export type WhoBlock =
  | { kind: "brackets"; deciles: Record<YearKey, DecileYear>; brackets: unknown }
  | { kind: "company"; years: Record<YearKey, CorpYear> }
  | { kind: "payer"; years: Record<YearKey, PayerYear> }
  | {
      kind: "product";
      years: Record<YearKey, AeatYear>;
      labES: Record<string, string>;
      labEN: Record<string, string>;
    }
  | {
      kind: "rate";
      years: Record<YearKey, VatYear>;
      labES: Record<string, string>;
      labEN: Record<string, string>;
    };

export interface WhoSection {
  /** Keyed by the `PARTS` component the block explains: irpf, corp, social… */
  who: Record<PartKey, WhoBlock | undefined>;
  /** Statutory scale tables. Carried by the bundle; the console does not read them. */
  irpfScale: Record<string, unknown>;
  madridScale: Record<string, unknown>;
}

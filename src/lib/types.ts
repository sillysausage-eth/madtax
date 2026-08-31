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

/** Per-region revenue payload. Tightened in M2 when the map and dossier are ported. */
export interface RegionRevenue {
  gdp: number;
  pop: number;
  /** AEAT tax heads by year, ordered as `revTaxes`. */
  rev: Record<YearKey, number[]>;
  rev2: unknown;
  /** Unified revenue by `PARTS` key, by year. */
  parts: Record<YearKey, Record<PartKey, number>>;
  /** Economic-transaction split by year, ordered as `econKeys`. */
  econ: Record<YearKey, number[]>;
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
  natSub: Record<YearKey, unknown>;
  subLab: { es: Record<string, string>; en: Record<string, string> };
  subSrc: Record<string, unknown>;
  mapAgg: Record<YearKey, unknown>;
  coverage: Coverage;
  euNote: string;
  national2: Record<YearKey, unknown>;
  econKeys: string[];
  econES: Record<string, string>;
  econEN: Record<string, string>;
  regions: Record<string, RegionRevenue>;
}

/* ---------------------------------------------------------------- spending -- */

/** Per-region spending payload. Tightened in M3. */
export interface RegionSpending {
  /** COFOG divisions by year; index 0 is the total, 1..10 follow `divisions`. */
  spend: Record<YearKey, number[]>;
}

export interface SpendingSection {
  spendYears: YearKey[];
  /** Index 0 is the total, 1..10 follow `divisions`. */
  spendNational: Record<YearKey, number[]>;
  spendBySector: Record<string, unknown>;
  /** COFOG division codes, "01".."10". */
  divisions: string[];
  divES: Record<string, string>;
  divEN: Record<string, string>;
  spendSub: Record<YearKey, unknown>;
  spendSubES: Record<string, string>;
  spendSubEN: Record<string, string>;
  spendNoteES: Record<string, string>;
  spendNoteEN: Record<string, string>;
  spendAgg: Record<YearKey, unknown>;
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

export interface DebtInterestYear {
  total: Millions;
  S1311: Millions;
  S1312: Millions;
  S1313: Millions;
  S1314: Millions;
  gross: Millions;
  elim: Millions;
}

/** Every narrower-perimeter block stamps its own scope and reference date. */
export interface DebtMaturity {
  asOf: string;
  avgLife: number;
  avgLifeAsOf: string;
  rows: CodedRow[];
  scope?: string;
  [k: string]: unknown;
}

export interface DebtCost {
  asOf: string;
  avgCost: number;
  avgCostNew: number;
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
    interest: Record<YearKey, DebtInterestYear>;
    srcEDP: { dataset: string; unit: string; basis: string };
    maturity: DebtMaturity;
    cost: DebtCost;
    holders: DebtHolders;
  };
}

/* --------------------------------------------------------------------- who -- */

/** AEAT administrative detail. Its own totals, its own gaps — tightened in M2. */
export interface WhoSection {
  who: Record<string, unknown>;
  irpfScale: Record<string, unknown>;
  madridScale: Record<string, unknown>;
}

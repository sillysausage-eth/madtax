/**
 * Hand-written types for the sections emitted by `scripts/split-bundle.mjs`.
 *
 * Policy: what M1 actually consumes is typed precisely. Everything M2/M3 will
 * consume is declared as an opaque record keyed the way the bundle keys it, and is
 * tightened when the component that reads it is ported. A guessed-wrong type is
 * worse than an honest `unknown` — it invites the compiler to bless a shape the
 * bundle never had.
 *
 * `verify.js` (194 checks) is the contract these types describe.
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
  headline: HeadlineSeries;
}

/**
 * The general-government headline as a series — what the home screen draws.
 *
 * The same sector, unit and accrual basis as `gg`, and the same figures wherever both
 * carry a year. It exists separately because `gg` is pruned by `merge16.js` down to the
 * years the revenue MAP can show in full, and 2013, 2014 and 2025 have a published
 * headline that no map question should hide.
 *
 * `def` is Eurostat's own published balance (B.9), carried rather than subtracted;
 * `verify.js` asserts it equals `rev − exp` in every year. It is negative in every year
 * the series covers, which is a fact about Spain, not a sign convention.
 *
 * `years` is contiguous and ascending — the pipeline refuses to write a series with a
 * hole in it — so the chart's x axis is the list itself.
 */
export interface HeadlineSeries {
  years: YearKey[];
  /** Total revenue, ESA 2010 TR. */
  rev: Record<YearKey, Millions>;
  /** Total expenditure, ESA 2010 TE. */
  exp: Record<YearKey, Millions>;
  /** Net lending (+) / net borrowing (−), ESA 2010 B.9. */
  def: Record<YearKey, Millions>;
  /** The dataset, sector, unit and items the series was read from. */
  src: string;
  /** Eurostat's `updated` stamp on the dataset at extraction. */
  updated: string;
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
  /**
   * True for Navarre and the Basque Country. They collect their own taxes under
   * the Concierto and the Convenio Económico, so their figures come from their
   * own treasuries rather than from AEAT — see `foralCoverage` for the years.
   */
  foral: boolean;
}

export interface MapSection {
  W: number;
  H: number;
  /** Canaries inset box. */
  CB: { x: number; y: number; w: number; h: number };
  regions: RegionGeometry[];
}

/**
 * The denominators behind per-capita and %GDP, by year, from Eurostat's regional
 * series (`pipeline/spain/merge14.js`).
 *
 * A ratio of two measurements is that ratio only when both are of the same
 * year, so both are series: population is the headcount on 1 January of the
 * year, GDP is at current market prices in € million, provisional where
 * Eurostat flags it. A year outside either series has no reading — the console
 * shows `—`, never the nearest year's figure.
 */
export interface RegionMacro {
  gdp: Record<YearKey, Millions>;
  pop: Record<YearKey, number>;
  /** Years Eurostat still flags provisional. */
  gdpProvisional: YearKey[];
  src: { gdp: string; pop: string };
  /** Eurostat's `updated` stamp on each dataset at extraction. */
  updated: { gdp: string; pop: string };
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
  macro: RegionMacro;
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
  foralBasque?: string;
  foralNavarre?: string;
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
  /**
   * Which years the foral treasuries' own figures cover, and who published them.
   *
   * The Basque and Navarrese figures on the map come from the Diputaciones
   * Forales and the Hacienda Foral de Navarra, not from AEAT, which collects
   * only a residual in those territories. Their series start in different years,
   * so the console has to know which of the two statements to make about a
   * region: this is its own treasury's figure, or its treasury has not published
   * this year and the cell is empty.
   */
  foralCoverage: ForalCoverage;
  salesDetail: SalesDetail;
  regions: Record<string, RegionRevenue>;
}

export interface ForalCoverage {
  /** Region ids under a foral regime — Navarre and the Basque Country. */
  ids: string[];
  /** Region id -> the years its own treasury's figures are published for. */
  covered: Record<string, YearKey[]>;
  src: Record<string, string>;
  /**
   * Region id -> year -> the publication the figure was read from: the Basque
   * OCTE table, Navarre's memoria, or — for Navarre before its memorias begin —
   * the Ministry of Finance's compiled series (`dgt`), admitted by the pipeline
   * only because it reproduces the memoria in every year both cover. The
   * dossier says which.
   */
  srcYear: Record<string, Record<YearKey, ForalSource>>;
}

export type ForalSource = "octe" | "memoria" | "dgt";

/* ------------------------------------------------ fees, prices and sales -- */

/**
 * The `sales` bucket's two ESA items: market sales plus output kept for own use
 * (`P11_P12`), and part-payments for public services (`P131`).
 */
export interface SalesEsa {
  P11_P12: Millions;
  P131: Millions;
}

/** A community government's own charges, from the IGAE per-community accounts. */
export interface SalesRegionRow {
  /** Market sales of goods and services. */
  P11: Millions;
  /** Output produced for the government's own use — an accounting entry, not cash. */
  P12: Millions;
  /** Part-payments for public services: tuition, co-payments, administrative fees. */
  P131: Millions;
}

/** A community's councils' chapter 3, by budget article, cash basis (CONPREL). */
export interface SalesLocalRow {
  /** The chapter total — the figure inside the community's map `sales` part. */
  total: Millions;
  /** Article code ("30".."39") -> amount. Rounded one by one; see `artTol`. */
  art: Record<string, Millions>;
}

/**
 * Three published cuts of the fees, prices and sales bucket, built by
 * `pipeline/spain/merge17.js`. Each reconciles to a figure already in the bundle:
 * the tiers to `natParts.sales`, the communities to the S1312 tier, the articles to
 * the chapter total. Nothing here is folded into the map — `region` in particular
 * is the community's published figure shown beside the map's, not added to it.
 */
export interface SalesDetail {
  years: YearKey[];
  tier: Record<YearKey, Record<"S1311" | "S1312" | "S1313" | "S1314", SalesEsa>>;
  region: Record<YearKey, Record<string, SalesRegionRow>>;
  local: Record<YearKey, Record<string, SalesLocalRow>>;
  /** Article codes in source order. */
  artCodes: string[];
  /** The publisher's own Spanish label for each article. */
  artSrc: Record<string, string>;
  /** Max € millions the rounded articles may drift from the rounded total. */
  artTol: number;
  src: { tier: string; region: string; local: string };
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
  /**
   * What the territory's local entities spent, by year — CONPREL definitive
   * liquidations. `null` where the published table is zero on every line
   * (Navarre 2013-2014, Melilla 2022): absent, not zero.
   */
  local: Record<YearKey, LocalSpend | null>;
  macro: RegionMacro;
}

/**
 * The local tier of one territory for one year, in € million, budget basis
 * (obligations recognised). Consolidated across the territory's councils,
 * provincial and island councils, comarcas and metropolitan areas.
 */
export interface LocalSpend {
  /** Every chapter, financial ones included. */
  total: Millions;
  /** Chapters 1-7: what national accounts count as expenditure. */
  nonfin: Millions;
  /** Chapters 8-9: financial assets and debt repayment. Not spending. */
  fin: Millions;
  /** Transfers to another tier of government (State, Social Security, the community government, other local entities). */
  toGov: Millions;
  /** Transfers received from the community government, which its own figure already carries as spending. */
  fromCA: Millions;
  /** `nonfin − toGov − fromCA`: what goes on the map. */
  net: Millions;
  /** `nonfin` by programme area of Orden EHA/3565/2008, keyed by `localAreas.codes`. */
  areas: Record<string, Millions>;
}

/**
 * The whole map's reconciliation for one year, all of spending. The territories
 * on the map (`regional + localNet = mapped`) plus the one State coin (`state`)
 * are the consolidated national figure; the coin decomposes exactly into
 * `central + socsec + adj + localRest`, every term a published figure or the
 * difference of two. Nothing is rescaled.
 */
export interface SpendTerrEntry {
  nat: Millions;
  mapped: Millions;
  regional: Millions;
  localNet: Millions;
  state: Millions;
  central: Millions;
  socsec: Millions;
  /** The inter-tier elimination, negative. */
  adj: Millions;
  /** The national-accounts local tier (S.1313). */
  localTier: Millions;
  /** `localTier − localNet`: the part of the local tier the territorial layer does not reach. */
  localRest: Millions;
  /** Territories with a regional figure but no local one this year. */
  partial: string[];
  /** Territories with neither. */
  missing: string[];
}

/** The six programme areas councils classify their spending by, labelled from the source. */
export interface LocalAreas {
  codes: string[];
  es: Record<string, string>;
  en: Record<string, string>;
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
  /** Keyed by year: the map-of-territories reconciliation. */
  spendTerr: Record<YearKey, SpendTerrEntry>;
  localAreas: LocalAreas;
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
  /** AEAT marks the latest edition's newest column "(p)"; carried, and shown. */
  prov?: boolean;
}

/**
 * One turnover bracket of AEAT's consolidated corporate tax statistic. A tax
 * group counts once; a company outside a group counts once. Money in € millions.
 */
export interface CorpBracket {
  /** Bracket bounds, thousands of € of annual turnover; `hi` null on the top row. */
  lo: number;
  hi: number | null;
  /** Companies and groups filing. */
  n: number;
  /** Of which with a positive net tax liability; not published before 2019. */
  nPos: number | null;
  turnover: Millions;
  /** Sum of positive accounting results ("Beneficio"). */
  profit: Millions;
  /** Net accounting result. */
  rc: Millions;
  base: Millions;
  /** Cuota íntegra. */
  gross: Millions;
  /** Cuota líquida positiva — the tax settled. */
  tax: Millions;
  rateBase: number | null;
  rateProfit: number | null;
  /**
   * The same bracket crossed with AEAT's five sector groupings, which partition
   * the census. `tax` is null where AEAT withholds the cell under statistical
   * secrecy — too few filers in that sector and bracket to publish without
   * identifying them.
   */
  sectors: Record<string, { n: number; profit: Millions; tax: Millions | null }>;
  /** True where any sector cell in this bracket is withheld. */
  secSE: boolean;
}
export interface CorpBracketYear {
  total: Omit<CorpBracket, "lo" | "hi">;
  rows: CorpBracket[];
  src: string;
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

export type WhoBlock = {
  /**
   * "YYYY-MM" the publisher has announced for the next edition, where it has.
   * Shown in place of the table for a year the series does not yet carry.
   */
  nextRelease?: string;
} & (
  | { kind: "brackets"; deciles: Record<YearKey, DecileYear>; brackets: unknown }
  | {
      kind: "company";
      /** By turnover bracket, 2016 onwards — what the console renders. */
      years: Record<YearKey, CorpBracketYear>;
      /** Table 8.5 by company type, 2008 onwards — kept for tie-outs, not rendered. */
      types: Record<YearKey, CorpYear>;
    }
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
    }
);

export interface WhoSection {
  /** Keyed by the `PARTS` component the block explains: irpf, corp, social… */
  who: Record<PartKey, WhoBlock | undefined>;
  /** Statutory scale tables. Carried by the bundle; the console does not read them. */
  irpfScale: Record<string, unknown>;
  madridScale: Record<string, unknown>;
}

import raw from "./generated/meta.json";
import type { MetaSection } from "@/lib/types";

/**
 * Cross-cutting stamps written by `scripts/split-bundle.mjs`: the bundle's own
 * year lists in order, the debt reference year, and the general-government
 * headline. Generated at build time, gitignored — run `npm run data:split`.
 *
 * The JSON literal type TypeScript infers here is narrower than the contract we
 * mean to hold, so it is asserted to the hand-written section type. The values
 * are the bundle's, unchanged.
 */
export const meta = raw as unknown as MetaSection;

/** The latest year the general-government headline is published for. */
export const latestGgYear = meta.years.gg[meta.years.gg.length - 1];

/**
 * The general-government headline as a series — total revenue, total expenditure and
 * the published balance, every year Eurostat has all three. See `HeadlineSeries`: it is
 * `gg` before `merge16.js` prunes it to the years the revenue map can show.
 */
export const headline = meta.headline;

/** The latest year the headline series covers. */
export const latestHeadlineYear = headline.years[headline.years.length - 1];

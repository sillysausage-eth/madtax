import raw from "./generated/revenue.json";
import type { RevenueSection } from "@/lib/types";

/**
 * The revenue section, as split out of the bundle. Importing this module is what
 * puts the revenue figures in the revenue route's chunk and nowhere else — no
 * other mode may import it.
 *
 * The JSON literal type TypeScript infers is narrower than the contract
 * `verify.js` guarantees, so it is asserted to the hand-written section type.
 * The values are the bundle's, unchanged.
 */
export const revenue = raw as unknown as RevenueSection;

export const {
  revYears,
  PARTS,
  natParts,
  natSub,
  subLab,
  mapAgg,
  national2,
} = revenue;

/** Per-region revenue, keyed by the same region id the geometry carries. */
export const regionRevenue = revenue.regions;

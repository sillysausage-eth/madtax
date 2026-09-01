import raw from "./generated/spending.json";
import type { SpendingSection } from "@/lib/types";

/**
 * The spending section, as split out of the bundle. Importing this module is what
 * puts the COFOG figures in the spending route's chunk and nowhere else — no
 * other mode may import it.
 *
 * The JSON literal type TypeScript infers is narrower than the contract
 * `verify.js` guarantees, so it is asserted to the hand-written section type.
 * The values are the bundle's, unchanged.
 */
export const spending = raw as unknown as SpendingSection;

export const {
  spendYears,
  spendNational,
  divisions,
  divES,
  divEN,
  spendSub,
  spendSubES,
  spendSubEN,
  spendNoteES,
  spendNoteEN,
  spendAgg,
  econKeys,
  econES,
  econEN,
} = spending;

/** Per-region spending, keyed by the same region id the geometry carries. */
export const regionSpending = spending.regions;

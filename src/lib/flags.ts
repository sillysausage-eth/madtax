import { MODES, type Mode } from "@/lib/modes";

/**
 * Build-time feature flags.
 *
 * `NEXT_PUBLIC_*` values are inlined by Next at build time, so a flag is settled
 * before a single byte is served — there is no runtime branch and no way for the
 * two sides of the app to disagree about what is switched on.
 *
 * Debt: the screen exists and its figures are real, but it is not ready to be
 * published, so it is off in production and on in development. Flipping
 * `NEXT_PUBLIC_FLAG_DEBT=1` and rebuilding is the only step needed to ship it.
 */
const raw = process.env.NEXT_PUBLIC_FLAG_DEBT;

export const DEBT_ENABLED: boolean =
  raw === "1" ? true : raw === "0" ? false : process.env.NODE_ENV !== "production";

/** The modes a reader can actually reach. Nothing renders a tab it cannot open. */
export const ENABLED_MODES: readonly Mode[] = MODES.filter(
  (m) => m !== "debt" || DEBT_ENABLED,
);

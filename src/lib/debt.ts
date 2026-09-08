/**
 * The debt screen's ring palettes, ported from prototype/console.tpl.html
 * (`DEBT_INSTR_C`, `DEBT_HOLD_C`).
 *
 * Every stop is lightened until it clears 3:1 against the panel it is drawn on.
 * The prototype's ramp ran down to `#4A2E75` and `#3E2A55`, which sit at 1.6:1
 * and 1.4:1: the last two slices of every ring were effectively invisible. Hue
 * varies alongside lightness so the set separates without relying on brightness
 * alone.
 */

/** Securities are the violet pair, loans the blue pair, cash the grey. */
export const DEBT_INSTR_C: Record<string, string> = {
  GD_F32: "#B47BE8", // long-term securities
  GD_F31: "#D9B8F5", // short-term securities
  GD_F42: "#6C8DEF", // long-term loans
  GD_F41: "#9EB6F5", // short-term loans
  GD_F2: "#A99BC4", // currency and deposits
};

/** Holders keep source order, so the ramp is indexed rather than keyed. */
export const DEBT_HOLD_C: string[] = [
  "#B47BE8",
  "#6C8DEF",
  "#D9B8F5",
  "#C98FD8",
  "#7FB3E8",
  "#E2A0D8",
  "#A99BC4",
];

/** Any instrument the bundle adds before this map does keeps the accent violet. */
export const DEBT_INSTR_FALLBACK = "#B47BE8";

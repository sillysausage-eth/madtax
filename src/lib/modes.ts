import type { Dict } from "@/i18n";

/**
 * Navigation is a mode switch, not a page tree: one console whose mode flips the
 * screen and its accent. The URL segments are stable English regardless of locale.
 */
export const MODES = ["revenue", "spending", "debt"] as const;
export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "revenue";

export function isMode(v: string): v is Mode {
  return (MODES as readonly string[]).includes(v);
}

/** Tab labels come from the prototype's dictionary — Ingresos / Gasto / Deuda. */
export function modeLabel(d: Dict, mode: Mode): string {
  return mode === "revenue" ? d.modeRev : mode === "spending" ? d.modeExp : d.modeDebt;
}

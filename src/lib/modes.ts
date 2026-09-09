import type { Dict } from "@/i18n";

/**
 * Navigation is a mode switch, not a page tree: one console whose mode flips the
 * screen and its accent. The URL segments are stable English regardless of locale.
 *
 * `overview` is the mode a reader lands on, and the only one whose URL is the locale
 * root itself rather than a segment under it — it is the site's front page, so it gets
 * the site's own address. `modePath` is the one place that knows.
 */
export const MODES = ["overview", "revenue", "spending", "debt"] as const;
export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "overview";

export function isMode(v: string): v is Mode {
  return (MODES as readonly string[]).includes(v);
}

/**
 * The mode a path is showing. The locale root carries no mode segment and is the
 * overview; anything else unrecognised falls back to it too, which is what the layout
 * needs during a `notFound()` render.
 *
 * Shared by the tab strip and the accent frame so the two can never disagree about
 * which screen the reader is on.
 */
export function modeFromPath(pathname: string): Mode {
  const segment = pathname.split("/")[2] ?? "";
  return isMode(segment) ? segment : DEFAULT_MODE;
}

/** Tab labels come from the prototype's dictionary — Ingresos / Gasto / Deuda. */
export function modeLabel(d: Dict, mode: Mode): string {
  return mode === "overview"
    ? d.modeAll
    : mode === "revenue"
      ? d.modeRev
      : mode === "spending"
        ? d.modeExp
        : d.modeDebt;
}

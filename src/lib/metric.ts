import type { Locale } from "@/i18n";
import { eur, nf, nf0 } from "@/lib/format";

/**
 * The map's reading, and how it is written — the prototype's `metric` and
 * `fmtMetric()`.
 *
 * Mode-agnostic and free of any data import: both consoles read the same three
 * metrics, and a module that pulled in a section would drag that section into the
 * other mode's chunk.
 */

/** Which metric the map and dossier read. */
export type Metric = "total" | "pc" | "gdp";

/** The prototype's `fmtMetric`. `—` for absent, never a filled-in zero. */
export const fmtMetric = (
  locale: Locale,
  metric: Metric,
  v: number | null,
): string =>
  v == null
    ? "—"
    : metric === "total"
      ? eur(locale, v)
      : metric === "pc"
        ? "€" + nf0(locale, v)
        : nf(locale, v, 1) + "%";

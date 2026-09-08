import type { Dict, Locale } from "@/i18n";
import { eur, nf0 } from "@/lib/format";
import type { RegionMacro, YearKey } from "@/lib/types";
import type { KvRow } from "@/components/console/Dossier";

/**
 * The two denominators, read for one year — the prototype's per-capita and %GDP
 * arithmetic, made to divide by the population and GDP of the year the figure
 * belongs to rather than by one fixed vintage.
 *
 * Mode-agnostic and free of any data import, like `lib/metric`: both consoles
 * read the same series.
 */

/** Residents on 1 January of `y`, or null where Eurostat has not published it. */
export const popOf = (m: RegionMacro | undefined, y: YearKey): number | null =>
  m && m.pop[y] != null ? m.pop[y] : null;

/** Regional GDP of `y` in € million, or null where not yet published. */
export const gdpOf = (m: RegionMacro | undefined, y: YearKey): number | null =>
  m && m.gdp[y] != null ? m.gdp[y] : null;

/** € per resident: € millions over the year's own headcount. */
export const perCapita = (v: number, m: RegionMacro | undefined, y: YearKey): number | null => {
  const p = popOf(m, y);
  return p ? (v * 1e6) / p : null;
};

/** Share of the year's own regional GDP, in percent. */
export const pctGdp = (v: number, m: RegionMacro | undefined, y: YearKey): number | null => {
  const g = gdpOf(m, y);
  return g ? (v / g) * 100 : null;
};

/** The dossier row for population, labelled with the date it was counted on. */
export function popRow(t: Dict, locale: Locale, m: RegionMacro | undefined, y: YearKey): KvRow {
  const p = popOf(m, y);
  return [t.popY.replace("{Y}", y), p != null ? nf0(locale, p) : "—"];
}

/**
 * The dossier row for GDP, labelled with its year. While Eurostat still flags
 * the year provisional the row carries the caveat sentence, which `KvGrid`
 * renders as a `(p)` marker with a tooltip after the label.
 */
export function gdpRow(t: Dict, locale: Locale, m: RegionMacro | undefined, y: YearKey): KvRow {
  const g = gdpOf(m, y);
  const v = g != null ? eur(locale, g) : "—";
  const label = t.gdpY.replace("{Y}", y);
  return m && m.gdpProvisional.includes(y) ? [label, v, t.provEu] : [label, v];
}

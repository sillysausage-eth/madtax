import { INTL_LOCALE, type Locale } from "@/i18n";

/**
 * Number and currency formatting, ported 1:1 from prototype/console.tpl.html
 * (`loc()`, `nf()`, `nf0()`, `eur()`). The prototype reads the active locale from
 * a module-level `L`; here it is an explicit argument so server components can
 * render either locale in the same process.
 *
 * These functions format — they never compute. Every value passed in comes from
 * the bundle verbatim.
 */

/** The prototype's `loc()`. */
export const intlLocale = (locale: Locale): string => INTL_LOCALE[locale];

/** The prototype's `nf()` — fixed decimals, always grouped. */
export const nf = (locale: Locale, v: number, d = 1): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
    useGrouping: "always",
  }).format(v);

/**
 * The fiscal year as this locale writes it. "FY" is an English accounting
 * habit — in Spanish the ejercicio is simply the year, and prefixing it with
 * two English initials says nothing to a Spanish reader.
 */
export const fy = (locale: Locale, year: string): string =>
  locale === "es" ? year : `FY${year}`;

/** The prototype's `nf0()` — no decimals, always grouped. */
export const nf0 = (locale: Locale, v: number): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(v);

/**
 * The prototype's `eur()`. `m` is € millions.
 * es-ES: `€1.698,2 MM` · en-GB: `€1,698.2bn`
 * The minus sign is U+2212, as in the prototype.
 */
export function eur(locale: Locale, m: number | null | undefined): string {
  if (m == null) return "—";
  const a = Math.abs(m);
  const sign = m < 0 ? "−" : "";
  const es = locale === "es";
  if (a >= 1000) return sign + "€" + nf(locale, a / 1000, 1) + (es ? " MM" : "bn");
  if (a >= 1) return sign + "€" + nf0(locale, a) + (es ? " M" : "m");
  if (a >= 0.001) return sign + "€" + nf0(locale, a * 1000) + (es ? " mil" : "k");
  return sign + "€" + nf0(locale, a * 1e6);
}

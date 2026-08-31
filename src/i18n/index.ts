import { es, type Dict } from "./es";
import { en } from "./en";

export type { Dict };

/** Path-prefix locales. es is the default; the URL always carries one. */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

const DICTS: Record<Locale, Dict> = { es, en };

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/** The dictionary for a locale. Mirrors the prototype's `t()`. */
export function dict(locale: Locale): Dict {
  return DICTS[locale];
}

/** BCP-47 tag used for number formatting — the prototype's `loc()`. */
export const INTL_LOCALE: Record<Locale, string> = {
  es: "es-ES",
  en: "en-GB",
};

import { LOCALES, INTL_LOCALE, type Locale } from "@/i18n";
import type { Mode } from "@/lib/modes";
import { SITE_NAME, copy, modePath } from "@/lib/meta";
import { abs } from "@/lib/site";

/**
 * Schema.org descriptions of the site, emitted as JSON-LD.
 *
 * Two claims only, and both are ones we can stand behind: what this site is
 * (`WebSite`, published by an organisation whose stated purpose is transparency)
 * and where a reader is inside it (`BreadcrumbList`). Nothing here asserts a
 * `Dataset`: that vocabulary promises a licence, a distribution and a
 * maintainer, and the figures belong to AEAT, IGAE and Eurostat, not to us.
 */

/** A `@graph` of the site and its publisher, for the locale layout. */
export function siteJsonLd(locale: Locale) {
  const c = copy(locale);
  const org = abs("/#organisation");
  const site = abs(`/${locale}#website`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SITE_NAME,
        url: abs("/"),
        description: c.mission,
      },
      {
        "@type": "WebSite",
        "@id": site,
        name: `${SITE_NAME} · ${c.title}`,
        alternateName: SITE_NAME,
        url: abs(`/${locale}`),
        description: c.description,
        inLanguage: INTL_LOCALE[locale],
        publisher: { "@id": org },
        /* Every translation of this site, so the pair is understood as one work
           in two languages. */
        workTranslation: LOCALES.filter((l) => l !== locale).map((l) => ({
          "@type": "WebSite",
          url: abs(`/${l}`),
          inLanguage: INTL_LOCALE[l],
        })),
      },
    ],
  };
}

/** `MadTax › Ingresos`, so a result carries the trail rather than a bare URL. */
export function modeJsonLd(locale: Locale, mode: Mode) {
  const c = copy(locale);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: abs(`/${locale}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: c.modes[mode].title,
        item: abs(modePath(locale, mode)),
      },
    ],
  };
}

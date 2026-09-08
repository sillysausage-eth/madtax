import type { Metadata } from "next";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n";
import type { Mode } from "@/lib/modes";
import { SITE_URL, abs } from "@/lib/site";

/**
 * Document metadata — the browser tab, the search result, the shared link.
 *
 * Kept out of `src/i18n/*`: those tables are ported verbatim from the prototype
 * and must not gain strings the prototype never had. Every line here is one
 * sentence at most, because that is all a tab or a snippet ever shows.
 */

/** The wordmark, unlocalised — it is the name of the thing, not a word. */
export const SITE_NAME = "MadTax";

/** og:locale wants the BCP-47 tag with an underscore. */
const OG_LOCALE: Record<Locale, string> = { es: "es_ES", en: "en_GB" };

type Copy = {
  /** Shown when no mode has been chosen yet, e.g. the locale root. */
  title: string;
  description: string;
  /** What the organisation is for, in one line. Used by the JSON-LD. */
  mission: string;
  modes: Record<Mode, { title: string; description: string }>;
};

const COPY: Record<Locale, Copy> = {
  es: {
    title: "Cuentas públicas de España",
    description:
      "Transparencia de las cuentas públicas de España: ingresos, gasto y deuda, a partir de las cifras oficiales publicadas.",
    mission:
      "Transparencia de las cuentas públicas de España, a partir de las cifras oficiales publicadas.",
    modes: {
      revenue: {
        title: "Ingresos",
        description:
          "Qué recauda España y de dónde sale, por figura tributaria y por comunidad autónoma.",
      },
      spending: {
        title: "Gasto",
        description:
          "En qué gasta España, por función del gasto y por comunidad autónoma.",
      },
      debt: {
        title: "Deuda",
        description:
          "El saldo de deuda pública de España: cuánto, en qué forma y cómo ha cambiado.",
      },
    },
  },
  en: {
    title: "Spain’s public accounts",
    description:
      "Transparency for Spain’s public accounts: revenue, spending and debt, from the official published figures.",
    mission:
      "Transparency for Spain’s public accounts, from the official published figures.",
    modes: {
      revenue: {
        title: "Revenue",
        description:
          "What Spain collects and where it comes from, by tax and by Autonomous Region.",
      },
      spending: {
        title: "Spending",
        description:
          "Where Spain’s spending goes, by function of government and by Autonomous Region.",
      },
      debt: {
        title: "Debt",
        description:
          "Spain’s public debt stock: how much, in what form and how it has changed.",
      },
    },
  },
};

export function copy(locale: Locale): Copy {
  return COPY[locale];
}

/** The path a locale/mode pair lives at. One definition, used by every URL below. */
export function modePath(locale: Locale, mode: Mode): string {
  return `/${locale}/${mode}`;
}

/**
 * `hreflang` for one screen across every locale, plus `x-default` for a crawler
 * that matches neither — pointed at Spanish, which is what `/` redirects to.
 *
 * Every locale is listed on every locale's page, and each page's own entry is
 * included, which is what Google asks for: the set has to be self-referential or
 * it is ignored.
 */
function languageAlternates(
  path: (locale: Locale) => string,
): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const l of LOCALES) langs[l] = abs(path(l));
  langs["x-default"] = abs(path(DEFAULT_LOCALE));
  return langs;
}

/**
 * Crawl directives, set on the consoles only.
 *
 * Deliberately not on the layout: Next emits nothing by default, which already
 * means indexable, and a `notFound()` rendered inside this layout — a mode
 * switched off by a flag, say — would otherwise carry both the boundary's
 * `noindex` and an inherited `index, follow` on the same page.
 */
const ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    /* A console is mostly one big chart; let Google show the full card. */
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/**
 * The locale layout's metadata. `template` titles every mode below it as
 * `Ingresos · MadTax`; `default` covers the layout's own segment.
 *
 * `metadataBase` is set here rather than in the root layout because the root
 * layout never renders — `/` redirects — so this is the highest segment that
 * actually reaches a crawler.
 */
export function siteMetadata(locale: Locale): Metadata {
  const c = COPY[locale];
  const title = `${SITE_NAME} · ${c.title}`;
  return {
    metadataBase: SITE_URL,
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description: c.description,
    applicationName: SITE_NAME,
    alternates: {
      canonical: abs(`/${locale}`),
      languages: languageAlternates((l) => `/${l}`),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => OG_LOCALE[l],
      ),
      url: abs(`/${locale}`),
      title,
      description: c.description,
    },
    twitter: { card: "summary_large_image", title, description: c.description },
  };
}

/**
 * One mode's metadata. The title is the bare mode name — the template adds the
 * wordmark — so a pinned tab reads `Ingresos` rather than a truncated brand.
 */
export function modeMetadata(locale: Locale, mode: Mode): Metadata {
  const c = COPY[locale];
  const { title, description } = c.modes[mode];
  const url = abs(modePath(locale, mode));
  return {
    title,
    description,
    robots: ROBOTS,
    alternates: {
      canonical: url,
      languages: languageAlternates((l) => modePath(l, mode)),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => OG_LOCALE[l],
      ),
      url,
      title: `${title} · ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
    },
  };
}

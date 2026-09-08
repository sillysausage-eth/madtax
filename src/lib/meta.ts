import type { Metadata } from "next";
import type { Locale } from "@/i18n";
import type { Mode } from "@/lib/modes";

/**
 * Document metadata — the browser tab, the search result, the shared link.
 *
 * Kept out of `src/i18n/*`: those tables are ported verbatim from the prototype
 * and must not gain strings the prototype never had. Every line here is one
 * sentence at most, because that is all a tab or a snippet ever shows.
 */

/** The wordmark, unlocalised — it is the name of the thing, not a word. */
const SITE = "MadTax";

const COPY: Record<
  Locale,
  {
    /** og:locale wants the BCP-47 tag with an underscore. */
    ogLocale: string;
    /** Shown when no mode has been chosen yet, e.g. the locale root. */
    title: string;
    description: string;
    modes: Record<Mode, { title: string; description: string }>;
  }
> = {
  es: {
    ogLocale: "es_ES",
    title: "Cuentas públicas de España",
    description:
      "Transparencia de las cuentas públicas de España: ingresos, gasto y deuda, a partir de las cifras oficiales publicadas.",
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
    ogLocale: "en_GB",
    title: "Spain's public accounts",
    description:
      "Transparency for Spain's public accounts: revenue, spending and debt, from the official published figures.",
    modes: {
      revenue: {
        title: "Revenue",
        description:
          "What Spain collects and where it comes from, by tax and by Autonomous Region.",
      },
      spending: {
        title: "Spending",
        description:
          "Where Spain's spending goes, by function of government and by Autonomous Region.",
      },
      debt: {
        title: "Debt",
        description:
          "Spain's public debt stock: how much, in what form and how it has changed.",
      },
    },
  },
};

/**
 * The locale layout's metadata. `template` titles every mode below it as
 * `Ingresos · MadTax`; `default` covers the layout's own segment.
 */
export function siteMetadata(locale: Locale): Metadata {
  const c = COPY[locale];
  const title = `${SITE} · ${c.title}`;
  return {
    title: { default: title, template: `%s · ${SITE}` },
    description: c.description,
    applicationName: SITE,
    openGraph: {
      type: "website",
      siteName: SITE,
      locale: c.ogLocale,
      title,
      description: c.description,
    },
    twitter: { card: "summary", title, description: c.description },
  };
}

/**
 * One mode's metadata. The title is the bare mode name — the template adds the
 * wordmark — so a pinned tab reads `Ingresos` rather than a truncated brand.
 */
export function modeMetadata(locale: Locale, mode: Mode): Metadata {
  const c = COPY[locale];
  const { title, description } = c.modes[mode];
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: SITE,
      locale: c.ogLocale,
      title: `${title} · ${SITE}`,
      description,
    },
    twitter: { card: "summary", title: `${title} · ${SITE}`, description },
  };
}

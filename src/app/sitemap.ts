import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n";
import { MODES } from "@/lib/modes";
import { abs } from "@/lib/site";
import { modePath } from "@/lib/meta";

/**
 * Every screen a reader can actually open, in both languages, each entry naming
 * its translations so a crawler treats the pair as one page in two languages
 * rather than as duplicates.
 *
 * `/{locale}` is in the list because it is a screen now, not a redirect: the overview
 * lives at the locale root. `/` is still absent — it redirects, and holds no content of
 * its own.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /* One timestamp for the whole file: the consoles ship as one bundle, so they
     are all exactly as fresh as each other. */
  const lastModified = new Date();

  return LOCALES.flatMap((locale) =>
    MODES.map((mode) => ({
      url: abs(modePath(locale, mode)),
      lastModified,
      changeFrequency: "monthly" as const,
      /* Spanish is the default locale and the redirect target, so it is the
         version to prefer when both are equally good matches. */
      priority: locale === DEFAULT_LOCALE ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, abs(modePath(l, mode))]),
        ),
      },
    })),
  );
}

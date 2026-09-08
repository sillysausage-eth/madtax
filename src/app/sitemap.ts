import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n";
import { ENABLED_MODES } from "@/lib/flags";
import { abs } from "@/lib/site";
import { modePath } from "@/lib/meta";

/**
 * Every screen a reader can actually open, in both languages, each entry naming
 * its translations so a crawler treats the pair as one page in two languages
 * rather than as duplicates.
 *
 * Only `ENABLED_MODES` is listed: a mode switched off by a flag 404s, and a
 * sitemap that points at a 404 costs crawl budget and trust.
 *
 * The redirects (`/` and `/{locale}`) are deliberately absent — they hold no
 * content, and the console they land on is the URL worth indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /* One timestamp for the whole file: the consoles ship as one bundle, so they
     are all exactly as fresh as each other. */
  const lastModified = new Date();

  return LOCALES.flatMap((locale) =>
    ENABLED_MODES.map((mode) => ({
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n";
import { useUrlSearch } from "./urlSearch";

/**
 * Language switch. Swaps only the locale segment and carries the query string
 * across, so the reader stays exactly where they were — same year, same region,
 * same open explainer — in the other language.
 *
 * The query comes from the History-API store rather than `useSearchParams`, so
 * this component still prerenders: the static HTML links to the same screen, and
 * picks up the console state as soon as the page hydrates.
 */
export default function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useUrlSearch();
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div className="langsw" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}${search}`}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODES, modeFromPath, type Mode } from "@/lib/modes";
import { modePath } from "@/lib/meta";
import type { Locale } from "@/i18n";

/**
 * The mode switch. Stable English segments, labelled from the prototype's
 * dictionary. `aria-current` drives the selected style, so the tab state is in
 * the markup rather than in JavaScript.
 *
 * Every href comes from `modePath`, which is also what the sitemap and the canonicals
 * use — so the overview's tab points at the locale root rather than at a second URL for
 * the same screen.
 *
 * Only the three labels cross the server/client boundary — the dictionary itself
 * carries a function (`unal`) and is not serialisable.
 */
export default function ModeTabs({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<Mode, string>;
}) {
  const active = modeFromPath(usePathname() ?? "");

  return (
    <nav className="modetabs" aria-label="Mode">
      {MODES.map((mode) => (
        <Link
          key={mode}
          href={modePath(locale, mode)}
          aria-current={active === mode ? "page" : undefined}
        >
          {labels[mode]}
        </Link>
      ))}
    </nav>
  );
}

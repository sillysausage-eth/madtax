"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Mode } from "@/lib/modes";
import { ENABLED_MODES } from "@/lib/flags";
import type { Locale } from "@/i18n";

/**
 * The mode switch. Stable English segments, labelled from the prototype's
 * dictionary. `aria-current` drives the selected style, so the tab state is in
 * the markup rather than in JavaScript.
 *
 * Only modes that are switched on appear: a tab that leads to a 404 is worse
 * than no tab.
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
  const pathname = usePathname() ?? "";
  const segment = pathname.split("/")[2] ?? "";

  return (
    <nav className="modetabs" aria-label="Mode">
      {ENABLED_MODES.map((mode) => (
        <Link
          key={mode}
          href={`/${locale}/${mode}`}
          aria-current={segment === mode ? "page" : undefined}
        >
          {labels[mode]}
        </Link>
      ))}
    </nav>
  );
}

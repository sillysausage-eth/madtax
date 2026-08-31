"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODES, type Mode } from "@/lib/modes";
import type { Locale } from "@/i18n";

/**
 * The mode switch. Three links, stable English segments, labelled from the
 * prototype's dictionary. `aria-current` drives the selected style, so the tab
 * state is in the markup rather than in JavaScript.
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
      {MODES.map((mode) => (
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

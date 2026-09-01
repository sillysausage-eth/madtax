"use client";

import { useCallback } from "react";
import type { Locale } from "@/i18n";
import { OPENING_YEAR_EXP } from "@/lib/spending";
import { divisions, spendYears } from "@/data/spending";
import { regions } from "@/data/map";
import SpendingConsole from "./SpendingConsole";
import { OFF_MAP_IDS_EXP } from "./SpendingDossier";
import { useUrlState } from "./useUrlState";
import { useKeyboardNav } from "./useKeyboardNav";

/**
 * The spending mode island: it owns the console's state and nothing else.
 *
 * Year, selection and focus live in the query string (`?y=&r=&f=`) so a reload
 * and the browser's back button land where the reader was. Anything the URL
 * cannot vouch for is dropped rather than trusted — a year the bundle has no
 * COFOG figures for, a region id that is not on the map, a function that is not
 * a COFOG division.
 */

/** `gf01`…`gf10` — the focus values the composition ring writes. */
const FOCUS_KEYS = divisions.map((d) => "gf" + d);

export default function SpendingExplorer({ locale }: { locale: Locale }) {
  const [url, setUrl] = useUrlState<{
    y: string | null;
    r: string | null;
    f: string | null;
  }>({ y: OPENING_YEAR_EXP, r: null, f: null });

  const year = url.y && spendYears.includes(url.y) ? url.y : OPENING_YEAR_EXP;
  const sel =
    url.r &&
    (OFF_MAP_IDS_EXP.includes(url.r) || regions.some((g) => g.id === url.r))
      ? url.r
      : null;
  const focus = url.f && FOCUS_KEYS.includes(url.f) ? url.f : null;

  const onYear = useCallback((y: string) => setUrl({ y }), [setUrl]);
  /* Clicking the same thing again clears it — the prototype's `select()`. */
  const onSelect = useCallback(
    (id: string) => setUrl({ r: sel === id ? null : id }),
    [setUrl, sel],
  );
  const onFocus = useCallback(
    (k: string) => setUrl({ f: focus === k ? null : k }),
    [setUrl, focus],
  );

  /* Escape unwinds one level: it closes an open explainer first, and only clears
     the map selection once nothing is open. */
  const onEscape = useCallback(() => {
    if (focus) setUrl({ f: null });
    else if (sel) setUrl({ r: null });
  }, [focus, sel, setUrl]);

  useKeyboardNav({ years: spendYears, year, onYear, onEscape });

  return (
    <SpendingConsole
      locale={locale}
      state={{ year, sel, focus }}
      onYear={onYear}
      onSelect={onSelect}
      onFocus={onFocus}
    />
  );
}

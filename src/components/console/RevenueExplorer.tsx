"use client";

import { useCallback, useState } from "react";
import type { Locale } from "@/i18n";
import { PARTS, revYears } from "@/data/revenue";
import { OPENING_YEAR } from "@/lib/revenue";
import { regions } from "@/data/map";
import RevenueConsole from "./RevenueConsole";
import { OFF_MAP_IDS } from "./RevenueDossier";
import { useUrlState } from "./useUrlState";
import { useKeyboardNav } from "./useKeyboardNav";
import { nextSort, type WhoSort } from "./WhoPaysTable";
import type { Tab } from "./WhoBlock";

/**
 * The revenue mode island: it owns the console's state and nothing else.
 *
 * Year, selection and focus live in the query string (`?y=&r=&f=`) so a reload
 * and the browser's back button land where the reader was. Anything the URL
 * cannot vouch for is dropped rather than trusted — an unknown year, a region id
 * that is not on the map, a component that is not in `PARTS`.
 */



export default function RevenueExplorer({ locale }: { locale: Locale }) {
  const [url, setUrl] = useUrlState<{
    y: string | null;
    r: string | null;
    f: string | null;
  }>({ y: OPENING_YEAR, r: null, f: null });

  /* The who-pays tab and sort are view state, not an address: they are the
     prototype's module-level `whoTab` / `whoSort`, kept here so a sort survives
     a change of focused component. */
  const [tab, setTab] = useState<Tab>("dec");
  const [sort, setSort] = useState<WhoSort>(null);

  const year = url.y && revYears.includes(url.y) ? url.y : OPENING_YEAR;
  const sel =
    url.r && (OFF_MAP_IDS.includes(url.r) || regions.some((g) => g.id === url.r))
      ? url.r
      : null;
  const focus = url.f && PARTS.includes(url.f) ? url.f : null;

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
  const onSort = useCallback((col: string) => setSort((s) => nextSort(s, col)), []);

  /* Escape unwinds one level: it closes an open explainer first, and only clears
     the map selection once nothing is open. */
  const onEscape = useCallback(() => {
    if (focus) setUrl({ f: null });
    else if (sel) setUrl({ r: null });
  }, [focus, sel, setUrl]);

  useKeyboardNav({ years: revYears, year, onYear, onEscape });

  return (
    <RevenueConsole
      locale={locale}
      state={{ year, sel, focus, tab, sort }}
      onYear={onYear}
      onSelect={onSelect}
      onFocus={onFocus}
      onTab={setTab}
      onSort={onSort}
    />
  );
}

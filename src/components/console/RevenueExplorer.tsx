"use client";

import { useCallback, useState } from "react";
import type { Locale } from "@/i18n";
import { PARTS, natParts, revYears } from "@/data/revenue";
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
 * Year, selection and filter live in the query string (`?y=&r=&f=`) so a reload
 * and the browser's back button land where the reader was. Anything the URL
 * cannot vouch for is dropped rather than trusted — an unknown year, a region id
 * that is not on the map, a component that is not in `PARTS`.
 *
 * `?f=` is the same parameter M2 used for the open explainer; since M5 it is the
 * map filter, because the control that writes it is the same control.
 */

/** Whether a component carries a figure in this year, and so can be filtered on. */
function partInYear(year: string, k: string): boolean {
  const n = natParts[year];
  const v = n ? (n as Record<string, unknown>)[k] : undefined;
  return typeof v === "number" && Math.abs(v) > 0;
}

export default function RevenueExplorer({ locale }: { locale: Locale }) {
  const [url, setUrl] = useUrlState<{
    y: string | null;
    r: string | null;
    f: string | null;
  }>({ y: OPENING_YEAR, r: null, f: null });

  /* The who-pays tab and sort are view state, not an address: they are the
     prototype's module-level `whoTab` / `whoSort`, kept here so a sort survives
     a change of filtered component. */
  const [tab, setTab] = useState<Tab>("dec");
  const [sort, setSort] = useState<WhoSort>(null);

  const year = url.y && revYears.includes(url.y) ? url.y : OPENING_YEAR;
  const sel =
    url.r && (OFF_MAP_IDS.includes(url.r) || regions.some((g) => g.id === url.r))
      ? url.r
      : null;
  /* A component with no figure this year has no coin to press and no map to
     draw — Eurostat folds 2025's income and consumption taxes into two pending
     aggregates — so the filter is not honoured for a year that does not carry
     it. It is cleared rather than silently ignored, so the address and the
     screen never disagree. */
  const focus =
    url.f && PARTS.includes(url.f) && partInYear(year, url.f) ? url.f : null;

  /* Scrubbing to a year that does not publish the filtered component drops the
     filter with the year change, in one history entry rather than two. */
  const onYear = useCallback(
    (y: string) =>
      setUrl(url.f && !partInYear(y, url.f) ? { y, f: null } : { y }),
    [setUrl, url.f],
  );
  /* Pressing the same thing again clears it — the prototype's `select()`. */
  const onSelect = useCallback(
    (id: string) => setUrl({ r: sel === id ? null : id }),
    [setUrl, sel],
  );
  /* Filtering to a component says nothing about who collects it: the panel opens
     on the component's whole national figure, and the reader picks a region — or
     the unsplit coin — for themselves. Earlier this auto-selected the unsplit
     coin for components no source splits by autonomous region, which read as the
     console answering a question the reader had not asked. The blank country
     those components draw is stated in the panel's mapped/unattributed split. */
  const onFocus = useCallback(
    (k: string) => setUrl({ f: focus === k ? null : k }),
    [setUrl, focus],
  );
  /* The total is a state to ask for, not the absence of one: pressing it lifts
     the filter whatever was pressed before. */
  const onTotal = useCallback(() => setUrl({ f: null }), [setUrl]);
  const onSort = useCallback((col: string) => setSort((s) => nextSort(s, col)), []);

  /* Escape unwinds one level: it clears the map selection first, and only lifts
     the filter once nothing is selected. The filter is the broader reading, so
     it is the last thing to go. */
  const onEscape = useCallback(() => {
    if (sel) setUrl({ r: null });
    else if (focus) setUrl({ f: null });
  }, [focus, sel, setUrl]);

  useKeyboardNav({ years: revYears, year, onYear, onEscape });

  return (
    <RevenueConsole
      locale={locale}
      state={{ year, sel, focus, tab, sort }}
      onYear={onYear}
      onSelect={onSelect}
      onFocus={onFocus}
      onTotal={onTotal}
      onTab={setTab}
      onSort={onSort}
    />
  );
}

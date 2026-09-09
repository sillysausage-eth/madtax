"use client";

import { useCallback } from "react";
import type { Locale } from "@/i18n";
import { INT_KEY, OPENING_YEAR_EXP, aggCode, spendNoSplit } from "@/lib/spending";
import { divisions, spendYears } from "@/data/spending";
import { regions } from "@/data/map";
import SpendingConsole from "./SpendingConsole";
import { OFF_MAP_IDS_EXP, STATE_ID_EXP } from "./SpendingDossier";
import { useUrlState } from "./useUrlState";
import { useKeyboardNav } from "./useKeyboardNav";

/**
 * The spending mode island: it owns the console's state and nothing else.
 *
 * Year, selection and filter live in the query string (`?y=&r=&f=`) so a reload
 * and the browser's back button land where the reader was. Anything the URL
 * cannot vouch for is dropped rather than trusted — a year the bundle has no
 * COFOG figures for, a region id that is not on the map, a function that is not
 * a COFOG division.
 *
 * `?f=` is the same parameter M3 used for the open explainer; since M6 it is the
 * map filter, because the control that writes it is the same control.
 */

/** `gf01`…`gf10` and `gfint` — the filter values the coin grid and the ring write. */
const FOCUS_KEYS = [...divisions.map((d) => "gf" + d), INT_KEY];

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
  /* A function the regional tier does not spend on at all — defence, every
     year — has nothing to colour, so filtering to it also selects the State
     coin: the panel then says at once that the whole figure is spent centrally,
     instead of leaving a blank country to be read as missing data. The revenue
     console's rule for a component with no territorial split, unchanged. */
  const onFocus = useCallback(
    (k: string) => {
      if (focus === k) return setUrl({ f: null });
      /* Defence opens with the State coin already selected, because the coin *is*
         where defence is spent — the regional tier has none of it. Interest is not
         that case: it is off the map, but three quarters of a tenth of it is paid
         by governments the coin is not named for, so it opens on the national
         figure and the panel names the tiers underneath. */
      setUrl(spendNoSplit(year, aggCode(k)) ? { f: k, r: STATE_ID_EXP } : { f: k });
    },
    [setUrl, focus, year],
  );
  /* The total is a state to ask for, not the absence of one: pressing it lifts
     the filter whatever was pressed before. */
  const onTotal = useCallback(() => setUrl({ f: null }), [setUrl]);

  /* Escape unwinds one level: it clears the map selection first, and only lifts
     the filter once nothing is selected. The filter is the broader reading, so
     it is the last thing to go — the revenue console's rule, unchanged.

     There is no year guard on the filter here, and none is needed: every COFOG
     division carries a figure in every year the bundle publishes, so scrubbing
     never strands the filter on a year that cannot honour it. */
  const onEscape = useCallback(() => {
    if (sel) setUrl({ r: null });
    else if (focus) setUrl({ f: null });
  }, [focus, sel, setUrl]);

  useKeyboardNav({ years: spendYears, year, onYear, onEscape });

  return (
    <SpendingConsole
      locale={locale}
      state={{ year, sel, focus }}
      onYear={onYear}
      onSelect={onSelect}
      onFocus={onFocus}
      onTotal={onTotal}
    />
  );
}

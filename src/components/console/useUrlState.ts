"use client";

import { useCallback, useMemo, useState } from "react";
import { notifyUrlSearch, useUrlSearch } from "./urlSearch";

/**
 * Console state in the query string: `?y=` year, `?r=` selected region, `?f=`
 * focused component. This is the state *mechanism* — one place that owns the
 * console's variables — not the deep-link feature, which is post-V1.
 *
 * The URL is the state: a write goes through `history.replaceState` and then
 * notifies the store, so the console repaints in the same frame the prototype
 * does, and the back and forward buttons land on the state they were taken at
 * without a second copy of the truth to keep in step.
 *
 * `history.replaceState`, not `router.replace`: the App Router has no shallow
 * option, so `router.replace` is a real navigation — it refetches the route,
 * remounts this island, and leaves the console a full interaction behind the
 * reader. Next supports the native History API for exactly this case.
 *
 * The first render — on the server and again on hydration — is always the
 * defaults, so the static HTML and the hydrated tree agree; the query is adopted
 * immediately afterwards.
 *
 * A key whose value equals its default is left out of the URL entirely: the
 * plain route stays a plain route.
 *
 * Mode-agnostic: debt has no year, spending has no component focus. Pass the
 * keys the mode actually has.
 */
export type UrlState = Record<string, string | null>;

function readFrom<S extends UrlState>(defaults: S, search: URLSearchParams): S {
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof S & string)[]) {
    const raw = search.get(k);
    if (raw !== null) out[k] = raw as S[keyof S & string];
  }
  return out;
}

const same = <S extends UrlState>(a: S, b: S): boolean =>
  Object.keys(a).every((k) => a[k] === b[k]);

export function useUrlState<S extends UrlState>(
  defaults: S,
): [S, (patch: Partial<S>) => void] {
  const search = useUrlSearch();

  /* The defaults are read once, at mount: they are what "not in the URL" means
     for this console, and they must not shift under an already-shared link. */
  const [base] = useState(defaults);
  const state = useMemo(
    () => readFrom(base, new URLSearchParams(search)),
    [base, search],
  );

  const set = useCallback(
    (patch: Partial<S>) => {
      const cur = readFrom(base, new URLSearchParams(window.location.search));
      const next = { ...cur, ...patch };
      if (same(cur, next)) return;
      const params = new URLSearchParams();
      for (const k of Object.keys(base)) {
        const v = next[k];
        if (v != null && v !== base[k]) params.set(k, v);
      }
      const q = params.toString();
      window.history.replaceState(
        null,
        "",
        q ? `${window.location.pathname}?${q}` : window.location.pathname,
      );
      notifyUrlSearch();
    },
    [base],
  );

  return [state, set];
}

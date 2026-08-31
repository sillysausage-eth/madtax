"use client";

import { useSyncExternalStore } from "react";

/**
 * The address bar's query string, as a subscribable value.
 *
 * `useSearchParams()` would be the obvious tool, but reading it opts a route out
 * of prerendering: the console would ship a Suspense fallback as its static HTML
 * instead of the figures. This store reads the same string through the History
 * API, so the page prerenders in full and the query is adopted right after
 * hydration.
 *
 * Writers call `notifyUrlSearch()` after changing the URL; `popstate` covers the
 * back and forward buttons. The server snapshot is empty, which is exactly true:
 * a static page is built without a query string.
 */

const listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};

/** Tell every subscriber the query string may have changed. */
export function notifyUrlSearch() {
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("popstate", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("popstate", emit);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";

/** The current query string, including its leading `?`, or `""`. */
export function useUrlSearch(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

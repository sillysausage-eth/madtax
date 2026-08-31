"use client";

import { useEffect } from "react";

/**
 * The prototype's document-level key handler, ported.
 *
 * ← and → scrub the fiscal year along the mode's own year list; they stop at the
 * ends rather than wrapping, because wrapping from 2025 to 2012 reads as a bug.
 * Escape unwinds one level at a time: it closes an open explainer first, and only
 * clears the map selection once nothing is open.
 *
 * Mode-agnostic: a mode with no year list passes an empty one and keeps Escape.
 */
export function useKeyboardNav({
  years,
  year,
  onYear,
  onEscape,
  enabled = true,
}: {
  years: readonly string[];
  year: string;
  onYear: (y: string) => void;
  onEscape: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
        return;
      }
      const i = years.indexOf(year);
      if (e.key === "ArrowLeft" && i > 0) onYear(years[i - 1]);
      if (e.key === "ArrowRight" && i > -1 && i < years.length - 1) onYear(years[i + 1]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [years, year, onYear, onEscape, enabled]);
}

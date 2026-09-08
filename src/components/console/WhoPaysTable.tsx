"use client";

import type { Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";

/**
 * Table primitives shared by every who-pays drill-down, ported from the
 * prototype's `sortTh` / `applySort` / `infoNote` and the `.wtab` markup.
 *
 * Mode-agnostic: a table is a table. The revenue-specific views live in
 * `WhoBlock.tsx`; spending's tables in M3 use the same primitives.
 */

/** One row of a `KindTable`: a published line of a stated total. */
export interface KindRow {
  key: string;
  label: string;
  /** A dimmer second line under the label — the source's own footnote on the row. */
  sub?: string;
  /** Hover text: the publisher's own name for the row, kept for provenance. */
  title?: string;
  v: number;
}

/**
 * The standard breakdown table: one published cut of a figure, each row with
 * its amount and its share of the stated total, and the total itself closing
 * the table. It is the same `.wtab` surface the who-pays tables draw, so a
 * component with no who-pays data still reads on the table income tax does,
 * and a bucket its sources cut several ways reads as several of the same table.
 *
 * `total` is the figure the shares are of — a published figure, never the sum
 * of the rows. Where the rows and the total differ, the note under the table
 * says why; nothing here closes the gap.
 */
export function KindTable({
  caption,
  colHead,
  amountHead,
  shareHead,
  rows,
  total,
  totalLabel,
  totalTag,
  note,
  locale,
}: {
  /** Names the cut when a panel holds more than one table; omitted otherwise. */
  caption?: string;
  colHead: string;
  amountHead: string;
  shareHead: string;
  rows: KindRow[];
  total: number;
  totalLabel: string;
  /** A marker after the total's label — the provisional `(p)` badge, typically. */
  totalTag?: React.ReactNode;
  note?: string;
  locale: Locale;
}) {
  /* Bars are relative to the largest row, as the income-tax tables draw them,
     so the share column stays narrow enough for the amount beside it. */
  const mx = rows.length ? Math.max(...rows.map((r) => Math.abs(r.v))) : 0;
  return (
    <>
      {caption ? <span className="who-h">{caption}</span> : null}
      <table className="wtab kind">
        <thead>
          <tr>
            <th>{colHead}</th>
            <th>{amountHead}</th>
            <th>{shareHead}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const share = total ? (r.v / total) * 100 : null;
            return (
              <tr key={r.key}>
                <td title={r.title}>
                  {r.label}
                  {r.sub ? <span className="kn">{r.sub}</span> : null}
                </td>
                <td>
                  <b>{eur(locale, r.v)}</b>
                </td>
                <td>
                  {share == null ? "—" : `${nf(locale, share, 1)}%`}
                  <WBar width={mx ? (Math.abs(r.v) / mx) * 46 : 0} />
                </td>
              </tr>
            );
          })}
          <tr className="tot">
            <td>
              {totalLabel}
              {totalTag}
            </td>
            <td>
              <b>{eur(locale, total)}</b>
            </td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
      {note ? <p className="who-note">{note}</p> : null}
    </>
  );
}

export type WhoSort = { col: string; dir: -1 | 1 } | null;

/**
 * The view switch's key. Held by the caller, not the block, so a reader who
 * picked a cut and then opened another component finds it still applied.
 */
export type Tab = "dec" | "qui" | "top";

/** The view switch above a table. Reused by every block with more than one cut. */
export function WTabs({
  tabs,
  tab,
  onTab,
}: {
  tabs: [Tab, string][];
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  return (
    <div className="wtabs">
      {tabs.map(([k, l]) => (
        <button
          key={k}
          className="wtb"
          data-wt={k}
          aria-pressed={tab === k}
          onClick={(e) => {
            e.stopPropagation();
            onTab(k);
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/**
 * Click cycle: descending, then ascending, then back to the source order. The
 * published order is a fact of its own, so it stays reachable.
 */
export function nextSort(cur: WhoSort, col: string): WhoSort {
  if (cur && cur.col === col) return cur.dir === -1 ? { col, dir: 1 } : null;
  return { col, dir: -1 };
}

/**
 * The prototype's `applySort`. Tax and share are proportional, so both columns
 * are offered and both produce the same order — the pair is there because each
 * reads naturally to a different person.
 */
export function applySort<T extends { x: { tax: number } }>(
  rows: T[],
  sort: WhoSort,
): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => (a.x.tax - b.x.tax) * sort.dir);
}

export function SortTh({
  col,
  label,
  sort,
  onSort,
}: {
  col: string;
  label: string;
  sort: WhoSort;
  onSort: (col: string) => void;
}) {
  const on = !!sort && sort.col === col;
  const arrow = on ? (sort!.dir === -1 ? "▼" : "▲") : "▾";
  return (
    <th
      className={`sortable ${on ? "on" : ""}`}
      data-sort={col}
      aria-sort={on ? (sort!.dir === -1 ? "descending" : "ascending") : "none"}
      onClick={(e) => {
        e.stopPropagation();
        onSort(col);
      }}
    >
      {label}
      <span className="sar">{arrow}</span>
    </th>
  );
}

/** A footnote that states a gap rather than hiding it. The copy carries `<b>`. */
export function InfoNote({ html }: { html: string }) {
  return (
    <div className="infonote">
      <span className="ico" aria-hidden="true">
        i
      </span>
      <p dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** The inline share bar in the last column. Width in px, as the prototype sets it. */
export function WBar({ width }: { width: number }) {
  return (
    <span
      className="wbar"
      style={{ width: `${Math.max(1, width)}px`, marginLeft: "6px" }}
    />
  );
}

/**
 * The `· 2019 data` tag a header carries when the series has no figure for the
 * year on screen. The section shows the nearest published year and says so,
 * rather than showing the selected year's number, which does not exist.
 */
export function StaleTag({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <>
      {" "}
      <span style={{ color: "var(--am)" }}>{text}</span>
    </>
  );
}

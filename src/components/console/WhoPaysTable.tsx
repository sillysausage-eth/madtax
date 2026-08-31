"use client";

/**
 * Table primitives shared by every who-pays drill-down, ported from the
 * prototype's `sortTh` / `applySort` / `infoNote` and the `.wtab` markup.
 *
 * Mode-agnostic: a table is a table. The revenue-specific views live in
 * `WhoBlock.tsx`; spending's tables in M3 use the same primitives.
 */

export type WhoSort = { col: string; dir: -1 | 1 } | null;

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

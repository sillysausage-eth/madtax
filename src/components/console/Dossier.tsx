import { Fragment } from "react";
import type { Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";

/**
 * The dossier shell, ported from the prototype's `paintDossier()` markup and
 * `partBars()`. Presentation only: it renders figures that were read from the
 * bundle and formatted, and computes nothing beyond the share of a total that
 * the prototype prints beside each bar.
 *
 * Mode-agnostic — spending's dossier in M3 is the same shell with different
 * rows and a different advisory.
 */

export function DossierBlank({ hint }: { hint: string }) {
  return (
    <div
      className="sub"
      style={{ padding: "22px 0", textAlign: "center", color: "var(--dim)" }}
    >
      {hint}
    </div>
  );
}

export function KvGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="kv">
      {rows.map(([k, v], i) => (
        <Fragment key={`kv${i}`}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </Fragment>
      ))}
    </div>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  colour: string;
}

/**
 * The prototype's `partBars()`. Bar widths are relative to the largest row, so
 * the block reads as a shape; the honest share of the total is printed under
 * each bar when a total is given.
 */
export function PartBars({
  rows,
  total,
  locale,
}: {
  rows: BarRow[];
  /** Omit to drop the percentage line, as the prototype does when there is none. */
  total?: number;
  locale: Locale;
}) {
  const mx = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <>
      {rows.map((r) => (
        <div className="bar" key={r.key}>
          <div className="r">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 1,
                  marginRight: 6,
                  background: r.colour,
                }}
              />
              {r.label}
            </span>
            <b>{eur(locale, r.value)}</b>
          </div>
          <div className="track">
            <div
              className="fill"
              style={{
                width: `${Math.max(0, (Math.abs(r.value) / mx) * 100)}%`,
                background: r.colour,
              }}
            />
          </div>
          {total ? (
            <div className="pctline">{nf(locale, (r.value / total) * 100, 1)}%</div>
          ) : null}
        </div>
      ))}
    </>
  );
}

/** A block of bars under its own caption — the dossier's `.bars` section. */
export function BarBlock({
  caption,
  children,
  gap = 8,
}: {
  caption: string;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <div className="bars">
      <span className="sub" style={{ display: "block", marginBottom: gap }}>
        {caption}
      </span>
      {children}
    </div>
  );
}

/**
 * A named caveat about the figure above it. Never a judgement about the figure —
 * it says what the number is and is not, in the source's own terms.
 */
export function Advisory({
  tag,
  text,
  mag = false,
  style,
}: {
  tag: string;
  text: string;
  mag?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={mag ? "advisory mag" : "advisory"} style={style}>
      <span className="tag">{tag}</span>
      <p>{text}</p>
    </div>
  );
}

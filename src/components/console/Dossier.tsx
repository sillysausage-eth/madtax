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

/**
 * The provisional marker: a `(p)` badge in the attention colour whose caveat —
 * who flags the year provisional and what that means — appears on hover and on
 * keyboard focus, and is the badge's accessible name. The label it sits after
 * stays clean; the caveat is never dropped, only moved one hover away.
 */
export function ProvTag({ badge, text }: { badge: string; text: string }) {
  return (
    <span className="prov" tabIndex={0} role="note" aria-label={text}>
      <span className="prov-b" aria-hidden="true">
        {badge}
      </span>
      <span className="prov-tip" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

/**
 * One dossier row: label, value and — for a figure the source still flags
 * provisional — the caveat sentence, rendered as a `ProvTag` after the label
 * so `lib/` can build rows without JSX.
 */
export type KvRow = [label: string, value: string, prov?: string];

export function KvGrid({ rows, provBadge }: { rows: KvRow[]; provBadge: string }) {
  return (
    <div className="kv">
      {rows.map(([k, v, prov], i) => (
        <Fragment key={`kv${i}`}>
          <span className="k">
            {k}
            {prov ? <ProvTag badge={provBadge} text={prov} /> : null}
          </span>
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
  /** Omit where the block reads as a decomposition of the figure above it. */
  caption?: string;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <div className="bars">
      {caption ? (
        <span className="sub" style={{ display: "block", marginBottom: gap }}>
          {caption}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/**
 * A caveat that explains a discrepancy or an absence, one hover away.
 *
 * Every sentence of this kind — why a component's money is not on the map, why
 * a region reads "—", why a published table is missing for a year — used to sit
 * as body copy in the middle of the panel, where it repeated itself down the
 * whole filter rail and pushed the figures it qualifies out of the first
 * screen. None of it is dropped: the tag names the question in the panel's own
 * chrome voice, and the sentence itself opens on hover and on keyboard focus,
 * exactly as the provisional `(p)` marker does.
 *
 * `inline` is for a tip that sits mid-panel, next to the figure it qualifies,
 * rather than closing the panel: it drops the closing rule and hangs the tip
 * downward. The default closes the panel and opens upward, because hung
 * downward there it would leave the scroll container.
 */
export function FootTip({
  tag,
  text,
  inline = false,
}: {
  tag: string;
  text: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "foottip inline" : "foottip"}>
      <span className="tip" tabIndex={0} role="note" aria-label={`${tag} ${text}`}>
        <span className="tip-t" aria-hidden="true">
          {tag}
        </span>
        <span className="tip-b" aria-hidden="true">
          (i)
        </span>
        <span className="tip-x" aria-hidden="true">
          {text}
        </span>
      </span>
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

import type { Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";

/**
 * The composition ring and its legend, ported from the prototype's
 * `paintComposition()` (interactive `panel` variant) and `donutRing()` (static
 * `card` variant). Hand-composed SVG: one `<circle>` per slice, dash array as
 * the arc length. No chart library.
 *
 * Mode-agnostic — it takes rows, a total, a floor and a centre string, and knows
 * nothing about revenue. The `card` variant is the compact one, for a ring in a
 * column too narrow to stand a legend beside it.
 */

export interface DonutSlice {
  k: string;
  v: number;
  nm: string;
  desc?: string;
  c: string;
}

const R = 40;
const C = 2 * Math.PI * R;

export default function Donut({
  rows,
  total,
  floor,
  centre,
  aria,
  locale,
  variant = "panel",
  absShares = false,
  focus = null,
  onFocus,
  totalRow,
  showLegend = true,
  children,
}: {
  rows: DonutSlice[];
  total: number;
  /**
   * Minimum share, in percentage points, any slice is drawn at. A part worth
   * 0.04% of the total would be an invisible hairline, so every share gets a
   * floor and the set is then rescaled — the ring still closes on exactly 100%,
   * and the honest percentages are in the legend either way.
   */
  floor: number;
  /** The figure in the middle, already formatted. */
  centre: string;
  aria: string;
  locale: Locale;
  variant?: "panel" | "card";
  /** Debt slices are read at absolute value for the geometry; revenue is not. */
  absShares?: boolean;
  focus?: string | null;
  onFocus?: (k: string) => void;
  totalRow?: { label: string; value: string };
  /**
   * Revenue replaces the text legend with its grid of pressable component
   * coins, which is the console's filter control. The ring, the centre figure
   * and the focus dimming are the same either way.
   */
  showLegend?: boolean;
  /** What stands beside the ring instead of the text legend. */
  children?: React.ReactNode;
}) {
  const shares = rows.map((r) =>
    Math.max(floor, ((absShares ? Math.abs(r.v) : r.v) / total) * 100),
  );
  const k = 100 / shares.reduce((a, x) => a + x, 0);

  /* Each segment starts where the previous one ended, so the ring closes on
     exactly 100% however small the smallest slice is. */
  const segs: { r: DonutSlice; len: number; off: number }[] = [];
  for (let i = 0, at = 0; i < rows.length; i++) {
    const len = ((shares[i] * k) / 100) * C;
    segs.push({ r: rows[i], len, off: C - at });
    at += len;
  }

  const pct = (v: number) => nf(locale, (v / total) * 100, 1);
  const interactive = variant === "panel" && !!onFocus;

  return (
    <div className={variant === "panel" ? "cwrap" : "cwrap2"}>
      <div className="donut">
        <svg viewBox="0 0 100 100" role="img" aria-label={aria}>
          {segs.map(({ r, len, off }) => (
            <circle
              key={r.k}
              className={
                variant === "panel"
                  ? `dseg ${focus && focus !== r.k ? "dim" : ""}`
                  : undefined
              }
              data-p={variant === "panel" ? r.k : undefined}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={r.c}
              strokeWidth="15"
              /* toFixed, not nf(): these are SVG attributes, not display numbers —
                 a locale decimal comma would make them invalid. */
              strokeDasharray={`${len.toFixed(3)} ${(C - len).toFixed(3)}`}
              strokeDashoffset={off.toFixed(3)}
              onClick={interactive ? () => onFocus!(r.k) : undefined}
            >
              <title>{`${r.nm} · ${eur(locale, r.v)} · ${pct(r.v)}%`}</title>
            </circle>
          ))}
        </svg>
        <div className="donut-c">
          <div className="donut-v">{centre}</div>
        </div>
      </div>

      {!showLegend ? (
        children
      ) : (
      <div className="clegend">
        {rows.map((r) =>
          interactive ? (
            <button
              key={r.k}
              className={`cli ${focus && focus !== r.k ? "dim" : ""}`}
              data-p={r.k}
              aria-pressed={focus === r.k}
              onClick={() => onFocus!(r.k)}
            >
              <span className="sw" style={{ background: r.c }} />
              <span className="nm" title={r.desc}>
                {r.nm}
              </span>
              <span className="vv">{eur(locale, r.v)}</span>
              <span className="pp">{pct(r.v)}%</span>
            </button>
          ) : (
            <div key={r.k} className="cli">
              <span className="sw" style={{ background: r.c }} />
              <span className="nm">{r.nm}</span>
              <span className="vv">{eur(locale, r.v)}</span>
              <span className="pp">{pct(r.v)}%</span>
            </div>
          ),
        )}
        {totalRow ? (
          <div className="cli-total">
            <span className="sw" />
            <span className="nm">{totalRow.label}</span>
            <span className="vv">{totalRow.value}</span>
            <span className="pp">100%</span>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}

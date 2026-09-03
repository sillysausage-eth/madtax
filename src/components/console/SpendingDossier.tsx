"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, fy, nf, nf0 } from "@/lib/format";
import { fmtMetric, type Metric } from "@/lib/metric";
import {
  aggCode,
  divLabel,
  spendAggOf,
  spendMetricVal,
  spendNat,
  spendSliceLabel,
  spendVal,
} from "@/lib/spending";
import {
  divisions,
  econEN,
  econES,
  econKeys,
  regionSpending,
} from "@/data/spending";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { Advisory, BarBlock, DossierBlank, KvGrid } from "./Dossier";

/**
 * The per-region spending dossier and its off-map counterpart, ported from the
 * prototype's `paintDossier()` and `paintOffmapDossier()` on the spending branch.
 *
 * The map shows one tier of four. A region with no regional government publishes
 * nothing here at all — that is stated as a named gap, never rendered as zero.
 */

/** The coin selections, in the order the rail stacks them. */
export const OFF_MAP_IDS_EXP = ["ss", "central", "local", "adj"];

export default function SpendingDossier({
  selected,
  regions,
  locale,
  t,
  year,
  focus,
  slice,
  metric,
}: {
  selected: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
  /** The focused COFOG division, which cuts the off-map remainder. */
  focus: string | null;
  slice: number;
  metric: Metric;
}) {
  if (!selected) return <DossierBlank hint={t.hint} />;
  if (OFF_MAP_IDS_EXP.includes(selected))
    return (
      <OffMapDossier id={selected} locale={locale} t={t} year={year} focus={focus} />
    );

  const geo = regions.find((x) => x.id === selected);
  const r = geo && regionSpending[geo.id];
  if (!geo || !r) return <DossierBlank hint={t.hint} />;

  const mv = spendMetricVal(r, year, slice, metric);
  const cur = spendVal(r, year, slice);
  const nat = spendNat(year)[slice];

  const ranked = regions
    .map((g) => ({ g, v: spendVal(regionSpending[g.id], year, slice) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (b.v as number) - (a.v as number));
  const rank = ranked.findIndex((x) => x.g.id === geo.id) + 1;

  const sp = r.spend[year];
  const econ = r.econ[year];

  return (
    <>
      <h2 className="name">{locale === "es" ? geo.es : geo.en}</h2>
      <div className="sub">
        {geo.nuts} · {fy(locale, year)} · {spendSliceLabel(locale, t, slice)}
      </div>
      {/* The national share sits beside the figure it is a share of, rather than
          as the first row of a table below it. */}
      <div className={`big ${mv != null && mv < 0 ? "neg" : ""}`}>
        <span className="bigv">{fmtMetric(locale, metric, mv)}</span>
        {cur != null && nat ? (
          <span className="bigpct">
            {nf(locale, (cur / nat) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{t.m[metric].toUpperCase()}</div>
      <KvGrid
        rows={[
          [t.rank, `${rank || "—"} / ${ranked.length}`],
          [t.pop, r.pop ? nf0(locale, r.pop) : "—"],
          [t.gdpL, r.gdp ? eur(locale, r.gdp) : "—"],
        ]}
      />

      {sp ? (
        <>
          <BarBlock caption={`${t.compo} ${fy(locale, year)}`} gap={7}>
            <TierBars
              rows={divisions
                .map((d, i) => ({
                  key: d,
                  label: divLabel(locale, d),
                  value: sp[i + 1],
                }))
                .sort((a, b) => b.value - a.value)}
              locale={locale}
            />
          </BarBlock>
          {econ ? (
            <BarBlock caption={t.compoEcon} gap={7}>
              <TierBars
                rows={econKeys
                  .map((k, i) => ({
                    key: k,
                    label: (locale === "es" ? econES : econEN)[k],
                    value: econ[i],
                  }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 5)}
                locale={locale}
                /* The economic block is scaled against the whole set, not the
                   five shown — the prototype's `mx2`. */
                max={Math.max(...econ.map(Math.abs), 1)}
              />
            </BarBlock>
          ) : null}
          <Advisory tag={t.advScope} text={t.advScopet} />
        </>
      ) : (
        <Advisory tag={t.advNoReg} text={t.advNoRegt} />
      )}
    </>
  );
}

/**
 * The prototype's spending bars: widths relative to the largest row and a rotating
 * five-colour track, with no percentage line. This is a shape, not a partition —
 * the honest figure is printed on every row.
 */
function TierBars({
  rows,
  locale,
  max,
}: {
  rows: { key: string; label: string; value: number }[];
  locale: Locale;
  max?: number;
}) {
  const mx = max ?? Math.max(...rows.map((c) => Math.abs(c.value)), 1);
  return (
    <>
      {rows.map((c, i) => (
        <div className="bar" key={c.key}>
          <div className="r">
            <span>{c.label}</span>
            <b>{eur(locale, c.value)}</b>
          </div>
          <div className="track">
            <div
              className={`fill t${(i % 5) + 1}`}
              style={{ width: `${Math.max(0, (Math.abs(c.value) / mx) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * The card behind a coin: what that money is, how big it is against the national
 * total, and why the map cannot show it.
 */
function OffMapDossier({
  id,
  locale,
  t,
  year,
  focus,
}: {
  id: string;
  locale: Locale;
  t: Dict;
  year: YearKey;
  focus: string | null;
}) {
  const a = spendAggOf(year, aggCode(focus));
  if (!a) return null;

  /* The heading matches the coin the reader pressed; the long-form sentence that
     is the prototype's card title is the advisory at the foot. */
  const spec: Record<string, { v: number; t: string; d: string }> = {
    ss: { v: a.socsec, t: t.coinOsSoc, d: t.osSocD },
    central: { v: a.central, t: t.coinOsCentral, d: t.osCentralD },
    local: { v: a.local, t: t.coinOsLocal, d: t.osLocalD },
    adj: { v: a.adj, t: t.coinOsAdj, d: t.osAdjD },
  };
  const s = spec[id];
  if (!s) return null;

  return (
    <>
      <h2 className="name">{s.t}</h2>
      <div className="sub">
        {fy(locale, year)} · {t.omNoTerr}
      </div>
      <div className="big" style={{ color: "var(--am)" }}>
        <span className="bigv">{eur(locale, s.v)}</span>
        {a.nat ? (
          <span className="bigpct">
            {nf(locale, (s.v / a.nat) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{t.omOfTotal}</div>
      <Advisory tag={t.omWhy} text={s.d} mag style={{ marginTop: 12 }} />
    </>
  );
}

/**
 * The code shown in the panel pane header: the NUTS id for a region, and the
 * COFOG code the reading is cut by otherwise — which since M6 is the filter's
 * own code, because the filter is what the panel is showing.
 */
export function spendingDossierCode(
  selected: string | null,
  focus: string | null,
  regions: RegionGeometry[],
): string {
  if (!selected) return focus ? aggCode(focus) : "ES—";
  if (OFF_MAP_IDS_EXP.includes(selected)) return aggCode(focus);
  const geo = regions.find((x) => x.id === selected);
  return geo ? geo.nuts : "ES—";
}

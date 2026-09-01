"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, fy, nf, nf0 } from "@/lib/format";
import {
  PART_COLOR,
  REV_SLICES,
  fmtMetric,
  metricVal,
  natVal,
  revVal,
  sliceLabel,
  type Metric,
} from "@/lib/revenue";
import { PARTS, regionRevenue } from "@/data/revenue";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { Advisory, BarBlock, DossierBlank, KvGrid, PartBars, type BarRow } from "./Dossier";

/**
 * The per-region dossier, ported from the prototype's `paintDossier()`.
 *
 * A component with no territorial figure for a region is left out of the bars —
 * absent, not zero. The share, rank and per-capita readings are the prototype's
 * own arithmetic over published figures; nothing is filled in.
 *
 * Its off-map counterpart is no longer here: since M5 there is one off-map coin,
 * the Spanish state, and what sits behind it is stated by `RevenuePanel` where
 * the disclosure can be written per component.
 */

/** The single off-map selection: the Spanish state coin beside the map. */
export const SHIELD_ID = "gov";
export const OFF_MAP_IDS = [SHIELD_ID];

export default function RevenueDossier({
  selected,
  regions,
  locale,
  t,
  year,
  slice,
  metric,
}: {
  selected: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
  slice: number;
  metric: Metric;
}) {
  if (!selected || OFF_MAP_IDS.includes(selected))
    return <DossierBlank hint={t.hint} />;

  const geo = regions.find((x) => x.id === selected);
  const r = geo && regionRevenue[geo.id];
  if (!geo || !r) return <DossierBlank hint={t.hint} />;

  const k = REV_SLICES[slice].k;
  const mv = metricVal(r, year, slice, metric);
  const cur = revVal(r, year, k);
  const nat = natVal(year, k);

  const ranked = regions
    .map((g) => ({ g, v: revVal(regionRevenue[g.id], year, k) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (b.v as number) - (a.v as number));
  const rank = ranked.findIndex((x) => x.g.id === geo.id) + 1;

  const pr = r.parts[year] || {};
  const rows: BarRow[] = PARTS.map((key) => ({ key, v: pr[key] }))
    .filter((x): x is { key: string; v: number } => x.v != null && Math.abs(x.v) > 0)
    .sort((a, b) => b.v - a.v)
    .map(({ key, v }) => ({
      key,
      label: t.pt[key as keyof Dict["pt"]][0],
      value: v,
      colour: PART_COLOR[key] || "var(--mute)",
    }));
  const collected = rows.reduce((a, x) => a + x.value, 0);

  return (
    <>
      <h2 className="name">{locale === "es" ? geo.es : geo.en}</h2>
      <div className="sub">
        {geo.nuts} · {fy(locale, year)} · {sliceLabel(t, slice)}
      </div>
      {/* The national share sits beside the figure it is a share of, rather
          than as the first row of a table below it. */}
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
      <BarBlock caption={`${t.regWhat} ${fy(locale, year)}`}>
        <PartBars rows={rows} total={collected} locale={locale} />
      </BarBlock>
      {geo.foral ? <Advisory tag={t.advF} text={t.advFt} mag /> : null}
    </>
  );
}

/** The code shown in the panel header: the NUTS id, or the off-map coin. */
export function dossierCode(
  selected: string | null,
  regions: RegionGeometry[],
): string {
  if (!selected) return "ES—";
  if (OFF_MAP_IDS.includes(selected)) return "OFF-MAP";
  const geo = regions.find((x) => x.id === selected);
  return geo ? geo.nuts : "ES—";
}

"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, fy, nf, nf0 } from "@/lib/format";
import {
  PART_COLOR,
  REV_SLICES,
  fmtMetric,
  mapAggOf,
  metricVal,
  natVal,
  revVal,
  sliceLabel,
  type Metric,
} from "@/lib/revenue";
import { PARTS, natParts, regionRevenue } from "@/data/revenue";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { Advisory, BarBlock, DossierBlank, KvGrid, PartBars, type BarRow } from "./Dossier";

/**
 * The per-region dossier and its off-map counterpart, ported from the
 * prototype's `paintDossier()` and `paintOffmapDossier()`.
 *
 * A component with no territorial figure for a region is left out of the bars —
 * absent, not zero. The share, rank and per-capita readings are the prototype's
 * own arithmetic over published figures; nothing is filled in.
 */

/** The off-map selections, in the order their coins are stacked. */
export const OFF_MAP_IDS = ["social", "eu", "rest"];

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
  if (!selected) return <DossierBlank hint={t.hint} />;
  if (OFF_MAP_IDS.includes(selected))
    return (
      <OffMapDossier id={selected} locale={locale} t={t} year={year} slice={slice} />
    );

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

/**
 * The card behind an off-map figure: what it is, how big it is against the
 * national total, and why the map cannot show it. The "rest" card breaks itself
 * down into the components that make it up, so the residual is never a
 * mystery bucket.
 */
function OffMapDossier({
  id,
  locale,
  t,
  year,
  slice,
}: {
  id: string;
  locale: Locale;
  t: Dict;
  year: YearKey;
  slice: number;
}) {
  const n = natParts[year];
  const k = REV_SLICES[slice].k;
  const m = mapAggOf(year, k);
  const socOff = k === "total" ? (n.social as number) : k === "social" ? (n.social as number) : 0;
  const euOff = k === "total" ? (n.eu as number) : k === "eu" ? (n.eu as number) : 0;
  const rest = m.offmap - socOff - euOff;

  /* The heading matches the coin the reader pressed; the long-form sentence
     that used to be the card's title is the advisory at the foot. */
  const spec: Record<string, { v: number; t: string; d: string }> = {
    social: { v: socOff, t: t.coinSoc, d: t.omSocD },
    eu: { v: euOff, t: t.coinEu, d: t.omEuD },
    rest: { v: rest, t: t.coinRest, d: t.omRestD },
  };
  const s = spec[id];
  if (!s) return null;

  const restRows: BarRow[] =
    id === "rest"
      ? PARTS.filter((p) => p !== "social" && p !== "eu")
          .map((p) => ({ key: p, v: mapAggOf(year, p).offmap }))
          .filter((x) => Math.abs(x.v) > 20)
          .sort((a, b) => b.v - a.v)
          .map(({ key, v }) => ({
            key,
            label: t.pt[key as keyof Dict["pt"]][0],
            value: v,
            colour: PART_COLOR[key] || "var(--mute)",
          }))
      : [];

  return (
    <>
      <h2 className="name">{s.t}</h2>
      <div className="sub">
        {fy(locale, year)} · {t.omNoTerr}
      </div>
      <div className="big" style={{ color: "var(--am)" }}>
        <span className="bigv">{eur(locale, s.v)}</span>
        {n.total ? (
          <span className="bigpct">
            {nf(locale, (s.v / n.total) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{t.omOfTotal}</div>
      {restRows.length ? (
        <BarBlock caption={t.restWhat}>
          <PartBars rows={restRows} total={s.v} locale={locale} />
        </BarBlock>
      ) : null}
      <Advisory tag={t.omWhy} text={s.d} mag style={{ marginTop: 12 }} />
    </>
  );
}

/** The code shown in the dossier pane header: the NUTS id, or `OFF-MAP`. */
export function dossierCode(
  selected: string | null,
  regions: RegionGeometry[],
): string {
  if (!selected) return "ES—";
  if (OFF_MAP_IDS.includes(selected)) return "OFF-MAP";
  const geo = regions.find((x) => x.id === selected);
  return geo ? geo.nuts : "ES—";
}

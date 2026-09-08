"use client";

import type { Dict, Locale } from "@/i18n";
import { eur } from "@/lib/format";
import { popRow } from "@/lib/macro";
import {
  COFOG_COLOR,
  aggCode,
  divLabel,
  isCity,
  spendAggOf,
  spendNoSplit,
  spendSlice,
  spendVal,
  spendYear,
  subFunctionLabel,
  subFunctionNote,
  subFunctions,
} from "@/lib/spending";
import { divisions, regionSpending } from "@/data/spending";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { FootTip, KvGrid } from "./Dossier";
import { SHIELD_GOLD } from "./coinGlyphs";
import SpendingDossier, { OFF_MAP_IDS_EXP } from "./SpendingDossier";
import { KindTable } from "./WhoPaysTable";

/**
 * The right-hand panel: everything the console can say about the function that
 * is filtered. The revenue panel's shape, for the same reasons.
 *
 * **When both a function and a region (or the State coin) are selected, the
 * region takes the headline and the function takes the body.** The figure at
 * the top is that region's spending on that function and its share of it; the
 * COFOG sub-table under it stays the function's national breakdown, because it
 * is not published at regional resolution.
 *
 * Filtered to one function the map draws the regional tier only: councils'
 * spending has no published functional split by territory, so for a function
 * it sits in the coin. What the coin holds for the function — the State, the
 * councils, Social Security, less the elimination — is stated with its figures
 * in the closing tip, never as a set of bars that would read as a second map.
 * The four tiers are never summed anywhere on this screen.
 *
 * Absent is absent. A function the regional tier does not spend on at all
 * (defence, every year) leaves the map with no figure to draw, and every
 * community reads as no data rather than as nineteen measured zeroes.
 */

export default function SpendingPanel({
  selected,
  focus,
  regions,
  locale,
  t,
  year,
}: {
  /** A region id, the State coin, or nothing. */
  selected: string | null;
  /** The COFOG division being filtered on, or nothing. */
  focus: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
}) {
  /* Nothing filtered: the panel is the territory dossier — the blank hint, the
     territory's own card, or the State coin's card for the whole of spending. */
  if (!focus)
    return (
      <SpendingDossier
        selected={selected}
        regions={regions}
        locale={locale}
        t={t}
        year={year}
        metric="total"
      />
    );

  return (
    <FunctionCard
      focus={focus}
      coin={selected != null && OFF_MAP_IDS_EXP.includes(selected)}
      geo={
        selected && !OFF_MAP_IDS_EXP.includes(selected)
          ? (regions.find((x) => x.id === selected) ?? null)
          : null
      }
      regions={regions}
      locale={locale}
      t={t}
      year={year}
    />
  );
}

function FunctionCard({
  focus,
  coin,
  geo,
  regions,
  locale,
  t,
  year,
}: {
  focus: string;
  coin: boolean;
  geo: RegionGeometry | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
}) {
  const sy = spendYear(year);
  const slice = spendSlice(focus);
  const code = aggCode(focus);
  const nm = divLabel(locale, divisions[slice - 1]);
  const colour = COFOG_COLOR[slice - 1];

  const agg = spendAggOf(sy, code);
  if (!agg) return null;
  const nat = agg.nat;

  /* The one case the map cannot draw at all. Not a gap in the port: the
     regional tier spends nothing on this function, so there is no territorial
     figure to colour and no region reads as zero. */
  const noSplit = spendNoSplit(sy, code);

  /* A region's own figure for this function — absent where the function is not
     spent through this tier at all, and for the two cities, which have no
     regional government. */
  const rv = geo && !noSplit ? spendVal(regionSpending[geo.id], sy, slice) : null;
  const ranked = noSplit
    ? []
    : regions
        .map((g) => ({ g, v: spendVal(regionSpending[g.id], sy, slice) }))
        .filter((x) => x.v != null)
        .sort((a, b) => (b.v as number) - (a.v as number));
  const rank = geo ? ranked.findIndex((x) => x.g.id === geo.id) + 1 : 0;

  /* Headline: the region if one is selected, else the coin if it is, else the
     function's own national figure. The coin is the function outside the
     regional tier. */
  const head = geo ? { v: rv } : coin ? { v: nat - agg.mapped } : { v: nat };
  const where = geo
    ? locale === "es"
      ? geo.es
      : geo.en
    : coin
      ? t.shieldName
      : t.omNat;

  const subs = subFunctions(sy, code);

  /* Why the country draws less than the function, with the figures: what the
     regional governments spend of it (the map), and what the coin holds, tier
     by tier, less the elimination. Every figure is the bundle's. For defence the
     regional tier has nothing at all, and the stronger sentence says so. */
  const why = noSplit
    ? t.expNoSplit
    : t.expFnTiers
        .replace("{N}", eur(locale, nat))
        .replace("{A}", eur(locale, agg.mapped))
        .replace("{S}", eur(locale, nat - agg.mapped))
        .replace("{C}", eur(locale, agg.central))
        .replace("{L}", eur(locale, agg.local))
        .replace("{SS}", eur(locale, agg.socsec))
        .replace("{E}", eur(locale, -agg.adj));

  return (
    <>
      <div className="pnl-h">
        <span className="pnl-sw" style={{ background: colour }} />
        <div>
          <h2 className="name">{nm}</h2>
          <div
            className={`big ${head.v != null && head.v < 0 ? "neg" : ""}`}
            style={coin ? { color: SHIELD_GOLD } : undefined}
          >
            <span className="bigv">{eur(locale, head.v)}</span>
          </div>
          <div className="sub where">{where}</div>
        </div>
      </div>
      {geo && rv == null && !noSplit ? (
        <FootTip
          tag={t.noFigWhy}
          text={isCity(geo.id) ? t.advNoRegt : t.expRegNoFig}
          inline
        />
      ) : null}

      {geo ? (
        <KvGrid
          provBadge={t.provB}
          rows={[
            [t.rank, rank ? `${rank} / ${ranked.length}` : "—"],
            [t.omNat, eur(locale, nat)],
            popRow(t, locale, regionSpending[geo.id]?.macro, sy),
          ]}
        />
      ) : null}

      {/* The function's official partition — its COFOG groups, each with its
          share of the consolidated national figure — on the same table the
          revenue panel draws for a component's ESA children. */}
      {subs.length > 1 && nat != null ? (
        <div className="who">
          <KindTable
            colHead={t.bdColExp}
            amountHead={t.wAmount}
            shareHead={t.fOfTotal}
            rows={subs.map(([c, v]) => ({
              key: c,
              label: subFunctionLabel(locale, c) || c,
              sub: subFunctionNote(locale, c),
              v,
            }))}
            total={nat}
            totalLabel={t.wTotalRow}
            note={t.expSubsSrc}
            locale={locale}
          />
        </div>
      ) : null}

      <FootTip tag={t.omWhy} text={why} />
    </>
  );
}

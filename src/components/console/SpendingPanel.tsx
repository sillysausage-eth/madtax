"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, fy, nf, nf0 } from "@/lib/format";
import {
  COFOG_COLOR,
  aggCode,
  divLabel,
  spendAggOf,
  spendNoSplit,
  spendSlice,
  spendVal,
  spendYear,
  subFunctionLabel,
  subFunctionNote,
  subFunctions,
} from "@/lib/spending";
import { divisions, regionSpending, spendNational } from "@/data/spending";
import type { RegionGeometry, SpendAggEntry, YearKey } from "@/lib/types";
import { BarBlock, KvGrid, PartBars } from "./Dossier";
import SpendingDossier, { OFF_MAP_IDS_EXP } from "./SpendingDossier";

/**
 * The right-hand panel: everything the console can say about the function that
 * is filtered.
 *
 * It replaces the explainer that used to sit under the counter, below the fold —
 * the sub-function table now stands beside the map it describes rather than
 * under it, and the same press that opens it is the press that re-cuts the map.
 *
 * **When both a function and a region (or a rail coin) are selected, the region
 * takes the headline and the function takes the body.** The figure at the top is
 * that region's spending on that function and its share of it; everything under
 * the rule — the tier split, the elimination, the COFOG sub-table — stays the
 * function's national breakdown, because none of it is published at regional
 * resolution. That is the revenue panel's rule, unchanged, for the same reason.
 *
 * Two house rules govern the body and are not negotiable here:
 *
 * 1. **The four tiers are never summed.** They overlap — one tier's transfer to
 *    another is booked in both — and the figure that reconciles them is the
 *    inter-tier elimination, which the bundle publishes as its own field. It is
 *    stated as its own named figure, never folded into a total.
 * 2. **Absent is absent.** A function the autonomous subsector does not spend at
 *    all (defence, every year) leaves the map with no figure to draw, and every
 *    community reads as no data rather than as nineteen measured zeroes.
 */

/**
 * The tiers the map cannot draw, in the coins' own amber: the panel and the rail
 * beside the map describe the same four things, so they are the same colour
 * family. Three steps rather than one, because they are three different tiers —
 * 8.7:1, 5.8:1 and 3.6:1 on the panel, all clear of the 3:1 a graphical object
 * needs. The tier the map *does* draw takes the function's own palette colour,
 * so the bar and the country below it agree.
 */
const TIER_INK = { central: "#F0A82E", local: "#C08A3C", socsec: "#8E6B3E" };

export default function SpendingPanel({
  selected,
  focus,
  regions,
  locale,
  t,
  year,
}: {
  /** A region id, a rail coin, or nothing. */
  selected: string | null;
  /** The COFOG division being filtered on, or nothing. */
  focus: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
}) {
  /* Nothing filtered: the panel is M3's dossier, unchanged — the blank hint, the
     region's own card, or the rail coin's card for the whole of spending. */
  if (!focus)
    return (
      <SpendingDossier
        selected={selected}
        regions={regions}
        locale={locale}
        t={t}
        year={year}
        focus={null}
        slice={0}
        metric="total"
      />
    );

  return (
    <FunctionCard
      focus={focus}
      coin={selected && OFF_MAP_IDS_EXP.includes(selected) ? selected : null}
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
  coin: string | null;
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
  const grand = spendNational[sy][0];

  /* The one case the map cannot draw at all. Not a gap in the port: the
     autonomous subsector spends nothing on this function, so there is no
     territorial figure to colour and no region reads as zero. */
  const noSplit = spendNoSplit(sy, code);

  /* A region's own figure for this function — absent where the function is not
     spent through this tier at all. */
  const rv = geo && !noSplit ? spendVal(regionSpending[geo.id], sy, slice) : null;
  const ranked = noSplit
    ? []
    : regions
        .map((g) => ({ g, v: spendVal(regionSpending[g.id], sy, slice) }))
        .filter((x) => x.v != null)
        .sort((a, b) => (b.v as number) - (a.v as number));
  const rank = geo ? ranked.findIndex((x) => x.g.id === geo.id) + 1 : 0;

  /* Headline: the region if one is selected, else the rail coin if one is, else
     the function's own national figure. */
  const head = geo
    ? { v: rv, of: nat, sub: t.pnlFuncOf }
    : coin
      ? { v: coinValue(agg, coin), of: nat, sub: t.pnlFuncOf }
      : { v: nat, of: grand, sub: t.pnlNatOf };
  const where = geo
    ? locale === "es"
      ? geo.es
      : geo.en
    : coin
      ? coinTitle(t, coin)
      : t.omNat;

  const subs = subFunctions(sy, code);
  const mx = subs.length ? Math.max(...subs.map((x) => Math.abs(x[1]))) : 0;

  return (
    <>
      <div className="pnl-h">
        <span className="pnl-sw" style={{ background: colour }} />
        <div>
          <h2 className="name">{nm}</h2>
          <div className="sub">
            {fy(locale, sy)} · {where}
          </div>
        </div>
      </div>

      <div
        className={`big ${head.v != null && head.v < 0 ? "neg" : ""}`}
        style={coin ? { color: "var(--am)" } : undefined}
      >
        <span className="bigv">{eur(locale, head.v)}</span>
        {head.v != null && head.of ? (
          <span className="bigpct">
            {nf(locale, (head.v / head.of) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{head.sub.toUpperCase()}</div>

      {geo && rv == null && !noSplit ? (
        <p className="subs-src" style={{ marginTop: 12 }}>{t.expRegNoFig}</p>
      ) : null}

      {/* Said where the reader is looking when the country comes up empty, not
          in a footnote under the map. */}
      {noSplit ? (
        <p className="subs-src" style={{ marginTop: 12 }}>{t.expNoSplit}</p>
      ) : null}

      {geo ? (
        <KvGrid
          rows={[
            [t.rank, rank ? `${rank} / ${ranked.length}` : "—"],
            [t.omNat, eur(locale, nat)],
            [
              t.pop,
              regionSpending[geo.id]?.pop
                ? nf0(locale, regionSpending[geo.id].pop)
                : "—",
            ],
          ]}
        />
      ) : null}

      {/* The four tiers this function is spent through. Under a regional or coin
          headline the caption says whose split it is; on its own it decomposes
          the national figure directly above it.

          The percentages are each tier's share of the consolidated national
          figure, and they do NOT come to 100 wherever the tiers overlap — that
          overlap is the elimination, stated on its own below. Nothing here adds
          the four together. */}
      <BarBlock caption={geo || coin ? t.expTierNat : t.expTierH}>
        <PartBars
          rows={[
            { key: "aut", label: t.tierAut, value: agg.mapped, colour },
            {
              key: "central",
              label: t.coinOsCentral,
              value: agg.central,
              colour: TIER_INK.central,
            },
            {
              key: "local",
              label: t.coinOsLocal,
              value: agg.local,
              colour: TIER_INK.local,
            },
            {
              key: "socsec",
              label: t.coinOsSoc,
              value: agg.socsec,
              colour: TIER_INK.socsec,
            },
          ]}
          total={nat}
          locale={locale}
        />
      </BarBlock>

      {/* The elimination is a figure the bundle publishes, not a residual this
          screen works out, and it is given a name and a line of its own so it
          can never be read as a fifth tier or quietly absorbed into a total. */}
      {agg.adj !== 0 ? (
        <div className="elim">
          <span className="subs-h">{t.expElimH}</span>
          <div className="elim-r">
            <span className="elim-n">{t.osAdj}</span>
            <span className="elim-v">{eur(locale, agg.adj)}</span>
            <span className="elim-p">
              {nat ? nf(locale, (agg.adj / nat) * 100, 1) : "—"}%
            </span>
          </div>
          <p className="subs-src">
            {t.expElimTxt.replace("{E}", eur(locale, agg.adj)).replace(
              "{N}",
              eur(locale, nat),
            )}
          </p>
        </div>
      ) : null}

      <p className="subs-src" style={{ marginTop: 10 }}>{t.expTierSrc}</p>

      {subs.length > 1 ? (
        <div className="subs flat">
          <span className="subs-h">{t.subsH}</span>
          {subs.map(([c, v]) => {
            const note = subFunctionNote(locale, c);
            return (
              <div className="subrow" key={c}>
                <span className="sn">
                  {subFunctionLabel(locale, c) || c}
                  {note ? <i>{note}</i> : null}
                </span>
                <span className="sv">{eur(locale, v)}</span>
                <span className="sp">
                  {nat ? nf(locale, (v / nat) * 100, 1) : "—"}%
                </span>
                <span className="sbar">
                  <i
                    style={{
                      width: `${Math.max(1, (Math.abs(v) / mx) * 100)}%`,
                      background: colour,
                    }}
                  />
                </span>
              </div>
            );
          })}
          <p className="subs-src">{t.expSubsSrc}</p>
        </div>
      ) : null}
    </>
  );
}

/** The rail coin's figure for the filtered function. */
function coinValue(a: SpendAggEntry, id: string): number | null {
  if (id === "ss") return a.socsec;
  if (id === "central") return a.central;
  if (id === "local") return a.local;
  if (id === "adj") return a.adj;
  return null;
}

/** The rail coin's short title, as printed on the coin itself. */
function coinTitle(t: Dict, id: string): string {
  if (id === "ss") return t.coinOsSoc;
  if (id === "central") return t.coinOsCentral;
  if (id === "local") return t.coinOsLocal;
  return t.coinOsAdj;
}

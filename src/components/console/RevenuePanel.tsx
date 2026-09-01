"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, fy, nf, nf0 } from "@/lib/format";
import {
  PART_COLOR,
  mapAggOf,
  natVal,
  revVal,
} from "@/lib/revenue";
import { PARTS, natParts, natSub, regionRevenue, subLab } from "@/data/revenue";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { BarBlock, KvGrid, PartBars, type BarRow } from "./Dossier";
import { SHIELD_GOLD } from "./coinGlyphs";
import RevenueDossier, { SHIELD_ID } from "./RevenueDossier";
import WhoBlock, { type Tab } from "./WhoBlock";
import type { WhoSort } from "./WhoPaysTable";

/**
 * The right-hand panel: everything the console can say about what is selected.
 *
 * It replaces two surfaces at once — M2's region dossier and the explainer that
 * used to sit under the counter. One reading position, one scroll, and the ESA
 * sub-breakdown and the who-pays tables now sit beside the map they describe
 * instead of below the fold.
 *
 * **When both a component and a region are selected, the region takes the
 * headline and the component takes the body.** The figure at the top is that
 * region's amount for that component and its share of it; everything under the
 * rule — the mapped/unattributed split, the ESA sub-table, the who-pays tables —
 * stays the component's national breakdown, because none of it is published at
 * regional resolution. Inventing a regional cut of an AEAT decile table is
 * exactly the kind of plug this project does not do.
 *
 * Nothing here computes a figure that is not a share, a rank or a difference the
 * prototype itself takes. Absent is absent: a region with no published figure
 * for the selected component reads "—", never zero.
 */

export default function RevenuePanel({
  selected,
  part,
  regions,
  locale,
  t,
  year,
  tab,
  onTab,
  sort,
  onSort,
}: {
  /** A region id, the shield coin, or nothing. */
  selected: string | null;
  /** The component being filtered on, or nothing. */
  part: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
  tab: Tab;
  onTab: (t: Tab) => void;
  sort: WhoSort;
  onSort: (col: string) => void;
}) {
  const shield = selected === SHIELD_ID;

  /* Nothing filtered: the panel is M2's dossier, unchanged — blank hint, or the
     region's own card. The shield is the one addition, because the coin it
     belongs to is on the map in every state. */
  if (!part)
    return shield ? (
      <ShieldCard locale={locale} t={t} year={year} />
    ) : (
      <RevenueDossier
        selected={selected}
        regions={regions}
        locale={locale}
        t={t}
        year={year}
        slice={0}
        metric="total"
      />
    );

  return (
    <BucketCard
      part={part}
      geo={
        selected && !shield ? (regions.find((x) => x.id === selected) ?? null) : null
      }
      shield={shield}
      regions={regions}
      locale={locale}
      t={t}
      year={year}
      tab={tab}
      onTab={onTab}
      sort={sort}
      onSort={onSort}
    />
  );
}

/* ------------------------------------------------------------- the shield -- */

/**
 * Every part's unattributed remainder, largest first — the exact contents of the
 * coin, by component, rather than a sentence about them.
 */
function offmapRows(t: Dict, year: YearKey): BarRow[] {
  return PARTS.map((p) => ({ key: p, v: mapAggOf(year, p).offmap }))
    .filter((x) => Math.abs(x.v) > 20)
    .sort((a, b) => b.v - a.v)
    .map(({ key, v }) => ({
      key,
      label: t.pt[key as keyof Dict["pt"]][0],
      value: v,
      colour: PART_COLOR[key] || "var(--mute)",
    }));
}

/**
 * The unfiltered shield: what the whole of this year's revenue leaves off the
 * map, and what that money actually is.
 *
 * The disclosure is not optional. The label on the coin is one institution; the
 * contents are three different collectors, and the panel says so wherever the
 * coin is read.
 */
function ShieldCard({
  locale,
  t,
  year,
}: {
  locale: Locale;
  t: Dict;
  year: YearKey;
}) {
  const n = natParts[year];
  const agg = mapAggOf(year, "total");
  const rows = offmapRows(t, year);
  return (
    <>
      <h2 className="name">{t.shieldName}</h2>
      <div className="sub">
        {fy(locale, year)} · {t.omNoTerr}
      </div>
      <div className="big" style={{ color: SHIELD_GOLD }}>
        <span className="bigv">{eur(locale, agg.offmap)}</span>
        {n.total ? (
          <span className="bigpct">
            {nf(locale, (agg.offmap / n.total) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{t.omOfTotal}</div>
      {rows.length ? (
        <BarBlock caption={t.restWhat}>
          <PartBars rows={rows} total={agg.offmap} locale={locale} />
        </BarBlock>
      ) : null}
      <p className="subs-src" style={{ marginTop: 12 }}>{t.shieldMix}</p>
    </>
  );
}

/* ------------------------------------------------------------- a bucket ---- */

function BucketCard({
  part,
  geo,
  shield,
  regions,
  locale,
  t,
  year,
  tab,
  onTab,
  sort,
  onSort,
}: {
  part: string;
  geo: RegionGeometry | null;
  shield: boolean;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
  tab: Tab;
  onTab: (t: Tab) => void;
  sort: WhoSort;
  onSort: (col: string) => void;
}) {
  const label = t.pt[part as keyof Dict["pt"]];
  const nm = label ? label[0] : part;
  const colour = PART_COLOR[part] || "var(--mute)";
  const nat = natVal(year, part);
  const agg = mapAggOf(year, part);
  const grand = natParts[year].total;

  /* The one case the map cannot draw at all: nothing of this component is
     published by community. It is a fact about publication, not a gap in the
     port, and it is said in words rather than left as an empty country. */
  const noSplit = agg.mapped === 0;

  /* A region's own figure for this component — absent where none is published. */
  const rv = geo ? revVal(regionRevenue[geo.id], year, part) : null;
  const ranked = geo
    ? regions
        .map((g) => ({ g, v: revVal(regionRevenue[g.id], year, part) }))
        .filter((x) => x.v != null)
        .sort((a, b) => (b.v as number) - (a.v as number))
    : [];
  const rank = geo ? ranked.findIndex((x) => x.g.id === geo.id) + 1 : 0;

  /* Headline: the region if one is selected, else the shield if it is, else the
     component's own national figure. */
  const head = geo
    ? { v: rv, of: nat, sub: t.pnlBucketOf, neg: rv != null && rv < 0 }
    : shield
      ? { v: agg.offmap, of: nat, sub: t.pnlBucketOf, neg: false }
      : { v: nat, of: grand, sub: t.pnlNatOf, neg: nat != null && nat < 0 };

  const subs = (natSub[year] || {})[part] || [];
  const mx = subs.length ? Math.max(...subs.map((x) => Math.abs(x[1]))) : 0;

  return (
    <>
      <div className="pnl-h">
        <span className="pnl-sw" style={{ background: colour }} />
        <div>
          <h2 className="name">{nm}</h2>
          <div className="sub">
            {fy(locale, year)} ·{" "}
            {geo
              ? locale === "es"
                ? geo.es
                : geo.en
              : shield
                ? t.shieldName
                : t.omNat}
          </div>
        </div>
      </div>

      <div className={`big ${head.neg ? "neg" : ""}`} style={shield ? { color: SHIELD_GOLD } : undefined}>
        <span className="bigv">{eur(locale, head.v)}</span>
        {head.v != null && head.of ? (
          <span className="bigpct">
            {nf(locale, (head.v / head.of) * 100, 2)}% · {t.shr}
          </span>
        ) : null}
      </div>
      <div className="bigsub">{head.sub.toUpperCase()}</div>

      {geo && rv == null ? (
        <p className="subs-src" style={{ marginTop: 12 }}>{t.regNoFig}</p>
      ) : null}

      {geo ? (
        <KvGrid
          rows={[
            [t.rank, rank ? `${rank} / ${ranked.length}` : "—"],
            [t.omNat, eur(locale, nat)],
            [
              t.pop,
              regionRevenue[geo.id]?.pop ? nf0(locale, regionRevenue[geo.id].pop) : "—",
            ],
          ]}
        />
      ) : null}

      {/* The two tiers this component is split between. With a region selected
          the block sits under a regional headline, so it says whose split it
          is; on its own it decomposes the national figure directly above it and
          needs no caption. Where nothing is territorially attributed there is no
          split to draw — the note below carries it instead. */}
      {noSplit ? null : (
        <BarBlock caption={geo ? t.splitNat : undefined}>
          <PartBars
            rows={[
              { key: "on", label: t.tierAut, value: agg.mapped, colour },
              { key: "off", label: t.shieldName, value: agg.offmap, colour: SHIELD_GOLD },
            ]}
            total={nat ?? undefined}
            locale={locale}
          />
        </BarBlock>
      )}

      {/* One line, always: what sits behind the shield for this component. The
          published institutional reason where a source gives one, the general
          rule otherwise — never both, since they said the same thing twice. */}
      <p className="subs-src" style={{ marginTop: 12 }}>
        {part === "social"
          ? t.omSocD
          : part === "eu"
            ? t.omEuD
            : (noSplit ? t.noSplitShort : t.shieldShort).replace("{N}", nm)}
      </p>

      {subs.length > 1 ? (
        <div className="subs flat">
          <span className="subs-h">{t.subsH}</span>
          {subs.map(([code, v]) => (
            <div className="subrow" key={code}>
              <span className="sn">{subLab[locale][code] || code}</span>
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
          ))}
          <p className="subs-src">{t.subsSrc}</p>
        </div>
      ) : null}

      <WhoBlock
        k={part}
        locale={locale}
        t={t}
        year={year}
        tab={tab}
        onTab={onTab}
        sort={sort}
        onSort={onSort}
      />
    </>
  );
}

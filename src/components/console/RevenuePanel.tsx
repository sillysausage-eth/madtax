"use client";

import type { Dict, Locale } from "@/i18n";
import { eur } from "@/lib/format";
import { popRow } from "@/lib/macro";
import {
  PART_COLOR,
  mapAggOf,
  natVal,
  revVal,
} from "@/lib/revenue";
import { PARTS, natSub, regionRevenue, subLab } from "@/data/revenue";
import type { RegionGeometry, YearKey } from "@/lib/types";
import { BarBlock, FootTip, KvGrid, PartBars, type BarRow } from "./Dossier";
import { SHIELD_GOLD } from "./coinGlyphs";
import RevenueDossier, { RegionAdvisories, SHIELD_ID } from "./RevenueDossier";
import WhoBlock, { type Tab } from "./WhoBlock";
import { KindTable, type WhoSort } from "./WhoPaysTable";

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
  const agg = mapAggOf(year, "total");
  const rows = offmapRows(t, year);
  return (
    <>
      <h2 className="name">{t.shieldName}</h2>
      <div className="big" style={{ color: SHIELD_GOLD }}>
        <span className="bigv">{eur(locale, agg.offmap)}</span>
      </div>
      <div className="sub where">{t.omNoTerr}</div>
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

/**
 * Why this component's money is not on the map, in one sentence — the source's
 * own institutional reason for social contributions and EU funds, the general
 * publication rule for everything else, and the stronger form where nothing at
 * all is published by community.
 */
function offMapNote(t: Dict, part: string, nm: string, noSplit: boolean): string {
  if (part === "social") return t.omSocD;
  if (part === "eu") return t.omEuD;
  /* The fees bucket names what its unattributed part actually is — mostly what
     regional governments and State agencies charge. */
  if (part === "sales") return t.sales.offmap;
  return (noSplit ? t.noSplitShort : t.shieldShort).replace("{N}", nm);
}

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
  const def = label ? label[1] : null;
  const colour = PART_COLOR[part] || "var(--mute)";
  const nat = natVal(year, part);
  const agg = mapAggOf(year, part);

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
    ? { v: rv, neg: rv != null && rv < 0 }
    : shield
      ? { v: agg.offmap, neg: false }
      : { v: nat, neg: nat != null && nat < 0 };

  /* Social contributions are a national figure and nothing else: the coin does
     not carve a part out of them, so the subtitle says the same with or
     without it. */
  const where = geo
    ? locale === "es"
      ? geo.es
      : geo.en
    : shield && part !== "social"
      ? t.shieldName
      : t.omNat;

  const subs = (natSub[year] || {})[part] || [];

  return (
    <>
      <div className="pnl-h">
        <span className="pnl-sw" style={{ background: colour }} />
        <div>
          <h2 className="name">{nm}</h2>
          <div className={`big ${head.neg ? "neg" : ""}`} style={shield ? { color: SHIELD_GOLD } : undefined}>
            <span className="bigv">{eur(locale, head.v)}</span>
          </div>
          <div className="sub where">{where}</div>
        </div>
      </div>
      {geo && rv == null ? <FootTip tag={t.noFigWhy} text={t.regNoFig} inline /> : null}

      {geo ? (
        <>
          <KvGrid
            provBadge={t.provB}
            rows={[
              [t.rank, rank ? `${rank} / ${ranked.length}` : "—"],
              [t.omNat, eur(locale, nat)],
              popRow(t, locale, regionRevenue[geo.id]?.macro, year),
            ]}
          />
          <RegionAdvisories geo={geo} t={t} year={year} />
        </>
      ) : null}

      {/* One line, always: what this component actually taxes. The definition
          the coins already carry as a title, said out loud in the panel — the
          off-map caveat that used to sit here read the same on every component
          and answered a question the reader had not asked yet. It now closes
          the panel as a tooltip, in both its forms. */}
      {def ? <p className="pnl-def">{def}</p> : null}

      {/* The component's official partition — its ESA children, each with its
          share of the national figure — on the same table the who-pays blocks
          draw, so every component's detail reads as one thing. The total row is
          the headline figure: the rows sum to it because the bundle says so. */}
      {/* The component's official partition — its ESA children, each with its
          share of the national figure — on the same table the who-pays blocks
          draw, so every component's detail reads as one thing. The total row is
          the headline figure: the rows sum to it because the bundle says so.

          The fees bucket gets nothing more. Its sources cut it by kind only per
          tier (CONPREL for councils, IGAE for the regions) and never for the
          whole pot, so a by-kind table of the headline cannot be published
          honestly; the bundle still carries those cuts in `salesDetail`. */}
      {subs.length > 1 && nat != null ? (
        <div className="who">
          <KindTable
            colHead={t.bdCol}
            amountHead={t.wAmount}
            shareHead={t.fOfTotal}
            rows={subs.map(([code, v]) => ({
              key: code,
              label: subLab[locale][code] || code,
              v,
            }))}
            total={nat}
            totalLabel={t.wTotalRow}
            locale={locale}
          />
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

      {/* The caveat itself, one hover away at the foot of the panel. The
          stronger wording, for a component with no territorial split at all,
          is the same tip with the same tag — it used to sit inline instead. */}
      <FootTip tag={t.omWhy} text={offMapNote(t, part, nm, noSplit)} />
    </>
  );
}

"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import { fmtMetric, type Metric } from "@/lib/metric";
import { gdpRow, popRow } from "@/lib/macro";
import { RAMP_EXP, rampTop } from "@/lib/ramp";
import {
  aggCode,
  divLabel,
  isCity,
  localAreaLabel,
  localOf,
  spendTerrOf,
  terrMetricVal,
  terrVal,
} from "@/lib/spending";
import {
  divisions,
  econEN,
  econES,
  econKeys,
  localAreas,
  regionSpending,
} from "@/data/spending";
import type { RegionGeometry, YearKey } from "@/lib/types";
import {
  BarBlock,
  DossierBlank,
  FootTip,
  KvGrid,
  PartBars,
  type BarRow,
} from "./Dossier";
import { SHIELD_GOLD } from "./coinGlyphs";
import { KindTable } from "./WhoPaysTable";

/**
 * The per-territory spending dossier and the State coin's card, for the
 * unfiltered console.
 *
 * Since M7 the map is a map of territories, so the dossier's headline is what is
 * spent in the territory by the two tiers that have one, and the bars directly
 * under it are which of the two spent what — a decomposition of the figure
 * above, so it carries no title. The regional government's part is then opened
 * by function and by kind of spending, the councils' part by the programme areas
 * councils classify by, each on the same table the revenue panel draws for a
 * component's detail, named by its column head rather than by a heading.
 *
 * Every caveat is one hover away, as in the revenue panel: what the figure
 * excludes, why a city has one tier, why a year has a named gap, why the map
 * carries less than the councils spent. None of it is dropped; none of it sits
 * as body copy between the figures.
 *
 * Absent is absent. A city with no regional government carries its own budget
 * and nothing else; a year whose CONPREL table is blank carries the regional
 * figure and a named gap, never a filled-in zero.
 */

/** The single off-map selection: the State coin beside the map. */
export const STATE_ID_EXP = "gov";
export const OFF_MAP_IDS_EXP = [STATE_ID_EXP];

/**
 * The inks of the tiers the map cannot draw: the coin is amber, and the things
 * inside it are steps of it.
 */
export const TIER_INK = { central: "#F0A82E", local: "#C08A3C", socsec: "#8E6B3E" };

/** The regional government's ink in the territory card: the map's own hot colour. */
const REG_INK = (() => {
  const [r, g, b] = rampTop(RAMP_EXP);
  return `rgb(${r},${g},${b})`;
})();

export default function SpendingDossier({
  selected,
  regions,
  locale,
  t,
  year,
  metric,
}: {
  selected: string | null;
  regions: RegionGeometry[];
  locale: Locale;
  t: Dict;
  year: YearKey;
  metric: Metric;
}) {
  if (!selected) return <DossierBlank hint={t.hint} />;
  if (OFF_MAP_IDS_EXP.includes(selected))
    return <StateCard locale={locale} t={t} year={year} />;

  const geo = regions.find((x) => x.id === selected);
  const r = geo && regionSpending[geo.id];
  if (!geo || !r) return <DossierBlank hint={t.hint} />;

  const T = spendTerrOf(year);
  const mv = terrMetricVal(r, year, metric);
  const cur = terrVal(r, year);
  const nat = T.nat;

  const ranked = regions
    .map((g) => ({ g, v: terrVal(regionSpending[g.id], year) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (b.v as number) - (a.v as number));
  const rank = ranked.findIndex((x) => x.g.id === geo.id) + 1;

  const sp = r.spend[year];
  const econ = r.econ[year];
  const loc = localOf(r, year);
  const city = isCity(geo.id);

  /* Who spent it here. Only the tiers with a figure are drawn: a city has no
     regional row, a blank CONPREL year has no councils row. */
  const who: BarRow[] = [];
  if (sp) who.push({ key: "reg", label: t.tierReg, value: sp[0], colour: REG_INK });
  if (loc) who.push({ key: "loc", label: t.osLocal, value: loc.net, colour: TIER_INK.local });

  return (
    <>
      <h2 className="name">{locale === "es" ? geo.es : geo.en}</h2>
      <div className="sub">
        {geo.nuts} · {year} · {t.fnAll}
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
        provBadge={t.provB}
        rows={[
          [t.rank, `${rank || "—"} / ${ranked.length}`],
          popRow(t, locale, r.macro, year),
          gdpRow(t, locale, r.macro, year),
        ]}
      />

      {/* A city has one tier; a blank CONPREL year has one tier. The bars show
          it; the tip says why, beside the bars rather than as a block. */}
      {cur != null ? (
        <BarBlock>
          <PartBars rows={who} total={cur} locale={locale} />
        </BarBlock>
      ) : null}
      {city ? <FootTip tag={t.advNoReg} text={t.advNoRegt} inline /> : null}
      {!city && !loc ? <FootTip tag={t.advNoLocal} text={t.advNoLocalt} inline /> : null}

      {/* The regional government's part by COFOG function. The total row is
          the regional row above; the column head names the cut. */}
      {sp ? (
        <div className="who">
          <KindTable
            colHead={t.fnCol}
            amountHead={t.wAmount}
            shareHead={t.fOfTotal}
            rows={divisions
              .map((d, i) => ({ key: d, label: divLabel(locale, d), v: sp[i + 1] }))
              .filter((x) => Math.abs(x.v) > 0)
              .sort((a, b) => b.v - a.v)}
            total={sp[0]}
            totalLabel={t.wTotalRow}
            note={t.srcRegFn}
            locale={locale}
          />
        </div>
      ) : null}

      {/* The councils' part by programme area — their own classification, not
          COFOG, so it is a second table rather than more rows in the first. Its
          total is what they spent; the map carries less, and the tip says by how
          much and why. */}
      {loc ? (
        <>
          <div className="who">
            <KindTable
              colHead={t.areaCol}
              amountHead={t.wAmount}
              shareHead={t.fOfTotal}
              rows={localAreas.codes
                .map((c) => ({ key: c, label: localAreaLabel(locale, c), v: loc.areas[c] ?? 0 }))
                .filter((x) => Math.abs(x.v) > 0)
                .sort((a, b) => b.v - a.v)}
              total={loc.nonfin}
              totalLabel={t.wTotalRow}
              note={t.srcLocArea}
              locale={locale}
            />
          </div>
          {loc.toGov > 0 || loc.fromCA > 0 ? (
            <FootTip
              tag={t.locNetWhy}
              text={t.locNetNote
                .replace("{N}", eur(locale, loc.nonfin))
                .replace("{G}", eur(locale, loc.toGov))
                .replace("{C}", eur(locale, loc.fromCA))
                .replace("{M}", eur(locale, loc.net))}
              inline
            />
          ) : null}
        </>
      ) : null}

      {/* The regional government's part by kind of spending: salaries, goods,
          benefits, investment. */}
      {econ && sp ? (
        <div className="who">
          <KindTable
            colHead={t.econCol}
            amountHead={t.wAmount}
            shareHead={t.fOfTotal}
            rows={econKeys
              .map((k, i) => ({ key: k, label: (locale === "es" ? econES : econEN)[k], v: econ[i] }))
              .filter((x) => Math.abs(x.v) > 0)
              .sort((a, b) => b.v - a.v)}
            total={sp[0]}
            totalLabel={t.wTotalRow}
            note={t.srcRegEcon}
            locale={locale}
          />
        </div>
      ) : null}

      {/* What the territory's figure leaves out, one hover away at the foot of
          the panel: the revenue panel's closing tip, for the same reason. */}
      <FootTip tag={t.advScope} text={t.advScopet} />
    </>
  );
}

/**
 * The State coin, unfiltered: what the whole of this year's spending leaves off
 * the map, and what that money actually is.
 *
 * The disclosure is not optional. The label on the coin is one institution; the
 * contents are the State, Social Security, the part of the local tier the
 * territorial layer does not reach, and the elimination of the transfers
 * between them — the bars decompose the coin to the euro, with the elimination
 * a negative row rather than something folded into the others, and the sentence
 * that says why they sit together is one hover away.
 */
function StateCard({
  locale,
  t,
  year,
}: {
  locale: Locale;
  t: Dict;
  year: YearKey;
}) {
  const T = spendTerrOf(year);
  const rows: BarRow[] = [
    { key: "central", label: t.osCentral, value: T.central, colour: TIER_INK.central },
    { key: "socsec", label: t.osSoc, value: T.socsec, colour: TIER_INK.socsec },
    { key: "locRest", label: t.coinLocRest, value: T.localRest, colour: TIER_INK.local },
    { key: "adj", label: t.osAdj, value: T.adj, colour: "var(--rd)" },
  ].filter((x) => Math.abs(x.value) > 0);
  return (
    <>
      <h2 className="name">{t.shieldName}</h2>
      <div className="big" style={{ color: SHIELD_GOLD }}>
        <span className="bigv">{eur(locale, T.state)}</span>
      </div>
      <div className="sub where">{t.omNoTerr}</div>
      <BarBlock>
        <PartBars rows={rows} total={T.state} locale={locale} />
      </BarBlock>
      <FootTip
        tag={t.coinLocRest.toUpperCase()}
        text={t.locRestD
          .replace("{T}", eur(locale, T.localTier))
          .replace("{M}", eur(locale, T.localNet))}
        inline
      />
      <FootTip tag={t.omWhy} text={t.stateMixExp} />
    </>
  );
}

/**
 * The code shown in the panel pane header: the NUTS id for a region, `OFF-MAP`
 * for the coin, and otherwise the COFOG code the reading is cut by — the
 * filter's own code, because the filter is what the panel is showing.
 */
export function spendingDossierCode(
  selected: string | null,
  focus: string | null,
  regions: RegionGeometry[],
): string {
  if (!selected) return focus ? aggCode(focus) : "ES—";
  if (OFF_MAP_IDS_EXP.includes(selected)) return "OFF-MAP";
  const geo = regions.find((x) => x.id === selected);
  return geo ? geo.nuts : "ES—";
}

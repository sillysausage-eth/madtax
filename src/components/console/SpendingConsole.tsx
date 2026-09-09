"use client";

import { useMemo } from "react";
import { dict, type Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import { fmtMetric, type Metric } from "@/lib/metric";
import { RAMP_EXP, makeIntensity, makeRamp, makeScale, rampTop } from "@/lib/ramp";
import {
  INT_CODE,
  SPEND_GAMMA,
  aggCode,
  isInt,
  spendCompModel,
  spendMetricVal,
  spendNoSplit,
  spendNoTerritory,
  spendSlice,
  spendTerrOf,
  spendYear,
  stateCoinValue,
  terrMetricVal,
} from "@/lib/spending";
import { divisions, regionSpending, spendYears } from "@/data/spending";
import { CANVAS_W, CB, H, labelNudge, regionAbbr, regions } from "@/data/map";
import type { YearKey } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import { COFOG_GLYPH } from "./coinGlyphs";
import Donut from "./Donut";
import MapCoins, { COIN_RAIL_WIDTH, type MapCoin } from "./MapCoins";
import PartCoins, { type PartCoin } from "./PartCoins";
import SpainMap, { RampLegend, type MapFlag } from "./SpainMap";
import { STATE_ID_EXP, spendingDossierCode } from "./SpendingDossier";
import SpendingPanel from "./SpendingPanel";
import YearScrubber from "./YearScrubber";

/**
 * The spending console.
 *
 * It works exactly as the revenue console does, and since M7 it draws the same
 * kind of map. The map is a map of territories: each community carries what is
 * spent in it by the two tiers of government that have a territory — its
 * regional government (IGAE COFOG) and its local entities (CONPREL, net of the
 * transfers that would count twice) — and the one coin beside Spain is the
 * State: what no published source places in any community. Regions plus coin
 * are the consolidated national figure, always, and the coin is opened up in
 * the panel rather than left as a residual.
 *
 * The legend beside the ring is a grid of pressable coins — one per COFOG
 * division, plus debt interest, which is a published sub-function of division 01
 * lifted out and given a coin of its own — and pressing one is the console's
 * filter control. Filtered, the map
 * can draw only the regional tier's part of that function: councils' spending
 * has no published functional split by territory, so for one function it moves
 * into the coin and the panel says so. The identity holds in both states.
 *
 * Presentation only — every piece of state arrives as a prop, so the same tree
 * renders the static shell (with the console's opening state) and the live,
 * URL-driven island.
 */

const METRIC: Metric = "total";
const noop = () => {};

export interface SpendingConsoleState {
  year: YearKey;
  /** A region id, or the State coin, or nothing selected. */
  sel: string | null;
  /** The COFOG division the console is filtered to. */
  focus: string | null;
}

export default function SpendingConsole({
  locale,
  state,
  onYear = noop,
  onSelect = noop,
  onFocus = noop,
  onTotal = noop,
}: {
  locale: Locale;
  state: SpendingConsoleState;
  onYear?: (y: YearKey) => void;
  onSelect?: (id: string) => void;
  onFocus?: (k: string) => void;
  /** Lift the filter: the total coin asks for the whole reading back. */
  onTotal?: () => void;
}) {
  const t = dict(locale);
  const { year, sel, focus } = state;

  /* The year actually read. Spending publishes a year later than revenue, so a
     year that reached this screen from the other mode is never indexed blind. */
  const sy = spendYear(year);

  /* ---- composition -------------------------------------------------------- */
  const M = spendCompModel(locale, t, sy);

  const coinItems: PartCoin[] = M.rows.map((r) => ({
    k: r.k,
    nm: r.nm,
    desc: r.nm,
    value: eur(locale, r.v),
    pct: nf(locale, (r.v / M.total) * 100, 1),
    colour: r.c,
  }));

  /* ---- map ---------------------------------------------------------------- */
  const slice = spendSlice(focus);

  /* Unfiltered, a territory reads what is spent in it by its regional government
     and its councils together. Filtered, it reads the regional tier's part of
     the function, and a function that tier does not spend on at all (defence)
     leaves the map with nothing to draw rather than nineteen measured-looking
     zeroes. Derived inside the memo from the two pieces of state it depends on. */
  const values = useMemo(() => {
    const m = new Map<string, number | null>();
    const y = spendYear(year);
    const i = spendSlice(focus);
    const blank = focus
      ? spendNoTerritory(focus) || spendNoSplit(y, aggCode(focus))
      : false;
    for (const g of regions)
      m.set(
        g.id,
        blank
          ? null
          : focus
            ? spendMetricVal(regionSpending[g.id], y, i, METRIC)
            : terrMetricVal(regionSpending[g.id], y, METRIC),
      );
    return m;
  }, [year, focus]);

  const ramp = useMemo(() => makeRamp(RAMP_EXP), []);
  const list = useMemo(() => [...values.values()], [values]);
  const colour = useMemo(() => makeScale(list, ramp, SPEND_GAMMA), [list, ramp]);
  const intensity = useMemo(() => makeIntensity(list), [list]);

  /* A territory with no figure in the current reading is flagged, not left to
     read as an empty outline. Unfiltered that is only a year whose CONPREL table
     is blank for a city (Melilla 2022); filtered it is Ceuta and Melilla, which
     have no regional government and so nothing in the tier a function filter
     draws. Where a whole function is absent from that tier the panel states it
     once rather than pinning nineteen markers to a blank country. */
  const blankAll = focus
    ? spendNoTerritory(focus) || spendNoSplit(sy, aggCode(focus))
    : false;
  const flags: MapFlag[] = blankAll
    ? []
    : regions
        .filter((g) => values.get(g.id) == null)
        .map((g) => ({
          id: g.id,
          /* The flag sits opposite the label: Melilla's name is nudged to the
             right of its dot, so its marker goes left rather than under it. */
          dx: labelNudge(g).dx > 0 ? -13 : 13,
          dy: -9,
          r: 5,
          ty: 2.2,
          text: "?",
          fill: "#3E525E",
          textFill: "#0B1218",
        }));

  /* The HUD states where the picture comes from, which year it is on and which
     COFOG cut is drawn. `(P)` marks a year in which a territory carries one tier
     but not the other — Navarre's councils in 2013 and 2014 — and is stated in
     full in that territory's dossier. */
  const T = spendTerrOf(sy);
  const partial = !focus && T.partial.length + T.missing.length > 0;
  const hudRows: [string, string][] = [
    ["PROJ", "MERCATOR / ETRS89"],
    ["SRC", "IGAE COFOG · CONPREL · EUROSTAT"],
    [
      t.fYear.toUpperCase(),
      `${sy}${partial ? " (P)" : ""} · COFOG ${
        isInt(focus) ? INT_CODE.slice(2) : slice ? divisions[slice - 1] : "ALL"
      }`,
    ],
  ];

  /* ---- the one off-map coin ---------------------------------------------- */
  /* Whatever the reading is, the territories on the map plus this coin are the
     figure. Unfiltered it is everything spent by the State and Social Security
     plus the part of the local tier the territorial layer does not reach, less
     the inter-tier elimination; filtered, it is the function's spending outside
     the regional tier. */
  /* Read off the focus, not the map slice: interest is a part of the composition
     with no slice of its own, and the pane header still has to name it. */
  const fnName = focus ? (M.rows.find((r) => r.k === focus)?.nm ?? null) : null;
  const coinV = stateCoinValue(sy, focus);
  const coins: MapCoin[] = [
    {
      id: STATE_ID_EXP,
      glyph: "gov",
      title: t.shieldTitle,
      value: eur(locale, coinV),
      aria: `${t.shieldName} · ${fnName ?? t.fnAll}: ${eur(locale, coinV)}`,
    },
  ];

  return (
    <>
      <section className="comp" id="comp" role="tabpanel">
        {/* The year picker sits in this header because the year is what the
            figures under it are for. The caption no longer repeats it: the
            control states the year, once. The revenue header reads the same
            way. */}
        <div className="comp-h">
          <div className="comp-hk">
            <div className="head-k">{t.sExp.tot}</div>
            {/* Only when there is a gap to declare: see `SpendCompModel.sub`. */}
            {M.sub ? <div className="head-s">{M.sub}</div> : null}
          </div>
          <YearScrubber
            years={spendYears}
            year={year}
            label={t.fYear}
            onChange={onYear}
          />
        </div>
        <Donut
          rows={M.rows}
          total={M.total}
          floor={0.4}
          centre={eur(locale, M.total)}
          aria={`${t.sExp.tot} ${sy}: ${eur(locale, M.total)}`}
          locale={locale}
          focus={focus}
          onFocus={onFocus}
          showLegend={false}
        >
          <PartCoins
            items={coinItems}
            selected={focus}
            onSelect={onFocus}
            total={{ label: t.fnAll, desc: t.expSub }}
            onTotal={onTotal}
            glyphs={COFOG_GLYPH}
          />
        </Donut>
      </section>

      <div className="main conmain" id="mainlayout">
        <section className="pane">
          <div className="pane-h">
            <span className="t">{t.mapExp}</span>
            <span className="x">
              {sy}
              {fnName ? ` · ${fnName}` : ""}
            </span>
          </div>
          <SpainMap
            W={CANVAS_W}
            H={H}
            CB={CB}
            regions={regions}
            name={(r) => (locale === "es" ? r.es : r.en)}
            label={regionAbbr}
            nudge={labelNudge}
            value={(r) => values.get(r.id) ?? null}
            fmt={(v) => fmtMetric(locale, METRIC, v)}
            colour={colour}
            intensity={intensity}
            accentRgb={rampTop(RAMP_EXP)}
            selected={sel}
            onSelect={onSelect}
            flags={flags}
            hudRows={hudRows}
            hudAccent="#F0A82E"
            ariaLabel="Spain"
            railWidth={COIN_RAIL_WIDTH}
            rail={<MapCoins items={coins} selected={sel} onSelect={onSelect} />}
          />
          <RampLegend ramp={ramp} lo={t.lo} hi={t.hi} />
        </section>

        <aside className="pane dossier conpanel">
          <div className="pane-h">
            <span className="t">{t.dos}</span>
            <span className="x">{spendingDossierCode(sel, focus, regions)}</span>
          </div>
          <div className="pane-b">
            <SpendingPanel
              selected={sel}
              focus={focus}
              regions={regions}
              locale={locale}
              t={t}
              year={sy}
            />
          </div>
        </aside>
      </div>

      <ConsoleFooter mode="spending" locale={locale} />
    </>
  );
}

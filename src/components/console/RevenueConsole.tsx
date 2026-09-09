"use client";

import { useMemo } from "react";
import { dict, type Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import { RAMP_REV, makeIntensity, makeRamp, makeScale, rampTop } from "@/lib/ramp";
import {
  REV_SLICES,
  compModel,
  fmtMetric,
  mapAggOf,
  metricGamma,
  metricVal,
  type Metric,
} from "@/lib/revenue";
import { national2, regionRevenue, revYears } from "@/data/revenue";
import { CANVAS_W, CB, H, labelNudge, regionAbbr, regions } from "@/data/map";
import type { YearKey } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import Donut from "./Donut";
import MapCoins, { COIN_RAIL_WIDTH, type MapCoin } from "./MapCoins";
import PartCoins, { type PartCoin } from "./PartCoins";
import RevenuePanel from "./RevenuePanel";
import { SHIELD_ID, dossierCode } from "./RevenueDossier";
import SpainMap, { RampLegend, type MapFlag } from "./SpainMap";
import YearScrubber from "./YearScrubber";
import type { Tab } from "./WhoBlock";
import type { WhoSort } from "./WhoPaysTable";

/**
 * The revenue console.
 *
 * M5 collapses what M2 had as three surfaces into one interaction. The legend
 * beside the ring is now a grid of pressable coins, and pressing one is the
 * console's filter control: the map re-cuts to that component, the coin beside
 * Spain shows what of it has no territorial split, and the right-hand panel
 * fills with that component's whole breakdown. The explainer that used to sit
 * under the counter is gone — its content is in the panel.
 *
 * This is docs/04's "deliberate re-introduction of filtering with its own
 * control": the coins ARE the control. Nothing filters as a side effect of
 * reading something else.
 *
 * Presentation only — every piece of state arrives as a prop, so the same tree
 * renders the static shell (with the console's opening state) and the live,
 * URL-driven island.
 *
 * The prototype exposes no metric control on this screen, so the console reads
 * the absolute total. The slice, which the prototype indexes its map by, is now
 * driven by the filter rather than pinned to 0.
 */

const METRIC: Metric = "total";
const noop = () => {};

export interface RevenueConsoleState {
  year: YearKey;
  /** A region id, or the shield coin, or nothing selected. */
  sel: string | null;
  /** The revenue component the console is filtered to. */
  focus: string | null;
  tab: Tab;
  sort: WhoSort;
}

export default function RevenueConsole({
  locale,
  state,
  onYear = noop,
  onSelect = noop,
  onFocus = noop,
  onTotal = noop,
  onTab = noop,
  onSort = noop,
}: {
  locale: Locale;
  state: RevenueConsoleState;
  onYear?: (y: YearKey) => void;
  onSelect?: (id: string) => void;
  onFocus?: (k: string) => void;
  /** Lift the filter: the total row asks for the whole reading back. */
  onTotal?: () => void;
  onTab?: (t: Tab) => void;
  onSort?: (col: string) => void;
}) {
  const t = dict(locale);
  const { year, sel, focus } = state;

  /* ---- composition -------------------------------------------------------- */
  const M = compModel(t, year);

  /* One coin per component with a figure this year — so the two pending
     aggregates appear only in the years Eurostat has not yet split, exactly as
     the text legend they replace did. */
  const coinItems: PartCoin[] = M.rows.map((r) => ({
    k: r.k,
    nm: r.nm,
    desc: r.desc,
    value: eur(locale, r.v),
    pct: nf(locale, (r.v / M.total) * 100, 1),
    colour: r.c,
  }));

  /* ---- map ---------------------------------------------------------------- */
  /* The filter drives the slice the prototype's model already indexes by, so the
     map, the coin and the panel all read one number set. Slice 0 is the total. */
  const slice = focus ? REV_SLICES.findIndex((s) => s.k === focus) : 0;
  const k = REV_SLICES[slice].k;

  const values = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const g of regions)
      m.set(g.id, metricVal(regionRevenue[g.id], year, slice, METRIC));
    return m;
  }, [year, slice]);

  const ramp = useMemo(() => makeRamp(RAMP_REV), []);
  const list = useMemo(() => [...values.values()], [values]);
  const colour = useMemo(
    () => makeScale(list, ramp, metricGamma(METRIC)),
    [list, ramp],
  );
  const intensity = useMemo(() => makeIntensity(list), [list]);

  /* No advisory badges on the revenue map. The foral regime of the Basque
     Country and Navarre is stated in full in the dossier once the reader selects
     them; a one-glyph marker on the map said less and cluttered the country. Spending mode still pins its `?` where an
     autonomous region has published nothing for the year. */
  const flags: MapFlag[] = [];

  /* The HUD states where the picture comes from and which year it is on. The
     national and on-map totals it used to carry are said in full in the
     composition panel above; repeating them here made the map a summary of a
     summary. `(P)` marks a year whose territorial coverage is still partial,
     and is stated nowhere else. */
  const n2 = national2[year];
  const hudRows: [string, string][] = [
    ["PROJ", "MERCATOR / ETRS89"],
    ["SRC", "AEAT·IGAE·CONPREL·EU"],
    [t.fYear.toUpperCase(), year + (n2 && !n2.complete ? " (P)" : "")],
  ];

  /* ---- the one off-map coin ---------------------------------------------- */
  /* Whatever the reading is, the regions on the map plus this coin are the
     figure. Filtered, it is that component's unattributed part; unfiltered, the
     whole of this year's revenue that no source splits by community. */
  const partName = focus ? t.pt[focus as keyof typeof t.pt][0] : null;
  const offmap = mapAggOf(year, k).offmap;
  const coins: MapCoin[] = [
    {
      id: SHIELD_ID,
      glyph: "gov",
      title: t.shieldTitle,
      value: eur(locale, offmap),
      aria: `${t.shieldName} · ${partName ?? t.rvTotal}: ${eur(locale, offmap)}`,
    },
  ];

  return (
    <>
      <section className="comp" id="comp" role="tabpanel">
        {/* The year picker sits in this header because the year is what the
            figures under it are for. The caption no longer repeats it: the
            control states the year, once. */}
        <div className="comp-h">
          <div className="comp-hk">
            <div className="head-k">{t.rvTotalK}</div>
            {/* Only when there is a gap to declare: see `CompModel.sub`. */}
            {M.sub ? <div className="head-s">{M.sub}</div> : null}
          </div>
          <YearScrubber
            years={revYears}
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
          aria={`${t.rvTotalK} ${year}: ${eur(locale, M.total)}`}
          locale={locale}
          focus={focus}
          onFocus={onFocus}
          showLegend={false}
        >
          <PartCoins
            items={coinItems}
            selected={focus}
            onSelect={onFocus}
            total={{ label: t.rvTotal, desc: t.rvTotalSub }}
            onTotal={onTotal}
          />
        </Donut>
      </section>

      <div className="main conmain" id="mainlayout">
        <section className="pane">
          <div className="pane-h">
            <span className="t">{t.mapRev}</span>
            <span className="x">
              {year}
              {partName ? ` · ${partName}` : ""}
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
            accentRgb={rampTop(RAMP_REV)}
            selected={sel}
            onSelect={onSelect}
            flags={flags}
            hudRows={hudRows}
            hudAccent="#3FC8DC"
            ariaLabel="Spain"
            railWidth={COIN_RAIL_WIDTH}
            rail={<MapCoins items={coins} selected={sel} onSelect={onSelect} />}
          />
          <RampLegend ramp={ramp} lo={t.lo} hi={t.hi} />
        </section>

        <aside className="pane dossier conpanel">
          <div className="pane-h">
            <span className="t">{t.dos}</span>
            <span className="x">{dossierCode(sel, regions)}</span>
          </div>
          <div className="pane-b">
            <RevenuePanel
              selected={sel}
              part={focus}
              regions={regions}
              locale={locale}
              t={t}
              year={year}
              tab={state.tab}
              onTab={onTab}
              sort={state.sort}
              onSort={onSort}
            />
          </div>
        </aside>
      </div>

      <ConsoleFooter mode="revenue" locale={locale} />
    </>
  );
}

"use client";

import { useMemo } from "react";
import { dict, type Locale } from "@/i18n";
import { eur, fy } from "@/lib/format";
import { MODES, type Mode } from "@/lib/modes";
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
import { natParts, national2, regionRevenue, revYears } from "@/data/revenue";
import { CB, H, W, labelNudge, regionAbbr, regions } from "@/data/map";
import type { YearKey } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import Donut from "./Donut";
import Explainer from "./Explainer";
import ModeBar from "./ModeBar";
import MapCoins, { COIN_RAIL_WIDTH, type MapCoin } from "./MapCoins";
import RevenueDossier, { dossierCode } from "./RevenueDossier";
import SpainMap, { RampLegend, type MapFlag } from "./SpainMap";
import YearScrubber from "./YearScrubber";
import type { Tab } from "./WhoBlock";
import type { WhoSort } from "./WhoPaysTable";

/**
 * The revenue console, ported panel for panel from the prototype's `render()`
 * for `MODE==='rev'`: composition, map, off-map cards, dossier, footer.
 *
 * Presentation only — every piece of state arrives as a prop, so the same tree
 * renders the static shell (with the console's opening state) and the live,
 * URL-driven island. Handlers are optional for exactly that reason: the shell
 * has none and is replaced the moment the island hydrates.
 *
 * The prototype exposes no metric or slice control on this screen — its
 * `buildControls()` is never called and the markup it writes into does not
 * exist — so the console reads the absolute total, slice 0. The plumbing below
 * is the prototype's, indexed the same way, so a control rail drops in without
 * touching the model.
 */

const SLICE = 0;
const METRIC: Metric = "total";
const noop = () => {};

export interface RevenueConsoleState {
  year: YearKey;
  /** A region id, or `om:<card>`, or nothing selected. */
  sel: string | null;
  /** The focused revenue component, whose explainer is open. */
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
  onTab = noop,
  onSort = noop,
}: {
  locale: Locale;
  state: RevenueConsoleState;
  onYear?: (y: YearKey) => void;
  onSelect?: (id: string) => void;
  onFocus?: (k: string) => void;
  onTab?: (t: Tab) => void;
  onSort?: (col: string) => void;
}) {
  const t = dict(locale);
  const { year, sel, focus } = state;

  const labels = useMemo(
    () =>
      Object.fromEntries(
        MODES.map((m) => [
          m,
          m === "revenue" ? t.modeRev : m === "spending" ? t.modeExp : t.modeDebt,
        ]),
      ) as Record<Mode, string>,
    [t],
  );

  /* ---- composition -------------------------------------------------------- */
  const M = compModel(t, year);
  const focusRow = focus ? M.rows.find((r) => r.k === focus) : undefined;

  /* ---- map ---------------------------------------------------------------- */
  const k = REV_SLICES[SLICE].k;
  const values = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const g of regions)
      m.set(g.id, metricVal(regionRevenue[g.id], year, SLICE, METRIC));
    return m;
  }, [year]);

  const ramp = useMemo(() => makeRamp(RAMP_REV), []);
  const list = useMemo(() => [...values.values()], [values]);
  const colour = useMemo(
    () => makeScale(list, ramp, metricGamma(METRIC)),
    [list, ramp],
  );
  const intensity = useMemo(() => makeIntensity(list), [list]);

  const flags: MapFlag[] = [];
  for (const g of regions) {
    /* Madrid carries the headquarters advisory: the tax is declared where a
       company is registered, not where the activity happened. */
    if (g.id === "13")
      flags.push({ id: g.id, dx: 30, dy: -16, r: 6, ty: 2.5, text: "!" });
    if (g.foral)
      flags.push({
        id: g.id,
        dx: 22,
        dy: -12,
        r: 5,
        ty: 2.2,
        text: "F",
        fill: "var(--mag)",
        textFill: "#150E1D",
      });
  }

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

  /* ---- off-map coins ------------------------------------------------------ */
  const nat = natParts[year];
  const agg = mapAggOf(year, k);
  const socOff =
    k === "total" ? (nat.social as number) : k === "social" ? (nat.social as number) : 0;
  const euOff = k === "total" ? (nat.eu as number) : k === "eu" ? (nat.eu as number) : 0;
  const rest = agg.offmap - socOff - euOff;
  const coins: MapCoin[] = [];
  if (socOff > 0)
    coins.push({
      id: "social",
      glyph: "social",
      title: t.coinSoc,
      value: eur(locale, socOff),
      aria: `${t.omSoc}: ${eur(locale, socOff)}`,
    });
  if (euOff > 0)
    coins.push({
      id: "eu",
      glyph: "eu",
      title: t.coinEu,
      value: eur(locale, euOff),
      aria: `${t.omEu}: ${eur(locale, euOff)}`,
    });
  if (Math.abs(rest) > 50)
    coins.push({
      id: "rest",
      glyph: "rest",
      title: t.coinRest,
      value: eur(locale, rest),
      aria: `${t.omRest}: ${eur(locale, rest)}`,
    });

  return (
    <>
      <ModeBar locale={locale} labels={labels}>
        <YearScrubber
          years={revYears}
          year={year}
          label={t.fYear}
          optionLabel={(y) => fy(locale, y)}
          onChange={onYear}
        />
      </ModeBar>

      <section className="comp" id="comp" role="tabpanel">
        <div className="head-k">
          {t.rvTotalK} · {fy(locale, year)}
        </div>
        <div className="head-s">{M.sub}</div>
        <Donut
          rows={M.rows}
          total={M.total}
          floor={0.4}
          centre={eur(locale, M.total)}
          aria={`${t.rvTotalK} ${fy(locale, year)}: ${eur(locale, M.total)}`}
          locale={locale}
          focus={focus}
          onFocus={onFocus}
          totalRow={{ label: t.rvTotalK, value: eur(locale, M.total) }}
        />
        <div id="expl">
          {focusRow ? (
            <Explainer
              row={focusRow}
              total={M.total}
              locale={locale}
              t={t}
              year={year}
              tab={state.tab}
              onTab={onTab}
              sort={state.sort}
              onSort={onSort}
              onClose={() => onFocus(focusRow.k)}
            />
          ) : null}
        </div>
      </section>

      <div className="main" id="mainlayout">
        <section className="pane">
          <div className="pane-h">
            <span className="t">{t.mapRev}</span>
            <span className="x">{fy(locale, year)}</span>
          </div>
          <SpainMap
            W={W}
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

        <aside className="pane dossier">
          <div className="pane-h">
            <span className="t">{t.dos}</span>
            <span className="x">{dossierCode(sel, regions)}</span>
          </div>
          <div className="pane-b">
            <RevenueDossier
              selected={sel}
              regions={regions}
              locale={locale}
              t={t}
              year={year}
              slice={SLICE}
              metric={METRIC}
            />
          </div>
        </aside>
      </div>

      <ConsoleFooter
        source={t.footRev1}
        perimeter={t.footRev2}
        build={t.foot3}
      />
    </>
  );
}

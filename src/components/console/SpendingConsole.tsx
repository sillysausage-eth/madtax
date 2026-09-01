"use client";

import { useMemo } from "react";
import { dict, type Locale } from "@/i18n";
import { eur, fy } from "@/lib/format";
import { fmtMetric, type Metric } from "@/lib/metric";
import { MODES, type Mode } from "@/lib/modes";
import { RAMP_EXP, makeIntensity, makeRamp, makeScale, rampTop } from "@/lib/ramp";
import {
  SPEND_GAMMA,
  aggCode,
  spendAggOf,
  spendCompModel,
  spendMetricVal,
  spendYear,
} from "@/lib/spending";
import { divisions, regionSpending, spendYears } from "@/data/spending";
import { CB, H, W, labelNudge, regionAbbr, regions } from "@/data/map";
import type { YearKey } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import Donut from "./Donut";
import ModeBar from "./ModeBar";
import MapCoins, { COIN_RAIL_WIDTH, type MapCoin } from "./MapCoins";
import SpainMap, { RampLegend, type MapFlag } from "./SpainMap";
import SpendingDossier, { spendingDossierCode } from "./SpendingDossier";
import SpendingExplainer from "./SpendingExplainer";
import YearScrubber from "./YearScrubber";

/**
 * The spending console, ported panel for panel from the prototype's `render()`
 * for `MODE==='exp'`: COFOG composition, map, coins, dossier, footer.
 *
 * Presentation only — every piece of state arrives as a prop, so the same tree
 * renders the static shell (with the console's opening state) and the live,
 * URL-driven island.
 *
 * As on the revenue screen the prototype exposes no metric or function control —
 * its `buildControls()` is never called — so the console reads the absolute
 * total, slice 0: the map is total regional spending whichever function is
 * focused. Focus re-cuts the coins, because the money with no territorial split
 * is a different set for each function.
 */

const SLICE = 0;
const METRIC: Metric = "total";
const noop = () => {};

export interface SpendingConsoleState {
  year: YearKey;
  /** A region id, or a coin id, or nothing selected. */
  sel: string | null;
  /** The focused COFOG division, whose explainer is open. */
  focus: string | null;
}

export default function SpendingConsole({
  locale,
  state,
  onYear = noop,
  onSelect = noop,
  onFocus = noop,
}: {
  locale: Locale;
  state: SpendingConsoleState;
  onYear?: (y: YearKey) => void;
  onSelect?: (id: string) => void;
  onFocus?: (k: string) => void;
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
  const M = spendCompModel(locale, t, year);
  const focusRow = focus ? M.rows.find((r) => r.k === focus) : undefined;

  /* ---- map ---------------------------------------------------------------- */
  const values = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const g of regions)
      m.set(g.id, spendMetricVal(regionSpending[g.id], year, SLICE, METRIC));
    return m;
  }, [year]);

  const ramp = useMemo(() => makeRamp(RAMP_EXP), []);
  const list = useMemo(() => [...values.values()], [values]);
  const colour = useMemo(() => makeScale(list, ramp, SPEND_GAMMA), [list, ramp]);
  const intensity = useMemo(() => makeIntensity(list), [list]);

  /* A region whose spending is not published for this year is flagged, not left
     to read as an empty outline. Ceuta and Melilla have no regional government at
     all, so they carry it every year; the dossier says why. */
  const flags: MapFlag[] = regions
    .filter((g) => !regionSpending[g.id]?.spend[year])
    .map((g) => ({
      id: g.id,
      /* The flag sits opposite the label: Melilla's name is nudged to the right
         of its dot, so its marker goes left rather than under the label. */
      dx: labelNudge(g).dx > 0 ? -13 : 13,
      dy: -9,
      r: 5,
      ty: 2.2,
      text: "?",
      fill: "#3E525E",
      textFill: "#0B1218",
    }));

  /* The HUD states where the picture comes from, which year it is on and which
     COFOG cut is drawn. The cut follows the slice, not the focus: focusing a
     function opens its explainer and re-cuts the coins, it does not re-colour the
     map, so anything else here would misdescribe what is on screen. The national
     and on-map totals the prototype also carried are said in full in the
     composition panel and on the coins — repeating them made the map a summary of
     a summary. */
  const hudRows: [string, string][] = [
    ["PROJ", "MERCATOR / ETRS89"],
    ["SRC", "IGAE COFOG · EUROSTAT"],
    [
      t.fYear.toUpperCase(),
      `${year} · COFOG ${SLICE ? divisions[SLICE - 1] : "ALL"}`,
    ],
  ];

  /* ---- coins: the spending with no territorial split ---------------------- */
  const agg = spendAggOf(year, aggCode(focus));
  const coins: MapCoin[] = [];
  if (agg) {
    if (agg.socsec > 50)
      coins.push({
        id: "ss",
        glyph: "social",
        title: t.coinOsSoc,
        value: eur(locale, agg.socsec),
        aria: `${t.osSoc}: ${eur(locale, agg.socsec)}`,
      });
    if (agg.central > 50)
      coins.push({
        id: "central",
        glyph: "central",
        title: t.coinOsCentral,
        value: eur(locale, agg.central),
        aria: `${t.osCentral}: ${eur(locale, agg.central)}`,
      });
    if (agg.local > 50)
      coins.push({
        id: "local",
        glyph: "local",
        title: t.coinOsLocal,
        value: eur(locale, agg.local),
        aria: `${t.osLocal}: ${eur(locale, agg.local)}`,
      });
    if (Math.abs(agg.adj) > 500)
      coins.push({
        id: "adj",
        glyph: "adjust",
        title: t.coinOsAdj,
        value: eur(locale, agg.adj),
        aria: `${t.osAdj}: ${eur(locale, agg.adj)}`,
      });
  }

  /* The year actually read. It differs from the year asked for only if state ever
     gets out of step with the mode — spending publishes a year later than
     revenue — and the console then says which year it is showing. */
  const shown = spendYear(year);

  return (
    <>
      <ModeBar locale={locale} labels={labels}>
        <YearScrubber
          years={spendYears}
          year={year}
          label={t.fYear}
          optionLabel={(y) => fy(locale, y)}
          onChange={onYear}
        />
      </ModeBar>

      <section className="comp" id="comp" role="tabpanel">
        <div className="head-k">
          {t.sExp.tot} · {fy(locale, shown)}
        </div>
        <div className="head-s">{M.sub}</div>
        <Donut
          rows={M.rows}
          total={M.total}
          floor={0.4}
          centre={eur(locale, M.total)}
          aria={`${t.sExp.tot} ${fy(locale, shown)}: ${eur(locale, M.total)}`}
          locale={locale}
          focus={focus}
          onFocus={onFocus}
          totalRow={{ label: t.sExp.tot, value: eur(locale, M.total) }}
        />
        <div id="expl">
          {focusRow ? (
            <SpendingExplainer
              row={focusRow}
              total={M.total}
              locale={locale}
              t={t}
              year={year}
              onClose={() => onFocus(focusRow.k)}
            />
          ) : null}
        </div>
      </section>

      <div className="main" id="mainlayout">
        <section className="pane">
          <div className="pane-h">
            <span className="t">{t.mapExp}</span>
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

        <aside className="pane dossier">
          <div className="pane-h">
            <span className="t">{t.dos}</span>
            <span className="x">{spendingDossierCode(sel, focus, regions)}</span>
          </div>
          <div className="pane-b">
            <SpendingDossier
              selected={sel}
              regions={regions}
              locale={locale}
              t={t}
              year={year}
              focus={focus}
              slice={SLICE}
              metric={METRIC}
            />
          </div>
        </aside>
      </div>

      <ConsoleFooter source={t.footExp1} perimeter={t.footExp2} build={t.foot3} />
    </>
  );
}

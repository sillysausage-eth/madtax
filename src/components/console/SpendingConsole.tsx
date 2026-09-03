"use client";

import { useMemo } from "react";
import { dict, type Locale } from "@/i18n";
import { eur, fy, nf } from "@/lib/format";
import { fmtMetric, type Metric } from "@/lib/metric";
import { RAMP_EXP, makeIntensity, makeRamp, makeScale, rampTop } from "@/lib/ramp";
import {
  SPEND_GAMMA,
  aggCode,
  spendAggOf,
  spendCompModel,
  spendMetricVal,
  spendNoSplit,
  spendSlice,
  spendYear,
} from "@/lib/spending";
import { divisions, regionSpending, spendYears } from "@/data/spending";
import { CANVAS_W, CB, H, labelNudge, regionAbbr, regions } from "@/data/map";
import type { YearKey } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import { SOURCE_LINKS } from "@/lib/sources";
import { COFOG_GLYPH } from "./coinGlyphs";
import Donut from "./Donut";
import MapCoins, { COIN_RAIL_WIDTH, type MapCoin } from "./MapCoins";
import PartCoins, { type PartCoin } from "./PartCoins";
import SpainMap, { RampLegend, type MapFlag } from "./SpainMap";
import { spendingDossierCode } from "./SpendingDossier";
import SpendingPanel from "./SpendingPanel";
import YearScrubber from "./YearScrubber";

/**
 * The spending console.
 *
 * M6 brings this screen onto the interaction the revenue console has used since
 * M5, so the two work identically: the text legend beside the ring is a grid of
 * pressable coins, one per COFOG division, and pressing one is the console's
 * filter control — the map re-cuts to that function, the four coins beside Spain
 * re-cut with it, and the right-hand panel fills with that function's whole
 * breakdown. The explainer that used to sit under the counter is gone; its
 * content is in the panel.
 *
 * What is deliberately *not* symmetric with revenue: revenue has one off-map
 * coin because its unattributed remainder does not decompose. Spending's does —
 * into central government, councils, social security and the transfers between
 * them — so the four rail coins stay. The interaction is unified; the taxonomy
 * is not, because the taxonomies are genuinely different and flattening one to
 * match the other would throw away published detail.
 *
 * Presentation only — every piece of state arrives as a prop, so the same tree
 * renders the static shell (with the console's opening state) and the live,
 * URL-driven island.
 */

const METRIC: Metric = "total";
const noop = () => {};

export interface SpendingConsoleState {
  year: YearKey;
  /** A region id, or a rail coin id, or nothing selected. */
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

  /* One coin per COFOG division, largest first — the order the ring is drawn
     in, so the grid and the arcs agree. The title carries the full name for the
     widths where the label has to wrap. */
  const coinItems: PartCoin[] = M.rows.map((r) => ({
    k: r.k,
    nm: r.nm,
    desc: r.nm,
    value: eur(locale, r.v),
    pct: nf(locale, (r.v / M.total) * 100, 1),
    colour: r.c,
  }));

  /* ---- map ---------------------------------------------------------------- */
  /* The filter drives the slice the region arrays are already laid out by, so
     the map, the rail coins and the panel all read one number set. Slice 0 is
     the whole of regional spending. */
  const slice = spendSlice(focus);
  const code = aggCode(focus);

  /* Defence is spent entirely outside the tier the map draws. The region arrays
     carry a literal zero there, but that zero is the absence of the function
     from this tier rather than a measurement of any community, so the map is
     given nothing to draw and the panel says so in place.

     Derived inside the memo from the two pieces of state it actually depends on,
     rather than from the locals above: those locals also feed the rail coins,
     whose aggregate is a bundle object the compiler cannot prove is never
     mutated, and a dependency it cannot vouch for is a memo it will not keep. */
  const values = useMemo(() => {
    const m = new Map<string, number | null>();
    const y = spendYear(year);
    const i = spendSlice(focus);
    const blank = spendNoSplit(y, aggCode(focus));
    for (const g of regions)
      m.set(
        g.id,
        blank ? null : spendMetricVal(regionSpending[g.id], y, i, METRIC),
      );
    return m;
  }, [year, focus]);

  const ramp = useMemo(() => makeRamp(RAMP_EXP), []);
  const list = useMemo(() => [...values.values()], [values]);
  const colour = useMemo(() => makeScale(list, ramp, SPEND_GAMMA), [list, ramp]);
  const intensity = useMemo(() => makeIntensity(list), [list]);

  /* A region whose spending is not published for this year is flagged, not left
     to read as an empty outline. Ceuta and Melilla have no regional government at
     all, so they carry it every year; the dossier says why. The flag tracks the
     region's own publication, not the filter: where a whole function is absent
     from this tier the panel states it once rather than pinning nineteen
     markers to a blank country. */
  const flags: MapFlag[] = regions
    .filter((g) => !regionSpending[g.id]?.spend[sy])
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
     COFOG cut is drawn. Since the coins filter the map, the cut follows the
     filter — anything else would misdescribe what is on screen. The national and
     on-map totals the prototype also carried are said in full in the composition
     panel and on the coins. */
  const hudRows: [string, string][] = [
    ["PROJ", "MERCATOR / ETRS89"],
    ["SRC", "IGAE COFOG · EUROSTAT"],
    [
      t.fYear.toUpperCase(),
      `${sy} · COFOG ${slice ? divisions[slice - 1] : "ALL"}`,
    ],
  ];

  /* ---- coins: the spending with no territorial split ---------------------- */
  const agg = spendAggOf(sy, code);
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

  const fnName = slice ? M.rows.find((r) => r.k === focus)?.nm : null;

  return (
    <>
      <section className="comp" id="comp" role="tabpanel">
        {/* The year picker sits in this header, beside the figures it governs.
            The caption keeps its own year because it is the year the COFOG split
            is published for, which is not always the year asked for. */}
        <div className="comp-h">
          <div className="comp-hk">
            <div className="head-k">
              {t.sExp.tot} · {fy(locale, sy)}
            </div>
            <div className="head-s">{M.sub}</div>
          </div>
          <YearScrubber
            years={spendYears}
            year={year}
            label={t.fYear}
            optionLabel={(y) => fy(locale, y)}
            onChange={onYear}
          />
        </div>
        <Donut
          rows={M.rows}
          total={M.total}
          floor={0.4}
          centre={eur(locale, M.total)}
          aria={`${t.sExp.tot} ${fy(locale, sy)}: ${eur(locale, M.total)}`}
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
              {fy(locale, sy)}
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

      <ConsoleFooter
        source={t.footExp1}
        sourceLinks={{ Eurostat: SOURCE_LINKS.gov_10a_exp }}
        perimeter={t.footExp2}
        build={t.foot3}
      />
    </>
  );
}

"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, nf, nf0 } from "@/lib/format";
import { natParts } from "@/data/revenue";
import { who } from "@/data/who";
import type {
  AeatYear,
  CorpEntry,
  CorpYear,
  DecileRow,
  DecileYear,
  PayerYear,
  VatYear,
  WhoBlock as WhoBlockData,
  YearKey,
} from "@/lib/types";
import {
  applySort,
  InfoNote,
  SortTh,
  StaleTag,
  WBar,
  type WhoSort,
} from "./WhoPaysTable";

/**
 * Who generates each revenue component — ported from the prototype's `whoBlock`,
 * `whoIrpf`, `groupView`, `topView`, `whoCompany`, `whoPayer`, `whoProduct`,
 * `whoRate` and `aeatRows`.
 *
 * Every one of these tables is AEAT administrative data on its own basis. None
 * of them equals the national-accounts figure in the headline above, and none is
 * scaled so that it does: each carries its own total and states the difference
 * in words. The only arithmetic is aggregation of published rows — deciles into
 * quintiles, nested percentile groups differenced into exclusive ones — and the
 * shares and gaps the prototype itself computes.
 */

export type Tab = "dec" | "qui" | "top";

/**
 * `tab` and `sort` are held by the caller, not here: in the prototype they are
 * module-level, so a reader who sorted the decile table and then opened another
 * component finds their sort still applied when they come back.
 */
export default function WhoBlock({
  k,
  locale,
  t,
  year,
  tab,
  onTab,
  sort,
  onSort,
}: {
  /** The `PARTS` key of the focused component. */
  k: string;
  locale: Locale;
  t: Dict;
  year: YearKey;
  tab: Tab;
  onTab: (t: Tab) => void;
  sort: WhoSort;
  onSort: (col: string) => void;
}) {
  const W = who[k];
  if (!W) return null;

  /* The series that genuinely varies by year, and so decides which year this
     section shows. For income tax that is the decile distribution (2003-), NOT
     the AEAT fixed bracket table, which is a single-year snapshot kept for
     tie-outs and never rendered. */
  const S: Record<string, unknown> =
    W.kind === "brackets" ? W.deciles : (W.years as Record<string, unknown>);
  if (!S) return null;

  const yrs = Object.keys(S).sort();
  const y = S[year] ? year : yrs[yrs.length - 1];
  const stale = y !== year ? t.whoYear.replace("{Y}", y) : null;

  const shared = { locale, t, year, y, stale, sort, onSort };

  let body: React.ReactNode = null;
  if (W.kind === "brackets") {
    body = <WhoIrpf {...shared} dec={W.deciles[y]} tab={tab} onTab={onTab} />;
  } else if (W.kind === "company") {
    body = <WhoCompany {...shared} c={(W.years as Record<string, CorpYear>)[y]} />;
  } else if (W.kind === "payer") {
    body = <WhoPayer {...shared} o={(W.years as Record<string, PayerYear>)[y]} />;
  } else if (W.kind === "product") {
    body = <WhoProduct {...shared} o={W.years[y]} W={W} k={k} />;
  } else if (W.kind === "rate") {
    body = <WhoRate {...shared} o={W.years[y]} W={W} k={k} />;
  }

  if (!body) return null;
  return <div className="who">{body}</div>;
}

interface Shared {
  locale: Locale;
  t: Dict;
  /** The year on screen. */
  year: YearKey;
  /** The year this series actually has data for — the same, or the latest. */
  y: YearKey;
  stale: string | null;
  sort: WhoSort;
  onSort: (col: string) => void;
}

/** The headline this section sits under, for the coverage note. */
const headlineIrpf = (year: YearKey): number | null => {
  const n = natParts[year];
  const v = n ? n.irpf : undefined;
  return typeof v === "number" ? v : null;
};

/* ------------------------------------------------------------------- IRPF -- */

function WhoIrpf({
  dec,
  tab,
  onTab,
  ...s
}: Shared & { dec?: DecileYear; tab: Tab; onTab: (t: Tab) => void }) {
  const tabs: [Tab, string][] = [
    ["dec", s.t.tabDec],
    ["qui", s.t.tabQui],
    ["top", s.t.tabTop],
  ];
  return (
    <>
      <div className="wtabs">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            className="wtb"
            data-wt={k}
            aria-pressed={tab === k}
            onClick={(e) => {
              e.stopPropagation();
              onTab(k);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {!dec ? null : tab === "top" ? (
        <TopView d={dec} {...s} />
      ) : (
        <GroupView d={dec} per={tab === "qui" ? 2 : 1} {...s} />
      )}
    </>
  );
}

/**
 * Deciles, or quintiles by merging decile pairs. Both are exact aggregations of
 * the published data — no interpolation anywhere.
 */
function GroupView({ d, per, ...s }: Shared & { d: DecileYear; per: number }) {
  const T = d.TOT;
  if (!T) return null;
  const D10 = [...Array(10)].map(
    (_, i) => d["D" + String(i + 1).padStart(2, "0")],
  );
  if (D10.some((x) => !x)) return null;
  const ten = D10 as DecileRow[];
  const money = (v: number | null) => "€" + nf0(s.locale, v as number);

  const groups: {
    lo: number | null;
    hi: number | null;
    n: number;
    income: number;
    tax: number;
  }[] = [];
  for (let i = 0; i < 10; i += per) {
    const part = ten.slice(i, i + per);
    const n = part.reduce((a, x) => a + x.n, 0);
    const income = part.reduce((a, x) => a + x.income, 0);
    const tax = part.reduce((a, x) => a + x.tax, 0);
    const hi = i + per >= 10 ? null : ten[i + per - 1].limit;
    const lo = i === 0 ? null : ten[i - 1].limit;
    groups.push({ lo, hi, n, income, tax });
  }

  const rows = applySort(
    groups.map((g) => ({ x: { n: g.n, income: g.income, tax: g.tax }, g })),
    s.sort,
  );
  const maxShare = Math.max(...groups.map((g) => (g.tax / T.tax) * 100));
  const label = (g: (typeof groups)[number]) =>
    g.lo === null
      ? s.t.wUpToV.replace("{V}", money(g.hi))
      : g.hi === null
        ? s.t.wOverV.replace("{V}", money(g.lo))
        : money(g.lo) + " – " + money(g.hi);

  const head = headlineIrpf(s.year);
  const gap = head != null ? head - Math.round(T.tax / 1e6) : null;

  return (
    <>
      <table className="wtab">
        <thead>
          <tr>
            <th>
              {s.t.wBandRange}
              <StaleTag text={s.stale} />
            </th>
            <th>{s.t.wPeople}</th>
            <th className="colopt">{s.t.wIncome}</th>
            <SortTh col="tax" label={s.t.wTax} sort={s.sort} onSort={s.onSort} />
            <SortTh col="share" label={s.t.wShare} sort={s.sort} onSort={s.onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ g }, i) => {
            const share = (g.tax / T.tax) * 100;
            return (
              <tr key={i}>
                <td>{label(g)}</td>
                <td>{nf0(s.locale, g.n)}</td>
                <td className="colopt">{eur(s.locale, g.income / 1e6)}</td>
                <td>
                  <b>{eur(s.locale, g.tax / 1e6)}</b>
                </td>
                <td>
                  {nf(s.locale, share, 1)}%
                  <WBar width={(share / maxShare) * 46} />
                </td>
              </tr>
            );
          })}
          <tr className="tot">
            <td>{s.t.wTotalRow}</td>
            <td>{nf0(s.locale, T.n)}</td>
            <td className="colopt">{eur(s.locale, T.income / 1e6)}</td>
            <td>
              <b>{eur(s.locale, T.tax / 1e6)}</b>
            </td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
      {gap != null ? (
        <InfoNote
          html={s.t.wGap
            .replace("{R}", eur(s.locale, Math.round(T.tax / 1e6)))
            .replace("{H}", eur(s.locale, head))
            .replace("{G}", eur(s.locale, gap))}
        />
      ) : null}
    </>
  );
}

/**
 * The top decile, split by AEAT's published percentile thresholds. Each row is
 * the nested group minus the one inside it, so the four rows are mutually
 * exclusive and add back to the top decile exactly. No interpolation.
 */
function TopView({ d, ...s }: Shared & { d: DecileYear }) {
  const T = d.TOT;
  const D10 = d.D10;
  const P99 = d.P99;
  const P999 = d.P999;
  const P9999 = d.P9999;
  if (!T || !D10 || !P99 || !P999 || !P9999) return null;
  const money = (v: number | null) => "€" + nf0(s.locale, v as number);
  const sub = (a: DecileRow, b: DecileRow) => ({
    n: a.n - b.n,
    income: a.income - b.income,
    tax: a.tax - b.tax,
  });
  const D9lim = d.D09 ? d.D09.limit : null;

  const rows = applySort(
    [
      { key: "a", pos: s.t.wTop10_1, lo: D9lim, hi: P99.limit, x: sub(D10, P99) },
      {
        key: "b",
        pos: s.t.wTop1_01,
        lo: P99.limit,
        hi: P999.limit,
        x: sub(P99, P999),
      },
      {
        key: "c",
        pos: s.t.wTop01_001,
        lo: P999.limit,
        hi: P9999.limit,
        x: sub(P999, P9999),
      },
      {
        key: "d",
        pos: s.t.wTop001,
        lo: P9999.limit,
        hi: null as number | null,
        x: { n: P9999.n, income: P9999.income, tax: P9999.tax },
      },
    ],
    s.sort,
  );

  const maxShare = Math.max(...rows.map((r) => (r.x.tax / T.tax) * 100));
  const label = (r: (typeof rows)[number]) =>
    r.hi === null
      ? s.t.wOverV.replace("{V}", money(r.lo))
      : money(r.lo) + " – " + money(r.hi);

  const dec = D10;
  const decShare = (dec.tax / T.tax) * 100;
  const head = headlineIrpf(s.year);

  return (
    <>
      <table className="wtab">
        <thead>
          <tr>
            <th>
              {s.t.wBandRange}
              <StaleTag text={s.stale} />
            </th>
            <th className="grp">{s.t.wGroupCol}</th>
            <th>{s.t.wPeople}</th>
            <th className="colopt">{s.t.wIncome}</th>
            <SortTh col="tax" label={s.t.wTax} sort={s.sort} onSort={s.onSort} />
            <SortTh col="share" label={s.t.wShare} sort={s.sort} onSort={s.onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const share = (r.x.tax / T.tax) * 100;
            return (
              <tr key={r.key}>
                <td>{label(r)}</td>
                <td className="grp">{r.pos}</td>
                <td>{nf0(s.locale, r.x.n)}</td>
                <td className="colopt">{eur(s.locale, r.x.income / 1e6)}</td>
                <td>
                  <b>{eur(s.locale, r.x.tax / 1e6)}</b>
                </td>
                <td>
                  {nf(s.locale, share, 1)}%
                  <WBar width={(share / maxShare) * 46} />
                </td>
              </tr>
            );
          })}
          <tr className="tot">
            <td>{s.t.wTotalRow}</td>
            <td />
            <td>{nf0(s.locale, dec.n)}</td>
            <td className="colopt">{eur(s.locale, dec.income / 1e6)}</td>
            <td>
              <b>{eur(s.locale, dec.tax / 1e6)}</b>
            </td>
            <td>{nf(s.locale, decShare, 1)}%</td>
          </tr>
        </tbody>
      </table>
      {head != null ? (
        <InfoNote
          html={s.t.wGap
            .replace("{R}", eur(s.locale, Math.round(T.tax / 1e6)))
            .replace("{H}", eur(s.locale, head))
            .replace("{G}", eur(s.locale, head - Math.round(T.tax / 1e6)))}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------- corporation -- */

function WhoCompany({ c, ...s }: Shared & { c?: CorpYear }) {
  if (!c || !c.total) return null;
  const row = (key: keyof CorpYear, lab: string) => {
    const d: CorpEntry | undefined = c[key];
    if (!d || d.profit == null) return null;
    return (
      <tr key={key}>
        <td>{lab}</td>
        <td className="colopt">{eur(s.locale, Math.round(d.profit))}</td>
        <td>{eur(s.locale, Math.round(d.base))}</td>
        <td>
          <b>{eur(s.locale, Math.round(d.tax))}</b>
        </td>
        <td>{d.rateBase != null ? nf(s.locale, d.rateBase, 1) + "%" : "—"}</td>
        <td className="colopt">{d.rateProfit != null ? nf(s.locale, d.rateProfit, 1) + "%" : "—"}</td>
      </tr>
    );
  };
  return (
    <table className="wtab">
      <thead>
        <tr>
          <th>
            {s.t.wCoType}
            <StaleTag text={s.stale} />
          </th>
          <th className="colopt">{s.t.wProfit}</th>
          <th>{s.t.wBase}</th>
          <th>{s.t.wTax}</th>
          <th>{s.t.wRateBase}</th>
          <th className="colopt">{s.t.wRateProfit}</th>
        </tr>
      </thead>
      <tbody>
        {row("groups", s.t.wGroups)}
        {row("standalone", s.t.wStandalone)}
        {row("total", s.t.wAllCo)}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------ social contributions ----- */

function WhoPayer({ o, ...s }: Shared & { o?: PayerYear }) {
  if (!o || !o.D61) return null;
  const D61 = o.D61;
  const rows: [string, string][] = [
    ["D611", s.t.wEmployer],
    ["D613CE", s.t.wEmployee],
    ["D613CS", s.t.wSelf],
    ["D613CN", s.t.wNonEmp],
    ["D612", s.t.wImputed],
    ["VOLUNTARY", s.t.wVoluntary],
  ];
  return (
    <table className="wtab">
      <thead>
        <tr>
          <th>
            {s.t.wPayer}
            <StaleTag text={s.stale} />
          </th>
          <th>{s.t.wAmount}</th>
          <th>{s.t.wShare}</th>
        </tr>
      </thead>
      <tbody>
        {rows
          .filter(([k]) => o[k] != null)
          .map(([k, lab]) => {
            const v = o[k] as number;
            return (
              <tr key={k}>
                <td>{lab}</td>
                <td>
                  <b>{eur(s.locale, v)}</b>
                </td>
                <td>
                  {nf(s.locale, (v / D61) * 100, 1)}%
                  <WBar width={(v / D61) * 100 * 1.4} />
                </td>
              </tr>
            );
          })}
        <tr className="tot">
          <td>{s.t.wAll}</td>
          <td>
            <b>{eur(s.locale, D61)}</b>
          </td>
          <td>100%</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------- AEAT excise & VAT -- */

/**
 * AEAT publishes excise by product and VAT by rate on its own accrued state
 * basis. Neither equals the ESA bucket in the headline, so each table carries
 * its own total and states the gap rather than being rescaled to fit.
 */
function AeatRows({
  o,
  labels,
  colHead,
  ...s
}: Shared & { o: AeatYear; labels: Record<string, string>; colHead: string }) {
  return (
    <table className="wtab">
      <thead>
        <tr>
          <th>
            {colHead}
            <StaleTag text={s.stale} />
          </th>
          <th>{s.t.wAmount}</th>
          <th>{s.t.wShare}</th>
        </tr>
      </thead>
      <tbody>
        {o.rows.map(([k, v]) => (
          <tr key={k}>
            <td>{labels[k] || k}</td>
            <td>
              <b>{eur(s.locale, v)}</b>
            </td>
            <td>
              {nf(s.locale, (v / o.total) * 100, 1)}%
              <WBar width={(v / o.total) * 100 * 1.4} />
            </td>
          </tr>
        ))}
        <tr className="tot">
          <td>
            {s.t.wAeatTot}
            {o.prov ? (
              <i style={{ fontStyle: "normal", color: "var(--am)" }}>
                {" "}
                · {s.t.wProv}
              </i>
            ) : null}
          </td>
          <td>
            <b>{eur(s.locale, o.total)}</b>
          </td>
          <td>100%</td>
        </tr>
      </tbody>
    </table>
  );
}

const esaOf = (y: YearKey, k: string): number | null => {
  const n = natParts[y];
  const v = n ? n[k] : undefined;
  return typeof v === "number" ? v : null;
};

function WhoProduct({
  o,
  W,
  k,
  ...s
}: Shared & { o?: AeatYear; W: Extract<WhoBlockData, { kind: "product" }>; k: string }) {
  if (!o || !o.rows) return null;
  const esa = esaOf(s.y, k);
  const labels = s.locale === "es" ? W.labES : W.labEN;
  return (
    <>
      <AeatRows o={o} labels={labels} colHead={s.t.wProduct} {...s} />
      {esa ? (
        <p
          className="who-note"
          dangerouslySetInnerHTML={{
            __html: s.t.wGapExcise
              .replace("{A}", eur(s.locale, o.total))
              .replace("{H}", eur(s.locale, esa))
              .replace("{G}", eur(s.locale, esa - o.total)),
          }}
        />
      ) : null}
    </>
  );
}

function WhoRate({
  o,
  W,
  k,
  ...s
}: Shared & { o?: VatYear; W: Extract<WhoBlockData, { kind: "rate" }>; k: string }) {
  if (!o || !o.rows) return null;
  const esa = esaOf(s.y, k);
  const labels = s.locale === "es" ? W.labES : W.labEN;
  return (
    <>
      <AeatRows o={o} labels={labels} colHead={s.t.wVatRate} {...s} />
      <p
        className="who-note"
        dangerouslySetInnerHTML={{
          __html: s.t.wGapVat
            .replace("{A}", eur(s.locale, o.total))
            .replace("{SP}", eur(s.locale, o.special))
            .replace("{F}", eur(s.locale, o.foral))
            .replace("{O}", eur(s.locale, o.adjOther))
            .replace("{T}", eur(s.locale, o.accrued))
            .replace("{H}", esa ? eur(s.locale, esa) : "—"),
        }}
      />
    </>
  );
}

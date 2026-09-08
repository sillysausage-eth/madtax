"use client";

import type { Dict, Locale } from "@/i18n";
import { eur, nf, nf0 } from "@/lib/format";
import { natParts } from "@/data/revenue";
import { who } from "@/data/who";
import type {
  AeatYear,
  CorpBracket,
  CorpBracketYear,
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
  WBar,
  WTabs,
  type Tab,
  type WhoSort,
} from "./WhoPaysTable";
import { ProvTag } from "./Dossier";

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

/* The tab key lives with the table primitives, beside the tab strip. */
export type { Tab };

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

  /* No published breakdown for the year on screen: say so, in its place. The
     block never shows another year's figures under this year's headline. */
  const yrs = Object.keys(S).sort();
  if (!S[year]) {
    return (
      <WhoPending
        t={t}
        locale={locale}
        year={year}
        first={yrs[0]}
        last={yrs[yrs.length - 1]}
        due={W.nextRelease}
      />
    );
  }
  const y = year;

  const shared = { locale, t, year, sort, onSort };

  let body: React.ReactNode = null;
  if (W.kind === "brackets") {
    body = <WhoIrpf {...shared} dec={W.deciles[y]} tab={tab} onTab={onTab} />;
  } else if (W.kind === "company") {
    body = <WhoCompany {...shared} c={W.years[y]} tab={tab} onTab={onTab} />;
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
  /** The year on screen, which the series is known to carry. */
  year: YearKey;
  sort: WhoSort;
  onSort: (col: string) => void;
}

/** The headline this section sits under, for the coverage note. */
const headlineIrpf = (year: YearKey): number | null => {
  const n = natParts[year];
  const v = n ? n.irpf : undefined;
  return typeof v === "number" ? v : null;
};

/**
 * What stands where a table would, for a year the source has not published.
 * The message states the gap and, where the publisher has announced the next
 * edition, when it is due — never a neighbouring year's figures.
 */
function WhoPending({
  t,
  locale,
  year,
  first,
  last,
  due,
}: {
  t: Dict;
  locale: Locale;
  year: YearKey;
  first: YearKey;
  last: YearKey;
  due?: string;
}) {
  const before = year < first;
  let text: string;
  if (before) {
    text = t.whoPendingBefore.replace("{F}", first).replace("{Y}", year);
  } else {
    /* `due` is "YYYY-MM"; written as the reader's month name and year. */
    const when = due
      ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
          month: "long",
          year: "numeric",
        }).format(new Date(Number(due.slice(0, 4)), Number(due.slice(5, 7)) - 1, 1))
      : null;
    text = (when ? t.whoPendingDue : t.whoPendingNoDate)
      .replace("{Y}", year)
      .replace("{L}", last)
      .replace("{D}", when ?? "");
  }
  return (
    <div className="who who-pending" role="status">
      <span className="who-pending-h">{before ? t.whoPendingBeforeH : t.whoPendingH}</span>
      <p>{text}</p>
    </div>
  );
}


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
      <WTabs tabs={tabs} tab={tab} onTab={onTab} />
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

/**
 * AEAT's consolidated corporate tax statistic, by annual turnover bracket. A tax
 * group filing a consolidated return counts once; a company outside a group
 * counts once. AEAT publishes seventeen brackets and nothing finer by size — no
 * deciles by profit, no names — so the two cuts here are those brackets merged
 * into seven bands, and, for the largest filers, each top bracket opened up by
 * the five sectors AEAT crosses it with. Every figure is published: the merges
 * are exact sums of published rows and each effective rate is the published tax
 * over the published profit.
 */

/** Turnover cuts (thousands of €) that merge the seventeen brackets into seven bands. */
const BAND_CUTS = [50, 300, 1000, 10000, 100000, 1000000];
/** Brackets from this turnover (thousands of €) up are opened up one by one. */
const TOP_FROM = 100000;
/** AEAT's five sector groupings, in the order it publishes them. */
const SECTORS = ["ind", "con", "com", "fin", "srv"] as const;

/** A line in the corporate table: a turnover band, or a sector inside one. */
interface CoRow {
  key: string;
  label: string;
  /** A sector inside the band above it. */
  sub?: boolean;
  n: number;
  profit: number;
  /** Absent where AEAT withholds the cell under statistical secrecy. */
  tax: number | null;
}

const sumBy = (rows: CorpBracket[], f: "n" | "profit" | "tax") =>
  rows.reduce((a, r) => a + r[f], 0);

/**
 * Merge brackets at the given cuts. A bracket straddling a cut cannot be split,
 * so the merge is refused — the filer count would no longer add up — rather than
 * apportioned.
 */
function mergeBrackets(
  rows: CorpBracket[],
  cuts: number[],
): { lo: number; hi: number | null; part: CorpBracket[] }[] | null {
  const edges: (number | null)[] = [0, ...cuts, null];
  const out: { lo: number; hi: number | null; part: CorpBracket[] }[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const lo = edges[i] as number;
    const hi = edges[i + 1];
    const part = rows.filter(
      (r) => r.lo >= lo && (hi === null ? true : r.hi !== null && r.hi <= hi),
    );
    if (!part.length) return null;
    out.push({ lo, hi, part });
  }
  if (out.reduce((a, g) => a + sumBy(g.part, "n"), 0) !== sumBy(rows, "n")) return null;
  return out;
}

/** The headline this section sits under, for the coverage note. */
const headlineCorp = (year: YearKey): number | null => {
  const n = natParts[year];
  const v = n ? n.corp : undefined;
  return typeof v === "number" ? v : null;
};

function WhoCompany({
  c,
  tab,
  onTab,
  ...s
}: Shared & { c?: CorpBracketYear; tab: Tab; onTab: (t: Tab) => void }) {
  /* The tab state is shared with the income-tax block, which has a third cut. */
  const mode: Tab = tab === "top" ? "top" : "dec";
  const tabs: [Tab, string][] = [
    ["dec", s.t.tabCoBr],
    ["top", s.t.tabCoTop],
  ];
  return (
    <>
      <WTabs tabs={tabs} tab={mode} onTab={onTab} />
      {c ? <CoView c={c} mode={mode} {...s} /> : null}
    </>
  );
}

function CoView({ c, mode, ...s }: Shared & { c: CorpBracketYear; mode: Tab }) {
  const T = c.total;
  /* Bounds are thousands of euros; eur() takes millions. */
  const money = (k: number) => eur(s.locale, k / 1000);
  const band = (lo: number, hi: number | null) =>
    lo === 0
      ? s.t.wUpToV.replace("{V}", money(hi as number))
      : hi === null
        ? s.t.wOverV.replace("{V}", money(lo))
        : money(lo) + " – " + money(hi);

  let rows: CoRow[] | null = null;
  /* True where a sector cell in view is withheld, so the note can say so. */
  let withheld = false;

  if (mode === "top") {
    const tops = c.rows.filter((r) => r.lo >= TOP_FROM);
    const rest = c.rows.filter((r) => r.hi !== null && r.hi <= TOP_FROM);
    if (tops.length && rest.length + tops.length === c.rows.length) {
      rows = [];
      for (const r of [...tops].reverse()) {
        rows.push({
          key: `b${r.lo}`,
          label: band(r.lo, r.hi),
          n: r.n,
          profit: r.profit,
          tax: r.tax,
        });
        const sec = SECTORS.map((k) => ({ k, v: r.sectors[k] })).filter((x) => x.v);
        /* Largest contributor first; a withheld cell sorts to the bottom. */
        sec.sort((a, b) => (b.v.tax ?? -1) - (a.v.tax ?? -1));
        for (const { k, v } of sec) {
          if (v.tax === null) withheld = true;
          rows.push({
            key: `b${r.lo}-${k}`,
            label: s.t.wSec[k],
            sub: true,
            n: v.n,
            profit: v.profit,
            tax: v.tax,
          });
        }
      }
      rows.push({
        key: "rest",
        label: band(0, TOP_FROM),
        n: sumBy(rest, "n"),
        profit: sumBy(rest, "profit"),
        tax: sumBy(rest, "tax"),
      });
    }
  } else {
    const bands = mergeBrackets(c.rows, BAND_CUTS);
    rows =
      bands?.map((g) => ({
        key: `b${g.lo}`,
        label: band(g.lo, g.hi),
        n: sumBy(g.part, "n"),
        profit: sumBy(g.part, "profit"),
        tax: sumBy(g.part, "tax"),
      })) ?? null;
  }
  if (!rows) return null;

  const share = (tax: number | null) => (tax === null ? null : (tax / T.tax) * 100);
  const rate = (tax: number | null, profit: number) =>
    tax === null || profit <= 0 ? "—" : nf(s.locale, (tax / profit) * 100, 1) + "%";
  const maxShare = Math.max(
    ...rows.filter((r) => !r.sub).map((r) => share(r.tax) ?? 0),
  );
  const head = headlineCorp(s.year);

  return (
    <>
      <table className="wtab">
        <thead>
          <tr>
            <th>{s.t.wTurnover}</th>
            <th>{s.t.wCompanies}</th>
            <th className="colopt">{s.t.wProfit}</th>
            <th>{s.t.wTax}</th>
            <th>{s.t.wShare}</th>
            <th>{s.t.wRateProfit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sh = share(r.tax);
            return (
              <tr key={r.key} className={r.sub ? "sub" : undefined}>
                <td>{r.label}</td>
                <td>{nf0(s.locale, r.n)}</td>
                <td className="colopt">{eur(s.locale, r.profit)}</td>
                <td>{r.tax === null ? "—" : <b>{eur(s.locale, r.tax)}</b>}</td>
                <td>
                  {sh === null ? "—" : nf(s.locale, sh, 1) + "%"}
                  {sh !== null && !r.sub ? <WBar width={(sh / maxShare) * 46} /> : null}
                </td>
                <td>{rate(r.tax, r.profit)}</td>
              </tr>
            );
          })}
          <tr className="tot">
            <td>{s.t.wTotalRow}</td>
            <td>{nf0(s.locale, T.n)}</td>
            <td className="colopt">{eur(s.locale, T.profit)}</td>
            <td>
              <b>{eur(s.locale, T.tax)}</b>
            </td>
            <td>100%</td>
            <td>{rate(T.tax, T.profit)}</td>
          </tr>
        </tbody>
      </table>
      {head != null ? (
        <InfoNote
          html={s.t.wGapCorp
            .replace("{R}", eur(s.locale, Math.round(T.tax)))
            .replace("{H}", eur(s.locale, head))
            .replace("{G}", eur(s.locale, head - Math.round(T.tax)))}
        />
      ) : null}
      <InfoNote html={s.t.wCorpTurn} />
      {withheld ? <InfoNote html={s.t.wCorpSE} /> : null}
      <InfoNote
        html={(mode === "top" ? s.t.wCorpPubTop : s.t.wCorpPub).replace(
          "{N}",
          nf0(s.locale, c.rows[c.rows.length - 1].n),
        )}
      />
    </>
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
            {o.prov ? <ProvTag badge={s.t.provB} text={s.t.provAeat} /> : null}
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
  const esa = esaOf(s.year, k);
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
  const esa = esaOf(s.year, k);
  const labels = s.locale === "es" ? W.labES : W.labEN;
  return (
    <>
      <AeatRows o={o} labels={labels} colHead={s.t.wVatRate} {...s} />
      <InfoNote
        html={s.t.wGapVat
          .replace("{A}", eur(s.locale, o.total))
          .replace("{SP}", eur(s.locale, o.special))
          .replace("{F}", eur(s.locale, o.foral))
          .replace("{O}", eur(s.locale, o.adjOther))
          .replace("{T}", eur(s.locale, o.accrued))
          .replace("{H}", esa ? eur(s.locale, esa) : "—")}
      />
    </>
  );
}

import { dict, type Locale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import {
  DEBT_HOLD_C,
  DEBT_INSTR_C,
  DEBT_INSTR_FALLBACK,
  DEBT_TIER_C,
  TIERS,
  TREND,
  debtTrend,
  markLabelX,
} from "@/lib/debt";
import { debt } from "@/data/debt";
import type { Dict } from "@/i18n";
import type { CodedRow } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import Donut, { type DonutSlice } from "./Donut";

/**
 * The debt console, ported from the prototype's `paintDebt()`.
 *
 * A stock, not a flow. Everything on this screen describes what is owed on one
 * reference date, which is why it carries no fiscal year and the year picker is
 * absent rather than inert — and why the arrow keys do nothing here: there is no
 * year to step through and nothing to select. The four sources behind it are
 * published on different clocks, so every panel states its own date instead of
 * implying a shared one.
 *
 * Nothing on this screen is interactive, so it is a server component: the page
 * ships the figures as HTML and no JavaScript at all.
 */
export default function DebtConsole({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const X = t.dbt;
  const B = debt;
  const ref = B.ref;
  const total = B.total[ref];
  const pc = B.pcGdp[ref];

  const tierL = (c: keyof typeof X.tier) => X.tier[c] || c;
  const instrL = (c: string) => X.instr[c as keyof typeof X.instr] || c;

  const iRec = B.interest[ref];
  const cost = B.cost;
  const mat = B.maturity;

  /* ---- hero + the five headline stats ------------------------------------- */
  /* Two of them are interest rates and they answer different questions: what the
     debt already outstanding costs, and what it costs to borrow now. */
  const stats: { k: string; v: string; n: string; none?: boolean }[] = [
    { k: X.sInt, v: eur(locale, iRec?.total), n: X.sIntN.replace("{Y}", ref) },
    {
      k: X.sIntGdp,
      v: B.intPcGdp && B.intPcGdp[ref] != null ? nf(locale, B.intPcGdp[ref], 1) + "%" : "—",
      n: X.sIntGdpN.replace("{Y}", ref),
    },
    mat && mat.avgLife != null
      ? {
          k: X.sLife,
          v: nf(locale, mat.avgLife, 2) + " " + X.sYears,
          n: X.sLifeN + " · " + (mat.avgLifeAsOf || mat.asOf || ""),
        }
      : { k: X.sLife, v: X.noPub, n: X.sLifeN, none: true },
    cost && cost.avgCost != null
      ? {
          k: X.sCost,
          v: nf(locale, cost.avgCost, 2) + "%",
          n: X.sCostN + " · " + (cost.asOf || ""),
        }
      : { k: X.sCost, v: X.noPub, n: X.sCostN, none: true },
    cost && cost.avgCostNew != null
      ? {
          k: X.sCostNew,
          v: nf(locale, cost.avgCostNew, 2) + "%",
          n: X.sCostNewN + " · " + (cost.asOf || ""),
        }
      : { k: X.sCostNew, v: X.noPub, n: X.sCostNewN, none: true },
  ];

  /* ---- who owes it: tiers, carried gross with the elimination named -------- */
  const T = B.tier[ref];
  const tierRows: DonutSlice[] = T
    ? TIERS.map((s) => ({ k: s, nm: tierL(s), v: T[s], c: DEBT_TIER_C[s] })).filter(
        (r) => r.v != null,
      )
    : [];

  /* ---- what form: the instrument split is an exact partition of the total -- */
  const instr = B.instr[ref] || [];
  const instrRows: DonutSlice[] = instr.map(([c, v]: CodedRow) => ({
    k: c,
    nm: instrL(c),
    v,
    c: DEBT_INSTR_C[c] || DEBT_INSTR_FALLBACK,
  }));

  /* ---- who holds it: only if a published holder split is in the bundle ----- */
  const holders = B.holders;
  const holdRows: DonutSlice[] =
    holders && holders.rows
      ? holders.rows.map(([k, v]: CodedRow, i: number) => ({
          k,
          nm: (locale === "es" ? holders.labES : holders.labEN)[k] || k,
          v,
          c: DEBT_HOLD_C[i % DEBT_HOLD_C.length],
        }))
      : [];

  /* ---- what it costs: the same tiers, before consolidating ---------------- */
  const intRows: DonutSlice[] = iRec
    ? TIERS.flatMap((s) => {
        const v = iRec[s];
        return v != null && v !== 0
          ? [{ k: s as string, nm: tierL(s), v, c: DEBT_TIER_C[s] }]
          : [];
      })
    : [];
  const intGross = iRec ? (iRec.gross != null ? iRec.gross : iRec.total) : 0;

  const trend = debtTrend(B.years, B.pcGdp);

  return (
    <>
      {/* No year picker: debt is a stock on a reference date, so the control
          would have nothing to control. */}
      <div className="debtscreen">
        <div className="dhero">
          <div className="k">{X.heroK}</div>
          <div className="fig">
            <span className="big">{eur(locale, total)}</span>
            <span className="pc">
              {pc != null ? `${nf(locale, pc, 1)}% ${X.ofGdp}` : ""}
            </span>
            <span className="asof">{X.asOf.replace("{Y}", ref)}</span>
          </div>
        </div>

        <div className="dstats">
          {stats.map((s) => (
            <div className="dstat" key={s.k}>
              <span className="sk">{s.k}</span>
              <div className={s.none ? "sv none" : "sv"}>{s.v}</div>
              <span className="sn">{s.n}</span>
            </div>
          ))}
        </div>

        {trend ? <DebtTrend model={trend} locale={locale} X={X} /> : null}

        <div className="dsec">
          <div className="dsec-h">
            <span className="t">{X.secShape}</span>
            <span className="x">
              {X.scopeGG} · {ref}
            </span>
          </div>
          <div className="dring">
            {T ? (
              <DebtCard head={X.qWho} sub={X.qWhoS}>
                <Donut
                  rows={tierRows}
                  total={T.gross}
                  floor={0.7}
                  absShares
                  variant="card"
                  centre={eur(locale, T.gross)}
                  aria={`${X.qWho} ${eur(locale, T.gross)}`}
                  locale={locale}
                />
                {/* The four tiers add to more than the headline. The difference is
                    one tier's debt held by another, and it is named rather than
                    rescaled away. */}
                <div className="dnote">
                  <b>{X.elimTag}</b> —{" "}
                  <Interpolated
                    text={X.elimTxt}
                    values={{
                      G: eur(locale, T.gross),
                      C: eur(locale, T.consolidated),
                      E: eur(locale, T.elim),
                    }}
                  />
                </div>
              </DebtCard>
            ) : null}

            <DebtCard head={X.qForm} sub={X.qFormS}>
              <Donut
                rows={instrRows}
                total={total}
                floor={0.7}
                absShares
                variant="card"
                centre={eur(locale, total)}
                aria={`${X.qForm} ${eur(locale, total)}`}
                locale={locale}
              />
            </DebtCard>

            {holdRows.length && holders ? (
              <DebtCard head={X.qHold} sub={X.qHoldS}>
                <Donut
                  rows={holdRows}
                  total={holders.total}
                  floor={0.7}
                  absShares
                  variant="card"
                  centre={eur(locale, holders.total)}
                  aria={`${X.qHold} ${eur(locale, holders.total)}`}
                  locale={locale}
                />
                {holders.note ? (
                  <div className="dnote">
                    {(locale === "es" ? holders.noteES : holders.noteEN) || ""}
                  </div>
                ) : null}
              </DebtCard>
            ) : (
              <GapCard head={X.qHold} sub={X.qHoldS} tag={X.gapTag} text={X.gapHold} />
            )}
          </div>
        </div>

        {mat && mat.rows && mat.rows.length ? (
          <MaturityLadder rows={mat.rows} locale={locale} X={X} asOf={mat.asOf}
            avgLife={mat.avgLife}
            laddered={
              mat.totalLaddered != null
                ? mat.totalLaddered
                : mat.rows.reduce((a: number, r: CodedRow) => a + r[1], 0)
            }
          />
        ) : (
          <div className="dsec">
            <div className="dsec-h">
              <span className="t">{X.secMat}</span>
              <span className="q">{X.qMat}</span>
            </div>
            <div className="dgap">
              <span className="tag">{X.gapTag}</span>
              {X.gapMat}
            </div>
          </div>
        )}

        {iRec && iRec.total != null ? (
          <div className="dsec">
            <div className="dsec-h">
              <span className="t">{X.secInt}</span>
              <span className="q">{X.qInt.replace("{Y}", ref)}</span>
              <span className="x">{X.scopeGG}</span>
            </div>
            <div className="dring">
              {/* Eurostat can publish a consolidated interest total before the
                  per-tier split lands. Rather than draw an empty ring, the card
                  says the split is not out yet and the headline stands. */}
              {intRows.length ? (
                <DebtCard head={X.qIntWho} sub={X.qIntWhoS}>
                  <Donut
                    rows={intRows}
                    total={intGross}
                    floor={0.7}
                    absShares
                    variant="card"
                    centre={eur(locale, intGross)}
                    aria={`${X.qIntWho} ${eur(locale, intGross)}`}
                    locale={locale}
                  />
                  {iRec.elim != null && iRec.elim !== 0 ? (
                    <div className="dnote">
                      <b>{X.elimIntTag}</b> —{" "}
                      <Interpolated
                        text={X.elimIntTxt}
                        values={{
                          G: eur(locale, intGross),
                          C: eur(locale, iRec.total),
                          E: eur(locale, iRec.elim),
                        }}
                      />
                    </div>
                  ) : null}
                </DebtCard>
              ) : (
                <GapCard
                  head={X.qIntWho}
                  sub={X.qIntWhoS}
                  tag={X.gapTag}
                  text={X.gapIntSplit}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <ConsoleFooter source={X.foot1} perimeter={X.foot2} build={t.foot3} />
    </>
  );
}

/* ------------------------------------------------------------------ parts -- */

function DebtCard({
  head,
  sub,
  children,
}: {
  head: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dcard">
      <div className="ch">{head}</div>
      <div className="cq">{sub}</div>
      {children}
    </div>
  );
}

/** A gap we cannot fill from a published source, stated in place, never left blank. */
function GapCard({
  head,
  sub,
  tag,
  text,
}: {
  head: string;
  sub: string;
  tag: string;
  text: string;
}) {
  return (
    <div className="dcard">
      <div className="ch">{head}</div>
      <div className="cq">{sub}</div>
      <div className="dgap">
        <span className="tag">{tag}</span>
        {text}
      </div>
    </div>
  );
}

/**
 * The dictionary's `{G}` / `{C}` / `{E}` placeholders and its `<b>` emphasis,
 * rendered as elements rather than as markup: the strings are the prototype's,
 * but nothing here goes near `dangerouslySetInnerHTML`.
 */
function Interpolated({
  text,
  values,
}: {
  text: string;
  values: Record<string, string>;
}) {
  const parts = text.split(/(<b>|<\/b>|\{[GCE]\})/g);
  const out: React.ReactNode[] = [];
  let bold = false;
  let buffer: string[] = [];
  const flush = (key: string) => {
    if (!buffer.length) return;
    const s = buffer.join("");
    buffer = [];
    out.push(bold ? <b key={key}>{s}</b> : <span key={key}>{s}</span>);
  };
  parts.forEach((p, i) => {
    if (p === "<b>") {
      flush(`f${i}`);
      bold = true;
    } else if (p === "</b>") {
      flush(`f${i}`);
      bold = false;
    } else if (/^\{[GCE]\}$/.test(p)) {
      buffer.push(values[p.slice(1, 2)] ?? p);
    } else if (p) {
      buffer.push(p);
    }
  });
  flush("fend");
  return <>{out}</>;
}

/**
 * Debt as a share of GDP, every year Eurostat publishes it. A debt screen with no
 * history invites the reader to assume the number has always been what it is now.
 *
 * The three labelled points are the ones the axis cannot show: the series low, the
 * series high and the latest reading.
 */
function DebtTrend({
  model,
  locale,
  X,
}: {
  model: NonNullable<ReturnType<typeof debtTrend>>;
  locale: Locale;
  X: Dict["dbt"];
}) {
  const { W, H, PL, PR, PB } = TREND;
  /* Text inside an SVG scales with the canvas, so the prototype's 3.4px point
     labels read at 13px on a desktop and at 4px on a phone. The line and the
     shading stay SVG; the three labels are HTML pinned over it at percentage
     coordinates, so the chart can run the full width of the panel and the labels
     keep one legible size at every width. */
  const pin = (v: number, a: number, b: number) => `${((v - a) / b) * 100}%`;
  return (
    <div className="dtrend">
      <div className="th">
        <span className="t">{X.trendK}</span>
        <span className="x">
          {model.first}–{model.last} · {X.trendSrc}
        </span>
      </div>
      <div className="plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${X.trendK} ${model.first}-${model.last}`}
        >
          <line className="gl" x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} />
          <path className="ar" d={model.area} />
          <path className="ln" d={model.line} />
          {model.marks.map((m) => (
            <circle
              key={m.year}
              className="pt"
              cx={m.x.toFixed(2)}
              cy={m.y.toFixed(2)}
              r="1.1"
            />
          ))}
        </svg>
        {model.marks.map((m) => (
          <span
            key={m.year}
            className={`mk ${m.anchor}`}
            style={{ left: pin(markLabelX(m), 0, W), top: pin(m.y, 0, H) }}
          >
            <b className="lb">{nf(locale, m.value, 1)}%</b>
            <i className="lbm">{m.year}</i>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * What falls due each year, at face value. A stock falling due over time is a
 * timeline, so it stays bars — one per year the calendar has, out past 2070.
 * The years beyond the first decade take the dimmer fill: they are the same fact
 * at a different distance, not a lesser one.
 */
function MaturityLadder({
  rows,
  locale,
  X,
  asOf,
  avgLife,
  laddered,
}: {
  rows: CodedRow[];
  locale: Locale;
  X: Dict["dbt"];
  asOf: string;
  avgLife: number | null;
  laddered: number;
}) {
  const peak = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="dsec">
      <div className="dsec-h">
        <span className="t">{X.secMat}</span>
        <span className="q">
          {X.qMat}
          {avgLife != null ? " · " + X.matAvg.replace("{V}", nf(locale, avgLife, 2)) : ""}
        </span>
        <span className="x">
          {eur(locale, laddered)} · {X.scopeState} · {asOf || ""}
        </span>
      </div>
      <div className="mat">
        {rows.map(([yr, v], i) => (
          <div className={i >= 10 ? "matr far" : "matr"} key={yr}>
            <span className="my">{yr}</span>
            <span className="mt">
              <span className="mf" style={{ width: `${Math.max(0.6, (v / peak) * 100)}%` }} />
            </span>
            <span className="mv">{eur(locale, v)}</span>
          </div>
        ))}
      </div>
      <div className="dnote">{X.matNote}</div>
    </div>
  );
}

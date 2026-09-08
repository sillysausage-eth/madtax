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
  matBuckets,
} from "@/lib/debt";
import { debt } from "@/data/debt";
import type { Dict } from "@/i18n";
import type { CodedRow } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import DebtBreakdown, { type DebtView } from "./DebtBreakdown";
import type { DonutSlice } from "./Donut";

/**
 * The debt console.
 *
 * A stock, not a flow. Everything on this screen describes what is owed on one
 * reference date, which is why it carries no fiscal year and the year picker is
 * absent rather than inert. The four sources behind it are published on
 * different clocks, so every block states its own date instead of implying a
 * shared one.
 *
 * The screen is the headline, the five figures that qualify it, the stock over
 * time, and one block that answers four questions about the shape of it — one
 * at a time, because the reader asks one at a time. M3 laid all four out at
 * once and put two rings of the same four government tiers on the page; the
 * tier split of the interest bill is gone with them, and the interest bill
 * itself is where it belongs, in the headline figures.
 *
 * Everything above the block renders on the server. The block is the only
 * interactive thing here, so it is the only JavaScript the route ships.
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

  const views: DebtView[] = [];

  /* ---- who owes it -------------------------------------------------------- */
  /* The four tiers add to the gross stock, which is €363bn more than the
     headline. The ring says so in the middle rather than showing a figure that
     silently contradicts the one at the top of the screen, and the note names
     the difference. Neither number is rescaled to make them tie. */
  const T = B.tier[ref];
  if (T) {
    const rows: DonutSlice[] = TIERS.map((s) => ({
      k: s,
      nm: tierL(s),
      v: T[s],
      c: DEBT_TIER_C[s],
    })).filter((r) => r.v != null);
    views.push({
      k: "who",
      tab: X.tWho,
      sub: X.qWhoS,
      scope: `${X.scopeGG} · ${ref}`,
      ring: {
        rows,
        total: T.gross,
        centre: eur(locale, T.gross),
        centreSub: X.beforeCons,
      },
      noteTag: X.elimTag,
      note: X.elimTxt
        .replace("{G}", eur(locale, T.gross))
        .replace("{C}", eur(locale, T.consolidated))
        .replace("{E}", eur(locale, T.elim)),
    });
  }

  /* ---- what form: an exact partition of the headline total ---------------- */
  const instr = B.instr[ref] || [];
  views.push({
    k: "form",
    tab: X.tForm,
    sub: X.qFormS,
    scope: `${X.scopeGG} · ${ref}`,
    ring: {
      rows: instr.map(([c, v]: CodedRow) => ({
        k: c,
        nm: instrL(c),
        v,
        c: DEBT_INSTR_C[c] || DEBT_INSTR_FALLBACK,
      })),
      total,
      centre: eur(locale, total),
    },
  });

  /* ---- who holds it: only if a published holder split is in the bundle ---- */
  const holders = B.holders;
  views.push(
    holders && holders.rows
      ? {
          k: "hold",
          tab: X.tHold,
          sub: X.qHoldS,
          scope: `${X.scopeGG} · ${holders.asOf}`,
          ring: {
            rows: holders.rows.map(([k, v]: CodedRow, i: number) => ({
              k,
              nm: (locale === "es" ? holders.labES : holders.labEN)[k] || k,
              v,
              c: DEBT_HOLD_C[i % DEBT_HOLD_C.length],
            })),
            total: holders.total,
            centre: eur(locale, holders.total),
          },
          note: holders.note
            ? (locale === "es" ? holders.noteES : holders.noteEN) || undefined
            : undefined,
        }
      : {
          k: "hold",
          tab: X.tHold,
          sub: X.qHoldS,
          scope: X.scopeGG,
          gapTag: X.gapTag,
          gap: X.gapHold,
        },
  );

  /* ---- when it falls due -------------------------------------------------- */
  /* A narrower perimeter than every other view: State debt securities, not all
     of government. The scope line carries its own total for that reason. */
  /* The periods are cut from the calendar's own reference date, so a calendar
     with no usable date folds into nothing — and a calendar that folds into
     nothing is a gap, stated as one, not an empty chart. */
  const periods = mat && mat.rows ? matBuckets(mat.rows, mat.asOf) : [];
  if (mat && periods.length) {
    const laddered =
      mat.totalLaddered != null
        ? mat.totalLaddered
        : mat.rows.reduce((a: number, r: CodedRow) => a + r[1], 0);
    views.push({
      k: "mat",
      tab: X.tMat,
      sub: X.qMat,
      scope: `${eur(locale, laddered)} · ${X.scopeState} · ${mat.asOf || ""}`,
      periods: periods.map((b) => ({
        k: b.k,
        label:
          b.to == null
            ? X.matLater.replace("{A}", b.from)
            : b.to === b.from
              ? X.matRest.replace("{A}", b.from)
              : X.matRange.replace("{A}", b.from).replace("{B}", b.to),
        v: b.v,
        years: b.rows.map(([y, v]) => [y, v] as [string, number]),
      })),
      note: X.matNote,
    });
  } else {
    views.push({
      k: "mat",
      tab: X.tMat,
      sub: X.qMat,
      scope: X.scopeState,
      gapTag: X.gapTag,
      gap: X.gapMat,
    });
  }

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

        <DebtBreakdown title={X.secShape} views={views} locale={locale} />
      </div>

      <ConsoleFooter source={X.foot1} perimeter={X.foot2} build={t.foot3} />
    </>
  );
}

/* ------------------------------------------------------------------ parts -- */

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

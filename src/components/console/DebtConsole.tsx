import { dict, type Locale } from "@/i18n";
import { eur } from "@/lib/format";
import {
  DEBT_HOLD_C,
  DEBT_INSTR_C,
  DEBT_INSTR_FALLBACK,
} from "@/lib/debt";
import { debt } from "@/data/debt";
import type { CodedRow } from "@/lib/types";
import ConsoleFooter from "./ConsoleFooter";
import DebtBreakdown, { type DebtView } from "./DebtBreakdown";
import DebtOverview from "./DebtOverview";
import type { TrendPoint } from "./DebtTrend";

/**
 * The debt console.
 *
 * A stock, not a flow. Everything on this screen describes what is owed on one
 * reference date, which is why it carries no fiscal year and the year picker is
 * absent rather than inert. The sources behind it are published on different
 * clocks, so every block states its own date instead of implying a shared one.
 *
 * The screen is the headline, the chart the headline is read off, and one
 * block that answers three questions about the shape of it — one at a time,
 * because the reader asks one at a time.
 *
 * Every figure on it is a figure of the same consolidated stock. The tier split
 * that M3 opened on is gone: the four levels of government add to €2,061.1bn
 * only because €362.9bn of it is one level's debt held by another, and a ring
 * whose total is €363bn larger than the headline is a chart of a double count
 * however carefully it is captioned.
 *
 * The headline moves with the chart, so it and the block are the route's only
 * JavaScript.
 */
export default function DebtConsole({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const X = t.dbt;
  const B = debt;
  const ref = B.ref;
  const total = B.total[ref];

  const instrL = (c: string) => X.instr[c as keyof typeof X.instr] || c;

  const mat = B.maturity;

  /* ---- what the chart reads ---------------------------------------------- */
  /* The stock, its share of GDP and the interest bill are all published for
     every year Eurostat has, so all three follow the chart. */
  const points: TrendPoint[] = B.years
    .filter((y) => B.pcGdp[y] != null && B.total[y] != null)
    .map((y) => ({
      year: y,
      v: B.pcGdp[y],
      total: B.total[y],
      interest: B.interest[y]?.total ?? null,
    }));

  const views: DebtView[] = [];

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
  /* A narrower perimeter than the other two views: State debt securities, not
     all of government. The scope line names that perimeter and its date but
     carries no total: a second euro figure of this size next to the headline
     reads as a rival measure of the same stock rather than a part of it, and
     `matNote` already states what the ladder leaves out. */
  views.push(
    mat && mat.rows && mat.rows.length
      ? {
          k: "mat",
          tab: X.tMat,
          sub: X.qMat,
          scope: `${X.scopeState} · ${mat.asOf || ""}`,
          calendar: mat.rows.map(([y, v]) => [y, v] as [string, number]),
          note: X.matNote,
        }
      : {
          k: "mat",
          tab: X.tMat,
          sub: X.qMat,
          scope: X.scopeState,
          gapTag: X.gapTag,
          gap: X.gapMat,
        },
  );

  return (
    <>
      <div className="debtscreen">
        <DebtOverview points={points} refYear={ref} locale={locale} X={X} />

        <DebtBreakdown title={X.secShape} views={views} locale={locale} />
      </div>

      <ConsoleFooter mode="debt" locale={locale} />
    </>
  );
}

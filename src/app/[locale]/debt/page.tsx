import { notFound } from "next/navigation";
import { LOCALES, dict, isLocale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import { debt } from "@/data/debt";
import { DEBT_ENABLED } from "@/lib/flags";
import HeroStat from "@/components/console/HeroStat";
import ModeBar from "@/components/console/ModeBar";
import ConsoleFooter from "@/components/console/ConsoleFooter";
import PendingConsole from "@/components/console/PendingConsole";

/* Nothing is prerendered while the screen is switched off, and the page itself
   404s, so the route cannot be reached by guessing the URL either. */
export function generateStaticParams() {
  return DEBT_ENABLED ? LOCALES.map((locale) => ({ locale })) : [];
}

export default async function DebtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !DEBT_ENABLED) notFound();
  const t = dict(locale);
  const X = t.dbt;

  /* Debt is a stock: one date, no fiscal-year picker. Every figure below is
     published — the debt/GDP and interest/GDP ratios come from Eurostat as
     ratios and are not recomputed here. */
  const ref = debt.ref;
  const total = debt.total[ref];
  const pcGdp = debt.pcGdp[ref];
  const interest = debt.interest[ref];

  /* Debt is a stock on a reference date, not a fiscal-year flow: the mode bar
     carries no year picker, because it would be a control with nothing to
     control. */
  return (
    <>
      <ModeBar
        locale={locale}
        labels={{ revenue: t.modeRev, spending: t.modeExp, debt: t.modeDebt }}
      />
      <div className="hero">
        <HeroStat
          k={X.heroK}
          v={eur(locale, total)}
          s={X.asOf.replace("{Y}", ref)}
          accent="cy"
        />
        <HeroStat
          k={X.ofGdp}
          v={pcGdp != null ? `${nf(locale, pcGdp, 1)}%` : "—"}
          s={X.asOf.replace("{Y}", ref)}
        />
        <HeroStat
          k={X.sInt}
          v={eur(locale, interest?.total)}
          s={X.sIntN.replace("{Y}", ref)}
        />
      </div>
      <PendingConsole locale={locale} title={X.secShape} />
      <ConsoleFooter source={X.foot1} perimeter={X.foot2} build={t.foot3} />
    </>
  );
}

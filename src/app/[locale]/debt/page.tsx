import { notFound } from "next/navigation";
import { LOCALES, dict, isLocale } from "@/i18n";
import { eur, nf } from "@/lib/format";
import { debt } from "@/data/debt";
import HeroStat from "@/components/console/HeroStat";
import PendingConsole from "@/components/console/PendingConsole";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function DebtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);
  const X = t.dbt;

  /* Debt is a stock: one date, no fiscal-year picker. Every figure below is
     published — the debt/GDP and interest/GDP ratios come from Eurostat as
     ratios and are not recomputed here. */
  const ref = debt.ref;
  const total = debt.total[ref];
  const pcGdp = debt.pcGdp[ref];
  const interest = debt.interest[ref];

  return (
    <>
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
    </>
  );
}

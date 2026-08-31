import { notFound } from "next/navigation";
import { LOCALES, dict, isLocale } from "@/i18n";
import { eur } from "@/lib/format";
import { meta, latestGgYear } from "@/data/meta";
import HeroStat from "@/components/console/HeroStat";
import ModeBar from "@/components/console/ModeBar";
import ConsoleFooter from "@/components/console/ConsoleFooter";
import PendingConsole from "@/components/console/PendingConsole";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function SpendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);

  /* Total general-government expenditure, ESA 2010 S13, consolidated. The four
     government tiers do not sum to this figure and are never scaled so they do —
     that ladder lands in M3. */
  const year = latestGgYear;
  const exp = meta.gg[year].exp;

  return (
    <>
      <ModeBar
        locale={locale}
        labels={{ revenue: t.modeRev, spending: t.modeExp, debt: t.modeDebt }}
      />
      <div className="hero">
        <HeroStat
          k={t.tiers.S13[0]}
          v={eur(locale, exp)}
          s={`${t.fYear} ${year} · ${t.sRev.natSub}`}
          accent="am"
        />
      </div>
      <PendingConsole locale={locale} title={t.mapExp} />
      <ConsoleFooter
        source={t.footExp1}
        perimeter={t.footExp2}
        build={t.foot3}
      />
    </>
  );
}

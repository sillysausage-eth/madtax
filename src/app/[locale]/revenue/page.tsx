import { notFound } from "next/navigation";
import { LOCALES, dict, isLocale } from "@/i18n";
import { eur } from "@/lib/format";
import { meta, latestGgYear } from "@/data/meta";
import HeroStat from "@/components/console/HeroStat";
import PendingConsole from "@/components/console/PendingConsole";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dict(locale);

  /* Total general-government revenue, ESA 2010 S13, consolidated — the bundle's
     `gg` block, read verbatim for its latest published year. */
  const year = latestGgYear;
  const rev = meta.gg[year].rev;

  return (
    <>
      <div className="hero">
        <HeroStat
          k={t.sRev.nat}
          v={eur(locale, rev)}
          s={`${t.fYear} ${year} · ${t.sRev.natSub}`}
          accent="cy"
        />
      </div>
      <PendingConsole locale={locale} title={t.mapRev} />
    </>
  );
}

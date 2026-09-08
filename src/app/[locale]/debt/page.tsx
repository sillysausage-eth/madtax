import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/i18n";
import { modeMetadata } from "@/lib/meta";
import { modeJsonLd } from "@/lib/jsonld";
import JsonLd from "@/components/JsonLd";
import DebtConsole from "@/components/console/DebtConsole";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return modeMetadata(isLocale(locale) ? locale : DEFAULT_LOCALE, "debt");
}

/**
 * The debt console. Debt is a stock on one reference date, so there is no year to
 * scrub and no map to select on: the headline, the figures that qualify it and
 * the stock over time all render on the server. The one interactive thing on the
 * screen is the breakdown block, which is the only JavaScript the route ships.
 */
export default async function DebtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <JsonLd data={modeJsonLd(locale, "debt")} />
      <DebtConsole locale={locale} />
    </>
  );
}

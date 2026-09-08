import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/i18n";
import { modeMetadata } from "@/lib/meta";
import { DEBT_ENABLED } from "@/lib/flags";
import DebtConsole from "@/components/console/DebtConsole";

/* Nothing is prerendered while the screen is switched off, and the page itself
   404s, so the route cannot be reached by guessing the URL either. */
export function generateStaticParams() {
  return DEBT_ENABLED ? LOCALES.map((locale) => ({ locale })) : [];
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
  if (!isLocale(locale) || !DEBT_ENABLED) notFound();

  return <DebtConsole locale={locale} />;
}

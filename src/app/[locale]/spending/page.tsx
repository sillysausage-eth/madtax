import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/i18n";
import { modeMetadata } from "@/lib/meta";
import SpendingExplorer from "@/components/console/SpendingExplorer";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return modeMetadata(isLocale(locale) ? locale : DEFAULT_LOCALE, "spending");
}

/**
 * The spending console. A thin server component around one client island.
 *
 * The island prerenders in its opening state — the query string is adopted after
 * hydration, not read during render — so the static HTML this route ships
 * already carries the real figures rather than a fallback.
 */
export default async function SpendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <SpendingExplorer locale={locale} />;
}

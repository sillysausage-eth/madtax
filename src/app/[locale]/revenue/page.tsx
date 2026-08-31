import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/i18n";
import RevenueExplorer from "@/components/console/RevenueExplorer";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * The revenue console. A thin server component around one client island.
 *
 * The island prerenders in its opening state — the query string is adopted after
 * hydration, not read during render — so the static HTML this route ships
 * already carries the real figures rather than a fallback.
 */
export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <RevenueExplorer locale={locale} />
  );
}

import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/i18n";
import { DEBT_ENABLED } from "@/lib/flags";
import DebtConsole from "@/components/console/DebtConsole";

/* Nothing is prerendered while the screen is switched off, and the page itself
   404s, so the route cannot be reached by guessing the URL either. */
export function generateStaticParams() {
  return DEBT_ENABLED ? LOCALES.map((locale) => ({ locale })) : [];
}

/**
 * The debt console. Nothing on the screen is interactive — debt is a stock on one
 * reference date — so the whole console renders on the server and the route ships
 * no JavaScript of its own.
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

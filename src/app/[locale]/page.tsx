import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/i18n";
import { modeMetadata } from "@/lib/meta";
import OverviewConsole from "@/components/console/OverviewConsole";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return modeMetadata(isLocale(locale) ? locale : DEFAULT_LOCALE, "overview");
}

/**
 * The locale root is the overview — the console's first mode, and the only one whose
 * URL is the locale itself. It used to redirect to `/{locale}/revenue`; a reader who
 * arrives has not picked a question yet, and revenue is one of three answers.
 *
 * No segment of its own, so the page a reader lands on and the page the wordmark links
 * back to are one URL rather than two. It carries no `BreadcrumbList` for the same
 * reason: a trail from the site root to the site root says nothing. The layout's
 * `WebSite` graph already describes this URL.
 */
export default async function LocaleRoot({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <OverviewConsole locale={locale} />;
}

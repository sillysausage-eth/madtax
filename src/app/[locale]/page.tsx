import { redirect } from "next/navigation";
import { LOCALES, isLocale } from "@/i18n";
import { DEFAULT_MODE } from "@/lib/modes";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/** A locale root has no screen of its own — revenue is the console's first mode. */
export default async function LocaleRoot({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/${DEFAULT_MODE}`);
}

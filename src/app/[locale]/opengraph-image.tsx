import { DEFAULT_LOCALE, isLocale } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  siteOgAlt,
  siteOgImage,
} from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* The card a locale URL shares when no console is named. Each console below
   defines its own, which takes precedence over this one. */
export function generateImageMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  return [{ id: "card", alt: siteOgAlt(locale), size, contentType }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return siteOgImage(isLocale(locale) ? locale : DEFAULT_LOCALE);
}

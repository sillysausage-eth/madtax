import { DEFAULT_LOCALE, isLocale } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  modeOgAlt,
  modeOgImage,
} from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* `alt` is a static export, so the localised text has to come through
   `generateImageMetadata` — which does receive the route's params. */
export function generateImageMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  return [{ id: "card", alt: modeOgAlt(locale, "debt"), size, contentType }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return modeOgImage(isLocale(locale) ? locale : DEFAULT_LOCALE, "debt");
}

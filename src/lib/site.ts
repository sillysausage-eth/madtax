/**
 * Where the site lives.
 *
 * Canonical URLs, `hreflang` links, the sitemap and Open Graph image URLs all
 * have to be absolute, so one origin has to be settled before any of them can be
 * written. It is resolved once, here, in order of how much we can trust it:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — the real domain, set deliberately. Always wins.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's stable production host,
 *      the same on every deployment, so a preview build still emits canonicals
 *      that point at production rather than at itself.
 *   3. `VERCEL_URL` — this one deployment's host. Right for a preview, wrong for
 *      anything a crawler should keep.
 *   4. localhost — development.
 *
 * Set (1) in Vercel the moment the domain is known and none of the rest matters.
 */
const ORIGIN: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
})();

export const SITE_ORIGIN = ORIGIN;

/** `metadataBase` wants a URL instance; everything else wants a string. */
export const SITE_URL = new URL(ORIGIN);

/** An absolute URL for a root-relative path. `abs("/es/revenue")`. */
export function abs(path: string): string {
  return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

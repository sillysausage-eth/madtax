/**
 * Where the site lives.
 *
 * Canonical URLs, `hreflang` links, the sitemap and Open Graph image URLs all
 * have to be absolute, so one origin has to be settled before any of them can be
 * written. It is resolved once, here, in order of how much we can trust it:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` — an override, for a build that has to answer on
 *      some other host. Always wins.
 *   2. `CANONICAL_ORIGIN` — the domain the site is actually served and shared
 *      from, written down rather than inferred. Used by every deployed build,
 *      preview included, so a preview still emits canonicals and card images
 *      that point at production.
 *   3. localhost — development, where nothing is crawled and the cards are read
 *      off the same origin the page is served from.
 *
 * The Vercel-supplied hosts are deliberately not in that list any more. The
 * project's production host is `www.madtax.co`, the repository's old name, and it
 * is not the domain the site is shared under — pointing `og:image` at it made
 * every card an image on a foreign domain, which is a fetch a link unfurler is
 * entitled to refuse, and did.
 */

/**
 * The one host the site answers on. The apex redirects here (308), so `www` is
 * the form to publish; anything else is a duplicate as far as a crawler is
 * concerned.
 */
const CANONICAL_ORIGIN = "https://www.taxtruth.co";

const ORIGIN: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  /* `VERCEL` is set on every build and every runtime there, and nowhere else:
     it is the one honest test for "this is deployed, not a laptop". */
  if (process.env.VERCEL) return CANONICAL_ORIGIN;

  return `http://localhost:${process.env.PORT ?? 3000}`;
})();

export const SITE_ORIGIN = ORIGIN;

/** `metadataBase` wants a URL instance; everything else wants a string. */
export const SITE_URL = new URL(ORIGIN);

/** An absolute URL for a root-relative path. `abs("/es/revenue")`. */
export function abs(path: string): string {
  return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Where the source lives. The masthead has said OPEN SOURCE since the first build; this
 * is the address that claim points at, and the footer of every screen is where it is
 * made good.
 */
export const REPO_URL = "https://github.com/sillysausage-eth/madtax";

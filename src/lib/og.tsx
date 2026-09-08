import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n";
import { MODES, type Mode } from "@/lib/modes";
import { SITE_NAME, copy } from "@/lib/meta";

/**
 * The shared Open Graph card, drawn once and used by every `opengraph-image`
 * route below `[locale]`.
 *
 * Rendered with the console's palette, not its fonts: `next/font` downloads
 * Saira and Barlow into the build output rather than to a stable path on disk,
 * and Satori needs a font file it can read. Rather than commit font binaries or
 * fetch Google Fonts at build time — a network call that would break an offline
 * build — the card uses the default face and carries the identity in the
 * palette, the caps and the letter-spacing.
 */

/** 1.91:1 — the size every platform crops toward. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#c9dce5";
const INK2 = "#8fa9b6";
const DIM = "#788f9c";
const BG = "#070b0e";
const RULE = "#1b2e3a";

/** The same accent each console wears on screen. */
const ACCENT: Record<Mode, string> = {
  revenue: "#3fc8dc",
  spending: "#f0a82e",
  debt: "#b47be8",
};

function Card({
  accent,
  title,
  description,
  strap,
  tag,
}: {
  accent: string;
  title: string;
  description: string;
  strap: string;
  tag: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BG,
        color: INK,
      }}
    >
      {/* The accent hairline that heads every panel in the console. */}
      <div style={{ display: "flex", height: 10, background: accent }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          padding: "52px 72px 44px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            <span style={{ color: INK }}>MAD</span>
            <span style={{ color: accent }}>TAX</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 33,
              lineHeight: 1.35,
              color: INK2,
              maxWidth: 950,
              marginTop: 26,
            }}
          >
            {description}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{ display: "flex", height: 1, background: RULE, marginBottom: 22 }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 21,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <div style={{ display: "flex", color: accent }}>{strap}</div>
            <div style={{ display: "flex", color: DIM }}>{tag}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The card for one console. */
export function modeOgImage(locale: Locale, mode: Mode) {
  const c = copy(locale);
  return new ImageResponse(
    (
      <Card
        accent={ACCENT[mode]}
        title={c.modes[mode].title}
        description={c.modes[mode].description}
        strap={c.title}
        tag={locale}
      />
    ),
    OG_SIZE,
  );
}

/**
 * The card for the site itself, shared when no console is named. The strap
 * names every console the card can send a reader to.
 */
export function siteOgImage(locale: Locale) {
  const c = copy(locale);
  return new ImageResponse(
    (
      <Card
        accent={ACCENT.revenue}
        title={c.title}
        description={c.description}
        strap={MODES.map((m) => c.modes[m].title).join(" · ")}
        tag={locale}
      />
    ),
    OG_SIZE,
  );
}

/** Alt text for a console's card, in that console's language. */
export function modeOgAlt(locale: Locale, mode: Mode): string {
  const c = copy(locale);
  return `${SITE_NAME} · ${c.modes[mode].title} — ${c.modes[mode].description}`;
}

/** Alt text for the site card. */
export function siteOgAlt(locale: Locale): string {
  return `${SITE_NAME} · ${copy(locale).title} — ${copy(locale).description}`;
}

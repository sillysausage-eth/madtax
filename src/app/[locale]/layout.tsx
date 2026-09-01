import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Saira_Condensed, Barlow, JetBrains_Mono } from "next/font/google";
import { LOCALES, dict, isLocale, type Locale } from "@/i18n";
import ModeFrame from "@/components/console/ModeFrame";
import ModeTabs from "@/components/console/ModeTabs";
import LangSwitch from "@/components/console/LangSwitch";
import { MODES, modeLabel, type Mode } from "@/lib/modes";
import "../globals.css";

/* The prototype's three faces, self-hosted by next/font with the same weights the
   template asks Google Fonts for. */
const saira = Saira_Condensed({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "MadTax // Fuente Abierta",
    description:
      locale === "en"
        ? "Spain's public finances from the published figures: revenue, spending and debt."
        : "Las cuentas públicas de España a partir de las cifras publicadas: ingresos, gasto y deuda.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = dict(locale);

  /* Only the three labels cross into the client tab strip: the dictionary itself
     carries a function (`unal`) and is not serialisable. */
  const modeLabels = Object.fromEntries(
    MODES.map((m) => [m, modeLabel(t, m)]),
  ) as Record<Mode, string>;

  return (
    <html
      lang={locale}
      className={`${saira.variable} ${barlow.variable} ${jbmono.variable}`}
    >
      <body>
        <ModeFrame>
          <div className="shell">
            <header className="mast">
              <div className="brand">
                <h1>
                  <Link href={`/${locale}`}>
                    MAD<em>TAX</em>
                  </Link>
                </h1>
                <span className="codename">OPEN SOURCE</span>
              </div>

              {/* The mode switch is chrome, not content: it belongs in the
                  masthead between the wordmark and the language switch, on every
                  screen, rather than in a strip fused to one console. */}
              <ModeTabs locale={locale} labels={modeLabels} />

              <div className="mast-right">
                <LangSwitch locale={locale} />
              </div>
            </header>

            {/* Each mode renders whatever control it owns — the year picker
                for revenue and spending, nothing for debt, which is a stock on
                one date. */}
            {children}
          </div>
        </ModeFrame>
      </body>
    </html>
  );
}

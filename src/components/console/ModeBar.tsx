import type { Locale } from "@/i18n";
import type { Mode } from "@/lib/modes";
import ModeTabs from "./ModeTabs";

/**
 * The strip fused to the top of the console: the mode tabs on the left, and
 * whatever control the mode owns on the right — the year picker for revenue and
 * spending, nothing for debt, which is a stock on one date and has no year to
 * pick.
 *
 * The control is a child rather than a prop so the mode that owns the year state
 * renders it, and this stays a plain layout component either way.
 */
export default function ModeBar({
  locale,
  labels,
  children,
}: {
  locale: Locale;
  labels: Record<Mode, string>;
  children?: React.ReactNode;
}) {
  return (
    <div className="modebar">
      <ModeTabs locale={locale} labels={labels} />
      {children}
    </div>
  );
}

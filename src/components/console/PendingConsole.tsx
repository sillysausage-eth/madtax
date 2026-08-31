import type { Locale } from "@/i18n";

/**
 * Placeholder for the console panels still to be ported (map, composition,
 * who-pays, ladders). It states what is absent instead of leaving a blank frame —
 * the same rule the data follows: a gap is a named fact.
 *
 * These two strings are the only copy in the app that is not in the prototype's
 * dictionary; they describe the migration, not the data, and go away with M3.
 */
const PENDING: Record<Locale, string> = {
  es: "No portado — paridad en M2/M3",
  en: "Not yet ported — parity lands in M2/M3",
};

export default function PendingConsole({
  locale,
  title,
}: {
  locale: Locale;
  title: string;
}) {
  return (
    <section className="pane" style={{ marginTop: 12 }}>
      <div className="pane-h">
        <span className="t">{title}</span>
        <span className="x">M1</span>
      </div>
      <div className="pane-b">
        <div className="pending">{PENDING[locale]}</div>
      </div>
    </section>
  );
}

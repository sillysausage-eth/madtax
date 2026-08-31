/**
 * The console footer, ported from the prototype's `paintChrome()`.
 *
 * It names the source and the perimeter, both of which change with the mode —
 * leaving the revenue caption under the spending screen would misdescribe what
 * is on it, so each mode passes its own two lines.
 */
export default function ConsoleFooter({
  source,
  perimeter,
  build,
}: {
  source: string;
  perimeter: string;
  build: string;
}) {
  return (
    <footer className="foot">
      <span>{source}</span>
      <span>{perimeter}</span>
      <span>{build}</span>
    </footer>
  );
}

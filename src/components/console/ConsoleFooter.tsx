import GithubMark from "@/components/GithubMark";
import { dict, type Locale } from "@/i18n";
import type { Mode } from "@/lib/modes";
import { MODE_SOURCES } from "@/lib/sources";
import { REPO_URL } from "@/lib/site";

/**
 * The console footer.
 *
 * One band closing every screen, and the site's only statement of provenance:
 * every published dataset the screen's figures are read from, each one named and
 * linked, then the code.
 *
 * It replaced a single line of prose that named seven institutions and no
 * datasets. A reader could not tell from it which name carried the figure in
 * front of them, or find the table it came from — which is the whole point of
 * printing a source. The list is grouped by publisher and exhaustive for the
 * screen: see `@/lib/sources` for what each mode reads and why the home screen
 * carries the union of all of them.
 *
 * The list is folded away behind its own heading. Exhaustive provenance is the
 * point of the band, but fifteen datasets are a reference a reader opens once,
 * not a paragraph they should have to scroll past on the way off every screen.
 * A `details` element is the whole of the mechanism: the summary is the heading
 * it already had, the disclosure works before hydration, and the list stays in
 * the markup for search and for print.
 */
export default function ConsoleFooter({
  mode,
  locale,
}: {
  mode: Mode;
  locale: Locale;
}) {
  const t = dict(locale);
  const groups = MODE_SOURCES[mode];

  return (
    <footer className="foot">
      <details className="foot-src">
        <summary>
          {/* The chevron is the affordance, so it is drawn rather than left to
              the platform marker — which is a triangle in one browser, a
              disclosure arrow in the next, and unstyleable in both. */}
          <svg className="foot-chev" viewBox="0 0 12 12" aria-hidden focusable="false">
            <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <h2 className="foot-k">{t.srcK}</h2>
        </summary>

        {/* A term and its datasets per row, which is what a dl is for: the block
            reads as a specification of where the screen comes from rather than as a
            paragraph of names. */}
        <dl className="foot-srcs">
          {groups.map((g) => (
            <div key={g.pub} className="foot-pub">
              <dt>{g.pub}</dt>
              <dd>
                {g.sources.map((s, i) => (
                  <span key={s.id}>
                    {i ? (
                      <span className="foot-sep" aria-hidden>
                        {" · "}
                      </span>
                    ) : null}
                    <a href={s.href} target="_blank" rel="noreferrer">
                      {t.srcLab[s.id as keyof typeof t.srcLab]}
                      {/* A real space, not a margin: the name and the code are read
                          aloud and copied out as two words. */}
                      {s.code ? <> <span className="foot-code">{s.code}</span></> : null}
                    </a>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="foot-tail">
        <span>{t.foot3}</span>
        <a
          className="foot-repo"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t.repo}
          title={t.repo}
        >
          <GithubMark />
        </a>
      </div>
    </footer>
  );
}

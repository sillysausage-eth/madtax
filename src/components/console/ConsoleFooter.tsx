import { splitSources } from "@/lib/sources";
import { REPO_URL } from "@/lib/site";

/**
 * The GitHub mark, inlined.
 *
 * The one image on the page, and it is 13px wide — a request for it would cost
 * more than the path does. `aria-hidden` because the link beside it is already
 * named; the mark is the brand, not the label.
 */
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.92-.88-2.92-2.75 0-.79.28-1.44.75-1.95-.07-.2-.33-.98.07-2.03 0 0 .61-.19 2 .75a5.4 5.4 0 0 1 1.53-.21c.52 0 1.04.07 1.53.21 1.39-.95 2-.75 2-.75.4 1.05.14 1.83.07 2.03.47.51.75 1.16.75 1.95 0 1.88-1.15 2.55-2.93 2.75.3.26.56.76.56 1.54 0 1.09-.01 1.98-.01 2.25 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * The console footer, ported from the prototype's `paintChrome()`.
 *
 * One band closing every screen, and the only chrome at the foot of the site:
 * where this screen's figures come from, what the mode's total does and does not
 * cover, and where the code and the data behind both live. The home screen used
 * to say the last of those in a band of its own; a reader looking for provenance
 * looks in one place, so there is one place.
 *
 * The source caption is where the screen says where its figures come from, so
 * the names in it are links to the published series — see `@/lib/sources`.
 * `sourceLinks` lets a mode aim a shared name at its own dataset.
 *
 * `perimeter` states what the mode's total does and does not cover; it changes
 * with the mode and is omitted where the mode has nothing to qualify.
 */
export default function ConsoleFooter({
  source,
  sourceLinks,
  perimeter,
  build,
  repo,
}: {
  source: string;
  sourceLinks?: Record<string, string>;
  perimeter?: string;
  build: string;
  repo: string;
}) {
  return (
    <footer className="foot">
      <span>
        {splitSources(source, sourceLinks).map((seg, i) =>
          seg.href ? (
            <a key={i} href={seg.href} target="_blank" rel="noreferrer">
              {seg.text}
            </a>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </span>
      {perimeter ? <span>{perimeter}</span> : null}
      <span className="foot-end">
        <span>{build}</span>
        <a
          className="foot-repo"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={`${repo} · GitHub`}
        >
          <GithubMark />
          <span>{repo}</span>
        </a>
      </span>
    </footer>
  );
}

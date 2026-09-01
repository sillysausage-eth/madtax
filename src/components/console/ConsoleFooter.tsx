import { splitSources } from "@/lib/sources";

/**
 * The console footer, ported from the prototype's `paintChrome()`.
 *
 * The source caption is the one place the screen says where its figures come
 * from, so the names in it are links to the published series — see
 * `@/lib/sources`. `sourceLinks` lets a mode aim a shared name at its own
 * dataset.
 *
 * `perimeter` states what the mode's total does and does not cover; it changes
 * with the mode and is omitted where the mode has nothing to qualify.
 */
export default function ConsoleFooter({
  source,
  sourceLinks,
  perimeter,
  build,
}: {
  source: string;
  sourceLinks?: Record<string, string>;
  perimeter?: string;
  build: string;
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
      <span>{build}</span>
    </footer>
  );
}

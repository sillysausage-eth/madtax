import Link from "next/link";
import { dict, type Locale } from "@/i18n";
import { headline, meta } from "@/data/meta";
import { MODES, modeLabel, type Mode } from "@/lib/modes";
import { modePath } from "@/lib/meta";
import ConsoleFooter from "./ConsoleFooter";
import OverviewHeadline from "./OverviewHeadline";
import type { OverviewPoint } from "./OverviewTrend";

/**
 * The home screen.
 *
 * Every other console answers a question about the shape of a figure: which tax, which
 * function, which territory, which instrument. This one answers none of them, because a
 * reader who has just arrived has not chosen a question yet. It sets out the three
 * figures the rest of the site decomposes, shows what they have done, and then says
 * where the questions are asked.
 *
 * Three bands, in the order a first visit needs them: what this is and what the figures
 * are; the chart they are read off; and the three consoles, each with the question it
 * answers and the ground it covers. Where the numbers come from is said in the footer,
 * with the repository they are built in — the same place every other screen says it,
 * so provenance is looked up in one place rather than two.
 *
 * Only the first two bands are interactive, so only they cross into the client. The
 * doors are markup and stay on the server.
 */
export default function OverviewConsole({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const X = t.ov;

  /* The pipeline guarantees a contiguous run with all three figures in every year, so
     this is a read, not a filter. The nulls the chart can draw around are for the day a
     source withdraws a year — the chart breaks its line rather than bridging it. */
  const points: OverviewPoint[] = headline.years.map((year) => ({
    year,
    rev: headline.rev[year] ?? null,
    exp: headline.exp[year] ?? null,
    def: headline.def[year] ?? null,
  }));

  /* What each console covers, taken from the bundle's own year lists rather than
     written into the copy: a door that promised a range the console no longer carries
     would be the first thing to go stale.

     Two stamps, because the debt console is two things at once: a series that runs the
     whole of `{R}` and a shape — instruments, holders, maturities — read at the one
     date `{Y}` is quoted for. Revenue and spending are read year by year, so for them
     the reference year is simply the last one they carry. */
  const span = (years: string[]) => `${years[0]}–${years[years.length - 1]}`;
  const last = (years: string[]) => years[years.length - 1];
  const cover: Record<Exclude<Mode, "overview">, { R: string; Y: string }> = {
    revenue: { R: span(meta.years.rev), Y: last(meta.years.rev) },
    spending: { R: span(meta.years.spend), Y: last(meta.years.spend) },
    debt: { R: span(meta.years.debt), Y: meta.debtRef },
  };

  const doors = MODES.filter((m): m is Exclude<Mode, "overview"> => m !== "overview");

  return (
    <>
      <div className="ovscreen">
        <OverviewHeadline points={points} locale={locale} X={X} />

        {/* The three doors. Each carries the question its console answers and the
            ground it covers — enough to choose between them without opening all three.
            No heading over them: three panels naming three screens, each with its
            console's colour and its own "open", are legible as a choice without a line
            of chrome saying that is what they are. */}
        <section className="osec">
          <div className="odoors">
            {doors.map((mode) => {
              const [asks, covers] = X.door[mode];
              return (
                <Link key={mode} className={`odoor ${mode}`} href={modePath(locale, mode)}>
                  <span className="k">{modeLabel(t, mode)}</span>
                  <span className="d">{asks}</span>
                  <span className="c">
                    {covers.replace("{R}", cover[mode].R).replace("{Y}", cover[mode].Y)}
                  </span>
                  <span className="go">
                    {X.doorGo}
                    <i aria-hidden>→</i>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>

      <ConsoleFooter
        source={X.foot1}
        perimeter={X.foot2}
        build={t.foot3}
        repo={t.repo}
      />
    </>
  );
}

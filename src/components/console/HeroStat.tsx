/**
 * One headline tile — the prototype's `.stat`. It renders a value that was
 * formatted from a bundle figure; it never computes one.
 */
export default function HeroStat({
  k,
  v,
  s,
  accent,
}: {
  /** Label — small caps, mono. */
  k: string;
  /** The figure, already formatted for the locale. */
  v: string;
  /** Sub-line: the vintage, scope or reference date this figure carries. */
  s?: string;
  accent?: "cy" | "am" | "rd";
}) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <div className={accent ? `v ${accent}` : "v"}>{v}</div>
      {s ? <span className="s">{s}</span> : null}
    </div>
  );
}

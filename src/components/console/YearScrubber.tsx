"use client";

/**
 * The fiscal-year picker, ported from the prototype's `buildYearPicker()`.
 *
 * Newest first: the recent years are the ones anyone reaches for, and the list
 * stays one scroll away however many years the feed grows to. One `<select>`
 * holds any number of years without touching the layout.
 *
 * Mode-agnostic: each mode passes its own year list. Debt has none and does not
 * render this at all.
 */
export default function YearScrubber({
  years,
  year,
  label,
  optionLabel,
  onChange,
}: {
  years: readonly string[];
  year: string;
  label: string;
  /** How this locale writes a year: `2024` in Spanish, `FY2024` in English. */
  optionLabel: (y: string) => string;
  onChange: (y: string) => void;
}) {
  return (
    <div className="yearpick">
      <label className="ylbl" htmlFor="yearsel">
        {label}
      </label>
      <select
        className="ysel"
        id="yearsel"
        value={year}
        onChange={(e) => onChange(e.target.value)}
      >
        {[...years].reverse().map((y) => (
          <option key={y} value={y}>
            {optionLabel(y)}
          </option>
        ))}
      </select>
    </div>
  );
}

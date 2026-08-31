/**
 * Choropleth ramps, ported 1:1 from the prototype's `RAMP_REV` / `RAMP_EXP` and
 * `ramp()`. Hand-composed stops, linearly interpolated — no scale library.
 *
 * Mode-agnostic on purpose: the map takes a `Ramp` and knows nothing about which
 * mode built it, so spending plugs its amber stops into the same component.
 */

export type RampStops = ReadonlyArray<readonly [number, number, number]>;

/** Revenue: near-black through the cyan family to `--cy-hi`. */
export const RAMP_REV: RampStops = [
  [9, 21, 28],
  [13, 42, 55],
  [18, 72, 92],
  [26, 112, 136],
  [42, 158, 184],
  [80, 222, 244],
];

/** Spending: the same shape in amber. */
export const RAMP_EXP: RampStops = [
  [26, 19, 5],
  [56, 38, 10],
  [96, 64, 14],
  [150, 100, 22],
  [204, 142, 34],
  [255, 196, 88],
];

/** `x` in 0..1 to a CSS `rgb()` string. */
export type Ramp = (x: number) => string;

export function makeRamp(stops: RampStops): Ramp {
  return (x: number) => {
    const p = Math.max(0, Math.min(1, x)) * (stops.length - 1);
    const i = Math.floor(p);
    const f = p - i;
    const a = stops[i];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
      a[1] + (b[1] - a[1]) * f,
    )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  };
}

/** The top stop, used for the region stroke that brightens with intensity. */
export const rampTop = (stops: RampStops): readonly [number, number, number] =>
  stops[stops.length - 1];

/**
 * The prototype's `scale()`: min/max over the positive values on screen, gamma
 * applied, then the ramp. `null` means no published figure, `"neg"` means the
 * refunds exceeded collection — the map paints those two differently and never
 * as "zero".
 */
export function makeScale(
  values: ReadonlyArray<number | null>,
  ramp: Ramp,
  gamma: number,
): (v: number | null) => string | null | "neg" {
  const pos = values.filter((v): v is number => v != null && v > 0);
  const max = Math.max(...pos, 1);
  const min = Math.min(...pos, 0);
  return (v) => {
    if (v == null) return null;
    if (v <= 0) return "neg";
    return ramp(
      Math.pow(Math.max(0, Math.min(1, (v - min) / Math.max(max - min, 1e-9))), gamma),
    );
  };
}

/** The prototype's `intensity()`: share of the largest value, for stroke and glow. */
export function makeIntensity(
  values: ReadonlyArray<number | null>,
): (v: number | null) => number {
  const pos = values.filter((x): x is number => x != null && x > 0);
  const max = Math.max(...pos, 1);
  return (v) => (v == null || v <= 0 ? 0 : Math.max(0, Math.min(1, v / max)));
}

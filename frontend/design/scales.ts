/**
 * Scientific colormaps.
 *
 * These are DATA, not brand. They are perceptually-uniform sequences chosen so that an
 * equal step in value looks like an equal step in colour, and they must never be
 * adjusted to match the palette - doing so would make the map lie about magnitude.
 * DESIGN.md states this rule explicitly; this file is where it is enforced.
 *
 * `thermal` and `haline` are from cmocean (Thyng et al. 2016), designed specifically
 * for oceanographic temperature and salinity. `viridis` is the matplotlib default.
 * Each is stored as control points and interpolated, which is accurate enough at the
 * 8-bit output depth while keeping the bundle small.
 */

import type { RGB } from './tokens';

type Stops = readonly RGB[];

/** cmocean thermal: deep blue-black through magenta and red to warm yellow-white. */
const THERMAL: Stops = [
  [3, 35, 51], [16, 60, 90], [26, 87, 115], [26, 115, 122],
  [40, 141, 113], [88, 163, 92], [148, 180, 76], [211, 190, 84],
  [250, 199, 129], [253, 216, 179], [252, 237, 224],
];

/** cmocean haline: deep indigo through teal and green to pale yellow. */
const HALINE: Stops = [
  [41, 24, 107], [30, 56, 130], [12, 90, 128], [10, 121, 118],
  [26, 150, 104], [76, 176, 80], [143, 195, 63], [206, 208, 66],
  [249, 224, 116], [253, 239, 176], [253, 250, 216],
];

/** matplotlib viridis: dark purple through blue and green to yellow. */
const VIRIDIS: Stops = [
  [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
  [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
  [180, 222, 44], [253, 231, 37],
];

/** cmocean dense: pale to deep blue-violet. Used for depth. */
const DENSE: Stops = [
  [230, 240, 240], [188, 216, 227], [149, 191, 216], [119, 163, 208],
  [104, 132, 195], [102, 99, 172], [95, 69, 138], [80, 43, 99],
  [54, 24, 59],
];

/** cmocean balance: diverging, blue through white to red. For anomalies from a mean. */
const BALANCE: Stops = [
  [23, 28, 66], [40, 78, 138], [67, 133, 179], [143, 186, 208],
  [220, 224, 228], [225, 176, 155], [206, 121, 96], [170, 63, 57],
  [104, 20, 32],
];

/** Neutral fallback for a variable with no meaningful colour mapping. */
const GRAY: Stops = [[38, 35, 31], [151, 145, 138], [237, 233, 229]];

export const COLORMAPS = {
  thermal: THERMAL,
  haline: HALINE,
  viridis: VIRIDIS,
  dense: DENSE,
  balance: BALANCE,
  gray: GRAY,
} as const;

export type ColormapName = keyof typeof COLORMAPS;

export function isColormapName(value: string): value is ColormapName {
  return value in COLORMAPS;
}

/** Sample a colormap at t in [0,1], interpolating linearly between control points. */
export function sampleColormap(name: ColormapName, t: number): RGB {
  const stops = COLORMAPS[name] ?? GRAY;
  if (!Number.isFinite(t)) return [...GRAY[1]] as RGB;
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - index;
  const a = stops[index];
  const b = stops[index + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
}

/**
 * Build a value->RGB function for a variable.
 *
 * Returns a neutral grey for null and for out-of-domain values rather than clamping
 * them to an endpoint colour: a missing measurement must not look like a cold one.
 */
export function makeColorScale(
  name: ColormapName,
  min: number,
  max: number,
): (value: number | null | undefined) => RGB {
  const span = max - min;
  const missing: RGB = [...GRAY[0]] as RGB;
  return (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return missing;
    if (span <= 0) return sampleColormap(name, 0.5);
    return sampleColormap(name, (value - min) / span);
  };
}

/** CSS gradient string for legends. */
export function colormapToCss(name: ColormapName, steps = 24): string {
  const parts: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    const [r, g, b] = sampleColormap(name, i / (steps - 1));
    parts.push(`rgb(${r} ${g} ${b}) ${Math.round((i / (steps - 1)) * 100)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

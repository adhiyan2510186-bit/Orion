/**
 * Chart Room design tokens.
 *
 * Derived from DESIGN.md, which is authoritative. This file is the ONLY origin of a
 * colour, spacing value or type size in the frontend. Nothing else may hardcode one.
 *
 * Two consumers, one source: Tailwind reads the CSS variables generated from `colors`,
 * and deck.gl reads `rgb` numeric arrays. deck.gl cannot consume CSS variables, so a
 * layer that hardcoded `[218, 85, 161]` would silently break the "re-theme with zero
 * component edits" guarantee. Both forms live here so they cannot drift.
 */

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * The palette. Every value is sampled from a chart room - the plotting table, the
 * instrument housings, and the inks used to mark a chart by hand. Neutrals are warm
 * (OKLCH hue 65-80) specifically so they are hue-separated from the cool scientific
 * colormaps; a cool-grey interface would read as part of the data.
 */
export const colors = {
  /** Chart table. Page ground, and the ground the WebGL canvas sits on. */
  surface: '#0D0C0A',
  /** Anodized housing. Panels, tables, readouts. */
  neutral: '#191714',
  /** Lifted panel. Strictly for things genuinely floating. */
  surfaceRaised: '#26231F',
  /** Scribe line. Structural hairlines only - too quiet for interactive edges. */
  border: '#36322E',
  /** Graphite. Metadata, axis ticks, units. */
  secondary: '#97918A',
  /** Chart paper. Body text and data values. */
  onSurface: '#DBD6D1',
  /** Chinagraph. Headings, hero readouts, float identifiers. */
  primary: '#EDE9E5',
  /** Admiralty magenta. Interaction and selection ONLY - never a data colour. */
  tertiary: '#DA55A1',
  /** Hover/pressed step of the accent ramp. */
  tertiaryStrong: '#F077B1',
  /** Overprint red. Critical anomalies and input errors. */
  error: '#E46870',
  /** Sounding amber. The neutral ramp's own hue at higher chroma. */
  warning: '#D89F45',
} as const;

/** Numeric forms for WebGL. Same values, different encoding - never a second source. */
export const rgb: Record<keyof typeof colors, RGB> = Object.fromEntries(
  Object.entries(colors).map(([key, hex]) => [key, hexToRgb(hex)]),
) as Record<keyof typeof colors, RGB>;

/**
 * Basemap geography. Reference chrome, NOT data.
 *
 * The temptation with an ocean application is to make the ocean blue. DESIGN.md
 * argues at length against exactly that, and the argument binds here more than
 * anywhere else in the system: haline and viridis encode measurements in blue and
 * teal, so a blue seafloor puts thousands of blue pixels on the canvas that mean
 * nothing. The user would have to learn which blues are water and which are salinity.
 *
 * So the basemap is built from the neutral ramp, one or two steps off Chart table,
 * with only a slight cool bias in the deep end - enough that it reads as water rather
 * than as a panel, far too little to be mistaken for a colormap sample. On a paper
 * chart the bathymetry is fine grey line-work, not flood colour; that is the register
 * being borrowed.
 *
 * These are consumed only by deck.gl layers, never by the DOM, so they have no CSS
 * variable counterpart in globals.css.
 */
export const basemapColors = {
  /** Open water. A half-step below Chart table so the canvas reads as deeper than the page. */
  ocean: '#090A0C',
  /** Landmass fill. Warm, one step up from the ocean - land is the raised form. */
  land: '#17150F',
  /** Coastline. The firmest line in the basemap; the ocean/land boundary is the one edge that must read. */
  landEdge: '#4A443C',
} as const;

/**
 * Bathymetric contour ramp, 200 m to 6000 m.
 *
 * Seven steps, shallow to deep, drifting from the warm neutral border colour toward a
 * desaturated slate. Chroma stays under ~0.02 OKLCH the whole way - the ramp is legible
 * as depth structure while staying categorically distinct from a haline sample.
 * Deliberately DARKENING with depth, matching the convention that deeper water is
 * heavier ink, and keeping the abyssal plain from competing with the point cloud.
 */
export const bathymetryRamp: readonly { depth: number; color: string }[] = [
  { depth: 200, color: '#3A362F' },
  { depth: 1000, color: '#332F2A' },
  { depth: 2000, color: '#2C2926' },
  { depth: 3000, color: '#262422' },
  { depth: 4000, color: '#201F1E' },
  { depth: 5000, color: '#1B1A1A' },
  { depth: 6000, color: '#161616' },
] as const;

export const basemapRgb = {
  ocean: hexToRgb(basemapColors.ocean),
  land: hexToRgb(basemapColors.land),
  landEdge: hexToRgb(basemapColors.landEdge),
} as const;

/** Depth in metres -> contour colour. Nearest defined step; never interpolated. */
export function bathymetryColor(depthMetres: number): RGB {
  let closest = bathymetryRamp[0];
  for (const step of bathymetryRamp) {
    if (Math.abs(step.depth - depthMetres) < Math.abs(closest.depth - depthMetres)) {
      closest = step;
    }
  }
  return hexToRgb(closest.color);
}

/** 4px base. Dense professional UI; 8px would waste rows in the readout tables. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
} as const;

/**
 * Radius encodes a distinction: square if it holds data, rounded if you click it.
 * Charts do not have rounded corners, and a rounded data surface reads as a card
 * *about* the data rather than the data itself.
 */
export const radius = {
  none: 0,
  sm: 2,
  md: 4,
  full: 9999,
} as const;

/** Two families, split by who the text is for: human voice vs instrument apparatus. */
export const fonts = {
  sans: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
  condensed: "'Archivo Narrow', 'Archivo', 'Arial Narrow', sans-serif",
  mono: "'Commit Mono', 'JetBrains Mono', 'SF Mono', Menlo, monospace",
} as const;

/** 1.2 minor third from 13px, broken deliberately at the display end. */
export const type = {
  display: { size: 32, weight: 700, leading: 1.05, tracking: '-0.03em' },
  headlineLg: { size: 22, weight: 700, leading: 1.18, tracking: '-0.02em' },
  headlineMd: { size: 17, weight: 700, leading: 1.28, tracking: '-0.01em' },
  bodyLg: { size: 15, weight: 400, leading: 1.6, tracking: '0' },
  bodyMd: { size: 13, weight: 400, leading: 1.55, tracking: '0' },
  bodySm: { size: 12, weight: 400, leading: 1.45, tracking: '0' },
  labelCaps: { size: 11, weight: 700, leading: 1.3, tracking: '0.12em' },
  dataLg: { size: 20, weight: 400, leading: 1.2, tracking: '-0.01em' },
  dataMd: { size: 13, weight: 400, leading: 1.45, tracking: '0' },
  dataSm: { size: 11, weight: 400, leading: 1.4, tracking: '0' },
} as const;

/**
 * Motion. The interface does not animate; the data does. 120ms on state changes and
 * nothing else - no fade-up on load, no transitions on data values. The only thing
 * that moves is the time cursor advancing the 4D cloud.
 */
export const motion = {
  fast: 120,
  medium: 200,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

export const layout = {
  /** Fixed. A scientist comparing two sessions needs the same readout width both times. */
  inspectorWidth: 380,
  topBarHeight: 52,
  timelineHeight: 64,
  /** Below this the inspector becomes an overlay rather than compressing. */
  overlayBreakpoint: 1100,
} as const;

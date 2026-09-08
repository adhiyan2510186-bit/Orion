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

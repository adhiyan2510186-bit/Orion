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
  /**
   * Fogged port. The composited appearance of a translucent warm-charcoal surface
   * over open water. The ONLY translucency in the system, and only at the boundary -
   * over the canvas, never over another panel. Pair with `glassMaterial` below; this
   * hex alone is the colour, not the recipe.
   */
  glass: '#1F1C18',
  /**
   * Machined bezel. The lit chamfer where an instrument's case meets its window.
   * The only edge brighter than Graphite, reserved exclusively for the chrome/canvas
   * boundary. Roughly four edges in the entire application - using it as a general
   * border flattens the one distinction this system exists to make.
   */
  hudEdge: '#5E564B',
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

/**
 * Glass, the boundary material. DESIGN.md "Elevation & Depth".
 *
 * Alpha and blur are not expressible as colour tokens, so they live here and the hex
 * in `colors.glass` is the composited appearance. The floors are not stylistic: below
 * ~65% alpha, text on glass fails against a point cloud that can put a bright cluster
 * anywhere behind it, and legibility of a measurement beats the effect every time.
 */
export const glassMaterial = {
  /** Never below 0.65. */
  alpha: 0.72,
  /** Capped at 12. */
  blurPx: 12,
  /** The canvas-facing edge. Machined bezel, never Scribe line. */
  edge: colors.hudEdge,
} as const;

/**
 * Canvas atmosphere. DESIGN.md "Canvas".
 *
 * These apply INSIDE the WebGL viewport and nowhere else. Applying any of them to a
 * panel is the most damaging single mistake available in this design system.
 *
 * Both budgets are ceilings with a stated reason, not taste:
 *  - grain above ~0.04 starts competing with the dimmest measurements, which is the
 *    one thing it must never do;
 *  - vignette beyond ~0.35 at the corner begins hiding measurements near the frame
 *    edge rather than merely seating the HUD readouts that sit there.
 *
 * Atmosphere is the last thing drawn and the first thing cut. If it costs measurable
 * frame time against the 60k-point / 60fps budget, reduce it until it does not.
 */
export const canvasAtmosphere = {
  /** Luminance grain amplitude, 0-1. Breaks 8-bit banding in the near-black. */
  grainAmplitude: 0.035,
  /** Corner falloff, 0-1 at the extreme corner. */
  vignetteStrength: 0.32,
  /** Measurements composite additively, so density reads as luminance. */
  additiveBlending: true,
  /**
   * Per-point alpha with NORMAL blending. Near-opaque: one point, one colour.
   */
  pointAlpha: 210,
  /**
   * Per-point alpha under ADDITIVE blending, where alpha is a gain rather than an
   * opacity. This is much lower and the reason is a promise DESIGN.md makes: additive
   * "reads accurately at the sparse end and approximately in the core".
   *
   * At the opaque 210 that promise breaks immediately - a single hot measurement
   * contributes 82% of a thermal colour that is already near-white, so isolated points
   * blow out and the colormap stops meaning anything anywhere. Measured: every matched
   * point rendered pure white, against warm cream in the non-additive control.
   *
   * 60 is the MEASURED optimum, not a guess. Colormap hue retained across lit pixels,
   * demo query, 1-year trail:
   *
   *     no additive (alpha 210)   76.4%   <- the control
   *     additive @ 130            12.0%
   *     additive @  90            22.9%
   *     additive @  60            46.9%   <- best achievable
   *     additive @  40            22.6%   (points so dim the lit pixels are basemap)
   *
   * Read that honestly: additive costs ~30 points of colormap legibility here even at
   * its best, and DESIGN.md's promise that it "reads accurately at the sparse end" does
   * NOT hold for this data. The reason is structural rather than a tuning failure -
   * ~3.5 matched measurements sit at nearly the same screen position per profile,
   * because a profile is one lat/lon and these all sit at 3-10 m. There is no sparse
   * end: the sparsest visible unit is already a stack.
   *
   * `additiveBlending: false` above reverts the whole effect in one line.
   */
  additiveAlpha: 60,
} as const;

/**
 * The context cloud. DESIGN.md "Canvas".
 *
 * Measurements that did NOT match the query, drawn beneath the ones that did. The
 * argument is honesty before atmosphere: showing only survivors renders a filter as an
 * absence, and a viewer cannot tell a query that excluded 59,000 measurements from a
 * dataset that only ever held 411. Drawing the rejected set makes the filter legible AS
 * a filter.
 *
 * Every value here exists to keep context subordinate to data:
 *
 *  - It is drawn in the NEUTRAL ramp, never through a colormap. A context point carries
 *    no encoded value, and giving it one would put thousands of colormap samples on the
 *    canvas that mean nothing - the exact mistake DESIGN.md argues against for the
 *    basemap. Graphite is hue-separated from every scientific colormap, so a coloured
 *    pixel still always means a measurement that matched.
 *  - Alpha and radius sit below the matched cloud's (210 alpha, 2.1 px) by enough that
 *    the two never compete. If context ever reads as foreground, lower these - do not
 *    raise the matched cloud, which is already at the top of its range.
 */
export const contextCloud = {
  /**
   * Well under the matched cloud's 210, but this floor is measured rather than chosen.
   * At 52 the cloud was invisible: Graphite at 20% over a #090A0C basemap lands about
   * 20/255 above ground, and ScatterplotLayer blends normally rather than additively,
   * so overlapping points converge on that value instead of accumulating past it.
   */
  alpha: 90,
  /** Smaller than a matched point at every zoom. */
  radiusPx: 1.3,
  radiusMinPx: 0.8,
} as const;

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
  /**
   * The only place the apparatus shouts. A handful of numbers in this product are not
   * readouts, they are the claim it is making. Max FOUR on screen, and never bound to
   * a value that changes per frame - a 40px numeral counting up during playback is a
   * distraction, not a hero. Still mono: an instrument measured these.
   */
  dataHero: { size: 40, weight: 400, leading: 1.0, tracking: '-0.02em' },
  dataLg: { size: 20, weight: 400, leading: 1.2, tracking: '-0.01em' },
  dataMd: { size: 13, weight: 400, leading: 1.45, tracking: '0' },
  dataSm: { size: 11, weight: 400, leading: 1.4, tracking: '0' },
} as const;

/**
 * Motion. DESIGN.md "Motion", which REPLACED an earlier rule banning interface
 * animation outright. See docs/adr/0005-motion-for-explanation.md.
 *
 * The rule: motion is permitted where it explains a causal relationship, and
 * forbidden as decoration. The test has a factual answer - what does this movement
 * teach that a static frame would not? "It feels polished" means delete it.
 *
 * Two constraints that are design decisions, not engineering details:
 *   1. transform and opacity ONLY. Never width/height/top/left/box-shadow - those
 *      animate on the main thread, and stuttering chrome undermines the product's
 *      central claim (60k points at 60fps) in the most visible way available.
 *   2. The canvas owns the frame budget. While the time cursor plays, chrome is still.
 *
 * Data values never tween. A readout counting from 743 to 812 displays figures that
 * were never measured - a correctness bug wearing a nice coat.
 */
export const motion = {
  /** State changes only: hover, selection, panel open. Colour and opacity. */
  fast: 120,
  medium: 200,
  /** Explanatory motion floor. Below this it reads as a glitch, not a relationship. */
  explainFast: 240,
  /** Explanatory motion ceiling. Above this a second viewing becomes a wait. */
  explainSlow: 520,
  /** Per-item stagger. Capped with `staggerMaxItems` - see below. */
  stagger: 40,
  /**
   * Beyond six, a stagger stops reading as "these arrived together" and starts
   * reading as a queue the user is waiting on.
   */
  staggerMaxItems: 6,
  /** Fast departure, long settle, no overshoot. Nothing in this system bounces. */
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  /** The same curve's control points, for consumers that cannot parse the CSS string. */
  easingPoints: [0.2, 0, 0, 1],
} as const;

/**
 * `motion.easing` as a JavaScript function.
 *
 * Same values, different encoding - never a second source, exactly as `rgb` mirrors
 * `colors`. CSS transitions take the bezier string; a deck.gl camera transition takes a
 * `(t: number) => number`, and there is no way to hand it the string. Writing an
 * eyeballed easeInOutCubic at the call site instead would mean the camera and the
 * chrome moved on visibly different curves while both claimed to use "the" easing.
 *
 * Newton-Raphson on the x-polynomial, then evaluate y. Six iterations converges well
 * inside a pixel for any curve this system defines, and the loop runs once per frame
 * of a transition that lasts at most 520ms.
 */
export function ease(t: number): number {
  const [x1, y1, x2, y2] = motion.easingPoints;
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const curve = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  const slope = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * (a - 0) + 6 * v * u * (b - a) + 3 * u * u * (1 - b);
  };

  let u = t;
  for (let i = 0; i < 6; i += 1) {
    const dx = curve(x1, x2, u) - t;
    const d = slope(x1, x2, u);
    if (Math.abs(d) < 1e-6) break;
    u -= dx / d;
  }
  return curve(y1, y2, Math.max(0, Math.min(1, u)));
}

/**
 * The arrival camera. DESIGN.md "Motion" / "Continuity of viewpoint".
 *
 * Every arrival starts looking straight down and eases to an oblique angle. The move
 * is explanatory in the sense DESIGN.md sanctions: a top-down frame reads as a MAP and
 * an oblique one reads as a VOLUME, so the rotation is what tells the user the third
 * axis exists at all. A static oblique frame states that; the rotation demonstrates it.
 *
 * `arrivalMs` DIVERGES from the 240-520 ms explanatory band, deliberately and on the
 * build owner's instruction. The argument for the band is that "a second viewing
 * becomes a wait", and it holds for chrome - a chip row that takes 2.5s to settle is
 * unusable. It holds much more weakly for the canvas, which the governing thesis
 * explicitly exempts from the instrument's austerity ("the camera moves"), and this
 * flight occupies latency that already exists while the context cloud is still loading.
 * It is recorded in UI_POLISH_PLAN.md rather than left to look like an oversight.
 *
 * Reduced motion lands on `restPitchDeg` instantly - never part-way down.
 */
export const camera = {
  /** Straight down. Reads as a map: a plan view with no volume in it. */
  arrivalPitchDeg: 90,
  /** Resting pitch. Oblique enough that the water column has visible extent. */
  restPitchDeg: 35,
  /** See the divergence note above before changing this. */
  arrivalMs: 2500,
} as const;

/**
 * Entry of the measurements themselves.
 *
 * Two beats rather than one: colour arrives before size finishes, so the cloud reads as
 * resolving into focus instead of inflating. Both stay inside the explanatory band,
 * unlike the camera - these are attached to the data appearing, which is the case
 * DESIGN.md describes as "state that would otherwise appear instantly and therefore
 * invisibly", and that case is explicitly not allowed to ADD latency.
 *
 * On per-point stagger: DESIGN.md caps staggering at six items, beyond which it "stops
 * reading as 'these arrived together' and starts reading as a queue". A 60,000-point
 * stagger is outside that rule by four orders of magnitude, and deck.gl's attribute
 * transitions carry one duration per attribute in any case. The two-beat, layer-wide
 * entry is the design-system-compliant reading of "staggered" here.
 */
export const pointEntry = {
  /** Alpha 0 -> full. The faster beat. */
  fadeMs: 240,
  /** Radius 0 -> full. The slower beat, so size settles last. */
  scaleMs: 520,
} as const;

/**
 * Reduced motion is a real state, not a checkbox.
 *
 * Every animation must resolve INSTANTLY TO ITS FINAL STATE - never to a degraded or
 * half-played one. Consumers that animate in JS (camera flights, the demo director)
 * must check this themselves: the blanket `animation: none` rule in globals.css only
 * reaches CSS, and a JS rAF loop will happily keep moving under it.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const layout = {
  /** Fixed. A scientist comparing two sessions needs the same readout width both times. */
  inspectorWidth: 380,
  topBarHeight: 52,
  timelineHeight: 64,
  /**
   * Depth-profile chart. Tall enough that a thermocline is a visible inflection rather
   * than a kink, short enough that the chart and its readout grid both clear the fold
   * of a 1080p capture inside a 380px column.
   */
  profileChartHeight: 300,
  /** Below this the inspector becomes an overlay rather than compressing. */
  overlayBreakpoint: 1100,
} as const;

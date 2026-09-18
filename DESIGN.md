---
version: alpha
name: Chart Room
description: Design system for FloatChat — a 4D visualization and natural-language query platform for ARGO oceanographic float data. An austere instrument wrapped around a cinematic ocean; the boundary between the two is the design.

colors:
  primary: "#EDE9E5"
  secondary: "#97918A"
  tertiary: "#DA55A1"
  tertiary-strong: "#F077B1"
  neutral: "#191714"
  surface: "#0D0C0A"
  surface-raised: "#26231F"
  on-surface: "#DBD6D1"
  border: "#36322E"
  error: "#E46870"
  warning: "#D89F45"
  glass: "#1F1C18"
  hud-edge: "#5E564B"

typography:
  display:
    fontFamily: Archivo
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Archivo
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Archivo
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.28
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Archivo
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Archivo
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Archivo Narrow
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.12em
    fontFeature: "'case' 1"
  label-md:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0.005em
  caption:
    fontFamily: Archivo
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  data-lg:
    fontFamily: Commit Mono
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
    fontFeature: "'tnum' 1, 'zero' 1"
  data-md:
    fontFamily: Commit Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum' 1, 'zero' 1"
  data-sm:
    fontFamily: Commit Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum' 1, 'zero' 1"
  data-hero:
    fontFamily: Commit Mono
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.02em
    fontFeature: "'tnum' 1, 'zero' 1"
  identifier:
    fontFamily: Commit Mono
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.02em
    fontFeature: "'tnum' 1, 'zero' 1, 'liga' 0"

rounded:
  none: 0px
  sm: 2px
  md: 4px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 32px

components:
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  panel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  panel-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.headline-lg}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  section-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.headline-md}"
    padding: "{spacing.sm}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  query-answer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.display}"
    padding: "{spacing.xl}"
  summary-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    padding: "{spacing.lg}"
  provenance:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.caption}"
  readout-row:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
    height: 28px
  readout-label:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-caps}"
    padding: "{spacing.xs}"
  readout-hero:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.data-lg}"
    padding: "{spacing.sm}"
  identifier-badge:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    typography: "{typography.identifier}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 28px
  button-primary-hover:
    backgroundColor: "{colors.tertiary-strong}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 28px
  button-secondary-hover:
    backgroundColor: "{colors.border}"
    textColor: "{colors.primary}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: 32px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
  chip-filter:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  chip-filter-active:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  tooltip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  anomaly-critical:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.error}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  anomaly-warning:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.warning}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  legend:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  axis-tick:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
  status-dot:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.full}"
    size: 6px
  hud-panel:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  hud-edge:
    backgroundColor: "{colors.hud-edge}"
    height: 1px
  stat-hero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.data-hero}"
    padding: "{spacing.sm}"
---

# Chart Room

## Overview

FloatChat is read, not looked at. An oceanographer opens it to answer a question about water that nobody has looked at closely before — whether a patch of the equatorial Pacific was anomalously warm in a particular month, how deep the thermocline sat, whether a float's salinity record drifted. They will sit with it for hours, in a lab or an office with the blinds down, moving between a 3D point cloud, a depth-profile chart, and a column of numbers, and they need to trust every one of those surfaces equally.

The register is **Terminal Precision crossed with Naturalist Field Guide** — the chart table of a research vessel rather than a dashboard. Instrument chrome, hairline rules, tabular numerics, and the annotation discipline of a hydrographic chart, where a legend and a key are working parts of the document rather than decoration.

One constraint generates almost every decision in this file: **in a scientific visualization tool, color is data.** The thermal and haline ramps on the canvas *mean* temperature and salinity. Any saturated color in the surrounding interface competes with that encoding, and a color the user cannot confidently classify as chrome-or-data is worse than no color at all.

So the system makes a real and uncomfortable sacrifice: **the interface gives up color as an expressive tool so the data can own it.** Nearly the entire UI is built from seven warm-grey values a step apart. There is one accent, it has one job, and it appears on well under 5% of the surface. Hierarchy is carried by weight, size, spacing, and rule-work — the tools a cartographer had before color printing was cheap.

The second consequence is the one that will feel wrong at first: **this ocean application is not blue.** Blue-dark is both the single most recognizable machine-generated dark theme and, here, actively false — blue, teal and green are exactly what haline and viridis use to encode values. A blue interface around a blue-encoded dataset would be a lie about which pixels are measurements. The chrome is warm charcoal specifically so that the boundary between the instrument and the water is legible at a glance.

What this direction gives up, deliberately: **warmth and first-time approachability.** FloatChat will look austere and slightly forbidding to someone who opens it once. It is built for the fifth hour, not the first minute.

### The governing thesis: the instrument is austere, the water is not

Everything above describes the *chrome*, and it stands. But it is only half the system, and taking it as the whole is the mistake this section exists to prevent.

The interface has two populations of pixels and they obey **opposite** rules:

- **The instrument** — panels, readouts, tables, controls, the inspector column. Flat, warm, matte, dense, unmoving. A machined case. Nothing here glows, nothing here has a shadow, nothing here animates for pleasure.
- **The water** — everything inside the WebGL canvas. Atmospheric, luminous, deep, and in motion. Points accumulate into brightness where measurements are dense. The camera moves. There is grain in the dark and the corners fall off.

The single most important line in this document is already written elsewhere in it, and it is now promoted to the governing rule: **the viewport is a hole cut in the instrument, not a panel sitting on it.**

That boundary is the whole design. It is the reason the ocean colour sits *below* the page ground rather than above it, the reason the accent may never be an area fill inside the canvas, and the reason a user can tell at a glance which pixels are measurements and which are apparatus. A system that made the chrome cinematic too would destroy the distinction and, with it, the user's ability to trust what they are looking at.

**One material is permitted to exist at the boundary itself:** the translucent HUD surfaces that float over the canvas — the hover readout, the point counter, the map control bar, the scrubber chrome. Those may be glass, because what shows through them is literally the ocean. The instrument proper stays opaque. See *Elevation & Depth*.

**What this thesis gives up:** a coherent single look. Screenshots of the panels and screenshots of the canvas will not appear to come from the same design system, and that is correct — they are not describing the same kind of thing. Anyone tempted to reconcile them should reconcile them in the direction of *more* instrument and *less* glow, never the reverse.

## Colors

Every value is sampled from a chart room — the plotting table, the instrument housings, and the pencils and inks used to mark a chart by hand. That constraint, not preference, set the palette.

- **Surface (#0D0C0A):** *Chart table.* The near-black of an unlit plotting surface. The page ground, and the ground the WebGL canvas sits directly on so that data points have maximum available contrast beneath them. Not pure black — pure black maximizes halation around light text and makes OLED smearing visible when the time scrubber moves.
- **Neutral (#191714):** *Anodized housing.* The warm charcoal of an instrument pressure case. All panels, tables and readout surfaces. Almost the entire interface is built from the half-step between this and Chart table.
- **Surface-raised (#26231F):** *Lifted panel.* One further step up. Reserved strictly for things genuinely floating above the page — tooltips, dropdowns, chips, anomaly badges.
- **Border (#36322E):** *Scribe line.* The faint score a draftsman cuts before inking. Structural rules and table dividers only.
- **Secondary (#97918A):** *Graphite.* Pencil-annotation grey. Metadata, axis ticks, units, legend text — everything that labels a measurement without being one.
- **On-surface (#DBD6D1):** *Chart paper.* Body text and all data values. Deliberately not white: at 13.6:1 on Chart table it is well clear of AA while avoiding the optical bleed that makes pure white text on near-black look bolder than it is.
- **Primary (#EDE9E5):** *Chinagraph.* The white wax pencil a navigator marks a plotting sheet with. The brightest ink in the system, reserved for headings, hero readouts and float identifiers — the things you scan for rather than read.
- **Tertiary (#DA55A1):** *Admiralty magenta.* This is the keystone of the palette and the one color in it. British Admiralty charts reserve magenta for **human-added information overprinted on natural features** — traffic separation schemes, restricted areas, radio beacons. That is precisely the job a UI accent has in this product: it marks what a person did, over data the ocean produced. It carries interaction and selection, and nothing else.
- **Tertiary-strong (#F077B1):** The lighter step of the same ramp, for hover and pressed states only.
- **Error (#E46870):** *Overprint red.* Chart caution red, pulled toward the magenta family (hue 18°) so it reads as a member of this palette rather than a stock alert imported from elsewhere.
- **Warning (#D89F45):** *Sounding amber.* Literally the neutral ramp's own hue (76°) taken up to chroma 0.125 — the bronze in the greys, made audible. A caution state in FloatChat is the instrument talking, so it is built from the instrument's own color.
- **Glass (#1F1C18):** *Fogged port.* The colour a translucent warm-charcoal surface composites to when it sits over open water. It is the one material permitted at the instrument/water boundary, and it exists as a token so that HUD surfaces are a *named* material rather than an improvised opacity. It is deliberately a half-step between Anodized housing and Lifted panel: glass must read as instrument that happens to be translucent, never as a brighter panel. **This token is the composited appearance, not the recipe** — the implementation is this hue at roughly 72% alpha over a 12px backdrop blur, and that pairing is specified in *Elevation & Depth* because alpha and blur are not expressible as colour tokens.
- **HUD edge (#5E564B):** *Machined bezel.* The lit chamfer where a real instrument's case meets its window — the one place on a matte housing that catches light. It is the only edge in the system brighter than Graphite, and it is reserved exclusively for the boundary between chrome and canvas. Using it as a general border would flatten the single distinction the whole system is built to make, so it appears on perhaps four edges in the entire application.

**The two boundary colours are not decoration, they are the thesis made literal.** Every other colour in this palette describes the instrument or the data. These two describe the *seam*, which is the thing the Overview argues is the design.

**Construction.** The neutral ramp is built in OKLCH with the hue bending from 80° in the shadows to 65° in the highlights and chroma peaking mid-ramp at 0.012 before tapering to 0.005 at both ends. No value in this system has R = G = B. The warmth is not decorative: it is a **hue separation from the data**. The scientific colormaps live in the cool half of the wheel (haline and viridis run blue → teal → green; thermal's mid-range is magenta → red), so a warm-grey chrome is categorically distinguishable from a measurement at a glance, in a way a cool grey never would be.

**The one honest collision.** The thermal colormap passes through a magenta-adjacent region in its mid-range, so Admiralty magenta is not perfectly reserved when thermal is the active encoding. This is resolved structurally rather than by changing the hue: **the accent never appears as a fill inside the canvas.** Selection is drawn as a ring or a leader line — a stroke, an overprinted mark — which is exactly what magenta is on a real chart. Area fill inside the viewport belongs to the colormap alone.

Scientific colormaps themselves (`thermal`, `haline`, `viridis`, `balance`) are **data, not brand**, and are deliberately not tokenized here. They are perceptually-uniform sequences chosen for scientific correctness and must not be adjusted for aesthetic fit.

## Basemap

The map draws geography beneath the measurements: landmasses, the coastline, bathymetric contours, ocean names, and optionally NASA Blue Marble imagery. This is the one part of the system where the temptation to break the central rule is strongest, so the rule is restated here: **the basemap is chrome, not data.**

**The ocean is not blue, and this is where that costs something.** Every instinct says an oceanographic map should have a blue ocean. But `haline` and `viridis` encode salinity and depth in blue and teal, and a blue seafloor would put tens of thousands of blue pixels on the canvas that mean nothing at all. The user would have to learn, per-pixel, which blues are water and which are salinity — which is precisely the confusion the whole palette exists to prevent. So the water is built from the neutral ramp, with only a slight cool bias in the deep end: enough to read as water rather than as a panel, far too little to be mistaken for a colormap sample.

**That rule now has a bounded exception, and the bound is a number.** ADR 0007 amends this section: deep water takes a desaturated slate cast, and the NASA topo+bathymetry raster is drawn under the default style as a desaturated relief ground. The bound is **mean chroma ≤ 8** across the canvas, measured. For scale: the raster's own mean chroma over the demo view is 22.2, a `haline` low-end sample is 83, and the amended basemap measures **6.47**. The rule's purpose — that a viewer never has to ask whether a blue pixel means something — survives, because a basemap pixel is nowhere near the chroma of a measurement.

**Depth tinting, not just contours.** The bathymetric contours are filled as well as stroked. This is what gives the water its tonal structure, and the reason it matters is that without it the canvas measured a **single luminance value across three-quarters of the frame**. A chart tints depth; so does this.

- **Ocean (#4A463D):** *Continental shelf* — water shallower than the 200 m contour, and the **lightest** tone in the water. It was `#090A0C`, the darkest value in the system, and that was a category error with no visible consequence: bathymetry drew only as sub-pixel strokes, so this plane was the whole ocean and nothing contradicted it. Once the depth bands are filled (ADR 0007) the plane is exactly what the 200 m ring leaves uncovered, which is shelf. Shallow reads light, as on any chart.
- **Land (#17150F):** Landmass fill. Warm, a step above the water. Land is the raised form, and on this palette raised means warmer, matching the tonal ladder.
- **Land edge (#4A443C):** The coastline. Deliberately the firmest line in the basemap and lighter than Scribe line, because the ocean/land boundary is the one edge a reader orients from; it is the exception to "hairlines are quiet."

**Bathymetry** is a seven-step ramp from 200 m to 6000 m, running `#423E37` → `#1A1E25`, and it still **darkens with depth** — that matches the chart convention that deeper water carries heavier ink, and reversing it would read as wrong to anyone who has seen a real chart.

What changed is the **floor**. The ramp used to bottom out at `#161616` over a `#090A0C` plane, chosen so the abyssal plain — most of the Pacific, and therefore most of the canvas — would be the quietest thing in the frame. This dataset sits entirely over abyssal plain, so the quietest thing in the frame was the whole frame. The ramp is lifted and its deep end stretched, because that is where this dataset lives. The hue bends warm-to-cool with depth, within the chroma bound above.

**Ocean labels** use the condensed uppercase cartographic register in Graphite, the colour for anything that labels a measurement without being one. Names only — oceans and seas, never countries. The dataset lives in open Pacific water, so country labels would be clutter a long way from anything the user is looking at.

**Satellite imagery is the deliberate exception**, and it is quarantined rather than tokenized. It is genuine photography and cannot be desaturated into this palette without becoming useless as imagery. It is therefore held at 55% opacity so the measurements stay the brightest thing in the frame, it is opt-in behind a control, and it is never the default. A colormap must still win against it, which is the test any basemap has to pass.

## Canvas

This section governs the cinematic half of the system. Everything here applies **inside the WebGL viewport and nowhere else**. Reading a rule from this section and applying it to a panel is the single most damaging mistake available in this design system.

**The problem being solved.** A scatter of flat, opaque, equally-bright dots is a *plot*. It shows position and it shows value, and it throws away the third thing a scientist actually wants from a cloud of 60,000 measurements: **where the data is dense.** A cluster of two hundred casts and a lone profile currently paint the same brightness. That is a lie of omission, and fixing it is what makes the canvas cinematic rather than merely decorated.

**Density is luminance — and this one did not survive contact with the data.** The intent was that measurements composite **additively**, so overlapping points accumulate toward white. This is not a glow effect borrowed from a game engine — it is the same reason a long-exposure photograph of traffic shows the busiest lane brightest, and it converts occlusion from a problem into information. A sparse edge of the dataset stays dim; a well-surveyed patch of the equatorial Pacific burns. Two consequences follow and both are accepted:

- Additive blending makes dense regions **lose hue** as they saturate toward white. The colormap therefore reads accurately at the sparse end and approximately in the core. That is the correct trade for this product, because the legend and the readouts carry exact values and the canvas carries *structure*.
- It composites poorly over bright ground, which is one more reason satellite imagery is capped at 55% and is never the default.

**Additive is currently OFF** (`canvasAtmosphere.additiveBlending: false`), for both reasons above, measured rather than assumed. ARGO profiles are ~1,000 levels at a single lat/lon, so the sparsest visible unit on this canvas is already a *stack* of coincident points — there is no sparse end for the first bullet's promise to hold at, and hue retention measured 76.4% → 46.9% over the old ground at the best of four gains. The second bullet then came true when the ground was lifted (ADR 0007): 46.9% → 33.3%, against 71.3% with additive off, for a difference that is visually negligible at demo framing. The argument above is still the right one for a spatially distributed cloud; it is the wrong one for this data shape. One token restores it if the dataset ever changes.

**Atmosphere: grain and vignette.** The canvas carries a fine luminance grain and a soft corner falloff. Both are quiet enough to be deniable in a still and clearly present in motion, and both earn their place mechanically rather than stylistically:

- **Grain** breaks up the banding that a near-black gradient produces on 8-bit displays, and it gives the eye a texture to lock onto so the dark areas read as *space* rather than as a dead region of the screen. Budget: under 4% amplitude. Above that it starts competing with the dimmest measurements, which is the one thing it must never do.
- **Vignette** does the work a lens does — it pulls attention to the centre of the frame and, more usefully here, it darkens exactly the corners where the HUD readouts sit, buying those surfaces contrast without putting a box around them. Budget: no more than 35% at the extreme corner, and it must fall off smoothly enough that a measurement near the edge is still clearly visible.

**Both budgets survived a deliberate review, and the review is the interesting part.** Grain and vignette twice measured as doing nothing, and the obvious response was to raise the ceilings. Re-deriving them says the opposite. Both caps are justified above in terms of the **measurements** — grain must not compete with the dimmest ones, vignette must not hide ones near the frame edge — and the measurements never changed. What changed is that the effects had nothing to act on: over a ground of luminance 9.9 the whole 32% vignette budget was worth ~3 levels. Against the amended ground (~21) the same 0.32 darkens corners by ~6.7 levels and the same 3.5% grain lifts by up to ~8. **The budgets were never the problem; the ground was.** Raising them now would do exactly what their stated reason forbids. See ADR 0007.

**The hard budget.** Atmosphere is the *last* thing drawn and the *first* thing cut. If grain, vignette and additive blending together cost measurable frame time at the established 60,000-point/60 fps budget, they are reduced until they do not. A beautiful canvas that drops frames during time playback has destroyed the one moving thing the product exists to show.

**What stays flat.** The basemap does not glow, does not accumulate, and does not receive grain of its own. It is reference geography — chrome that happens to live inside the viewport — and the atmosphere applies to the water and the measurements, not to the map beneath them.

## Typography

Two families, split by who the text is for.

**Archivo** (Omnibus-Type, SIL OFL) carries the voice — headings, prose, controls, anything a person wrote. It is a grotesque with genuine American-gothic bones, it is variable, and it ships a real condensed family, which matters below. It is here partly because it is *not* Inter: Inter is excellent and it is the reflexive answer, and a system whose type choice was reflexive tends to have made every other choice reflexively too.

**Archivo Narrow** handles uppercase labels at 11px with +0.12em tracking. This is the cartographic register — the condensed, spaced, all-caps label is how a chart names a feature without crowding it, and it is the single strongest signal that this interface descends from a map rather than from a dashboard. Uppercase set at default tracking looks broken rather than emphatic, so the tracking is not optional.

**Commit Mono** carries the apparatus: every coordinate, depth, temperature, salinity, timestamp, cycle number and WMO identifier. Monospace is not stylistic here — it is load-bearing. Fixed advance width means a column of latitudes aligns on the decimal for free, and `tnum` plus a slashed zero (`zero`) removes the two ambiguities that actually cost a scientist time: jittering columns and O-versus-0 in a float ID. `liga` is disabled on identifiers so nothing in a WMO number fuses into a glyph that isn't there.

The division is legible and it survives at every size: **if a human wrote it, it is Archivo; if an instrument measured it, it is Commit Mono.**

**Fallback stacks.** Archivo → `'Archivo', 'Helvetica Neue', Arial, sans-serif`. Archivo Narrow → `'Archivo Narrow', 'Archivo', 'Arial Narrow', sans-serif`. Commit Mono → `'Commit Mono', 'JetBrains Mono', 'SF Mono', Menlo, monospace`. Self-host all three with `font-display: swap`. Archivo is SIL OFL and unencumbered; **Commit Mono's licence terms should be confirmed before shipping** — if that check fails, JetBrains Mono (SIL OFL) is the drop-in replacement and the system is unaffected.

**Scale.** Generated at a 1.2 minor third from a 13px base — correct for dense professional UI, where 16px body wastes rows — then broken deliberately at the top: `display` jumps to 32px rather than the 26px the ratio would give, because the one large moment in the interface (the answer to a query) has to feel like a different kind of object than a panel title.

**`data-hero` (40px mono) is the second deliberate break, and it is the only place the apparatus is allowed to shout.** A handful of numbers in this product are not readouts at all — they are the claim the product is making: *1,038,872 measurements. 12 floats. 60,000 points rendered.* Set at `data-md` in a corner, which is where they lived before, they are true and invisible. The scale therefore carries one monospace size far above the rest, used for **no more than four values on screen at once** and never for a value that changes on every frame — a 40px numeral counting up during playback is a distraction, not a hero. Tracking goes to −0.02em because at 40px the mono's default advance opens up and the number stops reading as a single object. It remains Commit Mono, not Archivo: an instrument measured these, and making them large does not make them prose.

Line-height moves inversely to size across the whole scale, from 1.05 at display to 1.6 at `body-lg`. Tracking is optical: −0.03em at display, neutral through body, +0.12em on uppercase labels. **Two weights only, 400 and 700.** Nothing intermediate — 500 and 600 create visual noise without creating hierarchy.

## Layout

Persistent chrome, asymmetric, on a **4px base grid**. Nothing in this interface is centered.

The frame is fixed and three-part: a **top bar** carrying the query input and the parsed-filter chips; a **main stage** holding the WebGL canvas with the time scrubber pinned beneath it; and a **right inspector panel** at a fixed 380px, holding float readouts, depth-profile charts and anomaly badges. The canvas takes all remaining space and is the only element permitted to grow — the panel does not resize with the viewport, because a scientist comparing two sessions needs the readout column to be the same width both times.

Density is high and it is *not* uniform. Readout rows sit at 28px on 4px vertical padding — an 18.9px line box in `data-md` plus air, and nothing more; prose blocks — query summaries, anomaly explanations — get `lg` padding and a 65ch measure. That contrast is the emphasis mechanism: a paragraph reads as important precisely because everything around it is tight.

Tables and readouts are the primary content type, so they get the structural treatment a chart would give them: aligned columns, decimal-aligned numerics, hairline dividers, and uppercase labels above rather than beside their values.

Below 1100px the inspector panel moves to an overlay sheet above the canvas rather than compressing. There is no phone layout, and pursuing one would be a mistake — this is instrument software.

## Elevation & Depth

**There are no shadows in this system.** On a near-black ground a shadow is invisible, and simulating one with a dark halo produces mush. Depth is carried by two mechanisms, both borrowed from print.

**Tonal ladder.** Surfaces get lighter as they rise: Chart table (`#0D0C0A`) → Anodized housing (`#191714`) → Lifted panel (`#26231F`). Three steps is the entire vocabulary. A fourth is not available, which forces genuine hierarchy decisions rather than stacking.

**Hairline rules.** A 1px `border` line does the work a shadow would. Rules separate; they do not enclose. A table gets horizontal dividers between rows and no vertical lines and no outer box, exactly as a well-set chart table does.

`Surface-raised` is reserved for things actually floating — tooltips, dropdown menus, the anomaly badges that overlay a profile chart. A static panel is not floating, and giving it a raised value flattens the one distinction the ladder exists to make.

**The third mechanism, and it exists at exactly one place: glass.** A surface that floats over the *canvas* — not over a panel — may use Fogged port at ~72% alpha with a 12px backdrop blur, edged on the canvas side with Machined bezel. This is the only translucency in the system.

The reasoning is the Overview's thesis applied literally. Everywhere else, translucency would be decoration: there is nothing meaningful behind a panel, so blurring it simulates a depth that does not exist. Over the canvas there *is* something behind — the ocean, in motion — and letting it through is the honest representation of a readout that belongs to the water rather than to the case. It also solves a real legibility problem: a hover readout must not become an opaque hole punched in the data the user is trying to read.

The rules are narrow on purpose:

- **Glass only ever sits over the canvas.** The inspector column, every `Panel`, every readout grid and the header stay opaque. A glass panel over another panel is the "pile of frosted cards" failure this system's whole tonal ladder exists to avoid.
- **Blur is capped at 12px and alpha never drops below ~65%.** Below that, text on glass fails against a moving, unpredictable background — a point cloud can put a bright cluster anywhere. Legibility of a measurement beats the effect, always.
- **Machined bezel edges the glass; Scribe line does not.** This is the boundary, and the boundary is the one edge permitted to be bright.
- **Shadows remain banned, including under glass.** Blur and the bezel carry the separation. A shadow on near-black is mush, and adding one here would be importing an idiom this system rejected for good reasons.

**A note on interactive outlines**, since `borderColor` is not a valid component token: Scribe line is intentionally quiet (1.5:1 against the page) because a structural rule that competes with data is a bug. It is therefore **not sufficient for interactive boundaries**. Input outlines and any control edge that must be perceivable use Graphite (`#97918A`, 6.3:1 on the page), and focus rings use a 2px Admiralty magenta outline with a 1px offset (5.4:1 on the page, comfortably past the 3:1 the guideline sets for focus indicators).

## Shapes

Radius is **hierarchical and it encodes a distinction**: whether a thing is chart substrate or a control.

- **`none` (0px)** — panels, table cells, the canvas, legends, the time scrubber track. Everything that represents or contains data is square, because charts do not have rounded corners and a rounded data surface reads as a card about the data rather than the data itself.
- **`sm` (2px)** — inputs and chips. Barely perceptible; enough to say "you can type here."
- **`md` (4px)** — buttons only. The most rounded thing in the interface is the thing you press.
- **`full`** — status dots and the float selection ring exclusively. Nothing else may use it.

The rule is short enough to remember: **if it holds data it is square; if you click it, it is not.** A uniform radius across the interface would erase the only shape-level information the system carries.

Borders are 1px and never doubled. No element carries a border *and* a raised tonal value *and* a radius — that combination is what makes generated interfaces read as a pile of undifferentiated boxes.

## Motion

**This section replaces an earlier rule that said the interface must not animate at all.** That rule was written to protect something real, and the replacement protects the same thing by a sharper test. The original reasoning was: *the only thing that moves is the data, and universal animation destroys that distinction.* The failure of the rule was that it defended the distinction by banning a whole medium, which also banned the cases where motion is the clearest way to tell the truth.

**The rule now: motion is permitted where it explains a causal relationship, and forbidden as decoration.**

The test is a question with a factual answer, not a matter of taste: *what does this movement teach the user that a static frame would not?* If the answer is "it shows that A produced B," the motion is doing work. If the answer is "it feels polished," it is decoration and it does not ship.

Three things qualify, and they are close to an exhaustive list:

- **Causation between panels.** A sentence becomes a set of filters. The filters produce a result. When chips descend from the query the user typed, the animation is making an argument — *your words became these constraints* — that a static row of chips states but does not demonstrate. This is the highest-value motion in the product because the parsing is the least visible thing it does.
- **Continuity of viewpoint.** When the camera moves to a new target, interpolating instead of cutting preserves the user's mental model of where they are in a 3D volume. A cut forces re-orientation from scratch; this is the oldest and best-established argument for animation in spatial interfaces, and it is why arrival is a flight rather than a snap.
- **State that would otherwise appear instantly and therefore invisibly.** A query that returns in 300 ms with no transition gives the user no evidence that anything happened. A brief, honest entry makes cause and effect perceptible. It must never *add* delay to make the product feel busier — it may only occupy latency that already exists.

Everything else does not qualify. Hover states, panel opens and selection remain at **120ms** and are colour-and-opacity only. Data values never animate between numbers: a readout that tweens from 743 to 812 is displaying figures that were never measured, which in this product is a correctness bug wearing a nice coat.

**Duration and easing.** Explanatory motion runs **240–520 ms** — long enough to be perceived as a relationship rather than a glitch, short enough that a second viewing is not a wait. State changes stay at 120 ms. Easing is `cubic-bezier(0.2, 0, 0, 1)` throughout: fast departure, long settle, no overshoot. **Nothing in this system bounces.** An instrument that springs is an instrument that is lying about its mass.

**Staggering** is capped at 40 ms per item and 6 items. Beyond that it stops reading as "these arrived together" and starts reading as a queue the user is waiting on.

**Two hard implementation constraints, which are design decisions and not engineering details:**

1. **Transform and opacity only.** Never `width`, `height`, `top`, `left` or `box-shadow`. Those properties animate on the main thread, and an interface that stutters while claiming to render 60,000 points at 60 fps has undermined the product's central claim in the most visible way available.
2. **The canvas owns the frame budget.** Chrome animation must never contend with playback. When the time cursor is advancing, the interface is still.

**Reduced motion is a real state, not a checkbox.** With `prefers-reduced-motion: reduce`, every animation here resolves **instantly to its final state** — never to a degraded or half-played one. The parse ribbon shows its chips, the camera is already at its target, points are fully drawn. The product must be completely usable, and completely legible, with every animation in this document removed. If a feature stops making sense without its motion, the motion was carrying meaning that should have been in the layout.

## Components

**Buttons** are 28px tall — deliberately short, matching the row rhythm rather than the 40px of a consumer product. `button-primary` is Admiralty magenta with Chart table text on it and is limited to **one per view**: run the query. Everything else is `button-secondary`. If a screen appears to need two primary buttons, one of them is not primary.

**The query input** is the widest single element in the interface and sits on Chart table rather than a panel, so it reads as a slot cut into the page rather than a control placed on it. On error it does not turn red — the input keeps its outline and an `input-error` message appears beneath it in Overprint red, because destroying the field's affordance to signal a problem makes the field harder to fix.

**Readouts** pair `readout-label` above `readout-row`, never beside. Uppercase Archivo Narrow label, monospace value, decimal-aligned within its column. Units belong in the label, not repeated on every value — a column of `29.41` under a `TEMP °C` label is faster to scan than a column of `29.41 °C`.

**Identifier badges** carry WMO float IDs in bold mono with ligatures off. A float ID is the primary key of this entire product, and it must be visually copy-pasteable and unambiguous.

**Anomaly badges** encode severity three ways: a leading glyph (`▸` critical, `·` warning), the severity word itself, and color. Color is the *last* of the three and is never load-bearing. Each badge shows its `evidence` values inline — `sst 29.41 > 29.00` — because a flag a scientist cannot audit is a flag they will not trust.

**The legend** is a first-class component, not an afterthought floating over the canvas. It sits on Anodized housing in the panel with a square edge, uses `data-sm` for its numeric stops, and always states the variable and its unit. A colormap without a legend is unreadable data, and this is the single most important control on the screen.

**Tooltips** appear on Lifted panel with `body-sm`, 120ms delay, no animation on exit. They may carry an exact value, never an interpretation.

**HUD surfaces** (`hud-panel`) are the readouts that live over the canvas — the hover measurement, the point counter, the map control bar, the scrubber chrome. They are glass per *Elevation & Depth*, square-cornered like every other data surface, and edged with `hud-edge` on the side that meets the canvas. They are **never interactive targets for anything destructive** and they are always `pointer-events: none` unless they contain a control, because a transparent surface that silently swallows clicks aimed at a measurement is indistinguishable from broken picking.

**Stat heroes** (`stat-hero`) carry the four-or-fewer numbers that state what the product is: total measurements, floats, matched results, points rendered. `data-hero` numeral in Chinagraph over Chart table, with a `label-caps` label above it in Graphite, on the same label-above-value pattern as every other readout — the pattern does not change just because the size does. Never more than four on screen, and never bound to a value that updates per frame.

## Do's and Don'ts

- **Do** keep Admiralty magenta under 5% of the surface. It marks interaction and selection — the primary action, the selected float, the focus ring — and nothing else.
- **Don't** put the accent, or any chrome color, *inside* the canvas as a fill. Selection is a ring or a leader line. Area color inside the viewport belongs to the colormap alone.
- **Don't** introduce a second accent. If something needs emphasis, use `primary` ink, weight, or space. A second accent means the first one stopped meaning anything.
- **Do** set every number in Commit Mono with `tnum` and `zero`, and align columns on the decimal. A jittering numeric column is a legibility bug, not a style preference.
- **Don't** use blue, teal, or green anywhere in the chrome. Those hues are reserved for data encoding, and borrowing them makes measurements ambiguous.
- **Do** encode every state with at least two channels — glyph plus label plus color. Never color alone. Around 1 in 12 men has a color vision deficiency, and here a misread color is a misread measurement.
- **Don't** add shadows. Depth is the three-step tonal ladder and 1px hairlines. If something needs to feel raised, move it up a step or give it space.
- **Do** keep the radius rule intact: square if it holds data, `sm`/`md` if you interact with it. Never a uniform radius across the interface.
- **Don't** use Scribe line for anything a user must perceive to operate a control — it is a quiet structural rule. Interactive outlines use Graphite; focus uses magenta.
- **Do** state the variable and unit on every legend and axis. An unlabeled colormap is not a visualization.
- **Don't** exceed two font weights (400/700) or reach for 500 and 600. If hierarchy is unclear, the fix is size and spacing, not another weight.
- **Do** keep prose at a 65ch measure and let it sit in the density contrast — tight tables around a loose paragraph is how this system creates emphasis.
- **Do** animate only to explain a causal relationship — a sentence becoming filters, a camera keeping its bearings, a result arriving. If the honest answer to *"what does this teach that a static frame would not?"* is "it feels polished," delete it. Explanatory motion is 240–520ms; state changes stay at 120ms.
- **Don't** animate with any property but `transform` and `opacity`, and don't animate anything while the time cursor is playing. **Never tween a data value** — a number that counts up is displaying figures that were never measured.
- **Don't** let the chrome become cinematic. Glow, grain, vignette and additive blending belong inside the canvas and nowhere else; the instrument is flat, warm and matte. If a panel and the canvas start to look like the same kind of object, the system has failed.
- **Do** keep glass at the boundary only — over the canvas, never over another panel — at ≥65% alpha and ≤12px blur, edged with Machined bezel. Text legibility over a moving point cloud beats the effect every time.
- **Do** give every animation a reduced-motion path that lands on the **final** state instantly. The product must be fully legible with all motion removed.
- **Don't** center anything. The layout is asymmetric and left-aligned throughout, including headings and empty states.
- **Do** treat the scientific colormaps as data. They are chosen for perceptual uniformity and are never adjusted to match the brand.

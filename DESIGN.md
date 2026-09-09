---
version: alpha
name: Chart Room
description: Design system for FloatChat — a 4D visualization and natural-language query platform for ARGO oceanographic float data, used by marine scientists in long analytical sessions.

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
---

# Chart Room

## Overview

FloatChat is read, not looked at. An oceanographer opens it to answer a question about water that nobody has looked at closely before — whether a patch of the equatorial Pacific was anomalously warm in a particular month, how deep the thermocline sat, whether a float's salinity record drifted. They will sit with it for hours, in a lab or an office with the blinds down, moving between a 3D point cloud, a depth-profile chart, and a column of numbers, and they need to trust every one of those surfaces equally.

The register is **Terminal Precision crossed with Naturalist Field Guide** — the chart table of a research vessel rather than a dashboard. Instrument chrome, hairline rules, tabular numerics, and the annotation discipline of a hydrographic chart, where a legend and a key are working parts of the document rather than decoration.

One constraint generates almost every decision in this file: **in a scientific visualization tool, color is data.** The thermal and haline ramps on the canvas *mean* temperature and salinity. Any saturated color in the surrounding interface competes with that encoding, and a color the user cannot confidently classify as chrome-or-data is worse than no color at all.

So the system makes a real and uncomfortable sacrifice: **the interface gives up color as an expressive tool so the data can own it.** Nearly the entire UI is built from seven warm-grey values a step apart. There is one accent, it has one job, and it appears on well under 5% of the surface. Hierarchy is carried by weight, size, spacing, and rule-work — the tools a cartographer had before color printing was cheap.

The second consequence is the one that will feel wrong at first: **this ocean application is not blue.** Blue-dark is both the single most recognizable machine-generated dark theme and, here, actively false — blue, teal and green are exactly what haline and viridis use to encode values. A blue interface around a blue-encoded dataset would be a lie about which pixels are measurements. The chrome is warm charcoal specifically so that the boundary between the instrument and the water is legible at a glance.

What this direction gives up, deliberately: **warmth and first-time approachability.** FloatChat will look austere and slightly forbidding to someone who opens it once. It is built for the fifth hour, not the first minute.

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

**Construction.** The neutral ramp is built in OKLCH with the hue bending from 80° in the shadows to 65° in the highlights and chroma peaking mid-ramp at 0.012 before tapering to 0.005 at both ends. No value in this system has R = G = B. The warmth is not decorative: it is a **hue separation from the data**. The scientific colormaps live in the cool half of the wheel (haline and viridis run blue → teal → green; thermal's mid-range is magenta → red), so a warm-grey chrome is categorically distinguishable from a measurement at a glance, in a way a cool grey never would be.

**The one honest collision.** The thermal colormap passes through a magenta-adjacent region in its mid-range, so Admiralty magenta is not perfectly reserved when thermal is the active encoding. This is resolved structurally rather than by changing the hue: **the accent never appears as a fill inside the canvas.** Selection is drawn as a ring or a leader line — a stroke, an overprinted mark — which is exactly what magenta is on a real chart. Area fill inside the viewport belongs to the colormap alone.

Scientific colormaps themselves (`thermal`, `haline`, `viridis`, `balance`) are **data, not brand**, and are deliberately not tokenized here. They are perceptually-uniform sequences chosen for scientific correctness and must not be adjusted for aesthetic fit.

## Basemap

The map draws geography beneath the measurements: landmasses, the coastline, bathymetric contours, ocean names, and optionally NASA Blue Marble imagery. This is the one part of the system where the temptation to break the central rule is strongest, so the rule is restated here: **the basemap is chrome, not data.**

**The ocean is not blue, and this is where that costs something.** Every instinct says an oceanographic map should have a blue ocean. But `haline` and `viridis` encode salinity and depth in blue and teal, and a blue seafloor would put tens of thousands of blue pixels on the canvas that mean nothing at all. The user would have to learn, per-pixel, which blues are water and which are salinity — which is precisely the confusion the whole palette exists to prevent. So the water is built from the neutral ramp, one half-step below Chart table, with only a slight cool bias in the deep end: enough to read as water rather than as a panel, far too little to be mistaken for a colormap sample.

- **Ocean (#090A0C):** Open water. Below Chart table, so the canvas reads as *deeper* than the page around it — the viewport is a hole cut in the instrument, not a panel sitting on it.
- **Land (#17150F):** Landmass fill. Warm, a step above the water. Land is the raised form, and on this palette raised means warmer, matching the tonal ladder.
- **Land edge (#4A443C):** The coastline. Deliberately the firmest line in the basemap and lighter than Scribe line, because the ocean/land boundary is the one edge a reader orients from; it is the exception to "hairlines are quiet."

**Bathymetry** is a seven-step ramp from 200 m to 6000 m, running `#3A362F` → `#161616`, and it **darkens with depth**. That direction is the opposite of most depth ramps and it is chosen twice over: it matches the chart convention that deeper water carries heavier ink, and it keeps the abyssal plain — which covers most of the Pacific, and therefore most of the canvas — as the quietest thing in the frame rather than the loudest. Chroma stays under 0.02 OKLCH across the whole ramp. On a paper chart bathymetry is fine grey line-work, not flood colour, and that is the register being borrowed.

**Ocean labels** use the condensed uppercase cartographic register in Graphite, the colour for anything that labels a measurement without being one. Names only — oceans and seas, never countries. The dataset lives in open Pacific water, so country labels would be clutter a long way from anything the user is looking at.

**Satellite imagery is the deliberate exception**, and it is quarantined rather than tokenized. It is genuine photography and cannot be desaturated into this palette without becoming useless as imagery. It is therefore held at 55% opacity so the measurements stay the brightest thing in the frame, it is opt-in behind a control, and it is never the default. A colormap must still win against it, which is the test any basemap has to pass.

## Typography

Two families, split by who the text is for.

**Archivo** (Omnibus-Type, SIL OFL) carries the voice — headings, prose, controls, anything a person wrote. It is a grotesque with genuine American-gothic bones, it is variable, and it ships a real condensed family, which matters below. It is here partly because it is *not* Inter: Inter is excellent and it is the reflexive answer, and a system whose type choice was reflexive tends to have made every other choice reflexively too.

**Archivo Narrow** handles uppercase labels at 11px with +0.12em tracking. This is the cartographic register — the condensed, spaced, all-caps label is how a chart names a feature without crowding it, and it is the single strongest signal that this interface descends from a map rather than from a dashboard. Uppercase set at default tracking looks broken rather than emphatic, so the tracking is not optional.

**Commit Mono** carries the apparatus: every coordinate, depth, temperature, salinity, timestamp, cycle number and WMO identifier. Monospace is not stylistic here — it is load-bearing. Fixed advance width means a column of latitudes aligns on the decimal for free, and `tnum` plus a slashed zero (`zero`) removes the two ambiguities that actually cost a scientist time: jittering columns and O-versus-0 in a float ID. `liga` is disabled on identifiers so nothing in a WMO number fuses into a glyph that isn't there.

The division is legible and it survives at every size: **if a human wrote it, it is Archivo; if an instrument measured it, it is Commit Mono.**

**Fallback stacks.** Archivo → `'Archivo', 'Helvetica Neue', Arial, sans-serif`. Archivo Narrow → `'Archivo Narrow', 'Archivo', 'Arial Narrow', sans-serif`. Commit Mono → `'Commit Mono', 'JetBrains Mono', 'SF Mono', Menlo, monospace`. Self-host all three with `font-display: swap`. Archivo is SIL OFL and unencumbered; **Commit Mono's licence terms should be confirmed before shipping** — if that check fails, JetBrains Mono (SIL OFL) is the drop-in replacement and the system is unaffected.

**Scale.** Generated at a 1.2 minor third from a 13px base — correct for dense professional UI, where 16px body wastes rows — then broken deliberately at the top: `display` jumps to 32px rather than the 26px the ratio would give, because the one large moment in the interface (the answer to a query) has to feel like a different kind of object than a panel title.

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

**A note on interactive outlines**, since `borderColor` is not a valid component token: Scribe line is intentionally quiet (1.5:1 against the page) because a structural rule that competes with data is a bug. It is therefore **not sufficient for interactive boundaries**. Input outlines and any control edge that must be perceivable use Graphite (`#97918A`, 6.3:1 on the page), and focus rings use a 2px Admiralty magenta outline with a 1px offset (5.4:1 on the page, comfortably past the 3:1 the guideline sets for focus indicators).

## Shapes

Radius is **hierarchical and it encodes a distinction**: whether a thing is chart substrate or a control.

- **`none` (0px)** — panels, table cells, the canvas, legends, the time scrubber track. Everything that represents or contains data is square, because charts do not have rounded corners and a rounded data surface reads as a card about the data rather than the data itself.
- **`sm` (2px)** — inputs and chips. Barely perceptible; enough to say "you can type here."
- **`md` (4px)** — buttons only. The most rounded thing in the interface is the thing you press.
- **`full`** — status dots and the float selection ring exclusively. Nothing else may use it.

The rule is short enough to remember: **if it holds data it is square; if you click it, it is not.** A uniform radius across the interface would erase the only shape-level information the system carries.

Borders are 1px and never doubled. No element carries a border *and* a raised tonal value *and* a radius — that combination is what makes generated interfaces read as a pile of undifferentiated boxes.

## Components

**Buttons** are 28px tall — deliberately short, matching the row rhythm rather than the 40px of a consumer product. `button-primary` is Admiralty magenta with Chart table text on it and is limited to **one per view**: run the query. Everything else is `button-secondary`. If a screen appears to need two primary buttons, one of them is not primary.

**The query input** is the widest single element in the interface and sits on Chart table rather than a panel, so it reads as a slot cut into the page rather than a control placed on it. On error it does not turn red — the input keeps its outline and an `input-error` message appears beneath it in Overprint red, because destroying the field's affordance to signal a problem makes the field harder to fix.

**Readouts** pair `readout-label` above `readout-row`, never beside. Uppercase Archivo Narrow label, monospace value, decimal-aligned within its column. Units belong in the label, not repeated on every value — a column of `29.41` under a `TEMP °C` label is faster to scan than a column of `29.41 °C`.

**Identifier badges** carry WMO float IDs in bold mono with ligatures off. A float ID is the primary key of this entire product, and it must be visually copy-pasteable and unambiguous.

**Anomaly badges** encode severity three ways: a leading glyph (`▸` critical, `·` warning), the severity word itself, and color. Color is the *last* of the three and is never load-bearing. Each badge shows its `evidence` values inline — `sst 29.41 > 29.00` — because a flag a scientist cannot audit is a flag they will not trust.

**The legend** is a first-class component, not an afterthought floating over the canvas. It sits on Anodized housing in the panel with a square edge, uses `data-sm` for its numeric stops, and always states the variable and its unit. A colormap without a legend is unreadable data, and this is the single most important control on the screen.

**Tooltips** appear on Lifted panel with `body-sm`, 120ms delay, no animation on exit. They may carry an exact value, never an interpretation.

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
- **Don't** animate the interface. Motion is 120ms on state changes (hover, selection, panel open) and nothing else: no fade-up on load, no easing on panel content, no transitions on data values. **The only thing that moves is the data** — the time scrubber advancing the 4D cloud. That distinction is the whole point, and universal animation destroys it.
- **Don't** center anything. The layout is asymmetric and left-aligned throughout, including headings and empty states.
- **Do** treat the scientific colormaps as data. They are chosen for perceptual uniformity and are never adjusted to match the brand.

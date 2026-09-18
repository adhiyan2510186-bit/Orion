# UI Polish Plan — making FloatChat look outstanding on video

**Scope:** frontend only. No backend, no contracts, no API shape, no change to
`frontend/types/argo.ts` or `backend/app/schemas/argo.py`.

**Audience for the result:** judges watching a recording. They will not run the code, will not
hover, and will not read a tooltip. Everything must land in the first three seconds of a shot.

**Status of this document:** plan only. No code has been written. §4 lists the decisions I need
from you before P0 can start, and §3 lists the places the existing code will actively fight
these changes — read §3 before approving anything, because three of those items change the
shape of the work rather than just its cost.

---

## 1. Inventory of every visible UI surface today

Verified by reading every component, not by inference. Assessments are honest — this is a
well-built interface that is deliberately austere, and "austere" and "reads well on video" are
not the same goal.

### 1.1 Top bar — `app/page.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 1 | **App title** "FloatChat" | 17px bold, inline with everything else. Reads as a form label, not a product. On video there is no moment where the viewer learns what they are looking at. |
| 2 | **"ARGO 4D Explorer"** caps label | Fine. Correct cartographic register. |
| 3 | **Dataset meta line** (`1,038,872 measurements · 12 floats · parquet/rule`) | **The single most impressive fact in the product, set at 11px grey, right-aligned, in the corner.** A judge will never read it. This is the biggest single wasted asset in the UI. |
| 4 | **Header bar itself** | Flat `bg-neutral` with a 1px bottom border. No depth, no separation from the canvas. Correct per current DESIGN.md, invisible on video. |

### 1.2 Search — `features/search/components/SearchBar.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 5 | **Query input** | 32px tall, 1px grey border, 2px radius. Functional and plain. It is the hero interaction of the entire product and it looks like a filter box. |
| 6 | **Run query button** | 28px, magenta, caps. Good. Label swaps to "Searching" while loading. |
| 7 | **Spec chips** (`lat -5..5 lon -180..180`, `depth 0–10 m`, `temperature gt 29`) | **The proof that the NL parsing worked, rendered as five identical grey pills that appear instantly with no transition.** The most important story beat in the demo currently has no visual event attached to it. |
| 8 | **"ignored:" chips** | Amber, bordered. Genuinely good — honest failure is a real differentiator and it is legible. |
| 9 | **Confidence readout** (`95% confidence · rule`) | 11px grey, right-aligned. Correct information, zero emphasis. |
| 10 | **Error line** | Plain red mono text. Adequate. |
| 11 | **Loading state** | **There isn't one.** The button label changes to "Searching" and the canvas keeps showing stale points. On a 300 ms query this is invisible; on video it means the query→result transition has no perceptible cause and effect. |

### 1.3 Map controls — `features/map/components/MapControls.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 12 | **Colour-by `<select>`** | A raw native select on `--color-raised`. It is the only unstyled-OS element in the interface and it looks like it. On a recording it will show the OS dropdown chrome. |
| 13 | **Colormap legend** (gradient bar + min/max) | Good and correct — 160px gradient, labelled with units. Slightly small for video. |
| 14 | **Depth exaggeration slider** | Native `input[type=range]`, styled to a 2px track with a magenta thumb. Reads as a hairline; on video the thumb looks detached from anything. |
| 15 | **Basemap segmented control** (Ocean / Satellite / Bare) | The best-looking control in the app. Clear state, correct grouping. |
| 16 | **Tracks / Grid toggles** | Caps text that changes colour when on. Aria-pressed is correct, but visually a toggled-off toggle and a disabled control are indistinguishable. |
| 17 | **The control bar as a whole** | A single flat row, `overflow-x-auto`. At narrow widths it will silently scroll and hide the toggles mid-recording. |

### 1.4 Canvas — `features/map/components/MapCanvas.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 18 | **deck.gl OrbitView canvas** | The genuinely impressive thing. 60k points at 60 fps, real 3D depth, basemap beneath. It is also **flat-lit**: 2.1 px opaque dots at alpha 210, no glow, no accumulation, no density. A dense cluster looks identical to a sparse one. |
| 19 | **Hover tooltip** (bottom-left, fixed) | Anchored to the corner rather than the cursor, so it reads as a status readout, not a tooltip. Appears and vanishes with no transition. Will look like a flicker on video. |
| 20 | **Point-count readout** (bottom-right) | 11px grey. `60,000 points rendered` — again, a headline fact rendered as a footnote. |
| 21 | **Arrival state** | Camera snaps to a fixed `INITIAL_VIEW` with zero motion; points appear all at once when the seeded query lands. **There is no arrival moment at all.** |
| 22 | **Canvas edges** | Hard rectangle, full bleed to the panel borders. No vignette, no grain, no atmosphere. It reads as a chart, which is exactly what DESIGN.md asked for and exactly what will look flat on video. |

### 1.5 Timeline — `features/timeline/components/TimeScrubber.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 23 | **Disabled empty state** | One line of grey mono. Fine. |
| 24 | **Play/Pause button** | 56×24 caps button. Fine, small. |
| 25 | **Domain start/end labels** | Fixed 86px mono. Correct. |
| 26 | **The scrubber track itself** | **A native range input on a 2px grey line.** This is the control that carries the fourth dimension — the single thing that makes the product "4D" — and it is visually the thinnest element on the screen. It carries no information about the data it scrubs. |
| 27 | **Cursor date readout** | 12px mono, updates every frame during playback. Good; will jitter without tabular numerals confirmed at this size. |
| 28 | **Speed buttons** (0.5× / 1× / 3×) | Magenta when active. Clear. |
| 29 | **Trail window buttons** (7d/30d/90d/1y) | Same treatment. Clear, but "Trail" is unexplained and a judge will not know what it does. |

### 1.6 Inspector — `features/inspector/components/FloatInspector.tsx`

| # | Surface | Honest assessment |
|---|---|---|
| 30 | **Result panel — answer prose** | 13px, 65ch, the backend's sentence. Good content, no emphasis. This is the app's answer to the user's question and it is set at body size. |
| 31 | **Four-readout grid** (Floats / Profiles / Measurements / Depth) | Label-above-value, mono, 13px. Well built. **The numbers are the story and they are set two points larger than the labels.** |
| 32 | **Variable stats rows** | `temperature  2.11 … 30.77   mean 14.2`. Dense and good. Truncation guard on the label is a nice detail. |
| 33 | **Anomalies panel + badges** | Three-channel severity encoding (glyph + word + colour) with inline evidence. **Genuinely excellent and genuinely invisible** — it sits below the fold of a 380px column on most captures. |
| 34 | **Depth-profile empty state** | "Click a measurement on the map to inspect its water column." Clear. |
| 35 | **Depth-profile loading / error states** | Plain grey / red lines. Adequate. |
| 36 | **Profile readout grid** (8 cells: cycle, date, lat, lon, thermocline, MLD, surface temp, mode) | Dense, correct, well-aligned. The best-built block in the app. |
| 37 | **`DepthProfileChart`** (Recharts) | Correct science — depth downward, dual value axes, thermocline and MLD reference lines, colours sampled from the same colormaps as the map. `isAnimationActive={false}` on both series. **Visually it is a default Recharts chart**: full cartesian grid, thin strokes, no fill, no emphasis on the thermocline. |
| 38 | **Chart legend keys + method string** | 10px. Correct, tiny. |
| 39 | **Inspector column as a whole** | Fixed 380px, `overflow-y-auto`, three stacked panels with hairline dividers. Structurally right. In a 1600×950 capture the anomalies and the chart are usually both partly below the fold. |

### 1.7 Global / primitives

| # | Surface | Honest assessment |
|---|---|---|
| 40 | **`Panel`** (`components/ui/Panel.tsx`) | Square, `bg-neutral`, caps header. Correct, characterless. |
| 41 | **`Readout`** | Label above value. The right pattern. |
| 42 | **`Button`** | Two variants, 28px. Fine. |
| 43 | **API-error full-page state** | Left-aligned heading + two lines. Honest and clean. |
| 44 | **Focus ring** | 2px magenta, 1px offset. Correct and accessible. |
| 45 | **Scrollbars** | Styled 10px, border-coloured thumb. Good. |
| 46 | **Text selection** | Magenta. Good. |
| 47 | **Typography in practice** | Archivo + Archivo Narrow + JetBrains Mono, **loaded at runtime from `fonts.googleapis.com`**. See §3.9 — this is a live risk to the recording. |

**Summary of the inventory.** Nothing here is badly built. The problem is uniform: this
interface was designed for the fifth hour of a scientist's session and is being filmed in its
first ten seconds. Every headline number is set at 11px in a corner, every state change is
instantaneous and therefore invisible, and the canvas — the actual achievement — is flat-lit and
has no arrival.

---

## 2. Files to touch, per phase

Legend: **`N`** new file · **`M`** modified · **`R`** meaningful rewrite.

### P0 — Rewrite DESIGN.md, regenerate tokens. Zero component edits.

| File | | Why |
|---|---|---|
| `DESIGN.md` | **R** | New aesthetic direction, and — critically — the motion section must be rewritten. See §3.1. |
| `frontend/design/tokens.ts` | **R** | Palette, type scale, and a real motion/elevation vocabulary: durations, easings, stagger step, blur radii, glass alpha values. |
| `frontend/app/globals.css` | **M** | **Unavoidable.** The `@theme` block is a second hand-maintained copy of the palette; tokens.ts alone does not reach the DOM. See §3.2. |
| `frontend/design/scales.ts` | — | **Do not touch.** Colormaps are data, not brand. |

**Gate:** `npx -y -p "@google/design.md" designmd lint DESIGN.md` → 0 errors, 0 warnings;
`npm run build`; `npm run verify` 18/18 with no component edited.

> "Zero component edits" is achievable for colour and radius. It is **not** achievable for type
> size or spacing, because components hardcode those as Tailwind arbitrary values today — §3.3.

### P1 — Glass HUD chrome, grain + vignette, tabular numerals, query loading state

| File | | Why |
|---|---|---|
| `frontend/app/globals.css` | **M** | `.glass`, `.grain`, `.vignette`, `.hud-*` utility layers; numeral feature settings promoted to a class used everywhere numbers appear. |
| `frontend/design/tokens.ts` | **M** | Glass blur/alpha/border tokens so the utilities are not hardcoding values. |
| `frontend/components/ui/Panel.tsx` | **M** | Optional `glass` variant. |
| `frontend/components/ui/Button.tsx` | **M** | Pick up the new chrome. |
| `frontend/components/ui/Surface.tsx` | **N** | One component owning grain + vignette overlays, so no feature reimplements them. |
| `frontend/features/map/components/MapCanvas.tsx` | **M** | Mount the grain/vignette overlay; restyle hover tooltip and point-count readout. **`pointer-events: none` is load-bearing here — §3.5.** |
| `frontend/features/map/components/MapControls.tsx` | **M** | Glass bar; replace the native `<select>` (#12) and restyle the range thumb. |
| `frontend/features/search/components/SearchBar.tsx` | **M** | Real loading state: skeleton chips + a determinate-looking progress affordance on the input. |
| `frontend/features/timeline/components/TimeScrubber.tsx` | **M** | Glass treatment; enlarge the track. |
| `frontend/features/inspector/components/FloatInspector.tsx` | **M** | Promote the four hero numbers (#31) to a display size. |
| `frontend/app/page.tsx` | **M** | Promote the dataset meta line (#3) into a real stat strip. |
| `frontend/components/ui/Skeleton.tsx` | **N** | Shimmer placeholder, transform-only. |

### P2 — Parse ribbon

| File | | Why |
|---|---|---|
| `frontend/features/search/components/ParseRibbon.tsx` | **N** | The animated decomposition. |
| `frontend/features/search/lib/attributeSpec.ts` | **N** | Maps `QuerySpec` fields → chip descriptors → best-effort source substring. **Pure, client-side, no API change. See §3.6 — the API does not return token spans and this is the central limitation of P2.** |
| `frontend/features/search/components/SearchBar.tsx` | **M** | Render `ParseRibbon` in place of the current chip row. |
| `frontend/features/search/index.ts` | **N** | Feature barrel — required by the import rule, and none exists today (§3.4). |
| `frontend/design/tokens.ts` | **M** | Stagger interval + chip-flight easing tokens. |
| `frontend/app/globals.css` | **M** | Keyframes (transform/opacity only). |

### P3 — Camera choreography, additive blending, staggered point entry

| File | | Why |
|---|---|---|
| `frontend/features/map/hooks/useCameraChoreography.ts` | **N** | Owns the arrival flight and any scripted camera move. |
| `frontend/lib/state/stores.ts` | **M** | **Move `viewState` out of `MapCanvas` local state into the view store.** Required by both P3 and P5 — §3.7. |
| `frontend/features/map/components/MapCanvas.tsx` | **M** | Read view state from the store; drive it from the choreography hook. |
| `frontend/features/map/layers/index.ts` | **M** | Additive blend parameters on `point-cloud-3d`; entry animation. **luma.gl v9 parameter names — §3.8.** |
| `frontend/features/map/layers/registry.ts` | **M** | `LayerContext` gains an entry-progress value. |
| `frontend/features/map/index.ts` | **N** | Feature barrel. |
| `frontend/scripts/measure-perf.mjs` | **M** | Add a control run so the blend/entry cost is measured, not assumed. |

### P4 — Density histogram behind the scrubber, with anomaly ticks

| File | | Why |
|---|---|---|
| `frontend/features/timeline/components/TimeHistogram.tsx` | **N** | SVG or 2D-canvas density bars + anomaly tick marks. |
| `frontend/features/timeline/hooks/useTimeHistogram.ts` | **N** | Bins `response.points` by timestamp **once per response**, not per frame — §3.10. |
| `frontend/features/timeline/components/TimeScrubber.tsx` | **M** | Layer the histogram behind the track; keep the native input on top for a11y and for `verify`. |
| `frontend/features/timeline/index.ts` | **N** | Feature barrel. |
| `frontend/design/tokens.ts` | **M** | Histogram bar + tick colours. |

### P5 — Scripted demo mode

| File | | Why |
|---|---|---|
| `frontend/features/demo/script.ts` | **N** | The beat list: query text, dwell, camera target, which panel to emphasise. Data, not logic. |
| `frontend/features/demo/hooks/useDemoDirector.ts` | **N** | Runs the script against the existing stores and `useArgoQuery`. |
| `frontend/features/demo/components/DemoOverlay.tsx` | **N** | Beat caption / progress. |
| `frontend/features/demo/index.ts` | **N** | Feature barrel. |
| `frontend/lib/state/stores.ts` | **M** | `useDemoStore` — active, beat index, and an `isDemo` flag the camera hook respects. |
| `frontend/app/page.tsx` | **M** | Mount the overlay; wire the entry control. |
| `frontend/features/map/hooks/useCameraChoreography.ts` | **M** | Accept scripted camera targets. |
| `frontend/scripts/verify-ui.mjs` | — | **Do not touch.** Demo mode must be opt-in so the 18 checks are unaffected — §3.11. |

---

## 3. Where the existing code will fight these changes

These are the real findings. Items 3.1, 3.2 and 3.6 change the shape of the work, not just its
cost.

### 3.1 DESIGN.md currently forbids almost everything in P1–P5 — **hard conflict**

This is not a matter of taste; it is written as a rule and the code cites it in four places.

> **Don't animate the interface.** Motion is 120ms on state changes (hover, selection, panel
> open) and nothing else: no fade-up on load, no easing on panel content, no transitions on data
> values. **The only thing that moves is the data** […] universal animation destroys it.

It also says, in the same list: **"Don't add shadows"**, **"Don't center anything"**, and
**"the interface gives up colour as an expressive tool so the data can own it."** `tokens.ts`
encodes this (`motion` has exactly `fast: 120`, `medium: 200`, one easing), `globals.css`
restates it in a comment, and `usePlayback.ts` and `TimeScrubber.tsx` both justify their
existence by it.

"Glass HUD chrome" is a shadow-and-blur idiom. "Staggered point entry" is a fade-up on load.
"Parse ribbon" is a transition on data values.

**This is exactly why P0 is first, and P0 must do more than restyle.** It has to consciously
retire that rule and replace it with a *defensible* one — my recommendation: motion is permitted
only where it explains a causal relationship (sentence → filters, query → result, arrival →
orientation) and is forbidden as decoration. That keeps a principled system rather than
abandoning one. **But it is a real reversal of a deliberate decision and it should be recorded as
an ADR**, per `CLAUDE.md`: *"Add an ADR rather than silently diverging."* I propose
`docs/adr/0005-motion-for-explanation.md` as part of P0.

### 3.2 `tokens.ts` is not generated, there is no `tailwind.config.ts`, and the palette exists twice

`IMPLEMENTATION_PLAN.md:475` and `:121` describe `tailwind.config.ts` as importing from
`design/tokens.ts`. **That file does not exist.** This is Tailwind v4: the DOM's actual token
source is the `@theme` block in `frontend/app/globals.css`, which is a **hand-typed duplicate**
of the hex values in `tokens.ts`.

`tokens.ts` is consumed by exactly five files, all canvas-side:

```
features/map/layers/registry.ts       type RGB
features/map/layers/oceanLabels.ts    fonts, rgb
features/map/layers/basemapVector.ts  basemapRgb, bathymetryColor
features/map/layers/index.ts          rgb
features/inspector/components/DepthProfileChart.tsx   colors
```

Consequences for P0, stated plainly:

- **"Regenerate tokens.ts" is a manual edit.** There is no generator from `DESIGN.md` to
  `tokens.ts`. Whatever P0 does, it does by hand or by writing a generator.
- **"Zero component edits" holds only if `globals.css` is edited in the same breath.** I have
  listed it as a P0 file above. It is not a component, so the constraint survives — but the
  claim "one edit restyles both DOM and canvas" in the plan is currently false.
- **Recommendation:** P0 should close this by generating the `@theme` block from `tokens.ts`
  (a small `scripts/build-theme.mjs` writing `app/theme.generated.css`), so the duplication
  stops being a standing hazard. Costs ~30 lines. Say if you would rather not.

### 3.3 The "no hardcoded sizes" rule is already broken in every component

The constraint you restated is real and it is in `CLAUDE.md`, but the code does not honour it for
type size or spacing — only for colour. A representative sample:

```
app/page.tsx               text-[17px]  text-[11px]  px-3 py-2
SearchBar.tsx              h-8 px-3 text-[13px]  text-[11px]  py-0.5
MapControls.tsx            text-[12px]  h-6  w-40  h-2.5  px-1.5
TimeScrubber.tsx           h-16  w-14 h-6  w-[86px]  text-[11px]  h-5
FloatInspector.tsx         w-[380px]  text-[13px]  w-[84px]  text-[10px]
DepthProfileChart.tsx      h-[300px]  fontSize: 10  strokeWidth 1.6
Panel.tsx / Button.tsx     px-3 py-2  h-7 px-3  text-[10px]
```

Colours all correctly route through `var(--color-*)`. Sizes do not.

**This blocks P0's "zero component edits" promise for any type-scale change**: if P0 alters the
scale, nothing moves, because components name pixels directly.

Two ways forward, and I need your call (§4):

- **(a) Fix it in P1** — add semantic utility classes (`.text-display`, `.text-data-md`,
  `.readout-row`) to `globals.css` driven by tokens, and sweep the components onto them. Roughly
  a day, touches every component, makes the stated rule true, and is a precondition for the type
  scale being a real lever.
- **(b) Accept it** — P0 changes colour/radius/motion only, the type scale is changed by editing
  components in P1 alongside everything else. Faster, leaves the rule aspirational.

I recommend (a), folded into P1, because P1 already touches all ten of those files.

### 3.4 No feature has an `index.ts`, and the import rule is already violated

```
features/inspector/components/FloatInspector.tsx:4
  import { AnomalyBadge } from '@/features/anomalies/components/AnomalyBadge';
features/inspector/components/FloatInspector.tsx:5
  import { useAnomalies } from '@/features/anomalies/hooks/useAnomalies';
```

The only `index.ts` under `features/` is `features/map/layers/index.ts`, which is a layer
registry, not a feature barrel. `app/page.tsx` also reaches into component paths directly.

Nothing enforces this: there is no ESLint config in `frontend/` at all, and no
`eslint-plugin-boundaries` (`RUNDOWN.md` §8.2 already records this as documentation drift).

P2, P3, P4 and P5 each add a barrel in my file lists above. **P5 is where it bites**: the demo
director must drive search, map, timeline and inspector, so without barrels it will reach into
four features' internals and make the violation structural rather than incidental.

### 3.5 `verify-ui.mjs` is brittle against precisely these changes — the full list

18/18 must hold after every phase, so here is every coupling I found, with the phase that
threatens it:

| The check depends on | Threatened by | Rule to follow |
|---|---|---|
| `input[aria-label="Natural language query"]` | P1 input restyle | Keep the aria-label verbatim. |
| `getByRole('button', {name: /run query/i})` | P1 loading state | The label already swaps to "Searching" while loading; do not make the loading label the default, and do not disable the button before the fill. |
| `text=/measurements from \d+ float/` | P1 inspector restyle | The backend's `summary.answer` must stay rendered as plain selectable text in the DOM. |
| `/heatwave\|anomal/i` in body text | P1/P4 | Anomaly labels must stay in the DOM even if visually collapsed. |
| **Framebuffer `readPixels` scan for a saturated pixel** (`r+g+b>150`, `max−min>40`) then `page.mouse.click` at those coords | **P1 grain/vignette, P3 additive + entry** | Two hard rules: **(1) every overlay must be `pointer-events: none`** or the click lands on the overlay and picking dies; **(2) no DOM overlay may sit over the canvas that tints it** — the scan reads the WebGL buffer, but the *click* goes through the DOM. |
| Canvas painted **> 500 lit pixels**, **> 8 colour buckets**, sampled shortly after `networkidle` | **P3 camera flight + staggered entry** | If points are still off-screen or still at opacity 0 when the sample runs, this fails. The arrival must complete in **well under the ~2 s** the script allows, and must be **instant when `prefers-reduced-motion` is set**. |
| `basemap Ocean > 20000`, `Satellite > 100000`, `Bare > 500` lit pixels | P3 additive blending | These are floors, and additive blending raises lit counts, so this is safe — but a *dimmed* entry state sampled mid-animation is not. |
| `getByRole('group', {name: /basemap style/i})` + buttons `^Ocean$` `^Satellite$` `^Bare$` | P1 control restyle | Keep the role, the group label, and the exact button text. |
| `getByRole('button', {name: /play through time/i})` (aria-label) | P1/P4 scrubber rework | Keep the aria-label. Keep `input[aria-label="Time cursor"]` as a real focusable range input under the histogram. |
| **`no console errors`** | every phase | Any React key warning, any deck.gl parameter warning, any 404 on a font or texture fails the run. |

The script counts checks dynamically (`results.length`), so **18/18 means adding no checks and
removing none**. If a phase genuinely warrants a new check, that is a deliberate conversation,
not a side effect.

### 3.6 P2's premise is not fully supported by the API — read this before approving P2

`ParseResult` is `{ spec, confidence, rationale, unresolved, parser_id }`. There are **no
character offsets and no token spans**. So the sentence cannot be authoritatively decomposed:
the backend tells us *what it concluded*, never *which words it concluded it from*.

What is actually available:

- **`unresolved`** is a list of literal phrases from the input, so those **can** be located in
  the sentence exactly. The honest-failure beat of the demo is fully supported.
- **Everything resolved** — bbox, depth range, time range, variable filters — arrives as values
  with no provenance. `-5..5 lat` does not know it came from the words "near the equator".

Three options, and this is a design decision, not an implementation detail:

- **(a) Chips fly out from under the input, not from words.** No span claim is made; the
  animation shows *the sentence producing filters*, which is true. Zero risk. **Recommended.**
- **(b) Client-side substring heuristics** — a small gazetteer mirror in
  `attributeSpec.ts` mapping "near the equator" → bbox, "in 2026" → time range. Looks
  spectacular when it hits. **It duplicates the backend's gazetteer in the frontend**, will
  silently mis-highlight on any phrasing it does not know, and is a maintenance trap the repo's
  architecture rules exist to prevent.
- **(c) Add spans to `ParseResult`.** The correct fix. **Out of scope — you have ruled out
  contract and backend changes.**

I will build (a) unless you say otherwise. If you want the word-level effect, (b) is possible
but I want your explicit go-ahead, because it knowingly duplicates backend logic.

### 3.7 `viewState` is local component state — P3 and P5 both need it hoisted

```tsx
// MapCanvas.tsx
const [viewState, setViewState] = useState<OrbitViewState>(INITIAL_VIEW);
```

Camera choreography (P3) and scripted camera moves (P5) both need to write it from outside the
component. It must move into `useViewStore`. Two knock-on risks:

- The store updates at 60 fps during a camera flight. `useLayerBuilder`'s `context` memo does
  **not** depend on view state, so layers will not rebuild — good — but any component
  subscribing broadly to `useViewStore` will re-render every frame. Subscribe with narrow
  selectors only.
- `usePlayback` already runs an rAF loop writing `cursor` at 60 fps. A second concurrent rAF
  loop for the camera is fine, but during P5 both run at once and that combination has never
  been measured. P3's `measure-perf.mjs` control run should cover it.

### 3.8 deck.gl / luma.gl v9 parameter names will fail silently

`basemapShared.ts` already carries this scar:

> luma.gl v9 parameter names (deck.gl 9.x). The v8 spelling was `depthTest: false`; writing that
> here would silently do nothing.

Additive blending in P3 is the same trap — v8's `blendFunc`/`blendEquation` arrays are gone, and
the v9 spelling is `parameters: { blend, blendColorSrcFactor, blendColorDstFactor, … }`. A wrong
key produces **no error and no effect**, which on a software rasteriser in `verify` is
indistinguishable from success. Any blending work must be confirmed by a lit-pixel delta, not by
eye.

Two further canvas-side frictions:

- `point-cloud-3d` already uses `DataFilterExtension({ filterSize: 1 })` for time, with
  `filterSoftRange` + `filterTransformColor: true` doing the comet-tail fade. A **true per-point
  staggered entry** needs a second filter dimension (`filterSize: 2`, re-upload of every
  attribute) or a custom shader. The cheap version — animating a layer-wide `opacity` or
  `radiusScale` uniform over ~600 ms — costs nothing and reads almost identically on video.
  I will cost both in P3; expect me to recommend the uniform.
- `updateTriggers` on that layer **deliberately excludes `timeCursor`** with a comment
  explaining that listing it halves the frame rate. Nothing in P3 may add a per-frame value to
  `updateTriggers`.

### 3.9 Fonts load from Google Fonts at runtime — a live risk to the recording

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo…&family=JetBrains+Mono…');
```

`DESIGN.md` says "self-host all three." They are not self-hosted. If the recording machine is
offline or the request is slow, the app falls back to Helvetica/Arial/Menlo **and the entire
typographic identity of the shot is gone** — with no error, and `verify` would still pass.

Given the whole point of this work is a video, **I recommend self-hosting the three families into
`public/fonts/` with `font-display: block` as part of P1.** It also removes a network dependency
from a build that otherwise proudly has none.

### 3.10 The reduced-motion block will silently kill every animation in P1–P5

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

Two consequences:

- **If the recording machine has "reduce motion" enabled at the OS level, the entire polish pass
  is invisible and nothing warns you.** Worth checking on the capture machine before the shoot.
- This blanket rule only stops CSS. P3's camera flight, P5's director and any Web Animations API
  work run in JS and would keep moving — so reduced-motion handling has to be implemented
  per-hook, not inherited. I will gate each JS animation on
  `matchMedia('(prefers-reduced-motion: reduce)')` and make the reduced path land on the *final*
  state instantly (which is also what keeps `verify` green, per §3.5).

### 3.11 P4's histogram sits in a component that re-renders 60×/second

`TimeScrubber` calls `usePlayback()`, which subscribes to `cursor`. During playback that
re-renders the component on every frame. A histogram computed in that component's body would bin
up to **60,000 points 60 times a second** and destroy the P6 frame-rate gate.

The binning must live in `useTimeHistogram`, memoised on `response` alone — never on `cursor` —
and the drawn bars must be a static child that the moving cursor is composited over. Anomaly
ticks come from `point.anomaly_tags`, which is already on every point, so no API change is
needed.

Related: `useAnomalies` already walks all 60k points per response. That is fine once, but P4
should reuse it rather than add a second full scan.

### 3.12 Smaller frictions, listed so they are not surprises

- **`SearchBar` auto-seeds the first example query on mount** (`useEffect` + `meta.example_queries[0]`).
  P5's director must not race this — it should either take over the seed or wait for it. This is
  also what `verify` relies on for its first six checks.
- **`MapControls` is `overflow-x-auto`.** Under 1280px the Tracks/Grid toggles scroll out of
  frame. Worth fixing in P1 given a fixed 380px inspector eats the width.
- **The hover tooltip is corner-anchored, not cursor-anchored** (#19). Making it follow the
  cursor is a P1 improvement but must stay `pointer-events: none` (§3.5).
- **Recharts sets `isAnimationActive={false}`** on both series, per the old no-animation rule.
  P1 may re-enable it — Recharts animates SVG path length, which is **not** a
  transform/opacity-only animation and therefore violates your GPU-composited constraint. My
  recommendation is to leave it off and animate the chart container's opacity/transform instead.
- **No ESLint exists in `frontend/`** (`npm run lint` → `next lint` with no config or dep). So
  nothing will mechanically catch a hardcoded colour, a `fetch` in a component, or a
  cross-feature import during this work. The guards are `tsc`, `next build` and `npm run verify`
  only.
- **`docs/adr/`** should gain 0005 (motion) in P0, and likely 0006 (glass/elevation reversal of
  "no shadows") — `CLAUDE.md` requires an ADR rather than a silent divergence.

---

## 4. Decisions — asked and answered

Questions 1–4 were put to the user and answered. Those answers are binding; §5 records what they
change. Questions 5–7 remain open and do not block P0.

### 4.1 Answered

| # | Question | **Decision** |
|---|---|---|
| 1 | Aesthetic direction for P0 | **Hybrid — austere chrome, cinematic canvas.** Chart Room's logic governs every DOM surface unchanged; the canvas becomes atmospheric (grain, vignette, additive glow, camera motion). |
| 2 | Does the no-blue-chrome rule survive? | **Keep it.** Chrome stays warm grey, hue 65–80 OKLCH. Blue/teal/green remain reserved for data encoding. A blue pixel always means a measurement. |
| 3 | Sweep hardcoded type sizes and spacing onto token-driven utilities in P1? | **Yes.** §3.3 option (a). |
| 4 | Parse-ribbon fidelity | **Word-level highlighting via a frontend phrase gazetteer.** §3.6 option (b) — chosen with the duplication cost understood. |

### 4.2 Answered before P1

| # | Question | **Decision** |
|---|---|---|
| 5 | §3.2 — generate the `@theme` CSS block from `tokens.ts`? | **Yes.** `scripts/build-theme.mjs` imports `design/tokens.ts` directly (Node 24 strips TS types) and writes `app/theme.generated.css`. The palette no longer exists in two hand-maintained places, and the P1 type scale, spacing base and glass values are single-source from the start. Runs automatically before `npm run dev` and `npm run build`. |
| 6 | §3.9 — self-host the fonts? | **Yes.** `scripts/fetch-fonts.mjs` writes `public/fonts/` + `app/fonts.generated.css`. Archivo and Archivo Narrow are variable fonts, so 400 and 700 share one file: **three files, 83 KB, latin subset only**. The `fonts.googleapis.com` import is gone and the build has no runtime network dependency at all. |
| 7 | Capture target | **1920×1080.** `scripts/shoot.mjs` renders at exactly this and nothing else — composition reviewed at another width is a frame that will never be recorded. Note `verify-ui.mjs` still uses 1600×950; that is its own fixture and was deliberately left alone. |

---

## 5. What the answers change

### 5.1 The thesis is now a boundary, and that resolves the P1 tension

Decisions 1 and 2 together give a sharper organising idea than either question offered alone:
**the instrument stays honest and the water becomes cinematic, and the boundary between them is
the whole visual argument.** `DESIGN.md` already gestures at this — *"the viewport is a hole cut
in the instrument, not a panel sitting on it"* — so P0 is promoting an existing sentence to the
governing principle rather than inventing one.

The practical consequence for **P1's "glass HUD chrome"**: glass is a *boundary* material, not a
global one.

- Surfaces that sit **over the canvas** — hover tooltip, point-count readout, map control bar,
  demo overlay, the scrubber's own chrome — may be translucent, because what shows through them
  is literally the ocean.
- Surfaces that are **part of the instrument** — the inspector column, panels, readout grids,
  the header — stay opaque Chart Room. Glassing them would make the instrument look like a
  consumer dashboard and would contradict decision 1.
- Every glass tint is **warm and low-chroma**, per decision 2. No cool tint anywhere, including
  in the glass — that was offered as an exception and was not taken.

This also softens §3.1: the no-shadows rule survives largely intact for the DOM. Elevation over
the canvas is carried by blur and translucency, which is a different mechanism than a drop
shadow and can be argued for honestly in the rewritten DESIGN.md.

### 5.2 Decision 3 moves work into P1 and makes P0's promise real

P1 now includes a **token-driven utility layer** (`.text-display`, `.text-data-md`, `.pad-md`,
`.readout-row`, …) in `globals.css`, plus a sweep of all ten components onto it. Add to the P1
file list:

| File | | Why |
|---|---|---|
| `frontend/app/globals.css` | **M** | The semantic utility layer itself, generated from token values. |
| every file listed in §3.3 | **M** | Mechanical substitution of arbitrary values for semantic classes. |

Two notes. This sweep is the **highest-risk-of-visual-regression** item in the whole plan —
it touches every surface at once and `verify`'s only defence is a lit-pixel count. I will do it
as its own commit, separate from the glass work, so a regression is bisectable. And it means P0
genuinely *can* move the type scale, which it otherwise could not.

### 5.3 Decision 4 — accepted, with three containment rules

You chose word-level highlighting knowing it duplicates the backend gazetteer. It will look
markedly better on video and I will build it. Because §3.6's objection is real rather than
theoretical, the implementation is constrained so the duplication cannot cause a *correctness*
problem — only a cosmetic one:

1. **The gazetteer is presentational and one-directional.** `attributeSpec.ts` may read the
   sentence and the returned `QuerySpec` to *guess* an association for animation purposes. It
   may never influence what is queried, what is filtered, or what any chip *says* — chip content
   comes from `QuerySpec` alone, exactly as today.
2. **Graceful degradation is the default path, not the error path.** Any chip whose source
   phrase is not confidently located simply descends from under the input — §3.6 option (a).
   A missed match must be invisible, never a broken highlight.
3. **`unresolved` phrases are matched exactly, never guessed**, since the backend returns them
   verbatim. The honest-failure beat stays fully truthful.

A header comment in `attributeSpec.ts` will state that the file mirrors backend phrasing for
animation only and is expected to drift — so a future reader does not mistake it for a second
source of query truth. If it later proves annoying to maintain, the correct fix remains adding
spans to `ParseResult` (§3.6 option c), which is out of scope here.

### 5.4 An ADR is now required in P0

`CLAUDE.md`: *"You are about to contradict an architectural decision. Add an ADR rather than
silently diverging."* P0 reverses `DESIGN.md`'s explicit "don't animate the interface" rule, so
P0 ships `docs/adr/0005-motion-for-explanation.md` alongside the rewrite, recording the
boundary thesis from §5.1 and the rule that replaces it: **motion is permitted where it explains
a causal relationship, and forbidden as decoration.** A second ADR for the glass/elevation
question is not needed — §5.1 keeps the no-shadows rule for instrument surfaces, so there is no
contradiction to record.

### 5.5 Ready to start

P0 is unblocked. Questions 5–7 do not gate it; I will raise 7 again before P1's layout work.

---

## 6. P1 as built

Shipped. `npm run verify` **18/18**, `tsc` clean, `next build` clean, screenshots in
`frontend/verification/shots/`.

What landed beyond the file list in §2:

- **`scripts/build-theme.mjs`** and **`scripts/fetch-fonts.mjs`** (decisions 5 and 6), plus
  **`scripts/shoot.mjs`** — a 1920×1080 screenshot harness, because a visual change that is
  never looked at is not verified by anything the other gates do. `npm run shoot -- <label>`.
- **`.claude/skills/polish/`** — the workflow skill for visual work: required reading, the
  token/layering/motion rules, the shoot-look-iterate loop, and the couplings in §3.5 that a
  restyle can silently break.
- **`features/anomalies/index.ts`** — the first feature barrel, closing the §3.4 violation the
  inspector was committing. P2–P5 add the rest.
- `layout.profileChartHeight` added to `tokens.ts`; the Recharts SVG font sizes and corner
  radius now read from the token scale instead of being typed as numbers.

Two deliberate divergences from §2, both recorded rather than silent:

1. **`TimeScrubber` did not get the glass treatment.** §5.1 defines glass as a boundary
   material, permitted only where the canvas shows through. The scrubber is a full-width
   instrument row *below* the viewport — nothing shows through it — so glassing it would have
   contradicted the thesis the same section establishes. It got the weight it actually needed
   instead: a 4px track (up from a 2px hairline) with a ringed thumb, and the cursor date set
   at the display data size. The `.glass` utility is used by the two HUD readouts that really
   do sit over the canvas.
2. **`type.dataHero` (40px) is defined but unused.** The four inspector summary figures and
   the header counts are set at `dataLg` (20px). 40px numerals do not fit two-up in a 380px
   column, and in the header they would have pushed the search row down. `dataHero` is left
   for P2/P3, where the parse ribbon and the arrival have room for it.

### What P1 could not fix, and P3 must

The canvas is still mostly empty, and on a 1080p frame that is the dominant visual fact —
more so than the flat lighting §1.4 called out.

The seeded demo query returns **411 points**, not 60,000. They land in one small cluster near
the equator while the camera sits at a fixed `INITIAL_VIEW` framing the whole east Pacific and
most of North America. Roughly two-thirds of the viewport is empty near-black.

This also makes the P1 atmosphere nearly invisible, which is worth stating plainly rather than
discovering again later: both overlays are mounted, correctly sized and `pointer-events: none`
(confirmed in the live DOM — `elementFromPoint` at canvas centre still returns the canvas), but
a 32% black vignette over a `#090A0C` basemap is close to a no-op, and 3.5% screen grain over
near-black lifts by a few levels. **The tokens are not wrong and should not be raised past
their documented caps** — the caps exist so neither effect competes with a dim measurement.
They have nothing to act on yet.

The fix belongs to P3 and is a camera problem before it is a rendering one: fit the arrival
flight to the result bounds so 411 points fill the frame, then let additive blending give the
cluster luminance for the grain and vignette to sit against.

---

## 7. P1.5 as built — framing and context

Pulled forward from P3 so the parse ribbon (P2) can be judged against a frame that is not
two-thirds empty. The rest of P3 — additive blending, staggered point entry, scripted camera —
is untouched, and `viewState` deliberately stays local to `MapCanvas` (§3.7 hoisting is still
P3's job).

### 7.1 Arrival camera fits the result bounds

`features/map/hooks/useFitCamera.ts`. Fires on first load and on every new query, keyed on
response identity so orbiting the camera and then scrubbing time does not yank it back.

OrbitView's world coordinates are degrees (ADR 0004) and its scale is 2^zoom pixels per world
unit, so the fit is `zoom = log2(pixels / degrees)` with no projection maths. On the demo query
that moves the camera from the fixed `zoom 3.4` over the whole east Pacific to `zoom 4.80`
centred on `[-149.49, 0.19]`.

Longitude bounds are computed by **largest angular gap**, not `min`/`max`. These floats span
−179.5…+179.7, and a naive min/max returns the full 360° and frames the planet to contain a
cluster 20° wide. Where the tight range would cross ±180 it falls back to the naive span,
because the basemap is drawn once over [−180, 180] and does not repeat.

Two things cost time and are worth not rediscovering:

- **`FlyToInterpolator` is MapView-only.** It interpolates longitude/latitude/zoom/pitch and
  throws `latitude is required for transition` against an `OrbitViewState`. Use
  `LinearInterpolator` naming `target`, `zoom`, `rotationX`, `rotationOrbit`.
- **Transition props must live on the state object, not beside it.** deck.gl emits
  `onViewStateChange` every frame during a transition; if the state handed back still carries
  `transitionDuration`, each of those frames starts a *new* transition toward the intermediate
  value it just reported. That is a fixed point at the starting camera — the view never moves,
  and nothing errors.

`motion.easing` gained a JavaScript twin, `ease()` in `tokens.ts`, because a CSS bezier string
cannot be handed to a deck.gl transition. Same values, two encodings, exactly as `rgb` mirrors
`colors`.

### 7.2 Context cloud

Full reasoning, measurements and the open cost question are in
`docs/adr/0006-context-cloud.md`. In brief: a registered `context-cloud` layer draws the
measurements that did not match, dim and neutral, beneath the results, fed by a second relaxed
query. All four constraints hold — registry not conditionals, token colours, same time-cursor
filter, toggleable and defaulting on — and the basemap draw order and ADR 0004's `depthCompare`
fix are untouched (the layer registers after the basemaps and keeps deck.gl's default depth
state).

**The premise did not fully survive the data, and that is the main finding.** ARGO in this
region is 12 floats and ~119 profiles, and a profile is ~1,000 levels at one lat/lon — so the
context renders as vertical combs beneath each track, not as an areal haze. It adds
**+529 lit pixels** at the default 30-day trail and **+4,284** at a 1-year trail. The empty
ocean is a fact about ARGO's sampling density; filling it would mean inventing measurements.

### 7.3 Two gates to settle before P2

Both are consequences of this work, both are reported rather than quietly adjusted, and the
branch is `wip/p15-framing` rather than `main` until they are.

**`npm run verify` is 16–18, and the variance is itself a finding.** Three runs:

```
FAIL  basemap Ocean paints       7,901 / 7,940 / 7,940 lit  (> 20000)   deterministic
 ??   basemap Satellite paints   4,315 / 433,542 / 4,328 lit (> 100000)  FLAKY
PASS  basemap Bare paints        2,946 / 2,690 / 2,946 lit  (> 500)
```

Two different problems, and they need different answers.

*Ocean fails deterministically, and it is the camera.* Nothing about the basemap changed. The
floors were calibrated against the old fixed camera, which framed most of North America; the
fitted camera frames a patch of open equatorial ocean with no land in it. The check's intent —
"selecting this style actually draws geography" — is still met, but its absolute threshold now
measures where the camera points. §3.5 makes changing a check a deliberate conversation, so it
has not been changed.

*Satellite is intermittent, and that is a regression this work caused.* It passes at 433,542
when the 2.5 MB Blue Marble raster has decoded and fails at ~4,300 when it has not. The context
cloud's second request is 14–20 MB and now competes with that decode, so a check that used to
land after the raster sometimes lands before it. Unlike Ocean, this one is a real race rather
than a stale threshold — it will misreport on any machine under load, not just this framing.

**P6's frame-rate budget regresses while context is on**: 59.2 fps control → 30.2 fps, an
~16 ms/frame cost from overdraw. Options are listed at the end of ADR 0006; the layer defaults
on, so this is live.

### 7.4 Also changed

- `scripts/measure-perf.mjs` gained `PERF_CONTEXT=off` as a control, in the shape
  `PERF_BASEMAP` established, and now waits for the point count to settle instead of a fixed
  14 s. The old fixed wait reported `points 0` against a 21 MB response while still printing a
  good frame rate — a stopwatch problem that looked like a budget failure.
- The perf harness reads `data-point-count` rather than scraping `innerText` for
  "points rendered". P1's uppercase label had silently broken that regex; a styling change must
  not be able to break a measurement.
- `scripts/shoot.mjs` waits for the context cloud before shooting, since it lands seconds after
  the answer does.

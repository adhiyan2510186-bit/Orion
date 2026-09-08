---
name: add-layer
description: Add or upgrade a FloatChat 4D visualization — a new deck.gl layer, custom GLSL shader, colormap, or render effect — without editing MapCanvas, hooks, or state. Use when adding a way to display float data (point clouds, trajectories, depth columns, heatmaps, anomaly halos), writing or changing shader code, changing how values map to color, or fixing WebGL rendering and performance problems.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# /add-layer — Upgrade the visualization (EP-3)

Visualizations are registered factories, not hardcoded JSX. `useLayerBuilder()` composes whatever
is in the registry from the current data, time cursor, theme, and selection. A new visualization
is **two new files**; `MapCanvas`, the hooks, and the stores stay untouched.

Read `frontend/features/map/layers/` and `frontend/features/map/hooks/useLayerBuilder.ts` first.
If they do not exist, phase P6 has not run.

## Workflow

**1. Create `frontend/features/map/layers/<name>Layer.ts`** exporting a `LayerFactory`:

```
{
  id: string
  label: string                              // shown in the layer toggle UI
  supports: (meta: MetaResponse) => boolean  // gate on data availability
  build: (ctx: LayerContext) => Layer | Layer[]
}
```

`LayerContext` gives you `{ points, trajectories, timeCursor, colorScale, theme, selection }`.
Everything a layer needs arrives through it — a layer that reaches outside this context for data
has broken the abstraction and will break when the transport or provider changes.

**2. Use `supports(meta)` rather than assuming.** A layer that renders dissolved oxygen should
return `false` when `meta.variables` has no oxygen descriptor, so it disappears cleanly on
datasets that lack it instead of rendering empty or throwing.

**3. Take colors from the theme, never literals.** Pull scales through `ctx.colorScale` /
`useColorScale(variable)`, which reads `design/scales.ts` keyed by `VariableDescriptor.colormap`.

This is why `design/tokens.ts` exports numeric RGB arrays as well as CSS values: deck.gl cannot
consume CSS variables, and a hardcoded `[255, 80, 80]` in a layer is exactly what breaks the
"re-theme with zero component edits" guarantee. Scientific colormaps (`thermal`, `haline`,
`viridis`, `diverging_balance`) live in `design/scales.ts` as data — add new ones there, not in the
layer.

**4. Respect the 4th dimension.** `ctx.timeCursor` drives animation. Prefer filtering by time in
attributes or shader uniforms over rebuilding layer data every frame — rebuilding is the usual
cause of scrubbing jank.

**5. For custom shaders, keep GLSL out of React.** Write
`frontend/features/map/shaders/<effect>.glsl.ts` and consume it from the layer factory via
deck.gl's `getShaders()` / `inject` hooks. No component imports shader source, which is what lets
a future team replace point sprites with volumetric ray-marching without touching the UI tree.

**6. Register it** in the layer registry index and confirm it appears in the layer toggle.

**7. Check the performance budget — this is the gate.** Target from the plan: **50k points at
60fps**. Measure with the browser performance panel, not by eye.

If you miss it: use binary/typed-array attribute paths instead of per-object accessors, avoid
allocating in `getPosition`/`getColor`, set `updateTriggers` precisely (over-broad triggers force
full re-uploads), and consider aggregation layers for dense views.

**8. Ship.** `make lint && make test`, then commit with scope `map`:
`feat(map): add depth column layer with thermocline shading`.

## Notes

- **Replacing deck.gl entirely** is a sibling `MapCanvas.<backend>.tsx` selected by config, taking
  the same deck-agnostic `LayerContext` props. Hooks and state are unaffected — do not fork them.
- **No `fetch` in a layer.** Layers render what `LayerContext` hands them. Data acquisition is the
  hooks layer's job, without exception.
- **Depth exaggeration** is a view concern from `useViewStore` — read it from context, do not
  bake a multiplier into positions.
- **Accessibility:** default colormaps must stay legible for colorblind viewers. There is a
  `colorblind-safe` theme; verify new scales against it rather than assuming.

/**
 * Canvas atmosphere — grain and vignette — as one component, so no feature
 * reimplements them and no panel ever accidentally gets them.
 *
 * This is the cinematic half of "austere instrument, cinematic canvas". It belongs
 * INSIDE the WebGL viewport and nowhere else. The grain breaks 8-bit banding in the
 * near-black where the deep water sits; the vignette seats the HUD readouts that live
 * in the corners. Both amplitudes are capped in design/tokens.ts with a stated reason,
 * and both are the first thing to cut if they ever cost measurable frame time.
 *
 * Two properties are load-bearing rather than cosmetic, and breaking either fails
 * `npm run verify` in a way that looks like a picking bug (UI_POLISH_PLAN.md §3.5):
 *
 *   1. `pointer-events: none` — carried by `.atmosphere`. Selecting a 2px measurement
 *      out of the point cloud is a DOM click forwarded to deck.gl. An overlay that
 *      swallows it kills selection outright.
 *   2. The overlays must not TINT the canvas. verify scans the WebGL framebuffer for a
 *      lit pixel and then clicks those coordinates through the DOM; an overlay that
 *      shifts colour desynchronises what was scanned from what was clicked. The grain
 *      is desaturated and the vignette is neutral black for exactly this reason — and
 *      because a coloured overlay on a canvas whose every colour encodes a measurement
 *      would be a lie about the data.
 */
export function CanvasAtmosphere() {
  return (
    <>
      <div className="atmosphere grain" />
      <div className="atmosphere vignette" />
    </>
  );
}

# ADR 0005 — Motion is permitted where it explains causality

**Status:** accepted
**Date:** 2026-09-18
**Supersedes:** the "Don't animate the interface" rule in `DESIGN.md` (Do's and Don'ts)

## Context

`DESIGN.md` carried an explicit prohibition:

> **Don't animate the interface.** Motion is 120ms on state changes (hover, selection,
> panel open) and nothing else: no fade-up on load, no easing on panel content, no
> transitions on data values. **The only thing that moves is the data** — the time
> scrubber advancing the 4D cloud. That distinction is the whole point, and universal
> animation destroys it.

That rule was load-bearing rather than decorative. Three files cite it as their
justification: `design/tokens.ts` (which exported exactly `fast: 120` and `medium: 200`),
`app/globals.css`, and `features/timeline/hooks/usePlayback.ts`, whose docstring says
"This is the one animation in the product."

Two things then changed the situation.

**The deliverable changed.** The primary audience is now judges watching a recorded
demo. They will not run the code, will not hover, and will not read an 11px readout.
Every state change in the product is currently instantaneous and therefore invisible on
video: a query returns in ~300 ms and the screen simply differs between one frame and
the next, with no evidence of cause.

**The strongest asset in the product is the least visible.** The rule-based parser turns
a sentence into a bounding box, a depth band, a threshold and a date range, and reports
what it could not understand. Today that is communicated by five identical grey chips
appearing with no transition. The parsing is what makes this a query engine rather than
a chart, and a static row of chips states the result without demonstrating the
relationship.

## Decision

Replace the prohibition with a test:

> **Motion is permitted where it explains a causal relationship, and forbidden as
> decoration.**

The test is a question with a factual answer: *what does this movement teach the user
that a static frame would not?* "It shows that A produced B" qualifies. "It feels
polished" does not, and does not ship.

Three categories qualify, and they are close to exhaustive:

1. **Causation between panels** — a sentence becoming filters, filters producing a
   result.
2. **Continuity of viewpoint** — interpolating the camera preserves the user's mental
   model of where they are in a 3D volume; a cut forces re-orientation from scratch.
3. **State that would otherwise appear instantly and therefore invisibly** — motion may
   occupy latency that already exists, never add delay to seem busier.

Bound by four constraints, recorded as design decisions rather than implementation
details:

- **Duration** 240–520 ms for explanatory motion; 120 ms for state changes. Easing
  `cubic-bezier(0.2, 0, 0, 1)` throughout. Nothing bounces.
- **`transform` and `opacity` only.** Never `width`, `height`, `top`, `left` or
  `box-shadow` — main-thread properties whose stutter would undermine the product's
  central claim of 60,000 points at 60 fps.
- **The canvas owns the frame budget.** While the time cursor is advancing, chrome is
  still.
- **Data values never tween.** A readout counting from 743 to 812 displays figures that
  were never measured.

Reduced motion resolves every animation **instantly to its final state**, never to a
degraded or half-played one. The product must be fully legible with all motion removed.

## What is preserved

The original rule protected a real distinction — instrument versus data — and the
replacement protects the same distinction by a sharper mechanism. `DESIGN.md` now states
the thesis directly: **the instrument is austere, the water is cinematic, and the
boundary between them is the design.** Glow, grain, vignette and additive blending are
confined to the canvas. The chrome stays flat, warm and matte, the accent stays under
5% of the surface, the no-blue-chrome rule is untouched, and shadows remain banned.

So the sentence "the only thing that moves is the data" becomes false in the letter and
true in the spirit: chrome may now move, but only to explain how the data got there.

## Consequences

**Good.** The parser's work becomes visible. Arrival orients the viewer in the 3D volume
instead of dropping them into it. Query latency becomes legible as cause and effect. The
system retains a defensible rule rather than abandoning one.

**Bad, accepted.** The rule is a judgement test rather than a prohibition, so it is
weaker under time pressure — "this explains something" is easier to rationalise than
"don't animate." The mitigation is the phrasing of the test and the `transform`/`opacity`
constraint, which is mechanically checkable in review.

**Risk.** `globals.css` applies `animation: none !important` under
`prefers-reduced-motion`. That prevents a keyframe animation rather than fast-forwarding
it, so any entry animation must be written with the *resting* style as the *finished*
style. An `opacity: 0` base with a fade-in keyframe would leave the element permanently
invisible for reduced-motion users. This is noted in `globals.css` at the rule itself.

**Verification.** `npm run verify` samples the WebGL framebuffer shortly after load and
requires >500 lit pixels and >8 colour buckets. Any arrival animation must therefore
complete well inside that window, and must be instant under reduced motion. This makes
the 18-check suite a real guard on motion duration, which is a useful accident.

## Alternatives considered

**Keep the prohibition and improve the static design only.** Honest, and it preserves a
stronger rule. Rejected because the parser's causal story has no static representation
that a judge will absorb in a ten-second shot — the chips are already on screen and
already ignored.

**Permit motion generally with a duration cap.** Simple to follow, but it is exactly the
"universal animation" the original rule correctly identified as destroying the
instrument/data distinction, and it would license fade-up-on-load everywhere.

**Animate the canvas only, never the chrome.** Tempting, and closest to the original
rule. Rejected because the single highest-value motion in the product — the sentence
decomposing into filters — is chrome, not canvas.

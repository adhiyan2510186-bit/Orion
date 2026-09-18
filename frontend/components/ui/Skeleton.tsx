/**
 * Placeholder for content that is on its way.
 *
 * This is explanatory motion, not decoration, and that is the only reason it ships
 * (ADR 0005). A query takes 63-311ms against the real fixture. At that speed the old
 * behaviour — swap the button label to "Searching", leave the previous result on
 * screen — produces no perceptible cause and effect at all: the result simply replaces
 * itself. The skeleton makes the query a visible event with a beginning, which is the
 * story beat the demo needs.
 *
 * The shimmer is a transform on a pseudo-element, never a background-position or width
 * animation, so it composites on the GPU and cannot steal frame time from the canvas.
 * The resting state is the finished state — a plain block — so the reduced-motion rule
 * in globals.css leaves something sensible rather than an invisible element.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`skeleton inline-block h-4 rounded-sm bg-[var(--color-raised)] ${className}`}
    />
  );
}

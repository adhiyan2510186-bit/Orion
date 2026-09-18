import type { ReactNode } from 'react';

/**
 * Panels are square-cornered: they hold data, and charts do not have rounded corners.
 * A rounded data surface reads as a card *about* the data rather than the data itself.
 *
 * Panels are INSTRUMENT surfaces and are therefore always opaque. Glass is a boundary
 * material, permitted only where the canvas shows through — see DESIGN.md and the
 * `.glass` utility's own comment in theme.generated.css.
 */
export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-neutral border-b border-[var(--color-border)] ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
          <h2 className="label-caps">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Readout label above value, never beside. Units belong in the label.
 *
 * `emphasis="hero"` sets the value at the display data size. It exists because the
 * four summary figures — floats, profiles, measurements, depth — ARE the product's
 * answer to the user's question, and they were set two points larger than their own
 * labels. Use it sparingly: DESIGN.md caps the loud numerals at four on screen, and
 * never bind one to a value that changes per frame.
 */
export function Readout({
  label,
  value,
  unit,
  emphasis = 'normal',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  emphasis?: 'normal' | 'hero';
}) {
  return (
    <div className="px-3 py-2">
      <div className="label-caps">
        {label}
        {unit ? ` ${unit}` : ''}
      </div>
      <div
        className={`data text-[var(--color-primary)] ${
          emphasis === 'hero' ? 'text-data-lg mt-0.5' : 'text-data-md'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

/**
 * Panels are square-cornered: they hold data, and charts do not have rounded corners.
 * A rounded data surface reads as a card *about* the data rather than the data itself.
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

/** Readout label above value, never beside. Units belong in the label. */
export function Readout({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="px-3 py-1.5">
      <div className="label-caps text-[10px]">
        {label}
        {unit ? ` ${unit}` : ''}
      </div>
      <div className="data text-[13px] text-[var(--color-onsurface)] tabular-nums">{value}</div>
    </div>
  );
}

import type { ButtonHTMLAttributes } from 'react';

/**
 * 28px tall, matching the readout row rhythm rather than the 40px of a consumer app.
 * `primary` is limited to one per view - if a screen appears to need two, one of them
 * is not primary.
 */
export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base =
    'h-7 px-3 rounded-md label-caps disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap';
  const styles =
    variant === 'primary'
      ? // label-caps carries the secondary text colour, so primary has to state its
        // own — otherwise the accent fill gets Graphite text on it and reads disabled.
        'bg-[var(--color-tertiary)] text-[var(--color-surface)] hover:bg-[var(--color-tertiary-strong)]'
      : 'bg-[var(--color-raised)] text-[var(--color-primary)] hover:bg-[var(--color-border)]';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

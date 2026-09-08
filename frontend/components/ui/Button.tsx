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
    'h-7 px-3 rounded-[4px] label-caps disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap';
  const styles =
    variant === 'primary'
      ? 'bg-[var(--color-tertiary)] text-[var(--color-surface)] hover:bg-[var(--color-tertiary-strong)]'
      : 'bg-[var(--color-raised)] text-[var(--color-primary)] hover:bg-[var(--color-border)]';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

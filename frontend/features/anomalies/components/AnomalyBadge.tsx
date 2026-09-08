import type { AnomalyTag } from '@/types/argo';

/**
 * Severity is encoded THREE ways - glyph, word, and colour - and colour is the last
 * of them. Around 1 in 12 men has a colour vision deficiency, and here a misread
 * colour is a misread measurement.
 */
const GLYPH: Record<string, string> = { critical: '\u25b8', warning: '\u00b7', info: '\u2022' };
const TONE: Record<string, string> = {
  critical: 'text-[var(--color-error)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-secondary)]',
};

export function AnomalyBadge({ tag, count }: { tag: AnomalyTag; count?: number }) {
  return (
    <div className="bg-[var(--color-raised)] rounded-[2px] px-2 py-1.5">
      <div className={`flex items-center gap-1.5 ${TONE[tag.severity]}`}>
        <span aria-hidden>{GLYPH[tag.severity]}</span>
        <span className="label-caps text-current">{tag.label}</span>
        <span className="ml-auto label-caps text-current opacity-80">{tag.severity}</span>
      </div>
      {/* Evidence inline: a flag a scientist cannot audit is one they will not trust. */}
      <div className="data text-[11px] text-[var(--color-secondary)] mt-1">
        {Object.entries(tag.evidence)
          .map(([key, value]) => `${key.replace(/_/g, ' ')} ${value}`)
          .join('  ·  ')}
      </div>
      {count !== undefined && (
        <div className="data text-[11px] text-[var(--color-secondary)] mt-0.5">
          {count.toLocaleString()} measurements · detected by {tag.detected_by}
        </div>
      )}
    </div>
  );
}

import { Card } from '@/components/brand/Card'
import { DeepoIcon } from '@/brand/icons'
import { ObligationStatusChip } from './ObligationStatusChip'
import { SeverityBadge } from './SeverityBadge'
import { formatShortDate } from './format'
import type { ObligationView } from './ObligationRow'

export interface ObligationCardProps extends ObligationView {
  /** Onyx (dark) surface treatment. */
  dark?: boolean
  onOpenEvidence?: () => void
}

/** Richer obligation surface built on the brand Card. */
export function ObligationCard({
  title,
  status,
  severity,
  sourceRuleId,
  sourceVersion,
  recursAt,
  evidenceCount,
  dark,
  onOpenEvidence,
}: ObligationCardProps) {
  return (
    <Card variant={dark ? 'dark' : 'default'} title={title}>
      <div className="dp-oblig-card__meta">
        <div className="dp-led-meta">
          <ObligationStatusChip status={status} />
          {severity ? <SeverityBadge severity={severity} /> : null}
        </div>
        {sourceRuleId ? (
          <span className="dp-led-prov">
            כלל {sourceRuleId.slice(0, 8)}
            {typeof sourceVersion === 'number' ? ` v${sourceVersion}` : ''}
          </span>
        ) : null}
        {recursAt ? (
          <span className="dp-led-recurs">
            <DeepoIcon id="dp-radar" />
            בדיקה הבאה: {formatShortDate(recursAt)}
          </span>
        ) : null}
        {onOpenEvidence ? (
          <button type="button" className="dp-led-link" onClick={onOpenEvidence}>
            <DeepoIcon id="dp-doc" />
            ראיות{typeof evidenceCount === 'number' ? ` (${evidenceCount})` : ''}
          </button>
        ) : null}
      </div>
    </Card>
  )
}

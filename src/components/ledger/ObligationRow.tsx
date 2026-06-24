import { DeepoIcon } from '@/brand/icons'
import { ObligationStatusChip } from './ObligationStatusChip'
import { SeverityBadge } from './SeverityBadge'
import { formatShortDate } from './format'
import type { ObligationStatus, Severity } from './status'

export interface ObligationView {
  title: string
  status: ObligationStatus
  severity?: Severity | null
  sourceRuleId?: string | null
  sourceVersion?: number | null
  recursAt?: string | null
  evidenceCount?: number
}

export interface ObligationRowProps extends ObligationView {
  onOpenEvidence?: () => void
}

/** Compact one-line obligation, for ledger lists. */
export function ObligationRow({ title, status, severity, recursAt, evidenceCount, onOpenEvidence }: ObligationRowProps) {
  return (
    <div className="dp-oblig-row">
      <span className="dp-oblig-row__title">{title}</span>
      {severity ? <SeverityBadge severity={severity} /> : null}
      <ObligationStatusChip status={status} />
      {recursAt ? (
        <span className="dp-led-recurs">
          <DeepoIcon id="dp-radar" />
          {formatShortDate(recursAt)}
        </span>
      ) : null}
      {onOpenEvidence ? (
        <button type="button" className="dp-led-link" onClick={onOpenEvidence}>
          <DeepoIcon id="dp-doc" />
          ראיות{typeof evidenceCount === 'number' ? ` (${evidenceCount})` : ''}
        </button>
      ) : null}
    </div>
  )
}

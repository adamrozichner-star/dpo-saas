import { Badge } from '@/components/brand/Badge'
import { DeepoIcon } from '@/brand/icons'
import { formatShortDate } from './format'
import { CADENCE_LABEL, CONTROL_STATUS, type Cadence, type ControlStatus } from './status'

export interface ControlScheduleItemProps {
  name: string
  cadence: Cadence
  nextDueAt?: string | null
  ownerRole?: string | null
  status?: ControlStatus
  overdue?: boolean
}

/** A scheduled recurring control: cadence, next due date, owner, status. */
export function ControlScheduleItem({ name, cadence, nextDueAt, ownerRole, status, overdue }: ControlScheduleItemProps) {
  return (
    <div className="dp-control-item">
      <DeepoIcon id="dp-bolt" className="dp-control-item__icon" />
      <div className="dp-control-item__body">
        <div className="dp-control-item__name">{name}</div>
        <div className="dp-control-item__meta">
          <span>{CADENCE_LABEL[cadence]}</span>
          {nextDueAt ? (
            <span className={overdue ? 'dp-led-due dp-led-due--over' : ''}>הבא: {formatShortDate(nextDueAt)}</span>
          ) : null}
          {ownerRole ? <span>אחראי: {ownerRole}</span> : null}
        </div>
      </div>
      {status ? (
        <Badge variant={CONTROL_STATUS[status].variant} data-control-status={status}>
          {CONTROL_STATUS[status].label}
        </Badge>
      ) : null}
    </div>
  )
}

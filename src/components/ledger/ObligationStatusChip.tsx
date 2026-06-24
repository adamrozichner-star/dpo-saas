import { Badge } from '@/components/brand/Badge'
import { OBLIGATION_STATUS, type ObligationStatus } from './status'

/** Chip for an obligation's lifecycle state. Color + label from the single-source map. */
export function ObligationStatusChip({ status }: { status: ObligationStatus }) {
  const { variant, label } = OBLIGATION_STATUS[status]
  return (
    <Badge variant={variant} dot data-status={status}>
      {label}
    </Badge>
  )
}

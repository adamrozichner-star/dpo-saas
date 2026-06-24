import { Badge } from '@/components/brand/Badge'
import { SEVERITY, type Severity } from './status'

/** Badge for an obligation/rule severity (info, warning, critical). */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const { variant, label } = SEVERITY[severity]
  return (
    <Badge variant={variant} data-severity={severity}>
      {label}
    </Badge>
  )
}

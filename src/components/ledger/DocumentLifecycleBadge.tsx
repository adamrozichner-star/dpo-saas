import { Badge } from '@/components/brand/Badge'
import { DOCUMENT_STATUS, type DocumentStatus } from './status'

/** Badge for a document's lifecycle state (live document_status enum). */
export function DocumentLifecycleBadge({ status }: { status: DocumentStatus }) {
  const { variant, label } = DOCUMENT_STATUS[status]
  return (
    <Badge variant={variant} data-doc-status={status}>
      {label}
    </Badge>
  )
}

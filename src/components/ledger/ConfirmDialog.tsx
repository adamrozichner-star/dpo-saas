'use client'

import * as React from 'react'
import { Button } from '@/components/brand/Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A brand-styled confirm modal for side-effectful DPO actions (certify, mint,
 * approve, resolve). Renders an overlay + card; the action only fires on explicit
 * confirm. Token-driven, RTL via .deepo-scope on the host shell.
 */
export function ConfirmDialog({ open, title, body, confirmLabel = 'אישור', cancelLabel = 'ביטול', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="dp-confirm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dp-confirm__backdrop" onClick={busy ? undefined : onCancel} />
      <div className="dp-confirm__card">
        <h3 className="dp-confirm__title">{title}</h3>
        {body ? <div className="dp-confirm__body t-body-sm">{body}</div> : null}
        <div className="dp-confirm__actions">
          <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={onConfirm}>{busy ? '…' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

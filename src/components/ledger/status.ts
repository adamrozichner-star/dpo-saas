// =============================================================================
// Ledger status -> brand-token color + Hebrew label maps. SINGLE SOURCE.
// The DPO console (C) and every later surface reuse these maps so a status
// renders the same color and label everywhere. Variants map to the brand
// status tokens via the Badge primitive (ok/warn/risk/info/neutral).
//
// Data shapes are the real ones from migration 037 + the live document_status
// enum. Do not invent statuses; these are the enums.
// =============================================================================

import type { DeepoIconId } from '@/brand/icons'

export type StatusVariant = 'ok' | 'warn' | 'risk' | 'info' | 'neutral'

export type ObligationStatus = 'unknown' | 'checking' | 'in_treatment' | 'compliant' | 'expired'
export type Severity = 'info' | 'warning' | 'critical'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
export type ControlStatus = 'active' | 'paused' | 'retired'
export type DocumentStatus = 'draft' | 'pending_review' | 'pending_approval' | 'active' | 'archived'
export type AssigneeActor = 'dpo' | 'owner' | 'sysadmin' | 'vendor'
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'
export type EntityType = 'obligation' | 'control' | 'task' | 'evidence' | 'asset'

interface VariantLabel {
  variant: StatusVariant
  label: string
}

export const OBLIGATION_STATUS: Record<ObligationStatus, VariantLabel> = {
  unknown: { variant: 'neutral', label: 'לא ידוע' },
  checking: { variant: 'info', label: 'בבדיקה' },
  in_treatment: { variant: 'warn', label: 'בטיפול' },
  compliant: { variant: 'ok', label: 'תקין' },
  expired: { variant: 'risk', label: 'פג תוקף' },
}

export const SEVERITY: Record<Severity, VariantLabel> = {
  info: { variant: 'info', label: 'מידע' },
  warning: { variant: 'warn', label: 'אזהרה' },
  critical: { variant: 'risk', label: 'קריטי' },
}

export const TASK_STATUS: Record<TaskStatus, VariantLabel> = {
  open: { variant: 'neutral', label: 'פתוח' },
  in_progress: { variant: 'info', label: 'בתהליך' },
  done: { variant: 'ok', label: 'הושלם' },
  cancelled: { variant: 'neutral', label: 'בוטל' },
}

export const CONTROL_STATUS: Record<ControlStatus, VariantLabel> = {
  active: { variant: 'ok', label: 'פעיל' },
  paused: { variant: 'warn', label: 'מושהה' },
  retired: { variant: 'neutral', label: 'הופסק' },
}

// Live document_status enum. 'active' is the live/published state; there is no
// literal 'published'/'approved' value (mapping note in tasks/lessons.md).
export const DOCUMENT_STATUS: Record<DocumentStatus, VariantLabel> = {
  draft: { variant: 'neutral', label: 'טיוטה' },
  pending_review: { variant: 'info', label: 'בבדיקה' },
  pending_approval: { variant: 'warn', label: 'ממתין לאישור' },
  active: { variant: 'ok', label: 'פורסם' },
  archived: { variant: 'neutral', label: 'בארכיון' },
}

export const ASSIGNEE_ACTOR: Record<AssigneeActor, { label: string; icon: DeepoIconId }> = {
  dpo: { label: 'ממונה', icon: 'dp-shield' },
  owner: { label: 'בעל עסק', icon: 'dp-seal' },
  sysadmin: { label: 'מנהל מערכת', icon: 'dp-database' },
  vendor: { label: 'ספק', icon: 'dp-link' },
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
  quarterly: 'רבעוני',
  biannual: 'חצי-שנתי',
  annual: 'שנתי',
}

export const ENTITY_ICON: Record<EntityType, DeepoIconId> = {
  obligation: 'dp-shield',
  control: 'dp-bolt',
  task: 'dp-bell',
  evidence: 'dp-doc',
  asset: 'dp-database',
}

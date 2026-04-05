// compliance-engine.ts — Compliance checks and task generation

export interface ComplianceGuideline {
  id: string
  title: string
  description: string
  icon: string
  legalBasis: string
  status: 'required' | 'resolved' | 'not_required' | 'info'
  priority: 'critical' | 'high' | 'medium' | 'low'
  actionIds: string[]
  resolvedReason?: string
}

export interface SubTask {
  id: string
  label: string
  status: 'pending' | 'completed'
}

export interface WizardQuestion {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'multi_select'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

export interface WizardConfig {
  questions: WizardQuestion[]
}

export interface ComplianceTask {
  id: string
  type: 'complete_profile' | 'missing_doc' | 'review' | 'update'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  field?: string
  icon?: string
  status?: 'pending' | 'completed' | 'auto_resolved' | 'doc_pending_review' | 'doc_approved'
  actionType?: 'generate_doc' | 'external_guide' | 'wizard' | 'manual'
  documentType?: string
  legalBasis?: string
  estimatedMinutes?: number
  guideSteps?: string[]
  postApprovalAction?: string
  subTasks?: SubTask[]
  resolvedNote?: string
  wizardConfig?: WizardConfig
}

export interface V3Answers {
  [key: string]: any
}

const FIELD_LABELS: Record<string, string> = {
  business_name: 'שם העסק',
  business_id: 'מספר ח.פ./ע.מ.',
  employee_count: 'מספר עובדים',
  industry: 'תחום פעילות',
  data_types: 'סוגי מידע',
  databases: 'מאגרי מידע',
  third_parties: 'גורמי צד שלישי',
  security_measures: 'אמצעי אבטחה',
  sensitive_data: 'מידע רגיש',
  data_processing_purpose: 'מטרות עיבוד',
}

export function detectSkippedFields(answers: V3Answers): string[] {
  const skipped: string[] = []
  for (const [key, value] of Object.entries(answers)) {
    if (value === '_skipped') {
      skipped.push(key)
    }
  }
  return skipped
}

export function generateComplianceTasks(answers: V3Answers, existingDocTypes: string[]): ComplianceTask[] {
  const tasks: ComplianceTask[] = []

  // Check for skipped fields
  const skippedFields = detectSkippedFields(answers)
  if (skippedFields.length > 0) {
    const fieldNames = skippedFields
      .map(f => FIELD_LABELS[f] || f)
      .join(', ')

    tasks.push({
      id: 'complete-profile',
      type: 'complete_profile',
      title: 'השלמת פרופיל הארגון',
      description: `השדות הבאים לא מולאו בתהליך ההרשמה ויש להשלימם: ${fieldNames}`,
      priority: 'medium',
    })

    // Individual field tasks for high-priority fields
    skippedFields.forEach(field => {
      if (['databases', 'security_measures', 'sensitive_data'].includes(field)) {
        tasks.push({
          id: `complete-${field}`,
          type: 'complete_profile',
          title: `השלמת ${FIELD_LABELS[field] || field}`,
          description: `שדה ${FIELD_LABELS[field] || field} לא מולא בהרשמה. מידע זה נדרש לציות מלא.`,
          priority: 'high',
          field,
        })
      }
    })
  }

  // Check for missing critical documents
  const requiredDocs = [
    { type: 'privacy_policy', label: 'מדיניות פרטיות' },
    { type: 'security_policy', label: 'נוהל אבטחת מידע' },
    { type: 'dpo_appointment', label: 'כתב מינוי DPO' },
  ]

  requiredDocs.forEach(doc => {
    if (!existingDocTypes.includes(doc.type)) {
      tasks.push({
        id: `missing-${doc.type}`,
        type: 'missing_doc',
        title: `יצירת ${doc.label}`,
        description: `${doc.label} הוא מסמך חובה שחסר בארגון.`,
        priority: 'high',
      })
    }
  })

  return tasks
}

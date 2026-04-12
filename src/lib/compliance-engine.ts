// ═══════════════════════════════════════════════════════
// UNIFIED COMPLIANCE TASK ENGINE v2
// Merges Actions + Guidelines into one task list
// Each task has an actionType that determines UX
// ═══════════════════════════════════════════════════════

const ACCESS_RANGES = [
  { v: '1-2', num: 2 }, { v: '3-10', num: 10 }, { v: '11-50', num: 50 },
  { v: '50-100', num: 100 }, { v: '100+', num: 150 },
]

const SIZE_NUMS: Record<string, number> = {
  'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000
}

const PROC_LABELS: Record<string, string> = {
  crm_saas: 'CRM / מערכת ניהול', payroll: 'שכר / HR', marketing: 'שיווק / דיוור',
  cloud_hosting: 'אחסון ענן', call_center: 'מוקד שירות', accounting: 'הנה"ח / רו"ח'
}

// ═══════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════

export type TaskActionType = 
  | 'auto_resolved'    // System handles it — green checkmark
  | 'doc_review'       // Doc exists, awaiting DPO approval or user action post-approval
  | 'generate_doc'     // User clicks → generates doc via API
  | 'wizard'           // Opens modal wizard → collects info → generates doc
  | 'external_guide'   // Step-by-step IRL instructions

export type TaskStatus =
  | 'completed'          // Done — grayed out at bottom
  | 'auto_resolved'      // System handles — grayed out at bottom
  | 'doc_approved'       // DPO approved doc → user needs to implement (auto-advanced)
  | 'doc_pending_review' // Doc exists, DPO hasn't reviewed
  | 'needs_generation'   // Doc doesn't exist yet — user should generate
  | 'needs_enrichment'   // Doc exists but thin — needs wizard to enrich
  | 'needs_action'       // External action required by user
  | 'not_applicable'     // Doesn't apply to this org

export interface ExternalGuideStep {
  title: string
  description: string
  linkUrl?: string
  linkLabel?: string
}

export interface WizardConfig {
  wizardId: string
  questions: WizardQuestion[]
}

export interface WizardQuestion {
  id: string
  label: string
  type: 'text' | 'select' | 'multi_select' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
}

export interface SubTask {
  id: string
  label: string          // e.g. "CRM / מערכת ניהול"
  processorKey: string   // e.g. "crm_saas"
  status: TaskStatus
  docId?: string         // if doc already generated
}

export interface ComplianceTask {
  id: string
  title: string
  description: string
  legalBasis: string
  icon: string                  // emoji
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: TaskStatus
  actionType: TaskActionType
  
  // Doc linkage
  documentType?: string         // links to documents table type
  docId?: string                // specific document ID if exists
  
  // Post-approval action (auto-advance)
  postApprovalAction?: string   // e.g. "פרסמו באתר"
  postApprovalGuide?: ExternalGuideStep[]
  
  // For wizard type
  wizardConfig?: WizardConfig
  
  // For external_guide type
  guideSteps?: ExternalGuideStep[]
  
  // For per-supplier DPAs
  subTasks?: SubTask[]
  
  // Completion tracking
  resolvedNote?: string
  resolvedAt?: string
  
  // Estimated effort
  estimatedMinutes?: number
  
  // Sort helpers
  sortOrder: number             // lower = higher in list
}

// Backward compat — old interfaces still exported for transition
export interface ComplianceAction {
  id: string
  title: string
  description: string
  legalBasis: string
  status: 'auto_resolved' | 'pending_dpo' | 'pending_user' | 'not_applicable' | 'completed'
  owner: 'system' | 'dpo' | 'user'
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'done' | 'user_action' | 'dpo_pending' | 'reporting'
  estimatedMinutes?: number
  documentType?: string
  actionPath?: string
  resolvedNote?: string
}

export interface ComplianceGuideline {
  id: string
  title: string
  description: string
  legalBasis: string
  status: 'resolved' | 'required' | 'not_required' | 'info'
  resolvedReason?: string
  actionIds: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  icon: string
}

export interface ActionOverride {
  status: 'completed'
  resolvedAt: string
  note?: string
}

export interface ComplianceSummary {
  tasks: ComplianceTask[]
  // Legacy — kept for backward compat during transition
  actions: ComplianceAction[]
  guidelines: ComplianceGuideline[]
  score: number
  securityLevel: 'basic' | 'medium' | 'high'
  securityLevelHe: string
  totalRecords: number
  dbCount: number
  needsReporting: boolean
  reportingReasons: string[]
  needsCiso: boolean
  cisoReason?: string
}

// ═══════════════════════════════════════════════════════
// DOC READINESS GATE
// ═══════════════════════════════════════════════════════

export function checkDocReadiness(docType: string, v3Answers: any): { ready: boolean; missing: string[] } {
  const missing: string[] = []
  const dbs = v3Answers?.databases || []
  const dbDetails = v3Answers?.dbDetails || {}
  
  switch (docType) {
    case 'dpo_appointment':
      // Always ready — static template
      return { ready: true, missing: [] }
    
    case 'privacy_policy':
      if (dbs.length === 0) missing.push('לא הוגדרו מאגרי מידע')
      if (!v3Answers?.industry) missing.push('לא הוגדר סוג עסק')
      return { ready: missing.length === 0, missing }
    
    case 'security_procedures':
      // Ready if we have basic org info
      return { ready: true, missing: [] }
    
    case 'database_definition':
      if (dbs.length === 0) missing.push('לא הוגדרו מאגרי מידע')
      if (Object.keys(dbDetails).length === 0) missing.push('חסרים פרטי מאגרים')
      return { ready: missing.length === 0, missing }
    
    case 'ropa':
      if (dbs.length === 0) missing.push('לא הוגדרו מאגרי מידע')
      return { ready: missing.length === 0, missing }
    
    case 'consent_form':
      if (dbs.length === 0) missing.push('לא הוגדרו מאגרי מידע')
      return { ready: missing.length === 0, missing }
    
    case 'processor_agreement':
      // Needs specific supplier name — never ready from auto-gen
      missing.push('נדרש שם ספק ספציפי')
      return { ready: false, missing }
    
    case 'access_control_policy':
    case 'camera_appointment':
    case 'ciso_appointment':
    case 'employee_training':
    case 'cv_retention_policy':
    case 'tofes_17':
      // These are never auto-generated
      missing.push('מסמך זה דורש הפקה ידנית')
      return { ready: false, missing }
    
    default:
      return { ready: true, missing: [] }
  }
}

// ═══════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════

export function deriveComplianceActions(
  v3Answers: any,
  documents: any[],
  incidents: any[],
  actionOverrides?: Record<string, ActionOverride>
): ComplianceSummary {
  const tasks: ComplianceTask[] = []
  const docTypes = documents.map(d => d.type)
  const activeDocs = documents.filter(d => d.status === 'active')
  const activeDocTypes = activeDocs.map(d => d.type)
  const pendingDocs = documents.filter(d => ['pending_review', 'pending_approval'].includes(d.status))
  const pendingDocTypes = pendingDocs.map(d => d.type)

  // Extract v3 data
  const dbs = v3Answers?.databases || []
  const customDbs = v3Answers?.customDatabases || []
  const dbCount = dbs.length + customDbs.length
  const processors = v3Answers?.processors || []
  const customProcessors = v3Answers?.customProcessors || []
  const allProcessors = [...processors, ...customProcessors]
  const hasConsent = v3Answers?.hasConsent
  const accessControl = v3Answers?.accessControl
  const industry = v3Answers?.industry
  const securityOwner = v3Answers?.securityOwner
  const dbDetails = v3Answers?.dbDetails || {}

  // Calculate totals
  const totalRecords = Object.values(dbDetails).reduce(
    (sum: number, d: any) => sum + (SIZE_NUMS[d?.size] || 50), 0
  )
  const maxAccess = Object.values(dbDetails).reduce((max: number, d: any) => {
    const num = ACCESS_RANGES.find(a => a.v === d?.access)?.num || 0
    return Math.max(max, num)
  }, 0)

  const hasMedical = dbs.includes('medical')
  const hasCameras = dbs.includes('cameras')
  const hasCvs = dbs.includes('cvs')
  const hasWebLeads = dbs.includes('website_leads')
  const isHealthOrFinance = industry === 'health' || industry === 'finance'
  const hasSensitiveData = hasMedical || isHealthOrFinance

  // Security level
  const isHigh = totalRecords >= 100000 || hasMedical || isHealthOrFinance || maxAccess >= 100
  const isMedium = totalRecords >= 10000 || dbs.length >= 5
  const securityLevel = isHigh ? 'high' : isMedium ? 'medium' : 'basic'
  const securityLevelHe = isHigh ? 'גבוהה' : isMedium ? 'בינונית' : 'בסיסית'

  // Reporting obligation
  const reportingReasons: string[] = []
  if (isHigh) reportingReasons.push('רמת אבטחה גבוהה')
  if (totalRecords >= 100000) reportingReasons.push('מעל 100,000 נושאי מידע')
  if (hasMedical && totalRecords >= 10000) reportingReasons.push('מידע רפואי עם מעל 10,000 רשומות')
  const needsReporting = reportingReasons.length > 0

  // CISO requirement
  const needsCiso = hasSensitiveData && maxAccess >= 50
  const cisoReason = needsCiso
    ? 'ארגון המעבד מידע רגיש עם מעל 50 בעלי גישה עשוי לחייב מינוי CISO בנוסף ל-DPO'
    : undefined

  // Helper: find doc by type
  const findDoc = (type: string) => documents.find(d => d.type === type)
  const isDocApproved = (type: string) => activeDocTypes.includes(type)
  const isDocPending = (type: string) => pendingDocTypes.includes(type)
  const hasDoc = (type: string) => docTypes.includes(type)

  // Helper: resolve status for doc-linked tasks
  function docTaskStatus(docType: string): TaskStatus {
    if (isDocApproved(docType)) return 'doc_approved'
    if (isDocPending(docType)) return 'doc_pending_review'
    if (hasDoc(docType)) return 'doc_pending_review'
    return 'needs_generation'
  }

  // ═══════════════════════════════════════════════════
  // TASK DEFINITIONS
  // ═══════════════════════════════════════════════════

  let sortOrder = 0

  // ── 1. DPO Appointment (auto-resolved) ──
  tasks.push({
    id: 'dpo-appointed',
    title: 'מינוי ממונה הגנת פרטיות',
    description: 'עו״ד דנה כהן מונתה כממונה הגנת הפרטיות שלכם באמצעות Deepo.',
    legalBasis: 'תיקון 13, סעיף 17ב',
    icon: '🛡️',
    priority: 'critical',
    status: 'auto_resolved',
    actionType: 'auto_resolved',
    resolvedNote: 'בוצע אוטומטית — עו״ד דנה כהן',
    sortOrder: sortOrder++,
  })

  // ── 2. DPO Appointment Letter (sign + send) ──
  const dpoLetterStatus = docTaskStatus('dpo_appointment')
  tasks.push({
    id: 'dpo-letter',
    title: 'חתימה על כתב מינוי DPO',
    description: 'הורידו את כתב המינוי, חתמו ושמרו עותק. יש להעביר עותק חתום לממונה.',
    legalBasis: 'תיקון 13, סעיף 17ב',
    icon: '✍️',
    priority: 'high',
    status: dpoLetterStatus,
    actionType: dpoLetterStatus === 'doc_approved' ? 'external_guide' : 'doc_review',
    documentType: 'dpo_appointment',
    docId: findDoc('dpo_appointment')?.id,
    estimatedMinutes: 10,
    postApprovalAction: 'הורידו, חתמו והעבירו עותק חתום לממונה',
    guideSteps: [
      { title: 'הורדת כתב המינוי', description: 'גשו ללשונית מסמכים והורידו את כתב המינוי כ-PDF' },
      { title: 'חתימה', description: 'חתמו על המסמך (חתימה דיגיטלית או ידנית)' },
      { title: 'שליחה לממונה', description: 'שלחו עותק חתום לממונה במייל — dpo@deepo.co.il' },
    ],
    sortOrder: sortOrder++,
  })

  // ── 3. Privacy Policy ──
  const ppStatus = docTaskStatus('privacy_policy')
  tasks.push({
    id: 'privacy-policy',
    title: 'מדיניות פרטיות',
    description: ppStatus === 'doc_approved'
      ? 'מדיניות הפרטיות מאושרת. יש לפרסם באתר הארגון.'
      : ppStatus === 'doc_pending_review'
        ? 'ממתינה לאישור הממונה.'
        : 'מדיניות פרטיות תיוצר אוטומטית על בסיס נתוני הארגון.',
    legalBasis: 'תיקון 13, חובת יידוע מורחב',
    icon: '📜',
    priority: 'high',
    status: ppStatus,
    actionType: ppStatus === 'doc_approved' ? 'external_guide' : ppStatus === 'needs_generation' ? 'generate_doc' : 'doc_review',
    documentType: 'privacy_policy',
    docId: findDoc('privacy_policy')?.id,
    estimatedMinutes: 15,
    postApprovalAction: 'פרסמו את מדיניות הפרטיות באתר הארגון',
    guideSteps: [
      { title: 'הורדת המדיניות', description: 'גשו ללשונית מסמכים והורידו את מדיניות הפרטיות' },
      { title: 'פרסום באתר', description: 'העלו את המסמך לאתר הארגון — מומלץ להוסיף קישור בפוטר' },
      { title: 'אימות', description: 'ודאו שהקישור נגיש מכל עמוד באתר' },
    ],
    sortOrder: sortOrder++,
  })

  // ── 4. Security Procedures ──
  const secStatus = docTaskStatus('security_procedures')
  const secStatusAlt = hasDoc('security_policy') ? docTaskStatus('security_policy') : secStatus
  const effectiveSecStatus = secStatusAlt === 'needs_generation' ? secStatus : secStatusAlt
  tasks.push({
    id: 'security-procedures',
    title: 'נוהל אבטחת מידע',
    description: effectiveSecStatus === 'doc_approved'
      ? 'נוהל אבטחה מאושר. יש להפיץ לכל העובדים.'
      : effectiveSecStatus === 'doc_pending_review'
        ? 'ממתין לאישור הממונה.'
        : 'נוהל אבטחת מידע ייוצר על בסיס נתוני הארגון.',
    legalBasis: 'תקנות אבטחת מידע 2017',
    icon: '🔒',
    priority: 'high',
    status: effectiveSecStatus,
    actionType: effectiveSecStatus === 'doc_approved' ? 'external_guide' : effectiveSecStatus === 'needs_generation' ? 'generate_doc' : 'doc_review',
    documentType: 'security_procedures',
    docId: findDoc('security_procedures')?.id || findDoc('security_policy')?.id,
    estimatedMinutes: 15,
    postApprovalAction: 'שלחו את נוהל האבטחה לכל העובדים',
    guideSteps: [
      { title: 'הורדת הנוהל', description: 'גשו ללשונית מסמכים והורידו את נוהל אבטחת מידע' },
      { title: 'הפצה לעובדים', description: 'שלחו את הנוהל במייל לכל העובדים — בקשו אישור קריאה' },
      { title: 'תיעוד', description: 'שמרו רשימת עובדים שאישרו קריאה' },
    ],
    sortOrder: sortOrder++,
  })

  // ── 5. Database Definition ──
  const dbDefStatus = docTaskStatus('database_definition')
  tasks.push({
    id: 'db-definition',
    title: 'הגדרת מאגרי מידע',
    description: dbDefStatus === 'completed' || dbDefStatus === 'doc_approved'
      ? `${dbCount} מאגרים רשומים ומתועדים`
      : `${dbCount} מאגרים זוהו — ממתין לאישור`,
    legalBasis: 'חוק הגנת הפרטיות, סעיף 8',
    icon: '🗄️',
    priority: 'high',
    status: dbDefStatus,
    actionType: dbDefStatus === 'needs_generation' ? 'generate_doc' : 'doc_review',
    documentType: 'database_definition',
    docId: findDoc('database_definition')?.id,
    estimatedMinutes: 10,
    sortOrder: sortOrder++,
  })

  // ── 6. ROPA ──
  const ropaStatus = docTaskStatus('ropa')
  tasks.push({
    id: 'ropa',
    title: 'מפת עיבוד נתונים (ROPA)',
    description: ropaStatus === 'doc_approved'
      ? 'מפת העיבוד מאושרת ומעודכנת'
      : `נוצרה מ-${dbCount} מאגרים ו-${allProcessors.length} ספקים`,
    legalBasis: 'תיקון 13, חובת תיעוד פעילויות עיבוד',
    icon: '🗺️',
    priority: 'medium',
    status: ropaStatus,
    actionType: ropaStatus === 'needs_generation' ? 'generate_doc' : 'doc_review',
    documentType: 'ropa',
    docId: findDoc('ropa')?.id,
    estimatedMinutes: 10,
    sortOrder: sortOrder++,
  })

  // ── 7. Consent Form ──
  const consentStatus = docTaskStatus('consent_form')
  tasks.push({
    id: 'consent-form',
    title: 'טופס הסכמה לאיסוף מידע',
    description: consentStatus === 'doc_approved'
      ? 'טופס ההסכמה מאושר — יש להטמיע באתר ובטפסים'
      : consentStatus === 'doc_pending_review'
        ? 'ממתין לאישור הממונה'
        : 'טופס הסכמה מדעת ייוצר על בסיס סוגי המידע שאתם אוספים',
    legalBasis: 'תיקון 13, חובת הסכמה מדעת',
    icon: '✋',
    priority: 'medium',
    status: consentStatus,
    actionType: consentStatus === 'doc_approved' ? 'external_guide' : consentStatus === 'needs_generation' ? 'generate_doc' : 'doc_review',
    documentType: 'consent_form',
    docId: findDoc('consent_form')?.id,
    postApprovalAction: 'הטמיעו את טופס ההסכמה בטפסים ובאתר',
    guideSteps: [
      { title: 'הורדת הטופס', description: 'גשו ללשונית מסמכים והעתיקו את נוסח ההסכמה' },
      { title: 'הטמעה בטפסים', description: 'הוסיפו את נוסח ההסכמה לכל טופס שאוסף מידע אישי' },
      { title: 'הוספה לאתר', description: 'הוסיפו checkbox הסכמה בטפסי יצירת קשר ורכישה' },
    ],
    sortOrder: sortOrder++,
  })

  // ── 8. Consent Implementation (if no consent mechanism) ──
  if (hasConsent === 'no' && hasWebLeads) {
    tasks.push({
      id: 'consent-implementation',
      title: 'הטמעת מנגנון הסכמה באתר',
      description: 'האתר אוסף לידים ללא מנגנון הסכמה — חובה להוסיף הסכמה מדעת בטפסים',
      legalBasis: 'תיקון 13, סעיף יידוע מורחב',
      icon: '🌐',
      priority: 'high',
      status: 'needs_action',
      actionType: 'external_guide',
      estimatedMinutes: 60,
      guideSteps: [
        { title: 'הכנת נוסח', description: 'השתמשו בטופס ההסכמה שנוצר במערכת (לשונית מסמכים)' },
        { title: 'הוספה לטפסי האתר', description: 'הוסיפו checkbox עם נוסח ההסכמה לפני כפתור השליחה בכל טופס' },
        { title: 'בדיקה', description: 'ודאו שלא ניתן לשלוח טופס ללא סימון ההסכמה' },
      ],
      sortOrder: sortOrder++,
    })
  }

  // ── 9. Processor Agreements (DPAs) — per supplier ──
  if (allProcessors.length > 0) {
    const subTasks: SubTask[] = allProcessors.map(p => {
      const label = PROC_LABELS[p] || p
      // Check if individual DPA exists for this processor
      const existingDpa = documents.find(d => 
        d.type === 'processor_agreement' && 
        d.title?.includes(label)
      )
      return {
        id: `dpa-${p}`,
        label,
        processorKey: p,
        status: existingDpa 
          ? (existingDpa.status === 'active' ? 'completed' : 'doc_pending_review')
          : 'needs_generation',
        docId: existingDpa?.id,
      }
    })

    const allDone = subTasks.every(s => s.status === 'completed')
    const someDone = subTasks.some(s => s.status === 'completed')

    tasks.push({
      id: 'processor-agreements',
      title: `הסכמי עיבוד מידע — ${allProcessors.length} ספקים`,
      description: allDone
        ? 'כל הסכמי העיבוד נחתמו ואושרו'
        : `נדרש הסכם עיבוד מידע בכתב עם כל ספק המעבד מידע אישי`,
      legalBasis: 'תיקון 13, חובת הסדרה חוזית',
      icon: '📝',
      priority: 'medium',
      status: allDone ? 'completed' : 'needs_generation',
      actionType: 'wizard',
      documentType: 'processor_agreement',
      subTasks,
      wizardConfig: {
        wizardId: 'dpa',
        questions: [
          { id: 'supplierName', label: 'שם הספק (חברה)', type: 'text', placeholder: 'לדוגמה: Salesforce, חילן, מאנדיי', required: true },
          { id: 'supplierService', label: 'סוג השירות', type: 'text', placeholder: 'לדוגמה: מערכת CRM, ניהול שכר', required: true },
          { id: 'dataShared', label: 'אילו סוגי מידע משותפים עם הספק?', type: 'multi_select', options: [
            { value: 'names', label: 'שמות ופרטי קשר' },
            { value: 'ids', label: 'מספרי ת.ז' },
            { value: 'financial', label: 'מידע פיננסי' },
            { value: 'health', label: 'מידע רפואי' },
            { value: 'behavioral', label: 'מידע התנהגותי' },
            { value: 'employee', label: 'מידע על עובדים' },
          ]},
          { id: 'serverLocation', label: 'מיקום שרתי הספק', type: 'select', options: [
            { value: 'israel', label: 'ישראל' },
            { value: 'eu', label: 'אירופה (EU)' },
            { value: 'us', label: 'ארה"ב' },
            { value: 'other', label: 'אחר' },
          ]},
        ],
      },
      estimatedMinutes: 15,
      sortOrder: sortOrder++,
    })
  }

  // ── 10. Access Control ──
  if (accessControl === 'all') {
    tasks.push({
      id: 'access-control',
      title: 'הגבלת גישה למאגרי מידע',
      description: 'כל העובדים רואים את כל המידע — נדרשת בקרת גישה לפי תפקיד',
      legalBasis: 'תקנות אבטחת מידע 2017, סעיף 5',
      icon: '🔑',
      priority: 'high',
      status: 'needs_action',
      actionType: 'external_guide',
      estimatedMinutes: 120,
      guideSteps: [
        { title: 'מיפוי תפקידים', description: 'רשמו את כל התפקידים בארגון ואילו מאגרי מידע כל תפקיד צריך' },
        { title: 'הגדרת הרשאות', description: 'בכל מערכת (CRM, אימייל, שרתים) — הגדירו גישה לפי תפקיד' },
        { title: 'ביטול גישת "כולם"', description: 'הסירו הרשאות admin/כללי ממי שלא צריך' },
        { title: 'תיעוד', description: 'תעדו את מדיניות ההרשאות — ניתן ליצור מסמך מדיניות בקרת גישה' },
      ],
      sortOrder: sortOrder++,
    })
  }

  // ── 11. Camera Officer ──
  if (hasCameras && !v3Answers?.cameraOwnerName) {
    tasks.push({
      id: 'camera-officer',
      title: 'מינוי אחראי מצלמות אבטחה',
      description: 'הארגון מפעיל מצלמות — חובה למנות אחראי מצלמות בכתב',
      legalBasis: 'חוק הגנת הפרטיות, סעיף 7',
      icon: '📹',
      priority: 'medium',
      status: 'needs_generation',
      actionType: 'wizard',
      documentType: 'camera_appointment',
      wizardConfig: {
        wizardId: 'camera_officer',
        questions: [
          { id: 'officerName', label: 'שם אחראי המצלמות', type: 'text', required: true },
          { id: 'officerRole', label: 'תפקיד בארגון', type: 'text', placeholder: 'לדוגמה: מנהל תפעול' },
          { id: 'cameraCount', label: 'מספר מצלמות', type: 'number' },
          { id: 'cameraLocations', label: 'מיקום המצלמות', type: 'text', placeholder: 'לדוגמה: כניסה ראשית, חניון, משרדים' },
        ],
      },
      estimatedMinutes: 15,
      sortOrder: sortOrder++,
    })
  }

  // ── 12. CV Deletion Policy ──
  if (hasCvs) {
    const cvsRetention = dbDetails?.cvs?.retention
    const hasRetentionPolicy = cvsRetention === 'quarterly' || cvsRetention === 'policy'
    if (!hasRetentionPolicy) {
      tasks.push({
        id: 'cv-deletion',
        title: 'מדיניות מחיקת קורות חיים',
        description: 'חובה למחוק קו"ח כל 3 חודשים (עד שנתיים לצורך מקצועי מתועד)',
        legalBasis: 'חוק הגנת הפרטיות, תקנות שמירת מידע',
        icon: '📄',
        priority: 'high',
        status: 'needs_action',
        actionType: 'wizard',
        documentType: 'cv_retention_policy',
        wizardConfig: {
          wizardId: 'cv_retention',
          questions: [
            { id: 'storageLocation', label: 'איפה מאוחסנים קורות החיים?', type: 'select', options: [
              { value: 'email', label: 'אימייל' },
              { value: 'drive', label: 'Google Drive / OneDrive' },
              { value: 'hr_system', label: 'מערכת HR' },
              { value: 'local', label: 'מחשב מקומי' },
              { value: 'other', label: 'אחר' },
            ], required: true },
            { id: 'volume', label: 'כמה קו"ח אתם מקבלים בחודש?', type: 'select', options: [
              { value: '1-10', label: '1-10' },
              { value: '10-50', label: '10-50' },
              { value: '50+', label: 'מעל 50' },
            ]},
            { id: 'currentPractice', label: 'מה קורה היום עם קו"ח שלא רלוונטיים?', type: 'select', options: [
              { value: 'nothing', label: 'נשארים לנצח' },
              { value: 'sometimes', label: 'נמחקים לפעמים' },
              { value: 'manual', label: 'נמחקים ידנית כשנזכרים' },
            ]},
          ],
        },
        estimatedMinutes: 30,
        sortOrder: sortOrder++,
      })
    }
  }

  // ── 13. CISO Check ──
  if (needsCiso && (!securityOwner || securityOwner === 'none')) {
    tasks.push({
      id: 'ciso-appointment',
      title: 'מינוי ממונה אבטחת מידע (CISO)',
      description: cisoReason!,
      legalBasis: 'תיקון 13, סעיף 17ג',
      icon: '🔐',
      priority: 'medium',
      status: 'needs_action',
      actionType: 'external_guide',
      estimatedMinutes: 60,
      guideSteps: [
        { title: 'זיהוי מועמד', description: 'בחרו אדם בארגון עם רקע טכני / אבטחה — אסור שיהיה בניגוד עניינים עם ה-DPO' },
        { title: 'מינוי רשמי', description: 'הפיקו כתב מינוי CISO (ניתן דרך המערכת)' },
        { title: 'הגדרת תחומי אחריות', description: 'מפו את האחריות: ניטור, תגובה לאירועים, סקירות תקופתיות' },
      ],
      sortOrder: sortOrder++,
    })
  }

  // ── 14. Employee Training ──
  if (maxAccess > 10) {
    tasks.push({
      id: 'employee-training',
      title: 'הדרכת עובדים בנושא פרטיות',
      description: 'עובדים עם גישה למידע אישי חייבים לעבור הדרכה. יש לתעד את ההדרכה.',
      legalBasis: 'תקנות אבטחת מידע 2017, סעיף 10',
      icon: '🎓',
      priority: 'medium',
      status: 'needs_action',
      actionType: 'wizard',
      documentType: 'employee_training',
      wizardConfig: {
        wizardId: 'employee_training',
        questions: [
          { id: 'employeeCount', label: 'מספר עובדים שנדרשת להם הדרכה', type: 'number', required: true },
          { id: 'departments', label: 'מחלקות עיקריות עם גישה למידע', type: 'text', placeholder: 'לדוגמה: שירות לקוחות, כספים, HR' },
          { id: 'lastTraining', label: 'מתי נערכה הדרכה אחרונה?', type: 'select', options: [
            { value: 'never', label: 'מעולם' },
            { value: 'year_plus', label: 'לפני יותר משנה' },
            { value: 'this_year', label: 'השנה' },
          ]},
          { id: 'format', label: 'פורמט מועדף', type: 'select', options: [
            { value: 'presentation', label: 'מצגת להעברה פרונטלית' },
            { value: 'document', label: 'מסמך הדרכה לקריאה עצמאית' },
            { value: 'both', label: 'שניהם' },
          ]},
        ],
      },
      estimatedMinutes: 60,
      sortOrder: sortOrder++,
    })
  }

  // ── 15. Reporting Obligation ──
  if (needsReporting) {
    tasks.push({
      id: 'reporting-obligation',
      title: 'רישום מאגרים ברשות להגנת הפרטיות',
      description: `חובת דיווח: ${reportingReasons.join(', ')}`,
      legalBasis: 'חוק הגנת הפרטיות, סעיף 8',
      icon: '📋',
      priority: 'critical',
      status: 'needs_action',
      actionType: 'external_guide',
      estimatedMinutes: 45,
      guideSteps: [
        { title: 'הורדת טופס 17', description: 'המערכת תפיק טופס מילוי מוקדם על בסיס מאגרי המידע שלכם' },
        { title: 'כניסה לפורטל הרשות', description: 'גשו לאתר הרשות להגנת הפרטיות', linkUrl: 'https://www.gov.il/he/departments/topics/databases_registration', linkLabel: 'פורטל רישום מאגרים' },
        { title: 'הגשת הטופס', description: 'מלאו את הטופס בפורטל והגישו — ניתן לצרף את טופס 17 שהופק' },
        { title: 'שמירת אישור', description: 'שמרו את אישור ההגשה ועדכנו במערכת' },
      ],
      sortOrder: sortOrder++,
    })
  }

  // ── 16. Open Incidents ──
  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  if (openIncidents.length > 0) {
    tasks.push({
      id: 'open-incidents',
      title: `${openIncidents.length} אירועי אבטחה פתוחים`,
      description: 'יש לטפל באירועי אבטחה פתוחים בהקדם. דיווח לרשות תוך 24 שעות אם רלוונטי.',
      legalBasis: 'תיקון 13, חובת דיווח אירוע אבטחה',
      icon: '🚨',
      priority: 'critical',
      status: 'needs_action',
      actionType: 'external_guide',
      guideSteps: [
        { title: 'סקירת אירועים', description: 'גשו ללשונית אירועי אבטחה וסקרו כל אירוע פתוח' },
      ],
      sortOrder: sortOrder++,
    })
  }

  // ── 17. Breach Procedures (auto-resolved — system module) ──
  tasks.push({
    id: 'breach-procedures',
    title: 'נוהל טיפול באירועי אבטחה',
    description: 'מערכת Deepo כוללת מודול ניהול אירועים עם ספירה לאחור של 24 שעות.',
    legalBasis: 'תיקון 13, חובת דיווח אירוע אבטחה',
    icon: '🚨',
    priority: 'high',
    status: 'auto_resolved',
    actionType: 'auto_resolved',
    resolvedNote: 'מובנה במערכת Deepo',
    sortOrder: sortOrder++,
  })

  // ── 18. Subject Rights Handling (auto-resolved — system module) ──
  tasks.push({
    id: 'subject-rights',
    title: 'טיפול בבקשות פרטיות של נושאי מידע',
    description: 'מערכת Deepo כוללת טופס ציבורי לבקשות פרטיות עם מעקב ולוחות זמנים.',
    legalBasis: 'תיקון 13, זכויות נושא המידע',
    icon: '👤',
    priority: 'high',
    status: 'auto_resolved',
    actionType: 'auto_resolved',
    resolvedNote: 'מובנה במערכת Deepo',
    sortOrder: sortOrder++,
  })

  // ── 18b. Rights Workflow (user-declared) ──
  const rightsWorkflow = v3Answers?.rightsWorkflow
  if (rightsWorkflow === 'no' || rightsWorkflow === 'unknown') {
    tasks.push({
      id: 'rights-workflow',
      title: 'אין תהליך לטיפול בבקשות זכויות נושאי מידע',
      description: 'סעיפים 13-14 לחוק מחייבים תהליך מסודר לטיפול בבקשות עיון, תיקון ומחיקה.',
      legalBasis: 'חוק הגנת הפרטיות, סעיפים 13-14',
      icon: '📬',
      priority: 'high',
      status: 'needs_action',
      actionType: 'external_guide',
      sortOrder: sortOrder++,
    })
  } else if (rightsWorkflow === 'yes_informal') {
    tasks.push({
      id: 'rights-workflow',
      title: 'תהליך טיפול בבקשות זכויות אינו מתועד',
      description: 'התהליך קיים אך לא תועד — מומלץ לתעד כדי לעמוד בדרישות הרגולטור.',
      legalBasis: 'חוק הגנת הפרטיות, סעיפים 13-14',
      icon: '📬',
      priority: 'medium',
      status: 'needs_action',
      actionType: 'external_guide',
      sortOrder: sortOrder++,
    })
  }

  // ── 19. ROPA Maintenance (auto-resolved — system module) ──
  tasks.push({
    id: 'ropa-maintenance',
    title: 'תחזוקת מפת עיבוד נתונים',
    description: `המערכת מייצרת ומתחזקת מפת עיבוד מ-${dbCount} מאגרים ו-${allProcessors.length} ספקים.`,
    legalBasis: 'תיקון 13, חובת תיעוד פעילויות עיבוד',
    icon: '🗺️',
    priority: 'medium',
    status: 'auto_resolved',
    actionType: 'auto_resolved',
    resolvedNote: 'מובנה במערכת Deepo',
    sortOrder: sortOrder++,
  })

  // ── 20. DPIA — required for sensitive/large-scale activities ──
  const sizeMapDPIA: Record<string, number> = { 'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000 }
  const dpiaRequiredActivities = dbs.filter((dbKey: string) => {
    const detail = dbDetails[dbKey] || {}
    if (detail.sensitive) return true
    if ((sizeMapDPIA[detail.size] || 0) >= 100000) return true
    if (dbKey === 'medical' || dbKey === 'cameras') return true
    return false
  })
  if (dpiaRequiredActivities.length > 0) {
    tasks.push({
      id: 'dpia-required',
      title: 'תסקיר השפעה על הפרטיות (DPIA)',
      description: `${dpiaRequiredActivities.length} פעילויות דורשות תסקיר השפעה לפי הנחיית הרשות להגנת הפרטיות.`,
      legalBasis: 'תיקון 13, הנחיית הרשות להגנת הפרטיות',
      icon: '🛡️',
      priority: 'high',
      status: 'needs_action',
      actionType: 'external_guide',
      sortOrder: sortOrder++,
    })
  }

  // ═══════════════════════════════════════════════════
  // APPLY USER OVERRIDES
  // ═══════════════════════════════════════════════════
  if (actionOverrides) {
    for (const task of tasks) {
      const override = actionOverrides[task.id]
      if (override && override.status === 'completed') {
        task.status = 'completed'
        task.resolvedNote = override.note || `סומן כבוצע — ${new Date(override.resolvedAt).toLocaleDateString('he-IL')}`
        task.resolvedAt = override.resolvedAt
      }
      // Also check sub-tasks
      if (task.subTasks) {
        for (const st of task.subTasks) {
          const stOverride = actionOverrides[st.id]
          if (stOverride && stOverride.status === 'completed') {
            st.status = 'completed'
          }
        }
        // If all sub-tasks completed, mark parent
        if (task.subTasks.every(s => s.status === 'completed')) {
          task.status = 'completed'
          task.resolvedNote = 'כל הסכמי העיבוד הושלמו'
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // SORT: active tasks by priority, completed at bottom
  // ═══════════════════════════════════════════════════
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const statusOrder: Record<TaskStatus, number> = {
    needs_action: 0,
    needs_generation: 1,
    needs_enrichment: 2,
    doc_approved: 3,
    doc_pending_review: 4,
    completed: 10,
    auto_resolved: 11,
    not_applicable: 12,
  }

  tasks.sort((a, b) => {
    const sa = statusOrder[a.status] ?? 5
    const sb = statusOrder[b.status] ?? 5
    if (sa !== sb) return sa - sb
    const pa = priorityOrder[a.priority] ?? 9
    const pb = priorityOrder[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return a.sortOrder - b.sortOrder
  })

  // ═══════════════════════════════════════════════════
  // SCORE CALCULATION
  // ═══════════════════════════════════════════════════
  const weights: Record<string, number> = {
    'dpo-appointed': 10,
    'dpo-letter': 8,
    'privacy-policy': 10,
    'security-procedures': 10,
    'db-definition': 8,
    'ropa': 8,
    'consent-form': 6,
    'consent-implementation': 5,
    'processor-agreements': 7,
    'access-control': 5,
    'camera-officer': 3,
    'cv-deletion': 4,
    'ciso-appointment': 3,
    'employee-training': 3,
    'reporting-obligation': 8,
    'open-incidents': 10,
    'breach-procedures': 5,
    'subject-rights': 5,
    'rights-workflow': 8,
    'ropa-maintenance': 3,
    'dpia-required': 10,
  }

  let totalWeight = 0
  let earnedWeight = 0
  for (const task of tasks) {
    const w = weights[task.id] || 3
    if (task.status !== 'not_applicable') {
      totalWeight += w
      if (task.status === 'completed' || task.status === 'auto_resolved') {
        earnedWeight += w
      } else if (task.status === 'doc_approved') {
        earnedWeight += w * 0.8  // approved but not yet implemented
      } else if (task.status === 'doc_pending_review') {
        earnedWeight += w * 0.5  // doc exists, pending review
      }
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0

  // ═══════════════════════════════════════════════════
  // BUILD LEGACY INTERFACES (backward compat)
  // ═══════════════════════════════════════════════════
  const actions: ComplianceAction[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    legalBasis: t.legalBasis,
    status: t.status === 'auto_resolved' ? 'auto_resolved' as const
      : t.status === 'completed' ? 'completed' as const
      : t.status === 'doc_pending_review' ? 'pending_dpo' as const
      : t.status === 'not_applicable' ? 'not_applicable' as const
      : 'pending_user' as const,
    owner: t.status === 'auto_resolved' ? 'system' as const
      : t.status === 'doc_pending_review' ? 'dpo' as const
      : 'user' as const,
    priority: t.priority,
    category: (t.status === 'completed' || t.status === 'auto_resolved') ? 'done' as const
      : t.status === 'doc_pending_review' ? 'dpo_pending' as const
      : t.id === 'reporting-obligation' ? 'reporting' as const
      : 'user_action' as const,
    estimatedMinutes: t.estimatedMinutes,
    documentType: t.documentType,
    actionPath: '/dashboard?tab=tasks',
    resolvedNote: t.resolvedNote,
  }))

  const guidelines: ComplianceGuideline[] = tasks
    .filter(t => t.legalBasis)
    .map(t => ({
      id: `gl-${t.id}`,
      title: t.title,
      description: t.description,
      legalBasis: t.legalBasis,
      status: (t.status === 'completed' || t.status === 'auto_resolved' || t.status === 'doc_approved') 
        ? 'resolved' as const
        : t.status === 'not_applicable' ? 'not_required' as const
        : 'required' as const,
      resolvedReason: t.resolvedNote,
      actionIds: [t.id],
      priority: t.priority,
      icon: t.icon,
    }))

  return {
    tasks,
    actions,
    guidelines,
    score,
    securityLevel,
    securityLevelHe,
    totalRecords,
    dbCount,
    needsReporting,
    reportingReasons,
    needsCiso,
    cisoReason,
  }
}

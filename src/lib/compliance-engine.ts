// ═══════════════════════════════════════════════════════
// COMPLIANCE ACTIONS ENGINE
// Derives every action item from onboarding data
// ═══════════════════════════════════════════════════════

const ACCESS_RANGES = [
  { v: '1-2', num: 2 }, { v: '3-10', num: 10 }, { v: '11-50', num: 50 },
  { v: '50-100', num: 100 }, { v: '100+', num: 150 },
]

const SIZE_NUMS: Record<string, number> = {
  'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000
}

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

export interface ComplianceSummary {
  actions: ComplianceAction[]
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

export function deriveComplianceActions(
  v3Answers: any,
  documents: any[],
  incidents: any[]
): ComplianceSummary {
  const actions: ComplianceAction[] = []
  const docTypes = documents.map(d => d.type)
  const activeDocs = documents.filter(d => d.status === 'active')
  const activeDocTypes = activeDocs.map(d => d.type)
  const pendingDocs = documents.filter(d => ['pending_review', 'pending_signature'].includes(d.status))

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

  // ═══════════════════════════════════════════════════
  // ACTION DERIVATION RULES
  // ═══════════════════════════════════════════════════

  // 1. DPO Appointment — always auto-resolved
  actions.push({
    id: 'dpo-appointed',
    title: 'מינוי ממונה הגנת פרטיות',
    description: 'עו״ד דנה כהן מונתה כממונה הגנת הפרטיות שלכם',
    legalBasis: 'תיקון 13, סעיף 17ב',
    status: 'auto_resolved',
    owner: 'system',
    priority: 'critical',
    category: 'done',
    resolvedNote: 'בוצע אוטומטית — עו״ד דנה כהן',
    documentType: 'dpo_appointment'
  })

  // 2. DPO Appointment Letter — needs user signature
  const hasDpoDoc = docTypes.includes('dpo_appointment')
  const dpoDocApproved = activeDocTypes.includes('dpo_appointment')
  actions.push({
    id: 'dpo-letter-sign',
    title: 'חתימה על כתב מינוי DPO',
    description: 'הורידו את כתב המינוי, חתמו ושמרו עותק. יש להעביר עותק חתום לממונה',
    legalBasis: 'תיקון 13, סעיף 17ב',
    status: dpoDocApproved ? 'completed' : hasDpoDoc ? 'pending_user' : 'pending_dpo',
    owner: dpoDocApproved ? 'system' : 'user',
    priority: 'high',
    category: dpoDocApproved ? 'done' : hasDpoDoc ? 'user_action' : 'dpo_pending',
    estimatedMinutes: 10,
    documentType: 'dpo_appointment',
    actionPath: '/dashboard?tab=documents'
  })

  // 3. Privacy Policy
  const hasPrivacy = docTypes.includes('privacy_policy')
  const privacyApproved = activeDocTypes.includes('privacy_policy')
  actions.push({
    id: 'privacy-policy',
    title: 'מדיניות פרטיות',
    description: privacyApproved
      ? 'פרסמו את מדיניות הפרטיות באתר הארגון עם קישור בפוטר'
      : hasPrivacy ? 'ממתין לאישור הממונה' : 'ייוצר אוטומטית',
    legalBasis: 'תיקון 13, חובת יידוע',
    status: privacyApproved ? 'pending_user' : hasPrivacy ? 'pending_dpo' : 'pending_dpo',
    owner: privacyApproved ? 'user' : 'dpo',
    priority: 'high',
    category: privacyApproved ? 'user_action' : hasPrivacy ? 'dpo_pending' : 'dpo_pending',
    estimatedMinutes: 15,
    documentType: 'privacy_policy',
    actionPath: '/dashboard?tab=documents'
  })

  // 4. Security Procedures
  const hasSecurity = docTypes.includes('security_procedures') || docTypes.includes('security_policy')
  const securityApproved = activeDocTypes.includes('security_procedures') || activeDocTypes.includes('security_policy')
  actions.push({
    id: 'security-procedures',
    title: 'נוהל אבטחת מידע',
    description: securityApproved
      ? 'שלחו את נוהל האבטחה לכל העובדים ותעדו שקראו'
      : hasSecurity ? 'ממתין לאישור הממונה' : 'ייוצר אוטומטית',
    legalBasis: 'תקנות אבטחת מידע 2017',
    status: securityApproved ? 'pending_user' : hasSecurity ? 'pending_dpo' : 'pending_dpo',
    owner: securityApproved ? 'user' : 'dpo',
    priority: 'high',
    category: securityApproved ? 'user_action' : hasSecurity ? 'dpo_pending' : 'dpo_pending',
    estimatedMinutes: 15,
    documentType: 'security_procedures',
    actionPath: '/dashboard?tab=documents'
  })

  // 5. Database Registration
  const hasDbReg = docTypes.includes('database_registration') || docTypes.includes('database_definition')
  const dbRegApproved = activeDocTypes.includes('database_registration') || activeDocTypes.includes('database_definition')
  actions.push({
    id: 'db-registration',
    title: 'רישום מאגרי מידע',
    description: dbRegApproved
      ? `${dbCount} מאגרים רשומים ומתועדים`
      : `${dbCount} מאגרים זוהו — ממתין לאישור הממונה`,
    legalBasis: 'חוק הגנת הפרטיות, סעיף 8',
    status: dbRegApproved ? 'completed' : hasDbReg ? 'pending_dpo' : 'pending_dpo',
    owner: dbRegApproved ? 'system' : 'dpo',
    priority: 'high',
    category: dbRegApproved ? 'done' : 'dpo_pending',
    estimatedMinutes: 10,
    documentType: 'database_definition',
    actionPath: '/dashboard?tab=documents'
  })

  // 6. ROPA
  const hasRopa = docTypes.includes('ropa')
  const ropaApproved = activeDocTypes.includes('ropa')
  actions.push({
    id: 'ropa',
    title: 'מפת עיבוד נתונים (ROPA)',
    description: ropaApproved
      ? 'מפת העיבוד מאושרת ומעודכנת'
      : `נוצרה מ-${dbCount} מאגרים ו-${allProcessors.length} ספקים — ממתינה לאישור`,
    legalBasis: 'תיקון 13, חובת תיעוד פעילויות עיבוד',
    status: ropaApproved ? 'completed' : hasRopa ? 'pending_dpo' : 'pending_dpo',
    owner: ropaApproved ? 'system' : 'dpo',
    priority: 'medium',
    category: ropaApproved ? 'done' : 'dpo_pending',
    estimatedMinutes: 10,
    documentType: 'ropa',
    actionPath: '/dashboard?tab=documents'
  })

  // 7. Consent Form
  const hasConsentDoc = docTypes.includes('consent_form')
  const consentApproved = activeDocTypes.includes('consent_form')
  actions.push({
    id: 'consent-form',
    title: 'טופס הסכמה לאיסוף מידע',
    description: consentApproved
      ? 'טופס ההסכמה מאושר ומוכן לשימוש'
      : hasConsentDoc ? 'ממתין לאישור הממונה' : 'ייוצר אוטומטית',
    legalBasis: 'תיקון 13, חובת הסכמה מדעת',
    status: consentApproved ? 'completed' : hasConsentDoc ? 'pending_dpo' : 'pending_dpo',
    owner: consentApproved ? 'system' : 'dpo',
    priority: 'medium',
    category: consentApproved ? 'done' : 'dpo_pending',
    documentType: 'consent_form',
    actionPath: '/dashboard?tab=documents'
  })

  // 8. Consent mechanism implementation (if they said no)
  if (hasConsent === 'no' && hasWebLeads) {
    actions.push({
      id: 'consent-implementation',
      title: 'הטמעת מנגנון הסכמה באתר',
      description: 'חובה להוסיף מנגנון הסכמה מדעת בטפסי האתר לפני איסוף מידע אישי',
      legalBasis: 'תיקון 13, סעיף יידוע מורחב',
      status: 'pending_user',
      owner: 'user',
      priority: 'high',
      category: 'user_action',
      estimatedMinutes: 60,
      actionPath: '/chat?prompt=' + encodeURIComponent('איך מטמיעים מנגנון הסכמה (consent) באתר?')
    })
  }

  // 9. Processor agreements (one per processor)
  if (allProcessors.length > 0) {
    const PROC_LABELS: Record<string, string> = {
      crm_saas: 'CRM / מערכת ניהול', payroll: 'שכר / HR', marketing: 'שיווק / דיוור',
      cloud_hosting: 'אחסון ענן', call_center: 'מוקד שירות', accounting: 'הנה"ח / רו"ח'
    }
    actions.push({
      id: 'processor-agreements',
      title: `הסכמי עיבוד מידע — ${allProcessors.length} ספקים`,
      description: `נדרש הסכם עיבוד מידע בכתב עם: ${allProcessors.map(p => PROC_LABELS[p] || p).join(', ')}`,
      legalBasis: 'תיקון 13, חובת הסדרה חוזית',
      status: 'pending_user',
      owner: 'user',
      priority: 'medium',
      category: 'user_action',
      estimatedMinutes: 30,
      actionPath: '/chat?prompt=' + encodeURIComponent('אני צריך הסכם עיבוד מידע לספקים שלי')
    })
  }

  // 10. Access control
  if (accessControl === 'all') {
    actions.push({
      id: 'access-control',
      title: 'הגבלת גישה למאגרי מידע',
      description: 'כל העובדים רואים את כל המידע — נדרשת בקרת גישה לפי תפקיד',
      legalBasis: 'תקנות אבטחת מידע 2017, סעיף 5',
      status: 'pending_user',
      owner: 'user',
      priority: 'high',
      category: 'user_action',
      estimatedMinutes: 120,
      actionPath: '/chat?prompt=' + encodeURIComponent('איך מגדירים בקרת גישה למאגרי מידע?')
    })
  }

  // 11. Camera officer
  if (hasCameras && !v3Answers?.cameraOwnerName) {
    actions.push({
      id: 'camera-officer',
      title: 'מינוי אחראי מצלמות',
      description: 'נדרש למנות אחראי מצלמות בכתב ולתעד את ההחלטה',
      legalBasis: 'חוק הגנת הפרטיות, סעיף 7',
      status: 'pending_user',
      owner: 'user',
      priority: 'medium',
      category: 'user_action',
      estimatedMinutes: 15,
      actionPath: '/chat?prompt=' + encodeURIComponent('איך ממנים אחראי מצלמות?')
    })
  }

  // 12. CV deletion policy
  if (hasCvs) {
    const cvsRetention = dbDetails?.cvs?.retention
    const hasRetentionPolicy = cvsRetention === 'quarterly' || cvsRetention === 'policy'
    if (!hasRetentionPolicy) {
      actions.push({
        id: 'cv-deletion',
        title: 'מדיניות מחיקת קו"ח',
        description: 'חובה למחוק קו"ח כל 3 חודשים (עד שנתיים לצורך מקצועי)',
        legalBasis: 'חוק הגנת הפרטיות, תקנות שמירת מידע',
        status: 'pending_user',
        owner: 'user',
        priority: 'high',
        category: 'user_action',
        estimatedMinutes: 30,
        actionPath: '/chat?prompt=' + encodeURIComponent('איך מיישמים מדיניות מחיקת קורות חיים?')
      })
    }
  }

  // 13. CISO requirement
  if (needsCiso) {
    actions.push({
      id: 'ciso-check',
      title: 'בדיקת צורך בממונה אבטחת מידע (CISO)',
      description: cisoReason!,
      legalBasis: 'תיקון 13, סעיף 17ג',
      status: securityOwner && securityOwner !== 'none' ? 'completed' : 'pending_user',
      owner: 'user',
      priority: 'medium',
      category: securityOwner && securityOwner !== 'none' ? 'done' : 'user_action',
      actionPath: '/chat?prompt=' + encodeURIComponent('האם הארגון שלי חייב למנות CISO?')
    })
  }

  // 14. Employee training
  if (maxAccess > 10) {
    actions.push({
      id: 'employee-training',
      title: 'הדרכת עובדים בנושא פרטיות',
      description: 'עובדים עם גישה למידע אישי חייבים לעבור הדרכה בנושא הגנת פרטיות',
      legalBasis: 'תקנות אבטחת מידע 2017, סעיף 10',
      status: 'pending_user',
      owner: 'user',
      priority: 'low',
      category: 'user_action',
      estimatedMinutes: 60,
      actionPath: '/chat?prompt=' + encodeURIComponent('אני צריך חומרי הדרכה לעובדים בנושא פרטיות')
    })
  }

  // 15. Reporting obligation
  if (needsReporting) {
    actions.push({
      id: 'reporting-obligation',
      title: 'רישום מאגרים ברשות להגנת הפרטיות',
      description: `חובת דיווח: ${reportingReasons.join(', ')}`,
      legalBasis: 'חוק הגנת הפרטיות, סעיף 8',
      status: 'pending_user',
      owner: 'user',
      priority: 'critical',
      category: 'reporting',
      actionPath: '/chat?prompt=' + encodeURIComponent('איך מדווחים לרשות להגנת הפרטיות על מאגרי מידע?')
    })
  }

  // 16. Open incidents
  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  if (openIncidents.length > 0) {
    actions.push({
      id: 'open-incidents',
      title: `${openIncidents.length} אירועי אבטחה פתוחים`,
      description: 'יש לטפל באירועי אבטחה פתוחים בהקדם. דיווח לרשות תוך 72 שעות אם רלוונטי',
      legalBasis: 'תיקון 13, חובת דיווח אירוע אבטחה',
      status: 'pending_user',
      owner: 'user',
      priority: 'critical',
      category: 'user_action',
      actionPath: '/dashboard?tab=incidents'
    })
  }

  // ═══════════════════════════════════════════════════
  // SCORE CALCULATION
  // ═══════════════════════════════════════════════════
  const weights: Record<string, number> = {
    'dpo-appointed': 10,
    'dpo-letter-sign': 8,
    'privacy-policy': 10,
    'security-procedures': 10,
    'db-registration': 8,
    'ropa': 8,
    'consent-form': 6,
    'consent-implementation': 5,
    'processor-agreements': 7,
    'access-control': 5,
    'camera-officer': 3,
    'cv-deletion': 4,
    'ciso-check': 3,
    'employee-training': 3,
    'reporting-obligation': 8,
    'open-incidents': 10,
  }

  let totalWeight = 0
  let earnedWeight = 0
  for (const action of actions) {
    const w = weights[action.id] || 3
    if (action.status !== 'not_applicable') {
      totalWeight += w
      if (action.status === 'auto_resolved' || action.status === 'completed') {
        earnedWeight += w
      } else if (action.status === 'pending_dpo' && docTypes.includes(action.documentType || '')) {
        // Doc exists but pending review — give partial credit
        earnedWeight += w * 0.5
      }
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0

  return {
    actions,
    score,
    securityLevel,
    securityLevelHe,
    totalRecords,
    dbCount,
    needsReporting,
    reportingReasons,
    needsCiso,
    cisoReason
  }
}

// DPIA (Privacy Impact Assessment) catalog and helpers
// Based on Israeli Privacy Authority methodology

export interface DpiaRisk {
  id: string
  category: string
  name: string
  description: string
  defaultLikelihood: number
  defaultImpact: number
}

export interface DpiaControl {
  id: string
  name: string
  mitigates: string[]
  effectivenessReduction: number
}

export const DPIA_RISK_CATALOG: DpiaRisk[] = [
  { id: 'unauthorized_access', category: 'אבטחה', name: 'גישה לא מורשית למידע', description: 'עובדים או גורמים חיצוניים יכולים לגשת למידע מבלי הרשאה', defaultLikelihood: 3, defaultImpact: 4 },
  { id: 'data_breach', category: 'אבטחה', name: 'דליפת מידע (Data Breach)', description: 'דליפת מידע אישי לגורמים בלתי מורשים', defaultLikelihood: 2, defaultImpact: 5 },
  { id: 'excessive_collection', category: 'איסוף', name: 'איסוף מידע מעבר לנדרש', description: 'איסוף מידע שאינו נחוץ למטרת העיבוד', defaultLikelihood: 4, defaultImpact: 3 },
  { id: 'retention_violation', category: 'שמירה', name: 'שמירת מידע מעבר לנדרש', description: 'שמירת מידע ללא צורך עסקי או לאחר תום המטרה', defaultLikelihood: 4, defaultImpact: 3 },
  { id: 'third_party_transfer', category: 'העברה', name: 'העברה לצד שלישי ללא הסכם', description: 'העברת מידע לספקים ללא הסכם עיבוד מתאים', defaultLikelihood: 3, defaultImpact: 4 },
  { id: 'lack_of_consent', category: 'הסכמה', name: 'איסוף ללא הסכמה תקפה', description: 'איסוף מידע ללא הסכמה מודעת ומתועדת', defaultLikelihood: 3, defaultImpact: 4 },
  { id: 'profiling', category: 'עיבוד', name: 'יצירת פרופיל אוטומטי', description: 'קבלת החלטות אוטומטיות המשפיעות על נושאי המידע', defaultLikelihood: 2, defaultImpact: 4 },
  { id: 'sensitive_exposure', category: 'מידע רגיש', name: 'חשיפת מידע רגיש', description: 'חשיפה של מידע רגיש (רפואי, פיננסי, ביומטרי)', defaultLikelihood: 2, defaultImpact: 5 },
  { id: 'inadequate_anonymization', category: 'אנונימיזציה', name: 'אנונימיזציה לא מספקת', description: 'מידע מאונון שניתן לזהות בקלות', defaultLikelihood: 3, defaultImpact: 3 },
  { id: 'subject_rights_failure', category: 'זכויות', name: 'אי מימוש זכויות נושאי מידע', description: 'חוסר יכולת לטפל בבקשות עיון, תיקון או מחיקה', defaultLikelihood: 3, defaultImpact: 3 },
  { id: 'no_audit_trail', category: 'תיעוד', name: 'חוסר תיעוד פעולות', description: 'אין יומן ביקורת לפעולות עיבוד מידע', defaultLikelihood: 4, defaultImpact: 3 },
  { id: 'employee_training', category: 'אנושי', name: 'חוסר הדרכת עובדים', description: 'עובדים אינם מודעים לחובות הגנת פרטיות', defaultLikelihood: 4, defaultImpact: 3 },
]

export const DPIA_CONTROLS_CATALOG: DpiaControl[] = [
  { id: 'access_control', name: 'בקרת גישה מבוססת תפקיד', mitigates: ['unauthorized_access', 'sensitive_exposure'], effectivenessReduction: 2 },
  { id: 'encryption_rest', name: 'הצפנת מידע במנוחה', mitigates: ['data_breach', 'sensitive_exposure'], effectivenessReduction: 2 },
  { id: 'encryption_transit', name: 'הצפנת מידע בהעברה (TLS)', mitigates: ['data_breach'], effectivenessReduction: 1 },
  { id: 'mfa', name: 'אימות דו-שלבי', mitigates: ['unauthorized_access'], effectivenessReduction: 2 },
  { id: 'data_minimization', name: 'מדיניות צמצום נתונים', mitigates: ['excessive_collection'], effectivenessReduction: 3 },
  { id: 'retention_policy', name: 'מדיניות שמירה ומחיקה אוטומטית', mitigates: ['retention_violation'], effectivenessReduction: 3 },
  { id: 'dpa_contracts', name: 'הסכמי עיבוד מידע (DPA) עם ספקים', mitigates: ['third_party_transfer'], effectivenessReduction: 3 },
  { id: 'consent_management', name: 'מערכת ניהול הסכמות', mitigates: ['lack_of_consent'], effectivenessReduction: 3 },
  { id: 'employee_training', name: 'הדרכת עובדים שנתית', mitigates: ['employee_training', 'unauthorized_access'], effectivenessReduction: 2 },
  { id: 'audit_log', name: 'יומן ביקורת מפורט', mitigates: ['no_audit_trail', 'unauthorized_access'], effectivenessReduction: 2 },
  { id: 'rights_workflow', name: 'תהליך טיפול בבקשות נושאי מידע', mitigates: ['subject_rights_failure'], effectivenessReduction: 3 },
  { id: 'pseudonymization', name: 'פסבדונימיזציה / אנונימיזציה', mitigates: ['sensitive_exposure', 'inadequate_anonymization'], effectivenessReduction: 2 },
]

export function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 16) return 'critical'
  if (score >= 9) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

export const RISK_LEVEL_COLORS = {
  low: { bg: '#d1fae5', border: '#10b981', text: '#065f46', label: 'נמוך' },
  medium: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'בינוני' },
  high: { bg: '#fed7aa', border: '#f97316', text: '#9a3412', label: 'גבוה' },
  critical: { bg: '#fecaca', border: '#ef4444', text: '#991b1b', label: 'קריטי' },
}

export function calculateResidualRisk(initialScore: number, controlIds: string[]): number {
  let reduction = 0
  controlIds.forEach(id => {
    const ctrl = DPIA_CONTROLS_CATALOG.find(c => c.id === id)
    if (ctrl) reduction += ctrl.effectivenessReduction
  })
  return Math.max(1, initialScore - reduction)
}

export function activityRequiresDPIA(dbType: string, detail: any): { required: boolean; reason: string } {
  if (detail?.sensitive) return { required: true, reason: 'מידע רגיש (רפואי/פיננסי/ביומטרי)' }
  const sizeMap: Record<string, number> = { 'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000 }
  const recordCount = sizeMap[detail?.size] || 0
  if (recordCount >= 100000) return { required: true, reason: 'יותר מ-100,000 נושאי מידע' }
  if (dbType === 'medical' || dbType === 'cameras' || dbType === 'biometric') return { required: true, reason: 'סוג מידע רגיש מהותית' }
  return { required: false, reason: '' }
}

export const DB_LABELS_DPIA: Record<string, string> = {
  customers: 'לקוחות', cvs: 'מועמדים / קורות חיים', employees: 'עובדים',
  cameras: 'מצלמות אבטחה', website_leads: 'לידים מהאתר',
  suppliers_id: 'ספקים', payments: 'תשלומים', medical: 'מידע רפואי',
}

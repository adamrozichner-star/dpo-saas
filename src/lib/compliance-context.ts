// Compliance context builder for the AI assistant.
//
// Single source of truth for "what's the org's current state?" — used by
// /api/compliance-coach to ground Claude's answers in the org's real data
// instead of letting the model guess from a one-line finding.

import { SupabaseClient } from '@supabase/supabase-js'
import { deriveComplianceActions, ComplianceTask, TaskStatus } from './compliance-engine'
import { DPO_ROLE_LABELS, type DpoRoleInOrg } from './dpo-conflict'

const SIZE_NUMS: Record<string, number> = {
  'under100': 50, '100-1k': 500, '1k-10k': 5000, '10k-100k': 50000, '100k+': 150000,
}

const INDUSTRY_LABELS: Record<string, string> = {
  health: 'בריאות', retail: 'קמעונאות', tech: 'טכנולוגיה', services: 'שירותים',
  finance: 'פיננסים', education: 'חינוך', legal: 'משפט', food: 'מזון', realestate: 'נדל"ן',
}

const DB_LABELS: Record<string, string> = {
  customers: 'לקוחות', cvs: 'קורות חיים / מועמדים', employees: 'עובדים',
  cameras: 'מצלמות', website_leads: 'לידים מהאתר', suppliers_id: 'עוסקים מורשים',
  payments: 'תשלומים', medical: 'רפואי',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  privacy_policy: 'מדיניות פרטיות',
  security_policy: 'נוהל אבטחת מידע',
  security_procedures: 'נוהל אבטחת מידע',
  dpo_appointment: 'כתב מינוי DPO',
  database_registration: 'רישום מאגרי מידע',
  database_definition: 'הגדרת מאגרי מידע',
  ropa: 'מפת עיבוד מידע (ROPA)',
  data_flow: 'מפת זרימת מידע',
  access_control_policy: 'מדיניות בקרת גישה',
  camera_appointment: 'מינוי אחראי מצלמות',
  ciso_appointment: 'מינוי CISO',
  employee_training: 'הדרכת עובדים',
  cv_retention_policy: 'מדיניות שמירת קו"ח',
  tofes_17: 'טופס 17',
}

const RIGHTS_WORKFLOW_LABELS: Record<string, string> = {
  yes_documented: 'כן — תהליך מתועד',
  yes_informal: 'כן — לא מתועד',
  no: 'לא',
  unknown: 'לא ידוע',
}

const CONSENT_LABELS: Record<string, string> = {
  yes: 'כן',
  no: 'לא',
  no_website: 'אין אתר',
}

const STATUS_LABELS_HE: Record<string, string> = {
  active: 'פעיל',
  approved: 'מאושר',
  pending_review: 'ממתין לסקירת ממונה',
  pending_approval: 'ממתין לאישור',
  draft: 'טיוטה',
  expired: 'פג תוקף',
}

export interface ComplianceContextDocument {
  type: string
  status: string
  ageMonths: number | null
}

export interface ComplianceContext {
  org: {
    id: string
    name: string
    industry: string | null
    employeeCount: string | null
    tier: string | null
    onboardingCompleted: boolean
    dpoConflictStatus: string | null
    dpoRoleInOrg: DpoRoleInOrg | null
  }
  profile: {
    databases: string[]         // human-readable labels
    totalRecords: number        // approx, from dbDetails sizes
    processors: string[]
    storage: string[]
    hasConsent: string | null   // raw enum, e.g. 'yes'|'no'|'no_website'
    rightsWorkflow: string | null
    securityOwner: string | null
    cameraOwner: string | null
    hasInternalDpo: 'yes' | 'no' | 'not_sure' | null
    internalDpoName: string | null
  }
  documents: ComplianceContextDocument[]
  compliance: {
    score: number | null              // null when no data (cold start)
    securityLevel: 'basic'|'medium'|'high' | null
    openCriticalTasks: { id: string; title: string; status: TaskStatus; priority: string }[]
    autoResolvedTitles: string[]
    hasAnyData: boolean               // false → cold-start, don't give specifics
  }
  incidents: { open: number; recentTitles: string[] }
  dpias: { count: number; openHighRisk: number }
  subscription: { tier: string | null; isPaid: boolean }
}

export async function buildComplianceContext(
  orgId: string,
  supabase: SupabaseClient,
): Promise<ComplianceContext> {
  const [
    { data: org },
    { data: profile },
    { data: docs },
    { data: subs },
    { data: incidents },
    { data: dpias },
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('organization_profiles').select('profile_data').eq('org_id', orgId).maybeSingle(),
    supabase.from('documents').select('type, status, updated_at, created_at').eq('org_id', orgId),
    supabase.from('subscriptions').select('tier, status').eq('org_id', orgId).in('status', ['active', 'past_due']).maybeSingle(),
    supabase.from('security_incidents').select('id, title, status, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
    supabase.from('dpia_assessments').select('id, risk_level').eq('org_id', orgId),
  ])

  const v3 = profile?.profile_data?.v3Answers || {}
  const internalDpo = profile?.profile_data?.internalDpo || null
  const docsList = docs || []
  const incidentsList = incidents || []
  const dpiaList = dpias || []

  // Resolve documents with age, dedup by type (latest wins on (type, updated_at)).
  const byType = new Map<string, ComplianceContextDocument>()
  for (const d of docsList) {
    const refTs = new Date(d.updated_at || d.created_at).getTime()
    const ageMonths = isFinite(refTs)
      ? (Date.now() - refTs) / (1000 * 60 * 60 * 24 * 30)
      : null
    const existing = byType.get(d.type)
    if (!existing || (ageMonths != null && existing.ageMonths != null && ageMonths < existing.ageMonths)) {
      byType.set(d.type, { type: d.type, status: d.status, ageMonths })
    }
  }
  const documents = Array.from(byType.values())

  // Approx record count from onboarding answers.
  const dbDetails = v3.dbDetails || {}
  const totalRecords = Object.values(dbDetails).reduce<number>(
    (sum, d: any) => sum + (SIZE_NUMS[d?.size] || 0), 0,
  )

  // Cold-start detection: no docs, no review history, no answers worth scoring.
  // Score will still compute but it's not meaningful — flag it for the prompt.
  const hasAnyData =
    docsList.length > 0 ||
    Object.keys(v3).length > 0 ||
    incidentsList.length > 0 ||
    dpiaList.length > 0

  let score: number | null = null
  let securityLevel: 'basic'|'medium'|'high' | null = null
  let openCriticalTasks: ComplianceContext['compliance']['openCriticalTasks'] = []
  let autoResolvedTitles: string[] = []

  if (hasAnyData) {
    const summary = deriveComplianceActions(
      v3,
      docsList,
      incidentsList,
      profile?.profile_data?.actionOverrides || {},
      org?.tier,
    )
    score = summary.score
    securityLevel = summary.securityLevel
    const openStatuses: TaskStatus[] = ['needs_generation', 'needs_enrichment', 'needs_action', 'doc_pending_review']
    openCriticalTasks = (summary.tasks || [])
      .filter((t: ComplianceTask) => openStatuses.includes(t.status) && (t.priority === 'critical' || t.priority === 'high'))
      .slice(0, 6)
      .map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority }))
    autoResolvedTitles = (summary.tasks || [])
      .filter((t: ComplianceTask) => t.status === 'auto_resolved' || t.status === 'doc_approved' || t.status === 'completed')
      .slice(0, 8)
      .map(t => t.title)
  }

  const openIncidents = incidentsList.filter(i => !['resolved', 'closed'].includes(i.status))

  const databasesRaw: string[] = [...(v3.databases || []), ...(v3.customDatabases || [])]
  const databases = databasesRaw.map(d => DB_LABELS[d] || d)

  return {
    org: {
      id: orgId,
      name: org?.name || '',
      industry: org ? (INDUSTRY_LABELS[v3.industry || ''] || v3.industry || null) : null,
      employeeCount: v3.employeeCount || v3.orgSize || v3.access || null,
      tier: org?.tier || null,
      onboardingCompleted: org?.onboarding_completed !== false,
      dpoConflictStatus: org?.dpo_conflict_status || null,
      dpoRoleInOrg: (org?.dpo_role_in_org as DpoRoleInOrg) || null,
    },
    profile: {
      databases,
      totalRecords,
      processors: [...(v3.processors || []), ...(v3.customProcessors || [])],
      storage: [...(v3.storage || []), ...(v3.customStorage || [])],
      hasConsent: v3.hasConsent || null,
      rightsWorkflow: v3.rightsWorkflow || null,
      securityOwner: v3.securityOwnerName || v3.securityOwner || null,
      cameraOwner: v3.cameraOwnerName || v3.cameraOwner || null,
      hasInternalDpo: v3.hasDpo || null,
      internalDpoName: internalDpo?.name || v3.dpoName || null,
    },
    documents,
    compliance: {
      score,
      securityLevel,
      openCriticalTasks,
      autoResolvedTitles,
      hasAnyData,
    },
    incidents: {
      open: openIncidents.length,
      recentTitles: openIncidents.slice(0, 3).map(i => i.title || 'אירוע ללא כותרת'),
    },
    dpias: {
      count: dpiaList.length,
      openHighRisk: dpiaList.filter((d: any) => d.risk_level === 'high' || d.risk_level === 'critical').length,
    },
    subscription: {
      tier: subs?.tier || null,
      isPaid: !!subs,
    },
  }
}

// Render the context as a compact Hebrew block to inject before the finding.
// Targets ~500-700 tokens. Skips empty fields so cold-start orgs get a short block.
export function renderContextForPrompt(ctx: ComplianceContext): string {
  const lines: string[] = []

  // Cold-start banner — the prompt's rule 5 references this.
  if (!ctx.compliance.hasAnyData) {
    lines.push('סטטוס: ארגון חדש — טרם הוזנו נתונים. אין מספיק מידע למתן המלצות ספציפיות.')
    lines.push('')
  }

  lines.push('פרופיל הארגון:')
  if (ctx.org.name) lines.push(`- שם: ${ctx.org.name}`)
  if (ctx.org.industry) lines.push(`- תחום: ${ctx.org.industry}`)
  if (ctx.org.employeeCount) lines.push(`- גודל / היקף גישה: ${ctx.org.employeeCount}`)
  const tierLabel = ctx.subscription.isPaid
    ? `${ctx.subscription.tier === 'basic' ? 'בסיסי (ניהול עצמי — אתם הממונה)' : (ctx.subscription.tier || 'מומלצת')} — מנוי פעיל`
    : 'ללא מנוי פעיל (טרם שולם)'
  lines.push(`- מסלול: ${tierLabel}`)
  if (ctx.compliance.score != null) {
    lines.push(`- ציון ציות נוכחי: ${ctx.compliance.score}/100${ctx.compliance.securityLevel ? ` (רמת אבטחה: ${ctx.compliance.securityLevel})` : ''}`)
  }
  if (ctx.profile.databases.length > 0) {
    lines.push(`- מאגרים: ${ctx.profile.databases.join(', ')}${ctx.profile.totalRecords ? ` (~${ctx.profile.totalRecords.toLocaleString('he-IL')} רשומות)` : ''}`)
  }
  if (ctx.profile.storage.length > 0) lines.push(`- מערכות אחסון: ${ctx.profile.storage.join(', ')}`)
  if (ctx.profile.processors.length > 0) lines.push(`- ספקי עיבוד: ${ctx.profile.processors.length} (${ctx.profile.processors.slice(0, 3).join(', ')}${ctx.profile.processors.length > 3 ? '…' : ''})`)
  if (!ctx.org.onboardingCompleted) lines.push('- הרשמה: לא הושלמה')

  // DPO state — critical for tier-aware and conflict-aware answers.
  lines.push('')
  lines.push('סטטוס ממונה:')
  if (ctx.profile.hasInternalDpo === 'yes') {
    lines.push(`- ממונה פנימי: ${ctx.profile.internalDpoName || 'לא צוין שם'}`)
    if (ctx.org.dpoRoleInOrg) {
      lines.push(`- תפקיד נוסף: ${DPO_ROLE_LABELS[ctx.org.dpoRoleInOrg] || ctx.org.dpoRoleInOrg}`)
    }
  } else if (ctx.subscription.tier === 'basic' && ctx.subscription.isPaid) {
    lines.push('- מסלול בסיסי: המשתמש משמש כממונה בעצמו')
  } else if (ctx.subscription.isPaid && ctx.subscription.tier !== 'basic') {
    lines.push('- מסלול מומלצת/פרימיום: עו"ד דנה כהן משמשת כממונה')
  } else {
    lines.push('- טרם נקבע')
  }
  if (ctx.org.dpoConflictStatus) {
    const conflictLabel: Record<string, string> = {
      not_assessed: 'לא הוערך',
      conflict_unresolved: 'ניגוד עניינים פתוח — דורש החלטה',
      conflict_acknowledged: 'ניגוד עניינים מוכר — אושר רשמית',
      no_conflict: 'אין ניגוד עניינים',
      resolved_by_reassignment: 'נפתר בהקצאה מחדש פנימית',
      resolved_by_external_dpo: 'נפתר במינוי ממונה חיצוני',
    }
    lines.push(`- ניגוד עניינים: ${conflictLabel[ctx.org.dpoConflictStatus] || ctx.org.dpoConflictStatus}`)
  }

  // Documents block — only show what exists; missing docs are inferred from openCriticalTasks.
  if (ctx.documents.length > 0) {
    lines.push('')
    lines.push('מסמכי ציות בפועל:')
    for (const d of ctx.documents) {
      const label = DOC_TYPE_LABELS[d.type] || d.type
      const status = STATUS_LABELS_HE[d.status] || d.status
      const age = d.ageMonths != null ? ` (עודכן לפני ${Math.round(d.ageMonths)} חודשים)` : ''
      lines.push(`- ${label}: ${status}${age}`)
    }
  }

  // Process state.
  lines.push('')
  lines.push('תהליכים:')
  lines.push(`- מנגנון הסכמה באתר: ${ctx.profile.hasConsent ? (CONSENT_LABELS[ctx.profile.hasConsent] || ctx.profile.hasConsent) : 'לא ידוע'}`)
  lines.push(`- תהליך בקשות זכויות: ${ctx.profile.rightsWorkflow ? (RIGHTS_WORKFLOW_LABELS[ctx.profile.rightsWorkflow] || ctx.profile.rightsWorkflow) : 'לא ידוע'}`)
  if (ctx.profile.securityOwner) lines.push(`- אחראי אבטחת מידע: ${ctx.profile.securityOwner}`)
  if (ctx.profile.cameraOwner) lines.push(`- אחראי מצלמות: ${ctx.profile.cameraOwner}`)

  // Active items.
  lines.push('')
  lines.push('מצב פעיל:')
  lines.push(`- אירועי אבטחה פתוחים: ${ctx.incidents.open}${ctx.incidents.recentTitles.length > 0 ? ` (${ctx.incidents.recentTitles.join('; ')})` : ''}`)
  lines.push(`- תסקירי השפעה (DPIA): ${ctx.dpias.count}${ctx.dpias.openHighRisk > 0 ? `, מתוכם ${ctx.dpias.openHighRisk} ברמת סיכון גבוהה` : ''}`)

  // Tasks the engine flagged as open. Helps the AI cite "related" gaps.
  if (ctx.compliance.openCriticalTasks.length > 0) {
    lines.push('')
    lines.push('משימות פתוחות בעדיפות גבוהה (לפי מנוע הציות):')
    for (const t of ctx.compliance.openCriticalTasks) {
      lines.push(`- ${t.title} (עדיפות: ${t.priority})`)
    }
  }

  if (ctx.compliance.autoResolvedTitles.length > 0) {
    lines.push('')
    lines.push('כבר בוצע / נפתר אוטומטית (אל תציעו לבצע שוב):')
    for (const t of ctx.compliance.autoResolvedTitles) {
      lines.push(`- ${t}`)
    }
  }

  return lines.join('\n')
}

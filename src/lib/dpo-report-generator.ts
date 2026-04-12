import { SupabaseClient } from '@supabase/supabase-js'

export interface Period {
  start: Date
  end: Date
}

export function getCurrentQuarterPeriod(): Period {
  const now = new Date()
  const month = now.getMonth()
  const quarter = Math.floor(month / 3)
  const start = new Date(now.getFullYear(), quarter * 3, 1)
  const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59)
  return { start, end }
}

export function getPeriodLabel(endDate: Date): string {
  const month = endDate.getMonth() + 1
  const year = endDate.getFullYear()
  const quarter = Math.ceil(month / 3)
  return `Q${quarter}-${year}`
}

function formatPeriod(period: Period): string {
  return `${period.start.toLocaleDateString('he-IL')} – ${period.end.toLocaleDateString('he-IL')}`
}

export async function generateDpoReportDraft(orgId: string, supabaseAdmin: SupabaseClient, period: Period) {
  const startIso = period.start.toISOString()
  const endIso = period.end.toISOString()

  const [orgRes, incidentsRes, reviewsRes, dpiasRes, rightsRes, docsRes] = await Promise.all([
    supabaseAdmin.from('organizations').select('*').eq('id', orgId).single(),
    supabaseAdmin.from('security_incidents').select('*').eq('org_id', orgId).gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('compliance_reviews').select('*').eq('org_id', orgId).gte('created_at', startIso).lte('created_at', endIso).order('created_at', { ascending: true }),
    supabaseAdmin.from('dpia_assessments').select('*').eq('org_id', orgId),
    supabaseAdmin.from('data_subject_requests').select('*').eq('org_id', orgId).gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('documents').select('*').eq('org_id', orgId).gte('updated_at', startIso).lte('updated_at', endIso),
  ])

  const org = orgRes.data
  const reviews = reviewsRes.data || []
  const scoreStart = reviews[0]?.score_after ?? null
  const scoreEnd = reviews[reviews.length - 1]?.score_after ?? scoreStart
  const incidentsList = incidentsRes.data || []
  const dpiaList = dpiasRes.data || []
  const dpiaHighRisk = dpiaList.filter((d: any) => d.risk_level === 'high' || d.risk_level === 'critical').length
  const rightsList = rightsRes.data || []
  const docsList = docsRes.data || []

  const latestReview = reviews[reviews.length - 1]
  const findings = Array.isArray(latestReview?.findings) ? latestReview.findings : []
  const findingsOpen = findings.filter((f: any) => f.severity === 'critical' || f.severity === 'warning').length
  const findingsResolved = findings.filter((f: any) => f.severity === 'ok').length

  const trend = scoreEnd != null && scoreStart != null
    ? (scoreEnd > scoreStart ? 'שיפור' : scoreEnd < scoreStart ? 'ירידה' : 'יציבות')
    : 'אין נתונים מספיקים'

  const summary = `במהלך התקופה ${formatPeriod(period)}, ${org?.name || 'הארגון'} הראה ${trend} בציון הציות.

ציון פתיחה: ${scoreStart ?? 'לא נמדד'}/100
ציון סיום: ${scoreEnd ?? 'לא נמדד'}/100

דגשים מרכזיים:
${incidentsList.length > 0 ? `• ${incidentsList.length} אירועי אבטחה דווחו וטופלו` : '• לא דווחו אירועי אבטחה בתקופה זו'}
${dpiaList.length > 0 ? `• ${dpiaList.length} תסקירי השפעה על פרטיות פעילים${dpiaHighRisk > 0 ? `, מתוכם ${dpiaHighRisk} ברמת סיכון גבוהה` : ''}` : '• טרם בוצעו תסקירי השפעה על פרטיות'}
${rightsList.length > 0 ? `• ${rightsList.length} בקשות נושאי מידע טופלו` : ''}
${docsList.length > 0 ? `• ${docsList.length} מסמכי רגולציה עודכנו` : ''}

המלצות להמשך — ראו פרק ההמלצות בהמשך הדוח.`

  const recommendations: string[] = []
  if (dpiaHighRisk > 0) recommendations.push(`לטפל ב-${dpiaHighRisk} סיכונים בעדיפות גבוהה שזוהו בתסקירי ההשפעה`)
  if (incidentsList.length > 2) recommendations.push('לבחון חיזוק בקרות אבטחת מידע — מספר האירועים גבוה מהממוצע')
  if (scoreEnd != null && scoreEnd < 60) recommendations.push('ציון הציות מתחת לסף המומלץ — נדרשת תוכנית פעולה מואצת')
  if (rightsList.length === 0) recommendations.push('לוודא שתהליך טיפול בבקשות נושאי מידע מתועד וזמין')
  if (findingsOpen > 5) recommendations.push(`לטפל ב-${findingsOpen} ממצאי ציות פתוחים`)
  if (recommendations.length === 0) recommendations.push('להמשיך בתחזוקה השוטפת ובסקירה רבעונית')

  return {
    period_start: period.start.toISOString().split('T')[0],
    period_end: period.end.toISOString().split('T')[0],
    report_period: getPeriodLabel(period.end),
    executive_summary: summary,
    compliance_score_start: scoreStart,
    compliance_score_end: scoreEnd,
    incidents_count: incidentsList.length,
    incidents_summary: incidentsList.map((i: any) => ({ title: i.title, severity: i.severity, status: i.status })),
    findings_open: findingsOpen,
    findings_resolved: findingsResolved,
    dpia_count: dpiaList.length,
    dpia_high_risk: dpiaHighRisk,
    rights_requests_count: rightsList.length,
    documents_updated: docsList.length,
    recommendations,
  }
}

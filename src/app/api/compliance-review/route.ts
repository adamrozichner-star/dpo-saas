import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveComplianceActions } from '@/lib/compliance-engine'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Finding {
  id: string
  area: string
  severity: 'ok' | 'warning' | 'critical'
  title: string
  description: string
  recommendation: string
}

function generateFindings(docs: any[], incidents: any[], org: any): Finding[] {
  const findings: Finding[] = []
  const docTypes = docs.map(d => d.type)
  const approvedStatuses = ['active', 'approved']
  const pendingStatuses = ['draft', 'pending_review', 'pending_approval']

  if (org?.onboarding_completed === false) {
    findings.push({ id: 'incomplete-onboarding', area: 'פרופיל', severity: 'warning', title: 'תהליך ההרשמה לא הושלם', description: 'חלק מהנתונים חסרים — ייתכן שמסמכים לא ישקפו את המצב המלא.', recommendation: 'השלימו את תהליך ההרשמה דרך לוח הבקרה.' })
  }

  const pp = docs.find(d => d.type === 'privacy_policy')
  if (!pp) {
    findings.push({ id: 'no-privacy-policy', area: 'מסמכים', severity: 'critical', title: 'חסרה מדיניות פרטיות', description: 'לא נמצאה מדיניות פרטיות בארגון. זהו מסמך חובה לפי תיקון 13.', recommendation: 'יש ליצור מדיניות פרטיות מותאמת לארגון דרך מערכת הצ׳את.' })
  } else if (pendingStatuses.includes(pp.status)) {
    findings.push({ id: 'pending-privacy-policy', area: 'מסמכים', severity: 'warning', title: 'מסמך קיים אך טרם אושר', description: 'מדיניות הפרטיות קיימת אך טרם אושרה.', recommendation: 'יש לאשר את מדיניות הפרטיות.' })
  } else {
    const ageMonths = (Date.now() - new Date(pp.updated_at || pp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    findings.push(ageMonths > 12
      ? { id: 'stale-privacy-policy', area: 'מסמכים', severity: 'warning', title: 'מדיניות פרטיות לא עודכנה מעל שנה', description: 'המדיניות לא עודכנה מעל 12 חודשים.', recommendation: 'סקרו ועדכנו את מדיניות הפרטיות.' }
      : { id: 'privacy-policy-ok', area: 'מסמכים', severity: 'ok', title: 'מדיניות פרטיות תקינה', description: 'מדיניות הפרטיות קיימת ועדכנית.', recommendation: '' }
    )
  }

  const secDoc = docs.find(d => d.type === 'security_policy' || d.type === 'security_procedures')
  if (!secDoc) {
    findings.push({ id: 'no-security-policy', area: 'אבטחה', severity: 'critical', title: 'חסר נוהל אבטחת מידע', description: 'לא נמצא נוהל אבטחת מידע. נדרש לפי תקנות אבטחת מידע.', recommendation: 'יש ליצור נוהל אבטחת מידע מותאם לארגון.' })
  } else if (pendingStatuses.includes(secDoc.status)) {
    findings.push({ id: 'pending-security-policy', area: 'אבטחה', severity: 'warning', title: 'מסמך קיים אך טרם אושר', description: 'נוהל אבטחת מידע קיים אך טרם אושר.', recommendation: 'יש לאשר את נוהל אבטחת המידע.' })
  } else {
    findings.push({ id: 'security-policy-ok', area: 'אבטחה', severity: 'ok', title: 'נוהל אבטחת מידע קיים', description: 'נמצא נוהל אבטחת מידע בארגון.', recommendation: '' })
  }

  const dpoDoc = docs.find(d => d.type === 'dpo_appointment')
  if (!dpoDoc) {
    findings.push({ id: 'no-dpo-appointment', area: 'ממונה', severity: 'warning', title: 'חסר כתב מינוי DPO', description: 'לא נמצא כתב מינוי רשמי לממונה הגנת פרטיות.', recommendation: 'יש ליצור כתב מינוי רשמי לממונה.' })
  } else if (pendingStatuses.includes(dpoDoc.status)) {
    findings.push({ id: 'pending-dpo-appointment', area: 'ממונה', severity: 'warning', title: 'מסמך קיים אך טרם אושר', description: 'כתב מינוי DPO קיים אך טרם אושר.', recommendation: 'יש לאשר את כתב המינוי.' })
  } else {
    findings.push({ id: 'dpo-appointment-ok', area: 'ממונה', severity: 'ok', title: 'כתב מינוי DPO קיים', description: 'כתב מינוי רשמי לממונה נמצא במערכת.', recommendation: '' })
  }

  const dbDoc = docs.find(d => d.type === 'database_registration' || d.type === 'database_definition')
  if (!dbDoc) {
    findings.push({ id: 'no-db-registration', area: 'מאגרים', severity: 'warning', title: 'חסר רישום מאגרי מידע', description: 'לא נמצא מסמך רישום מאגרי מידע.', recommendation: 'יש לרשום את מאגרי המידע של הארגון.' })
  } else if (pendingStatuses.includes(dbDoc.status)) {
    findings.push({ id: 'pending-db-registration', area: 'מאגרים', severity: 'warning', title: 'מסמך קיים אך טרם אושר', description: 'מסמך רישום מאגרים קיים אך טרם אושר.', recommendation: 'יש לאשר את מסמך רישום המאגרים.' })
  } else {
    findings.push({ id: 'db-registration-ok', area: 'מאגרים', severity: 'ok', title: 'רישום מאגרים תקין', description: 'מאגרי המידע רשומים במערכת.', recommendation: '' })
  }

  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  if (openIncidents.length > 0) {
    findings.push({ id: 'open-incidents', area: 'אירועים', severity: openIncidents.length > 2 ? 'critical' : 'warning', title: `${openIncidents.length} אירועי אבטחה פתוחים`, description: `ישנם ${openIncidents.length} אירועי אבטחה שטרם טופלו.`, recommendation: 'יש לטפל באירועים הפתוחים בהקדם ולתעד את הטיפול.' })
  } else {
    findings.push({ id: 'incidents-ok', area: 'אירועים', severity: 'ok', title: 'אין אירועי אבטחה פתוחים', description: 'כל אירועי האבטחה טופלו.', recommendation: '' })
  }

  if (!docTypes.includes('ropa')) {
    findings.push({ id: 'no-ropa', area: 'תיעוד', severity: 'warning', title: 'חסרה מפת עיבוד (ROPA)', description: 'לא נמצאה מפת פעילויות עיבוד מידע.', recommendation: 'יש ליצור מפת ROPA לתיעוד כלל פעילויות העיבוד.' })
  }

  return findings
}

async function authenticateAndGetOrg(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
  if (!userData?.org_id) return { error: NextResponse.json({ error: 'Organization not found' }, { status: 404 }) }

  return { orgId: userData.org_id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAndGetOrg(request)
    if ('error' in auth && auth.error) return auth.error
    const { orgId } = auth as { orgId: string }

    const { data: review } = await supabaseAdmin
      .from('compliance_reviews')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!review) {
      return NextResponse.json({ findings: [], score: null })
    }

    return NextResponse.json({
      findings: review.findings,
      score: review.score_after,
      summary: review.recommendations,
      reviewedAt: review.created_at,
    })
  } catch (error) {
    console.error('Compliance review GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAndGetOrg(request)
    if ('error' in auth && auth.error) return auth.error
    const { orgId } = auth as { orgId: string }

    const [{ data: docs }, { data: incidents }, { data: profileData }] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('org_id', orgId),
      supabaseAdmin.from('security_incidents').select('*').eq('org_id', orgId),
      supabaseAdmin.from('organization_profiles').select('profile_data').eq('org_id', orgId).maybeSingle(),
    ])

    // Generate findings (review-specific detail list)
    const findings = generateFindings(docs || [], incidents || [], null)

    // Use the same scoring logic as the dashboard
    const v3Answers = profileData?.profile_data?.v3Answers || {}
    const actionOverrides = profileData?.profile_data?.actionOverrides || {}
    const complianceSummary = deriveComplianceActions(v3Answers, docs || [], incidents || [], actionOverrides)
    const score = complianceSummary.score

    const criticalCount = findings.filter(f => f.severity === 'critical').length
    const warningCount = findings.filter(f => f.severity === 'warning').length
    const okCount = findings.filter(f => f.severity === 'ok').length
    const summary = { critical: criticalCount, warning: warningCount, ok: okCount }
    const reviewedAt = new Date().toISOString()

    // Persist review to DB
    await supabaseAdmin.from('compliance_reviews').insert({
      org_id: orgId,
      review_type: 'automated',
      status: 'completed',
      findings: findings,
      recommendations: summary,
      score_after: score,
    })

    return NextResponse.json({
      score,
      findings,
      summary,
      reviewedAt,
    })
  } catch (error) {
    console.error('Compliance review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

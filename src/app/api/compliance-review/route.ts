import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Privacy policy check
  if (!docTypes.includes('privacy_policy')) {
    findings.push({
      id: 'no-privacy-policy',
      area: 'מסמכים',
      severity: 'critical',
      title: 'חסרה מדיניות פרטיות',
      description: 'לא נמצאה מדיניות פרטיות בארגון. זהו מסמך חובה לפי תיקון 13.',
      recommendation: 'יש ליצור מדיניות פרטיות מותאמת לארגון דרך מערכת הצ׳אט.',
    })
  } else {
    const pp = docs.find(d => d.type === 'privacy_policy')
    const ageMonths = (Date.now() - new Date(pp.updated_at || pp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (ageMonths > 12) {
      findings.push({
        id: 'stale-privacy-policy',
        area: 'מסמכים',
        severity: 'warning',
        title: 'מדיניות פרטיות לא עודכנה מעל שנה',
        description: 'המדיניות לא עודכנה מעל 12 חודשים. מומלץ לעדכן בהתאם לשינויים בפעילות.',
        recommendation: 'סקרו ועדכנו את מדיניות הפרטיות דרך הצ׳אט.',
      })
    } else {
      findings.push({
        id: 'privacy-policy-ok',
        area: 'מסמכים',
        severity: 'ok',
        title: 'מדיניות פרטיות תקינה',
        description: 'מדיניות הפרטיות קיימת ועדכנית.',
        recommendation: '',
      })
    }
  }

  // Security policy check
  if (!docTypes.includes('security_policy') && !docTypes.includes('security_procedures')) {
    findings.push({
      id: 'no-security-policy',
      area: 'אבטחה',
      severity: 'critical',
      title: 'חסר נוהל אבטחת מידע',
      description: 'לא נמצא נוהל אבטחת מידע. נדרש לפי תקנות אבטחת מידע.',
      recommendation: 'יש ליצור נוהל אבטחת מידע מותאם לארגון.',
    })
  } else {
    findings.push({
      id: 'security-policy-ok',
      area: 'אבטחה',
      severity: 'ok',
      title: 'נוהל אבטחת מידע קיים',
      description: 'נמצא נוהל אבטחת מידע בארגון.',
      recommendation: '',
    })
  }

  // DPO appointment check
  if (!docTypes.includes('dpo_appointment')) {
    findings.push({
      id: 'no-dpo-appointment',
      area: 'ממונה',
      severity: 'warning',
      title: 'חסר כתב מינוי DPO',
      description: 'לא נמצא כתב מינוי רשמי לממונה הגנת פרטיות.',
      recommendation: 'יש ליצור כתב מינוי רשמי לממונה.',
    })
  } else {
    findings.push({
      id: 'dpo-appointment-ok',
      area: 'ממונה',
      severity: 'ok',
      title: 'כתב מינוי DPO קיים',
      description: 'כתב מינוי רשמי לממונה נמצא במערכת.',
      recommendation: '',
    })
  }

  // Database registration check
  if (!docTypes.includes('database_registration') && !docTypes.includes('database_definition')) {
    findings.push({
      id: 'no-db-registration',
      area: 'מאגרים',
      severity: 'warning',
      title: 'חסר רישום מאגרי מידע',
      description: 'לא נמצא מסמך רישום מאגרי מידע.',
      recommendation: 'יש לרשום את מאגרי המידע של הארגון.',
    })
  } else {
    findings.push({
      id: 'db-registration-ok',
      area: 'מאגרים',
      severity: 'ok',
      title: 'רישום מאגרים תקין',
      description: 'מאגרי המידע רשומים במערכת.',
      recommendation: '',
    })
  }

  // Open incidents check
  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  if (openIncidents.length > 0) {
    findings.push({
      id: 'open-incidents',
      area: 'אירועים',
      severity: openIncidents.length > 2 ? 'critical' : 'warning',
      title: `${openIncidents.length} אירועי אבטחה פתוחים`,
      description: `ישנם ${openIncidents.length} אירועי אבטחה שטרם טופלו.`,
      recommendation: 'יש לטפל באירועים הפתוחים בהקדם ולתעד את הטיפול.',
    })
  } else {
    findings.push({
      id: 'incidents-ok',
      area: 'אירועים',
      severity: 'ok',
      title: 'אין אירועי אבטחה פתוחים',
      description: 'כל אירועי האבטחה טופלו.',
      recommendation: '',
    })
  }

  // ROPA check
  if (!docTypes.includes('ropa')) {
    findings.push({
      id: 'no-ropa',
      area: 'תיעוד',
      severity: 'warning',
      title: 'חסרה מפת עיבוד (ROPA)',
      description: 'לא נמצאה מפת פעילויות עיבוד מידע.',
      recommendation: 'יש ליצור מפת ROPA לתיעוד כלל פעילויות העיבוד.',
    })
  }

  return findings
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const orgId = userData.org_id

    const [{ data: docs }, { data: incidents }, { data: org }] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('org_id', orgId),
      supabaseAdmin.from('security_incidents').select('*').eq('org_id', orgId),
      supabaseAdmin.from('organizations').select('*').eq('id', orgId).single(),
    ])

    const findings = generateFindings(docs || [], incidents || [], org)

    const criticalCount = findings.filter(f => f.severity === 'critical').length
    const warningCount = findings.filter(f => f.severity === 'warning').length
    const okCount = findings.filter(f => f.severity === 'ok').length
    const total = findings.length
    const score = total > 0 ? Math.round((okCount / total) * 100) : 0

    return NextResponse.json({
      score,
      findings,
      summary: { critical: criticalCount, warning: warningCount, ok: okCount },
      reviewedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Compliance review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

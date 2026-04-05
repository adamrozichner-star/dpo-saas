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

function generateFindings(docs: any[], incidents: any[]): Finding[] {
  const findings: Finding[] = []
  const docTypes = docs.map(d => d.type)

  if (!docTypes.includes('privacy_policy')) {
    findings.push({ id: 'no-privacy-policy', area: '\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', severity: 'critical', title: '\u05D7\u05E1\u05E8\u05D4 \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA', description: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4 \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D1\u05D0\u05E8\u05D2\u05D5\u05DF. \u05D6\u05D4\u05D5 \u05DE\u05E1\u05DE\u05DA \u05D7\u05D5\u05D1\u05D4 \u05DC\u05E4\u05D9 \u05EA\u05D9\u05E7\u05D5\u05DF 13.', recommendation: '\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05DE\u05D5\u05EA\u05D0\u05DE\u05EA \u05DC\u05D0\u05E8\u05D2\u05D5\u05DF \u05D3\u05E8\u05DA \u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05E6\u05F3\u05D0\u05D8.' })
  } else {
    const pp = docs.find(d => d.type === 'privacy_policy')
    const ageMonths = (Date.now() - new Date(pp.updated_at || pp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    findings.push(ageMonths > 12
      ? { id: 'stale-privacy-policy', area: '\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', severity: 'warning', title: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05DC\u05D0 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05DE\u05E2\u05DC \u05E9\u05E0\u05D4', description: '\u05D4\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05DC\u05D0 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05DE\u05E2\u05DC 12 \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD.', recommendation: '\u05E1\u05E7\u05E8\u05D5 \u05D5\u05E2\u05D3\u05DB\u05E0\u05D5 \u05D0\u05EA \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA.' }
      : { id: 'privacy-policy-ok', area: '\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', severity: 'ok', title: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05EA\u05E7\u05D9\u05E0\u05D4', description: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05E7\u05D9\u05D9\u05DE\u05EA \u05D5\u05E2\u05D3\u05DB\u05E0\u05D9\u05EA.', recommendation: '' }
    )
  }

  if (!docTypes.includes('security_policy') && !docTypes.includes('security_procedures')) {
    findings.push({ id: 'no-security-policy', area: '\u05D0\u05D1\u05D8\u05D7\u05D4', severity: 'critical', title: '\u05D7\u05E1\u05E8 \u05E0\u05D5\u05D4\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2', description: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05E0\u05D5\u05D4\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2. \u05E0\u05D3\u05E8\u05E9 \u05DC\u05E4\u05D9 \u05EA\u05E7\u05E0\u05D5\u05EA \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2.', recommendation: '\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05E0\u05D5\u05D4\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2 \u05DE\u05D5\u05EA\u05D0\u05DD \u05DC\u05D0\u05E8\u05D2\u05D5\u05DF.' })
  } else {
    findings.push({ id: 'security-policy-ok', area: '\u05D0\u05D1\u05D8\u05D7\u05D4', severity: 'ok', title: '\u05E0\u05D5\u05D4\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2 \u05E7\u05D9\u05D9\u05DD', description: '\u05E0\u05DE\u05E6\u05D0 \u05E0\u05D5\u05D4\u05DC \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2 \u05D1\u05D0\u05E8\u05D2\u05D5\u05DF.', recommendation: '' })
  }

  if (!docTypes.includes('dpo_appointment')) {
    findings.push({ id: 'no-dpo-appointment', area: '\u05DE\u05DE\u05D5\u05E0\u05D4', severity: 'warning', title: '\u05D7\u05E1\u05E8 \u05DB\u05EA\u05D1 \u05DE\u05D9\u05E0\u05D5\u05D9 DPO', description: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DB\u05EA\u05D1 \u05DE\u05D9\u05E0\u05D5\u05D9 \u05E8\u05E9\u05DE\u05D9 \u05DC\u05DE\u05DE\u05D5\u05E0\u05D4 \u05D4\u05D2\u05E0\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA.', recommendation: '\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05DB\u05EA\u05D1 \u05DE\u05D9\u05E0\u05D5\u05D9 \u05E8\u05E9\u05DE\u05D9 \u05DC\u05DE\u05DE\u05D5\u05E0\u05D4.' })
  } else {
    findings.push({ id: 'dpo-appointment-ok', area: '\u05DE\u05DE\u05D5\u05E0\u05D4', severity: 'ok', title: '\u05DB\u05EA\u05D1 \u05DE\u05D9\u05E0\u05D5\u05D9 DPO \u05E7\u05D9\u05D9\u05DD', description: '\u05DB\u05EA\u05D1 \u05DE\u05D9\u05E0\u05D5\u05D9 \u05E8\u05E9\u05DE\u05D9 \u05DC\u05DE\u05DE\u05D5\u05E0\u05D4 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA.', recommendation: '' })
  }

  if (!docTypes.includes('database_registration') && !docTypes.includes('database_definition')) {
    findings.push({ id: 'no-db-registration', area: '\u05DE\u05D0\u05D2\u05E8\u05D9\u05DD', severity: 'warning', title: '\u05D7\u05E1\u05E8 \u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05D0\u05D2\u05E8\u05D9 \u05DE\u05D9\u05D3\u05E2', description: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DE\u05E1\u05DE\u05DA \u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05D0\u05D2\u05E8\u05D9 \u05DE\u05D9\u05D3\u05E2.', recommendation: '\u05D9\u05E9 \u05DC\u05E8\u05E9\u05D5\u05DD \u05D0\u05EA \u05DE\u05D0\u05D2\u05E8\u05D9 \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05DC \u05D4\u05D0\u05E8\u05D2\u05D5\u05DF.' })
  } else {
    findings.push({ id: 'db-registration-ok', area: '\u05DE\u05D0\u05D2\u05E8\u05D9\u05DD', severity: 'ok', title: '\u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05D0\u05D2\u05E8\u05D9\u05DD \u05EA\u05E7\u05D9\u05DF', description: '\u05DE\u05D0\u05D2\u05E8\u05D9 \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E8\u05E9\u05D5\u05DE\u05D9\u05DD \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA.', recommendation: '' })
  }

  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  if (openIncidents.length > 0) {
    findings.push({ id: 'open-incidents', area: '\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD', severity: openIncidents.length > 2 ? 'critical' : 'warning', title: `${openIncidents.length} \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D0\u05D1\u05D8\u05D7\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D9\u05DD`, description: `\u05D9\u05E9\u05E0\u05DD ${openIncidents.length} \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D0\u05D1\u05D8\u05D7\u05D4 \u05E9\u05D8\u05E8\u05DD \u05D8\u05D5\u05E4\u05DC\u05D5.`, recommendation: '\u05D9\u05E9 \u05DC\u05D8\u05E4\u05DC \u05D1\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05D4\u05E4\u05EA\u05D5\u05D7\u05D9\u05DD \u05D1\u05D4\u05E7\u05D3\u05DD \u05D5\u05DC\u05EA\u05E2\u05D3 \u05D0\u05EA \u05D4\u05D8\u05D9\u05E4\u05D5\u05DC.' })
  } else {
    findings.push({ id: 'incidents-ok', area: '\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD', severity: 'ok', title: '\u05D0\u05D9\u05DF \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D0\u05D1\u05D8\u05D7\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D9\u05DD', description: '\u05DB\u05DC \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D4\u05D0\u05D1\u05D8\u05D7\u05D4 \u05D8\u05D5\u05E4\u05DC\u05D5.', recommendation: '' })
  }

  if (!docTypes.includes('ropa')) {
    findings.push({ id: 'no-ropa', area: '\u05EA\u05D9\u05E2\u05D5\u05D3', severity: 'warning', title: '\u05D7\u05E1\u05E8\u05D4 \u05DE\u05E4\u05EA \u05E2\u05D9\u05D1\u05D5\u05D3 (ROPA)', description: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4 \u05DE\u05E4\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05D9\u05D5\u05EA \u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05D9\u05D3\u05E2.', recommendation: '\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05DE\u05E4\u05EA ROPA \u05DC\u05EA\u05D9\u05E2\u05D5\u05D3 \u05DB\u05DC\u05DC \u05E4\u05E2\u05D9\u05DC\u05D5\u05D9\u05D5\u05EA \u05D4\u05E2\u05D9\u05D1\u05D5\u05D3.' })
  }

  return findings
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
    if (!userData?.org_id) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const orgId = userData.org_id
    const [{ data: docs }, { data: incidents }] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('org_id', orgId),
      supabaseAdmin.from('security_incidents').select('*').eq('org_id', orgId),
    ])

    const findings = generateFindings(docs || [], incidents || [])
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

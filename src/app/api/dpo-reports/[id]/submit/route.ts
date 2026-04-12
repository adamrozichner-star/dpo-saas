import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabaseAdmin.from('users').select('org_id, name, email').eq('auth_user_id', user.id).single()
    if (!userData?.org_id) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const body = await request.json()
    const { recipient_name, recipient_role, recipient_email, approved_by } = body

    if (!recipient_name || !recipient_email) {
      return NextResponse.json({ error: 'Missing recipient details' }, { status: 400 })
    }

    // Fetch report
    const { data: report } = await supabaseAdmin
      .from('dpo_reports')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', userData.org_id)
      .single()

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.status === 'submitted') {
      return NextResponse.json({ error: 'Report already submitted' }, { status: 400 })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', userData.org_id).single()

    // Update report status
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('dpo_reports')
      .update({
        status: 'submitted',
        approved_by: approved_by || userData.name || userData.email,
        approved_at: now,
        submitted_to_name: recipient_name,
        submitted_to_role: recipient_role || null,
        submitted_to_email: recipient_email,
        submitted_at: now,
      })
      .eq('id', params.id)

    // Send email (best-effort)
    if (process.env.RESEND_API_KEY) {
      try {
        const recommendations = Array.isArray(report.recommendations) ? report.recommendations : []
        const html = `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #fef3c7; padding: 20px; border-bottom: 3px solid #f59e0b;">
    <h1 style="color: #92400e; margin: 0;">דוח רבעוני להנהלה — ${report.report_period}</h1>
    <p style="color: #78350f; margin: 5px 0 0;">${org?.name || ''}</p>
  </div>
  <div style="padding: 20px;">
    <p>שלום ${recipient_name},</p>
    <p>מצורף דוח הציות הרבעוני מטעם ממונה הגנת הפרטיות עבור ${org?.name || 'הארגון'}.</p>

    <h2 style="color: #92400e;">תקציר מנהלים</h2>
    <p style="white-space: pre-wrap; background: #fffbeb; padding: 15px; border-radius: 8px;">${report.executive_summary || ''}</p>

    <h2 style="color: #92400e;">מדדים מרכזיים</h2>
    <ul>
      <li>ציון ציות: ${report.compliance_score_start ?? '-'} → ${report.compliance_score_end ?? '-'}</li>
      <li>אירועי אבטחה: ${report.incidents_count}</li>
      <li>תסקירי השפעה: ${report.dpia_count} (${report.dpia_high_risk} ברמת סיכון גבוהה)</li>
      <li>בקשות נושאי מידע: ${report.rights_requests_count}</li>
      <li>מסמכים שעודכנו: ${report.documents_updated}</li>
    </ul>

    <h2 style="color: #92400e;">המלצות</h2>
    <ol>${recommendations.map((r: string) => `<li>${r}</li>`).join('')}</ol>

    <p style="margin-top: 30px; color: #666;">אושר על ידי ${approved_by || userData.name} בתאריך ${new Date().toLocaleDateString('he-IL')}.</p>
    <p style="color: #999; font-size: 12px;">מוגן על ידי Deepo · https://deepo.co.il</p>
  </div>
</div>`

        await resend.emails.send({
          from: 'Deepo <noreply@deepo.co.il>',
          to: [recipient_email],
          subject: `דוח רבעוני להנהלה — ${org?.name || ''} — ${report.report_period}`,
          html,
        })
      } catch (e: any) {
        console.error('Failed to send report email:', e.message)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DPO report submit error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

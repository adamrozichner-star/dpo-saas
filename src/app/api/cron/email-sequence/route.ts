import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Post-signup nurture sequence for users who completed onboarding but haven't paid
const SEQUENCE = [
  { day: 0, template: 'gap_analysis' },    // Same day (first cron run after signup)
  { day: 3, template: 'audit_simulation' },
  { day: 7, template: 'urgency_reminder' },
]

// =============================================
// Email templates (inline — no internal API call needed)
// =============================================
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://deepo.co.il'
const YEAR = new Date().getFullYear()

const header = (subtitle?: string, bg = 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)') => `
<div style="background: ${bg}; padding: 28px 30px; border-radius: 12px 12px 0 0; text-align: center;">
  <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">🛡️ Deepo</h1>
  ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">${subtitle}</p>` : ''}
</div>`

const footer = () => `
<div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
  <p style="margin: 0;">Deepo © ${YEAR} | <a href="${BASE_URL}" style="color: #94a3b8;">deepo.co.il</a></p>
  <p style="margin: 6px 0 0 0; font-size: 11px;">שירותי ממונה הגנת פרטיות לעסקים</p>
</div>`

const btn = (text: string, href: string, bg = '#059669') => `
<div style="text-align: center; margin: 28px 0;">
  <a href="${href}" style="background: ${bg}; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">${text}</a>
</div>`

const wrap = (content: string) => `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, Arial, sans-serif; line-height: 1.7; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background: #f1f5f9;">
${content}
</body></html>`

const body = (content: string) => `
<div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
  ${content}
</div>`

function buildEmail(template: string, data: any): { subject: string; html: string } | null {
  switch (template) {
    case 'gap_analysis':
      return {
        subject: `⚠️ ציון הציות של ${data.orgName}: ${data.score}/100`,
        html: wrap(`
          ${header()}
          ${body(`
            <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
            <p>ניתחנו את פעילות <strong>${data.orgName}</strong> מול דרישות תיקון 13 לחוק הגנת הפרטיות:</p>
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">ציון ציות נוכחי</p>
              <p style="margin: 4px 0; font-size: 56px; font-weight: bold; color: #dc2626;">${data.score}<span style="font-size: 20px; color: #64748b;">/100</span></p>
              <p style="margin: 0; font-size: 13px; color: #991b1b;">${data.gapCount} פערים זוהו</p>
            </div>
            ${data.topGaps?.length > 0 ? `
            <div style="background: #fefce8; border-right: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #92400e; font-weight: bold; margin: 0 0 8px 0;">פערים עיקריים:</p>
              ${data.topGaps.map((g: string) => `<p style="margin: 4px 0; color: #78350f;">❌ ${g}</p>`).join('')}
            </div>` : ''}
            <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #991b1b; font-weight: bold; margin: 0;">💰 חשיפה ללא ממונה:</p>
              <p style="color: #dc2626; font-size: 22px; font-weight: bold; margin: 8px 0 0 0;">עד ₪3,200,000 קנס + עד 3 שנות מאסר</p>
            </div>
            ${btn('הפעלת המערכת — ₪500/חודש ←', BASE_URL + '/subscribe')}
          `)}
          ${footer()}
        `)
      }

    case 'audit_simulation':
      return {
        subject: `🔍 ${data.orgName} — מה הרשות להגנת הפרטיות הייתה מוצאת?`,
        html: wrap(`
          ${header('סימולציית ביקורת', 'linear-gradient(135deg, #b45309 0%, #92400e 100%)')}
          ${body(`
            <h2 style="color: #92400e; margin-top: 0;">שלום ${data.name},</h2>
            <p>אם הרשות להגנת הפרטיות הייתה פונה ל-<strong>${data.orgName}</strong> היום:</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
              ${data.missingItems.map((item: string) => `
              <div style="padding: 8px 0; border-bottom: 1px solid #fef2f2;">
                <span style="color: #dc2626;">✗</span>
                <span style="color: #991b1b;"> ${item}</span>
              </div>`).join('')}
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46; font-weight: bold;">✅ עם Deepo — הכל מסודר תוך דקות.</p>
              <p style="margin: 6px 0 0 0; color: #064e3b; font-size: 14px;">ממונה מוסמכת + מסמכים + ניטור שוטף — ₪500/חודש.</p>
            </div>
            ${btn('הפעלה עכשיו ←', BASE_URL + '/subscribe')}
          `)}
          ${footer()}
        `)
      }

    case 'urgency_reminder':
      return {
        subject: `⏰ ${data.orgName} — האכיפה לא מחכה`,
        html: wrap(`
          ${header()}
          ${body(`
            <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
            <p>שבוע עבר מאז שנרשמתם. הרשות להגנת הפרטיות ממשיכה באכיפה — ביקורות מגזריות ב${data.industry}, קנסות, וצווי תיקון.</p>
            <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 16px;">ללא ממונה ממונה — אתם חשופים.</p>
              <p style="margin: 8px 0 0 0; color: #dc2626; font-size: 13px;">תיקון 13 דורש מינוי DPO. הציון שלכם עדיין ממתין.</p>
            </div>
            <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">מחיר ההפעלה:</p>
              <p style="margin: 8px 0 0 0; font-size: 42px; font-weight: bold; color: #1e40af;">₪500<span style="font-size: 16px; color: #64748b;">/חודש</span></p>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">DPO מוסמך + מערכת מלאה + מסמכים</p>
            </div>
            ${btn('הפעלת המערכת ←', BASE_URL + '/subscribe', '#dc2626')}
          `)}
          ${footer()}
        `)
      }

    default:
      return null
  }
}

// =============================================
// CRON HANDLER
// =============================================
export async function GET(request: NextRequest) {
  // Vercel cron sends the secret automatically
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }
  const resend = new Resend(resendKey)
  const fromEmail = process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>'

  const now = new Date()
  const results: any[] = []

  try {
    // Get all orgs that have completed onboarding (have a profile)
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        users (
          id,
          email,
          name,
          email_sequence_stage,
          last_email_sent
        ),
        organization_profiles (
          profile_data
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[EmailCron] Org query error:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    console.log(`[EmailCron] Found ${orgs?.length || 0} orgs to check`)

    for (const org of orgs || []) {
      // Skip orgs with active subscription (they're paid — no nurture needed)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('org_id', org.id)
        .in('status', ['active', 'past_due'])
        .maybeSingle()

      if (sub) continue

      // Check if org has profile data
      const profile = (org as any).organization_profiles?.[0]?.profile_data
      if (!profile?.v3Answers) continue

      for (const user of (org as any).users || []) {
        if (!user.email) continue

        const signupDate = new Date(org.created_at)
        const daysSinceSignup = Math.floor(
          (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        const currentStage = user.email_sequence_stage || 0

        // Find next email in sequence
        const nextEmail = SEQUENCE.find(
          (seq, index) => index === currentStage && seq.day <= daysSinceSignup
        )

        if (!nextEmail) continue

        // Don't send twice same day
        if (user.last_email_sent) {
          const lastSent = new Date(user.last_email_sent)
          if (lastSent.toDateString() === now.toDateString()) continue
        }

        // Build template data
        const v3 = profile.v3Answers
        const actions = profile.complianceActions || []
        const pendingActions = actions.filter((a: any) => a.category !== 'done')

        let emailData: any = {}
        const userName = user.name || user.email?.split('@')[0] || 'משתמש'

        switch (nextEmail.template) {
          case 'gap_analysis':
            emailData = {
              name: userName,
              orgName: org.name,
              score: profile.complianceScore || 15,
              gapCount: pendingActions.length || 8,
              topGaps: pendingActions.slice(0, 4).map((a: any) => a.title || a.description) || [
                'אין ממונה הגנת פרטיות',
                'חסרה מדיניות פרטיות מאושרת',
                'אין נהלי אבטחת מידע',
                'חסר כתב מינוי DPO'
              ]
            }
            break

          case 'audit_simulation':
            emailData = {
              name: userName,
              orgName: org.name,
              missingItems: [
                'כתב מינוי DPO — לא נמצא',
                'מדיניות פרטיות — לא מאושרת',
                'נהלי אבטחת מידע — לא קיימים',
                'רישום מאגרי מידע — לא עודכן',
                'הסכמי עיבוד מידע עם ספקים — חסרים',
                'תיעוד הדרכות עובדים — לא נמצא'
              ]
            }
            break

          case 'urgency_reminder': {
            const industryMap: Record<string, string> = {
              health: 'בריאות', education: 'חינוך', ecommerce: 'מסחר מקוון',
              finance: 'פיננסים', tech: 'טכנולוגיה', retail: 'קמעונאות',
              services: 'שירותים', manufacturing: 'תעשייה'
            }
            emailData = {
              name: userName,
              orgName: org.name,
              industry: industryMap[v3.industry] || 'עסקים קטנים ובינוניים'
            }
            break
          }
        }

        // Build and send email directly via Resend
        const emailContent = buildEmail(nextEmail.template, emailData)
        if (!emailContent) continue

        try {
          const { data: sendData, error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: [user.email],
            subject: emailContent.subject,
            html: emailContent.html
          })

          if (sendError) {
            console.error(`[EmailCron] Resend error for ${user.email}:`, sendError)
            results.push({ email: user.email, template: nextEmail.template, status: 'failed', error: sendError })
            continue
          }

          // Update user's sequence stage
          await supabase
            .from('users')
            .update({
              email_sequence_stage: currentStage + 1,
              last_email_sent: now.toISOString()
            })
            .eq('id', user.id)

          console.log(`[EmailCron] ✅ Sent ${nextEmail.template} to ${user.email} (day ${daysSinceSignup}, stage ${currentStage}→${currentStage + 1})`)

          results.push({
            email: user.email,
            template: nextEmail.template,
            day: nextEmail.day,
            daysSinceSignup,
            status: 'sent',
            emailId: sendData?.id
          })

        } catch (emailErr: any) {
          console.error(`[EmailCron] Exception for ${user.email}:`, emailErr.message)
          results.push({ email: user.email, template: nextEmail.template, status: 'error', error: emailErr.message })
        }
      }
    }

    console.log(`[EmailCron] Done. Sent: ${results.filter(r => r.status === 'sent').length}, Failed: ${results.filter(r => r.status !== 'sent').length}`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      results,
      timestamp: now.toISOString()
    })

  } catch (error: any) {
    console.error('[EmailCron] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

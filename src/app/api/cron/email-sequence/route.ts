import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Post-signup nurture sequence for users who completed onboarding but haven't paid
const SEQUENCE = [
  { day: 1, template: 'gap_analysis' },
  { day: 3, template: 'audit_simulation' },
  { day: 7, template: 'urgency_reminder' },
]

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const now = new Date()
  const results: any[] = []

  try {
    // Get all orgs WITHOUT active subscription that have completed onboarding
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        users!inner (
          id,
          email,
          name,
          email_sequence_stage,
          last_email_sent
        ),
        organization_profiles!inner (
          profile_data
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[EmailCron] Org query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    for (const org of orgs || []) {
      // Skip orgs with active subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('org_id', org.id)
        .in('status', ['active', 'past_due'])
        .maybeSingle()

      if (sub) continue // Already paid — skip

      const profile = (org as any).organization_profiles?.[0]?.profile_data
      if (!profile?.v3Answers) continue // No onboarding data

      for (const user of (org as any).users || []) {
        const signupDate = new Date(org.created_at)
        const daysSinceSignup = Math.floor(
          (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        const currentStage = user.email_sequence_stage || 0
        const nextEmail = SEQUENCE.find(
          (seq, index) => index === currentStage && seq.day <= daysSinceSignup
        )

        if (!nextEmail) continue

        // Don't send twice same day
        if (user.last_email_sent) {
          const lastSent = new Date(user.last_email_sent)
          if (lastSent.toDateString() === now.toDateString()) continue
        }

        // Build template data from profile
        const v3 = profile.v3Answers
        const actions = profile.complianceActions || []
        const pendingActions = actions.filter((a: any) => a.category !== 'done')

        let emailData: any = {}

        switch (nextEmail.template) {
          case 'gap_analysis':
            emailData = {
              name: user.name || user.email?.split('@')[0] || 'משתמש',
              orgName: org.name,
              score: profile.complianceScore || 15,
              gapCount: pendingActions.length || 8,
              topGaps: pendingActions.slice(0, 4).map((a: any) => a.title || a.description) || [
                'אין ממונה הגנת פרטיות ממונה',
                'חסרה מדיניות פרטיות מאושרת',
                'אין נהלי אבטחת מידע',
                'חסר כתב מינוי DPO'
              ]
            }
            break

          case 'audit_simulation':
            emailData = {
              name: user.name || user.email?.split('@')[0] || 'משתמש',
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

          case 'urgency_reminder':
            const industryMap: Record<string, string> = {
              health: 'בריאות', education: 'חינוך', ecommerce: 'מסחר מקוון',
              finance: 'פיננסים', tech: 'טכנולוגיה', retail: 'קמעונאות',
              services: 'שירותים', manufacturing: 'תעשייה'
            }
            emailData = {
              name: user.name || user.email?.split('@')[0] || 'משתמש',
              orgName: org.name,
              industry: industryMap[v3.industry] || 'עסקים קטנים ובינוניים'
            }
            break
        }

        // Send the email
        try {
          const emailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://mydpo.co.il'}/api/email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-key': supabaseKey
            },
            body: JSON.stringify({
              template: nextEmail.template,
              to: user.email,
              data: emailData
            })
          })

          if (emailRes.ok) {
            // Update user's sequence stage
            await supabase
              .from('users')
              .update({
                email_sequence_stage: currentStage + 1,
                last_email_sent: now.toISOString()
              })
              .eq('id', user.id)

            results.push({
              email: user.email,
              template: nextEmail.template,
              day: nextEmail.day,
              status: 'sent'
            })
          } else {
            results.push({
              email: user.email,
              template: nextEmail.template,
              status: 'failed',
              error: await emailRes.text()
            })
          }
        } catch (emailErr: any) {
          results.push({
            email: user.email,
            template: nextEmail.template,
            status: 'error',
            error: emailErr.message
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString()
    })

  } catch (error: any) {
    console.error('[EmailCron] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

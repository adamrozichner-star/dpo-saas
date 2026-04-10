// src/app/api/complete-onboarding/route.ts
// Server-side onboarding completion — uses service role key to bypass RLS
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkAndCreateNotificationsForOrg } from '@/lib/notifications-trigger'

export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, v3Answers, legacyAnswers, tier } = body

    // Validate required fields
    if (!userId || !v3Answers) {
      console.error('[CompleteOnboarding] Missing fields:', { userId: !!userId, v3Answers: !!v3Answers })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const businessName = v3Answers.bizName || 'עסק חדש'
    const companyId = v3Answers.companyId || ''
    const autoTier = tier || 'basic'

    console.log('[CompleteOnboarding] Starting:', { 
      userId, userEmail, businessName, companyId, autoTier,
      bizNameFromV3: v3Answers.bizName
    })

    const supabase = getServiceSupabase()

    // 1. Check if user already has an org (prevent duplicates)
    const { data: existingUser } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', userId)
      .single()

    if (existingUser?.org_id) {
      // User already has org — update it with correct name and save profile
      console.log('[CompleteOnboarding] User already has org:', existingUser.org_id, '— updating')
      
      await supabase.from('organizations').update({ 
        name: businessName, 
        business_id: companyId,
        tier: autoTier 
      }).eq('id', existingUser.org_id)

      // Upsert profile
      const { data: existingProfile } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('org_id', existingUser.org_id)
        .maybeSingle()

      if (existingProfile) {
        await supabase.from('organization_profiles')
          .update({ profile_data: { answers: legacyAnswers || [], v3Answers, completedAt: new Date().toISOString() } })
          .eq('org_id', existingUser.org_id)
      } else {
        await supabase.from('organization_profiles')
          .insert({ org_id: existingUser.org_id, profile_data: { answers: legacyAnswers || [], v3Answers, completedAt: new Date().toISOString() } })
      }

      console.log('[CompleteOnboarding] Updated existing org:', existingUser.org_id, 'name:', businessName)

      // Send welcome email directly (non-blocking)
      sendWelcomeEmailDirect(userEmail, businessName).catch(e => console.error('[CompleteOnboarding] Email error:', e))

      // Trigger notifications check (non-blocking)
      checkAndCreateNotificationsForOrg(existingUser.org_id, getServiceSupabase()).catch(e => console.error('notif trigger:', e))

      return NextResponse.json({
        success: true,
        orgId: existingUser.org_id,
        orgName: businessName,
        updated: true
      })
    }

    // 2. Create new organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: businessName, business_id: companyId, tier: autoTier, status: 'active' })
      .select('id, name')
      .single()

    if (orgError) {
      console.error('[CompleteOnboarding] Org creation failed:', orgError)
      return NextResponse.json({ error: 'Failed to create organization: ' + orgError.message }, { status: 500 })
    }

    console.log('[CompleteOnboarding] Created org:', orgData.id, 'name:', orgData.name)

    // 3. Link user to org
    const { error: linkError } = await supabase
      .from('users')
      .update({ org_id: orgData.id })
      .eq('auth_user_id', userId)

    if (linkError) {
      console.error('[CompleteOnboarding] User link failed:', linkError)
      // Still continue — org was created
    }

    // 4. Create organization profile with v3Answers
    const { error: profileError } = await supabase
      .from('organization_profiles')
      .insert({
        org_id: orgData.id,
        profile_data: {
          answers: legacyAnswers || [],
          v3Answers: v3Answers,
          completedAt: new Date().toISOString()
        }
      })

    if (profileError) {
      console.error('[CompleteOnboarding] Profile creation failed:', profileError)
      // Still continue — org was created and linked
    }

    console.log('[CompleteOnboarding] Complete! org:', orgData.id, 'name:', orgData.name, 'profile:', !profileError)

    // Send welcome email directly (non-blocking)
    sendWelcomeEmailDirect(userEmail, orgData.name).catch(e => console.error('[CompleteOnboarding] Email error:', e))

    // Trigger notifications check (non-blocking)
    checkAndCreateNotificationsForOrg(orgData.id, getServiceSupabase()).catch(e => console.error('notif trigger:', e))

    return NextResponse.json({
      success: true,
      orgId: orgData.id,
      orgName: orgData.name,
      profileSaved: !profileError
    })

  } catch (err: any) {
    console.error('[CompleteOnboarding] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// =============================================
// Send welcome email directly via Resend SDK
// No internal API call — more reliable on Vercel
// =============================================
async function sendWelcomeEmailDirect(email: string | undefined, orgName: string) {
  if (!email) {
    console.log('[Email] No email provided, skipping')
    return
  }
  
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not set — cannot send welcome email')
    return
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>'
  const name = email.split('@')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deepo.co.il'
  const year = new Date().getFullYear()

  console.log('[Email] Sending welcome email to:', email, 'from:', fromEmail)

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: 'ברוכים הבאים ל-Deepo! 🛡️',
    html: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, Arial, sans-serif; line-height: 1.7; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background: #f1f5f9;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%); padding: 28px 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">🛡️ Deepo</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e40af; margin-top: 0;">שלום ${name}! 👋</h2>
    <p>ברוכים הבאים ל-Deepo. הארגון <strong>${orgName}</strong> נרשם בהצלחה.</p>
    <p>המערכת ניתחה את פעילות הארגון ומוכנה עם מפת ציות מלאה — כולל ציון ציות, רשימת פעולות נדרשות, ומסמכים מותאמים.</p>
    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-weight: bold;">⚡ הצעד הבא:</p>
      <p style="margin: 6px 0 0 0; color: #78350f;">היכנסו ללוח הבקרה לצפייה בציון הציות ובפעולות הנדרשות.</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${appUrl}/dashboard" style="background: #059669; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">כניסה ללוח הבקרה ←</a>
    </div>
  </div>
  <div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">Deepo © ${year} | <a href="${appUrl}" style="color: #94a3b8;">deepo.co.il</a></p>
  </div>
</body>
</html>`
  })

  if (error) {
    console.error('[Email] Resend error:', JSON.stringify(error))
  } else {
    console.log('[Email] Welcome email sent successfully, id:', data?.id)
  }
}

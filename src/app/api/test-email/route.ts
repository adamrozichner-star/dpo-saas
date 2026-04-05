// src/app/api/test-email/route.ts
// Manual test endpoint for email delivery debugging
// Usage: GET /api/test-email?to=adam@example.com&template=welcome
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')
  const template = searchParams.get('template') || 'welcome'

  // Basic security — only allow in dev or with secret
  const secret = searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ 
      error: 'Add ?secret=YOUR_CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY',
      hint: 'GET /api/test-email?to=you@email.com&template=welcome&secret=xxx'
    }, { status: 401 })
  }

  if (!to) {
    return NextResponse.json({ error: 'Missing ?to= parameter' }, { status: 400 })
  }

  // Check env vars
  const diagnostics: Record<string, string> = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}...)` : '❌ NOT SET',
    FROM_EMAIL: process.env.FROM_EMAIL || '❌ NOT SET (fallback: noreply@deepo.co.il)',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ NOT SET (fallback: https://deepo.co.il)',
    CRON_SECRET: process.env.CRON_SECRET ? 'set' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : '❌ NOT SET'
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ 
      error: 'RESEND_API_KEY not set',
      diagnostics 
    }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deepo.co.il'

  const templates: Record<string, { subject: string; html: string }> = {
    welcome: {
      subject: '🧪 [TEST] ברוכים הבאים ל-Deepo!',
      html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #0f172a, #1e40af); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
  <h1 style="color: white; margin: 0;">🛡️ Deepo — TEST EMAIL</h1>
</div>
<div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
  <h2 style="color: #1e40af;">שלום! 👋</h2>
  <p>זוהי <strong>הודעת בדיקה</strong> לוידוא שמערכת האימיילים פעילה.</p>
  <p>Template: <code>${template}</code></p>
  <p>From: <code>${fromEmail}</code></p>
  <p>Sent at: <code>${new Date().toISOString()}</code></p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${appUrl}/dashboard" style="background: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">כניסה ללוח הבקרה ←</a>
  </div>
</div>
<div style="background: #1e293b; color: #94a3b8; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
  <p style="margin: 0;">Test email from Deepo email system</p>
</div>
</body></html>`
    },

    gap_analysis: {
      subject: '🧪 [TEST] ציון הציות שלכם: 15/100',
      html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
<div style="background: linear-gradient(135deg, #0f172a, #1e40af); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
  <h1 style="color: white; margin: 0;">🛡️ Deepo</h1>
</div>
<div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
  <h2 style="color: #1e40af;">שלום,</h2>
  <p>ניתחנו את פעילות <strong>עסק לדוגמה</strong> מול דרישות תיקון 13:</p>
  <div style="background: #fef2f2; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
    <p style="font-size: 56px; font-weight: bold; color: #dc2626; margin: 0;">15<span style="font-size: 20px; color: #64748b;">/100</span></p>
    <p style="color: #991b1b; margin: 4px 0 0 0;">8 פערים זוהו</p>
  </div>
  <p style="color: #991b1b; font-weight: bold;">❌ אין ממונה הגנת פרטיות<br>❌ חסרה מדיניות פרטיות<br>❌ אין נהלי אבטחת מידע<br>❌ חסר כתב מינוי DPO</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${appUrl}/subscribe" style="background: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">הפעלת המערכת — ₪500/חודש ←</a>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center;">🧪 TEST EMAIL — ${new Date().toISOString()}</p>
</div>
</body></html>`
    }
  }

  const emailContent = templates[template] || templates.welcome

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: emailContent.subject,
      html: emailContent.html
    })

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error,
        diagnostics,
        from: fromEmail,
        to
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      diagnostics,
      from: fromEmail,
      to,
      template,
      message: 'Email sent! Check inbox (and spam folder).'
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      diagnostics,
      from: fromEmail,
      to
    }, { status: 500 })
  }
}

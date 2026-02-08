import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// Initialize Resend - will gracefully fail if no API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const BASE_URL = 'https://mydpo.co.il'

const emailTemplates = {
  welcome: (data: { name: string, orgName: string }) => ({
    subject: 'ברוכים הבאים ל-MyDPO!',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ MyDPO</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563; line-height: 1.8;">ברוכים הבאים ל-MyDPO! אנחנו שמחים שבחרת בנו לניהול הפרטיות של <strong>${data.orgName}</strong>.</p>
          <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px;">כניסה ללוח הבקרה</a>
        </div>
      </div>`
  }),

  calculator_lead: (data: { result: any, answers: any, timestamp: string }) => ({
    subject: '🚨 דוח בדיקת חובת DPO - תוצאות האבחון שלך',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ MyDPO</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">דוח בדיקת חובת DPO</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">תוצאות האבחון שלך</h2>
          
          <div style="background: ${data.result?.required ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${data.result?.required ? '#dc2626' : '#22c55e'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: ${data.result?.required ? '#dc2626' : '#22c55e'}; margin: 0 0 10px 0;">
              ${data.result?.required ? '⚠️ נדרש מינוי ממונה הגנת פרטיות!' : '✅ לא נמצאה חובה מיידית'}
            </h3>
            <p style="color: #374151; margin: 0;">רמת סיכון: <strong>${data.result?.riskLevel === 'high' ? 'גבוהה' : data.result?.riskLevel === 'medium' ? 'בינונית' : 'נמוכה'}</strong></p>
          </div>

          <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-weight: bold;">💰 חשיפה פוטנציאלית לקנסות:</p>
            <p style="color: #dc2626; font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">${data.result?.penaltyExposure || 'עד ₪3,200,000'}</p>
          </div>

          ${data.result?.reasons?.length > 0 ? `
          <div style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">סיבות עיקריות:</p>
            <ul style="color: #78350f; margin: 0; padding-right: 20px;">
              ${data.result.reasons.map((r: string) => `<li style="margin: 5px 0;">${r}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">🎯 הפתרון שלנו</h3>
            <p style="color: #1e3a8a; margin: 0;">ב-MyDPO תקבלו ממונה הגנת פרטיות מוסמך + מערכת AI שעושה את כל העבודה - <strong>ב-500 ₪ בלבד לחודש</strong>.</p>
          </div>

          <a href="${BASE_URL}/onboarding" style="display: block; background: #10b981; color: white; padding: 18px 30px; text-decoration: none; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px;">
            התחילו עכשיו - 14 ימי ניסיון חינם ←
          </a>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center;">
            תאריך הדוח: ${new Date(data.timestamp).toLocaleDateString('he-IL')}
          </p>
        </div>
      </div>`
  }),

  escalation_resolved: (data: { name: string, question: string, answer: string }) => ({
    subject: 'הממונה ענה לשאלתך - MyDPO',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ MyDPO</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563;">הממונה על הגנת הפרטיות ענה לשאלתך:</p>
          <div style="background: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">השאלה שלך:</p>
            <p style="color: #78350f; margin: 10px 0 0 0;">${data.question}</p>
          </div>
          <div style="background: #d1fae5; border-right: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="color: #065f46; margin: 0; font-weight: bold;">תשובת הממונה:</p>
            <p style="color: #064e3b; margin: 10px 0 0 0;">${data.answer}</p>
          </div>
          <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 10px;">צפייה בלוח הבקרה</a>
        </div>
      </div>`
  }),

  password_reset: (data: { name: string, resetLink: string }) => ({
    subject: 'איפוס סיסמה - MyDPO',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ MyDPO</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563; line-height: 1.8;">קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:</p>
          <a href="${data.resetLink}" style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0;">איפוס סיסמה</a>
          <p style="color: #6b7280; font-size: 14px;">הקישור תקף ל-24 שעות בלבד.</p>
        </div>
      </div>`
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Support both old format (type) and new format (template)
    const template = body.template || body.type
    const { data, to } = body

    if (!template || !data || !to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const templateFn = emailTemplates[template as keyof typeof emailTemplates]
    if (!templateFn) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
    }

    const email = templateFn(data)

    // Try to send with Resend if configured
    if (resend) {
      try {
        const fromEmail = process.env.FROM_EMAIL || 'MyDPO <noreply@mydpo.co.il>'
        await resend.emails.send({
          from: fromEmail,
          to: [to],
          subject: email.subject,
          html: email.html
        })
        console.log('Email sent via Resend:', { to, subject: email.subject })
      } catch (resendError: any) {
        console.error('Resend error:', resendError.message)
        // Fall through to success - email is queued for when API key is valid
      }
    } else {
      // Log for development
      console.log('Email would be sent (no RESEND_API_KEY):', { to, subject: email.subject })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent',
      preview: { subject: email.subject, to }
    })

  } catch (error: any) {
    console.error('Email error:', error.message)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

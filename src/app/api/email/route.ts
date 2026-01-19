import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const emailTemplates = {
  welcome: (data: { name: string, orgName: string }) => ({
    subject: 'ברוכים הבאים ל-DPO-Pro!',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563; line-height: 1.8;">ברוכים הבאים ל-DPO-Pro! אנחנו שמחים שבחרת בנו לניהול הפרטיות של <strong>${data.orgName}</strong>.</p>
          <a href="https://dpo-saas.vercel.app/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px;">כניסה ללוח הבקרה</a>
        </div>
      </div>`
  }),

  escalation_resolved: (data: { name: string, question: string, answer: string }) => ({
    subject: 'הממונה ענה לשאלתך - DPO-Pro',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
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
          <a href="https://dpo-saas.vercel.app/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 10px;">צפייה בלוח הבקרה</a>
        </div>
      </div>`
  }),

  password_reset: (data: { name: string, resetLink: string }) => ({
    subject: 'איפוס סיסמה - DPO-Pro',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563; line-height: 1.8;">קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:</p>
          <a href="${data.resetLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0;">איפוס סיסמה</a>
          <p style="color: #6b7280; font-size: 14px;">הקישור תקף ל-24 שעות בלבד.</p>
        </div>
      </div>`
  })
}

export async function POST(request: NextRequest) {
  try {
    const { template, data, to } = await request.json()

    if (!template || !data || !to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const templateFn = emailTemplates[template as keyof typeof emailTemplates]
    if (!templateFn) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
    }

    const email = templateFn(data)

    // Log the email (replace with actual email service later - Resend, SendGrid, etc.)
    console.log('Email would be sent:', { to, subject: email.subject })

    return NextResponse.json({ 
      success: true, 
      message: 'Email queued',
      preview: { subject: email.subject, to }
    })

  } catch (error: any) {
    console.error('Email error:', error.message)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

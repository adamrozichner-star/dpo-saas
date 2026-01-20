import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'DPO-Pro <noreply@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-saas.vercel.app'

const emailTemplates = {
  welcome: (data: { name: string, orgName: string, dpoName?: string }) => ({
    subject: 'ברוכים הבאים ל-DPO-Pro! 🛡️',
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.name},</h2>
          <p style="color: #4b5563; line-height: 1.8;">ברוכים הבאים ל-DPO-Pro! אנחנו שמחים שבחרת בנו לניהול הפרטיות של <strong>${data.orgName}</strong>.</p>
          ${data.dpoName ? `<div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #059669; margin: 0; font-weight: bold;">✅ הממונה שלכם מונה!</p>
            <p style="color: #4b5563; margin: 10px 0 0 0;"><strong>${data.dpoName}</strong> מונה כממונה הגנת הפרטיות שלכם.</p>
          </div>` : ''}
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px;">כניסה ללוח הבקרה</a>
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
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 10px;">צפייה בלוח הבקרה</a>
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
  }),

  new_message: (data: { userName: string, dpoName: string, threadSubject: string, messagePreview: string }) => ({
    subject: `הודעה חדשה מהממונה: ${data.threadSubject}`,
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #3b82f6; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.userName},</h2>
          <p style="color: #4b5563;">קיבלת הודעה חדשה מהממונה <strong>${data.dpoName}</strong>:</p>
          <div style="background: white; border-right: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">${data.threadSubject}</p>
            <p style="color: #374151; margin: 0;">${data.messagePreview}</p>
          </div>
          <a href="${APP_URL}/dashboard?tab=messages" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px;">צפייה בהודעה ←</a>
        </div>
      </div>`
  }),

  data_subject_request: (data: { userName: string, requestType: string, requesterName: string, requesterEmail: string, deadline: string }) => ({
    subject: `⚠️ בקשת נושא מידע חדשה - ${data.requestType}`,
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f59e0b; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ בקשת נושא מידע</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #b45309;">שלום ${data.userName},</h2>
          <p style="color: #4b5563;">התקבלה בקשת נושא מידע חדשה:</p>
          <div style="background: white; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>סוג:</strong> ${data.requestType}</p>
            <p style="margin: 8px 0;"><strong>שם:</strong> ${data.requesterName}</p>
            <p style="margin: 8px 0;"><strong>אימייל:</strong> ${data.requesterEmail}</p>
            <p style="margin: 8px 0; color: #dc2626;"><strong>מועד אחרון:</strong> ${data.deadline}</p>
          </div>
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>⏰ תזכורת:</strong> על פי החוק, יש לטפל בבקשה תוך 30 יום.</p>
          </div>
          <a href="${APP_URL}/dashboard?tab=requests" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px;">טיפול בבקשה ←</a>
        </div>
      </div>`
  }),

  trial_ending: (data: { userName: string, orgName: string, daysLeft: number, trialEndDate: string }) => ({
    subject: `⏰ תקופת הניסיון מסתיימת בעוד ${data.daysLeft} ימים`,
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🛡️ DPO-Pro</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">שלום ${data.userName},</h2>
          <p style="color: #4b5563;">תקופת הניסיון של <strong>${data.orgName}</strong> מסתיימת בעוד <strong>${data.daysLeft} ימים</strong> (${data.trialEndDate}).</p>
          <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1d4ed8;">₪500<span style="font-size: 16px;">/חודש</span></p>
          </div>
          <a href="${APP_URL}/subscribe" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">שדרוג למנוי ←</a>
        </div>
      </div>`
  }),

  payment_confirmation: (data: { userName: string, orgName: string, planName: string, amount: string, nextBillingDate: string }) => ({
    subject: `✅ אישור תשלום - ${data.planName}`,
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #059669; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ תשלום התקבל</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #047857;">תודה ${data.userName}!</h2>
          <p style="color: #4b5563;">התשלום עבור <strong>${data.orgName}</strong> התקבל בהצלחה.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>חבילה:</strong> ${data.planName}</p>
            <p style="margin: 8px 0;"><strong>סכום:</strong> ${data.amount}</p>
            <p style="margin: 8px 0;"><strong>חיוב הבא:</strong> ${data.nextBillingDate}</p>
          </div>
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px;">המשך ללוח הבקרה ←</a>
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

    const email = templateFn(data as any)

    // If Resend is configured, send real email
    if (process.env.RESEND_API_KEY) {
      const { data: emailData, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject: email.subject,
        html: email.html,
      })

      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Email sent',
        id: emailData?.id
      })
    }

    // Fallback: just log (for development)
    console.log('Email would be sent:', { to, subject: email.subject })
    return NextResponse.json({ 
      success: true, 
      message: 'Email queued (dev mode)',
      preview: { subject: email.subject, to }
    })

  } catch (error: any) {
    console.error('Email error:', error.message)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

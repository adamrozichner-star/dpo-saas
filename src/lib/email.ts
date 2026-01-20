// Email Service using Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'DPO-Pro <noreply@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-pro.co.il'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Welcome email after registration
export function welcomeEmail(data: {
  userName: string
  orgName: string
  dpoName: string
}): EmailTemplate {
  return {
    subject: `ברוכים הבאים ל-DPO-Pro! 🛡️`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🛡️ DPO-Pro</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.userName}! 👋</h2>
    <p>ברוכים הבאים ל-DPO-Pro!</p>
    <p>הארגון <strong>${data.orgName}</strong> נרשם בהצלחה למערכת.</p>
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #059669; margin-top: 0;">✅ הממונה שלכם מונה!</h3>
      <p style="margin-bottom: 0;"><strong>${data.dpoName}</strong> מונה כממונה הגנת הפרטיות שלכם.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">כניסה ללוח הבקרה ←</a>
    </div>
  </div>
  <div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">DPO-Pro © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`,
    text: `שלום ${data.userName}!\n\nברוכים הבאים ל-DPO-Pro!\nהארגון ${data.orgName} נרשם בהצלחה.\n${data.dpoName} מונה כממונה הגנת הפרטיות שלכם.\n\nכניסה: ${APP_URL}/dashboard`
  }
}

// New message notification
export function newMessageEmail(data: {
  userName: string
  dpoName: string
  messagePreview: string
  threadSubject: string
}): EmailTemplate {
  return {
    subject: `הודעה חדשה מהממונה: ${data.threadSubject}`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #3B82F6; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ DPO-Pro</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.userName},</h2>
    <p>קיבלת הודעה חדשה מהממונה <strong>${data.dpoName}</strong>:</p>
    <div style="background: white; border-right: 4px solid #3B82F6; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0 0 5px 0;">${data.threadSubject}</p>
      <p style="margin: 0; color: #334155;">${data.messagePreview}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard?tab=messages" style="background: #3B82F6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">צפייה בהודעה ←</a>
    </div>
  </div>
  <div style="background: #1e293b; color: #94a3b8; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">DPO-Pro © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`,
    text: `שלום ${data.userName},\n\nקיבלת הודעה חדשה מהממונה ${data.dpoName}:\n\n${data.threadSubject}\n${data.messagePreview}\n\nצפייה: ${APP_URL}/dashboard?tab=messages`
  }
}

// Data subject request notification
export function dataSubjectRequestEmail(data: {
  userName: string
  requestType: 'access' | 'rectification' | 'erasure' | 'objection'
  requesterName: string
  requesterEmail: string
  deadline: string
}): EmailTemplate {
  const typeNames: Record<string, string> = {
    access: 'עיון במידע',
    rectification: 'תיקון מידע',
    erasure: 'מחיקת מידע',
    objection: 'התנגדות לעיבוד'
  }
  return {
    subject: `⚠️ בקשת נושא מידע חדשה - ${typeNames[data.requestType]}`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #F59E0B; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ בקשת נושא מידע</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #b45309; margin-top: 0;">שלום ${data.userName},</h2>
    <p>התקבלה בקשת נושא מידע חדשה:</p>
    <div style="background: white; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p><strong>סוג:</strong> ${typeNames[data.requestType]}</p>
      <p><strong>שם:</strong> ${data.requesterName}</p>
      <p><strong>אימייל:</strong> ${data.requesterEmail}</p>
      <p style="color: #dc2626;"><strong>מועד אחרון:</strong> ${data.deadline}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard?tab=requests" style="background: #F59E0B; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">טיפול בבקשה ←</a>
    </div>
  </div>
</body>
</html>`,
    text: `שלום ${data.userName},\n\nבקשת נושא מידע חדשה:\nסוג: ${typeNames[data.requestType]}\nשם: ${data.requesterName}\nמועד אחרון: ${data.deadline}\n\n${APP_URL}/dashboard?tab=requests`
  }
}

// Trial ending reminder
export function trialEndingEmail(data: {
  userName: string
  orgName: string
  daysLeft: number
  trialEndDate: string
}): EmailTemplate {
  return {
    subject: `⏰ תקופת הניסיון מסתיימת בעוד ${data.daysLeft} ימים`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ DPO-Pro</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.userName},</h2>
    <p>תקופת הניסיון של <strong>${data.orgName}</strong> מסתיימת בעוד <strong>${data.daysLeft} ימים</strong> (${data.trialEndDate}).</p>
    <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1d4ed8;">₪500<span style="font-size: 16px;">/חודש</span></p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/subscribe" style="background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">שדרוג למנוי ←</a>
    </div>
  </div>
</body>
</html>`,
    text: `שלום ${data.userName},\n\nתקופת הניסיון של ${data.orgName} מסתיימת בעוד ${data.daysLeft} ימים.\n\nשדרוג: ${APP_URL}/subscribe`
  }
}

// Payment confirmation
export function paymentConfirmationEmail(data: {
  userName: string
  orgName: string
  planName: string
  amount: string
  nextBillingDate: string
}): EmailTemplate {
  return {
    subject: `✅ אישור תשלום - ${data.planName}`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #059669; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ תשלום התקבל</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #047857; margin-top: 0;">תודה ${data.userName}!</h2>
    <p>התשלום עבור <strong>${data.orgName}</strong> התקבל בהצלחה.</p>
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p><strong>חבילה:</strong> ${data.planName}</p>
      <p><strong>סכום:</strong> ${data.amount}</p>
      <p><strong>חיוב הבא:</strong> ${data.nextBillingDate}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">המשך ללוח הבקרה ←</a>
    </div>
  </div>
</body>
</html>`,
    text: `תודה ${data.userName}!\n\nהתשלום עבור ${data.orgName} התקבל.\nחבילה: ${data.planName}\nסכום: ${data.amount}\nחיוב הבא: ${data.nextBillingDate}`
  }
}

// Send email function
export async function sendEmail(
  to: string | string[],
  template: EmailTemplate
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set')
      return { success: false, error: 'Email not configured' }
    }
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    })
    if (error) {
      console.error('Email error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data?.id }
  } catch (err: any) {
    console.error('Email exception:', err)
    return { success: false, error: err.message }
  }
}

// Convenience functions
export async function sendWelcomeEmail(to: string, data: Parameters<typeof welcomeEmail>[0]) {
  return sendEmail(to, welcomeEmail(data))
}
export async function sendNewMessageNotification(to: string, data: Parameters<typeof newMessageEmail>[0]) {
  return sendEmail(to, newMessageEmail(data))
}
export async function sendDataSubjectRequestNotification(to: string, data: Parameters<typeof dataSubjectRequestEmail>[0]) {
  return sendEmail(to, dataSubjectRequestEmail(data))
}
export async function sendTrialEndingReminder(to: string, data: Parameters<typeof trialEndingEmail>[0]) {
  return sendEmail(to, trialEndingEmail(data))
}
export async function sendPaymentConfirmation(to: string, data: Parameters<typeof paymentConfirmationEmail>[0]) {
  return sendEmail(to, paymentConfirmationEmail(data))
}

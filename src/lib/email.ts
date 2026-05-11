// Email Service using Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || 'Deepo <noreply@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://deepo.co.il'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Welcome email after registration — pre-payment, no DPO appointment
export function welcomeEmail(data: {
  orgName?: string
  // Legacy fields kept for back-compat with older callers; ignored.
  userName?: string
  dpoName?: string
}): EmailTemplate {
  const rawOrgName = (data.orgName || '').trim()
  const isPlaceholder = !rawOrgName || rawOrgName === 'עסק חדש'
  const greeting = isPlaceholder ? 'שלום וברוכים הבאים' : `שלום ${rawOrgName}`
  const introHtml = isPlaceholder
    ? ''
    : `<p style="margin:0 0 16px 0; text-align:right; color:#1f2937;">ברוכים הבאים ל-Deepo.</p>`
  const introText = isPlaceholder ? '' : 'ברוכים הבאים ל-Deepo.\n\n'

  return {
    subject: `ברוכים הבאים ל-Deepo`,
    html: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ברוכים הבאים ל-Deepo</title>
</head>
<body dir="rtl" style="margin:0; padding:0; background-color:#F4F6FA; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="background-color:#F4F6FA;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(15,27,61,0.08);">
          <tr>
            <td align="center" style="background-color:#0F1B3D; padding:28px 24px;">
              <div style="color:#ffffff; font-size:26px; font-weight:700; letter-spacing:0.5px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">Deepo</div>
            </td>
          </tr>
          <tr>
            <td dir="rtl" style="padding:36px 32px; text-align:right; color:#1f2937; font-size:16px; line-height:1.7;">
              <h1 style="margin:0 0 20px 0; font-size:22px; font-weight:700; color:#0F1B3D; text-align:right;">${greeting},</h1>
              ${introHtml}
              <p style="margin:0 0 28px 0; text-align:right; color:#374151;">המערכת ניתחה את פעילות הארגון והכינה עבורכם מפת ציות מלאה — כולל ציון ציות, רשימת פעולות נדרשות ומסמכים מותאמים.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="background-color:#F5F7FA; border:1px solid #E5E9F0; border-radius:6px; margin:0 0 28px 0;">
                <tr>
                  <td dir="rtl" style="padding:18px 20px; text-align:right;">
                    <div style="font-weight:700; color:#0F1B3D; margin:0 0 6px 0; font-size:15px;">הצעד הבא</div>
                    <div style="color:#374151; font-size:15px; line-height:1.6;">היכנסו ללוח הבקרה לצפייה בציון הציות ובפעולות הנדרשות.</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${APP_URL}/dashboard" style="display:block; width:100%; box-sizing:border-box; background-color:#0E9F6E; color:#ffffff; text-decoration:none; padding:16px 24px; border-radius:6px; font-weight:700; font-size:16px; text-align:center; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">כניסה ללוח הבקרה ←</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td dir="rtl" align="center" style="background-color:#F5F7FA; padding:20px 24px; text-align:center; color:#6B7280; font-size:12px; line-height:1.6; border-top:1px solid #E5E9F0;">
              Deepo — שירות ממונה הגנת פרטיות מבוסס בינה מלאכותית | <a href="${APP_URL}" style="color:#6B7280; text-decoration:underline;">deepo.co.il</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `${greeting},\n\n${introText}המערכת ניתחה את פעילות הארגון והכינה עבורכם מפת ציות מלאה — כולל ציון ציות, רשימת פעולות נדרשות ומסמכים מותאמים.\n\nהצעד הבא:\nהיכנסו ללוח הבקרה לצפייה בציון הציות ובפעולות הנדרשות.\n\nכניסה ללוח הבקרה: ${APP_URL}/dashboard\n\n—\nDeepo — שירות ממונה הגנת פרטיות מבוסס בינה מלאכותית\ndeepo.co.il`
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
    <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ Deepo</h1>
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
    <p style="margin: 0;">Deepo © ${new Date().getFullYear()}</p>
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

// DEPRECATED — no longer using free trials
// Nurture sequence emails are now in api/email/route.ts (gap_analysis, audit_simulation, urgency_reminder)
export function trialEndingEmail(data: {
  userName: string
  orgName: string
  daysLeft: number
  trialEndDate: string
}): EmailTemplate {
  // Redirect to gap_analysis template logic
  return {
    subject: `⚠️ ציון הציות של ${data.orgName} ממתין לטיפול`,
    html: `<p>Deprecated — use api/email route with gap_analysis template</p>`,
    text: `Deprecated`
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

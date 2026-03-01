import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE_URL = 'https://mydpo.co.il'
const YEAR = new Date().getFullYear()

// ============================================
// SHARED EMAIL COMPONENTS
// ============================================
const header = (subtitle?: string, bg = 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)') => `
<div style="background: ${bg}; padding: 28px 30px; border-radius: 12px 12px 0 0; text-align: center;">
  <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">🛡️ MyDPO</h1>
  ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">${subtitle}</p>` : ''}
</div>`

const footer = () => `
<div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
  <p style="margin: 0;">MyDPO © ${YEAR} | <a href="${BASE_URL}" style="color: #94a3b8;">mydpo.co.il</a></p>
  <p style="margin: 6px 0 0 0; font-size: 11px;">שירותי ממונה הגנת פרטיות לעסקים</p>
</div>`

const btn = (text: string, href: string, bg = '#3B82F6') => `
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

// ============================================
// EMAIL TEMPLATES
// ============================================
const emailTemplates: Record<string, (data: any) => { subject: string; html: string }> = {

  // ——————————————————————————————
  // WELCOME — post-signup, pre-payment
  // No DPO appointment claim!
  // ——————————————————————————————
  welcome: (data: { name: string; orgName: string }) => ({
    subject: 'ברוכים הבאים ל-MyDPO! 🛡️',
    html: wrap(`
      ${header()}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name}! 👋</h2>
        <p>ברוכים הבאים ל-MyDPO. הארגון <strong>${data.orgName}</strong> נרשם בהצלחה.</p>
        <p>המערכת ניתחה את פעילות הארגון ומוכנה עם מפת ציות מלאה — כולל ציון ציות, רשימת פעולות נדרשות, ומסמכים מותאמים.</p>
        <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚡ הצעד הבא:</p>
          <p style="margin: 6px 0 0 0; color: #78350f;">היכנסו ללוח הבקרה לצפייה בציון הציות ובפעולות הנדרשות.</p>
        </div>
        ${btn('כניסה ללוח הבקרה ←', BASE_URL + '/dashboard', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // ACTIVATION COMPLETE — post-payment
  // NOW we can say DPO is appointed
  // ——————————————————————————————
  activation_complete: (data: { name: string; orgName: string; dpoName: string; docsCount: number }) => ({
    subject: `✅ ${data.orgName} — המערכת הופעלה בהצלחה`,
    html: wrap(`
      ${header('ההפעלה הושלמה! 🎉')}
      ${body(`
        <h2 style="color: #059669; margin-top: 0;">הכל מוכן, ${data.name}! ✅</h2>
        <p>הארגון <strong>${data.orgName}</strong> מוגדר ומוכן לעמידה בתיקון 13 לחוק הגנת הפרטיות.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #059669; margin: 0 0 8px 0;">🛡️ הממונה שלכם מונתה</h3>
          <p style="margin: 0;"><strong>${data.dpoName}</strong> — ממונה הגנת פרטיות מוסמכת</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin: 0 0 8px 0;">📄 ${data.docsCount} מסמכים הופקו ואושרו</h3>
          <p style="margin: 0; font-size: 14px; color: #334155;">מדיניות פרטיות, נהלי אבטחה, כתב מינוי, מיפוי מערכות ועוד — הכל מוכן ללוח הבקרה.</p>
        </div>
        <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">⚡ הצעדים הבאים:</p>
          <p style="margin: 6px 0 0 0; color: #78350f;">חתימה על כתב מינוי DPO, הסכמי ספקים, והגדרת בקרת גישה.</p>
        </div>
        ${btn('כניסה ללוח הבקרה ←', BASE_URL + '/dashboard?payment=success', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // PAYMENT CONFIRMATION
  // ——————————————————————————————
  payment_confirmation: (data: { name: string; orgName: string; planName: string; amount: string; nextBillingDate: string }) => ({
    subject: `✅ אישור תשלום — ${data.planName}`,
    html: wrap(`
      ${header('אישור תשלום', '#059669')}
      ${body(`
        <h2 style="color: #059669; margin-top: 0;">תודה, ${data.name}! ✅</h2>
        <p>התשלום עבור <strong>${data.orgName}</strong> התקבל בהצלחה.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>חבילה:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${data.planName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>סכום:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${data.amount}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>חיוב הבא:</strong></td><td style="padding: 8px 0;">${data.nextBillingDate}</td></tr>
          </table>
        </div>
        ${btn('כניסה ללוח הבקרה ←', BASE_URL + '/dashboard', '#059669')}
        <p style="text-align: center; font-size: 12px; color: #94a3b8;">לשאלות בנושא חיוב: support@mydpo.co.il</p>
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // DPO MESSAGE NOTIFICATION
  // ——————————————————————————————
  dpo_message: (data: { name: string; dpoName: string; subject: string; preview: string }) => ({
    subject: `הודעה חדשה מהממונה: ${data.subject}`,
    html: wrap(`
      ${header()}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
        <p>קיבלת הודעה חדשה מהממונה <strong>${data.dpoName}</strong>:</p>
        <div style="background: #f8fafc; border-right: 4px solid #3B82F6; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0;">${data.subject}</p>
          <p style="margin: 0; color: #334155;">${data.preview}</p>
        </div>
        ${btn('צפייה בהודעה ←', BASE_URL + '/dashboard?tab=messages')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // INCIDENT ACKNOWLEDGED
  // ——————————————————————————————
  incident_acknowledged: (data: { name: string; incidentType: string; severity: string; reportedAt: string; deadline: string }) => ({
    subject: `⚠️ אירוע אבטחה נרשם — ${data.incidentType}`,
    html: wrap(`
      ${header('אירוע אבטחה דווח', 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)')}
      ${body(`
        <h2 style="color: #dc2626; margin-top: 0;">⚠️ אירוע אבטחה נרשם</h2>
        <p>קיבלנו את הדיווח שלכם. הממונה תבחן את הפרטים ותעדכן בהקדם.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>סוג:</strong> ${data.incidentType}</p>
          <p style="margin: 0 0 8px 0;"><strong>תאריך דיווח:</strong> ${data.reportedAt}</p>
          <p style="margin: 0;"><strong>חומרה:</strong> <span style="color: #dc2626; font-weight: bold;">${data.severity}</span></p>
        </div>
        <div style="background: #fefce8; border: 2px solid #f59e0b; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">⏰ מועד אחרון לדיווח לרשות:</p>
          <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #dc2626;">${data.deadline}</p>
        </div>
        ${btn('צפייה באירוע ←', BASE_URL + '/dashboard?tab=incidents', '#dc2626')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // INCIDENT RESOLVED
  // ——————————————————————————————
  incident_resolved: (data: { name: string; incidentType: string; summary: string; reportedToAuthority: boolean }) => ({
    subject: `✅ אירוע אבטחה טופל — ${data.incidentType}`,
    html: wrap(`
      ${header('אירוע אבטחה טופל', '#059669')}
      ${body(`
        <h2 style="color: #059669; margin-top: 0;">✅ האירוע טופל</h2>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>סוג:</strong> ${data.incidentType}</p>
          <p style="margin: 0 0 8px 0;"><strong>סטטוס:</strong> <span style="color: #059669; font-weight: bold;">טופל ונסגר</span></p>
          <p style="margin: 0;"><strong>נדרש דיווח לרשות:</strong> ${data.reportedToAuthority ? 'כן — בוצע' : 'לא'}</p>
        </div>
        <div style="background: #f8fafc; border-right: 4px solid #059669; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #064e3b; font-weight: bold; margin: 0 0 6px 0;">סיכום הממונה:</p>
          <p style="margin: 0; color: #334155;">${data.summary}</p>
        </div>
        ${btn('צפייה בפרטים ←', BASE_URL + '/dashboard?tab=incidents', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // ESCALATION RESOLVED (Q&A)
  // ——————————————————————————————
  escalation_resolved: (data: { name: string; question: string; answer: string }) => ({
    subject: 'הממונה ענה לשאלתך — MyDPO',
    html: wrap(`
      ${header()}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
        <p>הממונה ענה לשאלתך:</p>
        <div style="background: #fefce8; border-right: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 4px 0;">השאלה שלך:</p>
          <p style="color: #78350f; margin: 0;">${data.question}</p>
        </div>
        <div style="background: #f0fdf4; border-right: 4px solid #059669; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #065f46; font-weight: bold; margin: 0 0 4px 0;">תשובת הממונה:</p>
          <p style="color: #064e3b; margin: 0;">${data.answer}</p>
        </div>
        ${btn('צפייה בלוח הבקרה ←', BASE_URL + '/dashboard?tab=messages', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // CALCULATOR LEAD
  // ——————————————————————————————
  calculator_lead: (data: { result: any; answers: any; timestamp: string }) => ({
    subject: '🚨 דוח בדיקת חובת DPO — תוצאות האבחון שלך',
    html: wrap(`
      ${header('דוח בדיקת חובת DPO', 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)')}
      ${body(`
        <h2 style="color: #1f2937; margin-top: 0;">תוצאות האבחון</h2>
        <div style="background: ${data.result?.required ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${data.result?.required ? '#dc2626' : '#22c55e'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: ${data.result?.required ? '#dc2626' : '#22c55e'}; margin: 0 0 10px 0;">
            ${data.result?.required ? '⚠️ נדרש מינוי ממונה הגנת פרטיות!' : '✅ לא נמצאה חובה מיידית'}
          </h3>
          <p style="color: #374151; margin: 0;">רמת סיכון: <strong>${data.result?.riskLevel === 'high' ? 'גבוהה' : data.result?.riskLevel === 'medium' ? 'בינונית' : 'נמוכה'}</strong></p>
        </div>
        <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #991b1b; margin: 0; font-weight: bold;">💰 חשיפה פוטנציאלית:</p>
          <p style="color: #dc2626; font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">${data.result?.penaltyExposure || 'עד ₪3,200,000'}</p>
        </div>
        ${data.result?.reasons?.length > 0 ? `
        <div style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">סיבות עיקריות:</p>
          <ul style="color: #78350f; margin: 0; padding-right: 20px;">
            ${data.result.reasons.map((r: string) => `<li style="margin: 5px 0;">${r}</li>`).join('')}
          </ul>
        </div>` : ''}
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin: 0 0 10px 0;">🎯 הפתרון</h3>
          <p style="color: #1e3a8a; margin: 0;">ב-MyDPO תקבלו ממונה מוסמך + מערכת AI מלאה — <strong>ב-₪500 בלבד לחודש</strong>.</p>
        </div>
        ${btn('התחילו עכשיו ←', BASE_URL + '/onboarding', '#059669')}
        <p style="color: #6b7280; font-size: 12px; text-align: center;">תאריך הדוח: ${new Date(data.timestamp).toLocaleDateString('he-IL')}</p>
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // NURTURE: Day 1 — Gap Analysis Summary
  // ——————————————————————————————
  gap_analysis: (data: { name: string; orgName: string; score: number; gapCount: number; topGaps: string[] }) => ({
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
        ${data.topGaps.length > 0 ? `
        <div style="background: #fefce8; border-right: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 8px 0;">פערים עיקריים:</p>
          ${data.topGaps.map(g => `<p style="margin: 4px 0; color: #78350f;">❌ ${g}</p>`).join('')}
        </div>` : ''}
        <div style="background: #fef2f2; border-right: 4px solid #dc2626; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #991b1b; font-weight: bold; margin: 0;">💰 חשיפה ללא ממונה:</p>
          <p style="color: #dc2626; font-size: 22px; font-weight: bold; margin: 8px 0 0 0;">עד ₪3,200,000 קנס + עד 3 שנות מאסר</p>
        </div>
        ${btn('הפעלת המערכת — ₪500/חודש ←', BASE_URL + '/subscribe', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // NURTURE: Day 3 — Audit Simulation
  // ——————————————————————————————
  audit_simulation: (data: { name: string; orgName: string; missingItems: string[] }) => ({
    subject: `🔍 ${data.orgName} — מה הרשות להגנת הפרטיות הייתה מוצאת?`,
    html: wrap(`
      ${header('סימולציית ביקורת', 'linear-gradient(135deg, #b45309 0%, #92400e 100%)')}
      ${body(`
        <h2 style="color: #92400e; margin-top: 0;">שלום ${data.name},</h2>
        <p>אם הרשות להגנת הפרטיות הייתה פונה ל-<strong>${data.orgName}</strong> היום, הנה מה שהיו מוצאים:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
          ${data.missingItems.map(item => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #fef2f2;">
            <span style="color: #dc2626;">✗</span>
            <span style="color: #991b1b;">${item}</span>
          </div>`).join('')}
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0; color: #065f46; font-weight: bold;">✅ עם MyDPO — הכל מסודר תוך דקות.</p>
          <p style="margin: 6px 0 0 0; color: #064e3b; font-size: 14px;">ממונה מוסמכת + מסמכים + ניטור שוטף — ₪500/חודש.</p>
        </div>
        ${btn('הפעלה עכשיו ←', BASE_URL + '/subscribe', '#059669')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // NURTURE: Day 7 — Urgency Reminder
  // ——————————————————————————————
  urgency_reminder: (data: { name: string; orgName: string; industry: string }) => ({
    subject: `⏰ ${data.orgName} — האכיפה לא מחכה`,
    html: wrap(`
      ${header()}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
        <p>שבוע עבר מאז שנרשמתם. בינתיים, הרשות להגנת הפרטיות ממשיכה באכיפה — ביקורות מגזריות ב${data.industry}, קנסות, וצווי תיקון.</p>
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
  }),

  // ——————————————————————————————
  // MONTHLY COMPLIANCE DIGEST
  // ——————————————————————————————
  monthly_digest: (data: { name: string; orgName: string; score: number; scoreDelta: number; doneCount: number; pendingCount: number; docsCount: number; topAction: string }) => ({
    subject: `📊 סיכום חודשי — ${data.orgName} (${data.score}/100)`,
    html: wrap(`
      ${header(`סיכום חודשי — ${new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`)}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
        <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">ציון ציות</p>
          <p style="margin: 4px 0; font-size: 56px; font-weight: bold; color: #1e40af;">${data.score}<span style="font-size: 20px; color: #64748b;">/100</span></p>
          ${data.scoreDelta !== 0 ? `<p style="margin: 0; font-size: 13px; color: ${data.scoreDelta > 0 ? '#059669' : '#dc2626'};">${data.scoreDelta > 0 ? '↑' : '↓'} ${Math.abs(data.scoreDelta)} נקודות מהחודש שעבר</p>` : ''}
        </div>
        <div style="margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: separate; border-spacing: 0 6px;">
            <tr><td style="background: #f0fdf4; padding: 10px; border-radius: 6px 0 0 6px;">✅ בוצעו</td><td style="background: #f0fdf4; padding: 10px; border-radius: 0 6px 6px 0; text-align: left;"><strong>${data.doneCount} פעולות</strong></td></tr>
            <tr><td style="background: #fefce8; padding: 10px; border-radius: 6px 0 0 6px;">⏳ ממתינות</td><td style="background: #fefce8; padding: 10px; border-radius: 0 6px 6px 0; text-align: left;"><strong>${data.pendingCount} פעולות</strong></td></tr>
            <tr><td style="background: #eff6ff; padding: 10px; border-radius: 6px 0 0 6px;">📄 מסמכים</td><td style="background: #eff6ff; padding: 10px; border-radius: 0 6px 6px 0; text-align: left;"><strong>${data.docsCount} מסמכים פעילים</strong></td></tr>
          </table>
        </div>
        ${data.topAction ? `
        <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #92400e;">⚡ הפעולה הכי חשובה החודש:</p>
          <p style="margin: 6px 0 0 0; color: #78350f;">${data.topAction}</p>
        </div>` : ''}
        ${btn('כניסה ללוח הבקרה ←', BASE_URL + '/dashboard')}
      `)}
      ${footer()}
    `)
  }),

  // ——————————————————————————————
  // PASSWORD RESET (for API-triggered resets)
  // ——————————————————————————————
  password_reset: (data: { name: string; resetLink: string }) => ({
    subject: 'איפוס סיסמה — MyDPO',
    html: wrap(`
      ${header()}
      ${body(`
        <h2 style="color: #1e40af; margin-top: 0;">שלום ${data.name},</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך:</p>
        ${btn('איפוס סיסמה ←', data.resetLink, '#f59e0b')}
        <p style="color: #64748b; font-size: 13px;">הקישור תקף ל-24 שעות. אם לא ביקשת איפוס, ניתן להתעלם.</p>
      `)}
      ${footer()}
    `)
  }),
}

// ============================================
// API HANDLER
// ============================================
export async function POST(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-key')
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const authHeader = request.headers.get('authorization')
    
    const isInternalCall = internalKey && expectedKey && internalKey === expectedKey
    const hasUserAuth = authHeader?.startsWith('Bearer ')
    
    if (!isInternalCall && !hasUserAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const template = body.template || body.type
    const { data, to } = body

    if (!template || !data || !to) {
      return NextResponse.json({ error: 'Missing required fields: template, data, to' }, { status: 400 })
    }

    const templateFn = emailTemplates[template]
    if (!templateFn) {
      return NextResponse.json({ error: `Invalid template: ${template}. Available: ${Object.keys(emailTemplates).join(', ')}` }, { status: 400 })
    }

    // Sanitize all string values
    const sanitizedData: any = {}
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string') {
        sanitizedData[key] = escapeHtml(val)
      } else if (Array.isArray(val)) {
        sanitizedData[key] = val.map((v: any) => typeof v === 'string' ? escapeHtml(v) : v)
      } else {
        sanitizedData[key] = val
      }
    }

    const email = templateFn(sanitizedData)

    if (resend) {
      try {
        const fromEmail = process.env.FROM_EMAIL || 'MyDPO <noreply@mydpo.co.il>'
        await resend.emails.send({
          from: fromEmail,
          to: [to],
          subject: email.subject,
          html: email.html
        })
        console.log('Email sent:', { to, template, subject: email.subject })
      } catch (resendError: any) {
        console.error('Resend error:', resendError.message)
      }
    } else {
      console.log('Email (no RESEND_API_KEY):', { to, template, subject: email.subject })
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

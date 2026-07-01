// POST /api/contact — marketing "צרו קשר" form. Validates the message and
// emails it to Adam via Resend (@/lib/email). No DB write: the notification
// email is the deliverable. Mirrors the fire-and-forget pattern in
// /api/leads, but here the email IS the point, so a send failure returns 502
// (the UI surfaces a "try again" state rather than a false success).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const NOTIFY_TO = 'adamrozichner@gmail.com'

const BODY_SCHEMA = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().transform(v => (v && v.length > 0 ? v : undefined)),
  company: z.string().trim().max(200).optional().transform(v => (v && v.length > 0 ? v : undefined)),
  message: z.string().trim().min(1).max(5000),
})

const esc = (s: string) => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = BODY_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.flatten() }, { status: 400 })
  }
  const { name, email, phone, company, message } = parsed.data

  const rows: Array<[string, string]> = [
    ['שם', name],
    ['דוא"ל', email],
    ...(phone ? [['טלפון', phone] as [string, string]] : []),
    ...(company ? [['חברה', company] as [string, string]] : []),
  ]

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.7; max-width:600px; margin:0 auto; padding:20px;" dir="rtl">
  <h2 style="margin:0 0 16px 0;">פנייה חדשה מטופס "צרו קשר"</h2>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="margin:0 0 16px 0;">
    ${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0; font-weight:bold; white-space:nowrap;">${k}:</td><td>${esc(v)}</td></tr>`).join('')}
  </table>
  <div style="border-top:1px solid #e5e7eb; padding-top:12px; white-space:pre-wrap;">${esc(message)}</div>
</body></html>`

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nהודעה:\n${message}`

  const result = await sendEmail(NOTIFY_TO, {
    subject: `פנייה חדשה מ-${name}`,
    html,
    text,
  })

  if (!result.success) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}

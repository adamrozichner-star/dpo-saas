import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/api-utils'

// E4 - the DSAR pass-through submit endpoint (purpose=dsar only). This is the
// PII-routing crux:
//   * The subject's PII (name / ת"ז / email / phone / details) lives ONLY in this
//     request body and is forwarded to the org's DPO via Resend. It is NEVER
//     passed to a database call.
//   * The ONLY DB write is dsar_record(token, request_type) - a SECURITY DEFINER
//     fn whose signature has NO PII slot. It writes the PII-free tracking row +
//     burns the link. It cannot touch events/evidence.
//   * Uses the anon key (no service-role). Resolve + record are SECURITY DEFINER
//     fns owned by the minimal dsar_fn role.
//
// The public form is rendered by the existing GET /api/link/[token]
// (resolve_access_link returns the generic org name + purpose='dsar'); this route
// is POST-only.

export const dynamic = 'force-dynamic'

const REQUEST_TYPES = ['access', 'rectification', 'erasure', 'objection'] as const

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  access: 'עיון במידע',
  rectification: 'תיקון מידע',
  erasure: 'מחיקת מידע',
  objection: 'התנגדות לעיבוד',
}

// Forward the subject's PII to the DPO out-of-band. PII reaches Resend ONLY; it
// is never written to the database. All subject-supplied strings are HTML-escaped.
async function sendDpoHandoff(
  to: string,
  orgDisplayName: string,
  correlationRef: string,
  pii: { requestType: string; fullName: string; idNumber: string; email: string; phone: string; details: string },
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>',
        to,
        subject: `בקשת נושא מידע חדשה - ${correlationRef}`,
        html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px;">
  <h2>בקשת נושא מידע חדשה</h2>
  <p>התקבלה בקשה דרך קישור מאובטח עבור <strong>${escapeHtml(orgDisplayName)}</strong>. הפרטים מועברים אליך ישירות ואינם נשמרים במערכת.</p>
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
    <p><strong>מספר מעקב:</strong> ${escapeHtml(correlationRef)}</p>
    <p><strong>סוג בקשה:</strong> ${escapeHtml(REQUEST_TYPE_LABEL[pii.requestType] || pii.requestType)}</p>
    <p><strong>שם מלא:</strong> ${escapeHtml(pii.fullName)}</p>
    <p><strong>תעודת זהות:</strong> ${escapeHtml(pii.idNumber)}</p>
    <p><strong>אימייל:</strong> ${escapeHtml(pii.email)}</p>
    <p><strong>טלפון:</strong> ${escapeHtml(pii.phone || '-')}</p>
    ${pii.details ? `<p><strong>פרטים:</strong><br>${escapeHtml(pii.details)}</p>` : ''}
  </div>
  <p style="color:#92400e;">יש להשיב לפונה ישירות תוך 30 יום על פי חוק. הטיפול והתשובה מתבצעים מחוץ למערכת.</p>
</body></html>`,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function sendSubjectConfirmation(to: string, orgDisplayName: string, correlationRef: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>',
        to,
        subject: `אישור קבלת בקשה - ${correlationRef}`,
        html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px;">
  <h2>הבקשה התקבלה</h2>
  <p>בקשתך אל <strong>${escapeHtml(orgDisplayName)}</strong> התקבלה והועברה לטיפול הממונה על הגנת הפרטיות.</p>
  <p><strong>מספר מעקב:</strong> ${escapeHtml(correlationRef)}</p>
  <p>תקבל מענה ישירות, ולא יאוחר מ-30 יום כנדרש בחוק.</p>
</body></html>`,
      }),
    })
  } catch {
    /* confirmation is best-effort */
  }
}

// POST /api/dsar/[token]  body: { requestType, fullName, idNumber, email, phone?, details? }
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = anonClient()
  if (!supabase) return NextResponse.json({ ok: false })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const requestType = String((body as Record<string, unknown>).requestType ?? '')
  const fullName = String((body as Record<string, unknown>).fullName ?? '').trim()
  const idNumber = String((body as Record<string, unknown>).idNumber ?? '').trim()
  const email = String((body as Record<string, unknown>).email ?? '').trim()
  const phone = String((body as Record<string, unknown>).phone ?? '').trim()
  const details = String((body as Record<string, unknown>).details ?? '').trim()

  if (!REQUEST_TYPES.includes(requestType as (typeof REQUEST_TYPES)[number]) || !fullName || !idNumber || !email) {
    return NextResponse.json({ ok: false, error: 'invalid' })
  }

  // 1. Resolve the token (validity + generic org name + DPO notify email). No PII
  //    in this call; dsar_resolve is read-only.
  const { data: resolved, error: resErr } = await supabase.rpc('dsar_resolve', { p_token: params.token })
  if (resErr || !resolved?.valid) return NextResponse.json({ ok: false })

  const orgDisplayName: string = resolved.org_display_name ?? ''
  const dpoEmail: string | null = resolved.dpo_notify_email ?? null

  // 2. The ONLY DB write: record the PII-free tracking row + burn the link. Its
  //    signature carries no PII slot - the subject's data cannot reach the DB here.
  const { data: rec, error: recErr } = await supabase.rpc('dsar_record', { p_token: params.token, p_request_type: requestType })
  if (recErr || !rec?.ok) return NextResponse.json({ ok: false })
  const correlationRef: string = rec.correlation_ref ?? ''

  // 3. PII -> Resend ONLY (never a DB call). Out-of-band handoff to the DPO with
  //    the correlation_ref + a confirmation to the subject. Recording first means a
  //    Resend failure leaves a tracked request the DPO can re-notify, not a lost one.
  if (dpoEmail) {
    await sendDpoHandoff(dpoEmail, orgDisplayName, correlationRef, { requestType, fullName, idNumber, email, phone, details })
  }
  await sendSubjectConfirmation(email, orgDisplayName, correlationRef)

  return NextResponse.json({ ok: true, correlation_ref: correlationRef })
}

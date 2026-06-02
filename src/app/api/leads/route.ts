// POST /api/leads — early-access lead capture (PR 3 / Task 2 of the
// site-changes spec). Backs the form at /lead-signup.
//
// Flow:
//   1. Validate body with Zod
//   2. INSERT into public.leads (via service-role client)
//   3. Fire-and-forget Resend notification to Adam (failure does NOT
//      fail the request — the row is the source of truth, email is
//      a courtesy)
//   4. Return { success: true }
//
// consent_at is captured server-side at submission time (NOW()) so the
// timestamp can't be forged from the client.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Israeli phone tolerance: accept digits + common separators, length
// 8-20. Strict format checking is intentionally out of scope — Roy
// can tighten the regex later. We DON'T want to reject "054-424-2427"
// vs "0544242427" vs "+972 54 4242427" — all should land in the table.
const PHONE_RE = /^[+\d][\d\s\-()]{7,19}$/;

const BODY_SCHEMA = z.object({
  first_name:  z.string().trim().min(1).max(120),
  phone:       z.string().trim().regex(PHONE_RE),
  association: z.string().trim().min(1).max(200),
  // Optional. Empty strings come through as undefined via the form's
  // explicit `|| undefined` mapping; we also coerce empty/whitespace
  // here so a stray empty string lands as NULL in the DB.
  company_name: z.string().trim().max(200).optional()
    .transform(v => (v && v.length > 0 ? v : undefined)),
  // Client-side confirmation that the (required) privacy/contact
  // consent checkbox was ticked. The authoritative timestamp for it
  // is set server-side below. This is SEPARATE from marketing consent.
  consent:     z.literal(true),
  // Marketing consent — optional, defaults to false. When true, the
  // server captures marketing_consent_at = NOW() (mirroring how
  // consent_at is handled). When false/absent, marketing_consent_at
  // stays NULL.
  marketing_consent: z.boolean().optional().default(false),
});

const NOTIFY_TO = 'adamrozichner@gmail.com';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = BODY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { first_name, phone, association, company_name, marketing_consent } = parsed.data;

  const sb = getServiceSupabase();
  const consentAt = new Date().toISOString();
  // marketing_consent_at MUST be NULL when the marketing box is unchecked —
  // it's the audit timestamp for marketing consent specifically, not a
  // submission timestamp.
  const marketingConsentAt = marketing_consent ? consentAt : null;

  const { error: insertErr } = await sb.from('leads').insert({
    first_name,
    phone,
    association,
    company_name: company_name ?? null,
    consent_at: consentAt,
    marketing_consent,
    marketing_consent_at: marketingConsentAt,
  });

  if (insertErr) {
    console.error('[leads] insert_failed:', {
      error: insertErr.message,
      code: insertErr.code,
      details: insertErr.details,
    });
    return NextResponse.json(
      { error: 'insert_failed' },
      { status: 500 },
    );
  }

  // Fire-and-forget notification. Don't await; don't fail the request
  // if email is misconfigured.
  notifyAdam({
    first_name, phone, association,
    company_name: company_name ?? null,
    consentAt,
    marketing_consent,
  }).catch(err =>
    console.error('[leads] notify_failed:', err),
  );

  return NextResponse.json({ success: true });
}

async function notifyAdam(data: {
  first_name: string;
  phone: string;
  association: string;
  company_name: string | null;
  consentAt: string;
  marketing_consent: boolean;
}): Promise<void> {
  const consentDateHe = new Date(data.consentAt).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
  });
  const companyLabel = data.company_name ?? '(לא צוין)';
  const marketingLabel = data.marketing_consent ? 'אישר/ה' : 'לא אישר/ה';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" dir="rtl">
      <h2 style="color: #1e40af;">ליד חדש להצטרפות מוקדמת</h2>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px; color: #64748b;">שם פרטי:</td><td style="padding: 6px 12px; font-weight: bold;">${escapeHtml(data.first_name)}</td></tr>
        <tr><td style="padding: 6px 12px; color: #64748b;">טלפון:</td><td style="padding: 6px 12px; font-weight: bold;">${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 6px 12px; color: #64748b;">איגוד מקצועי:</td><td style="padding: 6px 12px; font-weight: bold;">${escapeHtml(data.association)}</td></tr>
        <tr><td style="padding: 6px 12px; color: #64748b;">שם החברה / העסק:</td><td style="padding: 6px 12px; font-weight: bold;">${escapeHtml(companyLabel)}</td></tr>
        <tr><td style="padding: 6px 12px; color: #64748b;">תאריך הסכמה (פרטיות):</td><td style="padding: 6px 12px;">${escapeHtml(consentDateHe)}</td></tr>
        <tr><td style="padding: 6px 12px; color: #64748b;">תוכן שיווקי:</td><td style="padding: 6px 12px; font-weight: bold;">${escapeHtml(marketingLabel)}</td></tr>
      </table>
      <p style="color: #94a3b8; font-size: 12px;">נשלח אוטומטית מ-deepo.co.il</p>
    </div>
  `;

  await sendEmail(NOTIFY_TO, {
    subject: `Deepo — ליד חדש: ${data.first_name}`,
    html,
    text:
      `ליד חדש להצטרפות מוקדמת\n\n` +
      `שם פרטי: ${data.first_name}\n` +
      `טלפון: ${data.phone}\n` +
      `איגוד מקצועי: ${data.association}\n` +
      `שם החברה / העסק: ${companyLabel}\n` +
      `תאריך הסכמה (פרטיות): ${consentDateHe}\n` +
      `תוכן שיווקי: ${marketingLabel}\n`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

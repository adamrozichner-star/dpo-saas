'use client'

// /lead-signup — early-access lead capture (PR 3 / Task 2 of the
// site-changes spec). Replaces the public signup CTA when payments
// are paused (PR 4 flips the flag and re-routes /register here).
//
// The form has 3 required fields + a required consent checkbox that
// links to /privacy. On submit it POSTs to /api/leads, which inserts
// to public.leads and emails Adam. On success the entire form is
// replaced with the success message from spec.
//
// Styling note (brand pass): controls render on the warm brand, not the
// legacy shadcn periwinkle/emerald defaults. The submit button is the
// hero gradient (dp-btn--gradient), inputs use .dp-input, and the
// checkboxes/links/states use brand tokens via lead-signup.css. Fields,
// copy and logic are unchanged.

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/brand/Button'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import '../lead-signup.css'

type Status = 'idle' | 'submitting' | 'success' | 'error'

// Mirror the API regex on the client for instant feedback. Permissive:
// digits + common separators, length 8–20. Server-side enforces same rule.
const PHONE_RE = /^[+\d][\d\s\-()]{7,19}$/

export default function LeadSignupPage() {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [association, setAssociation] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [consent, setConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const phoneValid = PHONE_RE.test(phone.trim())
  // canSubmit intentionally does NOT include companyName (optional) or
  // marketingConsent (optional). The required-gate is unchanged from
  // PR #25: first_name + phone + association + privacy consent.
  const canSubmit =
    firstName.trim().length > 0 &&
    phoneValid &&
    association.trim().length > 0 &&
    consent &&
    status !== 'submitting'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('submitting')
    setErrorMsg(null)
    try {
      const trimmedCompany = companyName.trim()
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          phone: phone.trim(),
          association: association.trim(),
          // Send company_name only when populated; the server treats
          // missing/empty as NULL via Zod's optional + transform.
          ...(trimmedCompany ? { company_name: trimmedCompany } : {}),
          consent: true,
          marketing_consent: marketingConsent,
        }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="lead-page min-h-screen" dir="rtl">
      <main className="container mx-auto px-4 py-12 max-w-xl">
        {status === 'success' ? (
          <SuccessState />
        ) : (
          <>
            <h1 className="lead-title text-3xl font-bold mb-2">הצטרפות לגישה מוקדמת</h1>
            <p className="lead-sub mb-8">
              ההרשמה לשירות תיפתח בקרוב. השאירו פרטים ונעדכן אתכם ראשונים, כולל
              מחיר מיוחד למצטרפים מוקדמים.
            </p>

            {status === 'error' && (
              <div
                role="alert"
                className="lead-alert mb-6 rounded-lg border p-4 flex items-start gap-3"
              >
                <AlertTriangle className="lead-alert__icon h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="lead-alert__title font-semibold">שליחה נכשלה</p>
                  <p className="lead-alert__text text-sm mt-1">
                    אירעה תקלה. נסו שוב בעוד מספר רגעים, או פנו בדוא&quot;ל
                    ל-
                    <a href="mailto:adamrozichner@gmail.com">
                      adamrozichner@gmail.com
                    </a>
                    .
                    {errorMsg && <span className="block text-xs opacity-60 mt-1">{errorMsg}</span>}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="lead-card border rounded-lg p-6 space-y-5">

              <div>
                <Label htmlFor="firstName">שם פרטי <span className="lead-req">*</span></Label>
                <input
                  className="dp-input"
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  disabled={status === 'submitting'}
                />
              </div>

              <div>
                <Label htmlFor="phone">טלפון נייד <span className="lead-req">*</span></Label>
                <input
                  className="dp-input"
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="050-0000000"
                  disabled={status === 'submitting'}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                {phone.length > 0 && !phoneValid && (
                  <p className="lead-hint text-xs mt-1">
                    אנא הזינו מספר טלפון תקין.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="association">שם איגוד מקצועי <span className="lead-req">*</span></Label>
                <input
                  className="dp-input"
                  id="association"
                  type="text"
                  value={association}
                  onChange={e => setAssociation(e.target.value)}
                  required
                  autoComplete="organization"
                  placeholder="לדוגמה: לשכת רואי החשבון, איגוד עורכי הדין"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Optional company / business name. NOT in the required-gate. */}
              <div>
                <Label htmlFor="companyName">שם החברה / העסק</Label>
                <input
                  className="dp-input"
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  autoComplete="organization"
                  placeholder="(אופציונלי)"
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Required privacy/contact consent. Same <Label htmlFor> wrap
                  pattern as PR #31 so the visible square is clickable. The
                  inner <Link> is an interactive descendant — HTML5 suppresses
                  label activation when it's clicked, so the link navigates
                  to /privacy without toggling. This box GATES SUBMIT. */}
              <Label
                htmlFor="consent"
                className="flex items-start gap-3 pt-2 text-sm font-normal leading-relaxed cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="lead-check"
                  id="consent"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  required
                  disabled={status === 'submitting'}
                />
                <span>
                  אני מסכים/ה שדיפו תיצור איתי קשר בנושא השירות ולשמירת הפרטים שלי
                  בהתאם ל
                  <Link href="/privacy" target="_blank" rel="noopener" className="lead-link mx-1">
                    מדיניות הפרטיות
                  </Link>
                  .
                </span>
              </Label>

              {/* Separate OPTIONAL marketing consent. Per privacy-by-design,
                  marketing consent must not be bundled with the required
                  processing consent above. Does NOT gate submit. */}
              <div>
                <Label
                  htmlFor="marketingConsent"
                  className="flex items-start gap-3 text-sm font-normal leading-relaxed cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="lead-check"
                    id="marketingConsent"
                    checked={marketingConsent}
                    onChange={e => setMarketingConsent(e.target.checked)}
                    disabled={status === 'submitting'}
                  />
                  <span>
                    אני מאשר/ת קבלת תוכן שיווקי ועדכונים מ-Deepo בדוא&quot;ל ו/או ב-SMS.
                    ניתן להסיר בכל עת.
                  </span>
                </Label>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={!canSubmit}
                className="w-full"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שולח…
                  </>
                ) : (
                  'הצטרפות לגישה מוקדמת'
                )}
              </Button>

              <p className="lead-fine text-xs text-center">
                הצטרפות אינה מהווה התחייבות לרכישה. ניתן לבקש הסרה בכל עת.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="lead-success border rounded-2xl p-8 text-center">
      <div className="lead-success__badge w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="lead-success__icon h-7 w-7" />
      </div>
      <h1 className="lead-title text-2xl font-bold mb-3">נרשמת לגישה מוקדמת ל-Deepo</h1>
      <p className="lead-sub leading-relaxed mb-6">
        כמצטרפים מוקדמים תקבלו מחיר מיוחד כשנפתח לרישום. נעדכן אתכם בקרוב.
      </p>
      <Link href="/" className="dp-btn dp-btn--secondary dp-btn--md">חזרה לדף הבית</Link>
    </div>
  )
}

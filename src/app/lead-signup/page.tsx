'use client'

// /lead-signup — early-access lead capture (PR 3 / Task 2 of the
// site-changes spec). Replaces the public signup CTA when payments
// are paused (PR 4 flips the flag and re-routes /register here).
//
// The form has 3 required fields + a required consent checkbox that
// links to /privacy. On submit it POSTs to /api/leads, which inserts
// to public.leads and emails Adam. On success the entire form is
// replaced with the success message from spec.

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

// Mirror the API regex on the client for instant feedback. Permissive:
// digits + common separators, length 8–20. Server-side enforces same rule.
const PHONE_RE = /^[+\d][\d\s\-()]{7,19}$/

export default function LeadSignupPage() {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [association, setAssociation] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const phoneValid = PHONE_RE.test(phone.trim())
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
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          phone: phone.trim(),
          association: association.trim(),
          consent: true,
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-xl">
        {status === 'success' ? (
          <SuccessState />
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2">הצטרפות לגישה מוקדמת</h1>
            <p className="text-gray-600 mb-8">
              ההרשמה לשירות תיפתח בקרוב. השאירו פרטים ונעדכן אתכם ראשונים — כולל
              מחיר מיוחד למצטרפים מוקדמים.
            </p>

            {status === 'error' && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3"
              >
                <AlertTriangle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">שליחה נכשלה</p>
                  <p className="text-sm text-red-800 mt-1">
                    אירעה תקלה. נסו שוב בעוד מספר רגעים, או פנו בדוא&quot;ל
                    ל-
                    <a
                      href="mailto:adamrozichner@gmail.com"
                      className="underline"
                    >
                      adamrozichner@gmail.com
                    </a>
                    .
                    {errorMsg && <span className="block text-xs opacity-60 mt-1">{errorMsg}</span>}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">

              <div>
                <Label htmlFor="firstName">שם פרטי <span className="text-red-500">*</span></Label>
                <Input
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
                <Label htmlFor="phone">טלפון נייד <span className="text-red-500">*</span></Label>
                <Input
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
                  <p className="text-xs text-amber-700 mt-1">
                    אנא הזינו מספר טלפון תקין.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="association">שם איגוד מקצועי <span className="text-red-500">*</span></Label>
                <Input
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

              {/* Single <Label htmlFor> wrapping BOTH the Checkbox and the text.
                  - The square `<div>` inside Checkbox is sr-only-input + sibling-div;
                    on its own it has no click target. Wrapping it in a label
                    forwards the click to the input via htmlFor.
                  - The inner <Link> is an interactive descendant — per HTML5,
                    label activation is suppressed when clicked, so it navigates
                    to /privacy without toggling the checkbox. */}
              <Label
                htmlFor="consent"
                className="flex items-start gap-3 pt-2 text-sm font-normal leading-relaxed cursor-pointer"
              >
                <Checkbox
                  id="consent"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  required
                  disabled={status === 'submitting'}
                />
                <span>
                  אני מסכים/ה שדיפו תיצור איתי קשר בנושא השירות ולשמירת הפרטים שלי
                  בהתאם ל
                  <Link href="/privacy" target="_blank" rel="noopener" className="text-emerald-600 hover:underline mx-1">
                    מדיניות הפרטיות
                  </Link>
                  .
                </span>
              </Label>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-5 rounded-xl text-base font-semibold"
                style={canSubmit ? { backgroundColor: '#059669' } : undefined}
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

              <p className="text-xs text-gray-500 text-center">
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
    <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold mb-3">נרשמת לגישה מוקדמת ל-Deepo</h1>
      <p className="text-gray-700 leading-relaxed mb-6">
        כמצטרפים מוקדמים תקבלו מחיר מיוחד כשנפתח לרישום. נעדכן אתכם בקרוב.
      </p>
      <Link href="/">
        <Button variant="outline">חזרה לדף הבית</Button>
      </Link>
    </div>
  )
}

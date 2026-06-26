'use client'

// The public no-login tokenized form (E1). Reached by an access_links token.
// Renders ONLY through TokenizedFormShell (the CC-2 seam): the Deepo platform
// mark, a generic purpose title, the org's chosen display name, and the question
// set. It never sees - and the API never returns - any other org data: no
// obligation titles, no other contacts, no ledger detail, no DPO identity.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { TokenizedFormShell } from '@/components/ledger/TokenizedFormShell'
import '@/components/ledger/ledger.css'

// Generic, purpose-based titles. NEVER the org name (that is shown separately as
// the org's chosen display name, the one org field this surface is allowed).
const PURPOSE_TITLE: Record<string, string> = {
  sysadmin_questionnaire: 'שאלון אבטחת מידע',
  vendor_dpa: 'הצהרת ספק לעיבוד נתונים',
  dsar: 'בקשת נושא מידע',
}

interface Question {
  id: string
  order_index: number
  question_text: string
  question_type: string
  choices: unknown
  required: boolean
  help_text: string | null
  depends_on: unknown
}

interface ResolveResult {
  valid: boolean
  org_display_name?: string
  purpose?: string
  questions?: Question[]
}

type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'done' | 'error'

export default function TokenizedLinkPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const [phase, setPhase] = useState<Phase>('loading')
  const [resolved, setResolved] = useState<ResolveResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/link/${encodeURIComponent(token)}`)
        const data: ResolveResult = await res.json()
        if (cancelled) return
        if (!data?.valid) {
          setPhase('invalid')
          return
        }
        setResolved(data)
        setPhase('form')
      } catch {
        if (!cancelled) setPhase('invalid')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setPhase('submitting')
    // Self-describing payload: store each question's text alongside the answer,
    // ordered as asked. This freezes the wording at answer-time (audit-correct:
    // the captured evidence stays meaningful even if the catalog later changes)
    // and lets the DPO surface read it without a hub_questions join.
    const ordered = (resolved?.questions ?? []).slice().sort((a, b) => a.order_index - b.order_index)
    const payload = ordered.map((q) => ({ q: q.question_text, a: answers[q.id] ?? '' }))
    try {
      const res = await fetch(`/api/link/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      const data = await res.json()
      setPhase(data?.ok ? 'done' : 'error')
    } catch {
      setPhase('error')
    }
  }

  if (phase === 'loading') {
    return (
      <TokenizedFormShell title="טוען…">
        <p className="t-body-sm">רגע אחד.</p>
      </TokenizedFormShell>
    )
  }

  if (phase === 'invalid') {
    // Uniform message for unknown / expired / revoked / already-used. No detail.
    return (
      <TokenizedFormShell title="הקישור אינו זמין">
        <p className="t-body-sm">הקישור פג, כבר נוצל, או שאינו תקין. אם אתם זקוקים לקישור חדש, פנו לאיש הקשר שלכם.</p>
      </TokenizedFormShell>
    )
  }

  if (phase === 'done') {
    return (
      <TokenizedFormShell title="התקבל. תודה" footerNote="ניתן לסגור את החלון.">
        <p className="t-body-sm">התשובות נשלחו בהצלחה.</p>
      </TokenizedFormShell>
    )
  }

  const purpose = resolved?.purpose ?? ''
  const title = PURPOSE_TITLE[purpose] ?? 'טופס'
  const questions = (resolved?.questions ?? []).slice().sort((a, b) => a.order_index - b.order_index)

  return (
    <TokenizedFormShell title={title} footerNote="טופס מאובטח. הקישור אישי ואינו חושף מידע על הארגון.">
      {resolved?.org_display_name ? (
        <p className="t-body-sm" style={{ marginBlockEnd: 'var(--space-4)', color: 'var(--fg-3)' }}>
          עבור: {resolved.org_display_name}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {questions.length === 0 ? (
          <p className="t-body-sm">אין כרגע שאלות בטופס זה.</p>
        ) : (
          questions.map((q) => {
            const choices = Array.isArray(q.choices) ? (q.choices as unknown[]) : null
            return (
              <label key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span className="t-body-sm" style={{ fontWeight: 600 }}>
                  {q.question_text}
                  {q.required ? <span style={{ color: 'var(--status-risk)' }}> *</span> : null}
                </span>
                {q.help_text ? <span className="t-caption" style={{ color: 'var(--fg-3)' }}>{q.help_text}</span> : null}
                {choices ? (
                  <select
                    required={q.required}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  >
                    <option value="" disabled>בחרו…</option>
                    {choices.map((c, i) => {
                      const val = typeof c === 'string' ? c : JSON.stringify(c)
                      return <option key={i} value={val}>{val}</option>
                    })}
                  </select>
                ) : (
                  <textarea
                    rows={2}
                    required={q.required}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
              </label>
            )
          })
        )}

        {phase === 'error' ? (
          <p className="t-body-sm" style={{ color: 'var(--status-risk)' }}>השליחה נכשלה. נסו שוב.</p>
        ) : null}

        <button type="submit" className="dp-btn dp-btn--primary" disabled={phase === 'submitting'}>
          {phase === 'submitting' ? 'שולח…' : 'שליחה'}
        </button>
      </form>
    </TokenizedFormShell>
  )
}

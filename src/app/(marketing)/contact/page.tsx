'use client'

// /contact - branded "צרו קשר" form. Warm marketing brand (not the legacy
// shadcn/periwinkle theme). Single column: just the message form. On submit
// it POSTs to /api/contact, which emails the message to Adam.

import { useState } from 'react'
import Link from 'next/link'
import { DeepoIcon } from '@/brand/icons'
import './contact.css'

type FormData = { name: string; email: string; phone: string; company: string; message: string }

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', company: '', message: '' })

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setIsSuccess(true)
      } else {
        setError('השליחה נכשלה. נסו שוב בעוד רגע.')
      }
    } catch {
      setError('משהו השתבש בחיבור. נסו שוב בעוד רגע.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="ct-success">
            <span className="ct-success__ic"><DeepoIcon id="dp-check" /></span>
            <h1>הפנייה נשלחה</h1>
            <p>תודה. נחזור אליכם תוך יום עסקים אחד.</p>
            <Link href="/" className="dp-btn dp-btn--primary dp-btn--md">חזרה לדף הבית</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mk-section">
      <div className="mk-wrap">
       <div className="ct-box">
        <div className="ct-head">
          <h1>צרו קשר</h1>
          <p>יש לכם שאלות? נשמח לעזור</p>
        </div>

        <div className="ct-card">
          <h2>שלחו לנו הודעה</h2>
          <form className="ct-form" onSubmit={handleSubmit}>
            <div className="ct-row">
              <div className="ct-field">
                <label htmlFor="name">שם מלא *</label>
                <input id="name" value={form.name} onChange={set('name')} required />
              </div>
              <div className="ct-field">
                <label htmlFor="phone">טלפון</label>
                <input id="phone" type="tel" dir="ltr" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="ct-field">
              <label htmlFor="email">דוא&quot;ל *</label>
              <input id="email" type="email" dir="ltr" value={form.email} onChange={set('email')} required />
            </div>
            <div className="ct-field">
              <label htmlFor="company">שם החברה</label>
              <input id="company" value={form.company} onChange={set('company')} />
            </div>
            <div className="ct-field">
              <label htmlFor="message">הודעה *</label>
              <textarea id="message" rows={6} value={form.message} onChange={set('message')} required />
            </div>
            {error && <p className="ct-error" role="alert">{error}</p>}
            <button type="submit" className="dp-btn dp-btn--primary dp-btn--md ct-submit" disabled={isSubmitting}>
              {isSubmitting ? 'שולח…' : 'שליחה'}
            </button>
          </form>
        </div>
       </div>
      </div>
    </section>
  )
}

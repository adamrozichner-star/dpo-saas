'use client'

// Shared marketing section primitives, reused across every marketing page
// (home, product, ...). Page-agnostic markup + the mk- styles in
// marketing-sections.css. Page-specific visuals stay in each page's own
// component/stylesheet. Keep copy here only for sections that are truly
// identical everywhere (e.g. the responsibility band); pass copy via props
// otherwise.

import { useState } from 'react'
import Link from 'next/link'
import { DeepoIcon, type DeepoIconId } from '@/brand/icons'
import { signupHref } from '@/lib/signup-flag'
import './marketing-sections.css'

export { RadarMotif } from './RadarMotif'

// Centred section heading: mono eyebrow (optional icon) + display h2 + sub.
export function SecHead({
  eyebrow, eyebrowIcon, title, sub,
}: { eyebrow?: string; eyebrowIcon?: DeepoIconId; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mk-sechead">
      {eyebrow && <span className="mk-eyebrow">{eyebrowIcon && <DeepoIcon id={eyebrowIcon} />}{eyebrow}</span>}
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  )
}

// Inline mono eyebrow (for hero / band intros that are not centred SecHeads).
// `pill` renders the bordered hero chip (vision .eyebrow); plain otherwise.
export function Eyebrow({ icon, pill, children }: { icon?: DeepoIconId; pill?: boolean; children: React.ReactNode }) {
  return (
    <span className={`mk-eyebrow${pill ? ' mk-eyebrow--pill' : ''}`}>
      {icon && <DeepoIcon id={icon} />}{children}
    </span>
  )
}

export type FeatureItem = { id: DeepoIconId; title: string; desc: string }
export function FeatureGrid({ items }: { items: FeatureItem[] }) {
  return (
    <div className="mk-cards">
      {items.map((f) => (
        <div className="mk-fcard" key={f.id + f.title}>
          <span className="mk-fcard__ic"><DeepoIcon id={f.id} /></span>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      ))}
    </div>
  )
}

export type StepItem = { n: string; title: string; desc: string }
export function Steps({ items }: { items: StepItem[] }) {
  return (
    <div className="mk-steps__grid" style={{ '--mk-steps': items.length } as React.CSSProperties}>
      {items.map((s) => (
        <div className="mk-step" key={s.n}>
          <div className="mk-step__n">{s.n}</div>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </div>
      ))}
    </div>
  )
}

// The responsibility band - identical wording on every page (spec 2.9), so
// the copy lives here. Overridable via props if a page ever needs to.
export function ResponsibilityBand({
  eyebrow = 'באחריות',
  title = 'התוכנה לא מחליפה אדם. היא מאיצה אותו.',
  body = 'האחריות המקצועית והמשפטית נשארת אצל הממונה האנושי. Deepo נותן לו לעבוד מהר, מדויק ובלי לפספס. אנחנו לא הסמכות המשפטית, אנחנו הכלי שמייעל אותה.',
}: { eyebrow?: string; title?: React.ReactNode; body?: React.ReactNode } = {}) {
  return (
    <section className="mk-resp">
      <div className="mk-wrap">
        <div className="mk-resp__inner">
          <Eyebrow icon="dp-seal">{eyebrow}</Eyebrow>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
    </section>
  )
}

// Dark ember-glow closing CTA. title may include a <span className="mk-grad">.
export function FinalCta({
  title, sub, cta, href, micro, light,
}: { title: React.ReactNode; sub: React.ReactNode; cta: string; href: string; micro?: React.ReactNode; light?: boolean }) {
  return (
    <section className={`mk-finalcta${light ? ' mk-finalcta--light' : ''}`}>
      <div className="mk-finalcta__wrap">
        <h2>{title}</h2>
        <p>{sub}</p>
        <Link href={href} className="dp-btn dp-btn--gradient dp-btn--lg">{cta}</Link>
        {micro && <p className="mk-finalcta__micro">{micro}</p>}
      </div>
    </section>
  )
}

export function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mk-faqitem">
      <button type="button" className="mk-faqitem__q" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className="mk-faqitem__sign" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mk-faqitem__a">{answer}</div>}
    </div>
  )
}

export function TrustSlot({ children }: { children: React.ReactNode }) {
  return <span className="mk-trustslot">{children}</span>
}

// Re-export so pages can build CTAs without a second import line.
export { signupHref }

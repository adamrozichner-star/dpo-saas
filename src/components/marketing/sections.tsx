'use client'

// Shared marketing section primitives, reused across every marketing page
// (home, product, ...). Page-agnostic markup + the mk- styles in
// marketing-sections.css. Page-specific visuals stay in each page's own
// component/stylesheet. Keep copy here only for sections that are truly
// identical everywhere (e.g. the responsibility band); pass copy via props
// otherwise.

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { DeepoIcon, type DeepoIconId } from '@/brand/icons'
import { signupHref } from '@/lib/signup-flag'
import './marketing-sections.css'

export { RadarMotif } from './RadarMotif'

// Centred section heading: mono eyebrow (optional icon) + display h2 + sub.
export function SecHead({
  eyebrow, eyebrowIcon, title, sub,
}: { eyebrow: string; eyebrowIcon?: DeepoIconId; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mk-sechead">
      <span className="mk-eyebrow">{eyebrowIcon && <DeepoIcon id={eyebrowIcon} />}{eyebrow}</span>
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

// Animated "people in the loop" flow variant of Steps (homepage #how).
// An RTL connector links the numbered nodes; a brand pulse and a person
// glyph travel along it on a loop. The reveal stagger is progressive
// enhancement: nodes render visible on the server / with JS off, and only
// arm the hidden-then-reveal behaviour once mounted. All motion (pulse,
// rider, reveal) is disabled under prefers-reduced-motion via CSS.
export function StepsFlow({ items }: { items: StepItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    setArmed(true) // enables the hidden-until-revealed CSS only when JS runs
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect() }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`mk-flow${armed ? ' is-armed' : ''}${shown ? ' is-in' : ''}`}
      style={{ '--mk-steps': items.length } as React.CSSProperties}
    >
      <div className="mk-flow__line" aria-hidden="true">
        <span className="mk-flow__pulse" />
        <span className="mk-flow__rider">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8z" />
          </svg>
        </span>
      </div>
      <ol className="mk-flow__nodes">
        {items.map((s, i) => (
          <li className="mk-flow__node" style={{ '--i': i } as React.CSSProperties} key={s.n}>
            <span className="mk-flow__dot">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Dark ember-glow closing CTA. title may include a <span className="mk-grad">.
export function FinalCta({
  title, sub, cta, href, micro,
}: { title: React.ReactNode; sub: React.ReactNode; cta: string; href: string; micro?: React.ReactNode }) {
  return (
    <section className="mk-finalcta mk-band--dark mk-band--dark--center">
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

'use client'

// Shared marketing header for the (marketing) route group.
// Sticky + blur per the reference .nav; warm logofull lockup top-right
// (RTL), nav per spec section 4, primary CTA "התחילו" + quiet
// "התחברות", and a mobile drawer.
//
// Minimal variant: on conversion pages (lead-signup) a full nav steals
// focus from the form, so we render logo + a quiet "כבר רשומים?
// התחברות" only - no nav, no big CTA. Driven by the current path so the
// (marketing) layout can stay a server component.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signupHref } from '@/lib/signup-flag'

// Primary nav, spec section 4 (RTL order). Targets resolve in later PRs;
// unbuilt routes are expected during the marketing rebuild.
const NAV: Array<{ href: string; label: string }> = [
  { href: '/product', label: 'המוצר' },
  { href: '/pricing', label: 'מחירים' },
  { href: '/partners', label: 'לרואי חשבון' },
  { href: '/about', label: 'מי אנחנו' },
]

// Pages that get the stripped-down header (logo + quiet login only).
const MINIMAL_PATHS = new Set<string>(['/lead-signup'])

export function MarketingHeader() {
  const pathname = usePathname()
  const minimal = MINIMAL_PATHS.has(pathname)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the drawer when navigating to a new path.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const logo = (
    <Link href="/" className="mkt-nav__logo" aria-label="Deepo, לדף הבית">
      <Image src="/brand/logos/logofull.png" alt="Deepo" width={132} height={34} priority />
    </Link>
  )

  if (minimal) {
    return (
      <nav className={`mkt-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="ניווט ראשי">
        <div className="mkt-nav__row">
          {logo}
          <div className="mkt-nav__spacer" />
          <Link href="/login" className="mkt-nav__login">
            כבר רשומים? התחברות
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`mkt-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="ניווט ראשי">
      <div className="mkt-nav__row">
        {logo}
        <div className="mkt-nav__links">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mkt-nav__spacer" />
        <div className="mkt-nav__actions">
          <Link href="/login" className="mkt-nav__login mkt-nav__desktop-only">
            התחברות
          </Link>
          <Link href={signupHref('/register')} className="dp-btn dp-btn--primary dp-btn--md">
            התחילו
          </Link>
          <button
            type="button"
            className="mkt-nav__burger"
            aria-label={open ? 'סגירת התפריט' : 'פתיחת התפריט'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              {open ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className={`mkt-drawer${open ? ' is-open' : ''}`}>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/login">התחברות</Link>
        <Link href={signupHref('/register')} className="dp-btn dp-btn--primary dp-btn--md mkt-drawer__cta">
          התחילו
        </Link>
      </div>
    </nav>
  )
}

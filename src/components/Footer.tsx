// Shared site footer for public marketing pages.
//
// Embeds the site-wide liability disclaimer from PR 6 / Task 6 of the
// site-changes spec. Dropped into the public-facing pages:
//   /, /calculator, /login, /privacy, /terms, /accessibility,
//   /cookie-policy
//
// Intentionally NOT in src/app/layout.tsx — authenticated app surfaces
// (dashboard, chat, settings, expert console, etc.) stay clean per
// scope. If you ever want it site-wide including auth pages, move
// this render into the root layout.

import Link from 'next/link'
import Image from 'next/image'

const LINKS: Array<{ href: string; label: string }> = [
  { href: '/calculator',     label: 'בדיקת חובת DPO' },
  { href: '/login',          label: 'התחברות' },
  { href: '/privacy',        label: 'מדיניות פרטיות' },
  { href: '/terms',          label: 'תנאי שימוש' },
  { href: '/accessibility',  label: 'הצהרת נגישות' },
  { href: '/cookie-policy',  label: 'מדיניות עוגיות' },
]

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-12 px-5" dir="rtl">
      <div className="max-w-6xl mx-auto">

        {/* Top: logo + tagline | links | contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-3">
              <Image src="/logos/deepo-logo-white-512.png" alt="Deepo" width={100} height={31} />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              שירות ממונה הגנת פרטיות חיצוני לעסקים.
              עמידה בתיקון 13 לחוק הגנת הפרטיות בביטחון ובמחיר הוגן.
            </p>
          </div>

          <div className="text-right">
            <h4 className="font-semibold text-white mb-3">קישורים</h4>
            <nav className="flex flex-col gap-2 text-sm text-slate-400">
              {LINKS.map(l => (
                <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="text-right">
            <h4 className="font-semibold text-white mb-3">צרו קשר</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <a
                href="mailto:adamrozichner@gmail.com"
                className="hover:text-white transition-colors"
              >
                adamrozichner@gmail.com
              </a>
              <span>deepo.co.il</span>
            </div>
          </div>
        </div>

        {/* Liability disclaimer — the actual point of this PR. Stays
            on every footer so the assurance is consistent site-wide. */}
        <div className="border-t border-slate-800 pt-6 pb-5">
          <p className="text-xs text-slate-400 leading-relaxed text-center max-w-3xl mx-auto">
            Deepo מספקת כלי תוכנה לתמיכה בעבודת DPO. האחריות המקצועית והמשפטית
            חלה על ה-DPO האנושי הממונה ועל הלקוח. אין באמור באתר משום ייעוץ משפטי.
          </p>
        </div>

        {/* Copyright */}
        <div className="text-sm text-slate-500 text-center">
          © 2026 Deepo. כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  )
}

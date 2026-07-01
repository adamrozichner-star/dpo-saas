// Shared marketing footer for the (marketing) route group.
// Dark Onyx surface with the ember-glow recipe (see marketing-chrome.css).
// Three link groups per spec section 4 + the fixed liability disclaimer
// (spec section 2.9). Logo is logoondark on the dark surface.
//
// Replaces the old @/components/Footer for marketing pages. Routes that are
// not built yet are shown but non-navigating (quiet "בקרוב") so a preview
// reviewer never hits a 404; remove an entry from COMING_SOON once it ships.

import Link from 'next/link'
import Image from 'next/image'

type FooterLink = { href: string; label: string }

const COMING_SOON = new Set<string>(['/privacy-israel', '/about', '/security', '/press', '/faq'])

const GROUPS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'ניווט',
    links: [
      { href: '/product', label: 'המוצר' },
      { href: '/privacy-israel', label: 'פרטיות בישראל' },
      { href: '/about', label: 'הצוות האנושי' },
    ],
  },
  {
    title: 'מידע',
    links: [
      { href: '/security', label: 'אבטחת מידע' },
      { href: '/press', label: 'בתקשורת' },
      { href: '/faq', label: 'שאלות ותשובות' },
      { href: '/contact', label: 'צרו קשר' },
    ],
  },
  {
    title: 'משפטי',
    links: [
      { href: '/privacy', label: 'מדיניות פרטיות' },
      { href: '/terms', label: 'תנאי שימוש' },
      { href: '/accessibility', label: 'הצהרת נגישות' },
      { href: '/cookie-policy', label: 'מדיניות עוגיות' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer__wrap">
        <div className="mkt-footer__top">
          <div className="mkt-footer__brand">
            <Image src="/brand/logos/logoondark.png" alt="Deepo" width={124} height={32} />
            <p className="mkt-footer__tag">
              הגנת פרטיות מקצועית לכל עסק, במחיר נגיש. אנחנו דואגים שתעמדו בדרישות החוק. נבנה בישראל.
            </p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.title} className="mkt-footer__col" aria-label={group.title}>
              <b>{group.title}</b>
              {group.links.map((link) =>
                COMING_SOON.has(link.href) ? (
                  <span key={link.href} className="mkt-footer__soon" aria-disabled="true">
                    {link.label}<small>בקרוב</small>
                  </span>
                ) : (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>

        <div className="mkt-footer__disclaimer">
          <p>
            Deepo מספקת כלי תוכנה לתמיכה בעבודת מומחה פרטיות ואבטחת מידע. האחריות
            המקצועית והמשפטית חלה על המומחה האנושי הממונה ועל הלקוח. אין באמור באתר משום ייעוץ משפטי.
          </p>
        </div>

        <div className="mkt-footer__bottom">
          <span>© 2026 Deepo. כל הזכויות שמורות.</span>
          <span>נבנה בישראל</span>
        </div>
      </div>
    </footer>
  )
}

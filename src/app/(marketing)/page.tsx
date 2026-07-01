'use client'

// Homepage body. Warm-brand v3 voice. Chrome, scope, fonts and the brand
// layer come from PR1/PR2 and are not touched here. Page-agnostic section
// primitives come from the shared marketing module (PR4 refactor); only the
// homepage-bespoke pieces (split hero, dashboard preview, inline calculator,
// trust strip, experts, security teaser, comparison + pricing tables) live
// in this file + home.css. Section order follows spec section 9.

import { useState } from 'react'
import Link from 'next/link'
import { DeepoIcon } from '@/brand/icons'
import { Badge } from '@/components/brand/Badge'
import {
  RadarMotif, SecHead, FeatureGrid, Steps, FinalCta, FaqItem,
  type FeatureItem, type StepItem,
} from '@/components/marketing/sections'
import { SectionNav, scrollToId } from '@/components/marketing/SectionNav'
import { calcExposure, fmtNis, type SizeKey, type Tri } from '@/lib/exposureCalc'
import { signupHref } from '@/lib/signup-flag'
import './home.css'

// Slots that ship empty until real content is cleared (spec 2.11 / 12).
const PRESS_ITEMS: Array<{ outlet: string; headline: string; href: string }> = []
// Exposure calculator is live per Adam (2026-07-01); Roy reviews the penalty
// figures against the live page. Modeling assumptions documented in
// lib/exposureCalc.ts. Flip to false to pull it if Roy flags a figure.
const SHOW_EXPOSURE_CALC = true

// ============================================================
// EXPOSURE CALCULATOR - תיקון 13 financial exposure (עיצומים).
// Logic lives in @/lib/exposureCalc (Roy-traced figures). Gated behind
// SHOW_EXPOSURE_CALC (below) until Roy signs off. Numbers stay LTR inside
// the RTL layout via <bdi>.
// ============================================================
// LTR-isolated money so ₪ + digits read correctly inside RTL text.
function Nis({ value }: { value: number }) {
  return <bdi className="hp-ltr">{fmtNis(value)}</bdi>
}

function ExposureCalculator() {
  const [size, setSize] = useState<SizeKey>('tiny')
  const [sensitive, setSensitive] = useState(false)
  const [reg, setReg] = useState<Tri>('none')
  const [sec, setSec] = useState<Tri>('none')
  const [show, setShow] = useState(false)

  if (show) {
    const r = calcExposure({ size, sensitive, reg, sec })
    const zero = r.headline === 0
    return (
      <div className="hp-mini hp-exp">
        <span className="hp-exp__eyebrow">הערכת חשיפה · תיקון 13</span>

        {zero ? (
          <>
            <p className="hp-exp__headline hp-exp__headline--ok"><bdi className="hp-ltr">₪0</bdi> חשיפה פתוחה</p>
            <p className="hp-exp__sub">ככה נראה עסק מוגן. זה בדיוק מה ש-Deepo שומרת עליו.</p>
          </>
        ) : (
          <>
            <p className="hp-exp__headline"><Nis value={r.headline} /></p>
            <p className="hp-exp__sub">חשיפה כספית פתוחה בעיצומים מנהליים, כרגע.</p>
          </>
        )}

        <p className="hp-exp__ceiling">התקרה החוקית לחשיפה שלכם: <Nis value={r.ceiling} /> (כולל עיצומים לפי מספר אנשים).</p>

        {r.doubled && (
          <span className="hp-exp__badge">מעל מיליון נושאי מידע · כל העיצומים מוכפלים</span>
        )}

        <ul className="hp-exp__breakdown">
          {r.core.map((b) => (
            <li key={b.id} className="hp-exp__row">
              <span className={`hp-exp__dot ${b.open ? 'hp-exp__dot--open' : 'hp-exp__dot--ok'}`} aria-hidden="true" />
              <span className="hp-exp__row-label">{b.label}<small>{b.ref}</small></span>
              <span className="hp-exp__row-amt">{b.open ? <Nis value={b.amount} /> : <span className="hp-exp__covered">מכוסה</span>}</span>
            </li>
          ))}
        </ul>

        <div className="hp-exp__esc">
          <p className="hp-exp__esc-head">וזה מטפס לפי מספר האנשים:</p>
          {r.escalators.map((b) => (
            <p key={b.id} className="hp-exp__esc-row">{b.label}: עד <Nis value={b.amount} /> · {b.ref}</p>
          ))}
        </div>

        {r.criminal && (
          <div className="hp-exp__criminal">
            וזה לא רק כסף: תיקון 13 קובע גם עבירות פליליות אישיות, עד 3 שנות מאסר, על מי שאחראי במאגר.
          </div>
        )}

        <p className="hp-exp__civil">בנוסף, בית משפט רשאי לפסוק פיצוי של עד <Nis value={r.civilPerPerson} /> לכל אדם, ללא הוכחת נזק.</p>

        <p className="hp-exp__disclaimer">הערכה כללית בלבד, מבוססת על סכומי העיצום שפרסמה הרשות להגנת הפרטיות. אינה חוות דעת משפטית.</p>

        <div className="hp-mini__actions">
          <Link href="/contact" className="dp-btn dp-btn--gradient dp-btn--md">רוצים לאפס את החשיפה? דברו איתנו ←</Link>
          <button type="button" className="hp-mini__reset" onClick={() => setShow(false)}>בדיקה מחדש</button>
        </div>
      </div>
    )
  }

  return (
    <div className="hp-mini">
      <h3 className="hp-mini__title">הערכת חשיפה לפי תיקון 13</h3>
      <p className="hp-mini__sub">ארבע שאלות קצרות, בלי להשאיר פרטים.</p>

      <div className="hp-q">
        <span className="hp-q__label">כמה אנשים המידע שלכם נוגע אליהם?</span>
        <div className="hp-chips hp-chips--1">
          {([['tiny', 'עד 1,000'], ['small', '1,000–10,000'], ['mid', '10,000–100,000'], ['large', '100,000 עד מיליון'], ['xlarge', 'מעל מיליון']] as Array<[SizeKey, string]>).map(([v, t]) => (
            <button key={v} type="button" className="hp-chip" aria-pressed={size === v} onClick={() => setSize(v)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="hp-q">
        <span className="hp-q__label">איזה סוג מידע אתם מחזיקים?</span>
        <div className="hp-chips hp-chips--1">
          {([[false, 'מידע רגיל (שם, טלפון, כתובת)'], [true, 'מידע רגיש (בריאות, פיננסי, ביומטרי, מיקום ועוד)']] as Array<[boolean, string]>).map(([v, t]) => (
            <button key={String(v)} type="button" className="hp-chip" aria-pressed={sensitive === v} onClick={() => setSensitive(v)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="hp-q">
        <span className="hp-q__label">מה מצב הרישום והמסמכים שלכם מול הרשות?</span>
        <div className="hp-chips hp-chips--1">
          {([['none', 'לא טיפלנו, או לא בטוחים'], ['partial', 'התחלנו, חלק מהמסמכים קיים'], ['full', 'הכל רשום, מסודר ומעודכן']] as Array<[Tri, string]>).map(([v, t]) => (
            <button key={v} type="button" className="hp-chip" aria-pressed={reg === v} onClick={() => setReg(v)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="hp-q">
        <span className="hp-q__label">מה מצב אבטחת המידע בעסק?</span>
        <div className="hp-chips hp-chips--1">
          {([['none', 'אין נהלים ובקרות מסודרים'], ['partial', 'חלקי, לא מתועד במלואו'], ['full', 'נהלים, בקרות ותיעוד מלאים']] as Array<[Tri, string]>).map(([v, t]) => (
            <button key={v} type="button" className="hp-chip" aria-pressed={sec === v} onClick={() => setSec(v)}>{t}</button>
          ))}
        </div>
      </div>

      <button type="button" className="dp-btn dp-btn--primary dp-btn--md" onClick={() => setShow(true)}>בדיקה</button>
    </div>
  )
}

const FEATURES: FeatureItem[] = [
  { id: 'dp-seal', title: 'ממונה אנושי שאחראי עליכם', desc: 'אנחנו ממנים עליכם ממונה הגנת פרטיות מוסמך (מחבילה מומלצת ומעלה). הוא נושא באחריות, אתם ישנים בשקט.' },
  { id: 'dp-doc', title: 'המסמכים, מוכנים', desc: 'אנחנו מכינים לכם מדיניות פרטיות, נוהלי אבטחה וכתב מינוי, ומעדכנים אותם כשמשהו משתנה. אתם רק מאשרים.' },
  { id: 'dp-sparkle', title: 'עוזר חכם, מסביב לשעון', desc: 'שואלים אותי בשפה רגילה, ואני עונה ומכין את המסמך. מה שצריך אדם, אני מעביר לממונה בלחיצה.' },
  { id: 'dp-bell', title: 'תזכורות לפני שצריך', desc: 'אנחנו שמים לב למה שמתקרב - חידושים, ספקים חדשים, בקרות - ומזכירים לכם בזמן.' },
  { id: 'dp-radar', title: 'ציון עמידה, בזמן אמת', desc: 'אנחנו מראים לכם בדיוק מה כבר מסודר ומה נשאר, עם קישור ישיר לכל פעולה.' },
  { id: 'dp-database', title: 'יומן מסודר לכל פעולה', desc: 'אנחנו מתעדים כל שינוי אוטומטית. אם הרשות שואלת, התשובה כבר מוכנה.' },
]

const STEPS: StepItem[] = [
  { n: '1', title: 'נרשמים ועונים על כמה שאלות', desc: 'זה כל מה שצריך מכם. חמש דקות ואתם בפנים.' },
  { n: '2', title: 'אנחנו דואגים לכל השאר', desc: 'מסמכים, ממונה מוסמך, ניטור ותזכורות. אתם רגועים.' },
]

const EXPERTS: Array<{ id: 'dp-seal' | 'dp-shield' | 'dp-sparkle'; title: string; desc: string }> = [
  { id: 'dp-seal', title: 'ממונים מוסמכים', desc: 'ממונה הגנת פרטיות שמתמנה על העסק ונושא באחריות המקצועית.' },
  { id: 'dp-shield', title: 'ליווי משפטי', desc: 'עורכי דין מנוסים שעומדים מאחורי התוכן והנהלים.' },
  { id: 'dp-sparkle', title: 'צוות מוצר', desc: 'בונים את הכלים שעושים את העבודה הקשה במקומכם.' },
]

// Pricing: monthly + annual (annual = two months free, ~17% off; placeholder
// figures pending Adam/Roy sign-off, same gate as the comparison numbers).
type Plan = {
  tier: string; desc: string; monthly: string; annual: string; custom?: boolean;
  was: string; featured: boolean; cta: string; href: string;
  variant: 'secondary' | 'gradient'; feats: string[];
}
const PLANS: Plan[] = [
  {
    tier: 'בסיסית', desc: 'ניהול פרטיות עצמאי, בלי ממונה.', monthly: '₪1,000', annual: '₪833',
    was: 'במקום ₪8,000+ אצל עו"ד', featured: false, cta: 'זה מתאים לי', href: signupHref('/register?plan=basic'), variant: 'secondary',
    feats: ['כל היכולות של Deepo', 'מסמכים אוטומטיים', 'עוזר חכם מסביב לשעון', 'לוח וציון עמידה', 'המלצות עמידה (לא מחייבות)', 'תמיכה במייל'],
  },
  {
    tier: 'מומלצת', desc: 'כולל ממונה מוסמך. מומלצת לעסקים קטנים ובינוניים.', monthly: '₪1,499', annual: '₪1,249',
    was: 'במקום ₪3,000-8,000 אצל יועץ', featured: true, cta: 'יאללה, מתחילים', href: signupHref('/register?plan=recommended'), variant: 'gradient',
    feats: ['כל מה שבבסיסית', 'ממונה מוסמך שמתמנה עליכם', 'סקירה רבעונית מהממונה', 'עד 2 פניות לממונה בחודש', 'ליווי באירוע אבטחה', 'תמיכה טלפונית'],
  },
  {
    tier: 'פרימיום', desc: 'לארגונים עם דרישות מורכבות.', monthly: '₪7,500', annual: '₪6,250',
    was: 'ליווי מקצועי צמוד', featured: false, cta: 'זה מתאים לי', href: signupHref('/register?plan=premium'), variant: 'secondary',
    feats: ['כל מה שבמומלצת', 'שעתיים ממונה בחודש', 'סקירה חודשית', 'הדרכת עובדים רבעונית', 'DPIA מלא כלול', 'זמן תגובה: 4 שעות'],
  },
  {
    tier: 'ארגונית', desc: 'למספר חברות או דרישות רגולציה מורכבות.', monthly: 'בהתאמה', annual: 'בהתאמה', custom: true,
    was: 'תמחור מותאם אישית', featured: false, cta: 'דברו איתנו', href: '/contact', variant: 'secondary',
    feats: ['כל מה שבפרימיום', 'SLA מובטח', 'הטמעה ייעודית', 'התאמה מלאה לארגון'],
  },
]

// Pricing block with a monthly/annual billing toggle, the struck-through
// (now free) setup fee, and the partnerships / member-discount bar (B3).
function PricingBlock() {
  const [annual, setAnnual] = useState(true)
  return (
    <>
      <div className="hp-billtoggle" role="group" aria-label="בחירת מחזור חיוב">
        <button type="button" className={`hp-billtoggle__opt${!annual ? ' is-active' : ''}`} aria-pressed={!annual} onClick={() => setAnnual(false)}>חודשי</button>
        <button type="button" className={`hp-billtoggle__opt${annual ? ' is-active' : ''}`} aria-pressed={annual} onClick={() => setAnnual(true)}>
          שנתי <span className="hp-billtoggle__save">חודשיים במתנה</span>
        </button>
      </div>

      <p className="hp-setupfee">
        דמי הקמה חד-פעמיים: <s>₪30,000</s> <b>חינם.</b>
      </p>

      <div className="hp-pcards">
        {PLANS.map((p) => (
          <div className={`hp-pcard${p.featured ? ' hp-pcard--featured' : ''}`} key={p.tier}>
            {p.featured && <span className="hp-pcard__flag">הכי פופולרי</span>}
            <span className="hp-pcard__tier">{p.tier}</span>
            <p className="hp-pcard__desc">{p.desc}</p>
            <div>
              <span className="hp-pcard__amt">{annual ? p.annual : p.monthly}{!p.custom && <small> / חודש</small>}</span>
            </div>
            {!p.custom && (
              <p className="hp-pcard__bill">{annual ? 'בחיוב שנתי · חסכון של חודשיים' : 'בחיוב חודשי · בלי התחייבות'}</p>
            )}
            <p className="hp-pcard__was">{p.was}</p>
            <ul>
              {p.feats.map((f) => (
                <li key={f}><DeepoIcon id="dp-check" /> {f}</li>
              ))}
            </ul>
            <Link href={p.href} className={`dp-btn dp-btn--${p.variant} dp-btn--md`}>{p.cta}</Link>
          </div>
        ))}
      </div>

      {/* Partnerships / member-discount bar (B3). Names as text placeholders;
          logos pending clearance (same gate as press clippings). */}
      <div className="hp-partners">
        <span className="hp-partners__lab">בשיתוף</span>
        <div className="hp-partners__row">
          <span className="hp-partner">איגוד השמאים</span>
          <span className="hp-partner">איגוד רואי החשבון</span>
          <span className="hp-partner">Morning</span>
        </div>
        <p className="hp-partners__code">חברי הארגונים מקבלים קוד הנחה ייעודי בהרשמה.</p>
      </div>
    </>
  )
}

// ============================================================
// PAGE
// ============================================================
export default function HomePage() {
  return (
    <div className="hp">

      {/* 1 - RADAR HERO. Dark onyx surface (B2) with ember glow, the lower-LEFT
          RadarMotif rings, and the white dashboard preview floating on top. */}
      <section className="hp-hero hp-hero--dark mk-mesh">
        <RadarMotif className="hp-hero__radar" size={820} />
        <div className="mk-wrap hp-hero__grid">
          <div>
            <h1>הגנת פרטיות מקצועית, <span className="mk-grad">במחיר נגיש לכולם</span></h1>
            <p className="hp-hero__lede">
              אנחנו עוזרים לך לעמוד בדרישות חוק הפרטיות. סוכני AI ייעודיים עובדים 24/7,
              ומאחוריהם צוות מומחי פרטיות ואבטחת מידע מנוסה. אתם בעסק, אנחנו על המשמר.
            </p>
            <div className="mk-ctas">
              <Link href={signupHref('/register')} className="dp-btn dp-btn--gradient dp-btn--lg">התחילו עכשיו</Link>
              <a href="#how" className="dp-btn dp-btn--secondary dp-btn--lg" onClick={(e) => { e.preventDefault(); scrollToId('how') }}>איך זה עובד</a>
            </div>
            <p className="hp-hero__micro">בלי עלות הקמה · עומדים בדרישות תוך ימים</p>
          </div>

          {/* dashboard preview (illustrative, not a screenshot) */}
          <div className="hp-preview">
            <div className="hp-dash" role="img" aria-label="תצוגה של לוח הגנת הפרטיות עם ציון עמידה">
              <div className="hp-dash__head">
                <span className="hp-dash__dot"><DeepoIcon id="dp-shield" /></span>
                <b>לוח הגנת הפרטיות</b>
                <Badge variant="ok" dot>מוגן</Badge>
              </div>
              <div className="hp-score">
                <span className="hp-score__n">98%</span>
                <span className="hp-score__lab">ציון עמידה בדרישות<br />עודכן לפני 4 דקות</span>
              </div>
              <div className="hp-rows">
                <div className="hp-drow"><DeepoIcon id="dp-doc" style={{ '--dpi-c': 'var(--status-ok)' } as React.CSSProperties} /><span className="hp-drow__t">מדיניות פרטיות</span><Badge variant="ok">פעיל</Badge></div>
                <div className="hp-drow"><DeepoIcon id="dp-link" style={{ '--dpi-c': 'var(--status-warn)' } as React.CSSProperties} /><span className="hp-drow__t">2 ספקים חדשים</span><Badge variant="warn">בטיפול</Badge></div>
                <div className="hp-drow"><DeepoIcon id="dp-radar" style={{ '--dpi-c': 'var(--status-ok)' } as React.CSSProperties} /><span className="hp-drow__t">בקרה רבעונית</span><Badge variant="ok">מתוזמן</Badge></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary one-pager anchor nav (B2): smooth-scroll to sections. */}
      <SectionNav />

      {/* 2 - EXPOSURE CALCULATOR (gated on SHOW_EXPOSURE_CALC, Roy sign-off). */}
      {SHOW_EXPOSURE_CALC && (
        <section className="mk-section mk-band--sand" id="calculator">
          <div className="mk-wrap hp-calc__grid">
            <div className="hp-calc__copy">
              <h2>כמה כסף חשוף אצלכם, כרגע?</h2>
              <p>ארבע שאלות קצרות, והערכת חשיפה כספית לעיצומים לפי תיקון 13. בלי להשאיר פרטים, בלי התחייבות.</p>
            </div>
            <ExposureCalculator />
          </div>
        </section>
      )}

      {/* 3 - WHAT YOU GET (dark) */}
      <section className="mk-section hp-features-dark" id="features">
        <div className="mk-wrap">
          <SecHead title="אתם מתרכזים בעסק. אנחנו דואגים לפרטיות" sub="כל מה שתיקון 13 דורש קורה ברקע, בשפה שמבינים, בלי קבלנים חיצוניים ובלי הטמעה ארוכה." />
          <FeatureGrid items={FEATURES} />
        </div>
      </section>

      {/* 4 - HOW IT WORKS (hero "איך זה עובד" CTA anchors here) */}
      <section className="mk-section mk-band--sand" id="how">
        <div className="mk-wrap">
          <SecHead title={<>איך מתחילים?<br />נרשמים ב 5 דקות<br />(פחות ממה שלוקח לילד להסביר לאמא על פרטיות)</>} />
          <Steps items={STEPS} />
          <p className="hp-afterline">בשעות הקרובות תקבלו קפיצה מאוד גדולה בהגנת הפרטיות</p>
        </div>
      </section>

      {/* 5 - LEGALESE -> ACTION ITEMS (warm reassurance) */}
      <section className="mk-section">
        <div className="mk-wrap hp-legalese">
          <div className="hp-legalese__copy">
            <h2>אין לך יועץ משפטי צמוד? הכל טוב</h2>
            <p>אנחנו מתרגמים את השפה המשפטית לרשימת פעולות פשוטה, וסוגרים אותה בשבילכם. בקלות.</p>
          </div>
          <div className="hp-legalese__flow">
            <div className="hp-legalese__from">
              <span className="hp-legalese__tag">בשפה משפטית</span>
              <p>&quot;בעל מאגר מידע ימנה ממונה על הגנת הפרטיות ויישם אמצעי אבטחה ההולמים את רמת האבטחה הנדרשת&hellip;&quot;</p>
            </div>
            <span className="hp-legalese__arrow"><DeepoIcon id="dp-bolt" /></span>
            <div className="hp-legalese__to">
              <span className="hp-legalese__tag hp-legalese__tag--ok">מה שאנחנו עושים בשבילכם</span>
              <ul>
                <li><DeepoIcon id="dp-check" /> ממנים לכם מומחה מוסמך</li>
                <li><DeepoIcon id="dp-check" /> מגדירים את אמצעי האבטחה</li>
                <li><DeepoIcon id="dp-check" /> אתם רק מסמנים וי</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5b - TEASER STRIP -> /privacy-israel (links OUT to the page) */}
      <section className="mk-section--tight">
        <div className="mk-wrap">
          <Link href="/privacy-israel" className="hp-teaser">
            <span className="hp-teaser__ic"><DeepoIcon id="dp-shield" /></span>
            <span className="hp-teaser__text">
              <b>פרטיות בישראל: מאיפה זה בא, ולמה עכשיו יש לזה שיניים</b>
              <span>ההיסטוריה, המושגים והחובות שלכם, בשפה פשוטה.</span>
            </span>
            <span className="hp-teaser__more">לפרטים נוספים ←</span>
          </Link>
        </div>
      </section>

      {/* 6 - EXPERTS (dark) */}
      <section className="mk-section hp-experts-dark">
        <div className="mk-wrap">
          <SecHead title="אנשים אמיתיים מאחורי הטכנולוגיה" sub="צוות של עורכי דין ויועצי פרטיות מנוסים, וממונים מוסמכים שנכנסים לתפקיד אצלכם." />
          <div className="hp-experts__grid">
            {EXPERTS.map((e) => (
              <div className="hp-expert" key={e.id}>
                <span className="hp-expert__ic"><DeepoIcon id={e.id} /></span>
                <h3>{e.title}</h3>
                <p>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6b - TEASER STRIP -> /product (links OUT to the page) */}
      <section className="mk-section--tight">
        <div className="mk-wrap">
          <Link href="/product" className="hp-teaser">
            <span className="hp-teaser__ic"><DeepoIcon id="dp-sparkle" /></span>
            <span className="hp-teaser__text">
              <b>איך Deepo עובד, לעומק</b>
              <span>הלולאה המלאה, מי נוגע במה, וכל היכולות במקום אחד.</span>
            </span>
            <span className="hp-teaser__more">לפרטים נוספים ←</span>
          </Link>
        </div>
      </section>

      {/* 9a - COMPARISON (dark, ember-glow) */}
      <section className="hp-compare" id="compare">
        <div className="mk-wrap hp-compare__wrap">
          <h2>אותה הגנה<br />עלות נמוכה ב-85%</h2>
          <div className="hp-ctable">
            <div className="hp-ccol hp-ccol--old">
              <p className="hp-ccol__name">מומחה חיצוני קלאסי</p>
              <p className="hp-ccol__price">~₪66,000<small> / שנה ראשונה</small></p>
              <ul>
                <li><DeepoIcon id="dp-x" /> ~₪30,000 עלות הקמה</li>
                <li><DeepoIcon id="dp-x" /> ₪3,000-6,000 לחודש</li>
                <li><DeepoIcon id="dp-x" /> פגישות תקופתיות בלבד</li>
                <li><DeepoIcon id="dp-x" /> תבניות גנריות</li>
              </ul>
            </div>
            <div className="hp-ccol hp-ccol--new">
              <p className="hp-ccol__name">Deepo</p>
              <p className="hp-ccol__price">החל מ-₪12,000<small> / שנה ראשונה</small></p>
              <ul>
                <li><DeepoIcon id="dp-check" /> ₪0 עלות הקמה</li>
                <li><DeepoIcon id="dp-check" /> החל מ-₪1,000 לחודש</li>
                <li><DeepoIcon id="dp-check" /> ניטור רציף, מסביב לשעון</li>
                <li><DeepoIcon id="dp-check" /> מותאם לעסק שלכם</li>
              </ul>
              {/* NOTE(review): ~85% is computed off the entry tier; reference still shows
                  stale 500/1000 pricing (spec 12). Confirm the exact headline figure with Adam. */}
              <span className="hp-savetag">עד כ-85% פחות, בשנה הראשונה</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9b - PRICING (live tiers, spec 11) */}
      <section className="mk-section" id="pricing">
        <div className="mk-wrap">
          <SecHead title="תמחור הוגן, בלי הפתעות" sub="החוק שווה לכולם, אז הכלים לעמוד בו צריכים להיות נגישים לכולם." />
          <PricingBlock />
        </div>
      </section>

      {/* 11 - FAQ */}
      <section className="mk-section mk-band--sand" id="faq">
        <div className="mk-wrap">
          <SecHead title={<>מה שכולם שואלים<br />(וכמה דברים שמתביישים לשאול)</>} />
          <div className="mk-faq">
            <FaqItem question="מה זה מומחה פרטיות ואבטחת מידע, ולמה שיהיה לי אחד?" answer="זה ממונה הגנת הפרטיות - האדם שאחראי על שמירת המידע בעסק. החוק מחייב מינוי ממונה לעסקים שמחזיקים מידע על הרבה אנשים, מטפלים במידע רגיש, או עוקבים אחרי משתמשים. נשמע מסובך, זו בעצם רשימת דברים מסודרת שצריך לעשות - ואנחנו עושים אותם." />
            <FaqItem question="הממונה הוא באמת בן אדם?" answer="כן, לגמרי. אדם מוסמך שמתמנה רשמית על העסק שלכם. Deepo עושה את רוב העבודה השוטפת, והממונה זמין לשאלות המורכבות ונושא באחריות המקצועית." />
            <FaqItem question="ומה אם פשוט לא ממנים ממונה?" answer="יש אכיפה ויש קנסות, לא נפרט אותם פה כדי להלחיץ. נפרט דווקא מה צריך לעשות כדי להיות בצד הנכון - וזה לוקח חמש דקות להתחיל." />
            <FaqItem question="המסמכים באמת מספיקים לרשות?" answer="הם נכתבים לפי דרישות תיקון 13 ונבדקים על ידי הממונה המוסמך: מדיניות פרטיות, נוהלי אבטחה, כתב מינוי וכל מה שצריך להציג בבדיקה." />
            <FaqItem question="אפשר לבטל?" answer="בכל רגע, בלי דמי ביטול ובלי התחייבות. (כן, באמת.)" />
            <FaqItem question="זה מחליף עורך דין?" answer="לא. Deepo מסדר את העמידה השוטפת בדרישות חוק הפרטיות, ולצדו ממונה מוסמך. לסוגיות משפטיות נקודתיות תמיד אפשר להיעזר בעורך דין, ואנחנו גם מציעים חוות דעת משפטית כתוספת." />
            <FaqItem question="מה אתם עושים עם המידע שלי?" answer={<>כמה שפחות. אנחנו לא שומרים את פרטי הלקוחות שלכם, ניגשים רק למה שנדרש, ומתעדים הכול. <Link href="/security">כך אנחנו שומרים על המידע</Link>.</>} />
            <FaqItem question="אני רואה חשבון. איך זה עובד מול הלקוחות שלי?" answer={<>אפשר להציע את Deepo ללקוחות שלכם וליהנות מקו הכנסה חוזר, בזמן שהם נשארים מסודרים. <Link href="/contact">דברו איתנו</Link>.</>} />
          </div>
        </div>
      </section>

      {/* 12 - PRESS STRIP (hidden while empty) */}
      {PRESS_ITEMS.length > 0 && (
        <section className="mk-section--tight">
          <div className="mk-wrap">
            <SecHead eyebrow="בתקשורת" title="מדברים עלינו." />
          </div>
        </section>
      )}

      {/* 13 - FINAL CTA (shared, dark ember-glow) */}
      <FinalCta
        title={<>אתם בעסק<br /><span className="mk-grad">אנחנו על המשמר</span></>}
        sub="אנחנו דואגים שתעמדו בתיקון 13, בלי כאב ראש ובמחיר שכל עסק יכול. נתחיל?"
        cta="התחילו"
        href={signupHref('/register')}
        micro="הקמה בחמש דקות · אנחנו דואגים לכל השאר"
      />

    </div>
  )
}

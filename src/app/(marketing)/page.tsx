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
import { Button } from '@/components/brand/Button'
import { Badge } from '@/components/brand/Badge'
import {
  RadarMotif, SecHead, Eyebrow, FeatureGrid, Steps, FinalCta, FaqItem,
  type FeatureItem, type StepItem,
} from '@/components/marketing/sections'
import { signupHref } from '@/lib/signup-flag'
import './home.css'

// Slots that ship empty until real content is cleared (spec 2.11 / 12).
const PRESS_ITEMS: Array<{ outlet: string; headline: string; href: string }> = []
const SHOW_TESTIMONIAL_SLOT = true

// ============================================================
// MINI CALCULATOR - illustrative DPO check (logic gated on Roy)
// ============================================================
function MiniCalculator() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResult, setShowResult] = useState(false)

  const select = (q: string, val: string) => setAnswers((prev) => ({ ...prev, [q]: val }))
  const calculate = () => { if (answers.q1 && answers.q2) setShowResult(true) }

  // TODO(roy-gate): provisional heuristic only. The real תיקון 13 decision
  // tree is owned by Roy and not finalized; this stays illustrative and must
  // not be presented as a definitive legal determination (spec 2.10).
  const isRequired = () => {
    const hasData = answers.q2 === 'yes'
    const hasSensitive = answers.q3 === 'yes' || answers.q3 === 'maybe'
    const bigTeam = answers.q1 === '51-250' || answers.q1 === '250+'
    return hasData || hasSensitive || bigTeam
  }

  if (showResult) {
    const required = isRequired()
    return (
      <div className="hp-mini">
        <div className={`hp-mini__result ${required ? 'hp-mini__result--yes' : 'hp-mini__result--no'}`}>
          <DeepoIcon id={required ? 'dp-seal' : 'dp-check'} />
          {required ? (
            <>
              <h3>סביר שאתם צריכים למנות ממונה</h3>
              <p>לפי התשובות, תיקון 13 כנראה חל עליכם. זה לא אסון, זו רשימת מטלות מסודרת. בואו נסמן וי.</p>
            </>
          ) : (
            <>
              <h3>ייתכן שאתם פטורים כרגע</h3>
              <p>כדאי לאמת עם הבדיקה המלאה, שלוקחת עוד כמה דקות.</p>
            </>
          )}
        </div>
        <div className="hp-mini__actions">
          {required ? (
            <Link href={signupHref('/register')} className="dp-btn dp-btn--primary dp-btn--md">יאללה, מתחילים</Link>
          ) : (
            <Link href="/calculator" className="dp-btn dp-btn--primary dp-btn--md">לבדיקה המלאה</Link>
          )}
          <button type="button" className="hp-mini__reset" onClick={() => { setShowResult(false); setAnswers({}) }}>
            בדיקה מחדש
          </button>
        </div>
      </div>
    )
  }

  const Q = ({ q, label, opts, cols }: { q: string; label: string; opts: Array<[string, string]>; cols: 2 | 3 }) => (
    <div className="hp-q">
      <span className="hp-q__label">{label}</span>
      <div className={`hp-chips hp-chips--${cols}`}>
        {opts.map(([val, text]) => (
          <button key={val} type="button" className="hp-chip" aria-pressed={answers[q] === val} onClick={() => select(q, val)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="hp-mini">
      <h3 className="hp-mini__title">בדיקת חובת DPO</h3>
      <p className="hp-mini__sub">שלוש שאלות קצרות, בלי להשאיר פרטים.</p>
      <Q q="q1" label="כמה עובדים בעסק?" cols={2} opts={[['עד 10', 'עד 10'], ['11-50', '11-50'], ['51-250', '51-250'], ['250+', '250+']]} />
      <Q q="q2" label="אתם מחזיקים מידע על לקוחות?" cols={2} opts={[['yes', 'כן'], ['no', 'לא']]} />
      <Q q="q3" label="יש מידע רגיש (בריאות, ילדים, ביומטרי)?" cols={3} opts={[['yes', 'כן'], ['no', 'לא'], ['maybe', 'לא בטוח']]} />
      <Button variant="primary" onClick={calculate} disabled={!answers.q1 || !answers.q2}>בדיקה</Button>
    </div>
  )
}

// Vision pillar cards - copy lifted verbatim from the reference FEATURES
// block (deepo-brand/reference/marketing-reference-he.html). DOM order
// matches the reference exactly (shield -> radar -> sparkle).
const PILLARS: FeatureItem[] = [
  { id: 'dp-shield', title: 'שומרים עליכם', desc: 'מגנים מפני חשיפה: מול הרשות להגנת הפרטיות ומול תביעות. כל מה שהחוק דורש מהעסק, כבר טיפלנו בו.' },
  { id: 'dp-radar', title: 'פרואקטיביים', desc: 'תמיד צעד לפני הרגולציה. עובדים ברקע ומטפלים בדברים לפני שאתם בכלל מרגישים בהם.' },
  { id: 'dp-sparkle', title: 'סוכני AI ייעודיים', desc: 'סוכני AI ייעודיים עובדים 24/7. אתם רק מחליטים, ומאשרים בלחיצה.' },
]

const FEATURES: FeatureItem[] = [
  { id: 'dp-seal', title: 'ממונה אנושי שאחראי עליכם', desc: 'אנחנו ממנים עליכם ממונה הגנת פרטיות מוסמך (מחבילה מומלצת ומעלה). הוא נושא באחריות, אתם ישנים בשקט.' },
  { id: 'dp-doc', title: 'המסמכים, מוכנים', desc: 'אנחנו מכינים לכם מדיניות פרטיות, נוהלי אבטחה וכתב מינוי, ומעדכנים אותם כשמשהו משתנה. אתם רק מאשרים.' },
  { id: 'dp-sparkle', title: 'עוזר חכם, מסביב לשעון', desc: 'שואלים אותי בשפה רגילה, ואני עונה ומכין את המסמך. מה שצריך אדם, אני מעביר לממונה בלחיצה.' },
  { id: 'dp-bell', title: 'תזכורות לפני שצריך', desc: 'אנחנו שמים לב למה שמתקרב - חידושים, ספקים חדשים, בקרות - ומזכירים לכם בזמן.' },
  { id: 'dp-radar', title: 'ציון עמידה, בזמן אמת', desc: 'אנחנו מראים לכם בדיוק מה כבר מסודר ומה נשאר, עם קישור ישיר לכל פעולה.' },
  { id: 'dp-database', title: 'יומן מסודר לכל פעולה', desc: 'אנחנו מתעדים כל שינוי אוטומטית. אם הרשות שואלת, התשובה כבר מוכנה.' },
]

const STEPS: StepItem[] = [
  { n: '1', title: 'נרשמים', desc: 'אתם עונים על כמה שאלות. זה כל מה שצריך מכם.' },
  { n: '2', title: 'אנחנו בונים', desc: 'את כל המסמכים, מותאמים לעסק שלכם.' },
  { n: '3', title: 'ממנים ממונה', desc: 'אדם מוסמך שנושא באחריות.' },
  { n: '4', title: 'אנחנו שומרים', desc: 'מנטרים, מזכירים ומעדכנים. אתם רגועים.' },
]

const PLANS = [
  {
    tier: 'בסיסית', desc: 'ניהול פרטיות עצמאי, בלי ממונה.', amt: '₪1,000', unit: ' / חודש',
    was: 'במקום ₪8,000+ אצל עו"ד', featured: false, cta: 'זה מתאים לי', href: signupHref('/register?plan=basic'), variant: 'secondary' as const,
    feats: ['כל היכולות של Deepo', 'מסמכים אוטומטיים', 'עוזר חכם מסביב לשעון', 'לוח וציון עמידה', 'המלצות עמידה (לא מחייבות)', 'תמיכה במייל'],
  },
  {
    tier: 'מומלצת', desc: 'כולל ממונה מוסמך. מתאימה לרוב העסקים.', amt: '₪1,499', unit: ' / חודש',
    was: 'במקום ₪3,000-8,000 אצל יועץ', featured: true, cta: 'יאללה, מתחילים', href: signupHref('/register?plan=recommended'), variant: 'gradient' as const,
    feats: ['כל מה שבבסיסית', 'ממונה מוסמך שמתמנה עליכם', 'סקירה רבעונית מהממונה', 'עד 2 פניות לממונה בחודש', 'ליווי באירוע אבטחה', 'תמיכה טלפונית'],
  },
  {
    tier: 'פרימיום', desc: 'לארגונים עם דרישות מורכבות.', amt: '₪7,500', unit: ' / חודש',
    was: 'ליווי מקצועי צמוד', featured: false, cta: 'זה מתאים לי', href: signupHref('/register?plan=premium'), variant: 'secondary' as const,
    feats: ['כל מה שבמומלצת', 'שעתיים ממונה בחודש', 'סקירה חודשית', 'הדרכת עובדים רבעונית', 'DPIA מלא כלול', 'זמן תגובה: 4 שעות'],
  },
  {
    tier: 'ארגונית', desc: 'למספר חברות או דרישות רגולציה מורכבות.', amt: 'בהתאמה', unit: '',
    was: 'תמחור מותאם אישית', featured: false, cta: 'דברו איתנו', href: '/contact', variant: 'secondary' as const,
    feats: ['כל מה שבפרימיום', 'SLA מובטח', 'הטמעה ייעודית', 'התאמה מלאה לארגון'],
  },
]

// ============================================================
// PAGE
// ============================================================
export default function HomePage() {
  return (
    <div className="hp">

      {/* 1 - RADAR HERO (vision index-he.html): .mk-mesh dot-grid + lower-LEFT
          RadarMotif (rings + visible 135deg core node, behind the dashboard). */}
      <section className="hp-hero mk-mesh">
        <RadarMotif className="hp-hero__radar" size={820} />
        <div className="mk-wrap hp-hero__grid">
          <div>
            <Eyebrow icon="dp-shield" pill>תיקון 13 כבר כאן</Eyebrow>
            <h1>הגנת פרטיות מקצועית, <span className="mk-grad">במחיר נגיש לכולם.</span></h1>
            <p className="hp-hero__lede">
              Deepo מגן על העסק שלכם מחשיפה לרשות להגנת הפרטיות ולתביעות. סוכני AI ייעודיים עובדים 24/7,
              ומאחוריהם צוות DPOs מנוסה. אנחנו שומרים עליכם, בלי שתצטרכו להבין בחוק.
            </p>
            <div className="mk-ctas">
              <Link href={signupHref('/register')} className="dp-btn dp-btn--gradient dp-btn--lg">התחילו עכשיו</Link>
              <a href="#how" className="dp-btn dp-btn--secondary dp-btn--lg">איך זה עובד</a>
            </div>
            <p className="hp-hero__micro">החל מ-1,000₪ לחודש · בלי עלות הקמה · עומדים בדרישות תוך ימים</p>
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

      {/* 2 - TRUST / SECTOR STRIP (vision places it directly under the hero) */}
      <section className="hp-trust">
        <div className="mk-wrap hp-trust__row">
          <span className="hp-trust__lab">מגנים על עסקים ב:</span>
          <span className="hp-sector"><DeepoIcon id="dp-health" /> בריאות</span>
          <span className="hp-sector"><DeepoIcon id="dp-education" /> חינוך</span>
          <span className="hp-sector"><DeepoIcon id="dp-doc" /> ראיית חשבון</span>
          <span className="hp-sector"><DeepoIcon id="dp-finance" /> פיננסים</span>
        </div>
      </section>

      {/* 2b - PILLARS (vision FEATURES block, copy verbatim from the
          reference). Placed right after the hero/trust strip and above the
          existing 6-card "מה מקבלים" section, per the redesign brief.
          FLAG(review): confirm this order (trust -> pillars -> calculator
          -> 6-card features). */}
      <section className="mk-section">
        <div className="mk-wrap">
          <SecHead
            eyebrow="איך זה עובד"
            title="אתם מתרכזים בעסק שלכם. אנחנו דואגים שתעמדו בחוקי הגנת הפרטיות."
            sub="אתם בעסק, אנחנו על המשמר. הכל קורה ברקע, בשפה פשוטה ומובנת, בלי קבלנים חיצוניים ובלי הטמעה ארוכה."
          />
          <FeatureGrid items={PILLARS} />
        </div>
      </section>

      {/* 3 - CALCULATOR (shared dark ember-glow band) */}
      <section className="mk-section mk-band--dark" id="calculator">
        <div className="mk-wrap hp-calc__grid">
          <div className="hp-calc__copy">
            <Eyebrow icon="dp-radar">בדיקה מהירה</Eyebrow>
            <h2>צריך בכלל DPO? בואו נגלה.</h2>
            <p>שלוש שאלות, שלושים שניות. בלי להשאיר אימייל ובלי התחייבות. אם מסתבר שאתם חייבים, אנחנו כבר כאן.</p>
          </div>
          <MiniCalculator />
        </div>
      </section>

      {/* 4 - WHAT YOU GET (light, on the hero backdrop: .mk-mesh dot-grid +
          a corner RadarMotif at low opacity behind the white cards) */}
      <section className="mk-section mk-mesh hp-feat">
        <RadarMotif className="hp-feat__radar" size={820} />
        <div className="mk-wrap">
          <SecHead eyebrow="מה מקבלים" title="כל מה שתיקון 13 דורש, במקום אחד." sub="אנחנו עושים הכול ברקע, בלי קבלנים חיצוניים ובלי הטמעה ארוכה, ובשפה שמבינים." />
          <FeatureGrid items={FEATURES} />
        </div>
      </section>

      {/* 5 - HOW IT WORKS (shared dark band; hero "איך זה עובד" CTA anchors here) */}
      <section className="mk-section mk-band--dark" id="how">
        <div className="mk-wrap">
          <SecHead eyebrow="איך מתחילים" title="ארבעה צעדים. חמש דקות." sub="חמש דקות. פחות זמן ממה שלוקח להסביר לאמא מה זה DPO." />
          <Steps items={STEPS} />
        </div>
      </section>

      {/* NOTE(review): the EXPERTS section was removed - it was a near-duplicate
          of the "איך זה עובד" pillar block above, which carries the accurate copy.
          NOTE(review): the shared ResponsibilityBand and the security teaser
          (hp-security) were removed from the homepage per the redesign brief.
          ResponsibilityBand stays available in the shared module for reuse
          (e.g. /about). */}

      {/* 9a - COMPARISON (shared dark ember-glow band) */}
      <section className="hp-compare mk-band--dark">
        <div className="mk-wrap hp-compare__wrap">
          <Eyebrow icon="dp-bolt">השוואת עלות · שנה ראשונה</Eyebrow>
          <h2>אותה הגנה. בעלות נמוכה בעשרות אחוזים.</h2>
          <div className="hp-ctable">
            <div className="hp-ccol hp-ccol--old">
              <p className="hp-ccol__name">DPO חיצוני קלאסי</p>
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
      <section className="mk-section">
        <div className="mk-wrap">
          <SecHead eyebrow="מחירים" title="תמחור הוגן, בלי הפתעות." sub="החוק שווה לכולם, אז הכלים לעמוד בו צריכים להיות נגישים לכולם." />
          <div className="hp-pcards">
            {PLANS.map((p) => (
              <div className={`hp-pcard${p.featured ? ' hp-pcard--featured' : ''}`} key={p.tier}>
                {p.featured && <span className="hp-pcard__flag">הכי פופולרי</span>}
                <span className="hp-pcard__tier">{p.tier}</span>
                <p className="hp-pcard__desc">{p.desc}</p>
                <div><span className="hp-pcard__amt">{p.amt}<small>{p.unit}</small></span></div>
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
          <div className="hp-addons">
            <p>שירותים נוספים לפי דרישה:</p>
            <div className="hp-addons__row">
              {['DPIA - הערכת השפעה', 'חוות דעת משפטית', 'הדרכות לעובדים', 'ביקורת תאימות', 'ליווי אירוע אבטחה'].map((s) => (
                <Badge key={s} variant="neutral">{s}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10 - TESTIMONIALS SLOT (clearly marked, hideable) */}
      {SHOW_TESTIMONIAL_SLOT && (
        <section className="mk-section--tight">
          <div className="mk-wrap">
            {/* NOTE(review): real testimonials pending (spec 12). Flip SHOW_TESTIMONIAL_SLOT
                to hide, or replace this slot with a testimonials grid when content lands. */}
            <div className="mk-slot">
              <span className="mk-slot__lab">ממליצים</span>
              עוד רגע יהיו פה לקוחות מרוצים. בינתיים, אתם מוזמנים להיות הראשונים.
            </div>
          </div>
        </section>
      )}

      {/* 11 - FAQ */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead eyebrow="שאלות ותשובות" title="מה שכולם שואלים." />
          <div className="mk-faq">
            <FaqItem question="מה זה DPO, ולמה שיהיה לי אחד?" answer="DPO הוא ממונה הגנת הפרטיות - האדם שאחראי על שמירת המידע בעסק. תיקון 13 מחייב מינוי ממונה לעסקים שמחזיקים מידע על הרבה אנשים, מטפלים במידע רגיש, או עוקבים אחרי משתמשים. נשמע מסובך, זו בעצם רשימת דברים מסודרת שצריך לעשות - ואנחנו עושים אותם." />
            <FaqItem question="הממונה הוא באמת בן אדם?" answer="כן, לגמרי. אדם מוסמך שמתמנה רשמית על העסק שלכם. Deepo עושה את רוב העבודה השוטפת, והממונה זמין לשאלות המורכבות ונושא באחריות המקצועית." />
            <FaqItem question="ומה אם פשוט לא ממנים ממונה?" answer="יש אכיפה ויש קנסות, לא נפרט אותם פה כדי להלחיץ. נפרט דווקא מה צריך לעשות כדי להיות בצד הנכון - וזה לוקח חמש דקות להתחיל." />
            <FaqItem question="המסמכים באמת מספיקים לרשות?" answer="הם נכתבים לפי דרישות תיקון 13 ונבדקים על ידי הממונה המוסמך: מדיניות פרטיות, נוהלי אבטחה, כתב מינוי וכל מה שצריך להציג בבדיקה." />
            <FaqItem question="אפשר לבטל?" answer="בכל רגע, בלי דמי ביטול ובלי התחייבות. (כן, באמת.)" />
            <FaqItem question="זה מחליף עורך דין?" answer="לא. Deepo מסדר את העמידה השוטפת בתיקון 13, ולצדו ממונה מוסמך. לסוגיות משפטיות נקודתיות תמיד אפשר להיעזר בעורך דין, ואנחנו גם מציעים חוות דעת משפטית כתוספת." />
            <FaqItem question="מה אתם עושים עם המידע שלי?" answer={<>כמה שפחות. אנחנו לא שומרים את פרטי הלקוחות שלכם, ניגשים רק למה שנדרש, ומתעדים הכול. <Link href="/security">כך אנחנו שומרים על המידע</Link>.</>} />
            <FaqItem question="אני רואה חשבון. איך זה עובד מול הלקוחות שלי?" answer={<>אפשר להציע את Deepo ללקוחות שלכם וליהנות מקו הכנסה חוזר, בזמן שהם נשארים מסודרים. <Link href="/partners">לרואי חשבון ושותפים</Link>.</>} />
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
        title={<>אתם בעסק. <span className="mk-grad">אנחנו על המשמר.</span></>}
        sub="אנחנו דואגים שתעמדו בתיקון 13, בלי כאב ראש ובמחיר שכל עסק יכול. נתחיל?"
        cta="התחילו"
        href={signupHref('/register')}
        micro="ביטול בכל עת · בלי התחייבות · הקמה בחמש דקות"
      />

    </div>
  )
}

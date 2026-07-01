// /product - what Deepo does, in plain words. Server component: static
// content, shared section primitives from the marketing module (client
// islands render fine inside). Voice per spec section 5 (calm, warm); AI
// is the mechanism, not the hero - sections lead with protection + people.

import type { Metadata } from 'next'
import Link from 'next/link'
import { DeepoIcon, type DeepoIconId } from '@/brand/icons'
import { Badge } from '@/components/brand/Badge'
import {
  RadarMotif, SecHead, FeatureGrid, FinalCta,
  type FeatureItem,
} from '@/components/marketing/sections'
import { signupHref } from '@/lib/signup-flag'
import './product.css'

export const metadata: Metadata = {
  title: 'המוצר · Deepo',
  description: 'כל מה שתיקון 13 דורש, קורה מעצמו. Deepo מוצא מה צריך, אוסף, סוגר פערים ושומר על עדכניות, עם ממונה אנושי שאחראי עליכם.',
}

// The background engine, as a visual flow. What Deepo does on its own, while
// the owner only answers a few questions and approves.
const FLOW: Array<{ id: DeepoIconId; title: string; desc: string }> = [
  { id: 'dp-radar', title: 'מגלים', desc: 'מה תיקון 13 דורש מכם.' },
  { id: 'dp-link', title: 'אוספים', desc: 'רק את מה שחסר, בקישורים.' },
  { id: 'dp-doc', title: 'סוגרים', desc: 'מנסחים מסמכים ונהלים.' },
  { id: 'dp-bell', title: 'מרעננים', desc: 'מעדכנים ומזכירים בזמן.' },
  { id: 'dp-seal', title: 'מוכיחים', desc: 'מתעדים הכול לרשות.' },
]

// Who touches what, without the headache. sysadmin + vendor reach Deepo
// through a secure no-login link that exposes nothing sensitive.
const PEOPLE: Array<{ id: DeepoIconId; role: string; access: string; desc: string; noLogin: boolean }> = [
  { id: 'dp-seal', role: 'הממונה', access: 'התצוגה המלאה', desc: 'רואה הכול, מחליט, ונושא באחריות המקצועית.', noLogin: false },
  { id: 'dp-shield', role: 'בעל העסק', access: 'אפליקציה קלה', desc: 'רואה מה מחכה לאישור, בלי עומס ובלי ז׳רגון.', noLogin: false },
  { id: 'dp-lock', role: 'מנהל ה-IT', access: 'קישור מאובטח, בלי התחברות', desc: 'ממלא פרטים טכניים דרך קישור, בלי חשבון ובלי סיסמה.', noLogin: true },
  { id: 'dp-link', role: 'הספקים', access: 'קישור מאובטח, בלי התחברות', desc: 'חותמים על הסכם עיבוד מידע, ולא רואים דבר מעבר.', noLogin: true },
]

// Feature deep-dive: the homepage set, expanded. Same DeepoIcon mapping.
const PRODUCT_FEATURES: FeatureItem[] = [
  { id: 'dp-seal', title: 'ממונה אנושי שאחראי עליכם', desc: 'ממונה מוסמך שמתמנה עליכם ונושא באחריות.' },
  { id: 'dp-doc', title: 'מסמכים שנכתבים מעצמם', desc: 'מדיניות, נהלים וכתב מינוי, מתעדכנים לבד.' },
  { id: 'dp-sparkle', title: 'סוכני AI שעושים את העבודה', desc: 'אוספים, מנסחים ועונים, מסביב לשעון.' },
  { id: 'dp-bell', title: 'ניטור ותזכורות', desc: 'עוקבים אחרי מה שמתקרב, ומזכירים בזמן.' },
  { id: 'dp-radar', title: 'ציון עמידה חי', desc: 'כמה אתם מסודרים, בזמן אמת, עם קישור לכל פעולה.' },
  { id: 'dp-database', title: 'יומן פעולות מלא', desc: 'כל פעולה מתועדת. אם הרשות שואלת, התשובה מוכנה.' },
]

export default function ProductPage() {
  return (
    <div>

      {/* 1 - HERO (coverage mesh: .mk-mesh dot-grid + centred RadarMotif rings/core) */}
      <section className="pp-hero mk-mesh">
        <RadarMotif className="pp-hero__radar" size={720} />
        <div className="mk-wrap pp-hero__inner">
          <h1>לעמוד בדרישות חוק הפרטיות, <span className="mk-grad">בלי מאמץ</span></h1>
          <p className="pp-hero__lede">
            אנחנו מוצאים מה צריך, אוספים את החומר, סוגרים את הפערים ושומרים שהכול יישאר מעודכן. אתם רק מאשרים.
            סוכני AI ייעודיים עושים את העבודה הקשה, ומאחוריהם צוות מומחי פרטיות ואבטחת מידע מנוסה.
          </p>
          <div className="mk-ctas">
            <Link href={signupHref('/register')} className="dp-btn dp-btn--gradient dp-btn--lg">התחילו</Link>
          </div>
        </div>
      </section>

      {/* 2 - VIDEO DEEP-DIVE (branded placeholder; real film pending clearance) */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead title="ראו את Deepo עובד" sub="שתי דקות, מהרישום ועד ההוכחה לרשות." />
          <div className="pp-video">
            <div className="pp-video__frame" role="img" aria-label="וידאו הדגמה, בקרוב">
              <span className="pp-video__play" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <span className="pp-video__label">וידאו הדגמה · בקרוב</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 - OWNER EXPERIENCE + BACKGROUND ENGINE (dark visual system flow) */}
      <section className="mk-section pp-flowsec">
        <div className="mk-wrap">
          <SecHead title={<>אתם מאשרים,<br />אנחנו עושים את כל השאר</>} sub="כמעט לא תרגישו שזה קורה. אתם עונים על כמה שאלות ומאשרים כשצריך, ואנחנו עובדים ברקע." />
          <div className="pp-flow">
            <div className="pp-flow__you">
              <span className="pp-flow__tag">מה שאתם עושים</span>
              <div className="pp-flow__chips">
                <span className="pp-flow__chip"><DeepoIcon id="dp-doc" /> עונים על כמה שאלות</span>
                <span className="pp-flow__chip"><DeepoIcon id="dp-check" /> מאשרים כשצריך</span>
              </div>
            </div>
            <div className="pp-flow__engine">
              <span className="pp-flow__tag pp-flow__tag--eng">מה שקורה ברקע, בלעדיכם</span>
              <div className="pp-flow__pipe">
                {FLOW.map((s) => (
                  <div className="pp-flow__node" key={s.title}>
                    <span className="pp-flow__node-ic"><DeepoIcon id={s.id} /></span>
                    <b>{s.title}</b>
                    <p>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="pp-flow__out">
              <span className="pp-flow__out-ic"><DeepoIcon id="dp-seal" /></span>
              <b>התוצאה:</b> עמידה מוכחת בתיקון 13, בלי כאב ראש.
            </div>
          </div>
        </div>
      </section>

      {/* 4 - the four people Deepo serves */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead title="מי נוגע במה, בלי כאב ראש" sub="לכל אחד בדיוק מה שהוא צריך, לא יותר." />
          <div className="pp-people">
            {PEOPLE.map((p) => (
              <div className="pp-person" key={p.role}>
                <div className="pp-person__head">
                  <span className="pp-person__ic"><DeepoIcon id={p.id} /></span>
                  <div>
                    <p className="pp-person__role">{p.role}</p>
                    <p className="pp-person__access">{p.access}</p>
                  </div>
                </div>
                <p>{p.desc}</p>
                {p.noLogin && (
                  <div className="pp-person__trust">
                    <Badge variant="ok" dot>בלי התחברות, בלי חשיפה</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 - FEATURE DEEP-DIVE */}
      <section className="mk-section">
        <div className="mk-wrap">
          <SecHead title="כל מה שצריך כדי להיות מסודרים" sub="היכולות של דף הבית, קצת יותר לעומק." />
          <FeatureGrid items={PRODUCT_FEATURES} />
        </div>
      </section>

      {/* 6 - FINAL CTA -> /lead-signup */}
      <FinalCta
        title={<>כל זה, <span className="mk-grad">עובד בשבילכם</span></>}
        sub={<>נתחיל בכמה שאלות קצרות.<br />את השאר אנחנו כבר יודעים לעשות.</>}
        cta="התחילו"
        href="/lead-signup"
        micro="בלי עלות הקמה · הקמה בחמש דקות"
      />

    </div>
  )
}

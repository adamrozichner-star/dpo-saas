// /product - what Deepo does, in plain words. Server component: static
// content, shared section primitives from the marketing module (client
// islands render fine inside). Voice per spec section 5 (calm, warm); AI
// is the mechanism, not the hero - sections lead with protection + people.

import type { Metadata } from 'next'
import Link from 'next/link'
import { DeepoIcon, type DeepoIconId } from '@/brand/icons'
import { Badge } from '@/components/brand/Badge'
import {
  RadarMotif, Eyebrow, SecHead, Steps, FeatureGrid, FinalCta,
  type StepItem, type FeatureItem,
} from '@/components/marketing/sections'
import { signupHref } from '@/lib/signup-flag'
import './product.css'

export const metadata: Metadata = {
  title: 'המוצר · Deepo',
  description: 'כל מה שתיקון 13 דורש, קורה מעצמו. Deepo מוצא מה צריך, אוסף, סוגר פערים ושומר על עדכניות, עם ממונה אנושי שאחראי עליכם.',
}

// The loop, in human language (no internal jargon).
const LOOP: StepItem[] = [
  { n: '1', title: 'מגלים מה צריך', desc: 'אנחנו בודקים מה בדיוק תיקון 13 דורש מהעסק שלכם.' },
  { n: '2', title: 'אוספים את החומר', desc: 'מבקשים רק את מה שחסר - מכם, מצוות ה-IT ומהספקים - בקישורים פשוטים.' },
  { n: '3', title: 'סוגרים פערים', desc: 'מנסחים את המסמכים והנהלים, וסוגרים כל פער מול הדרישות.' },
  { n: '4', title: 'שומרים על עדכניות', desc: 'ספק חדש, עובד חדש או חוק חדש? אנחנו מעדכנים ומזכירים בזמן.' },
  { n: '5', title: 'מוכיחים עמידה', desc: 'מתעדים כל פעולה, כך שתמיד יש לכם תשובה מסודרת לרשות.' },
]

// Who touches what, without the headache. sysadmin + vendor reach Deepo
// through a secure no-login link that exposes nothing sensitive.
const PEOPLE: Array<{ id: DeepoIconId; role: string; access: string; desc: string; noLogin: boolean }> = [
  { id: 'dp-seal', role: 'הממונה', access: 'התצוגה המלאה', desc: 'רואה את כל התמונה: מטלות, מסמכים, אירועים וציון עמידה. כאן מתקבלות ההחלטות, וכאן יושבת האחריות המקצועית.', noLogin: false },
  { id: 'dp-shield', role: 'בעל העסק', access: 'אפליקציה קלה', desc: 'אנחנו מראים לכם תצוגה פשוטה: מה מצב העמידה, מה מחכה לאישור שלכם, ומה כבר טופל. בלי עומס ובלי ז׳רגון.', noLogin: false },
  { id: 'dp-lock', role: 'מנהל ה-IT', access: 'קישור מאובטח, בלי התחברות', desc: 'ממלא את הפרטים הטכניים דרך קישור ייעודי. בלי חשבון, בלי סיסמה (ובלי עוד סיסמה לזכור), ובלי גישה למידע רגיש של אף אחד.', noLogin: true },
  { id: 'dp-link', role: 'הספקים', access: 'קישור מאובטח, בלי התחברות', desc: 'חותמים על הסכם עיבוד מידע דרך קישור. הם לא רואים דבר מעבר למה שצריך בדיוק מהם.', noLogin: true },
]

// Feature deep-dive: the homepage set, expanded. Same DeepoIcon mapping.
const PRODUCT_FEATURES: FeatureItem[] = [
  { id: 'dp-seal', title: 'ממונה אנושי שאחראי עליכם', desc: 'אנחנו ממנים עליכם ממונה הגנת פרטיות מוסמך, שנושא באחריות המקצועית והמשפטית. הוא זמין לשאלות, מאשר מהלכים, ונכנס לתמונה בכל פעם שצריך שיקול דעת אנושי.' },
  { id: 'dp-doc', title: 'מסמכים שנכתבים מעצמם', desc: 'אנחנו כותבים לכם מדיניות פרטיות, נוהלי אבטחה, כתב מינוי וכל מסמך אחר שתיקון 13 דורש - מותאמים לעסק, ומתעדכנים לבד כשמשהו משתנה.' },
  { id: 'dp-sparkle', title: 'סוכני AI שעושים את העבודה', desc: 'סוכני AI ייעודיים אוספים חומר, מנסחים מסמכים ועונים על שאלות בשפה רגילה, מסביב לשעון. מה שדורש אדם, אנחנו מעבירים לממונה בלחיצה.' },
  { id: 'dp-bell', title: 'ניטור ותזכורות', desc: 'אנחנו עוקבים אחרי מה שמתקרב - חידושים, ספקים חדשים, בקרות תקופתיות - ומזכירים לכם בזמן, לפני שזה הופך לבעיה.' },
  { id: 'dp-radar', title: 'ציון עמידה חי', desc: 'בכל רגע אנחנו מראים לכם כמה אתם מסודרים מול הדרישות, מה עוד חסר, וקישור ישיר לכל פעולה שנשארה.' },
  { id: 'dp-database', title: 'יומן פעולות מלא', desc: 'אנחנו מתעדים כל שינוי וכל אישור אוטומטית. אם הרשות מבקשת הוכחה, היא כבר מוכנה ומחכה.' },
]

export default function ProductPage() {
  return (
    <div>

      {/* 1 - HERO (coverage mesh: .mk-mesh dot-grid + centred RadarMotif rings/core) */}
      <section className="pp-hero mk-mesh">
        <RadarMotif className="pp-hero__radar" size={720} />
        <div className="mk-wrap pp-hero__inner">
          <Eyebrow icon="dp-radar" pill>המוצר</Eyebrow>
          <h1>כל מה שתיקון 13 דורש, <span className="mk-grad">קורה מעצמו.</span></h1>
          <p className="pp-hero__lede">
            אנחנו מוצאים מה צריך, אוספים את החומר, סוגרים את הפערים ושומרים שהכול יישאר מעודכן. אתם רק מאשרים.
            סוכני AI ייעודיים עושים את העבודה הקשה, ומאחוריהם צוות DPOs מנוסה.
          </p>
          <div className="mk-ctas">
            <Link href={signupHref('/register')} className="dp-btn dp-btn--gradient dp-btn--lg">התחילו</Link>
          </div>
        </div>
      </section>

      {/* 2 - THE LOOP, IN PLAIN WORDS */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead eyebrow="איך זה עובד" title="מוצאים, אוספים, סוגרים, מרעננים, מוכיחים." sub="זה כל הסיפור. חמישה דברים שקורים שוב ושוב ברקע, כדי שאתם לא תצטרכו לחשוב עליהם." />
          <Steps items={LOOP} />
        </div>
      </section>

      {/* 3 - the four people Deepo serves */}
      <section className="mk-section">
        <div className="mk-wrap">
          <SecHead eyebrow="מי נוגע במה" title="מי נוגע במה, בלי כאב ראש." sub="לכל אחד יש בדיוק את מה שהוא צריך - לא יותר. ככה שומרים גם על סדר וגם על פרטיות." />
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

      {/* 4 - FEATURE DEEP-DIVE */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead eyebrow="מה יש בפנים" title="כל מה שצריך כדי להיות מסודרים." sub="אותן יכולות שמופיעות בדף הבית, קצת יותר לעומק." />
          <FeatureGrid items={PRODUCT_FEATURES} />
        </div>
      </section>

      {/* 5 - FINAL CTA -> /lead-signup */}
      <FinalCta
        title={<>כל זה, <span className="mk-grad">עובד בשבילכם.</span></>}
        sub="נתחיל בכמה שאלות קצרות. את השאר אנחנו כבר יודעים לעשות."
        cta="התחילו"
        href="/lead-signup"
        micro="בלי עלות הקמה · בלי התחייבות · הקמה בחמש דקות"
      />

    </div>
  )
}

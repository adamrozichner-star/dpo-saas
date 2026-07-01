// /privacy-israel - the story of privacy law in Israel, in plain words:
// where it came from, the key concepts, your obligations as a business /
// database owner, and why the Authority now has real enforcement teeth.
// Educational + warm (spec section 5). No specific penalty figures here -
// the ₪ numbers live in the Roy-gated exposure calculator. Server component.

import type { Metadata } from 'next'
import Link from 'next/link'
import { DeepoIcon } from '@/brand/icons'
import { RadarMotif, SecHead, Eyebrow, FinalCta } from '@/components/marketing/sections'
import './privacy-israel.css'

export const metadata: Metadata = {
  title: 'פרטיות בישראל · Deepo',
  description: 'מאיפה הגיע חוק הגנת הפרטיות, מה המושגים החשובים, מה החובות שלכם כבעלי עסק ובעלי מאגר מידע, ולמה לרשות להגנת הפרטיות יש עכשיו שיניים.',
}

// History at a year-level. Educational overview, not legal advice.
const TIMELINE: Array<{ year: string; title: string; desc: string }> = [
  { year: '1981', title: 'חוק הגנת הפרטיות', desc: 'ישראל מחוקקת את חוק הגנת הפרטיות. הזכות לפרטיות הופכת לזכות מעוגנת בחוק.' },
  { year: '2006', title: 'רשות ייעודית', desc: 'קמה הרשות שתפקידה לפקח על הגנת המידע, לימים הרשות להגנת הפרטיות.' },
  { year: '2017', title: 'תקנות אבטחת מידע', desc: 'לראשונה, חובות אבטחה קונקרטיות לכל מי שמחזיק מאגר מידע: נהלים, בקרות ותיעוד.' },
  { year: '2024', title: 'תיקון 13 מתקבל', desc: 'הכנסת מאשרת את התיקון הגדול ביותר לחוק. הרשות מקבלת סמכויות אכיפה של ממש.' },
  { year: '2025', title: 'תיקון 13 בתוקף', desc: 'העיצומים והסמכויות נכנסים לפעולה. מכאן, אי-עמידה עולה כסף.' },
  { year: '2026', title: 'הרשות כבר אוכפת', desc: 'הרשות פונה לעסקים, פותחת בדיקות ומטילה עיצומים. זה כאן, עכשיו.' },
]

// The words everyone throws around, in human language.
const CONCEPTS: Array<{ term: string; desc: string }> = [
  { term: 'מאגר מידע', desc: 'אוסף נתונים על אנשים שמנוהל באמצעים דיגיטליים. רשימת לקוחות, עובדים או מטופלים, כולם מאגר.' },
  { term: 'בעל מאגר', desc: 'העסק או האדם שמחליט למה ואיך משתמשים במידע. עליו חלה האחריות.' },
  { term: 'מידע רגיש', desc: 'מידע על בריאות, מצב פיננסי, ביומטריה, דעות ועוד. דורש הגנה מוגברת.' },
  { term: 'ממונה הגנת הפרטיות', desc: 'האדם שאחראי לוודא שהעסק עומד בחוק. חלק מהעסקים חייבים למנות אחד.' },
]

// Your duties as a business / database owner, in plain checklist form.
const OBLIGATIONS: string[] = [
  'לדעת איזה מידע אתם מחזיקים, ולמה.',
  'לרשום את המאגר במקומות שבהם החוק דורש.',
  'לפרסם מדיניות פרטיות ברורה, ולעמוד בה.',
  'ליישם נהלי אבטחת מידע, בקרות ותיעוד.',
  'למנות ממונה הגנת פרטיות, אם אתם חייבים.',
  'לכבד בקשות של אנשים לעיין, לתקן ולמחוק מידע.',
  'לחתום על הסכמי עיבוד מידע מול הספקים שלכם.',
]

export default function PrivacyIsraelPage() {
  return (
    <div>

      {/* 1 - HERO (dark) */}
      <section className="pi-hero pi-hero--dark mk-mesh">
        <RadarMotif className="pi-hero__radar" size={640} node={false} />
        <div className="mk-wrap pi-hero__inner">
          <h1>הפרטיות בישראל גדלה<br /><span className="mk-grad">עכשיו יש לה שיניים</span><br />אמאל׳ה</h1>
          <p className="pi-hero__lede">
            מאיפה הגיע החוק, מה המושגים שחשוב להכיר, ומה בדיוק נדרש מכם כבעלי עסק. הכול בשפה פשוטה, בלי משפטית מיותרת.
          </p>
        </div>
      </section>

      {/* 2 - TIMELINE */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead title="ארבעים שנה של פרטיות, בקצרה" sub="איך הגענו מחוק על הנייר לאכיפה אמיתית." />
          <div className="pi-timeline">
            {TIMELINE.map((t) => (
              <div className="pi-tl" key={t.year}>
                <span className="pi-tl__year">{t.year}</span>
                <div className="pi-tl__body">
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 - CONCEPTS (dark) */}
      <section className="mk-section pi-concepts-sec">
        <div className="mk-wrap">
          <SecHead title="המושגים, בלי הז׳רגון" sub="ארבע מילים שחוזרות שוב ושוב, בשפה של בני אדם." />
          <div className="pi-concepts">
            {CONCEPTS.map((c) => (
              <div className="pi-concept" key={c.term}>
                <b>{c.term}</b>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 - OBLIGATIONS */}
      <section className="mk-section mk-band--sand">
        <div className="mk-wrap">
          <SecHead title="החובות שלכם, כבעלי עסק ובעלי מאגר" sub="זו לא רשימה מפחידה. זו רשימת מטלות מסודרת, ואנחנו סוגרים אותה איתכם." />
          <ul className="pi-oblig">
            {OBLIGATIONS.map((o) => (
              <li key={o}><DeepoIcon id="dp-check" /> {o}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 - AUTHORITY HAS TEETH (dark ember band) */}
      <section className="pi-teeth">
        <div className="mk-wrap pi-teeth__inner">
          <Eyebrow icon="dp-bolt">האכיפה התחילה</Eyebrow>
          <h2>לרשות יש שיניים</h2>
          <p>
            עד לא מזמן, אכיפה הייתה נדירה. תיקון 13 שינה את זה: לרשות להגנת הפרטיות יש עכשיו סמכויות חקירה ועיצומים כספיים משמעותיים.
            זה כבר לא רק על הנייר, וכדאי להיות מסודרים.
          </p>
        </div>
      </section>

      {/* 6 - CTA -> exposure calculator on the home page */}
      <FinalCta
        title={<>לא בטוחים איפה אתם עומדים? <span className="mk-grad">בדקו בחצי דקה</span></>}
        sub="הערכת חשיפה מהירה לפי תיקון 13, בלי להשאיר פרטים. ואם צריך, אנחנו כאן לסגור את הפערים."
        cta="לבדיקת החשיפה"
        href="/#calculator"
        micro="רק כדי לתת לכם כיוון, לא חוות דעת משפטית"
      />

    </div>
  )
}

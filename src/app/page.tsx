'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  CheckCircle2, 
  ArrowLeft,
  AlertTriangle,
  FileText,
  MessageSquare,
  Bell,
  BarChart3,
  ClipboardList,
  UserCheck
} from 'lucide-react'

// ============================================
// MINI CALCULATOR — 3 questions, inline
// ============================================
function MiniCalculator() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResult, setShowResult] = useState(false)

  const select = (q: string, val: string) => {
    setAnswers(prev => ({ ...prev, [q]: val }))
  }

  const calculate = () => {
    if (!answers.q1 || !answers.q2) return
    setShowResult(true)
  }

  const isRequired = () => {
    const hasData = answers.q2 === 'yes'
    const hasSensitive = answers.q3 === 'yes' || answers.q3 === 'maybe'
    const bigTeam = answers.q1 === '51-250' || answers.q1 === '250+'
    return hasData || hasSensitive || bigTeam
  }

  const optClass = (q: string, val: string) => {
    const base = 'px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all text-center'
    if (answers[q] === val) return `${base} border-blue-500 bg-blue-600 text-white`
    return `${base} border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50`
  }

  if (showResult) {
    const required = isRequired()
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 shadow-lg shadow-blue-500/5">
        <div className={`rounded-xl p-5 text-center mb-4 ${required ? 'bg-orange-50 border border-orange-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          {required ? (
            <>
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-orange-800 mb-1">סביר מאוד שאתם חייבים למנות DPO</h3>
              <p className="text-sm text-orange-600">על בסיס התשובות, העסק שלכם נדרש למנות ממונה הגנת פרטיות לפי תיקון 13.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-emerald-800 mb-1">ייתכן שאתם לא חייבים כרגע</h3>
              <p className="text-sm text-emerald-600">מומלץ לבדוק לעומק עם הבדיקה המלאה שלנו.</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {required ? (
            <Link href="/register">
              <Button className="w-full py-5 rounded-xl font-bold text-base" style={{ backgroundColor: '#059669' }}>
                התחל עכשיו — ₪500/חודש
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          ) : (
            <Link href="/calculator">
              <Button className="w-full py-5 rounded-xl font-bold text-base" style={{ backgroundColor: '#2563eb' }}>
                בדיקה מלאה — חינם
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          )}
          <button 
            onClick={() => { setShowResult(false); setAnswers({}) }}
            className="text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            בדיקה מחדש
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 shadow-lg shadow-blue-500/5">
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold text-slate-900 mb-1">🔍 בדיקת חובת DPO — חינם</h2>
        <p className="text-sm text-slate-500">ענו על 3 שאלות וגלו אם אתם חייבים</p>
      </div>

      {/* Q1 */}
      <div className="mb-4">
        <label className="text-sm font-semibold text-slate-700 block mb-2">כמה עובדים בעסק?</label>
        <div className="grid grid-cols-2 gap-2">
          {['עד 10', '11-50', '51-250', '250+'].map(v => (
            <div key={v} className={optClass('q1', v)} onClick={() => select('q1', v)}>{v}</div>
          ))}
        </div>
      </div>

      {/* Q2 */}
      <div className="mb-4">
        <label className="text-sm font-semibold text-slate-700 block mb-2">מחזיקים מידע אישי על לקוחות?</label>
        <div className="grid grid-cols-2 gap-2">
          {[['yes', 'כן'], ['no', 'לא']].map(([v, label]) => (
            <div key={v} className={optClass('q2', v)} onClick={() => select('q2', v)}>{label}</div>
          ))}
        </div>
      </div>

      {/* Q3 */}
      <div className="mb-5">
        <label className="text-sm font-semibold text-slate-700 block mb-2">יש מידע רגיש (בריאותי, ילדים, ביומטרי)?</label>
        <div className="grid grid-cols-3 gap-2">
          {[['yes', 'כן'], ['no', 'לא'], ['maybe', 'לא בטוח']].map(([v, label]) => (
            <div key={v} className={optClass('q3', v)} onClick={() => select('q3', v)}>{label}</div>
          ))}
        </div>
      </div>

      <button 
        onClick={calculate}
        disabled={!answers.q1 || !answers.q2}
        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base disabled:bg-slate-200 disabled:text-slate-400 transition-all hover:bg-blue-700"
      >
        בדוק עכשיו →
      </button>
    </div>
  )
}

// ============================================
// FAQ ITEM
// ============================================
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button 
        className="w-full flex items-center justify-between py-5 text-right"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-slate-900">{question}</span>
        <span className="text-slate-400 text-xl flex-shrink-0 mr-4">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="pb-5 text-slate-600 leading-relaxed text-[15px]">{answer}</p>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE
// ============================================
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">

      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 flex justify-between items-center h-16">
          <Link href="/" className="font-bold text-xl text-blue-600">MyDPO</Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-600">התחברות</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-lg font-semibold" style={{ backgroundColor: '#059669' }}>
                התחל עכשיו
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== URGENCY BAR ===== */}
      <div className="bg-red-50 border-b border-red-200 py-3 px-5">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700">
            רשות הגנת הפרטיות החלה בביקורות אכיפה רוחביות — e-commerce, בריאות, חינוך
          </span>
        </div>
      </div>

      {/* ===== HERO — SPLIT ===== */}
      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start">

          {/* Left: Value prop */}
          <div className="pt-2">
            <div className="inline-block text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full mb-5">
              תיקון 13 לחוק הגנת הפרטיות
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-slate-900 leading-tight mb-5">
              האם העסק שלך{' '}
              <span className="text-blue-600">חייב למנות DPO?</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              תיקון 13 מחייב אלפי עסקים בישראל. האכיפה כבר התחילה, והקנסות מגיעים ל-3.2 מיליון ₪. 
              בדקו תוך 30 שניות — ואם צריך, אנחנו פה.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">₪500</div>
                <div className="text-xs text-slate-500 mt-1">לחודש</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">5 דק׳</div>
                <div className="text-xs text-slate-500 mt-1">להקמה</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">24/7</div>
                <div className="text-xs text-slate-500 mt-1">זמינות</div>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                ממונה אנושי מוסמך
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                מסמכים אוטומטיים
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-purple-500" />
                הקמה מיידית
              </span>
            </div>
          </div>

          {/* Right: Mini Calculator */}
          <MiniCalculator />
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="bg-white border-y border-slate-200 py-10 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm text-slate-400 mb-6">בפועל, רוב העסקים בישראל חייבים ולא מודעים</p>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-slate-900">70%</div>
              <div className="text-sm text-slate-500 mt-1">מהעסקים לא עומדים בדרישות</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-red-600">₪3.2M</div>
              <div className="text-sm text-slate-500 mt-1">קנס מקסימלי</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-amber-600">72 שעות</div>
              <div className="text-sm text-slate-500 mt-1">לדווח על אירוע אבטחה</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET ===== */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">מה מקבלים ב-₪500/חודש</h2>
        <p className="text-slate-500 text-center mb-10">כל מה שצריך לעמידה מלאה בתיקון 13</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <UserCheck className="h-6 w-6 text-emerald-600" />, bg: 'bg-emerald-50', title: 'ממונה אנושי מוסמך', desc: 'לא בוט — ממונה הגנת פרטיות אנושי שמתמנה רשמית על העסק שלך.' },
            { icon: <FileText className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-50', title: 'מסמכים אוטומטיים', desc: 'מדיניות פרטיות, נוהלי אבטחה, כתב מינוי, רישום מאגרים — מותאמים לעסק.' },
            { icon: <MessageSquare className="h-6 w-6 text-purple-600" />, bg: 'bg-purple-50', title: 'צ׳אט חכם 24/7', desc: 'מענה מיידי לכל שאלה, יצירת מסמכים, העברה לממונה בלחיצה.' },
            { icon: <Bell className="h-6 w-6 text-red-600" />, bg: 'bg-red-50', title: 'ניהול אירועי אבטחה', desc: 'ספירה לאחור 72 שעות, תבניות דיווח, ליווי מקצועי עד לסגירה.' },
            { icon: <BarChart3 className="h-6 w-6 text-amber-600" />, bg: 'bg-amber-50', title: 'ציון ציות בזמן אמת', desc: 'רואים בדיוק מה חסר ומה לעשות — עם לינקים ישירים לפעולה.' },
            { icon: <ClipboardList className="h-6 w-6 text-teal-600" />, bg: 'bg-teal-50', title: 'יומן ביקורת', desc: 'Audit trail אוטומטי — מוכנים לביקורת מהרשות בכל רגע.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 flex gap-4 items-start hover:border-slate-300 transition-colors">
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-white border-y border-slate-200 py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">ארבעה צעדים, חמש דקות</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'הרשמה', desc: '5 שאלות על העסק שלך', tag: '2 דקות' },
              { num: '2', title: 'מסמכים', desc: 'נוצרים אוטומטית ומותאמים', tag: 'אוטומטי' },
              { num: '3', title: 'ממונה', desc: 'אנושי ומוסמך נכנס לתפקיד', tag: 'מיידי' },
              { num: '4', title: 'ניהול', desc: 'לוח בקרה, צ׳אט, ניטור שוטף', tag: '24/7' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500 mb-2">{s.desc}</p>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="max-w-4xl mx-auto px-5 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">חבילות ומחירים</h2>
        <p className="text-slate-500 text-center mb-10">
          עו"ד פרטי גובה ₪8,000-15,000/חודש. יועץ פרטיות ₪3,000-8,000. אנחנו?
        </p>
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">

          {/* Basic */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 text-center hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-slate-900 mb-1">בסיסית</h3>
            <p className="text-sm text-slate-500 mb-5">לעסקים קטנים ובינוניים</p>
            <div className="mb-1">
              <span className="text-5xl font-bold text-slate-900">₪500</span>
              <span className="text-slate-500 text-lg"> / חודש</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">במקום ₪8,000+ אצל עו"ד</p>
            <ul className="space-y-2.5 mb-7 text-right">
              {[
                'ממונה הגנת פרטיות מוסמך',
                'מסמכים אוטומטיים',
                'צ׳אט חכם 24/7',
                'לוח בקרה וציון ציות',
                'תמיכה במייל',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=basic" className="block">
              <Button variant="outline" className="w-full py-5 rounded-xl text-base font-semibold">
                בחירת חבילה
              </Button>
            </Link>
          </div>

          {/* Extended */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-7 text-center relative shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">הכי פופולרי</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">מורחבת</h3>
            <p className="text-sm text-slate-500 mb-5">לעסקים עם מידע רגיש</p>
            <div className="mb-1">
              <span className="text-5xl font-bold text-slate-900">₪1,200</span>
              <span className="text-slate-500 text-lg"> / חודש</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">במקום ₪3,000-8,000 אצל יועץ</p>
            <ul className="space-y-2.5 mb-7 text-right">
              {[
                'כל מה שבבסיסית',
                'סקירה רבעונית מהממונה',
                '30 דק׳ זמן DPO / חודש',
                'ליווי באירועי אבטחה',
                'תמיכה טלפונית',
                'זמן תגובה: 24 שעות',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=extended" className="block">
              <Button className="w-full py-5 rounded-xl text-base font-semibold" style={{ backgroundColor: '#059669' }}>
                בחירת חבילה
              </Button>
            </Link>
          </div>
        </div>

        {/* Upsell */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400 mb-3">שירותים נוספים לפי דרישה:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['DPIA - הערכת השפעה', 'חוות דעת משפטית', 'הדרכות לעובדים', 'ביקורת תאימות', 'ליווי אירוע אבטחה'].map((s, i) => (
              <span key={i} className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-white border-y border-slate-200 py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">שאלות נפוצות</h2>
          <FaqItem
            question="מה זה DPO ולמה אני צריך אחד?"
            answer="DPO (Data Protection Officer) הוא ממונה הגנת פרטיות — אדם שאחראי רגולטורית על הגנת המידע בעסק שלך. תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO לכל עסק שמחזיק מאגר מידע מעל גודל מסוים, מעבד מידע רגיש, או מבצע ניטור שיטתי."
          />
          <FaqItem
            question="האם הממונה הוא באמת בן אדם?"
            answer="כן. הממונה הוא אדם מוסמך שמתמנה רשמית על העסק שלך. המערכת עושה 95% מהעבודה השוטפת — יצירת מסמכים, מענה לשאלות, ניהול אירועים — אבל הממונה האנושי זמין לשאלות מורכבות ואחראי רגולטורית."
          />
          <FaqItem
            question="מה קורה אם לא ממנים DPO?"
            answer="קנסות עד 3.2 מיליון ₪, תביעות אזרחיות, ופגיעה במוניטין. רשות הגנת הפרטיות מבצעת ביקורות רוחביות ב-2026 בתחומי ה-e-commerce, בריאות וחינוך. האכיפה אקטיבית ולא תיאורטית."
          />
          <FaqItem
            question="האם המסמכים מספיקים מבחינת הרשות?"
            answer="המסמכים נוצרים לפי דרישות תיקון 13 ונבדקים על ידי הממונה המוסמך. הם כוללים מדיניות פרטיות, נוהלי אבטחה, כתב מינוי, ורישום מאגרים — כל מה שנדרש בביקורת."
          />
          <FaqItem
            question="אפשר לבטל?"
            answer="כן, בכל עת. ללא התחייבות, ללא דמי ביטול."
          />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section 
        className="py-16 px-5"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ממונה מוסמך. ₪500/חודש. 5 דקות.
          </h2>
          <p className="text-blue-100/70 text-lg mb-8">
            האכיפה כבר כאן — אל תחכו לקנס.
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 h-auto rounded-xl font-bold shadow-lg shadow-emerald-500/25"
              style={{ backgroundColor: '#059669' }}
            >
              התחל עכשיו
              <ArrowLeft className="h-5 w-5 mr-2" />
            </Button>
          </Link>
          <p className="text-blue-200/40 text-sm mt-5">ביטול בכל עת • ללא התחייבות • הקמה ב-5 דקות</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-3">
                <span className="font-bold text-white text-lg">MyDPO</span>
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                שירות ממונה הגנת פרטיות חיצוני לעסקים. 
                עמידה בתיקון 13 לחוק הגנת הפרטיות בביטחון ובמחיר הוגן.
              </p>
            </div>
            <div className="text-right">
              <h4 className="font-semibold text-white mb-3">קישורים</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <Link href="/calculator" className="hover:text-white transition-colors">בדיקת חובת DPO</Link>
                <Link href="/login" className="hover:text-white transition-colors">התחברות</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
                <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
              </div>
            </div>
            <div className="text-right">
              <h4 className="font-semibold text-white mb-3">צרו קשר</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <span>support@mydpo.co.il</span>
                <span>mydpo.co.il</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-slate-500 text-center">
            © 2026 MyDPO. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  )
}

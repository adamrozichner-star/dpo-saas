'use client'

import Link from 'next/link'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <header className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <span className="font-bold text-lg text-indigo-700">MyDPO</span>
          </Link>
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">
            ← חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">🍪 מדיניות עוגיות</h1>
        <p className="text-stone-500 mb-8">עודכן לאחרונה: פברואר 2026</p>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 space-y-6 leading-relaxed text-stone-700">
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">מהן עוגיות?</h2>
            <p>
              עוגיות (Cookies) הן קבצי טקסט קטנים שנשמרים במכשיר שלכם כאשר אתם מבקרים באתר. 
              הן משמשות לזיהוי, שמירת העדפות, ושיפור חוויית השימוש.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">העוגיות שאנו משתמשים בהן</h2>
            <div className="space-y-4 mt-3">
              <div className="p-4 bg-stone-50 rounded-xl">
                <h3 className="font-medium text-stone-800 text-sm mb-1">עוגיות הכרחיות</h3>
                <p className="text-sm text-stone-600">נדרשות לתפקוד תקין של האתר, כולל אימות משתמשים וניהול הפעלות. לא ניתן לבטל אותן.</p>
                <p className="text-xs text-stone-400 mt-2">דוגמאות: sb-access-token, sb-refresh-token, cookie_consent</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl">
                <h3 className="font-medium text-stone-800 text-sm mb-1">עוגיות אנליטיקה</h3>
                <p className="text-sm text-stone-600">עוזרות לנו להבין כיצד משתמשים מנווטים באתר ולשפר את השירות. המידע הוא אנונימי.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">ניהול עוגיות</h2>
            <p>
              ניתן לשלוט בעוגיות דרך הגדרות הדפדפן שלכם. שימו לב שחסימת עוגיות 
              הכרחיות עלולה לפגוע בתפקוד האתר.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">יצירת קשר</h2>
            <p>
              לשאלות בנושא מדיניות העוגיות שלנו, ניתן לפנות אלינו בכתובת{' '}
              <a href="mailto:privacy@mydpo.co.il" className="text-indigo-600 hover:underline">privacy@mydpo.co.il</a>
            </p>
          </section>

          <div className="pt-4 border-t border-stone-100 flex gap-4 text-sm">
            <Link href="/privacy" className="text-indigo-600 hover:underline">מדיניות פרטיות</Link>
            <Link href="/terms" className="text-indigo-600 hover:underline">תנאי שימוש</Link>
            <Link href="/accessibility" className="text-indigo-600 hover:underline">הצהרת נגישות</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

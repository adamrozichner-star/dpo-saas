'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <header className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
          </Link>
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">
            ← חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">♿ הצהרת נגישות</h1>
        <p className="text-stone-500 mb-8">עודכן לאחרונה: פברואר 2026</p>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 space-y-6 leading-relaxed text-stone-700">
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">מחויבות לנגישות</h2>
            <p>
              חברת Deepo מחויבת להנגשת האתר והשירותים שלה לאנשים עם מוגבלויות, 
              בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998, 
              ותקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">מה עשינו</h2>
            <p>האתר שלנו כולל את ההתאמות הבאות:</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>תפריט נגישות צף המאפשר שינוי גודל טקסט</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>מצב ניגודיות גבוהה</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>הדגשת קישורים לזיהוי קל</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>תמיכה בניווט מקלדת</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>תמיכה מלאה ב-RTL (עברית)</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>תגיות ARIA לקוראי מסך</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>עיצוב רספונסיבי לכל המכשירים</span></div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">סטנדרט נגישות</h2>
            <p>אנו פועלים בהתאם להנחיות WCAG 2.1 ברמה AA ככל הניתן.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">פנייה בנושא נגישות</h2>
            <p>
              אם נתקלתם בבעיית נגישות באתר או שיש לכם הצעות לשיפור, 
              נשמח לשמוע מכם:
            </p>
            <div className="mt-3 p-4 bg-stone-50 rounded-xl text-sm space-y-1">
              <p><strong>רכז נגישות:</strong> צוות Deepo</p>
              <p><strong>דוא״ל:</strong> accessibility@deepo.co.il</p>
              <p><strong>טלפון:</strong> 03-0000000</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-3">תאריך עדכון</h2>
            <p>הצהרת נגישות זו עודכנה לאחרונה בפברואר 2026.</p>
          </section>
        </div>
      </main>
    </div>
  )
}

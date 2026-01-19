import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, ArrowRight } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">מדיניות פרטיות</h1>
        <p className="text-gray-600 mb-8">עודכן לאחרונה: ינואר 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. מבוא</h2>
            <p className="text-gray-700 leading-relaxed">
              DPO-Pro מחויבת להגנה על פרטיות המשתמשים בשירותים שלנו.
              מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. מידע שאנו אוספים</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>פרטי התקשרות (שם, דוא"ל, טלפון)</li>
              <li>פרטי הארגון (שם החברה, ח.פ, תחום פעילות)</li>
              <li>מידע על פעילות עיבוד המידע בארגון</li>
              <li>שאלות ופניות שאתם שולחים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. מטרות השימוש</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>מתן השירותים שהזמנתם</li>
              <li>יצירת מסמכי מדיניות מותאמים</li>
              <li>מענה לשאלות ותמיכה</li>
              <li>שיפור השירות</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. אבטחת מידע</h2>
            <p className="text-gray-700 leading-relaxed">
              אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע שלכם, כולל הצפנת נתונים, גישה מבוקרת וגיבויים סדירים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. זכויות שלכם</h2>
            <p className="text-gray-700 leading-relaxed">
              יש לכם זכות לעיין במידע, לבקש תיקון או מחיקה. לבקשות: 
              <a href="mailto:privacy@dpo-pro.co.il" className="text-primary hover:underline mr-1">
                privacy@dpo-pro.co.il
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-gray-500">
          <p>© 2026 DPO-Pro. כל הזכויות שמורות.</p>
        </div>
      </main>
    </div>
  )
}

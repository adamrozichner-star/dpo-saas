import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, ArrowRight } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-8">תנאי שימוש</h1>
        <p className="text-gray-600 mb-8">עודכן לאחרונה: ינואר 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. כללי</h2>
            <p className="text-gray-700 leading-relaxed">
              ברוכים הבאים ל-DPO-Pro. השימוש בשירותים שלנו כפוף לתנאים המפורטים להלן. 
              בעצם השימוש באתר ובשירותים, אתם מסכימים לתנאים אלו במלואם.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. תיאור השירות</h2>
            <p className="text-gray-700 leading-relaxed">
              DPO-Pro מספקת שירותי ממונה הגנת פרטיות (DPO) חיצוני לעסקים, הכוללים:
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>מינוי ממונה הגנת פרטיות מוסמך</li>
              <li>מערכת ניהול פרטיות מבוססת AI</li>
              <li>הפקת מסמכי מדיניות פרטיות</li>
              <li>מענה לשאלות עובדים בנושאי פרטיות</li>
              <li>ליווי בעת הצורך</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. הרשמה וחשבון</h2>
            <p className="text-gray-700 leading-relaxed">
              בעת ההרשמה, אתם מתחייבים לספק מידע מדויק ומעודכן. 
              אתם אחראים לשמירה על סודיות פרטי ההתחברות שלכם ולכל פעילות המתבצעת בחשבונכם.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. תשלום ומנויים</h2>
            <p className="text-gray-700 leading-relaxed">
              השירות מוצע במסגרת מנוי חודשי. התשלום מתבצע מראש לכל חודש.
              ניתן לבטל את המנוי בכל עת, והביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.
              לא יינתן החזר עבור תקופה שכבר שולמה.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. הגבלת אחריות</h2>
            <p className="text-gray-700 leading-relaxed">
              השירות מסופק "כמות שהוא" (AS IS). DPO-Pro אינה אחראית לכל נזק ישיר או עקיף 
              הנובע מהשימוש בשירות. השירות אינו מהווה תחליף לייעוץ משפטי פרטני.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">6. קניין רוחני</h2>
            <p className="text-gray-700 leading-relaxed">
              כל הזכויות במערכת, בעיצוב ובתוכן שייכות ל-DPO-Pro. 
              המסמכים שנוצרים עבורכם במסגרת השירות הם שלכם לשימוש בארגון.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">7. יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">
              לשאלות בנוגע לתנאי השימוש: 
              <a href="mailto:support@dpo-pro.co.il" className="text-primary hover:underline mr-1">
                support@dpo-pro.co.il
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">8. דין וסמכות שיפוט</h2>
            <p className="text-gray-700 leading-relaxed">
              תנאים אלו כפופים לדין הישראלי. סמכות השיפוט הבלעדית נתונה לבתי המשפט במחוז תל אביב.
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

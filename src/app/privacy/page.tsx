import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, ArrowRight } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-600" />
            <span className="font-bold text-xl text-slate-800">MyDPO</span>
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
        <h1 className="text-3xl font-bold mb-4">מדיניות פרטיות</h1>
        <p className="text-gray-600 mb-8">עודכן לאחרונה: פברואר 2026</p>
        <div className="prose prose-lg max-w-none space-y-8 text-right">
          <section>
            <h2 className="text-xl font-bold mb-4">1. מבוא</h2>
            <p className="text-gray-700 leading-relaxed">MyDPO (להלן: &quot;החברה&quot;) מחויבת להגנה על פרטיות המשתמשים בשירותיה. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים, מגנים ומאחסנים מידע אישי בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, ותיקוניו.</p>
            <p className="text-gray-700 leading-relaxed mt-3">החברה מפעילה פלטפורמה מקוונת בכתובת mydpo.co.il לצורך מתן שירותי ממונה הגנת פרטיות חיצוני לעסקים.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">2. מידע שאנו אוספים</h2>
            <p className="text-gray-700 leading-relaxed font-semibold">מידע שנמסר על ידכם:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>פרטי התקשרות: שם מלא, כתובת דוא&quot;ל, מספר טלפון</li>
              <li>פרטי העסק: שם החברה, מספר ח.פ./ע.מ., תחום פעילות, מספר עובדים</li>
              <li>מידע על פעילות עיבוד מידע בארגון (לצורך הפקת מסמכי ציות)</li>
              <li>שאלות ופניות שאתם שולחים דרך המערכת</li>
              <li>פרטי תשלום (מעובדים באמצעות ספק סליקה מאובטח — אנו לא שומרים פרטי כרטיס אשראי)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-semibold mt-4">מידע שנאסף אוטומטית:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>כתובת IP, סוג דפדפן ומערכת הפעלה</li>
              <li>נתוני שימוש באתר (עמודים שנצפו, זמן שהייה)</li>
              <li>עוגיות (Cookies) לצורך תפעול האתר ושיפור חוויית המשתמש</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">3. מטרות השימוש במידע</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mr-4">
              <li>מתן השירותים שהוזמנו, לרבות מינוי ממונה, הפקת מסמכים ומענה לשאלות</li>
              <li>ניהול חשבון הלקוח וגביית תשלומים</li>
              <li>שיפור השירות והמערכת</li>
              <li>עמידה בדרישות חוקיות ורגולטוריות</li>
              <li>שליחת עדכונים חיוניים הקשורים לשירות (לא שיווקיים)</li>
              <li>תקשורת שיווקית — רק בהסכמה מפורשת, עם אפשרות הסרה בכל עת</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p className="text-gray-700 leading-relaxed">אנו לא מוכרים, משכירים או משתפים מידע אישי עם צדדים שלישיים למטרות שיווקיות. מידע עשוי להיות משותף רק במקרים הבאים:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2 mr-4">
              <li>ספקי שירות הכרחיים: אחסון ענן, סליקת תשלומים, שליחת דוא&quot;ל — רק במידה הנדרשת לתפעול השירות</li>
              <li>ממונה הגנת הפרטיות המוסמך: לצורך מילוי תפקידו בהתאם לחוק</li>
              <li>דרישה חוקית: צו בית משפט או דרישה של רשות מוסמכת</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">5. אבטחת מידע</h2>
            <p className="text-gray-700 leading-relaxed">אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>הצפנת נתונים בהעברה (SSL/TLS) ובאחסון</li>
              <li>גישה מבוקרת על בסיס הרשאות</li>
              <li>אימות דו-שלבי</li>
              <li>גיבויים סדירים</li>
              <li>ניטור ובקרת גישה</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">פרטי תשלום מעובדים באמצעות ספק סליקה מאובטח העומד בתקן PCI DSS. אנו לא שומרים פרטי כרטיס אשראי במערכותינו.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">6. שמירת מידע</h2>
            <p className="text-gray-700 leading-relaxed">מידע אישי נשמר כל עוד החשבון פעיל ולתקופה סבירה לאחר סיום ההתקשרות לצורך עמידה בדרישות חוקיות ורגולטוריות. מסמכי ציות נשמרים בהתאם לדרישות החוק.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">7. זכויותיכם</h2>
            <p className="text-gray-700 leading-relaxed">בהתאם לחוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>זכות עיון: לעיין במידע האישי השמור אודותיכם</li>
              <li>זכות תיקון: לבקש תיקון מידע שגוי או לא מעודכן</li>
              <li>זכות מחיקה: לבקש מחיקת מידע שאינו נדרש עוד</li>
              <li>זכות התנגדות: להתנגד לעיבוד מידע למטרות שיווקיות</li>
              <li>זכות ניוד: לקבל עותק של המידע שלכם בפורמט מובנה</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">לבקשות בנוגע לזכויותיכם, פנו אלינו בדוא&quot;ל: <a href="mailto:privacy@mydpo.co.il" className="text-emerald-600 hover:underline">privacy@mydpo.co.il</a></p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">8. עוגיות (Cookies)</h2>
            <p className="text-gray-700 leading-relaxed">האתר משתמש בעוגיות הכרחיות לצורך תפעול האתר, שמירת העדפות ואימות משתמשים. ניתן לנהל את הגדרות העוגיות דרך הדפדפן.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">9. שינויים במדיניות</h2>
            <p className="text-gray-700 leading-relaxed">החברה רשאית לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר ויישלחו בהודעה ללקוחות פעילים.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">10. יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">לשאלות בנוגע למדיניות הפרטיות:</p>
            <p className="text-gray-700 mt-2">דוא&quot;ל: <a href="mailto:privacy@mydpo.co.il" className="text-emerald-600 hover:underline">privacy@mydpo.co.il</a></p>
            <p className="text-gray-700">טלפון: 054-424-2427</p>
            <p className="text-gray-700">אתר: mydpo.co.il</p>
          </section>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-gray-500">
          <p>© 2026 MyDPO. כל הזכויות שמורות.</p>
        </div>
      </main>
    </div>
  )
}

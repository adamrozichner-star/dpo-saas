import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, ArrowRight } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-4">תנאי שימוש</h1>
        <p className="text-gray-600 mb-8">עודכן לאחרונה: פברואר 2026</p>
        <div className="prose prose-lg max-w-none space-y-8 text-right">
          <section>
            <h2 className="text-xl font-bold mb-4">1. כללי</h2>
            <p className="text-gray-700 leading-relaxed">ברוכים הבאים ל-MyDPO (להלן: &quot;החברה&quot;, &quot;אנחנו&quot;). MyDPO מפעילה פלטפורמה מקוונת לניהול ציות לתיקון 13 לחוק הגנת הפרטיות, התשמ&quot;א-1981, הכוללת מינוי ממונה הגנת פרטיות חיצוני מוסמך, הפקת מסמכי ציות, ומערכת ניהול שוטפת לעסקים (להלן: &quot;השירות&quot;). האתר פועל בכתובת mydpo.co.il (להלן: &quot;האתר&quot;).</p>
            <p className="text-gray-700 leading-relaxed mt-3">השימוש באתר ובשירות מהווה הסכמה מלאה לתנאים אלו. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש בשירות.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">2. תיאור השירות</h2>
            <p className="text-gray-700 leading-relaxed">MyDPO מספקת שירות מנוי חודשי לעסקים הכולל:</p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-2 mr-4">
              <li>מינוי ממונה הגנת פרטיות (DPO) חיצוני מוסמך בהתאם לדרישות החוק</li>
              <li>הפקת מסמכי מדיניות פרטיות, נהלי אבטחת מידע וכתבי מינוי</li>
              <li>מערכת ניהול מאגרי מידע ותיעוד עיבוד (ROPA)</li>
              <li>מענה לשאלות עובדים בנושאי הגנת פרטיות</li>
              <li>ניהול אירועי אבטחת מידע ותמיכה בדיווח לרשות להגנת הפרטיות</li>
              <li>יומן ביקורת (Audit Trail) לתיעוד פעילויות ציות</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">היקף השירות נקבע בהתאם לחבילה שנבחרה על ידי הלקוח בעת ההרשמה.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">3. הרשמה וחשבון</h2>
            <p className="text-gray-700 leading-relaxed">3.1. ההרשמה לשירות פתוחה לעסקים רשומים בישראל (חברות בע&quot;מ, עוסקים מורשים ופטורים, עמותות).</p>
            <p className="text-gray-700 leading-relaxed mt-2">3.2. בעת ההרשמה, הלקוח מתחייב לספק מידע מדויק, עדכני ומלא אודות העסק ופעילותו.</p>
            <p className="text-gray-700 leading-relaxed mt-2">3.3. הלקוח אחראי לשמירה על סודיות פרטי ההתחברות ולכל פעולה המתבצעת בחשבונו.</p>
            <p className="text-gray-700 leading-relaxed mt-2">3.4. החברה רשאית לסרב לפתוח חשבון או לבטל חשבון קיים לפי שיקול דעתה.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">4. תשלום ומנויים</h2>
            <p className="text-gray-700 leading-relaxed">4.1. השירות מוצע במסגרת מנוי חודשי בתשלום. המחירים מפורסמים באתר ועשויים להתעדכן מעת לעת.</p>
            <p className="text-gray-700 leading-relaxed mt-2">4.2. התשלום מתבצע מראש בכל חודש באמצעות כרטיס אשראי או הוראת קבע.</p>
            <p className="text-gray-700 leading-relaxed mt-2">4.3. המחירים כוללים מע&quot;מ כחוק.</p>
            <p className="text-gray-700 leading-relaxed mt-2">4.4. ביטול מנוי: ניתן לבטל את המנוי בכל עת דרך הגדרות החשבון או בפנייה לשירות הלקוחות. הביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית. לא יינתן החזר עבור תקופה ששולמה.</p>
            <p className="text-gray-700 leading-relaxed mt-2">4.5. אי-תשלום: במקרה של כשל בחיוב, החברה תנסה לגבות שוב. לאחר 14 יום ללא תשלום, הגישה לשירות תושעה עד להסדרת התשלום.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">5. מינוי ממונה הגנת פרטיות</h2>
            <p className="text-gray-700 leading-relaxed">5.1. במסגרת השירות, ימונה לעסק ממונה הגנת פרטיות חיצוני מוסמך (DPO) בהתאם לדרישות תיקון 13 לחוק הגנת הפרטיות.</p>
            <p className="text-gray-700 leading-relaxed mt-2">5.2. הממונה פועל כגורם חיצוני ואינו עובד של הלקוח.</p>
            <p className="text-gray-700 leading-relaxed mt-2">5.3. היקף הזמינות של הממונה נקבע בהתאם לחבילה שנבחרה.</p>
            <p className="text-gray-700 leading-relaxed mt-2">5.4. הממונה אינו נושא באחריות אישית כלפי הלקוח או כלפי צדדים שלישיים בגין פעולות או מחדלים של הלקוח.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">6. שימוש בטכנולוגיה</h2>
            <p className="text-gray-700 leading-relaxed">6.1. המערכת משתמשת בכלים טכנולוגיים מתקדמים לצורך הפקת מסמכים, ניתוח מידע ומתן מענה לשאלות.</p>
            <p className="text-gray-700 leading-relaxed mt-2">6.2. התוצרים הטכנולוגיים נבדקים ומאושרים בפיקוח אנושי מקצועי.</p>
            <p className="text-gray-700 leading-relaxed mt-2">6.3. המערכת אינה מהווה תחליף לייעוץ משפטי פרטני ואינה מספקת חוות דעת משפטית.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">7. אחריות הלקוח</h2>
            <p className="text-gray-700 leading-relaxed">7.1. הלקוח אחראי לדיוק המידע שהוא מספק למערכת.</p>
            <p className="text-gray-700 leading-relaxed mt-2">7.2. הלקוח אחראי ליישום ההמלצות, המדיניות והנהלים שנוצרו עבורו.</p>
            <p className="text-gray-700 leading-relaxed mt-2">7.3. הלקוח מתחייב לעדכן את המערכת בשינויים מהותיים בפעילות העסקית שלו.</p>
            <p className="text-gray-700 leading-relaxed mt-2">7.4. הלקוח מתחייב לדווח לחברה על כל אירוע אבטחת מידע בתוך 24 שעות מרגע גילויו.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">8. הגבלת אחריות</h2>
            <p className="text-gray-700 leading-relaxed">8.1. השירות מסופק &quot;כמות שהוא&quot; (AS IS). החברה עושה מאמצים סבירים לספק שירות איכותי ומדויק, אך אינה מתחייבת שהשירות יהיה נטול שגיאות או הפרעות.</p>
            <p className="text-gray-700 leading-relaxed mt-2">8.2. החברה לא תישא באחריות לנזקים ישירים או עקיפים הנובעים מהשימוש בשירות, לרבות קנסות, עיצומים או תביעות מצד רגולטורים או צדדים שלישיים.</p>
            <p className="text-gray-700 leading-relaxed mt-2">8.3. סך האחריות המצטברת של החברה לא יעלה על סך התשלומים ששולמו על ידי הלקוח ב-12 החודשים שקדמו לאירוע.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">9. קניין רוחני</h2>
            <p className="text-gray-700 leading-relaxed">9.1. כל הזכויות במערכת, בקוד, בעיצוב ובתוכן שייכות ל-MyDPO.</p>
            <p className="text-gray-700 leading-relaxed mt-2">9.2. המסמכים שנוצרים עבור הלקוח במסגרת השירות ניתנים לשימושו לצורכי הארגון בלבד.</p>
            <p className="text-gray-700 leading-relaxed mt-2">9.3. הלקוח אינו רשאי להעתיק, להפיץ או למכור את המערכת או חלקים ממנה.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">10. סיום השירות</h2>
            <p className="text-gray-700 leading-relaxed">10.1. כל צד רשאי לסיים את ההתקשרות בהודעה של 30 יום מראש.</p>
            <p className="text-gray-700 leading-relaxed mt-2">10.2. עם סיום השירות, מינוי הממונה יבוטל והלקוח יהיה אחראי למנות ממונה חלופי בהתאם לדרישות החוק.</p>
            <p className="text-gray-700 leading-relaxed mt-2">10.3. הלקוח יוכל לייצא את המסמכים שנוצרו עבורו לפני סיום השירות.</p>
            <p className="text-gray-700 leading-relaxed mt-2">10.4. החברה רשאית לסיים את השירות לאלתר במקרה של הפרה מהותית של תנאים אלו.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">11. שינויים בתנאים</h2>
            <p className="text-gray-700 leading-relaxed">החברה רשאית לעדכן תנאים אלו מעת לעת. שינויים מהותיים יישלחו בהודעה ללקוחות לפחות 14 יום מראש. המשך השימוש בשירות לאחר העדכון מהווה הסכמה לתנאים המעודכנים.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">12. יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">לשאלות בנוגע לתנאי השימוש ניתן לפנות אלינו:</p>
            <p className="text-gray-700 mt-2">דוא&quot;ל: <a href="mailto:support@mydpo.co.il" className="text-emerald-600 hover:underline">support@mydpo.co.il</a></p>
            <p className="text-gray-700">טלפון: 054-424-2427</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4">13. דין וסמכות שיפוט</h2>
            <p className="text-gray-700 leading-relaxed">תנאים אלו כפופים לחוקי מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.</p>
          </section>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-gray-500">
          <p>© 2026 MyDPO. כל הזכויות שמורות.</p>
        </div>
      </main>
    </div>
  )
}

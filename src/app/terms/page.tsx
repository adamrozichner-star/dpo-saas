import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Footer from '@/components/Footer'

// /terms — Deepo terms of service (Hebrew, RTL).
// DRAFT pending legal review by Roy.
//
// Same controller-identity rules as /privacy: name + address + email
// only, no ID/business number printed.
// See memory/feedback_controller_id_never_public.md.

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
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

        {/* DRAFT banner */}
        <div
          role="status"
          className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">טיוטה לסקירה משפטית</p>
            <p className="text-sm text-amber-800 mt-1">
              מסמך זה הוא טיוטה ראשונית הממתינה לסקירה ואישור של יועץ משפטי.
              עד לאישור הסופי אין להסתמך עליו כעל תנאי שימוש מחייבים.
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">תנאי שימוש</h1>
        <p className="text-gray-600 mb-8">תאריך תחילה: 2 ביוני 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-right">

          {/* 1. General + provider identity */}
          <section>
            <h2 className="text-xl font-bold mb-4">1. כללי וזהות מפעיל השירות</h2>
            <p className="text-gray-700 leading-relaxed">
              ברוכים הבאים לשירות Deepo. תנאי שימוש אלו מסדירים את השימוש באתר
              deepo.co.il (להלן: &quot;האתר&quot;) ובשירותים הניתנים דרכו (להלן:
              &quot;השירות&quot;).
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              מפעיל השירות (להלן: &quot;אנחנו&quot;):
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4 mt-3 not-prose">
              <p className="text-gray-800">אדם רוזיצנר, עוסק מורשה</p>
              <p className="text-gray-700 text-sm mt-1">כתובת: ההגנה 1, רמת השרון</p>
              <p className="text-gray-700 text-sm">
                דוא&quot;ל:{' '}
                <a href="mailto:adamrozichner@gmail.com" className="text-emerald-600 hover:underline">
                  adamrozichner@gmail.com
                </a>
              </p>
              <p className="text-gray-500 text-xs mt-2">
                מספר עוסק מורשה יימסר על פי דרישה ולמטרות לגיטימיות בלבד.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-3">
              השימוש באתר ובשירות מהווה הסכמה לתנאים אלו. אם אינכם מסכימים, אנא
              הימנעו משימוש.
            </p>
          </section>

          {/* 2. Service description */}
          <section>
            <h2 className="text-xl font-bold mb-4">2. תיאור השירות</h2>
            <p className="text-gray-700 leading-relaxed">
              Deepo היא פלטפורמה מקוונת המספקת כלי תוכנה לתמיכה בעבודת ממונה הגנת
              פרטיות (DPO) חיצוני לעסקים, בהתאם לחוק הגנת הפרטיות לרבות תיקון 13.
              השירות נועד לסייע לעסקים לעמוד בדרישות החוק ולנהל פעילות עיבוד
              מידע אישי.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              <strong>מצב נוכחי:</strong> שירותי המנוי בתשלום מושהים בשלב זה. האתר
              מאפשר הצטרפות לרשימת המתעניינים בגישה מוקדמת באמצעות טופס ייעודי.
              עם פתיחת ההרשמה המלאה יישלח עדכון למצטרפים המוקדמים.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              כאשר הרישום ייפתח, השירות יכלול בין היתר:
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1 mr-4">
              <li>מינוי ממונה הגנת פרטיות חיצוני מוסמך</li>
              <li>הפקת מסמכי מדיניות פרטיות, נהלי אבטחת מידע וכתבי מינוי</li>
              <li>מערכת ניהול מאגרי מידע ותיעוד פעילויות עיבוד</li>
              <li>מענה לשאלות בנושאי הגנת פרטיות</li>
              <li>ליווי באירועי אבטחת מידע ותמיכה בדיווח לרשות</li>
              <li>יומן ביקורת (Audit Trail) לתיעוד פעילויות ציות</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              היקף השירות בכל חבילה ייקבע במועד פתיחת הרישום, ויפורסם באתר.
            </p>
          </section>

          {/* 3. Eligibility */}
          <section>
            <h2 className="text-xl font-bold mb-4">3. כשירות לשימוש</h2>
            <p className="text-gray-700 leading-relaxed">
              3.1. השימוש בשירות פתוח לאנשים בני 18 ומעלה, ולגופים משפטיים רשומים
              בישראל (חברות, עוסקים מורשים ופטורים, עמותות וכיוצא בזה).
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              3.2. בעת הרשמה לכל שלב — לרבות טופס ההצטרפות המוקדמת — מתחייב המשתמש
              לספק מידע מדויק, עדכני ומלא.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              3.3. אנו רשאים, לפי שיקול דעתנו, לסרב להעניק שירות, לבטל חשבון או
              להסיר משתמש מרשימת המתעניינים.
            </p>
          </section>

          {/* 4. Payment (forward-looking) */}
          <section>
            <h2 className="text-xl font-bold mb-4">4. תשלום ומנויים (בעת פתיחת הרישום)</h2>
            <p className="text-gray-700 leading-relaxed">
              4.1. עם פתיחת ההרשמה, השירות יוצע במסגרת מנוי חודשי בתשלום. מחירים
              יפורסמו באתר ועשויים להתעדכן מעת לעת.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              4.2. התשלום יתבצע מראש בכל חודש באמצעות ספק סליקה מאובטח. הסליקה
              עצמה אינה מתבצעת אצלנו ופרטי כרטיס אשראי אינם נשמרים במערכותינו.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              4.3. המחירים יכללו מע&quot;מ כחוק, אלא אם נאמר אחרת.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              4.4. ביטול מנוי יהיה אפשרי בכל עת. הביטול ייכנס לתוקף בסוף תקופת
              החיוב הנוכחית; לא יינתן החזר עבור תקופה ששולמה אלא אם נקבע אחרת
              בדין.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              4.5. אי-תשלום: ייעשו ניסיונות חיוב חוזרים. לאחר 14 יום ללא תשלום,
              הגישה לשירות תושעה עד להסדרת התשלום.
            </p>
          </section>

          {/* 5. DPO appointment */}
          <section>
            <h2 className="text-xl font-bold mb-4">5. מינוי ממונה הגנת פרטיות</h2>
            <p className="text-gray-700 leading-relaxed">
              5.1. כאשר השירות בתשלום ייפתח, ימונה ללקוח ממונה הגנת פרטיות חיצוני
              מוסמך בהתאם לדרישות תיקון 13.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              5.2. הממונה פועל כגורם חיצוני בלתי-תלוי ואינו עובד של הלקוח.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              5.3. היקף הזמינות של הממונה ייקבע על פי החבילה הנבחרת.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              5.4. הממונה אינו נושא באחריות אישית כלפי הלקוח או כלפי צדדים שלישיים
              בגין פעולות או מחדלים של הלקוח.
            </p>
          </section>

          {/* 6. Technology use */}
          <section>
            <h2 className="text-xl font-bold mb-4">6. שימוש בטכנולוגיה ובבינה מלאכותית</h2>
            <p className="text-gray-700 leading-relaxed">
              6.1. המערכת משתמשת בכלי בינה מלאכותית ובאוטומציה לצורך הפקת מסמכים,
              ניתוח מאפייני עיבוד ומענה לשאלות נפוצות.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              6.2. תוצרים אוטומטיים נועדו לתמוך בעבודת הממונה המוסמך ואינם מהווים
              תחליף לשיקול דעת אנושי.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              6.3. המערכת אינה מהווה ייעוץ משפטי, חוות דעת משפטית או תחליף לעורך
              דין.
            </p>
          </section>

          {/* 7. Customer obligations */}
          <section>
            <h2 className="text-xl font-bold mb-4">7. אחריות המשתמש</h2>
            <p className="text-gray-700 leading-relaxed">
              7.1. המשתמש אחראי לדיוק ושלמות הפרטים שהוא מוסר.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              7.2. המשתמש אחראי ליישום ההמלצות, המדיניות והנהלים שהונפקו עבורו,
              לרבות במישור הארגוני, התפעולי והטכנולוגי.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              7.3. המשתמש מתחייב לעדכן את המערכת בשינויים מהותיים בפעילות העסקית
              שלו (תחומי עיסוק חדשים, מאגרי מידע נוספים, אירועי אבטחה).
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              7.4. המשתמש מתחייב לדווח על כל אירוע אבטחת מידע בתוך 24 שעות מרגע
              גילויו.
            </p>
          </section>

          {/* 8. Liability */}
          <section>
            <h2 className="text-xl font-bold mb-4">8. הגבלת אחריות וגבולות השירות</h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 border-r-4 border-gray-400 p-3 rounded">
              Deepo מספקת כלי תוכנה לתמיכה בעבודת DPO. האחריות המקצועית והמשפטית
              חלה על ה-DPO האנושי הממונה ועל הלקוח. אין באמור באתר משום ייעוץ משפטי.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              8.1. השירות מסופק &quot;כמות שהוא&quot; (AS IS). אנו עושים מאמצים סבירים
              לאיכות ולדיוק אך אין התחייבות לזמינות מלאה, לאי-שגיאות או להתאמה
              לצורך מסוים.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              8.2. איננו נושאים באחריות לנזקים ישירים, עקיפים, תוצאתיים או
              מיוחדים הנובעים מהשימוש בשירות, לרבות אובדן רווחים, אובדן מוניטין,
              קנסות רגולטוריים או תביעות צד שלישי, ככל המותר על פי דין.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              8.3. במידה ותוכר אחריות חרף סעיף זה, סך האחריות המצטברת לא יעלה על
              סך התשלומים ששולמו על ידי הלקוח בשנים-עשר החודשים שקדמו לאירוע.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              8.4. אין באמור בסעיף זה כדי לגרוע מזכויות צרכן בלתי-ניתנות להתניה
              לפי חוק הגנת הצרכן, התשמ&quot;א-1981.
            </p>
          </section>

          {/* 9. IP */}
          <section>
            <h2 className="text-xl font-bold mb-4">9. קניין רוחני</h2>
            <p className="text-gray-700 leading-relaxed">
              9.1. כל הזכויות במערכת, בקוד, בעיצוב, בתוכן ובסימני המסחר שייכות
              ל-Deepo / למפעיל השירות.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              9.2. מסמכים שנוצרים עבור הלקוח במסגרת השירות ניתנים לשימוש פנימי
              של הארגון בלבד.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              9.3. אסור להעתיק, להפיץ, לבצע הנדסה לאחור או למכור את המערכת או
              חלקים ממנה.
            </p>
          </section>

          {/* 10. Termination */}
          <section>
            <h2 className="text-xl font-bold mb-4">10. סיום השירות</h2>
            <p className="text-gray-700 leading-relaxed">
              10.1. כל צד יוכל לסיים את ההתקשרות בהודעה של 30 יום מראש (כאשר השירות
              בתשלום ייפעל).
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              10.2. עם סיום השירות, מינוי הממונה יבוטל. הלקוח יהיה אחראי למנות
              ממונה חלופי בהתאם לחוק, אם נדרש לכך.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              10.3. ניתן יהיה לייצא את מסמכי הלקוח לפני הסיום.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              10.4. אנו רשאים לסיים את השירות לאלתר במקרה של הפרה מהותית, פעילות
              לא חוקית או סיכון לשירות.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              10.5. מצטרפים מוקדמים שאינם מעוניינים עוד בעדכונים — יוכלו לבקש
              מחיקה בכל עת בדוא&quot;ל לכתובת המופיעה בסעיף 12.
            </p>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-xl font-bold mb-4">11. שינויים בתנאים</h2>
            <p className="text-gray-700 leading-relaxed">
              אנו רשאים לעדכן תנאים אלו מעת לעת. שינויים מהותיים יפורסמו באתר;
              ללקוחות פעילים תישלח הודעה ישירה לפחות 14 יום מראש. המשך השימוש
              בשירות לאחר השינוי מהווה הסכמה לתנאים המעודכנים.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-xl font-bold mb-4">12. יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">לפניות בנוגע לתנאי השימוש:</p>
            <p className="text-gray-700 mt-2">אדם רוזיצנר, עוסק מורשה</p>
            <p className="text-gray-700">כתובת: ההגנה 1, רמת השרון</p>
            <p className="text-gray-700">
              דוא&quot;ל:{' '}
              <a href="mailto:adamrozichner@gmail.com" className="text-emerald-600 hover:underline">
                adamrozichner@gmail.com
              </a>
            </p>
          </section>

          {/* 13. Governing law */}
          <section>
            <h2 className="text-xl font-bold mb-4">13. דין וסמכות שיפוט</h2>
            <p className="text-gray-700 leading-relaxed">
              תנאים אלו כפופים לחוקי מדינת ישראל בלבד. סמכות השיפוט הבלעדית
              נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

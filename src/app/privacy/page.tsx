import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Footer from '@/components/Footer'

// /privacy — Deepo privacy policy (Hebrew, RTL).
// DRAFT pending legal review by Roy. Banner at top makes this explicit.
//
// Controller is currently קרסטון יועצים בע"מ (ח.פ. 515898088) as the
// interim corporate entity operating Deepo until the dedicated company
// is incorporated. Corporate ח.פ. is safe to publish (no overlap with
// personal ת.ז.), so we print it inline. When the dedicated Deepo Ltd
// is incorporated, swap the entity here (name + ח.פ. + address) and
// the matching block in /terms §1, plus contact blocks at the bottom
// of both files.

export default function PrivacyPage() {
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

        {/* DRAFT banner — must stay until Roy signs off */}
        <div
          role="status"
          className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">טיוטה לסקירה משפטית</p>
            <p className="text-sm text-amber-800 mt-1">
              מסמך זה הוא טיוטה ראשונית הממתינה לסקירה ואישור של יועץ משפטי.
              עד לאישור הסופי אין להסתמך עליו כעל מדיניות פרטיות מחייבת.
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">מדיניות פרטיות</h1>
        <p className="text-gray-600 mb-8">תאריך תחילה: 2 ביוני 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-right">

          {/* 1. Introduction + controller identity */}
          <section>
            <h2 className="text-xl font-bold mb-4">1. מבוא וזהות בעל המאגר</h2>
            <p className="text-gray-700 leading-relaxed">
              שירות Deepo (להלן: &quot;השירות&quot;) הוא פלטפורמה מקוונת בכתובת deepo.co.il
              לתמיכה בעבודת ממונה הגנת פרטיות (DPO) חיצוני לעסקים, בהתאם לחוק
              הגנת הפרטיות, התשמ&quot;א-1981, ותיקוניו (לרבות תיקון 13).
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              בעל המאגר ומפעיל השירות (להלן: &quot;אנחנו&quot; / &quot;ההנהלה&quot;):
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4 mt-3 not-prose">
              <p className="text-gray-800">קרסטון יועצים בע&quot;מ</p>
              <p className="text-gray-700 text-sm mt-1">ח.פ. 515898088</p>
              <p className="text-gray-700 text-sm">כתובת: דרך מנחם בגין 23, תל אביב-יפו</p>
              <p className="text-gray-700 text-sm">
                דוא&quot;ל ליצירת קשר בנושאי פרטיות:{' '}
                <a href="mailto:adamrozichner@gmail.com" className="text-emerald-600 hover:underline">
                  adamrozichner@gmail.com
                </a>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-3">
              מדיניות זו מסבירה אילו פרטים אנו אוספים, למה אנו משתמשים בהם, עם מי הם
              נחלקים, כמה זמן הם נשמרים ומה הזכויות שלכם.
            </p>
          </section>

          {/* 2. Data we collect */}
          <section>
            <h2 className="text-xl font-bold mb-4">2. הפרטים שאנו אוספים</h2>

            <p className="text-gray-700 leading-relaxed font-semibold">
              א. פרטים שאתם מוסרים בטופס &quot;הצטרפות מוקדמת&quot;:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>שם פרטי</li>
              <li>מספר טלפון נייד</li>
              <li>שם איגוד מקצועי / השתייכות מקצועית</li>
              <li>תיעוד מתן הסכמה ותאריך/שעת ההסכמה (timestamp)</li>
            </ul>
            <p className="text-gray-600 text-sm leading-relaxed mt-2">
              בשלב הנוכחי שירותי המנוי בתשלום מושהים, ופרטים אלו נאספים אך ורק
              לצורך עדכונכם כשהשירות ייפתח לרישום מלא.
            </p>

            <p className="text-gray-700 leading-relaxed font-semibold mt-4">
              ב. פרטים שייאספו אם וכאשר תהפכו ללקוחות בתשלום:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>פרטי התקשרות מלאים: שם, דוא&quot;ל, טלפון</li>
              <li>פרטי העסק: שם, מספר ח.פ. או עוסק מורשה, תחום פעילות, גודל</li>
              <li>מאפיינים של פעילויות עיבוד המידע בארגון (לצורך הפקת מסמכי ציות)</li>
              <li>תוכן פניות ומסמכים שאתם מעלים למערכת</li>
              <li>פרטי תשלום — מעובדים על ידי ספק סליקה PCI-DSS; פרטי כרטיס אשראי אינם נשמרים אצלנו</li>
            </ul>

            <p className="text-gray-700 leading-relaxed font-semibold mt-4">
              ג. פרטים הנאספים אוטומטית בעת השימוש באתר:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>כתובת IP, סוג הדפדפן, מערכת ההפעלה</li>
              <li>נתוני שימוש: עמודים שנצפו, זמני שהייה, הפניות (referrer)</li>
              <li>עוגיות (Cookies) הכרחיות לתפעול ולשמירת מצב התחברות</li>
            </ul>
          </section>

          {/* 3. Purposes */}
          <section>
            <h2 className="text-xl font-bold mb-4">3. מטרות העיבוד</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mr-4">
              <li>
                ניהול רשימת המעוניינים בגישה מוקדמת ויידועם כשהשירות ייפתח לרישום
                (טופס &quot;הצטרפות מוקדמת&quot;)
              </li>
              <li>מתן השירותים שיוזמנו על ידי לקוחות בתשלום, לכשייפתח הרישום</li>
              <li>ניהול חשבון, חיוב וגביית תשלומים</li>
              <li>שיפור השירות, איכות התוצרים והחוויה</li>
              <li>עמידה בדרישות חוקיות (חוק הגנת הפרטיות, חוק החוזים, חוק הגנת הצרכן ועוד)</li>
              <li>הודעות שירות חיוניות (שאינן שיווקיות)</li>
              <li>פניות שיווקיות — אך ורק בהסכמה מפורשת ועם אפשרות הסרה בכל עת</li>
            </ul>
          </section>

          {/* 4. Sharing */}
          <section>
            <h2 className="text-xl font-bold mb-4">4. שיתוף פרטים עם צדדים שלישיים</h2>
            <p className="text-gray-700 leading-relaxed">
              איננו מוכרים ואיננו משכירים את פרטיכם. שיתוף עשוי להיעשות רק עם:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2 mr-4">
              <li>
                ספקי תשתית הכרחיים — אחסון ענן, שליחת דוא&quot;ל, סליקת תשלומים — רק
                במידה הדרושה לאספקת השירות, ובכפוף להסכמי עיבוד מידע (DPA)
              </li>
              <li>ממונה הגנת הפרטיות המוסמך הפועל מטעמנו, לצורך מילוי תפקידו</li>
              <li>רשויות מוסמכות, על פי חובה חוקית או צו שיפוטי</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              חלק מהספקים פועלים מחוץ לישראל (לדוגמה ספקי ענן בארה&quot;ב או באירופה).
              במקרים אלו אנו פועלים להבטחת רמת הגנה דומה לזו שבישראל, באמצעות
              הסכמי עיבוד מידע מקובלים בתעשייה.
            </p>
          </section>

          {/* 5. Security */}
          <section>
            <h2 className="text-xl font-bold mb-4">5. אבטחת מידע</h2>
            <p className="text-gray-700 leading-relaxed">
              אנו מיישמים אמצעי הגנה סבירים, ביניהם:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 mr-4">
              <li>הצפנה בהעברה (TLS) ובאחסון</li>
              <li>בקרת גישה מבוססת הרשאות ועקרון מינימום הרשאה</li>
              <li>גיבויים סדירים</li>
              <li>תיעוד פעולות ופיקוח שגרתי</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              עם זאת, אף מערכת אינה חסינה לחלוטין. במקרה של אירוע אבטחה משמעותי
              ננקוט בצעדי הדיווח הנדרשים בחוק.
            </p>
          </section>

          {/* 6. Retention */}
          <section>
            <h2 className="text-xl font-bold mb-4">6. תקופות שמירה</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mr-4">
              <li>
                <strong>פרטי טופס הצטרפות מוקדמת:</strong> עד 24 חודשים מיום ההרשמה,
                או עד שתבקשו מחיקה — המוקדם מבין השניים. אם השירות ייפתח לרישום
                ותהפכו ללקוחות, נעביר את הפרטים למסלול שמירת לקוחות.
              </li>
              <li>
                <strong>נתוני לקוחות פעילים:</strong> כל עוד החשבון פעיל, ולתקופה
                סבירה לאחר סיום ההתקשרות לעמידה בדרישות חוקיות (חשבונאות,
                מס, מסמכי ציות).
              </li>
              <li>
                <strong>יומני שרת ונתוני שימוש אוטומטיים:</strong> עד 12 חודשים.
              </li>
              <li>
                <strong>פרטי חיוב:</strong> בהתאם לדרישות החוק לשמירת תיעוד חשבונאי
                (7 שנים).
              </li>
            </ul>
          </section>

          {/* 7. Rights under תיקון 13 */}
          <section>
            <h2 className="text-xl font-bold mb-4">7. הזכויות שלכם</h2>
            <p className="text-gray-700 leading-relaxed">
              בהתאם לחוק הגנת הפרטיות לרבות תיקון 13, עומדות לכם הזכויות הבאות:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2 mr-4">
              <li>
                <strong>זכות עיון</strong> — לדעת אילו פרטים שמורים אצלנו אודותיכם
                ולקבל עותק שלהם.
              </li>
              <li>
                <strong>זכות תיקון</strong> — לדרוש תיקון מידע שגוי, לא מדויק או
                לא מעודכן.
              </li>
              <li>
                <strong>זכות מחיקה</strong> — לבקש מחיקת מידע שאינו נדרש עוד
                למטרות שלשמן נאסף, או שעיבודו אינו חוקי.
              </li>
              <li>
                <strong>זכות התנגדות</strong> — להתנגד לעיבוד פרטיכם, בעיקר לצרכים
                שיווקיים.
              </li>
              <li>
                <strong>זכות הגבלת עיבוד</strong> — לבקש שנגביל את אופן השימוש
                בפרטים במקרים מסוימים.
              </li>
              <li>
                <strong>זכות הגשת תלונה</strong> — לפנות לרשות להגנת הפרטיות במשרד
                המשפטים אם אתם סבורים שזכויותיכם הופרו.
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              למימוש זכויות — פנו אלינו בדוא&quot;ל:{' '}
              <a href="mailto:adamrozichner@gmail.com" className="text-emerald-600 hover:underline">
                adamrozichner@gmail.com
              </a>
              . אנו נשיב תוך 30 יום (וניתן להאריך עד 60 יום במקרים מורכבים, בהודעה).
            </p>
          </section>

          {/* 8. Cookies */}
          <section>
            <h2 className="text-xl font-bold mb-4">8. עוגיות (Cookies)</h2>
            <p className="text-gray-700 leading-relaxed">
              האתר משתמש בעוגיות הכרחיות לתפעול, לשמירת מצב התחברות ולמדידת
              שימוש בסיסית. אינכם נדרשים להיכנס לחשבון כדי לעיין במידע השיווקי
              באתר. ניתן לחסום עוגיות בהגדרות הדפדפן, אך חסימה כוללת עלולה
              למנוע שימוש בחלקים מסוימים של האתר.
            </p>
          </section>

          {/* 9. Changes */}
          <section>
            <h2 className="text-xl font-bold mb-4">9. שינויים במדיניות</h2>
            <p className="text-gray-700 leading-relaxed">
              אנו רשאים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר.
              במידה ויש לנו פרטי קשר פעילים שלכם, נשלח גם הודעה ישירה. תאריך
              התחילה למעלה משקף את הגרסה התקפה.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-bold mb-4">10. יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">לפניות בנושא פרטיות:</p>
            <p className="text-gray-700 mt-2">קרסטון יועצים בע&quot;מ</p>
            <p className="text-gray-700">ח.פ. 515898088</p>
            <p className="text-gray-700">כתובת: דרך מנחם בגין 23, תל אביב-יפו</p>
            <p className="text-gray-700">
              דוא&quot;ל:{' '}
              <a href="mailto:adamrozichner@gmail.com" className="text-emerald-600 hover:underline">
                adamrozichner@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

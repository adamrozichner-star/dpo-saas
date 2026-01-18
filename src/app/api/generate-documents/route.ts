import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI generation

export async function POST(request: NextRequest) {
  console.log('Generate documents API called')
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { orgId, orgName, businessId, answers } = await request.json()

    console.log('Generating docs for:', orgName, 'orgId:', orgId)

    // Extract relevant data from answers
    const getAnswer = (questionId: string) => {
      const answer = answers?.find((a: any) => a.questionId === questionId)
      return answer?.value
    }

    const businessType = getAnswer('business_type') || 'עסק'
    const employeeCount = getAnswer('employee_count') || 'לא צוין'
    const dataTypes = getAnswer('data_types') || []
    const sensitiveData = getAnswer('sensitive_data') || false
    const thirdParties = getAnswer('third_parties') || []
    const securityMeasures = getAnswer('security_measures') || []
    const existingPolicy = getAnswer('existing_policy') || false

    const dataTypesStr = Array.isArray(dataTypes) ? dataTypes.join(', ') : dataTypes
    const thirdPartiesStr = Array.isArray(thirdParties) ? thirdParties.join(', ') : thirdParties
    const securityStr = Array.isArray(securityMeasures) ? securityMeasures.join(', ') : securityMeasures

    let privacyPolicy = ''
    let securityPolicy = ''
    let databaseReg = ''

    if (anthropicKey) {
      console.log('Using Claude AI for document generation')
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        // Generate Privacy Policy
        console.log('Generating privacy policy...')
        const privacyResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `אתה עורך דין מומחה בהגנת פרטיות בישראל. צור מדיניות פרטיות מקצועית ומלאה בעברית.

פרטי הארגון:
- שם: ${orgName}
- ח.פ: ${businessId || 'לא צוין'}
- סוג עסק: ${businessType}
- מספר עובדים: ${employeeCount}
- סוגי מידע נאספים: ${dataTypesStr || 'מידע אישי בסיסי'}
- מידע רגיש: ${sensitiveData ? 'כן' : 'לא'}
- צדדים שלישיים: ${thirdPartiesStr || 'לא צוינו'}

צור מדיניות פרטיות מקצועית הכוללת:
1. מבוא והצהרת מחויבות לפרטיות
2. הגדרות
3. סוגי המידע הנאסף (בהתאם לפרטים שניתנו)
4. מטרות איסוף ושימוש במידע
5. בסיס חוקי לעיבוד
6. שיתוף מידע עם צדדים שלישיים
7. העברת מידע לחו"ל (אם רלוונטי)
8. אבטחת מידע
9. תקופת שמירת מידע
10. זכויות נושא המידע (עיון, תיקון, מחיקה, התנגדות)
11. עוגיות ואיסוף אוטומטי
12. עדכון המדיניות
13. יצירת קשר עם הממונה

כתוב בשפה משפטית מקצועית אך נגישה. התייחס לחוק הגנת הפרטיות הישראלי ותיקון 13.`
          }]
        })
        privacyPolicy = privacyResponse.content[0].type === 'text' ? privacyResponse.content[0].text : ''
        console.log('Privacy policy generated, length:', privacyPolicy.length)

        // Generate Security Policy
        console.log('Generating security policy...')
        const securityResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3500,
          messages: [{
            role: 'user',
            content: `אתה מומחה אבטחת מידע. צור מדיניות אבטחת מידע מקצועית בעברית.

פרטי הארגון:
- שם: ${orgName}
- סוג עסק: ${businessType}
- מספר עובדים: ${employeeCount}
- אמצעי אבטחה קיימים: ${securityStr || 'בסיסיים'}
- מידע רגיש: ${sensitiveData ? 'כן - נדרשת אבטחה מוגברת' : 'לא'}

צור מדיניות אבטחת מידע הכוללת:
1. מבוא ומטרה
2. תחולה
3. הגדרות
4. אחריות ותפקידים (מנהל אבטחה, עובדים)
5. סיווג מידע
6. בקרת גישה והרשאות
7. אבטחה פיזית
8. אבטחה לוגית (סיסמאות, הצפנה)
9. אבטחת תקשורת
10. גיבויים והתאוששות
11. ניהול אירועי אבטחה
12. הדרכת עובדים
13. ביקורת ובקרה
14. עדכון המדיניות

התייחס לתקנות אבטחת מידע הישראליות.`
          }]
        })
        securityPolicy = securityResponse.content[0].type === 'text' ? securityResponse.content[0].text : ''
        console.log('Security policy generated, length:', securityPolicy.length)

        // Generate Database Registration
        console.log('Generating database registration...')
        const dbResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2500,
          messages: [{
            role: 'user',
            content: `צור מסמך רישום מאגר מידע בעברית לפי דרישות רשם מאגרי המידע בישראל.

פרטי הארגון:
- שם בעל המאגר: ${orgName}
- ח.פ: ${businessId || 'לא צוין'}
- סוג עסק: ${businessType}
- סוגי מידע במאגר: ${dataTypesStr || 'מידע אישי'}
- מידע רגיש: ${sensitiveData ? 'כן' : 'לא'}
- צדדים שלישיים: ${thirdPartiesStr || 'אין'}

צור מסמך הכולל:
1. פרטי בעל המאגר
2. פרטי מנהל המאגר
3. פרטי הממונה על אבטחת מידע
4. שם המאגר ומטרתו
5. סוגי המידע הנשמרים
6. מקורות המידע
7. השימושים במידע
8. העברות מידע
9. אמצעי אבטחה
10. הצהרת בעל המאגר

פורמט כטופס רשמי מסודר.`
          }]
        })
        databaseReg = dbResponse.content[0].type === 'text' ? dbResponse.content[0].text : ''
        console.log('Database registration generated, length:', databaseReg.length)

      } catch (aiError: any) {
        console.error('AI generation error:', aiError.message)
      }
    } else {
      console.log('No Anthropic API key - using fallback templates')
    }

    // Fallback content if AI fails
    if (!privacyPolicy) {
      privacyPolicy = generateFallbackPrivacyPolicy(orgName, businessType, dataTypesStr)
    }
    if (!securityPolicy) {
      securityPolicy = generateFallbackSecurityPolicy(orgName, securityStr)
    }
    if (!databaseReg) {
      databaseReg = generateFallbackDatabaseReg(orgName, businessId, dataTypesStr)
    }

    // Save documents to database
    console.log('Saving documents to database...')
    const { data: docs, error } = await supabase.from('documents').insert([
      {
        org_id: orgId,
        type: 'privacy_policy',
        title: 'מדיניות פרטיות',
        content: privacyPolicy,
        version: 1,
        status: 'active',
        generated_by: anthropicKey ? 'ai' : 'system'
      },
      {
        org_id: orgId,
        type: 'security_policy',
        title: 'מדיניות אבטחת מידע',
        content: securityPolicy,
        version: 1,
        status: 'active',
        generated_by: anthropicKey ? 'ai' : 'system'
      },
      {
        org_id: orgId,
        type: 'database_registration',
        title: 'רישום מאגר מידע',
        content: databaseReg,
        version: 1,
        status: 'active',
        generated_by: anthropicKey ? 'ai' : 'system'
      }
    ]).select()

    if (error) {
      console.error('Error saving documents:', error)
      return NextResponse.json({ error: 'Failed to save documents' }, { status: 500 })
    }

    // Update organization status
    await supabase
      .from('organizations')
      .update({ status: 'active' })
      .eq('id', orgId)

    console.log('Documents generated and saved:', docs?.length)
    return NextResponse.json({ success: true, documents: docs })

  } catch (error: any) {
    console.error('Error generating documents:', error.message)
    return NextResponse.json({ error: 'Failed to generate documents' }, { status: 500 })
  }
}

function generateFallbackPrivacyPolicy(orgName: string, businessType: string, dataTypes: string): string {
  return `מדיניות פרטיות - ${orgName}

תאריך עדכון: ${new Date().toLocaleDateString('he-IL')}

1. מבוא
${orgName} ("החברה", "אנחנו") מחויבת להגנה על פרטיותכם. מדיניות זו מתארת כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלכם בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותקנותיו.

2. סוגי המידע הנאסף
אנו עשויים לאסוף את סוגי המידע הבאים:
${dataTypes || '- פרטי קשר (שם, טלפון, דוא"ל)\n- פרטי זיהוי\n- מידע על פעילות'}

3. מטרות השימוש במידע
• מתן השירותים המבוקשים
• שיפור השירות וחווית המשתמש
• עמידה בדרישות חוק
• יצירת קשר בנושאים הקשורים לשירות

4. שיתוף מידע
לא נעביר את המידע שלכם לצדדים שלישיים אלא אם:
• נתתם הסכמה מפורשת
• נדרש על פי חוק
• נחוץ למתן השירות

5. אבטחת מידע
אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע שלכם מפני גישה בלתי מורשית.

6. זכויות נושא המידע
על פי חוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:
• זכות עיון במידע
• זכות לתיקון מידע שגוי
• זכות למחיקת מידע
• זכות להתנגד לשימוש במידע

7. יצירת קשר
לשאלות בנושא פרטיות, פנו לממונה הגנת הפרטיות:
${orgName}
privacy@company.co.il`
}

function generateFallbackSecurityPolicy(orgName: string, securityMeasures: string): string {
  return `מדיניות אבטחת מידע - ${orgName}

תאריך עדכון: ${new Date().toLocaleDateString('he-IL')}

1. מבוא
מסמך זה מגדיר את מדיניות אבטחת המידע של ${orgName} בהתאם לתקנות הגנת הפרטיות (אבטחת מידע).

2. תחולה
המדיניות חלה על כל עובדי החברה, קבלני משנה ונותני שירותים בעלי גישה למידע.

3. אחריות
• מנהל אבטחת מידע: אחראי על יישום ופיקוח
• עובדים: אחראים לשמירה על סודיות וביצוע הנחיות

4. בקרת גישה
• גישה למידע על בסיס "צורך לדעת" בלבד
• הרשאות מוגדרות לכל תפקיד
• סיסמאות חזקות ומוחלפות בקביעות

5. אמצעי אבטחה
${securityMeasures || '• הצפנת מידע\n• גיבויים יומיים\n• חומת אש ואנטי-וירוס\n• בקרת גישה פיזית'}

6. ניהול אירועי אבטחה
בכל חשד לאירוע אבטחה:
• דיווח מיידי למנהל אבטחת המידע
• תיעוד האירוע
• בירור ותיקון
• הפקת לקחים

7. הדרכות
כל עובד יעבור הדרכת אבטחת מידע עם קבלתו לעבודה ורענון שנתי.`
}

function generateFallbackDatabaseReg(orgName: string, businessId: string, dataTypes: string): string {
  return `טופס רישום מאגר מידע

תאריך: ${new Date().toLocaleDateString('he-IL')}

1. פרטי בעל המאגר
שם: ${orgName}
מספר ח.פ/ע.מ: ${businessId || '___________'}

2. שם המאגר
מאגר לקוחות ופעילות עסקית - ${orgName}

3. מטרת המאגר
ניהול קשרי לקוחות, מתן שירותים, וניהול פעילות עסקית שוטפת.

4. סוגי המידע במאגר
${dataTypes || '• פרטי זיהוי ויצירת קשר\n• היסטוריית פעילות\n• מידע פיננסי (במידת הצורך)'}

5. מקורות המידע
• ישירות מנושאי המידע
• פעילות עסקית שוטפת

6. השימושים במידע
• מתן שירותים
• יצירת קשר
• עמידה בדרישות חוק

7. העברות מידע
לא מתבצעות העברות מידע לצדדים שלישיים למעט במקרים הנדרשים על פי חוק.

8. אמצעי אבטחה
המאגר מאובטח בהתאם לתקנות הגנת הפרטיות (אבטחת מידע).

9. הצהרה
אני מצהיר כי הפרטים לעיל נכונים ומדויקים.

חתימת בעל המאגר: _______________
תאריך: ${new Date().toLocaleDateString('he-IL')}`
}

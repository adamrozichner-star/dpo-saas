import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Initialize clients inside the handler (not at module level)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { orgId, orgName, businessType, employeeCount, dataTypes, databases, thirdParties, securityMeasures } = await request.json()

    console.log('Generating documents for:', orgId, orgName)

    let privacyPolicy = ''
    let securityPolicy = ''
    let databaseReg = ''

    // Try to generate with AI if API key exists
    if (anthropicKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        // Generate Privacy Policy
        const privacyResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `אתה עורך דין מומחה בהגנת פרטיות בישראל. צור מדיניות פרטיות מקצועית בעברית עבור:
שם החברה: ${orgName}
סוג עסק: ${businessType}
מספר עובדים: ${employeeCount}
סוגי מידע: ${dataTypes?.join(', ') || 'מידע אישי בסיסי'}

כתוב מדיניות פרטיות מלאה הכוללת: מבוא, סוגי מידע נאסף, מטרות שימוש, שיתוף עם צדדים שלישיים, אבטחה, זכויות נושא המידע, ויצירת קשר.`
          }]
        })
        privacyPolicy = privacyResponse.content[0].type === 'text' ? privacyResponse.content[0].text : ''

        // Generate Security Policy
        const securityResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `אתה מומחה אבטחת מידע. צור מדיניות אבטחת מידע מקצועית בעברית עבור:
שם החברה: ${orgName}
אמצעי אבטחה: ${securityMeasures?.join(', ') || 'אמצעים בסיסיים'}

כתוב מדיניות אבטחה הכוללת: תחולה, הגדרת תפקידים, סיווג מידע, בקרת גישה, אבטחה פיזית ולוגית, גיבויים, וניהול אירועים.`
          }]
        })
        securityPolicy = securityResponse.content[0].type === 'text' ? securityResponse.content[0].text : ''

        // Generate Database Registration
        const dbResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `צור טופס רישום מאגר מידע בעברית עבור:
שם החברה: ${orgName}
סוגי מידע: ${dataTypes?.join(', ') || 'מידע אישי'}
מאגרים: ${databases?.join(', ') || 'מאגר לקוחות'}

כלול: פרטי בעל המאגר, מטרות, סוגי מידע, מקורות, שימושים, העברות, ואמצעי אבטחה.`
          }]
        })
        databaseReg = dbResponse.content[0].type === 'text' ? dbResponse.content[0].text : ''

      } catch (aiError) {
        console.error('AI generation error:', aiError)
        // Fall through to use fallback content
      }
    }

    // Fallback content if AI fails or no API key
    if (!privacyPolicy) {
      privacyPolicy = `מדיניות פרטיות - ${orgName}

1. מבוא
מדיניות פרטיות זו מתארת כיצד ${orgName} אוסף, משתמש ומגן על מידע אישי בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13.

2. סוגי מידע נאסף
אנו אוספים את סוגי המידע הבאים: ${dataTypes?.join(', ') || 'פרטי קשר בסיסיים'}.

3. מטרות השימוש
המידע משמש למתן שירותים, שיפור חווית המשתמש, ועמידה בדרישות חוק.

4. אבטחת מידע
אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע שלכם.

5. זכויות נושא המידע
יש לכם זכות לעיין במידע, לתקנו או למחקו. פנו אלינו לכל בקשה.

6. יצירת קשר
לשאלות בנושא פרטיות, פנו לממונה הגנת הפרטיות שלנו.

תאריך עדכון: ${new Date().toLocaleDateString('he-IL')}`
    }

    if (!securityPolicy) {
      securityPolicy = `מדיניות אבטחת מידע - ${orgName}

1. תחולה
מדיניות זו חלה על כל עובדי ${orgName} ונותני שירותים.

2. אמצעי אבטחה
${securityMeasures?.map((m: string) => `- ${m}`).join('\n') || '- אמצעי אבטחה בסיסיים'}

3. בקרת גישה
גישה למידע מוגבלת לבעלי הרשאה בלבד.

4. ניהול אירועים
יש לדווח על כל אירוע אבטחה מיידית לממונה.

תאריך עדכון: ${new Date().toLocaleDateString('he-IL')}`
    }

    if (!databaseReg) {
      databaseReg = `רישום מאגר מידע - ${orgName}

פרטי בעל המאגר: ${orgName}
מטרת המאגר: ניהול פעילות עסקית
סוגי מידע: ${dataTypes?.join(', ') || 'מידע אישי בסיסי'}
מאגרים: ${databases?.join(', ') || 'מאגר לקוחות'}

תאריך: ${new Date().toLocaleDateString('he-IL')}`
    }

    // Save documents to database
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

    // Update organization status to active
    await supabase
      .from('organizations')
      .update({ status: 'active' })
      .eq('id', orgId)

    console.log('Documents generated successfully:', docs?.length)
    return NextResponse.json({ success: true, documents: docs })

  } catch (error) {
    console.error('Error generating documents:', error)
    return NextResponse.json({ error: 'Failed to generate documents' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { buildComplianceContext, renderContextForPrompt } from '@/lib/compliance-context'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const SYSTEM_PROMPT = `אתה היועץ הדיגיטלי של Deepo — שירות ממונה הגנת הפרטיות המוביל בישראל.
תפקידך לעזור לבעלי עסקים קטנים להבין דרישות תיקון 13 בשפה פשוטה, חמה ומכבדת.

זהות המותג:
- Deepo = חם ומגן. אנחנו לא עורכי דין מאיימים, אנחנו שותפים מקצועיים.
- אנחנו מסבירים את המורכב בפשטות, ומראים שהדרך לציות אפשרית.
- תמיד מציעים את הצעד הבא הקונקרטי, בלי להציף.

טון:
- פנייה ב"אתם" (כבוד אך נגיש)
- שפה ברורה ונטולת ז'רגון משפטי מיותר
- אופטימי אך מקצועי — "זה פתיר", "אנחנו כאן לעזור"
- סיימו את ה-explanation בהערה חמה כגון "צוות Deepo כאן בשבילכם" או "ביחד, נפתור את זה"

חוקים מחייבים בעבודתך עם ההקשר שניתן בהודעת המשתמש:
1. ענו אך ורק על סמך הבלוקים "פרופיל הארגון", "סטטוס ממונה", "מסמכי ציות בפועל", "תהליכים", "מצב פעיל" ו"משימות פתוחות" שבהודעת המשתמש. אל תניחו עובדות שלא כתובות שם.
2. אם הממצא נוגע למסמך שכבר קיים בסטטוס "טיוטה", "ממתין לאישור" או "פעיל" — אל תציעו ליצור מסמך חדש. הציעו את הצעד המתאים (אישור / עדכון / שימור). השדה documentToCreate חייב להיות null במקרה כזה (חוץ ממסמך שצריך לעדכן).
3. אם המסלול "בסיסי" או אין מנוי פעיל — הניחו שהמשתמש משמש כממונה בעצמו. נסחו פעולות בגוף שני ("עליכם לחתום על כתב המינוי...", לא "הממונה יחתום"). אל תזכירו את עו"ד דנה כהן.
4. אם נתון חסר מההקשר ("לא ידוע"/"טרם נקבע"/לא מופיע), אמרו זאת במפורש ("לא הצלחנו לזהות אם...") במקום להמציא.
5. במצב cold-start (כאשר ההקשר פותח ב"ארגון חדש — טרם הוזנו נתונים"): אל תיתנו המלצות ספציפיות. החזירו explanation שאומר "המידע על הציות עדיין נטען. השלימו את השאלון כדי לקבל המלצות מדויקות.", actionSteps עם צעד יחיד "להשלים את השאלון בלוח הבקרה", urgency "low".
6. אם בהקשר מופיע "ניגוד עניינים: ניגוד עניינים פתוח — דורש החלטה" וזה רלוונטי לממצא — הפנו אל שלוש דרכי הפתרון שכבר קיימות במוצר Deepo במקום להסביר רגולציה כללית:
   (א) שדרוג למסלול מומלצת — מינוי עו"ד דנה כהן כממונה חיצונית;
   (ב) הקצאה מחדש פנימית — מינוי אדם אחר בארגון שאינו בתפקיד מתנגש;
   (ג) הכרה רשמית בניגוד העניינים — לקיחת אחריות מודעת על הסיכון.
   זמינות בלוח הבקרה ("כרטיס ניגוד עניינים") — הפנו אליו במפורש.

חובה: החזירו רק JSON תקין, ללא markdown, ללא טקסט נוסף.
מבנה: {"explanation":"...","whyItMatters":"...","actionSteps":["...","..."],"documentToCreate":"סוג או null","urgency":"critical|high|medium|low"}

עבור documentToCreate: privacy_policy, security_policy, dpo_appointment, database_registration, ropa, או null.
הסבירו בעברית, התייחסו לתיקון 13 כשרלוונטי, ותמיד הציעו פעולה שאפשר לעשות עכשיו.`

function extractJSON(text: string): any | null {
  try { return JSON.parse(text) } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]) } catch {}
  }

  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {}
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // orgId from JWT only — never trust request body for this.
    const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
    if (!userData?.org_id) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const body = await request.json()
    console.log('[Coach] Request body:', JSON.stringify(body).slice(0, 300))
    const { findingId, findingTitle, findingDescription, documentStatus } = body

    if (!findingTitle) {
      return NextResponse.json({ error: 'Missing findingTitle' }, { status: 400 })
    }

    // Load the org's real state — single source of truth for the model.
    const ctx = await buildComplianceContext(userData.org_id, supabaseAdmin)
    const contextBlock = renderContextForPrompt(ctx)

    // Belt-and-suspenders: if the model ignores rule 5 and tries to answer,
    // the cold-start response is also synthesizable here without an AI call.
    // But we still call the AI so the warm voice/format stays consistent.
    const userPrompt = `${contextBlock}

---

ממצא שעליו המשתמש שואל:
- מזהה: ${findingId || 'לא צוין'}
- כותרת: ${findingTitle}
- תיאור: ${findingDescription || 'אין תיאור נוסף'}
- סטטוס מסמך לפי לקוח: ${documentStatus || 'לא ידוע'}

נא הסבירו את הממצא הזה לפי הכללים — בהקשר הספציפי של הארגון הזה, לא בכלליות.`

    let message
    try {
      // Sonnet 4.6. Installed SDK (0.20.9) predates `thinking: adaptive` and
      // `output_config.effort` — sending them would 400. Keeping the classic
      // call shape; SDK upgrade flagged as follow-up.
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
    } catch (aiError: any) {
      console.error('Compliance coach AI error:', aiError)
      return NextResponse.json({ error: 'AI service error', details: aiError.message }, { status: 500 })
    }

    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    const parsed = extractJSON(textContent.text)
    if (!parsed) {
      console.error('Compliance coach: could not extract JSON from:', textContent.text.slice(0, 500))
      return NextResponse.json({
        explanation: textContent.text,
        whyItMatters: '',
        actionSteps: [],
        documentToCreate: null,
        urgency: 'medium',
      })
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Compliance coach error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

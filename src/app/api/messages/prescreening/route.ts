import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const SYSTEM_PROMPT = `אתה עוזר ממיין פניות לממונה הגנת פרטיות (DPO) בארגון ישראלי.

התפקיד שלך: לחדד ולהבהיר את הפנייה של הלקוח כדי שהממונה יקבל שאלה ברורה, מפורטת ומוכנה למענה.

אתה לא עונה על שאלות פרטיות בעצמך. אתה שואל שאלות הבהרה עד שיש לך תמונה מלאה.

כללים:
- דבר בעברית, בטון מקצועי וחם
- שאל שאלה אחת ממוקדת בכל פעם
- היה חכם — אם הלקוח כתב "מצלמות במשרד", אתה כבר יודע שזה וידאו, במקום עבודה, מערב עובדים. אל תשאל מה שאפשר להסיק.
- אם הלקוח נותן תשובה ארוכה, חלץ ממנה כמה שיותר פרטים ודלג על שאלות שכבר נענו
- מקסימום 3-4 שאלות. אחרי 3 שאלות, אם יש לך תמונה סבירה — סכם ושלח לממונה. עדיף סיכום עם 80% מהפרטים מאשר לאבד את הלקוח ב-7 שאלות.
- לפני השאלה האחרונה, תגיד משהו כמו "עוד שאלה אחת וסיימנו" כדי שהלקוח ידע שזה כמעט נגמר
- סווג את הדחיפות: אירוע אבטחה/דליפה/תלונת רגולטור = urgent, שאר השאלות = regular
- אל תמציא תשובות משפטיות. התפקיד שלך הוא רק לחדד את השאלה.

פורמט תשובה — תמיד JSON תקין בלבד:

אם צריך עוד מידע:
{"ready":false,"message":"השאלה הבאה שלך"}

כשמספיק מידע:
{"ready":true,"summary":{"subject":"כותרת קצרה","urgency":"regular או urgent","background":"2-3 משפטים שמתארים את המצב","details":{"data_type":"סוג מידע","involved_parties":"גורמים מעורבים","storage_location":"מיקום אחסון","legal_basis":"בסיס חוקי","trigger":"מה גרם ללקוח לשאול"},"question":"השאלה המדויקת — משפט אחד או שניים שהממונה יכול לענות עליהם ישירות","notes":"דגשים נוספים, סיכונים פוטנציאליים"}}

חובה: רק JSON, ללא markdown, ללא טקסט נוסף.

הקשר רגולטורי: תיקון 13 לחוק הגנת הפרטיות, תקנות אבטחת מידע 2017, סעיף 11 לחוק.`

function extractJSON(text: string): any | null {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { userMessage, conversationHistory } = body

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: JSON.stringify(msg.rawJson || { ready: false, message: msg.content }) })
        }
      }
    }

    messages.push({ role: 'user', content: userMessage })

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    })

    const textContent = aiResponse.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No AI response' }, { status: 500 })
    }

    const parsed = extractJSON(textContent.text)

    if (parsed?.ready && parsed.summary) {
      const s = parsed.summary
      const urgency = s.urgency === 'urgent' ? 'urgent' : 'regular'
      const urgencyLabel = urgency === 'urgent' ? '🔴 דחוף' : '🟢 רגיל'

      const formattedSummary = `📋 פנייה מסוכמת

נושא: ${s.subject || ''}
דחיפות: ${urgencyLabel}

רקע:
${s.background || 'לא צוין'}

פרטים:
• סוג מידע: ${s.details?.data_type || 'לא צוין'}
• גורמים מעורבים: ${s.details?.involved_parties || 'לא צוין'}
• מיקום אחסון: ${s.details?.storage_location || 'לא צוין'}
• בסיס חוקי: ${s.details?.legal_basis || 'לא צוין'}
• טריגר: ${s.details?.trigger || 'לא צוין'}

שאלה מדויקת:
${s.question || ''}

${s.notes ? `הערות:\n${s.notes}` : ''}`

      return NextResponse.json({
        ready: true,
        message: 'תודה רבה! יש לי מספיק מידע. אני מעביר את הפנייה המסוכמת לממונה.',
        summary: formattedSummary,
        subject: s.subject || 'פנייה חדשה',
        urgency,
        rawJson: parsed,
      })
    }

    const aiMessage = parsed?.message || textContent.text
    return NextResponse.json({
      ready: false,
      message: aiMessage,
      rawJson: parsed || { ready: false, message: aiMessage },
    })
  } catch (error: any) {
    console.error('Pre-screening error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

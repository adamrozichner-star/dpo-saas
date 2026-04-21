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
- המשך לשאול עד שיש לך את כל הפרטים הנדרשים
- תחומים חשובים להבהרה: סוג המידע, מי ניגש, איפה מאוחסן, בסיס חוקי, צדדים שלישיים, מה הטריגר לשאלה, משך שמירה
- כשיש לך מספיק מידע, החזר JSON בלבד בפורמט הבא:

{"ready":true,"summary":{"subject":"כותרת קצרה","background":"תיאור המצב","details":{"data_type":"סוג מידע","involved_parties":"גורמים מעורבים","storage_location":"מיקום אחסון","legal_basis":"בסיס חוקי","trigger":"טריגר"},"question":"השאלה המדויקת","notes":"הערות"}}

- אם אתה עדיין צריך מידע, החזר JSON: {"ready":false,"message":"השאלה הבאה שלך"}
- אל תמציא תשובות משפטיות. התפקיד שלך הוא רק לחדד את השאלה.
- חובה: תמיד החזר רק JSON תקין, ללא markdown, ללא טקסט נוסף.

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

    // Build messages array for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'assistant') {
          // Re-serialize the AI's original JSON response as content
          messages.push({ role: 'assistant', content: JSON.stringify(msg.rawJson || { ready: false, message: msg.content }) })
        }
      }
    }

    // Add the new user message
    messages.push({ role: 'user', content: userMessage })

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const textContent = aiResponse.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No AI response' }, { status: 500 })
    }

    const parsed = extractJSON(textContent.text)

    if (parsed?.ready && parsed.summary) {
      // Format the summary for DPO
      const s = parsed.summary
      const formattedSummary = `📋 פנייה מסוכמת

נושא: ${s.subject || ''}
רקע: ${s.background || ''}
פרטים:
- סוג מידע: ${s.details?.data_type || 'לא צוין'}
- גורמים מעורבים: ${s.details?.involved_parties || 'לא צוין'}
- מיקום אחסון: ${s.details?.storage_location || 'לא צוין'}
- בסיס חוקי: ${s.details?.legal_basis || 'לא צוין'}
- טריגר: ${s.details?.trigger || 'לא צוין'}

שאלה מדויקת: ${s.question || ''}
${s.notes ? `הערות: ${s.notes}` : ''}`

      return NextResponse.json({
        ready: true,
        message: 'תודה רבה! יש לי מספיק מידע. אני מעביר את הפנייה המסוכמת לממונה.',
        summary: formattedSummary,
        subject: s.subject || 'פנייה חדשה',
        rawJson: parsed,
      })
    }

    // Still clarifying
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

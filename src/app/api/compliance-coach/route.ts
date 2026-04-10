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

const SYSTEM_PROMPT = `אתה יועץ מומחה לחוק הגנת הפרטיות בישראל ולתיקון 13. תפקידך להסביר ממצאי ציות בשפה פשוטה לבעלי עסקים קטנים שאינם משפטנים. תמיד תן: הסבר ברור, סיבה משפטית מדויקת, צעדי פעולה קונקרטיים, ודחיפות (קריטית/בינונית/נמוכה). הימנע מז'רגון משפטי.

חובה להחזיר JSON תקין בלבד, ללא טקסט נוסף, ללא הסברים, ללא markdown code blocks. רק האובייקט:
{"explanation":"...","whyItMatters":"...","actionSteps":["...","...","..."],"documentToCreate":"סוג_מסמך או null","urgency":"critical | high | medium | low"}

עבור documentToCreate, השתמש באחד מהערכים הבאים אם רלוונטי:
privacy_policy, security_policy, dpo_appointment, database_registration, ropa, או null.`

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

    const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
    if (!userData?.org_id) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const body = await request.json()
    console.log('[Coach] Request body:', JSON.stringify(body).slice(0, 300))
    const { findingId, findingTitle, findingDescription, orgContext } = body

    if (!findingTitle) {
      return NextResponse.json({ error: 'Missing findingTitle' }, { status: 400 })
    }

    // Fetch org context if not provided
    let industry = orgContext?.industry || ''
    let orgSize = orgContext?.size || ''
    if (!industry || !orgSize) {
      const { data: profile } = await supabaseAdmin
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', userData.org_id)
        .maybeSingle()
      const v3 = profile?.profile_data?.v3Answers || {}
      industry = industry || v3.industry || v3.bizType || 'לא ידוע'
      orgSize = orgSize || v3.employeeCount || v3.orgSize || 'לא ידוע'
    }

    const userPrompt = `ממצא ציות:
כותרת: ${findingTitle}
תיאור: ${findingDescription || 'אין תיאור נוסף'}

פרטי הארגון:
תחום: ${industry}
גודל: ${orgSize}

נא להסביר את הממצא הזה ולתת הנחיות לפעולה.`

    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
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

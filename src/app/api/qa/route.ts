import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { question, orgId, userId } = await request.json()

    // Get organization context
    const { data: org } = await supabase
      .from('organizations')
      .select('*, organization_profiles(*)')
      .eq('id', orgId)
      .single()

    // Get relevant documents for context
    const { data: docs } = await supabase
      .from('documents')
      .select('title, content, type')
      .eq('org_id', orgId)
      .limit(3)

    const docContext = docs?.map(d => `${d.title}:\n${d.content?.substring(0, 500)}...`).join('\n\n') || ''

    let answer = ''
    let confidenceScore = 0.85

    if (anthropicKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        const message = await anthropic.messages.create({
         model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: `אתה עוזר מומחה בהגנת פרטיות בישראל. אתה עונה על שאלות של עובדים בארגון בנושאי פרטיות, GDPR, וחוק הגנת הפרטיות הישראלי.

פרטי הארגון:
- שם: ${org?.name || 'לא ידוע'}
- סוג עסק: ${org?.organization_profiles?.[0]?.business_type || 'לא ידוע'}

מסמכי הארגון:
${docContext}

הנחיות:
1. ענה בעברית תקנית ומקצועית
2. היה תמציתי וברור
3. אם אינך בטוח, ציין זאת והמלץ לפנות לממונה
4. אל תמציא מידע - אם אינך יודע, אמור זאת`,
          messages: [{ role: 'user', content: question }]
        })

        const textContent = message.content.find(c => c.type === 'text')
        answer = textContent ? textContent.text : ''
      } catch (aiError) {
        console.error('AI Q&A error:', aiError)
      }
    }

    // Fallback answer if AI fails
    if (!answer) {
      const questionLower = question.toLowerCase()
      if (questionLower.includes('מחיקה') || questionLower.includes('למחוק')) {
        answer = 'בהתאם לזכות המחיקה בחוק הגנת הפרטיות, יש לטפל בבקשת מחיקה תוך 30 יום. יש לתעד את הבקשה, לבצע את המחיקה מכל המערכות, ולשלוח אישור ללקוח.'
      } else if (questionLower.includes('ניוזלטר') || questionLower.includes('דיוור') || questionLower.includes('שיווק')) {
        answer = 'שליחת דיוור שיווקי מחייבת הסכמה מפורשת מראש (opt-in). ההסכמה צריכה להיות ברורה, מתועדת, וניתנת לביטול בכל עת.'
      } else {
        answer = 'תודה על השאלה. על פי הנהלים והמדיניות, מומלץ לפעול בזהירות ולתעד כל פעולה. אם יש צורך בהכוונה נוספת, ניתן לפנות לממונה.'
      }
      confidenceScore = 0.6
    }

    const shouldEscalate = confidenceScore < 0.7

    // Save Q&A to database
    const { data: qa, error } = await supabase
      .from('qa_interactions')
      .insert({
        org_id: orgId,
        user_id: userId,
        question,
        answer,
        confidence_score: confidenceScore,
        escalated: shouldEscalate
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving Q&A:', error)
    }

    return NextResponse.json({
      answer,
      confidenceScore,
      escalated: shouldEscalate,
      id: qa?.id
    })
  } catch (error) {
    console.error('Error in Q&A:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}

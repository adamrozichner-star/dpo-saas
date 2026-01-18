import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('QA API called')
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)
    console.log('Anthropic Key exists:', !!anthropicKey)
    console.log('Anthropic Key prefix:', anthropicKey?.substring(0, 10))

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { question, orgId, userId } = await request.json()
    console.log('Question:', question)
    console.log('OrgId:', orgId)

    // Get organization context
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*, organization_profiles(*)')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('Org fetch error:', orgError)
    }
    console.log('Org name:', org?.name)

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
      console.log('Attempting Claude API call...')
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: `אתה עוזר מומחה בהגנת פרטיות בישראל. אתה עונה על שאלות של עובדים בארגון בנושאי פרטיות, GDPR, וחוק הגנת הפרטיות הישראלי.

פרטי הארגון:
- שם: ${org?.name || 'לא ידוע'}

הנחיות:
1. ענה בעברית תקנית ומקצועית
2. היה תמציתי וברור (2-4 משפטים)
3. אם אינך בטוח, ציין זאת והמלץ לפנות לממונה
4. אל תמציא מידע - אם אינך יודע, אמור זאת`,
          messages: [{ role: 'user', content: question }]
        })

        console.log('Claude API response received')
        const textContent = message.content.find(c => c.type === 'text')
        if (textContent && textContent.type === 'text') {
          answer = textContent.text
          console.log('Answer length:', answer.length)
        }
      } catch (aiError: any) {
        console.error('AI Q&A error:', aiError.message)
        console.error('AI error details:', JSON.stringify(aiError))
      }
    } else {
      console.log('No Anthropic API key found')
    }

    // Fallback answer if AI fails
    if (!answer) {
      console.log('Using fallback answer')
      const questionLower = question.toLowerCase()
      if (questionLower.includes('מחיקה') || questionLower.includes('למחוק')) {
        answer = 'בהתאם לזכות המחיקה בחוק הגנת הפרטיות, יש לטפל בבקשת מחיקה תוך 30 יום. יש לתעד את הבקשה, לבצע את המחיקה מכל המערכות, ולשלוח אישור ללקוח.'
      } else if (questionLower.includes('ניוזלטר') || questionLower.includes('דיוור') || questionLower.includes('שיווק')) {
        answer = 'שליחת דיוור שיווקי מחייבת הסכמה מפורשת מראש (opt-in). ההסכמה צריכה להיות ברורה, מתועדת, וניתנת לביטול בכל עת.'
      } else if (questionLower.includes('מדיניות') || questionLower.includes('פרטיות')) {
        answer = 'מדיניות הפרטיות צריכה להיות מעודכנת ולכלול: סוגי המידע הנאספים, מטרות השימוש, זכויות הלקוח, ופרטי יצירת קשר עם הממונה. מומלץ לעדכן בכל שינוי מהותי בפעילות.'
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

    console.log('Returning response, escalated:', shouldEscalate)

    return NextResponse.json({
      answer,
      confidenceScore,
      escalated: shouldEscalate,
      id: qa?.id
    })
  } catch (error: any) {
    console.error('Error in Q&A:', error.message)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}

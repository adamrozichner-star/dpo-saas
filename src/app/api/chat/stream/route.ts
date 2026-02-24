import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// Import the system prompt and helpers from the main chat route
// (Duplicated here to keep the streaming endpoint self-contained)

const DPO_SYSTEM_PROMPT = `אתה עוזר דיגיטלי מומחה בהגנת פרטיות ואבטחת מידע בישראל. אתה עובד עבור "MyDPO" - שירות DPO (ממונה הגנת פרטיות) לעסקים.

🎯 המטרה שלך: לעזור לעסקים לעמוד בדרישות תיקון 13 לחוק הגנת הפרטיות בצורה פשוטה וידידותית.

📋 הכללים שלך:
1. תמיד ענה בעברית, בשפה פשוטה וברורה
2. אל תפחיד - תן מידע מעשי וישים
3. כשמשהו דחוף (כמו אירוע אבטחה) - הדגש את הדחיפות בעדינות
4. הצע תמיד את הצעד הבא הקונקרטי
5. כשאתה לא בטוח - הצע להעביר לממונה האנושי

⚠️ חשוב מאוד - עיצוב התשובות:
- אל תשתמש בסימני Markdown כמו ** או ### או ## בתשובות
- במקום **טקסט** פשוט כתוב את הטקסט רגיל
- במקום ### כותרת פשוט כתוב את הכותרת בשורה נפרדת
- השתמש באימוג'ים להדגשה במקום סימני עיצוב
- השתמש בנקודות (•) או מספרים לרשימות
- שמור על קריאות עם רווחים בין פסקאות

🔒 נושאים שאתה מומחה בהם:
- מדיניות פרטיות ותקנונים
- רישום מאגרי מידע
- טיפול בבקשות מידע מנושאי מידע (DSAR)
- אירועי אבטחה ודיווח לרשות
- הדרכת עובדים, ROPA, הסכמות, העברת מידע לחו"ל
- הסכמי עיבוד מידע עם ספקים

⚠️ זיהוי אירועי אבטחה:
אם המשתמש מזכיר דליפה, פריצה, האקר, וירוס, כופר, פישינג, אובדן מחשב, מייל בטעות, גישה לא מורשית - זהה כאירוע אבטחה! הסבר על 72 שעות לדיווח.

📄 יצירת מסמכים:
כשמבקשים ממך ליצור מסמך - צור את המסמך המלא עצמו, מוכן לשימוש. לא הסבר על מה צריך להיות בו!
בסוף מסמך הוסף: [DOCUMENT_GENERATED]

🎨 סגנון: חם ונגיש, מקצועי אבל לא יבש. פסקאות קצרות. הצעה לפעולה בסוף כל תשובה.`

function detectIntent(message: string): string {
  const msg = message.toLowerCase()
  if (/דליפ|פריצ|האק|וירוס|כופר|פישינג|נגנב|אבד|נפרץ|אירוע|בטעות שלחתי|גישה לא מורשית|דלף|breach|leak/.test(msg)) return 'incident'
  if (/מדיניות פרטיות|privacy policy|תקנון|נוהל|טופס (הסכמה|consent)|מסמך|צור לי|צור עבור|תכין לי|צריך מסמך|תייצר|הסכם עיבוד|dpa|כתב מינוי|אנא צור/.test(msg)) return 'document'
  if (/בקשת מידע|עובד.*(רוצה|מבקש|שאל)|לקוח.*(רוצה|מבקש)|למחוק.*מידע|זכות.*(עיון|מחיקה|תיקון)|dsar/.test(msg)) return 'dsar'
  if (/סטטוס|מה המצב|איפה אני|ציון|ציות|מה חסר/.test(msg)) return 'status'
  if (/לדבר עם|להעביר ל|ממונה אנושי|בן אדם|עזרה אישית|מסובך/.test(msg)) return 'escalate'
  if (/ropa|מאגר.*מידע|פעילו.*עיבוד|מפת עיבוד/.test(msg)) return 'ropa'
  if (/\?|מה זה|איך |למה |מתי |האם |אפשר |מי צריך|צריך ל/.test(msg)) return 'question'
  return 'general'
}

function detectDocType(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('מדיניות פרטיות') || msg.includes('privacy policy')) return 'privacy_policy'
  if (msg.includes('אבטחת מידע') || msg.includes('נוהל אבטח')) return 'security_procedure'
  if (msg.includes('הסכמה') || msg.includes('consent')) return 'consent_form'
  if (msg.includes('הסכם עיבוד') || msg.includes('dpa')) return 'dpa'
  if (msg.includes('מינוי') || msg.includes('כתב מינוי')) return 'dpo_appointment'
  if (msg.includes('מאגר') || msg.includes('רישום מאגר')) return 'database_registration'
  return 'general'
}

function getDocTitle(type: string): string {
  const titles: Record<string, string> = {
    privacy_policy: 'מדיניות פרטיות', security_procedure: 'נוהל אבטחת מידע',
    consent_form: 'טופס הסכמה', dpa: 'הסכם עיבוד מידע',
    dpo_appointment: 'כתב מינוי ממונה פרטיות', database_registration: 'רישום מאגר מידע',
    general: 'מסמך'
  }
  return titles[type] || 'מסמך'
}

export async function POST(request: NextRequest) {
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request, supabase)
    if (!auth) return unauthorizedResponse()
    
    const { message, conversationId } = await request.json()
    const orgId = auth.orgId // Use authenticated orgId

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
    }

    const intent = detectIntent(message)
    const convId = conversationId || `conv-${Date.now()}`

    // Save user message
    let userMsgId = `temp-${Date.now()}`
    try {
      const { data } = await supabase
        .from('chat_messages')
        .insert({ org_id: orgId, role: 'user', content: message, intent, conversation_id: convId })
        .select('id')
        .single()
      if (data) userMsgId = data.id
    } catch (e) { /* table may not exist */ }

    // Get org context
    const { data: org } = await supabase
      .from('organizations')
      .select('name, industry, employee_count, compliance_score')
      .eq('id', orgId)
      .single()

    // Get org profile (onboarding answers) for richer context
    let profileContext = ''
    try {
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', orgId)
        .single()
      
      if (profile?.profile_data?.answers) {
        const answers = profile.profile_data.answers
        const dataTypes = answers.find((a: any) => a.questionId === 'data_types')?.value
        const dataSources = answers.find((a: any) => a.questionId === 'data_sources')?.value
        const dataSharing = answers.find((a: any) => a.questionId === 'shares_data')?.value
        const hasCameras = answers.find((a: any) => a.questionId === 'has_cameras')?.value
        const processesMinors = answers.find((a: any) => a.questionId === 'processes_minors')?.value
        const websiteLeads = answers.find((a: any) => a.questionId === 'website_leads')?.value
        const suppliersCount = answers.find((a: any) => a.questionId === 'suppliers_count')?.value
        const cvRetention = answers.find((a: any) => a.questionId === 'cv_retention')?.value
        const existingPolicy = answers.find((a: any) => a.questionId === 'existing_policy')?.value
        const dbRegistered = answers.find((a: any) => a.questionId === 'database_registered')?.value

        const parts = []
        if (dataTypes?.length) parts.push(`סוגי מידע: ${dataTypes.join(', ')}`)
        if (dataSources?.length) parts.push(`מקורות: ${dataSources.join(', ')}`)
        if (dataSharing) parts.push(`משתף מידע: ${dataSharing}`)
        if (hasCameras) parts.push(`מצלמות: ${hasCameras === 'true' || hasCameras === true ? 'כן' : 'לא'}`)
        if (processesMinors) parts.push(`מידע קטינים: ${processesMinors === 'true' || processesMinors === true ? 'כן' : 'לא'}`)
        if (websiteLeads) parts.push(`טפסי לידים באתר: ${websiteLeads === 'true' || websiteLeads === true ? 'כן' : 'לא'}`)
        if (suppliersCount) parts.push(`ספקים חיצוניים: ${suppliersCount}`)
        if (cvRetention) parts.push(`שמירת קורות חיים: ${cvRetention === 'true' || cvRetention === true ? 'כן' : 'לא'}`)
        if (existingPolicy !== undefined) parts.push(`מדיניות קיימת: ${existingPolicy === 'true' || existingPolicy === true ? 'כן' : 'לא'}`)
        if (dbRegistered) parts.push(`מאגרים רשומים: ${dbRegistered}`)
        
        if (parts.length > 0) profileContext = '\n- ' + parts.join('\n- ')
      }
    } catch {} // profile may not exist

    // Get recent history
    let conversationHistory: { role: 'user' | 'assistant', content: string }[] = []
    try {
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(12)
      conversationHistory = (history || []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    } catch (e) { /* no history */ }

    if (conversationHistory.length === 0 || conversationHistory[conversationHistory.length - 1]?.content !== message) {
      conversationHistory.push({ role: 'user', content: message })
    }

    const contextPrompt = `${DPO_SYSTEM_PROMPT}

📊 מידע על הארגון:
- שם: ${org?.name || 'לא ידוע'}
- תחום: ${org?.industry || 'לא צוין'}
- מספר עובדים: ${org?.employee_count || 'לא ידוע'}
- ציון ציות: ${org?.compliance_score || 0}%${profileContext}

${intent === 'incident' ? '\n⚠️ זוהה אירוע אבטחה פוטנציאלי! וודא שהמשתמש מבין את הדחיפות (72 שעות).\n' : ''}
${intent === 'document' ? '\n📄 המשתמש מבקש מסמך - צור את המסמך המלא עצמו! השתמש ב-[DOCUMENT_GENERATED] בסוף.\n' : ''}
${intent === 'escalate' ? '\n👤 המשתמש רוצה לדבר עם ממונה אנושי.\n' : ''}`

    const maxTokens = intent === 'document' ? 4000 : 1500

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: contextPrompt,
      messages: conversationHistory
    })

    let fullText = ''

    // Create ReadableStream for SSE
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // Send metadata first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', intent, conversationId: convId, userMsgId })}\n\n`))

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullText += text

              // Strip markdown as we go
              const cleanText = text
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/^###\s*/gm, '')
                .replace(/^##\s*/gm, '')
                .replace(/^#\s*/gm, '')
                .replace(/```[a-z]*\n?/g, '')
                .replace(/`([^`]+)`/g, '$1')

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: cleanText })}\n\n`))
            }
          }

          // Clean full text
          fullText = fullText
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/^###\s*/gm, '')
            .replace(/^##\s*/gm, '')
            .replace(/^#\s*/gm, '')
            .replace(/```[a-z]*\n?/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .trim()

          // Check for generated document
          let generatedDoc = null
          if (fullText.includes('[DOCUMENT_GENERATED]')) {
            fullText = fullText.replace('[DOCUMENT_GENERATED]', '').trim()
            generatedDoc = { type: detectDocType(message), content: fullText, name: getDocTitle(detectDocType(message)) }
          } else if (intent === 'document' && fullText.length > 800) {
            const indicators = [/\d+\.\s+[א-ת]/m, /\d+\.\d+\.?\s+[א-ת]/m, /גרסה/i, /מדיניות/, /נוהל/, /תחולה/, /הגדרות/, /אחריות/, /מטרה/, /בקרה/]
            const matchCount = indicators.filter(r => r.test(fullText)).length
            const isExplanation = /צריך לכלול|כדאי לכלול|להלן הסברים|אסביר/.test(fullText)
            if (matchCount >= 3 && !isExplanation) {
              generatedDoc = { type: detectDocType(message), content: fullText, name: getDocTitle(detectDocType(message)) }
            }
          }

          // Determine quick actions
          let quickActions = null
          if (intent === 'incident') {
            quickActions = { type: 'incident_flow', buttons: [
              { id: 'start_incident', label: '🚨 פתח דיווח אירוע', style: 'danger' },
              { id: 'just_question', label: 'רק שאלה כללית', style: 'secondary' }
            ]}
          } else if (intent === 'escalate') {
            quickActions = { type: 'escalate_flow', buttons: [
              { id: 'escalate_now', label: '👤 העבר לממונה', style: 'primary' },
              { id: 'continue_chat', label: 'המשך בצ\'אט', style: 'secondary' }
            ]}
          } else if (generatedDoc) {
            quickActions = { type: 'document_flow', buttons: [
              { id: 'save_doc', label: '💾 שמור מסמך', style: 'primary' },
              { id: 'edit_doc', label: '✏️ ערוך', style: 'secondary' },
              { id: 'review_request', label: '👁️ בקש סקירה', style: 'outline' }
            ]}
          }

          // Save assistant message to DB
          let assistantMsgId = `temp-assistant-${Date.now()}`
          try {
            const { data } = await supabase
              .from('chat_messages')
              .insert({
                org_id: orgId, role: 'assistant', content: fullText, intent,
                conversation_id: convId,
                metadata: generatedDoc ? { generated_document: generatedDoc } : null
              })
              .select('id')
              .single()
            if (data) assistantMsgId = data.id
          } catch (e) { /* table may not exist */ }

          // Send final event with metadata
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            assistantMsgId,
            intent,
            quickActions,
            generatedDocument: generatedDoc,
            conversationId: convId
          })}\n\n`))

        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`))
        }

        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Stream error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}

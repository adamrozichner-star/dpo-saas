import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth'
import { maskPII, unmaskPII } from '@/lib/pii-guard'
import { checkRateLimit, RATE_LIMITS, rateLimitKey, isDuplicateAbuse, isRapidFire } from '@/lib/rate-limiter'
import { validateInput, VALIDATION_CONFIGS } from '@/lib/input-validator'
import { assembleContext, formatContextForPrompt, maybeUpdateSummary, extractAndSaveFacts } from '@/lib/chat-memory'

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
⛔ ברירת מחדל: אל תייצר מסמך! הסבר קצר (3-5 נקודות) ושאל אם לייצר.
✅ ייצר מסמך מלא רק עם פועל יצירה מפורש: "צור לי", "תכין לי", "כתוב לי", "תייצר לי"
❌ כששואלים "איך ליצור", "צריך מדיניות", "מה כולל" → הסבר קצר (מקסימום 400 מילים) + שאל "רוצה שאיצור?"
בסוף מסמך שנוצר הוסף: [DOCUMENT_GENERATED]

🎨 סגנון: חם ונגיש, מקצועי אבל לא יבש. פסקאות קצרות. הצעה לפעולה בסוף כל תשובה.

🚫 נושאים מחוץ לתחום:
אם המשתמש שואל שאלה שאינה קשורה כלל לפרטיות, אבטחת מידע, או ציות רגולטורי (למשל: מתכונים, תיקון מכשירים, ספורט, בידור, טכנולוגיה כללית) — ענה בהומור קל בעברית, הזכר שאתה מתמחה רק בפרטיות ואבטחה, והצע לחפש בגוגל. שמור על טון חם. דוגמה: "הייתי שמח לעזור 🍳 אבל אני מומחה רק לפרטיות ואבטחת מידע! לזה — נסו גוגל. לשאלות פרטיות — אני כאן 🔒"`

function detectIntent(message: string): string {
  const msg = message.toLowerCase()
  if (/דליפ|פריצ|האק|וירוס|כופר|פישינג|נגנב|אבד|נפרץ|אירוע|בטעות שלחתי|גישה לא מורשית|דלף|breach|leak/.test(msg)) return 'incident'
  
  // Document creation — ONLY when explicitly asking to CREATE
  const hasCreationVerb = /צור לי|צור עבור|תכין לי|תייצר|אנא צור|תכתוב לי|כתוב לי|הכן לי|צריך ש(תכין|תיצור|תכתוב)|תנסח לי|נסח לי/.test(msg)
  const hasDocType = /מדיניות|privacy policy|תקנון|נוהל|טופס|מסמך|הסכם עיבוד|dpa|כתב מינוי/.test(msg)
  const isQuestion = /\?|איך|מה זה|מה צריך|מה כולל|למה|מתי|האם|מהו|מהי|הסבר|צריך ל/.test(msg)
  if (hasCreationVerb && hasDocType && !isQuestion) return 'document'
  if (/בקשת מידע|עובד.*(רוצה|מבקש|שאל)|לקוח.*(רוצה|מבקש)|למחוק.*מידע|זכות.*(עיון|מחיקה|תיקון)|dsar/.test(msg)) return 'dsar'
  if (/סטטוס|מה המצב|איפה אני|ציון|ציות|מה חסר/.test(msg)) return 'status'
  if (/לדבר עם|להעביר ל|ממונה אנושי|בן אדם|עזרה אישית|מסובך/.test(msg)) return 'escalate'
  if (/ropa|מאגר.*מידע|פעילו.*עיבוד|מפת עיבוד/.test(msg)) return 'ropa'
  if (/\?|מה זה|איך |למה |מתי |האם |אפשר |מי צריך|צריך ל/.test(msg)) return 'question'
  // Off-topic: no privacy/security keywords and message is substantial
  const privacyKeywords = /פרטיות|אבטח|מידע|מסמך|חוק|רגולצי|ציות|dpo|gdpr|breach|מאגר|הסכמ|מדיניות|נוהל|עובד|ספק|מצלמ|קטינ|dsar|ropa|דיווח|אירוע|הדרכ|סיכון|ביקורת|הגנ|תיקון 13|amendment|privacy|security|compliance|data|consent|processor|controller/
  if (msg.length > 10 && !privacyKeywords.test(msg)) return 'off_topic'
  return 'general'
}

// Revision detection: user wants to edit the last generated document
function isRevisionRequest(message: string): boolean {
  const msg = message.toLowerCase();
  const revisionPatterns = [
    /שנה|שני/, // שנה/שני
    /תתקן|תקן/, // תתקן/תקן
    /עדכן|עדכנ/, // עדכן
    /הוסף.*סעיף/, // הוסף סעיף
    /הסר.*סעיף/, // הסר סעיף
    /החלף.*ב/, // החלף ב
    /תוסיף/, // תוסיף
    /תחליף/, // תחליף
    /ערוך|עריכה/, // ערוך/עריכה
    /revise|revision|edit.*doc|change.*doc|modify/,
    /תעשה שינוי/, // תעשה שינוי
    /במקום/, // במקום (instead of)
    /אפשר לשנות/, // אפשר לשנות
  ];
  return revisionPatterns.some(function(p) { return p.test(msg); });
}

// Track revision count per conversation (in-memory, resets on cold start)
const revisionCounters = new Map<string, number>();
const MAX_REVISIONS = 10;

function checkRevisionLimit(convId: string) {
  const count = revisionCounters.get(convId) || 0;
  if (count >= MAX_REVISIONS) return { allowed: false, count: count };
  revisionCounters.set(convId, count + 1);
  return { allowed: true, count: count + 1 };
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

    // --- SECURITY LAYER ---
    const rl = checkRateLimit(rateLimitKey(orgId, 'chat'), RATE_LIMITS.chat)
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'יותר מדי הודעות. נסה שוב בעוד דקה.' }), { status: 429 })
    }
    if (isRapidFire(orgId)) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'לאט לאט! נסה שוב בעוד כמה שניות.' }), { status: 429 })
    }
    if (isDuplicateAbuse(orgId, message)) {
      return new Response(JSON.stringify({ error: 'duplicate', message: 'ההודעה כבר נשלחה.' }), { status: 429 })
    }
    const validation = validateInput(message, VALIDATION_CONFIGS.chat)
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.reason, message: validation.reasonHe }), { status: 400 })
    }
    const cleanMessage = validation.sanitized
    const piiResult = maskPII(cleanMessage)
    if (piiResult.detectedTypes.length > 0) {
      console.log(`[PII-STREAM] Detected in org ${orgId}: ${piiResult.detectedTypes.join(', ')}`)
    }
    // --- END SECURITY LAYER ---

    const intent = detectIntent(cleanMessage)
    const convId = conversationId || `conv-${Date.now()}`

    // Save user message (original clean text, not masked)
    let userMsgId = `temp-${Date.now()}`
    try {
      const { data } = await supabase
        .from('chat_messages')
        .insert({ org_id: orgId, role: 'user', content: cleanMessage, intent, conversation_id: convId })
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

    // Assemble context (memory + summary + recent messages)
    const memoryContext = await assembleContext(supabase, orgId, convId)
    let conversationHistory = memoryContext.recentMessages

    if (conversationHistory.length === 0 || conversationHistory[conversationHistory.length - 1]?.content !== piiResult.masked) {
      conversationHistory.push({ role: 'user', content: piiResult.masked })
    }


        // Check if this is a document revision request
    const isRevision = isRevisionRequest(cleanMessage);
    if (isRevision) {
      const revCheck = checkRevisionLimit(convId);
      if (!revCheck.allowed) {
        return new Response(JSON.stringify({ 
          error: 'revision_limit', 
          message: 'הגעת למקסימום 10 עריכות למסמך. צור מסמך חדש או פנה לממונה.' 
        }), { status: 429 });
      }
    }

const contextPrompt = `${DPO_SYSTEM_PROMPT}

📊 מידע על הארגון:
- שם: ${org?.name || 'לא ידוע'}
- תחום: ${org?.industry || 'לא צוין'}
- מספר עובדים: ${org?.employee_count || 'לא ידוע'}
- ציון ציות: ${org?.compliance_score || 0}%${profileContext}
${formatContextForPrompt(memoryContext)}

${intent === 'incident' ? '\n⚠️ זוהה אירוע אבטחה פוטנציאלי! וודא שהמשתמש מבין את הדחיפות (72 שעות).\n' : ''}
${intent === 'document' ? `
📄 המשתמש ביקש ליצור מסמך. צור מסמך מלא ומוכן לשימוש!

📋 מבנה מחייב לכל מסמך:
1. כותרת + גרסה + תאריך
2. מבוא ומטרה
3. הגדרות
4. תחולה
5-8. סעיפים מרכזיים מותאמים לסוג המסמך
9. אחריות ופיקוח
10. תוקף ועדכונים

דרישות איכות:
• נסח בעברית משפטית מקצועית
• כלל את כל הסעיפים הנדרשים בתיקון 13
• התאם לתחום הארגון (שם, תחום, סוגי מידע, עובדים)
• מוכן לשימוש מיידי ללא עריכה

בסוף המסמך הוסף: [DOCUMENT_GENERATED]
` : ''}
${intent === 'escalate' ? '\n👤 המשתמש רוצה לדבר עם ממונה אנושי.\n' : ''}
${intent === 'off_topic' ? '\n🚫 זוהתה שאלה שאינה בתחום הפרטיות. ענה בהומור קל קצר והפנה לחיפוש באינטרנט. אל תענה על השאלה עצמה.\n' : ''}
${isRevision ? '\n✏️ המשתמש מבקש לערוך מסמך קודם. בצע שינויים והחזר מסמך מלא מעודכן. הוסף [DOCUMENT_GENERATED] בסוף.\n' : ''}`

    const maxTokens = (intent === 'document' || isRevision) ? 4000 : 1500
    const aiModel = (intent === 'document' || isRevision) ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307'

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: aiModel,
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

          // Unmask PII in full response
          if (piiResult.map.size > 0) {
            fullText = unmaskPII(fullText, piiResult.map)
          }

          // Check for generated document
          let generatedDoc = null
          if (fullText.includes('[DOCUMENT_GENERATED]')) {
            fullText = fullText.replace('[DOCUMENT_GENERATED]', '').trim()
            generatedDoc = { type: detectDocType(message), content: fullText, name: getDocTitle(detectDocType(message)) }
          } else if (intent === 'document' && fullText.length > 1500) {
            const indicators = [/\d+\.\s+[א-ת]/m, /\d+\.\d+\.?\s+[א-ת]/m, /גרסה.*\d/i, /תחולה/, /הגדרות/, /אחריות/, /מבוא/, /סעיף \d/]
            const matchCount = indicators.filter(r => r.test(fullText)).length
            const isExplanation = /צריך לכלול|כדאי לכלול|להלן הסברים|אסביר|רוצה שאיצור|רוצה שאכין|הנחיות|טיפים|שלבים|אשמח לעזור|אשמח ליצור|נהדר/.test(fullText) || (fullText.match(/\?/g) || []).length > 1
            if (matchCount >= 6 && !isExplanation) {
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

          // Fire-and-forget: extract facts + update summary
          const msgCount = (memoryContext.recentMessages?.length || 0) + 2
          Promise.all([
            extractAndSaveFacts(supabase, orgId, cleanMessage, fullText).catch(() => {}),
            maybeUpdateSummary(supabase, orgId, convId, msgCount).catch(() => {})
          ]).catch(() => {})

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

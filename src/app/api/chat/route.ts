import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { authenticateRequest, unauthorizedResponse, forbiddenResponse, verifyOrgAccess } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// ===========================================
// DPO SYSTEM PROMPT - Best Practices Built In
// ===========================================
const DPO_SYSTEM_PROMPT = `אתה עוזר דיגיטלי מומחה בהגנת פרטיות ואבטחת מידע בישראל. אתה עובד עבור "Deepo" - שירות DPO (ממונה הגנת פרטיות) לעסקים.

🎯 המטרה שלך: לעזור לעסקים לעמוד בדרישות תיקון 13 לחוק הגנת הפרטיות בצורה פשוטה וידידותית.

📋 הכללים שלך:
1. תמיד ענה בעברית, בשפה פשוטה וברורה
2. אל תפחיד - תן מידע מעשי וישים
3. כשמשהו דחוף (כמו אירוע אבטחה) - הדגש את הדחיפות בעדינות
4. הצע תמיד את הצעד הבא הקונקרטי
5. כשאתה לא בטוח - הצע להעביר לממונה האנושי

📎 כשמקבלים קובץ/מסמך ללא הסבר מה לעשות איתו:
- תן סיכום קצר בשורה אחת של התוכן
- שאל את המשתמש מה הוא רוצה לעשות עם הקובץ
- הצע אפשרויות רלוונטיות כמו: לבדוק תאימות לתיקון 13, לערוך ולשפר, לסכם, לזהות בעיות
- אל תתחיל מיד לנתח - קודם שאל מה המשתמש צריך

לדוגמה כשמעלים קובץ:
"📄 קיבלתי את [שם הקובץ] - זו מדיניות פרטיות של אתר מסחר.

מה תרצה שאעשה?
• לבדוק תאימות לתיקון 13
• לזהות חסרים ובעיות
• לסכם את עיקרי המסמך
• ליצור גרסה משופרת"

⚠️ חשוב מאוד - עיצוב התשובות:
- אל תשתמש בסימני Markdown כמו ** או ### או ## בתשובות
- במקום **טקסט** פשוט כתוב את הטקסט רגיל
- במקום ### כותרת פשוט כתוב את הכותרת בשורה נפרדת
- השתמש באימוג'ים להדגשה במקום סימני עיצוב
- השתמש בנקודות (•) או מספרים לרשימות
- שמור על קריאות עם רווחים בין פסקאות

🔒 נושאים שאתה מומחה בהם:
- מדיניות פרטיות ותקנונים
- רישום מאגרי מידע (רשם מאגרי המידע)
- טיפול בבקשות מידע מנושאי מידע (DSAR)
- אירועי אבטחה ודיווח לרשות להגנת הפרטיות
- הדרכת עובדים בנושאי פרטיות
- ROPA (מפת עיבוד מידע)
- הסכמות ותנאי שימוש
- העברת מידע לחו"ל
- מידע רגיש (בריאות, ילדים, ביומטרי)
- הסכמי עיבוד מידע עם ספקים

⚠️ זיהוי אירועי אבטחה - חשוב מאוד!
אם המשתמש מזכיר: דליפה, פריצה, האקר, וירוס, כופר, פישינג, אובדן מחשב/טלפון, מייל שנשלח בטעות לכתובת לא נכונה, גישה לא מורשית, מידע שנחשף - 
זהה את זה כאירוע אבטחה פוטנציאלי!
הסבר: יש 24 שעות לדווח לרשות להגנת הפרטיות על אירוע אבטחה חמור!
הנחה אותו לתעד מיידית: מה קרה, מתי, כמה אנשים מושפעים.

📄 יצירת מסמכים - חשוב מאוד!
כשמבקשים ממך ליצור מסמך (מדיניות, נוהל, טופס, הסכם) - אל תסביר מה צריך להיות במסמך!
במקום זאת - צור את המסמך המלא עצמו, מוכן לשימוש.

דוגמה לבקשה: "צריך ליצור נוהל אבטחת מידע לארגון"
תשובה לא נכונה: "נוהל אבטחת מידע צריך לכלול: 1. הגדרת תפקידים 2. בקרות אבטחה..."
תשובה נכונה: המסמך המלא עצמו עם כל הסעיפים כתובים במלואם!

המסמך צריך להיות:
- מלא ומוכן לשימוש (לא רשימת נושאים!)
- מנוסח בעברית מקצועית
- כולל את כל הסעיפים הנדרשים בחוק
- מותאם לתיקון 13

מבנה מסמך לדוגמה:

[שם המסמך]
גרסה: 1.0
תאריך: [תאריך היום]

1. מבוא ומטרה
[טקסט מלא]

2. הגדרות
[טקסט מלא]

3. תחולה
[טקסט מלא]

[המשך סעיפים...]

---
[DOCUMENT_GENERATED]

💰 הצעות שירות (upsell עדין ורלוונטי בלבד):
רק כשזה באמת מתאים:
- אחרי יצירת מסמך מורכב: "הממונה שלנו יכול לעשות סקירה מקצועית לפני פרסום"
- כשמזהים עיבוד מידע רגיש: "לעיבוד כזה מומלץ לעשות DPIA - הערכת השפעה על פרטיות. נשמח לעזור"
- כשהמשתמש מתקשה: "רוצה שנתאם שיחה עם הממונה? בחבילה המומלצת יש זמינות מוגברת"
- לארגונים גדולים: "אנחנו מציעים גם הדרכות פרטיות לעובדים"
אל תהיה דוחק או מכירתי מדי!

🎨 סגנון תקשורת:
- חם ונגיש, מקצועי אבל לא יבש
- אימוג'ים במידה - עוזרים לקריאות
- פסקאות קצרות וברורות
- מספרים לשלבים (1. 2. 3.)
- נקודות (•) לרשימות

שמור על תשובות קצרות וממוקדות כשאפשר - 2-4 פסקאות מספיקות ברוב המקרים.
בסיום כל תשובה - תן הצעה קונקרטית לפעולה הבאה או שאל שאלת המשך.`

// ===========================================
// INTENT DETECTION
// ===========================================
function detectIntent(message: string): string {
  const msg = message.toLowerCase()
  
  // Security incident (highest priority)
  if (/דליפ|פריצ|האק|וירוס|כופר|ransomware|פישינג|phishing|נגנב|אבד|נפרץ|אירוע|חשד|בטעות שלחתי|גישה לא מורשית|דלף|breach|leak/.test(msg)) {
    return 'incident'
  }
  
  // Document creation - expanded patterns
  if (/מדיניות פרטיות|privacy policy|תקנון|נוהל|טופס (הסכמה|consent)|מסמך|צור לי|צור עבור|תכין לי|צריך מסמך|תייצר|הסכם עיבוד|dpa|כתב מינוי|אנא צור/.test(msg)) {
    return 'document'
  }
  
  // DSAR (Data Subject Request)
  if (/בקשת מידע|עובד.*(רוצה|מבקש|שאל)|לקוח.*(רוצה|מבקש)|למחוק.*מידע|זכות.*(עיון|מחיקה|תיקון)|dsar|gdpr|right to/.test(msg)) {
    return 'dsar'
  }
  
  // Status check
  if (/סטטוס|מה המצב|איפה אני|ציון|ציות|compliance|מה חסר|בדיקת מצב/.test(msg)) {
    return 'status'
  }
  
  // Escalate to human
  if (/לדבר עם|להעביר ל|ממונה אנושי|בן אדם|אדם אמיתי|עזרה אישית|לא מבין|מסובך/.test(msg)) {
    return 'escalate'
  }
  
  // ROPA related
  if (/ropa|מאגר.*מידע|פעילו.*עיבוד|processing|מפת עיבוד/.test(msg)) {
    return 'ropa'
  }
  
  // Upload/file
  if (/להעלות|העלאה|קובץ|צירפתי|שלחתי|הנה/.test(msg)) {
    return 'upload'
  }
  
  // Greeting
  if (/^(היי|שלום|בוקר טוב|ערב טוב|מה נשמע|הי|hello|hi)\s*[!.?]?\s*$/i.test(msg.trim())) {
    return 'greeting'
  }
  
  // Question
  if (/\?|מה זה|איך |למה |מתי |האם |אפשר |מי צריך|צריך ל/.test(msg)) {
    return 'question'
  }
  
  return 'general'
}

// ===========================================
// GET: Load chat history
// ===========================================
export async function GET(request: NextRequest) {
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request, supabase)
    if (!auth) return unauthorizedResponse()
    
    const { searchParams } = new URL(request.url)
    const orgId = auth.orgId // Always use authenticated org, ignore client param
    
    // Get chat messages - handle table not existing
    let messages: any[] = []
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(100)
      
      if (!error && data) {
        messages = data
      }
    } catch (e) {
      // Table might not exist yet - that's OK
      console.log('chat_messages table not available')
    }
    
    // Get org context
    const { data: org } = await supabase
      .from('organizations')
      .select('name, compliance_score')
      .eq('id', orgId)
      .single()
    
    // Get pending count
    const { count: pendingTasks } = await supabase
      .from('dpo_queue')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'pending')
    
    return NextResponse.json({
      messages: messages || [],
      context: {
        orgName: org?.name,
        complianceScore: org?.compliance_score || 0,
        pendingTasks: pendingTasks || 0
      }
    })
    
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 })
  }
}

// ===========================================
// POST: Handle chat actions
// ===========================================
export async function POST(request: NextRequest) {
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request, supabase)
    if (!auth) return unauthorizedResponse()
    
    const body = await request.json()
    const { action } = body
    
    // ===========================================
    // SEND MESSAGE & GET AI RESPONSE
    // ===========================================
    if (action === 'send_message') {
      const { message, attachments, conversationId } = body
      const orgId = auth.orgId // Use authenticated orgId
      
      if (!message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      
      // Detect intent
      const intent = detectIntent(message)
      
      // Generate conversation ID if not provided
      const convId = conversationId || `conv-${Date.now()}`
      
      // Try to save user message (don't fail if table doesn't exist)
      let userMsg: any = {
        id: `temp-${Date.now()}`,
        org_id: orgId,
        role: 'user',
        content: message,
        intent,
        attachments,
        conversation_id: convId,
        created_at: new Date().toISOString()
      }
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            org_id: orgId,
            role: 'user',
            content: message,
            intent,
            attachments,
            conversation_id: convId
          })
          .select()
          .single()
        
        if (!error && data) {
          userMsg = data
        }
      } catch (e) {
        console.log('Could not save user message - table may not exist')
      }
      
      // Get org context
      const { data: org } = await supabase
        .from('organizations')
        .select('name, industry, employee_count, compliance_score')
        .eq('id', orgId)
        .single()
      
      // Get recent history (if table exists)
      let conversationHistory: { role: 'user' | 'assistant', content: string }[] = []
      try {
        const { data: history } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(12)
        
        conversationHistory = (history || [])
          .reverse()
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      } catch (e) {
        // No history available
      }
      
      // Add current message if not already in history
      if (conversationHistory.length === 0 || conversationHistory[conversationHistory.length - 1]?.content !== message) {
        conversationHistory.push({ role: 'user', content: message })
      }
      
      // Build context
      const contextPrompt = `${DPO_SYSTEM_PROMPT}

📊 מידע על הארגון:
- שם: ${org?.name || 'לא ידוע'}
- תחום: ${org?.industry || 'לא צוין'}
- מספר עובדים: ${org?.employee_count || 'לא ידוע'}
- ציון ציות: ${org?.compliance_score || 0}%

${intent === 'incident' ? '\n⚠️ שים לב: זוהה אירוע אבטחה פוטנציאלי! וודא שהמשתמש מבין את הדחיפות (24 שעות לדיווח) והנחה אותו לתעד את האירוע.\n' : ''}
${intent === 'document' ? '\n📄 המשתמש מבקש מסמך - צור את המסמך המלא עצמו, לא הסבר על מה צריך להיות בו! השתמש ב-[DOCUMENT_GENERATED] בסוף.\n' : ''}
${intent === 'escalate' ? '\n👤 המשתמש רוצה לדבר עם ממונה אנושי - הצע להעביר את הפנייה.\n' : ''}`

      // Get AI response - use more tokens for documents
      const maxTokens = intent === 'document' ? 4000 : 1500
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        system: contextPrompt,
        messages: conversationHistory
      })
      
      let aiText = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Strip markdown formatting that looks bad in chat
      aiText = aiText
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
        .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
        .replace(/^###\s*/gm, '')            // Remove ### headers
        .replace(/^##\s*/gm, '')             // Remove ## headers
        .replace(/^#\s*/gm, '')              // Remove # headers
        .replace(/```[a-z]*\n?/g, '')        // Remove code blocks
        .replace(/`([^`]+)`/g, '$1')         // Remove inline code
        .trim()
      
      // Check for document generation
      let generatedDoc = null
      
      // Method 1: Explicit marker from AI
      if (aiText.includes('[DOCUMENT_GENERATED]')) {
        aiText = aiText.replace('[DOCUMENT_GENERATED]', '').trim()
        if (aiText.includes('המסמך מוכן!')) {
          aiText = aiText.split('המסמך מוכן!')[0].trim()
        }
        
        generatedDoc = {
          type: detectDocType(message),
          content: aiText,
          name: getDocTitle(detectDocType(message))
        }
        console.log('[DOC] Detected via marker')
      }
      // Method 2: Smart fallback - detect actual documents (not explanations)
      else if (intent === 'document' && aiText.length > 800) {
        // Count strong document indicators
        const strongIndicators = [
          /\d+\.\s+[א-ת]/m,             // Numbered section like "1. מבוא"
          /\d+\.\d+\.?\s+[א-ת]/m,       // Sub-section like "1.1 סעיף"
          /גרסה/i,                      // Version
          /מדיניות/,                    // "מדיניות"
          /נוהל/,                       // "נוהל"
          /תחולה/,                      // "תחולה"
          /הגדרות/,                     // "הגדרות"
          /אחריות/,                     // "אחריות"
          /מטרה/,                       // "מטרה"
          /בקרה/,                       // "בקרה"
        ]
        
        const matchCount = strongIndicators.filter(regex => regex.test(aiText)).length
        console.log(`[DOC] Intent: ${intent}, Length: ${aiText.length}, Matches: ${matchCount}`)
        
        // Must have at least 3 strong indicators AND not be a question/explanation
        const isExplanation = (
          aiText.includes('צריך לכלול') ||
          aiText.includes('כדאי לכלול') ||
          aiText.includes('מומלץ לכלול') ||
          aiText.includes('להלן הסברים') ||
          aiText.includes('אסביר') ||
          aiText.startsWith('בטח') ||
          aiText.startsWith('כמובן') ||
          (aiText.match(/\?/g) || []).length > 2
        )
        
        if (matchCount >= 3 && !isExplanation) {
          generatedDoc = {
            type: detectDocType(message),
            content: aiText,
            name: getDocTitle(detectDocType(message))
          }
          console.log('[DOC] Detected via fallback')
        }
      }
      
      // Save assistant message (don't fail if table doesn't exist)
      let assistantMsg: any = {
        id: `temp-assistant-${Date.now()}`,
        org_id: orgId,
        role: 'assistant',
        content: aiText,
        intent,
        conversation_id: convId,
        metadata: generatedDoc ? { generated_document: generatedDoc } : null,
        created_at: new Date().toISOString()
      }
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            org_id: orgId,
            role: 'assistant',
            content: aiText,
            intent,
            conversation_id: convId,
            metadata: generatedDoc ? { generated_document: generatedDoc } : null
          })
          .select()
          .single()
        
        if (!error && data) {
          assistantMsg = data
        }
      } catch (e) {
        console.log('Could not save assistant message - table may not exist')
      }
      
      // Prepare quick actions based on intent
      let quickActions = null
      
      if (intent === 'incident') {
        quickActions = {
          type: 'incident_flow',
          buttons: [
            { id: 'start_incident', label: '🚨 פתח דיווח אירוע', style: 'danger' },
            { id: 'just_question', label: 'רק שאלה כללית', style: 'secondary' }
          ]
        }
      } else if (intent === 'escalate') {
        quickActions = {
          type: 'escalate_flow',
          buttons: [
            { id: 'escalate_now', label: '👤 העבר לממונה', style: 'primary' },
            { id: 'continue_chat', label: 'המשך בצ\'אט', style: 'secondary' }
          ]
        }
      } else if (generatedDoc) {
        quickActions = {
          type: 'document_flow',
          buttons: [
            { id: 'save_doc', label: '💾 שמור מסמך', style: 'primary' },
            { id: 'edit_doc', label: '✏️ ערוך', style: 'secondary' },
            { id: 'review_request', label: '👁️ בקש סקירה מממונה', style: 'outline' }
          ]
        }
      }
      
      // Log Q&A for analytics (don't fail if this fails)
      if (['question', 'dsar', 'general'].includes(intent)) {
        try {
          await supabase.from('qa_log').insert({
            org_id: orgId,
            question: message,
            answer: aiText,
            intent,
            source: 'chat'
          })
        } catch {
          // Silently ignore Q&A logging errors
        }
      }
      
      return NextResponse.json({
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        intent,
        quickActions,
        generatedDocument: generatedDoc,
        conversationId: convId
      })
    }
    
    // ===========================================
    // CREATE INCIDENT
    // ===========================================
    if (action === 'create_incident') {
      const { description, chatContext } = body
      const orgId = auth.orgId
      
      const now = new Date()
      const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000)
      
      try {
        const { data: incident, error } = await supabase
          .from('security_incidents')
          .insert({
            org_id: orgId,
            title: 'אירוע אבטחה - דווח מהצ\'אט',
            description: description || chatContext,
            incident_type: 'other',
            severity: 'medium',
            status: 'new',
            discovered_at: now.toISOString(),
            authority_deadline: deadline.toISOString(),
            source: 'chat'
          })
          .select()
          .single()
        
        if (error) {
          console.error('Error creating incident:', error)
          return NextResponse.json({ 
            success: false, 
            error: error.message,
            incident: { id: 'temp', deadline: deadline.toISOString() } // Return temp for UI
          })
        }
        
        // Try to add system message (don't fail if this fails)
        try {
          await supabase.from('chat_messages').insert({
            org_id: orgId,
            role: 'assistant',
            content: `✅ נפתח דיווח אירוע אבטחה!\n\n⏰ דדליין לדיווח לרשות: ${deadline.toLocaleDateString('he-IL')} ${deadline.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}\n\nהשלב הבא: לך ללשונית "אירועי אבטחה" למילוי הפרטים המלאים.`,
            intent: 'system'
          })
        } catch (e) {
          console.log('Could not save system message')
        }
        
        return NextResponse.json({ incident, success: true })
      } catch (e) {
        console.error('Incident creation error:', e)
        return NextResponse.json({ success: false, error: 'Failed to create incident' }, { status: 500 })
      }
    }
    
    // ===========================================
    // ESCALATE TO HUMAN DPO
    // ===========================================
    if (action === 'escalate') {
      const { context } = body
      const orgId = auth.orgId
      
      try {
        const { data: escalation, error } = await supabase
          .from('dpo_queue')
          .insert({
            org_id: orgId,
            type: 'escalation',
            priority: 'medium',
            status: 'pending',
            title: 'פנייה מהצ\'אט - בקשה לשיחה עם ממונה',
            description: context || 'הלקוח ביקש להעביר לממונה אנושי',
            ai_summary: context
          })
          .select()
          .single()
        
        if (error) {
          console.error('Escalation error:', error)
          // Still return success so user gets feedback
          return NextResponse.json({ success: true, message: 'Escalation logged' })
        }
        
        // Try to add system message
        try {
          await supabase.from('chat_messages').insert({
            org_id: orgId,
            role: 'assistant',
            content: '📞 הפנייה הועברה לממונה האנושי!\n\nהממונה יחזור אליך בהקדם (בדרך כלל תוך יום עסקים אחד).\n\nבינתיים, אפשר להמשיך לשאול אותי שאלות.',
            intent: 'system'
          })
        } catch (e) {
          console.log('Could not save escalation message')
        }
        
        return NextResponse.json({ escalation, success: true })
      } catch (e) {
        console.error('Escalation error:', e)
        return NextResponse.json({ success: true }) // Return success anyway for UX
      }
    }
    
    // ===========================================
    // SAVE DOCUMENT
    // ===========================================
    if (action === 'save_document') {
      const { title, content, documentType } = body
      const orgId = auth.orgId
      
      // Map document types to valid enum values
      const typeMapping: Record<string, string> = {
        'privacy_policy': 'privacy_policy',
        'security_policy': 'security_policy',
        'security_procedure': 'security_policy',
        'database_registration': 'database_registration',
        'database_definition': 'database_registration',
        'consent_form': 'custom',
        'dpa': 'custom',
        'employee_policy': 'procedure',
        'retention_policy': 'procedure',
        'ropa': 'procedure',
        'general': 'custom'
      }
      
      const validType = typeMapping[documentType] || 'custom'
      const docTitle = title || getDocTitle(documentType)
      
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          title: docTitle,
          type: validType,
          content,
          status: 'draft',
          generated_by: 'ai'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Failed to save document:', error)
        throw error
      }
      
      return NextResponse.json({ document: doc, success: true })
    }
    
    // ===========================================
    // REQUEST PROFESSIONAL REVIEW (UPSELL)
    // ===========================================
    if (action === 'request_review') {
      const { documentId, documentType, notes } = body
      const orgId = auth.orgId
      
      const { data: request, error } = await supabase
        .from('dpo_queue')
        .insert({
          org_id: orgId,
          type: 'review',
          priority: 'low',
          status: 'pending',
          title: `בקשת סקירה: ${getDocTitle(documentType)}`,
          description: notes || 'סקירה מקצועית למסמך שנוצר',
          context: { document_id: documentId, document_type: documentType }
        })
        .select()
        .single()
      
      if (error) throw error
      
      return NextResponse.json({ request, success: true })
    }
    
    // ===========================================
    // GET SMART SUGGESTIONS
    // ===========================================
    if (action === 'get_suggestions') {
      const orgId = auth.orgId
      
      // Check what's missing
      const { data: org } = await supabase
        .from('organizations')
        .select('compliance_score, industry')
        .eq('id', orgId)
        .single()
      
      const { count: privacyPolicyCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('type', 'privacy_policy')
      
      const { count: ropaCount } = await supabase
        .from('processing_activities')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
      
      const suggestions = []
      
      // Priority suggestions based on gaps
      if (!privacyPolicyCount || privacyPolicyCount === 0) {
        suggestions.push({ icon: '📄', text: 'צור לי מדיניות פרטיות', priority: 1 })
      }
      
      if (!ropaCount || ropaCount === 0) {
        suggestions.push({ icon: '🗺️', text: 'בוא נמפה את פעילויות העיבוד', priority: 2 })
      }
      
      if ((org?.compliance_score || 0) < 50) {
        suggestions.push({ icon: '📈', text: 'איך משפרים את ציון הציות?', priority: 3 })
      }
      
      // Always available
      suggestions.push(
        { icon: '❓', text: 'עובד שאל על פרטיות', priority: 5 },
        { icon: '🚨', text: 'יש אירוע אבטחה', priority: 4 },
        { icon: '📊', text: 'מה הסטטוס שלי?', priority: 6 },
        { icon: '📋', text: 'צריך טופס הסכמה', priority: 7 },
        { icon: '📑', text: 'נוהל אבטחת מידע', priority: 8 }
      )
      
      // Sort by priority and take top 6
      suggestions.sort((a, b) => a.priority - b.priority)
      
      return NextResponse.json({ suggestions: suggestions.slice(0, 6) })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Chat POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper: detect document type
function detectDocType(message: string): string {
  const msg = message.toLowerCase()
  
  // Privacy policy
  if (msg.includes('מדיניות פרטיות') || msg.includes('privacy policy')) return 'privacy_policy'
  
  // Security policy/procedure
  if (msg.includes('אבטחת מידע') || msg.includes('נוהל אבטח') || msg.includes('security')) return 'security_procedure'
  
  // Consent form
  if (msg.includes('הסכמה') || msg.includes('consent') || msg.includes('טופס הסכמה')) return 'consent_form'
  
  // DPA
  if (msg.includes('הסכם עיבוד') || msg.includes('dpa') || msg.includes('data processing')) return 'dpa'
  
  // Employee policy
  if (msg.includes('עובד') || msg.includes('employee') || msg.includes('מדיניות עובדים')) return 'employee_policy'
  
  // Retention policy
  if (msg.includes('שמירת מידע') || msg.includes('retention') || msg.includes('מחיקה')) return 'retention_policy'
  
  // Database registration
  if (msg.includes('מאגר') || msg.includes('רישום מאגר') || msg.includes('database')) return 'database_registration'
  
  // ROPA
  if (msg.includes('ropa') || msg.includes('מפת עיבוד') || msg.includes('record of processing')) return 'ropa'
  
  // DPO appointment
  if (msg.includes('מינוי') || msg.includes('כתב מינוי') || msg.includes('dpo appointment')) return 'dpo_appointment'
  
  // Terms of service
  if (msg.includes('תקנון') || msg.includes('תנאי שימוש') || msg.includes('terms')) return 'terms_of_service'
  
  return 'general'
}

// Helper: get document title
function getDocTitle(type: string): string {
  const titles: Record<string, string> = {
    privacy_policy: 'מדיניות פרטיות',
    security_policy: 'מדיניות אבטחת מידע',
    security_procedure: 'נוהל אבטחת מידע',
    consent_form: 'טופס הסכמה',
    dpa: 'הסכם עיבוד מידע',
    employee_policy: 'נוהל פרטיות לעובדים',
    retention_policy: 'מדיניות שמירת מידע',
    database_registration: 'רישום מאגר מידע',
    ropa: 'מפת עיבוד מידע (ROPA)',
    dpo_appointment: 'כתב מינוי ממונה פרטיות',
    terms_of_service: 'תקנון ותנאי שימוש',
    general: 'מסמך',
    custom: 'מסמך',
    procedure: 'נוהל'
  }
  return titles[type] || 'מסמך'
}

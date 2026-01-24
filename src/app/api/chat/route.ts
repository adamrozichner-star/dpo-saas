import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

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
const DPO_SYSTEM_PROMPT = `אתה עוזר דיגיטלי מומחה בהגנת פרטיות ואבטחת מידע בישראל. אתה עובד עבור "MyDPO" - שירות DPO (ממונה הגנת פרטיות) לעסקים.

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
הסבר: יש 72 שעות לדווח לרשות להגנת הפרטיות על אירוע אבטחה חמור!
הנחה אותו לתעד מיידית: מה קרה, מתי, כמה אנשים מושפעים.

📄 יצירת מסמכים:
כשמבקשים ממך ליצור מסמך (מדיניות, נוהל, טופס) - צור אותו במלואו, מקצועי ומותאם לחקיקה הישראלית.
המסמכים צריכים להיות:
- מנוסחים בעברית תקינה ומקצועית
- כוללים את כל הסעיפים הנדרשים בחוק
- מותאמים לסוג הארגון
- מעודכנים לתיקון 13

כשתסיים לייצר מסמך, הוסף בסוף:
---
[DOCUMENT_GENERATED]
הזכר למשתמש: "המסמך מוכן! אפשר להוריד אותו, לערוך אותו, או לשתף. רוצה שממונה אנושי יעבור עליו לפני פרסום?"

💰 הצעות שירות (upsell עדין ורלוונטי בלבד):
רק כשזה באמת מתאים:
- אחרי יצירת מסמך מורכב: "הממונה שלנו יכול לעשות סקירה מקצועית לפני פרסום"
- כשמזהים עיבוד מידע רגיש: "לעיבוד כזה מומלץ לעשות DPIA - הערכת השפעה על פרטיות. נשמח לעזור"
- כשהמשתמש מתקשה: "רוצה שנתאם שיחה עם הממונה? בחבילה המורחבת יש זמינות מוגברת"
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
  
  // Document creation
  if (/מדיניות פרטיות|privacy policy|תקנון|נוהל|טופס (הסכמה|consent)|מסמך|צור לי|תכין לי|צריך מסמך|תייצר|הסכם עיבוד|dpa/.test(msg)) {
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
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }
    
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
    const body = await request.json()
    const { action } = body
    
    // ===========================================
    // SEND MESSAGE & GET AI RESPONSE
    // ===========================================
    if (action === 'send_message') {
      const { orgId, message, attachments, conversationId } = body
      
      if (!orgId || !message) {
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

${intent === 'incident' ? '\n⚠️ שים לב: זוהה אירוע אבטחה פוטנציאלי! וודא שהמשתמש מבין את הדחיפות (72 שעות לדיווח) והנחה אותו לתעד את האירוע.\n' : ''}
${intent === 'document' ? '\n📄 המשתמש מבקש מסמך - צור מסמך מלא ומקצועי.\n' : ''}
${intent === 'escalate' ? '\n👤 המשתמש רוצה לדבר עם ממונה אנושי - הצע להעביר את הפנייה.\n' : ''}`

      // Get AI response - use Haiku for speed (3-5x faster, 10x cheaper)
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-20250514',
        max_tokens: 1500,
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
      if (aiText.includes('[DOCUMENT_GENERATED]')) {
        aiText = aiText.replace('[DOCUMENT_GENERATED]', '').trim()
        generatedDoc = {
          type: detectDocType(message),
          content: aiText
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
      const { orgId, description, chatContext } = body
      
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
      const { orgId, context } = body
      
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
      const { orgId, title, content, documentType } = body
      
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          name: title || getDocTitle(documentType),
          type: documentType,
          content,
          status: 'draft',
          generated_by: 'ai',
          source: 'chat'
        })
        .select()
        .single()
      
      if (error) throw error
      
      return NextResponse.json({ document: doc, success: true })
    }
    
    // ===========================================
    // REQUEST PROFESSIONAL REVIEW (UPSELL)
    // ===========================================
    if (action === 'request_review') {
      const { orgId, documentId, documentType, notes } = body
      
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
      const { orgId } = body
      
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
  if (msg.includes('מדיניות פרטיות')) return 'privacy_policy'
  if (msg.includes('הסכמה') || msg.includes('consent')) return 'consent_form'
  if (msg.includes('עיבוד') || msg.includes('dpa')) return 'dpa'
  if (msg.includes('עובד') || msg.includes('employee')) return 'employee_policy'
  if (msg.includes('אבטח')) return 'security_procedure'
  if (msg.includes('שמיר') || msg.includes('retention')) return 'retention_policy'
  return 'general'
}

// Helper: get document title
function getDocTitle(type: string): string {
  const titles: Record<string, string> = {
    privacy_policy: 'מדיניות פרטיות',
    consent_form: 'טופס הסכמה',
    dpa: 'הסכם עיבוד מידע',
    employee_policy: 'נוהל פרטיות לעובדים',
    security_procedure: 'נוהל אבטחת מידע',
    retention_policy: 'מדיניות שמירת מידע',
    general: 'מסמך'
  }
  return titles[type] || 'מסמך'
}

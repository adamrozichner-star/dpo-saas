import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { authenticateDpo, unauthorizedResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for AI analysis

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const resend = new Resend(process.env.RESEND_API_KEY)

// =========================================
// Email Templates
// =========================================

function generateEscalationResponseEmail(
  orgName: string,
  originalQuestion: string,
  dpoResponse: string
): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">🛡️ תשובה מהממונה על הגנת הפרטיות</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${orgName}</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #94a3b8;">
      <h3 style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">השאלה שלך:</h3>
      <p style="margin: 0; color: #475569;">${originalQuestion}</p>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">✉️ תשובת הממונה:</h3>
      <div style="color: #334155; white-space: pre-wrap;">${dpoResponse}</div>
    </div>
    
    <div style="margin-top: 25px; padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        יש לך שאלות נוספות? היכנס ללוח הבקרה שלך
      </p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">הודעה זו נשלחה באמצעות DPO-Pro</p>
    <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} DPO-Pro - שירותי ממונה הגנת פרטיות</p>
  </div>
</body>
</html>
`
}

function generateDSRResponseEmail(
  orgName: string,
  requestType: string,
  requesterName: string,
  dpoResponse: string,
  status: 'completed' | 'rejected'
): string {
  const statusText = status === 'completed' ? 'אושרה' : 'נדחתה'
  const statusColor = status === 'completed' ? '#22c55e' : '#ef4444'
  const statusIcon = status === 'completed' ? '✅' : '❌'
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">🛡️ עדכון לבקשת נושא מידע</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${orgName}</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">שלום ${requesterName},</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <span style="font-weight: bold;">סוג הבקשה:</span>
        <span>${requestType}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">סטטוס:</span>
        <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
          ${statusIcon} ${statusText}
        </span>
      </div>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">📋 תשובת הממונה:</h3>
      <div style="color: #334155; white-space: pre-wrap;">${dpoResponse}</div>
    </div>
    
    <div style="margin-top: 25px; padding: 15px; background: #fef3c7; border-radius: 8px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>💡 שימו לב:</strong> על פי חוק הגנת הפרטיות, זכותך לפנות לרשות להגנת הפרטיות אם אינך מרוצה מהתשובה.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">הודעה זו נשלחה באמצעות DPO-Pro</p>
    <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} DPO-Pro - שירותי ממונה הגנת פרטיות</p>
  </div>
</body>
</html>
`
}

// =========================================
// Send Email Helper
// =========================================

async function sendResponseEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    // Use resend.dev for testing until dpo-pro.co.il is verified
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'MyDPO <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html
    })
    
    if (error) {
      console.error('Email send error:', error)
      return false
    }
    
    console.log('Email sent successfully:', data?.id)
    return true
  } catch (err) {
    console.error('Email send exception:', err)
    return false
  }
}

// =========================================
// Helper function to analyze a queue item
// =========================================
async function analyzeQueueItem(itemId: string) {
  const { data: item } = await supabase
    .from('dpo_queue')
    .select(`
      *,
      organizations (name)
    `)
    .eq('id', itemId)
    .single()

  if (!item) return null

  let contextText = ''

  if (item.type === 'escalation' && item.related_thread_id) {
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, sender_name, content, created_at')
      .eq('thread_id', item.related_thread_id)
      .order('created_at', { ascending: true })

    contextText = messages?.map(m => 
      `[${m.sender_type === 'user' ? 'עובד' : 'בוט'}]: ${m.content}`
    ).join('\n\n') || ''
  }

  if (item.type === 'dsr' && item.related_dsr_id) {
    const { data: dsr } = await supabase
      .from('data_subject_requests')
      .select('*')
      .eq('id', item.related_dsr_id)
      .single()

    contextText = `
סוג בקשה: ${dsr?.request_type}
שם הפונה: ${dsr?.full_name}
אימייל: ${dsr?.email}
פרטי הבקשה: ${dsr?.details || 'לא צוינו'}
    `.trim()
  }

  const { data: docs } = await supabase
    .from('documents')
    .select('name, type')
    .eq('org_id', item.org_id)
    .eq('status', 'active')

  const docsContext = docs?.map(d => d.name).join(', ') || 'אין מסמכים'

  const systemPrompt = `אתה עוזר לממונה הגנת פרטיות (DPO) בישראל. תפקידך לנתח פניות ולהציע תשובות מקצועיות.

הנחיות:
1. נתח את הפנייה והקשר
2. הצע תשובה מקצועית בעברית
3. העריך את רמת הביטחון שלך (0-1)
4. סמן סיכונים אם יש

הארגון: ${item.organizations?.name || 'לא ידוע'}
מסמכים קיימים: ${docsContext}
`

  const userPrompt = `
סוג פנייה: ${item.type}
כותרת: ${item.title}
תיאור: ${item.description || 'אין'}

הקשר/שיחה:
${contextText || 'אין הקשר נוסף'}

אנא ספק:
1. סיכום קצר (2-3 משפטים)
2. המלצה לפעולה
3. טיוטת תשובה מוצעת (תשובה מלאה ומקצועית שהממונה יוכל לשלוח)
4. רמת ביטחון (מספר בין 0 ל-1)
5. סיכונים או הערות חשובות

פורמט JSON:
{
  "summary": "...",
  "recommendation": "...",
  "draft_response": "...",
  "confidence": 0.85,
  "risks": ["..."]
}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    })

    const content = response.content[0]
    if (content.type !== 'text') return null

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const analysis = JSON.parse(jsonMatch[0])

    // Update the queue item with analysis
    await supabase
      .from('dpo_queue')
      .update({
        ai_summary: analysis.summary,
        ai_recommendation: analysis.recommendation,
        ai_draft_response: analysis.draft_response,
        ai_confidence: analysis.confidence,
        ai_risk_score: analysis.risks?.length > 0 ? 0.3 + (analysis.risks.length * 0.1) : 0.1,
        ai_analyzed_at: new Date().toISOString(),
        metadata: { ...item.metadata, risks: analysis.risks }
      })
      .eq('id', itemId)

    return analysis
  } catch (error) {
    console.error('AI analysis error:', error)
    return null
  }
}

// =========================================
// GET Handler
// =========================================
export async function GET(request: NextRequest) {
  try {
    // --- DPO AUTH CHECK ---
    const isDpo = await authenticateDpo(request, supabase)
    if (!isDpo) return unauthorizedResponse('DPO authentication required')
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // =========================================
    // Dashboard Stats
    // =========================================
    if (action === 'stats') {
      const { data: stats, error } = await supabase
        .from('dpo_queue')
        .select('status, priority, resolution_type, time_spent_seconds, resolved_at')

      if (error) throw error

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const pending = stats?.filter(s => s.status === 'pending') || []
      const resolvedThisMonth = stats?.filter(s => 
        s.status === 'resolved' && 
        s.resolved_at && 
        new Date(s.resolved_at) > thirtyDaysAgo
      ) || []

      const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      return NextResponse.json({
        critical_count: pending.filter(p => p.priority === 'critical').length,
        high_count: pending.filter(p => p.priority === 'high').length,
        medium_count: pending.filter(p => p.priority === 'medium').length,
        low_count: pending.filter(p => p.priority === 'low').length,
        total_pending: pending.length,
        resolved_this_month: resolvedThisMonth.length,
        ai_approved_count: resolvedThisMonth.filter(r => r.resolution_type === 'approved_ai').length,
        avg_time_seconds: resolvedThisMonth.length > 0 
          ? Math.round(resolvedThisMonth.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / resolvedThisMonth.length)
          : 0,
        active_orgs: orgCount || 0
      })
    }

    // =========================================
    // Queue List
    // =========================================
    if (action === 'queue') {
      const status = searchParams.get('status') || 'pending'
      const priority = searchParams.get('priority')
      const type = searchParams.get('type')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      let query = supabase
        .from('dpo_queue')
        .select(`
          *,
          organizations (
            id,
            name
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (priority) query = query.eq('priority', priority)
      if (type) query = query.eq('type', type)

      const { data, error } = await query

      if (error) throw error

      // Sort by priority
      const priorityOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 }
      const sorted = (data || []).sort((a: any, b: any) => {
        return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
      })

      return NextResponse.json({ items: sorted, total: sorted.length })
    }

    // =========================================
    // Single Queue Item with Full Context
    // =========================================
    if (action === 'queue_item') {
      const id = searchParams.get('id')
      if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      }

      const { data: item, error } = await supabase
        .from('dpo_queue')
        .select(`
          *,
          organizations (
            id,
            name,
            status
          )
        `)
        .eq('id', id)
        .single()

      if (error || !item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      // Get related data based on type
      let thread = null
      let messages = null
      let dsr = null

      if (item.type === 'escalation' && item.related_thread_id) {
        const { data: threadData } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', item.related_thread_id)
          .single()
        thread = threadData

        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', item.related_thread_id)
          .order('created_at', { ascending: true })
        messages = messagesData
      }

      if (item.type === 'dsr' && item.related_dsr_id) {
        const { data: dsrData } = await supabase
          .from('data_subject_requests')
          .select('*')
          .eq('id', item.related_dsr_id)
          .single()
        dsr = dsrData
      }

      // Get org documents (all statuses — DPO needs to see pending_review too)
      const { data: documents, error: docErr } = await supabase
        .from('documents')
        .select('id, title, type, status, content, created_at')
        .eq('org_id', item.org_id)
        .order('created_at', { ascending: false })
      
      if (docErr) {
        console.error('Error fetching documents:', docErr)
      }

      // Get org compliance score
      const { data: compliance } = await supabase
        .from('org_compliance_scores')
        .select('*')
        .eq('org_id', item.org_id)
        .single()

      // Get recent history for this org
      const { data: history } = await supabase
        .from('dpo_queue')
        .select('id, type, title, status, resolved_at, resolution_type')
        .eq('org_id', item.org_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5)

      return NextResponse.json({
        item,
        thread,
        messages,
        dsr,
        documents,
        compliance,
        history
      })
    }

    // =========================================
    // Organizations List
    // =========================================
    if (action === 'organizations') {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          status,
          created_at
        `)
        .eq('status', 'active')
        .order('name')

      if (error) throw error

      // Get pending counts per org
      const { data: pendingCounts } = await supabase
        .from('dpo_queue')
        .select('org_id')
        .eq('status', 'pending')

      const pendingByOrg: Record<string, number> = {}
      pendingCounts?.forEach(p => {
        pendingByOrg[p.org_id] = (pendingByOrg[p.org_id] || 0) + 1
      })

      // Get compliance scores
      const { data: scores } = await supabase
        .from('org_compliance_scores')
        .select('org_id, overall_score, risk_level')

      const scoresByOrg: Record<string, any> = {}
      scores?.forEach(s => {
        scoresByOrg[s.org_id] = s
      })

      const enrichedOrgs = orgs?.map(org => ({
        ...org,
        pending_count: pendingByOrg[org.id] || 0,
        compliance_score: scoresByOrg[org.id]?.overall_score || null,
        risk_level: scoresByOrg[org.id]?.risk_level || 'unknown'
      }))

      return NextResponse.json({ organizations: enrichedOrgs })
    }

    // =========================================
    // Organization Detail
    // =========================================
    if (action === 'org_detail') {
      const orgId = searchParams.get('org_id')
      if (!orgId) {
        return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      const { data: compliance } = await supabase
        .from('org_compliance_scores')
        .select('*')
        .eq('org_id', orgId)
        .single()

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('org_id', orgId)

      const { data: queueHistory } = await supabase
        .from('dpo_queue')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: timeLog } = await supabase
        .from('dpo_time_log')
        .select('*')
        .eq('org_id', orgId)
        .gte('created_at', startOfMonth.toISOString())

      const totalMinutesThisMonth = timeLog?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 60 || 0

      const { data: onboarding } = await supabase
        .from('onboarding_answers')
        .select('*')
        .eq('org_id', orgId)
        .single()

      // Also get org profile (onboarding answers from registration)
      const { data: orgProfile } = await supabase
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', orgId)
        .single()

      // Get user contact info
      const { data: orgUser } = await supabase
        .from('users')
        .select('email, auth_user_id')
        .eq('org_id', orgId)
        .limit(1)
        .single()

      return NextResponse.json({
        organization: org,
        compliance,
        documents,
        queue_history: queueHistory,
        time_this_month_minutes: Math.round(totalMinutesThisMonth),
        onboarding_context: onboarding?.answers || {},
        profile: orgProfile?.profile_data || null,
        contact_email: orgUser?.email || null
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('DPO API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =========================================
// POST Handler
// =========================================
export async function POST(request: NextRequest) {
  try {
    // --- DPO AUTH CHECK ---
    const isDpo = await authenticateDpo(request, supabase)
    if (!isDpo) return unauthorizedResponse('DPO authentication required')
    
    const body = await request.json()
    const { action } = body

    // =========================================
    // Resolve Queue Item (with email notification)
    // =========================================
    if (action === 'resolve') {
      const { itemId, resolutionType, response, notes, timeSpentSeconds, sendEmail = true } = body

      if (!itemId || !resolutionType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { data: item } = await supabase
        .from('dpo_queue')
        .select('*, organizations(name)')
        .eq('id', itemId)
        .single()

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      // Update queue item
      const { error: updateError } = await supabase
        .from('dpo_queue')
        .update({
          status: 'resolved',
          resolution_type: resolutionType,
          resolution_response: response,
          resolution_notes: notes,
          time_spent_seconds: timeSpentSeconds || 0,
          resolved_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Log time
      if (timeSpentSeconds) {
        await supabase.from('dpo_time_log').insert({
          org_id: item.org_id,
          queue_item_id: itemId,
          action: 'resolve',
          description: `טיפול: ${item.title}`,
          duration_seconds: timeSpentSeconds
        })
      }

      let emailSent = false
      const orgName = item.organizations?.name || 'הארגון'

      // Handle ESCALATION resolution
      if (item.type === 'escalation' && item.related_thread_id && response) {
        // Add DPO response as message thread
        await supabase.from('messages').insert({
          thread_id: item.related_thread_id,
          sender_type: 'dpo',
          sender_name: 'ממונה הגנת הפרטיות',
          content: response
        })

        // Also inject into chat_messages so user sees it in their chat view
        try {
          await supabase.from('chat_messages').insert({
            org_id: item.org_id,
            role: 'assistant',
            content: `🛡️ תשובה מממונה הגנת הפרטיות:\n\n${response}\n\n---\nהודעה זו נשלחה על ידי הממונה האנושי שלכם. ניתן להשיב דרך לשונית "הודעות מהממונה" בלוח הבקרה.`,
            intent: 'dpo_response',
          })
        } catch (e) {
          console.log('Could not inject DPO response into chat_messages:', e)
        }

        // Update thread status
        await supabase
          .from('message_threads')
          .update({ status: 'resolved' })
          .eq('id', item.related_thread_id)

        // Get thread to find user email
        if (sendEmail) {
          const { data: thread } = await supabase
            .from('message_threads')
            .select('user_email, subject, metadata')
            .eq('id', item.related_thread_id)
            .single()

          // Try to get email from: 1) thread.user_email, 2) org contact email
          let recipientEmail = thread?.user_email
          console.log('📧 thread.user_email:', thread?.user_email)
          
          if (!recipientEmail) {
            // Fallback: get org's primary contact email
            const { data: org, error: orgError } = await supabase
              .from('organizations')
              .select('contact_email, owner_email')
              .eq('id', item.org_id)
              .single()
            
            console.log('📧 Org lookup result:', { org, orgError })
            recipientEmail = org?.contact_email || org?.owner_email
            console.log('📧 Using org email:', recipientEmail)
          }

          if (recipientEmail) {
            console.log('📧 Sending email to:', recipientEmail)
            
            // Get original question from first message or metadata
            let originalQuestion = item.title
            
            if (thread?.metadata?.original_question) {
              originalQuestion = thread.metadata.original_question
            } else {
              const { data: firstMessage } = await supabase
                .from('messages')
                .select('content')
                .eq('thread_id', item.related_thread_id)
                .eq('sender_type', 'user')
                .order('created_at', { ascending: true })
                .limit(1)
                .single()
              
              if (firstMessage?.content) {
                originalQuestion = firstMessage.content
              }
            }

            const emailHtml = generateEscalationResponseEmail(
              orgName,
              originalQuestion,
              response
            )

            console.log('📧 Attempting to send email...')
            emailSent = await sendResponseEmail(
              recipientEmail,
              `תשובה לפנייתך - ${orgName}`,
              emailHtml
            )
            console.log('📧 Email sent result:', emailSent)
          } else {
            console.log('❌ No email found for escalation response')
            console.log('  - thread.user_email:', thread?.user_email)
            console.log('  - org_id:', item.org_id)
          }
        }
      }

      // Handle DSR resolution
      if (item.type === 'dsr' && item.related_dsr_id) {
        const dsrStatus = resolutionType === 'rejected' ? 'rejected' : 'completed'
        
        // Update DSR
        await supabase
          .from('data_subject_requests')
          .update({
            status: dsrStatus,
            response_text: response,
            responded_at: new Date().toISOString()
          })
          .eq('id', item.related_dsr_id)

        // Send email to requester
        if (sendEmail) {
          const { data: dsr } = await supabase
            .from('data_subject_requests')
            .select('email, full_name, request_type')
            .eq('id', item.related_dsr_id)
            .single()

          if (dsr?.email) {
            const emailHtml = generateDSRResponseEmail(
              orgName,
              dsr.request_type,
              dsr.full_name,
              response,
              dsrStatus as 'completed' | 'rejected'
            )

            emailSent = await sendResponseEmail(
              dsr.email,
              `עדכון בקשת נושא מידע - ${orgName}`,
              emailHtml
            )
          }
        }
      }

      // Handle DOCUMENT REVIEW resolution — activate pending docs
      if (item.type === 'review') {
        // Activate any remaining pending_review docs
        await supabase
          .from('documents')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('org_id', item.org_id)
          .eq('status', 'pending_review')

        // Get ALL org docs for the email (including already-approved ones)
        const { data: allOrgDocs } = await supabase
          .from('documents')
          .select('id, title, type')
          .eq('org_id', item.org_id)
          .eq('status', 'active')

        if (allOrgDocs?.length) {
          console.log(`✅ Org ${item.org_id} has ${allOrgDocs.length} active docs`)
        }

        // Send email to client: your documents have been reviewed and approved
        if (sendEmail) {
          try {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('contact_email, owner_email, name')
              .eq('id', item.org_id)
              .single()
            
            // Try: 1) org contact email, 2) org owner email, 3) user's auth email
            let email = orgData?.contact_email || orgData?.owner_email
            if (!email) {
              const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('org_id', item.org_id)
                .limit(1)
                .single()
              email = userData?.email
            }

            if (email) {
              const docList = allOrgDocs?.map(d => d.title || d.type).join('، ') || 'מסמכים'
              const emailHtml = `
                <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                  <h2 style="color:#059669">✅ המסמכים שלכם אושרו</h2>
                  <p>שלום,</p>
                  <p>ממונה הגנת הפרטיות סקר ואישר את המסמכים הבאים:</p>
                  <p style="background:#f0fdf4;padding:12px;border-radius:8px;font-weight:600">${docList}</p>
                  ${response ? `<p>הערות הממונה: ${response}</p>` : ''}
                  <p>המסמכים זמינים בלוח הבקרה שלכם.</p>
                  <a href="https://mydpo.co.il/dashboard" style="display:inline-block;padding:10px 24px;background:#4f46e5;color:white;border-radius:8px;text-decoration:none;margin-top:8px">צפייה במסמכים</a>
                </div>
              `
              emailSent = await sendResponseEmail(email, `מסמכים אושרו - ${orgData?.name || ''}`, emailHtml)
            }
          } catch (e) {
            console.log('Could not send doc approval email:', e)
          }
        }
      }

      // Update compliance score
      try {
        await supabase.rpc('update_compliance_score', { p_org_id: item.org_id })
      } catch (e) {
        // Ignore if function doesn't exist
      }

      return NextResponse.json({ 
        success: true,
        email_sent: emailSent
      })
    }

    // =========================================
    // AI Analyze Queue Item (manual trigger)
    // =========================================
    if (action === 'ai_analyze') {
      const { itemId } = body
      
      if (!itemId) {
        return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
      }

      const analysis = await analyzeQueueItem(itemId)
      
      if (!analysis) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      return NextResponse.json({ analysis })
    }

    // =========================================
    // Auto-analyze all pending items without analysis
    // =========================================
    if (action === 'auto_analyze_pending') {
      // Get items without AI analysis
      const { data: items } = await supabase
        .from('dpo_queue')
        .select('id')
        .eq('status', 'pending')
        .is('ai_analyzed_at', null)
        .limit(5) // Process max 5 at a time

      if (!items || items.length === 0) {
        return NextResponse.json({ analyzed: 0, message: 'No items to analyze' })
      }

      let analyzedCount = 0
      for (const item of items) {
        try {
          await analyzeQueueItem(item.id)
          analyzedCount++
        } catch (e) {
          console.error(`Failed to analyze item ${item.id}:`, e)
        }
      }

      return NextResponse.json({ 
        analyzed: analyzedCount, 
        total: items.length 
      })
    }

    // =========================================
    // Bulk Approve AI Recommendations
    // =========================================
    if (action === 'bulk_approve') {
      const { itemIds, minConfidence = 0.85, sendEmails = true } = body

      if (!itemIds || !Array.isArray(itemIds)) {
        return NextResponse.json({ error: 'Missing itemIds array' }, { status: 400 })
      }

      const { data: items } = await supabase
        .from('dpo_queue')
        .select('*, organizations(name)')
        .in('id', itemIds)
        .eq('status', 'pending')
        .gte('ai_confidence', minConfidence)

      if (!items || items.length === 0) {
        return NextResponse.json({ approved: 0, message: 'No items meet criteria' })
      }

      let approvedCount = 0
      let emailsSent = 0

      for (const item of items) {
        if (!item.ai_draft_response) continue

        try {
          // Use the resolve action for each item
          const result = await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'resolve',
              itemId: item.id,
              resolutionType: 'approved_ai',
              response: item.ai_draft_response,
              notes: 'אושר אוטומטית - ביטחון AI גבוה',
              timeSpentSeconds: 30, // 30 seconds for review
              sendEmail: sendEmails
            })
          })

          if (result.ok) {
            const data = await result.json()
            approvedCount++
            if (data.email_sent) emailsSent++
          }
        } catch (e) {
          console.error(`Failed to approve item ${item.id}:`, e)
        }
      }

      return NextResponse.json({ 
        approved: approvedCount, 
        total: items.length,
        emails_sent: emailsSent
      })
    }

    // =========================================
    // Create Security Incident
    // =========================================
    if (action === 'create_incident') {
      const { orgId, title, description, severity, discoveredAt, dataTypesAffected, recordsAffected } = body

      if (!orgId || !title || !severity || !discoveredAt) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Create incident
      const { data: incident, error: incidentError } = await supabase
        .from('security_incidents')
        .insert({
          org_id: orgId,
          title,
          description,
          severity,
          discovered_at: discoveredAt,
          data_types_affected: dataTypesAffected,
          records_affected: recordsAffected,
          requires_notification: severity === 'critical' || severity === 'high'
        })
        .select()
        .single()

      if (incidentError) {
        return NextResponse.json({ error: incidentError.message }, { status: 500 })
      }

      // Create queue item for incident
      const deadlineHours = severity === 'critical' ? 4 : severity === 'high' ? 24 : 72
      
      await supabase.from('dpo_queue').insert({
        org_id: orgId,
        type: 'incident',
        priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
        title: `אירוע אבטחה: ${title}`,
        description: description,
        sla_hours: deadlineHours,
        deadline_at: new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString(),
        metadata: { incident_id: incident.id }
      })

      return NextResponse.json({ incident })
    }

    // =========================================
    // Update Priority
    // =========================================
    if (action === 'update_priority') {
      const { itemId, priority } = body

      if (!itemId || !priority) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { error } = await supabase
        .from('dpo_queue')
        .update({ priority })
        .eq('id', itemId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Log Time Manually
    // =========================================
    if (action === 'log_time') {
      const { orgId, queueItemId, actionType, description, durationSeconds } = body

      if (!orgId || !actionType || !durationSeconds) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { error } = await supabase.from('dpo_time_log').insert({
        org_id: orgId,
        queue_item_id: queueItemId,
        action: actionType,
        description,
        duration_seconds: durationSeconds
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Approve individual document
    // =========================================
    if (action === 'approve_document') {
      const { documentId, notes } = body
      if (!documentId) {
        return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log time
      const { data: doc } = await supabase
        .from('documents')
        .select('org_id, title, type')
        .eq('id', documentId)
        .single()

      if (doc) {
        try {
          await supabase.from('dpo_time_log').insert({
            org_id: doc.org_id,
            action: 'document_review',
            description: `אישור מסמך: ${doc.title || doc.type}`,
            duration_seconds: 60
          })
        } catch (e) { /* ignore */ }
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Edit document content (DPO edits)
    // =========================================
    if (action === 'edit_document') {
      const { documentId, content, notes } = body
      if (!documentId || !content) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }

      const { error } = await supabase
        .from('documents')
        .update({
          content,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Request document regeneration with feedback
    // =========================================
    if (action === 'regenerate_document') {
      const { documentId, feedback } = body
      if (!documentId) {
        return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
      }

      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // Get org context for regeneration
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', doc.org_id)
        .single()

      const { data: onboarding } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('org_id', doc.org_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Use AI to regenerate
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `אתה ממונה הגנת פרטיות. יש לשכתב את המסמך הבא עבור הארגון.

ארגון: ${org?.name || 'לא ידוע'}
תחום: ${onboarding?.industry || 'לא ידוע'}
עובדים: ${onboarding?.employee_count || 'לא ידוע'}

סוג מסמך: ${doc.type}
כותרת: ${doc.title}

הערות הממונה לשיפור:
${feedback || 'יש לשפר את המסמך'}

המסמך הנוכחי:
${doc.content?.substring(0, 3000)}

אנא כתוב גרסה משופרת של המסמך בעברית. כתוב רק את המסמך עצמו, ללא הסברים.`
        }]
      })

      const newContent = message.content[0].type === 'text' ? message.content[0].text : ''

      // Update document with new content
      const { error } = await supabase
        .from('documents')
        .update({
          content: newContent,
          status: 'pending_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, content: newContent })
    }

    // =========================================
    // Delete document
    // =========================================
    if (action === 'delete_document') {
      const { documentId } = body
      if (!documentId) {
        return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
      }

      // Get doc info for audit log before deleting
      const { data: doc } = await supabase
        .from('documents')
        .select('org_id, title, type')
        .eq('id', documentId)
        .single()

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log
      if (doc) {
        try {
          await supabase.from('dpo_time_log').insert({
            org_id: doc.org_id,
            action: 'document_delete',
            description: `מחיקת מסמך: ${doc.title || doc.type}`,
            duration_seconds: 10
          })
        } catch (e) { /* ignore */ }
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Finalize document — mark as official final version
    // =========================================
    if (action === 'finalize_document') {
      const { documentId, version } = body
      if (!documentId) {
        return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'active',
          version: version || 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log
      const { data: doc } = await supabase
        .from('documents')
        .select('org_id, title, type')
        .eq('id', documentId)
        .single()

      if (doc) {
        try {
          await supabase.from('dpo_time_log').insert({
            org_id: doc.org_id,
            action: 'document_finalize',
            description: `גרסה סופית (v${version || 1}): ${doc.title || doc.type}`,
            duration_seconds: 30
          })
        } catch (e) { /* ignore */ }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('DPO API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

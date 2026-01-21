import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // =========================================
    // Get Dashboard Stats
    // =========================================
    if (action === 'stats') {
      // Get queue counts by priority
      const { data: queueStats } = await supabase
        .from('dpo_queue')
        .select('priority, status')
        .eq('status', 'pending')

      const stats = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total_pending: 0
      }

      queueStats?.forEach(item => {
        stats[item.priority as keyof typeof stats]++
        stats.total_pending++
      })

      // Get total active organizations
      const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')

      // Get resolved this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: resolvedData } = await supabase
        .from('dpo_queue')
        .select('time_spent_seconds, resolution_type')
        .eq('status', 'resolved')
        .gte('resolved_at', startOfMonth.toISOString())

      const resolvedThisMonth = resolvedData?.length || 0
      const aiApprovedCount = resolvedData?.filter(r => r.resolution_type === 'approved_ai').length || 0
      const avgTimeSeconds = resolvedData?.length 
        ? resolvedData.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / resolvedData.length 
        : 0

      return NextResponse.json({
        queue: stats,
        organizations: {
          active: orgCount || 0,
          healthy: orgCount || 0
        },
        monthly: {
          resolved: resolvedThisMonth,
          ai_approved: aiApprovedCount,
          ai_approval_rate: resolvedThisMonth ? Math.round((aiApprovedCount / resolvedThisMonth) * 100) : 0,
          avg_time_minutes: Math.round(avgTimeSeconds / 60)
        }
      })
    }

    // =========================================
    // Get Queue Items
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
        .order('priority', { ascending: true })
        .order('deadline_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (priority) {
        query = query.eq('priority', priority)
      }
      if (type) {
        query = query.eq('type', type)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Queue fetch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Transform priority for sorting display
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      const sorted = data?.sort((a: any, b: any) => {
        const pA = priorityOrder[a.priority] || 4
        const pB = priorityOrder[b.priority] || 4
        if (pA !== pB) return pA - pB
        if (a.deadline_at && b.deadline_at) {
          return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime()
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      return NextResponse.json({ items: sorted, total: count })
    }

    // =========================================
    // Get Single Queue Item with Full Context
    // =========================================
    if (action === 'queue_item') {
      const itemId = searchParams.get('id')
      if (!itemId) {
        return NextResponse.json({ error: 'Missing item ID' }, { status: 400 })
      }

      const { data: item, error } = await supabase
        .from('dpo_queue')
        .select(`
          *,
          organizations (
            id,
            name,
            created_at
          )
        `)
        .eq('id', itemId)
        .single()

      if (error || !item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      // Get related context based on type
      let context: any = {}

      if (item.type === 'escalation' && item.related_thread_id) {
        const { data: thread } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', item.related_thread_id)
          .single()

        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', item.related_thread_id)
          .order('created_at', { ascending: true })

        context.thread = thread
        context.messages = messages
      }

      if (item.type === 'dsr' && item.related_dsr_id) {
        const { data: dsr } = await supabase
          .from('data_subject_requests')
          .select('*')
          .eq('id', item.related_dsr_id)
          .single()

        context.dsr = dsr
      }

      // Get org documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, type, status')
        .eq('org_id', item.org_id)
        .eq('status', 'active')

      context.documents = documents

      // Get compliance score
      const { data: compliance } = await supabase
        .from('org_compliance_scores')
        .select('*')
        .eq('org_id', item.org_id)
        .single()

      context.compliance = compliance

      // Get recent history for this org
      const { data: history } = await supabase
        .from('dpo_queue')
        .select('id, type, title, status, resolved_at, resolution_type')
        .eq('org_id', item.org_id)
        .neq('id', itemId)
        .order('created_at', { ascending: false })
        .limit(5)

      context.recent_history = history

      return NextResponse.json({ item, context })
    }

    // =========================================
    // Get Organizations List
    // =========================================
    if (action === 'organizations') {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          subscription_status,
          created_at,
          org_compliance_scores (
            overall_score,
            risk_level,
            next_review_at
          )
        `)
        .eq('subscription_status', 'active')
        .order('name')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Get pending counts per org
      const { data: pendingCounts } = await supabase
        .from('dpo_queue')
        .select('org_id')
        .eq('status', 'pending')

      const pendingByOrg: Record<string, number> = {}
      pendingCounts?.forEach(p => {
        pendingByOrg[p.org_id] = (pendingByOrg[p.org_id] || 0) + 1
      })

      const orgsWithCounts = data?.map(org => ({
        ...org,
        pending_items: pendingByOrg[org.id] || 0,
        compliance: org.org_compliance_scores?.[0] || null
      }))

      return NextResponse.json({ organizations: orgsWithCounts })
    }

    // =========================================
    // Get Organization Detail
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

      return NextResponse.json({
        organization: org,
        compliance,
        documents,
        queue_history: queueHistory,
        time_this_month_minutes: Math.round(totalMinutesThisMonth),
        onboarding_context: onboarding?.answers || {}
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('DPO API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // =========================================
    // Resolve Queue Item
    // =========================================
    if (action === 'resolve') {
      const { itemId, resolutionType, response, notes, timeSpentSeconds } = body

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

      if (timeSpentSeconds) {
        await supabase.from('dpo_time_log').insert({
          org_id: item.org_id,
          queue_item_id: itemId,
          action: 'resolve',
          description: `טיפול: ${item.title}`,
          duration_seconds: timeSpentSeconds
        })
      }

      if (item.type === 'escalation' && item.related_thread_id && response) {
        await supabase.from('messages').insert({
          thread_id: item.related_thread_id,
          sender_type: 'dpo',
          sender_name: 'ממונה הגנת הפרטיות',
          content: response
        })

        await supabase
          .from('message_threads')
          .update({ status: 'resolved' })
          .eq('id', item.related_thread_id)
      }

      if (item.type === 'dsr' && item.related_dsr_id) {
        await supabase
          .from('data_subject_requests')
          .update({
            status: resolutionType === 'rejected' ? 'rejected' : 'completed',
            response_text: response,
            responded_at: new Date().toISOString()
          })
          .eq('id', item.related_dsr_id)
      }

      try {
        await supabase.rpc('update_compliance_score', { p_org_id: item.org_id })
      } catch (e) {
        // Ignore if function doesn't exist
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // AI Analyze Queue Item
    // =========================================
    if (action === 'ai_analyze') {
      const { itemId } = body

      const { data: item } = await supabase
        .from('dpo_queue')
        .select(`
          *,
          organizations (name)
        `)
        .eq('id', itemId)
        .single()

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

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
3. טיוטת תשובה מוצעת
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

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })

      const aiText = response.content[0].type === 'text' ? response.content[0].text : ''
      
      let analysis
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0])
        } else {
          analysis = {
            summary: aiText.substring(0, 200),
            recommendation: 'לא ניתן לנתח אוטומטית',
            draft_response: '',
            confidence: 0.5,
            risks: []
          }
        }
      } catch {
        analysis = {
          summary: aiText.substring(0, 200),
          recommendation: 'לא ניתן לנתח אוטומטית',
          draft_response: '',
          confidence: 0.5,
          risks: []
        }
      }

      await supabase
        .from('dpo_queue')
        .update({
          ai_summary: analysis.summary,
          ai_recommendation: analysis.recommendation,
          ai_draft_response: analysis.draft_response,
          ai_confidence: analysis.confidence,
          ai_risk_score: analysis.risks?.length > 0 ? 0.3 + (analysis.risks.length * 0.1) : 0.1,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', itemId)

      return NextResponse.json({ analysis })
    }

    // =========================================
    // Bulk Approve AI Recommendations
    // =========================================
    if (action === 'bulk_approve') {
      const { itemIds, minConfidence = 0.85 } = body

      if (!itemIds || !Array.isArray(itemIds)) {
        return NextResponse.json({ error: 'Missing itemIds array' }, { status: 400 })
      }

      const { data: items } = await supabase
        .from('dpo_queue')
        .select('*')
        .in('id', itemIds)
        .gte('ai_confidence', minConfidence)
        .not('ai_draft_response', 'is', null)

      if (!items || items.length === 0) {
        return NextResponse.json({ approved: 0, message: 'No items met criteria' })
      }

      let approvedCount = 0

      for (const item of items) {
        await supabase
          .from('dpo_queue')
          .update({
            status: 'resolved',
            resolution_type: 'approved_ai',
            resolution_response: item.ai_draft_response,
            resolved_at: new Date().toISOString(),
            time_spent_seconds: 5
          })
          .eq('id', item.id)

        if (item.type === 'escalation' && item.related_thread_id) {
          await supabase.from('messages').insert({
            thread_id: item.related_thread_id,
            sender_type: 'dpo',
            sender_name: 'ממונה הגנת הפרטיות',
            content: item.ai_draft_response
          })

          await supabase
            .from('message_threads')
            .update({ status: 'resolved' })
            .eq('id', item.related_thread_id)
        }

        approvedCount++
      }

      return NextResponse.json({ 
        approved: approvedCount, 
        total: itemIds.length,
        skipped: itemIds.length - approvedCount 
      })
    }

    // =========================================
    // Create Security Incident
    // =========================================
    if (action === 'create_incident') {
      const { orgId, title, description, severity, discoveredAt, dataTypesAffected } = body

      if (!orgId || !title || !severity) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const { data: incident, error: incidentError } = await supabase
        .from('security_incidents')
        .insert({
          org_id: orgId,
          title,
          description,
          severity,
          discovered_at: discoveredAt || new Date().toISOString(),
          data_types_affected: dataTypesAffected || [],
          requires_notification: severity === 'critical' || severity === 'high'
        })
        .select()
        .single()

      if (incidentError) {
        return NextResponse.json({ error: incidentError.message }, { status: 500 })
      }

      const { data: queueItem } = await supabase
        .from('dpo_queue')
        .insert({
          org_id: orgId,
          type: 'incident',
          priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
          title: `אירוע אבטחה: ${title}`,
          description,
          sla_hours: severity === 'critical' ? 4 : 24,
          deadline_at: new Date(Date.now() + (severity === 'critical' ? 4 : 24) * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (queueItem) {
        await supabase
          .from('security_incidents')
          .update({ queue_item_id: queueItem.id })
          .eq('id', incident.id)
      }

      return NextResponse.json({ incident, queueItem })
    }

    // =========================================
    // Update Queue Item Priority
    // =========================================
    if (action === 'update_priority') {
      const { itemId, priority } = body

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
    // Log DPO Time
    // =========================================
    if (action === 'log_time') {
      const { orgId, queueItemId, actionType, description, durationSeconds } = body

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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('DPO API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const resend = new Resend(process.env.RESEND_API_KEY)

// =============================================
// HELPER: Calculate hours remaining
// =============================================
function getHoursRemaining(deadline: string): number {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
}

// =============================================
// HELPER: Get urgency level
// =============================================
function getUrgencyLevel(deadline: string, notified: boolean): string {
  if (notified) return 'notified'
  const hours = getHoursRemaining(deadline)
  if (hours < 0) return 'overdue'
  if (hours < 4) return 'critical'
  if (hours < 12) return 'urgent'
  if (hours < 24) return 'warning'
  return 'ok'
}

// =============================================
// HELPER: AI Incident Analysis
// =============================================
async function analyzeIncident(incident: any): Promise<any> {
  const systemPrompt = `אתה יועץ הגנת פרטיות מומחה בישראל. תפקידך לנתח אירועי אבטחה ולהעריך את הסיכון.

על פי תיקון 13 לחוק הגנת הפרטיות:
- יש לדווח לרשות להגנת הפרטיות תוך 24 שעות מגילוי האירוע
- יש להודיע לנפגעים אם קיים סיכון גבוה לזכויותיהם
- יש לתעד את כל הפעולות שננקטו

הנחיות:
1. הערך את חומרת האירוע
2. קבע אם נדרש דיווח לרשות
3. קבע אם נדרשת הודעה לנפגעים
4. הצע צעדים מיידיים
5. נסח טיוטת דיווח לרשות (אם נדרש)`

  const userPrompt = `
אירוע אבטחה לניתוח:

כותרת: ${incident.title}
תיאור: ${incident.description || 'לא צוין'}
סוג: ${incident.incident_type}
חומרה מדווחת: ${incident.severity}
נתגלה ב: ${new Date(incident.discovered_at).toLocaleString('he-IL')}

סוגי מידע שנפגעו: ${incident.data_types_affected?.join(', ') || 'לא ידוע'}
מספר רשומות: ${incident.records_affected || 'לא ידוע'}
מספר נפגעים פוטנציאלי: ${incident.individuals_affected || 'לא ידוע'}

אנא ספק ניתוח בפורמט JSON:
{
  "summary": "סיכום קצר של האירוע",
  "severity_assessment": "low/medium/high/critical",
  "severity_reasoning": "נימוק להערכת החומרה",
  "risk_to_individuals": "none/low/medium/high/severe",
  "risk_reasoning": "נימוק להערכת הסיכון לנפגעים",
  "requires_authority_notification": true/false,
  "authority_notification_reasoning": "נימוק",
  "requires_individual_notification": true/false,
  "individual_notification_reasoning": "נימוק",
  "immediate_actions": ["פעולה 1", "פעולה 2"],
  "containment_recommendations": "המלצות להכלה",
  "authority_notification_draft": "טיוטת דיווח לרשות להגנת הפרטיות (אם נדרש)",
  "individual_notification_draft": "טיוטת הודעה לנפגעים (אם נדרש)"
}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    })

    const content = response.content[0]
    if (content.type !== 'text') return null

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('AI analysis error:', error)
    return null
  }
}

// =============================================
// HELPER: Send DPO Alert Email
// =============================================
async function sendDPOAlert(incident: any, orgName: string): Promise<boolean> {
  const hoursRemaining = getHoursRemaining(incident.authority_deadline)
  const urgency = getUrgencyLevel(incident.authority_deadline, false)
  
  const urgencyEmoji: Record<string, string> = {
    critical: '🔴',
    urgent: '🟠',
    warning: '🟡',
    ok: '🟢',
    overdue: '⚫',
    notified: '✅'
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0;">🚨 אירוע אבטחה חדש</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${orgName}</p>
  </div>
  
  <div style="background: #fef2f2; padding: 30px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #991b1b; margin-top: 0;">${incident.title}</h2>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p><strong>סוג:</strong> ${incident.incident_type}</p>
      <p><strong>חומרה:</strong> ${incident.severity}</p>
      <p><strong>נתגלה:</strong> ${new Date(incident.discovered_at).toLocaleString('he-IL')}</p>
      ${incident.description ? `<p><strong>תיאור:</strong> ${incident.description}</p>` : ''}
    </div>
    
    <div style="background: ${urgency === 'critical' || urgency === 'overdue' ? '#fecaca' : '#fef3c7'}; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 18px;">
        ${urgencyEmoji[urgency] || '⚪'} 
        <strong>זמן נותר לדיווח: ${hoursRemaining > 0 ? Math.round(hoursRemaining) + ' שעות' : 'חלף המועד!'}</strong>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
        דדליין: ${new Date(incident.authority_deadline).toLocaleString('he-IL')}
      </p>
    </div>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/dpo" 
         style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        צפה בלוח הבקרה
      </a>
    </div>
  </div>
</body>
</html>
`

  try {
    await resend.emails.send({
      from: 'DPO-Pro <onboarding@resend.dev>',
      to: [process.env.DPO_EMAIL || 'dpo@example.com'],
      subject: `🚨 אירוע אבטחה חדש - ${orgName} - ${incident.severity}`,
      html
    })
    return true
  } catch (error) {
    console.error('DPO alert email error:', error)
    return false
  }
}

// =============================================
// GET: List/Fetch Incidents
// =============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const incidentId = searchParams.get('id')
let orgId: string | null = null

    // DPO dashboard action — requires DPO auth
    if (action === 'dashboard') {
      const { authenticateDpo } = await import('@/lib/api-auth')
      const isDpo = await authenticateDpo(request, supabase)
      if (!isDpo) return NextResponse.json({ error: 'DPO auth required' }, { status: 401 })
    } else {
      // All other actions — require user auth
      const auth = await authenticateRequest(request, supabase)
      if (!auth) return unauthorizedResponse()
      // Override orgId with authenticated org
      var orgId: string | null = auth.orgId
    }

    // =========================================
    // Get single incident with full details
    // =========================================
    if (action === 'get' && incidentId) {
      const { data: incident, error } = await supabase
        .from('security_incidents')
        .select('*, organizations(name)')
        .eq('id', incidentId)
        .single()

      if (error || !incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
      }

      // Get actions
      const { data: actions } = await supabase
        .from('incident_actions')
        .select('*')
        .eq('incident_id', incidentId)
        .order('performed_at', { ascending: false })

      // Get notifications
      const { data: notifications } = await supabase
        .from('incident_notifications')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        incident: {
          ...incident,
          hours_remaining: getHoursRemaining(incident.authority_deadline),
          urgency: getUrgencyLevel(incident.authority_deadline, !!incident.authority_notified_at)
        },
        actions: actions || [],
        notifications: notifications || []
      })
    }

    // =========================================
    // List incidents for organization
    // =========================================
    if ((action === 'list' || !action) && orgId) {
      const { data: incidents, error } = await supabase
        .from('security_incidents')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enriched = incidents?.map(i => ({
        ...i,
        hours_remaining: getHoursRemaining(i.authority_deadline),
        urgency: getUrgencyLevel(i.authority_deadline, !!i.authority_notified_at)
      }))

      return NextResponse.json({ incidents: enriched || [] })
    }

    // =========================================
    // DPO Dashboard: All active incidents
    // =========================================
    if (action === 'dashboard') {
      const { data: incidents, error } = await supabase
        .from('security_incidents')
        .select('*, organizations(name)')
        .not('status', 'eq', 'closed')
        .order('authority_deadline', { ascending: true })

      if (error) throw error

      const enriched = incidents?.map(i => ({
        ...i,
        hours_remaining: getHoursRemaining(i.authority_deadline),
        urgency: getUrgencyLevel(i.authority_deadline, !!i.authority_notified_at)
      }))

      // Group by urgency
      const grouped = {
        overdue: enriched?.filter(i => i.urgency === 'overdue') || [],
        critical: enriched?.filter(i => i.urgency === 'critical') || [],
        urgent: enriched?.filter(i => i.urgency === 'urgent') || [],
        warning: enriched?.filter(i => i.urgency === 'warning') || [],
        ok: enriched?.filter(i => i.urgency === 'ok') || [],
        notified: enriched?.filter(i => i.urgency === 'notified') || []
      }

      return NextResponse.json({ 
        incidents: enriched || [],
        grouped,
        stats: {
          total: enriched?.length || 0,
          overdue: grouped.overdue.length,
          critical: grouped.critical.length,
          urgent: grouped.urgent.length,
          notified: grouped.notified.length
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Incident GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================
// POST: Create/Update Incidents
// =============================================
export async function POST(request: NextRequest) {
  try {
    // --- AUTH CHECK (user or DPO) ---
    const auth = await authenticateRequest(request, supabase)
    const { authenticateDpo } = await import('@/lib/api-auth')
    const isDpo = await authenticateDpo(request, supabase)
    if (!auth && !isDpo) return unauthorizedResponse()
    
    const body = await request.json()
    const { action } = body

    // =========================================
    // Report new incident
    // =========================================
    if (action === 'report') {
      const {
        orgId,
        title,
        description,
        incidentType,
        severity,
        discoveredAt,
        dataTypesAffected,
        recordsAffected,
        individualsAffected,
        reportedByName,
        reportedByEmail,
        reportedByRole
      } = body

      if (!orgId || !title || !discoveredAt) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Create incident
      const { data: incident, error } = await supabase
        .from('security_incidents')
        .insert({
          org_id: orgId,
          title,
          description,
          incident_type: incidentType || 'unknown',
          severity: severity || 'medium',
          discovered_at: discoveredAt,
          data_types_affected: dataTypesAffected || [],
          records_affected: recordsAffected,
          individuals_affected: individualsAffected,
          reported_by_name: reportedByName,
          reported_by_email: reportedByEmail,
          reported_by_role: reportedByRole,
          status: 'reported'
        })
        .select('*, organizations(name)')
        .single()

      if (error) {
        console.error('Incident creation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Get org name
      const orgName = (incident as any).organizations?.name || 'Unknown'

      // Send DPO alert
      await sendDPOAlert(incident, orgName)

      // Trigger AI analysis in background
      setTimeout(async () => {
        try {
          const analysis = await analyzeIncident(incident)
          if (analysis) {
            await supabase
              .from('security_incidents')
              .update({
                ai_summary: analysis.summary,
                ai_risk_assessment: analysis.severity_reasoning + '\n\n' + analysis.risk_reasoning,
                ai_recommendations: analysis.immediate_actions?.join('\n') + '\n\n' + analysis.containment_recommendations,
                ai_authority_draft: analysis.authority_notification_draft,
                ai_individuals_draft: analysis.individual_notification_draft,
                ai_analyzed_at: new Date().toISOString(),
                // Auto-set flags based on AI assessment
                requires_authority_notification: analysis.requires_authority_notification,
                requires_individual_notification: analysis.requires_individual_notification,
                risk_to_individuals: analysis.risk_to_individuals
              })
              .eq('id', incident.id)
          }
        } catch (e) {
          console.error('Background AI analysis failed:', e)
        }
      }, 1000)

      return NextResponse.json({ 
        success: true, 
        incident: {
          ...incident,
          hours_remaining: getHoursRemaining(incident.authority_deadline),
          urgency: getUrgencyLevel(incident.authority_deadline, false)
        }
      })
    }

    // =========================================
    // Update incident status
    // =========================================
    if (action === 'update_status') {
      const { incidentId, status, notes } = body

      if (!incidentId || !status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const updateData: Record<string, any> = { status }
      
      // Set timestamps based on status
      if (status === 'contained') updateData.contained_at = new Date().toISOString()
      if (status === 'notified_authority') updateData.authority_notified_at = new Date().toISOString()
      if (status === 'notified_individuals') updateData.individuals_notified_at = new Date().toISOString()
      if (status === 'resolved') updateData.resolved_at = new Date().toISOString()
      if (status === 'closed') updateData.closed_at = new Date().toISOString()

      const { error } = await supabase
        .from('security_incidents')
        .update(updateData)
        .eq('id', incidentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Add note if provided
      if (notes) {
        await supabase.from('incident_actions').insert({
          incident_id: incidentId,
          action_type: 'note_added',
          action_description: notes,
          performed_by: 'dpo'
        })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Update incident assessment
    // =========================================
    if (action === 'update_assessment') {
      const {
        incidentId,
        severity,
        riskToIndividuals,
        requiresAuthorityNotification,
        requiresIndividualNotification,
        dpoNotes,
        containmentMeasures,
        rootCause,
        rootCauseCategory
      } = body

      if (!incidentId) {
        return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('security_incidents')
        .update({
          severity,
          risk_to_individuals: riskToIndividuals,
          requires_authority_notification: requiresAuthorityNotification,
          requires_individual_notification: requiresIndividualNotification,
          dpo_notes: dpoNotes,
          containment_measures: containmentMeasures,
          root_cause: rootCause,
          root_cause_category: rootCauseCategory,
          dpo_decision_at: new Date().toISOString()
        })
        .eq('id', incidentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Mark as contained
    // =========================================
    if (action === 'mark_contained') {
      const { incidentId, containmentMeasures } = body

      const { error } = await supabase
        .from('security_incidents')
        .update({
          is_contained: true,
          contained_at: new Date().toISOString(),
          containment_measures: containmentMeasures,
          status: 'contained'
        })
        .eq('id', incidentId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Record authority notification
    // =========================================
    if (action === 'notify_authority') {
      const { incidentId, notificationContent, referenceNumber } = body

      // Update incident
      const { error: updateError } = await supabase
        .from('security_incidents')
        .update({
          authority_notified_at: new Date().toISOString(),
          status: 'notified_authority'
        })
        .eq('id', incidentId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Create notification record
      const { data: incident } = await supabase
        .from('security_incidents')
        .select('org_id')
        .eq('id', incidentId)
        .single()

      await supabase.from('incident_notifications').insert({
        incident_id: incidentId,
        org_id: incident?.org_id,
        notification_type: 'authority',
        recipient_type: 'ppa',
        recipient_name: 'רשות להגנת הפרטיות',
        content: notificationContent,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Send individual notifications
    // =========================================
    if (action === 'notify_individuals') {
      const { incidentId, notificationContent, recipientCount } = body

      // Update incident
      const { error: updateError } = await supabase
        .from('security_incidents')
        .update({
          individuals_notified_at: new Date().toISOString(),
          status: 'notified_individuals'
        })
        .eq('id', incidentId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Create notification record
      const { data: incident } = await supabase
        .from('security_incidents')
        .select('org_id')
        .eq('id', incidentId)
        .single()

      await supabase.from('incident_notifications').insert({
        incident_id: incidentId,
        org_id: incident?.org_id,
        notification_type: 'individual',
        recipient_type: 'affected_individuals',
        content: notificationContent,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

      return NextResponse.json({ success: true })
    }

    // =========================================
    // AI Analyze incident
    // =========================================
    if (action === 'analyze') {
      const { incidentId } = body

      const { data: incident } = await supabase
        .from('security_incidents')
        .select('*')
        .eq('id', incidentId)
        .single()

      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
      }

      const analysis = await analyzeIncident(incident)

      if (!analysis) {
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
      }

      // Save analysis
      await supabase
        .from('security_incidents')
        .update({
          ai_summary: analysis.summary,
          ai_risk_assessment: analysis.severity_reasoning + '\n\n' + analysis.risk_reasoning,
          ai_recommendations: analysis.immediate_actions?.join('\n') + '\n\n' + analysis.containment_recommendations,
          ai_authority_draft: analysis.authority_notification_draft,
          ai_individuals_draft: analysis.individual_notification_draft,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', incidentId)

      return NextResponse.json({ success: true, analysis })
    }

    // =========================================
    // Add action/note to incident
    // =========================================
    if (action === 'add_action') {
      const { incidentId, actionType, description, performedBy } = body

      const { error } = await supabase.from('incident_actions').insert({
        incident_id: incidentId,
        action_type: actionType || 'note_added',
        action_description: description,
        performed_by: performedBy || 'dpo'
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Incident POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

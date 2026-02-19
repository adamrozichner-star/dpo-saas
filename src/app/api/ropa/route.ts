import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, authenticateDpo, unauthorizedResponse } from '@/lib/api-auth'
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

// =============================================
// Data Category Definitions (for AI and UI)
// =============================================
const DATA_CATEGORIES = {
  basic: [
    { id: 'name', label: 'שם', he: 'שם מלא' },
    { id: 'email', label: 'אימייל', he: 'כתובת דואר אלקטרוני' },
    { id: 'phone', label: 'טלפון', he: 'מספר טלפון' },
    { id: 'address', label: 'כתובת', he: 'כתובת מגורים' },
    { id: 'date_of_birth', label: 'תאריך לידה', he: 'תאריך לידה' },
    { id: 'gender', label: 'מגדר', he: 'מגדר' },
    { id: 'photo', label: 'תמונה', he: 'תמונת פרופיל' }
  ],
  identifiers: [
    { id: 'id_number', label: 'תעודת זהות', he: 'מספר תעודת זהות', sensitive: true },
    { id: 'passport', label: 'דרכון', he: 'מספר דרכון', sensitive: true },
    { id: 'drivers_license', label: 'רישיון נהיגה', he: 'מספר רישיון נהיגה' }
  ],
  financial: [
    { id: 'bank_account', label: 'חשבון בנק', he: 'פרטי חשבון בנק', sensitive: true },
    { id: 'credit_card', label: 'כרטיס אשראי', he: 'פרטי כרטיס אשראי', sensitive: true },
    { id: 'salary', label: 'שכר', he: 'פרטי שכר', sensitive: true },
    { id: 'tax_info', label: 'מידע מס', he: 'מידע מס והכנסות' }
  ],
  sensitive: [
    { id: 'health', label: 'מידע רפואי', he: 'מידע בריאותי/רפואי', special: true },
    { id: 'biometric', label: 'ביומטרי', he: 'מידע ביומטרי (טביעת אצבע, פנים)', special: true },
    { id: 'genetic', label: 'גנטי', he: 'מידע גנטי', special: true },
    { id: 'racial', label: 'מוצא', he: 'מוצא אתני/גזעי', special: true },
    { id: 'political', label: 'פוליטי', he: 'השקפות פוליטיות', special: true },
    { id: 'religious', label: 'דתי', he: 'אמונות דתיות', special: true },
    { id: 'sexual', label: 'מיני', he: 'נטייה מינית', special: true },
    { id: 'criminal', label: 'פלילי', he: 'עבר פלילי', special: true },
    { id: 'union', label: 'ארגון עובדים', he: 'חברות בארגון עובדים', special: true }
  ],
  digital: [
    { id: 'ip_address', label: 'כתובת IP', he: 'כתובת IP' },
    { id: 'cookies', label: 'עוגיות', he: 'עוגיות ומזהי מעקב' },
    { id: 'device_id', label: 'מזהה מכשיר', he: 'מזהה מכשיר' },
    { id: 'location', label: 'מיקום', he: 'נתוני מיקום GPS' },
    { id: 'browsing_history', label: 'היסטוריית גלישה', he: 'היסטוריית גלישה' }
  ],
  employment: [
    { id: 'employment_history', label: 'היסטוריית תעסוקה', he: 'היסטוריית תעסוקה' },
    { id: 'education', label: 'השכלה', he: 'רקע השכלתי' },
    { id: 'performance', label: 'ביצועים', he: 'הערכות ביצועים' },
    { id: 'attendance', label: 'נוכחות', he: 'נתוני נוכחות' }
  ]
}

const LEGAL_BASES = [
  { id: 'consent', label: 'הסכמה', he: 'הסכמת נושא המידע' },
  { id: 'contract', label: 'חוזה', he: 'ביצוע חוזה' },
  { id: 'legal_obligation', label: 'חובה חוקית', he: 'עמידה בחובה חוקית' },
  { id: 'vital_interests', label: 'אינטרסים חיוניים', he: 'הגנה על חיים' },
  { id: 'public_interest', label: 'אינטרס ציבורי', he: 'משימה ציבורית' },
  { id: 'legitimate_interest', label: 'אינטרס לגיטימי', he: 'אינטרס לגיטימי' }
]

const SECURITY_MEASURES = [
  { id: 'encryption_rest', label: 'הצפנה במנוחה', he: 'הצפנת מידע בשרת' },
  { id: 'encryption_transit', label: 'הצפנה בתעבורה', he: 'הצפנת מידע בהעברה (SSL/TLS)' },
  { id: 'access_control', label: 'בקרת גישה', he: 'בקרת גישה מבוססת תפקידים' },
  { id: 'mfa', label: 'אימות דו-שלבי', he: 'אימות דו-שלבי (MFA)' },
  { id: 'audit_logs', label: 'יומני ביקורת', he: 'יומני גישה וביקורת' },
  { id: 'backup', label: 'גיבוי', he: 'גיבוי קבוע' },
  { id: 'firewall', label: 'חומת אש', he: 'חומת אש' },
  { id: 'antivirus', label: 'אנטי-וירוס', he: 'תוכנת אנטי-וירוס' },
  { id: 'physical_security', label: 'אבטחה פיזית', he: 'אבטחה פיזית של שרתים' },
  { id: 'employee_training', label: 'הדרכת עובדים', he: 'הדרכת עובדים בנושאי אבטחה' },
  { id: 'incident_response', label: 'תגובה לאירועים', he: 'נוהל תגובה לאירועי אבטחה' },
  { id: 'penetration_testing', label: 'מבדקי חדירה', he: 'מבדקי חדירה תקופתיים' }
]

// =============================================
// AI: Analyze Processing Activity
// =============================================
async function analyzeProcessingActivity(activity: any): Promise<any> {
  const systemPrompt = `אתה יועץ הגנת פרטיות מומחה בישראל. תפקידך לנתח פעילויות עיבוד מידע אישי ולהעריך סיכונים.

על פי תיקון 13 לחוק הגנת הפרטיות בישראל:
- מאגרים עם מעל 10,000 רשומות חייבים ברישום ברשות להגנת הפרטיות
- מידע רגיש (בריאות, ביומטרי, פלילי) מחייב אמצעי הגנה מוגברים
- העברת מידע לחו"ל דורשת אמצעי הגנה מתאימים
- יש לבצע הערכת סיכונים (DPIA) כאשר העיבוד עלול לסכן זכויות

הערך את הפעילות וספק:
1. הערכת סיכון כללית
2. ליקויים או חוסרים
3. המלצות לשיפור
4. האם נדרש רישום ברשות להגנת הפרטיות
5. האם נדרשת הערכת השפעה על פרטיות (DPIA)`

  const activitySummary = `
פעילות עיבוד: ${activity.name}
תיאור: ${activity.description || 'לא צוין'}
מחלקה: ${activity.department || 'לא צוין'}

סוגי מידע: ${JSON.stringify(activity.data_categories || [])}
קטגוריות מיוחדות (רגיש): ${JSON.stringify(activity.special_categories || [])}
נושאי מידע: ${JSON.stringify(activity.data_subject_categories || [])}
מספר רשומות משוער: ${activity.estimated_records_count || 'לא ידוע'}
כולל קטינים: ${activity.includes_minors ? 'כן' : 'לא'}

בסיס חוקי: ${activity.legal_basis || 'לא צוין'}
מטרות: ${JSON.stringify(activity.purposes || [])}

העברה לחו"ל: ${activity.international_transfers ? 'כן - ' + JSON.stringify(activity.transfer_countries || []) : 'לא'}
תקופת שמירה: ${activity.retention_period || 'לא צוין'}

אמצעי אבטחה: ${JSON.stringify(activity.security_measures || [])}
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: activitySummary }],
      system: systemPrompt + `\n\nהחזר תשובה בפורמט JSON:
{
  "risk_assessment": "הערכת סיכון כללית",
  "risk_factors": ["גורם סיכון 1", "גורם סיכון 2"],
  "gaps": ["ליקוי 1", "ליקוי 2"],
  "recommendations": ["המלצה 1", "המלצה 2"],
  "requires_ppa_registration": true/false,
  "ppa_reasoning": "נימוק לגבי רישום ברשות",
  "requires_dpia": true/false,
  "dpia_reasoning": "נימוק לגבי DPIA",
  "compliance_score": 0-100
}`
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
// GET: List/Fetch Processing Activities
// =============================================
export async function GET(request: NextRequest) {
  try {
    // --- AUTH CHECK (user or DPO) ---
    const auth = await authenticateRequest(request, supabase)
    const isDpo = await authenticateDpo(request, supabase)
    if (!auth && !isDpo) return unauthorizedResponse()
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const orgId = auth ? auth.orgId : searchParams.get('orgId')
    const activityId = searchParams.get('id')

    // Get single activity
    if (action === 'get' && activityId) {
      const { data: activity, error } = await supabase
        .from('processing_activities')
        .select('*')
        .eq('id', activityId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      // Get linked recipients
      const { data: recipients } = await supabase
        .from('processing_activity_recipients')
        .select('*, data_recipients(*)')
        .eq('processing_activity_id', activityId)

      return NextResponse.json({ activity, recipients: recipients || [] })
    }

    // List activities for organization
    if (orgId) {
      const { data: activities, error } = await supabase
        .from('processing_activities')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Get recipients for org
      const { data: recipients } = await supabase
        .from('data_recipients')
        .select('*')
        .eq('org_id', orgId)

      // Calculate stats
      const stats = {
        total: activities?.length || 0,
        by_risk: {
          critical: activities?.filter(a => a.risk_level === 'critical').length || 0,
          high: activities?.filter(a => a.risk_level === 'high').length || 0,
          medium: activities?.filter(a => a.risk_level === 'medium').length || 0,
          low: activities?.filter(a => a.risk_level === 'low').length || 0
        },
        requires_ppa: activities?.filter(a => a.requires_ppa_registration).length || 0,
        requires_dpia: activities?.filter(a => a.requires_dpia && !a.dpia_completed).length || 0,
        pending_review: activities?.filter(a => a.status === 'under_review').length || 0
      }

      return NextResponse.json({ 
        activities: activities || [], 
        recipients: recipients || [],
        stats 
      })
    }

    // DPO Dashboard: All organizations summary
    if (action === 'dashboard') {
      const { data: activities, error } = await supabase
        .from('processing_activities')
        .select('*, organizations(name)')
        .order('risk_level', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Group by organization
      const byOrg: Record<string, any> = {}
      for (const act of activities || []) {
        const orgId = act.org_id
        if (!byOrg[orgId]) {
          byOrg[orgId] = {
            org_id: orgId,
            org_name: act.organizations?.name,
            activities: [],
            stats: { total: 0, critical: 0, high: 0, requires_ppa: 0 }
          }
        }
        byOrg[orgId].activities.push(act)
        byOrg[orgId].stats.total++
        if (act.risk_level === 'critical') byOrg[orgId].stats.critical++
        if (act.risk_level === 'high') byOrg[orgId].stats.high++
        if (act.requires_ppa_registration) byOrg[orgId].stats.requires_ppa++
      }

      return NextResponse.json({ 
        organizations: Object.values(byOrg),
        total_activities: activities?.length || 0
      })
    }

    // Get reference data (categories, legal bases, etc.)
    if (action === 'reference') {
      return NextResponse.json({
        data_categories: DATA_CATEGORIES,
        legal_bases: LEGAL_BASES,
        security_measures: SECURITY_MEASURES
      })
    }

    return NextResponse.json({ error: 'Missing orgId or action' }, { status: 400 })

  } catch (error) {
    console.error('ROPA GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================
// POST: Create/Update/Analyze Processing Activities
// =============================================
export async function POST(request: NextRequest) {
  try {
    // --- AUTH CHECK (user or DPO) ---
    const auth = await authenticateRequest(request, supabase)
    const isDpo = await authenticateDpo(request, supabase)
    if (!auth && !isDpo) return unauthorizedResponse()
    
    const body = await request.json()
    const { action } = body

    // =========================================
    // Create new processing activity
    // =========================================
    if (action === 'create') {
      const { orgId, data } = body

      if (!orgId || !data?.name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Insert activity
      const { data: activity, error } = await supabase
        .from('processing_activities')
        .insert({
          org_id: orgId,
          name: data.name,
          description: data.description,
          department: data.department,
          legal_basis: data.legal_basis,
          legal_basis_details: data.legal_basis_details,
          data_categories: data.data_categories || [],
          special_categories: data.special_categories || [],
          data_subject_categories: data.data_subject_categories || [],
          estimated_records_count: data.estimated_records_count,
          includes_minors: data.includes_minors || false,
          purposes: data.purposes || [],
          internal_recipients: data.internal_recipients || [],
          external_recipients: data.external_recipients || [],
          international_transfers: data.international_transfers || false,
          transfer_countries: data.transfer_countries || [],
          transfer_safeguards: data.transfer_safeguards,
          retention_period: data.retention_period,
          retention_justification: data.retention_justification,
          deletion_process: data.deletion_process,
          security_measures: data.security_measures || [],
          systems_used: data.systems_used || [],
          storage_locations: data.storage_locations || [],
          status: 'draft'
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log creation
      await supabase.from('ropa_audit_log').insert({
        org_id: orgId,
        processing_activity_id: activity.id,
        action: 'created',
        performed_by_type: 'user'
      })

      return NextResponse.json({ success: true, activity })
    }

    // =========================================
    // Update processing activity
    // =========================================
    if (action === 'update') {
      const { activityId, data } = body

      if (!activityId) {
        return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })
      }

      const { data: activity, error } = await supabase
        .from('processing_activities')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log update
      await supabase.from('ropa_audit_log').insert({
        org_id: activity.org_id,
        processing_activity_id: activityId,
        action: 'updated',
        performed_by_type: 'user'
      })

      return NextResponse.json({ success: true, activity })
    }

    // =========================================
    // AI Analyze activity
    // =========================================
    if (action === 'analyze') {
      const { activityId } = body

      const { data: activity, error } = await supabase
        .from('processing_activities')
        .select('*')
        .eq('id', activityId)
        .single()

      if (error || !activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }

      const analysis = await analyzeProcessingActivity(activity)

      if (!analysis) {
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
      }

      // Update activity with analysis
      await supabase
        .from('processing_activities')
        .update({
          ai_risk_assessment: analysis.risk_assessment,
          ai_recommendations: analysis.recommendations,
          risk_factors: analysis.risk_factors,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', activityId)

      return NextResponse.json({ success: true, analysis })
    }

    // =========================================
    // Mark activity as reviewed
    // =========================================
    if (action === 'mark_reviewed') {
      const { activityId, reviewNotes, nextReviewMonths = 12 } = body

      const nextReview = new Date()
      nextReview.setMonth(nextReview.getMonth() + nextReviewMonths)

      const { error } = await supabase
        .from('processing_activities')
        .update({
          status: 'active',
          last_reviewed_at: new Date().toISOString(),
          next_review_date: nextReview.toISOString().split('T')[0]
        })
        .eq('id', activityId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log review
      const { data: activity } = await supabase
        .from('processing_activities')
        .select('org_id')
        .eq('id', activityId)
        .single()

      await supabase.from('ropa_audit_log').insert({
        org_id: activity?.org_id,
        processing_activity_id: activityId,
        action: 'reviewed',
        new_value: reviewNotes,
        performed_by_type: 'dpo'
      })

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Add/Update data recipient
    // =========================================
    if (action === 'add_recipient') {
      const { orgId, data } = body

      const { data: recipient, error } = await supabase
        .from('data_recipients')
        .insert({
          org_id: orgId,
          ...data
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, recipient })
    }

    // =========================================
    // Link recipient to activity
    // =========================================
    if (action === 'link_recipient') {
      const { activityId, recipientId, purpose } = body

      const { error } = await supabase
        .from('processing_activity_recipients')
        .insert({
          processing_activity_id: activityId,
          recipient_id: recipientId,
          purpose
        })

      if (error && !error.message.includes('duplicate')) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Delete activity
    // =========================================
    if (action === 'delete') {
      const { activityId } = body

      // Get org_id first for audit log
      const { data: activity } = await supabase
        .from('processing_activities')
        .select('org_id, name')
        .eq('id', activityId)
        .single()

      const { error } = await supabase
        .from('processing_activities')
        .delete()
        .eq('id', activityId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log deletion
      if (activity) {
        await supabase.from('ropa_audit_log').insert({
          org_id: activity.org_id,
          action: 'deleted',
          old_value: activity.name,
          performed_by_type: 'user'
        })
      }

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Export ROPA as JSON (for reporting)
    // =========================================
    if (action === 'export') {
      const { orgId } = body

      const { data: activities } = await supabase
        .from('processing_activities')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active')

      const { data: recipients } = await supabase
        .from('data_recipients')
        .select('*')
        .eq('org_id', orgId)

      const { data: org } = await supabase
        .from('organizations')
        .select('name, business_id')
        .eq('id', orgId)
        .single()

      // Log export
      await supabase.from('ropa_audit_log').insert({
        org_id: orgId,
        action: 'exported',
        performed_by_type: 'user'
      })

      return NextResponse.json({
        export_date: new Date().toISOString(),
        organization: org,
        processing_activities: activities,
        data_recipients: recipients,
        total_activities: activities?.length || 0
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('ROPA POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

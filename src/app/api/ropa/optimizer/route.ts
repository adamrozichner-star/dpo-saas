import { NextRequest, NextResponse } from 'next/server'
import { authenticateDpo, unauthorizedResponse } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { 
  activitiesToDatabases, 
  calculateImpact, 
  classifySecurityLevel,
  calculateObligations,
  type VirtualDatabase 
} from '@/lib/regulatory-engine'

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
// GET: Load org databases for optimizer
// =============================================
export async function GET(request: NextRequest) {
  try {
    const isDpo = await authenticateDpo(request, supabase)
    if (!isDpo) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const action = searchParams.get('action')

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    // Load org info
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, business_id, risk_level')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Load processing activities (current ROPA)
    const { data: activities } = await supabase
      .from('processing_activities')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // Convert to virtual databases
    const databases = activitiesToDatabases(activities || [])
    
    // Classify each
    const classified = databases.map(db => ({
      ...db,
      securityLevel: classifySecurityLevel(db),
    }))

    // Calculate baseline impact
    const impact = calculateImpact(classified)

    // Load saved scenarios
    if (action === 'scenarios') {
      const { data: scenarios } = await supabase
        .from('database_scenarios')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        org,
        databases: classified,
        impact,
        scenarios: scenarios || [],
      })
    }

    return NextResponse.json({
      org,
      databases: classified,
      impact,
    })

  } catch (error) {
    console.error('Optimizer GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================
// POST: Actions (save scenario, AI analyze, apply)
// =============================================
export async function POST(request: NextRequest) {
  try {
    const isDpo = await authenticateDpo(request, supabase)
    if (!isDpo) return unauthorizedResponse()

    const body = await request.json()
    const { action } = body

    // =========================================
    // Save scenario
    // =========================================
    if (action === 'save_scenario') {
      const { orgId, name, description, databases, baselineDatabases } = body

      const impact = calculateImpact(databases)
      const baselineImpact = calculateImpact(baselineDatabases)

      const { data: scenario, error } = await supabase
        .from('database_scenarios')
        .insert({
          org_id: orgId,
          name,
          description,
          databases,
          regulatory_impact: impact,
          baseline_databases: baselineDatabases,
          baseline_impact: baselineImpact,
          created_by: 'dpo',
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, scenario })
    }

    // =========================================
    // AI: Analyze and suggest optimizations
    // =========================================
    if (action === 'ai_suggest') {
      const { databases, orgName } = body

      // Classify each database
      const classified = databases.map((db: VirtualDatabase) => ({
        ...db,
        securityLevel: classifySecurityLevel(db),
        obligations: calculateObligations(db),
      }))

      const impact = calculateImpact(classified)

      const systemPrompt = `אתה יועץ DPO מומחה בישראל. תפקידך לנתח מבנה מאגרי מידע של ארגון ולהציע אופטימיזציות שמפחיתות סיכון רגולטורי.

הרקע הרגולטורי:
- תקנות אבטחת מידע 5777-2017: מאגרים מסווגים לרמות בסיסי/בינוני/גבוה
- מאגר ברמה גבוהה: מכיל מידע רגיש (תוספת ראשונה) + מעל 100,000 נושאי מידע או 100 מורשי גישה
- מאגר ברמה גבוהה חייב: מבדקי חדירה כל 18 חודשים, סקר סיכונים, דיווח לרשות
- פיצול מאגר עם מידע רגיש למאגר נפרד יכול להוריד את המאגר המקורי מ"גבוה" ל"בינוני" או "בסיסי"
- תיקון 13: חובת מינוי DPO, דיווח מאגרים עם מעל 100,000 + מידע רגיש

הציע 2-4 שינויים ספציפיים שיפחיתו את הנטל הרגולטורי. כל הצעה חייבת להיות מעשית ולגיטימית מבחינת החוק.

חשוב: אל תציע לפצל מאגר רק כדי להתחמק מרגולציה. ההצעות צריכות לשקף הגיון עסקי אמיתי (הפרדת מחלקות, הפרדת סוגי מידע שונים, מחיקת מידע לא נחוץ).

החזר JSON בלבד, ללא backticks או markdown:
[
  {
    "type": "split|merge|reclassify|reduce_records|restrict_access|remove_fields",
    "title": "כותרת קצרה בעברית",
    "description": "הסבר מפורט בעברית",
    "impact": "מה ישתנה רגולטורית",
    "affectedDatabases": ["שם מאגר 1"],
    "estimatedSaving": 15000,
    "priority": "high|medium|low"
  }
]`

      const userPrompt = `ארגון: ${orgName || 'לא ידוע'}
סה"כ מאגרים: ${classified.length}
רמת סיכון נוכחית: ${impact.riskScore}/100
עלות שנתית משוערת: ₪${impact.estimatedAnnualCost.toLocaleString()}
מאגרים ברמה גבוהה: ${impact.byLevel.high}
מאגרים ברמה בינונית: ${impact.byLevel.medium}
חייבים דיווח לרשות: ${impact.requiresPpaRegistration}

פירוט מאגרים:
${classified.map((db: any) => `
- "${db.name}" (${db.securityLevel})
  רשומות: ${db.estimatedRecords?.toLocaleString() || '?'}
  מורשי גישה: ${db.authorizedUsers}
  קטגוריות מידע: ${db.dataCategories?.join(', ') || 'לא צוין'}
  קטגוריות רגישות: ${db.specialCategories?.join(', ') || 'אין'}
  העברה לחו"ל: ${db.internationalTransfers ? 'כן' : 'לא'}
`).join('')}`

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })

        const content = response.content[0]
        if (content.type !== 'text') {
          return NextResponse.json({ suggestions: [] })
        }

        // Parse JSON from response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          return NextResponse.json({ suggestions: [] })
        }

        const suggestions = JSON.parse(jsonMatch[0]).map((s: any, i: number) => ({
          ...s,
          id: `suggestion-${i}`,
        }))

        return NextResponse.json({ suggestions, impact })
      } catch (error) {
        console.error('AI suggestion error:', error)
        return NextResponse.json({ suggestions: [], error: 'AI analysis failed' })
      }
    }

    // =========================================
    // Load a saved scenario
    // =========================================
    if (action === 'load_scenario') {
      const { scenarioId } = body

      const { data: scenario, error } = await supabase
        .from('database_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single()

      if (error || !scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }

      return NextResponse.json({ scenario })
    }

    // =========================================
    // Delete scenario
    // =========================================
    if (action === 'delete_scenario') {
      const { scenarioId } = body

      const { error } = await supabase
        .from('database_scenarios')
        .delete()
        .eq('id', scenarioId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Optimizer POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

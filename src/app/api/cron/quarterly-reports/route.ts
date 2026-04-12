import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDpoReportDraft, getCurrentQuarterPeriod } from '@/lib/dpo-report-generator'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const period = getCurrentQuarterPeriod()
  const periodStart = period.start.toISOString().split('T')[0]
  const results = { created: 0, skipped: 0, errors: [] as string[] }

  try {
    const { data: orgs } = await supabase.from('organizations').select('id, name')

    for (const org of orgs || []) {
      try {
        const { data: existing } = await supabase
          .from('dpo_reports')
          .select('id')
          .eq('org_id', org.id)
          .eq('period_start', periodStart)
          .maybeSingle()

        if (existing) { results.skipped++; continue }

        const draft = await generateDpoReportDraft(org.id, supabase, period)
        const { error } = await supabase
          .from('dpo_reports')
          .insert({ org_id: org.id, ...draft, status: 'draft' })

        if (error) results.errors.push(`org ${org.id}: ${error.message}`)
        else results.created++
      } catch (e: any) {
        results.errors.push(`org ${org.id}: ${e.message}`)
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error: any) {
    console.error('Quarterly reports cron error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDpoReportDraft, getCurrentQuarterPeriod } from '@/lib/dpo-report-generator'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getOrgId(request: NextRequest): Promise<{ orgId?: string; error?: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
  if (!userData?.org_id) return { error: NextResponse.json({ error: 'Organization not found' }, { status: 404 }) }

  return { orgId: userData.org_id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const { data: report } = await supabaseAdmin
        .from('dpo_reports')
        .select('*')
        .eq('id', id)
        .eq('org_id', auth.orgId!)
        .maybeSingle()
      if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ report })
    }

    const { data: reports } = await supabaseAdmin
      .from('dpo_reports')
      .select('*')
      .eq('org_id', auth.orgId!)
      .order('period_end', { ascending: false })

    return NextResponse.json({ reports: reports || [] })
  } catch (error: any) {
    console.error('DPO reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const period = getCurrentQuarterPeriod()

    // Check if draft already exists for this period
    const { data: existing } = await supabaseAdmin
      .from('dpo_reports')
      .select('id, status')
      .eq('org_id', auth.orgId!)
      .eq('period_start', period.start.toISOString().split('T')[0])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ report: existing, existed: true })
    }

    const draft = await generateDpoReportDraft(auth.orgId!, supabaseAdmin, period)

    const { data: report, error } = await supabaseAdmin
      .from('dpo_reports')
      .insert({ org_id: auth.orgId!, ...draft, status: 'draft' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('DPO reports POST error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Block edits to submitted reports
    const { data: existing } = await supabaseAdmin
      .from('dpo_reports')
      .select('status')
      .eq('id', id)
      .eq('org_id', auth.orgId!)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'submitted') {
      return NextResponse.json({ error: 'Cannot edit submitted report' }, { status: 403 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: report, error } = await supabaseAdmin
      .from('dpo_reports')
      .update(updates)
      .eq('id', id)
      .eq('org_id', auth.orgId!)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('DPO reports PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('dpo_reports')
      .delete()
      .eq('id', id)
      .eq('org_id', auth.orgId!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DPO reports DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRiskLevel } from '@/lib/dpia-templates'

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
      const { data: dpia, error } = await supabaseAdmin
        .from('dpia_assessments')
        .select('*')
        .eq('id', id)
        .eq('org_id', auth.orgId!)
        .maybeSingle()
      if (error || !dpia) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ dpia })
    }

    const { data: dpias } = await supabaseAdmin
      .from('dpia_assessments')
      .select('*')
      .eq('org_id', auth.orgId!)
      .order('next_review_date', { ascending: true })

    return NextResponse.json({ dpias: dpias || [] })
  } catch (error: any) {
    console.error('DPIA GET error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { activity_name, activity_id, description, legal_basis, data_categories, risks, controls, residual_score, action_plan, status } = body

    if (!activity_name) {
      return NextResponse.json({ error: 'Missing activity_name' }, { status: 400 })
    }

    const risk_level = residual_score ? getRiskLevel(residual_score) : 'medium'

    const { data: dpia, error } = await supabaseAdmin
      .from('dpia_assessments')
      .insert({
        org_id: auth.orgId!,
        activity_name,
        activity_id: activity_id || null,
        description: description || '',
        legal_basis: legal_basis || '',
        data_categories: data_categories || [],
        risks: risks || [],
        controls: controls || [],
        residual_score: residual_score || null,
        risk_level,
        action_plan: action_plan || [],
        status: status || 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('DPIA insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ dpia })
  } catch (error: any) {
    console.error('DPIA POST error:', error)
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

    if (updates.residual_score !== undefined) {
      updates.risk_level = getRiskLevel(updates.residual_score)
    }
    updates.updated_at = new Date().toISOString()

    const { data: dpia, error } = await supabaseAdmin
      .from('dpia_assessments')
      .update(updates)
      .eq('id', id)
      .eq('org_id', auth.orgId!)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dpia })
  } catch (error: any) {
    console.error('DPIA PATCH error:', error)
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
      .from('dpia_assessments')
      .delete()
      .eq('id', id)
      .eq('org_id', auth.orgId!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DPIA DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

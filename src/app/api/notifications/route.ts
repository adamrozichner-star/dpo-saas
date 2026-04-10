import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('org_id', auth.orgId!)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ notifications: notifications || [] })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getOrgId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, action } = body

    if (!id || !['read', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const update = action === 'dismiss'
      ? { dismissed: true }
      : { read: true }

    const { error: updateErr } = await supabaseAdmin
      .from('notifications')
      .update(update)
      .eq('id', id)
      .eq('org_id', auth.orgId!)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

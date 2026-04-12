import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { activityRequiresDPIA, DB_LABELS_DPIA } from '@/lib/dpia-templates'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('auth_user_id', user.id).single()
    if (!userData?.org_id) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const orgId = userData.org_id

    const [{ data: profile }, { data: existingDpias }] = await Promise.all([
      supabaseAdmin.from('organization_profiles').select('profile_data').eq('org_id', orgId).maybeSingle(),
      supabaseAdmin.from('dpia_assessments').select('activity_id, activity_name').eq('org_id', orgId),
    ])

    const v3 = profile?.profile_data?.v3Answers || {}
    const databases: string[] = [...(v3.databases || []), ...(v3.customDatabases || [])]
    const dbDetails = v3.dbDetails || {}

    const coveredIds = new Set((existingDpias || []).map(d => d.activity_id).filter(Boolean))

    const required = databases
      .map(dbKey => {
        const check = activityRequiresDPIA(dbKey, dbDetails[dbKey] || {})
        if (!check.required) return null
        if (coveredIds.has(dbKey)) return null
        return {
          activity_id: dbKey,
          activity_name: DB_LABELS_DPIA[dbKey] || dbKey,
          reason: check.reason,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ required })
  } catch (error: any) {
    console.error('DPIA required-activities error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

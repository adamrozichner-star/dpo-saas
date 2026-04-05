import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mydpo.co.il'
  const results: any[] = []

  try {
    // Get all orgs with active subscriptions
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('org_id')
      .in('status', ['active', 'past_due'])

    if (error || !subs) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    for (const sub of subs) {
      try {
        // Get org + user + profile
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', sub.org_id)
          .single()

        if (!org) continue

        const { data: user } = await supabase
          .from('users')
          .select('email, name')
          .eq('org_id', org.id)
          .limit(1)
          .maybeSingle()

        if (!user?.email) continue

        const { data: profile } = await supabase
          .from('organization_profiles')
          .select('profile_data')
          .eq('org_id', org.id)
          .maybeSingle()

        const profileData = profile?.profile_data || {}
        const actions = profileData.complianceActions || []
        const doneActions = actions.filter((a: any) => a.status === 'completed')
        const pendingActions = actions.filter((a: any) => a.status !== 'completed')

        // Get documents count
        const { count: docsCount } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .eq('status', 'active')

        const score = profileData.complianceScore || 0
        // TODO: track previous month score for delta — for now use 0
        const scoreDelta = 0

        const topAction = pendingActions[0]?.title || ''

        await fetch(`${baseUrl}/api/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': supabaseKey
          },
          body: JSON.stringify({
            to: user.email,
            template: 'monthly_digest',
            data: {
              name: user.name || user.email.split('@')[0],
              orgName: org.name,
              score,
              scoreDelta,
              doneCount: doneActions.length,
              pendingCount: pendingActions.length,
              docsCount: docsCount || 0,
              topAction
            }
          })
        })

        results.push({ org: org.name, email: user.email, status: 'sent' })
      } catch (orgErr: any) {
        results.push({ org_id: sub.org_id, status: 'error', error: orgErr.message })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[MonthlyDigest] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

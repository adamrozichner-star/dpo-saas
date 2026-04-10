import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAndCreateNotificationsForOrg } from '@/lib/notifications-trigger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const now = new Date()
  const results = { orgs: 0, notifications: 0, errors: [] as string[] }

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id')

    if (error || !orgs) {
      console.error('Cron orgs fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch orgs', details: error?.message }, { status: 500 })
    }

    for (const org of orgs) {
      results.orgs++
      try {
        await checkAndCreateNotificationsForOrg(org.id, supabase)
        results.notifications++
      } catch (e: any) {
        results.errors.push(`org ${org.id}: ${e.message}`)
      }
    }

    // Quarterly reminder (1st of quarter) — cron-only
    const month = now.getMonth() + 1
    const day = now.getDate()
    if (day === 1 && [1, 4, 7, 10].includes(month)) {
      for (const org of orgs) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('org_id', org.id)
          .eq('type', 'compliance:info')
          .eq('title', 'סקירת ציות רבעונית מומלצת')
          .limit(1)
          .maybeSingle()

        if (!existing) {
          await supabase.from('notifications').insert({
            org_id: org.id, type: 'compliance:info',
            title: 'סקירת ציות רבעונית מומלצת',
            body: 'תחילת רבעון חדש — זה הזמן לסקור את מצב הציות שלכם.',
            link: '/dashboard?tab=compliance',
          })
        }
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Check notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

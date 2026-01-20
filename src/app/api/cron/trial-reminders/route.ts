import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Cron job to send trial ending reminders
// Runs daily - sends reminders at 3 days, 1 day, and 0 days before trial ends

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-saas.vercel.app'

  try {
    const now = new Date()
    const results = { processed: 0, sent: 0, errors: [] as string[] }

    // Check for trials ending in 3 days, 1 day, or today
    const reminderDays = [3, 1, 0]

    for (const daysLeft of reminderDays) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysLeft)
      const dateStr = targetDate.toISOString().split('T')[0]

      // Find organizations with trial ending on target date
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, trial_ends_at, users(id, email, full_name)')
        .eq('subscription_status', 'trial')
        .gte('trial_ends_at', `${dateStr}T00:00:00`)
        .lt('trial_ends_at', `${dateStr}T23:59:59`)

      if (error) {
        console.error('Error fetching orgs:', error)
        continue
      }

      for (const org of orgs || []) {
        results.processed++

        const user = Array.isArray(org.users) ? org.users[0] : org.users
        if (!user?.email) continue

        // Send email via our email API
        try {
          const response = await fetch(`${APP_URL}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template: 'trial_ending',
              to: user.email,
              data: {
                userName: user.full_name || 'לקוח יקר',
                orgName: org.name,
                daysLeft: daysLeft,
                trialEndDate: new Date(org.trial_ends_at).toLocaleDateString('he-IL')
              }
            })
          })

          if (response.ok) {
            results.sent++
            console.log(`✓ Sent trial reminder to ${user.email} (${daysLeft} days left)`)
          } else {
            results.errors.push(`Failed for ${user.email}`)
          }
        } catch (err: any) {
          results.errors.push(`Error for ${user.email}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({ success: true, ...results })

  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

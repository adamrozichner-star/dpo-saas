import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Schedule: Run on the 1st of every month

export async function GET(request: NextRequest) {
  // Verify cron secret
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

  try {
    // Get all active subscriptions with tokens
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*, organizations(*)')
      .eq('status', 'active')
      .not('token', 'is', null)

    if (error) throw error

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each subscription
    for (const subscription of subscriptions || []) {
      results.processed++

      try {
        // Charge the token
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tranzila`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'charge_token',
            orgId: subscription.org_id,
            subscriptionId: subscription.id
          })
        })

        const result = await response.json()

        if (result.success) {
          results.successful++
          console.log(`✓ Charged subscription ${subscription.id} for org ${subscription.org_id}`)
        } else {
          results.failed++
          results.errors.push(`Subscription ${subscription.id}: ${result.error}`)
          console.error(`✗ Failed to charge subscription ${subscription.id}:`, result.error)

          // Mark subscription as past_due after 3 failed attempts
          // (You'd need to track failed_attempts in the database)
        }
      } catch (err: any) {
        results.failed++
        results.errors.push(`Subscription ${subscription.id}: ${err.message}`)
        console.error(`✗ Error processing subscription ${subscription.id}:`, err.message)
      }
    }

    // Log results
    await supabase.from('audit_logs').insert({
      action: 'recurring_billing_run',
      actor_type: 'system',
      details: results,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error('Recurring billing error:', error.message)
    return NextResponse.json({ 
      error: 'Billing process failed',
      message: error.message 
    }, { status: 500 })
  }
}

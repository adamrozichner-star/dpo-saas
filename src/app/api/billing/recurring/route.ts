import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chargeToken } from '@/lib/cardcom'

export const dynamic = 'force-dynamic'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Schedule: Run daily to process subscriptions expiring that day

const PLANS = {
  basic: { monthly: 500, name: 'חבילה בסיסית' },
  extended: { monthly: 1200, name: 'חבילה מורחבת' },
  enterprise: { monthly: 3500, name: 'חבילה ארגונית' },
}

export async function GET(request: NextRequest) {
  // Verify cron secret — fail closed if not set
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

  try {
    // Get organizations with active monthly subscriptions expiring today
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('subscription_status', 'active')
      .not('payment_token', 'is', null)
      .lte('subscription_end_date', `${todayStr}T23:59:59Z`)

    if (error) throw error

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each organization
    for (const org of organizations || []) {
      results.processed++

      // Skip annual subscriptions (they don't auto-renew via token)
      if (!org.tier || !PLANS[org.tier as keyof typeof PLANS]) {
        results.skipped++
        continue
      }

      const plan = PLANS[org.tier as keyof typeof PLANS]
      const amount = plan.monthly

      try {
        // Get user associated with this org
        const { data: orgUser } = await supabase
          .from('users')
          .select('auth_user_id, email')
          .eq('org_id', org.id)
          .limit(1)
          .single()
        
        const userEmail = orgUser?.email
        const userId = orgUser?.auth_user_id

        // Charge the saved token via Cardcom
        const chargeResult = await chargeToken({
          token: org.payment_token,
          tokenExpiry: org.payment_token_expiry || '', // MMYY format
          amount,
          productName: `MyDPO - ${plan.name} (חודשי)`,
          customerEmail: userEmail,
        })

        if (chargeResult.success) {
          // Extend subscription by 1 month
          const newEndDate = new Date(org.subscription_end_date)
          newEndDate.setMonth(newEndDate.getMonth() + 1)

          await supabase
            .from('organizations')
            .update({
              subscription_end_date: newEndDate.toISOString(),
              last_payment_date: new Date().toISOString(),
              last_payment_amount: amount,
              failed_payment_attempts: 0,
            })
            .eq('id', org.id)

          // Log successful payment
          await supabase.from('payment_transactions').insert({
            id: `recurring_${org.id}_${Date.now()}`,
            org_id: org.id,
            user_id: userId,
            amount,
            plan: org.tier,
            is_annual: false,
            status: 'completed',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })

          results.successful++
          console.log(`✓ Recurring charge successful: org=${org.id}, amount=${amount}`)

          // Send receipt email
          if (userEmail) {
            try {
              await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userEmail,
                  template: 'payment_success',
                  data: {
                    userName: org.name,
                    plan: org.tier,
                    amount,
                    isAnnual: false,
                    isRecurring: true,
                  },
                }),
              })
            } catch (e) {
              console.error('Failed to send receipt email:', e)
            }
          }

        } else {
          // Payment failed
          const failedAttempts = (org.failed_payment_attempts || 0) + 1
          
          await supabase
            .from('organizations')
            .update({
              failed_payment_attempts: failedAttempts,
              // Mark as past_due after 3 failed attempts
              ...(failedAttempts >= 3 && { subscription_status: 'past_due' }),
            })
            .eq('id', org.id)

          // Log failed payment
          await supabase.from('payment_transactions').insert({
            id: `recurring_${org.id}_${Date.now()}`,
            org_id: org.id,
            user_id: userId,
            amount,
            plan: org.tier,
            is_annual: false,
            status: 'failed',
            error_text: chargeResult.error,
            created_at: new Date().toISOString(),
          })

          results.failed++
          results.errors.push(`Org ${org.id}: ${chargeResult.error}`)
          console.error(`✗ Recurring charge failed: org=${org.id}, error=${chargeResult.error}`)
        }
      } catch (err: any) {
        results.failed++
        results.errors.push(`Org ${org.id}: ${err.message}`)
        console.error(`✗ Error processing org ${org.id}:`, err.message)
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

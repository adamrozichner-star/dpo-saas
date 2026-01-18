import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature')

    // Verify webhook signature (optional but recommended)
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(rawBody).digest('hex')
      
      if (digest !== signature) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name
    const customData = payload.meta?.custom_data || {}

    console.log('LemonSqueezy webhook:', eventName)

    switch (eventName) {
      case 'subscription_created': {
        const { org_id, user_id, tier } = customData
        const subscription = payload.data?.attributes

        if (org_id) {
          // Create subscription record
          await supabase.from('subscriptions').insert({
            org_id,
            tier: tier || 'basic',
            amount: subscription?.first_subscription_item?.price || 0,
            currency: 'ILS',
            status: 'active',
            lemonsqueezy_subscription_id: payload.data?.id,
            lemonsqueezy_customer_id: subscription?.customer_id,
            current_period_end: subscription?.renews_at,
            created_at: new Date().toISOString()
          })

          // Update organization
          await supabase
            .from('organizations')
            .update({
              tier: tier || 'basic',
              subscription_status: 'active'
            })
            .eq('id', org_id)
        }
        break
      }

      case 'subscription_updated': {
        const subscription = payload.data?.attributes
        const subscriptionId = payload.data?.id

        await supabase
          .from('subscriptions')
          .update({
            status: subscription?.status,
            current_period_end: subscription?.renews_at,
            updated_at: new Date().toISOString()
          })
          .eq('lemonsqueezy_subscription_id', subscriptionId)
        break
      }

      case 'subscription_cancelled': {
        const subscriptionId = payload.data?.id

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('org_id')
          .eq('lemonsqueezy_subscription_id', subscriptionId)
          .single()

        if (sub?.org_id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            })
            .eq('lemonsqueezy_subscription_id', subscriptionId)

          await supabase
            .from('organizations')
            .update({ subscription_status: 'cancelled' })
            .eq('id', sub.org_id)
        }
        break
      }

      case 'subscription_payment_success': {
        const customData = payload.meta?.custom_data || {}
        const subscription = payload.data?.attributes

        // Log successful payment
        await supabase.from('payment_logs').insert({
          org_id: customData.org_id,
          amount: subscription?.total || 0,
          currency: 'ILS',
          status: 'success',
          lemonsqueezy_response: payload,
          created_at: new Date().toISOString()
        })
        break
      }

      case 'subscription_payment_failed': {
        const customData = payload.meta?.custom_data || {}

        // Log failed payment
        await supabase.from('payment_logs').insert({
          org_id: customData.org_id,
          amount: 0,
          currency: 'ILS',
          status: 'failed',
          lemonsqueezy_response: payload,
          error_message: 'Payment failed',
          created_at: new Date().toISOString()
        })
        break
      }

      default:
        console.log('Unhandled webhook event:', eventName)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

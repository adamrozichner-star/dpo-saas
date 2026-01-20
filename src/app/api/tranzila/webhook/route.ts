import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Handle Tranzila payment notifications (webhook)
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Parse form data from Tranzila
    const formData = await request.formData()
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('Tranzila webhook received:', data)

    const response = data.Response
    const confirmationCode = data.ConfirmationCode
    const token = data.TranzilaTK
    const tokenExpiry = data.expdate
    const index = data.index
    
    // Parse custom data
    let purchaseData: any = {}
    try {
      if (data.json_purchase_data) {
        purchaseData = JSON.parse(data.json_purchase_data)
      }
    } catch (e) {
      console.error('Error parsing purchase data:', e)
    }

    const { org_id, user_id, tier, subscription_id } = purchaseData

    if (response === '000') {
      // Payment successful!
      
      // Update subscription with token for recurring billing
      if (subscription_id) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            token: token,
            token_expiry: tokenExpiry,
            transaction_index: index,
            billing_cycle_start: new Date().toISOString(),
            last_payment_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription_id)
      }

      // Record payment
      await supabase.from('payments').insert({
        org_id,
        subscription_id,
        amount: parseFloat(data.sum) || 0,
        currency: 'ILS',
        status: 'completed',
        gateway_ref: confirmationCode,
        type: 'subscription',
        metadata: {
          card_last4: data.ccno?.slice(-4),
          card_type: data.cardtype,
          index
        },
        created_at: new Date().toISOString()
      })

      // Update organization status
      if (org_id) {
        await supabase
          .from('organizations')
          .update({
            subscription_status: 'active',
            tier,
            updated_at: new Date().toISOString()
          })
          .eq('id', org_id)
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        org_id,
        action: 'subscription_activated',
        entity_type: 'subscription',
        entity_id: subscription_id,
        actor_type: 'system',
        details: {
          tier,
          confirmation_code: confirmationCode,
          amount: data.sum
        },
        created_at: new Date().toISOString()
      })

      console.log('Payment successful for org:', org_id)
      
    } else {
      // Payment failed
      if (subscription_id) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription_id)
      }

      // Record failed payment
      await supabase.from('payments').insert({
        org_id,
        subscription_id,
        amount: parseFloat(data.sum) || 0,
        currency: 'ILS',
        status: 'failed',
        gateway_ref: response,
        type: 'subscription',
        metadata: {
          error_code: response
        },
        created_at: new Date().toISOString()
      })

      console.log('Payment failed for org:', org_id, 'Response:', response)
    }

    // Return success to Tranzila
    return new NextResponse('OK', { status: 200 })

  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new NextResponse('Error', { status: 500 })
  }
}

// Also handle GET for Tranzila redirect
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const response = searchParams.get('Response')
  
  if (response === '000') {
    return NextResponse.redirect(new URL('/dashboard?payment=success', request.url))
  }
  return NextResponse.redirect(new URL('/subscribe?payment=failed', request.url))
}

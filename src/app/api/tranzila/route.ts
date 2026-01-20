import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Tranzila API endpoints
const TRANZILA_API = 'https://secure5.tranzila.com'

// Plan configurations
const PLANS = {
  basic: {
    name: 'חבילה בסיסית',
    price: 500,
    currency: 1, // 1 = ILS
    description: 'DPO ממונה + מערכת ניהול פרטיות'
  },
  extended: {
    name: 'חבילה מורחבת',
    price: 1200,
    currency: 1,
    description: 'חבילה בסיסית + ליווי מורחב וזמינות DPO'
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const tranzilaTerminal = process.env.TRANZILA_TERMINAL
    const tranzilaPwd = process.env.TRANZILA_API_PASSWORD

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { action } = body

    // =========================================
    // Create iFrame checkout URL
    // =========================================
    if (action === 'create_checkout') {
      const { orgId, userId, userEmail, tier } = body

      if (!tranzilaTerminal) {
        return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
      }

      const plan = PLANS[tier as keyof typeof PLANS]
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      // Create pending subscription record
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          org_id: orgId,
          tier,
          monthly_price: plan.price,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (subError) {
        console.error('Subscription creation error:', subError)
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }

      // Build Tranzila iFrame URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-saas.vercel.app'
      
      const params = new URLSearchParams({
        supplier: tranzilaTerminal,
        sum: plan.price.toString(),
        currency: plan.currency.toString(),
        cred_type: '1', // Regular transaction
        tranmode: 'A', // Authorize + Token
        trButtonColor: '3b82f6',
        trTextColor: 'ffffff',
        trBgColor: 'ffffff',
        lang: 'il',
        contact: userEmail || '',
        email: userEmail || '',
        pdesc: plan.name,
        // Custom fields for webhook
        json_purchase_data: JSON.stringify({
          org_id: orgId,
          user_id: userId,
          tier,
          subscription_id: subscription.id
        }),
        // Redirect URLs
        notify_url_address: `${appUrl}/api/tranzila/webhook`,
        success_url_address: `${appUrl}/dashboard?payment=success&tier=${tier}`,
        fail_url_address: `${appUrl}/subscribe?payment=failed`,
      })

      const checkoutUrl = `${TRANZILA_API}/${tranzilaTerminal}/iframenew.php?${params.toString()}`

      return NextResponse.json({
        success: true,
        checkoutUrl,
        subscriptionId: subscription.id
      })
    }

    // =========================================
    // Charge saved token (for recurring billing)
    // =========================================
    if (action === 'charge_token') {
      const { orgId, subscriptionId } = body

      if (!tranzilaTerminal || !tranzilaPwd) {
        return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
      }

      // Get subscription and token
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, organizations(*)')
        .eq('id', subscriptionId)
        .single()

      if (!subscription || !subscription.token) {
        return NextResponse.json({ error: 'No payment token found' }, { status: 400 })
      }

      const plan = PLANS[subscription.tier as keyof typeof PLANS]

      // Charge using token
      const params = new URLSearchParams({
        supplier: tranzilaTerminal,
        TranzilaPW: tranzilaPwd,
        sum: plan.price.toString(),
        currency: plan.currency.toString(),
        TranzilaTK: subscription.token,
        expdate: subscription.token_expiry || '',
        cred_type: '1',
        tranmode: 'A',
        pdesc: `${plan.name} - חיוב חודשי`,
      })

      const response = await fetch(`${TRANZILA_API}/cgi-bin/tranzila71u.cgi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })

      const result = await response.text()
      const resultParams = new URLSearchParams(result)
      const responseCode = resultParams.get('Response')

      if (responseCode === '000') {
        // Payment successful
        const confirmationCode = resultParams.get('ConfirmationCode')
        
        // Record payment
        await supabase.from('payments').insert({
          org_id: orgId,
          subscription_id: subscriptionId,
          amount: plan.price,
          currency: 'ILS',
          status: 'completed',
          gateway_ref: confirmationCode,
          type: 'recurring',
          created_at: new Date().toISOString()
        })

        // Update subscription billing cycle
        await supabase
          .from('subscriptions')
          .update({
            billing_cycle_start: new Date().toISOString(),
            last_payment_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', subscriptionId)

        return NextResponse.json({
          success: true,
          confirmationCode
        })
      } else {
        // Payment failed
        const errorMessage = getTranszilaError(responseCode || '')
        
        await supabase.from('payments').insert({
          org_id: orgId,
          subscription_id: subscriptionId,
          amount: plan.price,
          currency: 'ILS',
          status: 'failed',
          gateway_ref: responseCode,
          type: 'recurring',
          metadata: { error: errorMessage },
          created_at: new Date().toISOString()
        })

        return NextResponse.json({
          success: false,
          error: errorMessage
        })
      }
    }

    // =========================================
    // Get subscription status
    // =========================================
    if (action === 'get_subscription') {
      const { orgId } = body

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .single()

      return NextResponse.json({
        hasSubscription: !!subscription,
        subscription
      })
    }

    // =========================================
    // Cancel subscription
    // =========================================
    if (action === 'cancel_subscription') {
      const { subscriptionId, reason } = body

      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', subscriptionId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Payment error:', error.message)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}

// Tranzila error codes
function getTranszilaError(code: string): string {
  const errors: Record<string, string> = {
    '000': 'העסקה אושרה',
    '001': 'כרטיס חסום',
    '002': 'כרטיס גנוב',
    '003': 'התקשר לחברת האשראי',
    '004': 'סירוב',
    '005': 'כרטיס מזויף',
    '006': 'CVV שגוי',
    '007': 'יש להתקשר לחברת האשראי',
    '008': 'שגיאה בבניית מספר תעודה',
    '009': 'תקלת תקשורת',
    '010': 'עסקה לא אושרה',
    '011': 'תוקף כרטיס לא תקין',
    '012': 'תוקף כרטיס פג',
    '014': 'כרטיס לא קיים',
    '015': 'אין הרשאה לסוג עסקה',
    '017': 'לקוח ביטל את העסקה',
    '033': 'מספר כרטיס לא תקין',
    '036': 'פג תוקף הכרטיס',
    '039': 'מספר כרטיס לא קיים',
    '041': 'כרטיס אבוד',
    '043': 'כרטיס גנוב',
    '051': 'חסר מסגרת אשראי',
    '055': 'מספר CVV לא תקין',
    '057': 'עסקה לא מותרת לכרטיס זה',
    '058': 'עסקה לא מותרת למסוף זה',
    '061': 'חריגה מתקרת משיכה',
    '062': 'כרטיס מוגבל',
    '063': 'כרטיס לא עובר בדיקות אבטחה',
    '065': 'חריגה ממכסת הניסיונות',
    '067': 'יש להתקשר לחברת האשראי',
  }
  return errors[code] || `שגיאת תשלום (קוד: ${code})`
}

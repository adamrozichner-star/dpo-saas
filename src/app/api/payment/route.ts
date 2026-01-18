import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const lemonApiKey = process.env.LEMONSQUEEZY_API_KEY
    const storeId = process.env.LEMONSQUEEZY_STORE_ID

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { action, orgId, userId, userEmail, tier, variantId } = await request.json()

    if (action === 'create_checkout') {
      if (!lemonApiKey || !storeId) {
        return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
      }

      // Get variant ID based on tier (you'll set these in LemonSqueezy dashboard)
      const variantIds: Record<string, string> = {
        basic: process.env.LEMONSQUEEZY_BASIC_VARIANT_ID || '',
        extended: process.env.LEMONSQUEEZY_EXTENDED_VARIANT_ID || ''
      }

      const selectedVariantId = variantId || variantIds[tier]
      
      if (!selectedVariantId) {
        return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
      }

      // Create checkout session
      const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lemonApiKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: userEmail,
                custom: {
                  org_id: orgId,
                  user_id: userId,
                  tier: tier
                }
              },
              checkout_options: {
                embed: false,
                media: false,
                button_color: '#3b82f6'
              },
              product_options: {
                redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dpo-saas.vercel.app'}/dashboard?payment=success`,
                receipt_button_text: 'חזרה ללוח הבקרה',
                receipt_thank_you_note: 'תודה שהצטרפת ל-DPO-Pro!'
              }
            },
            relationships: {
              store: {
                data: {
                  type: 'stores',
                  id: storeId
                }
              },
              variant: {
                data: {
                  type: 'variants',
                  id: selectedVariantId
                }
              }
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('LemonSqueezy error:', data)
        return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
      }

      const checkoutUrl = data.data?.attributes?.url

      return NextResponse.json({ 
        success: true, 
        checkoutUrl 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Payment error:', error.message)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}

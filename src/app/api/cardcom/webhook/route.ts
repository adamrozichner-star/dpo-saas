// src/app/api/cardcom/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayment } from '@/lib/cardcom';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Plan to subscription details mapping
const PLAN_DETAILS: Record<string, { monthly_price: number; dpo_minutes_quota: number }> = {
  basic: { monthly_price: 500, dpo_minutes_quota: 0 },
  extended: { monthly_price: 1200, dpo_minutes_quota: 30 },
  enterprise: { monthly_price: 3500, dpo_minutes_quota: 120 },
};

// Cardcom sends indicator via GET request
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Cardcom indicator parameters
  const lowProfileCode = searchParams.get('lowprofilecode');
  const operation = searchParams.get('Operation');
  const terminalNumber = searchParams.get('terminalnumber');
  const responseCode = searchParams.get('ResponseCode');
  const returnValue = searchParams.get('ReturnValue');

  console.log('[Cardcom Webhook] Received:', {
    lowProfileCode,
    operation,
    terminalNumber,
    responseCode,
    returnValue,
  });

  if (!lowProfileCode) {
    console.error('[Cardcom Webhook] Missing lowprofilecode');
    return NextResponse.json({ error: 'Missing lowprofilecode' }, { status: 400 });
  }

  try {
    // Parse custom fields if present
    let customData: any = {};
    if (returnValue) {
      try {
        customData = JSON.parse(decodeURIComponent(returnValue));
      } catch (e) {
        try {
          customData = JSON.parse(returnValue);
        } catch (e2) {
          console.warn('[Cardcom Webhook] Failed to parse ReturnValue:', e2);
        }
      }
    }

    // Verify payment with Cardcom API
    const verification = await verifyPayment(lowProfileCode);
    
    console.log('[Cardcom Webhook] Verification result:', {
      success: verification.success,
      dealResponse: verification.dealResponse,
      token: verification.token ? '***' : 'none',
      error: verification.error,
    });

    const supabase = getSupabase();

    // Find the pending payment - try multiple strategies
    let payment: any = null;

    // Strategy 1: Find by lowprofile_code
    const result1 = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('lowprofile_code', lowProfileCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (result1.data) {
      payment = result1.data;
      console.log('[Cardcom Webhook] Found payment by lowprofile_code:', payment.id);
    }

    // Strategy 2: Find by transaction ID from ReturnValue
    if (!payment && customData?.transactionId) {
      const result2 = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', customData.transactionId)
        .maybeSingle();

      if (result2.data) {
        payment = result2.data;
        console.log('[Cardcom Webhook] Found payment by transactionId:', payment.id);
        
        // Backfill lowprofile_code
        await supabase
          .from('payment_transactions')
          .update({ lowprofile_code: lowProfileCode })
          .eq('id', payment.id);
      }
    }

    // Strategy 3: Find most recent pending for this org
    if (!payment && customData?.orgId) {
      const result3 = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('org_id', customData.orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (result3.data) {
        payment = result3.data;
        console.log('[Cardcom Webhook] Found payment by orgId fallback:', payment.id);
        
        // Backfill lowprofile_code
        await supabase
          .from('payment_transactions')
          .update({ lowprofile_code: lowProfileCode })
          .eq('id', payment.id);
      }
    }

    if (!payment) {
      console.error('[Cardcom Webhook] Payment not found for lowprofile:', lowProfileCode, 'customData:', customData);
      // Still return 200 to Cardcom so it doesn't retry
      return NextResponse.json({ 
        success: false, 
        error: 'Payment not found',
        received: true,
      });
    }

    // Already processed?
    if (payment.status === 'completed') {
      console.log('[Cardcom Webhook] Payment already processed:', payment.id);
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed',
        received: true,
      });
    }

    if (verification.success) {
      // ===== PAYMENT SUCCESS =====

      // 1. Update payment_transactions record
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          lowprofile_code: lowProfileCode,
          cardcom_transaction_id: verification.transactionId || null,
          cardcom_approval_number: verification.approvalNumber || null,
          card_token: verification.token || null,
          card_mask: verification.cardMask || null,
          card_expiry: verification.cardExpiry || null,
          card_brand: verification.cardBrand || null,
          invoice_number: verification.invoiceNumber || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // 2. Calculate subscription dates
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (payment.is_annual) {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      // Map plan to DB tier (enum only supports 'basic' | 'extended')
      const dbTier = payment.plan === 'enterprise' ? 'extended' : payment.plan;

      // 3. Update organization
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          tier: dbTier,
          status: 'active',
          subscription_start_date: now.toISOString(),
          subscription_end_date: subscriptionEnd.toISOString(),
          last_payment_date: now.toISOString(),
          last_payment_amount: payment.amount,
          payment_token: verification.token || null,
          payment_card_mask: verification.cardMask || null,
        })
        .eq('id', payment.org_id);

      // 4. CRITICAL: Create/update subscriptions record
      //    The subscription gate hook checks THIS table
      const planDetails = PLAN_DETAILS[payment.plan] || PLAN_DETAILS.basic;
      
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('org_id', payment.org_id)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            tier: dbTier,
            monthly_price: planDetails.monthly_price,
            dpo_minutes_quota: planDetails.dpo_minutes_quota,
            dpo_minutes_used: 0,
            billing_cycle_start: now.toISOString().split('T')[0],
            status: 'active',
            updated_at: now.toISOString(),
          })
          .eq('id', existingSub.id);
        
        console.log('[Cardcom Webhook] Updated existing subscription:', existingSub.id);
      } else {
        const { error: subInsertError } = await supabase
          .from('subscriptions')
          .insert({
            org_id: payment.org_id,
            tier: dbTier,
            monthly_price: planDetails.monthly_price,
            dpo_minutes_quota: planDetails.dpo_minutes_quota,
            dpo_minutes_used: 0,
            billing_cycle_start: now.toISOString().split('T')[0],
            status: 'active',
          });
        
        if (subInsertError) {
          console.error('[Cardcom Webhook] Failed to create subscription record:', subInsertError);
        } else {
          console.log('[Cardcom Webhook] Created new subscription record for org:', payment.org_id);
        }
      }

      // 5. Send confirmation email (non-blocking)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
        
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', payment.org_id)
          .single();
        
        const { data: userData } = await supabase.auth.admin.getUserById(payment.user_id);
        const userEmail = userData?.user?.email;

        if (userEmail) {
          await fetch(`${baseUrl}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userEmail,
              template: 'payment_success',
              data: {
                userName: org?.name || userEmail.split('@')[0],
                plan: payment.plan,
                amount: payment.amount,
                isAnnual: payment.is_annual,
                transactionId: verification.transactionId,
              },
            }),
          });
        }
      } catch (emailError) {
        console.error('[Cardcom Webhook] Failed to send confirmation email:', emailError);
      }

      console.log(`[Cardcom Webhook] Payment successful: org=${payment.org_id}, plan=${payment.plan}, amount=${payment.amount}`);
      
      return NextResponse.json({ 
        success: true, 
        received: true,
        transactionId: payment.id,
        status: 'completed',
      });

    } else {
      // ===== PAYMENT FAILED =====
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          lowprofile_code: lowProfileCode,
          error_message: verification.error || null,
          cardcom_response: verification.dealResponse || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      console.log(`[Cardcom Webhook] Payment failed: ${verification.error}`);
      
      return NextResponse.json({ 
        success: false, 
        received: true,
        error: verification.error,
      });
    }

  } catch (error) {
    console.error('[Cardcom Webhook] Processing error:', error);
    // Always return 200 to prevent Cardcom from retrying
    return NextResponse.json({ 
      success: false, 
      received: true,
      error: 'Internal error',
    });
  }
}

// Also handle POST if Cardcom sends it that way
export async function POST(request: NextRequest) {
  return GET(request);
}

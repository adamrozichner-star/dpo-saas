// src/app/api/cardcom/webhook/route.ts
// Cardcom v11 webhook handler
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

const PLAN_DETAILS: Record<string, { monthly_price: number; dpo_minutes_quota: number }> = {
  basic: { monthly_price: 500, dpo_minutes_quota: 0 },
  extended: { monthly_price: 1200, dpo_minutes_quota: 30 },
  enterprise: { monthly_price: 3500, dpo_minutes_quota: 120 },
};

// Handle both GET and POST — Cardcom v11 sends webhook as POST with JSON,
// but also supports GET with query params for legacy compatibility.
export async function POST(request: NextRequest) {
  let lowProfileId: string | null = null;
  let returnValue: string | null = null;

  // Try to parse JSON body first (v11 format)
  try {
    const body = await request.json();
    lowProfileId = body.LowProfileId || body.lowprofilecode || null;
    returnValue = body.ReturnValue || null;
    console.log('[Webhook] Received POST JSON:', { lowProfileId, returnValue, keys: Object.keys(body) });
  } catch {
    // Not JSON — try query params (legacy/fallback)
    const sp = request.nextUrl.searchParams;
    lowProfileId = sp.get('lowprofilecode') || sp.get('LowProfileId');
    returnValue = sp.get('ReturnValue');
    console.log('[Webhook] Received POST form/query:', { lowProfileId, returnValue });
  }

  return handleWebhook(lowProfileId, returnValue);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lowProfileId = sp.get('lowprofilecode') || sp.get('LowProfileId');
  const returnValue = sp.get('ReturnValue');
  console.log('[Webhook] Received GET:', { lowProfileId, returnValue });
  return handleWebhook(lowProfileId, returnValue);
}

async function handleWebhook(lowProfileId: string | null, returnValue: string | null) {
  if (!lowProfileId) {
    console.error('[Webhook] Missing LowProfileId');
    return NextResponse.json({ error: 'Missing LowProfileId', received: true }, { status: 400 });
  }

  try {
    // Verify payment with Cardcom v11 API
    const verification = await verifyPayment(lowProfileId);

    console.log('[Webhook] Verification:', {
      success: verification.success,
      txnId: verification.transactionId,
      token: verification.token ? '***' : 'none',
      returnValue: verification.returnValue,
      error: verification.error,
    });

    const supabase = getSupabase();

    // Find the pending payment transaction
    // The ReturnValue we sent is the txnId
    const txnId = verification.returnValue || returnValue;
    let payment: any = null;

    // Strategy 1: Find by txnId (ReturnValue)
    if (txnId) {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', txnId)
        .maybeSingle();
      if (data) {
        payment = data;
        console.log('[Webhook] Found payment by txnId:', payment.id);
      }
    }

    // Strategy 2: Find by lowprofile_code
    if (!payment) {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('lowprofile_code', lowProfileId)
        .eq('status', 'pending')
        .maybeSingle();
      if (data) {
        payment = data;
        console.log('[Webhook] Found payment by lowprofile_code:', payment.id);
      }
    }

    // Strategy 3: Most recent pending
    if (!payment) {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        payment = data;
        console.log('[Webhook] Found payment by recency fallback:', payment.id);
      }
    }

    if (!payment) {
      console.error('[Webhook] No payment found for:', { lowProfileId, txnId });
      return NextResponse.json({ success: false, error: 'Payment not found', received: true });
    }

    // Already processed?
    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Already processed', received: true });
    }

    if (verification.success) {
      // ===== PAYMENT SUCCESS =====
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (payment.is_annual) {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      const dbTier = payment.plan === 'enterprise' ? 'extended' : payment.plan;

      // 1. Update payment record
      await supabase.from('payment_transactions').update({
        status: 'completed',
        lowprofile_code: lowProfileId,
        cardcom_transaction_id: verification.transactionId?.toString() || null,
        cardcom_approval_number: verification.approvalNumber || null,
        card_token: verification.token || null,
        card_mask: verification.cardMask || null,
        card_expiry: verification.tokenExpiry || null,
        card_brand: verification.cardBrand || null,
        invoice_number: verification.invoiceNumber?.toString() || null,
        completed_at: now.toISOString(),
      }).eq('id', payment.id);

      // 2. Update organization
      await supabase.from('organizations').update({
        subscription_status: 'active',
        tier: dbTier,
        status: 'active',
        subscription_start_date: now.toISOString(),
        subscription_end_date: subscriptionEnd.toISOString(),
        last_payment_date: now.toISOString(),
        last_payment_amount: payment.amount,
        payment_token: verification.token || null,
        payment_card_mask: verification.cardMask || null,
      }).eq('id', payment.org_id);

      // 3. Create/update subscriptions record (for subscription gate)
      const planDetails = PLAN_DETAILS[payment.plan] || PLAN_DETAILS.basic;
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('org_id', payment.org_id)
        .maybeSingle();

      if (existingSub) {
        await supabase.from('subscriptions').update({
          tier: dbTier,
          monthly_price: planDetails.monthly_price,
          dpo_minutes_quota: planDetails.dpo_minutes_quota,
          dpo_minutes_used: 0,
          billing_cycle_start: now.toISOString().split('T')[0],
          status: 'active',
        }).eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          org_id: payment.org_id,
          tier: dbTier,
          monthly_price: planDetails.monthly_price,
          dpo_minutes_quota: planDetails.dpo_minutes_quota,
          dpo_minutes_used: 0,
          billing_cycle_start: now.toISOString().split('T')[0],
          status: 'active',
        });
      }

      // 4. Send confirmation email (non-blocking)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
        const { data: org } = await supabase.from('organizations').select('name').eq('id', payment.org_id).single();
        const { data: userData } = await supabase.auth.admin.getUserById(payment.user_id);
        const email = userData?.user?.email;
        if (email) {
          await fetch(`${baseUrl}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              template: 'payment_success',
              data: { userName: org?.name || email.split('@')[0], plan: payment.plan, amount: payment.amount },
            }),
          });
        }
      } catch (e) {
        console.error('[Webhook] Email error:', e);
      }

      console.log(`[Webhook] ✅ Payment success: org=${payment.org_id}, plan=${payment.plan}, amount=${payment.amount}`);
      return NextResponse.json({ success: true, received: true, status: 'completed' });

    } else {
      // ===== PAYMENT FAILED =====
      await supabase.from('payment_transactions').update({
        status: 'failed',
        lowprofile_code: lowProfileId,
        error_message: verification.error || null,
        cardcom_response: verification.responseCode?.toString() || null,
        completed_at: new Date().toISOString(),
      }).eq('id', payment.id);

      console.log(`[Webhook] ❌ Payment failed: ${verification.error}`);
      return NextResponse.json({ success: false, received: true, error: verification.error });
    }

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ success: false, received: true, error: 'Internal error' });
  }
}

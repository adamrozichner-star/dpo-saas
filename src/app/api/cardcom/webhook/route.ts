// src/app/api/cardcom/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayment } from '@/lib/cardcom';

export const dynamic = 'force-dynamic';

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
        customData = JSON.parse(returnValue);
      } catch (e) {
        console.warn('[Cardcom Webhook] Failed to parse ReturnValue:', e);
      }
    }

    // Verify payment with Cardcom API
    const verification = await verifyPayment(lowProfileCode);
    
    console.log('[Cardcom Webhook] Verification result:', verification);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the pending payment by lowprofile_code
    const { data: payment, error: findError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('lowprofile_code', lowProfileCode)
      .single();

    if (findError || !payment) {
      console.error('[Cardcom Webhook] Payment not found:', lowProfileCode);
      // Still return 200 to Cardcom
      return NextResponse.json({ 
        success: false, 
        error: 'Payment not found',
        received: true,
      });
    }

    // Already processed?
    if (payment.status === 'completed') {
      console.log('[Cardcom Webhook] Payment already processed:', lowProfileCode);
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed',
        received: true,
      });
    }

    if (verification.success) {
      // Update payment record with success
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          cardcom_transaction_id: verification.transactionId,
          cardcom_approval_number: verification.approvalNumber,
          card_token: verification.token,
          card_mask: verification.cardMask,
          card_expiry: verification.cardExpiry,
          card_brand: verification.cardBrand,
          invoice_number: verification.invoiceNumber,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Calculate subscription dates
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (payment.is_annual) {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      // Update organization subscription status
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          tier: payment.plan,
          subscription_start_date: now.toISOString(),
          subscription_end_date: subscriptionEnd.toISOString(),
          last_payment_date: now.toISOString(),
          last_payment_amount: payment.amount,
          // Store token for recurring billing
          payment_token: verification.token,
          payment_card_mask: verification.cardMask,
        })
        .eq('id', payment.org_id);

      // Send confirmation email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
        
        // Get org name
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', payment.org_id)
          .single();
        
        // Get user email from auth
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
      // Payment failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          error_message: verification.error,
          cardcom_response: verification.dealResponse,
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

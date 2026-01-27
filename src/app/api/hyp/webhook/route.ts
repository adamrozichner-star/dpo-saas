import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// HYP sends POST requests to this webhook after payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('HYP Webhook received:', JSON.stringify(body, null, 2));

    // HYP webhook payload structure
    const {
      Id,           // HYP transaction ID
      Status,       // Payment status: 0 = success, other = failed
      StatusText,   // Status description  
      Sum,          // Amount paid
      PageField,    // Our custom data (JSON string)
      Payments,     // Number of payments
      Email,
      FullName,
      Phone,
      ErrorCode,
      ErrorText,
    } = body;

    // Parse our custom data
    let customData: any = {};
    try {
      customData = typeof PageField === 'string' ? JSON.parse(PageField) : PageField || {};
    } catch (e) {
      console.error('Failed to parse PageField:', e);
    }

    const { transactionId, orgId, userId, plan, isAnnual } = customData;

    if (!transactionId || !orgId) {
      console.error('Missing transaction data in webhook');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Check if payment was successful (Status 0 = success in HYP)
    const isSuccess = Status === 0 || Status === '0';

    // Update transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        hyp_transaction_id: Id,
        hyp_status: Status,
        hyp_status_text: StatusText,
        error_code: ErrorCode,
        error_text: ErrorText,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (isSuccess) {
      // Calculate subscription dates
      const now = new Date();
      const subscriptionEnd = new Date(now);
      if (isAnnual === 'true' || isAnnual === true) {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      // Update organization subscription status
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          tier: plan,
          subscription_start_date: now.toISOString(),
          subscription_end_date: subscriptionEnd.toISOString(),
          last_payment_date: now.toISOString(),
          last_payment_amount: Sum,
        })
        .eq('id', orgId);

      // Send confirmation email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
        await fetch(`${baseUrl}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: Email,
            template: 'payment_success',
            data: {
              userName: FullName,
              plan,
              amount: Sum,
              isAnnual,
            },
          }),
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      console.log(`Payment successful for org ${orgId}, plan: ${plan}`);
    } else {
      console.log(`Payment failed for org ${orgId}: ${ErrorText || StatusText}`);
    }

    // Always return 200 to HYP to acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      received: true,
      transactionId,
      status: isSuccess ? 'completed' : 'failed',
    });

  } catch (error) {
    console.error('HYP webhook error:', error);
    // Still return 200 to prevent HYP from retrying
    return NextResponse.json({ 
      success: false, 
      error: 'Internal error',
      received: true,
    });
  }
}

// HYP might also send GET requests for verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'MyDPO HYP Webhook',
    timestamp: new Date().toISOString(),
  });
}

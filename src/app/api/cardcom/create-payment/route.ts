// src/app/api/cardcom/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentPage } from '@/lib/cardcom';

export const dynamic = 'force-dynamic';

interface PaymentRequest {
  orgId: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: 'basic' | 'extended' | 'enterprise';
  isAnnual?: boolean;
}

// Plan pricing - must match checkout page
const PLANS = {
  basic: { monthly: 500, annual: 5000, name: 'חבילה בסיסית' },
  extended: { monthly: 1200, annual: 12000, name: 'חבילה מורחבת' },
  enterprise: { monthly: 3500, annual: 35000, name: 'חבילה ארגונית' },
};

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { orgId, userId, userEmail, userName, plan, isAnnual = false } = body;

    // Validate required fields
    if (!orgId || !userId || !userEmail || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate plan
    const planDetails = PLANS[plan];
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Calculate amount
    const amount = isAnnual ? planDetails.annual : planDetails.monthly;
    const productName = `MyDPO - ${planDetails.name} ${isAnnual ? '(שנתי)' : '(חודשי)'}`;

    // Generate unique transaction ID
    const transactionId = `mydpo_${orgId}_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';

    // Create Cardcom payment page
    const result = await createPaymentPage({
      amount,
      productName,
      successUrl: `${baseUrl}/payment/success?txn=${transactionId}`,
      errorUrl: `${baseUrl}/payment/error?txn=${transactionId}`,
      indicatorUrl: `${baseUrl}/api/cardcom/webhook`,
      customerEmail: userEmail,
      customerName: userName,
      createToken: true, // Save card for recurring monthly billing
      numOfPayments: 1, // Single payment (not installments)
      customFields: {
        transactionId,
        orgId,
        userId,
        plan,
        isAnnual: isAnnual.toString(),
      },
    });

    if (!result.success) {
      console.error('[Cardcom] Failed to create payment:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create payment page' },
        { status: 500 }
      );
    }

    // Store pending transaction in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase.from('payment_transactions').insert({
      id: transactionId,
      org_id: orgId,
      user_id: userId,
      amount,
      plan,
      is_annual: isAnnual,
      status: 'pending',
      provider: 'cardcom',
      lowprofile_code: result.lowProfileCode,
      created_at: new Date().toISOString(),
    });

    console.log('[Cardcom] Payment page created:', {
      transactionId,
      amount,
      plan,
      lowProfileCode: result.lowProfileCode,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: result.url,
      transactionId,
      lowProfileCode: result.lowProfileCode,
    });

  } catch (error) {
    console.error('[Cardcom] Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

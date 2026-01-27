import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// HYP API Configuration
const HYP_API_URL = process.env.HYP_SANDBOX === 'true' 
  ? 'https://pay.hyp.co.il/p/' 
  : 'https://pay.hyp.co.il/p/';

interface PaymentRequest {
  orgId: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: 'basic' | 'extended' | 'enterprise';
  isAnnual?: boolean;
}

// Plan pricing
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

    // Get HYP credentials
    const hypPageCode = process.env.HYP_PAGE_CODE;
    const hypApiKey = process.env.HYP_API_KEY;

    if (!hypPageCode) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Calculate amount
    const planDetails = PLANS[plan];
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const amount = isAnnual ? planDetails.annual : planDetails.monthly;
    const description = `MyDPO - ${planDetails.name} ${isAnnual ? '(שנתי)' : '(חודשי)'}`;

    // Generate unique transaction ID
    const transactionId = `mydpo_${orgId}_${Date.now()}`;

    // Build HYP payment URL with parameters
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';
    
    // HYP payment page parameters
    const params = new URLSearchParams({
      pageCode: hypPageCode,
      userId: visitorId || '',
      sum: amount.toString(),
      description: description,
      pageField: JSON.stringify({
        transactionId,
        orgId,
        userId,
        plan,
        isAnnual: isAnnual.toString(),
      }),
      successUrl: `${baseUrl}/checkout/success?txn=${transactionId}`,
      cancelUrl: `${baseUrl}/checkout?cancelled=true`,
      callbackUrl: `${baseUrl}/api/hyp/webhook`,
      email: userEmail,
      fullName: userName,
      maxPayments: isAnnual ? '1' : '12', // Allow up to 12 payments for monthly
    });

    // Create the payment URL
    const paymentUrl = `${HYP_API_URL}?${params.toString()}`;

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
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      transactionId,
    });
  } catch (error) {
    console.error('HYP payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// Generate visitor ID for HYP
function generateVisitorId(): string {
  return crypto.randomBytes(16).toString('hex');
}

const visitorId = generateVisitorId();

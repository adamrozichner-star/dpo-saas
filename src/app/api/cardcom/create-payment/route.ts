// src/app/api/cardcom/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentPage } from '@/lib/cardcom';

export const dynamic = 'force-dynamic';

interface PaymentRequest {
  orgId?: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyName?: string;
  industry?: string;
  companySize?: string;
  plan: 'basic' | 'extended' | 'enterprise';
  isAnnual?: boolean;
}

// Plan pricing
const PLANS = {
  basic: { monthly: 500, annual: 5000, name: 'חבילה בסיסית', tier: 'basic' as const },
  extended: { monthly: 1200, annual: 12000, name: 'חבילה מורחבת', tier: 'extended' as const },
  enterprise: { monthly: 3500, annual: 35000, name: 'חבילה ארגונית', tier: 'extended' as const }, // Maps to 'extended' in DB
};

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    let { orgId, userId, userEmail, userName, companyName, industry, companySize, plan, isAnnual = false } = body;

    console.log('[Cardcom] Payment request:', { userId, userEmail, plan, orgId: orgId || 'will create' });

    // Validate required fields
    if (!userId || !userEmail || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate plan
    const planDetails = PLANS[plan];
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // PAYMENT-FIRST FLOW: Get or create organization
    if (!orgId) {
      // Check if user already has an org
      const { data: existingUser, error: userLookupError } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (userLookupError) {
        console.error('[Cardcom] User lookup error:', userLookupError);
      }

      if (existingUser?.org_id) {
        orgId = existingUser.org_id;
        console.log('[Cardcom] Found existing org:', orgId);
      } else {
        // Create new organization
        const orgName = companyName || userName || 'עסק חדש';
        // business_id: Use first 9 chars of timestamp to fit VARCHAR(20)
        const businessId = `TMP${Date.now().toString().slice(-9)}`;
        
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            business_id: businessId,
            tier: planDetails.tier, // Use mapped tier (basic or extended only)
            status: 'onboarding',
          })
          .select('id')
          .single();

        if (orgError) {
          console.error('[Cardcom] Org creation failed:', orgError);
          return NextResponse.json(
            { error: `Failed to create organization: ${orgError.message}` },
            { status: 500 }
          );
        }

        orgId = newOrg.id;
        console.log('[Cardcom] Created org:', orgId);

        // Link user to organization
        const { error: linkError } = await supabase
          .from('users')
          .update({ org_id: orgId })
          .eq('auth_user_id', userId);

        if (linkError) {
          console.error('[Cardcom] User link error:', linkError);
        }

        // Save assessment data to organization_profiles (using actual columns)
        if (industry || companySize) {
          const { error: profileError } = await supabase
            .from('organization_profiles')
            .insert({
              org_id: orgId,
              business_type: industry || null,
              employee_count: companySize === 'small' ? 5 : 
                             companySize === 'medium' ? 30 : 
                             companySize === 'large' ? 100 : 
                             companySize === 'enterprise' ? 500 : null,
            });

          if (profileError) {
            console.error('[Cardcom] Profile save error:', profileError);
            // Non-fatal, continue
          }
        }
      }
    }

    // Calculate amount
    const amount = isAnnual ? planDetails.annual : planDetails.monthly;
    const productName = `MyDPO - ${planDetails.name} ${isAnnual ? '(שנתי)' : '(חודשי)'}`;

    // Generate transaction ID (keep it short for DB)
    const txnId = `txn_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';

    // Create Cardcom payment page
    const result = await createPaymentPage({
      amount,
      productName,
      successUrl: `${baseUrl}/payment/success?txn=${txnId}`,
      errorUrl: `${baseUrl}/payment/error?txn=${txnId}`,
      indicatorUrl: `${baseUrl}/api/cardcom/webhook`,
      customerEmail: userEmail,
      customerName: userName || companyName || 'לקוח',
      createToken: true,
      numOfPayments: 1,
      customFields: {
        transactionId: txnId,
        orgId: orgId!,
        userId,
        plan,
        isAnnual: isAnnual.toString(),
      },
    });

    if (!result.success) {
      console.error('[Cardcom] Payment page creation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create payment page' },
        { status: 500 }
      );
    }

    // Store pending transaction (using columns that exist in schema)
    const { error: txnError } = await supabase.from('payment_transactions').insert({
      id: txnId,
      org_id: orgId,
      user_id: userId, // This is auth user UUID
      amount,
      plan: plan,
      is_annual: isAnnual,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (txnError) {
      console.error('[Cardcom] Transaction save error:', txnError);
      // Non-fatal - payment page is already created
    }

    console.log('[Cardcom] Success:', { txnId, orgId, amount, url: result.url?.slice(0, 50) });

    return NextResponse.json({
      success: true,
      paymentUrl: result.url,
      transactionId: txnId,
      orgId,
    });

  } catch (error: any) {
    console.error('[Cardcom] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}

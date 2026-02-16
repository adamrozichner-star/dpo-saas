// src/app/api/cardcom/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentPage } from '@/lib/cardcom';

export const dynamic = 'force-dynamic';

interface PaymentRequest {
  orgId?: string;  // Optional - may not exist yet in payment-first flow
  userId: string;
  userEmail: string;
  userName: string;
  companyName?: string;  // From quick assessment
  industry?: string;     // From quick assessment
  companySize?: string;  // From quick assessment
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
    let { orgId, userId, userEmail, userName, companyName, industry, companySize, plan, isAnnual = false } = body;

    // Validate required fields
    if (!userId || !userEmail || !plan) {
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // PAYMENT-FIRST FLOW: Create organization if it doesn't exist
    if (!orgId) {
      // Check if user already has an org
      const { data: existingUser } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', userId)
        .single();

      if (existingUser?.org_id) {
        orgId = existingUser.org_id;
      } else {
        // Create new organization with minimal required fields
        const orgName = companyName || userName || 'עסק חדש';
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            business_id: `PENDING_${Date.now()}`, // Temporary - will be updated in onboarding
            tier: plan,
            status: 'onboarding',
          })
          .select()
          .single();

        if (orgError) {
          console.error('[Cardcom] Failed to create organization:', orgError);
          console.error('[Cardcom] Error details:', JSON.stringify(orgError));
          return NextResponse.json(
            { error: 'Failed to create organization: ' + (orgError.message || 'Unknown error') },
            { status: 500 }
          );
        }

        orgId = newOrg.id;

        // Link user to organization
        const { error: linkError } = await supabase
          .from('users')
          .update({ org_id: orgId })
          .eq('auth_user_id', userId);
        
        if (linkError) {
          console.error('[Cardcom] Failed to link user to org:', linkError);
        }

        // Save quick assessment data if provided
        if (companyName || industry || companySize) {
          try {
            await supabase
              .from('organization_profiles')
              .insert({
                org_id: orgId,
                profile_data: {
                  quick_assessment: {
                    companyName,
                    industry,
                    companySize,
                    completedAt: new Date().toISOString()
                  }
                }
              });
          } catch (e) {
            console.error('[Cardcom] Failed to save profile:', e);
          }
        }

        console.log('[Cardcom] Created new organization:', orgId);
      }
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
      customerName: userName || companyName,
      createToken: true, // Save card for recurring monthly billing
      numOfPayments: 1, // Single payment (not installments)
      customFields: {
        transactionId,
        orgId: orgId!, // orgId is guaranteed to exist at this point
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
      orgId,
      amount,
      plan,
      lowProfileCode: result.lowProfileCode,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: result.url,
      transactionId,
      orgId,
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

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

const PLANS = {
  basic: { monthly: 500, annual: 5000, name: 'חבילה בסיסית', tier: 'basic' as const },
  extended: { monthly: 1200, annual: 12000, name: 'חבילה מורחבת', tier: 'extended' as const },
  enterprise: { monthly: 3500, annual: 35000, name: 'חבילה ארגונית', tier: 'extended' as const },
};

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    let { orgId, userId, userEmail, userName, companyName, industry, companySize, plan, isAnnual = false } = body;

    console.log('[Payment] Step 0 — Request:', { userId, userEmail, plan, orgId: orgId || 'none' });

    // Validate
    if (!userId || !userEmail || !plan) {
      return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
    }

    const planDetails = PLANS[plan];
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan', success: false }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Payment] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error', success: false }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Get or create organization ----
    console.log('[Payment] Step 1 — Resolving organization...');
    
    if (!orgId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (existingUser?.org_id) {
        orgId = existingUser.org_id;
        console.log('[Payment] Step 1 — Found existing org:', orgId);
      } else {
        // Ensure user record exists
        if (!existingUser) {
          await supabase.from('users').upsert({
            auth_user_id: userId,
            email: userEmail,
            name: userName || userEmail.split('@')[0],
            role: 'admin',
          }, { onConflict: 'auth_user_id' });
        }

        // Create org
        const orgName = companyName || userName || 'עסק חדש';
        const businessId = `TMP${Date.now().toString().slice(-9)}`;
        
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            business_id: businessId,
            tier: planDetails.tier,
            status: 'onboarding',
          })
          .select('id')
          .single();

        if (orgError) {
          console.error('[Payment] Step 1 — Org creation failed:', orgError.message);
          return NextResponse.json({ error: `שגיאה ביצירת ארגון: ${orgError.message}`, success: false }, { status: 500 });
        }

        orgId = newOrg.id;
        console.log('[Payment] Step 1 — Created org:', orgId);

        // Link user to org
        await supabase.from('users').update({ org_id: orgId }).eq('auth_user_id', userId);

        // Save assessment data
        if (industry || companySize) {
          await supabase.from('organization_profiles').insert({
            org_id: orgId,
            business_type: industry || null,
            employee_count: companySize === 'small' ? 5 : companySize === 'medium' ? 30 : companySize === 'large' ? 100 : companySize === 'enterprise' ? 500 : null,
          });
        }
      }
    }

    // ---- Create Cardcom payment page ----
    const amount = isAnnual ? planDetails.annual : planDetails.monthly;
    const productName = `MyDPO - ${planDetails.name} ${isAnnual ? '(שנתי)' : '(חודשי)'}`;
    const txnId = `txn_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';

    console.log('[Payment] Step 2 — Calling Cardcom v11:', { amount, productName, orgId });

    const result = await createPaymentPage({
      amount,
      productName,
      successUrl: `${baseUrl}/payment/success?txn=${txnId}`,
      errorUrl: `${baseUrl}/payment/error?txn=${txnId}`,
      webhookUrl: `${baseUrl}/api/cardcom/webhook`,
      customerEmail: userEmail,
      customerName: userName || companyName || 'לקוח',
      returnValue: txnId,  // Pass txnId so webhook can find the transaction
      operation: 'ChargeAndCreateToken',
      maxPayments: 1,
    });

    if (!result.success) {
      console.error('[Payment] Step 2 — Cardcom FAILED:', result.error, 'code:', result.responseCode);
      return NextResponse.json({ error: result.error || 'שגיאה ביצירת דף תשלום', success: false }, { status: 500 });
    }

    console.log('[Payment] Step 3 — Saving transaction...');

    // Save pending transaction
    const { error: txnError } = await supabase.from('payment_transactions').insert({
      id: txnId,
      org_id: orgId,
      user_id: userId,
      amount,
      plan,
      is_annual: isAnnual,
      status: 'pending',
      lowprofile_code: result.lowProfileId || null,
      created_at: new Date().toISOString(),
    });

    if (txnError) {
      console.error('[Payment] Step 3 — Transaction save error:', txnError.message);
      // Non-fatal — payment page already created
    }

    console.log('[Payment] Step 4 — SUCCESS:', { txnId, orgId, amount, url: result.url?.slice(0, 60) });

    return NextResponse.json({
      success: true,
      paymentUrl: result.url,
      transactionId: txnId,
      orgId,
    });

  } catch (error: any) {
    console.error('[Payment] UNEXPECTED ERROR:', error?.message || error);
    return NextResponse.json({ error: error.message || 'שגיאה בלתי צפויה', success: false }, { status: 500 });
  }
}

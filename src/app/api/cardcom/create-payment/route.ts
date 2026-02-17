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
  enterprise: { monthly: 3500, annual: 35000, name: 'חבילה ארגונית', tier: 'extended' as const },
};

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    let { orgId, userId, userEmail, userName, companyName, industry, companySize, plan, isAnnual = false } = body;

    console.log('[Cardcom] Step 0 - Payment request:', { userId, userEmail, plan, orgId: orgId || 'none' });

    // Validate required fields
    if (!userId || !userEmail || !plan) {
      console.error('[Cardcom] Missing required fields:', { userId: !!userId, userEmail: !!userEmail, plan });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate plan
    const planDetails = PLANS[plan];
    if (!planDetails) {
      console.error('[Cardcom] Invalid plan:', plan);
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Cardcom] Missing Supabase env vars:', { url: !!supabaseUrl, key: !!supabaseServiceKey });
      return NextResponse.json({ error: 'Server configuration error (DB)' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PAYMENT-FIRST FLOW: Get or create organization
    console.log('[Cardcom] Step 1 - Getting/creating org...');
    
    if (!orgId) {
      // Check if user already has an org
      const { data: existingUser, error: userLookupError } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (userLookupError) {
        console.error('[Cardcom] Step 1a - User lookup error:', userLookupError.message);
      }

      if (existingUser?.org_id) {
        orgId = existingUser.org_id;
        console.log('[Cardcom] Step 1b - Found existing org:', orgId);
      } else {
        // User record might not exist yet (e.g., signup didn't create users row)
        // Check if users row exists at all
        if (!existingUser) {
          console.log('[Cardcom] Step 1c - No users record found, creating one...');
          const { error: createUserError } = await supabase
            .from('users')
            .insert({
              auth_user_id: userId,
              email: userEmail,
              name: userName || userEmail.split('@')[0],
              role: 'admin',
            });
          
          if (createUserError) {
            // Might already exist (race condition) — that's OK
            console.warn('[Cardcom] Step 1c - User creation result:', createUserError.message);
          }
        }

        // Create new organization
        const orgName = companyName || userName || 'עסק חדש';
        const businessId = `TMP${Date.now().toString().slice(-9)}`;
        
        console.log('[Cardcom] Step 1d - Creating org:', { orgName, businessId, tier: planDetails.tier });
        
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
          console.error('[Cardcom] Step 1d - Org creation FAILED:', orgError.message, orgError.details, orgError.hint);
          return NextResponse.json(
            { error: `שגיאה ביצירת ארגון: ${orgError.message}` },
            { status: 500 }
          );
        }

        orgId = newOrg.id;
        console.log('[Cardcom] Step 1e - Created org:', orgId);

        // Link user to organization
        const { error: linkError } = await supabase
          .from('users')
          .update({ org_id: orgId })
          .eq('auth_user_id', userId);

        if (linkError) {
          console.error('[Cardcom] Step 1f - User link error:', linkError.message);
          // Non-fatal
        }

        // Save assessment data if present
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
            console.error('[Cardcom] Step 1g - Profile save error:', profileError.message);
            // Non-fatal
          }
        }
      }
    }

    // Calculate amount
    const amount = isAnnual ? planDetails.annual : planDetails.monthly;
    const productName = `MyDPO - ${planDetails.name} ${isAnnual ? '(שנתי)' : '(חודשי)'}`;
    const txnId = `txn_${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mydpo.co.il';

    // Check Cardcom env vars before calling
    const hasCardcomCreds = !!(process.env.CARDCOM_TERMINAL_NUMBER && process.env.CARDCOM_API_NAME && process.env.CARDCOM_API_PASSWORD);
    console.log('[Cardcom] Step 2 - Cardcom creds present:', hasCardcomCreds, 
      'Terminal:', process.env.CARDCOM_TERMINAL_NUMBER || 'MISSING');

    if (!hasCardcomCreds) {
      return NextResponse.json(
        { error: 'מערכת התשלומים לא הוגדרה. בדוק את הגדרות Cardcom.', success: false },
        { status: 500 }
      );
    }

    // Create Cardcom payment page
    console.log('[Cardcom] Step 3 - Creating payment page:', { amount, productName, orgId });
    
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
      console.error('[Cardcom] Step 3 - Payment page creation FAILED:', result.error, 'code:', result.responseCode);
      return NextResponse.json(
        { error: result.error || 'שגיאה ביצירת דף תשלום', success: false },
        { status: 500 }
      );
    }

    console.log('[Cardcom] Step 4 - Payment page created, saving transaction...');

    // Store pending transaction
    const txnData: Record<string, any> = {
      id: txnId,
      org_id: orgId,
      user_id: userId,
      amount,
      plan: plan,
      is_annual: isAnnual,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Only add lowprofile_code if we have it (column may not exist yet if migration not run)
    if (result.lowProfileCode) {
      txnData.lowprofile_code = result.lowProfileCode;
    }

    const { error: txnError } = await supabase
      .from('payment_transactions')
      .insert(txnData);

    if (txnError) {
      console.error('[Cardcom] Step 4 - Transaction save error:', txnError.message, txnError.details);
      
      // If the error is about lowprofile_code column not existing, retry without it
      if (txnError.message?.includes('lowprofile_code')) {
        console.log('[Cardcom] Step 4b - Retrying without lowprofile_code...');
        delete txnData.lowprofile_code;
        const { error: retryError } = await supabase
          .from('payment_transactions')
          .insert(txnData);
        
        if (retryError) {
          console.error('[Cardcom] Step 4b - Retry also failed:', retryError.message);
        }
      }
      // Non-fatal — payment page is already created
    }

    console.log('[Cardcom] Step 5 - SUCCESS:', { txnId, orgId, amount, url: result.url?.slice(0, 60) });

    return NextResponse.json({
      success: true,
      paymentUrl: result.url,
      transactionId: txnId,
      orgId,
    });

  } catch (error: any) {
    console.error('[Cardcom] UNEXPECTED ERROR:', error?.message || error, error?.stack?.slice(0, 200));
    return NextResponse.json(
      { error: error.message || 'שגיאה בלתי צפויה', success: false },
      { status: 500 }
    );
  }
}

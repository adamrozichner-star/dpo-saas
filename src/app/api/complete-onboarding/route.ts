// src/app/api/complete-onboarding/route.ts
// Server-side onboarding completion — uses service role key to bypass RLS
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, v3Answers, legacyAnswers, tier } = body

    // Validate required fields
    if (!userId || !v3Answers) {
      console.error('[CompleteOnboarding] Missing fields:', { userId: !!userId, v3Answers: !!v3Answers })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const businessName = v3Answers.bizName || 'עסק חדש'
    const companyId = v3Answers.companyId || ''
    const autoTier = tier || 'basic'

    console.log('[CompleteOnboarding] Starting:', { 
      userId, userEmail, businessName, companyId, autoTier,
      bizNameFromV3: v3Answers.bizName
    })

    const supabase = getServiceSupabase()

    // 1. Check if user already has an org (prevent duplicates)
    const { data: existingUser } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', userId)
      .single()

    if (existingUser?.org_id) {
      // User already has org — update it with correct name and save profile
      console.log('[CompleteOnboarding] User already has org:', existingUser.org_id, '— updating')
      
      await supabase.from('organizations').update({ 
        name: businessName, 
        business_id: companyId,
        tier: autoTier 
      }).eq('id', existingUser.org_id)

      // Upsert profile
      const { data: existingProfile } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('org_id', existingUser.org_id)
        .maybeSingle()

      if (existingProfile) {
        await supabase.from('organization_profiles')
          .update({ profile_data: { answers: legacyAnswers || [], v3Answers, completedAt: new Date().toISOString() } })
          .eq('org_id', existingUser.org_id)
      } else {
        await supabase.from('organization_profiles')
          .insert({ org_id: existingUser.org_id, profile_data: { answers: legacyAnswers || [], v3Answers, completedAt: new Date().toISOString() } })
      }

      console.log('[CompleteOnboarding] Updated existing org:', existingUser.org_id, 'name:', businessName)
      return NextResponse.json({ 
        success: true, 
        orgId: existingUser.org_id, 
        orgName: businessName,
        updated: true 
      })
    }

    // 2. Create new organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: businessName, business_id: companyId, tier: autoTier, status: 'active' })
      .select('id, name')
      .single()

    if (orgError) {
      console.error('[CompleteOnboarding] Org creation failed:', orgError)
      return NextResponse.json({ error: 'Failed to create organization: ' + orgError.message }, { status: 500 })
    }

    console.log('[CompleteOnboarding] Created org:', orgData.id, 'name:', orgData.name)

    // 3. Link user to org
    const { error: linkError } = await supabase
      .from('users')
      .update({ org_id: orgData.id })
      .eq('auth_user_id', userId)

    if (linkError) {
      console.error('[CompleteOnboarding] User link failed:', linkError)
      // Still continue — org was created
    }

    // 4. Create organization profile with v3Answers
    const { error: profileError } = await supabase
      .from('organization_profiles')
      .insert({
        org_id: orgData.id,
        profile_data: {
          answers: legacyAnswers || [],
          v3Answers: v3Answers,
          completedAt: new Date().toISOString()
        }
      })

    if (profileError) {
      console.error('[CompleteOnboarding] Profile creation failed:', profileError)
      // Still continue — org was created and linked
    }

    console.log('[CompleteOnboarding] Complete! org:', orgData.id, 'name:', orgData.name, 'profile:', !profileError)

    return NextResponse.json({ 
      success: true, 
      orgId: orgData.id, 
      orgName: orgData.name,
      profileSaved: !profileError 
    })

  } catch (err: any) {
    console.error('[CompleteOnboarding] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

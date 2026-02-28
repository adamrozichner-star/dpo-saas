// src/app/api/debug-org/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Pass ?email=...' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const authUser = authUsers?.users?.find(u => u.email === email)

  // Find app user
  const { data: appUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  // Find org
  let org = null
  let profile = null
  if (appUser?.org_id) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', appUser.org_id)
      .single()
    org = orgData

    const { data: profileData } = await supabase
      .from('organization_profiles')
      .select('*')
      .eq('org_id', appUser.org_id)
      .maybeSingle()
    profile = profileData
  }

  // Find ALL orgs (detect duplicates)
  const { data: allOrgs } = await supabase
    .from('organizations')
    .select('id, name, business_id, created_at, status')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    authUser: authUser ? { id: authUser.id, email: authUser.email, created: authUser.created_at } : null,
    appUser: appUser ? { id: appUser.id, auth_user_id: appUser.auth_user_id, org_id: appUser.org_id, name: appUser.name } : null,
    org: org ? { id: org.id, name: org.name, business_id: org.business_id, status: org.status, created: org.created_at } : null,
    profile: profile ? {
      id: profile.id,
      hasProfileData: !!profile.profile_data,
      bizName: profile.profile_data?.v3Answers?.bizName || 'NOT SET',
      companyId: profile.profile_data?.v3Answers?.companyId || 'NOT SET',
      industry: profile.profile_data?.v3Answers?.industry || 'NOT SET',
      completedAt: profile.profile_data?.completedAt || 'NOT SET',
    } : 'NO PROFILE FOUND',
    recentOrgs: allOrgs?.slice(0, 5),
  }, { status: 200 })
}

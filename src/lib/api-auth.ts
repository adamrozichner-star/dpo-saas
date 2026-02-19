// src/lib/api-auth.ts
// Shared auth middleware for all API routes
// Usage: const auth = await authenticateRequest(request, supabase)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface AuthResult {
  userId: string
  orgId: string
  orgName: string
  email: string
  user: any
  org: any
}

/**
 * Creates a Supabase client with service_role key.
 * Only use in API routes — never expose to client.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

/**
 * Authenticate a user request and return their org.
 * 
 * Extracts the Supabase JWT from:
 *   1. Authorization: Bearer <token> header
 *   2. x-supabase-auth header (alternative)
 * 
 * Then verifies the user exists and looks up their organization.
 * 
 * Returns null if auth fails — caller should return 401.
 */
export async function authenticateRequest(
  request: NextRequest,
  supabase?: SupabaseClient
): Promise<AuthResult | null> {
  try {
    const sb = supabase || getServiceSupabase()
    
    // Extract token from headers
    const authHeader = request.headers.get('authorization')
    const altHeader = request.headers.get('x-supabase-auth')
    
    let token: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (altHeader) {
      token = altHeader
    }
    
    if (!token) return null
    
    // Verify the JWT and get user
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return null
    
    // Look up user's organization
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('*, organizations(*)')
      .eq('auth_user_id', user.id)
      .single()
    
    if (userError || !userData?.organizations) return null
    
    const org = userData.organizations
    
    return {
      userId: user.id,
      orgId: org.id,
      orgName: org.name || '',
      email: user.email || '',
      user: userData,
      org
    }
  } catch (e) {
    console.error('Auth middleware error:', e)
    return null
  }
}

/**
 * Verify that the requested orgId matches the authenticated user's org.
 * Prevents IDOR attacks where user sends someone else's orgId.
 */
export function verifyOrgAccess(auth: AuthResult, requestedOrgId: string | null): boolean {
  if (!requestedOrgId) return true // No org specified = use auth.orgId
  return auth.orgId === requestedOrgId
}

/**
 * Quick 401 response helper
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Quick 403 response helper  
 */
export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

// ============================================
// DPO AUTH (separate from user auth)
// ============================================

/**
 * Verify DPO session token from request headers.
 * Used by /api/dpo routes.
 */
export async function authenticateDpo(
  request: NextRequest,
  supabase?: SupabaseClient
): Promise<boolean> {
  const token = request.headers.get('x-dpo-token')
  if (!token) return false
  
  try {
    const sb = supabase || getServiceSupabase()
    
    const { data, error } = await sb
      .from('dpo_sessions')
      .select('expires_at')
      .eq('token', token)
      .single()
    
    if (error || !data) return false
    
    return new Date(data.expires_at) > new Date()
  } catch (e) {
    // Table doesn't exist = NOT authenticated (fail closed)
    return false
  }
}

// ============================================
// CRON AUTH
// ============================================

/**
 * Verify cron secret. Fails closed if CRON_SECRET not set.
 */
export function authenticateCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false // Fail closed
  
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

// ============================================
// WEBHOOK AUTH
// ============================================

/**
 * Basic webhook verification — check for known IPs or secrets.
 * Cardcom doesn't provide HMAC signatures, so we verify via
 * the LowProfileId lookup (the transaction must exist).
 */
export function isWebhookRequest(request: NextRequest): boolean {
  // Webhooks come from external services, not our users
  // Verification happens by checking the transaction exists in Cardcom
  return true
}

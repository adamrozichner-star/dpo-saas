'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

/**
 * Hook that gates access to protected pages.
 * Redirects to /payment-required if user has no active subscription.
 * 
 * To whitelist a user for testing/demos:
 * INSERT INTO subscriptions (org_id, tier, monthly_price, status) 
 * VALUES ('org-uuid', 'basic', 500, 'active');
 */
export function useSubscriptionGate() {
  const router = useRouter()
  const { user, session, supabase, loading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // Not logged in — let the page's own auth check handle redirect to /login
    if (!session || !user) {
      setIsChecking(false)
      return
    }

    if (!supabase) return

    const checkAccess = async () => {
      try {
        // Step 1: Get user's org_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        // If we can't find the user record at all, block access
        if (userError || !userData) {
          console.log('[SubscriptionGate] No user record found, redirecting')
          router.replace('/payment-required')
          return
        }

        // No org yet — still in onboarding, redirect to onboarding
        if (!userData.org_id) {
          console.log('[SubscriptionGate] No org_id, redirecting to onboarding')
          router.replace('/payment-required')
          return
        }

        // Step 2: Check for active subscription (primary check)
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('org_id', userData.org_id)
          .in('status', ['active', 'past_due'])
          .maybeSingle()

        if (sub) {
          console.log('[SubscriptionGate] Active subscription found, authorized')
          setIsAuthorized(true)
          setIsChecking(false)
          return
        }

        // Step 2b: Fallback — check organizations.subscription_status
        // This covers the case where webhook updated org but subscription insert failed
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_status')
          .eq('id', userData.org_id)
          .single()

        if (org?.subscription_status === 'active') {
          console.log('[SubscriptionGate] Org subscription_status is active (fallback), authorized')
          setIsAuthorized(true)
          setIsChecking(false)
          return
        }

        console.log('[SubscriptionGate] No active subscription, redirecting')
        router.replace('/payment-required')
        return
      } catch (e) {
        console.error('[SubscriptionGate] Unexpected error:', e)
        router.replace('/payment-required')
        return
      }
    }

    checkAccess()
  }, [user, session, supabase, loading, router])

  return { isAuthorized, isChecking }
}

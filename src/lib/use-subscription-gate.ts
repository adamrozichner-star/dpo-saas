'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

/**
 * Hook that gates access to protected pages.
 * Redirects to /onboarding if new user, /subscribe if no active subscription.
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

        // If we can't find the user record at all — new signup, needs onboarding
        if (userError || !userData) {
          console.log('[SubscriptionGate] No user record found, redirecting to onboarding')
          router.replace('/onboarding')
          return
        }

        // No org yet — still in onboarding, redirect to onboarding
        if (!userData.org_id) {
          console.log('[SubscriptionGate] No org_id, redirecting to onboarding')
          router.replace('/onboarding')
          return
        }

        // Step 2: Check for active subscription
        // Using maybeSingle() to avoid throwing on 0 results
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('org_id', userData.org_id)
          .in('status', ['active', 'past_due'])
          .maybeSingle()

        if (subError) {
          console.log('[SubscriptionGate] Subscription query error:', subError.message)
          // Could be RLS blocking — just block access
          router.replace('/subscribe')
          return
        }

        if (sub) {
          console.log('[SubscriptionGate] Active subscription found, authorized')
          setIsAuthorized(true)
          setIsChecking(false)
        } else {
          console.log('[SubscriptionGate] No active subscription, redirecting')
          router.replace('/subscribe')
          return
        }
      } catch (e) {
        console.error('[SubscriptionGate] Unexpected error:', e)
        router.replace('/subscribe')
        return
      }
    }

    checkAccess()
  }, [user, session, supabase, loading, router])

  return { isAuthorized, isChecking }
}

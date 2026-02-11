'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

/**
 * Hook that gates access to protected pages.
 * Redirects to /payment-required if user has no active subscription.
 * 
 * Returns { isAuthorized, isChecking } so the page can show a loader while checking.
 * 
 * Whitelist: To manually authorize a user for testing/demos, 
 * add a row to the subscriptions table with status='active' for their org.
 */
export function useSubscriptionGate() {
  const router = useRouter()
  const { user, session, supabase, loading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // Not logged in — auth-context or the page itself handles redirect to /login
    if (!session || !user) {
      setIsChecking(false)
      return
    }

    if (!supabase) return

    const checkAccess = async () => {
      try {
        // Get user's org
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .single()

        if (!userData?.org_id) {
          // No org yet — they're probably still onboarding, let them through
          // (onboarding creates the org, then they'd need to pay)
          setIsAuthorized(true)
          setIsChecking(false)
          return
        }

        // Check for active subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('org_id', userData.org_id)
          .in('status', ['active', 'past_due'])
          .limit(1)
          .single()

        if (sub) {
          setIsAuthorized(true)
        } else {
          // No active subscription — redirect to payment gate
          router.replace('/payment-required')
          return
        }
      } catch (e) {
        // No subscription found — redirect
        router.replace('/payment-required')
        return
      }

      setIsChecking(false)
    }

    checkAccess()
  }, [user, session, supabase, loading, router])

  return { isAuthorized, isChecking }
}

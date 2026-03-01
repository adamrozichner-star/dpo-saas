'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

/**
 * Hook that checks user access level for the dashboard.
 * - Redirects to /onboarding if no user record or no org
 * - Does NOT redirect to /subscribe — dashboard shows gated view instead
 * - Returns isPaid so components can show/hide content accordingly
 */
export function useSubscriptionGate() {
  const router = useRouter()
  const { user, session, supabase, loading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

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

        // No user record — new signup, needs onboarding
        if (userError || !userData) {
          console.log('[SubscriptionGate] No user record, redirecting to onboarding')
          router.replace('/onboarding')
          return
        }

        // No org yet — still in onboarding
        if (!userData.org_id) {
          console.log('[SubscriptionGate] No org_id, redirecting to onboarding')
          router.replace('/onboarding')
          return
        }

        // User has org — they can see the dashboard (gated or full)
        setIsAuthorized(true)

        // Step 2: Check for active subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('org_id', userData.org_id)
          .in('status', ['active', 'past_due'])
          .maybeSingle()

        if (sub) {
          console.log('[SubscriptionGate] Active subscription found')
          setIsPaid(true)
        } else {
          console.log('[SubscriptionGate] No subscription — showing gated dashboard')
          setIsPaid(false)
        }

        setIsChecking(false)
      } catch (e) {
        console.error('[SubscriptionGate] Unexpected error:', e)
        // On error, still let them see gated dashboard rather than blocking
        setIsAuthorized(true)
        setIsPaid(false)
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [user, session, supabase, loading, router])

  return { isAuthorized, isChecking, isPaid }
}

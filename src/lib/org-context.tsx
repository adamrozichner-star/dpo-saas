'use client'

// Shared current-org / session context. Resolves the logged-in user's profile
// (role) and organization once, the same way the dashboard does
// (users joined to organizations via the authed client, RLS-scoped), and exposes
// it to the (deepo) shell + v3 surfaces. The shell's actor/org are derived here.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from './auth-context'
import { actorFromRole } from './actor'
import type { Actor } from '@/components/shell/nav'

export interface OrgProfile {
  id: string
  name: string | null
  role: string
}

export interface OrgRecord {
  id: string
  name: string
  compliance_score: number | null
  tier: string | null
  status: string | null
}

export interface OrgContextValue {
  user: User | null
  profile: OrgProfile | null
  org: OrgRecord | null
  actor: Actor
  loading: boolean
}

const DEFAULT: OrgContextValue = { user: null, profile: null, org: null, actor: 'owner', loading: true }
const OrgContext = createContext<OrgContextValue>(DEFAULT)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, supabase, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<OrgProfile | null>(null)
  const [org, setOrg] = useState<OrgRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user || !supabase) {
      setProfile(null)
      setOrg(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, role, organizations(id, name, compliance_score, tier, status)')
        .eq('auth_user_id', user.id)
        .single()
      if (cancelled) return
      const o = (data?.organizations ?? null) as OrgRecord | null
      setProfile(data ? { id: data.id, name: data.name, role: data.role } : null)
      setOrg(o)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, supabase, authLoading])

  const value: OrgContextValue = {
    user,
    profile,
    org,
    actor: actorFromRole(profile?.role),
    loading: authLoading || loading,
  }
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext)
}

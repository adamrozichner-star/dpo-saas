'use client'

// DPO console - the first surface reading the LIVE ledger. Auth-gated (redirect
// to /login when unauthenticated, like the (expert) layout). Reads the current
// org's obligations + controls via the authed client (RLS-scoped: the policy
// org_id = current_user_org_id() returns only this org's rows). No service-role,
// no cross-org data. Renders via the A4 components + the single-source status map.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { ComplianceScoreDial, ObligationRow, ControlScheduleItem } from '@/components/ledger'
import type { ControlScheduleItemProps } from '@/components/ledger'
import {
  mapObligation,
  mapControls,
  type ObligationDbRow,
  type ControlDbRow,
  type PlaybookDbRow,
} from '@/lib/console-data'

export default function ConsolePage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [obligations, setObligations] = useState<ObligationDbRow[] | null>(null)
  const [controls, setControls] = useState<ControlScheduleItemProps[] | null>(null)

  // Auth gate: redirect to /login once we know there is no user.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Live ledger reads, scoped to the current org (RLS + defensive .eq).
  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const [obRes, ctRes, pbRes] = await Promise.all([
        supabase
          .from('obligations')
          .select('id, title, status, severity, source_rule_id, source_version, recurs_at')
          .eq('org_id', org.id)
          .order('severity', { ascending: true }),
        supabase
          .from('controls')
          .select('source_playbook_id, source_playbook_version, cadence, next_due_at, owner_role, status')
          .eq('org_id', org.id),
        supabase.from('hub_control_playbooks').select('template_id, version, name'),
      ])
      if (cancelled) return
      setObligations((obRes.data ?? []) as ObligationDbRow[])
      setControls(mapControls((ctRes.data ?? []) as ControlDbRow[], (pbRes.data ?? []) as PlaybookDbRow[], new Date().toISOString()))
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, org])

  if (authLoading || orgLoading) {
    return <p className="t-body">טוען…</p>
  }
  if (!user) {
    return null // redirecting to /login
  }
  if (!org) {
    return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }} data-console-org={org.id}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <ComplianceScoreDial score={org.compliance_score ?? 0} />
        <div>
          <p className="t-eyebrow">קונסולת ממונה</p>
          <h2 className="t-h2" style={{ margin: 0 }}>{org.name}</h2>
        </div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 'var(--space-4)' }}>
          <Link href="/console/audit" className="dp-led-link">תיק היערכות</Link>
          <Link href="/console/documents" className="dp-led-link">מסמכים</Link>
          <Link href="/console/links" className="dp-led-link">קישורי איסוף</Link>
        </div>
      </header>

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>חובות ({obligations?.length ?? 0})</p>
        <div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 760 }}>
          {obligations?.map((r) => (
            <Link key={r.id} href={`/console/obligations/${r.id}`} style={{ textDecoration: 'none' }}>
              <ObligationRow {...mapObligation(r)} />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>בקרות ({controls?.length ?? 0})</p>
        <div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 760 }}>
          {controls?.map((c, i) => (
            <ControlScheduleItem key={`${c.name}-${i}`} {...c} />
          ))}
        </div>
      </section>
    </div>
  )
}

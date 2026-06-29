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
import { Card } from '@/components/brand/Card'
import { ComplianceScoreCard, ObligationRow, ControlScheduleItem, PageHeader } from '@/components/ledger'
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

  const obs = obligations ?? []
  const total = obs.length
  const compliant = obs.filter((o) => o.status === 'compliant').length
  const needsAttention = total - compliant
  const controlCount = controls?.length ?? 0
  const actionLink = 'dp-btn dp-btn--secondary dp-btn--sm'

  return (
    <div className="dp-page" data-console-org={org.id}>
      <PageHeader
        eyebrow="קונסולת ממונה"
        title={org.name}
        description="מצב הציות החי של הארגון: החובות, הראיות שנאספו, והבקרות המתוזמנות."
        actions={
          <>
            <Link href="/console/audit" className={actionLink}>תיק היערכות</Link>
            <Link href="/console/documents" className={actionLink}>מסמכים</Link>
            <Link href="/console/links" className={actionLink}>קישורי איסוף</Link>
          </>
        }
      />

      <Card>
        <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', alignItems: 'center' }}>
          <ComplianceScoreCard score={org.compliance_score ?? 0} total={total} compliant={compliant} />
          <div className="dp-stats" style={{ flex: 1, minWidth: 240 }}>
            <div className="dp-stat">
              <span className="dp-stat__num">{total}</span>
              <span className="dp-stat__label">חובות</span>
            </div>
            <div className="dp-stat">
              <span className="dp-stat__num dp-stat__num--accent">{needsAttention}</span>
              <span className="dp-stat__label">טעונות טיפול</span>
            </div>
            <div className="dp-stat">
              <span className="dp-stat__num">{controlCount}</span>
              <span className="dp-stat__label">בקרות מתוזמנות</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">חובות</h2>
          <span className="dp-section__count">{total}</span>
        </div>
        {total ? (
          <div className="dp-list">
            {obs.map((r) => (
              <Link key={r.id} href={`/console/obligations/${r.id}`}>
                <ObligationRow {...mapObligation(r)} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="dp-section__empty">אין חובות פתוחות כרגע.</p>
        )}
      </Card>

      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">בקרות מתוזמנות</h2>
          <span className="dp-section__count">{controlCount}</span>
        </div>
        {controlCount ? (
          <div className="dp-list">
            {controls?.map((c, i) => (
              <ControlScheduleItem key={`${c.name}-${i}`} {...c} />
            ))}
          </div>
        ) : (
          <p className="dp-section__empty">אין בקרות מתוזמנות.</p>
        )}
      </Card>
    </div>
  )
}

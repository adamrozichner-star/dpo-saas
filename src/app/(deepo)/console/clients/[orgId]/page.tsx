'use client'

// Per-client READ drill-down. orgId is a path param; the read goes through the
// curator route /api/console/clients/[orgId], which gates it via the shared
// curatorOwnsOrg chokepoint (the org must be in this curator's book). This is the
// mechanism that works for a client that is NOT the curator's own org - the
// existing RLS /console pages cannot (RLS scopes to the curator's own org). Obligations
// are read-only here (their detail pages are own-org RLS; writes arrive in Task 3b).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/brand/Card'
import { ComplianceScoreCard, ObligationRow, ControlScheduleItem, PageHeader } from '@/components/ledger'
import type { ControlScheduleItemProps } from '@/components/ledger'
import { mapObligation, mapControls, scoreFromObligations, isUnassessed, type ObligationDbRow, type ControlDbRow, type PlaybookDbRow } from '@/lib/console-data'

interface Detail {
  org: { id: string; name: string; status: string | null; compliance_score: number | null }
  obligations: ObligationDbRow[]
  controls: ControlDbRow[]
  playbooks: PlaybookDbRow[]
}

export default function ClientDetailPage({ params }: { params: { orgId: string } }) {
  const { user, supabase, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Detail | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !user) return
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/console/clients/${params.orgId}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      if (cancelled) return
      if (res.status === 403) { setForbidden(true); setLoaded(true); return }
      if (res.ok) setData((await res.json()) as Detail)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [supabase, user, params.orgId])

  if (authLoading || !loaded) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (forbidden) return (
    <div className="dp-page">
      <Link href="/console" className="dp-led-link dp-page__back">חזרה ללקוחות</Link>
      <Card><p className="t-body" style={{ margin: 0 }}>אין לך גישה ללקוח זה.</p></Card>
    </div>
  )
  if (!data) return <p className="t-body">לא נמצא לקוח.</p>

  const obs = (data.obligations ?? []) as ObligationDbRow[]
  const total = obs.length
  const compliant = obs.filter((o) => o.status === 'compliant').length
  const score = scoreFromObligations(obs)
  const unassessed = isUnassessed(obs)
  const controls = mapControls((data.controls ?? []) as ControlDbRow[], (data.playbooks ?? []) as PlaybookDbRow[], new Date().toISOString()) as ControlScheduleItemProps[]

  return (
    <div className="dp-page">
      <Link href="/console" className="dp-led-link dp-page__back">חזרה ללקוחות</Link>
      <PageHeader eyebrow="לקוח" title={data.org.name} description="מצב הציות של הלקוח. צפייה בלבד; פעולות אישור וטיפול יתווספו בהמשך." />

      <Card>
        <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', alignItems: 'center' }}>
          <ComplianceScoreCard score={score} total={total} compliant={compliant} unassessed={unassessed} />
          <div className="dp-stats" style={{ flex: 1, minWidth: 240 }}>
            <div className="dp-stat"><span className="dp-stat__num">{total}</span><span className="dp-stat__label">חובות</span></div>
            <div className="dp-stat"><span className="dp-stat__num dp-stat__num--accent">{total - compliant}</span><span className="dp-stat__label">טעונות טיפול</span></div>
            <div className="dp-stat"><span className="dp-stat__num">{controls.length}</span><span className="dp-stat__label">בקרות מתוזמנות</span></div>
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
            {obs.map((r) => <ObligationRow key={r.id} {...mapObligation(r)} />)}
          </div>
        ) : (
          <p className="dp-section__empty">אין חובות פתוחות.</p>
        )}
      </Card>

      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">בקרות מתוזמנות</h2>
          <span className="dp-section__count">{controls.length}</span>
        </div>
        {controls.length ? (
          <div className="dp-list">{controls.map((c, i) => <ControlScheduleItem key={`${c.name}-${i}`} {...c} />)}</div>
        ) : (
          <p className="dp-section__empty">אין בקרות מתוזמנות.</p>
        )}
      </Card>
    </div>
  )
}

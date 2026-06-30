'use client'

// DPO console HOME = the cross-client overview. A DPO (expert_curator) manages many
// client orgs; this lists their whole book + the headline counts, all fetched from
// the curator-scoped /api/console/clients (service-role, scoped by the JWT-derived
// dpo_id - never global, never client-supplied). Clicking a client opens the
// per-client read drill-down at /console/clients/[orgId]. A non-curator gets 403.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'
import { PageHeader } from '@/components/ledger'

interface ClientRow { id: string; name: string; status: string | null; score: number; unassessed: boolean; openGaps: number; awaitingReview: number }
interface Overview { clients: ClientRow[]; metrics: { activeClients: number; stuckInOnboarding: number; awaitingReview: number; openGaps: number } }

const STATUS: Record<string, { label: string; variant: 'ok' | 'warn' | 'neutral' }> = {
  active: { label: 'פעיל', variant: 'ok' },
  onboarding: { label: 'בהצטרפות', variant: 'warn' },
  suspended: { label: 'מושהה', variant: 'neutral' },
}

export default function ConsoleOverviewPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Overview | null>(null)
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
      const res = await fetch('/api/console/clients', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      if (cancelled) return
      if (res.status === 403) { setForbidden(true); setLoaded(true); return }
      if (res.ok) setData((await res.json()) as Overview)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [supabase, user])

  if (authLoading || !loaded) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (forbidden) return (
    <div className="dp-page"><Card><p className="t-body" style={{ margin: 0 }}>קונסולת הממונה זמינה למשתמשי ממונה בלבד.</p></Card></div>
  )
  if (!data) return <p className="t-body">לא נמצאו נתונים.</p>

  const m = data.metrics
  return (
    <div className="dp-page">
      <PageHeader
        eyebrow="קונסולת ממונה"
        title="הלקוחות שלך"
        description="מבט-על על כל הלקוחות שבאחריותך: מי דורש טיפול, מה ממתין לאישורך, ומי עדיין בתהליך הצטרפות."
      />

      <Card>
        <div className="dp-stats">
          <div className="dp-stat"><span className="dp-stat__num">{m.activeClients}</span><span className="dp-stat__label">לקוחות פעילים</span></div>
          <div className="dp-stat"><span className="dp-stat__num dp-stat__num--accent">{m.awaitingReview}</span><span className="dp-stat__label">ממתין לאישורך</span></div>
          <div className="dp-stat"><span className="dp-stat__num dp-stat__num--accent">{m.openGaps}</span><span className="dp-stat__label">פערים פתוחים</span></div>
          <div className="dp-stat"><span className="dp-stat__num">{m.stuckInOnboarding}</span><span className="dp-stat__label">בתהליך הצטרפות</span></div>
        </div>
      </Card>

      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">לקוחות</h2>
          <span className="dp-section__count">{data.clients.length}</span>
        </div>
        {data.clients.length ? (
          <div className="dp-list">
            {data.clients.map((c) => {
              const st = STATUS[c.status ?? ''] ?? { label: c.status ?? '-', variant: 'neutral' as const }
              return (
                <Link key={c.id} href={`/console/clients/${c.id}`}>
                  <div className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <span className="dp-oblig-row__title">{c.name}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="dp-led-due">{c.unassessed ? 'בתהליך מיפוי' : `ציון ${c.score}`} · {c.openGaps} פערים פתוחים</span>
                    {c.awaitingReview > 0 ? <Badge variant="warn" dot>{c.awaitingReview} לאישור</Badge> : null}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="dp-section__empty">עדיין לא משויכים אליך לקוחות.</p>
        )}
      </Card>
    </div>
  )
}

'use client'

// Owner light app - the business owner's plain-language compliance home (not the
// DPO console). Auth-gated, own-org RLS. Translates the org's ledger into WHICH
// privacy gaps exist and HOW each is being handled, in plain language. CRITICAL:
// no raw obligation title/severity/jargon ever reaches the owner - buildOwnerGaps
// keys only on source_rule_id and falls back to a generic line. The shell forces
// the owner (light) theme + the owner nav on /home (see AppShell / OWNER_NAV).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'
import { DeepoIcon } from '@/brand/icons'
import {
  buildOwnerHome, buildOwnerGaps,
  type OwnerHomeView, type OwnerGap, type OwnerGapObligation, type OwnerObligationStatusRow, type OwnerTaskRow,
} from '@/lib/console-data'
import type { ObligationStatus } from '@/components/ledger/status'

interface ObRow { id: string; status: ObligationStatus; source_rule_id: string | null }
interface TaskRow { obligation_id: string | null; assignee_actor: string; status: string; title: string }

const GAP_BADGE: Record<OwnerGap['status'], 'ok' | 'warn' | 'neutral'> = {
  handling: 'ok', waiting_vendor: 'neutral', waiting_it: 'neutral', needs_you: 'warn',
}

export default function OwnerHomePage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [home, setHome] = useState<OwnerHomeView | null>(null)
  const [gaps, setGaps] = useState<OwnerGap[]>([])

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const [obRes, taskRes, vendorGapRes] = await Promise.all([
        supabase.from('obligations').select('id, status, source_rule_id').eq('org_id', org.id),
        supabase.from('tasks').select('obligation_id, assignee_actor, status, title').eq('org_id', org.id).not('status', 'in', '(done,cancelled)'),
        supabase.from('data_recipients').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('has_dpa', false),
      ])
      if (cancelled) return
      const obs = (obRes.data ?? []) as ObRow[]
      const openTasks = (taskRes.data ?? []) as TaskRow[]
      // open-task actors per obligation -> who each gap is waiting on
      const actorsByOb = new Map<string, string[]>()
      for (const t of openTasks) {
        if (!t.obligation_id) continue
        const a = actorsByOb.get(t.obligation_id) ?? []
        a.push(t.assignee_actor); actorsByOb.set(t.obligation_id, a)
      }
      const gapInput: OwnerGapObligation[] = obs.map((o) => ({ status: o.status, sourceRuleId: o.source_rule_id, openTaskActors: actorsByOb.get(o.id) ?? [] }))
      const ownerTasks: OwnerTaskRow[] = openTasks.filter((t) => t.assignee_actor === 'owner').map((t) => ({ title: t.title }))
      setGaps(buildOwnerGaps(gapInput))
      setHome(buildOwnerHome(obs.map((o) => ({ status: o.status }) as OwnerObligationStatusRow), ownerTasks, vendorGapRes.count ?? 0))
    })()
    return () => { cancelled = true }
  }, [supabase, org])

  if (authLoading || orgLoading || !home) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <DeepoIcon id="dp-shield" style={{ fontSize: 30, color: 'var(--crimson-500)' }} />
        <h1 className="t-h1" style={{ margin: 0 }}>{home.headline}</h1>
      </header>

      <Card>
        <p className="t-body" style={{ margin: 0 }}>{home.reassurance}</p>
      </Card>

      {home.unassessed ? null : (
        <>
          {gaps.length ? (
            <section>
              <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>מה אנחנו מטפלים בו <span style={{ color: 'var(--fg-3)' }}>(בלי הז׳רגון המשפטי, מבטיחים)</span></p>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {gaps.map((g, i) => (
                  <Card key={i}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="t-body" style={{ flex: 1, minWidth: 0 }}>{g.what}</span>
                      <Badge variant={GAP_BADGE[g.status]} dot={g.status === 'needs_you'}>{g.statusLabel}</Badge>
                    </div>
                    {g.action ? <p className="t-body-sm" style={{ margin: 'var(--space-2) 0 0', color: 'var(--crimson-600)' }}>{g.action}</p> : null}
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {home.vendorDpaNote ? (
            <Card><p className="t-body" style={{ margin: 0 }}>{home.vendorDpaNote}</p></Card>
          ) : null}

          <section>
            <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>מה צריך מכם</p>
            {home.needsYou.length ? (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {home.needsYou.map((item, i) => (
                  <Card key={i}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <DeepoIcon id="dp-check" style={{ fontSize: 18, color: 'var(--crimson-500)' }} />
                      <span className="t-body" style={{ flex: 1 }}>{item.title}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="t-body-sm">אין כרגע דבר שדורש את תשומת לבכם. ניידע אתכם אם משהו ישתנה.</p>
            )}
          </section>
        </>
      )}

      <p className="t-body-sm" style={{ color: 'var(--fg-3)' }}>{home.humanTouch}</p>
    </div>
  )
}

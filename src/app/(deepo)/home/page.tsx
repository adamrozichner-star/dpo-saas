'use client'

// Owner light app - the business owner's plain-language compliance home (not the
// DPO console). Auth-gated (redirect to /login), RLS-scoped. Reads the current
// org's ledger state and renders a warm, high-level view via the pure
// buildOwnerHome mapper. The owner NEVER sees obligation titles, severities, or
// provenance - only counts, the rare things that need them, and reassurance.
// The shell forces the owner (light) theme on /home (see AppShell).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Card } from '@/components/brand/Card'
import { DeepoIcon } from '@/brand/icons'
import { buildOwnerHome, type OwnerHomeView, type OwnerObligationStatusRow, type OwnerTaskRow } from '@/lib/console-data'

export default function OwnerHomePage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [home, setHome] = useState<OwnerHomeView | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const [obRes, taskRes] = await Promise.all([
        supabase.from('obligations').select('status').eq('org_id', org.id),
        supabase.from('tasks').select('title').eq('org_id', org.id).eq('assignee_actor', 'owner').not('status', 'in', '(done,cancelled)'),
      ])
      if (cancelled) return
      setHome(buildOwnerHome((obRes.data ?? []) as OwnerObligationStatusRow[], (taskRes.data ?? []) as OwnerTaskRow[]))
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, org])

  if (authLoading || orgLoading || !home) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 620 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <DeepoIcon id="dp-shield" style={{ fontSize: 30, color: 'var(--crimson-500)' }} />
        <h1 className="t-h1" style={{ margin: 0 }}>{home.headline}</h1>
      </header>

      <Card>
        <p className="t-body" style={{ margin: 0 }}>{home.reassurance}</p>
      </Card>

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>מה מחכה לך</p>
        {home.needsYou.length ? (
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {home.needsYou.map((item, i) => (
              <div key={i} className="dp-oblig-row">
                <span className="dp-oblig-row__title">{item.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body-sm">אין כרגע דבר שדורש את תשומת לבך. ניידע אותך אם משהו ישתנה.</p>
        )}
      </section>

      <p className="t-body-sm" style={{ color: 'var(--fg-3)' }}>{home.humanTouch}</p>
    </div>
  )
}

'use client'

// DPO judgment queue - the first WRITING surface. Lists the current org's
// dpo_queue items and lets the DPO resolve one: updates the dpo_queue row and
// appends an append-only events row, both as the authed user under RLS
// (migration 040 added the org-scoped UPDATE policy). No service-role.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { formatShortDate } from '@/components/ledger/format'
import {
  mapQueueItem,
  buildResolveWrite,
  DPO_QUEUE_PRIORITY,
  DPO_QUEUE_STATUS,
  type QueueItemDbRow,
  type QueueItemView,
  type ResolutionType,
} from '@/lib/console-data'

const RESOLUTION_OPTIONS: { value: ResolutionType; label: string }[] = [
  { value: 'manual', label: 'טיפול ידני' },
  { value: 'approved_ai', label: 'אישור המלצת AI' },
  { value: 'edited', label: 'עריכה ואישור' },
  { value: 'rejected', label: 'דחייה' },
]

function QueueItem({ item, onResolve }: { item: QueueItemView; onResolve: (id: string, type: ResolutionType, notes: string) => Promise<void> }) {
  const [type, setType] = useState<ResolutionType>('manual')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const pr = DPO_QUEUE_PRIORITY[item.priority]
  const st = DPO_QUEUE_STATUS[item.status]
  return (
    <div className="dp-oblig-row" style={{ flexWrap: 'wrap' }}>
      <span className="dp-oblig-row__title">{item.title}</span>
      <Badge variant="neutral">{item.typeLabel}</Badge>
      <Badge variant={pr.variant} dot>{pr.label}</Badge>
      <Badge variant={st.variant} data-queue-status={item.status}>{st.label}</Badge>
      {item.deadlineAt ? <span className="dp-led-due">יעד: {formatShortDate(item.deadlineAt)}</span> : null}
      {!item.resolved ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', width: '100%', marginTop: 'var(--space-2)' }}>
          <select className="dp-input" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value as ResolutionType)} aria-label="סוג טיפול">
            {RESOLUTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input className="dp-input" placeholder="הערת סימוכין (אופציונלי)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onResolve(item.id, type, notes)
              setBusy(false)
            }}
          >
            סמן כטופל
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function QueuePage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, profile, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [items, setItems] = useState<QueueItemView[] | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('dpo_queue')
        .select('id, type, priority, status, title, description, deadline_at')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      setItems(((data ?? []) as QueueItemDbRow[]).map(mapQueueItem))
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, org])

  async function resolve(id: string, type: ResolutionType, notes: string) {
    if (!supabase || !org || !profile) return
    const current = items?.find((i) => i.id === id)
    if (!current || current.resolved) return // guard double-resolve
    const w = buildResolveWrite({
      itemId: id,
      orgId: org.id,
      userId: profile.id,
      resolutionType: type,
      notes,
      actor: profile.name ?? profile.role,
      nowIso: new Date().toISOString(),
    })
    // optimistic
    setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, status: 'resolved', resolved: true } : i)) ?? null)
    const { error: updErr } = await supabase.from('dpo_queue').update(w.update).eq('id', id).eq('org_id', org.id)
    if (updErr) {
      setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, status: current.status, resolved: false } : i)) ?? null)
      return
    }
    await supabase.from('events').insert(w.event)
  }

  if (authLoading || orgLoading) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  const open = items?.filter((i) => !i.resolved) ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 820 }}>
      <header>
        <Link href="/console" className="dp-led-link">חזרה לקונסולה</Link>
        <h2 className="t-h2" style={{ margin: 'var(--space-2) 0 0' }}>תור שיפוט</h2>
        <p className="t-body-sm">{open.length} פריטים ממתינים לטיפול</p>
      </header>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }} data-queue-org={org.id}>
        {items?.length ? items.map((item) => <QueueItem key={item.id} item={item} onResolve={resolve} />) : <p className="t-body-sm">אין פריטים בתור.</p>}
      </div>
    </div>
  )
}

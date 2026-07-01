'use client'

// Book-wide Approvals inbox - pending items across the curator's WHOLE book
// (curator-scoped via /api/console/approvals; never global). Each row names its
// client; resolving routes through the per-client book-verified resolve route.
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { PageHeader, ConfirmDialog } from '@/components/ledger'
import { formatShortDate } from '@/components/ledger/format'
import { DPO_QUEUE_PRIORITY } from '@/lib/console-data'

interface ApprovalItem { id: string; orgId: string; orgName: string; type: string; priority: string; title: string; deadlineAt: string | null }
const TYPE_LABEL: Record<string, string> = { escalation: 'הסלמה', dsr: 'בקשת נושא מידע', incident: 'אירוע', review: 'סקירת מסמכים', onboarding: 'הצטרפות', document_expiry: 'פקיעת מסמך', regulator: 'רגולטור' }

export default function ApprovalsPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ApprovalItem[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [confirm, setConfirm] = useState<ApprovalItem | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!supabase || !user) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/console/approvals', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
    if (res.status === 403) { setForbidden(true); setItems([]); return }
    if (res.ok) setItems((await res.json()).items as ApprovalItem[])
    else setItems([])
  }, [supabase, user])

  useEffect(() => { load() }, [load])

  async function resolve() {
    if (!supabase || !confirm) return
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/console/clients/${confirm.orgId}/queue/${confirm.id}/resolve`, {
      method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ resolutionType: 'manual', notes: '' }),
    })
    setBusy(false); setConfirm(null); await load()
  }

  if (authLoading || items === null) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (forbidden) return <div className="dp-page"><Card><p className="t-body" style={{ margin: 0 }}>זמין למשתמשי ממונה בלבד.</p></Card></div>

  return (
    <div className="dp-page">
      <PageHeader eyebrow="קונסולת ממונה" title="ממתין לאישור" description="כל הפריטים שממתינים לטיפולך, מכל הלקוחות שבאחריותך." />
      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">תור הטיפול</h2>
          <span className="dp-section__count">{items.length}</span>
        </div>
        {items.length ? (
          <div className="dp-list">
            {items.map((it) => {
              const pr = DPO_QUEUE_PRIORITY[it.priority as keyof typeof DPO_QUEUE_PRIORITY]
              return (
                <div key={it.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <span className="dp-oblig-row__title">{it.title}</span>
                  <Badge variant="brand">{it.orgName}</Badge>
                  <Badge variant="neutral">{TYPE_LABEL[it.type] ?? it.type}</Badge>
                  {pr ? <Badge variant={pr.variant} dot>{pr.label}</Badge> : null}
                  {it.deadlineAt ? <span className="dp-led-due">יעד: {formatShortDate(it.deadlineAt)}</span> : null}
                  <Button variant="primary" size="sm" onClick={() => setConfirm(it)}>סמן כטופל</Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="dp-section__empty">אין פריטים שממתינים לטיפול. כל הכבוד.</p>
        )}
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title="סימון כטופל"
        body={confirm ? <>לסמן את הפריט «{confirm.title}» של {confirm.orgName} כטופל? הפעולה תירשם ביומן.</> : null}
        confirmLabel="סמן כטופל"
        busy={busy}
        onConfirm={resolve}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

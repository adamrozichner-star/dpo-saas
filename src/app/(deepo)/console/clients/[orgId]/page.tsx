'use client'

// Per-client drill-down. orgId is a path param; every read/write goes through the
// curator routes gated by curatorOwnsOrg (the org must be in this curator's book) -
// the mechanism that works for a client that is NOT the curator's own org. The
// four per-client sections (queue / documents / audit / collection links) that used
// to be top-level own-org now live here, rewired to the curator routes. Side-
// effectful actions (certify, mint) go through an explicit ConfirmDialog.
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { ComplianceScoreCard, ObligationRow, ControlScheduleItem, PageHeader, ConfirmDialog, DocumentLifecycleBadge } from '@/components/ledger'
import type { ControlScheduleItemProps } from '@/components/ledger'
import { formatShortDate } from '@/components/ledger/format'
import { DOC_TYPE_LABEL, ACCESS_LINK_PURPOSE, ACCESS_LINK_STATUS, type DocumentStatus, type AccessLinkPurpose, type AccessLinkStatus } from '@/components/ledger/status'
import { mapObligation, mapControls, scoreFromObligations, isUnassessed, DPO_QUEUE_PRIORITY, type ObligationDbRow, type ControlDbRow, type PlaybookDbRow } from '@/lib/console-data'

interface QueueRow { id: string; type: string; priority: string; status: string; title: string; deadline_at: string | null }
interface DocRow { id: string; type: string; title: string; status: DocumentStatus; version: number | null; approved_at: string | null }
interface LinkRow { id: string; purpose: AccessLinkPurpose; status: AccessLinkStatus; obligation_id: string | null; created_at: string; expires_at: string | null; used_at: string | null }
interface PackRow { id: string; generated_at: string; pack_fingerprint: string }
interface Detail {
  org: { id: string; name: string; status: string | null; compliance_score: number | null }
  obligations: ObligationDbRow[]; controls: ControlDbRow[]; playbooks: PlaybookDbRow[]
  queue: QueueRow[]; documents: DocRow[]; links: LinkRow[]; packs: PackRow[]
}
interface Confirm { title: string; body: React.ReactNode; label: string; run: () => Promise<void> }

export default function ClientDetailPage({ params }: { params: { orgId: string } }) {
  const { user, supabase, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Detail | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [mintObId, setMintObId] = useState('')
  const [mintedToken, setMintedToken] = useState<string | null>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!supabase || !user) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/console/clients/${params.orgId}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
    if (res.status === 403) { setForbidden(true); setLoaded(true); return }
    if (res.ok) setData((await res.json()) as Detail)
    setLoaded(true)
  }, [supabase, user, params.orgId])

  useEffect(() => { load() }, [load])

  const post = useCallback(async (path: string, body: unknown) => {
    const { data: { session } } = await supabase!.auth.getSession()
    return fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
  }, [supabase])

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    await confirm.run()
    setBusy(false); setConfirm(null)
  }

  if (authLoading || !loaded) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (forbidden) return (
    <div className="dp-page">
      <Link href="/console" className="dp-led-link dp-page__back">חזרה ללקוחות</Link>
      <Card><p className="t-body" style={{ margin: 0 }}>אין לך גישה ללקוח זה.</p></Card>
    </div>
  )
  if (!data) return <p className="t-body">לא נמצא לקוח.</p>

  const base = `/api/console/clients/${params.orgId}`
  const obs = data.obligations ?? []
  const total = obs.length
  const compliant = obs.filter((o) => o.status === 'compliant').length
  const score = scoreFromObligations(obs)
  const unassessed = isUnassessed(obs)
  const controls = mapControls((data.controls ?? []) as ControlDbRow[], (data.playbooks ?? []) as PlaybookDbRow[], new Date().toISOString()) as ControlScheduleItemProps[]

  return (
    <div className="dp-page">
      <Link href="/console" className="dp-led-link dp-page__back">חזרה ללקוחות</Link>
      <PageHeader eyebrow="לקוח" title={data.org.name} description="מצב הציות של הלקוח, והפעולות שבאחריותך." />

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

      {/* Approvals for THIS client */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">ממתין לאישור</h2><span className="dp-section__count">{data.queue.length}</span></div>
        {data.queue.length ? (
          <div className="dp-list">
            {data.queue.map((q) => (
              <div key={q.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{q.title}</span>
                {DPO_QUEUE_PRIORITY[q.priority as keyof typeof DPO_QUEUE_PRIORITY] ? <Badge variant={DPO_QUEUE_PRIORITY[q.priority as keyof typeof DPO_QUEUE_PRIORITY].variant} dot>{DPO_QUEUE_PRIORITY[q.priority as keyof typeof DPO_QUEUE_PRIORITY].label}</Badge> : null}
                {q.deadline_at ? <span className="dp-led-due">יעד: {formatShortDate(q.deadline_at)}</span> : null}
                <Button variant="primary" size="sm" onClick={() => setConfirm({ title: 'סימון כטופל', body: <>לסמן «{q.title}» כטופל?</>, label: 'סמן כטופל', run: async () => { await post(`${base}/queue/${q.id}/resolve`, { resolutionType: 'manual' }); await load() } })}>סמן כטופל</Button>
              </div>
            ))}
          </div>
        ) : <p className="dp-section__empty">אין פריטים שממתינים לטיפול.</p>}
      </Card>

      {/* Obligations (read-only) */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">חובות</h2><span className="dp-section__count">{total}</span></div>
        {total ? <div className="dp-list">{obs.map((r) => <ObligationRow key={r.id} {...mapObligation(r)} />)}</div> : <p className="dp-section__empty">אין חובות פתוחות.</p>}
      </Card>

      {/* Documents */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">מסמכים</h2><span className="dp-section__count">{data.documents.length}</span></div>
        {data.documents.length ? (
          <div className="dp-list">
            {data.documents.map((d) => (
              <div key={d.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{DOC_TYPE_LABEL[d.type] ?? d.title}</span>
                <DocumentLifecycleBadge status={d.status} />
                <span className="dp-led-due" style={{ marginInlineStart: 'auto' }}>גרסה {d.version ?? 1}</span>
                {(d.status === 'pending_review' || d.status === 'pending_approval') ? (
                  <Button variant="primary" size="sm" onClick={() => setConfirm({ title: 'אישור מסמך', body: <>לאשר את «{DOC_TYPE_LABEL[d.type] ?? d.title}»? הגרסה הנוכחית תוצמד.</>, label: 'אשר', run: async () => { await post(`${base}/documents/${d.id}/approve`, {}); await load() } })}>אישור</Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : <p className="dp-section__empty">אין מסמכים.</p>}
      </Card>

      {/* Audit packs + certify (side-effectful: confirm dialog) */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">תיק היערכות</h2><span className="dp-section__count">{data.packs.length}</span></div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBlockEnd: data.packs.length ? 'var(--space-3)' : 0 }}>
          <Button variant="primary" size="sm" onClick={() => setConfirm({ title: 'הפקת תיק היערכות', body: 'הפעולה תיצור תיק היערכות - תצלום בלתי-משתנה של מצב הציות הנוכחי של הלקוח. להמשיך?', label: 'הפק תיק', run: async () => { await post(`${base}/certify`, {}); await load() } })}>הפקת תיק היערכות</Button>
        </div>
        {data.packs.length ? (
          <div className="dp-list">
            {data.packs.map((p) => (
              <div key={p.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{formatShortDate(p.generated_at)}</span>
                <span className="dp-led-prov" style={{ marginInlineStart: 'auto' }}>{p.pack_fingerprint}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Collection links + mint (side-effectful: confirm dialog) */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">קישורי איסוף</h2><span className="dp-section__count">{data.links.length}</span></div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', marginBlockEnd: 'var(--space-3)' }}>
          <select className="dp-input" style={{ width: 'auto' }} value={mintObId} onChange={(e) => setMintObId(e.target.value)} aria-label="בחירת חובה">
            <option value="">בחרו חובה לאיסוף מידע…</option>
            {obs.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
          <Button variant="secondary" size="sm" disabled={!mintObId} onClick={() => setConfirm({ title: 'הפקת קישור איסוף', body: 'הפעולה תיצור קישור מאובטח חד-פעמי (ללא התחברות) לאיסוף מידע מהסיסטם. הקישור יוצג פעם אחת בלבד. להמשיך?', label: 'הפק קישור', run: async () => { const r = await post(`${base}/links`, { purpose: 'sysadmin_questionnaire', obligationId: mintObId, displayName: data.org.name }); const j = await r.json().catch(() => ({})); if (j.token) setMintedToken(j.token); setMintObId(''); await load() } })}>בקשת מידע מהסיסטם</Button>
        </div>
        {mintedToken ? (
          <div className="dp-doc-banner">
            <Badge variant="ok">קישור נוצר</Badge>
            <span className="t-body-sm" style={{ wordBreak: 'break-all' }}>{typeof window !== 'undefined' ? `${window.location.origin}/link/${mintedToken}` : mintedToken}</span>
          </div>
        ) : null}
        {data.links.length ? (
          <div className="dp-list" style={{ marginBlockStart: 'var(--space-3)' }}>
            {data.links.map((l) => (
              <div key={l.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{ACCESS_LINK_PURPOSE[l.purpose] ?? l.purpose}</span>
                <Badge variant={ACCESS_LINK_STATUS[l.status]?.variant ?? 'neutral'}>{ACCESS_LINK_STATUS[l.status]?.label ?? l.status}</Badge>
                <span className="dp-led-due">נוצר: {formatShortDate(l.created_at)}</span>
                {l.used_at ? <span className="dp-led-due">הוגש: {formatShortDate(l.used_at)}</span> : null}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Controls */}
      <Card>
        <div className="dp-section__head"><h2 className="dp-section__title">בקרות מתוזמנות</h2><span className="dp-section__count">{controls.length}</span></div>
        {controls.length ? <div className="dp-list">{controls.map((c, i) => <ControlScheduleItem key={`${c.name}-${i}`} {...c} />)}</div> : <p className="dp-section__empty">אין בקרות מתוזמנות.</p>}
      </Card>

      <ConfirmDialog open={confirm !== null} title={confirm?.title ?? ''} body={confirm?.body} confirmLabel={confirm?.label} busy={busy} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
    </div>
  )
}

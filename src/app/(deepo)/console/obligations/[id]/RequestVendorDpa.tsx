'use client'

// DPO action on an obligation: chase a vendor's Reg 15 DPA status (E3). Lists the
// org's data_recipients (vendors), then for the chosen vendor creates an
// obligation-linked vendor task and mints a vendor_dpa access_link via the
// RLS-scoped mint_access_link RPC (the RPC re-checks the recipient belongs to the
// caller's org). The raw link is shown ONCE (token stored only hashed). When the
// vendor submits, the DB writes back has_dpa/dates onto the vendor record and
// arms the annual re-chase - obligation status is NOT touched (the DPO judges).
import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/brand/Button'
import { VENDOR_DPA_QSET_ID } from '@/lib/ledger/seed-vendor-dpa-questions'

const EXPIRY_DAYS = 21

interface Vendor { id: string; name: string }

export function RequestVendorDpa({
  supabase,
  orgId,
  obligationId,
  orgName,
  onCreated,
}: {
  supabase: SupabaseClient
  orgId: string
  obligationId: string
  orgName: string
  onCreated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [vendors, setVendors] = useState<Vendor[] | null>(null)
  const [vendorId, setVendorId] = useState('')
  const [displayName, setDisplayName] = useState(orgName)
  const [phase, setPhase] = useState<'idle' | 'minting' | 'done' | 'error'>('idle')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || vendors !== null) return
    ;(async () => {
      const { data } = await supabase.from('data_recipients').select('id, name').eq('org_id', orgId).order('name')
      setVendors((data ?? []) as Vendor[])
      if (data && data.length) setVendorId((data[0] as Vendor).id)
    })()
  }, [open, vendors, supabase, orgId])

  async function create() {
    if (!vendorId) return
    setPhase('minting')
    try {
      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({ org_id: orgId, obligation_id: obligationId, assignee_actor: 'vendor', title: 'בקשת אישור הסכם עיבוד מספק', status: 'open' })
        .select('id')
        .single()
      if (taskErr || !task) throw new Error(taskErr?.message || 'task insert failed')

      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data: token, error: mintErr } = await supabase.rpc('mint_access_link', {
        p_purpose: 'vendor_dpa',
        p_task_id: task.id,
        p_org_display_name: displayName.trim() || orgName,
        p_q_asset_template_id: VENDOR_DPA_QSET_ID,
        p_expires_at: expiresAt,
        p_target_recipient_id: vendorId,
      })
      if (mintErr || !token) throw new Error(mintErr?.message || 'mint failed')

      setLink(`${window.location.origin}/link/${token}`)
      setPhase('done')
      onCreated?.()
    } catch {
      setPhase('error')
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        בקשת אישור DPA מספק
      </Button>
    )
  }

  if (phase === 'done') {
    return (
      <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
        <p className="t-body-sm" style={{ margin: 0, fontWeight: 600 }}>הקישור נוצר. העתיקו אותו עכשיו - לא נוכל להציג אותו שוב.</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="dp-input" readOnly value={link} style={{ flex: 1, minWidth: 240 }} onFocus={(e) => e.currentTarget.select()} />
          <Button variant="secondary" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* clipboard blocked */ } }}>
            {copied ? 'הועתק' : 'העתקה'}
          </Button>
        </div>
        <p className="t-caption" style={{ color: 'var(--fg-3)' }}>שלחו לספק. תקף ל-{EXPIRY_DAYS} ימים, לשימוש חד-פעמי.</p>
      </div>
    )
  }

  if (vendors !== null && vendors.length === 0) {
    return (
      <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
        <p className="t-body-sm" style={{ margin: 0 }}>אין ספקים רשומים. יש להוסיף ספק לפני שליחת בקשה.</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>סגירה</Button>
      </div>
    )
  }

  return (
    <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
      <label className="t-body-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        ספק
        <select className="dp-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={vendors === null}>
          {vendors === null ? <option>טוען…</option> : vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </label>
      <label className="t-body-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        שם לתצוגה (מה שהספק יראה)
        <input className="dp-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="sm" disabled={phase === 'minting' || !vendorId} onClick={create}>
          {phase === 'minting' ? 'יוצר…' : 'יצירת קישור'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setPhase('idle') }}>ביטול</Button>
      </div>
      {phase === 'error' ? <p className="t-body-sm" style={{ color: 'var(--status-risk)' }}>יצירת הקישור נכשלה. נסו שוב.</p> : null}
    </div>
  )
}

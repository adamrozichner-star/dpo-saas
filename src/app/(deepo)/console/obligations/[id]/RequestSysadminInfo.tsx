'use client'

// DPO action on an obligation: request system info from the sysadmin (E2).
// Creates an obligation-linked sysadmin task, then mints a sysadmin_questionnaire
// access_link via the RLS-scoped mint_access_link RPC (SECURITY INVOKER - runs as
// the authed DPO under RLS; no service-role). The raw link is shown ONCE: it is
// derived from the crypto token that the DB stores only hashed, so it cannot be
// retrieved again. Obligation status is NOT touched here (the DPO judges later).
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/brand/Button'
import { SYSADMIN_QSET_ID } from '@/lib/ledger/seed-sysadmin-questions'

const EXPIRY_DAYS = 14

export function RequestSysadminInfo({
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
  const [displayName, setDisplayName] = useState(orgName)
  const [phase, setPhase] = useState<'idle' | 'minting' | 'done' | 'error'>('idle')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  async function create() {
    setPhase('minting')
    setErrMsg('')
    try {
      // 1. obligation-linked sysadmin task (RLS: WITH CHECK org_id = current_user_org_id())
      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          org_id: orgId,
          obligation_id: obligationId,
          assignee_actor: 'sysadmin',
          title: 'שאלון אבטחה לסיסטם',
          status: 'open',
        })
        .select('id')
        .single()
      if (taskErr || !task) throw new Error(taskErr?.message || 'task insert failed')

      // 2. mint the tokenized link (RLS-scoped RPC); raw token returned ONCE
      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data: token, error: mintErr } = await supabase.rpc('mint_access_link', {
        p_purpose: 'sysadmin_questionnaire',
        p_task_id: task.id,
        p_org_display_name: displayName.trim() || orgName,
        p_q_asset_template_id: SYSADMIN_QSET_ID,
        p_expires_at: expiresAt,
      })
      if (mintErr || !token) throw new Error(mintErr?.message || 'mint failed')

      setLink(`${window.location.origin}/link/${token}`)
      setPhase('done')
      onCreated?.()
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'שגיאה')
      setPhase('error')
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        בקשת מידע מהסיסטם
      </Button>
    )
  }

  if (phase === 'done') {
    return (
      <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
        <p className="t-body-sm" style={{ margin: 0, fontWeight: 600 }}>הקישור נוצר. העתיקו אותו עכשיו - לא נוכל להציג אותו שוב.</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="dp-input" readOnly value={link} style={{ flex: 1, minWidth: 240 }} onFocus={(e) => e.currentTarget.select()} />
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* clipboard blocked */ }
            }}
          >
            {copied ? 'הועתק' : 'העתקה'}
          </Button>
        </div>
        <p className="t-caption" style={{ color: 'var(--fg-3)' }}>שלחו את הקישור לסיסטם. תקף ל-{EXPIRY_DAYS} ימים, לשימוש חד-פעמי.</p>
      </div>
    )
  }

  return (
    <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
      <label className="t-body-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        שם לתצוגה (מה שהסיסטם יראה)
        <input className="dp-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="sm" disabled={phase === 'minting'} onClick={create}>
          {phase === 'minting' ? 'יוצר…' : 'יצירת קישור'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setPhase('idle') }}>ביטול</Button>
      </div>
      {phase === 'error' ? <p className="t-body-sm" style={{ color: 'var(--status-risk)' }}>יצירת הקישור נכשלה. נסו שוב.</p> : null}
    </div>
  )
}

'use client'

// DPO action: mint a DSAR (בקשת עיון) intake link (E4, behind DSAR_PASSTHROUGH).
// DSAR links are not obligation/task bound - mint_access_link's dsar branch
// inserts a link with null task/obligation/question-set and denormalizes the org's
// DPO notify email. The raw link is shown ONCE (token stored only hashed). The
// subject submits via the PII-free pass-through route; nothing identifying is
// persisted.
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/brand/Button'

const EXPIRY_DAYS = 30

export function RequestDsarLink({ supabase, orgName }: { supabase: SupabaseClient; orgName: string }) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(orgName)
  const [phase, setPhase] = useState<'idle' | 'minting' | 'done' | 'error'>('idle')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  async function create() {
    setPhase('minting')
    try {
      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data: token, error } = await supabase.rpc('mint_access_link', {
        p_purpose: 'dsar',
        p_task_id: null,
        p_org_display_name: displayName.trim() || orgName,
        p_q_asset_template_id: null,
        p_expires_at: expiresAt,
        p_target_recipient_id: null,
      })
      if (error || !token) throw new Error(error?.message || 'mint failed')
      setLink(`${window.location.origin}/link/${token}`)
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        יצירת קישור בקשת עיון
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
        <p className="t-caption" style={{ color: 'var(--fg-3)' }}>שלחו לנושא המידע. תקף ל-{EXPIRY_DAYS} ימים. הפרטים שיוגשו מועברים אליכם ישירות ואינם נשמרים במערכת.</p>
      </div>
    )
  }

  return (
    <div className="dp-oblig-card__meta" style={{ gap: 'var(--space-2)' }}>
      <label className="t-body-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        שם לתצוגה (מה שנושא המידע יראה)
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

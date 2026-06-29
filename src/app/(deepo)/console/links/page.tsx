'use client'

// DPO links management (E2). Lists the current org's access_links and lets the
// DPO revoke an active one. Everything is the authed user under RLS: the SELECT
// returns only this org's links (access_links_org_scope), and revoke is a status
// UPDATE under the same policy. No service-role, no cross-org data. Raw tokens
// are never shown here - they exist only once, at mint time (the obligation
// detail action). This surface shows status, not secrets.
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { Card } from '@/components/brand/Card'
import { PageHeader } from '@/components/ledger'
import { formatShortDate } from '@/components/ledger/format'
import { mapAccessLink, isDsarPassthrough, type AccessLinkDbRow, type AccessLinkView } from '@/lib/console-data'
import { RequestDsarLink } from './RequestDsarLink'

export default function LinksPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [links, setLinks] = useState<AccessLinkView[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!supabase || !org) return
    const { data: rows } = await supabase
      .from('access_links')
      .select('id, purpose, status, obligation_id, org_display_name, created_at, expires_at, used_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
    const linkRows = (rows ?? []) as AccessLinkDbRow[]
    // resolve obligation titles (RLS-scoped) for the links that have one (dsar links do not)
    const obIds = Array.from(new Set(linkRows.map((r) => r.obligation_id).filter((id): id is string => !!id)))
    const titles = new Map<string, string>()
    if (obIds.length) {
      const { data: obs } = await supabase.from('obligations').select('id, title').in('id', obIds)
      for (const o of (obs ?? []) as { id: string; title: string }[]) titles.set(o.id, o.title)
    }
    const now = new Date().toISOString()
    setLinks(linkRows.map((r) => mapAccessLink(r, r.obligation_id ? titles.get(r.obligation_id) ?? null : null, now)))
  }, [supabase, org])

  useEffect(() => {
    load()
  }, [load])

  async function revoke(id: string) {
    if (!supabase || !org) return
    setBusyId(id)
    await supabase.from('access_links').update({ status: 'revoked' }).eq('id', id).eq('org_id', org.id)
    await load()
    setBusyId(null)
  }

  if (authLoading || orgLoading || links === null) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  return (
    <div className="dp-page">
      <Link href="/console" className="dp-led-link dp-page__back">חזרה לקונסולה</Link>
      <PageHeader
        eyebrow="קונסולת ממונה"
        title="קישורי איסוף"
        description="קישורים מאובטחים שנשלחו לסיסטם או לספקים לאיסוף מידע. כדי ליצור קישור לסיסטם או לספק, פתחו את החובה הרלוונטית."
        actions={isDsarPassthrough(org) ? <RequestDsarLink supabase={supabase!} orgName={org.name} /> : undefined}
      />

      <Card>
        <div className="dp-section__head">
          <h2 className="dp-section__title">קישורים</h2>
          <span className="dp-section__count">{links.length}</span>
        </div>
        {links.length === 0 ? (
          <p className="dp-section__empty">עדיין לא נוצרו קישורי איסוף.</p>
        ) : (
          <div className="dp-list">
            {links.map((l) => (
              <div key={l.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{l.purposeLabel}</span>
                <Badge variant={l.statusVariant} data-link-status={l.status}>{l.statusLabel}</Badge>
                {l.obligationTitle ? (
                  <Link href={`/console/obligations/${l.obligationId}`} className="dp-led-link" style={{ fontSize: 'var(--t-body-sm)' }}>
                    {l.obligationTitle}
                  </Link>
                ) : null}
                <span className="dp-led-due">נוצר: {formatShortDate(l.createdAt)}</span>
                <span className="dp-led-due">תוקף: {formatShortDate(l.expiresAt)}</span>
                {l.usedAt ? <span className="dp-led-due">הוגש: {formatShortDate(l.usedAt)}</span> : null}
                {l.isActive ? (
                  <Button variant="ghost" size="sm" disabled={busyId === l.id} onClick={() => revoke(l.id)}>
                    {busyId === l.id ? 'מבטל…' : 'ביטול קישור'}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

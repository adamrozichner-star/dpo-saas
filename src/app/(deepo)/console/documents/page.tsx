'use client'

// F1 - documents as ledger renders. The DPO sees the org's v3 rendered docs
// (source='ledger_render'), each a deterministic render of current ledger state.
// An approved doc is PINNED (content + render_fingerprint + template version);
// when the live ledger render diverges from the pinned fingerprint, the doc is
// flagged "needs refresh" and the DPO can re-approve. All reads/writes are the
// authed DPO under RLS (the v3 pattern, no service-role). Legacy documents
// (no source='ledger_render') are not shown here and untouched.
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { DocumentLifecycleBadge } from '@/components/ledger'
import { DOC_TYPE_LABEL, type DocumentStatus } from '@/components/ledger/status'
import { formatShortDate } from '@/components/ledger/format'
import {
  renderDocument, DOC_TYPES,
  type DocType, type RenderContext, type DocTemplate,
} from '@/lib/ledger/doc-render'
import { fetchOrgDescriptive } from '@/lib/ledger/descriptive'

interface TemplateRow { template_id: string; version: number; name: string; body: string; variables: { doc_type?: string } | null }
interface DocRow {
  id: string
  type: string
  title: string
  content: string | null
  status: DocumentStatus
  version: number | null
  render_fingerprint: string | null
  template_id: string | null
  template_version: number | null
}

export default function DocumentsPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [ctx, setCtx] = useState<RenderContext | null>(null)
  const [templates, setTemplates] = useState<Map<DocType, TemplateRow>>(new Map())
  const [docs, setDocs] = useState<DocRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!supabase || !org) return
    const [dpoRes, assetRes, recipRes, tplRes, docRes, descriptive] = await Promise.all([
      supabase.from('contacts').select('name, email').eq('org_id', org.id).eq('role', 'dpo').limit(1),
      supabase.from('assets').select('name, details').eq('org_id', org.id),
      supabase.from('data_recipients').select('name, has_dpa, dpa_signed_date, dpa_expiry_date').eq('org_id', org.id),
      supabase.from('hub_document_templates').select('template_id, version, name, body, variables').eq('active', true),
      supabase.from('documents').select('id, type, title, content, status, version, render_fingerprint, template_id, template_version').eq('org_id', org.id).eq('source', 'ledger_render').order('updated_at', { ascending: false }),
      fetchOrgDescriptive(org.id, supabase), // F2d: ledger-first descriptive (profile + DPO license), legacy fallback
    ])
    const dpo = (dpoRes.data?.[0] as { name: string | null; email: string | null } | undefined) ?? null
    setCtx({
      org: { name: org.name },
      dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: descriptive.dpoLicense } : null,
      profile: descriptive.profile,
      assets: (assetRes.data ?? []) as RenderContext['assets'],
      recipients: (recipRes.data ?? []) as RenderContext['recipients'],
    })
    const tmap = new Map<DocType, TemplateRow>()
    for (const t of (tplRes.data ?? []) as TemplateRow[]) {
      const dt = t.variables?.doc_type
      if (dt && (DOC_TYPES as string[]).includes(dt)) tmap.set(dt as DocType, t)
    }
    setTemplates(tmap)
    setDocs((docRes.data ?? []) as DocRow[])
  }, [supabase, org])

  useEffect(() => { load() }, [load])

  // current render for a doc type (live), using the matching active template
  function liveRender(type: DocType): { content: string; fingerprint: string; template: TemplateRow } | null {
    const t = templates.get(type)
    if (!t || !ctx) return null
    const tpl: DocTemplate = { templateId: t.template_id, version: t.version, body: t.body }
    const r = renderDocument(type, tpl, ctx)
    return { ...r, template: t }
  }

  async function createDoc(type: DocType) {
    if (!supabase || !org) return
    const live = liveRender(type)
    if (!live) return
    setBusy(type)
    await supabase.from('documents').insert({
      org_id: org.id, type, title: live.template.name, content: live.content,
      status: 'pending_review', version: 1, source: 'ledger_render',
      render_fingerprint: live.fingerprint, template_id: live.template.template_id, template_version: live.template.version,
    })
    await load()
    setBusy(null)
  }

  // approve or re-approve: pin the CURRENT live render (content + fingerprint +
  // template version), archive any prior active doc of the same type.
  async function approve(doc: DocRow) {
    if (!supabase || !org) return
    const live = liveRender(doc.type as DocType)
    if (!live) return
    setBusy(doc.id)
    await supabase.from('documents').update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('org_id', org.id).eq('type', doc.type).eq('status', 'active').neq('id', doc.id)
    await supabase.from('documents').update({
      status: 'active', content: live.content, render_fingerprint: live.fingerprint,
      template_id: live.template.template_id, template_version: live.template.version,
      approved_at: new Date().toISOString(), approved_by: user?.id ?? null,
      version: (doc.version ?? 1) + (doc.status === 'active' ? 1 : 0),
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id).eq('org_id', org.id)
    await load()
    setBusy(null)
  }

  async function downloadPdf(doc: DocRow) {
    // Reuse the legacy /api/generate-pdf (unchanged): it returns styled, RTL HTML
    // from { title, content, orgName } (auth-gated); open it for browser print-to-PDF.
    if (!supabase || !org) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ title: doc.title, content: doc.content ?? '', orgName: org.name }),
    })
    if (!res.ok) return
    const html = await res.text()
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (authLoading || orgLoading || docs === null || !ctx) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  const existingTypes = new Set(docs.map((d) => d.type))
  const creatable = DOC_TYPES.filter((t) => templates.has(t) && !existingTypes.has(t))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 900 }}>
      <Link href="/console" className="dp-led-link">חזרה לקונסולה</Link>
      <header>
        <h1 className="t-h2" style={{ margin: 0 }}>מסמכים</h1>
        <p className="t-body-sm" style={{ color: 'var(--fg-3)' }}>
          מסמכים הנגזרים אוטומטית ממצב הציות. מסמך מאושר נשמר כפי שאושר; אם מצב הציות השתנה, תופיע התראה לרענון.
        </p>
      </header>

      {creatable.length ? (
        <section>
          <p className="t-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>יצירת מסמך</p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {creatable.map((t) => (
              <Button key={t} variant="secondary" size="sm" disabled={busy === t} onClick={() => createDoc(t)}>
                {busy === t ? 'יוצר…' : DOC_TYPE_LABEL[t] ?? t}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {docs.length === 0 ? (
        <p className="t-body-sm">עדיין לא נוצרו מסמכים.</p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {docs.map((doc) => {
            const live = liveRender(doc.type as DocType)
            const diverged = doc.status === 'active' && live != null && live.fingerprint !== doc.render_fingerprint
            const isOpen = openId === doc.id
            return (
              <div key={doc.id} className="dp-oblig-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="dp-oblig-row__title">{DOC_TYPE_LABEL[doc.type] ?? doc.title}</span>
                  <DocumentLifecycleBadge status={doc.status} />
                  {diverged ? <Badge variant="warn" dot>ממתין לרענון</Badge> : null}
                  <span className="dp-led-due" style={{ marginInlineStart: 'auto' }}>גרסה {doc.version ?? 1}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Button variant="ghost" size="sm" onClick={() => setOpenId(isOpen ? null : doc.id)}>{isOpen ? 'הסתרה' : 'תצוגה'}</Button>
                  {(doc.status === 'pending_review' || doc.status === 'pending_approval') ? (
                    <Button variant="primary" size="sm" disabled={busy === doc.id} onClick={() => approve(doc)}>אישור</Button>
                  ) : null}
                  {diverged ? (
                    <Button variant="primary" size="sm" disabled={busy === doc.id} onClick={() => approve(doc)}>רענון ואישור מחדש</Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => downloadPdf(doc)}>הדפסה / PDF</Button>
                </div>
                {isOpen ? (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <pre className="t-body-sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', margin: 0 }}>{doc.content}</pre>
                    {diverged && live ? (
                      <div>
                        <p className="t-caption" style={{ color: 'var(--status-warn)', marginTop: 0 }}>הרינדור העדכני (יוחל באישור מחדש):</p>
                        <pre className="t-body-sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--status-warn-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', margin: 0 }}>{live.content}</pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

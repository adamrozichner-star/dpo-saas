'use client'

// F2a - Certify. Assembles the org's ledger (obligations + state + provenance +
// evidence chains from E1-E4 + control schedules + F1 approved docs) into a
// regulator-ready audit pack via the pure buildAuditPack mapper. Generating a
// pack RECORDS an immutable snapshot row (audit_packs) - "we were certify-ready
// as of date X, here is exactly what we certified". Drift indicator: the latest
// recorded pack's fingerprint vs the live assembly. All reads/writes are the
// authed DPO under RLS (no service-role). Reuses /api/generate-pdf for export.
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Badge } from '@/components/brand/Badge'
import { Button } from '@/components/brand/Button'
import { formatShortDate } from '@/components/ledger/format'
import { mapRuleProvenance, type RuleDbRow } from '@/lib/console-data'
import {
  buildAuditPack,
  type AuditPack, type AuditPackInput, type AuditObligation, type AuditDoc,
} from '@/lib/ledger/audit-pack'

interface PackRow { id: string; generated_at: string; pack_fingerprint: string; summary: { obligations?: number; evidence?: number; controls?: number; documents?: number } }

export default function AuditPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [live, setLive] = useState<AuditPack | null>(null)
  const [packs, setPacks] = useState<PackRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!supabase || !org) return
    const [obRes, evRes, ctRes, pbRes, dpoRes, docRes, packRes, orgRes, descRes] = await Promise.all([
      supabase.from('obligations').select('id, title, status, severity, source_rule_id, source_version, status_changed_at, fulfilled_by_control_id').eq('org_id', org.id),
      supabase.from('evidence').select('obligation_id, kind, captured_at, captured_via, answer_ref').eq('org_id', org.id),
      supabase.from('controls').select('id, source_playbook_id, source_playbook_version, cadence, next_due_at, last_completed_at').eq('org_id', org.id),
      supabase.from('hub_control_playbooks').select('template_id, version, name'),
      supabase.from('contacts').select('name').eq('org_id', org.id).eq('role', 'dpo').limit(1),
      supabase.from('documents').select('type, title, version, approved_at, render_fingerprint').eq('org_id', org.id).eq('source', 'ledger_render').eq('status', 'active'),
      supabase.from('audit_packs').select('id, generated_at, pack_fingerprint, summary').eq('org_id', org.id).order('generated_at', { ascending: false }),
      // ② controller identity for the regulator-facing header
      supabase.from('organizations').select('business_id').eq('id', org.id).maybeSingle(),
      supabase.from('org_descriptors').select('address').eq('org_id', org.id).maybeSingle(),
    ])

    // provenance: fetch the rules referenced by the obligations
    const ruleKeys = Array.from(new Set(((obRes.data ?? []) as { source_rule_id: string | null; source_version: number | null }[])
      .filter((o) => o.source_rule_id && o.source_version != null).map((o) => `${o.source_rule_id}:${o.source_version}`)))
    const ruleMap = new Map<string, ReturnType<typeof mapRuleProvenance>>()
    if (ruleKeys.length) {
      const ids = ruleKeys.map((k) => k.split(':')[0])
      const { data: rules } = await supabase.from('hub_gap_rules').select('template_id, version, name, severity, source_tier, confidence, remediation_text').in('template_id', ids)
      for (const r of (rules ?? []) as (RuleDbRow & { template_id: string; version: number })[]) ruleMap.set(`${r.template_id}:${r.version}`, mapRuleProvenance(r))
    }

    const pbName = new Map<string, string>()
    for (const p of (pbRes.data ?? []) as { template_id: string; version: number; name: string }[]) pbName.set(`${p.template_id}:${p.version}`, p.name)
    const ctById = new Map<string, { name: string; cadence: string; nextDueAt: string | null; lastCompletedAt: string | null }>()
    for (const c of (ctRes.data ?? []) as { id: string; source_playbook_id: string; source_playbook_version: number; cadence: string; next_due_at: string | null; last_completed_at: string | null }[]) {
      ctById.set(c.id, { name: pbName.get(`${c.source_playbook_id}:${c.source_playbook_version}`) ?? 'בקרה', cadence: c.cadence, nextDueAt: c.next_due_at, lastCompletedAt: c.last_completed_at })
    }
    const evByOb = new Map<string, AuditObligation['evidence']>()
    for (const e of (evRes.data ?? []) as { obligation_id: string; kind: string; captured_at: string | null; captured_via: string | null; answer_ref: string | null }[]) {
      const arr = evByOb.get(e.obligation_id) ?? []
      arr.push({ kind: e.kind, capturedAt: e.captured_at, capturedVia: e.captured_via, ref: e.answer_ref })
      evByOb.set(e.obligation_id, arr)
    }

    const obligations: AuditObligation[] = ((obRes.data ?? []) as Record<string, unknown>[]).map((o) => {
      const prov = o.source_rule_id && o.source_version != null ? ruleMap.get(`${o.source_rule_id}:${o.source_version}`) : undefined
      return {
        id: o.id as string, title: o.title as string, status: o.status as AuditObligation['status'], severity: (o.severity as AuditObligation['severity']) ?? null,
        sourceRuleId: (o.source_rule_id as string) ?? null, sourceVersion: (o.source_version as number) ?? null,
        statusChangedAt: (o.status_changed_at as string) ?? null,
        provenance: prov ? { name: prov.name, sourceTierLabel: prov.sourceTierLabel, confidence: prov.confidence } : null,
        evidence: evByOb.get(o.id as string) ?? [],
        control: o.fulfilled_by_control_id ? ctById.get(o.fulfilled_by_control_id as string) ?? null : null,
      }
    })
    const documents: AuditDoc[] = ((docRes.data ?? []) as Record<string, unknown>[]).map((x) => ({
      type: x.type as string, title: x.title as string, version: (x.version as number) ?? null,
      approvedAt: (x.approved_at as string) ?? null, fingerprint: (x.render_fingerprint as string) ?? null,
    }))
    const dpoName = ((dpoRes.data?.[0] as { name: string | null } | undefined)?.name) ?? null

    const businessId = (orgRes.data as { business_id: string | null } | null)?.business_id ?? null
    const address = (descRes.data as { address: string | null } | null)?.address ?? null
    const input: AuditPackInput = { org: { name: org.name, businessId, address }, score: org.compliance_score ?? null, dpoName, generatedAtIso: new Date().toISOString(), obligations, documents }
    setLive(buildAuditPack(input))
    setPacks((packRes.data ?? []) as PackRow[])
  }, [supabase, org])

  useEffect(() => { load() }, [load])

  async function certify() {
    if (!supabase || !org || !live) return
    setBusy(true)
    await supabase.from('audit_packs').insert({
      org_id: org.id, generated_by: user?.id ?? null,
      pack_fingerprint: live.fingerprint, content: live.content, summary: live.summary,
    })
    await load()
    setBusy(false)
  }

  async function exportPdf(content: string) {
    if (!supabase || !org) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate-pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ title: 'תיק היערכות', content, orgName: org.name }),
    })
    if (!res.ok) return
    const html = await res.text()
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (authLoading || orgLoading || live === null || packs === null) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  const latest = packs[0]
  const drift = !latest ? 'none' : latest.pack_fingerprint === live.fingerprint ? 'current' : 'drifted'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 900 }}>
      <Link href="/console" className="dp-led-link">חזרה לקונסולה</Link>
      <header>
        <h1 className="t-h2" style={{ margin: 0 }}>תיק היערכות (Certify)</h1>
        <p className="t-body-sm" style={{ color: 'var(--fg-3)' }}>
          הספר רנדר כראיה: כל חובה, מקורה, שרשרת הראיות, לוח הבקרות והמסמכים המאושרים - תיק אחד שניתן להגיש לרגולטור.
        </p>
      </header>

      <section className="dp-oblig-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="dp-oblig-row__title">התיק הנוכחי</span>
          {drift === 'none' ? <Badge variant="neutral">טרם הופק תיק</Badge> : null}
          {drift === 'current' ? <Badge variant="ok">תואם לתיק האחרון</Badge> : null}
          {drift === 'drifted' ? <Badge variant="warn" dot>מצב הציות השתנה מאז התיק האחרון</Badge> : null}
        </div>
        <p className="t-body-sm" style={{ margin: 0, color: 'var(--fg-3)' }}>
          {live.summary.obligations} חובות · {live.summary.evidence} ראיות · {live.summary.controls} בקרות · {live.summary.documents} מסמכים · טביעת אצבע {live.fingerprint}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" disabled={busy} onClick={certify}>{busy ? 'מפיק…' : 'הפקת תיק (Certify)'}</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowContent((s) => !s)}>{showContent ? 'הסתרה' : 'תצוגה'}</Button>
          <Button variant="ghost" size="sm" onClick={() => exportPdf(live.content)}>הדפסה / PDF</Button>
        </div>
        {showContent ? <pre className="t-body-sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', margin: 0 }}>{live.content}</pre> : null}
      </section>

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>תיקים שהופקו ({packs.length})</p>
        {packs.length === 0 ? (
          <p className="t-body-sm">עדיין לא הופקו תיקים.</p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {packs.map((p) => (
              <div key={p.id} className="dp-oblig-row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span className="dp-oblig-row__title">{formatShortDate(p.generated_at)}</span>
                <span className="dp-led-due">{p.summary.obligations ?? 0} חובות · {p.summary.evidence ?? 0} ראיות · {p.summary.documents ?? 0} מסמכים</span>
                <span className="dp-led-prov" style={{ marginInlineStart: 'auto' }}>{p.pack_fingerprint}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

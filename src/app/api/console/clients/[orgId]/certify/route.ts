// Task 3b: curator certifies (produces an audit pack for) an ASSIGNED client.
// Book check BEFORE any read/write. EVERY ledger fetch below is scoped by the path
// orgId via service-role - never by ambient current_user_org_id() - so the pack
// content belongs to the client being certified, not the curator's own org.
// Additive: audit_packs_org_insert RLS untouched (own-org certify still uses it).
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, requireCuratorForOrg } from '@/lib/api-auth'
import { mapRuleProvenance, scoreFromObligations, type RuleDbRow, type ScoreObligation } from '@/lib/console-data'
import { buildAuditPack, type AuditPackInput, type AuditObligation, type AuditDoc } from '@/lib/ledger/audit-pack'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Assemble the pack input from ONE org's ledger. Every query carries .eq('org_id', orgId).
async function assembleAuditInput(orgId: string, sb: SupabaseClient, generatedAtIso: string): Promise<AuditPackInput> {
  const [orgRes, descRes, dpoRes, obRes, evRes, ctRes, pbRes, docRes] = await Promise.all([
    sb.from('organizations').select('name, business_id').eq('id', orgId).single(),
    sb.from('org_descriptors').select('address').eq('org_id', orgId).maybeSingle(),
    sb.from('contacts').select('name').eq('org_id', orgId).eq('role', 'dpo').limit(1),
    sb.from('obligations').select('id, title, status, severity, source_rule_id, source_version, status_changed_at, fulfilled_by_control_id').eq('org_id', orgId),
    sb.from('evidence').select('obligation_id, kind, captured_at, captured_via, answer_ref').eq('org_id', orgId),
    sb.from('controls').select('id, source_playbook_id, source_playbook_version, cadence, next_due_at, last_completed_at').eq('org_id', orgId),
    sb.from('hub_control_playbooks').select('template_id, version, name'),
    sb.from('documents').select('type, title, version, approved_at, render_fingerprint').eq('org_id', orgId).eq('source', 'ledger_render').eq('status', 'active'),
  ])
  const org = orgRes.data as { name: string; business_id: string | null }
  const businessId = org.business_id ?? null
  const address = (descRes.data as { address: string | null } | null)?.address ?? null
  const dpoName = ((dpoRes.data?.[0] as { name: string | null } | undefined)?.name) ?? null

  const obRows = (obRes.data ?? []) as Record<string, unknown>[]
  // rule provenance for the obligations' source rules
  const ruleKeys = Array.from(new Set(obRows.filter((o) => o.source_rule_id && o.source_version != null).map((o) => `${o.source_rule_id}:${o.source_version}`)))
  const ruleMap = new Map<string, ReturnType<typeof mapRuleProvenance>>()
  if (ruleKeys.length) {
    const ids = ruleKeys.map((k) => k.split(':')[0])
    const { data: rules } = await sb.from('hub_gap_rules').select('template_id, version, name, severity, source_tier, confidence, remediation_text').in('template_id', ids)
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
  const obligations: AuditObligation[] = obRows.map((o) => {
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
    type: x.type as string, title: x.title as string, version: (x.version as number) ?? null, approvedAt: (x.approved_at as string) ?? null, fingerprint: (x.render_fingerprint as string) ?? null,
  }))
  const score = scoreFromObligations(obligations.map((o) => ({ status: o.status, severity: o.severity }) as ScoreObligation))
  return { org: { name: org.name, businessId, address }, score, dpoName, generatedAtIso, obligations, documents }
}

export async function POST(request: NextRequest, { params }: { params: { orgId: string } }) {
  const sb = getServiceSupabase()
  const gate = await requireCuratorForOrg(request, params.orgId, sb)
  if (!gate.ok) return gate.response
  const { curator } = gate

  const input = await assembleAuditInput(params.orgId, sb, new Date().toISOString())
  const pack = buildAuditPack(input)
  const { data, error } = await sb.from('audit_packs').insert({
    org_id: params.orgId, generated_by: curator.userId, pack_fingerprint: pack.fingerprint, content: pack.content, summary: pack.summary,
  }).select('id').single()
  if (error) return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  return NextResponse.json({ ok: true, id: (data as { id: string }).id, fingerprint: pack.fingerprint })
}

// Task 3b: curator approves a ledger-render document for an ASSIGNED client. Book
// check BEFORE any read/write. The document is re-rendered server-side from the
// CLIENT's ledger (every fetch scoped by the path orgId), pinned exactly as the
// own-org /console/documents approve does. Additive: documents_insert/update_own
// RLS untouched (own-org approve still flows through it).
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, requireCuratorForOrg } from '@/lib/api-auth'
import { fetchOrgDescriptive } from '@/lib/ledger/descriptive'
import { renderDocument, DOC_TYPES, type DocType, type RenderContext } from '@/lib/ledger/doc-render'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { orgId: string; docId: string } }) {
  const sb = getServiceSupabase()
  const gate = await requireCuratorForOrg(request, params.orgId, sb)
  if (!gate.ok) return gate.response
  const { curator } = gate

  // The doc, scoped to the client.
  const { data: doc } = await sb
    .from('documents')
    .select('id, type, status, version')
    .eq('id', params.docId).eq('org_id', params.orgId).eq('source', 'ledger_render')
    .maybeSingle()
  if (!doc) return NextResponse.json({ error: 'document not found' }, { status: 404 })
  const d = doc as { id: string; type: string; status: string; version: number | null }
  const docType = d.type as DocType
  if (!(DOC_TYPES as string[]).includes(docType)) return NextResponse.json({ error: 'unsupported type' }, { status: 400 })

  // Render context for THIS client (scoped by orgId).
  const [orgRes, dpoRes, assetRes, recipRes, tplRes, descriptive] = await Promise.all([
    sb.from('organizations').select('name').eq('id', params.orgId).single(),
    sb.from('contacts').select('name, email').eq('org_id', params.orgId).eq('role', 'dpo').limit(1),
    sb.from('assets').select('name, details').eq('org_id', params.orgId),
    sb.from('data_recipients').select('name, has_dpa, dpa_signed_date, dpa_expiry_date').eq('org_id', params.orgId),
    sb.from('hub_document_templates').select('template_id, version, body, variables').eq('active', true),
    fetchOrgDescriptive(params.orgId, sb),
  ])
  const dpo = (dpoRes.data?.[0] as { name: string | null; email: string | null } | undefined) ?? null
  const ctx: RenderContext = {
    org: { name: (orgRes.data as { name: string }).name },
    dpo: dpo ? { name: dpo.name, email: dpo.email, license_number: descriptive.dpoLicense } : null,
    profile: descriptive.profile,
    assets: (assetRes.data ?? []) as RenderContext['assets'],
    recipients: (recipRes.data ?? []) as RenderContext['recipients'],
  }
  const tpl = ((tplRes.data ?? []) as { template_id: string; version: number; body: string; variables: { doc_type?: string } | null }[])
    .find((t) => t.variables?.doc_type === docType)
  if (!tpl) return NextResponse.json({ error: 'no active template' }, { status: 400 })

  const { content, fingerprint } = renderDocument(docType, { templateId: tpl.template_id, version: tpl.version, body: tpl.body }, ctx)

  // Archive any prior active doc of this type, then pin the current render.
  await sb.from('documents').update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('org_id', params.orgId).eq('type', docType).eq('status', 'active').neq('id', d.id)
  const { error: updErr } = await sb.from('documents').update({
    status: 'active', content, render_fingerprint: fingerprint,
    template_id: tpl.template_id, template_version: tpl.version,
    approved_at: new Date().toISOString(), approved_by: curator.userId,
    version: (d.version ?? 1) + (d.status === 'active' ? 1 : 0),
    updated_at: new Date().toISOString(),
  }).eq('id', d.id).eq('org_id', params.orgId)
  if (updErr) return NextResponse.json({ error: 'approve_failed' }, { status: 500 })

  return NextResponse.json({ ok: true, fingerprint })
}

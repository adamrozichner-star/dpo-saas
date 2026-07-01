// Pilot task 3: the per-client READ drill-down. orgId is a path param (an IDOR
// surface), so it is gated through the SINGLE shared chokepoint curatorOwnsOrg -
// the org is readable iff it is in this curator's book (organizations.dpo_id =
// their dpos.id). Read-only here; Task-3b adds the curator WRITE routes through the
// same chokepoint without touching the existing own-org RLS policies.
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, authenticateCurator, curatorOwnsOrg, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { orgId: string } }) {
  const curator = await authenticateCurator(request)
  if (!curator) {
    const hasToken = request.headers.get('authorization')?.startsWith('Bearer ')
    return hasToken ? forbiddenResponse('not a curator') : unauthorizedResponse()
  }

  // The firewall: a curator may only open an org in their book.
  const inBook = await curatorOwnsOrg(curator, params.orgId)
  if (!inBook) return forbiddenResponse('org not in your book')

  // Every fetch is scoped to the path org (service-role read behind the chokepoint).
  // Returns the full per-client drill-down: status + the four sections (queue,
  // documents, audit packs, collection links) that used to be top-level own-org.
  const sb = getServiceSupabase()
  const [orgRes, obRes, ctRes, pbRes, qRes, docRes, linkRes, packRes] = await Promise.all([
    sb.from('organizations').select('id, name, status, compliance_score').eq('id', params.orgId).single(),
    sb.from('obligations').select('id, title, status, severity, source_rule_id, source_version, recurs_at').eq('org_id', params.orgId).order('severity', { ascending: true }),
    sb.from('controls').select('source_playbook_id, source_playbook_version, cadence, next_due_at, owner_role, status').eq('org_id', params.orgId),
    sb.from('hub_control_playbooks').select('template_id, version, name'),
    sb.from('dpo_queue').select('id, type, priority, status, title, deadline_at').eq('org_id', params.orgId).eq('status', 'pending').order('deadline_at', { ascending: true, nullsFirst: false }),
    sb.from('documents').select('id, type, title, status, version, approved_at').eq('org_id', params.orgId).eq('source', 'ledger_render').order('updated_at', { ascending: false }),
    sb.from('access_links').select('id, purpose, status, obligation_id, created_at, expires_at, used_at').eq('org_id', params.orgId).order('created_at', { ascending: false }),
    sb.from('audit_packs').select('id, generated_at, pack_fingerprint, summary').eq('org_id', params.orgId).order('generated_at', { ascending: false }),
  ])
  if (orgRes.error) return NextResponse.json({ error: 'query_failed' }, { status: 500 })

  return NextResponse.json({
    org: orgRes.data,
    obligations: obRes.data ?? [],
    controls: ctRes.data ?? [],
    playbooks: pbRes.data ?? [],
    queue: qRes.data ?? [],
    documents: docRes.data ?? [],
    links: linkRes.data ?? [],
    packs: packRes.data ?? [],
  })
}

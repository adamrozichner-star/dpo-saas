// Pilot task 3: the curator-scoped client list + overview metrics. A DPO sees ONLY
// the orgs assigned to them (organizations.dpo_id = their dpos.id). dpoId is derived
// server-side from the verified JWT (authenticateCurator); no client-supplied id is
// read here, so a curator cannot widen their book. Service-role does the cross-org
// read; the dpo_id filter is the firewall. Every count is scoped to the book, never
// global.
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, authenticateCurator, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { scoreFromObligations, type ScoreObligation } from '@/lib/console-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const curator = await authenticateCurator(request)
  if (!curator) {
    const hasToken = request.headers.get('authorization')?.startsWith('Bearer ')
    return hasToken ? forbiddenResponse('not a curator') : unauthorizedResponse()
  }

  const sb = getServiceSupabase()
  const { data: orgRows, error } = await sb
    .from('organizations')
    .select('id, name, status')
    .eq('dpo_id', curator.dpoId) // the ONLY scope
    .order('name')
  if (error) {
    console.error('clients query failed:', error.message)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }
  const orgs = (orgRows ?? []) as { id: string; name: string; status: string | null }[]
  const ids = orgs.map((o) => o.id)

  // Per-client, scoped to the book ids (never global):
  //  - score        = LIVE, derived from obligation state (scoreFromObligations) -
  //                   NOT the stale stored organizations.compliance_score
  //  - openGaps     = obligations not yet compliant
  //  - awaitingReview = dpo_queue items pending the DPO's judgment
  const obsByOrg: Record<string, ScoreObligation[]> = {}
  const gapByOrg: Record<string, number> = {}
  const reviewByOrg: Record<string, number> = {}
  if (ids.length) {
    const { data: obs } = await sb.from('obligations').select('org_id, status, severity').in('org_id', ids)
    for (const o of (obs ?? []) as { org_id: string; status: ScoreObligation['status']; severity: ScoreObligation['severity'] }[]) {
      ;(obsByOrg[o.org_id] ??= []).push({ status: o.status, severity: o.severity })
      if (o.status !== 'compliant') gapByOrg[o.org_id] = (gapByOrg[o.org_id] ?? 0) + 1
    }
    // dpo_queue may be empty; tolerate a missing table / error as zero.
    const { data: q } = await sb.from('dpo_queue').select('org_id, status').in('org_id', ids)
    for (const r of (q ?? []) as { org_id: string; status: string }[]) {
      if (r.status === 'pending') reviewByOrg[r.org_id] = (reviewByOrg[r.org_id] ?? 0) + 1
    }
  }

  const clients = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    status: o.status,
    score: scoreFromObligations(obsByOrg[o.id] ?? []),
    openGaps: gapByOrg[o.id] ?? 0,
    awaitingReview: reviewByOrg[o.id] ?? 0,
  }))

  const metrics = {
    activeClients: orgs.filter((o) => o.status === 'active').length,
    stuckInOnboarding: orgs.filter((o) => o.status === 'onboarding').length,
    awaitingReview: clients.reduce((n, c) => n + c.awaitingReview, 0),
    openGaps: clients.reduce((n, c) => n + c.openGaps, 0),
  }

  return NextResponse.json({ clients, metrics })
}

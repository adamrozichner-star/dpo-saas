// Task 3b: curator resolves a dpo_queue item for an ASSIGNED client. The book
// check (requireCuratorForOrg) runs BEFORE any mutation; out-of-book -> 403, no
// row touched. Service-role write, scoped to the path orgId. Additive: the own-org
// dpo_queue_update_own_org RLS policy is untouched (own-org resolves still flow
// through it via /console/queue).
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, requireCuratorForOrg } from '@/lib/api-auth'
import { buildResolveWrite, type ResolutionType } from '@/lib/console-data'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { orgId: string; itemId: string } }) {
  const sb = getServiceSupabase()
  const gate = await requireCuratorForOrg(request, params.orgId, sb)
  if (!gate.ok) return gate.response
  const { curator } = gate

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const resolutionType = String((body as Record<string, unknown>).resolutionType ?? 'manual') as ResolutionType
  const notes = String((body as Record<string, unknown>).notes ?? '')

  const w = buildResolveWrite({
    itemId: params.itemId,
    orgId: params.orgId,
    userId: curator.userId ?? curator.authUserId,
    resolutionType,
    notes,
    actor: curator.userName ?? curator.userRole ?? 'ממונה',
    nowIso: new Date().toISOString(),
  })

  // Scoped to the path org; if 0 rows, the item is not this client's -> 404.
  const { data: updated, error: updErr } = await sb
    .from('dpo_queue').update(w.update).eq('id', params.itemId).eq('org_id', params.orgId).select('id')
  if (updErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'item not found' }, { status: 404 })

  await sb.from('events').insert(w.event)
  return NextResponse.json({ ok: true })
}

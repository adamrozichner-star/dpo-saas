// Reuse milestone: the book-wide Approvals inbox. Aggregates pending dpo_queue
// items across the curator's WHOLE book, scoped by the JWT-derived dpo_id - NEVER
// globally (this is the single new cross-client read surface, so it's where a
// "shows all orgs" regression could creep in). An org outside the curator's book
// can never contribute an item: we first resolve the book org ids by dpo_id, then
// only query dpo_queue for those ids. Resolving an item goes through the per-client
// book-verified resolve route.
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, authenticateCurator, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const curator = await authenticateCurator(request)
  if (!curator) {
    const hasToken = request.headers.get('authorization')?.startsWith('Bearer ')
    return hasToken ? forbiddenResponse('not a curator') : unauthorizedResponse()
  }

  const sb = getServiceSupabase()
  // 1. the curator's book (the ONLY orgs whose items may appear)
  const { data: orgRows } = await sb.from('organizations').select('id, name').eq('dpo_id', curator.dpoId)
  const orgs = (orgRows ?? []) as { id: string; name: string }[]
  const nameById = new Map(orgs.map((o) => [o.id, o.name]))
  const bookIds = orgs.map((o) => o.id)
  if (bookIds.length === 0) return NextResponse.json({ items: [] })

  // 2. pending queue items, restricted to the book ids - never a global scan
  const { data: q, error } = await sb
    .from('dpo_queue')
    .select('id, org_id, type, priority, status, title, deadline_at, created_at')
    .in('org_id', bookIds)
    .eq('status', 'pending')
    .order('deadline_at', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 })

  const items = (q ?? []).map((r) => {
    const row = r as { id: string; org_id: string; type: string; priority: string; status: string; title: string; deadline_at: string | null; created_at: string }
    return { id: row.id, orgId: row.org_id, orgName: nameById.get(row.org_id) ?? '-', type: row.type, priority: row.priority, title: row.title, deadlineAt: row.deadline_at }
  })
  return NextResponse.json({ items })
}

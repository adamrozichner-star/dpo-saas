// Pilot task 2: the curator-scoped client list - the data foundation for the v3
// DPO cross-client overview. A DPO (expert_curator) sees ONLY the orgs assigned to
// them (organizations.dpo_id = their dpos.id). The dpoId is derived server-side
// from the verified JWT (authenticateCurator); a client-supplied org id is never
// read here, so a curator cannot widen their own scope. Service-role is used for
// the cross-org read, but the dpo_id filter is the firewall.
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase, authenticateCurator, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const curator = await authenticateCurator(request)
  if (!curator) {
    // No token -> 401; valid token but no dpos row -> 403 (not a curator).
    const hasToken = request.headers.get('authorization')?.startsWith('Bearer ')
    return hasToken ? forbiddenResponse('not a curator') : unauthorizedResponse()
  }

  const sb = getServiceSupabase()
  const { data: clients, error } = await sb
    .from('organizations')
    .select('id, name, status, compliance_score')
    .eq('dpo_id', curator.dpoId) // the ONLY scope; never a client-supplied id
    .order('name')

  if (error) {
    console.error('clients query failed:', error.message)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }
  return NextResponse.json({ clients: clients ?? [] })
}

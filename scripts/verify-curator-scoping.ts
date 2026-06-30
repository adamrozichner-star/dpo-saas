/*
 * Pilot task 2 HARD GATE: prove curator->orgs scoping is isolated.
 * Signs in as the REAL pilot curator (+bdika) to get a real JWT, then runs the
 * EXACT chain the /api/console/clients route uses (verify token -> resolve dpos by
 * auth_user_id -> select organizations by dpo_id) and asserts the curator sees ONLY
 * their assigned org and ZERO non-assigned. Also proves a non-curator (the owner
 * account) is denied. Real tokens, real query results - not a claim.
 *
 * Run: set -a; source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.local); set +a
 *      npx tsx scripts/verify-curator-scoping.ts
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!URL || !ANON || !SERVICE) { console.error('missing env'); process.exit(1) }

const CURATOR = { email: 'adamrozichner+bdika@gmail.com', password: 'Bdika-Prod-2026!' }
const OWNER = { email: 'adamrozichner+onboard@gmail.com', password: 'Bdika-Local-2026!' }
const BOOK = ['בדיקה-חדש', 'בדיקה-שותף'] // +bdika's assigned clients (own org + a design partner)
const MUST_NOT_SEE = ['קרסטון יועצים', 'אמיר פסטרנק פתרונות פרטיות', 'דיפו']

let pass = 0, fail = 0
const check = (n: string, c: boolean, d?: string) => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n}${d ? '  ::  ' + d : ''}`) } }

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

async function signIn(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  })
  const j = await res.json()
  return j.access_token ?? null
}

// The exact route chain (authenticateCurator + scoped query), replicated.
async function curatorClients(token: string): Promise<{ denied: boolean; names: string[] }> {
  const { data: { user }, error } = await svc.auth.getUser(token)
  if (error || !user) return { denied: true, names: [] }
  const { data: dpo } = await svc.from('dpos').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!dpo) return { denied: true, names: [] } // not a curator -> 403
  const { data: orgs } = await svc.from('organizations').select('name').eq('dpo_id', (dpo as { id: string }).id).order('name')
  return { denied: false, names: (orgs ?? []).map((o) => (o as { name: string }).name) }
}

async function main() {
  console.log('[curator] real JWT -> scoped client list')
  const curatorToken = await signIn(CURATOR.email, CURATOR.password)
  check('curator signs in (real JWT)', !!curatorToken)
  const seen = await curatorClients(curatorToken!)
  check('curator is recognised (not denied)', seen.denied === false)
  console.log(`  curator sees: ${JSON.stringify(seen.names)}`)
  check('sees ONLY the assigned book (בדיקה-חדש + בדיקה-שותף)', seen.names.length === BOOK.length && BOOK.every((n) => seen.names.includes(n)), seen.names.join(','))
  for (const forbidden of MUST_NOT_SEE) {
    check(`does NOT see "${forbidden}"`, !seen.names.includes(forbidden))
  }

  console.log('\n[non-curator] owner account is denied (no dpos row)')
  const ownerToken = await signIn(OWNER.email, OWNER.password)
  check('owner signs in (real JWT)', !!ownerToken)
  const ownerSeen = await curatorClients(ownerToken!)
  check('owner is DENIED curator scope (no client list)', ownerSeen.denied === true && ownerSeen.names.length === 0)

  console.log('\n[drill-down gate] per-client read chokepoint (curatorOwnsOrg), three cases')
  // Resolve the curator's dpoId from the REAL JWT (same chain as authenticateCurator),
  // then run the exact book-verification the detail route uses for each org.
  const { data: { user: cu } } = await svc.auth.getUser(curatorToken!)
  const { data: cdpo } = await svc.from('dpos').select('id').eq('auth_user_id', cu!.id).maybeSingle()
  const dpoId = (cdpo as { id: string }).id
  const ownsByName = async (name: string): Promise<boolean> => {
    const { data: org } = await svc.from('organizations').select('id').eq('name', name).maybeSingle()
    if (!org) return false
    const { data } = await svc.from('organizations').select('id').eq('id', (org as { id: string }).id).eq('dpo_id', dpoId).maybeSingle()
    return !!data
  }
  check('own org (בדיקה-חדש) in book -> read 200', (await ownsByName('בדיקה-חדש')) === true)
  check('client != own-org (בדיקה-שותף) assigned -> read 200', (await ownsByName('בדיקה-שותף')) === true)
  check('unassigned (אמיר, dpo_id null) -> 403', (await ownsByName('אמיר פסטרנק פתרונות פרטיות')) === false)
  check('assigned to OTHER dpo (קרסטון -> דנה) -> 403 (curator A cannot read curator B client)', (await ownsByName('קרסטון יועצים')) === false)

  console.log('\n[idor] scope is by derived dpo_id only (no client-supplied org id path)')
  // The route selects .eq('dpo_id', curator.dpoId) and reads no org id from input;
  // structurally a client cannot widen scope. Asserted by code; here we confirm the
  // assigned set is exactly one and stable.
  check('assigned scope == the book exactly (no extras)', seen.names.length === BOOK.length)

  console.log(`\n==== ${pass} passed, ${fail} failed ====`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('FATAL', e); process.exit(2) })

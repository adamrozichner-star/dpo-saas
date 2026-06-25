import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// The public tokenized-link endpoint (E1). This is the ONLY no-login surface for
// access_links, and it is deliberately thin: it forwards the token to the two
// SECURITY DEFINER functions and returns their hard-allowlisted payload verbatim.
//
// It uses the ANON key, never the service role, so the route itself cannot
// bypass RLS - the CC-2 containment lives entirely in the DB (the access_link_fn
// role's grants + the functions' return shapes). The route's only jobs are to be
// a stable URL and a single choke point for future rate-limiting/logging.
//
// Invalid / tampered / expired / revoked / used tokens always return HTTP 200
// with { valid:false } / { ok:false } - no status-code or error distinction that
// could confirm a token's existence.

export const dynamic = 'force-dynamic'

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

// GET /api/link/[token] -> resolve: { valid, org_display_name, purpose, questions }
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = anonClient()
  if (!supabase) return NextResponse.json({ valid: false })

  const { data, error } = await supabase.rpc('resolve_access_link', { p_token: params.token })
  if (error || !data) return NextResponse.json({ valid: false })
  return NextResponse.json(data)
}

// POST /api/link/[token]  body: { answers: {...} } -> submit: { ok }
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = anonClient()
  if (!supabase) return NextResponse.json({ ok: false })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const answers = (body && typeof body === 'object' && 'answers' in body ? (body as { answers: unknown }).answers : {}) ?? {}

  const { data, error } = await supabase.rpc('submit_access_link', { p_token: params.token, p_answers: answers })
  if (error || !data) return NextResponse.json({ ok: false })
  return NextResponse.json(data)
}

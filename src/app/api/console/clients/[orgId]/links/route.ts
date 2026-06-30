// Task 3b: curator mints a tokenized no-login collection link for an ASSIGNED
// client. The existing mint_access_link RPC is SECURITY INVOKER + bound to
// current_user_org_id(), so a curator acting on client X cannot use it; this route
// replicates the RPC server-side (service-role) AFTER the book check. The token
// shape (32 random bytes -> 64 hex) and hashing (sha256 of the token string) match
// the RPC exactly, so curator-minted links redeem identically. Additive: the
// own-org access_links/tasks RLS policies are untouched.
//
// CC-2: the link itself is just /link/{token} and the stored row carries no
// org-identifying data beyond org_display_name (a DPO-chosen label, identical to
// owner-minted) - no org id/business id is exposed to the no-login holder.
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { getServiceSupabase, requireCuratorForOrg } from '@/lib/api-auth'
import { SYSADMIN_QSET_ID } from '@/lib/ledger/seed-sysadmin-questions'

export const dynamic = 'force-dynamic'

const PURPOSES = ['sysadmin_questionnaire', 'vendor_dpa', 'dsar'] as const
type Purpose = (typeof PURPOSES)[number]

export async function POST(request: NextRequest, { params }: { params: { orgId: string } }) {
  const sb = getServiceSupabase()
  const gate = await requireCuratorForOrg(request, params.orgId, sb)
  if (!gate.ok) return gate.response
  const { curator } = gate

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const purpose = String((body as Record<string, unknown>).purpose ?? '') as Purpose
  if (!PURPOSES.includes(purpose)) return NextResponse.json({ error: 'invalid purpose' }, { status: 400 })
  const displayName = String((body as Record<string, unknown>).displayName ?? '').trim() || 'גורם חיצוני'
  const obligationId = (body as Record<string, unknown>).obligationId ? String((body as Record<string, unknown>).obligationId) : null
  const targetRecipientId = (body as Record<string, unknown>).targetRecipientId ? String((body as Record<string, unknown>).targetRecipientId) : null
  const expiresAt = String((body as Record<string, unknown>).expiresAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())

  // Token + hash - byte-for-byte the RPC's scheme.
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  if (purpose === 'dsar') {
    // resolve the DPO notify email (contacts.dpo -> organizations.contact_email -> admin user)
    let dpoEmail: string | null = null
    const { data: c } = await sb.from('contacts').select('email').eq('org_id', params.orgId).eq('role', 'dpo').not('email', 'is', null).order('created_at').limit(1)
    dpoEmail = (c?.[0] as { email: string } | undefined)?.email ?? null
    if (!dpoEmail) {
      const { data: o } = await sb.from('organizations').select('contact_email').eq('id', params.orgId).maybeSingle()
      dpoEmail = (o as { contact_email: string | null } | null)?.contact_email ?? null
    }
    const { error } = await sb.from('access_links').insert({
      org_id: params.orgId, token_hash: tokenHash, purpose: 'dsar', org_display_name: displayName,
      status: 'active', expires_at: expiresAt, created_by: curator.userId, dpo_notify_email: dpoEmail,
    })
    if (error) return NextResponse.json({ error: 'mint_failed' }, { status: 500 })
    return NextResponse.json({ ok: true, token })
  }

  // sysadmin_questionnaire / vendor_dpa: must be obligation-linked (evidence needs an obligation).
  if (!obligationId) return NextResponse.json({ error: 'obligationId required' }, { status: 400 })
  const { data: ob } = await sb.from('obligations').select('id').eq('id', obligationId).eq('org_id', params.orgId).maybeSingle()
  if (!ob) return NextResponse.json({ error: 'obligation not in client' }, { status: 400 })
  if (targetRecipientId) {
    const { data: r } = await sb.from('data_recipients').select('id').eq('id', targetRecipientId).eq('org_id', params.orgId).maybeSingle()
    if (!r) return NextResponse.json({ error: 'recipient not in client' }, { status: 400 })
  }

  const { data: task, error: taskErr } = await sb.from('tasks').insert({
    org_id: params.orgId, obligation_id: obligationId,
    assignee_actor: purpose === 'vendor_dpa' ? 'vendor' : 'sysadmin',
    title: purpose === 'vendor_dpa' ? 'בקשת אישור הסכם עיבוד מספק' : 'שאלון אבטחה לסיסטם',
    status: 'open',
  }).select('id').single()
  if (taskErr || !task) return NextResponse.json({ error: 'task_failed' }, { status: 500 })

  const { error } = await sb.from('access_links').insert({
    org_id: params.orgId, token_hash: tokenHash, purpose, task_id: (task as { id: string }).id, obligation_id: obligationId,
    org_display_name: displayName, q_asset_template_id: purpose === 'sysadmin_questionnaire' ? SYSADMIN_QSET_ID : null,
    status: 'active', expires_at: expiresAt, created_by: curator.userId, target_recipient_id: targetRecipientId,
  })
  if (error) return NextResponse.json({ error: 'mint_failed' }, { status: 500 })
  return NextResponse.json({ ok: true, token })
}

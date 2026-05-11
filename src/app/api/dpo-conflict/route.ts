// src/app/api/dpo-conflict/route.ts
// Resolution endpoints for the DPO conflict-of-interest dashboard task.
//
// Actions:
//   - swap_to_deepo        Use Deepo's external DPO (recommended+ tiers).
//   - reassign_internal    Appoint a new internal person.
//   - acknowledge          Sign the disclaimer accepting the conflict.
//   - assess               Legacy-org nudge: answer the onboarding question now.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth'
import {
  CONFLICTING_ROLES,
  DPO_ROLE_LABELS,
  deriveOnboardingConflictStatus,
  type DpoRoleInOrg,
} from '@/lib/dpo-conflict'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type ActionPayload =
  | { action: 'swap_to_deepo' }
  | { action: 'reassign_internal'; name: string; email: string; role: DpoRoleInOrg }
  | { action: 'acknowledge' }
  | { action: 'assess'; role: DpoRoleInOrg }

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, supabaseAdmin)
    if (!auth) return unauthorizedResponse()

    const body = (await request.json()) as ActionPayload
    const orgId = auth.orgId
    const userEmail = auth.email

    // ── swap_to_deepo ────────────────────────────────────────────────────
    if (body.action === 'swap_to_deepo') {
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({
          dpo_role_in_org: null,
          dpo_conflict_status: 'resolved_by_external_dpo',
        })
        .eq('id', orgId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        action: 'dpo_conflict_swap_to_deepo',
        actor_type: 'user',
        details: { user_email: userEmail },
      })
      return NextResponse.json({ success: true })
    }

    // ── reassign_internal ────────────────────────────────────────────────
    if (body.action === 'reassign_internal') {
      const { name, email, role } = body
      if (!name?.trim() || !email?.trim() || !role) {
        return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 })
      }
      if (CONFLICTING_ROLES.includes(role)) {
        return NextResponse.json(
          { error: 'תפקיד זה גם כן יוצר ניגוד עניינים. בחרו אדם בתפקיד אחר.' },
          { status: 422 },
        )
      }

      // Map allowed roles to terminal statuses.
      // 'none' → resolved_by_reassignment (per spec).
      // 'other' → resolved_by_reassignment (user explicitly chose a non-listed
      //   non-conflicting role; treat as resolved, not stuck in unresolved).
      const newStatus = 'resolved_by_reassignment'

      const { error: orgErr } = await supabaseAdmin
        .from('organizations')
        .update({ dpo_role_in_org: role, dpo_conflict_status: newStatus })
        .eq('id', orgId)
      if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

      // Stash the new internal DPO contact in profile_data (JSONB; not queried,
      // only displayed).
      const { data: existing } = await supabaseAdmin
        .from('organization_profiles')
        .select('id, profile_data')
        .eq('org_id', orgId)
        .maybeSingle()

      const nextProfileData = {
        ...(existing?.profile_data || {}),
        internalDpo: {
          name: name.trim(),
          email: email.trim(),
          role,
          assigned_at: new Date().toISOString(),
        },
      }

      if (existing) {
        await supabaseAdmin
          .from('organization_profiles')
          .update({ profile_data: nextProfileData })
          .eq('org_id', orgId)
      } else {
        await supabaseAdmin
          .from('organization_profiles')
          .insert({ org_id: orgId, profile_data: nextProfileData })
      }

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        action: 'dpo_conflict_reassign',
        actor_type: 'user',
        details: { user_email: userEmail, new_role: role, new_dpo_name: name.trim() },
      })
      return NextResponse.json({ success: true })
    }

    // ── acknowledge ──────────────────────────────────────────────────────
    if (body.action === 'acknowledge') {
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({
          dpo_conflict_status: 'conflict_acknowledged',
          dpo_conflict_acknowledged_at: now,
          dpo_conflict_acknowledged_by: userEmail,
        })
        .eq('id', orgId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        action: 'dpo_conflict_acknowledge',
        actor_type: 'user',
        details: { user_email: userEmail, acknowledged_at: now },
      })
      return NextResponse.json({ success: true })
    }

    // ── assess (legacy-org nudge) ────────────────────────────────────────
    if (body.action === 'assess') {
      const { role } = body
      if (!role || !(role in DPO_ROLE_LABELS)) {
        return NextResponse.json({ error: 'נא לבחור תפקיד' }, { status: 400 })
      }
      const newStatus = deriveOnboardingConflictStatus(role)

      const { error } = await supabaseAdmin
        .from('organizations')
        .update({ dpo_role_in_org: role, dpo_conflict_status: newStatus })
        .eq('id', orgId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await supabaseAdmin.from('audit_logs').insert({
        org_id: orgId,
        action: 'dpo_conflict_assess',
        actor_type: 'user',
        details: { user_email: userEmail, role },
      })
      return NextResponse.json({ success: true, status: newStatus })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('[DPO Conflict] Error:', e)
    return NextResponse.json({ error: 'Internal error', details: e.message }, { status: 500 })
  }
}

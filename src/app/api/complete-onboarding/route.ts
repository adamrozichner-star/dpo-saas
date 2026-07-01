// src/app/api/complete-onboarding/route.ts
// Server-side onboarding completion — uses service role key to bypass RLS
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { welcomeEmail } from '@/lib/email'
import { deriveOnboardingConflictStatus, type DpoRoleInOrg } from '@/lib/dpo-conflict'
import { checkAndCreateNotificationsForOrg } from '@/lib/notifications-trigger'
import { buildFacts, type V3Answers, type ProcessingActivityRow } from '@/lib/ledger/facts'
import { evaluateRules, type GapRuleInput } from '@/lib/ledger/evaluator'
import { planControls, type PlaybookInput } from '@/lib/ledger/controls'
import { ruleToPlaybook } from '@/lib/ledger/seed-playbooks'

export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

// =============================================================================
// Onboarding -> ledger mint (Path A). Deterministic, no LLM: mirrors the
// scripts/backfill.ts:63-78 orchestration (buildFacts -> evaluateRules ->
// planControls) but persists via the mint_org_ledger RPC (SECURITY DEFINER,
// service_role-only EXECUTE) instead of the Management-API SQL path. Idempotent:
// re-running onboarding refreshes the same rows via the 038/039 partial unique
// indexes, never duplicates.
//
// SCOPE CAVEAT — this does NOT set organizations.dpo_id (separate milestone). The
// curator console scopes strictly on organizations.dpo_id = curator.dpoId, so
// until a DPO is assigned the minted org is INVISIBLE to every DPO console. The
// obligations still exist and the owner /home reads them under own-org RLS; no
// curator can see the client yet. This also does NOT flip
// feature_flags.LEDGER_READ — owner/console ledger READS stay operator-gated;
// minting is data-only, exactly like backfill.ts.
// =============================================================================
async function mintLedgerForOrg(
  supabase: ReturnType<typeof getServiceSupabase>,
  orgId: string,
  v3Answers: V3Answers,
): Promise<{ obligations: number; controls: number }> {
  // Live catalog (active rules + playbooks) + this org's processing activities.
  const [rulesRes, pbRes, paRes] = await Promise.all([
    supabase.from('hub_gap_rules')
      .select('template_id, version, name, description, severity, asset_template_id, rule_dsl')
      .eq('active', true),
    supabase.from('hub_control_playbooks')
      .select('template_id, version, asset_template_id, name, description, cadence, owner_role, checklist')
      .eq('active', true),
    supabase.from('processing_activities')
      .select('special_categories, includes_minors, international_transfers, requires_dpia, requires_ppa_registration, security_level')
      .eq('org_id', orgId),
  ])

  const rules: GapRuleInput[] = (rulesRes.data ?? []).map((r: any) => ({
    templateId: r.template_id, version: r.version, name: r.name, description: r.description,
    severity: r.severity, assetTemplateId: r.asset_template_id, ruleDsl: r.rule_dsl,
  }))
  const playbooks: PlaybookInput[] = (pbRes.data ?? []).map((p: any) => ({
    templateId: p.template_id, version: p.version, assetTemplateId: p.asset_template_id,
    name: p.name, description: p.description, cadence: p.cadence, ownerRole: p.owner_role,
    checklist: p.checklist ?? [],
  }))

  // Deterministic inference (same pure fns backfill uses).
  const facts = buildFacts({ v3Answers, processingActivities: (paRes.data ?? []) as ProcessingActivityRow[] })
  const specs = evaluateRules(orgId, facts, rules).fired
  const plans = planControls(orgId, specs.map((s) => ({ sourceRuleId: s.sourceRuleId })), playbooks, ruleToPlaybook, new Date())

  // Structured rows for the fixed-statement RPC (not SQL strings).
  const p_obligations = specs.map((s) => ({
    source_rule_id: s.sourceRuleId, source_version: s.sourceVersion, title: s.title,
    description: s.description, severity: s.severity, status: s.status, triggered_by: s.triggeredBy,
  }))
  const p_controls = plans.map((p) => ({
    source_playbook_id: p.playbookTemplateId, source_playbook_version: p.playbookVersion,
    cadence: p.cadence, owner_role: p.ownerRole, next_due_at: p.nextDueAtIso,
    rule_template_ids: p.ruleTemplateIds,
  }))

  const { data, error } = await supabase.rpc('mint_org_ledger', {
    p_org_id: orgId, p_obligations, p_controls,
  })
  if (error) throw new Error(`mint_org_ledger RPC failed: ${error.message}`)
  return (data ?? { obligations: 0, controls: 0 }) as { obligations: number; controls: number }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, v3Answers, legacyAnswers, tier } = body

    // Validate required fields
    if (!userId || !v3Answers) {
      console.error('[CompleteOnboarding] Missing fields:', { userId: !!userId, v3Answers: !!v3Answers })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const businessName = v3Answers.bizName || 'עסק חדש'
    const companyId = v3Answers.companyId || ''
    const autoTier = tier || 'basic'

    // Internal DPO designation captured during onboarding (Part B):
    //   hasDpo='yes'  → org has an internal DPO; capture role + derive conflict status
    //   hasDpo='no'/'not_sure' → no internal DPO; conflict status stays 'not_assessed'
    const hasInternalDpo = v3Answers.hasDpo === 'yes'
    const dpoRoleInOrg: DpoRoleInOrg | null = hasInternalDpo ? (v3Answers.dpoRoleInOrg || null) : null
    const dpoConflictStatus = hasInternalDpo
      ? deriveOnboardingConflictStatus(dpoRoleInOrg)
      : 'not_assessed'
    const internalDpo = hasInternalDpo
      ? { name: v3Answers.dpoName || null, roleInOrg: dpoRoleInOrg }
      : null

    console.log('[CompleteOnboarding] Starting:', { 
      userId, userEmail, businessName, companyId, autoTier,
      bizNameFromV3: v3Answers.bizName
    })

    const supabase = getServiceSupabase()

    // 1. Check if user already has an org (prevent duplicates)
    const { data: existingUser } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', userId)
      .single()

    if (existingUser?.org_id) {
      // User already has org — update it with correct name and save profile
      console.log('[CompleteOnboarding] User already has org:', existingUser.org_id, '— updating')
      
      await supabase.from('organizations').update({
        name: businessName,
        business_id: companyId,
        tier: autoTier,
        dpo_role_in_org: dpoRoleInOrg,
        dpo_conflict_status: dpoConflictStatus,
      }).eq('id', existingUser.org_id)

      // Upsert profile
      const { data: existingProfile } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('org_id', existingUser.org_id)
        .maybeSingle()

      if (existingProfile) {
        await supabase.from('organization_profiles')
          .update({ profile_data: { answers: legacyAnswers || [], v3Answers, internalDpo, completedAt: new Date().toISOString() } })
          .eq('org_id', existingUser.org_id)
      } else {
        await supabase.from('organization_profiles')
          .insert({ org_id: existingUser.org_id, profile_data: { answers: legacyAnswers || [], v3Answers, internalDpo, completedAt: new Date().toISOString() } })
      }

      console.log('[CompleteOnboarding] Updated existing org:', existingUser.org_id, 'name:', businessName)

      // Send welcome email directly (non-blocking)
      sendWelcomeEmailDirect(userEmail, businessName).catch(e => console.error('[CompleteOnboarding] Email error:', e))

      // Trigger notifications check (non-blocking)
      checkAndCreateNotificationsForOrg(existingUser.org_id, getServiceSupabase()).catch(e => console.error('notif trigger:', e))

      // Mint the obligation+control ledger — LAST step, after org/profile commit.
      // Synchronous but caught: a mint failure must NOT fail onboarding (the org
      // and profile already exist; scripts/backfill.ts is the operator fallback,
      // i.e. today's baseline). Idempotent, so re-onboarding refreshes in place.
      let ledgerMinted = false
      try {
        const minted = await mintLedgerForOrg(supabase, existingUser.org_id, v3Answers as V3Answers)
        ledgerMinted = true
        console.log('[CompleteOnboarding] Ledger minted (existing org):', minted)
      } catch (e) {
        console.error('[CompleteOnboarding] Ledger mint failed (org intact, backfill fallback):', e)
      }

      return NextResponse.json({
        success: true,
        orgId: existingUser.org_id,
        orgName: businessName,
        updated: true,
        ledgerMinted
      })
    }

    // 2. Create new organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: businessName,
        business_id: companyId,
        tier: autoTier,
        status: 'active',
        dpo_role_in_org: dpoRoleInOrg,
        dpo_conflict_status: dpoConflictStatus,
      })
      .select('id, name')
      .single()

    if (orgError) {
      console.error('[CompleteOnboarding] Org creation failed:', orgError)
      return NextResponse.json({ error: 'Failed to create organization: ' + orgError.message }, { status: 500 })
    }

    console.log('[CompleteOnboarding] Created org:', orgData.id, 'name:', orgData.name)

    // 3. Link user to org
    const { error: linkError } = await supabase
      .from('users')
      .update({ org_id: orgData.id })
      .eq('auth_user_id', userId)

    if (linkError) {
      console.error('[CompleteOnboarding] User link failed:', linkError)
      // Still continue — org was created
    }

    // 4. Create organization profile with v3Answers
    const { error: profileError } = await supabase
      .from('organization_profiles')
      .insert({
        org_id: orgData.id,
        profile_data: {
          answers: legacyAnswers || [],
          v3Answers: v3Answers,
          internalDpo,
          completedAt: new Date().toISOString()
        }
      })

    if (profileError) {
      console.error('[CompleteOnboarding] Profile creation failed:', profileError)
      // Still continue — org was created and linked
    }

    console.log('[CompleteOnboarding] Complete! org:', orgData.id, 'name:', orgData.name, 'profile:', !profileError)

    // Send welcome email directly (non-blocking)
    sendWelcomeEmailDirect(userEmail, orgData.name).catch(e => console.error('[CompleteOnboarding] Email error:', e))

    // Trigger notifications check (non-blocking)
    checkAndCreateNotificationsForOrg(orgData.id, getServiceSupabase()).catch(e => console.error('notif trigger:', e))

    // Mint the obligation+control ledger — LAST step, after org/user/profile
    // commit. Synchronous but caught: a mint failure must NOT fail onboarding
    // (org+profile already exist; scripts/backfill.ts is the operator fallback,
    // i.e. today's baseline). Idempotent via the 038/039 partial unique indexes.
    let ledgerMinted = false
    try {
      const minted = await mintLedgerForOrg(supabase, orgData.id, v3Answers as V3Answers)
      ledgerMinted = true
      console.log('[CompleteOnboarding] Ledger minted (new org):', minted)
    } catch (e) {
      console.error('[CompleteOnboarding] Ledger mint failed (org intact, backfill fallback):', e)
    }

    return NextResponse.json({
      success: true,
      orgId: orgData.id,
      orgName: orgData.name,
      profileSaved: !profileError,
      ledgerMinted
    })

  } catch (err: any) {
    console.error('[CompleteOnboarding] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// =============================================
// Send welcome email directly via Resend SDK
// Uses the shared welcomeEmail template from src/lib/email.ts
// =============================================
async function sendWelcomeEmailDirect(email: string | undefined, orgName: string) {
  if (!email) {
    console.log('[Email] No email provided, skipping')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not set — cannot send welcome email')
    return
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.FROM_EMAIL || 'Deepo <noreply@deepo.co.il>'
  const template = welcomeEmail({ orgName })

  console.log('[Email] Sending welcome email to:', email, 'from:', fromEmail, 'orgName:', orgName)

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: template.subject,
    html: template.html,
    text: template.text,
  })

  if (error) {
    console.error('[Email] Resend error:', JSON.stringify(error))
  } else {
    console.log('[Email] Welcome email sent successfully, id:', data?.id)
  }
}

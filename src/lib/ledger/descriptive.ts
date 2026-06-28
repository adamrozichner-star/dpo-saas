// F2d: descriptive data resolution. Renders need org-level descriptive data
// (data categories, processing purposes, security measures, DPO license). F2d
// gives it a v3 ledger home (org_descriptors + contacts.license_number); renders
// PREFER the ledger and FALL BACK to the kept-legacy organization_profiles / dpos
// (strangler-additive - legacy stays byte-identical). resolveRenderProfile is
// pure + testable; fetchOrgDescriptive is the ledger-first-fallback-legacy IO.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RenderProfile } from '@/lib/ledger/doc-render'

export interface OrgDescriptorRow {
  data_categories: unknown
  processing_purposes: unknown
  security_measures: unknown
}
export interface LegacyProfileRow {
  data_types: unknown
  processing_purposes: unknown
  security_measures: unknown
  third_parties: unknown
}

// PURE: prefer the ledger descriptor row when present, else legacy. third_parties
// is not migrated (the ledger holds vendors in data_recipients), so it always
// comes from legacy. Row-level preference (a v3 descriptor row is the org's
// source of truth) keeps it simple + testable.
export function resolveRenderProfile(
  ledger: OrgDescriptorRow | null,
  legacy: LegacyProfileRow | null,
): RenderProfile {
  const useLedger = ledger != null
  return {
    data_types: useLedger ? ledger!.data_categories : legacy?.data_types ?? [],
    processing_purposes: useLedger ? ledger!.processing_purposes : legacy?.processing_purposes ?? [],
    security_measures: useLedger ? ledger!.security_measures : legacy?.security_measures ?? [],
    third_parties: legacy?.third_parties ?? [],
  }
}

export function resolveDpoLicense(ledgerLicense: string | null, legacyLicense: string | null): string | null {
  return ledgerLicense ?? legacyLicense ?? null
}

// Ledger-first descriptive read for an org (works with the authed RLS client or
// the service client). Returns the resolved RenderProfile + the DPO license.
export async function fetchOrgDescriptive(
  orgId: string,
  supabase: SupabaseClient,
): Promise<{ profile: RenderProfile; dpoLicense: string | null }> {
  const [descRes, legacyRes, contactRes] = await Promise.all([
    supabase.from('org_descriptors').select('data_categories, processing_purposes, security_measures').eq('org_id', orgId).maybeSingle(),
    supabase.from('organization_profiles').select('data_types, processing_purposes, security_measures, third_parties').eq('org_id', orgId).maybeSingle(),
    supabase.from('contacts').select('license_number').eq('org_id', orgId).eq('role', 'dpo').limit(1),
  ])
  const ledgerLicense = (contactRes.data?.[0] as { license_number: string | null } | undefined)?.license_number ?? null

  // legacy fallback for the license: organizations.dpo_id -> dpos.license_number
  // (best-effort; RLS may hide dpos from a non-DPO reader -> null -> rendered as '-').
  let legacyLicense: string | null = null
  if (!ledgerLicense) {
    const { data: orgRow } = await supabase.from('organizations').select('dpo_id').eq('id', orgId).maybeSingle()
    const dpoId = (orgRow as { dpo_id: string | null } | null)?.dpo_id
    if (dpoId) {
      const { data: dpoRow } = await supabase.from('dpos').select('license_number').eq('id', dpoId).maybeSingle()
      legacyLicense = (dpoRow as { license_number: string | null } | null)?.license_number ?? null
    }
  }

  return {
    profile: resolveRenderProfile((descRes.data as OrgDescriptorRow | null) ?? null, (legacyRes.data as LegacyProfileRow | null) ?? null),
    dpoLicense: resolveDpoLicense(ledgerLicense, legacyLicense),
  }
}

// =============================================================================
// buildFacts - normalize a client's live state into the flat fact object the
// rule_dsl conditions test. Pure and deterministic (no IO, no clock).
//
// Today's real fact sources (verified live; org_facts and assets are empty):
//   - organization_profiles.profile_data.v3Answers  (classification answers)
//   - processing_activities.*                        (per-activity attributes)
// As the Five-C loop populates the assets table, asset-derived facts can be
// added here without changing the DSL or the evaluator.
//
// The derived facts (hasMedical, totalRecords, maxAccess, securityLevel, ...)
// mirror the legacy hardcoded engine (src/lib/compliance-engine.ts) so the same
// conditions are expressible declaratively.
// =============================================================================

import type { FactValue } from './dsl'

export type Facts = Record<string, FactValue>

export interface V3Answers {
  industry?: string
  databases?: string[]
  customDatabases?: string[]
  dbDetails?: Record<string, { size?: string; access?: string; retention?: string; fields?: string[]; sensitive?: boolean }>
  processors?: string[]
  customProcessors?: string[]
  storage?: string[]
  hasConsent?: string
  accessControl?: string
  hasDpo?: string
  [k: string]: unknown
}

export interface ProcessingActivityRow {
  special_categories?: unknown
  includes_minors?: boolean | null
  international_transfers?: boolean | null
  requires_dpia?: boolean | null
  requires_ppa_registration?: boolean | null
  security_level?: string | null
  [k: string]: unknown
}

export interface FactInputs {
  v3Answers: V3Answers | null
  processingActivities: ProcessingActivityRow[]
}

// Size / access buckets, lifted verbatim from compliance-engine.ts so the
// declarative totals match the legacy engine exactly.
const SIZE_NUMS: Record<string, number> = {
  under100: 50,
  '100-1k': 500,
  '1k-10k': 5000,
  '10k-100k': 50000,
  '100k+': 150000,
}
const ACCESS_NUMS: Record<string, number> = {
  '1-2': 2,
  '3-10': 10,
  '11-50': 50,
  '50-100': 100,
  '100+': 150,
}

function nonEmptyArray(x: unknown): boolean {
  return Array.isArray(x) && x.length > 0
}

export function buildFacts(input: FactInputs): Facts {
  const a = input.v3Answers ?? {}
  const databases = Array.isArray(a.databases) ? a.databases.filter((d): d is string => typeof d === 'string') : []
  const dbDetails = a.dbDetails ?? {}
  const processors = [
    ...(Array.isArray(a.processors) ? a.processors : []),
    ...(Array.isArray(a.customProcessors) ? a.customProcessors : []),
  ].filter((p): p is string => typeof p === 'string')

  let totalRecords = 0
  let maxAccess = 0
  for (const detail of Object.values(dbDetails)) {
    if (detail?.size && SIZE_NUMS[detail.size] != null) totalRecords += SIZE_NUMS[detail.size]
    if (detail?.access && ACCESS_NUMS[detail.access] != null) maxAccess = Math.max(maxAccess, ACCESS_NUMS[detail.access])
  }

  const industry = typeof a.industry === 'string' ? a.industry : null
  const hasMedical = databases.includes('medical')
  const isHealthOrFinance = industry === 'health' || industry === 'finance'

  const pas = input.processingActivities ?? []
  const anyRequiresDpia = pas.some((p) => p.requires_dpia === true)
  const anyRequiresPpa = pas.some((p) => p.requires_ppa_registration === true)
  const anyIncludesMinors = pas.some((p) => p.includes_minors === true)
  const anyInternationalTransfers = pas.some((p) => p.international_transfers === true)
  const hasSpecialCategories = pas.some((p) => nonEmptyArray(p.special_categories))

  const isHigh = totalRecords >= 100000 || hasMedical || isHealthOrFinance || maxAccess >= 100
  const isMedium = totalRecords >= 10000 || databases.length >= 5
  const securityLevel = isHigh ? 'high' : isMedium ? 'medium' : 'basic'

  return {
    // classification answers
    industry,
    databases,
    databaseCount: databases.length,
    hasMedical,
    hasCameras: databases.includes('cameras'),
    hasCvs: databases.includes('cvs'),
    hasWebLeads: databases.includes('website_leads'),
    isHealthOrFinance,
    hasConsent: typeof a.hasConsent === 'string' ? a.hasConsent : null,
    accessControl: typeof a.accessControl === 'string' ? a.accessControl : null,
    hasDpo: typeof a.hasDpo === 'string' ? a.hasDpo : null,
    processorCount: processors.length,
    // derived scale
    totalRecords,
    maxAccess,
    securityLevel,
    // processing-activity rollups
    processingActivityCount: pas.length,
    anyRequiresDpia,
    anyRequiresPpa,
    anyIncludesMinors,
    anyInternationalTransfers,
    hasSpecialCategories,
  }
}

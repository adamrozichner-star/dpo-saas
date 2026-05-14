// Onboarding completeness check.
//
// Used by:
//   - /onboarding (ClassificationReport) — render the "partial data" warning
//     when the user skipped critical questions.
//   - /subscribe — swap the confident recommendation copy for "המלצה ראשונית
//     על בסיס מידע חלקי" so we don't over-claim on thin data.
//
// "Critical" = fields that drive the tier recommendation. totalSize is the
// scale gate (records across all databases); industry + databases shape the
// classification. bizName is always-required by the questionnaire itself —
// included here for defense in depth.
//
// Note on `employeeCount`: v3Answers has no such field. The closest scale
// indicator is `totalSize` (record-count bucket), which is what
// calculateRecommendedTier actually keys off. `access` (people-with-access)
// is a security control, not a scale gate, so it's not part of completeness.

const REQUIRED_FIELDS = ['bizName', 'industry', 'databases', 'totalSize'] as const

export function isOnboardingDataComplete(v3: any): boolean {
  if (!v3 || typeof v3 !== 'object') return false
  const hasBiz      = !!(v3.bizName && typeof v3.bizName === 'string' && v3.bizName.trim())
  const hasIndustry = !!v3.industry
  const hasDbs      = (v3.databases?.length || 0) > 0 || (v3.customDatabases?.length || 0) > 0
  const hasSize     = !!v3.totalSize
  return hasBiz && hasIndustry && hasDbs && hasSize
}

// Returns the missing-field keys in a stable order. Not consumed by UI in this
// commit — kept for future "השלימו: X, Y, Z" copy without another schema pass.
export function getMissingOnboardingFields(v3: any): string[] {
  const missing: string[] = []
  if (!v3 || typeof v3 !== 'object') return [...REQUIRED_FIELDS]
  if (!(v3.bizName && typeof v3.bizName === 'string' && v3.bizName.trim())) missing.push('bizName')
  if (!v3.industry) missing.push('industry')
  if ((v3.databases?.length || 0) === 0 && (v3.customDatabases?.length || 0) === 0) missing.push('databases')
  if (!v3.totalSize) missing.push('totalSize')
  return missing
}

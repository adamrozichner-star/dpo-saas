// Shared constants for the DPO conflict-of-interest feature.
// Used by onboarding question, dashboard card, API gate, and report generator.

export type DpoRoleInOrg =
  | 'none'
  | 'ceo'
  | 'ciso'
  | 'legal'
  | 'hr'
  | 'cfo'
  | 'hr_director'
  | 'other'

export type DpoConflictStatus =
  | 'not_assessed'
  | 'conflict_unresolved'
  | 'conflict_acknowledged'
  | 'no_conflict'
  | 'resolved_by_reassignment'
  | 'resolved_by_external_dpo'

export const DPO_ROLE_OPTIONS: { value: DpoRoleInOrg; label: string }[] = [
  { value: 'none', label: 'אינו ממלא תפקיד נוסף' },
  { value: 'ceo', label: 'מנכ"ל / מנהל כללי' },
  { value: 'ciso', label: 'מנהל אבטחת מידע (CISO)' },
  { value: 'legal', label: 'יועץ משפטי / משפטן' },
  { value: 'hr', label: 'מנהל משאבי אנוש' },
  { value: 'cfo', label: 'סמנכ"ל כספים (CFO)' },
  { value: 'hr_director', label: 'מנהל HR' },
  { value: 'other', label: 'תפקיד אחר' },
]

export const DPO_ROLE_LABELS: Record<DpoRoleInOrg, string> = DPO_ROLE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<DpoRoleInOrg, string>,
)

// Roles that automatically create a conflict per Israeli privacy law (תיקון 13).
export const CONFLICTING_ROLES: DpoRoleInOrg[] = ['ceo', 'ciso', 'legal', 'hr', 'cfo', 'hr_director']

// Derive initial conflict status from a freshly-selected role during onboarding.
export function deriveOnboardingConflictStatus(role: DpoRoleInOrg | null | undefined): DpoConflictStatus {
  if (!role) return 'not_assessed'
  if (role === 'none') return 'no_conflict'
  return 'conflict_unresolved'
}

// Maps each doc type to required onboarding answer fields
export const DOC_REQUIREMENTS: Record<string, { field: string; label: string }[]> = {
  privacy_policy: [
    { field: 'bizName', label: 'שם העסק' },
    { field: 'industry', label: 'תחום פעילות' },
    { field: 'databases', label: 'מאגרי מידע' },
    { field: 'storage', label: 'מערכות אחסון' },
  ],
  dpo_appointment: [
    { field: 'bizName', label: 'שם העסק' },
    { field: 'companyId', label: 'מספר ח.פ' },
  ],
  security_policy: [
    { field: 'bizName', label: 'שם העסק' },
    { field: 'storage', label: 'מערכות אחסון' },
    { field: 'securityOwner', label: 'אחראי אבטחת מידע' },
  ],
  security_procedures: [
    { field: 'bizName', label: 'שם העסק' },
    { field: 'storage', label: 'מערכות אחסון' },
  ],
  database_registration: [
    { field: 'bizName', label: 'שם העסק' },
    { field: 'databases', label: 'מאגרי מידע' },
  ],
  // DPIA is generated from the DpiaWizard (not from onboarding answers).
  // Listed here for completeness; wizard supplies activity_name, risks, controls.
  dpia: [],
}

export interface MissingField {
  field: string
  label: string
}

export function getMissingFields(docType: string, answers: any): MissingField[] {
  const required = DOC_REQUIREMENTS[docType]
  if (!required) return []

  return required.filter(({ field }) => {
    const value = answers?.[field]
    if (value === undefined || value === null || value === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
  })
}

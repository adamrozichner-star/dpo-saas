// Document Generator Service
// Transforms onboarding answers into document variables and generates documents
// V2: Supports new smart onboarding (business questions → privacy inference)

import { OnboardingAnswer } from '@/types'
import { 
  DocumentVariables, 
  documentTemplates,
  DocumentType,
  dataTypeLabels,
  businessTypeLabels,
  dataSourceLabels,
  processingPurposeLabels,
  securityMeasureLabels
} from './document-templates'
import { dpoConfig } from './dpo-config'

// Sensitive data types that require special handling
const SENSITIVE_DATA_TYPES = ['health', 'biometric', 'financial', 'id']

/**
 * Extract a value from onboarding answers by question ID
 */
function getAnswerValue<T>(answers: OnboardingAnswer[], questionId: string, defaultValue: T): T {
  const answer = answers.find(a => a.questionId === questionId)
  if (!answer) return defaultValue
  return answer.value as T
}

/**
 * Format date to Hebrew format
 */
function formatHebrewDate(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Convert array to Hebrew comma-separated list
 */
function arrayToHebrewList(items: string[], labels: Record<string, string>): string {
  return items
    .map(item => labels[item] || item)
    .join(', ')
}

// =============================================
// V2: SMART INFERENCE FROM BUSINESS DATA
// =============================================

/**
 * Infer data types from industry, customer type, and explicit flags
 */
function inferDataTypes(answers: OnboardingAnswer[]): string[] {
  const industry = getAnswerValue<string>(answers, 'industry', 'other')
  const customerType = getAnswerValue<string[]>(answers, 'customer_type', [])
  const hasHealthData = getAnswerValue<boolean | null>(answers, 'has_health_data', null)
  const collectsPayments = getAnswerValue<boolean | null>(answers, 'collects_payments', null)
  const worksWithMinors = getAnswerValue<boolean | null>(answers, 'works_with_minors', null)
  const software = getAnswerValue<string[]>(answers, 'software', [])

  const dataTypes = new Set<string>(['contact']) // Everyone collects contact info

  // Industry-based inference
  const industryDataMap: Record<string, string[]> = {
    healthcare: ['health', 'id', 'contact'],
    finance: ['financial', 'id', 'contact'],
    retail: ['contact', 'financial', 'behavioral'],
    technology: ['contact', 'behavioral'],
    education: ['contact', 'id'],
    services: ['contact'],
    manufacturing: ['contact', 'employment'],
    food: ['contact'],
    realestate: ['contact', 'financial', 'id'],
  }
  
  if (industryDataMap[industry]) {
    industryDataMap[industry].forEach(t => dataTypes.add(t))
  }

  // B2C typically involves more personal data
  if (customerType.includes('b2c')) {
    dataTypes.add('contact')
    dataTypes.add('behavioral')
  }

  // Explicit flags override inference
  if (hasHealthData === true) dataTypes.add('health')
  if (collectsPayments === true) dataTypes.add('financial')
  if (worksWithMinors === true) dataTypes.add('id') // Minors require extra ID handling

  // Software-based inference
  if (software.includes('shopify') || software.includes('woocommerce') || software.includes('wix')) {
    dataTypes.add('behavioral') // E-commerce = tracking
    dataTypes.add('financial')
  }
  if (software.includes('payroll')) {
    dataTypes.add('employment')
    dataTypes.add('id')
    dataTypes.add('financial')
  }

  return Array.from(dataTypes)
}

/**
 * Infer data sources from software and business model
 */
function inferDataSources(answers: OnboardingAnswer[]): string[] {
  const software = getAnswerValue<string[]>(answers, 'software', [])
  const customerType = getAnswerValue<string[]>(answers, 'customer_type', [])
  const websiteUrl = getAnswerValue<string>(answers, 'website_url', '')
  const hasApp = getAnswerValue<boolean | null>(answers, 'has_app', null)
  const employeeCount = getAnswerValue<string>(answers, 'employee_count', '1-10')

  const sources = new Set<string>(['direct']) // Everyone gets data directly

  if (websiteUrl || hasApp) sources.add('website')
  if (hasApp) sources.add('website')
  if (customerType.includes('b2b')) sources.add('third_party')
  
  // Any business with employees collects employee data
  if (employeeCount !== '1-10') sources.add('employees')
  // Even small businesses with payroll software
  if (software.includes('payroll')) sources.add('employees')

  return Array.from(sources)
}

/**
 * Infer processing purposes from industry and software
 */
function inferProcessingPurposes(answers: OnboardingAnswer[]): string[] {
  const industry = getAnswerValue<string>(answers, 'industry', 'other')
  const software = getAnswerValue<string[]>(answers, 'software', [])
  const customerType = getAnswerValue<string[]>(answers, 'customer_type', [])
  const employeeCount = getAnswerValue<string>(answers, 'employee_count', '1-10')

  const purposes = new Set<string>(['service', 'legal']) // Everyone

  if (software.includes('hubspot') || software.includes('salesforce') || software.includes('crm_other')) {
    purposes.add('marketing')
  }
  if (customerType.includes('b2c')) {
    purposes.add('marketing')
  }
  if (software.some(s => ['google_workspace', 'microsoft_365', 'monday'].includes(s))) {
    purposes.add('analytics')
  }
  if (employeeCount !== '1-10' || software.includes('payroll')) {
    purposes.add('hr')
  }
  purposes.add('security') // Everyone should have this

  return Array.from(purposes)
}

/**
 * Infer security measures from software stack
 */
function inferSecurityMeasures(answers: OnboardingAnswer[]): string[] {
  const software = getAnswerValue<string[]>(answers, 'software', [])
  const measures = new Set<string>()

  // Cloud software providers generally include basic security
  if (software.includes('google_workspace') || software.includes('microsoft_365')) {
    measures.add('encryption')
    measures.add('access_control')
    measures.add('backup')
  }

  // Any cloud-based software implies some measures
  if (software.length > 0) {
    measures.add('access_control')
  }

  // E-commerce platforms include basic security
  if (software.includes('shopify') || software.includes('woocommerce')) {
    measures.add('encryption')
    measures.add('firewall')
  }

  return Array.from(measures)
}

/**
 * Determine if international transfer is happening based on software
 */
function inferInternationalTransfer(answers: OnboardingAnswer[]): boolean {
  const software = getAnswerValue<string[]>(answers, 'software', [])
  
  // These are all US/international services
  const internationalSoftware = [
    'salesforce', 'hubspot', 'google_workspace', 'microsoft_365',
    'shopify', 'monday', 'woocommerce', 'wix'
  ]
  
  return software.some(s => internationalSoftware.includes(s))
}

/**
 * Determine cloud storage type from software
 */
function inferCloudStorage(answers: OnboardingAnswer[]): string {
  const software = getAnswerValue<string[]>(answers, 'software', [])
  
  const intlCloud = ['google_workspace', 'microsoft_365', 'salesforce', 'hubspot', 'shopify', 'monday', 'woocommerce', 'wix']
  const hasInternational = software.some(s => intlCloud.includes(s))
  
  // Israeli software
  const israeliSoftware = ['priority', 'accounting'] // Priority is usually local
  const hasIsraeli = software.some(s => israeliSoftware.includes(s))
  
  if (hasInternational && hasIsraeli) return 'both'
  if (hasInternational) return 'international'
  if (hasIsraeli) return 'israeli'
  if (software.length > 0) return 'international' // Default assumption for unknown cloud
  return 'none'
}

/**
 * Detect onboarding version from answers
 * V1: has 'data_types', 'data_sources', 'security_measures' etc.
 * V2: has 'software', 'customer_type', 'has_health_data' etc.
 */
function isV2Onboarding(answers: OnboardingAnswer[]): boolean {
  return answers.some(a => 
    a.questionId === 'software' || 
    a.questionId === 'customer_type' || 
    a.questionId === 'has_health_data' ||
    a.questionId === 'website_url'
  )
}

// =============================================
// MAIN EXPORT: answersToDocumentVariables
// =============================================

/**
 * Transform onboarding answers into document variables
 * Supports both V1 (old) and V2 (new) onboarding formats
 */
export function answersToDocumentVariables(
  answers: OnboardingAnswer[],
  orgName: string,
  businessId: string
): DocumentVariables {
  const dpo = dpoConfig
  
  // Detect which onboarding version
  if (isV2Onboarding(answers)) {
    return answersToDocumentVariablesV2(answers, orgName, businessId, dpo)
  }
  
  // V1: Original direct-mapping (backward compatible)
  return answersToDocumentVariablesV1(answers, orgName, businessId, dpo)
}

/**
 * V2: Smart inference from business questions
 */
function answersToDocumentVariablesV2(
  answers: OnboardingAnswer[],
  orgName: string,
  businessId: string,
  dpo: typeof dpoConfig
): DocumentVariables {
  const businessType = getAnswerValue<string>(answers, 'industry', 'other')
  const employeeCount = getAnswerValue<string>(answers, 'employee_count', '1-10')

  // Smart inference from business data
  const dataTypes = inferDataTypes(answers)
  const dataSources = inferDataSources(answers)
  const processingPurposes = inferProcessingPurposes(answers)
  const securityMeasures = inferSecurityMeasures(answers)
  const internationalTransfer = inferInternationalTransfer(answers)
  const cloudStorage = inferCloudStorage(answers)

  // Sensitive data detection
  const sensitiveDataTypes = dataTypes.filter(type => SENSITIVE_DATA_TYPES.includes(type))
  const hasSensitiveData = sensitiveDataTypes.length > 0

  return {
    orgName,
    businessId,
    businessType,
    businessTypeLabel: businessTypeLabels[businessType] || businessType,
    employeeCount,

    dataTypes,
    dataTypesText: arrayToHebrewList(dataTypes, dataTypeLabels),
    dataSources,
    dataSourcesText: arrayToHebrewList(dataSources, dataSourceLabels),
    processingPurposes,
    processingPurposesText: arrayToHebrewList(processingPurposes, processingPurposeLabels),

    thirdPartySharing: internationalTransfer, // Using intl software = sharing with 3rd parties
    internationalTransfer,
    cloudStorage,

    securityMeasures,
    securityMeasuresText: arrayToHebrewList(securityMeasures, securityMeasureLabels),

    hasSensitiveData,
    sensitiveDataTypes: sensitiveDataTypes.map(type => dataTypeLabels[type] || type),

    dpoName: dpo.name,
    dpoEmail: dpo.email,
    dpoPhone: dpo.phone || '',
    dpoLicense: dpo.licenseNumber,

    effectiveDate: formatHebrewDate(new Date()),
    generatedDate: formatHebrewDate(new Date())
  }
}

/**
 * V1: Original direct-mapping (backward compatible for existing customers)
 */
function answersToDocumentVariablesV1(
  answers: OnboardingAnswer[],
  orgName: string,
  businessId: string,
  dpo: typeof dpoConfig
): DocumentVariables {
  const businessType = getAnswerValue<string>(answers, 'business_type', 'other')
  const employeeCount = getAnswerValue<string>(answers, 'employee_count', '1-10')
  const dataTypes = getAnswerValue<string[]>(answers, 'data_types', ['contact'])
  const dataSources = getAnswerValue<string[]>(answers, 'data_sources', ['direct'])
  const processingPurposes = getAnswerValue<string[]>(answers, 'processing_purposes', ['service'])
  const thirdPartySharing = getAnswerValue<boolean>(answers, 'third_party_sharing', false)
  const internationalTransfer = getAnswerValue<boolean>(answers, 'international_transfer', false)
  const cloudStorage = getAnswerValue<string>(answers, 'cloud_storage', 'none')
  const securityMeasures = getAnswerValue<string[]>(answers, 'security_measures', [])

  const sensitiveDataTypes = dataTypes.filter(type => SENSITIVE_DATA_TYPES.includes(type))
  const hasSensitiveData = sensitiveDataTypes.length > 0

  return {
    orgName,
    businessId,
    businessType,
    businessTypeLabel: businessTypeLabels[businessType] || businessType,
    employeeCount,
    dataTypes,
    dataTypesText: arrayToHebrewList(dataTypes, dataTypeLabels),
    dataSources,
    dataSourcesText: arrayToHebrewList(dataSources, dataSourceLabels),
    processingPurposes,
    processingPurposesText: arrayToHebrewList(processingPurposes, processingPurposeLabels),
    thirdPartySharing,
    internationalTransfer: internationalTransfer || cloudStorage === 'international' || cloudStorage === 'both',
    cloudStorage,
    securityMeasures: securityMeasures.filter(m => m !== 'none'),
    securityMeasuresText: arrayToHebrewList(securityMeasures.filter(m => m !== 'none'), securityMeasureLabels),
    hasSensitiveData,
    sensitiveDataTypes: sensitiveDataTypes.map(type => dataTypeLabels[type] || type),
    dpoName: dpo.name,
    dpoEmail: dpo.email,
    dpoPhone: dpo.phone || '',
    dpoLicense: dpo.licenseNumber,
    effectiveDate: formatHebrewDate(new Date()),
    generatedDate: formatHebrewDate(new Date())
  }
}

// =============================================
// DOCUMENT GENERATION (unchanged)
// =============================================

/**
 * Generate a single document
 */
export function generateDocument(
  type: DocumentType,
  variables: DocumentVariables
): { title: string; content: string; type: DocumentType } {
  const generator = documentTemplates[type]
  const content = generator(variables)

  const titles: Record<DocumentType, string> = {
    privacy_policy: 'מדיניות פרטיות',
    database_definition: 'מסמך הגדרות מאגר מידע',
    security_procedures: 'נהלי אבטחת מידע',
    dpo_appointment: 'כתב מינוי ממונה הגנת פרטיות'
  }

  return {
    title: titles[type],
    content,
    type
  }
}

/**
 * Generate all documents for an organization
 */
export function generateAllDocuments(
  answers: OnboardingAnswer[],
  orgName: string,
  businessId: string,
  variablesOverride?: Partial<DocumentVariables>
): Array<{ title: string; content: string; type: DocumentType }> {
  const baseVariables = answersToDocumentVariables(answers, orgName, businessId)
  
  const variables: DocumentVariables = {
    ...baseVariables,
    ...variablesOverride
  }

  const documentTypes: DocumentType[] = [
    'privacy_policy',
    'database_definition',
    'security_procedures',
    'dpo_appointment'
  ]

  return documentTypes.map(type => generateDocument(type, variables))
}

/**
 * Calculate compliance score based on onboarding answers
 * V2: Infers score from business data
 */
export function calculateComplianceScore(answers: OnboardingAnswer[]): {
  score: number
  level: 'low' | 'medium' | 'high'
  gaps: string[]
} {
  let score = 0
  const gaps: string[] = []

  if (isV2Onboarding(answers)) {
    // V2: Start with a base score — we generate all docs automatically
    score += 25 // DPO appointed
    score += 10 // Privacy policy (generated)
    score += 10 // Security procedures (generated)
    score += 10 // Database definition (generated)

    // Software-based security inference
    const securityMeasures = inferSecurityMeasures(answers)
    if (securityMeasures.includes('encryption')) score += 8
    else gaps.push('מומלץ ליישם הצפנת מידע')
    if (securityMeasures.includes('access_control')) score += 8
    else gaps.push('יש להגדיר בקרת גישה והרשאות')
    if (securityMeasures.includes('backup')) score += 8
    else gaps.push('יש ליישם גיבויים סדירים')

    // Database registration (assume not done yet)
    gaps.push('יש לרשום מאגרי מידע ברשות להגנת הפרטיות')

    // Employee training (assume not done)
    gaps.push('מומלץ לקיים הדרכות אבטחת מידע לעובדים')

    // Processes
    gaps.push('הגדרת תהליך לטיפול בבקשות נושאי מידע')
  } else {
    // V1: Original scoring
    const existingPolicy = getAnswerValue<boolean>(answers, 'existing_policy', false)
    if (existingPolicy) score += 10
    else gaps.push('חסרה מדיניות פרטיות כתובה')

    const databaseRegistered = getAnswerValue<string>(answers, 'database_registered', 'unknown')
    if (databaseRegistered === 'yes') score += 15
    else if (databaseRegistered === 'partial') { score += 7; gaps.push('יש לרשום את כל מאגרי המידע') }
    else gaps.push('יש לרשום מאגרי מידע ברשות להגנת הפרטיות')

    const securityMeasures = getAnswerValue<string[]>(answers, 'security_measures', [])
    if (securityMeasures.includes('encryption')) score += 8; else gaps.push('מומלץ ליישם הצפנת מידע')
    if (securityMeasures.includes('access_control')) score += 8; else gaps.push('יש להגדיר בקרת גישה והרשאות')
    if (securityMeasures.includes('backup')) score += 8; else gaps.push('יש ליישם גיבויים סדירים')
    if (securityMeasures.includes('firewall')) score += 6
    if (securityMeasures.includes('antivirus')) score += 5
    if (securityMeasures.includes('training')) score += 5; else gaps.push('מומלץ לקיים הדרכות אבטחת מידע לעובדים')

    const previousIncidents = getAnswerValue<boolean>(answers, 'previous_incidents', false)
    if (!previousIncidents) score += 10
    else gaps.push('יש לבחון את הלקחים מאירועי אבטחה קודמים')

    score += 25 // DPO auto-granted
  }

  let level: 'low' | 'medium' | 'high'
  if (score >= 80) level = 'high'
  else if (score >= 50) level = 'medium'
  else level = 'low'

  return { score, level, gaps }
}

/**
 * Determine if DPO is required based on answers
 */
export function isDpoRequired(answers: OnboardingAnswer[]): {
  required: boolean
  reasons: string[]
} {
  const reasons: string[] = []

  if (isV2Onboarding(answers)) {
    const industry = getAnswerValue<string>(answers, 'industry', '')
    const hasHealthData = getAnswerValue<boolean | null>(answers, 'has_health_data', null)
    const collectsPayments = getAnswerValue<boolean | null>(answers, 'collects_payments', null)
    const worksWithMinors = getAnswerValue<boolean | null>(answers, 'works_with_minors', null)

    if (industry === 'healthcare' || hasHealthData === true) {
      reasons.push('הארגון מעבד מידע רפואי/בריאותי')
    }
    if (industry === 'finance') {
      reasons.push('הארגון פועל בתחום הפיננסי')
    }
    if (worksWithMinors === true) {
      reasons.push('הארגון מעבד מידע של קטינים')
    }
    if (collectsPayments === true) {
      reasons.push('הארגון אוסף מידע פיננסי')
    }
  } else {
    const dataTypes = getAnswerValue<string[]>(answers, 'data_types', [])
    if (dataTypes.includes('location') || dataTypes.includes('behavioral')) {
      reasons.push('הארגון מבצע ניטור שיטתי (נתוני מיקום/התנהגות)')
    }
    if (dataTypes.some(type => SENSITIVE_DATA_TYPES.includes(type))) {
      reasons.push('הארגון מעבד מידע רגיש (בריאות, פיננסי, ביומטרי)')
    }
  }

  return { required: reasons.length > 0, reasons }
}

/**
 * Generate compliance checklist based on answers
 */
export function generateComplianceChecklist(answers: OnboardingAnswer[]): Array<{
  id: string
  title: string
  description: string
  category: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}> {
  const securityMeasures = isV2Onboarding(answers) 
    ? inferSecurityMeasures(answers) 
    : getAnswerValue<string[]>(answers, 'security_measures', [])

  return [
    { id: 'privacy_policy', title: 'מדיניות פרטיות', description: 'פרסום מדיניות פרטיות באתר ובמערכות', category: 'documentation', completed: true, priority: 'high' },
    { id: 'database_definition', title: 'מסמך הגדרות מאגר', description: 'תיעוד מאגרי המידע בארגון', category: 'documentation', completed: true, priority: 'high' },
    { id: 'security_procedures', title: 'נהלי אבטחת מידע', description: 'נהלים כתובים לאבטחת מידע', category: 'documentation', completed: true, priority: 'high' },
    { id: 'dpo_appointment', title: 'מינוי ממונה הגנת פרטיות', description: 'כתב מינוי רשמי לממונה', category: 'documentation', completed: true, priority: 'high' },
    { id: 'database_registration', title: 'רישום מאגרי מידע', description: 'רישום מאגרים ברשות להגנת הפרטיות', category: 'registration', completed: false, priority: 'high' },
    { id: 'access_control', title: 'בקרת גישה', description: 'הגדרת הרשאות גישה למערכות', category: 'security', completed: securityMeasures.includes('access_control'), priority: 'high' },
    { id: 'encryption', title: 'הצפנת מידע', description: 'הצפנת מידע רגיש', category: 'security', completed: securityMeasures.includes('encryption'), priority: 'medium' },
    { id: 'backup', title: 'גיבויים', description: 'גיבויים סדירים של המידע', category: 'security', completed: securityMeasures.includes('backup'), priority: 'high' },
    { id: 'employee_training', title: 'הדרכת עובדים', description: 'הדרכת עובדים בנושאי פרטיות ואבטחה', category: 'training', completed: false, priority: 'medium' },
    { id: 'data_subject_process', title: 'תהליך טיפול בפניות', description: 'הגדרת תהליך לטיפול בבקשות נושאי מידע', category: 'processes', completed: false, priority: 'high' },
    { id: 'incident_response', title: 'נוהל תגובה לאירועים', description: 'נוהל לטיפול באירועי אבטחה', category: 'processes', completed: false, priority: 'medium' },
  ]
}

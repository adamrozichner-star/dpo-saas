// Document Generator Service
// Transforms onboarding answers into document variables and generates documents

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

/**
 * Transform onboarding answers into document variables
 */
export function answersToDocumentVariables(
  answers: OnboardingAnswer[],
  orgName: string,
  businessId: string
): DocumentVariables {
  // Extract values from answers
  const businessType = getAnswerValue<string>(answers, 'business_type', 'other')
  const employeeCount = getAnswerValue<string>(answers, 'employee_count', '1-10')
  const dataTypes = getAnswerValue<string[]>(answers, 'data_types', ['contact'])
  const dataSources = getAnswerValue<string[]>(answers, 'data_sources', ['direct'])
  const processingPurposes = getAnswerValue<string[]>(answers, 'processing_purposes', ['service'])
  const thirdPartySharing = getAnswerValue<boolean>(answers, 'third_party_sharing', false)
  const internationalTransfer = getAnswerValue<boolean>(answers, 'international_transfer', false)
  const cloudStorage = getAnswerValue<string>(answers, 'cloud_storage', 'none')
  const securityMeasures = getAnswerValue<string[]>(answers, 'security_measures', [])

  // Determine sensitive data
  const sensitiveDataTypes = dataTypes.filter(type => SENSITIVE_DATA_TYPES.includes(type))
  const hasSensitiveData = sensitiveDataTypes.length > 0

  // Get DPO info from config
  const dpo = dpoConfig

  // Build variables object
  const vars: DocumentVariables = {
    // Organization info
    orgName,
    businessId,
    businessType,
    businessTypeLabel: businessTypeLabels[businessType] || businessType,
    employeeCount,

    // Data info
    dataTypes,
    dataTypesText: arrayToHebrewList(dataTypes, dataTypeLabels),
    dataSources,
    dataSourcesText: arrayToHebrewList(dataSources, dataSourceLabels),
    processingPurposes,
    processingPurposesText: arrayToHebrewList(processingPurposes, processingPurposeLabels),

    // Sharing info
    thirdPartySharing,
    internationalTransfer: internationalTransfer || cloudStorage === 'international' || cloudStorage === 'both',
    cloudStorage,

    // Security info
    securityMeasures: securityMeasures.filter(m => m !== 'none'),
    securityMeasuresText: arrayToHebrewList(securityMeasures.filter(m => m !== 'none'), securityMeasureLabels),

    // Sensitive data
    hasSensitiveData,
    sensitiveDataTypes: sensitiveDataTypes.map(type => dataTypeLabels[type] || type),

    // DPO info
    dpoName: dpo.name,
    dpoEmail: dpo.email,
    dpoPhone: dpo.phone || '',
    dpoLicense: dpo.licenseNumber,

    // Dates
    effectiveDate: formatHebrewDate(new Date()),
    generatedDate: formatHebrewDate(new Date())
  }

  return vars
}

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
  // Generate base variables from answers
  const baseVariables = answersToDocumentVariables(answers, orgName, businessId)
  
  // Merge with any overrides (e.g., DPO info from database)
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
 */
export function calculateComplianceScore(answers: OnboardingAnswer[]): {
  score: number
  level: 'low' | 'medium' | 'high'
  gaps: string[]
} {
  let score = 0
  const gaps: string[] = []

  // Check existing policy (10 points)
  const existingPolicy = getAnswerValue<boolean>(answers, 'existing_policy', false)
  if (existingPolicy) {
    score += 10
  } else {
    gaps.push('חסרה מדיניות פרטיות כתובה')
  }

  // Check database registration (15 points)
  const databaseRegistered = getAnswerValue<string>(answers, 'database_registered', 'unknown')
  if (databaseRegistered === 'yes') {
    score += 15
  } else if (databaseRegistered === 'partial') {
    score += 7
    gaps.push('יש לרשום את כל מאגרי המידע')
  } else {
    gaps.push('יש לרשום מאגרי מידע ברשות להגנת הפרטיות')
  }

  // Check security measures (up to 40 points)
  const securityMeasures = getAnswerValue<string[]>(answers, 'security_measures', [])
  
  if (securityMeasures.includes('encryption')) score += 8
  else gaps.push('מומלץ ליישם הצפנת מידע')
  
  if (securityMeasures.includes('access_control')) score += 8
  else gaps.push('יש להגדיר בקרת גישה והרשאות')
  
  if (securityMeasures.includes('backup')) score += 8
  else gaps.push('יש ליישם גיבויים סדירים')
  
  if (securityMeasures.includes('firewall')) score += 6
  
  if (securityMeasures.includes('antivirus')) score += 5
  
  if (securityMeasures.includes('training')) score += 5
  else gaps.push('מומלץ לקיים הדרכות אבטחת מידע לעובדים')

  // Check for no incidents (10 points)
  const previousIncidents = getAnswerValue<boolean>(answers, 'previous_incidents', false)
  if (!previousIncidents) {
    score += 10
  } else {
    gaps.push('יש לבחון את הלקחים מאירועי אבטחה קודמים')
  }

  // DPO appointment (25 points - auto-granted since we provide it)
  score += 25

  // Determine level
  let level: 'low' | 'medium' | 'high'
  if (score >= 80) {
    level = 'high'
  } else if (score >= 50) {
    level = 'medium'
  } else {
    level = 'low'
  }

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

  // Check if public body
  const businessType = getAnswerValue<string>(answers, 'business_type', '')
  // Note: We'd need a specific question for public body

  // Check for data trading with >10k records
  // Note: Would need specific questions for this

  // Check for systematic monitoring
  const dataTypes = getAnswerValue<string[]>(answers, 'data_types', [])
  if (dataTypes.includes('location') || dataTypes.includes('behavioral')) {
    reasons.push('הארגון מבצע ניטור שיטתי (נתוני מיקום/התנהגות)')
  }

  // Check for sensitive data processing
  const hasSensitiveData = dataTypes.some(type => SENSITIVE_DATA_TYPES.includes(type))
  if (hasSensitiveData) {
    reasons.push('הארגון מעבד מידע רגיש (בריאות, פיננסי, ביומטרי)')
  }

  // For now, we recommend DPO for everyone since it's our service
  const required = reasons.length > 0

  return { required, reasons }
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
  const securityMeasures = getAnswerValue<string[]>(answers, 'security_measures', [])
  const existingPolicy = getAnswerValue<boolean>(answers, 'existing_policy', false)
  const databaseRegistered = getAnswerValue<string>(answers, 'database_registered', 'unknown')

  const checklist = [
    // Documentation
    {
      id: 'privacy_policy',
      title: 'מדיניות פרטיות',
      description: 'פרסום מדיניות פרטיות באתר ובמערכות',
      category: 'documentation',
      completed: true, // We generate this
      priority: 'high' as const
    },
    {
      id: 'database_definition',
      title: 'מסמך הגדרות מאגר',
      description: 'תיעוד מאגרי המידע בארגון',
      category: 'documentation',
      completed: true, // We generate this
      priority: 'high' as const
    },
    {
      id: 'security_procedures',
      title: 'נהלי אבטחת מידע',
      description: 'נהלים כתובים לאבטחת מידע',
      category: 'documentation',
      completed: true, // We generate this
      priority: 'high' as const
    },
    {
      id: 'dpo_appointment',
      title: 'מינוי ממונה הגנת פרטיות',
      description: 'כתב מינוי רשמי לממונה',
      category: 'documentation',
      completed: true, // We generate this
      priority: 'high' as const
    },

    // Registration
    {
      id: 'database_registration',
      title: 'רישום מאגרי מידע',
      description: 'רישום מאגרים ברשות להגנת הפרטיות',
      category: 'registration',
      completed: databaseRegistered === 'yes',
      priority: 'high' as const
    },

    // Security
    {
      id: 'access_control',
      title: 'בקרת גישה',
      description: 'הגדרת הרשאות גישה למערכות',
      category: 'security',
      completed: securityMeasures.includes('access_control'),
      priority: 'high' as const
    },
    {
      id: 'encryption',
      title: 'הצפנת מידע',
      description: 'הצפנת מידע רגיש',
      category: 'security',
      completed: securityMeasures.includes('encryption'),
      priority: 'medium' as const
    },
    {
      id: 'backup',
      title: 'גיבויים',
      description: 'גיבויים סדירים של המידע',
      category: 'security',
      completed: securityMeasures.includes('backup'),
      priority: 'high' as const
    },

    // Training
    {
      id: 'employee_training',
      title: 'הדרכת עובדים',
      description: 'הדרכת עובדים בנושאי פרטיות ואבטחה',
      category: 'training',
      completed: securityMeasures.includes('training'),
      priority: 'medium' as const
    },

    // Processes
    {
      id: 'data_subject_process',
      title: 'תהליך טיפול בפניות',
      description: 'הגדרת תהליך לטיפול בבקשות נושאי מידע',
      category: 'processes',
      completed: false, // User needs to set up
      priority: 'high' as const
    },
    {
      id: 'incident_response',
      title: 'נוהל תגובה לאירועים',
      description: 'נוהל לטיפול באירועי אבטחה',
      category: 'processes',
      completed: false, // User needs to set up
      priority: 'medium' as const
    }
  ]

  return checklist
}

// src/lib/regulatory-engine.ts
// Pure functions implementing Israeli Data Security Regulations 5777-2017
// + Amendment 13 to the Privacy Protection Law

// =============================================
// Types
// =============================================

export interface VirtualDatabase {
  id: string
  name: string
  description: string
  dataCategories: string[]     // field IDs from DATA_CATEGORIES
  specialCategories: string[]  // field IDs that are sensitive/special
  estimatedRecords: number
  authorizedUsers: number
  purposes: string[]
  legalBasis: string
  internationalTransfers: boolean
  transferCountries: string[]
  retentionPeriod: string
  securityMeasures: string[]
  isPublicBody: boolean
  isDataBroker: boolean        // main purpose is transferring data to third parties
  systemsUsed: string[]
  department: string
  // Computed (set by engine)
  securityLevel?: 'individual' | 'basic' | 'medium' | 'high'
  riskScore?: number
}

export interface RegulatoryImpact {
  totalDatabases: number
  byLevel: { individual: number; basic: number; medium: number; high: number }
  requiresPpaRegistration: number
  requiresPenTest: number
  requiresRiskAssessment: number
  requiresDpo: boolean
  totalObligations: number
  estimatedAnnualCost: number   // NIS
  maxFineExposure: number       // NIS
  riskScore: number             // 0-100
}

export interface OptimizationSuggestion {
  id: string
  type: 'split' | 'merge' | 'reclassify' | 'reduce_records' | 'restrict_access' | 'remove_fields'
  title: string
  description: string
  impact: string
  affectedDatabases: string[]   // database IDs
  estimatedSaving: number       // NIS annually
  priority: 'high' | 'medium' | 'low'
}

// =============================================
// First Schedule: Sensitive Data Categories
// (triggers Medium security level)
// =============================================

const FIRST_SCHEDULE_CATEGORIES = new Set([
  // Intimate/private life
  'health', 'sexual',
  // Medical/mental
  // (health covers this)
  // Genetic
  'genetic',
  // Political/religious
  'political', 'religious',
  // Criminal
  'criminal',
  // Telecom/location data
  'location',
  // Biometric
  'biometric',
  // Financial/assets
  'bank_account', 'credit_card', 'salary', 'tax_info',
  // Racial/ethnic origin
  'racial',
  // Union membership
  'union',
  // Consumption habits revealing any above (approximated by browsing + location)
  'browsing_history',
])

// Categories that are "especially sensitive" under Amendment 13
const ESPECIALLY_SENSITIVE = new Set([
  'health', 'biometric', 'genetic', 'criminal', 'sexual', 'racial', 'political', 'religious',
])

// =============================================
// Security Level Classification
// =============================================

export function classifySecurityLevel(db: VirtualDatabase): 'individual' | 'basic' | 'medium' | 'high' {
  // Individual: sole proprietor, ≤3 users, <10K records, not a data broker
  if (
    db.authorizedUsers <= 3 &&
    db.estimatedRecords < 10000 &&
    !db.isDataBroker &&
    !db.isPublicBody
  ) {
    // Check if it contains professional confidentiality data — for simplicity, 
    // if it has any First Schedule category, it's not "individual" level
    const hasFirstSchedule = db.dataCategories.some(c => FIRST_SCHEDULE_CATEGORIES.has(c)) ||
                             db.specialCategories.some(c => FIRST_SCHEDULE_CATEGORIES.has(c))
    if (!hasFirstSchedule) {
      return 'individual'
    }
  }

  // Check for First Schedule categories → Medium
  const allCategories = [...db.dataCategories, ...db.specialCategories]
  const hasFirstScheduleData = allCategories.some(c => FIRST_SCHEDULE_CATEGORIES.has(c))
  const isMedium = hasFirstScheduleData || db.isPublicBody || db.isDataBroker

  if (!isMedium) {
    return 'basic'
  }

  // High: Medium database with >100K subjects OR >100 authorized users
  if (db.estimatedRecords > 100000 || db.authorizedUsers > 100) {
    return 'high'
  }

  return 'medium'
}

// =============================================
// Obligation Calculator
// =============================================

interface DatabaseObligations {
  definitionsDoc: boolean
  securityProcedure: boolean
  accessControl: boolean
  physicalIdentification: boolean  // MFA
  autoMonitoring: boolean          // 24-month log retention
  periodicTraining: boolean        // every 2 years
  riskAssessment: boolean          // every 18 months
  penTesting: boolean              // every 18 months
  ppaRegistration: boolean
  breachNotification: boolean      // notify PPA on severe incident
  dpoRequired: boolean
  maxFinePerViolation: number      // NIS
}

export function calculateObligations(db: VirtualDatabase): DatabaseObligations {
  const level = db.securityLevel || classifySecurityLevel(db)
  
  const base: DatabaseObligations = {
    definitionsDoc: true,
    securityProcedure: true,
    accessControl: true,
    physicalIdentification: false,
    autoMonitoring: false,
    periodicTraining: false,
    riskAssessment: false,
    penTesting: false,
    ppaRegistration: false,
    breachNotification: false,
    dpoRequired: false,
    maxFinePerViolation: 20000,
  }

  if (level === 'individual') {
    base.maxFinePerViolation = 10000
    return base
  }

  if (level === 'medium' || level === 'high') {
    base.physicalIdentification = true
    base.autoMonitoring = true
    base.periodicTraining = true
    base.breachNotification = true
    base.maxFinePerViolation = level === 'high' ? 320000 : 80000
  }

  if (level === 'high') {
    base.riskAssessment = true
    base.penTesting = true
    // PPA registration: sensitive data + >100K
    const hasSensitive = [...db.dataCategories, ...db.specialCategories]
      .some(c => FIRST_SCHEDULE_CATEGORIES.has(c))
    if (hasSensitive && db.estimatedRecords > 100000) {
      base.ppaRegistration = true
    }
  }

  // DPO requirement (Amendment 13): public body, data broker >10K, 
  // core activity is processing sensitive data at scale, systematic monitoring
  if (db.isPublicBody || (db.isDataBroker && db.estimatedRecords > 10000)) {
    base.dpoRequired = true
  }
  const hasEspeciallySensitive = [...db.dataCategories, ...db.specialCategories]
    .some(c => ESPECIALLY_SENSITIVE.has(c))
  if (hasEspeciallySensitive && db.estimatedRecords > 50000) {
    base.dpoRequired = true
  }

  return base
}

// =============================================
// Cost Estimator
// =============================================

function estimateAnnualCost(db: VirtualDatabase): number {
  const level = db.securityLevel || classifySecurityLevel(db)
  const obligations = calculateObligations(db)
  
  let cost = 0

  // Base compliance cost per level
  if (level === 'individual') cost += 2000
  else if (level === 'basic') cost += 5000
  else if (level === 'medium') cost += 15000
  else if (level === 'high') cost += 40000

  // Additional obligation costs
  if (obligations.riskAssessment) cost += 15000    // External assessment
  if (obligations.penTesting) cost += 20000         // Pen test engagement
  if (obligations.periodicTraining) cost += 5000    // Training sessions
  if (obligations.ppaRegistration) cost += 2000     // Registration + maintenance
  if (obligations.autoMonitoring) cost += 8000      // SIEM/monitoring tooling
  if (obligations.dpoRequired) cost += 30000        // DPO appointment (partial)

  return cost
}

// =============================================
// Full Impact Calculator
// =============================================

export function calculateImpact(databases: VirtualDatabase[]): RegulatoryImpact {
  // Classify each database
  const classified = databases.map(db => ({
    ...db,
    securityLevel: classifySecurityLevel(db),
  }))

  const byLevel = { individual: 0, basic: 0, medium: 0, high: 0 }
  let requiresPpaRegistration = 0
  let requiresPenTest = 0
  let requiresRiskAssessment = 0
  let requiresDpo = false
  let totalObligations = 0
  let estimatedAnnualCost = 0
  let maxFineExposure = 0

  for (const db of classified) {
    byLevel[db.securityLevel as keyof typeof byLevel]++
    const obligations = calculateObligations(db)
    
    if (obligations.ppaRegistration) requiresPpaRegistration++
    if (obligations.penTesting) requiresPenTest++
    if (obligations.riskAssessment) requiresRiskAssessment++
    if (obligations.dpoRequired) requiresDpo = true
    
    // Count active obligations
    totalObligations += Object.values(obligations).filter(v => v === true).length
    estimatedAnnualCost += estimateAnnualCost(db)
    maxFineExposure += obligations.maxFinePerViolation
  }

  // Risk score: 0 (best) to 100 (worst)
  const riskScore = Math.min(100, Math.round(
    (byLevel.high * 30 + byLevel.medium * 15 + byLevel.basic * 5) +
    (requiresPpaRegistration * 10) +
    (requiresDpo ? 5 : 0) +
    Math.min(20, databases.length * 2)
  ))

  return {
    totalDatabases: databases.length,
    byLevel,
    requiresPpaRegistration,
    requiresPenTest,
    requiresRiskAssessment,
    requiresDpo,
    totalObligations,
    estimatedAnnualCost,
    maxFineExposure,
    riskScore,
  }
}

// =============================================
// Compare Two Impacts (before/after delta)
// =============================================

export interface ImpactDelta {
  riskScoreDelta: number
  costDelta: number
  obligationsDelta: number
  ppaRegistrationDelta: number
  levelChanges: { database: string; from: string; to: string }[]
}

export function compareImpacts(
  before: RegulatoryImpact, 
  after: RegulatoryImpact,
  beforeDbs: VirtualDatabase[],
  afterDbs: VirtualDatabase[]
): ImpactDelta {
  const levelChanges: { database: string; from: string; to: string }[] = []
  
  // Match databases by ID and detect level changes
  for (const afterDb of afterDbs) {
    const beforeDb = beforeDbs.find(b => b.id === afterDb.id)
    if (beforeDb) {
      const beforeLevel = classifySecurityLevel(beforeDb)
      const afterLevel = classifySecurityLevel(afterDb)
      if (beforeLevel !== afterLevel) {
        levelChanges.push({ database: afterDb.name, from: beforeLevel, to: afterLevel })
      }
    }
  }

  return {
    riskScoreDelta: after.riskScore - before.riskScore,
    costDelta: after.estimatedAnnualCost - before.estimatedAnnualCost,
    obligationsDelta: after.totalObligations - before.totalObligations,
    ppaRegistrationDelta: after.requiresPpaRegistration - before.requiresPpaRegistration,
    levelChanges,
  }
}

// =============================================
// Processing Activities → Virtual Databases
// (Bridge from current ROPA model)
// =============================================

export function activitiesToDatabases(activities: any[]): VirtualDatabase[] {
  return activities.map(a => ({
    id: a.id,
    name: a.name || 'Unnamed',
    description: a.description || '',
    dataCategories: a.data_categories || [],
    specialCategories: a.special_categories || [],
    estimatedRecords: a.estimated_records_count || 0,
    authorizedUsers: 10,  // Default; not tracked in current schema
    purposes: a.purposes || [],
    legalBasis: a.legal_basis || '',
    internationalTransfers: a.international_transfers || false,
    transferCountries: a.transfer_countries || [],
    retentionPeriod: a.retention_period || '',
    securityMeasures: a.security_measures || [],
    isPublicBody: false,
    isDataBroker: false,
    systemsUsed: a.systems_used || [],
    department: a.department || '',
  }))
}

// =============================================
// Data Category Labels (Hebrew)
// =============================================

export const CATEGORY_LABELS: Record<string, { label: string; sensitive: boolean }> = {
  // Basic
  name: { label: 'שם מלא', sensitive: false },
  email: { label: 'אימייל', sensitive: false },
  phone: { label: 'טלפון', sensitive: false },
  address: { label: 'כתובת', sensitive: false },
  date_of_birth: { label: 'תאריך לידה', sensitive: false },
  gender: { label: 'מגדר', sensitive: false },
  photo: { label: 'תמונה', sensitive: false },
  // Identifiers
  id_number: { label: 'ת.ז.', sensitive: true },
  passport: { label: 'דרכון', sensitive: true },
  drivers_license: { label: 'רישיון נהיגה', sensitive: false },
  // Financial
  bank_account: { label: 'חשבון בנק', sensitive: true },
  credit_card: { label: 'כרטיס אשראי', sensitive: true },
  salary: { label: 'שכר', sensitive: true },
  tax_info: { label: 'מידע מס', sensitive: true },
  // Sensitive (First Schedule)
  health: { label: 'מידע רפואי', sensitive: true },
  biometric: { label: 'ביומטרי', sensitive: true },
  genetic: { label: 'גנטי', sensitive: true },
  racial: { label: 'מוצא אתני', sensitive: true },
  political: { label: 'פוליטי', sensitive: true },
  religious: { label: 'דתי', sensitive: true },
  sexual: { label: 'נטייה מינית', sensitive: true },
  criminal: { label: 'עבר פלילי', sensitive: true },
  union: { label: 'ארגון עובדים', sensitive: true },
  // Digital
  ip_address: { label: 'כתובת IP', sensitive: false },
  cookies: { label: 'עוגיות', sensitive: false },
  device_id: { label: 'מזהה מכשיר', sensitive: false },
  location: { label: 'מיקום GPS', sensitive: true },
  browsing_history: { label: 'היסטוריית גלישה', sensitive: true },
  // Employment
  employment_history: { label: 'היסטוריית תעסוקה', sensitive: false },
  education: { label: 'השכלה', sensitive: false },
  performance: { label: 'ביצועים', sensitive: false },
  attendance: { label: 'נוכחות', sensitive: false },
}

export const SECURITY_LEVEL_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  individual: { label: 'פרטני', color: '#6b7280', bgColor: '#f3f4f6' },
  basic: { label: 'בסיסי', color: '#22c55e', bgColor: '#f0fdf4' },
  medium: { label: 'בינוני', color: '#f59e0b', bgColor: '#fffbeb' },
  high: { label: 'גבוה', color: '#ef4444', bgColor: '#fef2f2' },
}

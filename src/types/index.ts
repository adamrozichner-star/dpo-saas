// Organization types
export type OrganizationStatus = 'onboarding' | 'active' | 'suspended'
export type RiskLevel = 'standard' | 'sensitive' | 'high'
export type SubscriptionTier = 'basic' | 'extended'

export interface Organization {
  id: string
  name: string
  businessId: string
  tier: SubscriptionTier
  status: OrganizationStatus
  riskLevel: RiskLevel
  dpoId: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationProfile {
  id: string
  orgId: string
  businessType: string
  employeeCount: number
  dataTypes: DataType[]
  processingPurposes: string[]
  databases: DatabaseInfo[]
  thirdParties: ThirdParty[]
  securityMeasures: string[]
  profileVersion: number
  createdAt: string
}

export interface DataType {
  type: string
  category: 'contact' | 'financial' | 'health' | 'biometric' | 'behavioral' | 'other'
  sensitive: boolean
  source: string
}

export interface DatabaseInfo {
  name: string
  purpose: string
  dataTypes: string[]
  registered: boolean
  registrationNumber?: string
}

export interface ThirdParty {
  name: string
  purpose: string
  location: string
  agreement: boolean
}

// Document types
export type DocumentType = 
  | 'privacy_policy' 
  | 'database_registration' 
  | 'security_policy' 
  | 'procedure' 
  | 'custom'

export type DocumentStatus = 'draft' | 'active' | 'archived'

export interface Document {
  id: string
  orgId: string
  type: DocumentType
  title: string
  content: string
  version: number
  status: DocumentStatus
  generatedBy: 'ai' | 'manual'
  approvedBy: string | null
  createdAt: string
  updatedAt: string
}

// User types
export type UserRole = 'admin' | 'employee' | 'viewer'

export interface User {
  id: string
  orgId: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

// DPO types
export interface DPO {
  id: string
  name: string
  email: string
  licenseNumber: string
  maxClients: number
  activeClients: number
  createdAt: string
}

// Q&A types
export interface QAInteraction {
  id: string
  orgId: string
  userId: string
  question: string
  answer: string
  confidenceScore: number
  escalated: boolean
  escalationId: string | null
  createdAt: string
}

// Escalation types
export type EscalationType = 'qa' | 'incident' | 'review' | 'custom'
export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type EscalationStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Escalation {
  id: string
  orgId: string
  type: EscalationType
  priority: EscalationPriority
  subject: string
  description: string
  status: EscalationStatus
  dpoTimeMinutes: number
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
}

// Subscription types
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled'

export interface Subscription {
  id: string
  orgId: string
  tier: SubscriptionTier
  monthlyPrice: number
  dpoMinutesQuota: number
  dpoMinutesUsed: number
  billingCycleStart: string
  status: SubscriptionStatus
  createdAt: string
}

// Onboarding types
export interface OnboardingQuestion {
  id: string
  text: string
  type: 'single_choice' | 'multi_choice' | 'text' | 'number' | 'boolean'
  options?: { value: string; label: string }[]
  required: boolean
  helpText?: string
  category: string
}

export interface OnboardingAnswer {
  questionId: string
  value: string | string[] | number | boolean
}

export interface OnboardingState {
  step: number
  totalSteps: number
  answers: OnboardingAnswer[]
  currentQuestions: OnboardingQuestion[]
  progress: number
  completed: boolean
}

// Audit types
export interface AuditLog {
  id: string
  orgId: string
  action: string
  entityType: string
  entityId: string
  actorId: string
  actorType: 'user' | 'dpo' | 'system' | 'ai'
  details: Record<string, unknown>
  createdAt: string
}

import { create } from 'zustand'
import { 
  Organization, 
  User, 
  Document, 
  OnboardingAnswer,
  Subscription,
  QAInteraction,
  Escalation
} from '@/types'
import { 
  mockUser, 
  mockOrganizations, 
  mockDocuments, 
  mockSubscription,
  mockQAInteractions,
  mockEscalations,
  mockDPO
} from './mock-data'

interface AppState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  organization: Organization | null
  setOrganization: (org: Organization) => void
  onboardingAnswers: OnboardingAnswer[]
  onboardingStep: number
  setOnboardingAnswer: (answer: OnboardingAnswer) => void
  nextOnboardingStep: () => void
  prevOnboardingStep: () => void
  resetOnboarding: () => void
  completeOnboarding: () => Promise<void>
  documents: Document[]
  loadDocuments: () => void
  subscription: Subscription | null
  selectTier: (tier: 'basic' | 'extended') => void
  qaHistory: QAInteraction[]
  askQuestion: (question: string) => Promise<QAInteraction>
  escalations: Escalation[]
  loadEscalations: () => void
  allOrganizations: Organization[]
  loadAllOrganizations: () => void
  dpo: typeof mockDPO | null
  loadDPO: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (email && password) {
      if (email.includes('dpo') || email.includes('dana')) {
        set({ 
          user: { ...mockUser, email, role: 'admin' as const, name: 'עו"ד דנה כהן' },
          isAuthenticated: true,
          organization: null
        })
      } else {
        set({ 
          user: { ...mockUser, email },
          isAuthenticated: true,
          organization: mockOrganizations[0]
        })
      }
      return true
    }
    return false
  },
  
  logout: () => {
    set({ 
      user: null, 
      isAuthenticated: false,
      organization: null,
      onboardingStep: 0,
      onboardingAnswers: []
    })
  },
  
  organization: null,
  setOrganization: (org) => set({ organization: org }),
  
  onboardingAnswers: [],
  onboardingStep: 0,
  
  setOnboardingAnswer: (answer) => {
    const answers = get().onboardingAnswers
    const existing = answers.findIndex(a => a.questionId === answer.questionId)
    if (existing >= 0) {
      answers[existing] = answer
      set({ onboardingAnswers: [...answers] })
    } else {
      set({ onboardingAnswers: [...answers, answer] })
    }
  },
  
  nextOnboardingStep: () => {
    set({ onboardingStep: get().onboardingStep + 1 })
  },
  
  prevOnboardingStep: () => {
    const step = get().onboardingStep
    if (step > 0) set({ onboardingStep: step - 1 })
  },
  
  resetOnboarding: () => {
    set({ onboardingStep: 0, onboardingAnswers: [] })
  },
  
  completeOnboarding: async () => {
    set({ 
      organization: mockOrganizations[0],
      onboardingStep: 5 
    })
  },
  
  documents: [],
  loadDocuments: () => {
    set({ documents: mockDocuments })
  },
  
  subscription: null,
  selectTier: (tier) => {
    set({ 
      subscription: {
        ...mockSubscription,
        tier,
        monthlyPrice: tier === 'basic' ? 500 : 1200
      }
    })
  },
  
  qaHistory: [],
  
  askQuestion: async (question: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    const response: QAInteraction = {
      id: 'qa-' + Date.now(),
      orgId: get().organization?.id || '',
      userId: get().user?.id || '',
      question,
      answer: generateMockAnswer(question),
      confidenceScore: Math.random() * 0.3 + 0.7,
      escalated: false,
      escalationId: null,
      createdAt: new Date().toISOString()
    }
    set({ qaHistory: [response, ...get().qaHistory] })
    return response
  },
  
  escalations: [],
  loadEscalations: () => {
    set({ escalations: mockEscalations })
  },
  
  allOrganizations: [],
  loadAllOrganizations: () => {
    set({ allOrganizations: mockOrganizations })
  },
  
  dpo: null,
  loadDPO: () => {
    set({ dpo: mockDPO })
  }
}))

function generateMockAnswer(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('מחיקה') || q.includes('למחוק')) {
    return 'בהתאם לזכות המחיקה בחוק הגנת הפרטיות, יש לטפל בבקשת מחיקה תוך 30 יום.'
  }
  if (q.includes('ניוזלטר') || q.includes('דיוור')) {
    return 'שליחת דיוור שיווקי מחייבת הסכמה מפורשת מראש (opt-in).'
  }
  return 'תודה על השאלה. מומלץ לפנות לממונה לקבלת הכוונה נוספת.'
}

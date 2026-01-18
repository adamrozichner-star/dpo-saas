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
  // Auth
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  
  // Organization
  organization: Organization | null
  setOrganization: (org: Organization) => void
  
  // Onboarding
  onboardingAnswers: OnboardingAnswer[]
  onboardingStep: number
  setOnboardingAnswer: (answer: OnboardingAnswer) => void
  nextOnboardingStep: () => void
  prevOnboardingStep: () => void
  resetOnboarding: () => void
  completeOnboarding: () => Promise<void>
  
  // Documents
  documents: Document[]
  loadDocuments: () => void
  
  // Subscription
  subscription: Subscription | null
  selectTier: (tier: 'basic' | 'extended') => void
  
  // Q&A
  qaHistory: QAInteraction[]
  askQuestion: (question: string) => Promise<QAInteraction>
  
  // Escalations (for DPO view)
  escalations: Escalation[]
  loadEscalations: () => void
  
  // All organizations (for DPO view)
  allOrganizations: Organization[]
  loadAllOrganizations: () => void
  
  // DPO info
  dpo: typeof mockDPO | null
  loadDPO: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    // Mock login - in production, this would call Supabase
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (email && password) {
      // Check if it's DPO login
      if (email.includes('dpo') || email.includes('dana')) {
        set({ 
          user: { ...mockUser, email, role: 'admin' as const, name: 'עו"ד דנה כהן' },
          isAuthenticated: true,
          organization: null // DPO doesn't have a single org
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
  
  // Organization
  organization: null,
  setOrganization: (org) => set({ organization: org }),
  
  // Onboarding
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
    // Mock completion - would call AI to generate documents
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newOrg: Organization = {
      id: 'new-org-' + Date.now(),
      name: String(get().onboardingAnswers.find(a => a.questionId === 'business_name')?.value || 'עסק חדש'),
      businessId: String(get().onboardingAnswers.find(a => a.questionId === 'business_id')?.value || ''),
      tier: get().subscription?.tier || 'basic',
      status: 'active',
      riskLevel: 'standard',
      dpoId: 'dpo-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    set({ 
      organization: newOrg,
      documents: mockDocuments.map(d => ({ ...d, orgId: newOrg.id }))
    })
  },
  
  // Documents
  documents: [],
  loadDocuments: () => {
    set({ documents: mockDocuments })
  },
  
  // Subscription
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
  
  // Q&A
  qaHistory: [],
  
  askQuestion: async (question: string) => {
    // Mock AI response - would call Claude API
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
  
  // Escalations
  escalations: [],
  loadEscalations: () => {
    set({ escalations: mockEscalations })
  },
  
  // All organizations (DPO view)
  allOrganizations: [],
  loadAllOrganizations: () => {
    set({ allOrganizations: mockOrganizations })
  },
  
  // DPO
  dpo: null,
  loadDPO: () => {
    set({ dpo: mockDPO })
  }
}))

// Helper function to generate mock AI answers
function generateMockAnswer(question: string): string {
  const questionLower = question.toLowerCase()
  
  if (questionLower.includes('מחיקה') || questionLower.includes('למחוק')) {
    return 'בהתאם לזכות המחיקה בחוק הגנת הפרטיות, יש לטפל בבקשת מחיקה תוך 30 יום. יש לתעד את הבקשה, לבצע את המחיקה מכל המערכות, ולשלוח אישור ללקוח. במקרים מסוימים (כמו חובה חוקית לשמור מידע) ניתן לסרב - במקרה כזה יש להסביר ללקוח את הסיבה.'
  }
  
  if (questionLower.includes('ניוזלטר') || questionLower.includes('דיוור') || questionLower.includes('שיווק')) {
    return 'שליחת דיוור שיווקי מחייבת הסכמה מפורשת מראש (opt-in). ההסכמה צריכה להיות: 1) ברורה וספציפית, 2) מתועדת, 3) ניתנת לביטול בכל עת. יש לכלול קישור להסרה בכל הודעה. הפרה של חוק הספאם עלולה לגרור קנסות משמעותיים.'
  }
  
  if (questionLower.includes('דליפה') || questionLower.includes('אבטחה') || questionLower.includes('פריצה')) {
    return 'במקרה של אירוע אבטחה: 1) יש לתעד את האירוע מיידית, 2) להודיע לממונה על הגנת הפרטיות, 3) אם יש סיכון משמעותי - להודיע גם לנפגעים הפוטנציאליים, 4) לדווח לרשם מאגרי המידע בתוך 72 שעות. מומלץ ליצור קשר עם הממונה לליווי התהליך.'
  }
  
  return 'תודה על השאלה. בהתאם למדיניות הפרטיות והנהלים של הארגון שלכם, אני ממליץ לפעול בזהירות ולתעד כל פעולה. אם יש צורך בהכוונה נוספת או חוות דעת מקצועית, ניתן לפנות לממונה דרך כפתור "פנייה לממונה" למטה.'
}

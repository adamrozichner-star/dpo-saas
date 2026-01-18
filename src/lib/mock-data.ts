import { 
  Organization, 
  OrganizationProfile, 
  Document, 
  User, 
  DPO,
  QAInteraction,
  Escalation,
  Subscription,
  OnboardingQuestion
} from '@/types'

// Mock DPO
export const mockDPO: DPO = {
  id: 'dpo-1',
  name: 'עו"ד דנה כהן',
  email: 'dana@dpo-service.co.il',
  licenseNumber: 'DPO-2024-001',
  maxClients: 500,
  activeClients: 47,
  createdAt: '2024-01-01T00:00:00Z'
}

// Mock Organizations
export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'טכנולוגיות אלפא בע"מ',
    businessId: '515123456',
    tier: 'basic',
    status: 'active',
    riskLevel: 'standard',
    dpoId: 'dpo-1',
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z'
  },
  {
    id: 'org-2',
    name: 'קליניקת ד"ר לוי',
    businessId: '515789012',
    tier: 'extended',
    status: 'active',
    riskLevel: 'sensitive',
    dpoId: 'dpo-1',
    createdAt: '2024-08-20T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z'
  },
  {
    id: 'org-3',
    name: 'חנות הספורט',
    businessId: '515456789',
    tier: 'basic',
    status: 'onboarding',
    riskLevel: 'standard',
    dpoId: 'dpo-1',
    createdAt: '2024-12-10T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z'
  }
]

// Mock Organization Profile
export const mockProfile: OrganizationProfile = {
  id: 'profile-1',
  orgId: 'org-1',
  businessType: 'technology',
  employeeCount: 25,
  dataTypes: [
    { type: 'שם ופרטי קשר', category: 'contact', sensitive: false, source: 'לקוחות' },
    { type: 'פרטי תשלום', category: 'financial', sensitive: true, source: 'עסקאות' },
  ],
  processingPurposes: ['שירות לקוחות', 'שיווק', 'חיוב'],
  databases: [
    { name: 'מאגר לקוחות', purpose: 'ניהול לקוחות', dataTypes: ['שם', 'טלפון', 'אימייל'], registered: true, registrationNumber: 'DB-2024-001' }
  ],
  thirdParties: [
    { name: 'ספק ענן', purpose: 'אחסון נתונים', location: 'ישראל', agreement: true }
  ],
  securityMeasures: ['הצפנה', 'בקרת גישה', 'גיבויים'],
  profileVersion: 1,
  createdAt: '2024-06-15T00:00:00Z'
}

// Mock Documents
export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    orgId: 'org-1',
    type: 'privacy_policy',
    title: 'מדיניות פרטיות',
    content: '# מדיניות פרטיות\n\nמסמך זה מתאר את מדיניות הפרטיות של החברה...',
    version: 1,
    status: 'active',
    generatedBy: 'ai',
    approvedBy: 'dpo-1',
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z'
  },
  {
    id: 'doc-2',
    orgId: 'org-1',
    type: 'security_policy',
    title: 'מדיניות אבטחת מידע',
    content: '# מדיניות אבטחת מידע\n\nמסמך זה מתאר את נהלי אבטחת המידע...',
    version: 1,
    status: 'active',
    generatedBy: 'ai',
    approvedBy: 'dpo-1',
    createdAt: '2024-06-16T00:00:00Z',
    updatedAt: '2024-06-16T00:00:00Z'
  },
  {
    id: 'doc-3',
    orgId: 'org-1',
    type: 'database_registration',
    title: 'רישום מאגר מידע - לקוחות',
    content: '# רישום מאגר מידע\n\nפרטי המאגר...',
    version: 1,
    status: 'active',
    generatedBy: 'ai',
    approvedBy: 'dpo-1',
    createdAt: '2024-06-17T00:00:00Z',
    updatedAt: '2024-06-17T00:00:00Z'
  }
]

// Mock User
export const mockUser: User = {
  id: 'user-1',
  orgId: 'org-1',
  email: 'admin@alpha-tech.co.il',
  name: 'יוסי ישראלי',
  role: 'admin',
  createdAt: '2024-06-15T00:00:00Z'
}

// Mock Subscription
export const mockSubscription: Subscription = {
  id: 'sub-1',
  orgId: 'org-1',
  tier: 'basic',
  monthlyPrice: 500,
  dpoMinutesQuota: 30,
  dpoMinutesUsed: 5,
  billingCycleStart: '2024-12-01',
  status: 'active',
  createdAt: '2024-06-15T00:00:00Z'
}

// Mock Q&A Interactions
export const mockQAInteractions: QAInteraction[] = [
  {
    id: 'qa-1',
    orgId: 'org-1',
    userId: 'user-1',
    question: 'האם אני יכול לשלוח ניוזלטר ללקוחות ללא הסכמה?',
    answer: 'לא, על פי חוק הגנת הפרטיות וחוק הספאם, יש לקבל הסכמה מפורשת מהלקוח לפני שליחת דיוור שיווקי. ההסכמה צריכה להיות ברורה, מתועדת, וניתנת לביטול בכל עת.',
    confidenceScore: 0.95,
    escalated: false,
    escalationId: null,
    createdAt: '2024-12-05T10:30:00Z'
  },
  {
    id: 'qa-2',
    orgId: 'org-1',
    userId: 'user-1',
    question: 'מה עלי לעשות אם לקוח מבקש למחוק את המידע שלו?',
    answer: 'יש לפעול בהתאם לזכות המחיקה: 1) לאשר קבלת הבקשה תוך 48 שעות, 2) לבצע את המחיקה תוך 30 יום, 3) לתעד את הפעולה במערכת. במקרים מסוימים (כמו דרישה חוקית לשמירת מידע) ניתן לסרב - יש להתייעץ עם הממונה.',
    confidenceScore: 0.88,
    escalated: false,
    escalationId: null,
    createdAt: '2024-12-08T14:15:00Z'
  }
]

// Mock Escalations
export const mockEscalations: Escalation[] = [
  {
    id: 'esc-1',
    orgId: 'org-2',
    type: 'incident',
    priority: 'high',
    subject: 'חשד לדליפת מידע',
    description: 'התגלה שמייל עם פרטי מטופלים נשלח לכתובת שגויה',
    status: 'in_progress',
    dpoTimeMinutes: 45,
    resolution: null,
    createdAt: '2024-12-10T09:00:00Z',
    resolvedAt: null
  },
  {
    id: 'esc-2',
    orgId: 'org-1',
    type: 'qa',
    priority: 'medium',
    subject: 'שאלה על העברת מידע לחו"ל',
    description: 'הלקוח שואל האם ניתן להעביר מידע לספק שרתים באירופה',
    status: 'resolved',
    dpoTimeMinutes: 15,
    resolution: 'הועברה חוות דעת מפורטת לגבי תקנות GDPR והתאמת ההסכמים הנדרשים',
    createdAt: '2024-12-08T11:30:00Z',
    resolvedAt: '2024-12-09T10:00:00Z'
  }
]

// Onboarding Questions
export const onboardingQuestions: OnboardingQuestion[] = [
  // Step 1: Business Basics
  {
    id: 'business_name',
    text: 'מה שם העסק?',
    type: 'text',
    required: true,
    helpText: 'השם הרשום של העסק',
    category: 'basics'
  },
  {
    id: 'business_id',
    text: 'מספר ח.פ / עוסק מורשה',
    type: 'text',
    required: true,
    helpText: '9 ספרות',
    category: 'basics'
  },
  {
    id: 'business_type',
    text: 'מה תחום הפעילות העיקרי?',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'retail', label: 'קמעונאות / מסחר' },
      { value: 'technology', label: 'טכנולוגיה / הייטק' },
      { value: 'healthcare', label: 'בריאות / רפואה' },
      { value: 'finance', label: 'פיננסים / ביטוח' },
      { value: 'education', label: 'חינוך / הדרכה' },
      { value: 'services', label: 'שירותים מקצועיים' },
      { value: 'manufacturing', label: 'ייצור / תעשייה' },
      { value: 'other', label: 'אחר' }
    ],
    category: 'basics'
  },
  {
    id: 'employee_count',
    text: 'כמה עובדים יש בעסק?',
    type: 'single_choice',
    required: true,
    options: [
      { value: '1-10', label: '1-10' },
      { value: '11-50', label: '11-50' },
      { value: '51-200', label: '51-200' },
      { value: '200+', label: 'מעל 200' }
    ],
    category: 'basics'
  },
  // Step 2: Data Collection
  {
    id: 'data_types',
    text: 'אילו סוגי מידע אתם אוספים?',
    type: 'multi_choice',
    required: true,
    options: [
      { value: 'contact', label: 'פרטי קשר (שם, טלפון, אימייל)' },
      { value: 'id', label: 'מספר זהות / דרכון' },
      { value: 'financial', label: 'פרטי תשלום / פיננסיים' },
      { value: 'health', label: 'מידע רפואי / בריאותי' },
      { value: 'biometric', label: 'מידע ביומטרי (טביעות, פנים)' },
      { value: 'location', label: 'נתוני מיקום' },
      { value: 'behavioral', label: 'נתוני התנהגות / גלישה' },
      { value: 'employment', label: 'מידע תעסוקתי' }
    ],
    helpText: 'ניתן לבחור מספר אפשרויות',
    category: 'data'
  },
  {
    id: 'data_sources',
    text: 'מאיפה מגיע המידע?',
    type: 'multi_choice',
    required: true,
    options: [
      { value: 'direct', label: 'ישירות מהלקוחות/משתמשים' },
      { value: 'website', label: 'אתר אינטרנט / אפליקציה' },
      { value: 'third_party', label: 'צדדים שלישיים' },
      { value: 'public', label: 'מקורות ציבוריים' },
      { value: 'employees', label: 'עובדים' }
    ],
    category: 'data'
  },
  {
    id: 'processing_purposes',
    text: 'למה משמש המידע?',
    type: 'multi_choice',
    required: true,
    options: [
      { value: 'service', label: 'מתן שירות / מילוי הזמנות' },
      { value: 'marketing', label: 'שיווק ופרסום' },
      { value: 'analytics', label: 'אנליטיקס ומחקר' },
      { value: 'legal', label: 'עמידה בדרישות חוק' },
      { value: 'hr', label: 'ניהול משאבי אנוש' },
      { value: 'security', label: 'אבטחה ומניעת הונאות' }
    ],
    category: 'data'
  },
  // Step 3: Data Sharing & Storage
  {
    id: 'third_party_sharing',
    text: 'האם משתפים מידע עם גורמים חיצוניים?',
    type: 'boolean',
    required: true,
    helpText: 'כולל ספקי שירות, שותפים עסקיים, וכו\'',
    category: 'sharing'
  },
  {
    id: 'international_transfer',
    text: 'האם מידע מועבר או מאוחסן מחוץ לישראל?',
    type: 'boolean',
    required: true,
    category: 'sharing'
  },
  {
    id: 'cloud_storage',
    text: 'האם משתמשים בשירותי ענן?',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'none', label: 'לא' },
      { value: 'israeli', label: 'כן - ספק ישראלי' },
      { value: 'international', label: 'כן - ספק בינלאומי' },
      { value: 'both', label: 'שניהם' }
    ],
    category: 'sharing'
  },
  // Step 4: Security
  {
    id: 'security_measures',
    text: 'אילו אמצעי אבטחה קיימים?',
    type: 'multi_choice',
    required: true,
    options: [
      { value: 'encryption', label: 'הצפנת מידע' },
      { value: 'access_control', label: 'בקרת גישה והרשאות' },
      { value: 'backup', label: 'גיבויים סדירים' },
      { value: 'firewall', label: 'חומת אש' },
      { value: 'antivirus', label: 'אנטי-וירוס' },
      { value: 'training', label: 'הדרכות לעובדים' },
      { value: 'none', label: 'אין נהלים מסודרים' }
    ],
    category: 'security'
  },
  {
    id: 'previous_incidents',
    text: 'האם היו אירועי אבטחה או דליפות מידע בעבר?',
    type: 'boolean',
    required: true,
    category: 'security'
  },
  // Step 5: Current Compliance
  {
    id: 'existing_policy',
    text: 'האם קיימת מדיניות פרטיות כתובה?',
    type: 'boolean',
    required: true,
    category: 'compliance'
  },
  {
    id: 'database_registered',
    text: 'האם מאגרי המידע רשומים ברשם מאגרי המידע?',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'yes', label: 'כן, כולם' },
      { value: 'partial', label: 'חלקם' },
      { value: 'no', label: 'לא' },
      { value: 'unknown', label: 'לא יודע/ת' }
    ],
    category: 'compliance'
  }
]

// Group questions by step
export const onboardingSteps = [
  { id: 1, title: 'פרטי העסק', questions: onboardingQuestions.filter(q => q.category === 'basics') },
  { id: 2, title: 'סוגי המידע', questions: onboardingQuestions.filter(q => q.category === 'data') },
  { id: 3, title: 'שיתוף ואחסון', questions: onboardingQuestions.filter(q => q.category === 'sharing') },
  { id: 4, title: 'אבטחת מידע', questions: onboardingQuestions.filter(q => q.category === 'security') },
  { id: 5, title: 'מצב קיים', questions: onboardingQuestions.filter(q => q.category === 'compliance') }
]

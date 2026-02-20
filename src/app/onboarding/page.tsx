'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Shield, ArrowRight, ArrowLeft, CheckCircle2, Building2,
  Globe, Users, Loader2, Sparkles, Phone, Mail, User,
  Monitor, Smartphone, CreditCard, Heart, Baby, X
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DPO_CONFIG } from '@/lib/dpo-config'

// =============================================
// SOFTWARE OPTIONS — the key insight: ask about tools, not compliance
// =============================================
const softwareOptions = [
  { id: 'priority', label: 'Priority' },
  { id: 'monday', label: 'Monday' },
  { id: 'salesforce', label: 'Salesforce' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'google_workspace', label: 'Google Workspace' },
  { id: 'microsoft_365', label: 'Microsoft 365' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'woocommerce', label: 'WooCommerce' },
  { id: 'wix', label: 'Wix' },
  { id: 'elementor', label: 'Elementor / WordPress' },
  { id: 'crm_other', label: 'CRM אחר' },
  { id: 'erp_other', label: 'ERP אחר' },
  { id: 'payroll', label: 'מערכת שכר' },
  { id: 'accounting', label: 'הנה"ח (חשבשבת, רווחית)' },
  { id: 'other', label: 'אחר' },
]

const industries = [
  { id: 'retail', label: 'קמעונאות / מסחר', icon: '🛍️' },
  { id: 'technology', label: 'טכנולוגיה / הייטק', icon: '💻' },
  { id: 'healthcare', label: 'בריאות / רפואה', icon: '🏥' },
  { id: 'finance', label: 'פיננסים / ביטוח', icon: '🏦' },
  { id: 'education', label: 'חינוך / הדרכה', icon: '🎓' },
  { id: 'services', label: 'שירותים מקצועיים', icon: '💼' },
  { id: 'manufacturing', label: 'ייצור / תעשייה', icon: '🏭' },
  { id: 'food', label: 'מזון / מסעדנות', icon: '🍽️' },
  { id: 'realestate', label: 'נדל"ן', icon: '🏠' },
  { id: 'other', label: 'אחר', icon: '📦' },
]

const employeeCounts = [
  { id: '1-10', label: 'עד 10' },
  { id: '11-50', label: '11-50' },
  { id: '51-250', label: '51-250' },
  { id: '250+', label: '+250' },
]

// =============================================
// MAIN COMPONENT
// =============================================
function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, loading } = useAuth()

  const [step, setStep] = useState(0) // 0-3 = intake screens, 4 = generating
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStatus, setGenStatus] = useState('')
  const [genProgress, setGenProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Form data — business questions, NOT compliance questions
  const [form, setForm] = useState({
    // Screen 1: About the business
    business_name: '',
    business_id: '',
    industry: '',
    employee_count: '',
    // Screen 2: How the business works
    website_url: '',
    software: [] as string[],
    has_app: null as boolean | null,
    // Screen 3: Who are the customers
    customer_type: [] as string[], // b2b, b2c
    works_with_minors: null as boolean | null,
    has_health_data: null as boolean | null,
    collects_payments: null as boolean | null,
    // Screen 4: Contact
    contact_name: '',
    contact_role: '',
    contact_email: '',
    contact_phone: '',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !form.contact_email) {
      setForm(f => ({ ...f, contact_email: user.email || '' }))
    }
  }, [user])

  // Auto-save to localStorage
  useEffect(() => {
    if (form.business_name || form.industry) {
      localStorage.setItem('dpo_onboarding_v2', JSON.stringify({ form, step }))
    }
  }, [form, step])

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dpo_onboarding_v2')
    if (saved) {
      try {
        const { form: savedForm, step: savedStep } = JSON.parse(saved)
        if (savedForm) setForm(savedForm)
        if (savedStep) setStep(savedStep)
      } catch (e) {}
    }
  }, [])

  // =============================================
  // HELPERS
  // =============================================
  const updateForm = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const toggleArrayItem = (field: string, value: string) => {
    setForm(f => {
      const arr = (f as any)[field] as string[]
      return {
        ...f,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      }
    })
  }

  const canProceed = () => {
    switch (step) {
      case 0: return form.business_name && form.business_id && form.industry && form.employee_count
      case 1: return true // Software is optional, website is optional
      case 2: return form.customer_type.length > 0
      case 3: return form.contact_name && form.contact_email
      default: return false
    }
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // =============================================
  // COMPLETION — create org + generate docs
  // =============================================
  const handleComplete = async () => {
    if (!supabase || !user) {
      setError('לא מחובר למערכת')
      return
    }

    setIsGenerating(true)
    setStep(4) // Switch to generating screen
    setError(null)
    setGenProgress(5)
    setGenStatus('יוצרים את הארגון שלכם...')

    try {
      // 1. Check if user already has an org (from payment flow)
      setGenProgress(15)
      const { data: existingUser } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      let orgId = existingUser?.org_id

      if (orgId) {
        // Update existing org with onboarding data
        await supabase
          .from('organizations')
          .update({
            name: form.business_name,
            business_id: form.business_id,
          })
          .eq('id', orgId)
      } else {
        // No org yet — create one
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: form.business_name,
            business_id: form.business_id,
            tier: 'basic',
            status: 'active'
          })
          .select()
          .single()

        if (orgError) throw new Error('שגיאה ביצירת הארגון: ' + orgError.message)
        orgId = orgData.id

        // Link user to new org
        await supabase
          .from('users')
          .update({ org_id: orgId })
          .eq('auth_user_id', user.id)
      }

      setGenProgress(25)
      setGenStatus('מעדכנים את פרטי המשתמש...')

      // 3. Save business profile
      setGenProgress(35)
      setGenStatus('שומרים את פרופיל העסק...')
      
      // Convert form to the answers format the system expects
      const answers = Object.entries(form).map(([key, value]) => ({
        questionId: key,
        value
      }))

      await supabase
        .from('organization_profiles')
        .insert({
          org_id: orgId,
          profile_data: { 
            answers, 
            form,
            completedAt: new Date().toISOString(),
            version: 2 // New onboarding version
          }
        })

      // 4. Generate documents via AI
      setGenProgress(50)
      setGenStatus('הממונה מנתח את העסק שלכם...')

      // Get auth token for the API call
      const { data: { session } } = await supabase.auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`
      }

      try {
        setGenProgress(60)
        setGenStatus('מכינים מדיניות פרטיות...')
        
        await new Promise(r => setTimeout(r, 800))
        setGenProgress(70)
        setGenStatus('מכינים נוהל אבטחת מידע...')
        
        await new Promise(r => setTimeout(r, 800))
        setGenProgress(80)
        setGenStatus('ממפים מאגרי מידע...')

        const response = await fetch('/api/generate-documents', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            orgId: orgId,
            orgName: form.business_name,
            businessId: form.business_id,
            answers
          })
        })
        
        if (response.ok) {
          setGenProgress(90)
          setGenStatus('מסמכים נוצרו בהצלחה!')
        }
      } catch (docError) {
        console.log('Document generation skipped:', docError)
        setGenProgress(90)
        setGenStatus('ממשיכים להגדרת המערכת...')
      }

      // 5. Send welcome email
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': 'internal' // Email route now requires auth
          },
          body: JSON.stringify({
            template: 'welcome',
            to: user.email,
            data: {
              name: form.contact_name || user.user_metadata?.name || 'משתמש',
              orgName: form.business_name
            }
          })
        })
      } catch (e) {
        console.log('Welcome email skipped')
      }

      // 6. Clear saved data and redirect
      localStorage.removeItem('dpo_onboarding_v2')
      setGenProgress(100)
      setGenStatus('הכל מוכן! מעבירים ללוח הבקרה...')

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'שגיאה בתהליך ההרשמה')
      setIsGenerating(false)
      setStep(3) // Go back to last form step
    }
  }

  // =============================================
  // LOADING STATE
  // =============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // =============================================
  // STEP 4: GENERATING SCREEN
  // =============================================
  if (step === 4) {
    const stages = [
      { label: 'יצרנו פרופיל לעסק שלכם', threshold: 15 },
      { label: 'מנתחים את דרישות הפרטיות...', threshold: 35 },
      { label: 'מכינים מדיניות פרטיות...', threshold: 60 },
      { label: 'מכינים נוהל אבטחת מידע...', threshold: 70 },
      { label: 'ממפים מאגרי מידע...', threshold: 80 },
      { label: 'הממונה סוקר את המסמכים...', threshold: 95 },
    ]

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full text-center">
          {/* Animated shield */}
          <div className="relative mx-auto w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-full w-24 h-24 flex items-center justify-center">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">הממונה שלכם עובד על זה...</h1>
          <p className="text-slate-400 mb-10">אנחנו מכינים את חבילת הציות שלכם. זה ייקח כמה שניות.</p>

          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2 mb-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${genProgress}%` }}
            />
          </div>

          {/* Stage checklist */}
          <div className="space-y-3 text-right">
            {stages.map((stage, i) => {
              const done = genProgress >= stage.threshold
              const active = !done && (i === 0 || genProgress >= stages[i - 1].threshold)
              return (
                <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${
                  done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600'
                }`}>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span className="text-sm">{stage.label}</span>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-6 bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // =============================================
  // INTAKE FORM SCREENS
  // =============================================
  const stepTitles = [
    'ספרו לנו על העסק',
    'איך העסק עובד?',
    'מי הלקוחות שלכם?',
    'פרטי קשר'
  ]

  const stepSubtitles = [
    'נתחיל עם הבסיס — זה ייקח דקה',
    'זה עוזר לנו להבין את סביבת המידע שלכם',
    'כדי שנבין איזה סוג מידע עובר אצלכם',
    'כמעט סיימנו! איך ליצור קשר'
  ]

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-700">MyDPO</Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>שלב {step + 1} מתוך 4</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div 
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{stepTitles[step]}</h1>
          <p className="text-slate-500">{stepSubtitles[step]}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-start gap-2">
            <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* =============================================
            SCREEN 0: About the business
            ============================================= */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Business name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">שם העסק *</label>
              <input
                type="text"
                value={form.business_name}
                onChange={e => updateForm('business_name', e.target.value)}
                placeholder='לדוגמה: "טכנולוגיות אלפא בע״מ"'
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Business ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ח.פ / עוסק מורשה *</label>
              <input
                type="text"
                value={form.business_id}
                onChange={e => updateForm('business_id', e.target.value)}
                placeholder="9 ספרות"
                maxLength={9}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">תחום פעילות *</label>
              <div className="grid grid-cols-2 gap-2">
                {industries.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => updateForm('industry', ind.id)}
                    className={`px-4 py-3 rounded-lg border text-sm text-right transition-all ${
                      form.industry === ind.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="ml-2">{ind.icon}</span>
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee count */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">כמה עובדים? *</label>
              <div className="grid grid-cols-4 gap-2">
                {employeeCounts.map(size => (
                  <button
                    key={size.id}
                    onClick={() => updateForm('employee_count', size.id)}
                    className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                      form.employee_count === size.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =============================================
            SCREEN 1: How the business works
            ============================================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                כתובת אתר האינטרנט
                <span className="text-slate-400 font-normal mr-1">(אופציונלי)</span>
              </label>
              <input
                type="url"
                value={form.website_url}
                onChange={e => updateForm('website_url', e.target.value)}
                placeholder="https://www.example.co.il"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-left ltr focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                dir="ltr"
              />
              <p className="text-xs text-slate-400 mt-1">בעתיד נוכל לסרוק את האתר ולזהות בעיות פרטיות אוטומטית</p>
            </div>

            {/* Software */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                אילו מערכות תוכנה אתם משתמשים?
                <span className="text-slate-400 font-normal mr-1">(בחרו את כל הרלוונטיות)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {softwareOptions.map(sw => (
                  <button
                    key={sw.id}
                    onClick={() => toggleArrayItem('software', sw.id)}
                    className={`px-3 py-2 rounded-full border text-sm transition-all ${
                      form.software.includes(sw.id)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {form.software.includes(sw.id) && '✓ '}{sw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Has app */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">יש לכם אפליקציה?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateForm('has_app', true)}
                  className={`px-4 py-3 rounded-lg border text-sm transition-all flex items-center justify-center gap-2 ${
                    form.has_app === true
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Smartphone className="h-4 w-4" /> כן
                </button>
                <button
                  onClick={() => updateForm('has_app', false)}
                  className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                    form.has_app === false
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  לא
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =============================================
            SCREEN 2: Who are the customers
            ============================================= */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Customer type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">מי הלקוחות שלכם? *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'b2b', label: 'עסקים (B2B)', icon: Building2 },
                  { id: 'b2c', label: 'צרכנים פרטיים (B2C)', icon: Users },
                ].map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => toggleArrayItem('customer_type', ct.id)}
                    className={`px-4 py-4 rounded-lg border text-sm transition-all flex flex-col items-center gap-2 ${
                      form.customer_type.includes(ct.id)
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <ct.icon className="h-6 w-6" />
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sensitive data questions — simple yes/no/not sure */}
            {[
              { field: 'works_with_minors', label: 'האם עובדים עם קטינים (מתחת לגיל 18)?', icon: Baby },
              { field: 'has_health_data', label: 'האם מעבדים מידע רפואי / בריאותי?', icon: Heart },
              { field: 'collects_payments', label: 'האם אוספים פרטי תשלום מלקוחות?', icon: CreditCard },
            ].map(q => (
              <div key={q.field}>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <q.icon className="h-4 w-4 text-slate-400" />
                  {q.label}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: true, label: 'כן' },
                    { val: false, label: 'לא' },
                    { val: null, label: 'לא בטוח' },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      onClick={() => updateForm(q.field, opt.val)}
                      className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                        (form as any)[q.field] === opt.val
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =============================================
            SCREEN 3: Contact info
            ============================================= */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Contact name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">שם איש/אשת קשר *</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={e => updateForm('contact_name', e.target.value)}
                placeholder="השם המלא"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                תפקיד
                <span className="text-slate-400 font-normal mr-1">(אופציונלי)</span>
              </label>
              <input
                type="text"
                value={form.contact_role}
                onChange={e => updateForm('contact_role', e.target.value)}
                placeholder='לדוגמה: "מנכ״ל", "מנהל/ת תפעול"'
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">אימייל *</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => updateForm('contact_email', e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                טלפון
                <span className="text-slate-400 font-normal mr-1">(אופציונלי)</span>
              </label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={e => updateForm('contact_phone', e.target.value)}
                placeholder="050-000-0000"
                dir="ltr"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Trust message */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">הממונה שלכם: {DPO_CONFIG.name}</p>
                <p className="text-blue-600">לאחר ההרשמה, הממונה יסקור את המסמכים שנייצר עבורכם ויאשר אותם תוך 48 שעות.</p>
              </div>
            </div>
          </div>
        )}

        {/* =============================================
            NAVIGATION
            ============================================= */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating}
            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-sm transition-all ${
              canProceed()
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === 3 ? (
              <>
                <Sparkles className="h-4 w-4" />
                סיום והפעלת המערכת
              </>
            ) : (
              <>
                המשך
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// PAGE WRAPPER
// =============================================
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

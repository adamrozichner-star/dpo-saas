'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2,
  User,
  LogOut,
  Bot,
  Loader2,
  Menu,
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  Settings,
  ChevronLeft,
  Clock,
  Plus,
  Eye,
  Download,
  Lock,
  X,
  Copy,
  Edit3,
  Save
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSubscriptionGate } from '@/lib/use-subscription-gate'
import { DPO_CONFIG } from '@/lib/dpo-config'
import { useToast } from '@/components/Toast'
import WelcomeModal from '@/components/WelcomeModal'
import UnpaidWelcomeModal from '@/components/UnpaidWelcomeModal'
import GuidelinesPanel from '@/components/GuidelinesPanel'
import { deriveComplianceActions, ComplianceSummary, ActionOverride } from '@/lib/compliance-engine'

// ============================================
// TYPES
// ============================================
interface Task {
  id: string
  type: 'missing_doc' | 'dsar' | 'review' | 'incident' | 'periodic' | 'info' | 'action'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  deadline?: string
  action: string
  actionPath?: string
}

interface Document {
  id: string
  name?: string
  title?: string
  type: string
  status: string
  created_at: string
  content?: string
  version?: number
}

// ============================================
// MAIN COMPONENT
// ============================================
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, signOut, loading, supabase } = useAuth()

  // Authenticated fetch — attaches Supabase JWT to API calls
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }
  const { isAuthorized, isChecking, isPaid: gateIsPaid } = useSubscriptionGate()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'incidents' | 'messages' | 'reminders' | 'settings'>('overview')
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [complianceScore, setComplianceScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [messageThreads, setMessageThreads] = useState<any[]>([])
  const [orgProfile, setOrgProfile] = useState<any>(null)
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null)
  const [actionOverrides, setActionOverrides] = useState<Record<string, ActionOverride>>({})

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (searchParams.get('welcome') === 'true' || searchParams.get('payment') === 'success') {
      setShowWelcome(true)
      // Clear the welcomed key so the loadAllData trigger also works
      if (user) localStorage.removeItem(`dpo_welcomed_${user.id}`)
      window.history.replaceState({}, '', '/dashboard')
    }
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview','tasks','documents','incidents','messages','reminders','settings'].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
  }, [searchParams, user])

  useEffect(() => {
    if (user && supabase) {
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'משתמש')
      loadAllData()
    }
  }, [user, supabase])

  const loadAllData = async () => {
    if (!user || !supabase) return
    setIsLoading(true)

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_user_id', user.id)
        .single()

      if (userData?.organizations) {
        const org = userData.organizations
        setOrganization(org)

        // Check if onboarding was completed (has profile data)
        const { data: profile } = await supabase
          .from('organization_profiles')
          .select('id')
          .eq('org_id', org.id)
          .maybeSingle()

        if (!profile) {
          // Org exists but onboarding not completed
          // Only redirect if no active subscription (avoid loop with simulated payments)
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('org_id', org.id)
            .in('status', ['active', 'past_due'])
            .maybeSingle()
          if (!sub) {
            router.push('/onboarding')
            return
          }
        }
        
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (docs) setDocuments(docs)

        // Load org profile (onboarding answers)
        let profileData: any = null
        try {
          const { data: profile } = await supabase
            .from('organization_profiles')
            .select('profile_data')
            .eq('org_id', org.id)
            .single()
          if (profile) {
            profileData = profile.profile_data
            setOrgProfile(profile.profile_data)
          }
        } catch {}

        // Auto-fix: if v3Answers has a different bizName than org, update org
        const v3BizName = profileData?.v3Answers?.bizName
        const v3CompanyId = profileData?.v3Answers?.companyId
        console.log('[Dashboard] Org name check:', { 
          orgName: org.name, v3BizName, orgBusinessId: org.business_id, v3CompanyId 
        })
        if (v3BizName && v3BizName !== org.name) {
          console.log('[Dashboard] Fixing org name:', org.name, '→', v3BizName)
          await supabase.from('organizations').update({ 
            name: v3BizName,
            ...(v3CompanyId ? { business_id: v3CompanyId } : {})
          }).eq('id', org.id)
          org.name = v3BizName
          if (v3CompanyId) org.business_id = v3CompanyId
          setOrganization({ ...org })
        }

        // Auto-generate docs if onboarding completed but no docs exist (401 recovery)
        if ((!docs || docs.length === 0) && profileData?.v3Answers) {
          console.log('No docs found but profile exists — auto-generating...')
          try {
            const { data: { session: sess } } = await supabase.auth.getSession()
            const genRes = await fetch('/api/generate-documents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(sess?.access_token ? { 'Authorization': `Bearer ${sess.access_token}` } : {})
              },
              body: JSON.stringify({
                orgId: org.id,
                orgName: org.name,
                businessId: org.business_id || '',
                answers: profileData.answers || [],
                v3Answers: profileData.v3Answers
              })
            })
            if (genRes.ok) {
              // Reload docs
              const { data: newDocs } = await supabase
                .from('documents')
                .select('*')
                .eq('org_id', org.id)
                .order('created_at', { ascending: false })
              if (newDocs) setDocuments(newDocs)
              console.log('Auto-generated', newDocs?.length, 'documents')
            }
          } catch (e) {
            console.log('Auto-generation failed:', e)
          }
        }

        const { data: incidentData } = await supabase
          .from('security_incidents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (incidentData) setIncidents(incidentData)

        const { data: dsarData } = await supabase
          .from('dsar_requests')
          .select('*')
          .eq('org_id', org.id)
          .in('status', ['pending', 'in_progress'])

        const score = calculateScore(docs || [], incidentData || [])
        setComplianceScore(score)
        
        // Derive compliance actions from onboarding data
        let v3 = profileData?.v3Answers || {}
        // Fallback: try localStorage (saved during onboarding on same browser)
        if (Object.keys(v3).length === 0) {
          try { v3 = JSON.parse(localStorage.getItem('dpo_v3_answers') || '{}') } catch {}
        }
        // Load persisted action overrides (user-completed actions)
        const overrides = profileData?.actionOverrides || {}
        setActionOverrides(overrides)
        const summary = deriveComplianceActions(v3, docs || [], incidentData || [], overrides)
        setComplianceSummary(summary)
        // Use engine score if we have v3 data, otherwise fallback to doc-based score
        if (Object.keys(v3).length > 0) {
          setComplianceScore(summary.score)
          try {
            await supabase.from('organizations').update({ compliance_score: summary.score }).eq('id', org.id)
          } catch {}
        } else {
          try {
            await supabase.from('organizations').update({ compliance_score: score }).eq('id', org.id)
          } catch {}
        }
        
        const generatedTasks = generateTasks(docs || [], incidentData || [], dsarData || [], { ...org, profile_data: profileData })
        setTasks(generatedTasks)

        // Load message threads (DPO-User messaging)
        try {
          const msgRes = await authFetch(`/api/messages?orgId=${org.id}`)
          const msgData = await msgRes.json()
          if (msgData.threads) {
            setMessageThreads(msgData.threads)
            const unread = msgData.threads.reduce((sum: number, t: any) => sum + (t.unreadCount || 0), 0)
            setUnreadMessages(unread)
          }
        } catch (e) {
          console.log('Messages loading skipped')
        }

        // Show welcome on first-ever successful dashboard load
        if (user) {
          const welcomeKey = `dpo_welcomed_${user.id}`
          if (!localStorage.getItem(welcomeKey)) {
            setShowWelcome(true)
            localStorage.setItem(welcomeKey, 'true')
          }
        }
      } else {
        // No organization — user needs onboarding
        router.push('/onboarding')
        return
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════
  // ACTION RESOLUTION
  // ═══════════════════════════════════════════════════
  const resolveAction = async (actionId: string, note?: string) => {
    if (!organization?.id || !supabase) return

    const newOverrides = {
      ...actionOverrides,
      [actionId]: {
        status: 'completed' as const,
        resolvedAt: new Date().toISOString(),
        note: note || undefined
      }
    }
    setActionOverrides(newOverrides)

    // Recalculate summary immediately with new overrides
    let v3 = orgProfile?.v3Answers || {}
    if (Object.keys(v3).length === 0) {
      try { v3 = JSON.parse(localStorage.getItem('dpo_v3_answers') || '{}') } catch {}
    }
    const newSummary = deriveComplianceActions(v3, documents, incidents, newOverrides)
    setComplianceSummary(newSummary)
    setComplianceScore(newSummary.score)

    // Persist to Supabase
    try {
      // Read current profile_data, merge overrides
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', organization.id)
        .single()

      const currentData = profile?.profile_data || {}
      await supabase
        .from('organization_profiles')
        .update({
          profile_data: { ...currentData, actionOverrides: newOverrides }
        })
        .eq('org_id', organization.id)

      // Sync score
      await supabase
        .from('organizations')
        .update({ compliance_score: newSummary.score })
        .eq('id', organization.id)

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          org_id: organization.id,
          action: 'action_resolved',
          details: { actionId, note, newScore: newSummary.score }
        })
      } catch {}
    } catch (e) {
      console.log('Could not persist action override:', e)
    }
  }

  const undoAction = async (actionId: string) => {
    if (!organization?.id || !supabase) return

    const newOverrides = { ...actionOverrides }
    delete newOverrides[actionId]
    setActionOverrides(newOverrides)

    // Recalculate
    let v3 = orgProfile?.v3Answers || {}
    if (Object.keys(v3).length === 0) {
      try { v3 = JSON.parse(localStorage.getItem('dpo_v3_answers') || '{}') } catch {}
    }
    const newSummary = deriveComplianceActions(v3, documents, incidents, newOverrides)
    setComplianceSummary(newSummary)
    setComplianceScore(newSummary.score)

    // Persist
    try {
      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('profile_data')
        .eq('org_id', organization.id)
        .single()

      const currentData = profile?.profile_data || {}
      await supabase
        .from('organization_profiles')
        .update({
          profile_data: { ...currentData, actionOverrides: newOverrides }
        })
        .eq('org_id', organization.id)

      await supabase
        .from('organizations')
        .update({ compliance_score: newSummary.score })
        .eq('id', organization.id)
    } catch (e) {
      console.log('Could not undo action override:', e)
    }
  }

  const calculateScore = (docs: any[], incidents: any[]) => {
    // Base: 15 points just for being onboarded
    let score = 15
    const docTypes = docs.map(d => d.type)
    // Privacy policy: 15
    if (docTypes.includes('privacy_policy')) score += 15
    // Security policy: 15
    if (docTypes.includes('security_policy') || docTypes.includes('security_procedures')) score += 15
    // DPO appointment: 10
    if (docTypes.includes('dpo_appointment')) score += 10
    // Database registration: 10
    if (docTypes.includes('database_registration') || docTypes.includes('database_definition')) score += 10
    // ROPA: 10
    if (docTypes.includes('ropa')) score += 10
    // Consent form: 10
    if (docTypes.includes('consent_form')) score += 10
    // No open incidents: 15
    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    if (openIncidents.length === 0) score += 15
    return Math.max(0, Math.min(100, score))
  }

  const generateTasks = (docs: any[], incidents: any[], dsars: any[], org: any): Task[] => {
    const tasks: Task[] = []
    const docTypes = docs.map(d => d.type)
    const activeDocs = docs.filter(d => d.status === 'active')
    const pendingDocs = docs.filter(d => d.status === 'pending_review')

    // 1. Pending review docs — DPO hasn't approved yet
    if (pendingDocs.length > 0) {
      tasks.push({
        id: 'pending-review',
        type: 'info',
        title: `${pendingDocs.length} מסמכים ממתינים לאישור הממונה`,
        description: 'הממונה יסקור ויאשר את המסמכים בהקדם. תקבלו הודעה במייל',
        priority: 'low',
        action: 'צפייה',
        actionPath: '/dashboard?tab=documents'
      })
    }

    // 2. Post-approval action items — what to DO with approved docs
    if (activeDocs.some(d => d.type === 'privacy_policy')) {
      tasks.push({
        id: 'action-publish-privacy',
        type: 'action',
        title: 'פרסום מדיניות פרטיות באתר',
        description: 'הורידו את המסמך ופרסמו באתר הארגון עם קישור בפוטר',
        priority: 'medium',
        action: 'לצפייה',
        actionPath: '/dashboard?tab=documents'
      })
    }

    if (activeDocs.some(d => d.type === 'dpo_appointment')) {
      tasks.push({
        id: 'action-sign-dpo',
        type: 'action',
        title: 'חתימה על כתב מינוי DPO',
        description: 'הורידו, חתמו ושמרו עותק. יש להעביר עותק חתום לממונה',
        priority: 'high',
        action: 'לצפייה',
        actionPath: '/dashboard?tab=documents'
      })
    }

    if (activeDocs.some(d => d.type === 'security_policy')) {
      tasks.push({
        id: 'action-distribute-security',
        type: 'action',
        title: 'הפצת נוהל אבטחה לעובדים',
        description: 'שלחו את נוהל האבטחה לכל העובדים ותעדו שקראו',
        priority: 'medium',
        action: 'לצפייה',
        actionPath: '/dashboard?tab=documents'
      })
    }

    // 3. Missing docs
    if (!docTypes.includes('privacy_policy')) {
      tasks.push({
        id: 'missing-privacy',
        type: 'missing_doc',
        title: 'יצירת מדיניות פרטיות',
        description: 'מדיניות פרטיות היא דרישה בסיסית בתיקון 13',
        priority: 'high',
        action: 'התחל',
        actionPath: '/chat?task=privacy_policy&prompt=' + encodeURIComponent('אנא צור עבורי מדיניות פרטיות מלאה ומוכנה לשימוש עבור העסק שלי')
      })
    }

    if (!docTypes.includes('security_policy') && !docTypes.includes('security_procedures')) {
      tasks.push({
        id: 'missing-security',
        type: 'missing_doc',
        title: 'יצירת נוהל אבטחת מידע',
        description: 'נדרש נוהל אבטחה מתועד לארגון',
        priority: 'high',
        action: 'התחל',
        actionPath: '/chat?task=security_policy&prompt=' + encodeURIComponent('אנא צור עבורי נוהל אבטחת מידע מלא ומוכן לשימוש עבור הארגון שלי')
      })
    }

    if (!docTypes.includes('dpo_appointment')) {
      tasks.push({
        id: 'missing-dpo',
        type: 'missing_doc',
        title: 'כתב מינוי DPO',
        description: 'יש להפיק כתב מינוי רשמי לממונה',
        priority: 'medium',
        action: 'התחל',
        actionPath: '/chat?task=dpo_appointment&prompt=' + encodeURIComponent('אנא צור עבורי כתב מינוי רשמי לממונה הגנת פרטיות (DPO) מוכן לחתימה')
      })
    }

    if (!docTypes.includes('ropa')) {
      tasks.push({
        id: 'missing-ropa',
        type: 'missing_doc',
        title: 'יצירת מפת עיבוד (ROPA)',
        description: 'מפת עיבוד נתונים היא דרישה מרכזית בתיקון 13',
        priority: 'medium',
        action: 'צור עכשיו',
        actionPath: '/chat?task=ropa&prompt=' + encodeURIComponent('אנא צור עבורי מפת עיבוד נתונים (ROPA) מלאה עבור הארגון שלי')
      })
    }

    if (!docTypes.includes('consent_form')) {
      tasks.push({
        id: 'missing-consent',
        type: 'missing_doc',
        title: 'יצירת טופס הסכמה',
        description: 'טופס הסכמה נדרש לאיסוף מידע אישי',
        priority: 'medium',
        action: 'צור עכשיו',
        actionPath: '/chat?task=consent_form&prompt=' + encodeURIComponent('אנא צור עבורי טופס הסכמה לאיסוף מידע אישי מלקוחות')
      })
    }

    // 3.5 CISO detection — if org handles sensitive data + >50 employees
    const profileAnswers = (org as any)?.profile_data?.answers || []
    const getAnswer = (qId: string) => {
      // Try from profileAnswers or from answers array if passed differently
      const a = profileAnswers.find?.((a: any) => a.questionId === qId) 
      return a?.value
    }
    const empCount = getAnswer('employee_count')
    const dataTypes = getAnswer('data_types') || []
    const hasSensitive = Array.isArray(dataTypes) && (dataTypes.includes('health') || dataTypes.includes('biometric') || dataTypes.includes('financial'))
    const isLargeOrg = empCount === '51-200' || empCount === '200+'
    
    if (hasSensitive && isLargeOrg) {
      tasks.push({
        id: 'ciso-needed',
        type: 'info',
        title: '⚠️ ייתכן שנדרש ממונה אבטחת מידע (CISO)',
        description: 'בהתאם לתיקון 13, ארגון המעבד מידע רגיש עם מעל 50 עובדים עשוי לחייב מינוי CISO בנוסף ל-DPO',
        priority: 'medium',
        action: 'שאל את הממונה',
        actionPath: '/chat?prompt=' + encodeURIComponent('האם הארגון שלי חייב למנות CISO בנוסף ל-DPO?')
      })
    }

    // 3.6 Annual review — if org > 11 months old
    if (org?.created_at) {
      const monthsOld = (Date.now() - new Date(org.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)
      if (monthsOld >= 11) {
        tasks.push({
          id: 'annual-review',
          type: 'action',
          title: '📅 סקירה שנתית — עדכון מסמכים ומדיניות',
          description: 'עברה כמעט שנה מאז הקמת מערכת הציות. יש לבצע סקירה שנתית ולעדכן מסמכים',
          priority: 'high',
          action: 'בצע סקירה',
          actionPath: '/chat?prompt=' + encodeURIComponent('אני רוצה לבצע סקירה שנתית של מסמכי הציות והמדיניות שלי')
        })
      }
    }

    // 4. Incidents
    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    openIncidents.forEach(incident => {
      const deadline = incident.authority_deadline ? new Date(incident.authority_deadline) : null
      const isUrgent = deadline && (deadline.getTime() - Date.now()) < 24 * 60 * 60 * 1000

      tasks.push({
        id: `incident-${incident.id}`,
        type: 'incident',
        title: `טיפול באירוע: ${incident.title}`,
        description: isUrgent ? 'פחות מ-24 שעות לדדליין!' : 'אירוע אבטחה פתוח דורש טיפול',
        priority: isUrgent ? 'high' : 'medium',
        deadline: deadline?.toLocaleDateString('he-IL'),
        action: 'טפל',
        actionPath: `/chat?incident=${incident.id}&prompt=` + encodeURIComponent(`יש לי אירוע אבטחה פתוח: ${incident.title}. מה עלי לעשות?`)
      })
    })

    dsars.forEach(dsar => {
      const requestTypeHebrew = dsar.request_type === 'access' ? 'עיון' : dsar.request_type === 'deletion' ? 'מחיקה' : 'תיקון'
      tasks.push({
        id: `dsar-${dsar.id}`,
        type: 'dsar',
        title: `בקשת ${requestTypeHebrew} ממידע`,
        description: `מאת: ${dsar.requester_name || 'לא ידוע'}`,
        priority: 'medium',
        deadline: dsar.deadline,
        action: 'טפל',
        actionPath: `/chat?dsar=${dsar.id}&prompt=` + encodeURIComponent(`קיבלתי בקשת ${requestTypeHebrew} ממידע מאת ${dsar.requester_name || 'נושא מידע'}. איך לטפל בזה?`)
      })
    })

    const priorityOrder = { high: 0, medium: 1, low: 2 }
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return tasks
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activeIncidentsCount = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length
  const urgentTasksCount = tasks.filter(t => t.priority === 'high').length

  if (loading || isLoading || isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex" dir="rtl">
      {/* Welcome Modal — unpaid (orientation) or paid (celebration) */}
      {showWelcome && !gateIsPaid && (
        <UnpaidWelcomeModal
          orgName={organization?.name || 'הארגון שלכם'}
          complianceScore={complianceScore}
          gapCount={complianceSummary?.actions?.filter(a => a.status !== 'completed').length || 0}
          onClose={() => setShowWelcome(false)}
        />
      )}
      {showWelcome && gateIsPaid && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          orgName={organization?.name || ''}
          documentsCount={documents.length}
          complianceScore={complianceScore}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-stone-100/80 backdrop-blur-sm border-l border-stone-200 transform transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-stone-800">MyDPO</span>
            </Link>
          </div>

          {/* Chat Button */}
          <div className="px-4 pb-4">
            {gateIsPaid ? (
              <Link href="/chat">
                <button className="w-full py-3 px-4 bg-teal-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-teal-600 transition-colors shadow-sm">
                  <Bot className="h-5 w-5" />
                  צ׳אט עם הממונה
                </button>
              </Link>
            ) : (
              <Link href="/subscribe">
                <button className="w-full py-3 px-4 bg-stone-300 text-stone-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                  <Lock className="h-4 w-4" />
                  צ׳אט עם הממונה
                </button>
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            <NavButton 
              icon={<LayoutDashboard className="h-5 w-5" />} 
              label="לוח בקרה" 
              active={activeTab === 'overview'} 
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false) }} 
            />
            <NavButton 
              icon={<ClipboardList className="h-5 w-5" />} 
              label="משימות" 
              active={activeTab === 'tasks'} 
              onClick={() => { setActiveTab('tasks'); setMobileMenuOpen(false) }}
              badge={tasks.length > 0 ? tasks.length : undefined}
            />
            <NavButton 
              icon={<FolderOpen className="h-5 w-5" />} 
              label="מסמכים" 
              active={activeTab === 'documents'} 
              onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false) }}
              badge={documents.filter(d => d.status === 'pending_review').length > 0 ? documents.filter(d => d.status === 'pending_review').length : undefined}
            />
            <NavButton 
              icon={<AlertTriangle className="h-5 w-5" />} 
              label="אירועי אבטחה" 
              active={activeTab === 'incidents'} 
              onClick={() => { setActiveTab('incidents'); setMobileMenuOpen(false) }}
              badge={activeIncidentsCount > 0 ? activeIncidentsCount : undefined}
            />
            <NavButton 
              icon={<MessageSquare className="h-5 w-5" />} 
              label="שיח עם ממונה" 
              active={activeTab === 'messages'} 
              onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false) }}
              badge={unreadMessages > 0 ? unreadMessages : undefined}
            />
            <NavButton 
              icon={<Clock className="h-5 w-5" />} 
              label="תזכורות" 
              active={activeTab === 'reminders'} 
              onClick={() => { setActiveTab('reminders'); setMobileMenuOpen(false) }} 
            />
            <NavButton 
              icon={<Settings className="h-5 w-5" />} 
              label="הגדרות" 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }} 
            />
          </nav>

          {/* User */}
          <div className="p-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{userName}</p>
                  <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                התנתקות
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-stone-50/90 backdrop-blur-sm border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-stone-800">MyDPO</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center"
          >
            <Menu className="h-5 w-5 text-stone-600" />
          </button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
          {/* Paywall Banner for unpaid users */}
          {!gateIsPaid && (
            <div className="mb-6">
              <PaywallBanner complianceScore={complianceScore} orgName={organization?.name || 'הארגון שלכם'} />
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewTab 
              organization={organization}
              complianceScore={complianceScore}
              complianceSummary={complianceSummary}
              orgProfile={orgProfile}
              tasks={tasks}
              documents={documents}
              incidents={incidents}
              unreadMessages={unreadMessages}
              onNavigate={setActiveTab}
              onResolveAction={resolveAction}
              onUndoAction={undoAction}
              isPaid={gateIsPaid}
            />
          )}
          {activeTab === 'tasks' && (
            gateIsPaid ? <TasksTab tasks={tasks} /> : 
            <LockedTabOverlay icon="📋" title="משימות ממתינות לביצוע" description="שלמו כדי לצפות ולבצע את רשימת הפעולות הנדרשות לציות לתיקון 13" />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab documents={documents} organization={organization} supabase={supabase} isPaid={gateIsPaid} />
          )}
          {activeTab === 'incidents' && (
            gateIsPaid ? <IncidentsTab incidents={incidents} orgId={organization?.id} /> :
            <LockedTabOverlay icon="⚠️" title="ניהול אירועי אבטחה" description="דווחו וטפלו באירועי אבטחת מידע עם ספירה לאחור של 72 שעות לדיווח לרשות" />
          )}
          {activeTab === 'messages' && (
            gateIsPaid ? <MessagesTab 
              threads={messageThreads} 
              orgId={organization?.id}
              onRefresh={loadAllData}
              supabase={supabase}
              tier={organization?.tier}
            /> :
            <LockedTabOverlay icon="💬" title="שיח עם הממונה" description="שלחו שאלות ישירות לממונה הגנת הפרטיות שלכם וקבלו תשובה מקצועית" />
          )}
          {activeTab === 'reminders' && (
            <RemindersTab orgProfile={orgProfile} documents={documents} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab organization={organization} user={user} orgProfile={orgProfile} supabase={supabase} />
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================
// NAV BUTTON
// ============================================
function NavButton({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge
}: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors ${
        active 
          ? 'bg-white text-indigo-600 font-medium shadow-sm' 
          : 'text-stone-600 hover:bg-white/50'
      }`}
    >
      <span className={active ? 'text-indigo-500' : 'text-stone-400'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-rose-100 text-rose-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}


// ============================================
// OVERVIEW TAB — Data-driven from compliance engine
// ============================================
// ============================================
// PAYWALL BANNER — shown for unpaid users
// ============================================
function PaywallBanner({ complianceScore, orgName }: { complianceScore: number, orgName: string }) {
  return (
    <div className="bg-gradient-to-l from-rose-50 via-amber-50 to-indigo-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-rose-100 border-2 border-rose-200 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-rose-600">{complianceScore}</span>
          </div>
          <div>
            <p className="font-bold text-stone-800 text-base">⚠️ {orgName} חשופים לאכיפה</p>
            <p className="text-sm text-stone-600 mt-0.5">ציון הציות שלכם <strong className="text-rose-600">{complianceScore}/100</strong> — המסמכים, הממונה והפעולות ממתינים להפעלה</p>
          </div>
        </div>
        <Link href="/subscribe">
          <button className="px-6 py-3 bg-gradient-to-l from-indigo-600 to-indigo-500 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md whitespace-nowrap">
            הפעלת המערכת — ₪500/חודש ←
          </button>
        </Link>
      </div>
    </div>
  )
}

// ============================================
// LOCKED TAB OVERLAY — covers tabs that need payment
// ============================================
function LockedTabOverlay({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center relative">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-stone-500 mb-6 max-w-md mx-auto">{description}</p>
      <Link href="/subscribe">
        <button className="px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors">
          <Lock className="h-4 w-4 inline ml-2" />
          הפעלת המערכת ←
        </button>
      </Link>
    </div>
  )
}

function OverviewTab({ 
  organization, 
  complianceScore, 
  complianceSummary,
  orgProfile,
  tasks, 
  documents, 
  incidents,
  unreadMessages,
  onNavigate,
  onResolveAction,
  onUndoAction,
  isPaid
}: { 
  organization: any
  complianceScore: number
  complianceSummary: ComplianceSummary | null
  orgProfile: any
  tasks: Task[]
  documents: Document[]
  incidents: any[]
  unreadMessages: number
  onNavigate: (tab: any) => void
  onResolveAction: (actionId: string, note?: string) => void
  onUndoAction: (actionId: string) => void
  isPaid: boolean
}) {
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null)
  const actions = complianceSummary?.actions || []

  // Group actions by category
  const doneActions = actions.filter(a => a.category === 'done')
  const userActions = actions.filter(a => a.category === 'user_action')
  const dpoActions = actions.filter(a => a.category === 'dpo_pending')
  const reportingActions = actions.filter(a => a.category === 'reporting')
  const topPriorityAction = userActions[0] || reportingActions[0] || dpoActions[0]

  const getScoreInfo = () => {
    if (complianceScore >= 70) return { label: 'מצוין', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' }
    if (complianceScore >= 40) return { label: 'טעון שיפור', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' }
    return { label: 'דורש טיפול', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500' }
  }
  const scoreInfo = getScoreInfo()

  const getPriorityColor = (p: string) => {
    if (p === 'critical') return { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' }
    if (p === 'high') return { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-400', text: 'text-rose-700' }
    if (p === 'medium') return { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700' }
    return { bg: 'bg-stone-50', border: 'border-stone-200', dot: 'bg-stone-400', text: 'text-stone-600' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">
          👋 שלום, {organization?.name || 'משתמש'}
        </h1>
        <p className="text-stone-500 mt-1">הנה סקירה של מצב הציות שלכם</p>
      </div>

      {/* Top Row: Score + Next Step */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Score */}
        <div className={`rounded-2xl p-6 shadow-sm border ${scoreInfo.border} ${scoreInfo.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-stone-500">ציון ציות</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${scoreInfo.text} ${scoreInfo.bg}`}>
              {scoreInfo.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-5xl font-bold text-stone-800">{complianceScore}</span>
            <span className="text-stone-400 text-lg">/100</span>
          </div>
          <div className="w-full h-2.5 bg-white/50 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${scoreInfo.bar}`}
              style={{ width: `${complianceScore}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-500">
            {isPaid ? (
              <>
                <span>✅ {doneActions.length} בוצעו</span>
                <span>⏳ {dpoActions.length} ממתין לממונה</span>
                <span>📋 {userActions.length + reportingActions.length} ממתינים לכם</span>
              </>
            ) : (
              <>
                <span>📋 {userActions.length + reportingActions.length + dpoActions.length} פעולות נדרשות</span>
                <span>🔒 ממתין להפעלה</span>
              </>
            )}
          </div>
        </div>

        {/* Next Step */}
        {topPriorityAction ? (
          <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl p-6 shadow-sm border border-indigo-200">
            <p className="text-sm font-medium text-indigo-600 mb-2">🎯 הצעד הבא שלכם</p>
            <h3 className="text-lg font-bold text-stone-800 mb-1">{topPriorityAction.title}</h3>
            <p className="text-sm text-stone-500 mb-4">{topPriorityAction.description}</p>
            <div className="flex items-center gap-3">
              {isPaid ? (
                <Link href={topPriorityAction.actionPath || '/chat'}>
                  <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
                    טפל עכשיו
                  </button>
                </Link>
              ) : (
                <Link href="/subscribe">
                  <button className="px-4 py-2 bg-stone-200 text-stone-500 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    שלם לביצוע
                  </button>
                </Link>
              )}
              {topPriorityAction.estimatedMinutes && (
                <span className="text-xs text-stone-400">⏱ ~{topPriorityAction.estimatedMinutes} דקות</span>
              )}
            </div>
          </div>
        ) : isPaid ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => onNavigate('messages')}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-stone-500">הממונה שלכם</p>
              {unreadMessages > 0 && (
                <span className="bg-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                  {unreadMessages} הודעות חדשות
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800">{DPO_CONFIG.name}</p>
                <p className="text-sm text-stone-500">ממונה הגנת פרטיות</p>
              </div>
              {isPaid ? (
                <Link href="/chat">
                  <button className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium">
                    שלח הודעה
                  </button>
                </Link>
              ) : (
                <Link href="/subscribe">
                  <button className="px-3 py-2 text-sm text-stone-400 bg-stone-100 rounded-lg font-medium flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    שלח הודעה
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Unpaid: DPO availability teaser */
          <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl p-6 shadow-sm border border-indigo-200">
            <p className="text-sm font-medium text-indigo-500 mb-3">🛡️ ממונה מוסמך/ת מוכן/ה עבורכם</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800">{DPO_CONFIG.name}</p>
                <p className="text-sm text-stone-400">ממתינה למינוי</p>
              </div>
            </div>
            <p className="text-xs text-stone-500 mb-4">המינוי ייכנס לתוקף עם הפעלת המערכת — כולל כתב מינוי, סקירת מסמכים ודיווח לרשויות.</p>
            <Link href="/subscribe">
              <button className="w-full px-4 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors">
                הפעלה ומינוי DPO ←
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Regulatory Guidelines Panel */}
      {complianceSummary?.guidelines && complianceSummary.guidelines.length > 0 && (
        <GuidelinesPanel
          guidelines={complianceSummary.guidelines}
          isPaid={isPaid}
          onResolve={onResolveAction}
          onUndo={onUndoAction}
        />
      )}

      {/* Done For You Section — only for paid (DPO not appointed for unpaid) */}
      {isPaid && doneActions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <h2 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            מה כבר בוצע
            <span className="text-xs font-normal bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{doneActions.length}</span>
          </h2>
          <div className="space-y-2">
            {doneActions.map(action => {
              const isUserResolved = action.status === 'completed' && action.resolvedNote?.includes('סומן כבוצע')
              return (
                <div key={action.id} className="flex items-center gap-3 py-2 px-3 bg-emerald-50/50 rounded-xl group">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-700">{action.title}</span>
                    {action.resolvedNote && (
                      <span className="text-xs text-emerald-600 mr-2">— {action.resolvedNote}</span>
                    )}
                  </div>
                  {isUserResolved && (
                    <button
                      onClick={() => onUndoAction(action.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-stone-400 hover:text-rose-500 transition-all cursor-pointer"
                      title="ביטול סימון"
                    >
                      ↩ בטל
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* User Actions */}
      {userActions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <h2 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            פעולות ממתינות לכם
            <span className="text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{userActions.length}</span>
          </h2>
          <div className="space-y-2">
            {userActions.map(action => {
              const colors = getPriorityColor(action.priority)
              const isConfirming = confirmingAction === action.id
              return (
                <div key={action.id} className={`rounded-xl border transition-all ${colors.bg} ${colors.border}`}>
                  <div className="flex items-center gap-3 py-3 px-4">
                    {isPaid ? (
                      <button
                        onClick={() => setConfirmingAction(isConfirming ? null : action.id)}
                        className="w-5 h-5 rounded-full border-2 border-stone-300 flex-shrink-0 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center"
                        title="סמן כבוצע"
                      >
                        {isConfirming && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                      </button>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-stone-200 flex-shrink-0 flex items-center justify-center bg-stone-50">
                        <Lock className="h-2.5 w-2.5 text-stone-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{action.title}</p>
                      <p className="text-xs text-stone-500 truncate">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPaid ? (
                        <Link href={action.actionPath || '/chat'}>
                          <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors whitespace-nowrap">
                            טפל →
                          </button>
                        </Link>
                      ) : (
                        <Link href="/subscribe">
                          <button className="px-3 py-1.5 bg-stone-200 text-stone-500 rounded-lg text-xs font-medium hover:bg-stone-300 transition-colors whitespace-nowrap flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            שלם לביצוע
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Confirmation drawer */}
                  {isPaid && isConfirming && (
                    <div className="px-4 pb-3 flex items-center gap-2 border-t border-stone-200/50 pt-2">
                      <span className="text-xs text-stone-500">ביצעת את הפעולה?</span>
                      <button
                        onClick={() => { onResolveAction(action.id); setConfirmingAction(null) }}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
                      >
                        ✓ כן, בוצע
                      </button>
                      <button
                        onClick={() => setConfirmingAction(null)}
                        className="px-3 py-1 bg-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-300 transition-colors cursor-pointer"
                      >
                        ביטול
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DPO Pending */}
      {dpoActions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <h2 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            ממתין לאישור הממונה
          </h2>
          <div className="space-y-2">
            {dpoActions.map(action => (
              <div key={action.id} className="flex items-center gap-3 py-2.5 px-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <Loader2 className="h-4 w-4 text-indigo-400 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-stone-700">{action.title}</span>
                </div>
                <span className="text-xs text-indigo-400 whitespace-nowrap">48 שעות</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reporting Obligations */}
      {reportingActions.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-5 shadow-sm border border-red-200">
          <h2 className="text-base font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            חובות דיווח
          </h2>
          {reportingActions.map(action => (
            <div key={action.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{action.title}</p>
                  <p className="text-xs text-red-600">{action.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isPaid ? (
                    <>
                      <Link href={action.actionPath || '/chat'}>
                        <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors whitespace-nowrap">
                          דווח עכשיו →
                        </button>
                      </Link>
                      <button
                        onClick={() => onResolveAction(action.id, 'דווח לרשות')}
                        className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        ✓ דווח כבר
                      </button>
                    </>
                  ) : (
                    <Link href="/subscribe">
                      <button className="px-3 py-1.5 bg-stone-200 text-stone-500 rounded-lg text-xs font-medium hover:bg-stone-300 transition-colors whitespace-nowrap flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        שלם לביצוע
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DPO Card — only for paid users (DPO is appointed) */}
      {isPaid && (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => onNavigate('messages')}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-6 w-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-stone-800">{DPO_CONFIG.name}</p>
            <p className="text-sm text-stone-500">ממונה הגנת פרטיות</p>
          </div>
          {unreadMessages > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {unreadMessages} חדשות
            </span>
          )}
          <Link href="/chat">
            <button className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium">
              שלח הודעה
            </button>
          </Link>
        </div>
      </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 flex items-center gap-4 cursor-pointer hover:border-stone-300 transition-colors" onClick={() => onNavigate('documents')}>
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{documents.length}</p>
            <p className="text-sm text-stone-500">מסמכים</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 flex items-center gap-4 cursor-pointer hover:border-stone-300 transition-colors" onClick={() => onNavigate('incidents')}>
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-800">{incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length}</p>
            <p className="text-sm text-stone-500">אירועים פתוחים</p>
          </div>
        </div>
      </div>

      {/* Upgrade Card */}
      {!isPaid && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-stone-800">שדרגו לחבילה מלאה</p>
                <p className="text-sm text-stone-500">גישה לכל הכלים והתמיכה של ממונה מוסמך</p>
              </div>
            </div>
            <Link href="/subscribe">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
                צפייה בחבילות
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================
// TASKS TAB
// ============================================
function TasksTab({ tasks }: { tasks: Task[] }) {
  const getPriorityStyle = (priority: string) => {
    const styles = {
      high: { bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700', number: 'bg-rose-200 text-rose-700' },
      medium: { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', number: 'bg-amber-200 text-amber-700' },
      low: { bg: 'bg-stone-50', border: 'border-stone-100', badge: 'bg-stone-100 text-stone-700', number: 'bg-stone-200 text-stone-700' }
    }
    return styles[priority as keyof typeof styles] || styles.low
  }

  const getPriorityLabel = (priority: string) => {
    const labels = { high: 'דחוף', medium: 'רגיל', low: 'נמוך' }
    return labels[priority as keyof typeof labels] || priority
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">📋 משימות</h1>
          <p className="text-stone-500 mt-1">כל מה שצריך לעשות במקום אחד</p>
        </div>
        <Link href="/chat">
          <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" />
            משימה חדשה
          </button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">מצוין! אין משימות פתוחות</h3>
          <p className="text-stone-500">כל המשימות הושלמו. המשיכו כך! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            const style = getPriorityStyle(task.priority)
            return (
              <div 
                key={task.id} 
                className={`${style.bg} rounded-xl p-4 border ${style.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full ${style.number} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-stone-800">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500">{task.description}</p>
                    {task.deadline && (
                      <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        דדליין: {task.deadline}
                      </p>
                    )}
                  </div>
                  <Link href={task.actionPath || '/chat'}>
                    <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
                      {task.action}
                    </button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// DOCUMENTS TAB
// ============================================
function DocumentsTab({ documents, organization, supabase, isPaid }: { documents: Document[], organization: any, supabase: any, isPaid: boolean }) {
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  const { toast } = useToast()
  const [filter, setFilter] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  // isPaid is now passed as prop from useSubscriptionGate

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      privacy_policy: 'מדיניות פרטיות',
      security_policy: 'מדיניות אבטחה',
      security_procedures: 'נוהלי אבטחה',
      dpo_appointment: 'כתב מינוי DPO',
      database_registration: 'רישום מאגר',
      database_definition: 'הגדרת מאגר',
      consent_form: 'טופס הסכמה',
      employee_policy: 'מדיניות עובדים',
      ropa: 'מפת עיבוד (ROPA)',
      dpa: 'הסכם עיבוד מידע',
      processor_agreement: 'הסכם עיבוד מידע (DPA)',
      procedure: 'נוהל',
      custom: 'מסמך'
    }
    return labels[type] || type
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      draft: 'bg-stone-100 text-stone-700',
      pending: 'bg-amber-100 text-amber-700',
      pending_review: 'bg-indigo-100 text-indigo-700',
      pending_signature: 'bg-purple-100 text-purple-700'
    }
    return styles[status] || 'bg-stone-100 text-stone-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { active: 'פעיל', draft: 'טיוטה', pending: 'ממתין', pending_review: 'ממתין לאישור ממונה', pending_signature: 'ממתין לחתימה' }
    return labels[status] || status
  }

  const downloadAsPdf = async (doc: Document) => {
    try {
      const content = isEditing ? editedContent : doc.content
      const response = await authFetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title || doc.name || getDocTypeLabel(doc.type),
          content: content || 'אין תוכן',
          orgName: organization?.name
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const html = await response.text()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('PDF download error:', error)
      toast('שגיאה בהורדת המסמך', 'error')
    }
  }

  const openDoc = (doc: Document) => {
    setSelectedDoc(doc)
    setEditedContent(doc.content || '')
    setIsEditing(false)
  }

  const saveDocumentChanges = async () => {
    if (!selectedDoc || !supabase) return
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({ content: editedContent, updated_at: new Date().toISOString() })
        .eq('id', selectedDoc.id)
      
      if (error) throw error
      
      // Update local state
      selectedDoc.content = editedContent
      setIsEditing(false)
      toast('המסמך נשמר בהצלחה!')
    } catch (error) {
      console.error('Error saving document:', error)
      toast('שגיאה בשמירת המסמך', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredDocs = (() => {
    let docs = documents
    if (filter === 'pending_review') docs = docs.filter(d => d.status === 'pending_review')
    else if (filter === 'active') docs = docs.filter(d => d.status === 'active')
    else if (filter === 'pending_signature') docs = docs.filter(d => d.status === 'pending_signature')
    else if (filter !== 'all') docs = docs.filter(d => d.type === filter)
    return docs
  })()
  const docTypes = Array.from(new Set(documents.map(d => d.type)))
  const pendingReviewCount = documents.filter(d => d.status === 'pending_review').length
  const activeCount = documents.filter(d => d.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">📁 מסמכים</h1>
          <p className="text-stone-500 mt-1">כל המסמכים והמדיניות של הארגון</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`} title="תצוגת כרטיסים">
              <svg className="h-4 w-4 text-stone-500" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`} title="תצוגת רשימה">
              <svg className="h-4 w-4 text-stone-500" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.75" width="14" height="2.5" rx="1"/><rect x="1" y="11.5" width="14" height="2.5" rx="1"/></svg>
            </button>
          </div>
          <Link href="/chat">
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2">
              <Plus className="h-4 w-4" />
              מסמך חדש
            </button>
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-indigo-500 text-white' 
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          הכל ({documents.length})
        </button>
        {activeCount > 0 && (
          <button 
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            ✓ פעיל ({activeCount})
          </button>
        )}
        {pendingReviewCount > 0 && (
          <button 
            onClick={() => setFilter('pending_review')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending_review' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            ⏳ ממתין לאישור ({pendingReviewCount})
          </button>
        )}
      </div>

      {/* Type Filters */}
      {docTypes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {docTypes.map(type => (
            <button 
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {getDocTypeLabel(type)}
            </button>
          ))}
        </div>
      )}

      {/* Paywall banner for unpaid users */}
      {!isPaid && documents.length > 0 && (
        <div className="bg-gradient-to-l from-indigo-50 to-amber-50 rounded-xl p-4 border border-indigo-200 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold text-stone-800">📄 {documents.length} מסמכים הופקו עבורכם</p>
            <p className="text-sm text-stone-500">הפעילו את המערכת כדי לצפות, להוריד ולקבל אישור DPO</p>
          </div>
          <Link href="/subscribe">
            <button className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition shadow-sm">
              הפעלה — ₪500/חודש →
            </button>
          </Link>
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-stone-300" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">אין מסמכים עדיין</h3>
          <p className="text-stone-500 mb-4">התחילו ביצירת מדיניות פרטיות דרך הצ׳אט</p>
          <Link href="/chat">
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
              <Bot className="h-4 w-4 inline ml-2" />
              יצירת מסמך
            </button>
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
              <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span className="flex-1 min-w-0 font-medium text-stone-800 text-sm truncate">{doc.title || getDocTypeLabel(doc.type)}</span>
              <span 
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(doc.status)} cursor-help`}
                title={
                  doc.status === 'pending_review' ? 'הממונה צריך לסקור ולאשר את המסמך' :
                  doc.status === 'active' ? 'המסמך אושר ופעיל' :
                  doc.status === 'pending_signature' ? 'נדרשת חתימה' : ''
                }
              >
                {getStatusLabel(doc.status)}
              </span>
              <span className="text-xs text-stone-400 flex-shrink-0">{new Date(doc.created_at).toLocaleDateString('he-IL')}</span>
              <button onClick={() => openDoc(doc)} className="p-1.5 hover:bg-stone-200 rounded-lg transition" title="צפייה">
                <Eye className="h-3.5 w-3.5 text-stone-500" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div 
              key={doc.id} 
              className={`bg-white rounded-xl p-4 shadow-sm border border-stone-200 transition-colors ${isPaid ? 'hover:border-stone-300' : 'opacity-80'}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-stone-800 truncate">{doc.title || doc.name || getDocTypeLabel(doc.type)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(doc.status)} cursor-help`}
                      title={
                        doc.status === 'pending_review' ? 'הממונה צריך לסקור ולאשר את המסמך' :
                        doc.status === 'active' ? 'המסמך אושר ופעיל — ניתן להוריד ולהשתמש' :
                        doc.status === 'pending_signature' ? 'נדרשת חתימה של הממונה על המסמך' :
                        doc.status === 'draft' ? 'טיוטה — המסמך עדיין בעריכה' : ''
                      }
                    >
                      {getStatusLabel(doc.status)}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(doc.created_at).toLocaleDateString('he-IL')}
                    </span>
                    {doc.version && (
                      <span className="text-xs text-stone-400 flex items-center gap-0.5">
                        {doc.status === 'active' ? '🔒' : ''} v{doc.version}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {isPaid ? (
                    <>
                      <button 
                        onClick={() => openDoc(doc)}
                        className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors" 
                        title="צפייה"
                      >
                        <Eye className="h-4 w-4 text-stone-500" />
                      </button>
                      <button 
                        onClick={() => downloadAsPdf(doc)}
                        className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors" 
                        title="הורד PDF"
                      >
                        <Download className="h-4 w-4 text-stone-500" />
                      </button>
                    </>
                  ) : (
                    <Link href="/subscribe">
                      <button 
                        className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        title="שלם כדי לצפות ולהוריד מסמכים"
                      >
                        <Lock className="h-3 w-3" />
                        שלם לצפייה
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-lg">{selectedDoc.title || selectedDoc.name || getDocTypeLabel(selectedDoc.type)}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-2 rounded-full transition ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-stone-100'}`}
                  title={isEditing ? 'סיום עריכה' : 'עריכה'}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setSelectedDoc(null)
                    setIsEditing(false)
                  }}
                  className="p-2 hover:bg-stone-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[300px] p-3 border border-stone-200 rounded-lg text-sm text-stone-700 font-sans leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  dir="rtl"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-stone-700 font-sans leading-relaxed">
                  {selectedDoc.content || 'אין תוכן למסמך זה'}
                </pre>
              )}
            </div>
            
            <div className="p-4 border-t flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(isEditing ? editedContent : selectedDoc.content || '')
                }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                <Copy className="w-4 h-4" />
                העתק
              </button>
              <button
                onClick={() => downloadAsPdf(selectedDoc)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              {isEditing && (
                <button
                  onClick={saveDocumentChanges}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  שמור שינויים
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// INCIDENTS TAB
// ============================================
function IncidentsTab({ incidents, orgId }: { incidents: any[], orgId: string }) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const closedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status))

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-rose-100 text-rose-700',
      investigating: 'bg-amber-100 text-amber-700',
      contained: 'bg-indigo-100 text-indigo-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-stone-100 text-stone-700'
    }
    return styles[status] || 'bg-stone-100 text-stone-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדש',
      investigating: 'בבדיקה',
      contained: 'נבלם',
      resolved: 'טופל',
      closed: 'סגור'
    }
    return labels[status] || status
  }

  const getTimeRemaining = (deadline: string) => {
    const now = new Date()
    const dl = new Date(deadline)
    const diff = dl.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 0) return { text: 'עבר הדדליין!', urgent: true }
    if (hours < 24) return { text: `${hours} שעות`, urgent: true }
    const days = Math.floor(hours / 24)
    return { text: `${days} ימים`, urgent: false }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">🚨 אירועי אבטחה</h1>
          <p className="text-stone-500 mt-1">ניהול ותיעוד אירועי אבטחה ופרטיות</p>
        </div>
        <Link href={`/chat?prompt=${encodeURIComponent('אני רוצה לדווח על אירוע אבטחה חדש. מה הפרטים שאתה צריך?')}`}>
          <button className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            דיווח אירוע חדש
          </button>
        </Link>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="font-semibold text-stone-800">אירועים פעילים ({activeIncidents.length})</h2>
          </div>
          <div className="space-y-3">
            {activeIncidents.map(incident => {
              const timeLeft = incident.authority_deadline ? getTimeRemaining(incident.authority_deadline) : null
              return (
                <div 
                  key={incident.id} 
                  className="bg-white rounded-xl p-4 shadow-sm border border-rose-100"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-stone-800">{incident.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                          {getStatusLabel(incident.status)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500">{incident.description?.slice(0, 100)}...</p>
                      {timeLeft && (
                        <p className={`text-sm mt-2 flex items-center gap-1 ${timeLeft.urgent ? 'text-rose-600 font-medium' : 'text-stone-500'}`}>
                          <Clock className="h-4 w-4" />
                          זמן לדיווח לרשות: {timeLeft.text}
                        </p>
                      )}
                      {/* Next steps guidance */}
                      <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-xs font-medium text-amber-700 mb-1">📋 הצעדים הבאים:</p>
                        <div className="text-xs text-amber-600 space-y-0.5">
                          {incident.status === 'new' && <>
                            <p>1. תעדו את כל הפרטים הידועים על האירוע</p>
                            <p>2. בדקו את היקף החשיפה (כמה נושאי מידע מושפעים)</p>
                            <p>3. עדכנו סטטוס ל"בבדיקה" דרך הצ׳אט</p>
                          </>}
                          {incident.status === 'investigating' && <>
                            <p>1. השלימו את חקירת האירוע ומפו את כל המידע שנחשף</p>
                            <p>2. הכינו דוח לרשות להגנת הפרטיות</p>
                            <p>3. שקלו הודעה לנושאי מידע שנפגעו</p>
                          </>}
                          {incident.status === 'contained' && <>
                            <p>1. ודאו שהפרצה נסגרה לחלוטין</p>
                            <p>2. דווחו לרשות אם נדרש (72 שעות מגילוי)</p>
                            <p>3. הכינו תוכנית מניעה לעתיד</p>
                          </>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/chat?incident=${incident.id}`}>
                        <button className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors w-full">
                          טיפול
                        </button>
                      </Link>
                      <Link href={`/chat?prompt=${encodeURIComponent(`צור עבורי דוח לרשות להגנת הפרטיות עבור אירוע האבטחה: ${incident.title}. כלול את כל הפרטים הנדרשים בהתאם לתיקון 13.`)}`}>
                        <button className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors w-full">
                          📋 דוח לרשות
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {incidents.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">אין אירועי אבטחה</h3>
          <p className="text-stone-500">לא דווחו אירועי אבטחה. המשיכו לשמור על הפרטיות! ✨</p>
        </div>
      )}

      {/* Closed Incidents */}
      {closedIncidents.length > 0 && (
        <div>
          <h2 className="font-semibold text-stone-500 mb-3">היסטוריה ({closedIncidents.length})</h2>
          <div className="space-y-2">
            {closedIncidents.slice(0, 5).map(incident => (
              <div key={incident.id} className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-700">{incident.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(incident.status)}`}>
                      {getStatusLabel(incident.status)}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(incident.created_at).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MESSAGES TAB (DPO ↔ User Communication)
// ============================================
function MessagesTab({ threads, orgId, onRefresh, supabase, tier }: { threads: any[], orgId: string, onRefresh: () => void, supabase: any, tier?: string }) {
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  // Credit counter — basic: 2/quarter, extended: 6/quarter
  const maxCredits = tier === 'extended' ? 6 : tier === 'enterprise' ? 12 : 2
  const usedCredits = threads.filter(t => {
    const d = new Date(t.created_at || t.createdAt)
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    return d >= qStart
  }).length

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')

  const openThread = async (thread: any) => {
    setSelectedThread(thread)
    setIsLoadingThread(true)
    setReplyText('')

    try {
      const res = await authFetch(`/api/messages?threadId=${thread.id}`)
      const data = await res.json()
      setThreadMessages(data.messages || [])

      // Mark as read
      await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', threadId: thread.id, senderType: 'user' })
      })
    } catch (e) {
      console.error('Failed to load thread:', e)
    } finally {
      setIsLoadingThread(false)
    }
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selectedThread || isSending) return
    setIsSending(true)

    try {
      await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          threadId: selectedThread.id,
          content: replyText,
          senderType: 'user',
          senderName: 'לקוח'
        })
      })

      setReplyText('')
      await openThread(selectedThread) // Reload messages
      onRefresh() // Refresh badge counts
    } catch (e) {
      console.error('Failed to send reply:', e)
    } finally {
      setIsSending(false)
    }
  }

  const createNewThread = async () => {
    if (!newSubject.trim() || !newContent.trim() || isSending) return
    setIsSending(true)

    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_thread',
          orgId,
          subject: newSubject,
          content: newContent,
          senderType: 'user',
          senderName: 'לקוח',
          priority: 'normal'
        })
      })

      const data = await res.json()
      setShowNewMessage(false)
      setNewSubject('')
      setNewContent('')
      onRefresh() // Refresh everything
      
      // Open the new thread
      if (data.thread) {
        openThread(data.thread)
      }
    } catch (e) {
      console.error('Failed to create thread:', e)
    } finally {
      setIsSending(false)
    }
  }

  const getStatusStyle = (status: string) => {
    if (status === 'resolved') return 'bg-emerald-100 text-emerald-700'
    if (status === 'open') return 'bg-indigo-100 text-indigo-700'
    return 'bg-stone-100 text-stone-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { open: 'פתוח', resolved: 'נענה', closed: 'סגור' }
    return labels[status] || status
  }

  // Thread detail view
  if (selectedThread) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => { setSelectedThread(null); onRefresh() }}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          חזרה להודעות
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Thread header */}
          <div className="p-4 border-b bg-stone-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">{selectedThread.subject}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(selectedThread.status)}`}>
                {getStatusLabel(selectedThread.status)}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {new Date(selectedThread.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Messages */}
          <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {isLoadingThread ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              threadMessages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.sender_type === 'dpo' 
                      ? 'bg-indigo-50 border border-indigo-100' 
                      : msg.sender_type === 'system'
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-stone-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.sender_type === 'dpo' ? 'text-indigo-600' : msg.sender_type === 'system' ? 'text-amber-600' : 'text-stone-500'
                      }`}>
                        {msg.sender_type === 'dpo' ? '🛡️ ממונה הגנת פרטיות' : msg.sender_type === 'system' ? '🤖 מערכת' : '👤 אתה'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-xs text-stone-400 mt-2">
                      {new Date(msg.created_at).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply input */}
          {selectedThread.status !== 'closed' && (
            <div className="p-4 border-t bg-stone-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="כתוב תגובה..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }}}
                  className="flex-1 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || isSending}
                  className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:bg-stone-300 transition-colors flex items-center gap-2"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  שלח
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Thread list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">💬 שיח עם ממונה</h1>
          <p className="text-stone-500 mt-1">תקשורת ישירה עם עו״ד דנה כהן — ממונה הגנת הפרטיות שלכם</p>
        </div>
        <button 
          onClick={() => setShowNewMessage(true)}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          הודעה חדשה
        </button>
      </div>

      {/* Credit counter */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-800">פניות לממונה ברבעון זה</p>
          <p className="text-xs text-indigo-500 mt-0.5">{tier === 'extended' ? 'חבילה מורחבת' : 'חבילה בסיסית'} · עד {maxCredits} פניות ברבעון</p>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxCredits }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < usedCredits ? 'bg-indigo-500' : 'bg-indigo-200'}`} />
          ))}
          <span className="text-sm font-semibold text-indigo-700 mr-1">{usedCredits}/{maxCredits}</span>
        </div>
      </div>

      {/* New Message Form */}
      {showNewMessage && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-200">
          <h3 className="font-semibold text-stone-800 mb-4">שליחת הודעה לממונה</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="נושא ההודעה"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              placeholder="תוכן ההודעה..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => { setShowNewMessage(false); setNewSubject(''); setNewContent('') }}
                className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-lg text-sm transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={createNewThread}
                disabled={!newSubject.trim() || !newContent.trim() || isSending}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:bg-stone-300 transition-colors"
              >
                {isSending ? 'שולח...' : 'שלח לממונה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread List */}
      {threads.length === 0 && !showNewMessage ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-stone-200 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">אין הודעות עדיין</h3>
          <p className="text-stone-500 mb-4">ניתן לשלוח הודעה ישירה לממונה הגנת הפרטיות שלכם</p>
          <button
            onClick={() => setShowNewMessage(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
          >
            שלח הודעה ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread: any) => (
            <div 
              key={thread.id}
              onClick={() => openThread(thread)}
              className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-colors hover:border-indigo-200 ${
                thread.unreadCount > 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-stone-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  thread.unreadCount > 0 ? 'bg-indigo-100' : 'bg-stone-100'
                }`}>
                  <MessageSquare className={`h-5 w-5 ${thread.unreadCount > 0 ? 'text-indigo-600' : 'text-stone-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-medium truncate ${thread.unreadCount > 0 ? 'text-stone-900' : 'text-stone-700'}`}>
                      {thread.subject}
                    </h3>
                    {thread.unreadCount > 0 && (
                      <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 truncate">
                    {thread.lastMessage?.content?.slice(0, 80) || 'אין הודעות'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(thread.status)}`}>
                      {getStatusLabel(thread.status)}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(thread.last_message_at || thread.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-stone-300 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// SETTINGS TAB
// ============================================
// ============================================
// REMINDERS TAB
// ============================================
function RemindersTab({ orgProfile, documents }: { orgProfile: any, documents: any[] }) {
  const answers = orgProfile?.answers || []
  const hasEmployees = (() => {
    const emp = answers.find((a: any) => a.questionId === 'employee_count')
    return emp && emp.value !== '1-10'
  })()
  const activeDocs = documents.filter(d => d.status === 'active')

  const reminders = [
    {
      id: 'annual-review',
      emoji: '📅',
      title: 'סקירה שנתית — עדכון מסמכים',
      description: 'תיקון 13 דורש סקירה תקופתית של מדיניות הפרטיות ונהלי אבטחה. בדקו שהמסמכים עדכניים ומשקפים את המצב בפועל.',
      frequency: 'פעם בשנה',
      category: 'רגולציה'
    },
    {
      id: 'employee-training',
      emoji: '🎓',
      title: 'הדרכת עובדים — פרטיות ואבטחת מידע',
      description: 'יש לקיים הדרכה תקופתית לכל עובד שנחשף למידע אישי. תעדו את ההדרכה ושמרו חתימות.',
      frequency: hasEmployees ? 'פעם בשנה' : 'לא רלוונטי',
      category: 'הדרכה',
      hidden: !hasEmployees
    },
    {
      id: 'supplier-review',
      emoji: '🔗',
      title: 'בדיקת ספקים ומעבדי מידע',
      description: 'ודאו שלכל ספק שמעבד מידע אישי עבורכם יש הסכם עיבוד נתונים (DPA) חתום ותקף.',
      frequency: 'פעם ב-6 חודשים',
      category: 'ספקים'
    },
    {
      id: 'database-registration',
      emoji: '🗄️',
      title: 'עדכון רישום מאגרי מידע',
      description: 'ודאו שמאגרי המידע רשומים ומעודכנים ברשם מאגרי המידע. כל שינוי באופי העיבוד מחייב עדכון.',
      frequency: 'בעת שינוי',
      category: 'רגולציה'
    },
    {
      id: 'data-retention',
      emoji: '🗑️',
      title: 'מחיקת מידע עודף',
      description: 'בדקו אם יש מידע שאינו נדרש עוד ומחקו אותו בהתאם למדיניות השמירה. כולל קורות חיים ישנים, לידים לא פעילים, ולקוחות לא פעילים.',
      frequency: 'פעם ברבעון',
      category: 'תחזוקה'
    },
    {
      id: 'privacy-policy-website',
      emoji: '🌐',
      title: 'בדיקת מדיניות פרטיות באתר',
      description: 'ודאו שמדיניות הפרטיות באתר עדכנית, נגישה, וכוללת את כל המידע הנדרש לפי תיקון 13.',
      frequency: 'פעם ברבעון',
      category: 'רגולציה'
    },
    {
      id: 'incident-drill',
      emoji: '🚨',
      title: 'תרגיל אירוע אבטחה',
      description: 'בצעו תרגיל פנימי לבדיקת נוהל תגובה לאירוע אבטחה. ודאו שכל הגורמים יודעים מה תפקידם.',
      frequency: 'פעם בשנה',
      category: 'אבטחה'
    },
    {
      id: 'consent-audit',
      emoji: '✅',
      title: 'בדיקת תקינות הסכמות',
      description: 'ודאו שכל איסוף מידע אישי מלווה בהסכמה מתועדת, ושטפסי ההסכמה עדכניים.',
      frequency: 'פעם ב-6 חודשים',
      category: 'רגולציה'
    },
  ].filter(r => !r.hidden)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">⏰ תזכורות והנחיות</h1>
        <p className="text-stone-500 mt-1">פעולות תקופתיות לשמירה על ציות מלא לתיקון 13</p>
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-stone-200 text-center">
          <p className="text-2xl font-bold text-indigo-600">{activeDocs.length}</p>
          <p className="text-xs text-stone-500 mt-0.5">מסמכים פעילים</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200 text-center">
          <p className="text-2xl font-bold text-emerald-600">{reminders.length}</p>
          <p className="text-xs text-stone-500 mt-0.5">פעולות תקופתיות</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200 text-center">
          <p className="text-2xl font-bold text-amber-600">4</p>
          <p className="text-xs text-stone-500 mt-0.5">ברבעון הקרוב</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200 text-center">
          <p className="text-2xl font-bold text-stone-400">—</p>
          <p className="text-xs text-stone-500 mt-0.5">סקירה שנתית</p>
        </div>
      </div>

      {/* Reminder cards */}
      <div className="space-y-3">
        {reminders.map(r => (
          <div key={r.id} className="bg-white rounded-xl p-4 border border-stone-200 hover:border-stone-300 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-stone-800">{r.title}</h3>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full text-xs">{r.frequency}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">{r.category}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1 leading-relaxed">{r.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
        <p className="text-sm text-indigo-700">💡 תזכורות אוטומטיות יישלחו במייל לפי לוח הזמנים — בקרוב</p>
      </div>
    </div>
  )
}

function SettingsTab({ organization, user, orgProfile, supabase }: { organization: any, user: any, orgProfile: any, supabase: any }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState(organization?.name || '')
  const [editBusinessId, setEditBusinessId] = useState(organization?.business_id || '')
  const [saveMsg, setSaveMsg] = useState('')

  const handleSave = async () => {
    if (!supabase || !organization?.id) return
    setSaving(true)
    try {
      await supabase.from('organizations').update({
        name: editName, 
        business_id: editBusinessId
      }).eq('id', organization.id)
      organization.name = editName
      organization.business_id = editBusinessId
      setEditing(false)
      setSaveMsg('נשמר בהצלחה ✓')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      setSaveMsg('שגיאה בשמירה')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800">⚙️ הגדרות</h1>
        <p className="text-stone-500 mt-1">ניהול הארגון והחשבון</p>
      </div>

      {/* Org Details — Editable */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-800">פרטי הארגון</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              ✏️ עריכה
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                {saving ? '...' : 'שמור'}
              </button>
              <button onClick={() => { setEditing(false); setEditName(organization?.name); setEditBusinessId(organization?.business_id) }} className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-sm">
                ביטול
              </button>
            </div>
          )}
        </div>
        {saveMsg && <p className="text-sm text-emerald-600 mb-3">{saveMsg}</p>}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-stone-500">שם העסק</label>
            {editing ? (
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:border-indigo-400" />
            ) : (
              <p className="font-medium text-stone-800 mt-1">{organization?.name || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-stone-500">מספר ח.פ</label>
            {editing ? (
              <input value={editBusinessId} onChange={e => setEditBusinessId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:border-indigo-400" />
            ) : (
              <p className="font-medium text-stone-800 mt-1">{organization?.business_id || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-stone-500">חבילה</label>
            <p className="mt-1">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                {organization?.tier === 'extended' ? 'מורחבת' : organization?.tier === 'enterprise' ? 'ארגונית' : 'בסיסית'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-stone-500">סטטוס</label>
            <p className="mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${organization?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {organization?.status === 'active' ? 'פעיל' : 'בהקמה'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Business Profile — from v3 onboarding */}
      {(() => {
        const v3 = orgProfile?.v3Answers
        if (!v3) return null

        const INDUSTRY_LABELS: Record<string, string> = {
          health: 'בריאות / רפואה', retail: 'קמעונאות / מסחר', tech: 'טכנולוגיה / הייטק',
          services: 'שירותים מקצועיים', finance: 'פיננסים / ביטוח', education: 'חינוך / הדרכה',
          legal: 'משפטים', food: 'מזון / הסעדה', realestate: 'נדל"ן', other: 'אחר'
        }
        const DB_LABELS: Record<string, string> = {
          customers: 'לקוחות', employees: 'עובדים', cvs: 'קורות חיים', cameras: 'מצלמות',
          website_leads: 'לידים מאתר', suppliers_id: 'ספקים', payments: 'תשלומים', medical: 'רפואי'
        }
        const PROC_LABELS: Record<string, string> = {
          crm_saas: 'CRM / מערכת ניהול', payroll: 'שכר / HR', marketing: 'שיווק דיגיטלי',
          cloud_hosting: 'אחסון ענן', call_center: 'מוקד שירות', accounting: 'הנהלת חשבונות'
        }
        const STORAGE_LABELS: Record<string, string> = {
          google: 'Google Workspace', microsoft: 'Microsoft 365', monday: 'Monday.com',
          priority: 'Priority', sap: 'SAP', salesforce: 'Salesforce', local: 'שרת מקומי'
        }
        const ACCESS_LABELS: Record<string, string> = {
          all: 'כולם', role: 'לפי תפקיד', strict: 'מוגבלת מאוד'
        }
        const CONSENT_LABELS: Record<string, string> = {
          yes: 'כן', no: 'לא', partial: 'חלקית'
        }

        const items: { label: string; value: string }[] = []

        if (v3.industry) items.push({ label: 'תחום פעילות', value: INDUSTRY_LABELS[v3.industry] || v3.industry })
        if (v3.databases?.length) items.push({ label: 'מאגרי מידע', value: v3.databases.map((d: string) => DB_LABELS[d] || d).join(', ') })
        if (v3.totalSize) items.push({ label: 'היקף רשומות כולל', value: v3.totalSize })
        if (v3.storage?.length) items.push({ label: 'מערכות', value: v3.storage.map((s: string) => STORAGE_LABELS[s] || s).join(', ') })
        if (v3.processors?.length) items.push({ label: 'ספקים חיצוניים', value: v3.processors.map((p: string) => PROC_LABELS[p] || p).join(', ') })
        if (v3.securityOwner || v3.securityOwnerName) items.push({ label: 'אחראי אבטחת מידע', value: v3.securityOwnerName || v3.securityOwner || '-' })
        if (v3.accessControl) items.push({ label: 'בקרת גישה', value: ACCESS_LABELS[v3.accessControl] || v3.accessControl })
        if (v3.hasConsent) items.push({ label: 'מנגנון הסכמה', value: CONSENT_LABELS[v3.hasConsent] || v3.hasConsent })
        if (v3.cameraOwnerName) items.push({ label: 'אחראי מצלמות', value: v3.cameraOwnerName })

        // DB details summary
        const dbDetails = v3.dbDetails || {}
        const dbCount = Object.keys(dbDetails).length
        const totalAccess = Object.values(dbDetails).reduce((max: number, d: any) => {
          const ACCESS_NUMS: Record<string, number> = { '1-2': 2, '3-10': 10, '11-50': 50, '50-100': 100, '100+': 200 }
          return Math.max(max, ACCESS_NUMS[d.access] || 0)
        }, 0)
        if (totalAccess > 0) items.push({ label: 'גישה מרבית למידע', value: `עד ${totalAccess} עובדים` })

        if (items.length === 0) return null

        return (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
            <h2 className="font-semibold text-stone-800 mb-4">🏢 פרופיל עסקי</h2>
            <p className="text-sm text-stone-400 mb-4">מבוסס על תשובות ההרשמה · לעדכון — פנו לממונה</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map(item => (
                <div key={item.label} className="p-3 bg-stone-50 rounded-xl">
                  <label className="text-xs text-stone-500 font-medium">{item.label}</label>
                  <p className="text-sm font-medium text-stone-700 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* DPO Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <h2 className="font-semibold text-stone-800 mb-4">🛡️ ממונה הגנת הפרטיות</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-stone-500">שם הממונה</label>
            <p className="font-medium text-stone-800 mt-1">{DPO_CONFIG.name}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">מספר רישיון</label>
            <p className="font-medium text-stone-800 mt-1">{DPO_CONFIG.licenseNumber}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">דוא״ל ממונה</label>
            <p className="font-medium text-stone-800 mt-1">{DPO_CONFIG.email}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">חברה</label>
            <p className="font-medium text-stone-800 mt-1">{DPO_CONFIG.company.name}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <h2 className="font-semibold text-stone-800 mb-4">👤 פרטי משתמש</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-stone-500">אימייל</label>
            <p className="font-medium text-stone-800 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">שם</label>
            <p className="font-medium text-stone-800 mt-1">{user?.user_metadata?.name || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-stone-800">ניהול חבילה ותשלום</h2>
            <p className="text-sm text-stone-500 mt-1">לשדרוג או שינוי חבילה</p>
          </div>
          <Link href="/subscribe">
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
              ניהול חבילה
            </button>
          </Link>
        </div>
      </div>

      {/* Audit Log */}
      <AuditLogSection orgId={organization?.id} supabase={supabase} />
    </div>
  )
}

// Audit Log sub-component
function AuditLogSection({ orgId, supabase }: { orgId: string, supabase: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadLogs = async () => {
    if (!orgId || !supabase) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/audit?org_id=${orgId}&limit=20`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {}
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (expanded && logs.length === 0) loadLogs() }, [expanded])

  const EVENT_LABELS: Record<string, string> = {
    document_generated: '📄 מסמכים נוצרו',
    document_approved: '✅ מסמך אושר',
    document_edited: '✏️ מסמך נערך',
    login: '🔐 התחברות',
    escalation: '📞 העברה לממונה',
    incident_created: '🚨 אירוע אבטחה',
    incident_resolved: '✅ אירוע נסגר',
    payment: '💳 תשלום',
    subscription_created: '💳 מנוי נוצר',
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between text-right hover:bg-stone-50 transition"
      >
        <div>
          <h2 className="font-semibold text-stone-800">📋 יומן פעילות (Audit Log)</h2>
          <p className="text-sm text-stone-500 mt-1">תיעוד כל הפעולות במערכת</p>
        </div>
        <span className="text-stone-400 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-stone-100 p-4">
          {loading ? (
            <p className="text-center text-stone-400 py-4">טוען...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-stone-400 py-4">אין רשומות פעילות</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-stone-50 text-sm">
                  <span className="flex-shrink-0">{EVENT_LABELS[log.event_type]?.slice(0, 2) || '📌'}</span>
                  <span className="flex-1 text-stone-700">{EVENT_LABELS[log.event_type]?.slice(2) || log.event_type}</span>
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleDateString('he-IL')} {new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// EXPORT
// ============================================
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Shield className="h-7 w-7 text-white animate-pulse" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

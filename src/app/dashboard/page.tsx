'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle,
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
  ExternalLink,
  Bell,
  X
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import WelcomeModal from '@/components/WelcomeModal'

// ============================================
// TYPES
// ============================================
interface Task {
  id: string
  type: 'missing_doc' | 'dsar' | 'review' | 'incident' | 'periodic'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  deadline?: string
  action: string
  actionPath?: string
}

interface Document {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  content?: string
}

// ============================================
// MAIN COMPONENT
// ============================================
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, signOut, loading, supabase } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'incidents' | 'settings'>('overview')
  const [organization, setOrganization] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [complianceScore, setComplianceScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Auth check
  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [loading, session, router])

  // Welcome modal
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  // Load data
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
      // Get user and org
      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_user_id', user.id)
        .single()

      if (userData?.organizations) {
        const org = userData.organizations
        setOrganization(org)
        
        // Load documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (docs) setDocuments(docs)

        // Load incidents
        const { data: incidentData } = await supabase
          .from('security_incidents')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
        
        if (incidentData) setIncidents(incidentData)

        // Load DSAR requests
        const { data: dsarData } = await supabase
          .from('dsar_requests')
          .select('*')
          .eq('org_id', org.id)
          .in('status', ['pending', 'in_progress'])

        // Calculate score and generate tasks
        const score = calculateScore(docs || [], incidentData || [])
        setComplianceScore(score)
        
        const generatedTasks = generateTasks(docs || [], incidentData || [], dsarData || [], org)
        setTasks(generatedTasks)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateScore = (docs: any[], incidents: any[]) => {
    let score = 25 // Base score for having DPO

    // Document-based scoring
    const docTypes = docs.map(d => d.type)
    if (docTypes.includes('privacy_policy')) score += 15
    if (docTypes.includes('security_policy') || docTypes.includes('security_procedures')) score += 15
    if (docTypes.includes('dpo_appointment')) score += 10
    if (docTypes.includes('database_registration') || docTypes.includes('database_definition')) score += 10
    if (docs.length >= 5) score += 10

    // Deduct for open incidents
    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    score -= openIncidents.length * 5

    return Math.max(0, Math.min(100, score))
  }

  const generateTasks = (docs: any[], incidents: any[], dsars: any[], org: any): Task[] => {
    const tasks: Task[] = []
    const docTypes = docs.map(d => d.type)

    // Missing documents
    if (!docTypes.includes('privacy_policy')) {
      tasks.push({
        id: 'missing-privacy',
        type: 'missing_doc',
        title: 'יצירת מדיניות פרטיות',
        description: 'מדיניות פרטיות היא דרישה בסיסית בתיקון 13',
        priority: 'high',
        action: 'צור מדיניות',
        actionPath: '/chat'
      })
    }

    if (!docTypes.includes('security_policy') && !docTypes.includes('security_procedures')) {
      tasks.push({
        id: 'missing-security',
        type: 'missing_doc',
        title: 'יצירת נוהל אבטחת מידע',
        description: 'נדרש נוהל אבטחה מתועד לארגון',
        priority: 'high',
        action: 'צור נוהל',
        actionPath: '/chat'
      })
    }

    if (!docTypes.includes('dpo_appointment')) {
      tasks.push({
        id: 'missing-dpo',
        type: 'missing_doc',
        title: 'כתב מינוי DPO',
        description: 'יש להפיק כתב מינוי רשמי לממונה',
        priority: 'medium',
        action: 'צור כתב מינוי',
        actionPath: '/chat'
      })
    }

    // Open incidents
    const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    openIncidents.forEach(incident => {
      const deadline = incident.authority_deadline ? new Date(incident.authority_deadline) : null
      const isUrgent = deadline && (deadline.getTime() - Date.now()) < 24 * 60 * 60 * 1000

      tasks.push({
        id: `incident-${incident.id}`,
        type: 'incident',
        title: `טיפול באירוע: ${incident.title}`,
        description: isUrgent ? '⚠️ פחות מ-24 שעות לדדליין!' : 'אירוע אבטחה פתוח דורש טיפול',
        priority: isUrgent ? 'high' : 'medium',
        deadline: deadline?.toLocaleDateString('he-IL'),
        action: 'טפל באירוע',
        actionPath: '/dashboard?tab=incidents'
      })
    })

    // DSAR requests
    dsars.forEach(dsar => {
      tasks.push({
        id: `dsar-${dsar.id}`,
        type: 'dsar',
        title: `בקשת ${dsar.request_type === 'access' ? 'עיון' : dsar.request_type === 'deletion' ? 'מחיקה' : 'תיקון'} ממידע`,
        description: `מאת: ${dsar.requester_name || 'לא ידוע'}`,
        priority: 'medium',
        deadline: dsar.deadline,
        action: 'טפל בבקשה'
      })
    })

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return tasks
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Active incidents count for badge
  const activeIncidentsCount = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length
  const urgentTasksCount = tasks.filter(t => t.priority === 'high').length

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal 
          onClose={() => setShowWelcome(false)} 
          orgName={organization?.name || ''} 
          documentsCount={documents.length}
          complianceScore={complianceScore}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white border-l transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl" style={{color: '#1e40af'}}>MyDPO</span>
            </Link>
          </div>

          {/* Chat Button - Primary Action */}
          <div className="p-4">
            <Link href="/chat">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                <Bot className="h-5 w-5" />
                צ׳אט עם הממונה
              </Button>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
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
              badge={urgentTasksCount > 0 ? urgentTasksCount : undefined}
              badgeColor="red"
            />
            <NavButton 
              icon={<FolderOpen className="h-5 w-5" />} 
              label="מסמכים" 
              active={activeTab === 'documents'} 
              onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false) }} 
            />
            <NavButton 
              icon={<AlertTriangle className="h-5 w-5" />} 
              label="אירועי אבטחה" 
              active={activeTab === 'incidents'} 
              onClick={() => { setActiveTab('incidents'); setMobileMenuOpen(false) }}
              badge={activeIncidentsCount > 0 ? activeIncidentsCount : undefined}
              badgeColor="red"
            />
            <NavButton 
              icon={<Settings className="h-5 w-5" />} 
              label="הגדרות" 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }} 
            />
          </nav>

          {/* User */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:mr-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold" style={{color: '#1e40af'}}>MyDPO</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab 
              organization={organization}
              complianceScore={complianceScore}
              tasks={tasks}
              documents={documents}
              incidents={incidents}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab 
              tasks={tasks}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab 
              documents={documents}
              organization={organization}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'incidents' && (
            <IncidentsTab 
              incidents={incidents}
              orgId={organization?.id}
              onRefresh={loadAllData}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab 
              organization={organization}
              user={user}
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================
// NAV BUTTON COMPONENT
// ============================================
function NavButton({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge, 
  badgeColor = 'blue' 
}: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeColor?: 'red' | 'blue' | 'green'
}) {
  const badgeColors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`${badgeColors[badgeColor]} text-white text-xs px-2 py-0.5 rounded-full`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ============================================
// OVERVIEW TAB
// ============================================
function OverviewTab({ 
  organization, 
  complianceScore, 
  tasks, 
  documents, 
  incidents,
  onNavigate 
}: { 
  organization: any
  complianceScore: number
  tasks: Task[]
  documents: Document[]
  incidents: any[]
  onNavigate: (tab: any) => void
}) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const urgentTasks = tasks.filter(t => t.priority === 'high')
  const hasSubscription = organization?.subscription_status === 'active'

  const getScoreColor = () => {
    if (complianceScore >= 70) return 'text-green-600'
    if (complianceScore >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreLabel = () => {
    if (complianceScore >= 70) return 'טוב'
    if (complianceScore >= 40) return 'בינוני'
    return 'נמוך'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">שלום, {organization?.name || 'משתמש'}</h1>
        <p className="text-gray-600">ברוכים הבאים ללוח הבקרה של MyDPO</p>
      </div>

      {/* Alerts */}
      {activeIncidents.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">{activeIncidents.length} אירועי אבטחה פעילים</p>
                  <p className="text-sm text-red-600">נדרשת תשומת לב מיידית</p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => onNavigate('incidents')}>
                טיפול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {urgentTasks.length > 0 && !activeIncidents.length && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">{urgentTasks.length} משימות דחופות</p>
                  <p className="text-sm text-amber-600">יש לטפל בהן בהקדם</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => onNavigate('tasks')}>
                צפייה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upsell */}
      {!hasSubscription && (
        <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">שדרגו לחבילה מלאה</p>
                  <p className="text-sm text-gray-600">קבלו גישה לכל הכלים והתמיכה של ממונה מוסמך</p>
                </div>
              </div>
              <Link href="/subscribe">
                <Button size="sm">צפייה בחבילות</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Compliance Score */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="56" 
                    fill="none" 
                    stroke={complianceScore >= 70 ? '#22c55e' : complianceScore >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12" 
                    strokeLinecap="round"
                    strokeDasharray={`${complianceScore * 3.52} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getScoreColor()}`}>{complianceScore}</span>
                  <span className="text-sm text-gray-500">מתוך 100</span>
                </div>
              </div>
              <h3 className="font-semibold">ציון ציות</h3>
              <Badge className={complianceScore >= 70 ? 'bg-green-100 text-green-800' : complianceScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                {getScoreLabel()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-gray-600">מסמכים</span>
              </div>
              <span className="text-2xl font-bold">{documents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-gray-600">משימות פתוחות</span>
              </div>
              <span className="text-2xl font-bold">{tasks.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* DPO Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <Badge className="mb-2 bg-blue-100 text-blue-800">הממונה שלכם</Badge>
            <h3 className="font-bold">עו"ד דנה כהן</h3>
            <p className="text-sm text-gray-500 mb-3">ממונה הגנת פרטיות</p>
            <Link href="/chat">
              <Button variant="outline" size="sm" className="w-full">
                <MessageSquare className="h-4 w-4 ml-2" />
                שליחת הודעה
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* What's Next */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>מה הצעד הבא?</span>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
                כל המשימות
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.slice(0, 3).map(task => (
                <div key={task.id} className={`p-4 rounded-lg border-r-4 ${
                  task.priority === 'high' ? 'bg-red-50 border-red-500' : 
                  task.priority === 'medium' ? 'bg-amber-50 border-amber-500' : 
                  'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    <Link href={task.actionPath || '/chat'}>
                      <Button size="sm" variant={task.priority === 'high' ? 'destructive' : 'default'}>
                        {task.action}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// TASKS TAB
// ============================================
function TasksTab({ tasks, onRefresh }: { tasks: Task[], onRefresh: () => void }) {
  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-amber-100 text-amber-800',
      low: 'bg-gray-100 text-gray-800'
    }
    const labels = { high: 'דחוף', medium: 'רגיל', low: 'נמוך' }
    return <Badge className={styles[priority as keyof typeof styles]}>{labels[priority as keyof typeof labels]}</Badge>
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      missing_doc: <FileText className="h-5 w-5 text-blue-600" />,
      dsar: <User className="h-5 w-5 text-purple-600" />,
      review: <Eye className="h-5 w-5 text-amber-600" />,
      incident: <AlertTriangle className="h-5 w-5 text-red-600" />,
      periodic: <Clock className="h-5 w-5 text-gray-600" />
    }
    return icons[type as keyof typeof icons] || <ClipboardList className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">משימות</h1>
          <p className="text-gray-600">כל מה שצריך לעשות במקום אחד</p>
        </div>
        <Link href="/chat">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            משימה חדשה
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">מצוין! אין משימות פתוחות</h3>
            <p className="text-gray-600">כל המשימות הושלמו. המשיכו כך!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className={task.priority === 'high' ? 'border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(task.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{task.title}</h3>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    {task.deadline && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        דדליין: {task.deadline}
                      </p>
                    )}
                  </div>
                  <Link href={task.actionPath || '/chat'}>
                    <Button size="sm" variant={task.priority === 'high' ? 'destructive' : 'outline'}>
                      {task.action}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// DOCUMENTS TAB
// ============================================
function DocumentsTab({ documents, organization, onRefresh }: { documents: Document[], organization: any, onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  const isPaid = organization?.subscription_status === 'active'

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
      dpa: 'הסכם עיבוד מידע'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-amber-100 text-amber-800'
    }
    const labels: Record<string, string> = {
      active: 'פעיל',
      draft: 'טיוטה',
      pending: 'ממתין'
    }
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>
  }

  const filteredDocs = filter === 'all' ? documents : documents.filter(d => d.type === filter)
  const docTypes = Array.from(new Set(documents.map(d => d.type)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">מסמכים</h1>
          <p className="text-gray-600">כל המסמכים והמדיניות של הארגון</p>
        </div>
        <Link href="/chat">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            מסמך חדש
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          הכל ({documents.length})
        </Button>
        {docTypes.map(type => (
          <Button 
            key={type}
            variant={filter === type ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter(type)}
          >
            {getDocTypeLabel(type)}
          </Button>
        ))}
      </div>

      {filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">אין מסמכים עדיין</h3>
            <p className="text-gray-600 mb-4">התחילו ביצירת מדיניות פרטיות דרך הצ׳אט</p>
            <Link href="/chat">
              <Button>
                <Bot className="h-4 w-4 ml-2" />
                יצירת מסמך
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{doc.name || getDocTypeLabel(doc.type)}</h3>
                      {getStatusBadge(doc.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="צפייה">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isPaid && (
                      <Button variant="ghost" size="icon" title="הורדה">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// INCIDENTS TAB
// ============================================
function IncidentsTab({ incidents, orgId, onRefresh }: { incidents: any[], orgId: string, onRefresh: () => void }) {
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
  const closedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status))

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-red-100 text-red-800',
      investigating: 'bg-amber-100 text-amber-800',
      contained: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    const labels: Record<string, string> = {
      new: 'חדש',
      investigating: 'בבדיקה',
      contained: 'נבלם',
      resolved: 'טופל',
      closed: 'סגור'
    }
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>
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
          <h1 className="text-2xl font-bold">אירועי אבטחה</h1>
          <p className="text-gray-600">ניהול ותיעוד אירועי אבטחה ופרטיות</p>
        </div>
        <Link href="/chat">
          <Button variant="destructive">
            <AlertTriangle className="h-4 w-4 ml-2" />
            דיווח אירוע חדש
          </Button>
        </Link>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            אירועים פעילים ({activeIncidents.length})
          </h2>
          <div className="space-y-3">
            {activeIncidents.map(incident => {
              const timeLeft = incident.authority_deadline ? getTimeRemaining(incident.authority_deadline) : null
              return (
                <Card key={incident.id} className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{incident.title}</h3>
                          {getStatusBadge(incident.status)}
                        </div>
                        <p className="text-sm text-gray-600">{incident.description?.slice(0, 100)}...</p>
                        {timeLeft && (
                          <p className={`text-sm mt-2 flex items-center gap-1 ${timeLeft.urgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            <Clock className="h-4 w-4" />
                            זמן לדיווח לרשות: {timeLeft.text}
                          </p>
                        )}
                      </div>
                      <Button size="sm">טיפול</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {incidents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">אין אירועי אבטחה</h3>
            <p className="text-gray-600">לא דווחו אירועי אבטחה. המשיכו לשמור על הפרטיות!</p>
          </CardContent>
        </Card>
      )}

      {/* Closed Incidents */}
      {closedIncidents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-600">היסטוריה ({closedIncidents.length})</h2>
          <div className="space-y-2">
            {closedIncidents.slice(0, 5).map(incident => (
              <Card key={incident.id} className="bg-gray-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{incident.title}</span>
                      {getStatusBadge(incident.status)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(incident.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SETTINGS TAB
// ============================================
function SettingsTab({ organization, user }: { organization: any, user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">הגדרות</h1>
        <p className="text-gray-600">ניהול הארגון והחשבון</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הארגון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">שם העסק</label>
              <p className="font-medium">{organization?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">מספר ח.פ</label>
              <p className="font-medium">{organization?.business_id || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">חבילה</label>
              <Badge className="mt-1">{organization?.tier === 'extended' ? 'מורחבת' : organization?.tier === 'enterprise' ? 'ארגונית' : 'בסיסית'}</Badge>
            </div>
            <div>
              <label className="text-sm text-gray-600">סטטוס</label>
              <Badge className={`mt-1 ${organization?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {organization?.status === 'active' ? 'פעיל' : 'בהקמה'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרטי משתמש</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">אימייל</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">שם</label>
              <p className="font-medium">{user?.user_metadata?.name || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>חבילה ותשלום</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">חבילה נוכחית: {organization?.tier === 'extended' ? 'מורחבת' : 'בסיסית'}</p>
              <p className="text-sm text-gray-600">לשדרוג או שינוי חבילה</p>
            </div>
            <Link href="/subscribe">
              <Button variant="outline">ניהול חבילה</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// EXPORT
// ============================================
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  AlertTriangle,
  Search,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  Send,
  Timer,
  Lock,
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'

// Simple password protection - change this password!
const DPO_PASSWORD = process.env.NEXT_PUBLIC_DPO_PASSWORD || 'dpo2024secure'

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if already authenticated in this session
    const isAuth = sessionStorage.getItem('dpo_authenticated')
    if (isAuth === 'true') {
      onSuccess()
    }
    setIsChecking(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === DPO_PASSWORD) {
      sessionStorage.setItem('dpo_authenticated', 'true')
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle>פורטל ממונה הגנת פרטיות</CardTitle>
          <CardDescription>הזן סיסמה לגישה לפורטל הניהול</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                className={error ? 'border-red-500' : ''}
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">סיסמה שגויה</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              כניסה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DPODashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { 
    user, 
    logout,
    dpo,
    loadDPO,
    allOrganizations,
    loadAllOrganizations,
    escalations,
    loadEscalations
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'escalations' | 'time'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

  // Show password gate first
  if (!isAuthenticated) {
    return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />
  }

  const filteredOrgs = allOrganizations.filter(org => 
    org.name.includes(searchQuery) || org.businessId.includes(searchQuery)
  )

  const openEscalations = escalations.filter(e => e.status === 'open' || e.status === 'in_progress')
  const totalTimeThisMonth = escalations.reduce((sum, e) => sum + e.dpoTimeMinutes, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l shadow-sm z-40">
        <div className="p-4 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
          <Badge className="mt-2">ממשק ממונה</Badge>
        </div>

        <nav className="p-4 space-y-2">
          <NavButton 
            icon={<CheckCircle2 />} 
            label="סקירה כללית" 
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <NavButton 
            icon={<Building2 />} 
            label="לקוחות" 
            active={activeTab === 'clients'}
            onClick={() => setActiveTab('clients')}
            badge={allOrganizations.length}
          />
          <NavButton 
            icon={<AlertTriangle />} 
            label="פניות ממתינות" 
            active={activeTab === 'escalations'}
            onClick={() => setActiveTab('escalations')}
            badge={openEscalations.length}
            badgeVariant="warning"
          />
          <NavButton 
            icon={<Timer />} 
            label="מעקב זמן" 
            active={activeTab === 'time'}
            onClick={() => setActiveTab('time')}
          />
        </nav>

        <div className="absolute bottom-0 right-0 left-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{dpo?.name || 'ממונה'}</p>
              <p className="text-xs text-gray-500 truncate">{dpo?.licenseNumber}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => {
            sessionStorage.removeItem('dpo_authenticated')
            window.location.href = '/'
          }}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתקות
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mr-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">שלום, {dpo?.name}</h1>
            <p className="text-gray-600">לוח בקרה לממונה הגנת פרטיות</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <OverviewTab 
            dpo={dpo}
            organizations={allOrganizations}
            escalations={escalations}
            totalTime={totalTimeThisMonth}
          />
        )}
        {activeTab === 'clients' && (
          <ClientsTab 
            organizations={filteredOrgs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'escalations' && (
          <EscalationsTab escalations={escalations} organizations={allOrganizations} />
        )}
        {activeTab === 'time' && (
          <TimeTrackingTab escalations={escalations} organizations={allOrganizations} />
        )}
      </main>
    </div>
  )
}

function NavButton({ icon, label, active, onClick, badge, badgeVariant = 'default' }: { 
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeVariant?: 'default' | 'warning'
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors
        ${active 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <Badge variant={badgeVariant === 'warning' ? 'warning' : 'secondary'} className="text-xs">
          {badge}
        </Badge>
      )}
    </button>
  )
}

function OverviewTab({ dpo, organizations, escalations, totalTime }: any) {
  const activeOrgs = organizations.filter((o: any) => o.status === 'active').length
  const onboardingOrgs = organizations.filter((o: any) => o.status === 'onboarding').length
  const openEscalations = escalations.filter((e: any) => e.status === 'open' || e.status === 'in_progress').length
  const urgentEscalations = escalations.filter((e: any) => e.priority === 'urgent' || e.priority === 'high').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">לקוחות פעילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{activeOrgs}</span>
              <span className="text-sm text-green-600 mb-1">+{onboardingOrgs} בהקמה</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">מתוך {dpo?.maxClients} מקסימום</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">פניות ממתינות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{openEscalations}</span>
              {urgentEscalations > 0 && (
                <Badge variant="destructive" className="mb-1">{urgentEscalations} דחופות</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">זמן השקעה החודש</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{totalTime}</span>
              <span className="text-sm text-gray-500 mb-1">דקות</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(totalTime / 60)} שעות</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">הכנסה חודשית</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">₪{(activeOrgs * 500 + organizations.filter((o: any) => o.tier === 'extended').length * 700).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">משוער</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Escalations */}
      <Card>
        <CardHeader>
          <CardTitle>פניות אחרונות</CardTitle>
          <CardDescription>פניות שדורשות את תשומת לבך</CardDescription>
        </CardHeader>
        <CardContent>
          {escalations.slice(0, 5).map((esc: any) => {
            const org = organizations.find((o: any) => o.id === esc.orgId)
            return (
              <div key={esc.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${esc.priority === 'urgent' ? 'bg-red-500' : ''}
                    ${esc.priority === 'high' ? 'bg-orange-500' : ''}
                    ${esc.priority === 'medium' ? 'bg-yellow-500' : ''}
                    ${esc.priority === 'low' ? 'bg-gray-400' : ''}
                  `} />
                  <div>
                    <p className="font-medium text-sm">{esc.subject}</p>
                    <p className="text-xs text-gray-500">{org?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={esc.status === 'open' ? 'warning' : esc.status === 'resolved' ? 'success' : 'secondary'}>
                    {esc.status === 'open' ? 'פתוח' : esc.status === 'in_progress' ? 'בטיפול' : 'נסגר'}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Client Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>התפלגות לפי חבילה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>בסיסית</span>
                  <span>{organizations.filter((o: any) => o.tier === 'basic').length}</span>
                </div>
                <Progress value={(organizations.filter((o: any) => o.tier === 'basic').length / organizations.length) * 100} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>מורחבת</span>
                  <span>{organizations.filter((o: any) => o.tier === 'extended').length}</span>
                </div>
                <Progress value={(organizations.filter((o: any) => o.tier === 'extended').length / organizations.length) * 100} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>התפלגות לפי סיכון</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>סטנדרטי</span>
                  <span>{organizations.filter((o: any) => o.riskLevel === 'standard').length}</span>
                </div>
                <Progress value={(organizations.filter((o: any) => o.riskLevel === 'standard').length / organizations.length) * 100} className="bg-green-100 [&>div]:bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>רגיש</span>
                  <span>{organizations.filter((o: any) => o.riskLevel === 'sensitive').length}</span>
                </div>
                <Progress value={(organizations.filter((o: any) => o.riskLevel === 'sensitive').length / organizations.length) * 100} className="bg-yellow-100 [&>div]:bg-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientsTab({ organizations, searchQuery, setSearchQuery }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">לקוחות ({organizations.length})</h2>
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לקוח..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {organizations.map((org: any) => (
          <Card key={org.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-sm text-gray-500">
                      ח.פ {org.businessId} • {org.tier === 'extended' ? 'מורחבת' : 'בסיסית'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={org.riskLevel === 'standard' ? 'success' : 'warning'}>
                    {org.riskLevel === 'standard' ? 'סטנדרטי' : 'רגיש'}
                  </Badge>
                  <Badge variant={org.status === 'active' ? 'success' : 'secondary'}>
                    {org.status === 'active' ? 'פעיל' : 'בהקמה'}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EscalationsTab({ escalations, organizations }: any) {
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null)
  const [response, setResponse] = useState('')

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      urgent: 'דחוף',
      high: 'גבוה',
      medium: 'בינוני',
      low: 'נמוך'
    }
    return labels[priority] || priority
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'פתוח',
      in_progress: 'בטיפול',
      resolved: 'נפתר',
      closed: 'סגור'
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">פניות ({escalations.length})</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Escalations List */}
        <div className="space-y-4">
          {escalations.map((esc: any) => {
            const org = organizations.find((o: any) => o.id === esc.orgId)
            return (
              <Card 
                key={esc.id}
                className={`cursor-pointer transition-all ${selectedEscalation?.id === esc.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedEscalation(esc)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{esc.subject}</h3>
                      <p className="text-sm text-gray-500">{org?.name}</p>
                    </div>
                    <Badge variant={
                      esc.priority === 'urgent' ? 'destructive' : 
                      esc.priority === 'high' ? 'warning' : 'secondary'
                    }>
                      {getPriorityLabel(esc.priority)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(esc.createdAt)}</span>
                    <Badge variant={esc.status === 'open' ? 'warning' : esc.status === 'resolved' ? 'success' : 'secondary'}>
                      {getStatusLabel(esc.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Selected Escalation Detail */}
        {selectedEscalation ? (
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>{selectedEscalation.subject}</CardTitle>
              <CardDescription>
                {organizations.find((o: any) => o.id === selectedEscalation.orgId)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm">{selectedEscalation.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">עדיפות: </span>
                  <span className="font-medium">{getPriorityLabel(selectedEscalation.priority)}</span>
                </div>
                <div>
                  <span className="text-gray-500">סטטוס: </span>
                  <span className="font-medium">{getStatusLabel(selectedEscalation.status)}</span>
                </div>
                <div>
                  <span className="text-gray-500">זמן: </span>
                  <span className="font-medium">{selectedEscalation.dpoTimeMinutes} דקות</span>
                </div>
              </div>

              {selectedEscalation.resolution && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">{selectedEscalation.resolution}</p>
                </div>
              )}

              {selectedEscalation.status !== 'closed' && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="כתוב תגובה..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">סימון כבטיפול</Button>
                    <Button>
                      <Send className="h-4 w-4 ml-2" />
                      שליחת תגובה
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64">
            <p className="text-gray-500">בחר פנייה לצפייה בפרטים</p>
          </Card>
        )}
      </div>
    </div>
  )
}

function TimeTrackingTab({ escalations, organizations }: any) {
  // Group time by organization
  const timeByOrg = organizations.map((org: any) => {
    const orgEscalations = escalations.filter((e: any) => e.orgId === org.id)
    const totalMinutes = orgEscalations.reduce((sum: number, e: any) => sum + e.dpoTimeMinutes, 0)
    return {
      ...org,
      totalMinutes,
      escalationCount: orgEscalations.length
    }
  }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)

  const totalMinutes = escalations.reduce((sum: number, e: any) => sum + e.dpoTimeMinutes, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">מעקב זמן</h2>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">סה״כ החודש</p>
            <p className="text-2xl font-bold">{totalMinutes} דקות</p>
            <p className="text-sm text-gray-500">{(totalMinutes / 60).toFixed(1)} שעות</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>זמן לפי לקוח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeByOrg.map((org: any) => (
              <div key={org.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{org.name}</span>
                    <span>{org.totalMinutes} דקות ({org.escalationCount} פניות)</span>
                  </div>
                  <Progress value={(org.totalMinutes / Math.max(...timeByOrg.map((o: any) => o.totalMinutes || 1))) * 100} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

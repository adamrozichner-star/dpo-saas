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
  Building2,
  AlertTriangle,
  Search,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  Send,
  Timer,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Clock
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Organization {
  id: string
  name: string
  business_id: string
  tier: string
  status: string
  risk_level: string
  created_at: string
}

interface Escalation {
  id: string
  org_id: string
  question: string
  answer: string
  status: string
  priority: string
  dpo_response: string | null
  dpo_time_minutes: number
  created_at: string
  resolved_at: string | null
}

export default function DPODashboardPage() {
  const router = useRouter()
  const { user, supabase, loading, signOut } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'escalations' | 'time'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is DPO (for now, check if email contains 'dpo' or is specific email)
  const isDPO = user?.email?.includes('dpo') || user?.email === 'dana@dpo-service.co.il'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    
    if (user && supabase) {
      loadData()
    }
  }, [loading, user, supabase, router])

  const loadData = async () => {
    if (!supabase) return
    
    setIsLoading(true)
    try {
      // Load all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (orgs) setOrganizations(orgs)

      // Load escalated Q&A interactions
      const { data: escalated, error: escError } = await supabase
        .from('qa_interactions')
        .select('*')
        .eq('escalated', true)
        .order('created_at', { ascending: false })

      if (escalated) setEscalations(escalated)
    } catch (err) {
      console.error('Error loading DPO data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    org.business_id?.includes(searchQuery)
  )

  const openEscalations = escalations.filter(e => !e.dpo_response)
  const totalTimeThisMonth = escalations.reduce((sum, e) => sum + (e.dpo_time_minutes || 0), 0)

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l shadow-sm z-40">
        <div className="p-4 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
          <Badge className="mt-2 bg-purple-100 text-purple-700">ממשק ממונה</Badge>
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
            badge={organizations.length}
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
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="h-5 w-5 text-purple-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">עו"ד דנה כהן</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
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
            <h1 className="text-2xl font-bold">שלום, עו"ד דנה כהן</h1>
            <p className="text-gray-600">לוח בקרה לממונה הגנת פרטיות</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {openEscalations.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {openEscalations.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <OverviewTab 
            organizations={organizations}
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
          <EscalationsTab 
            escalations={escalations} 
            organizations={organizations}
            supabase={supabase}
            onUpdate={loadData}
          />
        )}
        {activeTab === 'time' && (
          <TimeTrackingTab escalations={escalations} organizations={organizations} />
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
          ? 'bg-purple-100 text-purple-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <Badge variant={badgeVariant === 'warning' ? 'destructive' : 'secondary'} className="text-xs">
          {badge}
        </Badge>
      )}
    </button>
  )
}

function OverviewTab({ organizations, escalations, totalTime }: any) {
  const activeOrgs = organizations.filter((o: Organization) => o.status === 'active').length
  const onboardingOrgs = organizations.filter((o: Organization) => o.status === 'onboarding').length
  const openEscalations = escalations.filter((e: Escalation) => !e.dpo_response).length

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
              <span className="text-3xl font-bold text-green-600">{activeOrgs}</span>
              {onboardingOrgs > 0 && (
                <span className="text-sm text-gray-500 mb-1">+{onboardingOrgs} בהקמה</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">פניות ממתינות</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${openEscalations > 0 ? 'text-orange-500' : 'text-green-600'}`}>
              {openEscalations}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">זמן החודש</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totalTime}</span>
            <span className="text-sm text-gray-500 mr-1">דקות</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סה״כ שאילתות</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-blue-600">{escalations.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות אחרונה</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין פעילות עדיין</p>
          ) : (
            <div className="space-y-4">
              {organizations.slice(0, 5).map((org: Organization) => (
                <div key={org.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(org.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                    {org.status === 'active' ? 'פעיל' : 'בהקמה'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">אין לקוחות עדיין</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {organizations.map((org: Organization) => (
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
                        ח.פ {org.business_id} • {org.tier === 'extended' ? 'מורחבת' : 'בסיסית'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
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
      )}
    </div>
  )
}

function EscalationsTab({ escalations, organizations, supabase, onUpdate }: any) {
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null)
  const [response, setResponse] = useState('')
  const [timeSpent, setTimeSpent] = useState(5)
  const [isSending, setIsSending] = useState(false)

  const getOrgName = (orgId: string) => {
    const org = organizations.find((o: Organization) => o.id === orgId)
    return org?.name || 'לא ידוע'
  }

  const handleSendResponse = async () => {
    if (!selectedEscalation || !response.trim() || !supabase) return

    setIsSending(true)
    try {
      const { error } = await supabase
        .from('qa_interactions')
        .update({
          dpo_response: response,
          dpo_time_minutes: timeSpent,
          resolved_at: new Date().toISOString()
        })
        .eq('id', selectedEscalation.id)

      if (!error) {
        setResponse('')
        setSelectedEscalation(null)
        onUpdate()
      }
    } catch (err) {
      console.error('Error sending response:', err)
    } finally {
      setIsSending(false)
    }
  }

  const pendingEscalations = escalations.filter((e: Escalation) => !e.dpo_response)
  const resolvedEscalations = escalations.filter((e: Escalation) => e.dpo_response)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">פניות ({escalations.length})</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Escalations List */}
        <div className="space-y-4">
          <h3 className="font-medium text-orange-600">ממתינות לטיפול ({pendingEscalations.length})</h3>
          {pendingEscalations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">אין פניות ממתינות</p>
              </CardContent>
            </Card>
          ) : (
            pendingEscalations.map((esc: Escalation) => (
              <Card 
                key={esc.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedEscalation?.id === esc.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedEscalation(esc)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium line-clamp-2">{esc.question}</p>
                      <p className="text-sm text-gray-500">{getOrgName(esc.org_id)}</p>
                    </div>
                    <Badge variant="destructive">ממתין</Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(esc.created_at).toLocaleDateString('he-IL')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}

          {resolvedEscalations.length > 0 && (
            <>
              <h3 className="font-medium text-green-600 mt-6">טופלו ({resolvedEscalations.length})</h3>
              {resolvedEscalations.slice(0, 3).map((esc: Escalation) => (
                <Card key={esc.id} className="opacity-60">
                  <CardContent className="p-4">
                    <p className="font-medium line-clamp-1">{esc.question}</p>
                    <p className="text-sm text-gray-500">{getOrgName(esc.org_id)}</p>
                    <Badge variant="secondary" className="mt-2">טופל</Badge>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Selected Escalation Detail */}
        {selectedEscalation ? (
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">פרטי הפנייה</CardTitle>
              <CardDescription>{getOrgName(selectedEscalation.org_id)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">השאלה:</label>
                <div className="p-3 bg-gray-50 rounded-lg mt-1">
                  <p className="text-sm">{selectedEscalation.question}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">תשובת הבוט:</label>
                <div className="p-3 bg-blue-50 rounded-lg mt-1">
                  <p className="text-sm">{selectedEscalation.answer}</p>
                </div>
              </div>

              {!selectedEscalation.dpo_response && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium">תגובת הממונה:</label>
                    <Textarea
                      placeholder="כתוב תגובה מפורטת..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">זמן טיפול:</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={timeSpent}
                        onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
                        className="w-20"
                        min={1}
                      />
                      <span className="text-sm text-gray-500">דקות</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSendResponse}
                    disabled={!response.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Send className="h-4 w-4 ml-2" />
                    )}
                    שליחת תגובה
                  </Button>
                </div>
              )}

              {selectedEscalation.dpo_response && (
                <div>
                  <label className="text-sm font-medium text-green-600">תגובת הממונה:</label>
                  <div className="p-3 bg-green-50 rounded-lg mt-1">
                    <p className="text-sm">{selectedEscalation.dpo_response}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">בחר פנייה לצפייה בפרטים</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function TimeTrackingTab({ escalations, organizations }: any) {
  // Group time by organization
  const timeByOrg = organizations.map((org: Organization) => {
    const orgEscalations = escalations.filter((e: Escalation) => e.org_id === org.id)
    const totalMinutes = orgEscalations.reduce((sum: number, e: Escalation) => sum + (e.dpo_time_minutes || 0), 0)
    return {
      ...org,
      totalMinutes,
      escalationCount: orgEscalations.length
    }
  }).filter((org: any) => org.totalMinutes > 0)
    .sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)

  const totalMinutes = escalations.reduce((sum: number, e: Escalation) => sum + (e.dpo_time_minutes || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">מעקב זמן</h2>
        <Card className="px-6 py-4">
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
          {timeByOrg.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין נתוני זמן עדיין</p>
          ) : (
            <div className="space-y-4">
              {timeByOrg.map((org: any) => (
                <div key={org.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{org.name}</span>
                      <span className="text-gray-500">{org.totalMinutes} דקות ({org.escalationCount} פניות)</span>
                    </div>
                    <Progress 
                      value={(org.totalMinutes / Math.max(...timeByOrg.map((o: any) => o.totalMinutes || 1))) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

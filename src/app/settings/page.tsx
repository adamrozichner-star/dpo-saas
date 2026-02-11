'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  User,
  Building2,
  CreditCard,
  Bell,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSubscriptionGate } from '@/lib/use-subscription-gate'

export default function SettingsPage() {
  const router = useRouter()
  const { user, supabase, loading, signOut } = useAuth()
  const { isAuthorized, isChecking } = useSubscriptionGate()
  
  const [activeSection, setActiveSection] = useState<'profile' | 'organization' | 'security' | 'billing' | 'notifications'>('profile')
  const [organization, setOrganization] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const [orgData, setOrgData] = useState({
    name: '',
    businessId: '',
    contactEmail: '',
    contactPhone: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user && supabase) {
      loadUserData()
    }
  }, [loading, user, supabase])

  const loadUserData = async () => {
    if (!supabase || !user) return

    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('auth_user_id', user.id)
      .single()

    if (userData) {
      setProfileData({
        name: userData.name || '',
        email: user.email || '',
        phone: userData.phone || ''
      })

      if (userData.organizations) {
        setOrganization(userData.organizations)
        setOrgData({
          name: userData.organizations.name || '',
          businessId: userData.organizations.business_id || '',
          contactEmail: userData.organizations.contact_email || '',
          contactPhone: userData.organizations.contact_phone || ''
        })

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('org_id', userData.organizations.id)
          .eq('status', 'active')
          .single()

        if (sub) {
          setSubscription(sub)
        }
      }
    }
  }

  const handleSaveProfile = async () => {
    if (!supabase || !user) return
    setIsSaving(true)
    setMessage(null)

    try {
      await supabase
        .from('users')
        .update({
          name: profileData.name,
          phone: profileData.phone
        })
        .eq('auth_user_id', user.id)

      setMessage({ type: 'success', text: 'הפרופיל עודכן בהצלחה' })
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בעדכון הפרופיל' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveOrganization = async () => {
    if (!supabase || !organization) return
    setIsSaving(true)
    setMessage(null)

    try {
      await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          business_id: orgData.businessId,
          contact_email: orgData.contactEmail,
          contact_phone: orgData.contactPhone
        })
        .eq('id', organization.id)

      setMessage({ type: 'success', text: 'פרטי הארגון עודכנו בהצלחה' })
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בעדכון פרטי הארגון' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!supabase) return
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'הסיסמה חייבת להכיל לפחות 6 תווים' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'הסיסמה שונתה בהצלחה' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'שגיאה בשינוי הסיסמה' })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const menuItems = [
    { id: 'profile', label: 'פרופיל אישי', icon: User },
    { id: 'organization', label: 'פרטי ארגון', icon: Building2 },
    { id: 'security', label: 'אבטחה', icon: Lock },
    { id: 'billing', label: 'חיוב ומנוי', icon: CreditCard },
    { id: 'notifications', label: 'התראות', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">MyDPO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">חזרה ללוח הבקרה</Button>
            </Link>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 ml-2" />
              התנתקות
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">הגדרות</h1>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${
                        activeSection === item.id
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 mr-auto rotate-180" />
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                {message.text}
              </div>
            )}

            {activeSection === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>פרופיל אישי</CardTitle>
                  <CardDescription>עדכן את הפרטים האישיים שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">דוא"ל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">לא ניתן לשנות כתובת דוא"ל</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    שמירה
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === 'organization' && (
              <Card>
                <CardHeader>
                  <CardTitle>פרטי ארגון</CardTitle>
                  <CardDescription>עדכן את פרטי הארגון שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">שם הארגון</Label>
                    <Input
                      id="orgName"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessId">ח.פ / ע.מ</Label>
                    <Input
                      id="businessId"
                      value={orgData.businessId}
                      onChange={(e) => setOrgData({ ...orgData, businessId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">דוא"ל ליצירת קשר</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={orgData.contactEmail}
                      onChange={(e) => setOrgData({ ...orgData, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">טלפון ליצירת קשר</Label>
                    <Input
                      id="contactPhone"
                      value={orgData.contactPhone}
                      onChange={(e) => setOrgData({ ...orgData, contactPhone: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveOrganization} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    שמירה
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>אבטחה</CardTitle>
                  <CardDescription>שנה את הסיסמה שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">סיסמה חדשה</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    שינוי סיסמה
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === 'billing' && (
              <Card>
                <CardHeader>
                  <CardTitle>חיוב ומנוי</CardTitle>
                  <CardDescription>נהל את המנוי שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {subscription ? (
                    <>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">חבילה נוכחית</span>
                          <Badge className="bg-green-500">פעיל</Badge>
                        </div>
                        <div className="text-2xl font-bold">
                          {subscription.tier === 'extended' ? 'מורחבת' : 'בסיסית'}
                        </div>
                        <div className="text-gray-600">
                          ₪{subscription.amount} / חודש
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Link href="/subscribe">
                          <Button variant="outline">שדרוג חבילה</Button>
                        </Link>
                        <Button variant="ghost" className="text-red-600 hover:text-red-700">
                          ביטול מנוי
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium mb-2">אין מנוי פעיל</h3>
                      <p className="text-gray-600 mb-4">התחל מנוי כדי ליהנות מכל היתרונות</p>
                      <Link href="/subscribe">
                        <Button>בחירת חבילה</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>התראות</CardTitle>
                  <CardDescription>הגדר את העדפות ההתראות שלך</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">התראות דוא"ל</div>
                      <div className="text-sm text-gray-600">קבל עדכונים על פעילות המערכת</div>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">התראות על אסקלציות</div>
                      <div className="text-sm text-gray-600">קבל הודעה כשהממונה עונה לשאלה</div>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">תזכורות חידוש</div>
                      <div className="text-sm text-gray-600">קבל תזכורת לפני חידוש המנוי</div>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5" />
                  </div>
                  <Button>שמירת העדפות</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

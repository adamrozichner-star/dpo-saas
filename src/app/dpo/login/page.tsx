'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function DPOLoginPage() {
  const router = useRouter()
  const { signIn, supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Sign in with Supabase Auth
      const { error: signInError } = await signIn(email, password)
      
      if (signInError) {
        setError('אימייל או סיסמה שגויים')
        setIsLoading(false)
        return
      }

      // Check if user is a DPO
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: dpoData, error: dpoError } = await supabase
            .from('dpos')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()

          if (dpoError || !dpoData) {
            // Not a DPO - sign out and show error
            await supabase.auth.signOut()
            setError('משתמש זה אינו רשום כממונה הגנת פרטיות')
            setIsLoading(false)
            return
          }

          // Success - redirect to DPO dashboard
          router.push('/dpo')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('אירעה שגיאה בהתחברות')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-xl">פורטל ממונה הגנת פרטיות</CardTitle>
          <CardDescription>התחברות לממשק ניהול DPO</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">אימייל</label>
              <Input
                type="email"
                placeholder="dpo@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">סיסמה</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin ml-2" />מתחבר...</>
              ) : (
                'התחברות'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
              <ArrowRight className="h-4 w-4" />
              כניסה כלקוח
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

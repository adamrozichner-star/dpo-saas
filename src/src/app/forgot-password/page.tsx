'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { supabase } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה בשליחת הבקשה')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">הבקשה נשלחה!</h2>
            <p className="text-gray-600 mb-6">
              שלחנו לכם מייל עם קישור לאיפוס הסיסמה.
              <br />
              בדקו את תיבת הדואר שלכם.
            </p>
            <Link href="/login">
              <Button variant="outline">
                <ArrowRight className="h-4 w-4 ml-2" />
                חזרה להתחברות
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl" style={{color: '#1e40af'}}>MyDPO</span>
            </Link>
          </div>
          <CardTitle>שכחתי סיסמה</CardTitle>
          <CardDescription>
            הזינו את כתובת המייל שלכם ונשלח לכם קישור לאיפוס הסיסמה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full text-white" 
              style={{backgroundColor: '#10b981'}}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              שליחת קישור לאיפוס
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              חזרה להתחברות
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

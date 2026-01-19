'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת הבקשה')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">בדוק את תיבת הדואר</h1>
            <p className="text-gray-600 mb-6">
              שלחנו לך קישור לאיפוס הסיסמה לכתובת:<br />
              <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              לא קיבלת? בדוק בתיקיית הספאם או נסה שוב.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                חזרה להתחברות
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <span className="font-bold text-2xl">DPO-Pro</span>
          </Link>
          <CardTitle>שכחת סיסמה?</CardTitle>
          <CardDescription>
            הזן את כתובת הדוא"ל שלך ונשלח לך קישור לאיפוס
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">דוא"ל</Label>
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
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              שליחת קישור איפוס
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-primary hover:underline flex items-center justify-center gap-1">
              <ArrowRight className="h-4 w-4" />
              חזרה להתחברות
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

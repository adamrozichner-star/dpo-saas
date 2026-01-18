'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      setIsLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await signUp(email, password, name)
      if (error) {
        if (error.message.includes('already registered')) {
          setError('כתובת האימייל כבר רשומה במערכת')
        } else {
          setError('אירעה שגיאה בהרשמה, נסו שוב')
        }
      } else {
        setSuccess(true)
        // Redirect to onboarding after short delay
        setTimeout(() => {
          router.push('/onboarding')
        }, 2000)
      }
    } catch (err) {
      setError('אירעה שגיאה, נסו שוב')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">נרשמתם בהצלחה!</h2>
            <p className="text-gray-600">מעבירים אתכם להגדרת הארגון...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DPO-Pro</span>
          </Link>
          <CardTitle>הרשמה</CardTitle>
          <CardDescription>צרו חשבון חדש והתחילו לנהל את הפרטיות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">שם מלא</label>
              <Input
                type="text"
                placeholder="ישראל ישראלי"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">אימייל</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סיסמה</label>
              <Input
                type="password"
                placeholder="לפחות 6 תווים"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">אימות סיסמה</label>
              <Input
                type="password"
                placeholder="הקלידו שוב את הסיסמה"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              הרשמה
            </Button>

            <p className="text-xs text-gray-500 text-center">
              בלחיצה על הרשמה אתם מסכימים ל
              <Link href="#" className="text-primary hover:underline">תנאי השימוש</Link>
              {' '}ול
              <Link href="#" className="text-primary hover:underline">מדיניות הפרטיות</Link>
            </p>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-600">
              כבר יש לכם חשבון?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">התחברות</Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Link href="/" className="absolute top-4 right-4 flex items-center gap-1 text-gray-600 hover:text-gray-900">
        <ArrowRight className="h-4 w-4" />
        חזרה לדף הבית
      </Link>
    </div>
  )
}

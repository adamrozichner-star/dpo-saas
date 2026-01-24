'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError('פרטי ההתחברות שגויים')
      } else {
        router.push('/chat')
      }
    } catch (err) {
      setError('אירעה שגיאה, נסו שוב')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(to bottom, #dbeafe, white)'}}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl" style={{color: '#1e40af'}}>MyDPO</span>
          </Link>
          <CardTitle>התחברות</CardTitle>
          <CardDescription>היכנסו לחשבון שלכם לניהול הפרטיות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div className="text-left">
              <Link href="/forgot-password" className="text-sm hover:underline" style={{color: '#1e40af'}}>
                שכחת סיסמה?
              </Link>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button 
              type="submit" 
              className="w-full text-white" 
              style={{backgroundColor: '#10b981'}}
              disabled={isLoading}
            >
              {isLoading ? 'מתחבר...' : 'התחברות'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-600">
              עדיין אין לכם חשבון?{' '}
              <Link href="/register" className="hover:underline font-medium" style={{color: '#1e40af'}}>הרשמה</Link>
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

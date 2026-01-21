'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Lock, Loader2 } from 'lucide-react'

export default function DPOLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check against env variable (set in Vercel)
    const dpoPassword = process.env.NEXT_PUBLIC_DPO_PASSWORD || 'dpo2025'

    if (password === dpoPassword) {
      localStorage.setItem('dpo_authenticated', 'true')
      router.push('/dpo')
    } else {
      setError('סיסמה שגויה')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/10 rounded-full p-4 w-fit">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">DPO Dashboard</CardTitle>
          <CardDescription>
            גישה לממונים מורשים בלבד
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="הזן סיסמת DPO"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'כניסה'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            מערכת ניהול DPO-Pro
            <br />
            גישה מותרת לממונים מורשים בלבד
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="text-center">
        <Link href="/" className="flex items-center justify-center mb-8">
          <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={120} height={37} />
        </Link>
        
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">😕</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">משהו השתבש</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          אירעה שגיאה בלתי צפויה. אנחנו מתנצלים על אי הנוחות.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

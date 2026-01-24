'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, Home, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="text-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
            <Shield className="h-8 w-8 text-white" />
          </div>
          <span className="font-bold text-3xl" style={{color: '#1e40af'}}>MyDPO</span>
        </Link>
        
        <h1 className="text-8xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">הדף לא נמצא</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          מצטערים, הדף שחיפשת לא קיים או שהועבר למקום אחר.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="gap-2 text-white" style={{backgroundColor: '#10b981'}}>
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2" style={{borderColor: '#1e40af', color: '#1e40af'}}>
              <ArrowRight className="h-4 w-4 rotate-180" />
              ללוח הבקרה
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

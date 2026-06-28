'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if already accepted
    try {
      if (!document.cookie.includes('cookie_consent=true')) {
        setVisible(true)
      }
    } catch {}
  }, [])

  const accept = () => {
    // Set cookie for 1 year
    document.cookie = 'cookie_consent=true; path=/; max-age=31536000; SameSite=Lax'
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9998] bg-white border-t border-stone-200 shadow-lg px-4 py-3"
      dir="rtl"
      role="banner"
      aria-label="הודעת עוגיות"
    >
      <div className="container mx-auto flex items-center justify-between gap-4 max-w-5xl">
        <p className="text-sm text-stone-600 flex-1">
          אתר זה משתמש בעוגיות לשיפור חוויית השימוש ולצורכי ניתוח.{' '}
          <a href="/cookie-policy" className="text-stone-700 underline hover:text-stone-900">מדיניות עוגיות</a>
        </p>
        <button
          onClick={accept}
          className="px-5 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 transition-colors flex-shrink-0"
        >
          אישור
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [highContrast, setHighContrast] = useState(false)
  const [linkHighlight, setLinkHighlight] = useState(false)

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`
  }, [fontSize])

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('a11y-high-contrast')
    } else {
      document.body.classList.remove('a11y-high-contrast')
    }
  }, [highContrast])

  useEffect(() => {
    if (linkHighlight) {
      document.body.classList.add('a11y-link-highlight')
    } else {
      document.body.classList.remove('a11y-link-highlight')
    }
  }, [linkHighlight])

  const reset = () => {
    setFontSize(100)
    setHighContrast(false)
    setLinkHighlight(false)
  }

  return (
    <>
      <style>{`
        .a11y-high-contrast { filter: contrast(1.4) !important; }
        .a11y-link-highlight a { outline: 2px solid #4f46e5 !important; outline-offset: 2px !important; }
      `}</style>
      
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 left-4 z-[9999] w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center text-xl"
        aria-label="תפריט נגישות"
        title="נגישות"
      >
        ♿
      </button>

      {/* Menu panel */}
      {open && (
        <div className="fixed bottom-20 left-4 z-[9999] bg-white rounded-xl shadow-2xl border border-stone-200 p-4 w-64" dir="rtl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-800 text-sm">♿ נגישות</h3>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
          </div>

          <div className="space-y-3">
            {/* Font size */}
            <div>
              <p className="text-xs text-stone-500 mb-1.5">גודל טקסט</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFontSize(f => Math.max(80, f - 10))}
                  className="flex-1 py-1.5 bg-stone-100 rounded-lg text-sm font-medium hover:bg-stone-200 transition"
                >
                  א-
                </button>
                <button 
                  onClick={() => setFontSize(100)}
                  className="flex-1 py-1.5 bg-stone-100 rounded-lg text-sm font-medium hover:bg-stone-200 transition"
                >
                  {fontSize}%
                </button>
                <button 
                  onClick={() => setFontSize(f => Math.min(150, f + 10))}
                  className="flex-1 py-1.5 bg-stone-100 rounded-lg text-sm font-medium hover:bg-stone-200 transition"
                >
                  א+
                </button>
              </div>
            </div>

            {/* High contrast */}
            <button 
              onClick={() => setHighContrast(!highContrast)}
              className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                highContrast ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {highContrast ? '✓ ' : ''}ניגודיות גבוהה
            </button>

            {/* Link highlight */}
            <button 
              onClick={() => setLinkHighlight(!linkHighlight)}
              className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                linkHighlight ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {linkHighlight ? '✓ ' : ''}הדגשת קישורים
            </button>

            {/* Reset */}
            <button 
              onClick={reset}
              className="w-full py-1.5 text-xs text-stone-400 hover:text-stone-600 transition"
            >
              איפוס הגדרות
            </button>

            {/* Declaration link */}
            <a 
              href="/accessibility"
              className="block text-center text-xs text-indigo-600 hover:text-indigo-700 mt-1"
            >
              הצהרת נגישות →
            </a>
          </div>
        </div>
      )}
    </>
  )
}

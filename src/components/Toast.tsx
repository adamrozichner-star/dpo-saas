'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none" dir="rtl">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md w-full rounded-xl px-4 py-3 shadow-lg border flex items-center gap-3 animate-slide-up ${
              t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              t.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-black/5 rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

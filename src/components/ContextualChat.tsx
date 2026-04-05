'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// =============================================
// Types
// =============================================
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ChatContext = 
  | 'dashboard'
  | 'ropa'
  | 'onboarding'
  | 'documents'
  | 'incidents'
  | 'settings'
  | 'general'

interface ContextConfig {
  title: string
  subtitle: string
  suggestions: string[]
  systemHint: string
}

interface ContextualChatProps {
  context: ChatContext
  orgId: string
  /** Extra context to inject (e.g., current ROPA activity name) */
  extraContext?: string
  /** Position override */
  position?: 'bottom-right' | 'bottom-left'
}

// =============================================
// Context Configurations
// =============================================
const CONTEXT_CONFIGS: Record<ChatContext, ContextConfig> = {
  dashboard: {
    title: 'עוזר MyDPO',
    subtitle: 'איך אפשר לעזור?',
    suggestions: [
      'מה הצעד הבא שלי?',
      'איך משפרים את ציון הציות?',
      'מה חסר לי?',
    ],
    systemHint: 'המשתמש נמצא בדשבורד הראשי. התמקד בסטטוס כללי, צעדים הבאים, ותמונת מצב.',
  },
  ropa: {
    title: 'עזרה ב-ROPA',
    subtitle: 'מפת עיבוד מידע',
    suggestions: [
      'איך מוסיפים פעילות עיבוד?',
      'מה צריך לרשום ברשות?',
      'מה זה בסיס חוקי?',
      'איך מעריכים רמת סיכון?',
    ],
    systemHint: 'המשתמש נמצא בעמוד ROPA (מפת עיבוד מידע). התמקד בפעילויות עיבוד, רישום מאגרים, בסיס חוקי, סיווג סיכונים, והעברות מידע.',
  },
  onboarding: {
    title: 'עזרה באיפיון',
    subtitle: 'שאלון הארגון',
    suggestions: [
      'מה זה מאגר מידע?',
      'למה צריך DPO?',
      'איזה מידע נחשב רגיש?',
    ],
    systemHint: 'המשתמש נמצא בשאלון האיפיון (onboarding). עזור לו להבין את השאלות ולמלא נכון. תן תשובות קצרות וברורות.',
  },
  documents: {
    title: 'עזרה במסמכים',
    subtitle: 'ניהול מסמכים',
    suggestions: [
      'איזה מסמכים אני צריך?',
      'מה ההבדל בין מדיניות לנוהל?',
      'צור לי מדיניות פרטיות',
    ],
    systemHint: 'המשתמש נמצא בעמוד המסמכים. התמקד ביצירת מסמכים, סקירות, ותאימות לתיקון 13.',
  },
  incidents: {
    title: 'אירועי אבטחה',
    subtitle: 'ניהול אירועים',
    suggestions: [
      'מתי צריך לדווח לרשות?',
      'מה עושים בדליפת מידע?',
      'כמה זמן יש לדווח?',
    ],
    systemHint: 'המשתמש נמצא בעמוד אירועי אבטחה. התמקד בדיווח, זמנים (72 שעות), תיעוד, והתמודדות עם אירועים.',
  },
  settings: {
    title: 'הגדרות',
    subtitle: 'עזרה בהגדרות',
    suggestions: [
      'איך מעדכנים פרטי ארגון?',
      'מה כוללת כל חבילה?',
    ],
    systemHint: 'המשתמש נמצא בהגדרות. עזור עם חשבון, חבילות, ופרטי ארגון.',
  },
  general: {
    title: 'עוזר MyDPO',
    subtitle: 'איך אפשר לעזור?',
    suggestions: [
      'מה זה תיקון 13?',
      'מה תפקיד DPO?',
      'איך מתחילים?',
    ],
    systemHint: '',
  },
}

// =============================================
// Component
// =============================================
export default function ContextualChat({ context, orgId, extraContext, position = 'bottom-right' }: ContextualChatProps) {
  const { user, supabase } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const config = CONTEXT_CONFIGS[context]

  // Auth fetch helper
  const authFetch = useCallback(async (url: string, options: RequestInit) => {
    if (!supabase) throw new Error('No supabase client')
    const { data: { session } } = await supabase.auth.getSession()
    const headers = new Headers(options.headers || {})
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }, [supabase])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isLoading || !orgId) return

    setInput('')
    setShowSuggestions(false)
    setIsLoading(true)

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const streamId = `a-${Date.now()}`
    setMessages(prev => [...prev, userMsg, { id: streamId, role: 'assistant', content: '' }])

    try {
      const response = await authFetch('/api/chat/contextual', {
        method: 'POST',
        body: JSON.stringify({
          orgId,
          message: msg,
          context,
          contextHint: config.systemHint,
          extraContext: extraContext || '',
        })
      })

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          const err = await response.json().catch(() => ({}))
          setMessages(prev => prev.map(m =>
            m.id === streamId ? { ...m, content: `⚠️ ${(err as any).message || 'נסה שוב בעוד רגע.'}` } : m
          ))
          setIsLoading(false)
          return
        }
        throw new Error('Failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              fullText += data.text
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: fullText } : m
              ))
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: 'שגיאה. נסה שוב.' } : m
      ))
    }

    setIsLoading(false)
  }

  const posClass = position === 'bottom-left' ? 'left-4' : 'right-4'

  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 ${posClass} z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group`}
          title={config.title}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed bottom-6 ${posClass} z-50 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden`}
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-sm">{config.title}</h3>
              <p className="text-xs text-indigo-200">{config.subtitle}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsOpen(false); setMessages([]); setShowSuggestions(true) }} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[340px]">
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-stone-400 text-center mb-3">
                  <Sparkles className="w-3 h-3 inline ml-1" />
                  הצעות לשאלות
                </p>
                {config.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-right text-sm px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-stone-100 text-stone-800 rounded-tl-sm'
                }`}>
                  {msg.content || (
                    <span className="flex items-center gap-1 text-stone-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> חושב...
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex items-center gap-2 flex-shrink-0 bg-stone-50">
            <input
              ref={inputRef}
              type="text"
              placeholder="שאל שאלה..."
              className="flex-1 bg-white border border-stone-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 transition"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 transition flex-shrink-0"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-stone-400 text-center pb-1.5 px-2">
            עוזר AI · תשובות אינן ייעוץ משפטי
          </p>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

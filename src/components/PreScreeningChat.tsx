'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, User, ArrowLeft } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  rawJson?: any
}

interface PreScreeningChatProps {
  initialMessage: string
  supabase: any
  onComplete: (summary: string, subject: string, history: ChatMessage[]) => void
  onSkip: () => void
}

export default function PreScreeningChat({ initialMessage, supabase, onComplete, onSkip }: PreScreeningChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialSent = useRef(false)

  const getHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  const sendToAI = async (userMsg: string, history: ChatMessage[]) => {
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/messages/prescreening', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userMessage: userMsg, conversationHistory: history }),
      })

      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json()

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        rawJson: data.rawJson,
      }

      const updated = [...history, { role: 'user' as const, content: userMsg }, aiMsg]
      setMessages(updated)

      if (data.ready) {
        setReady(true)
        setTimeout(() => onComplete(data.summary, data.subject, updated), 2000)
      }
    } catch (e) {
      console.error('Pre-screening error:', e)
      setMessages(prev => [...prev, { role: 'user', content: userMsg }, {
        role: 'assistant',
        content: 'מצטער, נתקלתי בבעיה טכנית. ניתן לפנות ישירות לממונה.',
      }])
    }
    setLoading(false)
  }

  // Send initial message automatically
  useEffect(() => {
    if (initialMessage && !initialSent.current) {
      initialSent.current = true
      const intro: ChatMessage = {
        role: 'assistant',
        content: 'כדי שהממונה יוכל לתת מענה מדויק, אשמח להבין כמה פרטים...',
      }
      setMessages([{ role: 'user', content: initialMessage }, intro])
      // Now send to AI for first clarification
      sendToAI(initialMessage, [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = () => {
    if (!input.trim() || loading || ready) return
    const msg = input.trim()
    setInput('')
    sendToAI(msg, messages)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-stone-200 bg-amber-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">עוזר Deepo</p>
            <p className="text-[10px] text-stone-500">מחדד את הפנייה שלכם לממונה</p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          פנייה ישירה לממונה
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-stone-500" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-stone-100 text-stone-800'
                : 'bg-amber-50 border border-amber-200 text-stone-700'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-amber-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-end">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
        )}
        {ready && (
          <div className="text-center py-2">
            <p className="text-xs text-emerald-600 font-medium">✓ הפנייה מועברת לממונה...</p>
          </div>
        )}
      </div>

      {/* Input */}
      {!ready && (
        <div className="p-3 border-t border-stone-200">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הקלידו תשובה..."
              rows={1}
              disabled={loading}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none focus:outline-none focus:border-amber-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

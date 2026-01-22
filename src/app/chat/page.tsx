'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Send, Upload, Paperclip, Mic, Check, CheckCheck, FileText, Shield, 
  AlertTriangle, Plus, X, Sparkles, Download, Loader2, Phone, 
  BarChart3, File, Copy, Share2, Edit3, Eye, ExternalLink,
  MessageSquare, Settings, ChevronDown, RefreshCw, Clock
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  intent?: string
  attachments?: any[]
  metadata?: {
    generated_document?: {
      type: string
      content: string
    }
  }
}

interface QuickAction {
  type: string
  buttons: {
    id: string
    label: string
    style: 'primary' | 'secondary' | 'danger' | 'outline'
  }[]
}

interface Suggestion {
  icon: string
  text: string
  priority?: number
}

export default function ChatPage() {
  const router = useRouter()
  const { user, supabase } = useAuth()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [complianceScore, setComplianceScore] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction | null>(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<any>(null)
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const [showUpsellBanner, setShowUpsellBanner] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial data
  useEffect(() => {
    loadOrganization()
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show upsell banner occasionally
  useEffect(() => {
    if (messages.length > 0 && messages.length % 12 === 0) {
      setShowUpsellBanner(true)
      setTimeout(() => setShowUpsellBanner(false), 10000)
    }
  }, [messages.length])

  const loadOrganization = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      
      if (data.organization) {
        setOrganization(data.organization)
        await loadChatHistory(data.organization.id)
        await loadSuggestions(data.organization.id)
        setComplianceScore(data.organization.compliance_score || 0)
      } else {
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('Failed to load org:', error)
    }
  }

  const loadChatHistory = async (orgId: string) => {
    try {
      const response = await fetch(`/api/chat?orgId=${orgId}`)
      const data = await response.json()
      
      if (data.messages?.length > 0) {
        setMessages(data.messages)
      } else {
        // Welcome messages
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `היי! 👋 אני כאן לעזור לך עם הפרטיות והאבטחה בארגון.\n\nאפשר לשאול אותי שאלות, לבקש מסמכים, או לדווח על אירועים.`,
            created_at: new Date().toISOString()
          }
        ])
      }
      
      if (data.context) {
        setComplianceScore(data.context.complianceScore || 0)
        setPendingTasks(data.context.pendingTasks || 0)
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
    }
  }

  const loadSuggestions = async (orgId: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_suggestions', orgId })
      })
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || !organization || isLoading) return

    setInput('')
    setIsLoading(true)
    setIsTyping(true)
    setActiveQuickAction(null)
    inputRef.current?.focus()

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          orgId: organization.id,
          message: messageText
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Replace temp message with real ones
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        data.userMessage,
        data.assistantMessage
      ])

      // Handle quick actions
      if (data.quickActions) {
        setActiveQuickAction(data.quickActions)
      }

      // Handle generated document
      if (data.generatedDocument) {
        setCurrentDocument(data.generatedDocument)
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'מצטער, משהו השתבש. בבקשה נסה שוב או רענן את הדף.',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleQuickActionClick = async (buttonId: string) => {
    if (!organization) return

    setActiveQuickAction(null)

    if (buttonId === 'start_incident') {
      // Get last few messages for context
      const context = messages.slice(-3).map(m => m.content).join('\n')
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_incident',
            orgId: organization.id,
            chatContext: context
          })
        })
        
        const data = await response.json()
        if (data.success) {
          // Refresh chat to show system message
          await loadChatHistory(organization.id)
        }
      } catch (error) {
        console.error('Failed to create incident:', error)
      }
    }

    if (buttonId === 'escalate_now') {
      const context = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'escalate',
            orgId: organization.id,
            context
          })
        })
        
        const data = await response.json()
        if (data.success) {
          await loadChatHistory(organization.id)
        }
      } catch (error) {
        console.error('Failed to escalate:', error)
      }
    }

    if (buttonId === 'save_doc' && currentDocument) {
      await saveDocument()
    }

    if (buttonId === 'edit_doc' && currentDocument) {
      setShowDocModal(true)
    }

    if (buttonId === 'review_request' && currentDocument) {
      await requestReview()
    }

    if (buttonId === 'just_question' || buttonId === 'continue_chat') {
      // Just dismiss the quick action
    }
  }

  const saveDocument = async () => {
    if (!currentDocument || !organization) return
    
    setIsGeneratingDoc(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_document',
          orgId: organization.id,
          title: null, // Will use default based on type
          content: currentDocument.content,
          documentType: currentDocument.type
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, {
          id: `doc-saved-${Date.now()}`,
          role: 'assistant',
          content: `✅ המסמך נשמר בהצלחה!\n\nאפשר למצוא אותו בלשונית "מסמכים" בלוח הבקרה.`,
          created_at: new Date().toISOString()
        }])
        setCurrentDocument(null)
      }
    } catch (error) {
      console.error('Failed to save document:', error)
    } finally {
      setIsGeneratingDoc(false)
    }
  }

  const requestReview = async () => {
    if (!currentDocument || !organization) return
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_review',
          orgId: organization.id,
          documentType: currentDocument.type
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, {
          id: `review-${Date.now()}`,
          role: 'assistant',
          content: `📝 בקשת הסקירה נשלחה!\n\nהממונה יעבור על המסמך ויחזור אליך עם הערות (בדרך כלל תוך 1-2 ימי עסקים).`,
          created_at: new Date().toISOString()
        }])
        setShowUpsellBanner(false)
      }
    } catch (error) {
      console.error('Failed to request review:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!organization || !supabase) return

    setUploadProgress(0)

    try {
      // Upload to Supabase Storage
      const fileName = `${organization.id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          }
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Add upload message
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        content: `📎 העלאת קובץ: ${file.name}`,
        created_at: new Date().toISOString(),
        attachments: [{ name: file.name, size: file.size, type: file.type, url: urlData.publicUrl }]
      }])

      // Send context message
      await sendMessage(`העליתי קובץ בשם "${file.name}". מה עושים עם זה?`)

    } catch (error) {
      console.error('Upload failed:', error)
      setMessages(prev => [...prev, {
        id: `upload-error-${Date.now()}`,
        role: 'assistant',
        content: '❌ ההעלאה נכשלה. בבקשה נסה שוב.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setUploadProgress(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileUpload(files[0])
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-500/5'
    if (score >= 60) return 'from-amber-500/20 to-amber-500/5'
    return 'from-red-500/20 to-red-500/5'
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-indigo-600 to-indigo-700 text-white flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link 
            href="/dashboard"
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>
          
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center border-2 border-white/30">
              <Shield className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-indigo-600"></div>
          </div>
          
          <div className="flex-1">
            <h1 className="font-bold text-lg">Kept</h1>
            <p className="text-sm text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              {organization?.name || 'טוען...'}
            </p>
          </div>
          
          <div className={`bg-gradient-to-b ${getScoreBg(complianceScore)} backdrop-blur rounded-xl px-3 py-2 text-center border border-white/10`}>
            <p className={`text-2xl font-bold ${getScoreColor(complianceScore)}`}>{complianceScore}%</p>
            <p className="text-xs text-indigo-200">ציות</p>
          </div>
        </div>
        
        {/* Alert Bar */}
        {pendingTasks > 0 && (
          <Link 
            href="/dashboard"
            className="bg-amber-400 px-4 py-2 flex items-center justify-between hover:bg-amber-300 transition"
          >
            <div className="flex items-center gap-2 text-amber-900">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{pendingTasks} משימות ממתינות</span>
            </div>
            <span className="text-sm font-bold text-amber-900">צפה ←</span>
          </Link>
        )}
      </header>

      {/* Chat Area */}
      <div 
        className={`flex-1 overflow-y-auto transition-all ${dragOver ? 'bg-indigo-100 scale-[0.99]' : ''}`}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {dragOver && (
          <div className="fixed inset-0 bg-indigo-600/20 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-10 h-10 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-2">שחרר להעלאה</p>
              <p className="text-slate-500">מסמכים, תמונות, או כל קובץ</p>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3 max-w-3xl mx-auto">
          {/* Date */}
          <div className="flex justify-center py-2">
            <span className="bg-white/90 backdrop-blur text-slate-500 text-xs px-4 py-1.5 rounded-full shadow-sm">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] group ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md' 
                  : msg.role === 'system'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl'
                  : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
              }`}>
                {/* Message Content */}
                <div className="px-4 py-3">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {/* Attachments */}
                {msg.attachments?.map((att, i) => (
                  <div key={i} className="mx-3 mb-3 bg-black/5 rounded-xl p-3 flex items-center gap-3">
                    <File className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{att.name}</span>
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-black/10 rounded">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}

                {/* Generated Document */}
                {msg.metadata?.generated_document && (
                  <div className="mx-3 mb-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">מסמך נוצר</p>
                        <p className="text-xs text-slate-500">לחץ לצפייה ושמירה</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setCurrentDocument(msg.metadata?.generated_document)
                          setShowDocModal(true)
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        צפה ושמור
                      </button>
                      <button 
                        onClick={() => copyToClipboard(msg.metadata?.generated_document?.content || '')}
                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Message Footer */}
                <div className={`px-4 pb-2 flex items-center justify-between ${
                  msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}>
                  <span className="text-xs">{formatTime(msg.created_at)}</span>
                  <div className="flex items-center gap-1">
                    {msg.role === 'user' && <CheckCheck className="w-4 h-4" />}
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => copyToClipboard(msg.content)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Action Buttons */}
          {activeQuickAction && (
            <div className="flex justify-end">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 max-w-[85%]">
                <div className="flex flex-wrap gap-2">
                  {activeQuickAction.buttons.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleQuickActionClick(btn.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        btn.style === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' :
                        btn.style === 'primary' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
                        btn.style === 'outline' ? 'border border-slate-200 hover:bg-slate-50 text-slate-700' :
                        'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-end">
              <div className="bg-white rounded-2xl rounded-bl-md shadow-sm px-5 py-3 border border-slate-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="flex justify-start">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <div>
                    <p className="text-sm">מעלה קובץ...</p>
                    <div className="w-32 h-1.5 bg-indigo-400 rounded-full mt-1">
                      <div 
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Upsell Banner */}
      {showUpsellBanner && (
        <div className="mx-4 mb-2 bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-2xl p-4 shadow-lg relative">
          <button 
            onClick={() => setShowUpsellBanner(false)}
            className="absolute top-2 left-2 p-1 hover:bg-white/20 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-medium mb-1">💡 רוצה סקירה מקצועית?</p>
          <p className="text-sm text-indigo-200 mb-3">הממונה שלנו יעבור על המסמכים ויוודא שהכל תקין</p>
          <button 
            onClick={() => requestReview()}
            className="w-full bg-white text-indigo-600 py-2 rounded-xl font-medium text-sm hover:bg-indigo-50 transition"
          >
            בקש סקירה
          </button>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-white/80 backdrop-blur border-t border-slate-200 flex-shrink-0">
        <div className="flex gap-2 p-3 overflow-x-auto max-w-3xl mx-auto">
          {suggestions.map((s, i) => (
            <button 
              key={i}
              onClick={() => sendMessage(s.text)}
              disabled={isLoading}
              className="flex-shrink-0 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 px-4 py-2.5 rounded-full text-sm text-slate-700 transition flex items-center gap-2 shadow-sm"
            >
              <span>{s.icon}</span>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Quick Actions Menu */}
          {showQuickActions && (
            <div className="mb-3 p-2 bg-slate-50 rounded-2xl grid grid-cols-4 gap-2">
              {[
                { icon: '📄', label: 'מסמך', action: 'document' },
                { icon: '📸', label: 'תמונה', action: 'image' },
                { icon: '📎', label: 'קובץ', action: 'file' },
                { icon: '🎤', label: 'הקלטה', action: 'voice' }
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    if (['file', 'image', 'document'].includes(item.action)) {
                      fileInputRef.current?.click()
                    }
                    setShowQuickActions(false)
                  }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-white rounded-xl transition"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs text-slate-600">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button 
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={`p-3 rounded-full transition flex-shrink-0 ${
                showQuickActions ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              {showQuickActions ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
            
            <div className="flex-1 bg-slate-100 rounded-full flex items-center px-4 border-2 border-transparent focus-within:border-indigo-300 focus-within:bg-white transition">
              <input
                ref={inputRef}
                type="text"
                placeholder="הקלד הודעה..."
                className="flex-1 bg-transparent border-0 focus:outline-none py-3 text-slate-800"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={isLoading}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1 hover:bg-slate-200 rounded-full transition"
              >
                <Paperclip className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <button 
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-full transition shadow-lg shadow-indigo-600/30 disabled:shadow-none flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Send className="w-6 h-6 text-white" />
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* Document Modal */}
      {showDocModal && currentDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-lg">מסמך שנוצר</h3>
              <button 
                onClick={() => setShowDocModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                {currentDocument.content}
              </pre>
            </div>
            
            <div className="p-4 border-t flex gap-3 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(currentDocument.content)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                <Copy className="w-5 h-5" />
                העתק
              </button>
              <button
                onClick={() => {
                  saveDocument()
                  setShowDocModal(false)
                }}
                disabled={isGeneratingDoc}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {isGeneratingDoc ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                שמור למסמכים
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

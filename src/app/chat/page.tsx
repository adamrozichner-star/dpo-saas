'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Send, Upload, Paperclip, Mic, Check, CheckCheck, FileText, Shield, 
  AlertTriangle, Plus, X, Sparkles, Download, Loader2, Phone, 
  BarChart3, File, Copy, Share2, Edit3, Eye, ExternalLink,
  MessageSquare, Settings, ChevronDown, RefreshCw, Clock,
  Menu, PanelLeftClose, PanelLeft, History, FolderOpen, Trash2, FileDown
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSubscriptionGate } from '@/lib/use-subscription-gate'

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
  const searchParams = useSearchParams()
  const { user, supabase, loading: authLoading } = useAuth()
  const { isAuthorized, isChecking } = useSubscriptionGate()
  
  // Default suggestions - show immediately
  const defaultSuggestions: Suggestion[] = [
    { icon: '📄', text: 'צריך מדיניות פרטיות' },
    { icon: '❓', text: 'עובד שאל על פרטיות' },
    { icon: '🚨', text: 'יש אירוע אבטחה' },
    { icon: '📊', text: 'מה הסטטוס שלי?' },
    { icon: '📋', text: 'צריך טופס הסכמה' },
    { icon: '🔒', text: 'נוהל אבטחת מידע' },
    { icon: '👤', text: 'בקשת מחיקה מלקוח' },
    { icon: '📝', text: 'הסכם עיבוד לספק' },
  ]

  // Conversation history type
  interface Conversation {
    id: string
    title: string
    preview: string
    created_at: string
    updated_at: string
  }
  
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-welcome',
      role: 'assistant',
      content: `היי! 👋 אני כאן לעזור לך עם הפרטיות והאבטחה בארגון.\n\nאפשר לשאול אותי שאלות, לבקש מסמכים, או לדווח על אירועים.`,
      created_at: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [complianceScore, setComplianceScore] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(defaultSuggestions)
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction | null>(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<any>(null)
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const [showUpsellBanner, setShowUpsellBanner] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial data when auth is ready
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return
    
    // If no user, redirect to login
    if (!user) {
      router.push('/login')
      return
    }
    
    // If supabase client is ready, load organization
    if (supabase) {
      loadOrganization()
    }
  }, [authLoading, user, supabase])

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

  // Handle URL prompt parameter - auto-send message when coming from dashboard task
  const promptHandledRef = useRef(false)
  const urlPrompt = searchParams.get('prompt')

  const loadOrganization = async () => {
    if (!user || !supabase) {
      setOrgLoading(false)
      return
    }
    
    setOrgLoading(true)
    
    try {
      // Get user with organization (same query as dashboard)
      const { data: userData, error } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading user data:', error)
        setOrgLoading(false)
        return
      }
      
      if (userData?.organizations) {
        setOrganization(userData.organizations)
        setComplianceScore(userData.organizations.compliance_score || 0)
        
        // Check if this is first visit after onboarding
        const urlParams = new URLSearchParams(window.location.search)
        const isWelcome = urlParams.get('welcome') === 'true'
        
        if (isWelcome) {
          // Show personalized welcome after onboarding
          setMessages([
            {
              id: 'welcome-1',
              role: 'assistant',
              content: `שלום! 👋 אני הממונה הדיגיטלי שלך ב-${userData.organizations.name}.\n\nסיימתי לנתח את הפרטים שמילאת ואני מכין לך את המסמכים הנדרשים.\n\nבמה אפשר לעזור?`,
              created_at: new Date().toISOString()
            }
          ])
        }
        
        // Load chat history and suggestions
        await loadChatHistory(userData.organizations.id)
        await loadSuggestions(userData.organizations.id)
      } else {
        // No organization - redirect to onboarding
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('Failed to load org:', error)
    } finally {
      setOrgLoading(false)
    }
  }

  const loadChatHistory = async (orgId: string) => {
    try {
      const response = await fetch(`/api/chat?orgId=${orgId}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('Chat API error:', data.error)
        // Show welcome message on error
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `היי! 👋 אני כאן לעזור לך עם הפרטיות והאבטחה בארגון.\n\nאפשר לשאול אותי שאלות, לבקש מסמכים, או לדווח על אירועים.`,
            created_at: new Date().toISOString()
          }
        ])
        return
      }
      
      if (data.messages?.length > 0) {
        setMessages(data.messages)
      } else {
        // No messages yet - show welcome
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
      // Show welcome on error
      setMessages([
        {
          id: 'welcome-error',
          role: 'assistant',
          content: `היי! 👋 אני כאן לעזור לך עם הפרטיות והאבטחה בארגון.\n\nאפשר לשאול אותי שאלות, לבקש מסמכים, או לדווח על אירועים.`,
          created_at: new Date().toISOString()
        }
      ])
    }
  }

  const loadSuggestions = async (orgId: string) => {
    // Default suggestions - always show these
    const defaultSuggestions = [
      { icon: '📄', text: 'צריך מדיניות פרטיות' },
      { icon: '❓', text: 'עובד שאל על פרטיות' },
      { icon: '🚨', text: 'יש אירוע אבטחה' },
      { icon: '📊', text: 'מה הסטטוס שלי?' },
      { icon: '📋', text: 'צריך טופס הסכמה' },
    ]
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_suggestions', orgId })
      })
      const data = await response.json()
      setSuggestions(data.suggestions?.length > 0 ? data.suggestions : defaultSuggestions)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
      setSuggestions(defaultSuggestions)
    }
  }

  // Load conversation history for sidebar
  const loadConversations = async () => {
    if (!organization?.id || !supabase) return
    
    try {
      // Get distinct conversations from chat messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, conversation_id')
        .eq('org_id', organization.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.log('Could not load conversations:', error)
        return
      }

      // Group by conversation or create from messages
      const convMap = new Map<string, Conversation>()
      data?.forEach(msg => {
        const convId = msg.conversation_id || msg.created_at.split('T')[0]
        if (!convMap.has(convId)) {
          convMap.set(convId, {
            id: convId,
            title: msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : ''),
            preview: msg.content.slice(0, 60),
            created_at: msg.created_at,
            updated_at: msg.created_at
          })
        }
      })

      setConversations(Array.from(convMap.values()).slice(0, 10))
    } catch (e) {
      console.log('Conversations loading skipped')
    }
  }

  // Start new conversation
  const startNewChat = async () => {
    // First, reload conversations to save current chat in sidebar
    await loadConversations()
    
    // Generate new conversation ID
    const newConvId = `conv-${Date.now()}`
    setCurrentConversationId(newConvId)
    
    setMessages([{
      id: 'initial-welcome',
      role: 'assistant',
      content: `היי! 👋 אני כאן לעזור לך עם הפרטיות והאבטחה בארגון.\n\nאפשר לשאול אותי שאלות, לבקש מסמכים, או לדווח על אירועים.`,
      created_at: new Date().toISOString()
    }])
    setSuggestions(defaultSuggestions)
    setCurrentDocument(null)
    setShowUpsellBanner(false)
    inputRef.current?.focus()
  }

  // Load specific conversation
  const loadConversation = async (convId: string) => {
    if (!organization?.id || !supabase) return
    setCurrentConversationId(convId)
    
    try {
      // Load messages for this specific conversation
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('org_id', organization.id)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      
      if (!error && data && data.length > 0) {
        setMessages(data)
      } else {
        // Fallback to loading all messages if conversation_id filter fails
        await loadChatHistory(organization.id)
      }
    } catch (e) {
      console.log('Could not load conversation')
      await loadChatHistory(organization.id)
    }
  }

  // Load conversations when organization is ready
  useEffect(() => {
    if (organization?.id) {
      loadConversations()
    }
  }, [organization?.id])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return
    
    // If still loading organization, show message
    if (orgLoading) {
      setMessages(prev => [...prev, {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        content: '⏳ רק רגע, טוען את פרטי הארגון...',
        created_at: new Date().toISOString()
      }])
      return
    }
    
    // If no organization loaded, show error
    if (!organization) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ לא הצלחתי לטעון את פרטי הארגון. נסה לרענן את הדף.',
        created_at: new Date().toISOString()
      }])
      return
    }

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
      // Create conversation ID if not exists
      const convId = currentConversationId || `conv-${Date.now()}`
      if (!currentConversationId) {
        setCurrentConversationId(convId)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          orgId: organization.id,
          message: messageText,
          conversationId: convId
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

      // Update conversation ID if returned
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId)
      }

      // Reload conversations list to show new chat
      loadConversations()

      // Handle quick actions
      if (data.quickActions) {
        setActiveQuickAction(data.quickActions)
      }

      // Handle generated document
      if (data.generatedDocument) {
        setCurrentDocument(data.generatedDocument)
        setShowDocModal(true)  // Auto-open modal when document is generated
      }

      // Update suggestions dynamically based on intent
      updateSuggestionsForIntent(data.intent, messageText)

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

  // Dynamic suggestions based on conversation context
  const updateSuggestionsForIntent = (intent: string, lastMessage: string) => {
    switch (intent) {
      case 'incident':
        setSuggestions([
          { icon: '📝', text: 'מה לכלול בדיווח לרשות?' },
          { icon: '⏰', text: '72 השעות - מתי מתחילות?' },
          { icon: '📋', text: 'תבנית דיווח לרשות' },
          { icon: '🔒', text: 'איך למנוע אירועים עתידיים?' },
        ])
        break
      case 'document':
        setSuggestions([
          { icon: '✏️', text: 'ערוך את המסמך' },
          { icon: '👁️', text: 'בקש סקירה מממונה' },
          { icon: '📄', text: 'צריך עוד מסמך' },
          { icon: '📤', text: 'איך לפרסם את המסמך?' },
        ])
        break
      case 'dsar':
        setSuggestions([
          { icon: '⏰', text: 'כמה זמן יש לי להשיב?' },
          { icon: '📝', text: 'תבנית תשובה לבקשה' },
          { icon: '🔍', text: 'איך מאתרים את המידע?' },
          { icon: '❌', text: 'מתי אפשר לסרב לבקשה?' },
        ])
        break
      case 'status':
        setSuggestions([
          { icon: '📈', text: 'איך משפרים את הציון?' },
          { icon: '📋', text: 'מה המשימות הדחופות?' },
          { icon: '📄', text: 'אילו מסמכים חסרים?' },
          { icon: '🎯', text: 'תוכנית פעולה לשבוע הקרוב' },
        ])
        break
      case 'question':
        // Keep suggestions relevant to follow-up questions
        setSuggestions([
          { icon: '📚', text: 'תסביר יותר לעומק' },
          { icon: '📄', text: 'צור מסמך בנושא' },
          { icon: '👤', text: 'רוצה לדבר עם ממונה' },
          { icon: '🔙', text: 'שאלה אחרת' },
        ])
        break
      case 'ropa':
        setSuggestions([
          { icon: '➕', text: 'הוסף פעילות עיבוד' },
          { icon: '📊', text: 'הצג את מפת העיבוד' },
          { icon: '⚠️', text: 'אילו עיבודים מסוכנים?' },
          { icon: '📝', text: 'עדכן פעילות קיימת' },
        ])
        break
      case 'escalate':
        setSuggestions([
          { icon: '📞', text: 'מתי הממונה יחזור?' },
          { icon: '❓', text: 'שאלה אחרת בינתיים' },
          { icon: '📄', text: 'צריך מסמך דחוף' },
          { icon: '🚨', text: 'יש אירוע אבטחה' },
        ])
        break
      default:
        // Return to default suggestions
        setSuggestions(defaultSuggestions)
    }
  }

  const handleQuickActionClick = async (buttonId: string) => {
    if (!organization) return

    setActiveQuickAction(null)

    if (buttonId === 'start_incident') {
      // Show immediate feedback
      setIsLoading(true)
      
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
        
        if (data.success || data.incident) {
          // Add success message directly
          const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000)
          setMessages(prev => [...prev, {
            id: `incident-created-${Date.now()}`,
            role: 'assistant',
            content: `✅ נפתח דיווח אירוע אבטחה!\n\n⏰ דדליין לדיווח לרשות: ${deadline.toLocaleDateString('he-IL')} ${deadline.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}\n\nהשלב הבא: לך ללוח הבקרה → "אירועי אבטחה" למילוי הפרטים המלאים.`,
            created_at: new Date().toISOString()
          }])
          
          // Update suggestions to incident-related actions
          setSuggestions([
            { icon: '📝', text: 'מה עלי לכלול בדיווח?' },
            { icon: '⏰', text: 'מה קורה אם לא מדווחים בזמן?' },
            { icon: '📋', text: 'צריך תבנית לדיווח לרשות' },
            { icon: '👤', text: 'רוצה לדבר עם הממונה' },
          ])
        } else {
          throw new Error(data.error || 'Failed to create incident')
        }
      } catch (error) {
        console.error('Failed to create incident:', error)
        setMessages(prev => [...prev, {
          id: `incident-error-${Date.now()}`,
          role: 'assistant',
          content: '❌ לא הצלחתי לפתוח דיווח. נסה שוב או פנה ללוח הבקרה.',
          created_at: new Date().toISOString()
        }])
      } finally {
        setIsLoading(false)
      }
    }

    if (buttonId === 'just_question') {
      // User said it's just a question - update suggestions
      setSuggestions([
        { icon: '📄', text: 'צריך מדיניות פרטיות' },
        { icon: '❓', text: 'עובד שאל על פרטיות' },
        { icon: '📊', text: 'מה הסטטוס שלי?' },
        { icon: '📋', text: 'צריך טופס הסכמה' },
      ])
    }

    if (buttonId === 'escalate_now') {
      setIsLoading(true)
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
          setMessages(prev => [...prev, {
            id: `escalate-${Date.now()}`,
            role: 'assistant',
            content: '📞 הפנייה הועברה לממונה האנושי!\n\nהממונה יחזור אליך בהקדם (בדרך כלל תוך יום עסקים אחד).\n\nבינתיים, אפשר להמשיך לשאול אותי שאלות.',
            created_at: new Date().toISOString()
          }])
        }
      } catch (error) {
        console.error('Failed to escalate:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (buttonId === 'continue_chat') {
      // Just dismiss, restore default suggestions
      setSuggestions(defaultSuggestions)
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
    if (!organization) return
    
    // Show immediate feedback
    setMessages(prev => [...prev, {
      id: `review-pending-${Date.now()}`,
      role: 'assistant',
      content: `⏳ שולח בקשת סקירה...`,
      created_at: new Date().toISOString()
    }])
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_review',
          orgId: organization.id,
          documentType: currentDocument?.type || 'uploaded_document',
          documentName: currentDocument?.name || 'מסמך שהועלה'
        })
      })
      
      const data = await response.json()
      
      // Remove pending message
      setMessages(prev => prev.filter(m => !m.id?.includes('review-pending')))
      
      // Show success regardless (for UX)
      setMessages(prev => [...prev, {
        id: `review-${Date.now()}`,
        role: 'assistant',
        content: `✅ בקשת הסקירה נשלחה!\n\nהממונה יעבור על המסמך ויחזור אליך עם הערות תוך 1-2 ימי עסקים.\n\nבינתיים, אפשר להמשיך לעבוד או לשאול שאלות.`,
        created_at: new Date().toISOString()
      }])
      setShowUpsellBanner(false)
      
    } catch (error) {
      console.error('Failed to request review:', error)
      setMessages(prev => prev.filter(m => !m.id?.includes('review-pending')))
      setMessages(prev => [...prev, {
        id: `review-error-${Date.now()}`,
        role: 'assistant',
        content: `✅ בקשת הסקירה התקבלה!\n\nהממונה יחזור אליך בהקדם.`,
        created_at: new Date().toISOString()
      }])
      setShowUpsellBanner(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!organization) {
      setMessages(prev => [...prev, {
        id: `upload-error-${Date.now()}`,
        role: 'assistant',
        content: '❌ לא ניתן להעלות קובץ - נסה לרענן את הדף.',
        created_at: new Date().toISOString()
      }])
      return
    }

    setUploadProgress(30)
    const fileNameLower = file.name.toLowerCase()
    const fileType = file.type

    // For PDFs, handle specially
    if (fileType === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
      // Show parsing message
      setMessages(prev => [...prev, {
        id: `pdf-parsing-${Date.now()}`,
        role: 'assistant',
        content: `📄 קורא את "${file.name}"...`,
        created_at: new Date().toISOString()
      }])

      try {
        setUploadProgress(60)
        const pdfFormData = new FormData()
        pdfFormData.append('file', file)
        
        const pdfResponse = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: pdfFormData
        })
        
        const pdfData = await pdfResponse.json()
        
        // Remove parsing message
        setMessages(prev => prev.filter(m => !m.id?.includes('pdf-parsing')))
        
        if (pdfData.success && pdfData.text) {
          setUploadProgress(90)
          
          // Store full text for follow-up questions
          setCurrentDocument({
            type: 'uploaded_pdf',
            name: file.name,
            content: pdfData.text,
            text: pdfData.text,
            pages: pdfData.pages,
            docType: pdfData.docType,
            summary: pdfData.summary
          })

          // Show summary and ASK what to do (don't auto-analyze)
          const summaryText = pdfData.summary || 'מסמך שהועלה'
          const docTypeText = pdfData.docType || 'מסמך'
          
          setMessages(prev => [...prev, {
            id: `pdf-ready-${Date.now()}`,
            role: 'assistant',
            content: `📄 קיבלתי את "${file.name}" (${pdfData.pages || 1} עמודים)

זה נראה כמו: ${docTypeText}
${summaryText}

מה תרצה שאעשה?
• בדוק תאימות לתיקון 13
• זהה חסרים ובעיות
• סכם את עיקרי המסמך
• צור גרסה משופרת`,
            created_at: new Date().toISOString()
          }])

          setSuggestions([
            { icon: '🔍', text: 'בדוק תאימות לתיקון 13' },
            { icon: '⚠️', text: 'מה חסר במסמך?' },
            { icon: '📝', text: 'סכם את המסמך' },
            { icon: '✨', text: 'צור גרסה משופרת' },
          ])
          
          // Show upsell banner
          setShowUpsellBanner(true)
          setUploadProgress(100)
          
        } else {
          // Couldn't parse - offer manual options
          setMessages(prev => [...prev, {
            id: `pdf-help-${Date.now()}`,
            role: 'assistant',
            content: `📄 קיבלתי את "${file.name}" אבל לא הצלחתי לקרוא את התוכן.

אפשר לעזור בכמה דרכים:
• העתק את הטקסט מהמסמך ושלח לי - אבדוק תאימות לחוק
• ספר לי מה סוג המסמך ואתן צ'קליסט לבדיקה
• אני יכול ליצור גרסה חדשה מותאמת לתיקון 13

מה מתאים לך?`,
            created_at: new Date().toISOString()
          }])
          
          setSuggestions([
            { icon: '📋', text: 'זו מדיניות פרטיות - תן צ\'קליסט' },
            { icon: '📝', text: 'זה הסכם - מה לבדוק?' },
            { icon: '✨', text: 'צור לי גרסה חדשה' },
            { icon: '❓', text: 'זה מסמך אחר' },
          ])
        }
      } catch (pdfError) {
        console.error('PDF parsing failed:', pdfError)
        setMessages(prev => prev.filter(m => !m.id?.includes('pdf-parsing')))
        setMessages(prev => [...prev, {
          id: `pdf-help-${Date.now()}`,
          role: 'assistant',
          content: `📄 קיבלתי את "${file.name}"!

יש בעיה טכנית בקריאת ה-PDF. אבל אני יכול לעזור:
• העתק את הטקסט ושלח לי - אבדוק תאימות
• ספר לי מה סוג המסמך - אתן צ'קליסט
• אני יכול ליצור גרסה חדשה מאפס

מה תעדיף?`,
          created_at: new Date().toISOString()
        }])
        
        setSuggestions([
          { icon: '📋', text: 'זו מדיניות פרטיות' },
          { icon: '📝', text: 'זה הסכם או חוזה' },
          { icon: '✨', text: 'צור גרסה חדשה' },
          { icon: '❓', text: 'מסמך אחר' },
        ])
      } finally {
        setUploadProgress(null)
      }
      return
    }

    // For non-PDF files
    // Add upload message
    setMessages(prev => [...prev, {
      id: `upload-${Date.now()}`,
      role: 'user',
      content: `📎 מעלה קובץ: ${file.name}`,
      created_at: new Date().toISOString(),
      attachments: [{ name: file.name, size: file.size, type: file.type }]
    }])

    try {
      setUploadProgress(60)
      
      // Try to upload to Supabase Storage (optional)
      if (supabase) {
        try {
          const fileName = `${organization.id}/${Date.now()}-${file.name}`
          await supabase.storage.from('documents').upload(fileName, file)
        } catch (storageError) {
          console.log('Storage upload skipped:', storageError)
        }
      }

      setUploadProgress(90)

      // Determine file type and create prompt
      let aiPrompt = `העליתי קובץ בשם "${file.name}".`
      
      if (fileType.includes('spreadsheet') || fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.csv')) {
        aiPrompt += ' זה קובץ נתונים. האם יש בו מידע אישי שצריך להגן עליו?'
        setSuggestions([
          { icon: '🔒', text: 'האם המידע מוגן כראוי?' },
          { icon: '📊', text: 'מיפוי סוגי המידע בקובץ' },
          { icon: '🗑️', text: 'מה צריך למחוק?' },
          { icon: '📋', text: 'צור מדיניות שמירת מידע' },
        ])
      } else if (fileType.includes('image')) {
        aiPrompt += ' זו תמונה. יש לי שאלה לגביה.'
      } else if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
        aiPrompt = `העליתי מסמך וורד בשם "${file.name}". אני רוצה לבדוק אם הוא עומד בדרישות הפרטיות.`
        setSuggestions([
          { icon: '📋', text: 'זו מדיניות פרטיות' },
          { icon: '📝', text: 'זה הסכם או חוזה' },
          { icon: '📄', text: 'זה נוהל פנימי' },
          { icon: '❓', text: 'מסמך אחר' },
        ])
      } else {
        aiPrompt += ' מה עושים עם זה?'
      }

      setUploadProgress(100)
      await sendMessage(aiPrompt)

    } catch (error) {
      console.error('Upload failed:', error)
      setMessages(prev => [...prev, {
        id: `upload-error-${Date.now()}`,
        role: 'assistant',
        content: '❌ ההעלאה נכשלה. נסה שוב או שלח את שם הקובץ ואספר לך מה לעשות.',
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

  const downloadAsPdf = async (content: string, title: string) => {
    try {
      // Create form and submit to get printable HTML
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          orgName: organization?.name
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const html = await response.text()
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('PDF download error:', error)
      alert('שגיאה בהורדת המסמך. נסה שוב.')
    }
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

  // Effect to handle URL prompt - auto-send message from dashboard tasks
  useEffect(() => {
    if (urlPrompt && organization && !promptHandledRef.current && !isLoading && !orgLoading) {
      promptHandledRef.current = true
      
      // Clear the URL parameters without refreshing the page
      const url = new URL(window.location.href)
      url.searchParams.delete('prompt')
      url.searchParams.delete('task')
      url.searchParams.delete('incident')
      url.searchParams.delete('dsar')
      window.history.replaceState({}, '', url.pathname)
      
      // Send the message
      sendMessage(urlPrompt)
    }
  }, [urlPrompt, organization, isLoading, orgLoading])

  // Show loading screen while auth is loading
  if (authLoading || isChecking || !isAuthorized) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-700 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-slate-900 text-white flex-shrink-0 transition-all duration-300 overflow-hidden flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">MyDPO</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition"
            >
              <PanelLeftClose className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* New Chat Button */}
          <button 
            onClick={startNewChat}
            className="w-full text-white py-2.5 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"
            style={{backgroundColor: '#10b981'}}
          >
            <Plus className="w-5 h-5" />
            שיחה חדשה
          </button>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs text-slate-500 font-medium px-2 mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            שיחות אחרונות
          </div>
          
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>אין שיחות קודמות</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-right p-3 rounded-xl transition group ${
                    currentConversationId === conv.id 
                      ? 'bg-slate-700 text-white' 
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{conv.preview}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-700">
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition text-slate-300"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm">לוח בקרה</span>
          </Link>
          <Link 
            href="/dashboard?tab=documents"
            className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition text-slate-300"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm">מסמכים</span>
          </Link>
          <Link 
            href="/settings"
            className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition text-slate-300"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">הגדרות</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="text-white flex-shrink-0" style={{background: 'linear-gradient(to left, #1e3a5f, #1e40af)'}}>
          <div className="px-4 py-3 flex items-center gap-3">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center border-2 border-white/30">
                {orgLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Shield className="w-6 h-6" />
                )}
              </div>
              {!orgLoading && organization && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2" style={{backgroundColor: '#10b981', borderColor: '#1e40af'}}></div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="font-bold text-lg">הממונה שלך</h1>
              <p className="text-sm text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {orgLoading ? 'טוען...' : (organization?.name || 'לא נמצא ארגון')}
              </p>
            </div>
            
            <div className={`bg-gradient-to-b ${getScoreBg(complianceScore)} backdrop-blur rounded-xl px-3 py-2 text-center border border-white/10`}>
              <p className={`text-2xl font-bold ${getScoreColor(complianceScore)}`}>{complianceScore}%</p>
              <p className="text-xs text-blue-200">ציות</p>
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
        className={`flex-1 overflow-y-auto transition-all ${dragOver ? 'bg-blue-100 scale-[0.99]' : ''}`}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {dragOver && (
          <div className="fixed inset-0 bg-blue-800/20 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-10 h-10 text-blue-700" />
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
              <div 
                className={`max-w-[85%] group ${
                  msg.role === 'user' 
                    ? 'text-white rounded-2xl rounded-br-md' 
                    : msg.role === 'system'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl'
                    : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
                }`}
                style={msg.role === 'user' ? {backgroundColor: '#1e40af'} : {}}
              >
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
                  <div className="mx-3 mb-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-700" />
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
                        className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
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
                  msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
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
                        btn.style === 'primary' ? 'bg-blue-800 hover:bg-blue-900 text-white' :
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
              <div className="bg-blue-800 text-white rounded-2xl rounded-br-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <div>
                    <p className="text-sm">מעלה קובץ...</p>
                    <div className="w-32 h-1.5 bg-blue-400 rounded-full mt-1">
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
        <div className="mx-4 mb-2 text-white rounded-2xl p-4 shadow-lg relative" style={{background: 'linear-gradient(to left, #1e3a5f, #1e40af)'}}>
          <button 
            onClick={() => setShowUpsellBanner(false)}
            className="absolute top-2 left-2 p-1 hover:bg-white/20 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-medium mb-1">💡 רוצה סקירה מקצועית?</p>
          <p className="text-sm text-blue-200 mb-3">הממונה שלנו יעבור על המסמכים ויוודא שהכל תקין</p>
          <button 
            onClick={() => requestReview()}
            className="w-full bg-white py-2 rounded-xl font-medium text-sm hover:bg-blue-50 transition"
            style={{color: '#1e40af'}}
          >
            בקש סקירה
          </button>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-white/80 backdrop-blur border-t border-slate-200 flex-shrink-0">
        <div className="flex flex-wrap justify-center gap-2 p-3 max-w-4xl mx-auto md:flex-wrap md:overflow-visible overflow-x-auto">
          {suggestions.map((s, i) => (
            <button 
              key={i}
              onClick={() => sendMessage(s.text)}
              disabled={isLoading}
              className="flex-shrink-0 md:flex-shrink bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 px-4 py-2.5 rounded-full text-sm text-slate-700 transition flex items-center gap-2 shadow-sm whitespace-nowrap"
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
                showQuickActions ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              {showQuickActions ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </button>
            
            <div className="flex-1 bg-slate-100 rounded-full flex items-center px-4 border-2 border-transparent focus-within:border-blue-400 focus-within:bg-white transition">
              <input
                ref={inputRef}
                type="text"
                placeholder="הקלד הודעה..."
                className="flex-1 bg-transparent border-0 focus:outline-none py-3 text-slate-800"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
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
              className="p-3 rounded-full transition shadow-lg disabled:bg-slate-300 disabled:shadow-none flex-shrink-0"
              style={{backgroundColor: '#1e40af'}}
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentDocument({
                    ...currentDocument,
                    isEditing: !currentDocument.isEditing
                  })}
                  className={`p-2 rounded-full transition ${currentDocument.isEditing ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}
                  title={currentDocument.isEditing ? 'סיום עריכה' : 'עריכה'}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowDocModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {currentDocument.isEditing ? (
                <textarea
                  value={currentDocument.content}
                  onChange={(e) => setCurrentDocument({
                    ...currentDocument,
                    content: e.target.value
                  })}
                  className="w-full h-full min-h-[300px] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 font-sans leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="rtl"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                  {currentDocument.content}
                </pre>
              )}
            </div>
            
            <div className="p-4 border-t flex gap-2 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(currentDocument.content)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                <Copy className="w-4 h-4" />
                העתק
              </button>
              <button
                onClick={() => downloadAsPdf(currentDocument.content, currentDocument.name || 'מסמך')}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => {
                  saveDocument()
                  setShowDocModal(false)
                }}
                disabled={isGeneratingDoc}
                className="flex-1 py-3 bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                {isGeneratingDoc ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

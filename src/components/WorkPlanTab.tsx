'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface WorkPlanTask {
  id: string
  title: string
  description: string
  category: string
  frequency: string
  quarter: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completedAt?: string
}

interface WorkPlanTabProps {
  orgId: string
  supabase: any
}

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'ממתין', icon: Clock },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'בביצוע', icon: Clock },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'הושלם', icon: CheckCircle2 },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'באיחור', icon: AlertTriangle },
}

export default function WorkPlanTab({ orgId, supabase }: WorkPlanTabProps) {
  const [tasks, setTasks] = useState<WorkPlanTask[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return fetch(url, { ...options, headers })
  }

  useEffect(() => { loadPlan() }, [])

  const loadPlan = async () => {
    try {
      const res = await authFetch(`/api/work-plan?year=${new Date().getFullYear()}`)
      const data = await res.json()
      if (data.tasks) { setTasks(data.tasks); setProgress(data.progress) }
    } catch (e) { console.error('Failed to load work plan:', e) }
    finally { setLoading(false) }
  }

  const markComplete = async (taskId: string) => {
    try {
      await authFetch('/api/work-plan', { method: 'PATCH', body: JSON.stringify({ taskId, status: 'completed' }) })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t))
      setProgress(prev => ({ ...prev, completed: prev.completed + 1, percentage: Math.round(((prev.completed + 1) / prev.total) * 100) }))
    } catch (e) { console.error('Failed to update task:', e) }
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter || t.quarter === filter)

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800">תוכנית עבודה שנתית {new Date().getFullYear()}</h2>
        <p className="text-sm text-stone-500 mt-1">מעקב אחר משימות ציות תקופתיות</p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-stone-700">התקדמות כללית</span>
          <span className="text-sm font-bold text-indigo-600">{progress.percentage}%</span>
        </div>
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
        </div>
        <p className="text-xs text-stone-400 mt-2">{progress.completed} מתוך {progress.total} משימות הושלמו</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ key: 'all', label: 'הכל' }, { key: 'pending', label: 'ממתינות' }, { key: 'overdue', label: 'באיחור' }, { key: 'completed', label: 'הושלמו' }, { key: 'Q1', label: 'Q1' }, { key: 'Q2', label: 'Q2' }, { key: 'Q3', label: 'Q3' }, { key: 'Q4', label: 'Q4' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTasks.map(task => {
          const config = statusConfig[task.status] || statusConfig.pending
          const Icon = config.icon
          const isExpanded = expandedTask === task.id
          return (
            <div key={task.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}><Icon className={`h-4 w-4 ${config.text}`} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800">{task.title}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>{config.label}</span>
                    <span className="text-xs text-stone-400 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString('he-IL')}</span>
                    <span className="text-xs text-stone-400">{task.quarter}</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-stone-100 pt-3">
                  <p className="text-sm text-stone-600 mb-3">{task.description}</p>
                  {task.status !== 'completed' && (
                    <button onClick={(e) => { e.stopPropagation(); markComplete(task.id) }} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">סמן כהושלם ✓</button>
                  )}
                  {task.completedAt && <p className="text-xs text-emerald-600 mt-2">הושלם ב-{new Date(task.completedAt).toLocaleDateString('he-IL')}</p>}
                </div>
              )}
            </div>
          )
        })}
        {filteredTasks.length === 0 && <div className="text-center py-8 text-stone-400"><p>אין משימות בסינון זה</p></div>}
      </div>
    </div>
  )
}

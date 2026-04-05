import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WorkPlanTask {
  id: string
  title: string
  description: string
  category: 'review' | 'training' | 'audit' | 'documentation' | 'technical'
  frequency: 'quarterly' | 'semi_annual' | 'annual'
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completedAt?: string
  notes?: string
}

function generateAnnualPlan(year: number): WorkPlanTask[] {
  const tasks: WorkPlanTask[] = [
    {
      id: `review-q1-${year}`,
      title: 'סקירה רבעונית Q1',
      description: 'סקירת מצב ציות, עדכון מסמכים, בדיקת אירועים פתוחים',
      category: 'review',
      frequency: 'quarterly',
      dueDate: `${year}-03-31`,
      status: 'pending',
    },
    {
      id: `review-q2-${year}`,
      title: 'סקירה רבעונית Q2',
      description: 'סקירת מצב ציות, עדכון מסמכים, בדיקת אירועים פתוחים',
      category: 'review',
      frequency: 'quarterly',
      dueDate: `${year}-06-30`,
      status: 'pending',
    },
    {
      id: `review-q3-${year}`,
      title: 'סקירה רבעונית Q3',
      description: 'סקירת מצב ציות, עדכון מסמכים, בדיקת אירועים פתוחים',
      category: 'review',
      frequency: 'quarterly',
      dueDate: `${year}-09-30`,
      status: 'pending',
    },
    {
      id: `review-q4-${year}`,
      title: 'סקירה רבעונית Q4',
      description: 'סקירת מצב ציות שנתית, הכנה לשנה הבאה',
      category: 'review',
      frequency: 'quarterly',
      dueDate: `${year}-12-31`,
      status: 'pending',
    },
    {
      id: `security-audit-h1-${year}`,
      title: 'ביקורת אבטחת מידע H1',
      description: 'ביקורת חצי-שנתית של אמצעי אבטחה, גישות, והרשאות',
      category: 'audit',
      frequency: 'semi_annual',
      dueDate: `${year}-06-15`,
      status: 'pending',
    },
    {
      id: `security-audit-h2-${year}`,
      title: 'ביקורת אבטחת מידע H2',
      description: 'ביקורת חצי-שנתית של אמצעי אבטחה, גישות, והרשאות',
      category: 'audit',
      frequency: 'semi_annual',
      dueDate: `${year}-12-15`,
      status: 'pending',
    },
    {
      id: `training-${year}`,
      title: 'הדרכת עובדים שנתית',
      description: 'הדרכה שנתית בנושא הגנת פרטיות ואבטחת מידע לכלל העובדים',
      category: 'training',
      frequency: 'annual',
      dueDate: `${year}-09-01`,
      status: 'pending',
    },
    {
      id: `doc-review-${year}`,
      title: 'עדכון מסמכים שנתי',
      description: 'סקירה ועדכון של כלל המסמכים: מדיניות פרטיות, נוהלי אבטחה, כתב מינוי, רישום מאגרים',
      category: 'documentation',
      frequency: 'annual',
      dueDate: `${year}-01-31`,
      status: 'pending',
    },
  ]

  // Mark overdue tasks
  const now = new Date()
  return tasks.map(task => ({
    ...task,
    status: new Date(task.dueDate) < now && task.status === 'pending' ? 'overdue' as const : task.status,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const plan = generateAnnualPlan(year)

    // Check for saved progress in org metadata
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('work_plan_progress')
      .eq('id', userData.org_id)
      .single()

    const savedProgress: Record<string, { status: string; completedAt?: string; notes?: string }> = org?.work_plan_progress || {}

    const mergedPlan = plan.map(task => ({
      ...task,
      ...(savedProgress[task.id] || {}),
    }))

    const completed = mergedPlan.filter(t => t.status === 'completed').length
    const total = mergedPlan.length

    return NextResponse.json({
      year,
      tasks: mergedPlan,
      progress: { completed, total, percentage: Math.round((completed / total) * 100) },
    })
  } catch (error) {
    console.error('Work plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { taskId, status, notes } = await request.json()
    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 })
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('work_plan_progress')
      .eq('id', userData.org_id)
      .single()

    const progress = org?.work_plan_progress || {}
    progress[taskId] = {
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      notes: notes || undefined,
    }

    await supabaseAdmin
      .from('organizations')
      .update({ work_plan_progress: progress })
      .eq('id', userData.org_id)

    return NextResponse.json({ success: true, taskId, status })
  } catch (error) {
    console.error('Work plan update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

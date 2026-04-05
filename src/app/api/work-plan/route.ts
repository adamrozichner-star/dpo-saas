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
  quarter: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completedAt?: string
  notes?: string
}

function generateAnnualPlan(year: number): WorkPlanTask[] {
  const tasks: WorkPlanTask[] = [
    {
      id: `q1-risk-review-${year}`,
      title: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05E1\u05D9\u05DB\u05D5\u05E0\u05D9\u05DD \u05E9\u05E0\u05EA\u05D9\u05EA',
      description: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05E1\u05D9\u05DB\u05D5\u05E0\u05D9 \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D5\u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2, \u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05E4\u05EA \u05E1\u05D9\u05DB\u05D5\u05E0\u05D9\u05DD \u05D5\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05D8\u05D9\u05E4\u05D5\u05DC',
      category: 'review',
      frequency: 'annual',
      quarter: 'Q1',
      dueDate: `${year}-03-31`,
      status: 'pending',
    },
    {
      id: `q1-ropa-update-${year}`,
      title: '\u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05E4\u05EA \u05E2\u05D9\u05D1\u05D5\u05D3 (ROPA)',
      description: '\u05E2\u05D3\u05DB\u05D5\u05DF \u05E8\u05E9\u05D9\u05DE\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05D9\u05D5\u05EA \u05E2\u05D9\u05D1\u05D5\u05D3, \u05D1\u05E1\u05D9\u05E1\u05D9 \u05D7\u05D5\u05E7\u05D9\u05D5\u05EA, \u05D5\u05EA\u05E7\u05D5\u05E4\u05D5\u05EA \u05E9\u05DE\u05D9\u05E8\u05D4',
      category: 'documentation',
      frequency: 'quarterly',
      quarter: 'Q1',
      dueDate: `${year}-03-31`,
      status: 'pending',
    },
    {
      id: `q2-training-${year}`,
      title: '\u05D4\u05D3\u05E8\u05DB\u05EA \u05E2\u05D5\u05D1\u05D3\u05D9\u05DD',
      description: '\u05D4\u05D3\u05E8\u05DB\u05D4 \u05E9\u05E0\u05EA\u05D9\u05EA \u05D1\u05E0\u05D5\u05E9\u05D0 \u05D4\u05D2\u05E0\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D5\u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2 \u05DC\u05DB\u05DC\u05DC \u05D4\u05E2\u05D5\u05D1\u05D3\u05D9\u05DD',
      category: 'training',
      frequency: 'annual',
      quarter: 'Q2',
      dueDate: `${year}-06-30`,
      status: 'pending',
    },
    {
      id: `q2-processor-audit-${year}`,
      title: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05DE\u05E2\u05D1\u05D3\u05D9 \u05DE\u05D9\u05D3\u05E2',
      description: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05D4\u05E1\u05DB\u05DE\u05D9 \u05E2\u05D9\u05D1\u05D5\u05D3 \u05DE\u05D9\u05D3\u05E2, \u05D1\u05D3\u05D9\u05E7\u05EA \u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05E1\u05E4\u05E7\u05D9\u05DD, \u05E2\u05D3\u05DB\u05D5\u05DF \u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05E2\u05D1\u05D3\u05D9\u05DD',
      category: 'audit',
      frequency: 'semi_annual',
      quarter: 'Q2',
      dueDate: `${year}-06-30`,
      status: 'pending',
    },
    {
      id: `q3-security-review-${year}`,
      title: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05E0\u05D5\u05D4\u05DC\u05D9 \u05D0\u05D1\u05D8\u05D7\u05D4',
      description: '\u05D1\u05D3\u05D9\u05E7\u05EA \u05E0\u05D5\u05D4\u05DC\u05D9 \u05D0\u05D1\u05D8\u05D7\u05EA \u05DE\u05D9\u05D3\u05E2, \u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA, \u05D5\u05D1\u05D3\u05D9\u05E7\u05EA \u05D1\u05E7\u05E8\u05D5\u05EA \u05D2\u05D9\u05E9\u05D4',
      category: 'audit',
      frequency: 'semi_annual',
      quarter: 'Q3',
      dueDate: `${year}-09-30`,
      status: 'pending',
    },
    {
      id: `q3-rights-audit-${year}`,
      title: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05D8\u05D9\u05E4\u05D5\u05DC \u05D1\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E0\u05D5\u05E9\u05D0\u05D9 \u05DE\u05D9\u05D3\u05E2',
      description: '\u05E1\u05E7\u05D9\u05E8\u05EA \u05EA\u05D4\u05DC\u05D9\u05DB\u05D9 \u05D8\u05D9\u05E4\u05D5\u05DC \u05D1\u05D1\u05E7\u05E9\u05D5\u05EA \u05E2\u05D9\u05D5\u05DF, \u05DE\u05D7\u05D9\u05E7\u05D4 \u05D5\u05EA\u05D9\u05E7\u05D5\u05DF \u05DE\u05D9\u05D3\u05E2',
      category: 'audit',
      frequency: 'annual',
      quarter: 'Q3',
      dueDate: `${year}-09-30`,
      status: 'pending',
    },
    {
      id: `q4-annual-report-${year}`,
      title: '\u05D3\u05D5\u05D7 \u05E9\u05E0\u05EA\u05D9 \u05DC\u05DE\u05DE\u05D5\u05E0\u05D4',
      description: '\u05D4\u05DB\u05E0\u05EA \u05D3\u05D5\u05D7 \u05E9\u05E0\u05EA\u05D9 \u05DE\u05E1\u05DB\u05DD: \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD, \u05E4\u05E2\u05D9\u05DC\u05D5\u05D9\u05D5\u05EA, \u05DE\u05DE\u05E6\u05D0\u05D9\u05DD \u05D5\u05D4\u05DE\u05DC\u05E6\u05D5\u05EA',
      category: 'documentation',
      frequency: 'annual',
      quarter: 'Q4',
      dueDate: `${year}-12-31`,
      status: 'pending',
    },
    {
      id: `q4-gap-analysis-${year}`,
      title: '\u05E0\u05D9\u05EA\u05D5\u05D7 \u05E4\u05E2\u05E8\u05D9 \u05E6\u05D9\u05D5\u05EA',
      description: '\u05E0\u05D9\u05EA\u05D5\u05D7 \u05DE\u05E7\u05D9\u05E3 \u05E9\u05DC \u05E4\u05E2\u05E8\u05D9\u05DD \u05DE\u05D5\u05DC \u05D3\u05E8\u05D9\u05E9\u05D5\u05EA \u05EA\u05D9\u05E7\u05D5\u05DF 13, \u05EA\u05DB\u05E0\u05D5\u05DF \u05DC\u05E9\u05E0\u05D4 \u05D4\u05D1\u05D0\u05D4',
      category: 'review',
      frequency: 'annual',
      quarter: 'Q4',
      dueDate: `${year}-12-31`,
      status: 'pending',
    },
  ]

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

    // Check for saved progress
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

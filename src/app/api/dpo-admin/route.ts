import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Simple password protection for DPO admin
const DPO_PASSWORD = process.env.NEXT_PUBLIC_DPO_PASSWORD || 'dpo-admin-2025'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { action, password } = body

    // Verify password
    if (password !== DPO_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // =========================================
    // Get Pending Reviews
    // =========================================
    if (action === 'get_pending_reviews') {
      const { data: reviews, error } = await supabase
        .from('document_reviews')
        .select(`
          *,
          organizations (name, business_id),
          users (email)
        `)
        .eq('dpo_review_requested', true)
        .in('dpo_review_status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
      }

      return NextResponse.json({ reviews })
    }

    // =========================================
    // Get All Reviews (with filters)
    // =========================================
    if (action === 'get_all_reviews') {
      const { status, limit = 50 } = body

      let query = supabase
        .from('document_reviews')
        .select(`
          *,
          organizations (name, business_id),
          users (email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: reviews, error } = await query

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
      }

      return NextResponse.json({ reviews })
    }

    // =========================================
    // Start Review (mark as in progress)
    // =========================================
    if (action === 'start_review') {
      const { reviewId, dpoId } = body

      await supabase
        .from('document_reviews')
        .update({
          dpo_review_status: 'in_progress',
          dpo_reviewer_id: dpoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Complete Review
    // =========================================
    if (action === 'complete_review') {
      const { reviewId, notes, reviewedContent } = body

      await supabase
        .from('document_reviews')
        .update({
          dpo_review_status: 'completed',
          dpo_notes: notes,
          reviewed_content: reviewedContent,
          dpo_reviewed_at: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      // Get review details for notification
      const { data: review } = await supabase
        .from('document_reviews')
        .select('*, organizations(*), users(*)')
        .eq('id', reviewId)
        .single()

      // Send notification email (if configured)
      if (review?.users?.email) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template: 'dpo_review_complete',
              to: review.users.email,
              data: {
                filename: review.original_filename,
                notes: notes?.substring(0, 200)
              }
            })
          })
        } catch (emailError) {
          console.log('Email notification skipped')
        }
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        org_id: review?.org_id,
        action: 'dpo_review_completed',
        entity_type: 'document_review',
        entity_id: reviewId,
        actor_type: 'dpo',
        details: {
          filename: review?.original_filename,
          review_type: review?.review_type
        }
      })

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Upload Reviewed Document
    // =========================================
    if (action === 'upload_reviewed_doc') {
      const { reviewId, content, filename } = body

      // In a real app, you'd upload to storage
      // For now, just store the content
      await supabase
        .from('document_reviews')
        .update({
          reviewed_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      return NextResponse.json({ success: true })
    }

    // =========================================
    // Get Dashboard Stats
    // =========================================
    if (action === 'get_stats') {
      const { data: pending } = await supabase
        .from('document_reviews')
        .select('id', { count: 'exact' })
        .eq('dpo_review_status', 'pending')

      const { data: inProgress } = await supabase
        .from('document_reviews')
        .select('id', { count: 'exact' })
        .eq('dpo_review_status', 'in_progress')

      const { data: completedThisMonth } = await supabase
        .from('document_reviews')
        .select('id', { count: 'exact' })
        .eq('dpo_review_status', 'completed')
        .gte('dpo_reviewed_at', new Date(new Date().setDate(1)).toISOString())

      const { data: totalRevenue } = await supabase
        .from('document_reviews')
        .select('dpo_review_price')
        .eq('dpo_review_status', 'completed')
        .gte('dpo_reviewed_at', new Date(new Date().setDate(1)).toISOString())

      const revenue = totalRevenue?.reduce((sum, r) => sum + (r.dpo_review_price || 0), 0) || 0

      return NextResponse.json({
        stats: {
          pending: pending?.length || 0,
          inProgress: inProgress?.length || 0,
          completedThisMonth: completedThisMonth?.length || 0,
          revenueThisMonth: revenue
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('DPO admin error:', error.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

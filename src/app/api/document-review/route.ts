import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Privacy compliance review prompt
const REVIEW_SYSTEM_PROMPT = `אתה מומחה משפטי ישראלי בתחום הגנת הפרטיות ותיקון 13 לחוק הגנת הפרטיות.

תפקידך לסקור מסמכים ולזהות בעיות פרטיות פוטנציאליות.

בבדיקת המסמך, התמקד ב:
1. עמידה בדרישות תיקון 13 לחוק הגנת הפרטיות
2. הסכמות מפורשות לאיסוף ועיבוד מידע
3. זכויות נושאי המידע (גישה, תיקון, מחיקה)
4. אבטחת מידע והעברה לצדדים שלישיים
5. תקופות שמירת מידע
6. מינוי ממונה הגנת פרטיות (אם רלוונטי)

החזר תשובה בפורמט JSON בלבד (ללא markdown):
{
  "summary": "סיכום קצר של המסמך ומטרתו",
  "risk_score": 0-100 (0=תקין, 100=בעייתי מאוד),
  "issues": [
    {
      "severity": "high/medium/low",
      "issue": "תיאור הבעיה",
      "location": "איפה במסמך (אם ידוע)",
      "suggestion": "הצעה לתיקון"
    }
  ],
  "positive_points": ["נקודות חיוביות במסמך"],
  "recommendation": "המלצה כללית - האם לאשר, לתקן, או לדחות",
  "requires_dpo_review": true/false,
  "dpo_review_reason": "סיבה להמלצה על בדיקת DPO אנושי (אם רלוונטי)"
}`

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const formData = await request.formData()
    
    const action = formData.get('action') as string
    const orgId = formData.get('orgId') as string
    const userId = formData.get('userId') as string

    // =========================================
    // Upload and AI Review
    // =========================================
    if (action === 'upload_and_review') {
      const file = formData.get('file') as File
      const reviewType = formData.get('reviewType') as string || 'other'
      const context = formData.get('context') as string || ''

      if (!file || !orgId) {
        return NextResponse.json({ error: 'Missing file or orgId' }, { status: 400 })
      }

      // Extract text from file
      let fileContent = ''
      const fileType = file.name.split('.').pop()?.toLowerCase()
      
      if (fileType === 'txt' || fileType === 'md') {
        fileContent = await file.text()
      } else if (fileType === 'pdf') {
        // For PDF, we'll store and note that content extraction is limited
        // In production, use pdf-parse or similar
        const buffer = await file.arrayBuffer()
        fileContent = '[PDF Document - תוכן מצורף כקובץ]'
        // TODO: Add PDF parsing with pdf-parse library
      } else if (fileType === 'docx') {
        // For DOCX, similar limitation
        fileContent = '[Word Document - תוכן מצורף כקובץ]'
        // TODO: Add DOCX parsing with mammoth library
      } else {
        // Try to read as text
        try {
          fileContent = await file.text()
        } catch {
          fileContent = '[לא ניתן לחלץ טקסט מהקובץ]'
        }
      }

      // Upload file to Supabase Storage
      const fileName = `${orgId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('document-reviews')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        })

      let fileUrl = ''
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('document-reviews')
          .getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
      }

      // Create review record
      const { data: reviewRecord, error: recordError } = await supabase
        .from('document_reviews')
        .insert({
          org_id: orgId,
          user_id: userId,
          original_filename: file.name,
          original_file_url: fileUrl,
          original_file_type: fileType,
          original_content: fileContent.substring(0, 50000), // Limit content size
          review_type: reviewType,
          ai_review_status: 'pending',
          status: 'uploaded'
        })
        .select()
        .single()

      if (recordError) {
        console.error('Error creating review record:', recordError)
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
      }

      // Perform AI review if we have content and API key
      let aiReview = null
      const apiKey = process.env.ANTHROPIC_API_KEY
      console.log('API Key exists:', !!apiKey)
      console.log('File content length:', fileContent?.length || 0)
      
      if (fileContent && fileContent.length > 10 && !fileContent.startsWith('[') && apiKey) {
        try {
          console.log('Starting AI review for:', file.name)
          const anthropic = new Anthropic({ apiKey })
          
          const reviewPrompt = `סקור את המסמך הבא וזהה בעיות פרטיות:

סוג המסמך: ${reviewType}
${context ? `הקשר נוסף: ${context}` : ''}

תוכן המסמך:
${fileContent.substring(0, 30000)}

${fileContent.length > 30000 ? '... [המסמך קוצר]' : ''}`

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [
              { role: 'user', content: reviewPrompt }
            ],
            system: REVIEW_SYSTEM_PROMPT
          })

          const responseText = response.content[0].type === 'text' 
            ? response.content[0].text 
            : ''
          
          // Parse JSON response
          try {
            // Clean the response - remove markdown code blocks if present
            const cleanedResponse = responseText
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()
            
            aiReview = JSON.parse(cleanedResponse)
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError)
            aiReview = {
              summary: responseText.substring(0, 500),
              risk_score: 50,
              issues: [],
              recommendation: 'לא ניתן לנתח את התגובה',
              requires_dpo_review: true
            }
          }

          // Update review record with AI results
          await supabase
            .from('document_reviews')
            .update({
              ai_review_status: 'completed',
              ai_review_summary: aiReview.summary,
              ai_issues_found: aiReview.issues || [],
              ai_risk_score: aiReview.risk_score || 50,
              ai_reviewed_at: new Date().toISOString(),
              status: 'ai_reviewed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reviewRecord.id)

        } catch (aiError: any) {
          console.error('AI review error:', aiError.message)
          await supabase
            .from('document_reviews')
            .update({
              ai_review_status: 'failed',
              status: 'ai_reviewed',
              updated_at: new Date().toISOString()
            })
            .eq('id', reviewRecord.id)
        }
      }

      return NextResponse.json({
        success: true,
        reviewId: reviewRecord.id,
        aiReview
      })
    }

    // =========================================
    // Request DPO Review (paid)
    // =========================================
    if (action === 'request_dpo_review') {
      const reviewId = formData.get('reviewId') as string
      const urgency = formData.get('urgency') as string || 'normal'

      // Get pricing
      const { data: review } = await supabase
        .from('document_reviews')
        .select('*, review_pricing!inner(*)')
        .eq('id', reviewId)
        .single()

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      // Get pricing for this review type
      const { data: pricing } = await supabase
        .from('review_pricing')
        .select('*')
        .eq('review_type', review.review_type)
        .single()

      const basePrice = pricing?.base_price || 300
      const finalPrice = urgency === 'urgent' 
        ? basePrice * (pricing?.urgent_multiplier || 1.5)
        : basePrice

      // Update review with DPO request
      await supabase
        .from('document_reviews')
        .update({
          dpo_review_requested: true,
          dpo_review_status: 'pending',
          dpo_review_price: finalPrice,
          urgency,
          status: 'dpo_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      return NextResponse.json({
        success: true,
        price: finalPrice,
        message: 'DPO review requested'
      })
    }

    // =========================================
    // Get Reviews List
    // =========================================
    if (action === 'list_reviews') {
      const { data: reviews, error } = await supabase
        .from('document_reviews')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
      }

      return NextResponse.json({ reviews })
    }

    // =========================================
    // Get Single Review
    // =========================================
    if (action === 'get_review') {
      const reviewId = formData.get('reviewId') as string

      const { data: review, error } = await supabase
        .from('document_reviews')
        .select('*')
        .eq('id', reviewId)
        .single()

      if (error || !review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      return NextResponse.json({ review })
    }

    // =========================================
    // Get Pricing
    // =========================================
    if (action === 'get_pricing') {
      const { data: pricing } = await supabase
        .from('review_pricing')
        .select('*')
        .eq('is_active', true)
        .order('base_price', { ascending: true })

      return NextResponse.json({ pricing: pricing || [] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Document review error:', error.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET handler for fetching reviews
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    const { data: reviews, error } = await supabase
      .from('document_reviews')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

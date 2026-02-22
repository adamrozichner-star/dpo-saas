import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth"
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  generateAllDocuments, 
  calculateComplianceScore,
  generateComplianceChecklist,
  answersToDocumentVariables
} from '@/lib/document-generator'
import { DocumentVariables } from '@/lib/document-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log('Generate documents API called')
  
  try {
    // --- AUTH CHECK ---
    const auth = await authenticateRequest(request)
    if (!auth) return unauthorizedResponse()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { orgId, orgName, businessId, answers } = await request.json()

    console.log('Generating docs for:', orgName, 'orgId:', orgId)
    console.log('Answers received:', answers?.length || 0)

    if (!orgId || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get DPO details from database (fallback to config if not found)
    let dpoName = 'עו"ד דנה כהן'
    let dpoLicense = 'DPO-2025-001'
    let dpoEmail = 'dpo@dpo-pro.co.il'
    let dpoPhone = '03-555-1234'
    
    const { data: dpoData } = await supabase
      .from('dpos')
      .select('*')
      .limit(1)
      .single()
    
    if (dpoData) {
      dpoName = dpoData.name || dpoName
      dpoLicense = dpoData.license_number || dpoLicense
      dpoEmail = dpoData.email || dpoEmail
      dpoPhone = dpoData.phone || dpoPhone
    }

    // Generate document variables with DPO info from database
    const baseVariables = answersToDocumentVariables(answers || [], orgName, businessId || '')
    const variables: DocumentVariables = {
      ...baseVariables,
      dpoName,
      dpoEmail,
      dpoPhone,
      dpoLicense
    }

    // Generate all documents using our template system with DPO logic
    console.log('Generating documents with DPO logic templates...')
    const documents = generateAllDocuments(
      answers || [],
      orgName,
      businessId || '',
      variables // Pass the enhanced variables
    )
    console.log('Generated', documents.length, 'documents')

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(answers || [])
    console.log('Compliance score:', complianceScore.score, 'Level:', complianceScore.level)

    // Generate checklist
    const checklist = generateComplianceChecklist(answers || [])
    console.log('Checklist items:', checklist.length)

    // Save documents to database
    console.log('Saving documents to database...')
    const documentRecords = documents.map(doc => ({
      org_id: orgId,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      version: 1,
      status: doc.type === 'dpo_appointment' ? 'pending_signature' : 'pending_review',
      generated_by: 'system'
    }))

    const { data: savedDocs, error: docsError } = await supabase
      .from('documents')
      .insert(documentRecords)
      .select()

    if (docsError) {
      console.error('Error saving documents:', docsError)
      return NextResponse.json({ error: 'Failed to save documents' }, { status: 500 })
    }

    console.log('Saved', savedDocs?.length, 'documents')

    // Create DPO queue item for document review
    try {
      const orgName = savedDocs?.[0]?.org_id ? orgId : 'ארגון חדש'
      await supabase.from('dpo_queue').insert({
        org_id: orgId,
        type: 'review',
        priority: 'medium',
        status: 'pending',
        title: `סקירת מסמכים — ארגון חדש (${savedDocs?.length || 0} מסמכים)`,
        description: `מסמכים שנוצרו אוטומטית דורשים אישור ממונה: ${documents.map(d => d.title).join(', ')}`,
        ai_summary: `נוצרו ${savedDocs?.length || 0} מסמכים אוטומטית עבור ארגון חדש. יש לסקור ולאשר.`,
        ai_draft_response: 'מסמכים נסקרו ואושרו.'
      })
    } catch (e) {
      console.log('Could not create DPO review queue item:', e)
    }

    // Update organization with compliance score and status
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ 
        status: 'active',
        compliance_score: complianceScore.score,
        risk_level: complianceScore.level === 'high' ? 'standard' : 
                   complianceScore.level === 'medium' ? 'elevated' : 'high'
      })
      .eq('id', orgId)

    if (orgError) {
      console.error('Error updating organization:', orgError)
      // Don't fail the whole request for this
    }

    // Save compliance checklist to organization profile
    const { error: profileError } = await supabase
      .from('organization_profiles')
      .update({
        compliance_checklist: checklist,
        compliance_score: complianceScore.score,
        compliance_gaps: complianceScore.gaps
      })
      .eq('org_id', orgId)

    if (profileError) {
      console.log('Note: Could not update profile with checklist:', profileError.message)
      // Don't fail for this either
    }

    // Log the document generation in audit trail
    try {
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        action: 'documents_generated',
        details: {
          document_count: documents.length,
          document_types: documents.map(d => d.type),
          compliance_score: complianceScore.score,
          dpo_name: dpoName
        }
      })
    } catch (auditError) {
      console.log('Note: Could not create audit log')
    }

    console.log('Document generation complete!')
    
    return NextResponse.json({ 
      success: true, 
      documents: savedDocs,
      complianceScore: complianceScore,
      checklist: checklist
    })

  } catch (error: any) {
    console.error('Error generating documents:', error.message)
    return NextResponse.json({ error: 'Failed to generate documents' }, { status: 500 })
  }
}

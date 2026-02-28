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
import { generateV3Documents } from '@/lib/v3-document-templates'

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
    const { orgId, orgName, businessId, answers, v3Answers } = await request.json()

    console.log('Generating docs for:', orgName, 'orgId:', orgId)
    console.log('Answers received:', answers?.length || 0)
    console.log('V3 answers:', v3Answers ? 'present' : 'missing')

    if (!orgId || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get DPO details from database (fallback to config if not found)
    let dpoName = 'עו"ד דנה כהן'
    let dpoLicense = 'DPO-2025-001'
    let dpoEmail = 'dpo@mydpo.co.il'
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

    // Generate v3 documents (ROPA, consent form, processor agreement) if v3Answers present
    let v3Docs: Array<{ title: string; content: string; type: string }> = []
    if (v3Answers && Object.keys(v3Answers).length > 0) {
      console.log('Generating v3 documents from onboarding data...')
      v3Docs = generateV3Documents({
        orgName,
        businessId: businessId || '',
        v3Answers,
        dpoName,
        dpoEmail,
        dpoPhone,
        dpoLicense
      })
      console.log('Generated', v3Docs.length, 'v3 documents:', v3Docs.map(d => d.type).join(', '))
    }

    // Merge all documents
    const allDocuments = [...documents, ...v3Docs]

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(answers || [])
    console.log('Compliance score:', complianceScore.score, 'Level:', complianceScore.level)

    // Generate checklist
    const checklist = generateComplianceChecklist(answers || [])
    console.log('Checklist items:', checklist.length)

    // Save documents to database
    console.log('Saving documents to database...')
    
    // Prevent duplicates — delete any existing docs for this org first
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id, type')
      .eq('org_id', orgId)
      .eq('generated_by', 'system')
    
    if (existingDocs && existingDocs.length > 0) {
      console.log(`Found ${existingDocs.length} existing system-generated docs — replacing`)
      await supabase
        .from('documents')
        .delete()
        .eq('org_id', orgId)
        .eq('generated_by', 'system')
    }

    const documentRecords = allDocuments.map(doc => ({
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

    // Create DPO queue item for document review (prevent duplicates)
    try {
      // Remove any existing pending review items for this org
      await supabase.from('dpo_queue')
        .delete()
        .eq('org_id', orgId)
        .eq('type', 'review')
        .eq('status', 'pending')
      
      await supabase.from('dpo_queue').insert({
        org_id: orgId,
        type: 'review',
        priority: 'medium',
        status: 'pending',
        title: `סקירת מסמכים — ארגון חדש (${savedDocs?.length || 0} מסמכים)`,
        description: `מסמכים שנוצרו אוטומטית דורשים אישור ממונה: ${allDocuments.map(d => d.title).join(', ')}`,
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
          document_count: allDocuments.length,
          document_types: allDocuments.map(d => d.type),
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Hebrew-friendly PDF generation using pdfmake-compatible structure
function generatePDFContent(doc: any, orgName: string) {
  const today = new Date().toLocaleDateString('he-IL')
  
  // Convert markdown-style content to structured format
  const lines = doc.content.split('\n').filter((line: string) => line.trim())
  
  const content: any[] = [
    // Header
    { text: doc.title, style: 'header', alignment: 'right' },
    { text: orgName, style: 'subheader', alignment: 'right' },
    { text: `תאריך: ${today}`, style: 'date', alignment: 'right' },
    { text: '', margin: [0, 20, 0, 0] },
  ]

  // Process content lines
  lines.forEach((line: string) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      content.push({ text: trimmed.replace('# ', ''), style: 'h1', alignment: 'right' })
    } else if (trimmed.startsWith('## ')) {
      content.push({ text: trimmed.replace('## ', ''), style: 'h2', alignment: 'right' })
    } else if (trimmed.startsWith('### ')) {
      content.push({ text: trimmed.replace('### ', ''), style: 'h3', alignment: 'right' })
    } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      content.push({ 
        text: '• ' + trimmed.replace(/^[•\-\*]\s*/, ''), 
        style: 'listItem', 
        alignment: 'right',
        margin: [0, 2, 20, 2]
      })
    } else if (trimmed.match(/^\d+\./)) {
      content.push({ 
        text: trimmed, 
        style: 'numberedItem', 
        alignment: 'right',
        margin: [0, 5, 0, 5]
      })
    } else if (trimmed) {
      content.push({ text: trimmed, style: 'body', alignment: 'right' })
    }
  })

  // Footer with signature block
  content.push({ text: '', margin: [0, 40, 0, 0] })
  content.push({ text: '_______________', alignment: 'right' })
  content.push({ text: 'חתימה ותאריך', style: 'small', alignment: 'right' })

  return {
    content,
    defaultStyle: {
      font: 'David',
      fontSize: 11,
      lineHeight: 1.4
    },
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, color: '#666666', margin: [0, 0, 0, 5] },
      date: { fontSize: 10, color: '#888888' },
      h1: { fontSize: 18, bold: true, margin: [0, 20, 0, 10] },
      h2: { fontSize: 14, bold: true, margin: [0, 15, 0, 8] },
      h3: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
      body: { margin: [0, 3, 0, 3] },
      listItem: { fontSize: 11 },
      numberedItem: { fontSize: 11, bold: true },
      small: { fontSize: 9, color: '#888888', margin: [0, 5, 0, 0] }
    },
    pageMargins: [50, 60, 50, 60],
    info: {
      title: doc.title,
      author: orgName,
      subject: 'מסמך הגנת פרטיות',
      creator: 'DPO-Pro'
    }
  }
}

// Generate DOCX content
function generateDOCXContent(doc: any, orgName: string) {
  const today = new Date().toLocaleDateString('he-IL')
  const lines = doc.content.split('\n')
  
  const paragraphs: any[] = []
  
  // Title
  paragraphs.push({
    type: 'heading1',
    text: doc.title,
    alignment: 'right'
  })
  
  // Organization name and date
  paragraphs.push({
    type: 'normal',
    text: `${orgName} | תאריך: ${today}`,
    alignment: 'right',
    color: '666666'
  })
  
  paragraphs.push({ type: 'break' })
  
  // Process content
  lines.forEach((line: string) => {
    const trimmed = line.trim()
    if (!trimmed) {
      paragraphs.push({ type: 'break' })
    } else if (trimmed.startsWith('# ')) {
      paragraphs.push({ type: 'heading1', text: trimmed.replace('# ', ''), alignment: 'right' })
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push({ type: 'heading2', text: trimmed.replace('## ', ''), alignment: 'right' })
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push({ type: 'heading3', text: trimmed.replace('### ', ''), alignment: 'right' })
    } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push({ type: 'bullet', text: trimmed.replace(/^[•\-\*]\s*/, ''), alignment: 'right' })
    } else if (trimmed.match(/^\d+\./)) {
      paragraphs.push({ type: 'numbered', text: trimmed, alignment: 'right' })
    } else {
      paragraphs.push({ type: 'normal', text: trimmed, alignment: 'right' })
    }
  })
  
  // Signature block
  paragraphs.push({ type: 'break' })
  paragraphs.push({ type: 'break' })
  paragraphs.push({ type: 'normal', text: '_______________', alignment: 'right' })
  paragraphs.push({ type: 'normal', text: 'חתימה ותאריך', alignment: 'right', color: '888888', size: 18 })
  
  return paragraphs
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { documentId, format, orgId } = await request.json()

    if (!documentId || !format) {
      return NextResponse.json({ error: 'Missing documentId or format' }, { status: 400 })
    }

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', doc.org_id)
      .single()

    const orgName = org?.name || 'ארגון'

    if (format === 'pdf') {
      // Return PDF definition for client-side generation
      const pdfDefinition = generatePDFContent(doc, orgName)
      return NextResponse.json({ 
        type: 'pdf',
        definition: pdfDefinition,
        filename: `${doc.title.replace(/\s+/g, '_')}.pdf`
      })
    } else if (format === 'docx') {
      // Return DOCX structure for client-side generation
      const docxContent = generateDOCXContent(doc, orgName)
      return NextResponse.json({ 
        type: 'docx',
        content: docxContent,
        title: doc.title,
        orgName,
        filename: `${doc.title.replace(/\s+/g, '_')}.docx`
      })
    } else {
      // Plain text
      return NextResponse.json({ 
        type: 'txt',
        content: doc.content,
        filename: `${doc.title.replace(/\s+/g, '_')}.txt`
      })
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

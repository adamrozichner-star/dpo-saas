'use client'

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

// PDF Generation using pdfmake (loaded from CDN)
export async function generatePDF(definition: any, filename: string) {
  // Load pdfmake from CDN
  const pdfMake = await loadPdfMake()
  
  // Use Roboto which has good Hebrew support
  const docDefinition = {
    ...definition,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.4
    }
  }
  
  pdfMake.createPdf(docDefinition).download(filename)
}

// Load pdfmake dynamically
async function loadPdfMake(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).pdfMake) {
    return (window as any).pdfMake
  }
  
  return new Promise((resolve, reject) => {
    const script1 = document.createElement('script')
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js'
    script1.onload = () => {
      const script2 = document.createElement('script')
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js'
      script2.onload = () => {
        resolve((window as any).pdfMake)
      }
      script2.onerror = reject
      document.head.appendChild(script2)
    }
    script1.onerror = reject
    document.head.appendChild(script1)
  })
}

// DOCX Generation
export async function generateDOCX(content: any[], title: string, orgName: string, filename: string) {
  const children: Paragraph[] = []
  
  content.forEach((item: any) => {
    if (item.type === 'break') {
      children.push(new Paragraph({ text: '' }))
    } else if (item.type === 'heading1') {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.text, bold: true, size: 36 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    } else if (item.type === 'heading2') {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.text, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    } else if (item.type === 'heading3') {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.text, bold: true, size: 24 })],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    } else if (item.type === 'bullet') {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.text, size: 22 })],
        bullet: { level: 0 },
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    } else if (item.type === 'numbered') {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.text, bold: true, size: 22 })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ 
          text: item.text, 
          size: item.size || 22,
          color: item.color
        })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true
      }))
    }
  })

  const doc = new Document({
    sections: [{
      properties: {
        titlePage: true
      },
      children
    }],
    styles: {
      paragraphStyles: [{
        id: 'Normal',
        name: 'Normal',
        run: {
          size: 22,
          font: 'David'
        },
        paragraph: {
          alignment: AlignmentType.RIGHT
        }
      }]
    }
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

// Plain text download
export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, filename)
}

// Main export function
export async function exportDocument(
  documentId: string, 
  format: 'pdf' | 'docx' | 'txt'
): Promise<void> {
  try {
    const response = await fetch('/api/documents/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, format })
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    const data = await response.json()

    if (data.type === 'pdf') {
      await generatePDF(data.definition, data.filename)
    } else if (data.type === 'docx') {
      await generateDOCX(data.content, data.title, data.orgName, data.filename)
    } else {
      downloadText(data.content, data.filename)
    }
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}

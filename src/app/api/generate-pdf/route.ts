import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

// Simple HTML to PDF using browser print
// This endpoint returns an HTML page that can be printed/saved as PDF

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 per minute
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { success: rateLimitOk } = rateLimit(`generate-pdf:${ip}`, 10, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Auth check
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, content, orgName } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }
    
    const today = new Date().toLocaleDateString('he-IL')
    
    // Create a printable HTML document with Protective Badge design
    const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'מסמך'} - Deepo</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Assistant', Arial, sans-serif;
      line-height: 1.75;
      color: #1c1917;
      background: linear-gradient(180deg, #fffbeb 0%, #ffffff 280px);
      padding: 50px 60px 60px;
      max-width: 820px;
      margin: 0 auto;
      font-size: 13px;
    }
    .header { text-align: center; margin-bottom: 32px; }
    .badge {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 10px 22px; background: white;
      border: 1.5px solid #fbbf24; border-radius: 100px;
      box-shadow: 0 2px 12px rgba(251, 191, 36, 0.18);
      margin-bottom: 22px;
    }
    .badge-shield {
      width: 22px; height: 22px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 5px; display: flex; align-items: center; justify-content: center;
      color: white; font-size: 13px; font-weight: bold;
    }
    .badge-text { font-size: 12px; font-weight: 700; color: #92400e; letter-spacing: 0.5px; }
    .doc-title { font-size: 30px; font-weight: 700; color: #1c1917; margin-bottom: 6px; letter-spacing: -0.5px; }
    .doc-sub { font-size: 13px; color: #78716c; margin-bottom: 6px; }
    .doc-org { font-size: 15px; font-weight: 600; color: #d97706; margin-bottom: 28px; }
    .divider { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e7e5e4; }
    .divider-dot { width: 7px; height: 7px; background: #f59e0b; border-radius: 50%; }
    .content { font-size: 13px; line-height: 1.85; color: #44403c; }
    .content h1 { font-size: 22px; font-weight: 700; margin-top: 28px; margin-bottom: 12px; color: #1c1917; }
    .content h2 {
      font-size: 17px; font-weight: 700; margin-top: 22px; margin-bottom: 10px; color: #1c1917;
      display: flex; align-items: center; gap: 10px;
    }
    .content h2::before { content: ''; width: 24px; height: 3px; background: #f59e0b; border-radius: 2px; flex-shrink: 0; }
    .content h3 { font-size: 14px; font-weight: 600; margin-top: 18px; margin-bottom: 8px; color: #292524; }
    .content p { margin-bottom: 12px; text-align: justify; }
    .content ul, .content ol { margin-right: 24px; margin-bottom: 14px; }
    .content li { margin-bottom: 6px; color: #44403c; }
    .content strong { color: #1c1917; font-weight: 700; }
    .footer {
      margin-top: 50px; padding-top: 16px;
      border-top: 1px dashed #e7e5e4; text-align: center;
      font-size: 11px; color: #a8a29e;
    }
    .footer strong { color: #78716c; font-weight: 700; }
    .print-button {
      position: fixed; bottom: 30px; left: 30px;
      padding: 12px 24px; background: #f59e0b; color: white;
      border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      font-family: 'Assistant', sans-serif;
    }
    .print-button:hover { background: #d97706; }
    @media print {
      body { padding: 30px 40px; background: white; }
      .no-print, .print-button { display: none !important; }
      .header { margin-bottom: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">
      <div class="badge-shield">D</div>
      <div class="badge-text">DEEPO · מוגן בהתאם לתיקון 13</div>
    </div>
    <div class="doc-title">${title || 'מסמך'}</div>
    <div class="doc-sub">מסמך רשמי · תאריך: ${today}</div>
    <div class="doc-org">${orgName || ''}</div>
  </div>
  <div class="divider"><div class="divider-dot"></div></div>
  <div class="content">
    ${formatContentToHtml(content)}
  </div>
  <div class="footer">
    <strong>Deepo</strong> · שירות ממונה הגנת פרטיות · deepo.co.il
  </div>
  <button class="print-button no-print" onclick="window.print()">🖨 הדפס / שמור כ-PDF</button>
</body>
</html>
`
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
    
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function formatContentToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .split('\n\n')
    .map(p => p.trim().startsWith('<') ? p : `<p>${p}</p>`)
    .join('\n')
}

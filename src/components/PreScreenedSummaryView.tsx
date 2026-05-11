'use client'

// Structured pre-screening summary renderer. Used by:
//   - User messages tab (dashboard) — shows the formatted summary inline.
//   - DPO inbox — shows the full summary in the detail view.
//
// Extracted from src/app/dashboard/page.tsx so the DPO page can reuse the
// same rendering and avoid mid-sentence truncation of the structured text.

const STRUCTURED_HEADERS = [
  'נושא:',
  'דחיפות:',
  'רקע:',
  'פרטים:',
  'שאלה מדויקת:',
  'הערות:',
] as const

export function isStructuredSummary(text: string | null | undefined): boolean {
  if (!text) return false
  if (text.includes('📋 פנייה מסוכמת')) return true
  return STRUCTURED_HEADERS.some(h => text.includes(h))
}

export default function PreScreenedSummaryView({ content }: { content: string }) {
  const lines = content.split('\n').filter(l => l.trim())
  const sections: { key: string; lines: string[] }[] = []
  let currentSection = { key: 'header', lines: [] as string[] }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '📋 פנייה מסוכמת') continue
    if (STRUCTURED_HEADERS.some(h => trimmed.startsWith(h))) {
      if (currentSection.lines.length > 0) sections.push(currentSection)
      currentSection = { key: trimmed.replace(':', ''), lines: [] }
      const rest = trimmed.split(':').slice(1).join(':').trim()
      if (rest) currentSection.lines.push(rest)
    } else {
      currentSection.lines.push(trimmed)
    }
  }
  if (currentSection.lines.length > 0) sections.push(currentSection)

  const isUrgent = sections.some(
    s => s.key === 'דחיפות' && s.lines.some(l => l.includes('דחוף')),
  )

  return (
    <div
      className={`rounded-lg border p-3 text-sm space-y-2.5 ${
        isUrgent ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base">📋</span>
        <span className="font-semibold text-stone-800">פנייה מסוכמת</span>
        {isUrgent && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
            דחוף
          </span>
        )}
      </div>
      {sections.map((s, i) => (
        <div key={i}>
          <p className="text-xs font-semibold text-stone-600 mb-0.5">{s.key}</p>
          {s.lines.map((l, j) => (
            <p key={j} className={`text-sm text-stone-700 ${l.startsWith('•') ? 'pr-2' : ''}`}>
              {l}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}

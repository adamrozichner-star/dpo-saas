'use client'

import { useMemo } from 'react'

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const RULES: PasswordRule[] = [
  { label: 'לפחות 8 תווים', test: pw => pw.length >= 8 },
  { label: 'אות גדולה באנגלית', test: pw => /[A-Z]/.test(pw) },
  { label: 'ספרה', test: pw => /[0-9]/.test(pw) },
  { label: 'תו מיוחד (!@#$%^&*)', test: pw => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
]

export function validatePassword(password: string): { valid: boolean; score: number; passed: boolean[] } {
  const passed = RULES.map(r => r.test(password))
  const score = passed.filter(Boolean).length
  return { valid: score === RULES.length, score, passed }
}

export function PasswordStrength({ password }: { password: string }) {
  const { score, passed } = useMemo(() => validatePassword(password), [password])

  if (!password) return null

  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e']
  const labels = ['חלשה', 'בינונית', 'טובה', 'חזקה']
  const idx = Math.max(0, score - 1)

  return (
    <div style={{ marginTop: 6 }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < score ? colors[idx] : '#e4e4e7',
              transition: 'background .2s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors[idx] }}>{labels[idx]}</span>
      </div>
      {/* Rules checklist */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
        {RULES.map((rule, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              color: passed[i] ? '#22c55e' : '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {passed[i] ? '✓' : '○'} {rule.label}
          </span>
        ))}
      </div>
    </div>
  )
}

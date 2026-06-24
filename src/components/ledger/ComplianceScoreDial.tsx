// ComplianceScoreDial - 0-100 gauge.
// NOTE: the band thresholds (<50 risk, 50-79 warn, >=80 ok) are a PROVISIONAL
// engineering default. The real bands are a later product decision (Amir/Roy).
import * as React from 'react'

export interface ComplianceScoreDialProps {
  score: number
  label?: string
  size?: number
}

function bandToken(score: number): string {
  if (score >= 80) return 'var(--status-ok)'
  if (score >= 50) return 'var(--status-warn)'
  return 'var(--status-risk)'
}

export function ComplianceScoreDial({ score, label = 'ציון ציות', size = 132 }: ComplianceScoreDialProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const arc = (clamped / 100) * circ
  const color = bandToken(clamped)

  return (
    <div className="dp-dial">
      <div className="dp-dial__wrap" style={{ width: size, height: size }}>
        <svg className="dp-dial__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--sand-300)' }} />
          <circle
            className="dp-dial__value"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`}
            style={{ stroke: color }}
            data-band={clamped >= 80 ? 'ok' : clamped >= 50 ? 'warn' : 'risk'}
          />
        </svg>
        <div className="dp-dial__center">
          <span className="dp-dial__num">{clamped}</span>
          <span className="dp-dial__label">{label}</span>
        </div>
      </div>
    </div>
  )
}

// ComplianceScoreDial - 0-100 gauge.
// NOTE: the band thresholds (<50 risk, 50-79 warn, >=80 ok) are a PROVISIONAL
// engineering default. The real bands are a later product decision (Amir/Roy).
import * as React from 'react'

export type ScoreBand = 'risk' | 'warn' | 'ok'

export interface ScoreBandInfo {
  band: ScoreBand
  token: string // a CSS var() for the band colour
  label: string // Hebrew band label
}

// Single source of truth for the band thresholds + their colour/label, reused by
// the dial and the score card so they never drift apart.
export function scoreBand(score: number): ScoreBandInfo {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (s >= 80) return { band: 'ok', token: 'var(--status-ok)', label: 'מוגן' }
  if (s >= 50) return { band: 'warn', token: 'var(--status-warn)', label: 'דורש תשומת לב' }
  return { band: 'risk', token: 'var(--status-risk)', label: 'טעון טיפול' }
}

export interface ComplianceScoreDialProps {
  score: number
  /** Small label under the number inside the ring. Pass '' to hide (e.g. inside the score card). */
  label?: string
  size?: number
}

export function ComplianceScoreDial({ score, label = 'ציון ציות', size = 132 }: ComplianceScoreDialProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const arc = (clamped / 100) * circ
  const { token: color, band } = scoreBand(clamped)

  return (
    <div className="dp-dial">
      <div className="dp-dial__wrap" style={{ width: size, height: size }}>
        <svg className="dp-dial__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label || 'ציון ציות'}: ${clamped}`}>
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
            data-band={band}
          />
        </svg>
        <div className="dp-dial__center">
          <span className="dp-dial__num">{clamped}</span>
          {label ? <span className="dp-dial__label">{label}</span> : null}
        </div>
      </div>
    </div>
  )
}

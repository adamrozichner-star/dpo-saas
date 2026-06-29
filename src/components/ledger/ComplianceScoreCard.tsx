import * as React from 'react'
import { ComplianceScoreDial, scoreBand } from './ComplianceScoreDial'

export interface ComplianceScoreCardProps {
  score: number
  /** Obligations counted toward the score (for the "X of Y" line). */
  total?: number
  /** Obligations already in order. */
  compliant?: number
}

// What the band means, in one plain line. The score itself is explained by the
// count line below it.
const BAND_CAPTION: Record<string, string> = {
  ok: 'רוב נושאי הפרטיות מסודרים. המשיכו לתחזק.',
  warn: 'יש נושאים שדורשים את תשומת לבכם.',
  risk: 'יש נושאים פתוחים שכדאי לטפל בהם.',
}

/**
 * The labelled compliance-score card: the framed dial plus a band label, a plain
 * caption, and the count it is based on - so the number carries meaning instead of
 * floating alone.
 */
export function ComplianceScoreCard({ score, total, compliant }: ComplianceScoreCardProps) {
  const { token, label, band } = scoreBand(score)
  return (
    <div className="dp-scorecard">
      <ComplianceScoreDial score={score} label="" size={132} />
      <div className="dp-scorecard__body">
        <p className="t-eyebrow" style={{ margin: 0 }}>ציון ציות</p>
        <p className="dp-scorecard__band" style={{ color: token }}>{label}</p>
        <p className="dp-scorecard__caption">{BAND_CAPTION[band]}</p>
        {total != null ? (
          <p className="dp-scorecard__count">{compliant ?? 0} מתוך {total} חובות מסודרות</p>
        ) : null}
      </div>
    </div>
  )
}

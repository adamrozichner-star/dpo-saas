import * as React from 'react'
import { ComplianceScoreDial, scoreBand } from './ComplianceScoreDial'
import { DeepoIcon } from '@/brand/icons'

export interface ComplianceScoreCardProps {
  score: number
  /** Obligations counted toward the score (for the "X of Y" line). */
  total?: number
  /** Obligations already in order. */
  compliant?: number
  /** Nothing assessed yet (all obligations unknown/checking): show a mapping
   *  placeholder instead of the score. Display only - the score is unchanged. */
  unassessed?: boolean
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
export function ComplianceScoreCard({ score, total, compliant, unassessed }: ComplianceScoreCardProps) {
  // Not assessed yet: show a mapping placeholder in place of the dial/score.
  if (unassessed) {
    return (
      <div className="dp-scorecard">
        <div className="dp-dial__wrap" style={{ width: 132, height: 132, display: 'grid', placeItems: 'center', borderRadius: '50%', border: '2px dashed var(--border-2)' }}>
          <DeepoIcon id="dp-radar" style={{ fontSize: 40, color: 'var(--fg-3)' }} />
        </div>
        <div className="dp-scorecard__body">
          <p className="t-eyebrow" style={{ margin: 0 }}>ציון ציות</p>
          <p className="dp-scorecard__band" style={{ color: 'var(--fg-2)' }}>בתהליך מיפוי</p>
          <p className="dp-scorecard__caption">אנחנו עדיין ממפים את מצב הציות. הציון יופיע לאחר הערכת החובות.</p>
          {total != null ? <p className="dp-scorecard__count">{total} חובות בבדיקה</p> : null}
        </div>
      </div>
    )
  }
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

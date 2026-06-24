import { DeepoIcon } from '@/brand/icons'
import { formatShortDate } from './format'
import { ENTITY_ICON, type EntityType } from './status'

export interface TimelineEvent {
  entityType: EntityType
  eventType: string
  summary?: string
  actor?: string | null
  at: string
}

/** Append-only event feed (mirrors the ledger events table). */
export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="dp-timeline">
      {events.map((e, i) => (
        <div className="dp-timeline__item" key={`${e.at}-${i}`}>
          <div className="dp-timeline__rail">
            <span className="dp-timeline__dot">
              <DeepoIcon id={ENTITY_ICON[e.entityType]} />
            </span>
            <span className="dp-timeline__line" />
          </div>
          <div className="dp-timeline__body">
            <div className="dp-timeline__head">{e.summary || e.eventType}</div>
            <div className="dp-timeline__sub">
              {formatShortDate(e.at)}
              {e.actor ? ` · ${e.actor}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

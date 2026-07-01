import { DeepoIcon } from '@/brand/icons'
import type { Actor } from './nav'

export interface TopbarProps {
  title: string
  actor: Actor
}

/**
 * Desktop topbar: the context title on the right (RTL start), per-actor actions on
 * the left. The actions are voiced per actor — the DPO console carries the
 * professional set (notifications + help), the owner app stays light (just help, in
 * owner voice), with no DPO jargon. No actor toggle: each surface is its own actor.
 */
export function Topbar({ title, actor }: TopbarProps) {
  return (
    <header className="dp-topbar">
      <h1 className="dp-topbar__title">{title}</h1>
      <div className="dp-topbar__actions">
        {actor === 'dpo' ? (
          <button type="button" className="dp-iconbtn" title="התראות" aria-label="התראות">
            <DeepoIcon id="dp-bell" />
          </button>
        ) : null}
        <button
          type="button"
          className="dp-iconbtn"
          title={actor === 'dpo' ? 'עזרה' : 'צריכים עזרה?'}
          aria-label={actor === 'dpo' ? 'עזרה' : 'צריכים עזרה?'}
        >
          <DeepoIcon id="dp-seal" />
        </button>
      </div>
    </header>
  )
}

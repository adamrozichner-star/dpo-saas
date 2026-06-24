import { DeepoIcon } from '@/brand/icons'
import type { Actor } from './nav'

export interface TopbarProps {
  title: string
  actor: Actor
  onToggleActor: () => void
}

/**
 * Desktop topbar: page title on the right (RTL start), actions on the left.
 * The actor toggle is an A3 demo affordance (real role wiring is deferred to C).
 */
export function Topbar({ title, actor, onToggleActor }: TopbarProps) {
  return (
    <header className="dp-topbar">
      <h1 className="dp-topbar__title">{title}</h1>
      <div className="dp-topbar__actions">
        <button
          type="button"
          className="dp-iconbtn"
          onClick={onToggleActor}
          title={actor === 'dpo' ? 'תצוגת בעל עסק' : 'תצוגת ממונה'}
          aria-label="החלפת תצוגת אקטור"
        >
          <DeepoIcon id="dp-sparkle" />
        </button>
        <button type="button" className="dp-iconbtn" title="התראות" aria-label="התראות">
          <DeepoIcon id="dp-bell" />
        </button>
        <button type="button" className="dp-iconbtn" title="עזרה" aria-label="עזרה">
          <DeepoIcon id="dp-seal" />
        </button>
      </div>
    </header>
  )
}

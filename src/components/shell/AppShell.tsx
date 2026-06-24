'use client'

import * as React from 'react'
import { DeepoIcon } from '@/brand/icons'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SHELL_NAV, type Actor, type ShellOrg, type NavSection } from './nav'

export interface AppShellProps {
  children: React.ReactNode
  title?: string
  /** Initial actor theme. Defaults to dpo (Onyx). Real role wiring is deferred to C. */
  initialActor?: Actor
  org?: ShellOrg
  sections?: NavSection[]
}

// A3 placeholder identity. Replaced by a real org/session context in C.
const PLACEHOLDER_ORG: ShellOrg = { name: 'מרפאת לב הזהב', plan: 'חשבון מורחב', initials: 'לה' }

/**
 * The authenticated app shell: RTL, brand tokens, Duotone icons. Desktop renders
 * a static sidebar on the right; below 1024px it collapses to a top bar (logo
 * right, menu/bell left) with a slide-in drawer from the right. Themed per actor
 * (dpo = Onyx, owner = light). Rendered inside .deepo-scope so the brand base applies.
 */
export function AppShell({ children, title = 'לוח בקרה', initialActor = 'dpo', org = PLACEHOLDER_ORG, sections = SHELL_NAV }: AppShellProps) {
  const [actor, setActor] = React.useState<Actor>(initialActor)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [activeId, setActiveId] = React.useState('dashboard')

  const logo = actor === 'dpo' ? '/brand/logos/logoreverse.png' : '/brand/logos/logofull.png'

  return (
    <div className={['deepo-scope', 'dp-shell', `dp-shell--${actor}`, drawerOpen ? 'dp-shell--open' : ''].filter(Boolean).join(' ')} dir="rtl">
      {/* Mobile top bar: logo right, menu + bell left (visible below 1024px). */}
      <div className="dp-mobilebar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dp-mobilebar__logo" src={actor === 'dpo' ? '/brand/logos/logofull.png' : logo} alt="Deepo" />
        <div className="dp-mobilebar__actions">
          <button type="button" className="dp-iconbtn" onClick={() => setDrawerOpen((o) => !o)} aria-label="תפריט" title="תפריט">
            <DeepoIcon id="dp-radar" />
          </button>
          <button type="button" className="dp-iconbtn" aria-label="התראות" title="התראות">
            <DeepoIcon id="dp-bell" />
          </button>
        </div>
      </div>

      {drawerOpen ? <div className="dp-shell__backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" /> : null}

      <Sidebar
        actor={actor}
        sections={sections}
        activeId={activeId}
        org={org}
        onNavigate={(id) => {
          setActiveId(id)
          setDrawerOpen(false)
        }}
      />

      <main className="dp-shell__main">
        <Topbar title={title} actor={actor} onToggleActor={() => setActor((a) => (a === 'dpo' ? 'owner' : 'dpo'))} />
        <div className="dp-shell__content">{children}</div>
      </main>
    </div>
  )
}

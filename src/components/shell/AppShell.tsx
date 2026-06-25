'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { DeepoIcon } from '@/brand/icons'
import { useOrg } from '@/lib/org-context'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SHELL_NAV, type Actor, type ShellOrg, type NavSection } from './nav'

export interface AppShellProps {
  children: React.ReactNode
  title?: string
  /** Fallback actor when there is no resolved org (e.g. the dev demo). */
  initialActor?: Actor
  /** Fallback org for surfaces with no session (e.g. /shell-demo). */
  org?: ShellOrg
  sections?: NavSection[]
}

// Used only when there is no resolved org (the dev shell demo). Real surfaces
// get the live org via OrgContext.
const PLACEHOLDER_ORG: ShellOrg = { name: 'מרפאת לב הזהב', plan: 'חשבון מורחב', initials: 'לה' }

const TIER_LABEL: Record<string, string> = { basic: 'בסיסי', recommended: 'מומלץ', premium: 'פרימיום' }

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] || '') + (words[1][0] || '')
  return name.trim().slice(0, 2)
}

/**
 * The authenticated app shell. Reads OrgContext: when a live org is resolved it
 * shows that org + the role-derived actor; otherwise it falls back to the
 * placeholder (so the dev /shell-demo renders unauthenticated). RTL, brand
 * tokens, Duotone icons. Desktop sidebar on the right; below 1024px a top bar +
 * slide-in drawer from the right.
 */
export function AppShell({ children, title = 'לוח בקרה', initialActor = 'dpo', org, sections = SHELL_NAV }: AppShellProps) {
  const orgCtx = useOrg()
  const pathname = usePathname()
  const [actorOverride, setActorOverride] = React.useState<Actor | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [activeId, setActiveId] = React.useState('dashboard')

  // The owner home (/home) is the owner surface: always owner-themed (light),
  // regardless of the viewer's role. Other (deepo) routes follow the role-derived
  // actor. The demo toggle still overrides.
  const routeActor: Actor | null = pathname?.startsWith('/home') ? 'owner' : null
  const actor: Actor = actorOverride ?? routeActor ?? (orgCtx.org ? orgCtx.actor : initialActor)
  const shellOrg: ShellOrg = orgCtx.org
    ? { name: orgCtx.org.name, plan: TIER_LABEL[orgCtx.org.tier ?? ''] ?? 'חשבון', initials: initialsOf(orgCtx.org.name) }
    : org ?? PLACEHOLDER_ORG

  return (
    <div className={['deepo-scope', 'dp-shell', `dp-shell--${actor}`, drawerOpen ? 'dp-shell--open' : ''].filter(Boolean).join(' ')} dir="rtl">
      <div className="dp-mobilebar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dp-mobilebar__logo" src="/brand/logos/logofull.png" alt="Deepo" />
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
        org={shellOrg}
        onNavigate={(id) => {
          setActiveId(id)
          setDrawerOpen(false)
        }}
      />

      <main className="dp-shell__main">
        <Topbar title={title} actor={actor} onToggleActor={() => setActorOverride(actor === 'dpo' ? 'owner' : 'dpo')} />
        <div className="dp-shell__content">{children}</div>
      </main>
    </div>
  )
}

import * as React from 'react'
import { DeepoIcon } from '@/brand/icons'
import type { Actor, NavSection, ShellOrg } from './nav'

export interface SidebarProps {
  actor: Actor
  sections: NavSection[]
  activeId: string
  onNavigate: (id: string) => void
  org: ShellOrg
}

/**
 * The brand sidebar: logo top, sectioned nav (Duotone icon + label + optional
 * count), org/user footer. Logo is logoreverse on the Onyx (dpo) sidebar and
 * logofull on the light (owner) sidebar. RTL: this aside is the right-hand column.
 */
export function Sidebar({ actor, sections, activeId, onNavigate, org }: SidebarProps) {
  const logo = actor === 'dpo' ? '/brand/logos/logoondark.png' : '/brand/logos/logofull.png'
  return (
    <aside className="dp-shell__sidebar">
      <div className="dp-shell__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="Deepo" className="dp-shell__logo" />
      </div>
      <nav className="dp-shell__nav">
        {sections.map((section) => (
          <React.Fragment key={section.heading}>
            <div className="dp-shell__sec">{section.heading}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={['dp-navitem', activeId === item.id ? 'dp-navitem--active' : ''].filter(Boolean).join(' ')}
                aria-current={activeId === item.id ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <DeepoIcon id={item.icon} />
                <span className="dp-navitem__label">{item.label}</span>
                {item.count ? <span className="dp-navitem__count">{item.count}</span> : null}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="dp-shell__foot">
        <span className="dp-avatar" aria-hidden="true">
          {org.initials}
        </span>
        <span className="dp-shell__user">
          <b>{org.name}</b>
          <span>{org.plan}</span>
        </span>
      </div>
    </aside>
  )
}

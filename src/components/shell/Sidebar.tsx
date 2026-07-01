'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DeepoIcon } from '@/brand/icons'
import type { Actor, NavSection, ShellOrg } from './nav'

export interface SidebarProps {
  actor: Actor
  sections: NavSection[]
  onNavigate?: () => void
  org: ShellOrg
}

// Active when the path equals the item's route, or is within its subtree (but
// /console must not light up for every /console/* child - exact-match it).
function isActive(pathname: string | null, href: string | undefined): boolean {
  if (!pathname || !href) return false
  if (href === '/console' || href === '/home') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

/**
 * The brand sidebar: logo top, sectioned nav (Duotone icon + label + optional
 * count), org/user footer. Nav items with an href render as real <Link>s with
 * route-based active state; the demo shell passes hrefless items (buttons). RTL:
 * this aside is the right-hand column.
 */
export function Sidebar({ actor, sections, onNavigate, org }: SidebarProps) {
  const pathname = usePathname()
  const logo = actor === 'dpo' ? '/brand/logos/logoondark.png' : '/brand/logos/logofull.png'
  return (
    <aside className="dp-shell__sidebar">
      <div className="dp-shell__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="Deepo" className="dp-shell__logo" />
      </div>
      <nav className="dp-shell__nav">
        {sections.map((section, si) => (
          <React.Fragment key={section.heading || si}>
            {section.heading ? <div className="dp-shell__sec">{section.heading}</div> : null}
            {section.items.map((item) => {
              const active = isActive(pathname, item.href)
              const cls = ['dp-navitem', active ? 'dp-navitem--active' : ''].filter(Boolean).join(' ')
              const inner = (
                <>
                  <DeepoIcon id={item.icon} />
                  <span className="dp-navitem__label">{item.label}</span>
                  {item.count ? <span className="dp-navitem__count">{item.count}</span> : null}
                </>
              )
              return item.href ? (
                <Link key={item.id} href={item.href} className={cls} aria-current={active ? 'page' : undefined} onClick={() => onNavigate?.()}>
                  {inner}
                </Link>
              ) : (
                <button key={item.id} type="button" className={cls} onClick={() => onNavigate?.()}>
                  {inner}
                </button>
              )
            })}
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

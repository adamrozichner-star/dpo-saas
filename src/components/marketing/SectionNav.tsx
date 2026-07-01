'use client'

// Secondary one-pager anchor nav for the homepage. A slim sticky strip that
// sits just under the main header; clicking an item smooth-scrolls to that
// section, offset by the stacked nav heights so the target clears the chrome.
// Purely in-page navigation (not the section kicker labels we dropped in B1).

const ANCHORS: Array<{ id: string; label: string }> = [
  { id: 'how', label: 'איך זה עובד' },
  { id: 'features', label: 'מה מקבלים' },
  { id: 'compare', label: 'למה Deepo' },
  { id: 'pricing', label: 'מחירים' },
  { id: 'faq', label: 'שאלות נפוצות' },
]

// Smooth-scroll to a section id, clearing the sticky header + anchor strip.
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const nav = document.querySelector('.mkt-nav') as HTMLElement | null
  const sub = document.querySelector('.hp-anchornav') as HTMLElement | null
  const offset = (nav?.offsetHeight ?? 72) + (sub?.offsetHeight ?? 0) + 12
  const y = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: y, behavior: 'smooth' })
  history.replaceState(null, '', `#${id}`)
}

export function SectionNav() {
  return (
    <nav className="hp-anchornav" aria-label="ניווט מהיר בעמוד">
      <div className="mk-wrap hp-anchornav__row">
        {ANCHORS.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            onClick={(e) => { e.preventDefault(); scrollToId(a.id) }}
          >
            {a.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// Shell navigation model. Data only; the shell renders it with DeepoIcon.
// Labels are Hebrew (the product language). Counts are placeholders for A3.
import type { DeepoIconId } from '@/brand/icons'

// Which actor the shell is themed for. dpo = Onyx dark sidebar; owner = light.
export type Actor = 'dpo' | 'owner'

// Placeholder account identity shown in the sidebar footer (A3 uses static data;
// real org/user wiring is deferred to C).
export interface ShellOrg {
  name: string
  plan: string
  initials: string
}

export interface NavItem {
  id: string
  label: string
  icon: DeepoIconId
  /** Real route. When present the item renders as a <Link>; demo items omit it. */
  href?: string
  count?: number
}

export interface NavSection {
  heading: string
  items: NavItem[]
}

// DPO console nav - real routes to the v3 console surfaces (the cross-client
// overview at /console grows in the overview task; the sub-pages exist today).
export const DPO_NAV: NavSection[] = [
  {
    heading: 'קונסולת ממונה',
    items: [
      { id: 'overview', label: 'מבט כללי', icon: 'dp-radar', href: '/console' },
      { id: 'queue', label: 'ממתין לאישור', icon: 'dp-bell', href: '/console/queue' },
      { id: 'documents', label: 'מסמכים', icon: 'dp-doc', href: '/console/documents' },
      { id: 'audit', label: 'תיק היערכות', icon: 'dp-seal', href: '/console/audit' },
      { id: 'links', label: 'קישורי איסוף', icon: 'dp-link', href: '/console/links' },
    ],
  },
]

// Owner home nav - kept minimal for now; Documents + Profile arrive with the
// owner-home task. Plain, light, no DPO jargon.
export const OWNER_NAV: NavSection[] = [
  {
    heading: '',
    items: [{ id: 'home', label: 'דף הבית', icon: 'dp-shield', href: '/home' }],
  },
]

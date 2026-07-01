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

// DPO console nav - the multi-client IA: top level is the cross-client Overview +
// the book-wide Approvals inbox. The per-client surfaces (queue / documents / audit
// / links) are NOT top-level any more - they live under the client drill-down
// (/console/clients/[orgId]), reached by clicking a client. This replaces the flat
// five-item own-org nav (the IA confusion the respec kills); the screen-1 mockup
// nav is now stale on this point.
export const DPO_NAV: NavSection[] = [
  {
    heading: 'קונסולת ממונה',
    items: [
      { id: 'overview', label: 'מבט כללי', icon: 'dp-radar', href: '/console' },
      { id: 'approvals', label: 'ממתין לאישור', icon: 'dp-bell', href: '/console/approvals' },
    ],
  },
]

// Owner home nav - plain, light, no DPO jargon. Distinct from DPO_NAV.
export const OWNER_NAV: NavSection[] = [
  {
    heading: '',
    items: [
      { id: 'home', label: 'דף הבית', icon: 'dp-shield', href: '/home' },
      { id: 'documents', label: 'המסמכים שלי', icon: 'dp-doc', href: '/home/documents' },
      { id: 'profile', label: 'הפרטים שלי', icon: 'dp-lock', href: '/home/profile' },
    ],
  },
]

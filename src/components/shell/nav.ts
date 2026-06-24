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
  count?: number
}

export interface NavSection {
  heading: string
  items: NavItem[]
}

export const SHELL_NAV: NavSection[] = [
  {
    heading: 'ניהול פרטיות',
    items: [
      { id: 'dashboard', label: 'לוח בקרה', icon: 'dp-radar' },
      { id: 'vendors', label: 'ספקים', icon: 'dp-link', count: 3 },
      { id: 'tasks', label: 'משימות', icon: 'dp-bell', count: 2 },
      { id: 'documents', label: 'מסמכים', icon: 'dp-doc' },
      { id: 'data', label: 'נכסי מידע', icon: 'dp-database' },
    ],
  },
  {
    heading: 'חשבון',
    items: [{ id: 'settings', label: 'הגדרות ופרטיות', icon: 'dp-lock' }],
  },
]

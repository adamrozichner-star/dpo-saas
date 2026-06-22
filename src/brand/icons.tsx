import * as React from 'react'

/* ============================================================
   Deepo Duotone icon set
   ============================================================
   Ported from deepo-brand/deepo-icons.js. The source hydrated
   <svg class="dpi"><use href="#dp-shield"></use></svg> by mutating
   the DOM on load. Here each icon renders its duotone paths directly
   (SSR-safe, no MutationObserver). Duotone = soft ~18% fill + 1.7px
   line. Color follows `--dpi-c` (or currentColor); size follows
   font-size via the `.dpi` helper class.
   ============================================================ */

const shield = 'M12 2.6l7.2 3v5.1c0 4.4-3 8-7.2 9.1-4.2-1.1-7.2-4.7-7.2-9.1V5.6z'
const bell = 'M6.3 16.5c-.6 0-.9-.7-.5-1.1.8-.9 1.4-2 1.4-3.9 0-2.8 1.9-4.9 4.8-4.9s4.8 2.1 4.8 4.9c0 1.9.6 3 1.4 3.9.4.4.1 1.1-.5 1.1z'
const sealPts = 'M12 2.4 L14.1 4.3 L16.8 3.7 L17.7 6.3 L20.3 7.2 L19.7 9.9 L21.6 12 L19.7 14.1 L20.3 16.8 L17.7 17.7 L16.8 20.3 L14.1 19.7 L12 21.6 L9.9 19.7 L7.2 20.3 L6.3 17.7 L3.7 16.8 L4.3 14.1 L2.4 12 L4.3 9.9 L3.7 7.2 L6.3 6.3 L7.2 3.7 L9.9 4.3Z'
const bolt = 'M13 2.5L6 13h4.5l-1 8.5L18 10h-4.5z'
const dbBody = 'M5.5 5.6c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4v12.8c0 1.3-2.6 2.4-6.5 2.4s-6.5-1.1-6.5-2.4z'
const dbTop = 'M12 3.2c3.9 0 6.5 1.1 6.5 2.4S15.9 8 12 8 5.5 6.9 5.5 5.6 8.1 3.2 12 3.2z'
const sparkle = 'M12 2.6c.5 5 3.8 8.3 8.8 8.8-5 .5-8.3 3.8-8.8 8.8-.5-5-3.8-8.3-8.8-8.8 5-.5 8.3-3.8 8.8-8.8z'

/* id -> [softPathD, linePathD] */
const ICONS: Record<string, [string, string]> = {
  'dp-shield': [shield, shield + ' M8.8 12l2.3 2.3 4.1-4.6'],
  'dp-radar': [
    'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-5.5 0a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0 M12 12l6.4-4.5',
  ],
  'dp-sparkle': [sparkle, sparkle],
  'dp-doc': ['M6 2.6h7l5 5v13.8H6z', 'M13.2 2.6v5h5 M6 2.6h7l5 5v13.8H6z M9 12.5h6 M9 16h6'],
  'dp-bell': [bell, bell + ' M5 16.5h14 M10.2 19.2a2 2 0 0 0 3.6 0'],
  'dp-lock': ['M5.5 11h13v8.4H5.5z', 'M5.5 11h13v8.4H5.5z M8 11V8.5a4 4 0 0 1 8 0V11 M12 14.5v2.2'],
  'dp-seal': [sealPts, sealPts + ' M8.8 12l2.3 2.3 4.1-4.6'],
  'dp-bolt': [bolt, bolt],
  'dp-database': [
    dbBody,
    dbTop + ' M5.5 5.6v12.8c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4V5.6 M5.5 12c0 1.3 2.6 2.4 6.5 2.4s6.5-1.1 6.5-2.4',
  ],
  'dp-link': [
    'M9 6.5h2.5v11H9zM12.5 6.5H15v11h-2.5z',
    'M10 8.2H8.2A2.2 2.2 0 0 0 6 10.4v3.2a2.2 2.2 0 0 0 2.2 2.2H10 M14 8.2h1.8A2.2 2.2 0 0 1 18 10.4v3.2a2.2 2.2 0 0 1-2.2 2.2H14 M8.8 12h6.4',
  ],
  'dp-check': [
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0',
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M7.8 12l2.6 2.6 5-5.2',
  ],
  'dp-x': [
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0',
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M9 9l6 6 M15 9l-6 6',
  ],
  'dp-health': [
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0',
    'M12 12m-9.4 0a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0 M12 7.6v8.8 M7.6 12h8.8',
  ],
  'dp-education': [
    'M12 4l9 4-9 4-9-4z',
    'M12 4l9 4-9 4-9-4z M6.5 10v5c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5 M21 8v5',
  ],
  'dp-finance': ['M4 9.5l8-5 8 5v1.5H4z', 'M4 9.5l8-5 8 5 M4 11h16 M6.5 11v7 M12 11v7 M17.5 11v7 M4 19h16'],
}

export type DeepoIconId = keyof typeof ICONS

export const deepoIconIds = Object.keys(ICONS) as DeepoIconId[]

export interface DeepoIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Icon id, e.g. 'dp-shield'. */
  id: DeepoIconId
  /** Accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string
}

/**
 * Inline duotone icon. Set color via `color` / `--dpi-c` and size via
 * `font-size` on the icon or an ancestor.
 */
export function DeepoIcon({ id, title, className = '', ...rest }: DeepoIconProps) {
  const paths = ICONS[id]
  if (!paths) return null
  const [soft, line] = paths
  const cls = ['dpi', className].filter(Boolean).join(' ')
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={soft} fill="var(--dpi-c, currentColor)" fillOpacity={0.18} />
      <path
        d={line}
        fill="none"
        stroke="var(--dpi-c, currentColor)"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

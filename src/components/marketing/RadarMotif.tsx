import * as React from 'react'

/**
 * RadarMotif - the signature "on guard" coverage rings, layer 2+3 of the
 * brand coverage-mesh (patterns.html .mesh). Concentric crimson coverage
 * radii at the book's exact alphas (.55 / .32 / .18) and proportions
 * (22 / 56 / 96 of a 115px radius), scaled to `size`, plus the 135deg
 * crimson-to-amber gradient core node (the .core recipe, via mk-radar::after).
 * Layer 1 (the .16 dot-grid) is applied by the hero via `.mk-mesh`.
 *
 * Purely decorative (aria-hidden); position it with `className` / `style` on
 * the parent. Raw rgba is the coverage gradient (allowed per spec 2.1).
 */
export interface RadarMotifProps {
  /** Diameter in px. @default 820 */
  size?: number
  /** Show the 135deg gradient core node at the centre. @default true */
  node?: boolean
  className?: string
  style?: React.CSSProperties
}

export function RadarMotif({ size = 820, node = true, className = '', style }: RadarMotifProps) {
  const R = size / 2
  // patterns.html ring radii (22/56/96 over a 115px radius), 2px hairlines.
  const r1 = +(0.1913 * R).toFixed(1)
  const r2 = +(0.4870 * R).toFixed(1)
  const r3 = +(0.8348 * R).toFixed(1)
  const w = 2
  const rings =
    `radial-gradient(circle,` +
    ` transparent 0 ${r1}px, rgba(209,3,49,.55) ${r1}px ${r1 + w}px,` +
    ` transparent ${r1 + w}px ${r2}px, rgba(209,3,49,.32) ${r2}px ${r2 + w}px,` +
    ` transparent ${r2 + w}px ${r3}px, rgba(209,3,49,.18) ${r3}px ${r3 + w}px,` +
    ` transparent ${r3 + w}px)`
  return (
    <div
      aria-hidden="true"
      className={`mk-radar${node ? '' : ' mk-radar--no-node'} ${className}`.trim()}
      style={{ width: size, height: size, backgroundImage: rings, ...style }}
    />
  )
}

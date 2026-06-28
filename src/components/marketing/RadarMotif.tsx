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
  // Vision recipe (index-he.html .radar-rings): 4 coverage rings at radii
  // 104/204/304/404 on an 820px circle (radius 410), 2px lines, alphas
  // .30/.22/.15/.09. Scaled to `size` so it stays exact at 820 and matches
  // the proportions at any size.
  const R = size / 2
  const f = (px: number) => +((px / 410) * R).toFixed(1)
  const rings =
    `radial-gradient(circle,` +
    ` transparent 0 ${f(104)}px, rgba(209,3,49,.30) ${f(104)}px ${f(106)}px,` +
    ` transparent ${f(106)}px ${f(204)}px, rgba(209,3,49,.22) ${f(204)}px ${f(206)}px,` +
    ` transparent ${f(206)}px ${f(304)}px, rgba(209,3,49,.15) ${f(304)}px ${f(306)}px,` +
    ` transparent ${f(306)}px ${f(404)}px, rgba(209,3,49,.09) ${f(404)}px ${f(406)}px,` +
    ` transparent ${f(406)}px)`
  return (
    <div
      aria-hidden="true"
      className={`mk-radar${node ? '' : ' mk-radar--no-node'} ${className}`.trim()}
      style={{ width: size, height: size, backgroundImage: rings, ...style }}
    />
  )
}

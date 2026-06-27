import * as React from 'react'

/**
 * RadarMotif - the signature "on guard" coverage-rings device, extracted
 * from deepo-brand/reference/marketing-reference-he.html (.radar-rings).
 * Concentric crimson coverage radii with an optional gradient node at the
 * centre. Purely decorative (aria-hidden); position it with `className` or
 * `style` on the parent. The multi-stop rgba rings are the brand ember/
 * coverage recipe (the one place raw color is allowed, per spec 2.1).
 */
export interface RadarMotifProps {
  /** Diameter in px. @default 820 */
  size?: number
  /** Show the gradient "node" dot at the centre. @default true */
  node?: boolean
  className?: string
  style?: React.CSSProperties
}

export function RadarMotif({ size = 820, node = true, className = '', style }: RadarMotifProps) {
  return (
    <div
      aria-hidden="true"
      className={`mk-radar${node ? '' : ' mk-radar--no-node'} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    />
  )
}

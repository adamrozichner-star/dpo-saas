import * as React from 'react'

/**
 * Props for the status / label chip.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color intent. Status colors map to the confident status palette. */
  variant?: 'ok' | 'warn' | 'risk' | 'info' | 'brand' | 'neutral' | 'solid'
  /** Show a leading status dot in the current color. */
  dot?: boolean
  /** Use a small square radius instead of a full pill. */
  square?: boolean
  children?: React.ReactNode
}

/**
 * Compact status / label chip. Status state communicated by color + optional dot.
 */
export function Badge({
  variant = 'neutral',
  dot = false,
  square = false,
  className = '',
  children,
  ...rest
}: BadgeProps) {
  const cls = ['dp-badge', `dp-badge--${variant}`, square ? 'dp-badge--square' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} {...rest}>
      {dot && <span className="dp-badge__dot" />}
      {children}
    </span>
  )
}

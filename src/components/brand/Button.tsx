import * as React from 'react'

/**
 * Props for the brand's primary action control.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `gradient` is the precious hero CTA - one per surface. */
  variant?: 'primary' | 'gradient' | 'accent' | 'secondary' | 'ghost'
  /** Control size. @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** Adjust secondary/ghost styling for dark (Onyx) surfaces. */
  onDark?: boolean
  /** Icon element rendered before the label. */
  iconBefore?: React.ReactNode
  /** Icon element rendered after the label. */
  iconAfter?: React.ReactNode
  /** Render as a different element, e.g. 'a' for links. @default 'button' */
  as?: 'button' | 'a'
  children?: React.ReactNode
}

/**
 * Deepo Button - the brand's primary action control.
 * Pill-shaped, Rubik 600. Reserve `gradient` for one hero CTA per surface.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  onDark = false,
  iconBefore = null,
  iconAfter = null,
  as = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const Tag = as as React.ElementType
  const cls = [
    'dp-btn',
    `dp-btn--${variant}`,
    `dp-btn--${size}`,
    onDark ? 'dp-btn--onDark' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag className={cls} {...rest}>
      {iconBefore}
      {children}
      {iconAfter}
    </Tag>
  )
}

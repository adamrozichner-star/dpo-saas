import * as React from 'react'

/**
 * Props for the content surface container.
 */
export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Surface treatment. `dark` = Onyx + ember-glow monitoring card. */
  variant?: 'default' | 'sunken' | 'flat' | 'dark'
  /** Add hover lift + pointer cursor for clickable cards. */
  interactive?: boolean
  /** Mono eyebrow label above the title. */
  eyebrow?: React.ReactNode
  /** Card title (Rubik 600). */
  title?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Surface container. Light by default; `dark` applies the Onyx + ember-glow
 * monitoring treatment. Optional eyebrow / title / body convenience slots.
 */
export function Card({
  variant = 'default',
  interactive = false,
  eyebrow,
  title,
  children,
  className = '',
  ...rest
}: CardProps) {
  const cls = [
    'dp-card',
    variant !== 'default' ? `dp-card--${variant}` : '',
    interactive ? 'dp-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...rest}>
      {eyebrow && <p className="dp-card__eyebrow">{eyebrow}</p>}
      {title && <h3 className="dp-card__title">{title}</h3>}
      {children && <div className="dp-card__body">{children}</div>}
    </div>
  )
}

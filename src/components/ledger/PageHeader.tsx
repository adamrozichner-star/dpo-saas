import * as React from 'react'

export interface PageHeaderProps {
  /** Mono eyebrow above the title. */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  /** One-line description under the title. */
  description?: React.ReactNode
  /** Right-aligned actions (links / buttons). */
  actions?: React.ReactNode
}

/**
 * The shared console page header: eyebrow + title + optional description, with an
 * optional right-aligned action cluster. One pattern across the five console pages
 * so they read as a single product.
 */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="dp-pagehead">
      <div className="dp-pagehead__text">
        {eyebrow ? <p className="t-eyebrow" style={{ margin: 0 }}>{eyebrow}</p> : null}
        <h1 className="dp-pagehead__title">{title}</h1>
        {description ? <p className="dp-pagehead__desc">{description}</p> : null}
      </div>
      {actions ? <div className="dp-pagehead__actions">{actions}</div> : null}
    </header>
  )
}

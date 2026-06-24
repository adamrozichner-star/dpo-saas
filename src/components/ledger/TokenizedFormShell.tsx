import * as React from 'react'

export interface TokenizedFormShellProps {
  /** Generic form title only (e.g. "שאלון אבטחה"). NEVER the org name. */
  title: string
  children: React.ReactNode
  footerNote?: string
}

/**
 * Zero-chrome layout for no-login sysadmin/vendor forms reached by a tokenized
 * link. The CC-2 seam (E): it exposes NOTHING about the organization - no org
 * name, no compliance score, no nav, no other client data. Only the Deepo
 * platform mark, the passed-in generic title, and the form itself.
 */
export function TokenizedFormShell({ title, children, footerNote }: TokenizedFormShellProps) {
  return (
    <div className="deepo-scope" dir="rtl">
      <div className="dp-tokenform">
        <div className="dp-tokenform__card">
          {/* Deepo platform mark only - not the client's identity. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dp-tokenform__mark" src="/brand/logos/logomark.png" alt="Deepo" />
          <h1 className="dp-tokenform__title">{title}</h1>
          {children}
          {footerNote ? <p className="dp-tokenform__foot">{footerNote}</p> : null}
        </div>
      </div>
    </div>
  )
}

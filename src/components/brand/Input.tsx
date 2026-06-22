import * as React from 'react'

/**
 * Props for the single-line text input.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase mono label rendered above the field. */
  label?: string
  /** Helper text below the field (becomes red when `error`). */
  hint?: string
  /** Error state - red border + risk-colored hint. */
  error?: boolean
}

/**
 * Deepo text input with optional label and hint/error text.
 */
export function Input({ label, hint, error = false, id, className = '', ...rest }: InputProps) {
  const inputId = id || (label ? `dp-${label.replace(/\s+/g, '-')}` : undefined)
  return (
    <div className="dp-field">
      {label && (
        <label className="dp-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={['dp-input', error ? 'dp-input--error' : '', className].filter(Boolean).join(' ')}
        aria-invalid={error || undefined}
        {...rest}
      />
      {hint && <span className={`dp-field__hint ${error ? 'dp-field__hint--error' : ''}`}>{hint}</span>}
    </div>
  )
}

import * as React from 'react'

/**
 * Props for the checkbox.
 */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text rendered after the box. */
  children?: React.ReactNode
}

/**
 * Checkbox with the warm crimson checked state.
 */
export function Checkbox({ checked, defaultChecked, onChange, disabled, children, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={['dp-check', disabled ? 'dp-check--disabled' : '', className].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="dp-check__box">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.2 3.2L13 4.5" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children && <span>{children}</span>}
    </label>
  )
}

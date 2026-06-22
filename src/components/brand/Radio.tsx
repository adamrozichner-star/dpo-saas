import * as React from 'react'

/**
 * Props for the radio button.
 */
export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shared group name - radios with the same name are mutually exclusive. */
  name?: string
  /** Label text rendered after the dot. */
  children?: React.ReactNode
}

/**
 * Radio button - group several by sharing the same `name`.
 */
export function Radio({ checked, defaultChecked, onChange, disabled, name, children, className = '', ...rest }: RadioProps) {
  return (
    <label className={['dp-radio', disabled ? 'dp-radio--disabled' : '', className].filter(Boolean).join(' ')}>
      <input
        type="radio"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="dp-radio__box">
        <span className="dp-radio__dot" />
      </span>
      {children && <span>{children}</span>}
    </label>
  )
}

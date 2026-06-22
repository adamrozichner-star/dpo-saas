import * as React from 'react'

/**
 * Props for the on/off toggle switch.
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Controlled checked state. */
  checked?: boolean
  /** Label text rendered after the switch. */
  children?: React.ReactNode
}

/**
 * On/off toggle switch with the warm crimson active state.
 */
export function Switch({ checked, defaultChecked, onChange, disabled, children, className = '', ...rest }: SwitchProps) {
  return (
    <label className={['dp-switch', disabled ? 'dp-switch--disabled' : '', className].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="dp-switch__track">
        <span className="dp-switch__thumb" />
      </span>
      {children && <span>{children}</span>}
    </label>
  )
}

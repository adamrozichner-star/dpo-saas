import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text rendered after the box. */
  children?: React.ReactNode;
}

/** Checkbox with the warm crimson checked state. */
export function Checkbox(props: CheckboxProps): JSX.Element;

import * as React from 'react';

/**
 * Props for the on/off toggle switch.
 * @startingPoint section="Forms" subtitle="Switch, checkbox & radio controls" viewport="700x260"
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Controlled checked state. */
  checked?: boolean;
  /** Label text rendered after the switch. */
  children?: React.ReactNode;
}

/**
 * On/off toggle switch with the warm crimson active state.
 */
export function Switch(props: SwitchProps): JSX.Element;

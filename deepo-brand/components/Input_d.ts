import * as React from 'react';

/**
 * Props for the single-line text input.
 * @startingPoint section="Forms" subtitle="Labeled text input with hint & error" viewport="700x240"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase mono label rendered above the field. */
  label?: string;
  /** Helper text below the field (becomes red when `error`). */
  hint?: string;
  /** Error state — red border + risk-colored hint. */
  error?: boolean;
}

/**
 * Single-line text input with label, hint and error states.
 */
export function Input(props: InputProps): JSX.Element;

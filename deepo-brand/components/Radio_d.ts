import * as React from 'react';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shared group name — radios with the same name are mutually exclusive. */
  name?: string;
  /** Label text rendered after the dot. */
  children?: React.ReactNode;
}

/** Radio button; group several by sharing the same `name`. */
export function Radio(props: RadioProps): JSX.Element;

import * as React from 'react';

/**
 * Props for the brand's primary action control.
 * @startingPoint section="Forms" subtitle="Primary, accent, secondary & ghost buttons" viewport="700x220"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `gradient` is the precious hero CTA — one per surface. */
  variant?: 'primary' | 'gradient' | 'accent' | 'secondary' | 'ghost';
  /** Control size. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Adjust secondary/ghost styling for dark (Onyx) surfaces. */
  onDark?: boolean;
  /** Icon element rendered before the label. */
  iconBefore?: React.ReactNode;
  /** Icon element rendered after the label. */
  iconAfter?: React.ReactNode;
  /** Render as a different element, e.g. 'a' for links. @default 'button' */
  as?: 'button' | 'a';
  children?: React.ReactNode;
}

/**
 * The brand's primary action control: pill-shaped, Rubik 600, warm crimson.
 */
export function Button(props: ButtonProps): JSX.Element;

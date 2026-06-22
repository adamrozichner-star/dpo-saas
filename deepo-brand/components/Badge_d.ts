import * as React from 'react';

/**
 * Props for the status / label chip.
 * @startingPoint section="Feedback" subtitle="Status, brand & neutral chips" viewport="700x200"
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color intent. Status colors map to the confident status palette. */
  variant?: 'ok' | 'warn' | 'risk' | 'info' | 'brand' | 'neutral' | 'solid';
  /** Show a leading status dot in the current color. */
  dot?: boolean;
  /** Use a small square radius instead of a full pill. */
  square?: boolean;
  children?: React.ReactNode;
}

/**
 * Compact status or label chip in the warm Deepo palette.
 */
export function Badge(props: BadgeProps): JSX.Element;

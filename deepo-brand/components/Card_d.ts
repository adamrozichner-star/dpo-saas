import * as React from 'react';

/**
 * Props for the content surface container.
 * @startingPoint section="Surfaces" subtitle="Light & dark ember-glow cards" viewport="700x240"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface treatment. `dark` = Onyx + ember-glow monitoring card. */
  variant?: 'default' | 'sunken' | 'flat' | 'dark';
  /** Add hover lift + pointer cursor for clickable cards. */
  interactive?: boolean;
  /** Mono eyebrow label above the title. */
  eyebrow?: React.ReactNode;
  /** Card title (Rubik 600). */
  title?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Content surface with light and Onyx (dark, ember-glow) treatments.
 */
export function Card(props: CardProps): JSX.Element;

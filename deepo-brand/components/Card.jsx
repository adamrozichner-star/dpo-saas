import React from 'react';

const CSS = `
.dp-card{
  background: var(--bg-surface); border: 1px solid var(--border-1);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-lift-2);
  padding: 24px; font-family: var(--font-body); color: var(--fg-1);
  transition: box-shadow var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
}
.dp-card--sunken{ background: var(--bg-sunken); box-shadow: none; border-color: var(--border-2); }
.dp-card--flat{ box-shadow: none; }
.dp-card--interactive{ cursor: pointer; }
.dp-card--interactive:hover{ box-shadow: var(--shadow-lift-3); transform: translateY(-2px); }

/* Dark monitoring card — Onyx with ember glow rising from a corner */
.dp-card--dark{
  background: #1A1108; border-color: var(--border-on-dark); color: var(--fg-on-dark-1);
  position: relative; overflow: hidden;
}
.dp-card--dark::before{
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 70% 80% at 100% 120%,
    rgba(209,3,49,0.45) 0%, rgba(244,39,31,0.22) 34%, rgba(255,157,33,0.12) 56%, transparent 78%);
}
.dp-card--dark > *{ position: relative; }

.dp-card__eyebrow{ font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--crimson-500); margin: 0 0 8px; }
.dp-card--dark .dp-card__eyebrow{ color: var(--amber-400); }
.dp-card__title{ font-family: var(--font-display); font-weight: 600; font-size: 19px;
  line-height: 1.3; margin: 0; color: inherit; }
.dp-card__body{ font-size: 14px; line-height: 1.6; color: var(--fg-2); margin: 8px 0 0; }
.dp-card--dark .dp-card__body{ color: var(--garnet-300); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'card');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Surface container. Light by default; `dark` applies the Onyx + ember-glow
 * monitoring treatment. Optional eyebrow / title / body convenience slots.
 */
export function Card({
  variant = 'default',
  interactive = false,
  eyebrow,
  title,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = [
    'dp-card',
    variant !== 'default' ? `dp-card--${variant}` : '',
    interactive ? 'dp-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      {eyebrow && <p className="dp-card__eyebrow">{eyebrow}</p>}
      {title && <h3 className="dp-card__title">{title}</h3>}
      {children && <div className="dp-card__body">{children}</div>}
    </div>
  );
}

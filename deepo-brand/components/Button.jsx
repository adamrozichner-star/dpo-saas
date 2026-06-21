import React from 'react';

const CSS = `
.dp-btn{
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.005em;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; white-space: nowrap; text-decoration: none;
  transition: transform var(--dur-1) var(--ease-out), box-shadow var(--dur-2) var(--ease-out),
              background var(--dur-2) var(--ease-out), border-color var(--dur-2) var(--ease-out);
}
.dp-btn:focus-visible{ outline: none; box-shadow: var(--shadow-halo); }
.dp-btn:active{ transform: translateY(0.5px); }
.dp-btn[disabled]{ opacity: 0.45; cursor: not-allowed; pointer-events: none; }

/* sizes */
.dp-btn--sm{ font-size: 13px; padding: 7px 14px; }
.dp-btn--md{ font-size: 15px; padding: 10px 20px; }
.dp-btn--lg{ font-size: 17px; padding: 13px 26px; }

/* variants */
.dp-btn--primary{ background: var(--crimson-500); color: #fff; box-shadow: var(--shadow-lift-1); }
.dp-btn--primary:hover{ background: var(--crimson-600); box-shadow: var(--shadow-lift-2); }

.dp-btn--gradient{ background: var(--brand-gradient); color: #fff; box-shadow: var(--shadow-lift-2); }
.dp-btn--gradient:hover{ box-shadow: var(--shadow-lift-3); transform: translateY(-1px); }

.dp-btn--accent{ background: var(--amber-500); color: var(--garnet-1000); box-shadow: var(--shadow-lift-1); }
.dp-btn--accent:hover{ background: var(--amber-400); box-shadow: var(--shadow-lift-2); }

.dp-btn--secondary{ background: #fff; color: var(--fg-1); border-color: var(--border-2); }
.dp-btn--secondary:hover{ border-color: var(--stone-400); background: var(--sand-50); }

.dp-btn--ghost{ background: transparent; color: var(--fg-accent); }
.dp-btn--ghost:hover{ background: var(--crimson-50); }

/* on dark surfaces */
.dp-btn--onDark.dp-btn--secondary{ background: transparent; color: var(--fg-on-dark-1); border-color: var(--border-on-dark); }
.dp-btn--onDark.dp-btn--secondary:hover{ background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.25); }
.dp-btn--onDark.dp-btn--ghost{ color: var(--amber-400); }
.dp-btn--onDark.dp-btn--ghost:hover{ background: rgba(255,255,255,0.06); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'button');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Deepo Button — the brand's primary action control.
 * Pill-shaped, Rubik 600. Reserve `gradient` for one hero CTA per surface.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  onDark = false,
  iconBefore = null,
  iconAfter = null,
  as = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const Tag = as;
  const cls = [
    'dp-btn',
    `dp-btn--${variant}`,
    `dp-btn--${size}`,
    onDark ? 'dp-btn--onDark' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...rest}>
      {iconBefore}
      {children}
      {iconAfter}
    </Tag>
  );
}

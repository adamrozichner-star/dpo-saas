import React from 'react';

const CSS = `
.dp-badge{
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-weight: 600; font-size: 11px;
  letter-spacing: 0.04em; line-height: 1; white-space: nowrap;
  padding: 5px 10px; border-radius: var(--radius-pill); border: 1px solid transparent;
}
.dp-badge--square{ border-radius: var(--radius-xs); }
.dp-badge .dp-badge__dot{ width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.dp-badge--ok{ background: var(--status-ok-bg); color: var(--status-ok); }
.dp-badge--warn{ background: var(--status-warn-bg); color: var(--status-warn); }
.dp-badge--risk{ background: var(--status-risk-bg); color: var(--status-risk); }
.dp-badge--info{ background: var(--status-info-bg); color: var(--status-info); }
.dp-badge--brand{ background: var(--crimson-100); color: var(--crimson-600); }
.dp-badge--neutral{ background: var(--sand-200); color: var(--stone-600); border-color: var(--sand-300); }
.dp-badge--solid{ background: var(--crimson-500); color: #fff; }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'badge');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Compact status / label chip. Status state communicated by color + optional dot.
 */
export function Badge({
  variant = 'neutral',
  dot = false,
  square = false,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = [
    'dp-badge',
    `dp-badge--${variant}`,
    square ? 'dp-badge--square' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="dp-badge__dot" />}
      {children}
    </span>
  );
}

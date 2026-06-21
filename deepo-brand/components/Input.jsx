import React from 'react';

const CSS = `
.dp-field{ display: flex; flex-direction: column; gap: 6px; font-family: var(--font-body); }
.dp-field__label{ font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-2); }
.dp-input{
  font-family: var(--font-body); font-size: 15px; color: var(--fg-1);
  background: #fff; border: 1px solid var(--border-2); border-radius: var(--radius-md);
  padding: 10px 14px; width: 100%; box-sizing: border-box;
  transition: border-color var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out);
}
.dp-input::placeholder{ color: var(--stone-300); }
.dp-input:hover{ border-color: var(--stone-400); }
.dp-input:focus{ outline: none; border-color: var(--crimson-500); box-shadow: var(--shadow-halo); }
.dp-input[disabled]{ background: var(--sand-200); color: var(--stone-400); cursor: not-allowed; }
.dp-input--error{ border-color: var(--status-risk); }
.dp-input--error:focus{ box-shadow: 0 0 0 4px var(--status-risk-bg); }
.dp-field__hint{ font-size: 12px; color: var(--fg-3); }
.dp-field__hint--error{ color: var(--status-risk); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'input');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Deepo text input with optional label and hint/error text.
 */
export function Input({
  label,
  hint,
  error = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const inputId = id || (label ? `dp-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="dp-field">
      {label && <label className="dp-field__label" htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={['dp-input', error ? 'dp-input--error' : '', className].filter(Boolean).join(' ')}
        aria-invalid={error || undefined}
        {...rest}
      />
      {hint && <span className={`dp-field__hint ${error ? 'dp-field__hint--error' : ''}`}>{hint}</span>}
    </div>
  );
}

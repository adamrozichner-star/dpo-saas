import React from 'react';

const CSS = `
.dp-check{ display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
  font-family: var(--font-body); font-size: 14px; color: var(--fg-1); user-select: none; }
.dp-check input{ position: absolute; opacity: 0; width: 0; height: 0; }
.dp-check__box{
  width: 20px; height: 20px; border-radius: var(--radius-xs); flex: none;
  background: #fff; border: 1.5px solid var(--border-2);
  display: grid; place-items: center;
  transition: background var(--dur-2) var(--ease-out), border-color var(--dur-2) var(--ease-out);
}
.dp-check--radio .dp-check__box{ border-radius: 50%; }
.dp-check__box svg{ width: 13px; height: 13px; opacity: 0; transform: scale(0.6);
  transition: opacity var(--dur-1) var(--ease-out), transform var(--dur-1) var(--ease-out); }
.dp-check__dot{ width: 9px; height: 9px; border-radius: 50%; background: #fff;
  opacity: 0; transform: scale(0.4); transition: opacity var(--dur-1) var(--ease-out), transform var(--dur-1) var(--ease-out); }
.dp-check input:checked + .dp-check__box{ background: var(--crimson-500); border-color: var(--crimson-500); }
.dp-check input:checked + .dp-check__box svg{ opacity: 1; transform: scale(1); }
.dp-check input:checked + .dp-check__box .dp-check__dot{ opacity: 1; transform: scale(1); }
.dp-check input:focus-visible + .dp-check__box{ box-shadow: var(--shadow-halo); }
.dp-check input:disabled + .dp-check__box{ opacity: 0.45; }
.dp-check--disabled{ cursor: not-allowed; color: var(--fg-3); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'checkbox');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Checkbox with the warm crimson checked state.
 */
export function Checkbox({ checked, defaultChecked, onChange, disabled, children, className = '', ...rest }) {
  ensureStyles();
  return (
    <label className={['dp-check', disabled ? 'dp-check--disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="checkbox" checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} {...rest} />
      <span className="dp-check__box">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 4.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      {children && <span>{children}</span>}
    </label>
  );
}

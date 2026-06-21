import React from 'react';

const CSS = `
.dp-switch{ display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
  font-family: var(--font-body); font-size: 14px; color: var(--fg-1); user-select: none; }
.dp-switch input{ position: absolute; opacity: 0; width: 0; height: 0; }
.dp-switch__track{
  width: 42px; height: 24px; border-radius: var(--radius-pill);
  background: var(--stone-300); position: relative; flex: none;
  transition: background var(--dur-2) var(--ease-out);
}
.dp-switch__thumb{
  position: absolute; top: 2px; inset-inline-start: 2px; width: 20px; height: 20px;
  border-radius: 50%; background: #fff; box-shadow: var(--shadow-lift-1);
  transition: transform var(--dur-2) var(--ease-out);
}
.dp-switch input:checked + .dp-switch__track{ background: var(--crimson-500); }
.dp-switch input:checked + .dp-switch__track .dp-switch__thumb{ transform: translateX(18px); }
[dir="rtl"] .dp-switch input:checked + .dp-switch__track .dp-switch__thumb{ transform: translateX(-18px); }
.dp-switch input:focus-visible + .dp-switch__track{ box-shadow: var(--shadow-halo); }
.dp-switch input:disabled + .dp-switch__track{ opacity: 0.45; }
.dp-switch--disabled{ cursor: not-allowed; color: var(--fg-3); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'switch');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * On/off toggle switch. Wrap label text as children.
 */
export function Switch({ checked, defaultChecked, onChange, disabled, children, className = '', ...rest }) {
  ensureStyles();
  return (
    <label className={['dp-switch', disabled ? 'dp-switch--disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="checkbox" role="switch" checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} {...rest} />
      <span className="dp-switch__track"><span className="dp-switch__thumb" /></span>
      {children && <span>{children}</span>}
    </label>
  );
}

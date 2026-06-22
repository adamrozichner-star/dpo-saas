import React from 'react';

const CSS = `
.dp-radio{ display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
  font-family: var(--font-body); font-size: 14px; color: var(--fg-1); user-select: none; }
.dp-radio input{ position: absolute; opacity: 0; width: 0; height: 0; }
.dp-radio__box{
  width: 20px; height: 20px; border-radius: 50%; flex: none;
  background: #fff; border: 1.5px solid var(--border-2);
  display: grid; place-items: center;
  transition: border-color var(--dur-2) var(--ease-out);
}
.dp-radio__dot{ width: 10px; height: 10px; border-radius: 50%; background: var(--crimson-500);
  opacity: 0; transform: scale(0.4); transition: opacity var(--dur-1) var(--ease-out), transform var(--dur-1) var(--ease-out); }
.dp-radio input:checked + .dp-radio__box{ border-color: var(--crimson-500); }
.dp-radio input:checked + .dp-radio__box .dp-radio__dot{ opacity: 1; transform: scale(1); }
.dp-radio input:focus-visible + .dp-radio__box{ box-shadow: var(--shadow-halo); }
.dp-radio input:disabled + .dp-radio__box{ opacity: 0.45; }
.dp-radio--disabled{ cursor: not-allowed; color: var(--fg-3); }
`;

let injected = false;
function ensureStyles() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-dp', 'radio');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Radio button — group several by sharing the same `name`.
 */
export function Radio({ checked, defaultChecked, onChange, disabled, name, children, className = '', ...rest }) {
  ensureStyles();
  return (
    <label className={['dp-radio', disabled ? 'dp-radio--disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="radio" name={name} checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} {...rest} />
      <span className="dp-radio__box"><span className="dp-radio__dot" /></span>
      {children && <span>{children}</span>}
    </label>
  );
}

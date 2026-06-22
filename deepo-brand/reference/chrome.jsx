// Deepo product kit — app chrome: Sidebar + Topbar + tiny shared primitives.
// Exported to window for the other screen scripts.

function Icon({ id, className = '', style }) {
  return <svg className={`dpi ${className}`} style={style}><use href={`#${id}`}></use></svg>;
}

function Chip({ kind = 'neutral', dot = false, children }) {
  return <span className={`chip chip-${kind}`}>{dot && <span className="d" />}{children}</span>;
}

function Avatar({ initials, size }) {
  const s = size ? { width: size, height: size, fontSize: size * 0.4 } : null;
  return <span className="avatar" style={s}>{initials}</span>;
}

const NAV = [
  { id: 'dashboard', label: 'לוח בקרה', icon: 'dp-radar' },
  { id: 'vendors', label: 'ספקים', icon: 'dp-link', count: 3 },
  { id: 'tasks', label: 'משימות', icon: 'dp-bell', count: 2 },
  { id: 'documents', label: 'מסמכים', icon: 'dp-doc' },
  { id: 'data', label: 'נכסי מידע', icon: 'dp-database' },
];

function Sidebar({ active, onNavigate }) {
  return (
    <aside className="side">
      <div className="side__brand">
        <img src="../../assets/logo-full.png" alt="Deepo" />
      </div>
      <nav className="side__nav">
        <div className="side__sec">ניהול פרטיות</div>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`navitem ${active === n.id ? 'active' : ''}`}
            onClick={() => onNavigate(n.id)}
          >
            <Icon id={n.icon} />
            <span>{n.label}</span>
            {n.count ? <span className="count">{n.count}</span> : null}
          </button>
        ))}
        <div className="side__sec">חשבון</div>
        <button className={`navitem ${active === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
          <Icon id="dp-lock" /><span>הגדרות ופרטיות</span>
        </button>
      </nav>
      <div className="side__foot">
        <div className="side__user" onClick={() => onNavigate('settings')}>
          <Avatar initials="לה" />
          <span className="meta"><b>מרפאת לב הזהב</b><span>חשבון מורחב</span></span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="search">
        <Icon id="dp-radar" />
        <input placeholder="חיפוש ספק, מסמך או משימה…" />
      </div>
      <button className="iconbtn" title="התראות"><Icon id="dp-bell" /><span className="badge-dot" /></button>
      <button className="iconbtn" title="עזרה"><Icon id="dp-seal" /></button>
    </header>
  );
}

Object.assign(window, { Icon, Chip, Avatar, Sidebar, Topbar, DEEPO_NAV: NAV });

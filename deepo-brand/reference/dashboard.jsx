// Deepo product kit — Dashboard screen.

function ScoreRing({ value }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - value / 100);
  return (
    <div className="score-ring">
      <svg viewBox="0 0 118 118">
        <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="11" />
        <circle cx="59" cy="59" r={r} fill="none" stroke="url(#dpgrad)" strokeWidth="11"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        <defs>
          <linearGradient id="dpgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9B0140" /><stop offset="0.5" stopColor="#F4271F" /><stop offset="1" stopColor="#FF9D21" />
          </linearGradient>
        </defs>
      </svg>
      <span className="num">{value}%</span>
    </div>
  );
}

function Dashboard({ onNavigate }) {
  const feed = [
    { ic: 'dp-link', done: true, html: <><b>נוסף ספק חדש: Calendly.</b> כבר שלחתי להם הסכם עיבוד מידע וסימנתי את זה כמטופל.</>, t: 'לפני 4 דקות' },
    { ic: 'dp-doc', done: true, html: <>עדכנתי את <b>תקנון הפרטיות</b> בהתאם לתיקון 13. כדאי שעורך הדין שלכם יעבור עליו.</>, t: 'לפני שעה' },
    { ic: 'dp-radar', done: false, html: <>זיהיתי <b>2 ספקים</b> שטרם חתמו על הסכם עיבוד מידע. הוספתי אותם למשימות.</>, t: 'היום, 09:14' },
    { ic: 'dp-seal', done: true, html: <>השלמתי את <b>הבקרה הרבעונית</b>. הכל תקין, אין צורך בפעולה מצדכם.</>, t: 'אתמול' },
  ];
  const tasks = [
    { b: 'אישור הסכם עיבוד מידע: Monday.com', s: 'דורש אישור שלכם · עד 14 ביולי' },
    { b: 'מענה לבקשת עיון של לקוח', s: 'התקבלה אתמול · 30 יום למענה' },
  ];
  return (
    <div className="screen">
      <div className="page-head">
        <div className="ph-txt">
          <h2>בוקר טוב, לב הזהב</h2>
          <p>הנה מה שטיפלתי בו עבורכם. הכל מתעדכן ברקע.</p>
        </div>
        <div className="ph-actions">
          <button className="dbtn dbtn-secondary"><Icon id="dp-doc" /> הפקת דוח</button>
          <button className="dbtn dbtn-primary" onClick={() => onNavigate('vendors')}><Icon id="dp-link" /> הוספת ספק</button>
        </div>
      </div>

      <div className="dash-top">
        <div className="score-card">
          <p className="eyebrow">ציון עמידה בדרישות</p>
          <div className="score-row">
            <ScoreRing value={94} />
            <div className="score-meta">
              <b>מוגנים, ועומדים בדרישות</b>
              <p>כל הדרישות המהותיות מטופלות. נותרו 2 פריטים קטנים שממתינים לאישור שלכם.</p>
            </div>
          </div>
          <div className="score-foot">
            <Chip kind="ok" dot>תקנון פעיל</Chip>
            <Chip kind="ok" dot>בקרה מתוזמנת</Chip>
            <Chip kind="warn" dot>2 ממתינים</Chip>
          </div>
        </div>
        <div className="stat-stack">
          <div className="stat-card">
            <span className="si ok"><Icon id="dp-link" /></span>
            <div><div className="sn">24</div><div className="sl">ספקים מנוהלים, כולם עם הסכם עיבוד</div></div>
          </div>
          <div className="stat-card">
            <span className="si warn"><Icon id="dp-bell" /></span>
            <div><div className="sn">2</div><div className="sl">משימות פתוחות שממתינות לכם</div></div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card feed">
          <div className="card-head"><Icon id="dp-radar" className="dpi-lg" style={{ '--dpi-c': 'var(--crimson-500)' }} /><h3>מה דיפו עשתה</h3><span className="link">כל הפעילות</span></div>
          {feed.map((f, i) => (
            <div className="feed__item" key={i}>
              <span className={`feed__ic ${f.done ? 'done' : ''}`}><Icon id={f.done ? 'dp-check' : f.ic} /></span>
              <div className="feed__b"><p>{f.html}</p><time>{f.t}</time></div>
            </div>
          ))}
        </div>
        <div className="card tasklist">
          <div className="card-head"><Icon id="dp-bell" className="dpi-lg" style={{ '--dpi-c': 'var(--crimson-500)' }} /><h3>ממתין לכם</h3><span className="link" onClick={() => onNavigate('tasks')}>לכל המשימות</span></div>
          {tasks.map((t, i) => (
            <div className="taskrow" key={i} onClick={() => onNavigate('tasks')}>
              <span className="tcheck" />
              <div className="tb"><b>{t.b}</b><span>{t.s}</span></div>
              <Icon id="dp-bolt" style={{ fontSize: '18px', '--dpi-c': 'var(--stone-300)' }} />
            </div>
          ))}
          <div className="taskrow" style={{ cursor: 'default' }}>
            <span className="tcheck" style={{ background: 'var(--status-ok-bg)', borderColor: 'var(--status-ok)' }} />
            <div className="tb"><b style={{ color: 'var(--stone-400)', textDecoration: 'line-through' }}>חתימה על נספח אבטחת מידע</b><span>הושלם אתמול</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;

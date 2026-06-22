// Deepo product kit — Vendors, Tasks, and light placeholder screens.

function Vendors({ onNavigate }) {
  const rows = [
    { n: 'Monday.com', t: 'ניהול פרויקטים', logo: 'M', data: 'פרטי עובדים, משימות', dpa: 'ממתין לאישור', st: 'warn', stt: 'בטיפול' },
    { n: 'Google Workspace', t: 'דוא"ל ומסמכים', logo: 'G', data: 'התכתבויות, קבצים', dpa: 'חתום', st: 'ok', stt: 'תקין' },
    { n: 'Calendly', t: 'תיאום פגישות', logo: 'C', data: 'שמות, אימיילים', dpa: 'נשלח היום', st: 'info', stt: 'נשלח' },
    { n: 'Meditab EMR', t: 'תיק רפואי', logo: 'M', data: 'מידע רפואי רגיש', dpa: 'חתום', st: 'ok', stt: 'תקין' },
    { n: 'Mailchimp', t: 'דיוור', logo: 'M', data: 'רשימת תפוצה', dpa: 'חסר הסכם', st: 'risk', stt: 'חשיפה' },
    { n: 'AWS', t: 'אחסון ענן', logo: 'A', data: 'גיבויי מערכת', dpa: 'חתום', st: 'ok', stt: 'תקין' },
  ];
  const signed = rows.filter(r => r.st === 'ok').length;
  const inProg = rows.filter(r => r.st === 'warn' || r.st === 'info').length;
  const risk = rows.filter(r => r.st === 'risk').length;
  return (
    <div className="screen">
      <div className="page-head">
        <div className="ph-txt">
          <h2>ספקים</h2>
          <p>כל גורם חיצוני שנחשף למידע שלכם, והסטטוס של הסכם עיבוד המידע מולו.</p>
        </div>
        <div className="ph-actions">
          <button className="dbtn dbtn-secondary"><Icon id="dp-doc" /> ייצוא רשימה</button>
          <button className="dbtn dbtn-primary"><Icon id="dp-link" /> הוספת ספק</button>
        </div>
      </div>
      <div className="onyx vendors-strip">
        <div className="vs-main">
          <p className="eyebrow">כיסוי הסכמי עיבוד</p>
          <h3>{signed} מתוך {rows.length} ספקים עם הסכם עיבוד חתום.</h3>
        </div>
        <div className="vs-stats">
          <div className="vstat"><span className="vn ok">{signed}</span><span className="vl">חתומים</span></div>
          <div className="vstat"><span className="vn warn">{inProg}</span><span className="vl">בטיפול</span></div>
          <div className="vstat"><span className="vn risk">{risk}</span><span className="vl">בחשיפה</span></div>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="vtable">
          <thead>
            <tr><th>ספק</th><th>סוג מידע</th><th>הסכם עיבוד (DPA)</th><th>סטטוס</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <div className="vendor-cell">
                    <span className="vendor-logo">{r.logo}</span>
                    <span><b>{r.n}</b><span>{r.t}</span></span>
                  </div>
                </td>
                <td>{r.data}</td>
                <td>{r.dpa}</td>
                <td><Chip kind={r.st} dot>{r.stt}</Chip></td>
                <td style={{ textAlign: 'end' }}>
                  <button className="tlink" onClick={() => onNavigate('tasks')}>{r.st === 'risk' ? 'שליחת הסכם' : 'פרטים'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tasks() {
  const [filter, setFilter] = React.useState('open');
  const all = [
    { ic: 'dp-x', tone: 'risk', badge: ['risk', 'דחוף'], h: 'Mailchimp ללא הסכם עיבוד מידע', p: 'הספק נחשף לרשימת התפוצה שלכם ואין מולו הסכם עיבוד. הכנתי טיוטה, צריך רק את האישור שלכם כדי לשלוח.', t: 'זוהה היום', open: true },
    { ic: 'dp-doc', tone: 'warn', badge: ['warn', 'דורש אישור'], h: 'אישור הסכם עיבוד מידע: Monday.com', p: 'Monday.com החזירו הסכם חתום. עברתי עליו, הוא תקין. צריך את האישור שלכם כדי לסגור.', t: 'עד 14 ביולי', open: true },
    { ic: 'dp-bell', tone: 'info', badge: ['info', 'בקשת לקוח'], h: 'בקשת עיון של לקוח (זכות עיון)', p: 'לקוח ביקש לראות איזה מידע אתם מחזיקים עליו. ריכזתי את הנתונים, אפשר לשלוח לאחר בדיקה.', t: '30 יום למענה', open: true },
    { ic: 'dp-check', tone: 'info', badge: ['ok', 'הושלם'], h: 'בקרה רבעונית - Q2 2026', p: 'הבקרה הושלמה. כל הדרישות המהותיות תקינות.', t: 'הושלם אתמול', open: false },
  ];
  const rows = all.filter(t => filter === 'all' ? true : filter === 'open' ? t.open : !t.open);
  const openCount = all.filter(t => t.open).length;
  return (
    <div className="screen">
      <div className="page-head">
        <div className="ph-txt">
          <h2>משימות</h2>
          <p>הדברים שמחכים לכם. טיפלתי בכל מה שיכולתי לבד.</p>
        </div>
        <div className="ph-actions">
          <div className="seg">
            <button className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>פתוחות</button>
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>הכל</button>
            <button className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>הושלמו</button>
          </div>
        </div>
      </div>
      <div className="tasks-wrap">
        <div className="onyx tasks-hero">
          <div className="th-txt">
            <p className="eyebrow">מצב הטיפול</p>
            <h3>טיפלתי היום ב-7 דברים בשבילכם.</h3>
            <p>נשארו <b>{openCount} פריטים</b> שמחכים לאישור שלכם. אחד מהם דחוף.</p>
          </div>
          <div className="th-stat"><div className="thn">{openCount}</div><div className="thl">ממתינים לכם</div></div>
        </div>
        {rows.map((t, i) => (
          <div className="task-card" key={i}>
            <span className={`ti ${t.tone}`}><Icon id={t.ic} /></span>
            <div className="tc">
              <div className="trow"><h3>{t.h}</h3><Chip kind={t.badge[0]}>{t.badge[1]}</Chip><time>{t.t}</time></div>
              <p>{t.p}</p>
              {t.open && (
                <div className="tactions">
                  <button className="dbtn dbtn-primary"><Icon id="dp-check" /> אישור</button>
                  <button className="dbtn dbtn-secondary">פרטים</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyScreen({ icon, title, body, cta }) {
  return (
    <div className="screen">
      <div className="onyx empty-hero">
        <span className="ei"><Icon id={icon} /></span>
        <h3>{title}</h3>
        <p>{body}</p>
        {cta && <button className="dbtn dbtn-grad"><Icon id="dp-sparkle" /> {cta}</button>}
      </div>
    </div>
  );
}

function Documents() {
  return <EmptyScreen icon="dp-doc" title="המסמכים שלכם, במקום אחד" body="תקנון פרטיות, מדיניות, הסכמי עיבוד מידע ונספחי אבטחה. דיפו מייצרת ומעדכנת אותם אוטומטית." cta="יצירת מסמך חדש" />;
}
function DataAssets() {
  return <EmptyScreen icon="dp-database" title="מיפוי נכסי המידע" body="כל מאגרי המידע שלכם, סוגי המידע שבהם והיכן הם נשמרים. הבסיס למרשם פעולות העיבוד (RoPA)." cta="התחלת מיפוי" />;
}
function Settings() {
  return <EmptyScreen icon="dp-lock" title="הגדרות ופרטיות" body="ניהול פרטי העסק, המשתמשים, ההתראות ומסלול המנוי. הכל במקום אחד." cta="עריכת פרטי עסק" />;
}

Object.assign(window, { Vendors, Tasks, Documents, DataAssets, Settings });

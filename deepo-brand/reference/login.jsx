// Deepo product kit — Login screen.

function Login({ onLogin }) {
  return (
    <div className="login">
      <div className="login__brand">
        <img src="../../assets/logo-reverse.png" alt="Deepo" />
        <div className="bq">
          <h2>אתם בעסק.<br /><span className="grad">אנחנו על המשמר.</span></h2>
          <p>היכנסו ללוח הבקרה כדי לראות במה טיפלנו עבורכם היום.</p>
          <div className="bfoot">איתכם בהגנה על הפרטיות</div>
        </div>
      </div>
      <div className="login__form">
        <form className="box" onSubmit={(e) => {e.preventDefault();onLogin();}}>
          <h1>כניסה לחשבון</h1>
          <p className="sub">ברוכים השבים. בואו נראה איפה הדברים עומדים.</p>
          <div className="field">
            <label>אימייל</label>
            <input type="email" defaultValue="office@levhazahav.co.il" dir="ltr" />
          </div>
          <div className="field">
            <label>סיסמה</label>
            <input type="password" defaultValue="privacy" dir="ltr" />
          </div>
          <button type="submit" className="dbtn dbtn-primary full"><Icon id="dp-shield" /> כניסה מאובטחת</button>
          <p className="alt">אין לכם חשבון עדיין? <a onClick={onLogin}>התחילו כאן</a></p>
        </form>
      </div>
    </div>);

}

window.Login = Login;
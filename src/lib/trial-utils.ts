// ============================================
// TRIAL MANAGEMENT UTILITIES
// ============================================

const TRIAL_DAYS = 14;

export function calculateTrialStatus(createdAt: string, trialDays = TRIAL_DAYS) {
  const signupDate = new Date(createdAt);
  const now = new Date();
  const endDate = new Date(signupDate);
  endDate.setDate(endDate.getDate() + trialDays);

  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;
  const isEnding = daysLeft <= 3 && daysLeft > 0;

  return {
    startDate: signupDate,
    endDate,
    daysLeft: Math.max(0, daysLeft),
    isExpired,
    isEnding,
    percentUsed: Math.min(100, Math.round(((trialDays - daysLeft) / trialDays) * 100)),
  };
}

export function getTrialMessage(daysLeft: number): { message: string; type: 'info' | 'warning' | 'danger' } {
  if (daysLeft <= 0) {
    return {
      message: 'תקופת הניסיון הסתיימה. שדרג כדי להמשיך להשתמש ב-MyDPO.',
      type: 'danger',
    };
  }
  if (daysLeft === 1) {
    return {
      message: 'נותר יום אחד לתקופת הניסיון! שדרג עכשיו לפני שהגישה נחסמת.',
      type: 'danger',
    };
  }
  if (daysLeft <= 3) {
    return {
      message: `נותרו ${daysLeft} ימים לתקופת הניסיון. שדרג כדי לשמור על ההגנה.`,
      type: 'warning',
    };
  }
  if (daysLeft <= 7) {
    return {
      message: `נותרו ${daysLeft} ימים לתקופת הניסיון.`,
      type: 'info',
    };
  }
  return {
    message: `נהנה מתקופת הניסיון! נותרו ${daysLeft} ימים.`,
    type: 'info',
  };
}

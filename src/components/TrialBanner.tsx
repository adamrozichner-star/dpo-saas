'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, X, Sparkles } from 'lucide-react';
import { calculateTrialStatus, getTrialMessage } from '@/lib/trial-utils';

// ============================================
// TRIAL BANNER COMPONENT
// ============================================

interface TrialBannerProps {
  createdAt: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  onUpgrade?: () => void;
}

export function TrialBanner({ createdAt, subscriptionStatus, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user dismissed today
    const dismissedDate = localStorage.getItem('trial_banner_dismissed');
    if (dismissedDate === new Date().toDateString()) {
      setDismissed(true);
    }
  }, []);

  if (!mounted) return null;

  // Don't show for active subscribers
  if (subscriptionStatus === 'active') return null;

  // Don't show if dismissed today (except for expired)
  if (dismissed && subscriptionStatus !== 'expired') return null;

  const trial = calculateTrialStatus(createdAt);
  const { message, type } = getTrialMessage(trial.daysLeft);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trial_banner_dismissed', new Date().toDateString());
  };

  const bgColors = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
  };

  const textColors = {
    info: 'text-blue-800',
    warning: 'text-amber-800',
    danger: 'text-red-800',
  };

  const buttonColors = {
    info: 'bg-blue-600 hover:bg-blue-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  const iconColors = {
    info: 'text-blue-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <div className={`${bgColors[type]} border-b px-4 py-3`} dir="rtl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {type === 'danger' ? (
            <AlertTriangle className={`w-5 h-5 ${iconColors[type]} flex-shrink-0`} />
          ) : (
            <Clock className={`w-5 h-5 ${iconColors[type]} flex-shrink-0`} />
          )}
          
          <div className="flex items-center gap-4 flex-1">
            <span className={`${textColors[type]} font-medium`}>{message}</span>
            
            {/* Progress bar for trial */}
            {subscriptionStatus === 'trial' && trial.daysLeft > 0 && (
              <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs">
                <div className="h-2 bg-white/50 rounded-full flex-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      type === 'danger' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${trial.percentUsed}%` }}
                  />
                </div>
                <span className={`text-xs ${textColors[type]}`}>
                  {trial.daysLeft} ימים
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/checkout"
            onClick={(e) => {
              if (onUpgrade) {
                e.preventDefault();
                onUpgrade();
              }
            }}
            className={`${buttonColors[type]} text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors`}
          >
            <Sparkles className="w-4 h-4" />
            שדרג עכשיו
          </a>
          
          {type !== 'danger' && (
            <button
              onClick={handleDismiss}
              className={`${textColors[type]} hover:bg-white/50 p-1 rounded transition-colors`}
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPIRED OVERLAY - Full screen blocker
// ============================================

export function ExpiredOverlay({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          תקופת הניסיון הסתיימה
        </h2>

        <p className="text-slate-600 mb-6">
          כדי להמשיך להשתמש ב-MyDPO ולשמור על הגנת הפרטיות שלך, אנא שדרג לחשבון מלא.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-4xl font-bold text-slate-900">₪500</span>
            <span className="text-slate-500">/חודש</span>
          </div>
          <p className="text-sm text-slate-500">
            כולל DPO ממונה + מערכת מלאה
          </p>
        </div>

        <a
          href="/checkout"
          onClick={(e) => {
            if (onUpgrade) {
              e.preventDefault();
              onUpgrade();
            }
          }}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-colors mb-4"
        >
          שדרג עכשיו
        </a>

        <p className="text-sm text-slate-400">
          יש שאלות? <a href="mailto:support@mydpo.co.il" className="text-blue-600 hover:underline">צור קשר</a>
        </p>
      </div>
    </div>
  );
}

// ============================================
// UPGRADE MODAL
// ============================================

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  daysLeft?: number;
}

export function UpgradeModal({ isOpen, onClose, daysLeft }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              שדרג ל-MyDPO Pro
            </h2>
            {daysLeft !== undefined && daysLeft > 0 && (
              <p className="text-slate-500 mt-1">
                נותרו {daysLeft} ימים לתקופת הניסיון
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white mb-6">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-bold">₪500</span>
            <span className="text-white/80">/חודש</span>
          </div>

          <ul className="space-y-2 text-white/90">
            {[
              'DPO אנושי מוסמך וממונה',
              'מערכת AI ליצירת מסמכים',
              'ניהול אירועי אבטחה 72h',
              'ROPA אוטומטי',
              'Audit trail מלא',
              'תמיכה בעברית',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-green-300">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="/checkout"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-xl font-bold text-lg transition-colors"
        >
          המשך לתשלום
        </a>

        <p className="text-center text-sm text-slate-400 mt-4">
          ביטול בכל עת • ללא התחייבות
        </p>
      </div>
    </div>
  );
}

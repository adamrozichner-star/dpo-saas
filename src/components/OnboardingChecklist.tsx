'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronLeft, Sparkles, FileText, Database, UserCheck, Shield, PartyPopper } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ============================================
// TYPES
// ============================================

interface OnboardingProgress {
  org_setup: boolean;
  first_document: boolean;
  ropa_started: boolean;
  dpo_intro: boolean;
  completed_at: string | null;
}

interface ChecklistItem {
  id: keyof Omit<OnboardingProgress, 'completed_at'>;
  title: string;
  description: string;
  icon: React.ElementType;
  action: string;
  href: string;
}

// ============================================
// ONBOARDING CHECKLIST COMPONENT
// ============================================

export function OnboardingChecklist({ organizationId }: { organizationId: string }) {
  const supabase = createClientComponentClient();
  const [progress, setProgress] = useState<OnboardingProgress>({
    org_setup: true, // Usually done during registration
    first_document: false,
    ropa_started: false,
    dpo_intro: false,
    completed_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'org_setup',
      title: 'הגדרת פרטי הארגון',
      description: 'שם, ענף, גודל וסוג הפעילות',
      icon: Shield,
      action: 'הושלם',
      href: '/dashboard?tab=settings',
    },
    {
      id: 'first_document',
      title: 'יצירת המסמך הראשון',
      description: 'מדיניות פרטיות או נוהל אבטחה',
      icon: FileText,
      action: 'צור מסמך',
      href: '/chat?prompt=צור לי מדיניות פרטיות לארגון שלי',
    },
    {
      id: 'ropa_started',
      title: 'מיפוי מאגרי מידע (ROPA)',
      description: 'תיעוד סוגי המידע שאתם מעבדים',
      icon: Database,
      action: 'התחל מיפוי',
      href: '/dashboard?tab=ropa',
    },
    {
      id: 'dpo_intro',
      title: 'הכרת הממונה שלכם',
      description: 'פרטי הממונה על הגנת הפרטיות',
      icon: UserCheck,
      action: 'צפה בפרטים',
      href: '/dashboard?tab=dpo',
    },
  ];

  // Load progress from database
  useEffect(() => {
    async function loadProgress() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('onboarding_progress')
          .eq('id', organizationId)
          .single();

        if (data?.onboarding_progress) {
          setProgress(data.onboarding_progress);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }

    if (organizationId) {
      loadProgress();
    }
  }, [organizationId, supabase]);

  // Calculate completion
  const completedCount = Object.entries(progress)
    .filter(([key, value]) => key !== 'completed_at' && value === true)
    .length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  // Update progress
  async function markComplete(itemId: keyof Omit<OnboardingProgress, 'completed_at'>) {
    const newProgress = { ...progress, [itemId]: true };
    
    // Check if all complete
    const allComplete = checklistItems.every(item => newProgress[item.id]);
    if (allComplete && !progress.completed_at) {
      newProgress.completed_at = new Date().toISOString();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }

    setProgress(newProgress);

    // Save to database
    try {
      await supabase
        .from('organizations')
        .update({ onboarding_progress: newProgress })
        .eq('id', organizationId);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // If complete, show minimal version
  if (isComplete && progress.completed_at) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-medium text-green-800">הגדרה ראשונית הושלמה! 🎉</p>
            <p className="text-sm text-green-600">הארגון שלך מוגדר ומוכן לפעולה</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Celebration Modal */}
      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">התחל כאן</h3>
              <p className="text-sm text-slate-500">{completedCount} מתוך {totalCount} הושלמו</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">{progressPercent}%</div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklistItems.map((item) => {
            const isItemComplete = progress[item.id];
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isItemComplete
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {/* Status Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isItemComplete ? 'bg-green-500' : 'bg-slate-200'
                }`}>
                  {isItemComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isItemComplete ? 'text-green-600' : 'text-slate-400'}`} />
                    <span className={`font-medium ${isItemComplete ? 'text-green-800' : 'text-slate-700'}`}>
                      {item.title}
                    </span>
                  </div>
                  <p className={`text-sm ${isItemComplete ? 'text-green-600' : 'text-slate-500'}`}>
                    {item.description}
                  </p>
                </div>

                {/* Action Button */}
                {!isItemComplete && (
                  <a
                    href={item.href}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                  >
                    {item.action}
                    <ChevronLeft className="w-4 h-4" />
                  </a>
                )}

                {isItemComplete && (
                  <span className="text-green-600 text-sm font-medium flex-shrink-0">
                    ✓ הושלם
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================
// CELEBRATION MODAL
// ============================================

function CelebrationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-bounce-in"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          מעולה! סיימת את ההגדרה 🎉
        </h2>
        
        <p className="text-slate-600 mb-6">
          הארגון שלך מוגדר ומוכן לפעולה. עכשיו יש לך DPO ממונה וכל הכלים לעמוד בדרישות הרגולציה.
        </p>

        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <p className="text-green-800 font-medium">מה הלאה?</p>
          <p className="text-green-600 text-sm">
            המשך ליצור מסמכים, להוסיף מאגרי מידע, ולשמור על ציות מלא.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          בוא נמשיך!
        </button>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================
// MINI PROGRESS BAR (for sidebar)
// ============================================

export function OnboardingProgressMini({ progress }: { progress: OnboardingProgress }) {
  const completedCount = Object.entries(progress)
    .filter(([key, value]) => key !== 'completed_at' && value === true)
    .length;
  const totalCount = 4;
  const percent = Math.round((completedCount / totalCount) * 100);

  if (percent === 100) return null;

  return (
    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100" dir="rtl">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-blue-700 font-medium">התקדמות ההגדרה</span>
        <span className="text-blue-600">{percent}%</span>
      </div>
      <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// EXPORT: Function to mark items complete
// ============================================

export async function markOnboardingStep(
  supabase: any,
  organizationId: string,
  step: keyof Omit<OnboardingProgress, 'completed_at'>
) {
  try {
    // Get current progress
    const { data } = await supabase
      .from('organizations')
      .select('onboarding_progress')
      .eq('id', organizationId)
      .single();

    const currentProgress = data?.onboarding_progress || {
      org_setup: false,
      first_document: false,
      ropa_started: false,
      dpo_intro: false,
      completed_at: null,
    };

    // Update the step
    const newProgress = { ...currentProgress, [step]: true };

    // Check if all complete
    const allComplete = ['org_setup', 'first_document', 'ropa_started', 'dpo_intro']
      .every(key => newProgress[key]);
    
    if (allComplete && !newProgress.completed_at) {
      newProgress.completed_at = new Date().toISOString();
    }

    // Save
    await supabase
      .from('organizations')
      .update({ onboarding_progress: newProgress })
      .eq('id', organizationId);

    return newProgress;
  } catch (error) {
    console.error('Error marking onboarding step:', error);
    return null;
  }
}

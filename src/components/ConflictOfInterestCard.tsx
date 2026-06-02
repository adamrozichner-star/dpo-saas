'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react'
import {
  DPO_ROLE_OPTIONS,
  DPO_ROLE_LABELS,
  type DpoRoleInOrg,
  type DpoConflictStatus,
} from '@/lib/dpo-conflict'

interface Props {
  orgId: string
  tier: string | null | undefined
  dpoRoleInOrg: DpoRoleInOrg | null | undefined
  conflictStatus: DpoConflictStatus
  supabase: any
  onResolved: () => void
}

async function authFetch(supabase: any, url: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
}

export default function ConflictOfInterestCard({
  orgId,
  tier,
  dpoRoleInOrg,
  conflictStatus,
  supabase,
  onResolved,
}: Props) {
  // Legacy orgs (not_assessed): show a single "answer the question" prompt.
  if (conflictStatus === 'not_assessed') {
    return <LegacyAssessCard supabase={supabase} onResolved={onResolved} />
  }

  // Otherwise: full conflict-unresolved card with 3 resolution paths.
  return (
    <UnresolvedCard
      orgId={orgId}
      tier={tier || 'basic'}
      dpoRoleInOrg={dpoRoleInOrg}
      supabase={supabase}
      onResolved={onResolved}
    />
  )
}

// ═══════════════════════════════════════════════════════
// LEGACY ASSESS CARD — for not_assessed orgs (existing pre-feature)
// ═══════════════════════════════════════════════════════
function LegacyAssessCard({ supabase, onResolved }: { supabase: any; onResolved: () => void }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<DpoRoleInOrg | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(supabase, '/api/dpo-conflict', { action: 'assess', role: selected })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה')
      setModalOpen(false)
      onResolved()
    } catch (e: any) {
      setError(e.message || 'שגיאה')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 mb-4" dir="rtl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              השלימו את הערכת ניגוד העניינים של הממונה
            </h3>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              ממונה הגנת פרטיות לא יכול לשמש במקביל בתפקידים מסוימים. ענו על שאלה אחת כדי שנוודא שאין ניגוד עניינים.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
            >
              ענו על השאלה
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal title="באיזה תפקיד נוסף משמש הממונה בארגון?" onClose={() => setModalOpen(false)}>
          <RolePicker value={selected} onChange={setSelected} />
          {error && <p className="text-xs text-rose-500 mt-3">{error}</p>}
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            onConfirm={submit}
            confirmDisabled={!selected || submitting}
            confirmLabel={submitting ? 'שומר...' : 'שמירה'}
          />
        </Modal>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════
// UNRESOLVED CARD — conflict_unresolved, 3 resolution paths
// ═══════════════════════════════════════════════════════
function UnresolvedCard({
  orgId,
  tier,
  dpoRoleInOrg,
  supabase,
  onResolved,
}: Omit<Props, 'conflictStatus'> & { tier: string }) {
  const [openModal, setOpenModal] = useState<null | 'swap' | 'reassign' | 'acknowledge'>(null)
  const roleLabel = dpoRoleInOrg ? DPO_ROLE_LABELS[dpoRoleInOrg] : 'תפקיד נוסף'

  const isBasic = tier === 'basic'

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 mb-4 shadow-sm" dir="rtl">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              ניגוד עניינים: הממונה משמש בתפקיד שעלול ליצור ניגוד
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              ממונה הגנת פרטיות לא יכול לשמש במקביל בתפקיד <strong>{roleLabel}</strong> לפי חוק הגנת הפרטיות. בחרו אחד מהפתרונות הבאים:
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Button 1 — tier-aware */}
          {isBasic ? (
            <Link href="/subscribe?tier=recommended&reason=conflict" className="block">
              <button className="w-full text-right p-3 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 transition-colors">
                <p className="text-sm font-medium text-stone-800">
                  🟢 שדרגו לחבילה מומלצת — ממונה חיצוני של Deepo
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  ₪1,499/חודש — ממונה מוסמך, ללא ניגוד עניינים
                </p>
              </button>
            </Link>
          ) : (
            <button
              onClick={() => setOpenModal('swap')}
              className="w-full text-right p-3 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 transition-colors"
            >
              <p className="text-sm font-medium text-stone-800">
                🟢 העבירו את התפקיד לממונה חיצוני של Deepo — ללא עלות נוספת
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                החבילה שלכם כוללת ממונה מוסמך זמין
              </p>
            </button>
          )}

          {/* Button 2 — reassign internal */}
          <button
            onClick={() => setOpenModal('reassign')}
            className="w-full text-right p-3 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
          >
            <p className="text-sm font-medium text-stone-800">🔵 מנו אדם אחר בארגון</p>
            <p className="text-xs text-stone-500 mt-0.5">
              העברת תפקיד הממונה לעובד אחר ללא ניגוד עניינים
            </p>
          </button>

          {/* Button 3 — acknowledge */}
          <button
            onClick={() => setOpenModal('acknowledge')}
            className="w-full text-right p-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
          >
            <p className="text-sm font-medium text-stone-800">⚪ אישור והמשך עם תיעוד</p>
            <p className="text-xs text-stone-500 mt-0.5">
              לאשר את הסיכון ולתעד אותו בדוח הרבעוני
            </p>
          </button>
        </div>
      </div>

      {openModal === 'swap' && (
        <SwapToDeepoModal
          supabase={supabase}
          onClose={() => setOpenModal(null)}
          onResolved={() => {
            setOpenModal(null)
            onResolved()
          }}
        />
      )}
      {openModal === 'reassign' && (
        <ReassignModal
          supabase={supabase}
          onClose={() => setOpenModal(null)}
          onResolved={() => {
            setOpenModal(null)
            onResolved()
          }}
        />
      )}
      {openModal === 'acknowledge' && (
        <AcknowledgeModal
          roleLabel={roleLabel}
          supabase={supabase}
          onClose={() => setOpenModal(null)}
          onResolved={() => {
            setOpenModal(null)
            onResolved()
          }}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════
// MODAL PRIMITIVES
// ═══════════════════════════════════════════════════════
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  )
}

function ModalFooter({
  onCancel,
  onConfirm,
  confirmDisabled,
  confirmLabel,
  variant = 'primary',
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
  confirmLabel: string
  variant?: 'primary' | 'warning'
}) {
  const confirmCls =
    variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
      : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'
  return (
    <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-stone-100">
      <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
        ביטול
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={`px-5 py-2 text-sm text-white rounded-lg font-medium disabled:cursor-not-allowed transition-colors ${confirmCls}`}
      >
        {confirmLabel}
      </button>
    </div>
  )
}

function RolePicker({
  value,
  onChange,
}: {
  value: DpoRoleInOrg | null
  onChange: (v: DpoRoleInOrg) => void
}) {
  return (
    <div className="space-y-2">
      {DPO_ROLE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full text-right px-3 py-2 rounded-lg border text-sm transition-colors ${
            value === opt.value
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-stone-200 hover:border-stone-300 text-stone-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// SWAP TO DEEPO MODAL
// ═══════════════════════════════════════════════════════
function SwapToDeepoModal({
  supabase,
  onClose,
  onResolved,
}: {
  supabase: any
  onClose: () => void
  onResolved: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(supabase, '/api/dpo-conflict', { action: 'swap_to_deepo' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה')
      onResolved()
    } catch (e: any) {
      setError(e.message || 'שגיאה')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="העברה לממונה חיצוני של Deepo" onClose={onClose}>
      <p className="text-sm text-stone-600 leading-relaxed mb-3">
        תפקיד הממונה יועבר לעו״ד דנה כהן, ממונה הגנת הפרטיות המוסמכת של Deepo. הפעולה הזו מסירה את ניגוד העניינים מיידית.
      </p>
      <ul className="text-xs text-stone-500 space-y-1 list-disc pr-4 mb-2">
        <li>הממונה החיצוני יתחיל בטיפול שוטף במייל המייד</li>
        <li>כתב המינוי יעודכן אוטומטית</li>
        <li>ללא עלות נוספת — כלול בחבילה שלכם</li>
      </ul>
      {error && <p className="text-xs text-rose-500 mt-3">{error}</p>}
      <ModalFooter
        onCancel={onClose}
        onConfirm={confirm}
        confirmDisabled={submitting}
        confirmLabel={submitting ? 'מבצע...' : 'אישור והעברה'}
      />
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════
// REASSIGN INTERNAL MODAL
// ═══════════════════════════════════════════════════════
function ReassignModal({
  supabase,
  onClose,
  onResolved,
}: {
  supabase: any
  onClose: () => void
  onResolved: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<DpoRoleInOrg | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim() || !email.trim() || !role) {
      setError('נא למלא את כל השדות')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(supabase, '/api/dpo-conflict', {
        action: 'reassign_internal',
        name: name.trim(),
        email: email.trim(),
        role,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'שגיאה')
        return
      }
      onResolved()
    } catch (e: any) {
      setError(e.message || 'שגיאה')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="מינוי אדם אחר בארגון" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-stone-500 block mb-1">שם מלא</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ישראלה ישראלי"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">כתובת מייל</label>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-2">תפקיד בארגון</label>
          <RolePicker value={role} onChange={setRole} />
        </div>
      </div>
      {error && (
        <div className="mt-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      <ModalFooter
        onCancel={onClose}
        onConfirm={submit}
        confirmDisabled={submitting || !name.trim() || !email.trim() || !role}
        confirmLabel={submitting ? 'שומר...' : 'מינוי האדם החדש'}
      />
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════
// ACKNOWLEDGE MODAL
// ═══════════════════════════════════════════════════════
function AcknowledgeModal({
  roleLabel,
  supabase,
  onClose,
  onResolved,
}: {
  roleLabel: string
  supabase: any
  onClose: () => void
  onResolved: () => void
}) {
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!checked) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch(supabase, '/api/dpo-conflict', { action: 'acknowledge' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה')
      onResolved()
    } catch (e: any) {
      setError(e.message || 'שגיאה')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="אישור ניגוד עניינים" onClose={onClose}>
      <div className="space-y-3 text-sm text-stone-700 leading-relaxed">
        <p>
          הממונה הנוכחי משמש גם בתפקיד <strong>{roleLabel}</strong> בארגון — מצב שיוצר ניגוד עניינים לפי תיקון 13 לחוק הגנת הפרטיות.
        </p>
        <p>
          המשך עם ההסדר הנוכחי כרוך בסיכוני ציות הכוללים:
        </p>
        <ul className="text-xs text-stone-600 list-disc pr-4 space-y-1">
          <li>חשיפה רגולטורית במקרה של ביקורת הרשות להגנת הפרטיות</li>
          <li>פגיעה אפשרית באובייקטיביות הטיפול בבקשות נושאי מידע</li>
          <li>הסיכון יתועד בדוח הרבעוני שמופק מהמערכת</li>
        </ul>
        <p>
          Deepo ממליצה למנות ממונה חיצוני להפחתת החשיפה, אך מכבדת את ההחלטה. ניתן לחזור על ההחלטה בכל עת מלשונית הבקרה.
        </p>
      </div>

      <label className="flex items-start gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-indigo-500 focus:ring-indigo-400"
        />
        <span className="text-xs text-stone-700">
          קראתי והבנתי את הסיכון. אני לוקח/ת אחריות על ההחלטה.
        </span>
      </label>

      {error && <p className="text-xs text-rose-500 mt-3">{error}</p>}

      <ModalFooter
        onCancel={onClose}
        onConfirm={submit}
        confirmDisabled={!checked || submitting}
        confirmLabel={submitting ? 'שומר...' : 'אשר והמשך'}
        variant="warning"
      />
    </Modal>
  )
}

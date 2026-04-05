'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, Shield, Send, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

// =============================================
// INCIDENT REPORT TAB
// Add this to the customer dashboard
// =============================================

interface IncidentReportTabProps {
  orgId: string
  incidents: any[]
  onRefresh: () => void
}

export default function IncidentReportTab({ orgId, incidents, onRefresh }: IncidentReportTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null)
  
  // Status update state
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incidentType: 'data_breach',
    severity: 'medium',
    discoveredAt: new Date().toISOString().slice(0, 16),
    dataTypesAffected: [] as string[],
    recordsAffected: '',
    individualsAffected: '',
    reportedByName: '',
    reportedByEmail: '',
    reportedByRole: ''
  })

  const incidentTypes = [
    { value: 'data_breach', label: 'דליפת מידע', icon: '🔓' },
    { value: 'unauthorized_access', label: 'גישה לא מורשית', icon: '🚫' },
    { value: 'ransomware', label: 'כופרה (Ransomware)', icon: '💀' },
    { value: 'phishing', label: 'פישינג', icon: '🎣' },
    { value: 'lost_device', label: 'אובדן/גניבת מכשיר', icon: '📱' },
    { value: 'human_error', label: 'טעות אנוש', icon: '👤' },
    { value: 'system_failure', label: 'כשל מערכתי', icon: '⚙️' },
    { value: 'other', label: 'אחר', icon: '❓' }
  ]

  const dataTypes = [
    { value: 'personal_data', label: 'מידע אישי (שם, כתובת, טלפון)' },
    { value: 'id_numbers', label: 'מספרי זהות' },
    { value: 'financial', label: 'מידע פיננסי (כרטיסי אשראי, חשבונות בנק)' },
    { value: 'health', label: 'מידע רפואי' },
    { value: 'passwords', label: 'סיסמאות' },
    { value: 'biometric', label: 'מידע ביומטרי' },
    { value: 'children', label: 'מידע על קטינים' },
    { value: 'sensitive', label: 'מידע רגיש אחר' }
  ]

  const severityLevels = [
    { value: 'low', label: 'נמוכה', color: 'bg-green-100 text-green-800', description: 'אין חשיפה ממשית למידע' },
    { value: 'medium', label: 'בינונית', color: 'bg-yellow-100 text-yellow-800', description: 'חשיפה מוגבלת, ניתן לשליטה' },
    { value: 'high', label: 'גבוהה', color: 'bg-orange-100 text-orange-800', description: 'חשיפה משמעותית של מידע' },
    { value: 'critical', label: 'קריטית', color: 'bg-red-100 text-red-800', description: 'חשיפה נרחבת של מידע רגיש' }
  ]

  const getUrgencyBadge = (urgency: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      overdue: { bg: 'bg-black', text: 'text-white', label: '⚫ חלף המועד!' },
      critical: { bg: 'bg-red-600', text: 'text-white', label: '🔴 קריטי' },
      urgent: { bg: 'bg-orange-500', text: 'text-white', label: '🟠 דחוף' },
      warning: { bg: 'bg-yellow-500', text: 'text-black', label: '🟡 אזהרה' },
      ok: { bg: 'bg-green-500', text: 'text-white', label: '🟢 תקין' },
      notified: { bg: 'bg-blue-500', text: 'text-white', label: '✅ דווח' }
    }
    const badge = badges[urgency] || badges.ok
    return <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-medium`}>{badge.label}</span>
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      reported: '📝 דווח',
      investigating: '🔍 בבדיקה',
      contained: '🛡️ הוכל',
      notified_authority: '📤 דווח לרשות',
      notified_individuals: '👥 נשלחה הודעה לנפגעים',
      resolved: '✅ נפתר',
      closed: '🔒 נסגר'
    }
    return labels[status] || status
  }

  const handleDataTypeToggle = (dataType: string) => {
    setFormData(prev => ({
      ...prev,
      dataTypesAffected: prev.dataTypesAffected.includes(dataType)
        ? prev.dataTypesAffected.filter(t => t !== dataType)
        : [...prev.dataTypesAffected, dataType]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          orgId,
          ...formData,
          recordsAffected: formData.recordsAffected ? parseInt(formData.recordsAffected) : null,
          individualsAffected: formData.individualsAffected ? parseInt(formData.individualsAffected) : null
        })
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setShowForm(false)
          setSubmitted(false)
          setFormData({
            title: '',
            description: '',
            incidentType: 'data_breach',
            severity: 'medium',
            discoveredAt: new Date().toISOString().slice(0, 16),
            dataTypesAffected: [],
            recordsAffected: '',
            individualsAffected: '',
            reportedByName: '',
            reportedByEmail: '',
            reportedByRole: ''
          })
          onRefresh()
        }, 8000)
      } else {
        alert('שגיאה בשליחת הדיווח')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('שגיאה בשליחת הדיווח')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (incidentId: string) => {
    if (!updateStatus) return
    setIsUpdating(true)
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          incidentId,
          status: updateStatus,
          notes: updateNotes || undefined
        })
      })
      if (response.ok) {
        setUpdatingId(null)
        setUpdateStatus('')
        setUpdateNotes('')
        onRefresh()
      } else {
        alert('שגיאה בעדכון הסטטוס')
      }
    } catch (err) {
      console.error('Status update error:', err)
      alert('שגיאה בעדכון')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusFlow = [
    { value: 'investigating', label: 'בבדיקה', icon: '🔍' },
    { value: 'contained', label: 'הוכל', icon: '🛡️' },
    { value: 'notified_authority', label: 'דווח לרשות', icon: '📤' },
    { value: 'notified_individuals', label: 'הודעה לנפגעים', icon: '👥' },
    { value: 'resolved', label: 'נפתר', icon: '✅' },
    { value: 'closed', label: 'נסגר', icon: '🔒' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            אירועי אבטחה
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            דווח על אירועי אבטחה ועקוב אחר הטיפול בהם
          </p>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            דווח על אירוע
          </button>
        )}
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">חובת דיווח תוך 24 שעות</h3>
            <p className="text-sm text-amber-700 mt-1">
              על פי תיקון 13 לחוק הגנת הפרטיות, יש לדווח לרשות להגנת הפרטיות על אירועי אבטחה 
              תוך 24 שעות מרגע הגילוי. דווחו בהקדם כדי לאפשר לממונה לטפל בזמן.
            </p>
          </div>
        </div>
      </div>

      {/* Report Form */}
      {showForm && (
        <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
          <div className="bg-red-600 text-white p-4">
            <h3 className="font-bold text-lg">דיווח על אירוע אבטחה</h3>
            <p className="text-red-100 text-sm">מלא את הפרטים הידועים - ניתן לעדכן בהמשך</p>
          </div>

          {submitted ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700">הדיווח נשלח בהצלחה!</h3>
              <p className="text-gray-600 mt-2">
                הממונה על הגנת הפרטיות יטפל באירוע בהקדם.
                <br />
                תקבל עדכונים במייל על התקדמות הטיפול.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">כותרת האירוע *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="לדוגמה: חשד לדליפת מידע לקוחות"
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">סוג האירוע *</label>
                  <select
                    required
                    value={formData.incidentType}
                    onChange={e => setFormData(prev => ({ ...prev, incidentType: e.target.value }))}
                    className="w-full border rounded-lg p-3"
                  >
                    {incidentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">מתי התגלה האירוע? *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.discoveredAt}
                    onChange={e => setFormData(prev => ({ ...prev, discoveredAt: e.target.value }))}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">תיאור האירוע</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תאר את האירוע, כיצד התגלה, ומה ידוע כרגע..."
                  rows={4}
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium mb-2">הערכת חומרה ראשונית</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {severityLevels.map(level => (
                    <label
                      key={level.value}
                      className={`
                        border rounded-lg p-3 cursor-pointer transition-all
                        ${formData.severity === level.value 
                          ? `${level.color} border-2 border-current` 
                          : 'bg-gray-50 hover:bg-gray-100'}
                      `}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={level.value}
                        checked={formData.severity === level.value}
                        onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                        className="sr-only"
                      />
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs opacity-75">{level.description}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Data Types */}
              <div>
                <label className="block text-sm font-medium mb-2">סוגי מידע שנחשפו (אם ידוע)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {dataTypes.map(type => (
                    <label
                      key={type.value}
                      className={`
                        border rounded-lg p-2 cursor-pointer text-sm transition-all
                        ${formData.dataTypesAffected.includes(type.value)
                          ? 'bg-red-100 border-red-400'
                          : 'bg-gray-50 hover:bg-gray-100'}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={formData.dataTypesAffected.includes(type.value)}
                        onChange={() => handleDataTypeToggle(type.value)}
                        className="ml-2"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Impact Numbers */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">מספר רשומות שנפגעו (הערכה)</label>
                  <input
                    type="number"
                    value={formData.recordsAffected}
                    onChange={e => setFormData(prev => ({ ...prev, recordsAffected: e.target.value }))}
                    placeholder="לדוגמה: 1000"
                    className="w-full border rounded-lg p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">מספר אנשים שנפגעו (הערכה)</label>
                  <input
                    type="number"
                    value={formData.individualsAffected}
                    onChange={e => setFormData(prev => ({ ...prev, individualsAffected: e.target.value }))}
                    placeholder="לדוגמה: 500"
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>

              {/* Reporter Info */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">פרטי המדווח</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">שם מלא</label>
                    <input
                      type="text"
                      value={formData.reportedByName}
                      onChange={e => setFormData(prev => ({ ...prev, reportedByName: e.target.value }))}
                      className="w-full border rounded-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">אימייל</label>
                    <input
                      type="email"
                      value={formData.reportedByEmail}
                      onChange={e => setFormData(prev => ({ ...prev, reportedByEmail: e.target.value }))}
                      className="w-full border rounded-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">תפקיד</label>
                    <input
                      type="text"
                      value={formData.reportedByRole}
                      onChange={e => setFormData(prev => ({ ...prev, reportedByRole: e.target.value }))}
                      placeholder="לדוגמה: מנהל IT"
                      className="w-full border rounded-lg p-3"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      שלח דיווח
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Incidents List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">היסטוריית אירועים</h3>
        
        {incidents.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>לא דווחו אירועי אבטחה</p>
          </div>
        ) : (
          incidents.map((incident: any) => (
            <div key={incident.id} className="bg-white border rounded-lg overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedIncident(
                  expandedIncident === incident.id ? null : incident.id
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getUrgencyBadge(incident.urgency)}
                      <span className="text-sm text-gray-500">
                        {getStatusLabel(incident.status)}
                      </span>
                    </div>
                    <h4 className="font-medium">{incident.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      דווח: {new Date(incident.reported_at).toLocaleDateString('he-IL')}
                      {' | '}
                      נתגלה: {new Date(incident.discovered_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {incident.hours_remaining > 0 && !incident.authority_notified_at && (
                      <div className="text-left">
                        <div className="text-sm text-gray-500">זמן נותר</div>
                        <div className={`font-bold ${incident.hours_remaining < 12 ? 'text-red-600' : 'text-gray-700'}`}>
                          {Math.round(incident.hours_remaining)} שעות
                        </div>
                      </div>
                    )}
                    {expandedIncident === incident.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedIncident === incident.id && (
                <div className="border-t p-4 bg-gray-50 space-y-3">
                  {incident.description && (
                    <div>
                      <label className="text-xs text-gray-500">תיאור:</label>
                      <p className="text-sm">{incident.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="text-xs text-gray-500">סוג:</label>
                      <p>{incidentTypes.find(t => t.value === incident.incident_type)?.label || incident.incident_type}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">חומרה:</label>
                      <p>{severityLevels.find(s => s.value === incident.severity)?.label || incident.severity}</p>
                    </div>
                    {incident.individuals_affected && (
                      <div>
                        <label className="text-xs text-gray-500">נפגעים:</label>
                        <p>{incident.individuals_affected.toLocaleString()}</p>
                      </div>
                    )}
                    {incident.records_affected && (
                      <div>
                        <label className="text-xs text-gray-500">רשומות:</label>
                        <p>{incident.records_affected.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {incident.ai_summary && (
                    <div className="bg-blue-50 rounded p-3 mt-2">
                      <label className="text-xs text-blue-600 font-medium">סיכום AI:</label>
                      <p className="text-sm text-blue-800">{incident.ai_summary}</p>
                    </div>
                  )}

                  {/* Status Update — inline */}
                  {!['resolved', 'closed'].includes(incident.status) && (
                    <div className="border-t pt-3 mt-3">
                      {updatingId === incident.id ? (
                        <div className="bg-white rounded-lg border p-3 space-y-3">
                          <label className="text-xs font-medium text-gray-600">עדכון סטטוס:</label>
                          <div className="flex flex-wrap gap-2">
                            {statusFlow
                              .filter(s => {
                                // Only show statuses that come after current
                                const order = ['new', 'reported', 'investigating', 'contained', 'notified_authority', 'notified_individuals', 'resolved', 'closed']
                                return order.indexOf(s.value) > order.indexOf(incident.status)
                              })
                              .map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => setUpdateStatus(s.value)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                    updateStatus === s.value 
                                      ? 'bg-indigo-100 border-indigo-400 text-indigo-700' 
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {s.icon} {s.label}
                                </button>
                              ))
                            }
                          </div>
                          <textarea
                            value={updateNotes}
                            onChange={e => setUpdateNotes(e.target.value)}
                            placeholder="הערות (אופציונלי)..."
                            rows={2}
                            className="w-full border rounded-lg p-2 text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setUpdatingId(null); setUpdateStatus(''); setUpdateNotes('') }}
                              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                            >
                              ביטול
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(incident.id)}
                              disabled={!updateStatus || isUpdating}
                              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isUpdating ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> מעדכן...</>
                              ) : (
                                '✓ עדכן'
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUpdatingId(incident.id); setUpdateStatus(''); setUpdateNotes('') }}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200"
                        >
                          📝 עדכן סטטוס
                        </button>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="border-t pt-3 mt-3">
                    <label className="text-xs text-gray-500 font-medium">ציר זמן:</label>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        🔍 נתגלה: {new Date(incident.discovered_at).toLocaleString('he-IL')}
                      </span>
                      {incident.contained_at && (
                        <span className="bg-green-100 px-2 py-1 rounded">
                          🛡️ הוכל: {new Date(incident.contained_at).toLocaleString('he-IL')}
                        </span>
                      )}
                      {incident.authority_notified_at && (
                        <span className="bg-blue-100 px-2 py-1 rounded">
                          📤 דווח לרשות: {new Date(incident.authority_notified_at).toLocaleString('he-IL')}
                        </span>
                      )}
                      {incident.resolved_at && (
                        <span className="bg-green-100 px-2 py-1 rounded">
                          ✅ נפתר: {new Date(incident.resolved_at).toLocaleString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

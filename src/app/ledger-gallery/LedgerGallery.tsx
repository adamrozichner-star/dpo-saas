'use client'

import {
  ObligationStatusChip,
  SeverityBadge,
  DocumentLifecycleBadge,
  ObligationRow,
  ObligationCard,
  TaskRow,
  ControlScheduleItem,
  EventTimeline,
  ComplianceScoreDial,
  TokenizedFormShell,
  type ObligationStatus,
  type Severity,
  type DocumentStatus,
  type TimelineEvent,
} from '@/components/ledger'

const OBLIGATION_STATES: ObligationStatus[] = ['unknown', 'checking', 'in_treatment', 'compliant', 'expired']
const SEVERITIES: Severity[] = ['info', 'warning', 'critical']
const DOC_STATES: DocumentStatus[] = ['draft', 'pending_review', 'pending_approval', 'active', 'archived']

const EVENTS: TimelineEvent[] = [
  { entityType: 'obligation', eventType: 'opened', summary: 'נפתחה חובה: רישום מאגר', actor: 'מערכת', at: '2026-06-20T09:00:00Z' },
  { entityType: 'control', eventType: 'scheduled', summary: 'נקבע בקרה שנתית', actor: 'מערכת', at: '2026-06-20T09:01:00Z' },
  { entityType: 'evidence', eventType: 'captured', summary: 'צורפה ראיה: אישור רישום', actor: 'ממונה', at: '2026-06-21T14:30:00Z' },
  { entityType: 'task', eventType: 'completed', summary: 'הושלמה משימה: חתימת ספק', actor: 'בעל עסק', at: '2026-06-22T11:15:00Z' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-10)' }}>
      <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>{title}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>{children}</div>
    </section>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 720 }}>{children}</div>
  )
}

function Showcase() {
  return (
    <>
      <Section title="Obligation status (5 states)">
        {OBLIGATION_STATES.map((s) => (
          <ObligationStatusChip key={s} status={s} />
        ))}
      </Section>
      <Section title="Severity (3)">
        {SEVERITIES.map((s) => (
          <SeverityBadge key={s} severity={s} />
        ))}
      </Section>
      <Section title="Document lifecycle (live enum)">
        {DOC_STATES.map((s) => (
          <DocumentLifecycleBadge key={s} status={s} />
        ))}
      </Section>
      <Section title="Compliance score dial">
        <ComplianceScoreDial score={88} />
        <ComplianceScoreDial score={64} label="ציון" />
        <ComplianceScoreDial score={35} label="ציון" />
      </Section>
      <Section title="Obligation rows">
        <Panel>
          <ObligationRow title="רישום מאגר מעל 100,000 רשומות" status="in_treatment" severity="critical" recursAt="2027-06-23T00:00:00Z" evidenceCount={2} onOpenEvidence={() => {}} />
          <ObligationRow title="הסכמי עיבוד מול ספקים" status="compliant" severity="warning" recursAt="2027-01-10T00:00:00Z" onOpenEvidence={() => {}} />
          <ObligationRow title="שילוט מצלמות אבטחה" status="checking" severity="warning" />
        </Panel>
      </Section>
      <Section title="Control schedule + tasks">
        <Panel>
          <ControlScheduleItem name="בדיקת רישום מאגר שנתית" cadence="annual" nextDueAt="2027-06-23T00:00:00Z" ownerRole="ממונה" status="active" />
          <ControlScheduleItem name="בדיקת מצלמות אבטחה" cadence="biannual" nextDueAt="2026-01-01T00:00:00Z" ownerRole="בעל עסק" status="paused" overdue />
          <TaskRow title="חתימת DPA מול ספק הסליקה" assigneeActor="vendor" status="open" dueAt="2026-07-15T00:00:00Z" />
          <TaskRow title="בדיקת גיבויים ושחזור" assigneeActor="sysadmin" status="in_progress" dueAt="2026-06-10T00:00:00Z" overdue />
          <TaskRow title="אישור מדיניות פרטיות" assigneeActor="owner" status="done" />
        </Panel>
      </Section>
      <Section title="Obligation cards">
        <div style={{ width: 300 }}>
          <ObligationCard title="רישום מאגר מעל 100,000 רשומות" status="in_treatment" severity="critical" sourceRuleId="b1000002-0000-4000-8000-000000000002" sourceVersion={1} recursAt="2027-06-23T00:00:00Z" evidenceCount={2} onOpenEvidence={() => {}} />
        </div>
        <div style={{ width: 300 }}>
          <ObligationCard dark title="זוהתה חשיפה חדשה" status="expired" severity="critical" sourceRuleId="b1000008-0000-4000-8000-000000000008" sourceVersion={1} recursAt="2026-05-01T00:00:00Z" />
        </div>
      </Section>
      <Section title="Event timeline">
        <Panel>
          <EventTimeline events={EVENTS} />
        </Panel>
      </Section>
    </>
  )
}

export function LedgerGallery() {
  return (
    <div className="deepo-scope" dir="rtl" style={{ minHeight: '100vh' }}>
      {/* LIGHT */}
      <div style={{ padding: 'var(--space-10)' }}>
        <p className="t-eyebrow">Deepo v3 ledger components</p>
        <h1 className="t-h1" style={{ marginTop: 'var(--space-2)' }}>Ledger gallery</h1>
        <p style={{ maxWidth: 640 }}>כל רכיבי ה-ledger בתצוגה בהירה וכהה עם נתוני דמו. תצוגת דמו בלבד.</p>
        <Showcase />
      </div>

      {/* DARK */}
      <div className="dp-led-on-dark" style={{ padding: 'var(--space-10)', background: 'var(--garnet-900)', color: 'var(--fg-on-dark-1)' }}>
        <p className="t-eyebrow" style={{ color: 'var(--amber-400)' }}>Onyx surface</p>
        <Showcase />
      </div>

      {/* Tokenized form shell - zero org identity. Boxed so the full-height layout previews inline. */}
      <div style={{ padding: 'var(--space-10)' }}>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Tokenized form shell (no org identity)</p>
        <div data-tokenform-preview style={{ height: 520, overflow: 'hidden', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)' }}>
          <TokenizedFormShell title="שאלון אבטחת מידע" footerNote="טופס מאובטח. הקישור אישי ואינו מזהה את הארגון.">
            <p>אנא השלימו את הפרטים הבאים לגבי מערכות הגיבוי והאבטחה.</p>
          </TokenizedFormShell>
        </div>
      </div>
    </div>
  )
}

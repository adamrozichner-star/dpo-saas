'use client'

// Obligation detail - drill into one obligation: full record, linked control,
// evidence, and event timeline. Auth-gated (redirect to /login) and RLS-scoped:
// the obligation fetch returns null for a cross-org or unknown id, which renders
// a clean not-found state (no leak). Reads only.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { ObligationCard, ControlScheduleItem, EventTimeline, type TimelineEvent } from '@/components/ledger'
import { Card } from '@/components/brand/Card'
import { DeepoIcon } from '@/brand/icons'
import { formatShortDate } from '@/components/ledger/format'
import {
  mapObligationDetail,
  mapControls,
  mapEvents,
  mapEvidence,
  mapSubmissions,
  mapRuleProvenance,
  type ObligationDetailDbRow,
  type ObligationDetailView,
  type ControlDbRow,
  type PlaybookDbRow,
  type EventDbRow,
  type EvidenceDbRow,
  type EvidenceView,
  type SubmissionView,
  type RuleDbRow,
  type RuleProvenanceView,
} from '@/lib/console-data'
import type { ControlScheduleItemProps } from '@/components/ledger'
import { RequestSysadminInfo } from './RequestSysadminInfo'

const TRIGGER_LABEL: Record<string, string> = { gap_rule: 'כלל פערים', manual: 'ידני' }
const EVIDENCE_KIND_LABEL: Record<string, string> = {
  document: 'מסמך',
  answer: 'תשובה',
  attestation: 'הצהרה',
  external_file: 'קובץ חיצוני',
}

interface DetailData {
  obligation: ObligationDetailView
  control: ControlScheduleItemProps | null
  events: TimelineEvent[]
  evidence: EvidenceView[]
  submissions: SubmissionView[]
  provenance: RuleProvenanceView | null
}

export default function ObligationDetailPage({ params }: { params: { id: string } }) {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [data, setData] = useState<DetailData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const { data: ob } = await supabase
        .from('obligations')
        .select('id, title, status, severity, source_rule_id, source_version, recurs_at, description, triggered_by, opened_at, status_changed_at, closed_at, fulfilled_by_control_id')
        .eq('id', params.id)
        .eq('org_id', org.id)
        .maybeSingle()
      if (cancelled) return
      if (!ob) {
        setNotFound(true)
        setLoaded(true)
        return
      }
      const obligation = mapObligationDetail(ob as ObligationDetailDbRow)

      const [ctRes, evtRes, evRes] = await Promise.all([
        obligation.fulfilledByControlId
          ? supabase.from('controls').select('source_playbook_id, source_playbook_version, cadence, next_due_at, owner_role, status').eq('id', obligation.fulfilledByControlId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('events').select('entity_type, event_type, actor, created_at, data').eq('entity_type', 'obligation').eq('entity_id', params.id).order('created_at', { ascending: false }),
        supabase.from('evidence').select('kind, document_id, answer_ref, captured_at, captured_via').eq('obligation_id', params.id),
      ])
      // Submission events live on the task (entity_type='task'); each answer
      // evidence row's answer_ref is its event id. Fetch them by id (RLS-scoped:
      // events_org_select limits to this org) to render the captured Q->A and to
      // merge the submission into the obligation timeline.
      const evidenceRows = (evRes.data ?? []) as EvidenceDbRow[]
      const answerRefs = evidenceRows.map((e) => e.answer_ref).filter((r): r is string => !!r)
      let submissionRows: EventDbRow[] = []
      if (answerRefs.length) {
        const { data: subData } = await supabase
          .from('events')
          .select('entity_type, event_type, actor, created_at, data')
          .in('id', answerRefs)
        submissionRows = (subData ?? []) as EventDbRow[]
      }
      // rule provenance (separate query for the composite key template_id + version)
      let provenance: RuleProvenanceView | null = null
      if (obligation.sourceRuleId && obligation.sourceVersion != null) {
        const { data: rule } = await supabase
          .from('hub_gap_rules')
          .select('name, severity, source_tier, confidence, remediation_text')
          .eq('template_id', obligation.sourceRuleId)
          .eq('version', obligation.sourceVersion)
          .maybeSingle()
        if (rule) provenance = mapRuleProvenance(rule as RuleDbRow)
      }
      // control needs playbook names for the (template_id, version) join
      let control: ControlScheduleItemProps | null = null
      if (ctRes.data) {
        const { data: playbooks } = await supabase.from('hub_control_playbooks').select('template_id, version, name')
        control = mapControls([ctRes.data as ControlDbRow], (playbooks ?? []) as PlaybookDbRow[], new Date().toISOString())[0] ?? null
      }
      if (cancelled) return
      // Merge obligation events + the task-scoped submission events, newest first.
      const mergedEvents = mapEvents([...((evtRes.data ?? []) as EventDbRow[]), ...submissionRows])
        .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      setData({
        obligation,
        control,
        events: mergedEvents,
        evidence: mapEvidence(evidenceRows),
        submissions: mapSubmissions(submissionRows),
        provenance,
      })
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, org, params.id, reloadKey])

  if (authLoading || orgLoading || (!loaded && !notFound)) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (notFound || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Link href="/console" className="dp-led-link">חזרה לקונסולה</Link>
        <p className="t-body">החובה לא נמצאה או שאין לך הרשאה לצפות בה.</p>
      </div>
    )
  }

  const o = data.obligation
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 760 }}>
      <Link href="/console" className="dp-led-link">חזרה לקונסולה</Link>

      <ObligationCard
        title={o.title}
        status={o.status}
        severity={o.severity}
        sourceRuleId={o.sourceRuleId}
        sourceVersion={o.sourceVersion}
        recursAt={o.recursAt}
      />

      <Card title="פרטים">
        <div className="dp-oblig-card__meta">
          {o.description ? <p style={{ margin: 0 }}>{o.description}</p> : null}
          <span className="dp-led-prov">מקור: {o.triggeredBy ? TRIGGER_LABEL[o.triggeredBy] ?? o.triggeredBy : 'לא ידוע'}</span>
          {data.provenance ? (
            <span className="dp-led-prov">
              כלל: {data.provenance.name}
              {data.provenance.sourceTierLabel ? ` · ${data.provenance.sourceTierLabel}` : ''}
              {data.provenance.confidence != null ? ` · ביטחון ${Math.round(data.provenance.confidence * 100)}%` : ''}
            </span>
          ) : null}
          {data.provenance?.remediation ? <p style={{ margin: 0 }}>{data.provenance.remediation}</p> : null}
          <span className="dp-led-recurs"><DeepoIcon id="dp-radar" />נפתח: {formatShortDate(o.openedAt)}</span>
          {o.statusChangedAt ? <span className="dp-led-recurs"><DeepoIcon id="dp-bolt" />שינוי סטטוס: {formatShortDate(o.statusChangedAt)}</span> : null}
          {o.closedAt ? <span className="dp-led-recurs"><DeepoIcon id="dp-check" />נסגר: {formatShortDate(o.closedAt)}</span> : null}
        </div>
      </Card>

      {supabase && org ? (
        <section>
          <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>איסוף מידע</p>
          <RequestSysadminInfo
            supabase={supabase}
            orgId={org.id}
            obligationId={params.id}
            orgName={org.name}
            onCreated={() => setReloadKey((k) => k + 1)}
          />
        </section>
      ) : null}

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>בקרה מקשרת</p>
        {data.control ? <ControlScheduleItem {...data.control} /> : <p className="t-body-sm">אין בקרה מקשרת.</p>}
      </section>

      {data.submissions.length ? (
        <section>
          <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>תשובות שהתקבלו מהסיסטם</p>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {data.submissions.map((sub, i) => (
              <Card key={i}>
                <p className="t-caption" style={{ color: 'var(--fg-3)', marginTop: 0 }}>
                  התקבל: {formatShortDate(sub.at)}{sub.actor ? ` · ${sub.actor}` : ''}
                </p>
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {sub.answers.map((qa, j) => (
                    <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* q and a are UNTRUSTED sysadmin free text - rendered as React
                          text children, which escape automatically (no HTML injection). */}
                      <span className="t-body-sm" style={{ fontWeight: 600 }}>{qa.q}</span>
                      <span className="t-body-sm" style={{ color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}>
                        {qa.a || '(ללא תשובה)'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>ראיות ({data.evidence.length})</p>
        {data.evidence.length ? (
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {data.evidence.map((ev, i) => (
              <div key={i} className="dp-oblig-row">
                <span className="dp-oblig-row__title">{EVIDENCE_KIND_LABEL[ev.kind] ?? ev.kind}</span>
                <span className="dp-led-due">{formatShortDate(ev.capturedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body-sm">אין ראיות עדיין.</p>
        )}
      </section>

      <section>
        <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>אירועים ({data.events.length})</p>
        {data.events.length ? <EventTimeline events={data.events} /> : <p className="t-body-sm">אין אירועים עדיין.</p>}
      </section>
    </div>
  )
}

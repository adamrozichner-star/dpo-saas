# Deepo — Architecture Audit for "Architecture v3"

**Date:** 2026-06-21 · **Scope:** read-only discovery (no DB writes, no migrations, no app changes) · **Project:** `/Users/adamrozi/dpo-saas` (Next.js 14 App Router + Supabase/Postgres).

> This is **discovery only**. No fixes are proposed. Where a fact could not be verified against the live database, it is labelled.

---

## 0. Method & confidence levels

I was asked to run `information_schema` / `pg_class.relacl` queries directly. **That was not possible** and the workaround matters for how you read this report:

- **No direct Postgres connection exists.** No `psql`, no `pg` driver, no `DATABASE_URL`/`POSTGRES_URL` in `.env.local` or in the Vercel project env (confirmed via `vercel env ls production`). The only live DB credential available is the Supabase **service-role JWT**, used through PostgREST.
- **PostgREST cannot reach `information_schema`/`pg_catalog`.** Only `public` and `graphql_public` schemas are exposed (`PGRST106`). No generic `exec_sql`/`run_sql` RPC exists.

So facts carry one of three confidence levels:

| Tag | Meaning | How obtained |
|---|---|---|
| **[LIVE]** | Ground truth from the running production DB | Parsed the live PostgREST **OpenAPI** spec (`GET /rest/v1/`, 390 KB) — encodes every `public` table, column, type, PK (`<pk/>`), FK (`<fk/>`), NOT-NULL; plus direct `HEAD`/`select=*&limit=0` existence probes |
| **[MIGRATION]** | From repo SQL — **may not match production** | `supabase/migrations/*.sql`, `schema.sql`, `messaging_schema.sql` |
| **[CODE]** | Inferred from application code | `src/**` |

**RLS, grants (`relacl`), and `SECURITY DEFINER` ownership could NOT be read from the live DB** (no catalog access). Section 6 is therefore **[MIGRATION]-derived and unverified against production.** Treat it as "what the repo intends," not "what is live."

### The drift problem (read this before trusting any migration)
- **24 of 59 live tables have no `CREATE TABLE` anywhere in the repo** — they were created out-of-band (Supabase SQL editor). The numbered migrations are **not** a faithful picture of production.
- **3 tables defined in repo SQL do not exist live** (probed, HTTP 404): `compliance_tasks`, `document_versions`, `onboarding_answers`.
- Several migrations are explicitly *"apply manually after review"* with a `ROLLBACK`-to-dry-run note — **unknown whether they were applied.**

> A prior sub-investigation concluded tables like `org_compliance_scores`, `consultation_tokens`, `data_recipients`, `compliance_reviews`, `dpo_queue`, `security_incidents`, `work_plans` "don't exist" because they have no repo migration. **That is wrong** — [LIVE] introspection confirms all of them exist in production with real columns. They are *live-real but undocumented in the repo*. This report uses [LIVE] as authoritative.

---

## 1. SCHEMA INVENTORY

**59 base tables in `public`** [LIVE]. `organizations` is the central hub — **51 of 59 tables** chain to `organizations.id` directly or transitively. There is **one schema (`public`)**; no separate tenant schemas.

### 1a. JSONB/JSON columns — what they hold
The schema is **heavily document-oriented**: 30+ jsonb columns, several tables storing whole sub-domains as blobs. This is the "knowledge-base / 7-layer" residue v3 wants to replace with relations.

| Table.column (jsonb) | Holds | v3 concern |
|---|---|---|
| `processing_activities.*` (12 jsonb cols: `data_categories`, `special_categories`, `purposes`, `internal_recipients`, `external_recipients`, `transfer_countries`, `security_measures`, `systems_used`, `storage_locations`, `risk_factors`, `ai_recommendations`, `data_subject_categories`) | The entire RoPA record as blobs | **systems, vendors, data-categories should be relations** |
| `organization_profiles.*` (9 jsonb: `data_types`, `processing_purposes`, `databases`, `third_parties`, `security_measures`, `compliance_checklist`, `compliance_gaps`, `profile_data`) | The org's whole compliance picture; `profile_data` also holds `v3Answers` + `actionOverrides` | **databases, third_parties(=vendors), gaps(=obligations) should be relations** |
| `organizations.{onboarding_progress, data_flow_overrides, feature_flags}` | Wizard state, data-flow edits, per-org flags | feature_flags reasonable; data_flow_overrides is graph-ish (see 1b) |
| `database_scenarios.{databases, regulatory_impact, ai_suggestions, baseline_databases, baseline_impact}` | "What-if" DB optimizer scenarios | databases-as-blob |
| `work_plans.tasks` | Annual plan tasks as a jsonb array, keyed by taskId | **tasks should be relations** |
| `dpia_assessments.{data_categories, risks, controls, action_plan}` | DPIA content | controls/action_plan should be relations |
| `org_facts.fact_value` | **EAV value** (see 1b) | EAV |
| `agent_scratchpad.scratch_value` | **EAV/KV value** (see 1b) | KV |
| `hub_gap_rules.rule_dsl` | Declarative gap-detection rule DSL | the *catalog* of inference rules (never evaluated at runtime — see §5C) |
| `hub_questions.{choices, depends_on}` | Branching questionnaire definition | catalog |
| `hub_control_playbooks.checklist`, `hub_document_templates.variables`, `hub_asset_templates`(template body) | Catalog template bodies | catalog (fine as jsonb) |
| `org_compliance_scores.risk_factors`, `compliance_reviews.{findings, recommendations}`, `dpo_reports.{incidents_summary, recommendations}`, `security_incidents.metadata`, `document_reviews.ai_issues_found`, `dpo_queue.metadata`, `data_recipients.{data_categories_shared, purposes}`, `chat_messages.{attachments, metadata}`, `message_threads.{metadata, pre_screening_messages}`, `agent_runs.{trigger_payload, input, output}`, `audit_logs.details`, `incident_actions.metadata`, `payments.metadata`, `payment_logs.tranzila_response`, `regulatory_documents.metadata`, `calculator_leads.answers` | Findings, AI output, event payloads, metadata | mostly fine as event/AI payloads |

### 1b. Graph-ish / generic key-value / EAV — implies real migration, not additive
| Structure | Table | Why it's a migration problem |
|---|---|---|
| **EAV (entity-attribute-value)** | `org_facts` (`org_id`, `fact_key TEXT`, `fact_value JSONB`, `UNIQUE(org_id,fact_key)`) [MIGRATION 019] | Org compliance facts stored as arbitrary key→json. v3 wants typed entities; every consumer reads `fact_key` strings. Migrating means promoting keys to columns/tables. |
| **EAV/KV** | `agent_scratchpad` (`org_id`, `persona_slug`, `scratch_key`, `scratch_value JSONB`, `UNIQUE(org_id,persona_slug,scratch_key)`) [MIGRATION 019] | Per-agent scratch memory as KV. |
| **KV-ish** | `org_memory` (5 cols, `org_id` FK) [LIVE, no repo migration] | Agent long-term memory; columns unverified (no repo SQL). |
| **Polymorphic edge / adjacency** | `hub_artifact_citations` (`artifact_table TEXT`, `artifact_id UUID`, `artifact_version INT`, `regulatory_section_id → regulatory_sections`) [MIGRATION 023] | **Polymorphic FK** (`artifact_table`+`artifact_id`) — no DB-level referential integrity; app-enforced. This is the closest thing to an "edge table" and is the citation/provenance graph (artifact → regulation). |
| **Embedded graph-as-jsonb** | `organizations.data_flow_overrides` (jsonb) [MIGRATION 009] | Data-flow edges (source→recipient) stored as a jsonb override blob rather than rows. |
| **Vector index** | `regulatory_sections` carries a pgvector embedding column + HNSW index [MIGRATION 030] | Not graph, but note: semantic search infra (`find_similar_section` RPC) lives here. |
| **Self-referential trees** | `agent_runs.parent_run_id → agent_runs.id`; `regulatory_documents.superseded_by → regulatory_documents.id` | Legitimate adjacency (run tree, version chain); low migration risk. |

**No classic 7-layer graph tables** (no `nodes`/`edges`/`layer_*`) exist live — the old graph model is already gone at the storage level; its residue is the jsonb blobs + EAV + the one polymorphic citation table above.

### 1c. Full per-table inventory (columns · types · PK · FK · NOT-NULL · jsonb) — [LIVE]
> ⚠️ marks the 24 tables with **no `CREATE TABLE` in the repo** (live-only; high drift risk).

#### `agent_runs`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| persona_slug | text | Y |  |
| trigger_type | text | Y |  |
| trigger_payload | jsonb |  |  |
| status | text | Y |  |
| input | jsonb | Y |  |
| output | jsonb |  |  |
| error | text |  |  |
| started_at | timestamp with time zone |  |  |
| completed_at | timestamp with time zone |  |  |
| parent_run_id | uuid |  | agent_runs.id |
| inngest_run_id | text |  |  |
| created_at | timestamp with time zone | Y |  |
*jsonb/json:* trigger_payload, input, output

#### `agent_scratchpad`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| persona_slug | text | Y |  |
| scratch_key | text | Y |  |
| scratch_value | jsonb | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
*jsonb/json:* scratch_value

#### `audit_logs`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| action | character varying | Y |  |
| entity_type | character varying |  |  |
| entity_id | uuid |  |  |
| details | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
*jsonb/json:* details

#### `calculator_leads`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| email | character varying | Y |  |
| phone | character varying |  |  |
| company_name | character varying |  |  |
| answers | jsonb |  |  |
| result_status | character varying |  |  |
| source | character varying |  |  |
| utm_source | character varying |  |  |
| utm_medium | character varying |  |  |
| utm_campaign | character varying |  |  |
| converted | boolean |  |  |
| converted_at | timestamp with time zone |  |  |
| notes | text |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* answers

#### `calculator_leads_summary`  (PK: —) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| result_status | character varying |  |  |
| total_leads | bigint |  |  |
| converted_leads | bigint |  |  |
| conversion_rate | numeric |  |  |

#### `cameras`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| name | text | Y |  |
| location | text |  |  |
| model | text |  |  |
| recording_purpose | text |  |  |
| recording_retention_days | integer |  |  |
| data_subject_categories | text[] |  |  |
| requires_signage | boolean | Y |  |
| signage_present | boolean | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| next_review_due_at | timestamp with time zone |  |  |
| notes | text |  |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |

#### `chat_conversation_summaries`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| conversation_id | text | Y |  |
| summary | text | Y |  |
| message_count | integer |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |

#### `chat_messages`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| role | text | Y |  |
| content | text | Y |  |
| intent | text |  |  |
| attachments | jsonb |  |  |
| metadata | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
| conversation_id | text |  |  |
| persona_slug | text |  |  |
*jsonb/json:* attachments, metadata

#### `compliance_reviews`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| review_type | character varying | Y |  |
| status | character varying |  |  |
| findings | jsonb |  |  |
| recommendations | jsonb |  |  |
| score_before | integer |  |  |
| score_after | integer |  |  |
| reviewed_by | uuid |  |  |
| due_date | timestamp with time zone |  |  |
| completed_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* findings, recommendations

#### `consultation_tokens`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| balance | integer |  |  |
| monthly_allocation | integer |  |  |
| last_reset_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |

#### `data_recipients`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| name | text | Y |  |
| type | text |  |  |
| category | text |  |  |
| contact_name | text |  |  |
| contact_email | text |  |  |
| contact_phone | text |  |  |
| address | text |  |  |
| country | text |  |  |
| has_dpa | boolean |  |  |
| dpa_signed_date | date |  |  |
| dpa_expiry_date | date |  |  |
| dpa_document_url | text |  |  |
| data_categories_shared | jsonb |  |  |
| purposes | jsonb |  |  |
| risk_level | text |  |  |
| compliance_verified | boolean |  |  |
| last_audit_date | date |  |  |
| status | text |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* data_categories_shared, purposes

#### `data_subject_requests`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| request_number | character varying | Y |  |
| request_type | public.request_type | Y |  |
| status | public.request_status |  |  |
| requester_name | character varying | Y |  |
| requester_id | character varying | Y |  |
| requester_email | character varying | Y |  |
| requester_phone | character varying |  |  |
| details | text |  |  |
| response | text |  |  |
| responded_at | timestamp with time zone |  |  |
| responded_by | character varying |  |  |
| deadline | timestamp with time zone | Y |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |

#### `database_scenarios`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| name | character varying | Y |  |
| description | text |  |  |
| databases | jsonb | Y |  |
| regulatory_impact | jsonb |  |  |
| ai_suggestions | jsonb |  |  |
| created_by | character varying |  |  |
| is_applied | boolean |  |  |
| applied_at | timestamp with time zone |  |  |
| baseline_databases | jsonb |  |  |
| baseline_impact | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* databases, regulatory_impact, ai_suggestions, baseline_databases, baseline_impact

#### `document_reviews`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| user_id | uuid |  | users.id |
| original_filename | character varying | Y |  |
| original_file_url | text |  |  |
| original_file_type | character varying |  |  |
| original_content | text |  |  |
| ai_review_status | character varying |  |  |
| ai_review_summary | text |  |  |
| ai_issues_found | jsonb |  |  |
| ai_risk_score | integer |  |  |
| ai_reviewed_at | timestamp with time zone |  |  |
| dpo_review_requested | boolean |  |  |
| dpo_review_status | character varying |  |  |
| dpo_review_price | numeric |  |  |
| dpo_reviewer_id | uuid |  |  |
| dpo_notes | text |  |  |
| dpo_reviewed_at | timestamp with time zone |  |  |
| reviewed_file_url | text |  |  |
| reviewed_content | text |  |  |
| review_type | character varying |  |  |
| urgency | character varying |  |  |
| status | character varying |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* ai_issues_found

#### `documents`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| type | text | Y |  |
| title | character varying | Y |  |
| content | text |  |  |
| version | integer |  |  |
| status | text |  |  |
| generated_by | character varying |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
| source | text |  |  |

#### `dpia_assessments`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| activity_name | text | Y |  |
| activity_id | text |  |  |
| description | text |  |  |
| legal_basis | text |  |  |
| data_categories | jsonb |  |  |
| risks | jsonb |  |  |
| controls | jsonb |  |  |
| residual_score | integer |  |  |
| risk_level | text |  |  |
| action_plan | jsonb |  |  |
| status | text |  |  |
| approved_by | text |  |  |
| approved_at | timestamp with time zone |  |  |
| next_review_date | date |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* data_categories, risks, controls, action_plan

#### `dpo_queue`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| type | text | Y |  |
| priority | text | Y |  |
| status | text | Y |  |
| title | text | Y |  |
| description | text |  |  |
| ai_summary | text |  |  |
| ai_recommendation | text |  |  |
| ai_draft_response | text |  |  |
| ai_confidence | double precision |  |  |
| ai_risk_score | double precision |  |  |
| ai_analyzed_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| deadline_at | timestamp with time zone |  |  |
| sla_hours | integer |  |  |
| resolved_at | timestamp with time zone |  |  |
| resolved_by | uuid |  |  |
| resolution_type | text |  |  |
| resolution_notes | text |  |  |
| resolution_response | text |  |  |
| time_spent_seconds | integer |  |  |
| related_thread_id | uuid |  |  |
| related_dsr_id | uuid |  |  |
| related_document_id | uuid |  |  |
| metadata | jsonb |  |  |
*jsonb/json:* metadata

#### `dpo_reports`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| report_period | text | Y |  |
| period_start | date | Y |  |
| period_end | date | Y |  |
| status | text | Y |  |
| executive_summary | text |  |  |
| compliance_score_start | integer |  |  |
| compliance_score_end | integer |  |  |
| incidents_count | integer |  |  |
| incidents_summary | jsonb |  |  |
| findings_open | integer |  |  |
| findings_resolved | integer |  |  |
| dpia_count | integer |  |  |
| dpia_high_risk | integer |  |  |
| rights_requests_count | integer |  |  |
| documents_updated | integer |  |  |
| recommendations | jsonb |  |  |
| approved_by | text |  |  |
| approved_at | timestamp with time zone |  |  |
| submitted_to_name | text |  |  |
| submitted_to_role | text |  |  |
| submitted_to_email | text |  |  |
| submitted_at | timestamp with time zone |  |  |
| acknowledgment_received | boolean |  |  |
| acknowledgment_date | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* incidents_summary, recommendations

#### `dpo_sessions`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| token | text | Y |  |
| expires_at | timestamp with time zone | Y |  |
| created_at | timestamp with time zone |  |  |

#### `dpo_settings`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| dpo_user_id | uuid |  |  |
| dpo_name | text |  |  |
| dpo_email | text |  |  |
| dpo_phone | text |  |  |
| dpo_license_number | text |  |  |
| auto_escalate_confidence_threshold | double precision |  |  |
| auto_approve_confidence_threshold | double precision |  |  |
| sla_critical_hours | integer |  |  |
| sla_high_hours | integer |  |  |
| sla_medium_hours | integer |  |  |
| sla_low_hours | integer |  |  |
| email_notifications | boolean |  |  |
| sms_notifications | boolean |  |  |
| daily_digest | boolean |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |

#### `dpo_time_log`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| queue_item_id | uuid |  | dpo_queue.id |
| dpo_user_id | uuid |  |  |
| action | text | Y |  |
| description | text |  |  |
| duration_seconds | integer | Y |  |
| created_at | timestamp with time zone |  |  |

#### `dpos`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| name | character varying | Y |  |
| email | character varying | Y |  |
| license_number | character varying | Y |  |
| max_clients | integer |  |  |
| active_clients | integer |  |  |
| created_at | timestamp with time zone |  |  |
| auth_user_id | uuid |  |  |

#### `escalations`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| type | public.escalation_type |  |  |
| priority | public.escalation_priority |  |  |
| subject | character varying | Y |  |
| description | text |  |  |
| status | public.escalation_status |  |  |
| dpo_time_minutes | integer |  |  |
| resolution | text |  |  |
| created_at | timestamp with time zone |  |  |
| resolved_at | timestamp with time zone |  |  |

#### `hub_artifact_citations`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| artifact_table | text | Y |  |
| artifact_id | uuid | Y |  |
| artifact_version | integer | Y |  |
| regulatory_section_id | uuid | Y | regulatory_sections.id |
| note | text |  |  |
| created_by | uuid |  | users.id |
| created_at | timestamp with time zone | Y |  |

#### `hub_asset_templates`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| slug | text | Y |  |
| name | text | Y |  |
| definition | text | Y |  |
| icon_name | text |  |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| notes | text |  |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |

#### `hub_continuation_services`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| name | text | Y |  |
| description | text | Y |  |
| price_model | text |  |  |
| estimated_price_text | text |  |  |
| service_kind | text | Y |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |

#### `hub_control_playbooks`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| asset_template_id | uuid | Y |  |
| name | text | Y |  |
| description | text | Y |  |
| cadence | text | Y |  |
| owner_role | text |  |  |
| checklist | jsonb | Y |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |
*jsonb/json:* checklist

#### `hub_document_templates`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| asset_template_id | uuid | Y |  |
| name | text | Y |  |
| description | text |  |  |
| body | text | Y |  |
| variables | jsonb | Y |  |
| output_format | text | Y |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |
*jsonb/json:* variables

#### `hub_gap_rules`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| asset_template_id | uuid | Y |  |
| name | text | Y |  |
| description | text | Y |  |
| severity | text | Y |  |
| rule_dsl | jsonb | Y |  |
| remediation_text | text |  |  |
| continuation_service_ids | uuid[] | Y |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |
*jsonb/json:* rule_dsl

#### `hub_questions`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| template_id | uuid | Y |  |
| version | integer | Y |  |
| active | boolean | Y |  |
| asset_template_id | uuid | Y |  |
| order_index | integer | Y |  |
| question_text | text | Y |  |
| question_type | text | Y |  |
| choices | jsonb |  |  |
| required | boolean | Y |  |
| help_text | text |  |  |
| depends_on | jsonb |  |  |
| source_tier | public.hub_source_tier | Y |  |
| confidence | double precision | Y |  |
| last_reviewed_at | timestamp with time zone |  |  |
| reviewed_by | text |  |  |
| related_sources | text[] | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
| created_by | uuid |  | users.id |
*jsonb/json:* choices, depends_on

#### `incident_actions`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| incident_id | uuid | Y | security_incidents.id |
| action_type | text | Y |  |
| action_description | text | Y |  |
| previous_value | text |  |  |
| new_value | text |  |  |
| performed_by | text |  |  |
| performed_at | timestamp with time zone |  |  |
| metadata | jsonb |  |  |
*jsonb/json:* metadata

#### `incident_notifications`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| incident_id | uuid | Y | security_incidents.id |
| org_id | uuid | Y | organizations.id |
| notification_type | text | Y |  |
| recipient_type | text |  |  |
| recipient_name | text |  |  |
| recipient_email | text |  |  |
| subject | text |  |  |
| content | text |  |  |
| status | text |  |  |
| sent_at | timestamp with time zone |  |  |
| acknowledged_at | timestamp with time zone |  |  |
| response_received | boolean |  |  |
| response_content | text |  |  |
| response_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| created_by | text |  |  |

#### `leads`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| first_name | text | Y |  |
| phone | text | Y |  |
| association | text | Y |  |
| created_at | timestamp with time zone | Y |  |
| consent_at | timestamp with time zone | Y |  |
| company_name | text |  |  |
| marketing_consent | boolean | Y |  |
| marketing_consent_at | timestamp with time zone |  |  |

#### `message_threads`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| subject | character varying | Y |  |
| status | character varying |  |  |
| priority | character varying |  |  |
| last_message_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
| metadata | jsonb |  |  |
| user_email | text |  |  |
| thread_type | text |  |  |
| pre_screening_status | text |  |  |
| pre_screening_summary | text |  |  |
| pre_screening_messages | jsonb |  |  |
*jsonb/json:* metadata, pre_screening_messages

#### `messages`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| thread_id | uuid |  | message_threads.id |
| sender_type | character varying | Y |  |
| sender_id | uuid |  |  |
| sender_name | character varying |  |  |
| content | text | Y |  |
| read_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |

#### `notifications`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| type | character varying | Y |  |
| title | character varying | Y |  |
| body | text |  |  |
| link | character varying |  |  |
| read_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  |  |
| actor | text |  |  |
| actor_role | text |  |  |

#### `org_compliance_scores`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| overall_score | double precision |  |  |
| documents_score | double precision |  |  |
| training_score | double precision |  |  |
| incidents_score | double precision |  |  |
| response_time_score | double precision |  |  |
| risk_level | text |  |  |
| risk_factors | jsonb |  |  |
| last_review_at | timestamp with time zone |  |  |
| next_review_at | timestamp with time zone |  |  |
| last_reviewed_by | uuid |  |  |
| total_dsr_count | integer |  |  |
| avg_dsr_response_days | double precision |  |  |
| total_incidents | integer |  |  |
| open_incidents | integer |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* risk_factors

#### `org_facts`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| fact_key | text | Y |  |
| fact_value | jsonb | Y |  |
| source | text | Y |  |
| confidence | double precision | Y |  |
| last_verified_at | timestamp with time zone | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |
*jsonb/json:* fact_value

#### `org_memory`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| fact | text | Y |  |
| source | text |  |  |
| created_at | timestamp with time zone |  |  |

#### `organization_profiles`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| business_type | character varying |  |  |
| employee_count | integer |  |  |
| data_types | jsonb |  |  |
| processing_purposes | jsonb |  |  |
| databases | jsonb |  |  |
| third_parties | jsonb |  |  |
| security_measures | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
| compliance_checklist | jsonb |  |  |
| compliance_score | integer |  |  |
| compliance_gaps | jsonb |  |  |
| profile_data | jsonb |  |  |
*jsonb/json:* data_types, processing_purposes, databases, third_parties, security_measures, compliance_checklist, compliance_gaps, profile_data

#### `organizations`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| name | character varying | Y |  |
| business_id | character varying | Y |  |
| tier | public.subscription_tier |  |  |
| status | public.org_status |  |  |
| risk_level | text |  |  |
| dpo_id | uuid |  | dpos.id |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
| subscription_id | uuid |  | subscriptions.id |
| subscription_status | character varying |  |  |
| contact_email | character varying |  |  |
| contact_phone | character varying |  |  |
| trial_ends_at | timestamp with time zone |  |  |
| owner_email | text |  |  |
| trial_start_date | timestamp without time zone |  |  |
| trial_end_date | timestamp without time zone |  |  |
| onboarding_progress | jsonb |  |  |
| subscription_start_date | timestamp with time zone |  |  |
| subscription_end_date | timestamp with time zone |  |  |
| last_payment_date | timestamp with time zone |  |  |
| last_payment_amount | integer |  |  |
| compliance_score | integer |  |  |
| payment_token | text |  |  |
| payment_card_mask | text |  |  |
| failed_payment_attempts | integer |  |  |
| payment_token_expiry | text |  |  |
| public_slug | text |  |  |
| trust_page_enabled | boolean |  |  |
| data_flow_overrides | jsonb |  |  |
| dpo_role_in_org | text |  |  |
| dpo_conflict_status | text | Y |  |
| dpo_conflict_acknowledged_at | timestamp with time zone |  |  |
| dpo_conflict_acknowledged_by | text |  |  |
| feature_flags | jsonb | Y |  |
*jsonb/json:* onboarding_progress, data_flow_overrides, feature_flags

#### `payment_logs`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| subscription_id | uuid |  | subscriptions.id |
| amount | integer | Y |  |
| currency | character varying | Y |  |
| status | character varying | Y |  |
| tranzila_response | jsonb |  |  |
| error_message | text |  |  |
| created_at | timestamp with time zone |  |  |
*jsonb/json:* tranzila_response

#### `payment_transactions`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | character varying | Y |  |
| org_id | uuid |  | organizations.id |
| user_id | uuid |  |  |
| amount | integer | Y |  |
| plan | character varying | Y |  |
| is_annual | boolean |  |  |
| status | character varying |  |  |
| hyp_transaction_id | character varying |  |  |
| hyp_status | character varying |  |  |
| hyp_status_text | text |  |  |
| error_code | character varying |  |  |
| error_text | text |  |  |
| created_at | timestamp with time zone |  |  |
| completed_at | timestamp with time zone |  |  |
| provider | text |  |  |
| lowprofile_code | text |  |  |
| cardcom_transaction_id | text |  |  |
| cardcom_approval_number | text |  |  |
| cardcom_response | text |  |  |
| card_token | text |  |  |
| card_mask | text |  |  |
| card_expiry | text |  |  |
| card_brand | text |  |  |
| invoice_number | text |  |  |
| error_message | text |  |  |

#### `payments`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| subscription_id | uuid |  | subscriptions.id |
| amount | numeric | Y |  |
| currency | character varying |  |  |
| type | character varying |  |  |
| status | character varying |  |  |
| gateway_ref | character varying |  |  |
| metadata | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
*jsonb/json:* metadata

#### `processing_activities`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| name | text | Y |  |
| description | text |  |  |
| department | text |  |  |
| status | text |  |  |
| legal_basis | text |  |  |
| legal_basis_details | text |  |  |
| data_categories | jsonb |  |  |
| special_categories | jsonb |  |  |
| data_subject_categories | jsonb |  |  |
| estimated_records_count | integer |  |  |
| includes_minors | boolean |  |  |
| purposes | jsonb |  |  |
| internal_recipients | jsonb |  |  |
| external_recipients | jsonb |  |  |
| international_transfers | boolean |  |  |
| transfer_countries | jsonb |  |  |
| transfer_safeguards | text |  |  |
| retention_period | text |  |  |
| retention_justification | text |  |  |
| deletion_process | text |  |  |
| security_measures | jsonb |  |  |
| security_level | text |  |  |
| systems_used | jsonb |  |  |
| storage_locations | jsonb |  |  |
| risk_level | text |  |  |
| risk_factors | jsonb |  |  |
| requires_dpia | boolean |  |  |
| dpia_completed | boolean |  |  |
| dpia_date | date |  |  |
| requires_ppa_registration | boolean |  |  |
| ppa_registration_status | text |  |  |
| ppa_registration_number | text |  |  |
| ppa_registration_date | date |  |  |
| ppa_expiry_date | date |  |  |
| ai_risk_assessment | text |  |  |
| ai_recommendations | jsonb |  |  |
| ai_analyzed_at | timestamp with time zone |  |  |
| created_by | uuid |  |  |
| last_reviewed_at | timestamp with time zone |  |  |
| last_reviewed_by | uuid |  |  |
| next_review_date | date |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* data_categories, special_categories, data_subject_categories, purposes, internal_recipients, external_recipients, transfer_countries, security_measures, systems_used, storage_locations, risk_factors, ai_recommendations

#### `processing_activity_recipients`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| processing_activity_id | uuid | Y | processing_activities.id |
| recipient_id | uuid | Y | data_recipients.id |
| purpose | text |  |  |
| created_at | timestamp with time zone |  |  |

#### `qa_interactions`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| user_id | uuid |  | users.id |
| question | text | Y |  |
| answer | text |  |  |
| confidence_score | numeric |  |  |
| escalated | boolean |  |  |
| created_at | timestamp with time zone |  |  |
| dpo_response | text |  |  |
| dpo_time_minutes | integer |  |  |
| resolved_at | timestamp with time zone |  |  |

#### `qa_log`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| question | text | Y |  |
| answer | text |  |  |
| intent | text |  |  |
| source | text |  |  |
| created_at | timestamp with time zone |  |  |

#### `quiz_leads`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| name | character varying | Y |  |
| email | character varying | Y |  |
| phone | character varying |  |  |
| company | character varying |  |  |
| is_public_body | character varying |  |  |
| data_trading | character varying |  |  |
| large_database | character varying |  |  |
| systematic_monitoring | character varying |  |  |
| sensitive_data | character varying |  |  |
| supplier_to_public | character varying |  |  |
| result | character varying | Y |  |
| source | character varying |  |  |
| user_agent | text |  |  |
| status | character varying |  |  |
| notes | text |  |  |
| created_at | timestamp with time zone |  |  |

#### `regulatory_documents`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| url | text | Y |  |
| title | text | Y |  |
| source_org | public.regulatory_source_org | Y |  |
| version | integer | Y |  |
| content_hash | text | Y |  |
| raw_html | text |  |  |
| fetched_at | timestamp with time zone | Y |  |
| superseded_by | uuid |  | regulatory_documents.id |
| metadata | jsonb | Y |  |
*jsonb/json:* metadata

#### `regulatory_sections`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| document_id | uuid | Y | regulatory_documents.id |
| ordinal | integer | Y |  |
| heading | text |  |  |
| anchor | text |  |  |
| content_text | text | Y |  |
| content_hash | text | Y |  |
| embedding | public.vector(1024) |  |  |

#### `review_pricing`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| review_type | character varying | Y |  |
| name_he | character varying | Y |  |
| base_price | numeric | Y |  |
| urgent_multiplier | numeric |  |  |
| description_he | text |  |  |
| estimated_hours | numeric |  |  |
| is_active | boolean |  |  |
| created_at | timestamp with time zone |  |  |

#### `ropa_audit_log`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| processing_activity_id | uuid |  | processing_activities.id |
| action | text | Y |  |
| field_changed | text |  |  |
| old_value | text |  |  |
| new_value | text |  |  |
| performed_by | uuid |  |  |
| performed_by_type | text |  |  |
| created_at | timestamp with time zone |  |  |

#### `security_incidents`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid | Y | organizations.id |
| title | text | Y |  |
| description | text |  |  |
| incident_type | text | Y |  |
| severity | text | Y |  |
| status | text | Y |  |
| discovered_at | timestamp with time zone | Y |  |
| reported_at | timestamp with time zone |  |  |
| contained_at | timestamp with time zone |  |  |
| authority_notified_at | timestamp with time zone |  |  |
| individuals_notified_at | timestamp with time zone |  |  |
| resolved_at | timestamp with time zone |  |  |
| closed_at | timestamp with time zone |  |  |
| authority_deadline | timestamp with time zone |  |  |
| data_types_affected | text[] |  |  |
| data_categories | text[] |  |  |
| records_affected | integer |  |  |
| individuals_affected | integer |  |  |
| geographic_scope | text[] |  |  |
| risk_to_individuals | text |  |  |
| risk_assessment_notes | text |  |  |
| requires_authority_notification | boolean |  |  |
| requires_individual_notification | boolean |  |  |
| root_cause | text |  |  |
| root_cause_category | text |  |  |
| containment_measures | text |  |  |
| is_contained | boolean |  |  |
| remediation_steps | text |  |  |
| preventive_measures | text |  |  |
| reported_by_name | text |  |  |
| reported_by_email | text |  |  |
| reported_by_role | text |  |  |
| dpo_notes | text |  |  |
| dpo_decision | text |  |  |
| dpo_decision_at | timestamp with time zone |  |  |
| dpo_decision_by | text |  |  |
| ai_summary | text |  |  |
| ai_risk_assessment | text |  |  |
| ai_recommendations | text |  |  |
| ai_authority_draft | text |  |  |
| ai_individuals_draft | text |  |  |
| ai_analyzed_at | timestamp with time zone |  |  |
| metadata | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
| source | text |  |  |
*jsonb/json:* metadata

#### `subscriptions`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| tier | public.subscription_tier |  |  |
| monthly_price | numeric | Y |  |
| dpo_minutes_quota | integer |  |  |
| dpo_minutes_used | integer |  |  |
| status | public.subscription_status |  |  |
| created_at | timestamp with time zone |  |  |
| token | character varying |  |  |
| token_expiry | character varying |  |  |
| transaction_index | character varying |  |  |
| last_payment_at | timestamp with time zone |  |  |
| cancelled_at | timestamp with time zone |  |  |
| cancellation_reason | text |  |  |

#### `team_personas`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| slug | text | Y |  |
| display_name_he | text | Y |  |
| role_he | text | Y |  |
| system_prompt_key | text | Y |  |
| domain_ownership | text[] | Y |  |
| avatar_seed | text | Y |  |
| color | text | Y |  |
| active | boolean | Y |  |
| created_at | timestamp with time zone | Y |  |
| updated_at | timestamp with time zone | Y |  |

#### `token_transactions`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| amount | integer | Y |  |
| reason | character varying |  |  |
| reference_id | uuid |  |  |
| created_at | timestamp with time zone |  |  |

#### `users`  (PK: id)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| email | character varying | Y |  |
| name | character varying | Y |  |
| role | public.user_role |  |  |
| auth_user_id | uuid |  |  |
| created_at | timestamp with time zone |  |  |
| phone | character varying |  |  |
| email_sequence_stage | integer |  |  |
| last_email_sent | timestamp without time zone |  |  |

#### `work_plans`  (PK: id) ⚠️ no repo migration (live-only)
| column | type | nn | fk → |
|---|---|---|---|
| id | uuid | Y |  |
| org_id | uuid |  | organizations.id |
| year | integer | Y |  |
| status | character varying |  |  |
| tasks | jsonb |  |  |
| created_at | timestamp with time zone |  |  |
| updated_at | timestamp with time zone |  |  |
*jsonb/json:* tasks

---

## 2. ENTITY MAPPING (current → v3 target)

| v3 target entity | Status | Closest current table(s) | Notes |
|---|---|---|---|
| **organizations** | ✅ **Exists** | `organizations` [LIVE, 35 cols] | Solid hub; everything FKs here. Carries billing + compliance_score + slug + feature_flags. |
| **systems** | ❌ **Missing** | `processing_activities.systems_used` (jsonb) | No table; systems are free-text inside RoPA blobs. |
| **vendors** | 🟡 **Partial** | `data_recipients` [LIVE, 22 cols, ⚠️ no migration] + `processing_activities.external_recipients`/`organization_profiles.third_parties` (jsonb) | A **real relational `data_recipients` table exists** (has `has_dpa`, `dpa_expiry_date`, `compliance_verified`, `last_audit_date`) and even a join table `processing_activity_recipients`. This is the **most v3-ready** non-core entity. But duplicated as jsonb in two other places. |
| **databases** | ❌ **Missing** (as table) | `organization_profiles.databases` (jsonb), `database_scenarios.databases` (jsonb), `cameras` (a specific asset type, 15 cols) | Databases live as blobs. `cameras` is the only asset materialized as its own table. |
| **obligations** | ❌ **Missing — the core gap** | *none* — `organization_profiles.compliance_gaps` (jsonb), computed `ComplianceTask[]` | **No durable per-obligation rows with state.** See §2-gap below. |
| **controls** | 🟡 **Partial (catalog only)** | `hub_control_playbooks` [LIVE catalog], `dpia_assessments.controls` (jsonb) | The *global control catalog* exists (with `cadence`, `checklist`). **No per-org control instances** with state. |
| **tasks** | 🟡 **Partial (non-relational)** | `work_plans.tasks` (jsonb), `dpo_queue` (DPO work items, 26 cols), computed `ComplianceTask[]`; `compliance_tasks` **designed but never deployed** | Tasks are jsonb arrays + an ephemeral compute. `compliance_tasks` (with `is_recurring`/`recurring_interval`) exists in `messaging_schema.sql` but is **404 live and unreferenced in code** — abandoned. |
| **contacts** | ❌ **Missing** (as table) | Contact fields embedded in `organizations` (`contact_email/phone`, `owner_email`), `data_recipients` (`contact_name/email/phone`), `dpos`, `users` | No unified contacts entity. |
| **events** | 🟡 **Partial** | `audit_logs`, `ropa_audit_log`, `agent_runs`, `incident_actions`, `notifications` | Several append-only event-ish logs exist, but no single unified event/timeline table. |
| **evidence** | ❌ **Missing** | `documents`, `document_reviews`, `compliance_reviews` | Documents exist but **nothing links a document to an obligation/requirement** (see §5C/§2-gap). |
| **regulation catalog** | ✅ **Exists (SQL reference)** | `regulatory_documents` + `regulatory_sections` (+ pgvector) [MIGRATION 023/030] and the `hub_*` template library [MIGRATION 022] | This is the **most mature v3-aligned area**: a versioned reference catalog of regulation text, sectioned and embedded, plus an authored library of asset templates, questions, gap rules, control playbooks. |

### The single biggest gap
**There is NO persistent obligation/state storage today. Obligation state is computed on the fly and thrown away.** [LIVE + CODE]

- `src/lib/compliance-engine.ts` (`deriveComplianceActions(...)`, self-titled "UNIFIED COMPLIANCE TASK ENGINE v2") generates ~22 `ComplianceTask` objects with a `TaskStatus` union **on every dashboard load**. These are ephemeral objects, never rows.
- The only things persisted are: an aggregate `organizations.compliance_score` (single int), a per-review snapshot row in `compliance_reviews` (event, not per-obligation), a `risk_factors` jsonb in `org_compliance_scores`, and **task overrides as a jsonb map keyed by `taskId`** inside `organization_profiles.profile_data.actionOverrides` and `work_plans.tasks`.
- No table carries the v3 lifecycle (`unknown → checking → in-treatment → compliant → expired`), no `triggered_by`, no `fulfilled_by`, no `recurs_at`. **The Obligation Ledger does not exist and has no near-equivalent.** This is the largest build in the v3 realignment.

---

## 3. FEATURE → FIVE-C MAP

Stages: **Classify** (scope what data/obligations exist) · **Collect** (gather evidence/answers/docs) · **Close** (remediate gaps/tasks) · **Control** (ongoing/recurring monitoring) · **Certify** (reports/attestations/audit) · **Supporting** (auth, billing, leads, infra). Source: full route/API/Inngest sweep [CODE].

### Pages (56 page/layout files — all render real; see caveat)
| Area | Stage | Notes |
|---|---|---|
| `/onboarding`, `/calculator`, `/get-started`, `/expert/asset-templates`, `/expert/questions`, `/expert/regulatory-sources` | **Classify** | Discovery/scoping + regulation sourcing. Strongest stage. |
| `/chat`, `/rights/[orgId]` (intake) | **Collect** | AI DPO chat (doc gen, PII guard); public DSAR intake. |
| `/dpo` (officer queue), `/database-registration`, `/expert/gap-rules` | **Close** | Remediation/resolution surfaces. |
| `/dashboard`, `/expert/control-playbooks` | **Control** | Ongoing hub; recurring-control catalog. (`/dashboard` spans stages — ambiguous.) |
| `/trust/[slug]`, `/dpo-reports` (via console) | **Certify** | Public trust page; quarterly reports. |
| `/login` `/register` `/auth/*` `/settings`; `/checkout` `/subscribe` `/payment/*`; `/`, `/contact`, legal pages; `/expert/continuation-services` | **Supporting** | Auth, billing, marketing, legal, upsell. |

**Caveat:** the `(expert)` layout + `/expert` page contain stale "coming soon / only asset-templates wired" comments, but **all 6 artifact areas are fully built** in code.

### API endpoints (59 route handlers)
| Endpoint(s) | Stage | Status |
|---|---|---|
| `/api/ropa`, `/api/ropa/optimizer`, `/api/dpia`, `/api/dpia/required-activities`, `/api/complete-onboarding`, `/api/scan-website`, `/api/admin/regulatory-sources*`, `/api/expert/{asset-templates,questions}` | **Classify** | Working |
| `/api/chat`, `/api/chat/contextual`, `/api/chat/stream`, `/api/qa`, `/api/document-review`, `/api/generate-documents`, `/api/parse-pdf`, `/api/upload-doc`, `/api/messages*`, `/api/expert/document-templates` | **Collect** | Working — **`/api/qa` has a hardcoded fallback stub** when Claude is unavailable |
| `/api/dpo`, `/api/incidents`, `/api/rights` (resolution), `/api/compliance-coach`, `/api/work-plan`, `/api/expert/gap-rules` | **Close** | Working — **`/api/work-plan` serves placeholder/stub task data** |
| `/api/notifications`, `/api/cron/monthly-digest`, `/api/expert/control-playbooks` | **Control** | Working |
| `/api/dpo-reports*`, `/api/compliance-review`, `/api/audit`, `/api/documents/export`, `/api/generate-pdf` | **Certify** | Working |
| `/api/dpo-auth`, `/api/dpo-admin`, `/api/dpo-conflict`, `/api/cardcom/*`, `/api/billing/recurring`, `/api/cron/{email-sequence,trial-reminders}`, `/api/leads`, `/api/email`, `/api/test-email`, `/api/inngest` | **Supporting** | Working — except stubs below |

**Stubbed/deprecated (logic migrated to Inngest):** `/api/billing/recurring`, `/api/cron/check-notifications`, `/api/cron/quarterly-reports`. **Cleanup candidate:** `src/app/generate-pdf/route.ts` duplicates `/api/generate-pdf` outside `/api`.

### Inngest jobs (7 functions, all registered)
| Function | Trigger | Stage | Status |
|---|---|---|---|
| `notifications-daily-dispatch` / `notifications-org-check` | cron `0 6 * * *` / event | **Control** | Working |
| `reports-quarterly-dispatch` / `reports-org-generate` | cron `0 6 1 1,4,7,10 *` / event | **Certify** | Working (report draft has no LLM yet) |
| `billing-recurring-dispatch` / `billing-org-charge` | cron / event | **Supporting** | Working (idempotent Cardcom charge) |
| `agent-invoke` | event `deepo/agent.invoke` | **Cross-cutting (intended Five-C engine)** | **Real engine, but UNTRIGGERED** — nothing in `src/` emits `deepo/agent.invoke`; only 5 generic CRUD skills (read/write `org_facts`, scratchpad, notifications); domain skills marked "later phases" |

**Five-C coverage read:** Classify is strongest. Collect and Certify are well-built. **Close is the thinnest in automation** — its task/remediation tracker (`/api/work-plan`) is the one place serving stub data, and there is no durable task/obligation store behind it. The `agent-invoke` runtime is the scaffolded engine meant to unify all five stages but is **not yet wired to any trigger.**

---

## 4. NO-LOGIN / TOKENIZED LINKS

**Verdict: PARTIAL.** There is **no per-recipient tokenized magic-link** for sysadmins or vendors. What exists is public-by-identifier pages and one staff password→token flow. [CODE/LIVE]

1. **Public Trust Page — `/trust/[slug]`** (`src/app/trust/[slug]/page.tsx`). Server component, **service-role key, no auth**, looked up by `organizations.public_slug` where `trust_page_enabled = true`. **Leaks identifying info to any holder of the slug:** org name, compliance score (`compliance_reviews.score_after`), last-review date, the org's data/database categories (`organization_profiles.profile_data.v3Answers`), and DPO contact. The slug is org-chosen → effectively a guessable shared secret. *Single-tenant per page — does not expose other clients.* This is the closest thing to "no-login link," but it is **outbound disclosure, not zero-info access.**

2. **Public DSAR form — `/rights/[orgId]`** (`src/app/api/rights/route.ts`). Unauthenticated. `GET action=get_org` returns `{id,name}` for any orgId (org-name disclosure by UUID). `POST action=submit_request` lets anyone file a DSAR for any org (no CAPTCHA). **Higher severity:** `GET action=get_requests&orgId=` (`route.ts:199-211`) has **no auth guard** and `select('*')`s all `data_subject_requests` rows (requester name, national ID, email, phone); if it runs under the service-role key (which `route.ts:175` prefers), this is **unauthenticated PII enumeration**. The UI never calls it. → flagged in §7.

3. **DPO staff token — `/api/dpo-auth`.** Password-gated (`DPO_PASSWORD`) → random `dpo_`-prefixed token (`crypto.randomBytes`), 24h, header `x-dpo-token` or `?token=`, stored in `dpo_sessions` [LIVE, ⚠️ no migration]. **Staff access, not vendor/sysadmin.**

4. **`consultation_tokens` is NOT a link mechanism.** [LIVE] it is a **credit-balance** table (`balance`, `monthly_allocation`, `last_reset_at`) — i.e. consultation credits, not tokenized URLs. [CODE] no application code references it (or `token_transactions`). Despite the name, irrelevant to no-login access.

**So:** for v3's sysadmin and vendor no-login tokenized links with **zero info exposure**, **nothing reusable exists** — and the existing public surfaces lean the *opposite* way (they disclose org identity/compliance data to link holders).

---

## 5. BUILD-NOW GAP CHECK

| Capability | Verdict | Backing (file/table) |
|---|---|---|
| **Durable obligation ledger** | ❌ **ABSENT** | Computed in `src/lib/compliance-engine.ts` (`deriveComplianceActions`, ~22 ephemeral `ComplianceTask`s); persisted only as jsonb (`organization_profiles.profile_data.actionOverrides`, `work_plans.tasks`) + scalar `organizations.compliance_score`. No stateful obligation rows. [LIVE/CODE] |
| **Unified inference engine** | ❌/🟡 **ABSENT-as-unified; hardcoded version runs** | The runtime logic is **hardcoded `if/else`** in `src/lib/compliance-engine.ts` (facts like `hasMedical`, `hasCameras`) **plus a second** hardcoded calculator `src/lib/regulatory-engine.ts` (used only by `DatabaseOptimizer`). The declarative catalog `hub_gap_rules.rule_dsl` exists **but no runtime code ever evaluates it** against `org_facts` — it's CRUD'd only by the Expert Console. So: two scattered hardcoded engines + an authored-but-dead rule catalog. [CODE/MIGRATION 022] |
| **Evidence chains** | ❌ **ABSENT** | No proof→obligation link. `hub_artifact_citations` links *hub artifacts → regulatory_sections* (provenance, not evidence). `documents`/`document_reviews`/`compliance_reviews` have **no FK to any obligation/requirement**. [MIGRATION 023/005, LIVE] |
| **Tokenized vendor questionnaire** | ❌ **ABSENT** | `hub_questions` is an internal, auth-gated authoring library tied to `asset_template_id` (asset *type*), not to a `data_recipient`. No `/vendor` or public questionnaire route; `data_recipients` is never delivered via link. [CODE/MIGRATION 022] |
| **Live policy widget** | 🟡 **PARTIAL** | A public trust **page** exists (`/trust/[slug]`) with live compliance score/categories — but it is a full server-rendered page, **not an embeddable widget/iframe/script snippet** (no embed endpoint). [CODE] |

---

## 6. RLS / GRANTS STATE  ⚠️ [MIGRATION] — could NOT be verified against the live DB

> No access to `pg_class.relacl`, `pg_policies`, or `pg_proc` (no catalog/SQL access). Everything below is **what the repo SQL declares**; given the drift in §0, **live state is unknown and may differ.** Verify in the Supabase SQL editor before relying on any of this.

### Regulatory / reference / catalog tables
| Table | RLS (declared) | Policies (declared) | Grants / role notes |
|---|---|---|---|
| `regulatory_documents` | ENABLE [023] | `SELECT` to `authenticated` (USING true); `INSERT`/`UPDATE` to **`regulatory_ingest_worker`** role only | Dedicated `regulatory_ingest_worker` NOLOGIN role granted `SELECT,INSERT,UPDATE` on regulatory tables **only** — an explicit "architectural firewall" so the ingest worker can never write `hub_*`. No DELETE. |
| `regulatory_sections` | ENABLE [023] | same pattern as above | + pgvector column & HNSW index [030] |
| `hub_artifact_citations` | ENABLE [023] | `SELECT` to `authenticated`; writes via service-role only | Polymorphic citation/edge table. |
| `hub_*` library (`hub_asset_templates`, `hub_questions`, `hub_document_templates`, `hub_control_playbooks`, `hub_gap_rules`, `hub_continuation_services`) | ENABLE [022] | `SELECT` to any `authenticated` (global compliance library); writes service-role only | Versioned by `template_id`+`version`; `source_tier` enum, `confidence`. Read-by-everyone catalog. |
| `review_pricing` | unknown (no repo migration; [LIVE] table) | unknown | Reference/pricing table — RLS unverified. |

### SECURITY DEFINER functions [MIGRATION] (4 found in repo)
| Function | Defined | Touches catalog/ref? | Notes |
|---|---|---|---|
| `public.current_user_org_id()` | 013 | no (reads `users`) | `SET search_path = public`; `REVOKE ALL FROM PUBLIC` then `GRANT EXECUTE` to `authenticated, anon, service_role`. Used in RLS policies to avoid recursion. |
| `public.find_similar_section(text,int)` | 030 | **yes — `regulatory_sections`** | Owned by `regulatory_ingest_worker`; `search_path = public, pg_temp`; `REVOKE … FROM PUBLIC`, `GRANT EXECUTE` to `service_role` only. pgvector similarity. |
| `public.regulatory_ingest_persist(...)` | 031 | **yes — `regulatory_documents` + `regulatory_sections`** | Owned by `regulatory_ingest_worker`; `SECURITY DEFINER`; `search_path` pinned; EXECUTE granted narrowly. |
| (leads helper) | 035 | no (`leads`) | `SECURITY DEFINER` in the leads migration; supporting/marketing. |

**General RLS posture from migrations 013 / 017 / 019:** server routes use the **service-role key (bypasses RLS)**; client (anon-key+JWT) reads are org-scoped via `org_id IN (SELECT org_id FROM users WHERE auth_user_id = auth.uid())`. Migration **017** is a P0 fix that dropped ~17 over-permissive "ALL true / service-role-named-but-public-role" backdoor policies. **Whether 013/017/019/022/023 are actually applied in production is unverified** (manual-apply migrations + heavy drift).

---

## 7. TOP RISKS / SURPRISES

1. **No obligation ledger and no near-equivalent.** The entire v3 core (stateful obligations: trigger → fulfill → evidence → recurrence) is greenfield. Today's "status" is recomputed from blobs on each page load. This is the biggest and most central build.
2. **Severe schema↔repo drift.** 24/59 live tables have no migration; 3 migrated tables are absent live. **The repo is not a reliable source of truth for production.** Any v3 migration plan must start from a live `pg_dump`, not the `supabase/migrations/` folder. RLS/grants/functions (§6) are unverifiable from here.
3. **Two hardcoded inference engines + a dead rule catalog.** `compliance-engine.ts` and `regulatory-engine.ts` both hardcode obligations in `if/else`; the declarative `hub_gap_rules.rule_dsl` (the v3-shaped substrate) is authored in the Expert Console but **never evaluated at runtime.** Unifying these means choosing one and wiring the catalog in — and reconciling two divergent rule sets.
4. **The intended operational engine is built but unplugged.** The `agent-invoke` Inngest runtime + persona/skills scaffolding exists, but **nothing triggers it** and it has only 5 generic CRUD skills. The "Five-C loop engine" is closer to a stub than it looks.
5. **Latent runtime bug:** `src/app/api/dpo/route.ts:587` queries `.from('onboarding_answers')` — a table that **does not exist live (404)** — and the error is unchecked, so it silently returns null (hidden no-op, not a crash).
6. **Security finding (out of audit scope but urgent):** `GET /api/rights?action=get_requests&orgId=` is unauthenticated and `select('*')`s `data_subject_requests` (name, national ID, email, phone). If it runs under the service-role key in prod (it prefers it), this is **unauthenticated PII enumeration.** Also: `/trust/[slug]` and `/api/rights?action=get_org` disclose org identity/compliance data to anyone with the slug/UUID — the *opposite* of v3's "zero info exposure" no-login requirement.
7. **Data duplicated across blob, EAV, and (sometimes) relational forms.** Vendors live in `data_recipients` (relational) **and** `organization_profiles.third_parties` (jsonb) **and** `processing_activities.external_recipients` (jsonb). Databases live in `organization_profiles.databases` + `database_scenarios.databases`. Facts live in `org_facts` (EAV) + `profile_data` (jsonb). v3 normalization must pick a single home and migrate/reconcile three copies.
8. **"Tokens" naming trap.** `consultation_tokens`/`token_transactions` sound like access tokens but are **billing credits** and are unused in code — don't mistake them for a no-login link primitive when building vendor/sysadmin access.
9. **`organizations` is a healthy anchor** (the one piece of good news): 51/59 tables already chain to it, and `data_recipients`/`regulatory_*`/`hub_*` are genuinely relational and v3-shaped. The catalog side of v3 is largely in place; the **per-client instance/ledger side is what's missing.**

---

*Generated read-only. Live facts via PostgREST OpenAPI introspection + existence probes (service-role). Migration/RLS facts from repo SQL and explicitly unverified against production. Recurring mistakes & surprises logged to `tasks/lessons.md`.*

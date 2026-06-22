-- ============================================================
-- Deepo / dpo-saas - LIVE schema baseline (captured before the v3 rebuild)
-- ============================================================
-- Captured (UTC date): 2026-06-22
-- Project: dpo-saas  (ref nedkrxjwmyhabrsscyem, Central EU / Frankfurt)
-- Source of truth: the LIVE production database, schema "public".
-- PostgreSQL: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
--
-- CAPTURE METHOD (read this):
--   This is NOT a pg_dump. The Supabase CLI "db dump" shells out to pg_dump
--   inside a pinned Docker container, and Docker / a local pg_dump are both
--   unavailable in this environment. Instead the schema was read from the live
--   catalog via the Supabase Management API SQL endpoint
--   (POST /v1/projects/<ref>/database/query), running as role "postgres",
--   using pg_get_functiondef / pg_get_constraintdef / pg_get_indexdef and
--   pg_catalog / information_schema. Read-only; no row data was exported.
--
--   It is a faithful structural + security snapshot, not a guaranteed
--   one-shot replayable migration (extension installs, role creation, and
--   object ownership are recorded/summarized, not fully scripted). Its job is
--   to record live truth - tables, RLS, policies, grants, functions - before v3.
--
-- LIVE COUNTS: tables=58  policies=89  functions=128  (SECURITY DEFINER=3)
-- Tables in public WITHOUT row level security (3):
--   regulatory_documents
--   regulatory_sections
--   review_pricing
--
-- SECURITY OBSERVATIONS (resolves the previously unverified section 6 of
-- docs/audit-architecture-v3.md; live truth as of capture):
--   * regulatory_documents / regulatory_sections: RLS DISABLED, so their 5
--     policies each are INERT. Protection is the GRANT layer: anon has NO
--     grant, authenticated has SELECT, service_role has all. => not anon-
--     exposed despite RLS being off (the grants-as-firewall pattern).
--   * hub_* (7 tables): RLS ENABLED, one policy each = FOR SELECT TO
--     authenticated USING (true). No anon policy and no write policy, so anon
--     is fully denied and writes are blocked for every role via RLS.
--     LATENT RISK: anon still holds a broad table GRANT (SELECT/INSERT/
--     UPDATE/DELETE/...). RLS is the only thing protecting these tables; if
--     RLS is ever disabled, anon immediately regains full DML. Hardening
--     follow-up: REVOKE the anon grants on hub_*.
--   * SECURITY DEFINER functions (3): current_user_org_id (owner postgres);
--     find_similar_section and regulatory_ingest_persist (owner
--     regulatory_ingest_worker, a dedicated low-privilege role).
-- ============================================================


-- ============================================================
-- TABLES (CREATE TABLE, columns + defaults)  (58)
-- ============================================================

CREATE TABLE agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  persona_slug text NOT NULL,
  trigger_type text NOT NULL,
  trigger_payload jsonb,
  status text NOT NULL,
  input jsonb NOT NULL,
  output jsonb,
  error text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  parent_run_id uuid,
  inngest_run_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE agent_scratchpad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  persona_slug text NOT NULL,
  scratch_key text NOT NULL,
  scratch_value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  action character varying(100) NOT NULL,
  entity_type character varying(50),
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calculator_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying(255) NOT NULL,
  phone character varying(50),
  company_name character varying(255),
  answers jsonb,
  result_status character varying(50),
  source character varying(50) DEFAULT 'calculator'::character varying,
  utm_source character varying(100),
  utm_medium character varying(100),
  utm_campaign character varying(100),
  converted boolean DEFAULT false,
  converted_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE cameras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  location text,
  model text,
  recording_purpose text,
  recording_retention_days integer,
  data_subject_categories text[],
  requires_signage boolean NOT NULL DEFAULT true,
  signage_present boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamp with time zone,
  next_review_due_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE chat_conversation_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  conversation_id text NOT NULL,
  summary text NOT NULL,
  message_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  intent text,
  attachments jsonb,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id text,
  persona_slug text
);

CREATE TABLE compliance_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  review_type character varying(50) NOT NULL,
  status character varying(20) DEFAULT 'pending'::character varying,
  findings jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  score_before integer,
  score_after integer,
  reviewed_by uuid,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE consultation_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  balance integer DEFAULT 0,
  monthly_allocation integer DEFAULT 0,
  last_reset_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE data_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  type text,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  country text,
  has_dpa boolean DEFAULT false,
  dpa_signed_date date,
  dpa_expiry_date date,
  dpa_document_url text,
  data_categories_shared jsonb DEFAULT '[]'::jsonb,
  purposes jsonb DEFAULT '[]'::jsonb,
  risk_level text,
  compliance_verified boolean DEFAULT false,
  last_audit_date date,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE data_subject_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  request_number character varying(50) NOT NULL,
  request_type request_type NOT NULL,
  status request_status DEFAULT 'pending'::request_status,
  requester_name character varying(255) NOT NULL,
  requester_id character varying(20) NOT NULL,
  requester_email character varying(255) NOT NULL,
  requester_phone character varying(20),
  details text,
  response text,
  responded_at timestamp with time zone,
  responded_by character varying(255),
  deadline timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE database_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  databases jsonb NOT NULL DEFAULT '[]'::jsonb,
  regulatory_impact jsonb DEFAULT '{}'::jsonb,
  ai_suggestions jsonb DEFAULT '[]'::jsonb,
  created_by character varying(50) DEFAULT 'dpo'::character varying,
  is_applied boolean DEFAULT false,
  applied_at timestamp with time zone,
  baseline_databases jsonb DEFAULT '[]'::jsonb,
  baseline_impact jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE document_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  user_id uuid,
  original_filename character varying(255) NOT NULL,
  original_file_url text,
  original_file_type character varying(50),
  original_content text,
  ai_review_status character varying(20) DEFAULT 'pending'::character varying,
  ai_review_summary text,
  ai_issues_found jsonb DEFAULT '[]'::jsonb,
  ai_risk_score integer,
  ai_reviewed_at timestamp with time zone,
  dpo_review_requested boolean DEFAULT false,
  dpo_review_status character varying(20),
  dpo_review_price numeric(10,2),
  dpo_reviewer_id uuid,
  dpo_notes text,
  dpo_reviewed_at timestamp with time zone,
  reviewed_file_url text,
  reviewed_content text,
  review_type character varying(50),
  urgency character varying(20) DEFAULT 'normal'::character varying,
  status character varying(20) DEFAULT 'uploaded'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  type text NOT NULL,
  title character varying(255) NOT NULL,
  content text,
  version integer DEFAULT 1,
  status text DEFAULT 'draft'::document_status,
  generated_by character varying(20) DEFAULT 'ai'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'dashboard'::text
);

CREATE TABLE dpia_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  activity_name text NOT NULL,
  activity_id text,
  description text,
  legal_basis text,
  data_categories jsonb DEFAULT '[]'::jsonb,
  risks jsonb DEFAULT '[]'::jsonb,
  controls jsonb DEFAULT '[]'::jsonb,
  residual_score integer,
  risk_level text,
  action_plan jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft'::text,
  approved_by text,
  approved_at timestamp with time zone,
  next_review_date date DEFAULT (now() + '1 year 6 mons'::interval),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE dpo_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  title text NOT NULL,
  description text,
  ai_summary text,
  ai_recommendation text,
  ai_draft_response text,
  ai_confidence double precision,
  ai_risk_score double precision,
  ai_analyzed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  deadline_at timestamp with time zone,
  sla_hours integer,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_type text,
  resolution_notes text,
  resolution_response text,
  time_spent_seconds integer DEFAULT 0,
  related_thread_id uuid,
  related_dsr_id uuid,
  related_document_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE dpo_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  report_period text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  executive_summary text,
  compliance_score_start integer,
  compliance_score_end integer,
  incidents_count integer DEFAULT 0,
  incidents_summary jsonb DEFAULT '[]'::jsonb,
  findings_open integer DEFAULT 0,
  findings_resolved integer DEFAULT 0,
  dpia_count integer DEFAULT 0,
  dpia_high_risk integer DEFAULT 0,
  rights_requests_count integer DEFAULT 0,
  documents_updated integer DEFAULT 0,
  recommendations jsonb DEFAULT '[]'::jsonb,
  approved_by text,
  approved_at timestamp with time zone,
  submitted_to_name text,
  submitted_to_role text,
  submitted_to_email text,
  submitted_at timestamp with time zone,
  acknowledgment_received boolean DEFAULT false,
  acknowledgment_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE dpo_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE dpo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dpo_user_id uuid,
  dpo_name text,
  dpo_email text,
  dpo_phone text,
  dpo_license_number text,
  auto_escalate_confidence_threshold double precision DEFAULT 0.7,
  auto_approve_confidence_threshold double precision DEFAULT 0.95,
  sla_critical_hours integer DEFAULT 4,
  sla_high_hours integer DEFAULT 24,
  sla_medium_hours integer DEFAULT 72,
  sla_low_hours integer DEFAULT 168,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  daily_digest boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE dpo_time_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  queue_item_id uuid,
  dpo_user_id uuid,
  action text NOT NULL,
  description text,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE dpos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  license_number character varying(50) NOT NULL,
  max_clients integer DEFAULT 500,
  active_clients integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  auth_user_id uuid
);

CREATE TABLE escalations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  type escalation_type DEFAULT 'qa'::escalation_type,
  priority escalation_priority DEFAULT 'medium'::escalation_priority,
  subject character varying(255) NOT NULL,
  description text,
  status escalation_status DEFAULT 'open'::escalation_status,
  dpo_time_minutes integer DEFAULT 0,
  resolution text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

CREATE TABLE hub_artifact_citations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artifact_table text NOT NULL,
  artifact_id uuid NOT NULL,
  artifact_version integer NOT NULL,
  regulatory_section_id uuid NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hub_asset_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  slug text NOT NULL,
  name text NOT NULL,
  definition text NOT NULL,
  icon_name text,
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE hub_continuation_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  description text NOT NULL,
  price_model text,
  estimated_price_text text,
  service_kind text NOT NULL,
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE hub_control_playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  asset_template_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  cadence text NOT NULL,
  owner_role text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE hub_document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  asset_template_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_format text NOT NULL DEFAULT 'markdown'::text,
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE hub_gap_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  asset_template_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  rule_dsl jsonb NOT NULL,
  remediation_text text,
  continuation_service_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE hub_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  asset_template_id uuid NOT NULL,
  order_index integer NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,
  choices jsonb,
  required boolean NOT NULL DEFAULT false,
  help_text text,
  depends_on jsonb,
  source_tier hub_source_tier NOT NULL DEFAULT 'expert_judgment'::hub_source_tier,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone,
  reviewed_by text,
  related_sources text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE incident_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  previous_value text,
  new_value text,
  performed_by text,
  performed_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE incident_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  org_id uuid NOT NULL,
  notification_type text NOT NULL,
  recipient_type text,
  recipient_name text,
  recipient_email text,
  subject text,
  content text,
  status text DEFAULT 'draft'::text,
  sent_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  response_received boolean DEFAULT false,
  response_content text,
  response_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  created_by text
);

CREATE TABLE leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  phone text NOT NULL,
  association text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  consent_at timestamp with time zone NOT NULL,
  company_name text,
  marketing_consent boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamp with time zone
);

CREATE TABLE message_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  subject character varying(255) NOT NULL,
  status character varying(20) DEFAULT 'open'::character varying,
  priority character varying(20) DEFAULT 'normal'::character varying,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  user_email text,
  thread_type text DEFAULT 'general'::text,
  pre_screening_status text,
  pre_screening_summary text,
  pre_screening_messages jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid,
  sender_type character varying(20) NOT NULL,
  sender_id uuid,
  sender_name character varying(255),
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  type character varying(50) NOT NULL,
  title character varying(255) NOT NULL,
  body text,
  link character varying(500),
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  actor text,
  actor_role text
);

CREATE TABLE org_compliance_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  overall_score double precision DEFAULT 0,
  documents_score double precision DEFAULT 0,
  training_score double precision DEFAULT 0,
  incidents_score double precision DEFAULT 100,
  response_time_score double precision DEFAULT 100,
  risk_level text DEFAULT 'low'::text,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  last_review_at timestamp with time zone,
  next_review_at timestamp with time zone,
  last_reviewed_by uuid,
  total_dsr_count integer DEFAULT 0,
  avg_dsr_response_days double precision,
  total_incidents integer DEFAULT 0,
  open_incidents integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE org_facts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL,
  source text NOT NULL,
  confidence double precision NOT NULL DEFAULT 1.0,
  last_verified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE org_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  fact text NOT NULL,
  source text DEFAULT 'chat'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE organization_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  business_type character varying(100),
  employee_count integer,
  data_types jsonb DEFAULT '[]'::jsonb,
  processing_purposes jsonb DEFAULT '[]'::jsonb,
  databases jsonb DEFAULT '[]'::jsonb,
  third_parties jsonb DEFAULT '[]'::jsonb,
  security_measures jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  compliance_checklist jsonb,
  compliance_score integer,
  compliance_gaps jsonb,
  profile_data jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  business_id character varying(20) NOT NULL,
  tier subscription_tier DEFAULT 'basic'::subscription_tier,
  status org_status DEFAULT 'onboarding'::org_status,
  risk_level text DEFAULT 'standard'::risk_level,
  dpo_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_id uuid,
  subscription_status character varying(50) DEFAULT 'none'::character varying,
  contact_email character varying(255),
  contact_phone character varying(50),
  trial_ends_at timestamp with time zone DEFAULT (now() + '14 days'::interval),
  owner_email text,
  trial_start_date timestamp without time zone DEFAULT now(),
  trial_end_date timestamp without time zone DEFAULT (now() + '14 days'::interval),
  onboarding_progress jsonb DEFAULT '{"dpo_intro": false, "org_setup": true, "completed_at": null, "ropa_started": false, "first_document": false}'::jsonb,
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  last_payment_date timestamp with time zone,
  last_payment_amount integer,
  compliance_score integer DEFAULT 0,
  payment_token text,
  payment_card_mask text,
  failed_payment_attempts integer DEFAULT 0,
  payment_token_expiry text,
  public_slug text,
  trust_page_enabled boolean DEFAULT false,
  data_flow_overrides jsonb,
  dpo_role_in_org text,
  dpo_conflict_status text NOT NULL DEFAULT 'not_assessed'::text,
  dpo_conflict_acknowledged_at timestamp with time zone,
  dpo_conflict_acknowledged_by text,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  subscription_id uuid,
  amount integer NOT NULL,
  currency character varying(10) NOT NULL DEFAULT 'ILS'::character varying,
  status character varying(50) NOT NULL,
  tranzila_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE payment_transactions (
  id character varying(100) NOT NULL,
  org_id uuid,
  user_id uuid,
  amount integer NOT NULL,
  plan character varying(20) NOT NULL,
  is_annual boolean DEFAULT false,
  status character varying(20) DEFAULT 'pending'::character varying,
  hyp_transaction_id character varying(100),
  hyp_status character varying(20),
  hyp_status_text text,
  error_code character varying(50),
  error_text text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  provider text DEFAULT 'cardcom'::text,
  lowprofile_code text,
  cardcom_transaction_id text,
  cardcom_approval_number text,
  cardcom_response text,
  card_token text,
  card_mask text,
  card_expiry text,
  card_brand text,
  invoice_number text,
  error_message text
);

CREATE TABLE payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  subscription_id uuid,
  amount numeric(10,2) NOT NULL,
  currency character varying(3) DEFAULT 'ILS'::character varying,
  type character varying(20) DEFAULT 'subscription'::character varying,
  status character varying(20) DEFAULT 'completed'::character varying,
  gateway_ref character varying(100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE processing_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  department text,
  status text DEFAULT 'draft'::text,
  legal_basis text,
  legal_basis_details text,
  data_categories jsonb DEFAULT '[]'::jsonb,
  special_categories jsonb DEFAULT '[]'::jsonb,
  data_subject_categories jsonb DEFAULT '[]'::jsonb,
  estimated_records_count integer,
  includes_minors boolean DEFAULT false,
  purposes jsonb DEFAULT '[]'::jsonb,
  internal_recipients jsonb DEFAULT '[]'::jsonb,
  external_recipients jsonb DEFAULT '[]'::jsonb,
  international_transfers boolean DEFAULT false,
  transfer_countries jsonb DEFAULT '[]'::jsonb,
  transfer_safeguards text,
  retention_period text,
  retention_justification text,
  deletion_process text,
  security_measures jsonb DEFAULT '[]'::jsonb,
  security_level text,
  systems_used jsonb DEFAULT '[]'::jsonb,
  storage_locations jsonb DEFAULT '[]'::jsonb,
  risk_level text,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  requires_dpia boolean DEFAULT false,
  dpia_completed boolean DEFAULT false,
  dpia_date date,
  requires_ppa_registration boolean DEFAULT false,
  ppa_registration_status text,
  ppa_registration_number text,
  ppa_registration_date date,
  ppa_expiry_date date,
  ai_risk_assessment text,
  ai_recommendations jsonb DEFAULT '[]'::jsonb,
  ai_analyzed_at timestamp with time zone,
  created_by uuid,
  last_reviewed_at timestamp with time zone,
  last_reviewed_by uuid,
  next_review_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE processing_activity_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  processing_activity_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  purpose text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE qa_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  user_id uuid,
  question text NOT NULL,
  answer text,
  confidence_score numeric(3,2),
  escalated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  dpo_response text,
  dpo_time_minutes integer DEFAULT 0,
  resolved_at timestamp with time zone
);

CREATE TABLE qa_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  intent text,
  source text DEFAULT 'chat'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE quiz_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50),
  company character varying(255),
  is_public_body character varying(10),
  data_trading character varying(10),
  large_database character varying(10),
  systematic_monitoring character varying(10),
  sensitive_data character varying(10),
  supplier_to_public character varying(10),
  result character varying(20) NOT NULL,
  source character varying(100) DEFAULT 'quiz'::character varying,
  user_agent text,
  status character varying(20) DEFAULT 'new'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE regulatory_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text NOT NULL,
  source_org regulatory_source_org NOT NULL,
  version integer NOT NULL DEFAULT 1,
  content_hash text NOT NULL,
  raw_html text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  superseded_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE regulatory_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  ordinal integer NOT NULL,
  heading text,
  anchor text,
  content_text text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1024)
);

CREATE TABLE review_pricing (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  review_type character varying(50) NOT NULL,
  name_he character varying(100) NOT NULL,
  base_price numeric(10,2) NOT NULL,
  urgent_multiplier numeric(3,2) DEFAULT 1.5,
  description_he text,
  estimated_hours numeric(4,2),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE ropa_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  processing_activity_id uuid,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  performed_by uuid,
  performed_by_type text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE security_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  incident_type text NOT NULL DEFAULT 'unknown'::text,
  severity text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'reported'::text,
  discovered_at timestamp with time zone NOT NULL,
  reported_at timestamp with time zone DEFAULT now(),
  contained_at timestamp with time zone,
  authority_notified_at timestamp with time zone,
  individuals_notified_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  authority_deadline timestamp with time zone,
  data_types_affected text[],
  data_categories text[],
  records_affected integer,
  individuals_affected integer,
  geographic_scope text[],
  risk_to_individuals text DEFAULT 'unknown'::text,
  risk_assessment_notes text,
  requires_authority_notification boolean DEFAULT false,
  requires_individual_notification boolean DEFAULT false,
  root_cause text,
  root_cause_category text,
  containment_measures text,
  is_contained boolean DEFAULT false,
  remediation_steps text,
  preventive_measures text,
  reported_by_name text,
  reported_by_email text,
  reported_by_role text,
  dpo_notes text,
  dpo_decision text,
  dpo_decision_at timestamp with time zone,
  dpo_decision_by text,
  ai_summary text,
  ai_risk_assessment text,
  ai_recommendations text,
  ai_authority_draft text,
  ai_individuals_draft text,
  ai_analyzed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'dashboard'::text
);

CREATE TABLE subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  tier subscription_tier DEFAULT 'basic'::subscription_tier,
  monthly_price numeric(10,2) NOT NULL,
  dpo_minutes_quota integer DEFAULT 30,
  dpo_minutes_used integer DEFAULT 0,
  status subscription_status DEFAULT 'active'::subscription_status,
  created_at timestamp with time zone DEFAULT now(),
  token character varying(100),
  token_expiry character varying(10),
  transaction_index character varying(50),
  last_payment_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text
);

CREATE TABLE team_personas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  display_name_he text NOT NULL,
  role_he text NOT NULL,
  system_prompt_key text NOT NULL,
  domain_ownership text[] NOT NULL,
  avatar_seed text NOT NULL,
  color text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE token_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  amount integer NOT NULL,
  reason character varying(255),
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  email character varying(255) NOT NULL,
  name character varying(255) NOT NULL,
  role user_role DEFAULT 'employee'::user_role,
  auth_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  phone character varying(50),
  email_sequence_stage integer DEFAULT 0,
  last_email_sent timestamp without time zone
);

CREATE TABLE work_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  year integer NOT NULL,
  status character varying(20) DEFAULT 'active'::character varying,
  tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);


-- ============================================================
-- CONSTRAINTS (PK / FK / UNIQUE / CHECK)  (179)
-- ============================================================

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text])));

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['cron'::text, 'event'::text, 'user'::text])));

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_parent_run_id_fkey FOREIGN KEY (parent_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);

ALTER TABLE agent_scratchpad ADD CONSTRAINT agent_scratchpad_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE agent_scratchpad ADD CONSTRAINT agent_scratchpad_pkey PRIMARY KEY (id);

ALTER TABLE agent_scratchpad ADD CONSTRAINT agent_scratchpad_org_id_persona_slug_scratch_key_key UNIQUE (org_id, persona_slug, scratch_key);

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE calculator_leads ADD CONSTRAINT calculator_leads_pkey PRIMARY KEY (id);

ALTER TABLE cameras ADD CONSTRAINT cameras_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cameras ADD CONSTRAINT cameras_pkey PRIMARY KEY (id);

ALTER TABLE chat_conversation_summaries ADD CONSTRAINT chat_conversation_summaries_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE chat_conversation_summaries ADD CONSTRAINT chat_conversation_summaries_pkey PRIMARY KEY (id);

ALTER TABLE chat_conversation_summaries ADD CONSTRAINT chat_conversation_summaries_conversation_id_key UNIQUE (conversation_id);

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])));

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE compliance_reviews ADD CONSTRAINT compliance_reviews_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE compliance_reviews ADD CONSTRAINT compliance_reviews_pkey PRIMARY KEY (id);

ALTER TABLE consultation_tokens ADD CONSTRAINT consultation_tokens_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE consultation_tokens ADD CONSTRAINT consultation_tokens_pkey PRIMARY KEY (id);

ALTER TABLE consultation_tokens ADD CONSTRAINT consultation_tokens_org_id_key UNIQUE (org_id);

ALTER TABLE data_recipients ADD CONSTRAINT data_recipients_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE data_recipients ADD CONSTRAINT data_recipients_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending_review'::text])));

ALTER TABLE data_recipients ADD CONSTRAINT data_recipients_type_check CHECK ((type = ANY (ARRAY['processor'::text, 'controller'::text, 'joint_controller'::text, 'other'::text])));

ALTER TABLE data_recipients ADD CONSTRAINT data_recipients_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE data_recipients ADD CONSTRAINT data_recipients_pkey PRIMARY KEY (id);

ALTER TABLE data_subject_requests ADD CONSTRAINT data_subject_requests_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE data_subject_requests ADD CONSTRAINT data_subject_requests_pkey PRIMARY KEY (id);

ALTER TABLE data_subject_requests ADD CONSTRAINT data_subject_requests_request_number_key UNIQUE (request_number);

ALTER TABLE database_scenarios ADD CONSTRAINT database_scenarios_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE database_scenarios ADD CONSTRAINT database_scenarios_pkey PRIMARY KEY (id);

ALTER TABLE document_reviews ADD CONSTRAINT document_reviews_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE document_reviews ADD CONSTRAINT document_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE document_reviews ADD CONSTRAINT document_reviews_pkey PRIMARY KEY (id);

ALTER TABLE documents ADD CONSTRAINT documents_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

ALTER TABLE dpia_assessments ADD CONSTRAINT dpia_assessments_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE dpia_assessments ADD CONSTRAINT dpia_assessments_pkey PRIMARY KEY (id);

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_ai_confidence_check CHECK (((ai_confidence >= (0)::double precision) AND (ai_confidence <= (1)::double precision)));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_ai_risk_score_check CHECK (((ai_risk_score >= (0)::double precision) AND (ai_risk_score <= (1)::double precision)));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_priority_check CHECK ((priority = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_resolution_type_check CHECK ((resolution_type = ANY (ARRAY['approved_ai'::text, 'edited'::text, 'manual'::text, 'rejected'::text, 'auto'::text])));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'auto_resolved'::text, 'dismissed'::text])));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_type_check CHECK ((type = ANY (ARRAY['escalation'::text, 'dsr'::text, 'incident'::text, 'review'::text, 'onboarding'::text, 'document_expiry'::text, 'regulator'::text])));

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE dpo_queue ADD CONSTRAINT dpo_queue_pkey PRIMARY KEY (id);

ALTER TABLE dpo_reports ADD CONSTRAINT dpo_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE dpo_reports ADD CONSTRAINT dpo_reports_pkey PRIMARY KEY (id);

ALTER TABLE dpo_sessions ADD CONSTRAINT dpo_sessions_pkey PRIMARY KEY (id);

ALTER TABLE dpo_sessions ADD CONSTRAINT dpo_sessions_token_key UNIQUE (token);

ALTER TABLE dpo_settings ADD CONSTRAINT dpo_settings_pkey PRIMARY KEY (id);

ALTER TABLE dpo_time_log ADD CONSTRAINT dpo_time_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE dpo_time_log ADD CONSTRAINT dpo_time_log_queue_item_id_fkey FOREIGN KEY (queue_item_id) REFERENCES dpo_queue(id) ON DELETE SET NULL;

ALTER TABLE dpo_time_log ADD CONSTRAINT dpo_time_log_pkey PRIMARY KEY (id);

ALTER TABLE dpos ADD CONSTRAINT dpos_pkey PRIMARY KEY (id);

ALTER TABLE dpos ADD CONSTRAINT dpos_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE dpos ADD CONSTRAINT dpos_email_key UNIQUE (email);

ALTER TABLE escalations ADD CONSTRAINT escalations_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE escalations ADD CONSTRAINT escalations_pkey PRIMARY KEY (id);

ALTER TABLE hub_artifact_citations ADD CONSTRAINT hub_artifact_citations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_artifact_citations ADD CONSTRAINT hub_artifact_citations_regulatory_section_id_fkey FOREIGN KEY (regulatory_section_id) REFERENCES regulatory_sections(id) ON DELETE RESTRICT;

ALTER TABLE hub_artifact_citations ADD CONSTRAINT hub_artifact_citations_pkey PRIMARY KEY (id);

ALTER TABLE hub_asset_templates ADD CONSTRAINT hub_asset_templates_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_asset_templates ADD CONSTRAINT hub_asset_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_asset_templates ADD CONSTRAINT hub_asset_templates_pkey PRIMARY KEY (id);

ALTER TABLE hub_asset_templates ADD CONSTRAINT hub_asset_templates_slug_version_key UNIQUE (slug, version);

ALTER TABLE hub_asset_templates ADD CONSTRAINT hub_asset_templates_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE hub_continuation_services ADD CONSTRAINT hub_continuation_services_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_continuation_services ADD CONSTRAINT hub_continuation_services_price_model_check CHECK (((price_model IS NULL) OR (price_model = ANY (ARRAY['one_time'::text, 'recurring'::text, 'quote'::text]))));

ALTER TABLE hub_continuation_services ADD CONSTRAINT hub_continuation_services_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_continuation_services ADD CONSTRAINT hub_continuation_services_pkey PRIMARY KEY (id);

ALTER TABLE hub_continuation_services ADD CONSTRAINT hub_continuation_services_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE hub_control_playbooks ADD CONSTRAINT hub_control_playbooks_cadence_check CHECK ((cadence = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'biannual'::text, 'annual'::text])));

ALTER TABLE hub_control_playbooks ADD CONSTRAINT hub_control_playbooks_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_control_playbooks ADD CONSTRAINT hub_control_playbooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_control_playbooks ADD CONSTRAINT hub_control_playbooks_pkey PRIMARY KEY (id);

ALTER TABLE hub_control_playbooks ADD CONSTRAINT hub_control_playbooks_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE hub_document_templates ADD CONSTRAINT hub_document_templates_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_document_templates ADD CONSTRAINT hub_document_templates_output_format_check CHECK ((output_format = ANY (ARRAY['markdown'::text, 'html'::text, 'plain'::text])));

ALTER TABLE hub_document_templates ADD CONSTRAINT hub_document_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_document_templates ADD CONSTRAINT hub_document_templates_pkey PRIMARY KEY (id);

ALTER TABLE hub_document_templates ADD CONSTRAINT hub_document_templates_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE hub_gap_rules ADD CONSTRAINT hub_gap_rules_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_gap_rules ADD CONSTRAINT hub_gap_rules_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));

ALTER TABLE hub_gap_rules ADD CONSTRAINT hub_gap_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_gap_rules ADD CONSTRAINT hub_gap_rules_pkey PRIMARY KEY (id);

ALTER TABLE hub_gap_rules ADD CONSTRAINT hub_gap_rules_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE hub_questions ADD CONSTRAINT hub_questions_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE hub_questions ADD CONSTRAINT hub_questions_question_type_check CHECK ((question_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'single_choice'::text, 'multi_choice'::text, 'list'::text, 'date'::text])));

ALTER TABLE hub_questions ADD CONSTRAINT hub_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hub_questions ADD CONSTRAINT hub_questions_pkey PRIMARY KEY (id);

ALTER TABLE hub_questions ADD CONSTRAINT hub_questions_template_id_version_key UNIQUE (template_id, version);

ALTER TABLE incident_actions ADD CONSTRAINT incident_actions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES security_incidents(id) ON DELETE CASCADE;

ALTER TABLE incident_actions ADD CONSTRAINT incident_actions_pkey PRIMARY KEY (id);

ALTER TABLE incident_notifications ADD CONSTRAINT incident_notifications_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES security_incidents(id) ON DELETE CASCADE;

ALTER TABLE incident_notifications ADD CONSTRAINT incident_notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE incident_notifications ADD CONSTRAINT incident_notifications_pkey PRIMARY KEY (id);

ALTER TABLE leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);

ALTER TABLE message_threads ADD CONSTRAINT message_threads_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE message_threads ADD CONSTRAINT message_threads_pkey PRIMARY KEY (id);

ALTER TABLE messages ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE;

ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE notifications ADD CONSTRAINT notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE org_compliance_scores ADD CONSTRAINT org_compliance_scores_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE org_compliance_scores ADD CONSTRAINT org_compliance_scores_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_compliance_scores ADD CONSTRAINT org_compliance_scores_pkey PRIMARY KEY (id);

ALTER TABLE org_compliance_scores ADD CONSTRAINT org_compliance_scores_org_id_key UNIQUE (org_id);

ALTER TABLE org_facts ADD CONSTRAINT org_facts_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)));

ALTER TABLE org_facts ADD CONSTRAINT org_facts_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_facts ADD CONSTRAINT org_facts_pkey PRIMARY KEY (id);

ALTER TABLE org_facts ADD CONSTRAINT org_facts_org_id_fact_key_key UNIQUE (org_id, fact_key);

ALTER TABLE org_memory ADD CONSTRAINT org_memory_source_check CHECK ((source = ANY (ARRAY['onboarding'::text, 'chat'::text, 'ropa'::text, 'incident'::text, 'manual'::text])));

ALTER TABLE org_memory ADD CONSTRAINT org_memory_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_memory ADD CONSTRAINT org_memory_pkey PRIMARY KEY (id);

ALTER TABLE organization_profiles ADD CONSTRAINT organization_profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_profiles ADD CONSTRAINT organization_profiles_pkey PRIMARY KEY (id);

ALTER TABLE organizations ADD CONSTRAINT organizations_dpo_conflict_status_check CHECK ((dpo_conflict_status = ANY (ARRAY['not_assessed'::text, 'conflict_unresolved'::text, 'conflict_acknowledged'::text, 'no_conflict'::text, 'resolved_by_reassignment'::text, 'resolved_by_external_dpo'::text])));

ALTER TABLE organizations ADD CONSTRAINT organizations_dpo_role_in_org_check CHECK ((dpo_role_in_org = ANY (ARRAY['none'::text, 'ceo'::text, 'ciso'::text, 'legal'::text, 'hr'::text, 'cfo'::text, 'hr_director'::text, 'other'::text])));

ALTER TABLE organizations ADD CONSTRAINT organizations_dpo_id_fkey FOREIGN KEY (dpo_id) REFERENCES dpos(id);

ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

ALTER TABLE organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE organizations ADD CONSTRAINT organizations_public_slug_key UNIQUE (public_slug);

ALTER TABLE payment_logs ADD CONSTRAINT payment_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

ALTER TABLE payment_logs ADD CONSTRAINT payment_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

ALTER TABLE payment_logs ADD CONSTRAINT payment_logs_pkey PRIMARY KEY (id);

ALTER TABLE payment_transactions ADD CONSTRAINT valid_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])));

ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);

ALTER TABLE payments ADD CONSTRAINT payments_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE payments ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

ALTER TABLE payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_legal_basis_check CHECK ((legal_basis = ANY (ARRAY['consent'::text, 'contract'::text, 'legal_obligation'::text, 'vital_interests'::text, 'public_interest'::text, 'legitimate_interest'::text])));

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_ppa_registration_status_check CHECK ((ppa_registration_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'registered'::text, 'expired'::text])));

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_security_level_check CHECK ((security_level = ANY (ARRAY['basic'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text, 'under_review'::text])));

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE processing_activities ADD CONSTRAINT processing_activities_pkey PRIMARY KEY (id);

ALTER TABLE processing_activity_recipients ADD CONSTRAINT processing_activity_recipients_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id) ON DELETE CASCADE;

ALTER TABLE processing_activity_recipients ADD CONSTRAINT processing_activity_recipients_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES data_recipients(id) ON DELETE CASCADE;

ALTER TABLE processing_activity_recipients ADD CONSTRAINT processing_activity_recipients_pkey PRIMARY KEY (id);

ALTER TABLE processing_activity_recipients ADD CONSTRAINT processing_activity_recipient_processing_activity_id_recipi_key UNIQUE (processing_activity_id, recipient_id);

ALTER TABLE qa_interactions ADD CONSTRAINT qa_interactions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE qa_interactions ADD CONSTRAINT qa_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE qa_interactions ADD CONSTRAINT qa_interactions_pkey PRIMARY KEY (id);

ALTER TABLE qa_log ADD CONSTRAINT qa_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE qa_log ADD CONSTRAINT qa_log_pkey PRIMARY KEY (id);

ALTER TABLE quiz_leads ADD CONSTRAINT quiz_leads_pkey PRIMARY KEY (id);

ALTER TABLE regulatory_documents ADD CONSTRAINT regulatory_documents_superseded_by_fkey FOREIGN KEY (superseded_by) REFERENCES regulatory_documents(id) ON DELETE SET NULL;

ALTER TABLE regulatory_documents ADD CONSTRAINT regulatory_documents_pkey PRIMARY KEY (id);

ALTER TABLE regulatory_documents ADD CONSTRAINT regulatory_documents_url_version_key UNIQUE (url, version);

ALTER TABLE regulatory_sections ADD CONSTRAINT regulatory_sections_document_id_fkey FOREIGN KEY (document_id) REFERENCES regulatory_documents(id) ON DELETE CASCADE;

ALTER TABLE regulatory_sections ADD CONSTRAINT regulatory_sections_pkey PRIMARY KEY (id);

ALTER TABLE regulatory_sections ADD CONSTRAINT regulatory_sections_document_id_ordinal_key UNIQUE (document_id, ordinal);

ALTER TABLE review_pricing ADD CONSTRAINT review_pricing_pkey PRIMARY KEY (id);

ALTER TABLE ropa_audit_log ADD CONSTRAINT ropa_audit_log_performed_by_type_check CHECK ((performed_by_type = ANY (ARRAY['user'::text, 'dpo'::text, 'system'::text])));

ALTER TABLE ropa_audit_log ADD CONSTRAINT ropa_audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE ropa_audit_log ADD CONSTRAINT ropa_audit_log_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id) ON DELETE SET NULL;

ALTER TABLE ropa_audit_log ADD CONSTRAINT ropa_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE security_incidents ADD CONSTRAINT security_incidents_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE security_incidents ADD CONSTRAINT security_incidents_pkey PRIMARY KEY (id);

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE team_personas ADD CONSTRAINT team_personas_pkey PRIMARY KEY (id);

ALTER TABLE team_personas ADD CONSTRAINT team_personas_slug_key UNIQUE (slug);

ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_pkey PRIMARY KEY (id);

ALTER TABLE users ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE work_plans ADD CONSTRAINT work_plans_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE work_plans ADD CONSTRAINT work_plans_pkey PRIMARY KEY (id);

ALTER TABLE work_plans ADD CONSTRAINT work_plans_org_id_year_key UNIQUE (org_id, year);


-- ============================================================
-- INDEXES (non-constraint)  (115)
-- ============================================================

CREATE INDEX idx_agent_runs_org_persona_created ON public.agent_runs USING btree (org_id, persona_slug, created_at DESC);

CREATE INDEX idx_agent_runs_status ON public.agent_runs USING btree (status) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));

CREATE INDEX idx_agent_scratchpad_lookup ON public.agent_scratchpad USING btree (org_id, persona_slug, scratch_key);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_org_id ON public.audit_logs USING btree (org_id);

CREATE INDEX idx_calculator_leads_created ON public.calculator_leads USING btree (created_at DESC);

CREATE INDEX idx_calculator_leads_email ON public.calculator_leads USING btree (email);

CREATE INDEX idx_calculator_leads_result ON public.calculator_leads USING btree (result_status);

CREATE INDEX idx_cameras_org_review_due ON public.cameras USING btree (org_id, next_review_due_at);

CREATE INDEX idx_cameras_org_signage_missing ON public.cameras USING btree (org_id) WHERE (signage_present = false);

CREATE INDEX idx_conv_summaries_conv ON public.chat_conversation_summaries USING btree (conversation_id);

CREATE INDEX idx_conv_summaries_org ON public.chat_conversation_summaries USING btree (org_id);

CREATE INDEX idx_chat_messages_conv ON public.chat_messages USING btree (conversation_id);

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);

CREATE INDEX idx_chat_messages_org ON public.chat_messages USING btree (org_id);

CREATE INDEX idx_chat_messages_org_id ON public.chat_messages USING btree (org_id);

CREATE INDEX idx_compliance_reviews_org ON public.compliance_reviews USING btree (org_id, status);

CREATE INDEX idx_data_recipients_org ON public.data_recipients USING btree (org_id);

CREATE INDEX idx_dsr_deadline ON public.data_subject_requests USING btree (deadline);

CREATE INDEX idx_dsr_org ON public.data_subject_requests USING btree (org_id);

CREATE INDEX idx_dsr_org_id ON public.data_subject_requests USING btree (org_id);

CREATE INDEX idx_dsr_request_number ON public.data_subject_requests USING btree (request_number);

CREATE INDEX idx_dsr_status ON public.data_subject_requests USING btree (status);

CREATE INDEX idx_db_scenarios_applied ON public.database_scenarios USING btree (is_applied);

CREATE INDEX idx_db_scenarios_org ON public.database_scenarios USING btree (org_id);

CREATE INDEX idx_document_reviews_org ON public.document_reviews USING btree (org_id);

CREATE INDEX idx_document_reviews_status ON public.document_reviews USING btree (status);

CREATE INDEX idx_documents_org ON public.documents USING btree (org_id);

CREATE INDEX idx_dpia_org ON public.dpia_assessments USING btree (org_id);

CREATE INDEX idx_dpia_review ON public.dpia_assessments USING btree (next_review_date) WHERE (status <> 'archived'::text);

CREATE INDEX idx_dpo_queue_created ON public.dpo_queue USING btree (created_at DESC);

CREATE INDEX idx_dpo_queue_deadline ON public.dpo_queue USING btree (deadline_at);

CREATE INDEX idx_dpo_queue_org ON public.dpo_queue USING btree (org_id);

CREATE INDEX idx_dpo_queue_org_id ON public.dpo_queue USING btree (org_id);

CREATE INDEX idx_dpo_queue_priority ON public.dpo_queue USING btree (priority);

CREATE INDEX idx_dpo_queue_status ON public.dpo_queue USING btree (status);

CREATE INDEX idx_dpo_queue_type ON public.dpo_queue USING btree (type);

CREATE INDEX idx_dpo_reports_org ON public.dpo_reports USING btree (org_id);

CREATE INDEX idx_dpo_reports_period ON public.dpo_reports USING btree (period_end DESC);

CREATE INDEX idx_dpo_sessions_token ON public.dpo_sessions USING btree (token);

CREATE INDEX idx_dpo_time_created ON public.dpo_time_log USING btree (created_at);

CREATE INDEX idx_dpo_time_log_org ON public.dpo_time_log USING btree (org_id);

CREATE INDEX idx_dpo_time_org ON public.dpo_time_log USING btree (org_id);

CREATE INDEX idx_dpos_auth_user ON public.dpos USING btree (auth_user_id);

CREATE INDEX idx_escalations_status ON public.escalations USING btree (status);

CREATE INDEX idx_hub_artifact_citations_artifact ON public.hub_artifact_citations USING btree (artifact_table, artifact_id, artifact_version);

CREATE INDEX idx_hub_artifact_citations_section ON public.hub_artifact_citations USING btree (regulatory_section_id);

CREATE INDEX idx_hub_asset_templates_source_tier ON public.hub_asset_templates USING btree (source_tier);

CREATE INDEX idx_hub_asset_templates_template_active ON public.hub_asset_templates USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_hub_continuation_services_source_tier ON public.hub_continuation_services USING btree (source_tier);

CREATE INDEX idx_hub_continuation_services_template_active ON public.hub_continuation_services USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_hub_control_playbooks_asset_template ON public.hub_control_playbooks USING btree (asset_template_id) WHERE (active = true);

CREATE INDEX idx_hub_control_playbooks_source_tier ON public.hub_control_playbooks USING btree (source_tier);

CREATE INDEX idx_hub_control_playbooks_template_active ON public.hub_control_playbooks USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_hub_document_templates_asset_template ON public.hub_document_templates USING btree (asset_template_id) WHERE (active = true);

CREATE INDEX idx_hub_document_templates_source_tier ON public.hub_document_templates USING btree (source_tier);

CREATE INDEX idx_hub_document_templates_template_active ON public.hub_document_templates USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_hub_gap_rules_asset_template ON public.hub_gap_rules USING btree (asset_template_id) WHERE (active = true);

CREATE INDEX idx_hub_gap_rules_source_tier ON public.hub_gap_rules USING btree (source_tier);

CREATE INDEX idx_hub_gap_rules_template_active ON public.hub_gap_rules USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_hub_questions_asset_template ON public.hub_questions USING btree (asset_template_id) WHERE (active = true);

CREATE INDEX idx_hub_questions_source_tier ON public.hub_questions USING btree (source_tier);

CREATE INDEX idx_hub_questions_template_active ON public.hub_questions USING btree (template_id, version DESC) WHERE (active = true);

CREATE INDEX idx_incident_actions_incident ON public.incident_actions USING btree (incident_id);

CREATE INDEX idx_incident_notifications_incident ON public.incident_notifications USING btree (incident_id);

CREATE INDEX leads_created_at_idx ON public.leads USING btree (created_at DESC);

CREATE INDEX idx_message_threads_org ON public.message_threads USING btree (org_id);

CREATE INDEX idx_message_threads_status ON public.message_threads USING btree (status);

CREATE INDEX idx_threads_org ON public.message_threads USING btree (org_id);

CREATE INDEX idx_threads_status ON public.message_threads USING btree (status);

CREATE INDEX idx_messages_read ON public.messages USING btree (read_at) WHERE (read_at IS NULL);

CREATE INDEX idx_messages_sender_type ON public.messages USING btree (sender_type);

CREATE INDEX idx_messages_thread ON public.messages USING btree (thread_id);

CREATE INDEX idx_notifications_actor ON public.notifications USING btree (actor) WHERE (actor IS NOT NULL);

CREATE INDEX idx_notifications_org ON public.notifications USING btree (org_id);

CREATE UNIQUE INDEX notifications_org_type_title_unique ON public.notifications USING btree (org_id, type, title);

CREATE INDEX idx_compliance_next_review ON public.org_compliance_scores USING btree (next_review_at);

CREATE INDEX idx_compliance_risk ON public.org_compliance_scores USING btree (risk_level);

CREATE INDEX idx_org_facts_lookup ON public.org_facts USING btree (org_id, fact_key);

CREATE INDEX idx_org_memory_org ON public.org_memory USING btree (org_id);

CREATE INDEX idx_org_memory_source ON public.org_memory USING btree (org_id, source);

CREATE INDEX idx_organizations_status ON public.organizations USING btree (status);

CREATE INDEX idx_orgs_public_slug ON public.organizations USING btree (public_slug);

CREATE INDEX idx_orgs_subscription_status ON public.organizations USING btree (subscription_status);

CREATE INDEX idx_orgs_trial_end_date ON public.organizations USING btree (trial_end_date);

CREATE INDEX idx_payment_logs_created_at ON public.payment_logs USING btree (created_at);

CREATE INDEX idx_payment_logs_org_id ON public.payment_logs USING btree (org_id);

CREATE INDEX idx_payment_transactions_lowprofile ON public.payment_transactions USING btree (lowprofile_code);

CREATE INDEX idx_payment_transactions_lowprofile_code ON public.payment_transactions USING btree (lowprofile_code);

CREATE INDEX idx_payment_transactions_org_id ON public.payment_transactions USING btree (org_id);

CREATE INDEX idx_payment_transactions_provider ON public.payment_transactions USING btree (provider);

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);

CREATE UNIQUE INDEX payment_transactions_lowprofile_code_uq ON public.payment_transactions USING btree (lowprofile_code) WHERE (lowprofile_code IS NOT NULL);

CREATE INDEX idx_payments_org ON public.payments USING btree (org_id);

CREATE INDEX idx_processing_activities_org ON public.processing_activities USING btree (org_id);

CREATE INDEX idx_processing_activities_ppa ON public.processing_activities USING btree (requires_ppa_registration);

CREATE INDEX idx_processing_activities_risk ON public.processing_activities USING btree (risk_level);

CREATE INDEX idx_processing_activities_status ON public.processing_activities USING btree (status);

CREATE INDEX idx_qa_org ON public.qa_interactions USING btree (org_id);

CREATE INDEX idx_qa_log_org_id ON public.qa_log USING btree (org_id);

CREATE INDEX idx_regulatory_documents_current ON public.regulatory_documents USING btree (url, version DESC) WHERE (superseded_by IS NULL);

CREATE INDEX idx_regulatory_documents_source_org ON public.regulatory_documents USING btree (source_org);

CREATE INDEX idx_regulatory_documents_url ON public.regulatory_documents USING btree (url);

CREATE INDEX idx_regulatory_sections_document ON public.regulatory_sections USING btree (document_id, ordinal);

CREATE INDEX regulatory_sections_embedding_idx ON public.regulatory_sections USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_ropa_audit_org ON public.ropa_audit_log USING btree (org_id);

CREATE INDEX idx_incidents_deadline ON public.security_incidents USING btree (authority_deadline);

CREATE INDEX idx_incidents_org ON public.security_incidents USING btree (org_id);

CREATE INDEX idx_incidents_severity ON public.security_incidents USING btree (severity);

CREATE INDEX idx_incidents_status ON public.security_incidents USING btree (status);

CREATE INDEX idx_subscriptions_org ON public.subscriptions USING btree (org_id);

CREATE INDEX idx_subscriptions_org_id ON public.subscriptions USING btree (org_id);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE INDEX idx_token_transactions_org ON public.token_transactions USING btree (org_id, created_at);

CREATE INDEX idx_work_plans_org_year ON public.work_plans USING btree (org_id, year);


-- ============================================================
-- ROW LEVEL SECURITY (enable / force)  (55)
-- ============================================================

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE agent_scratchpad ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE calculator_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

ALTER TABLE chat_conversation_summaries ENABLE ROW LEVEL SECURITY;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE compliance_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE consultation_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE data_recipients ENABLE ROW LEVEL SECURITY;

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE database_scenarios ENABLE ROW LEVEL SECURITY;

ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpia_assessments ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpo_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpo_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpo_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpo_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpo_time_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE dpos ENABLE ROW LEVEL SECURITY;

ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_artifact_citations ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_asset_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_continuation_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_control_playbooks ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_document_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_gap_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE hub_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE incident_actions ENABLE ROW LEVEL SECURITY;

ALTER TABLE incident_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE org_compliance_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE org_facts ENABLE ROW LEVEL SECURITY;

ALTER TABLE org_memory ENABLE ROW LEVEL SECURITY;

ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE processing_activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE processing_activity_recipients ENABLE ROW LEVEL SECURITY;

ALTER TABLE qa_interactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE qa_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE quiz_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE ropa_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE team_personas ENABLE ROW LEVEL SECURITY;

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE work_plans ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- POLICIES  (89)
-- ============================================================

CREATE POLICY agent_runs_select_own_org ON agent_runs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org audit logs" ON audit_logs AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY audit_logs_insert_own ON audit_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY audit_logs_select_own ON audit_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Allow anonymous lead insert" ON calculator_leads AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON calculator_leads AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY cameras_delete_own_org ON cameras AS PERMISSIVE FOR DELETE TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY cameras_insert_own_org ON cameras AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY cameras_select_own_org ON cameras AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY cameras_update_own_org ON cameras AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))))
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org summaries" ON chat_conversation_summaries AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org reviews" ON compliance_reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org tokens" ON consultation_tokens AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can manage own org recipients" ON data_recipients AS PERMISSIVE FOR ALL TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org recipients" ON data_recipients AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Public can insert requests" ON data_subject_requests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Service can insert requests" ON data_subject_requests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can update org requests" ON data_subject_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can update own org requests" ON data_subject_requests AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view org requests" ON data_subject_requests AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org requests" ON data_subject_requests AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can insert document reviews for own org" ON document_reviews AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can update own org document reviews" ON document_reviews AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org document reviews" ON document_reviews AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "DPOs can view assigned org documents" ON documents AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.dpo_id IN ( SELECT dpos.id
           FROM dpos
          WHERE (dpos.auth_user_id = auth.uid()))))) OR (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid())))));

CREATE POLICY documents_select_own ON documents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY documents_update_own ON documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))))
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users see own org DPIAs" ON dpia_assessments AS PERMISSIVE FOR ALL TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY dpo_queue_select_own_org ON dpo_queue AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users see own org reports" ON dpo_reports AS PERMISSIVE FOR ALL TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "DPOs can update own record" ON dpos AS PERMISSIVE FOR UPDATE TO public
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "DPOs can view own record" ON dpos AS PERMISSIVE FOR SELECT TO public
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "DPOs can update escalations" ON escalations AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.dpo_id IN ( SELECT dpos.id
           FROM dpos
          WHERE (dpos.auth_user_id = auth.uid()))))));

CREATE POLICY "DPOs can view assigned escalations" ON escalations AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.dpo_id IN ( SELECT dpos.id
           FROM dpos
          WHERE (dpos.auth_user_id = auth.uid()))))) OR (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid())))));

CREATE POLICY hub_artifact_citations_select_authenticated ON hub_artifact_citations AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_asset_templates_select_all_authenticated ON hub_asset_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_continuation_services_select_all_authenticated ON hub_continuation_services AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_control_playbooks_select_all_authenticated ON hub_control_playbooks AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_document_templates_select_all_authenticated ON hub_document_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_gap_rules_select_all_authenticated ON hub_gap_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY hub_questions_select_all_authenticated ON hub_questions AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "DPOs can view assigned threads" ON message_threads AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.dpo_id IN ( SELECT dpos.id
           FROM dpos
          WHERE (dpos.auth_user_id = auth.uid()))))) OR (org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid())))));

CREATE POLICY "DPOs can send messages" ON messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((thread_id IN ( SELECT message_threads.id
   FROM message_threads
  WHERE (message_threads.org_id IN ( SELECT organizations.id
           FROM organizations
          WHERE (organizations.dpo_id IN ( SELECT dpos.id
                   FROM dpos
                  WHERE (dpos.auth_user_id = auth.uid()))))))));

CREATE POLICY "DPOs can view assigned messages" ON messages AS PERMISSIVE FOR SELECT TO public
  USING (((thread_id IN ( SELECT message_threads.id
   FROM message_threads
  WHERE (message_threads.org_id IN ( SELECT organizations.id
           FROM organizations
          WHERE (organizations.dpo_id IN ( SELECT dpos.id
                   FROM dpos
                  WHERE (dpos.auth_user_id = auth.uid()))))))) OR (thread_id IN ( SELECT message_threads.id
   FROM message_threads
  WHERE (message_threads.org_id IN ( SELECT users.org_id
           FROM users
          WHERE (users.auth_user_id = auth.uid())))))));

CREATE POLICY org_facts_select_own_org ON org_facts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org memory" ON org_memory AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can create org profile" ON organization_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own org profile" ON organization_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org profile" ON organization_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY organization_profiles_insert_own ON organization_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY organization_profiles_select_own ON organization_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY organization_profiles_update_own ON organization_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))))
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "DPOs can view assigned orgs" ON organizations AS PERMISSIVE FOR SELECT TO public
  USING (((dpo_id IN ( SELECT dpos.id
   FROM dpos
  WHERE (dpos.auth_user_id = auth.uid()))) OR (id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid())))));

CREATE POLICY "Users can create orgs" ON organizations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own org" ON organizations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY organizations_select_own ON organizations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY organizations_update_own ON organizations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))))
  WITH CHECK ((id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org payment logs" ON payment_logs AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Service role full access" ON payment_transactions AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Users can view own transactions" ON payment_transactions AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Allow insert payments" ON payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can insert own org processing activities" ON processing_activities AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can update own org processing activities" ON processing_activities AS PERMISSIVE FOR UPDATE TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org processing activities" ON processing_activities AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Allow anonymous quiz submissions" ON quiz_leads AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY regulatory_documents_insert_service_role ON regulatory_documents AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY regulatory_documents_insert_worker ON regulatory_documents AS PERMISSIVE FOR INSERT TO regulatory_ingest_worker
  WITH CHECK (true);

CREATE POLICY regulatory_documents_select_authenticated ON regulatory_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY regulatory_documents_update_service_role ON regulatory_documents AS PERMISSIVE FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY regulatory_documents_update_worker ON regulatory_documents AS PERMISSIVE FOR UPDATE TO regulatory_ingest_worker
  USING (true)
  WITH CHECK (true);

CREATE POLICY regulatory_sections_insert_service_role ON regulatory_sections AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY regulatory_sections_insert_worker ON regulatory_sections AS PERMISSIVE FOR INSERT TO regulatory_ingest_worker
  WITH CHECK (true);

CREATE POLICY regulatory_sections_select_authenticated ON regulatory_sections AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY regulatory_sections_update_service_role ON regulatory_sections AS PERMISSIVE FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY regulatory_sections_update_worker ON regulatory_sections AS PERMISSIVE FOR UPDATE TO regulatory_ingest_worker
  USING (true)
  WITH CHECK (true);

CREATE POLICY security_incidents_select_own_org ON security_incidents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own org subscriptions" ON subscriptions AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own subscription" ON subscriptions AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can view own subscriptions" ON subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY subscriptions_select_own ON subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY team_personas_select_all ON team_personas AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view own org token transactions" ON token_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can insert own record" ON users AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth_user_id = auth.uid()));

CREATE POLICY "Users can update own record" ON users AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth_user_id = auth.uid()));

CREATE POLICY "Users can view own record" ON users AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth_user_id = auth.uid()));

CREATE POLICY users_insert_self ON users AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth_user_id = auth.uid()));

CREATE POLICY users_select_self_or_org ON users AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth_user_id = auth.uid()) OR (org_id = current_user_org_id())));

CREATE POLICY users_update_self ON users AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth_user_id = auth.uid()))
  WITH CHECK ((auth_user_id = auth.uid()));

CREATE POLICY "Users can view own org work plans" ON work_plans AS PERMISSIVE FOR SELECT TO authenticated
  USING ((org_id IN ( SELECT users.org_id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));


-- ============================================================
-- GRANTS (table privileges by role)  (234)
-- ============================================================

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_runs TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_runs TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_runs TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_runs TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_scratchpad TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_scratchpad TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_scratchpad TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON agent_scratchpad TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON audit_logs TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON audit_logs TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON audit_logs TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON audit_logs TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads_summary TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads_summary TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads_summary TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON calculator_leads_summary TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON cameras TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON cameras TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON cameras TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON cameras TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_conversation_summaries TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_conversation_summaries TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_conversation_summaries TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_conversation_summaries TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_messages TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_messages TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_messages TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON chat_messages TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON compliance_reviews TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON compliance_reviews TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON compliance_reviews TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON compliance_reviews TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON consultation_tokens TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON consultation_tokens TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON consultation_tokens TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON consultation_tokens TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_recipients TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_recipients TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_recipients TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_recipients TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_subject_requests TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_subject_requests TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_subject_requests TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON data_subject_requests TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON database_scenarios TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON database_scenarios TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON database_scenarios TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON database_scenarios TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON document_reviews TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON document_reviews TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON document_reviews TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON document_reviews TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON documents TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON documents TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON documents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON documents TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpia_assessments TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpia_assessments TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpia_assessments TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpia_assessments TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_queue TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_queue TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_queue TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_queue TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_reports TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_reports TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_reports TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_reports TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_sessions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_sessions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_sessions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_sessions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_settings TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_settings TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_settings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_settings TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_time_log TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_time_log TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_time_log TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpo_time_log TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpos TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpos TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpos TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON dpos TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON escalations TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON escalations TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON escalations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON escalations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_artifact_citations TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_artifact_citations TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_artifact_citations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_artifact_citations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_asset_templates TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_asset_templates TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_asset_templates TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_asset_templates TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_continuation_services TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_continuation_services TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_continuation_services TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_continuation_services TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_control_playbooks TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_control_playbooks TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_control_playbooks TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_control_playbooks TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_document_templates TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_document_templates TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_document_templates TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_document_templates TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_gap_rules TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_gap_rules TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_gap_rules TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_gap_rules TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_questions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_questions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_questions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON hub_questions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_actions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_actions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_actions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_actions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_notifications TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_notifications TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_notifications TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON incident_notifications TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON leads TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON leads TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON message_threads TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON message_threads TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON message_threads TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON message_threads TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON messages TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON messages TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON messages TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON messages TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON notifications TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON notifications TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON notifications TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON notifications TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_compliance_scores TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_compliance_scores TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_compliance_scores TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_compliance_scores TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_facts TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_facts TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_facts TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_facts TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_memory TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_memory TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_memory TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON org_memory TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organization_profiles TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organization_profiles TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organization_profiles TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organization_profiles TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organizations TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organizations TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organizations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON organizations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_logs TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_logs TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_logs TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_logs TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_transactions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_transactions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_transactions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payment_transactions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payments TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payments TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payments TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON payments TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activities TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activities TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activities TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activities TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activity_recipients TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activity_recipients TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activity_recipients TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON processing_activity_recipients TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_interactions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_interactions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_interactions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_interactions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_log TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_log TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_log TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON qa_log TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON quiz_leads TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON quiz_leads TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON quiz_leads TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON quiz_leads TO service_role;

GRANT SELECT ON regulatory_documents TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON regulatory_documents TO postgres;

GRANT INSERT, SELECT, UPDATE ON regulatory_documents TO regulatory_ingest_worker;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON regulatory_documents TO service_role;

GRANT SELECT ON regulatory_sections TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON regulatory_sections TO postgres;

GRANT INSERT, SELECT, UPDATE ON regulatory_sections TO regulatory_ingest_worker;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON regulatory_sections TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON review_pricing TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON review_pricing TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON review_pricing TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON review_pricing TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON ropa_audit_log TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON ropa_audit_log TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON ropa_audit_log TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON ropa_audit_log TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON security_incidents TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON security_incidents TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON security_incidents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON security_incidents TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON subscriptions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON subscriptions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON subscriptions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON subscriptions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON team_personas TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON team_personas TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON team_personas TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON team_personas TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON token_transactions TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON token_transactions TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON token_transactions TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON token_transactions TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON users TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON users TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON users TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON users TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON work_plans TO anon;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON work_plans TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON work_plans TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON work_plans TO service_role;


-- ============================================================
-- FUNCTIONS (full definitions; owner + security mode noted)  (128)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$function$

-- ^ owner: postgres | security: DEFINER


CREATE OR REPLACE FUNCTION public.find_similar_section(p_embedding text, p_limit integer DEFAULT 1)
 RETURNS TABLE(id uuid, document_id uuid, ordinal integer, heading text, content_text text, document_title text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    s.id,
    s.document_id,
    s.ordinal,
    s.heading,
    s.content_text,
    d.title AS document_title,
    1 - (s.embedding <=> (p_embedding::vector(1024))) AS similarity
  FROM public.regulatory_sections s
  JOIN public.regulatory_documents d ON d.id = s.document_id
  WHERE s.embedding IS NOT NULL
  ORDER BY s.embedding <=> (p_embedding::vector(1024))
  LIMIT GREATEST(p_limit, 1);
$function$

-- ^ owner: regulatory_ingest_worker | security: DEFINER


CREATE OR REPLACE FUNCTION public.regulatory_ingest_persist(p_url text, p_title text, p_source_org regulatory_source_org, p_content_hash text, p_raw_html text, p_metadata jsonb, p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_existing_id      uuid;
  v_existing_hash    text;
  v_existing_version int;
  v_new_id           uuid;
  v_new_version      int;
  v_section          jsonb;
  v_action           text;
  v_target_id        uuid;
  v_embedding_text   text;
  v_inserted_count   int := 0;
  v_replaced_count   int := 0;
  v_skipped_count    int := 0;
BEGIN
  -- 1. Idempotency lookup. With PDF uploads using fresh pdf-upload://uuid
  --    URLs per upload, this branch effectively never fires in the new
  --    flow — section-level diff has taken over the dedup role. We
  --    keep the URL-based check for scraper paths that may yet land
  --    (e.g., gov.il if Cloudflare opens up) where URL is stable.
  SELECT id, content_hash, version
    INTO v_existing_id, v_existing_hash, v_existing_version
    FROM regulatory_documents
   WHERE url = p_url AND superseded_by IS NULL
   ORDER BY version DESC
   LIMIT 1;

  IF v_existing_id IS NOT NULL AND v_existing_hash = p_content_hash THEN
    RETURN jsonb_build_object(
      'status',         'unchanged',
      'document_id',    v_existing_id,
      'version',        v_existing_version,
      'sections_count', (SELECT COUNT(*)::int FROM regulatory_sections WHERE document_id = v_existing_id),
      'inserted',       0,
      'replaced',       0,
      'skipped',        0
    );
  END IF;

  v_new_version := COALESCE(v_existing_version, 0) + 1;

  -- 2. Always create the new document row (Option A — see header).
  INSERT INTO regulatory_documents (
    url, title, source_org, version, content_hash, raw_html, metadata, fetched_at
  ) VALUES (
    p_url, p_title, p_source_org, v_new_version, p_content_hash,
    p_raw_html, COALESCE(p_metadata, '{}'::jsonb), now()
  )
  RETURNING id INTO v_new_id;

  -- 3. Supersede the previous current version, if any (URL-stable path only).
  IF v_existing_id IS NOT NULL THEN
    UPDATE regulatory_documents
       SET superseded_by = v_new_id
     WHERE id = v_existing_id;
  END IF;

  -- 4. Per-section dispatch.
  FOR v_section IN SELECT * FROM jsonb_array_elements(COALESCE(p_sections, '[]'::jsonb))
  LOOP
    v_action         := COALESCE(v_section ->> 'action', 'insert');
    v_target_id      := NULLIF(v_section ->> 'target_section_id', '')::uuid;
    v_embedding_text := NULLIF(v_section ->> 'embedding_text', '');

    IF v_action = 'skip' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;

    ELSIF v_action = 'replace' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'action=replace requires target_section_id (section ordinal %)',
          v_section ->> 'ordinal';
      END IF;

      UPDATE regulatory_sections
         SET heading      = v_section ->> 'heading',
             anchor       = v_section ->> 'anchor',
             content_text = v_section ->> 'content_text',
             content_hash = v_section ->> 'content_hash',
             embedding    = CASE
                              WHEN v_embedding_text IS NOT NULL
                                THEN v_embedding_text::vector(1024)
                              ELSE embedding
                            END
       WHERE id = v_target_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'action=replace target_section_id % not found', v_target_id;
      END IF;
      v_replaced_count := v_replaced_count + 1;

    ELSE -- 'insert' (default for missing / unknown action — be lenient)
      INSERT INTO regulatory_sections (
        document_id, ordinal, heading, anchor, content_text, content_hash, embedding
      ) VALUES (
        v_new_id,
        (v_section ->> 'ordinal')::int,
        v_section ->> 'heading',
        v_section ->> 'anchor',
        v_section ->> 'content_text',
        v_section ->> 'content_hash',
        CASE
          WHEN v_embedding_text IS NOT NULL THEN v_embedding_text::vector(1024)
          ELSE NULL
        END
      );
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status',         CASE WHEN v_existing_id IS NULL THEN 'created' ELSE 'updated' END,
    'document_id',    v_new_id,
    'version',        v_new_version,
    'sections_count', v_inserted_count, -- sections newly attached to this doc (excl. replace/skip)
    'inserted',       v_inserted_count,
    'replaced',       v_replaced_count,
    'skipped',        v_skipped_count
  );
END;
$function$

-- ^ owner: regulatory_ingest_worker | security: DEFINER


CREATE OR REPLACE FUNCTION public.array_to_halfvec(integer[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_halfvec(numeric[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_halfvec(double precision[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_halfvec(real[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_sparsevec(real[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_sparsevec(double precision[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_sparsevec(numeric[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_sparsevec(integer[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.binary_quantize(halfvec)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_binary_quantize$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.binary_quantize(vector)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$binary_quantize$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.calculate_risk_level()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  risk_score INTEGER := 0;
BEGIN
  -- Add points for risk factors
  IF jsonb_array_length(NEW.special_categories) > 0 THEN risk_score := risk_score + 30; END IF;
  IF NEW.includes_minors THEN risk_score := risk_score + 25; END IF;
  IF NEW.international_transfers THEN risk_score := risk_score + 15; END IF;
  IF NEW.estimated_records_count >= 100000 THEN risk_score := risk_score + 20;
  ELSIF NEW.estimated_records_count >= 10000 THEN risk_score := risk_score + 10;
  ELSIF NEW.estimated_records_count >= 1000 THEN risk_score := risk_score + 5;
  END IF;
  IF NEW.data_categories @> '["health"]' THEN risk_score := risk_score + 20; END IF;
  IF NEW.data_categories @> '["financial"]' THEN risk_score := risk_score + 15; END IF;
  IF NEW.data_categories @> '["biometric"]' THEN risk_score := risk_score + 25; END IF;
  IF NEW.data_categories @> '["id_number"]' THEN risk_score := risk_score + 10; END IF;
  
  -- Determine risk level
  IF risk_score >= 70 THEN NEW.risk_level := 'critical';
  ELSIF risk_score >= 50 THEN NEW.risk_level := 'high';
  ELSIF risk_score >= 25 THEN NEW.risk_level := 'medium';
  ELSE NEW.risk_level := 'low';
  END IF;
  
  -- DPIA required for high/critical risk
  IF NEW.risk_level IN ('high', 'critical') THEN
    NEW.requires_dpia := TRUE;
  END IF;
  
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.check_ppa_registration_required()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- PPA registration required if:
  -- 1. More than 10,000 records, OR
  -- 2. Contains sensitive data (special categories), OR
  -- 3. Marketing purposes with large scale
  
  IF NEW.estimated_records_count >= 10000 
     OR jsonb_array_length(NEW.special_categories) > 0
     OR (NEW.purposes @> '["marketing"]' AND NEW.estimated_records_count >= 1000)
  THEN
    NEW.requires_ppa_registration := TRUE;
  ELSE
    NEW.requires_ppa_registration := FALSE;
  END IF;
  
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.cosine_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cosine_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.cosine_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cosine_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$cosine_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.create_dsr_queue_item()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO dpo_queue (
    org_id,
    type,
    priority,
    title,
    description,
    related_dsr_id,
    sla_hours,
    deadline_at
  ) VALUES (
    NEW.org_id,
    'dsr',
    'high',
    'בקשת נושא מידע: ' || NEW.request_type,
    'בקשה מ: ' || NEW.full_name || ' (' || NEW.email || ')',
    NEW.id,
    720,
    NEW.created_at + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.create_escalation_queue_item()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.priority = 'high' OR NEW.subject LIKE '%פנייה לממונה%' THEN
    INSERT INTO dpo_queue (
      org_id,
      type,
      priority,
      title,
      description,
      related_thread_id,
      sla_hours,
      deadline_at
    ) VALUES (
      NEW.org_id,
      'escalation',
      CASE WHEN NEW.priority = 'high' THEN 'high' ELSE 'medium' END,
      NEW.subject,
      'הסלמה מבוט השאלות',
      NEW.id,
      24,
      NOW() + INTERVAL '24 hours'
    );
  END IF;
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec(halfvec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_accum(double precision[], halfvec)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_accum$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_add(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_add$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_avg(double precision[])
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_avg$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_cmp(halfvec, halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cmp$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_concat(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_concat$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_eq(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_eq$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_ge(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ge$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_gt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_gt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_in(cstring, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_in$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_squared_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_le(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_le$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_lt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_lt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_mul(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_mul$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_ne(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ne$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_negative_inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_out(halfvec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_out$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_recv(internal, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_recv$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_send(halfvec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_send$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_spherical_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_spherical_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_sub(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_sub$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_to_float4(halfvec, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_float4$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_to_vector(halfvec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.halfvec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_typmod_in$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.hamming_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$hamming_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.hnsw_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_bit_support$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.hnsw_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_halfvec_support$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.hnsw_sparsevec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_sparsevec_support$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.hnswhandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$hnswhandler$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.ivfflat_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_bit_support$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.ivfflat_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_halfvec_support$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.ivfflathandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$ivfflathandler$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.jaccard_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$jaccard_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l1_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l1_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l1_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l1_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l1_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_norm(halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_norm$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_norm(sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_norm$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_normalize(vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_normalize$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_normalize(sparsevec)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_normalize$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.l2_normalize(halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_normalize$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.set_authority_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.authority_deadline = NEW.discovered_at + INTERVAL '72 hours';
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec(sparsevec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_cmp(sparsevec, sparsevec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cmp$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_eq(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_eq$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_ge(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ge$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_gt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_gt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_in(cstring, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_in$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_squared_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_le(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_le$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_lt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_lt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_ne(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ne$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_negative_inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_out(sparsevec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_out$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_recv(internal, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_recv$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_send(sparsevec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_send$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.sparsevec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_typmod_in$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.subvector(vector, integer, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$subvector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.subvector(halfvec, integer, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_subvector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_calculator_leads_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_compliance_score(p_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_docs_score FLOAT;
  v_incidents_score FLOAT;
  v_response_score FLOAT;
  v_overall FLOAT;
  v_risk TEXT;
BEGIN
  -- Calculate documents score
  SELECT 
    CASE 
      WHEN COUNT(*) >= 3 THEN 100
      WHEN COUNT(*) >= 2 THEN 75
      WHEN COUNT(*) >= 1 THEN 50
      ELSE 0
    END INTO v_docs_score
  FROM documents 
  WHERE org_id = p_org_id AND status = 'active';
  
  -- Calculate incidents score
  SELECT 
    GREATEST(0, 100 - (COUNT(*) FILTER (WHERE status != 'closed') * 25))
  INTO v_incidents_score
  FROM security_incidents
  WHERE org_id = p_org_id;
  
  -- Calculate response time score
  SELECT 
    CASE 
      WHEN AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) IS NULL THEN 100
      WHEN AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) <= 7 THEN 100
      WHEN AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) <= 14 THEN 80
      WHEN AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) <= 30 THEN 60
      ELSE 40
    END INTO v_response_score
  FROM dpo_queue
  WHERE org_id = p_org_id AND status = 'resolved';
  
  -- Calculate overall
  v_overall := (COALESCE(v_docs_score, 0) + COALESCE(v_incidents_score, 100) + COALESCE(v_response_score, 100)) / 3;
  
  -- Determine risk level
  v_risk := CASE
    WHEN v_overall >= 80 THEN 'low'
    WHEN v_overall >= 60 THEN 'medium'
    WHEN v_overall >= 40 THEN 'high'
    ELSE 'critical'
  END;
  
  -- Upsert score
  INSERT INTO org_compliance_scores (org_id, overall_score, documents_score, incidents_score, response_time_score, risk_level, updated_at)
  VALUES (p_org_id, v_overall, v_docs_score, v_incidents_score, v_response_score, v_risk, NOW())
  ON CONFLICT (org_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    documents_score = EXCLUDED.documents_score,
    incidents_score = EXCLUDED.incidents_score,
    response_time_score = EXCLUDED.response_time_score,
    risk_level = EXCLUDED.risk_level,
    updated_at = NOW();
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_dsr_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_incident_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_thread_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE message_threads 
    SET last_message_at = NEW.created_at, updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$

-- ^ owner: postgres | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector(vector, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_accum(double precision[], vector)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_accum$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_add(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_add$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_avg(double precision[])
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_avg$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_cmp(vector, vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_cmp$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_concat(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_concat$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_dims(halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_vector_dims$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_dims(vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_dims$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_eq(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_eq$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_ge(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ge$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_gt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_gt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_in(cstring, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_in$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_l2_squared_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_l2_squared_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_le(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_le$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_lt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_lt$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_mul(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_mul$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_ne(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ne$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_negative_inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_negative_inner_product$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_norm(vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_norm$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_out(vector)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_out$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_recv(internal, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_recv$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_send(vector)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_send$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_spherical_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_spherical_distance$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_sub(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_sub$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_to_float4(vector, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_float4$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_to_halfvec(vector, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_halfvec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_to_sparsevec(vector, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_sparsevec$function$

-- ^ owner: supabase_admin | security: INVOKER


CREATE OR REPLACE FUNCTION public.vector_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_typmod_in$function$

-- ^ owner: supabase_admin | security: INVOKER


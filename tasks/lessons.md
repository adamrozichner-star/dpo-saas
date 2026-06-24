# Lessons / surprises - architecture-v3 audit (2026-06-21)

Recurring mistakes and surprises encountered while auditing the live DB + codebase.

## Environment / access
- **No direct Postgres connection exists anywhere.** No `psql`, no `pg` npm driver, no
  `DATABASE_URL`/`POSTGRES_URL` in `.env.local` or in Vercel project env. The only live DB
  credential is the Supabase **service-role JWT** used via PostgREST.
- **PostgREST cannot reach `information_schema`/`pg_catalog`.** Only `public` and
  `graphql_public` schemas are exposed (`PGRST106` on `Accept-Profile: information_schema`).
  No generic `exec_sql`/`run_sql` RPC exists either. → Could **not** run the requested
  `information_schema` / `pg_class.relacl` queries against the live DB.
- **Workaround used:** parsed the live PostgREST **OpenAPI spec** (`GET /rest/v1/`,
  390 KB) - it encodes every `public` table, column, type, PK (`<pk/>`), FK
  (`<fk .../>`), and NOT-NULL (required[]). This is true live introspection of `public`.
  RLS status, grants (relacl), and SECURITY DEFINER functions are **not** in OpenAPI and
  were taken from migration SQL instead (see caveat below).

## Schema drift (biggest surprise)
- **24 of 59 live tables have NO `CREATE TABLE` in the repo migrations** - they were
  created out-of-band (Supabase SQL editor). The numbered migrations in
  `supabase/migrations/` are **not** a reliable picture of production.
- **3 tables defined in repo SQL do not exist live:** `compliance_tasks`,
  `document_versions`, `onboarding_answers` (all HTTP 404 via service role).
- Consequence: **RLS / grants / policies described in migration files cannot be trusted as
  live state.** Several migrations are explicitly "apply manually after review" - unknown
  whether applied. Section 6 of the report is migration-derived and flagged as unverified.

## Latent bug found
- `src/app/api/dpo/route.ts:587` does `.from('onboarding_answers')` against a table that
  **does not exist live** (404). The Supabase error is not checked, so it silently returns
  null - a hidden data-loss/no-op path, not a crash.

## v3-relevant
- `compliance_tasks` (a recurring-task table with `is_recurring`/`recurring_interval`) was
  designed in `supabase/messaging_schema.sql` but **never deployed and never referenced in
  app code** - the closest historical "ledger/tasks" design was abandoned.
- Org-specific compliance state lives as **EAV** (`org_facts` = org_id/fact_key/fact_value
  jsonb) and **JSONB blobs** (`organization_profiles.compliance_gaps`,
  `processing_activities.*`, `work_plans.tasks`, `dpia_assessments.*`), never as discrete
  stateful obligation rows.

# Lessons / surprises - live schema baseline (task G0, 2026-06-22)

Captured a live schema baseline (RLS/grants/functions) before v3. Outcome: SUCCESS via the
Management API SQL endpoint after a valid token was supplied. Path to get there was bumpy.

## Auth + tooling surprises (the hard part)
- **`supabase login --token <t>` does NOT validate the token.** It prints "You are now
  logged in. Happy coding!" purely from storing the token; the Management API then rejects an
  invalid token (401) on the next real call. The authoritative check is `supabase projects
  list`. The first token supplied was rejected this way; a second, valid token worked.
- **Supabase MCP server stayed `Unauthorized`.** It reads its own `SUPABASE_ACCESS_TOKEN` at
  startup; a later CLI `login` does not reach it. So the MCP `execute_sql` was unusable; the
  raw Management API endpoint (via curl with the token) was the working privileged path.
- **`supabase db dump` requires Docker.** Even after linking, it shells out to `pg_dump`
  inside a pinned Postgres container. Docker and a local `pg_dump` were both absent, so the
  CLI dump could not run ("Cannot connect to the Docker daemon").
- **Workaround used (the win):** the Management API SQL endpoint
  `POST https://api.supabase.com/v1/projects/<ref>/database/query` runs arbitrary SQL as role
  `postgres` (privileged) with no Docker and no DB password. It CAN read
  `pg_catalog`/`information_schema` - unlike PostgREST (the v3 audit's only access, limited to
  `public`+`graphql_public`). The baseline was reconstructed from the live catalog with
  `pg_get_functiondef` / `pg_get_constraintdef` / `pg_get_indexdef` + catalog reads. Real DDL,
  read-only, no row data. Saved to `supabase/baseline/baseline-20260622.sql`.

## Live truth captured (PG 17.6): 58 tables, 179 constraints, 115 indexes, 89 policies, 234 grants, 128 functions (3 SECURITY DEFINER)
- All 3 known live-but-unmigrated tables present: `data_recipients`, `dpo_queue`,
  `org_compliance_scores`.

## Audit section 6 - RESOLVED (was unverified, migration-derived)
- **regulatory_documents / regulatory_sections: RLS DISABLED**, so their 5 policies each are
  INERT. Real protection is the GRANT layer: `anon` has NO grant, `authenticated` = SELECT,
  `service_role` = all. Not anon-exposed despite RLS off - the documented grants-as-firewall
  pattern.
- **hub_* (7 tables): RLS ENABLED**, one policy each = `FOR SELECT TO authenticated USING
  (true)`. No anon policy, no write policy → anon fully denied, writes blocked for all roles.
- **LATENT SECURITY RISK on hub_*:** `anon` (and `authenticated`) still hold a broad table
  GRANT (`SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER/TRUNCATE`). RLS is the ONLY thing
  protecting these 7 tables; disabling RLS would instantly re-expose full DML to anon - the
  exact "disable RLS -> anon exposed" gotcha. Hardening follow-up: `REVOKE` the anon grants
  on `hub_*` so the grant layer is also safe.
- **SECURITY DEFINER functions (3):** `current_user_org_id` (owner `postgres`),
  `find_similar_section` + `regulatory_ingest_persist` (owner `regulatory_ingest_worker`, a
  dedicated low-privilege role).

# Lessons / surprises - brand foundation port (task A1, 2026-06-22)

Porting `deepo-brand/` (tokens + 7 primitives) into the app on feature/brand-foundation.

## Intentional deviations from the source brand bundle
- **Base CSS scoped under `.deepo-scope`.** The source `colors_and_type.css` styles
  `html, body`, bare `p`, and `[dir="rtl"]` globally. Loading that app-wide would restyle
  every existing screen (sand background, Assistant on all paragraphs). So the tokens
  (`:root`), the `.t-*` type classes, `.dpi`, and `.t-gradient` ship globally (inert until
  used), but the opinionated base lives under a `.deepo-scope` wrapper that brand surfaces
  opt into. The gallery and future v3 screens add the class.
- **`--fg-on-accent: #FDF4EF` token added** (not in source). It is the text/icon color on
  filled accent surfaces (crimson, gradient, solid). Value matches `--fg-on-dark-1`. Added
  so the ported component CSS could drop raw `#fff` and stay token-only (the only literal
  colors left are the ember-glow radial-gradient rgba stack on the dark Card, which the
  brand rules explicitly allow). The dark Card background `#1A1108` was retokenized to
  `var(--garnet-900)` (#1B1308, visually equivalent).
- **Components reimplemented as TSX, CSS consolidated.** The reference `.jsx` injected each
  component's CSS via a `document.head` `<style>` side-effect (not SSR-safe). Ported the
  markup to plain TSX in `src/components/brand/` and moved all `.dp-*` CSS into
  `src/brand/components.css`, loaded once via `src/brand/styles.css`.
- **`deepo-icons.js` -> `src/brand/icons.tsx`.** The source mutated the DOM with a
  MutationObserver to hydrate `<use>` into duotone paths. Replaced with a `<DeepoIcon>`
  component that renders the paths directly. Same path data and `--dpi-c`/currentColor.

## Surprises
- **CSS specificity bug I introduced, caught by headless verify.** Scoping the base `p` as
  `.deepo-scope p` (0,1,1) outranked `.t-eyebrow` (0,1,0), so an eyebrow rendered as a `<p>`
  lost its Heebo mono font. The source's global `p` was only (0,0,1) and lost correctly.
  Fix: `:where(.deepo-scope) p` zeroes the wrapper's specificity, restoring the cascade.
- **Headless `:focus` does not paint.** Programmatic `.focus()` makes `el.matches(':focus')`
  true but Chrome will not paint focus styles without real OS focus, so the halo read as
  `none`. `Emulation.setFocusEmulationEnabled` did not help. CDP `CSS.forcePseudoState`
  (force `:focus`) is what reliably resolves the rule - then wait out the 200ms box-shadow
  transition before measuring, or you read a mid-interpolation value.
- **`notFound()` in a page returns HTTP 200, not 404.** A top-level `notFound()` in the
  dev-only gallery page (both static and `force-dynamic`) served 200: the response shell /
  metadata commits before the guard resolves, so the content is suppressed but the status
  stays 200. An unmatched route 404s fine, but the page-level guard does not. Authoritative
  fix: gate `/brand-gallery` in `src/middleware.ts` (runs before rendering, sets a real 404).
  The page keeps its `notFound()` as defense-in-depth.

## Follow-ups (not this task)
- **Move the brand fonts to next/font.** They currently load via the Google Fonts `@import`
  inside `colors_and_type.css` (faithful to the bundle, and the literal family names make
  the computed-font assertions clean). A later task should load Rubik/Assistant/Heebo via
  `next/font/google` to match the existing Heebo setup and drop the render-blocking @import.

# Lessons / surprises - obligation ledger schema (task B1, 2026-06-23)

Created the v3 Obligation Ledger (migration 037, additive: 7 tables + 1 enum), anchored to
the verified baseline and docs/ARCHITECTURE.md section 5.2. Applied + verified via the
Management API SQL endpoint (Docker/pg_dump still absent). No existing table altered (live
public tables 58 -> 65).

## Findings
- **updated_at triggers are NOT a real convention here.** A live pg_trigger sweep found
  updated_at triggers on only 5 of 58 tables (calculator_leads, data_subject_requests,
  database_scenarios, message_threads) and on NONE of the close analogs (data_recipients,
  dpo_queue, the entire hub_* set from migration 022). So the ledger tables get updated_at
  columns but no triggers, matching the analogs. updated_at is app/service-set on write.
- **Provenance via composite FKs is clean and enforceable.** Every hub_* table has
  UNIQUE(template_id, version) (template_id is the stable logical id; id is the per-version
  row). So obligations/controls/assets anchor provenance with composite FKs to
  (template_id, version), pinning the exact catalog version that minted each row.
- **docs/ARCHITECTURE.md section 5.2 fields that have no target yet were deferred, not faked:**
  tasks.access_link_id omitted (access_links primitive does not exist; section 7 / later PR);
  obligations.trigger_ref realized as the typed asset_id; evidence.answer_ref is plain text
  (no answers table); contacts.linked_entity realized as data_recipient_id (the real vendor table).

## Surprise: Supabase default privileges defeat naive grant intent
- **New public tables inherit `GRANT ALL TO authenticated` (and service_role, postgres) via
  Supabase default privileges.** An explicit `GRANT SELECT, INSERT` is ADDITIVE, not
  restrictive: it does not shrink the inherited ALL. So `events` initially had full DML to
  authenticated despite the intent to make it append-only, and all 7 had TRUNCATE granted to
  authenticated.
- TRUNCATE/MAINTAIN/TRIGGER/REFERENCES are not reachable via PostgREST (it only issues
  SELECT/INSERT/UPDATE/DELETE and respects RLS), so this was defense-in-depth, not a live
  hole. RLS already gated rows and anon already had zero (explicit REVOKE).
- **Fix (least-privilege):** after the default grant, explicitly
  `REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON events FROM authenticated` and
  `REVOKE TRUNCATE ON <all 7> FROM authenticated`. Final state: anon nothing; authenticated
  RLS-gated DML on the 6 and SELECT+INSERT only on events; no TRUNCATE anywhere; service_role
  ALL. Lesson for future ledger migrations: to restrict a role you must REVOKE, never rely on
  a narrower GRANT. [[project_supabase_disable_rls_gotcha]]

# Lessons / surprises - the evaluator (task B2, 2026-06-23)

Built the deterministic rule_dsl evaluator (dsl.ts grammar + zod, facts.ts, evaluator.ts,
persist.ts), migration 038 (partial unique index for idempotent upsert), and a provisional
seed of 8 gap rules. Dry-ran against the 3 live orgs, then applied: 8 rules seeded, 4
obligations minted for org "דיפו", upsert proven idempotent (4 -> 4 on re-run), anon still
zero on obligations.

## rule_dsl did not exist as a contract
- hub_gap_rules.rule_dsl is typed `z.unknown()` everywhere (src/lib/types/hub.ts, both expert
  API routes) and the Expert Console is a raw JSON textarea. The live catalog was EMPTY
  (0 gap_rules, 0 playbooks, 0 questions; org_facts empty too). So B2 had to DEFINE the DSL,
  not just evaluate it. The grammar is all/any/not + {fact, op, value}; missing fact -> false.

## SEED RULES ARE PROVISIONAL - pending Amir/Roy legal review
- The 8 rules in src/lib/ledger/seed-rules.ts are engineering placeholders, hand-translated
  from the legacy hardcoded engines (compliance-engine.ts / regulatory-engine.ts) ONLY to
  exercise the evaluator. Wording, severities, thresholds, and legal mapping are NOT
  authoritative. In-row markers: source_tier='expert_judgment', confidence=0.5, reviewed_by null.
  Do not surface to customers or treat as compliance truth until legally reviewed.

## Fact-vocabulary fixups for real rule authoring (found via the live dry-run)
The evaluator is correct; these are catalog/data alignment items for Amir/Roy:
- **accessControl** real live values are `all` / `partial` (NOT `restricted`, which the legacy
  code implied). A rule keyed on `eq 'restricted'` would never fire. The broad-access seed rule
  keys on `eq 'all'`; org "דיפו" is `partial`, so it (correctly, for the seed) did not fire.
- **hasConsent** real value seen is `no_website` (NOT just `yes`/`no`). Rules keyed on `eq 'no'`
  miss `no_website`. Decide whether `no_website` should count as "no consent mechanism".
- **v3Answers.databases** keys (`customers`, `cvs`, `cameras`, `employees`, `suppliers_id`) are
  a DIFFERENT vocabulary from hub_asset_templates slugs (`customer_database`, `mailing_list`,
  `security_cameras`) and from some legacy keys. A canonical database-key <-> asset-slug map is
  needed so rules and assets share one vocabulary.
- **medical**: org "דיפו" has industry=health but no `medical` database key, so `hasMedical`
  is false there. `isHealthOrFinance` (from industry) is the broader signal. Rule authors must
  decide which signal drives medical-data obligations.

## Notes
- Deterministic, no LLM in the inference path (the DSL evaluation is pure). Confirmed.
- Idempotency: upsert keyed on (org_id, source_rule_id) via the 038 partial unique index;
  ON CONFLICT refreshes denormalized fields but preserves status/opened_at/triggered_by so a
  re-run never clobbers an obligation's lifecycle progress.
- The evaluator reads facts from v3Answers + processing_activities today (assets table is
  empty); when the loop populates assets, add asset-derived facts in facts.ts without touching
  the DSL or evaluator.

# Lessons / surprises - controls + recurrence (task B3, 2026-06-24)

Instantiated hub_control_playbooks into per-org controls, linked them to the obligations they
satisfy (obligations.fulfilled_by_control_id), and set obligations.recurs_at. Migration 039
(unique index on controls(org_id, source_playbook_id, source_playbook_version)) for idempotent
instantiation. 3 provisional playbooks (annual). Applied to org "דיפו": 3 controls created,
4 obligations linked, double-run idempotent (3 -> 3), anon zero on controls. Deterministic, no LLM.

## TRACKED FOLLOW-UP (BLOCKER for the real regulatory controls): cadence enum is too coarse
- hub_control_playbooks.cadence and controls.cadence use CHECK (daily|weekly|monthly|quarterly|
  biannual|annual). This CANNOT express the real regulatory cadences from regulatory-engine.ts:
  risk assessment every 18 months, pen-test every 18 months, periodic training every 2 years,
  log retention 24 months.
- Consequence: B3 only seeded ANNUAL review controls for the 4 existing obligations. The
  security-level periodic controls (risk assessment / pen-test / training) CANNOT be authored
  until the cadence model supports arbitrary intervals.
- NEEDED before those controls: a migration adding `cadence_months smallint` to controls (and
  hub_control_playbooks) as the canonical interval, with the text cadence kept as a coarse
  label; compute next_due_at from cadence_months. Deferred from B3 (no obligations need it yet),
  but it must land before security-level controls. Also resolve the `biannual` ambiguity then
  (B3 treats it as 6 months / semi-annual).

## Notes
- No schema link exists between hub_control_playbooks and hub_gap_rules, so control->obligation
  binding is a deterministic code-level map (ruleToPlaybook in seed-playbooks.ts). Provisional.
- One control per (org, playbook): multiple obligations share one control (both PPA obligations
  share the annual PPA review). recurs_at = the control's next_due_at.
- Idempotency detail: on re-instantiation the control's next_due_at is PRESERVED (conflict
  preserves it; only completion advances the schedule), and the obligation link uses the
  control's RETURNING next_due_at, so recurs_at does not drift across runs even with a different
  wall clock. Verified by the double-run.
- Playbooks are PROVISIONAL, pending Amir/Roy legal review (in-row: source_tier expert_judgment,
  confidence 0.5). Cadences, owner roles, checklists are placeholders.

# Lessons / surprises - authenticated app shell (task A3, 2026-06-24)

Built the RTL brand app shell (chrome) as an additive route group src/app/(deepo)/ with its own
layout + src/components/shell/ (AppShell, Sidebar, Topbar, nav data, token-driven shell.css). Demo
at /shell-demo (dev-only, guarded in middleware like /brand-gallery). Actor themes: dpo (Onyx) /
owner (light). 13/13 headless assertions pass; /shell-demo 404s in prod; tsc clean.

## TRACKED FOLLOW-UP for C: there is no shared "current org / session" context
- useAuth() (src/lib/auth-context.tsx) exposes only the Supabase auth user/session. There is NO
  shared "current org" context. Every surface fetches the org/profile ad hoc:
  supabase.from('users').select(...).eq('auth_user_id', user.id) -> org_id -> organizations
  (the (expert) layout does this for role; the dashboard does its own thing).
- The A3 shell renders PLACEHOLDER org/user (no auth fetch) on purpose. C should build ONE shared
  org/session context (current user + org + role) and have the shell + all v3 surfaces read it,
  instead of each surface re-querying. The shell's AppShell `actor` prop + org props are the seam.

## RTL logical-property gotchas (both cost a verify round)
- `inset-inline-end: 0` in RTL maps to PHYSICAL LEFT, not right. To pin the mobile drawer to the
  right, use `inset-inline-start: 0` (inline-start = physical right in RTL). Same for borders:
  the divider between the right sidebar and main is `border-inline-end` (physical left), not start.
- A specificity trap: `.dp-shell--dpo .dp-shell__sidebar { position: relative }` (0,2,0, needed as
  the ember-glow positioning context) silently OVERRODE the mobile media query's
  `.dp-shell__sidebar { position: fixed }` (0,1,0) - media queries add no specificity. The drawer
  stayed in-flow. Fix: move `position: relative` to the base sidebar rule (all actors), let the
  mobile rule override to fixed at equal specificity + later source order.
- Dev gotcha: editing layout-imported global CSS did not reliably hot-reload in `next dev`; a
  server restart was needed before the headless run saw the change.

## Notes
- Additive only: root layout, (expert), and the navy/stone screens (dashboard etc.) are untouched.
  The (deepo) route group adds no URL segment, so its routes must use NEW path names (not
  /dashboard, which the legacy page owns).
- Token-only: shell.css has zero hardcoded hex (verified); the only literal colors are the allowed
  ember-glow radial-gradient and rgba white/onyx overlays (consistent with components.css).

# Lessons / surprises - v3 ledger components (task A4, 2026-06-24)

Built the v3 ledger UI components (src/components/ledger/) on the brand tokens: status chips,
severity/doc badges, obligation card/row, score dial, control item, task row, event timeline, and
the tokenized form shell. Dev-only /ledger-gallery (middleware-guarded). 18/18 headless assertions
pass (each obligation state + severity maps to the right --status token); tsc clean; /ledger-gallery
404s in prod.

## Single-source status mapping (for C and later surfaces)
- src/components/ledger/status.ts is the ONE place that maps each ledger status/severity to a brand
  Badge variant (-> --status token) and a Hebrew label. C and every later surface should import from
  here, not re-map. The three chip components are thin Badge wrappers over this map.

## document_status enum mismatch (mapping note for C)
- The task framed the doc lifecycle as draft -> review -> approved -> published, but the LIVE
  document_status enum is {draft, pending_review, pending_approval, active, archived}. There is no
  literal 'published' or 'approved'. DocumentLifecycleBadge uses the real enum; 'active' is the
  published/live state. When C renders real documents, map UI wording to these 5 values, not the
  4-word lifecycle.

## CC-2 seam
- TokenizedFormShell renders zero org identity (no org name, no score, no nav) - only the Deepo
  platform mark + the passed generic title. Verified headless (no sidebar, no dial, no org text).
  This is the seam E builds the no-login sysadmin/vendor forms on.

## Provisional
- ComplianceScoreDial bands (<50 risk, 50-79 warn, >=80 ok) are a PROVISIONAL engineering default
  (commented in the component). Real thresholds are a later product decision (Amir/Roy).

# Lessons / surprises - DPO console, first live-ledger surface (task C1, 2026-06-24)

Built the shared org/session context and /console - the first surface reading the LIVE ledger.
Renders org דיפו's real data (score 42, 4 obligations, 3 controls) via the A4 components. Mapping
verified 8/8 against live rows; auth gate 2/2 (redirect + no leak); /shell-demo still 13/13.

## The shared org context now exists (closes the A1/A3 follow-up)
- src/lib/org-context.tsx (OrgProvider/useOrg) resolves user + profile(role) + org ONCE via the
  dashboard's exact authed query (users joined to organizations, RLS-scoped). Mounted in the
  (deepo) layout; AppShell + v3 pages read it instead of re-querying per surface. actor is derived
  from role here (expert_curator -> dpo, else owner). C and later surfaces consume useOrg().
- Surprise worth noting: דיפו's only user is an expert_curator, so the console themes as dpo (Onyx).

## Patterns confirmed
- RLS-scoped CLIENT reads are the safe pattern: as the authenticated user, querying obligations/
  controls returns only the user's org (policy org_id = current_user_org_id()); authenticated has
  the SELECT grant, anon has none. No service-role, no API route, plus a defensive .eq('org_id').
- Auth gating for a real surface = client redirect (loading -> spinner; !user -> router.replace
  ('/login')), NOT a dev-only middleware 404. The (deepo) LAYOUT must not gate (it would break the
  dev /shell-demo); pages that need auth gate themselves.
- Control names live on hub_control_playbooks, not controls - the console joins by
  (template_id, version). The row->props mapping is a pure exported function (src/lib/console-data.ts)
  so the verify test runs the real mapping against live rows, not a mock.

# Lessons / surprises - obligation detail view (task C2, 2026-06-24)

Added /console/obligations/[id]: full record + linked control + evidence + event timeline,
provenance from the joined gap rule. Detail mappers added to console-data.ts (pure). Verified
15/15 mapping (incl detail) + 4/4 auth-gate (both routes) + /shell-demo 13/13. tsc clean.

## Patterns
- RLS-as-not-found: the detail fetch is .eq('id', id).eq('org_id', org.id).maybeSingle(); a
  cross-org or unknown id returns null (RLS), which renders a clean "not found / no access" state.
  No separate authorization check and no leak - RLS does the gate.
- source_tier / confidence labels live in console-data.ts (SOURCE_TIER_LABEL, catalog-governance),
  NOT in status.ts (ledger-status only) - per the agreed split.
- The composite-key reads (hub_gap_rules by template_id+version; controls->playbook name) are done
  as explicit separate queries rather than PostgREST embedding, since the composite FKs do not
  embed cleanly.
- Linking from a list: ObligationRow stays a pure display component; /console wraps each row in a
  Next Link using the row id (the console keeps raw rows incl id; mapObligation maps display only).

# Lessons / surprises - DPO judgment queue, first WRITE surface (task C3, 2026-06-24)

/console/queue lists dpo_queue items and resolves one (dpo_queue UPDATE + append-only events
INSERT), as the authed user under RLS. Migration 040. Verified 11/11 write-path + 6/6 auth-gate +
13/13 shell-demo. tsc clean.

## RLS-enabled table with only a SELECT policy silently blocks all client writes
- dpo_queue had RLS on + only dpo_queue_select_own_org (SELECT). With no UPDATE/INSERT policy, the
  authed client could NOT write it (RLS deny), even though the grant existed. The legacy writers
  (api/messages, api/dpo, ...) get around this with service-role server routes (bypass RLS).
- C3 is the v3 pattern: client-authed write under RLS. Migration 040 added an org-scoped UPDATE
  policy (USING + WITH CHECK org_id = current_user_org_id()). Lesson: enabling RLS without a write
  policy is a silent write-block; each verb needs its own policy.

## events.entity_type had to be widened
- The append-only events CHECK was obligation/control/task/evidence/asset - no dpo_queue. Widened in
  040 (DROP + re-ADD CHECK) so a queue resolution can append an event. Added dpo_queue to EntityType
  + ENTITY_ICON in status.ts (timeline icon only).

## Hardened a latent anon grant while making it a write surface
- dpo_queue granted full DML to anon (RLS-blocked, but the hub_*-style latent risk). 040 REVOKEd ALL
  from anon (+ PUBLIC). Verified relacl: anon zero on dpo_queue.

## RLS verification without a real login (reusable technique)
- Proved the write RLS via the Management API: `begin; set local role authenticated; select
  set_config('request.jwt.claims','{"sub":"<auth_user_id>","role":"authenticated"}',true); <stmt>;
  rollback;` - the endpoint returns the last SELECT before ROLLBACK. This simulated the דיפו user
  (CAN update its item = 1 row), a cross-org user (0 rows), and anon (permission denied) without a
  password. The actual resolve was then committed through the same role-sim to exercise the full
  authed path; confirmed exactly ONE append-only events row + double-resolve guarded (status<>resolved).
- Test residue: a resolved provisional dpo_queue item (4de83577..., metadata.provisional=true) + its
  one event are left in דיפו as evidence the path works. The real pending review item was untouched.

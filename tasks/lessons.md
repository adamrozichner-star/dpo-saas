# Lessons / surprises — architecture-v3 audit (2026-06-21)

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
  390 KB) — it encodes every `public` table, column, type, PK (`<pk/>`), FK
  (`<fk .../>`), and NOT-NULL (required[]). This is true live introspection of `public`.
  RLS status, grants (relacl), and SECURITY DEFINER functions are **not** in OpenAPI and
  were taken from migration SQL instead (see caveat below).

## Schema drift (biggest surprise)
- **24 of 59 live tables have NO `CREATE TABLE` in the repo migrations** — they were
  created out-of-band (Supabase SQL editor). The numbered migrations in
  `supabase/migrations/` are **not** a reliable picture of production.
- **3 tables defined in repo SQL do not exist live:** `compliance_tasks`,
  `document_versions`, `onboarding_answers` (all HTTP 404 via service role).
- Consequence: **RLS / grants / policies described in migration files cannot be trusted as
  live state.** Several migrations are explicitly "apply manually after review" — unknown
  whether applied. Section 6 of the report is migration-derived and flagged as unverified.

## Latent bug found
- `src/app/api/dpo/route.ts:587` does `.from('onboarding_answers')` against a table that
  **does not exist live** (404). The Supabase error is not checked, so it silently returns
  null — a hidden data-loss/no-op path, not a crash.

## v3-relevant
- `compliance_tasks` (a recurring-task table with `is_recurring`/`recurring_interval`) was
  designed in `supabase/messaging_schema.sql` but **never deployed and never referenced in
  app code** — the closest historical "ledger/tasks" design was abandoned.
- Org-specific compliance state lives as **EAV** (`org_facts` = org_id/fact_key/fact_value
  jsonb) and **JSONB blobs** (`organization_profiles.compliance_gaps`,
  `processing_activities.*`, `work_plans.tasks`, `dpia_assessments.*`), never as discrete
  stateful obligation rows.

# Lessons / surprises — live schema baseline (task G0, 2026-06-22)

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
  `pg_catalog`/`information_schema` — unlike PostgREST (the v3 audit's only access, limited to
  `public`+`graphql_public`). The baseline was reconstructed from the live catalog with
  `pg_get_functiondef` / `pg_get_constraintdef` / `pg_get_indexdef` + catalog reads. Real DDL,
  read-only, no row data. Saved to `supabase/baseline/baseline-20260622.sql`.

## Live truth captured (PG 17.6): 58 tables, 179 constraints, 115 indexes, 89 policies, 234 grants, 128 functions (3 SECURITY DEFINER)
- All 3 known live-but-unmigrated tables present: `data_recipients`, `dpo_queue`,
  `org_compliance_scores`.

## Audit section 6 — RESOLVED (was unverified, migration-derived)
- **regulatory_documents / regulatory_sections: RLS DISABLED**, so their 5 policies each are
  INERT. Real protection is the GRANT layer: `anon` has NO grant, `authenticated` = SELECT,
  `service_role` = all. Not anon-exposed despite RLS off — the documented grants-as-firewall
  pattern.
- **hub_* (7 tables): RLS ENABLED**, one policy each = `FOR SELECT TO authenticated USING
  (true)`. No anon policy, no write policy → anon fully denied, writes blocked for all roles.
- **LATENT SECURITY RISK on hub_*:** `anon` (and `authenticated`) still hold a broad table
  GRANT (`SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER/TRUNCATE`). RLS is the ONLY thing
  protecting these 7 tables; disabling RLS would instantly re-expose full DML to anon — the
  exact "disable RLS -> anon exposed" gotcha. Hardening follow-up: `REVOKE` the anon grants
  on `hub_*` so the grant layer is also safe.
- **SECURITY DEFINER functions (3):** `current_user_org_id` (owner `postgres`),
  `find_similar_section` + `regulatory_ingest_persist` (owner `regulatory_ingest_worker`, a
  dedicated low-privilege role).

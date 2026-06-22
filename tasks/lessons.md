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

# Lessons / surprises — brand foundation port (task A1, 2026-06-22)

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
  (force `:focus`) is what reliably resolves the rule — then wait out the 200ms box-shadow
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

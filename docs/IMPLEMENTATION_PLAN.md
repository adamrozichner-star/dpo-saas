# Deepo Implementation Plan (v3)

**Status:** the sequenced build for Architecture v3. Companion to `docs/ARCHITECTURE.md` and `docs/audit-architecture-v3.md`.
**Date:** 2026-06-21 · **Audience:** engineering (Adam directs, Claude Code implements).

## How to read this

Work is ordered PRs. One PR per problem. Each has a **goal**, the **work**, and a **verify** gate that must pass before the next PR starts. Feature-flag over delete. No PR merges on a database-dependent change without the verify gate green in a separate query (not inside a rolled-back transaction).

Two things run **before** any v3 schema work and gate everything after them:
- **G0 Baseline** (capture live truth) and **G1 Security** (the DSAR PII fix, in progress).

Milestone mapping at the end ties each PR to MVP / Production-100 / 1K / 10K.

---

## Phase 0: gates (must clear before ledger work)

### G0. Baseline the live schema
**Goal:** a committed, true picture of production, because the repo has drifted (24/59 live tables have no migration; RLS/grants/functions unverified).
**Work:** dump live structure + RLS + grants + functions via the linked Supabase CLI; commit under `supabase/baseline/`. From here, every schema change is a tracked migration; no more SQL-editor changes.
**Verify:** the dump file exists in the repo; a spot-check of 3 known-live-but-unmigrated tables (`data_recipients`, `dpo_queue`, `org_compliance_scores`) appears in it; RLS state for the `hub_*` and `regulatory_*` tables is now known (resolves the audit's unverified section 6).

> CC prompt for G0 is at the end of this doc (Appendix A). It is read-only plus a file write. No schema change.

### G1. Security hotfix (done, pending push)
**Goal:** close the unauthenticated DSAR PII read (`GET /api/rights?action=get_requests`).
**Status:** fixed on branch `security/rights-get-requests-auth`. Gated `get_requests` and `update_request` behind `authenticateRequest`/`authenticateDpo` + `verifyOrgAccess` (IDOR), kept `get_org` and `submit_request` public, switched the two live token-less callers to `authFetch`. Verified at runtime (401 unauth read, intake still open), `tsc --noEmit` clean.
**Verify:** unauthenticated request to the read path returns 401/403; authenticated DPO still works; public DSAR submit still works; `tsc --noEmit` clean. (All passed.)
**Important:** this reduces the blast radius but does NOT remove the CC-2 violation. The PII is still stored in `data_subject_requests`, now access-gated. Removing it is PR6. The `/trust/[slug]` and `get_org` identity disclosures are also still open and are addressed in PR6.

---

## Phase 1: the ledger core (MVP)

This phase makes the Obligation Ledger exist and become canonical. It is the spine; nothing else in v3 stands without it.

### PR1. Ledger schema (tables only, no behavior)
**Goal:** the durable relational ledger exists, empty, additive (no existing table altered).
**Work:** migration creating `obligations`, `controls`, `tasks`, `evidence`, `assets`, `contacts`, `events` per `ARCHITECTURE.md` section 5.2. Add the obligation status enum. FKs anchor to `organizations` and to the `hub_*` catalog. Resolve the two small open items here: (a) L2 vertical-profile object shape, (b) `systems`/`databases` as thin tables vs folded under `assets`. Decide, document the choice in the migration header, do not over-build.
**Verify:** CC runs `information_schema` discovery (never assume columns) before writing SQL; dry-run ROLLBACK then COMMIT; post-commit, confirm all 7 tables + enum exist in a separate query; confirm zero existing tables were altered; `tsc --noEmit` clean if any types were generated.

### PR2. The evaluator: mint obligations from the catalog
**Goal:** `hub_gap_rules.rule_dsl` is finally evaluated and writes real `obligations` rows. This is the dead-catalog-comes-alive PR.
**Work:** a deterministic evaluator that reads a client's facts (classification answers + assets) and evaluates each active `rule_dsl`; for each rule that fires, upsert an `obligations` row with provenance (`source_rule_id` + version, `triggered_by`). Instantiate matching `hub_control_playbooks` into `controls` with `next_due_at` from `cadence`. No LLM in the inference path: it is deterministic.
**Verify:** define success as a test first. Seed one org with known facts, assert the exact set of obligations minted matches the firing rules, assert each obligation carries correct provenance, assert controls get correct `next_due_at`. Re-running is idempotent (no duplicate obligations). Tests pass.

### PR3. Read the ledger on the dashboard (behind a flag)
**Goal:** the dashboard shows obligation state from the durable ledger, not the recomputed `compliance-engine.ts` blobs.
**Work:** flag `LEDGER_READ`. When on, the DPO console and owner app read obligation/control/task state from the ledger. The two hardcoded engines stay in place but flagged off for ledger-enabled orgs. `work-plan` (currently stub data) reads the real `tasks` table.
**Verify:** with the flag on for a seeded org, the dashboard renders the same or better than the old engine for that org (manual side-by-side); with the flag off, nothing changes for existing orgs; `tsc --noEmit` clean.

### PR4. Backfill: migrate the jsonb copies into the ledger
**Goal:** the ledger becomes canonical for real orgs, not just seeds.
**Work:** one-time migration reading `organization_profiles.*`, `processing_activities.*`, `work_plans.tasks`, and the jsonb vendor copies into `data_recipients` (DECISION 1), `assets`, `obligations`, `tasks`. Reconcile the three vendor copies into `data_recipients` as the single home. Keep jsonb as read-only legacy, do not delete yet.
**Verify:** dry-run on a copy of one real org first; row counts reconcile (every jsonb vendor/asset/task accounted for, or explicitly logged as skipped with reason); spot-check 3 migrated orgs against their old dashboard; reversible (the jsonb source is untouched).

---

## Phase 2: the loop runs itself (MVP to Production-100)

### PR5. Wire the engine triggers
**Goal:** `agent-invoke` stops being dormant. The loop runs on real events, not page loads.
**Work:** emit `deepo/agent.invoke` on: onboarding completion, asset added, collected answer arriving, control coming due, document approved. Add the domain skills currently marked "later phases" (mint/refresh obligation, open task, request evidence, render document). Keep the generic CRUD skills.
**Verify:** each trigger has a test asserting the right slice of the loop runs and the ledger changes as expected; a control coming due produces a task; idempotent under repeat events.

### PR6. Access-link primitive (zero info exposure) + DSAR pass-through
**Goal:** the new `access_links` table and the no-login surfaces for sysadmin and vendors, exposing zero client info (CC-2). Plus convert DSAR to true pass-through, retiring the stored subject PII.
**Work:** `access_links` per `ARCHITECTURE.md` section 7 (hashed token, scoped purpose, expiry, revoke, optional `task_id`/`target_contact_id`). A link resolves only to its one form, never org name/score/other data. Re-evaluate `/trust/[slug]` and `get_org` against the zero-exposure rule and close the identity disclosures. **Convert DSAR:** stop persisting requester name / national ID / email / phone in `data_subject_requests`; forward the request to the business, keep only non-identifying metadata (status, timestamps, the obligation/task it opens). Migrate or purge existing rows' PII columns.
**Verify:** a link returns only its form payload, asserted to contain no org identity or compliance data; expired/revoked links 403; a submitted DSAR forwards to the business and leaves **no identifying fields** in the DB (assert the columns are gone/empty); existing PII rows are purged or migrated out; security review of the resolver before merge.
**Why this matters:** the audit confirmed `data_subject_requests` stores national IDs today. The security hotfix gated access to it but did not remove it. This PR is where the CC-2 promise ("zero PII at Deepo") becomes true rather than aspirational.

### PR7. Collect flows over links (the bottleneck)
**Goal:** the sysadmin questionnaire and vendor DPA/annual flows actually collect, with automatic chasing.
**Work:** short sysadmin questionnaire (backups, restore tested, 2FA, logs) and vendor DPA-upload / annual-report flows delivered via `access_links`; collected answers write `evidence` rows against the right obligations; automatic reminder/chase scheduled via Inngest; one vendor serving many clients is collected once (the economic moat: the vendor is one `data_recipients` identity, the DPA covers N orgs).
**Verify:** an answer submitted over a link flips the linked obligation toward compliant with an `evidence` row; the chase fires on schedule and stops when the answer arrives; a shared vendor's DPA collected once satisfies the obligation across multiple orgs.

### PR8. Documents as renders of the ledger
**Goal:** the five documents are generated from the ledger with lifecycle and version history, not authored blobs.
**Work:** each document renders from its obligations/assets; lifecycle auto-generated → DPO review → owner approve → published → next review; full version history with who approved and when (CC-4 provenance); LLM synthesizes prose, never decides obligations.
**Verify:** regenerating a document after an obligation changes produces a new version with a diff; approval history is recorded; the published privacy policy reflects exactly what the owner approved.

### PR9. Certify: the audit pack
**Goal:** one-click audit-readiness pack, a render of the ledger plus documents plus evidence plus control log.
**Work:** assemble the pack (documents, obligation states with provenance, evidence chain, control completion log) into the export; reuse the existing PDF/export path.
**Verify:** the pack for a fully-collected org contains every obligation with its evidence and the control history; an auditor reading it can trace each claim to its proof.

---

## Phase 3: scale and harden (Production-100 onward)

- **PR10. Vertical profile authoring.** The L2 profile object (decided in PR1) gets a simple expert console screen so Roy/Amir add a vertical by config, no programmer. Verify: a new profile produces a correctly-scoped ledger for a test org of that type.
- **PR11. Obligation-reduction simulator.** The DB split/merge what-if (already partly present as `database_scenarios`) reads the live ledger, shows before/after obligation counts, DPO signs, the system reclassifies. Verify: a simulated split reduces the obligation set as predicted and is gated on DPO sign-off.
- **PR12. Retire the legacy engines and jsonb.** Once the ledger is canonical for all orgs, remove the two hardcoded engines and the migrated jsonb stores behind a final flag flip. Verify: no code path reads the old engines or jsonb sources; dashboards unaffected.
- **Hardening (continuous):** RLS verified against the baseline, the `route.ts:587` latent bug fixed, drift-prevention enforced, pen test (timing still open).

---

## Milestone mapping

| Milestone | Target | PRs |
|---|---|---|
| **MVP** (~6 wks, 5-10 design partners) | The ledger exists, is canonical, the loop runs, collection works over links, documents and audit pack render. | G0, G1, PR1-PR9 |
| **Production-100** (~3 mo, first paying) | Vertical authoring, obligation-reduction value moment, legacy retired, RLS verified. | PR10-PR12, hardening |
| **Production-1K** (~6 mo) | Hardened: pen test, performance against PC latency targets, cost under 5% revenue. | hardening continues |
| **Production-10K** (~1-2 yr) | Scaled: multi-vertical catalog, shared-vendor economics proven at volume. | scaling continues |

The critical path is **G0 → PR1 → PR2 → PR3 → PR4**. Until the ledger is canonical, every later PR is building on sand. PR2 (the evaluator) is the highest-leverage single PR: it turns the authored-but-dead catalog into the live spine.

---

## Appendix A: CC prompt for G0 (baseline dump)

```
TASK: Capture a baseline snapshot of the LIVE production schema and commit it. The repo has drifted from production (24 live tables have no migration; RLS/grants/functions unverified). We need ground truth before any v3 schema work. This is a dump + commit only. Do NOT change the live DB or app code.

STEP 1 - capture:
- Use the linked Supabase CLI (already authenticated) to dump the live schema only (no data): structure, RLS policies, grants, and functions.
- If `supabase db dump` is available, use it with schema-only flags. Save to supabase/baseline/baseline-YYYYMMDD.sql.
- If the CLI cannot reach catalog/RLS, report exactly what it could and could not capture, and stop before guessing.

STEP 2 - verify the snapshot:
- Confirm the file contains the 3 known live-but-unmigrated tables: data_recipients, dpo_queue, org_compliance_scores.
- Report the RLS status and grants now visible for the hub_* and regulatory_* tables (this resolves the unverified section 6 of docs/audit-architecture-v3.md).
- List any SECURITY DEFINER functions found and their owners.

STEP 3 - commit:
- Commit supabase/baseline/baseline-YYYYMMDD.sql with message "baseline: live schema snapshot before v3". Do not commit any secrets.
- Print a short summary: what was captured, what (if anything) could not be, and any surprises vs the audit.

RULES: read-only against the DB except the dump. No migrations, no app changes, no data export. Do not print credentials. Log surprises to tasks/lessons.md.
```

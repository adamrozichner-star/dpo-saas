# Deepo v3 Build Checklist (living tracker)

**What this is:** the single working tracker for building Deepo v3 (the relational obligation-ledger product) with a full UI rebuilt on the official Deepo brand system. It supersedes `IMPLEMENTATION_PLAN.md` as the day-to-day tracker. `ARCHITECTURE.md` stays the design source of truth (the why and the data model). `docs/audit-architecture-v3.md` is the evidence base for current state.

**Decision on rebuild (settled):** we do NOT rebuild the product from scratch. Strangler pattern. Keep what is valuable and v3-agnostic (integrations, the L1 catalog, `organizations`, `data_recipients`), build the ledger clean, rebuild the entire UI surface on the brand system, migrate the old jsonb blobs in, then retire them. The one thing rebuilt fully is the UI, because the brand moved to the crimson/orange system and the product moved to a four-actor model the old single-user UI cannot express.

---

## How to use this checklist

- Status per item: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
- Update as we go. Move the **▶ CURRENT FOCUS** pointer when a phase completes.
- Every item has a `→ verify` gate. An item is not `[x]` until its verify passes. No exceptions on database and zero-PII items.
- Each task is one PR. Feature-flag over delete. Keep diffs surgical.

**▶ CURRENT FOCUS:** Phase 1. Track A: A1 + A2 done. Phase 0 gate G0 (baseline) now DONE, so the Track B ledger work is unblocked. NEXT: B1 (ledger schema) on verified live truth, the critical path. A3 (shell) and A4 (v3 components) can run in parallel on the frontend. New hardening item G6p logged (revoke anon DML on hub_*, found during G0).

---

## Standing rules (Definition of Done for every task)

These apply to all items below. Listed once here, not repeated per task.

**Backend / database**
- Run `information_schema` discovery before writing any SQL. Never assume columns.
- Destructive or schema-changing SQL: dry-run with ROLLBACK, then COMMIT. Verify post-COMMIT in a separate query/tab (PostgREST cache does not refresh reliably).
- `npx tsc --noEmit` clean before commit.
- Idempotency asserted where an operation can re-run (evaluator, triggers, backfill).
- Migrations are tracked files, applied manually, never out-of-band in the SQL editor. This is what caused the drift.

**Frontend / UI (brand-bound)**
- Tokens only, from `colors_and_type.css`. Never hardcode hex (except inside ember-glow multi-stop gradients, per the brand book).
- Duotone icons from `deepo-icons.js`. Our shield is the only shield. No padlock clip-art.
- Rubik (display), Assistant (body), Heebo (labels). All RTL for Hebrew; logo top-right; numbers and Latin terms stay LTR.
- Mandatory before any HTML/page is called done: headless Chromium render with behavioral assertions (not static byte checks). For CSS-heavy pages assert rule count (>100) and that key selectors resolve.
- Escape `</script` to `<\/script` in JS strings before assembly.

**Both**
- No em-dashes anywhere (hyphen / colon / parentheses / two sentences). En-dash only for numeric ranges.
- Name is Deepo (capital D only). Sentence case in copy. No emoji in product copy.
- Log recurring mistakes and surprises to `tasks/lessons.md`.
- Legal items gate on Roy's sign-off, not on our interpretation. Credentials never appear in chat.

---

## Phase 0: Lock the foundation

Gates that protect everything after them. All must be green before Phase 1.

- [x] **G0. Baseline the live schema.** Dump live structure + RLS + grants + functions, commit under `supabase/baseline/`. (CC prompt in `IMPLEMENTATION_PLAN.md` Appendix A.)
  → verify: file committed; 3 known live-but-unmigrated tables present (`data_recipients`, `dpo_queue`, `org_compliance_scores`); RLS/grants for `hub_*` and `regulatory_*` now known.
  ✓ DONE (commit 71deb834, branch chore/baseline-dump, 2026-06-22). `baseline-20260622.sql`: 58 tables, 89 policies, 234 grants, 128 functions (3 SECURITY DEFINER), PG 17.6, no row data, secret-clean. Captured via the Management API SQL endpoint (Docker/pg_dump were absent). Audit section 6 resolved: `regulatory_*` RLS off but grant-protected; `hub_*` RLS on, SELECT-only for authenticated. Push pending.
- [ ] **G1. Security hotfix merged.** The DSAR `get_requests` auth gate. Done on branch `security/rights-get-requests-auth`, pending push.
  → verify: unauth read 401; authed DPO works; public submit works; `tsc` clean; branch merged.
- [ ] **G0b. Migration discipline in place.** Decide and document the rule (every schema change is a tracked migration). Optional: a lightweight CI/check that flags drift.
  → verify: rule written into repo (e.g. `CONTRIBUTING.md` or `tasks/lessons.md`); team aware.
- [ ] **G0c. Build target confirmed = existing repo.** Strangler, not new repo. Record the decision.
  → verify: one paragraph in repo noting the decision and the keep/build/migrate/retire split from `ARCHITECTURE.md`.
- [ ] **G0d. Test harness ready.** Confirm Playwright/Chromium available for UI render assertions; confirm `tsc`, lint, and the DB verify pattern run locally.
  → verify: a trivial headless render assertion passes; `tsc --noEmit` runs clean on `main`.
- [~] **G0e. Styling-approach discovery.** Find how the current app styles (Tailwind config? CSS modules? global CSS?) so the design-system port integrates cleanly rather than fighting an existing system.
  → verify: short note in `tasks/lessons.md` on the current approach and the chosen integration path for tokens.
  ✓ DONE (folded into A1 Step 1). Found: Tailwind 3.4 + shadcn on a navy/blue HSL token system, global `src/app/globals.css`, already RTL-aware. Brand tokens are raw-name vars with no overlap, so they coexist safely. Logged in lessons.md.

---

## Phase 1: Design system into the app + ledger core

Two tracks. They share no dependency, so they run in parallel (different skills: frontend vs DB). Both feed Phase 2.

### Track A: port the brand system into the app

- [x] **A1. Tokens + globals.** Bring `colors_and_type.css` (+ `styles.css` entry) into the app per G0e's chosen path. Load Rubik/Assistant/Heebo. Drop in logos (`logofull.png` light, `logoreverse.png` dark, `logomark.png` icon) and `deepo-icons.js`.
  → verify: a token-test page renders crimson primary, Onyx dark surface with ember glow, Sand page bg, the gradient on one element; fonts resolve; headless render confirms >100 CSS rules and key tokens resolve.
  ✓ DONE (commit 77a8632c, branch feature/brand-foundation, pushed 2026-06-22). Base scoped under `.deepo-scope` so existing screens untouched; `--fg-on-accent` added; icons as `<DeepoIcon>` TSX; 1185 CSS rules resolve.
- [x] **A2. Port the 7 primitives to app components (TSX).** Button, Input, Switch, Checkbox, Radio, Badge, Card. Do not import the design-system bundle (`DeepoDesignSystem_430df4`); reimplement as real app components driven by the tokens. Match the reference behavior in `components/*`.
  → verify: a component gallery route renders all 7 in light and dark; states (focus halo, error, disabled) correct; RTL correct; headless behavioral assertions per component.
  ✓ DONE (same commit 77a8632c). 7 primitives at `src/components/brand/*.tsx`, dev-only `/brand-gallery` route (404 in prod via middleware), 13/13 headless assertions pass, tsc clean.
- [ ] **A3. App shell / chrome.** Rebuild the authenticated shell from `chrome.jsx`: RTL layout, logo top-right, mobile top bar (logo right, hamburger/bell left), nav. One shell, themed per actor later.
  → verify: shell renders desktop + mobile widths; nav works; headless assertion on layout direction and logo position.
- [ ] **A4. New product components (extend the DS).** Build the v3-specific pieces the four-actor surfaces need, on the same tokens:
  - `ObligationStatusChip` (5 states: unknown, checking, in_treatment, compliant, expired) mapped to status colors + neutral.
  - `ObligationCard` / `ObligationRow` (title, status, provenance, evidence link, recurs-at).
  - `ComplianceScoreDial`, `ControlScheduleItem` (cadence, next due), `TaskRow` (assignee actor, due, link).
  - `EventTimeline`, `DocumentLifecycleBadge` (draft → review → approved → published), `ClientOverviewCard` (DPO multi-client).
  - `TokenizedFormShell` (minimal, zero-chrome layout for no-login sysadmin/vendor forms, exposes nothing about the org).
  → verify: each in the gallery, light + dark, RTL; status colors match brand; headless assertions.

### Track B: ledger core (backend)

- [ ] **B1. PR1 ledger schema.** Create `obligations`, `controls`, `tasks`, `evidence`, `assets`, `contacts`, `events` + the obligation status enum, anchored to `organizations` and the `hub_*` catalog. Resolve the two open items (L2 vertical-profile object shape; `systems`/`databases` as thin tables vs folded under `assets`), document the choice in the migration header.
  → verify: discovery first; dry-run then COMMIT; all 7 tables + enum confirmed in a separate query; zero existing tables altered.
- [ ] **B2. PR2 evaluator.** Make `hub_gap_rules.rule_dsl` evaluate against a client's facts and mint/upsert `obligations` rows with provenance; instantiate `hub_control_playbooks` into `controls` with `next_due_at`. Deterministic, no LLM in the inference path.
  → verify: test-first. Seeded org mints exactly the firing rules' obligations, with correct provenance and control due dates; re-run is idempotent (no dupes); tests pass.
- [ ] **B3. Seed fixtures.** A known test org with facts, so Track A surfaces (Phase 2) build against real ledger data, not mocks.
  → verify: seed script produces a stable org + obligations/controls/tasks; documented.

---

## Phase 2: The DPO console (first full actor surface)

The highest-value surface. Built on Track A's components, reading the Track B ledger. Authenticated.

- [ ] **C1. Console shell + multi-client overview.** All clients in one view, a compliance score each (`ClientOverviewCard`). Flags stuck-in-onboarding and upsell opportunities.
  → verify: renders the seed org(s); score matches ledger; headless assertion; RTL.
- [ ] **C2. Per-client obligation ledger view.** The obligations with states and provenance; controls and their schedule; the client's assets and vendors (`data_recipients`).
  → verify: states render with the right chip; provenance traces to the rule + version; matches DB rows.
- [ ] **C3. Judgment queue.** `dpo_queue` work items: approve a generated document, decide a database classification, review a vendor agreement, accompany an incident. Sign-off recorded to history.
  → verify: an action writes the resolution + an `events` row; history shows who/when.
- [ ] **C4. PR3 read-path wiring (flag `LEDGER_READ`).** The console reads obligation/control/task state from the ledger, not the recomputed engine. Old engines stay flagged off for ledger orgs.
  → verify: flag on, seed org renders from ledger; flag off, existing orgs unchanged; `tsc` clean.

---

## Phase 3: Backfill + the owner light app

- [ ] **D1. PR4 backfill.** Migrate `organization_profiles.*`, `processing_activities.*`, `work_plans.tasks`, and the jsonb vendor copies into the ledger and `data_recipients` (the single vendor home). Keep jsonb as read-only legacy.
  → verify: dry-run on a copy of one real org; row counts reconcile (or skips logged with reason); 3 migrated orgs match their old dashboard; source untouched (reversible).
- [ ] **D2. Owner home (light app).** Plain-language compliance state, what Deepo is handling, what (rarely) needs the owner. Owner-facing copy avoids technical Hebrew (no מערכות/רשומות), icount-style warmth, one wink per screen.
  → verify: renders for the seed org; copy reviewed against the voice guide; headless + RTL.
- [ ] **D3. Owner approvals.** One-tap approve of prepared documents; approval flows to the document lifecycle.
  → verify: an approval advances the `DocumentLifecycleBadge` and writes an `events` row.
- [ ] **D4. Onboarding rebuilt (Classify).** The classification flow on the new DS, feeding facts the evaluator reads. Smart classification that can reduce obligations is surfaced as a value moment.
  → verify: completing onboarding emits facts; the evaluator mints the right obligations; headless.

---

## Phase 4: Engine triggers + collection (the bottleneck)

The hardest, highest-moat part: getting truth from sysadmins and vendors over zero-exposure links, automatically chased.

- [ ] **E1. PR5 wire the engine.** Emit `deepo/agent.invoke` on onboarding done, asset added, answer arrived, control due, document approved. Add domain skills (mint/refresh obligation, open task, request evidence, render document).
  → verify: each trigger has a test; a control coming due produces a task; idempotent under repeat events.
- [ ] **E2. PR6 access-link primitive + DSAR pass-through.** `access_links` (hashed token, scoped purpose, expiry, revoke). A link resolves only to its one form, never org identity or compliance data. Convert DSAR to true pass-through: stop persisting requester name / national ID / email / phone; keep only non-identifying metadata; purge/migrate existing PII rows. Re-evaluate `/trust/[slug]` and `get_org` against the zero-exposure rule.
  → verify: link payload asserted to contain zero org identity/compliance data; expired/revoked links 403; a submitted DSAR forwards to the business and leaves no identifying fields in the DB (assert columns gone/empty); security review before merge. **Hard CC-2 gate.**
- [ ] **E3. Sysadmin questionnaire UI (no-login).** Short, targeted (backups, restore tested, 2FA, logs), on `TokenizedFormShell`. Exposes nothing about the org.
  → verify: headless assertion that the page shows no org name/score/data; answers submit; zero-exposure confirmed.
- [ ] **E4. Vendor flows UI (no-login).** Upload DPA / confirm wording, then submit annual report, on `TokenizedFormShell`.
  → verify: same zero-exposure assertion; submission writes evidence.
- [ ] **E5. PR7 collection wiring + auto-chase.** Answers write `evidence` against the right obligations and flip state toward compliant. Inngest schedules reminders that stop when the answer arrives. A shared vendor collected once covers many clients (the moat).
  → verify: an answer over a link flips the obligation + writes evidence; chase fires on schedule and stops on arrival; one shared vendor's DPA satisfies the obligation across multiple orgs.

---

## Phase 5: Documents + certify + public surfaces

- [ ] **F1. PR8 documents as ledger renders.** The five documents generated from the ledger, with lifecycle (auto-generated → DPO review → owner approve → published → next review) and full version history with who/when (CC-4 provenance). LLM writes prose, never decides obligations.
  → verify: regenerating after an obligation change produces a new version with a diff; published privacy policy matches what the owner approved.
- [ ] **F2. PR9 audit pack (Certify).** One-click pack: documents + obligation states with provenance + evidence chain + control log.
  → verify: pack for a fully-collected org contains every obligation with its evidence and control history; each claim traces to its proof.
- [ ] **F3. Public DSAR intake (brand).** The public request form rebuilt on the brand, pass-through (nothing stored at Deepo).
  → verify: submission forwards to the business; no PII persisted; headless + RTL.
- [ ] **F4. Trust page + live policy embed.** Rebuild `/trust/[slug]` to the zero-exposure rule (or behind owner opt-in with explicit consent about what is shown); ship the live policy widget as a real embed (script/iframe), monitored as published.
  → verify: discloses only what the owner explicitly published; embed renders on an external test page; monitoring confirms publication.

---

## Phase 6: Retire legacy + harden (Production-100 and on)

- [ ] **G1p. PR10 vertical-profile authoring.** The L2 profile object gets a simple expert console screen so Roy/Amir add a vertical by config, no programmer.
  → verify: a new profile produces a correctly-scoped ledger for a test org of that type.
- [ ] **G2p. PR11 obligation-reduction simulator.** DB split/merge what-if reads the live ledger, shows before/after obligation counts, DPO signs, system reclassifies.
  → verify: a simulated split reduces the obligation set as predicted, gated on DPO sign-off.
- [ ] **G3p. PR12 retire legacy.** Remove the two hardcoded engines and the migrated jsonb stores behind a final flag flip, once the ledger is canonical for all orgs.
  → verify: no code path reads the old engines or jsonb sources; dashboards unaffected.
- [ ] **G4p. Marketing site on brand.** Rebuild the public marketing site from `ui_kits/marketing` on the live brand if not already current.
  → verify: headless render; brand-correct; RTL Hebrew primary.
- [ ] **G6p. Revoke anon DML on `hub_*` (latent security, found in G0).** All 7 `hub_*` catalog tables still GRANT broad DML (INSERT/UPDATE/DELETE/TRUNCATE/...) to `anon`. RLS is currently the only protection; if RLS is ever disabled, anon regains full write to the regulation/rules catalog. Same class as the DSAR leak, but dormant.
  → verify: a migration REVOKEs anon (and unnecessary authenticated) DML on all `hub_*`; confirm via `pg_class.relacl` in a separate query; catalog still readable by authenticated; no app path breaks. Do soon, not emergency (RLS holds today).
- [ ] **G5p. Hardening.** RLS verified against the baseline; fix the `route.ts:587` latent bug; confirm PC latency targets; cost under 5% revenue; pen test (timing still open).
  → verify: each as its own checked item when addressed.

---

## Milestone mapping

| Milestone | Covers |
|---|---|
| **MVP** (~6 wks, 5-10 design partners) | Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 |
| **Production-100** (~3 mo, first paying) | Phase 6 (vertical authoring, reduction simulator, retire legacy, harden) |
| **Production-1K** (~6 mo) | continued hardening: pen test, perf, cost |
| **Production-10K** (~1-2 yr) | multi-vertical catalog, shared-vendor economics at volume |

**Critical path:** G0 → B1 → B2 → C4 (read-path) → D1 (backfill). Until the ledger is canonical, every surface is built on sand. **B2 (the evaluator) is the single highest-leverage task:** it turns the authored-but-dead catalog into the live spine. Track A can run fully in parallel and should start day one, since it has no backend dependency and unblocks every surface.

---

## Parking lot (deferred, not lost)

- Rewrite the three partner Google Docs (MVP spec, Knowledge Domains Roadmap, Partner Summary) to v3. The two stale ones (architecture, commitments) already parked.
- Internal founder/admin dashboard (cross-org metrics: active orgs, churn, agent health, API spend, Sentry, funnel). Distinct from the DPO operational console.
- Forgot-password / reset flow end-to-end test (Supabase + Resend deliverability).
- Auto-upsell automation; additional sticky embeds.

---

*References: `ARCHITECTURE.md` (design source of truth) · `docs/audit-architecture-v3.md` (current-state evidence) · brand system in the project files (`colors_and_type.css`, `components/*`, `deepo-icons.js`, `ui_kits/*`). Update this tracker as items move.*

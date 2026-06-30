# Definition of Done (Deepo)

Drop this at `tasks/DEFINITION_OF_DONE.md`. The executor reads it at task start and
self-checks against it BEFORE declaring any task done. Every rule here traces to a
real bug or review on this project. "Self-reports not trusted" means: prove it with
a rendered screenshot or a real-route gate, never a claim.

The human (Adam) still owns three gates that do not automate: the live render
eyeball before merge, legal sign-off (Roy / Amir), and genuine architecture or scope
forks. Everything else below the executor enforces on itself.

---

## 1. Verification (no self-reports)

- [ ] `npx tsc --noEmit` clean before every commit. Vercel type-checks `scripts/` too, so verify scripts compile, not just `src/`.
- [ ] Any UI change is headless-rendered before delivery. No exceptions.
- [ ] Render AS the real seeded accounts, not synthetic fixtures: `adamrozichner+bdika@gmail.com` (DPO / expert_curator) and `adamrozichner+onboard@gmail.com` (owner). A gate that passes on a seeded `dpos` row but the live login fails is the exact miss this rule exists to catch.
- [ ] Computed-style assertion on any styled block: a stat number's `font-size` must exceed body font-size. An unstyled block must never pass as "renders correctly." (This is the literal check that would have caught `ledger.css` never being loaded.)
- [ ] Security gates hit the real HTTP route with a real JWT, never a helper replica. Proving the helper logic is not proving the route invokes it.
- [ ] Report includes the screenshot(s) and the actual gate output (status codes, row counts), not a summary of intent.

## 2. Multi-tenancy / curator isolation (the heaviest gate)

- [ ] Every cross-client surface (read or write) goes through `authenticateCurator` + the `curatorOwnsOrg` chokepoint, scoped by the JWT-derived `dpo_id`. Never global, never the legacy `dpo_sessions` password, never "shows all orgs."
- [ ] `curatorOwnsOrg` is the single shared book-verification helper, reused by every per-client route. No route hand-rolls its own check. It runs BEFORE any row is read or mutated.
- [ ] Three-case isolation gate, real HTTP route, real JWT, for every new cross-client surface:
  - assigned-but-not-own-org -> 200
  - unassigned (`dpo_id` null) -> 403
  - assigned-to-another-dpo -> 403 (curator A must never see curator B's client)
- [ ] For writes, add a before/after row check proving the two 403 paths mutated nothing.
- [ ] Any new cross-client read (e.g. a book-wide inbox) is added to the isolation gate. This is the surface where "shows all orgs" regresses.
- [ ] CC-2: no subject PII in the primary DB; no-login tokenized links expose zero client-identifying info. A curator-minted link must be structurally identical to an owner-minted one and redeem the same way.

## 3. Data freshness

- [ ] Curator read routes return live rows. The service client uses `no-store` fetch (Next.js otherwise caches Supabase queries inside route handlers even under `force-dynamic`, and serves ghost rows). Verify: resolving an item makes it disappear without a hard refresh.

## 4. Migrations / schema

- [ ] Discover schema via `information_schema` before writing any SQL. Never assume a column exists, never assume one is missing.
- [ ] Migrations are applied manually in the Supabase SQL editor first, then verified, before merging dependent code.
- [ ] ACL verified via `pg_class.relacl` (authoritative), not just `information_schema`.
- [ ] Regulatory tables: zero anon / PUBLIC / authenticated grants confirmed before merge (the GRANT-firewall). RLS-disabled regulatory tables rely on GRANT, so this is load-bearing.
- [ ] Destructive operations get a dry-run (ROLLBACK) before COMMIT.
- [ ] Supabase SQL editor shows only the final SELECT, so run verification queries individually in separate tabs after COMMIT.

## 5. Surface / visual invariants (per-actor)

- [ ] DPO and owner have DISTINCT nav AND distinct topbar. No shared generic "לוח בקרה" topbar on either. No legacy `SHELL_NAV` bleeding into a v3 surface.
- [ ] DPO console = onyx dark sidebar with ember glow; owner app = light sand shell. Visually distinct surfaces.
- [ ] Logo: correct per-theme variant (`logoondark` on the DPO dark sidebar, `logofull` on the owner light shell). No black box / JPEG-matte fringe. (No SVG is available; mask/contain the PNG so no rectangle shows.)
- [ ] Stat clusters render as styled tiles (number prominent, label below, no RTL number-label collision). Computed-style assert holds.
- [ ] Brand: crimson (#D10331) -> amber gradient on the dial; Rubik / Assistant / Heebo; RTL Hebrew throughout. "Deepo" always capital-D.

## 6. Auth / session

- [ ] Login routes by role: owner/admin -> `/home`, expert_curator -> `/console`. No legacy `/chat` landing.
- [ ] Account switching fully clears the prior Supabase session and OrgProvider/curator state. A previous login must never serve a stale token to the wrong surface (the forbidden-after-owner-login bug).
- [ ] A correctly-seeded account never sees a forbidden state on its own surface. Verify in a CLEAN session per role.

## 7. Owner-facing content gates

- [ ] No jargon leak: the owner UI never shows raw obligation titles, severities, rule-ids, or legal jargon. `buildOwnerGaps` keys only on `source_rule_id` with a generic fallback for unknown rules.
- [ ] Cold-start: when all obligations are unknown/checking (`isUnassessed`), show the "still mapping" placeholder, not a 0% score or a gap list. Trigger is obligation-STATE, never `score === 0`. A genuinely-assessed client at 0 still shows 0.
- [ ] Owner placeholder copy is owner-voiced, never the DPO's "בתהליך מיפוי" string. Metric cards stay real numbers; only the per-client score gets the placeholder.
- [ ] 5% humor: wink at the experience or the jargon, never at the law, fines, or the regulator.
- [ ] Legal text / penalty figures / templates ship only with Roy or Amir sign-off, never on the executor's interpretation.

## 8. Engineering discipline

- [ ] Plan-first on genuine forks: investigate, state assumptions and the data path, hold for approval, then build. (Routine work inside an approved milestone does not need per-task approval.)
- [ ] Feature-flag over delete.
- [ ] Scoped commits: explicit paths, never `git add -A`. One logical change per commit.
- [ ] Never squash-merge when a follow-up fix commit exists on the branch.
- [ ] Read the codebase; do not assume schema or APIs.
- [ ] Reskin = scoped CSS overrides, not className rewrites.
- [ ] Side-effectful actions get an explicit confirm step: certify (creates an audit pack), mint (creates a live no-login token), any delete. Not a bare button.
- [ ] Legacy reuse: mine the engine (tables, queries, routes, logic), never carry the legacy shell or nav across. Carrying the legacy nav re-imports the IA confusion the respec exists to kill.
- [ ] Tested pure mappers stay tested against live rows: `scoreFromObligations`, `isUnassessed`, `deriveLedgerStats`, `buildOwnerHome`, `buildOwnerGaps`, `renderDocument`, `buildAuditPack`, `buildLedgerSummary`.

## 9. Reporting (what "done" looks like)

For each task, the executor reports:
1. Checklist progress against the relevant sections above.
2. The actual gate output (statuses, row counts) and the rendered screenshot(s) as the real seeded accounts.
3. What was reused vs rewired vs built new (the reuse-first default).
4. Anything that needs Adam: a render eyeball, a legal sign-off, or an architecture/scope fork.

Nothing merges until Adam's live eyeball. Scoped commits, one branch, until then.

---

### Standing context the executor must hold

- Architecture v3 = the operational compliance loop. Core = the relational Obligation Ledger (Postgres). Five-C: Classify -> Collect -> Close -> Control -> Certify. Four actors: DPO (full console), owner (light /home), sysadmin (no-login tokenized link), vendor (no-login tokenized link).
- DPO IA: top nav = Overview + book-wide Approvals. Per-client queue / documents / audit / links live UNDER the client drill-down, never top-level.
- Pilot scope: payment dropped; score is ledger-derived; deferred post-pilot = messaging (both sides), full DSAR list, vendor management, sales-opportunities.

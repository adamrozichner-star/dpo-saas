# Project lessons

Running log of mistakes that wasted time + the rule learned. Entries
are append-only and dated.

## 2026-05-22 — Don't spec from memory when source-of-truth exists
**What happened**: Wrote a CC prompt with detailed field specs for 5 artifact types, working from memory. CC's schema audit found mismatches on nearly every field.
**Root cause**: Treated the schema like an abstract design when migration 022 is the concrete source of truth, sitting in the repo.
**Rule**: When the database schema exists, always have CC read the migration file as Step 1 before any field-level work. Don't restate the schema in prompts — just say "read migration X, then build against it."

## 2026-05-22 — RLS + custom role spec contradiction
**What happened**: Spec for migration 023 said "no INSERT/UPDATE policies" AND "worker uses non-service_role role." These contradict — RLS blocks non-service_role writes by default.
**Root cause**: Conflated two RLS patterns. service_role bypasses RLS; custom roles need explicit policies.
**Rule**: When specifying a non-service_role role for tighter scoping, ALWAYS pair it with explicit RLS policies scoped to that role. Never write "no policies" + "custom role" in the same spec.

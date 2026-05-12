-- 015_notifications_dedup.sql
--
-- Fix: duplicate notification rows produced by concurrent callers of
-- checkAndCreateNotificationsForOrg (cardcom webhook + dashboard refresh +
-- onboarding completion all fire near-simultaneously). The JS-level
-- "SELECT then INSERT" pre-check inside notifications-trigger.ts is a TOCTOU
-- race; correctness needs a DB constraint.
--
-- Run order:
--   1) De-duplicate existing rows: keep the earliest row per
--      (org_id, type, title); delete the rest.
--   2) Add a UNIQUE INDEX on (org_id, type, title). New inserts that would
--      collide become no-ops (`upsert(..., { onConflict, ignoreDuplicates: true })`
--      in notifications-trigger.ts).
--
-- Not auto-run. Apply via `supabase db push` or the SQL editor.

BEGIN;

-- 1. De-dupe: keep the row with the earliest created_at per
--    (org_id, type, title); delete the rest. Self-join pattern instead of
--    `MIN(id) … GROUP BY` because notifications.id is a UUID and uuid has
--    no native aggregate min on it.
DELETE FROM notifications a
USING notifications b
WHERE a.org_id    = b.org_id
  AND a.type     = b.type
  AND a.title    = b.title
  AND a.created_at > b.created_at;

-- Tie-break for rows that share created_at down to the millisecond.
-- UUID comparison in Postgres is by byte order — not semantically meaningful,
-- but deterministic, which is all we need to keep exactly one row.
DELETE FROM notifications a
USING notifications b
WHERE a.org_id    = b.org_id
  AND a.type     = b.type
  AND a.title    = b.title
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- 2. Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_org_type_title_unique
  ON notifications (org_id, type, title);

COMMIT;

-- =============================================================================
-- 021_cleanup_test_orgs.sql
--
-- Bulk deletion of 152 test organizations and all dependent rows.
-- Keep only:
--   4b42a6e3-dac9-4191-9713-bb7f7b6cff70  Kreston       (קרסטון יועצים)
--   be8c5dbe-52e4-470f-ac98-dd7caf6297d0  Amir Pasternak (אמיר פסטרנק פתרונות פרטיות)
--
-- Cleanup approach:
--   - 32 of 33 FK constraints on public.organizations use ON DELETE CASCADE,
--     so a single DELETE on organizations removes all dependent rows
--     automatically in those 32 tables.
--   - 1 exception: payment_logs.org_id_fkey uses ON DELETE NO ACTION.
--     We DELETE from payment_logs explicitly first to avoid a FK violation.
--     (Today payment_logs has 0 delete-list rows, so this is a defensive
--     no-op — but the migration would block if any row were added between
--     backup and apply time.)
--
-- Out of scope (separate follow-up):
--   51 auth.users rows tied to the deleted public.users will be left
--   orphaned. They cannot be cascade-deleted from public; see PR body
--   for the optional follow-up SQL.
--
-- Apply procedure (manual, post-backup):
--   1. Run /tmp/cleanup-backup-20260521-1442.sql first (psql -f).
--   2. Run this migration in a transaction. Default has COMMIT; change to
--      ROLLBACK to dry-run and inspect verification counts first.
--   3. Confirm expected counts match Phase 1 inventory.
--   4. If correct, switch ROLLBACK back to COMMIT and re-run.
--
-- Expected post-DELETE counts (from Phase 1 inventory, 2-keep version):
--   organizations  2
--   users          2
--   notifications  0
--   documents     12
--   chat_messages  0
-- =============================================================================

BEGIN;

-- 1. Clear payment_logs first (NO ACTION FK; can't rely on cascade).
DELETE FROM payment_logs
WHERE org_id NOT IN (
  '4b42a6e3-dac9-4191-9713-bb7f7b6cff70',
  'be8c5dbe-52e4-470f-ac98-dd7caf6297d0'
);

-- 2. Cascade-delete the rest by deleting the parent rows.
DELETE FROM organizations
WHERE id NOT IN (
  '4b42a6e3-dac9-4191-9713-bb7f7b6cff70',
  'be8c5dbe-52e4-470f-ac98-dd7caf6297d0'
);

-- 3. Verification — counts should match the "Keep" column of Phase 1 inventory.
SELECT 'organizations'  AS tbl, COUNT(*) AS rows_remaining FROM organizations;   -- expect 2
SELECT 'users'          AS tbl, COUNT(*) AS rows_remaining FROM users;           -- expect 2
SELECT 'notifications'  AS tbl, COUNT(*) AS rows_remaining FROM notifications;   -- expect 0
SELECT 'documents'      AS tbl, COUNT(*) AS rows_remaining FROM documents;       -- expect 12
SELECT 'chat_messages'  AS tbl, COUNT(*) AS rows_remaining FROM chat_messages;   -- expect 0

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs still
-- print but nothing persists.

-- =============================================================================
-- 020_cameras.sql
--
-- Cameras table — Dana's first owned domain. Surveillance systems as a
-- first-class entity with privacy-relevant fields (purpose, retention,
-- signage, review cadence) so the persona has structured data to scan
-- and reason about.
--
-- Seed data for Kreston includes 3 cameras with intentional compliance
-- issues (missing signage on one, overdue review on another) so Dana's
-- first scan has something to surface.
--
-- RLS strategy: same pattern as other org-scoped tables (017 / 019):
--   - SELECT/INSERT/UPDATE/DELETE for `authenticated` scoped to user's org
--   - No service_role policies (it bypasses RLS automatically)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. cameras table
-- -----------------------------------------------------------------------------
CREATE TABLE public.cameras (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  location                    TEXT,
  model                       TEXT,
  recording_purpose           TEXT,
  recording_retention_days    INT,
  data_subject_categories     TEXT[],
  requires_signage            BOOLEAN NOT NULL DEFAULT true,
  signage_present             BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at            TIMESTAMPTZ,
  next_review_due_at          TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 2. RLS policies — org-scoped CRUD
-- -----------------------------------------------------------------------------
CREATE POLICY "cameras_select_own_org" ON public.cameras
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "cameras_insert_own_org" ON public.cameras
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "cameras_update_own_org" ON public.cameras
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "cameras_delete_own_org" ON public.cameras
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.users WHERE auth_user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- 3. Indexes — tuned for Dana's two main scan paths
-- -----------------------------------------------------------------------------
CREATE INDEX idx_cameras_org_review_due
  ON public.cameras (org_id, next_review_due_at);

CREATE INDEX idx_cameras_org_signage_missing
  ON public.cameras (org_id)
  WHERE signage_present = false;


-- -----------------------------------------------------------------------------
-- 4. Seeds — 3 Kreston cameras with intentional issues
--    1. Main entrance:    healthy (Dana should not flag)
--    2. Parking garage:   signage_present=false → 'signage_missing'
--    3. Server corridor:  next_review_due_at in the past → 'review_overdue'
-- -----------------------------------------------------------------------------
INSERT INTO public.cameras
  (org_id, name, location, recording_purpose, recording_retention_days, data_subject_categories, requires_signage, signage_present, last_reviewed_at, next_review_due_at, notes)
VALUES
  ('4b42a6e3-dac9-4191-9713-bb7f7b6cff70',
   'כניסה ראשית', 'דלת כניסה ראשית, קומה 1',
   'security', 30, ARRAY['employees','visitors'], true, true,
   now() - interval '2 months', now() + interval '4 months',
   'מצלמה תקינה, בדיקה אחרונה בוצעה'),
  ('4b42a6e3-dac9-4191-9713-bb7f7b6cff70',
   'חניון תת-קרקעי', 'חניון קומה תת-1, יציאה דרומית',
   'security', 14, ARRAY['employees','visitors'], true, false,
   now() - interval '3 months', now() + interval '3 months',
   'שלט הסבר חסר — דורש טיפול'),
  ('4b42a6e3-dac9-4191-9713-bb7f7b6cff70',
   'מסדרון שרתים', 'מסדרון לחדר שרתים, קומה 2',
   'security', 7, ARRAY['employees'], true, true,
   now() - interval '8 months', now() - interval '2 months',
   'בדיקה עברה מעבר ל-6 חודשים, נדרשת בדיקה מחודשת');


-- -----------------------------------------------------------------------------
-- 5. Verification
--    Kreston org_id: 4b42a6e3-dac9-4191-9713-bb7f7b6cff70
--    Expected: 3 cameras for Kreston, 0 for Amir Pasternak.
--    Expected status breakdown (computed in TypeScript, shown here as
--    diagnostic counts so we can spot-check from SQL):
--      signage_missing  1   (חניון תת-קרקעי)
--      review_overdue   1   (מסדרון שרתים)
--      ok               1   (כניסה ראשית)
-- -----------------------------------------------------------------------------
SELECT 'cameras_total' AS tbl, COUNT(*) AS n FROM public.cameras;
SELECT 'cameras_kreston' AS tbl, COUNT(*) AS n
  FROM public.cameras
  WHERE org_id = '4b42a6e3-dac9-4191-9713-bb7f7b6cff70';
SELECT 'cameras_signage_missing' AS tbl, COUNT(*) AS n
  FROM public.cameras
  WHERE requires_signage = true AND signage_present = false;
SELECT 'cameras_review_overdue' AS tbl, COUNT(*) AS n
  FROM public.cameras
  WHERE next_review_due_at < now();

COMMIT;

-- To dry-run: change COMMIT to ROLLBACK and re-run; verification SELECTs still
-- print but nothing persists.

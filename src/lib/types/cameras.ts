// TypeScript types + Zod schema for the cameras table (migration 020) and
// the derived review-status helper Dana uses on every scan.

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Camera row
// -----------------------------------------------------------------------------

export interface Camera {
  id: string;
  orgId: string;
  name: string;
  location: string | null;
  model: string | null;
  recordingPurpose: string | null;
  recordingRetentionDays: number | null;
  dataSubjectCategories: string[] | null;
  requiresSignage: boolean;
  signagePresent: boolean;
  lastReviewedAt: string | null;
  nextReviewDueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CameraSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1),
  location: z.string().nullable(),
  model: z.string().nullable(),
  recording_purpose: z.string().nullable(),
  recording_retention_days: z.number().int().nullable(),
  data_subject_categories: z.array(z.string()).nullable(),
  requires_signage: z.boolean(),
  signage_present: z.boolean(),
  last_reviewed_at: z.string().nullable(),
  next_review_due_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).transform((row): Camera => ({
  id: row.id,
  orgId: row.org_id,
  name: row.name,
  location: row.location,
  model: row.model,
  recordingPurpose: row.recording_purpose,
  recordingRetentionDays: row.recording_retention_days,
  dataSubjectCategories: row.data_subject_categories,
  requiresSignage: row.requires_signage,
  signagePresent: row.signage_present,
  lastReviewedAt: row.last_reviewed_at,
  nextReviewDueAt: row.next_review_due_at,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));

// -----------------------------------------------------------------------------
// Review status — single ordinal value Dana surfaces per camera
// -----------------------------------------------------------------------------

export type CameraReviewStatus =
  | 'ok'
  | 'signage_missing'
  | 'review_overdue'
  | 'retention_warning';

// Retention threshold (days). Israeli PPA guidance for general security
// footage is typically ≤30 days; longer than that is unusual and warrants
// a flag. Null retention is also a flag because it means we don't know.
const RETENTION_WARNING_DAYS = 30;

// Priority order when a camera has multiple issues:
//   1. signage_missing  — easy fix, blocks compliance, highest leverage
//   2. review_overdue   — process / human attention
//   3. retention_warning — configuration nuance, lowest urgency
//   4. ok               — nothing to do
export function getCameraReviewStatus(camera: Camera): CameraReviewStatus {
  if (camera.requiresSignage && !camera.signagePresent) {
    return 'signage_missing';
  }
  if (camera.nextReviewDueAt && new Date(camera.nextReviewDueAt) < new Date()) {
    return 'review_overdue';
  }
  if (
    camera.recordingRetentionDays === null ||
    camera.recordingRetentionDays > RETENTION_WARNING_DAYS
  ) {
    return 'retention_warning';
  }
  return 'ok';
}

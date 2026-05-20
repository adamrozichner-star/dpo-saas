import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Deprecated. Recurring billing is now owned by Inngest:
//   src/inngest/functions/billing-recurring.ts
// The Vercel cron entry that used to fire this route was removed from
// vercel.json; Inngest's `dispatchRecurringBilling` runs on the same
// 0 6 * * * schedule and fans out per-org via the
// `deepo/billing.org.charge` event.
//
// Idempotency fix shipped with the migration: payment_transactions.id now
// uses `recurring_${orgId}_${YYYYMMDD}` instead of the old
// `recurring_${orgId}_${Date.now()}`, so a retry within the same day
// collides on PK rather than silently creating a second charge row.
//
// This stub returns 410 Gone for any leftover external caller. The file is
// kept (not deleted) so anyone arriving from logs or bookmarks sees a clear
// deprecation signal.
export async function GET() {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'Cron moved to Inngest /api/inngest functions',
    },
    { status: 410 },
  )
}

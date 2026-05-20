import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Deprecated. The daily notification check is now owned by Inngest:
//   src/inngest/functions/check-notifications.ts
// The Vercel cron entry that used to fire this route was removed from
// vercel.json; Inngest's `dispatchDailyNotifications` runs on the same
// 0 6 * * * schedule and fans out per-org via the
// `deepo/notifications.org.check` event.
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

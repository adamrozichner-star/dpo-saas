import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Deprecated. Quarterly DPO report generation is now owned by Inngest:
//   src/inngest/functions/quarterly-reports.ts
// The Vercel cron entry that used to fire this route was removed from
// vercel.json; Inngest's `dispatchQuarterlyReports` runs on the same
// 0 6 1 1,4,7,10 * schedule and fans out per-org via the
// `deepo/reports.org.generate` event.
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

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  dispatchDailyNotifications,
  checkOrgNotifications,
} from '@/inngest/functions/check-notifications';
import {
  dispatchQuarterlyReports,
  generateOrgQuarterlyReport,
} from '@/inngest/functions/quarterly-reports';
import {
  dispatchRecurringBilling,
  chargeOrgRecurring,
} from '@/inngest/functions/billing-recurring';

// Inngest's Next.js serve handler. Inngest Cloud sends GET (introspect),
// POST (function invocation), and PUT (register functions on deploy) to this
// route. Add new functions to the array as they're migrated off Vercel cron.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dispatchDailyNotifications,
    checkOrgNotifications,
    dispatchQuarterlyReports,
    generateOrgQuarterlyReport,
    dispatchRecurringBilling,
    chargeOrgRecurring,
  ],
});

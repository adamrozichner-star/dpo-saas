import { Inngest } from 'inngest';

// Single Inngest client for the whole app. Functions register against this
// client and route handlers serve it. The SDK reads INNGEST_EVENT_KEY and
// INNGEST_SIGNING_KEY from process.env automatically; in local dev (no keys
// set) it falls back to the Inngest dev server at http://localhost:8288.
export const inngest = new Inngest({ id: 'deepo' });

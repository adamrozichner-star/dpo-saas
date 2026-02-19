# Security Fix Deployment Checklist

## Pre-deploy: Vercel Environment Variables

You MUST set these env vars before deploying (without them, DPO and cron auth will fail closed):

```
DPO_PASSWORD=<choose-a-strong-password>     # Server-only, replaces NEXT_PUBLIC_DPO_PASSWORD
CRON_SECRET=<random-string-for-cron-auth>   # Required for billing/trial cron jobs
```

**REMOVE** these old vars if they exist:
```
NEXT_PUBLIC_DPO_PASSWORD   ← delete this (leaked to client JS)
```

## Files to deploy (22 files)

### New files (create these)
- `src/lib/api-auth.ts` — shared auth middleware
- `src/lib/api-utils.ts` — HTML escape, crypto token gen
- `src/lib/api-client.ts` — client-side auth fetch helper

### Patched API routes (replace these)
- `src/app/api/chat/route.ts` — user auth on GET/POST
- `src/app/api/chat/stream/route.ts` — user auth on POST
- `src/app/api/dpo/route.ts` — DPO token auth on GET/POST
- `src/app/api/dpo-auth/route.ts` — crypto tokens, fail closed
- `src/app/api/dpo-admin/route.ts` — removed hardcoded password
- `src/app/api/incidents/route.ts` — dual auth (user/DPO)
- `src/app/api/messages/route.ts` — dual auth (user/DPO)
- `src/app/api/ropa/route.ts` — dual auth (user/DPO)
- `src/app/api/audit/route.ts` — user auth
- `src/app/api/email/route.ts` — internal key + XSS fix
- `src/app/api/qa/route.ts` — user auth
- `src/app/api/generate-documents/route.ts` — user auth
- `src/app/api/document-review/route.ts` — user auth
- `src/app/api/documents/export/route.ts` — user auth
- `src/app/api/cron/trial-reminders/route.ts` — fail-closed cron auth
- `src/app/api/billing/recurring/route.ts` — fail-closed cron auth

### Patched client pages (replace these)
- `src/app/dpo/page.tsx` — dpoFetch sends x-dpo-token header
- `src/app/chat/page.tsx` — authFetch sends Bearer JWT
- `src/app/dashboard/page.tsx` — authFetch sends Bearer JWT

### Deleted (remove these)
- `src/app/src/` — entire folder (old vulnerable duplicate)
- `src/app/api/cardcom.bak/` — dead code
- `src/lib/cardcom.ts.bak` — dead code
- `src/lib/use-subscription-gate.ts.bak` — dead code

## Post-deploy verification

1. Open `/dpo/login` → login with new `DPO_PASSWORD` → verify dashboard loads
2. Open `/dashboard` → verify chat, messages, incidents all load
3. Try `curl /api/dpo?action=stats` with no auth → should get 401
4. Try `curl /api/chat?orgId=<any-id>` with no auth → should get 401
5. Verify cron still works with `Bearer CRON_SECRET` header

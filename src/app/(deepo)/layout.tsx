// Brand app shell route group. Sits alongside the existing navy/stone pages and
// the (expert) group without touching them: a route group adds no URL segment,
// so v3 surfaces placed here must use NEW path names (not /dashboard, which the
// legacy page already owns). A3 hosts only the dev-only /shell-demo.
import '@/components/shell/shell.css'
import { AppShell } from '@/components/shell/AppShell'
import { OrgProvider } from '@/lib/org-context'

// OrgProvider resolves the current org/session for the shell + v3 surfaces.
// It does NOT gate auth here (so the dev /shell-demo still renders
// unauthenticated); pages that need auth gate themselves (see /console).
export default function DeepoLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  )
}

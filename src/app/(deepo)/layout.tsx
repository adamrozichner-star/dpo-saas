// Brand app shell route group. Sits alongside the existing navy/stone pages and
// the (expert) group without touching them: a route group adds no URL segment,
// so v3 surfaces placed here must use NEW path names (not /dashboard, which the
// legacy page already owns). A3 hosts only the dev-only /shell-demo.
import '@/components/shell/shell.css'
import { AppShell } from '@/components/shell/AppShell'

export default function DeepoLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}

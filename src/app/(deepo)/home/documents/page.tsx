'use client'

// Owner light app - "my documents". A plain, reassuring list of the org's ready
// privacy documents. Own-org RLS. No DPO mechanics (no fingerprints / templates /
// divergence / approve) and no jargon - the owner just sees what's ready.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'
import { DOC_TYPE_LABEL } from '@/components/ledger/status'

interface OwnerDoc { type: string; title: string }

export default function OwnerDocumentsPage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [docs, setDocs] = useState<OwnerDoc[] | null>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('documents')
        .select('type, title')
        .eq('org_id', org.id).eq('source', 'ledger_render').eq('status', 'active')
        .order('type')
      if (!cancelled) setDocs((data ?? []) as OwnerDoc[])
    })()
    return () => { cancelled = true }
  }, [supabase, org])

  if (authLoading || orgLoading || docs === null) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>
      <header>
        <h1 className="t-h1" style={{ margin: 0 }}>המסמכים שלכם</h1>
        <p className="t-body-sm" style={{ color: 'var(--fg-3)', marginBlockStart: 'var(--space-2)' }}>המסמכים שהכנו עבורכם. אנחנו דואגים שיהיו מעודכנים.</p>
      </header>
      {docs.length ? (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {docs.map((d, i) => (
            <Card key={i}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="t-body" style={{ flex: 1 }}>{DOC_TYPE_LABEL[d.type] ?? d.title}</span>
                <Badge variant="ok">מוכן</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card><p className="t-body" style={{ margin: 0 }}>עדיין אין מסמכים מוכנים. נכין אותם עבורכם ונעדכן אתכם.</p></Card>
      )}
    </div>
  )
}

'use client'

// Owner light app - "my details". A plain summary of the business + the kinds of
// information Deepo helps protect. Own-org RLS, owner-voiced, no jargon, no DPO
// internals. Identifiers (ת.ז / ע.מ) are deliberately NOT shown here.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { Card } from '@/components/brand/Card'
import { fetchOrgDescriptive } from '@/lib/ledger/descriptive'

export default function OwnerProfilePage() {
  const { user, supabase, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const router = useRouter()
  const [categories, setCategories] = useState<string[] | null>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/login') }, [authLoading, user, router])

  useEffect(() => {
    if (!supabase || !org) return
    let cancelled = false
    ;(async () => {
      const desc = await fetchOrgDescriptive(org.id, supabase)
      if (cancelled) return
      const dt = desc.profile?.data_types
      setCategories(Array.isArray(dt) ? (dt as string[]) : [])
    })()
    return () => { cancelled = true }
  }, [supabase, org])

  if (authLoading || orgLoading || categories === null) return <p className="t-body">טוען…</p>
  if (!user) return null
  if (!org) return <p className="t-body">לא נמצא ארגון משויך לחשבון.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>
      <header>
        <h1 className="t-h1" style={{ margin: 0 }}>הפרטים שלכם</h1>
        <p className="t-body-sm" style={{ color: 'var(--fg-3)', marginBlockStart: 'var(--space-2)' }}>מה אנחנו יודעים על העסק שלכם, ועל מה אנחנו שומרים.</p>
      </header>

      <Card eyebrow="העסק" title={org.name}>
        <p className="t-body" style={{ margin: 0 }}>זהו הפרופיל שעליו Deepo מבססת את ההגנה על הפרטיות שלכם.</p>
      </Card>

      <Card eyebrow="סוגי המידע שאנחנו עוזרים להגן עליו">
        {categories.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {categories.map((c, i) => <span key={i} className="dp-actor-chip">{c}</span>)}
          </div>
        ) : (
          <p className="t-body" style={{ margin: 0 }}>נשלים את התמונה יחד איתכם בהמשך.</p>
        )}
      </Card>

      <p className="t-body-sm" style={{ color: 'var(--fg-3)' }}>רוצים לעדכן פרט? כתבו לנו, אנחנו כאן.</p>
    </div>
  )
}

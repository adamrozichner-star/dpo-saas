import { notFound } from 'next/navigation'
import { Card } from '@/components/brand/Card'
import { Badge } from '@/components/brand/Badge'

/* Dev-only demo of the authenticated brand shell. src/middleware.ts is the
   authoritative gate (real 404 outside development); this notFound() is
   defense-in-depth. Placeholder content only - no real ledger data (that is C). */
export const metadata = {
  title: 'Deepo shell demo (dev)',
  robots: { index: false, follow: false },
}

export default function ShellDemoPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 className="t-h2" style={{ margin: 0 }}>
          תצוגת מעטפת
        </h2>
        <Badge variant="brand">Deepo</Badge>
        <Badge variant="neutral">דמו</Badge>
      </div>
      <p style={{ maxWidth: 640, margin: 0 }}>
        מעטפת האפליקציה המאומתת על מותג Deepo. השתמשו בכפתור ההחלפה בסרגל העליון כדי לעבור בין תצוגת
        ממונה (כהה) לתצוגת בעל עסק (בהירה). זוהי תצוגת דמו עם תוכן זמני בלבד.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <Card eyebrow="ניטור" title="מצב הגנה">
          כל המערכות תקינות. הסריקה האחרונה הושלמה ללא ממצאים חדשים.
        </Card>
        <Card eyebrow="משימות" title="פתוחות">
          שתי משימות ממתינות לטיפול: חידוש רישום מאגר ובדיקת ספק.
        </Card>
        <Card variant="dark" eyebrow="ניטור חי" title="זוהתה חשיפה">
          איתרנו רשומה חדשה הדורשת טיפול. נטפל בזה עבורך.
        </Card>
      </div>
    </div>
  )
}

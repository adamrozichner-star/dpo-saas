'use client'

import * as React from 'react'
import { Button } from '@/components/brand/Button'
import { Input } from '@/components/brand/Input'
import { Switch } from '@/components/brand/Switch'
import { Checkbox } from '@/components/brand/Checkbox'
import { Radio } from '@/components/brand/Radio'
import { Badge } from '@/components/brand/Badge'
import { Card } from '@/components/brand/Card'
import { DeepoIcon, deepoIconIds } from '@/brand/icons'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-12)' }}>
      <p className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
        {children}
      </div>
    </section>
  )
}

export function BrandGallery() {
  const [on, setOn] = React.useState(true)
  const [checked, setChecked] = React.useState(true)
  const [pick, setPick] = React.useState('a')

  return (
    <div className="deepo-scope" style={{ minHeight: '100vh', padding: 'var(--space-10)' }}>
      <header style={{ marginBottom: 'var(--space-12)' }}>
        <p className="t-eyebrow">Deepo design system</p>
        <h1 className="t-h1">Brand primitives gallery</h1>
        <p style={{ maxWidth: 640 }}>
          The seven primitives reimplemented in TSX from the brand tokens. Light surface below, Onyx
          (dark) surface at the foot. Dev only: this route returns 404 in production.
        </p>
      </header>

      {/* LIGHT SURFACE ─────────────────────────────────────────── */}
      <Section title="Buttons">
        <Button variant="primary">המשך</Button>
        <Button variant="gradient">התחילו עכשיו</Button>
        <Button variant="accent">פעולה</Button>
        <Button variant="secondary">ביטול</Button>
        <Button variant="ghost">עוד</Button>
        <Button variant="primary" disabled>
          מושבת
        </Button>
        <Button variant="primary" size="sm">
          קטן
        </Button>
        <Button variant="primary" size="lg">
          גדול
        </Button>
        <Button
          variant="primary"
          iconBefore={<DeepoIcon id="dp-shield" style={{ fontSize: 18 }} />}
        >
          מוגן
        </Button>
      </Section>

      <Section title="Inputs">
        <div style={{ width: 260 }}>
          <Input label="אימייל" placeholder="name@example.com" hint="לא נשתף אף פעם" />
        </div>
        <div style={{ width: 260 }}>
          <Input label="טלפון" defaultValue="abc" error hint="מספר לא תקין" />
        </div>
        <div style={{ width: 260 }}>
          <Input label="מושבת" placeholder="לא זמין" disabled />
        </div>
      </Section>

      <Section title="Switch, checkbox, radio">
        <Switch checked={on} onChange={(e) => setOn(e.target.checked)}>
          התראות
        </Switch>
        <Switch checked={false} disabled>
          מושבת
        </Switch>
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
          אני מסכים
        </Checkbox>
        <Checkbox checked={false} disabled>
          מושבת
        </Checkbox>
        <Radio name="g" checked={pick === 'a'} onChange={() => setPick('a')}>
          חודשי
        </Radio>
        <Radio name="g" checked={pick === 'b'} onChange={() => setPick('b')}>
          שנתי
        </Radio>
        <Radio name="g" disabled>
          מושבת
        </Radio>
      </Section>

      <Section title="Badges">
        <Badge variant="ok" dot>
          מוגן
        </Badge>
        <Badge variant="warn" dot>
          בבדיקה
        </Badge>
        <Badge variant="risk" dot>
          סיכון
        </Badge>
        <Badge variant="info">מידע</Badge>
        <Badge variant="brand">Deepo</Badge>
        <Badge variant="neutral">ניטרלי</Badge>
        <Badge variant="solid">חדש</Badge>
        <Badge variant="brand" square>
          תגית
        </Badge>
      </Section>

      <Section title="Cards">
        <div style={{ width: 280 }}>
          <Card eyebrow="ניטור" title="מצב הגנה" interactive>
            כל המערכות תקינות. הסריקה האחרונה הושלמה ללא ממצאים.
          </Card>
        </div>
        <div style={{ width: 280 }}>
          <Card variant="sunken" eyebrow="טיוטה" title="כרטיס שקוע">
            משטח שקוע ללא צל.
          </Card>
        </div>
      </Section>

      <Section title="Duotone icons">
        {deepoIconIds.map((id) => (
          <DeepoIcon key={id} id={id} title={id} style={{ fontSize: 28, color: 'var(--crimson-500)' }} />
        ))}
      </Section>

      <Section title="Logo on light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/logofull.png" alt="Deepo" style={{ height: 44 }} />
      </Section>

      {/* DARK (ONYX) SURFACE ───────────────────────────────────── */}
      <div
        style={{
          marginTop: 'var(--space-16)',
          padding: 'var(--space-10)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--garnet-900)',
          color: 'var(--fg-on-dark-1)',
        }}
      >
        <p className="t-eyebrow" style={{ color: 'var(--amber-400)', marginBottom: 'var(--space-4)' }}>
          Onyx surface
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            alignItems: 'center',
            marginBottom: 'var(--space-8)',
          }}
        >
          <Button variant="gradient">התחילו עכשיו</Button>
          <Button variant="accent">פעולה</Button>
          <Button variant="secondary" onDark>
            ביטול
          </Button>
          <Button variant="ghost" onDark>
            עוד
          </Button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <div style={{ width: 300 }}>
            <Card variant="dark" eyebrow="ניטור חי" title="זוהתה חשיפה">
              איתרנו רשומה חדשה הדורשת טיפול. נטפל בזה עבורך.
            </Card>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            {(['dp-radar', 'dp-shield', 'dp-bell', 'dp-bolt'] as const).map((id) => (
              <DeepoIcon key={id} id={id} title={id} style={{ fontSize: 30, color: 'var(--amber-400)' }} />
            ))}
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/logoreverse.png" alt="Deepo" style={{ height: 44 }} />
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'

interface TierGateOverlayProps {
  icon: ReactNode
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export default function TierGateOverlay({
  icon,
  title,
  description,
  ctaLabel = 'שדרגו לחבילה מומלצת',
  ctaHref = '/subscribe',
}: TierGateOverlayProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 text-center">
      <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 text-stone-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-stone-500 mb-5 max-w-md mx-auto">{description}</p>
      <Link href={ctaHref}>
        <button className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors inline-flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {ctaLabel}
        </button>
      </Link>
    </div>
  )
}

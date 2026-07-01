import type { Metadata, Viewport } from 'next'
import { Heebo, Rubik, Assistant } from 'next/font/google'
import * as Sentry from '@sentry/nextjs'
import './globals.css'
import '@/brand/styles.css'
import { AuthProvider } from '@/lib/auth-context'
import { ToastProvider } from '@/components/Toast'
import AccessibilityMenu from '@/components/AccessibilityMenu'
import CookieBanner from '@/components/CookieBanner'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
})

// Warm-brand fonts, self-hosted via next/font so they render without a
// Google Fonts @import (which the CSP blocks). Mirrors the Heebo setup.
// The brand tokens in src/brand/colors_and_type.css point at these vars.
const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-rubik',
})

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-assistant',
})

export function generateMetadata(): Metadata {
  return {
    title: 'DPO-as-a-Service | שירות ממונה הגנת פרטיות',
    description: 'פתרון AI מקיף לעמידה ברגולציית הגנת הפרטיות - תיקון 13',
    icons: {
      icon: '/brand/logos/favicon-32.png',
      apple: '/brand/logos/apple-touch-icon.png',
    },
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable} ${assistant.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
        <AuthProvider>
          <ToastProvider>
            {children}
            <AccessibilityMenu />
            <CookieBanner />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

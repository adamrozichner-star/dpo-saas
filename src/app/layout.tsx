import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ToastProvider } from '@/components/Toast'
import AccessibilityMenu from '@/components/AccessibilityMenu'
import CookieBanner from '@/components/CookieBanner'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
})

export const metadata: Metadata = {
  title: 'DPO-as-a-Service | שירות ממונה הגנת פרטיות',
  description: 'פתרון AI מקיף לעמידה ברגולציית הגנת הפרטיות - תיקון 13',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
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

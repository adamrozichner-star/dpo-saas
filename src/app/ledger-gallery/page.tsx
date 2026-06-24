import { notFound } from 'next/navigation'
import '@/components/ledger/ledger.css'
import { LedgerGallery } from './LedgerGallery'

/* Dev-only gallery of the v3 ledger components. src/middleware.ts is the
   authoritative gate (real 404 outside development); this notFound() is
   defense-in-depth. Placeholder data only. */
export const metadata = {
  title: 'Deepo ledger gallery (dev)',
  robots: { index: false, follow: false },
}

export default function LedgerGalleryPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return <LedgerGallery />
}

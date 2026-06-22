import { notFound } from 'next/navigation'
import { BrandGallery } from './BrandGallery'

/* Dev-only brand primitives gallery. src/middleware.ts is the authoritative
   gate: it returns a real 404 for this path outside development. This
   notFound() is defense-in-depth in case the middleware matcher ever changes.
   (verified in scripts/verify-brand-gallery and the prod-build route check). */
export const metadata = {
  title: 'Deepo brand gallery (dev)',
  robots: { index: false, follow: false },
}

export default function BrandGalleryPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return <BrandGallery />
}

// (marketing) route group layout. Adds NO URL segment, so every page
// keeps its existing path (/, /calculator, /privacy, ...). Wraps the
// public marketing pages in the warm brand:
//   - .deepo-scope opts this subtree into the brand base (font, colors,
//     box-sizing) from src/brand/colors_and_type.css. The rest of the
//     app stays on the legacy navy theme, untouched.
//   - shared MarketingHeader + MarketingFooter chrome.
//
// dir/lang are NOT set here: the root <html> already declares
// lang="he" dir="rtl", so we must not double them up.

import '@/components/marketing/marketing-chrome.css'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="deepo-scope">
      <MarketingHeader />
      {/* Plain wrapper, not <main>: several pages declare their own <main>
          landmark, so wrapping here would nest <main> in <main>. */}
      {children}
      <MarketingFooter />
    </div>
  )
}

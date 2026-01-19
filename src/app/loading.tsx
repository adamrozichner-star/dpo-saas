import { Shield, Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-10 w-10 text-primary" />
        <span className="font-bold text-2xl">DPO-Pro</span>
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-gray-600">טוען...</p>
    </div>
  )
}

import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="mb-8">
        <Image src="/logos/deepo-logo-navy-512.png" alt="Deepo" width={100} height={31} />
      </div>
      <Loader2 className="h-8 w-8 animate-spin" style={{color: '#1e40af'}} />
      <p className="mt-4 text-gray-600">טוען...</p>
    </div>
  )
}

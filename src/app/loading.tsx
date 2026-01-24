import { Shield, Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
          <Shield className="h-7 w-7 text-white" />
        </div>
        <span className="font-bold text-2xl" style={{color: '#1e40af'}}>MyDPO</span>
      </div>
      <Loader2 className="h-8 w-8 animate-spin" style={{color: '#1e40af'}} />
      <p className="mt-4 text-gray-600">טוען...</p>
    </div>
  )
}

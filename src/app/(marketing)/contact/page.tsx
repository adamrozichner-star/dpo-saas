'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/brand/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import '../_brand-shadcn.css'
import '../contact.css'
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  MessageSquare
} from 'lucide-react'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Contact form submitted:', formData)
    setIsSuccess(true)
    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="ct-page min-h-screen" dir="rtl">
        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="p-8">
              <CheckCircle2 className="ct-success__icon h-16 w-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">הפנייה נשלחה בהצלחה!</h1>
              <p className="text-gray-600 mb-6">נחזור אליך תוך יום עסקים אחד.</p>
              <Link href="/" className="dp-btn dp-btn--secondary dp-btn--md">חזרה לדף הבית</Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="ct-page min-h-screen" dir="rtl">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">צרו קשר</h1>
          <p className="text-gray-600">יש לכם שאלות? נשמח לעזור!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>שלחו לנו הודעה</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא <span className="ct-req">*</span></Label>
                    <input className="dp-input" id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <input className="dp-input" id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} dir="ltr" style={{ textAlign: 'right' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">דוא"ל <span className="ct-req">*</span></Label>
                  <input className="dp-input" id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required dir="ltr" style={{ textAlign: 'right' }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">שם החברה</Label>
                  <input className="dp-input" id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">הודעה <span className="ct-req">*</span></Label>
                  <textarea className="dp-input" id="message" rows={5} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <MessageSquare className="h-4 w-4 ml-2" />}
                  שליחה
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">דוא"ל</h3>
                    <p className="text-gray-600">support@deepo.co.il</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">טלפון</h3>
                    <p className="text-gray-600">03-XXX-XXXX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

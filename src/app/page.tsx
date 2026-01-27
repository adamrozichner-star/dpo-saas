'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft,
  Calculator,
  User,
  ChevronDown
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation - Clean & Simple */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">MyDPO</span>
            </div>
            
            {/* Nav Items */}
            <div className="flex items-center gap-3">
              <Link href="/calculator">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">בדיקת חובת DPO</span>
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-white hover:text-white hover:bg-white/10"
                >
                  התחברות
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Navy Gradient */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            הממונה על הגנת הפרטיות שלך
          </h1>
          <p className="text-lg sm:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto">
            עמידה בתיקון 13 בקלות ובמחיר הוגן
          </p>
          
          <Link href="/onboarding">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
              style={{ backgroundColor: '#10b981' }}
            >
              התחל בחינם
              <ArrowLeft className="h-5 w-5 mr-2" />
            </Button>
          </Link>
          
          <p className="text-blue-200/60 text-sm mt-6">
            14 ימי ניסיון חינם • ללא התחייבות • ביטול בכל עת
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/40" />
        </div>
      </section>

      {/* Features - Clean White Section */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="מסמכים מוכנים"
              description="כל המסמכים הנדרשים"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="צ'אט חכם"
              description="מענה מיידי 24/7"
            />
            <FeatureCard
              icon={<User className="h-6 w-6" />}
              title="DPO מוסמך"
              description="ממונה אנושי מוסמך לפי חוק"
            />
          </div>
        </div>
      </section>

      {/* Value Proposition - Simple */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            הכל במנוי אחד פשוט
          </h2>
          <p className="text-xl text-slate-600 mb-12">
            במקום להוציא עשרות אלפי שקלים על יועצים -
            <br />
            קבלו הכל ב-<span className="font-bold text-emerald-600">500 ₪</span> לחודש
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-right">
            <BenefitItem>ממונה הגנת פרטיות מוסמך</BenefitItem>
            <BenefitItem>מדיניות פרטיות מותאמת</BenefitItem>
            <BenefitItem>רישום מאגרי מידע (ROPA)</BenefitItem>
            <BenefitItem>ניהול אירועי אבטחה</BenefitItem>
            <BenefitItem>מענה לשאלות עובדים</BenefitItem>
            <BenefitItem>עדכונים שוטפים ברגולציה</BenefitItem>
          </div>
        </div>
      </section>

      {/* Social Proof - Minimal */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-500 text-sm">ארגונים מוגנים</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">95%</div>
              <div className="text-slate-500 text-sm">אוטומציה מלאה</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">₪500</div>
              <div className="text-slate-500 text-sm">במקום ₪5,000+</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl sm:text-2xl text-slate-700 mb-8 leading-relaxed">
            "תוך שעה היה לנו DPO ממונה וכל המסמכים הנדרשים. 
            חסכנו אלפי שקלים ובעיקר - שקט נפשי מול הרגולציה."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              ד
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">דני כהן</div>
              <div className="text-sm text-slate-500">מנכ"ל, חברת טכנולוגיה</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-24 px-6"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            מוכנים להתחיל?
          </h2>
          <p className="text-xl text-blue-100/80 mb-10">
            14 ימי ניסיון חינם. ללא כרטיס אשראי.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 h-auto rounded-xl font-semibold w-full sm:w-auto"
                style={{ backgroundColor: '#10b981' }}
              >
                התחל עכשיו
                <ArrowLeft className="h-5 w-5 mr-2" />
              </Button>
            </Link>
            <Link href="/calculator">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 h-auto rounded-xl font-semibold w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Calculator className="h-5 w-5 ml-2" />
                בדיקה חינמית
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Simple */}
      <footer className="py-12 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">MyDPO</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">התחברות</Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">לוח בקרה</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
              <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-sm text-slate-500 text-center">
            © 2026 MyDPO. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="text-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <div className="text-blue-600">{icon}</div>
      </div>
      <h3 className="font-semibold text-lg text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
      <span className="text-slate-700">{children}</span>
    </div>
  )
}

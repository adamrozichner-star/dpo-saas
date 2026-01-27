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

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">חבילות ומחירים</h2>
            <p className="text-slate-600">בחרו את החבילה המתאימה לעסק שלכם</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">חבילה בסיסית</h3>
                <p className="text-slate-500 text-sm">לעסקים קטנים ובינוניים</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-slate-900">₪500</span>
                <span className="text-slate-500"> / חודש</span>
              </div>
              <ul className="space-y-3 mb-6">
                <PricingFeature>ממונה הגנת פרטיות מוסמך</PricingFeature>
                <PricingFeature>מסמכים אוטומטיים</PricingFeature>
                <PricingFeature>בוט Q&A לעובדים</PricingFeature>
                <PricingFeature>יומן ביקורת</PricingFeature>
                <PricingFeature>תמיכה בדוא"ל</PricingFeature>
                <PricingFeature>זמן תגובה: 72 שעות</PricingFeature>
              </ul>
              <Link href="/onboarding?tier=basic" className="block">
                <Button variant="outline" className="w-full py-5 rounded-xl">בחירת חבילה</Button>
              </Link>
            </div>

            {/* Extended Plan - Popular */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">הכי פופולרי</span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">חבילה מורחבת</h3>
                <p className="text-slate-500 text-sm">לעסקים עם מידע רגיש</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-slate-900">₪1,200</span>
                <span className="text-slate-500"> / חודש</span>
              </div>
              <ul className="space-y-3 mb-6">
                <PricingFeature>כל מה שבחבילה הבסיסית</PricingFeature>
                <PricingFeature>סקירה רבעונית של הממונה</PricingFeature>
                <PricingFeature>30 דק׳ זמן DPO/חודש</PricingFeature>
                <PricingFeature>ליווי באירועי אבטחה</PricingFeature>
                <PricingFeature>תמיכה טלפונית</PricingFeature>
                <PricingFeature>זמן תגובה: 24 שעות</PricingFeature>
                <PricingFeature>עד 3 משתמשים</PricingFeature>
              </ul>
              <Link href="/onboarding?tier=extended" className="block">
                <Button className="w-full py-5 rounded-xl" style={{ backgroundColor: '#10b981' }}>בחירת חבילה</Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-full mb-2">
                  <Shield className="h-3 w-3" /> לארגונים
                </span>
                <h3 className="text-xl font-bold mb-1">חבילה ארגונית</h3>
                <p className="text-slate-400 text-sm">לארגונים עם דרישות מורכבות</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold">₪3,500</span>
                <span className="text-slate-400"> / חודש</span>
              </div>
              <ul className="space-y-3 mb-6">
                <PricingFeatureLight>כל מה שבחבילה המורחבת</PricingFeatureLight>
                <PricingFeatureLight>2 שעות זמן DPO/חודש</PricingFeatureLight>
                <PricingFeatureLight>סקירה חודשית</PricingFeatureLight>
                <PricingFeatureLight>הדרכת עובדים רבעונית</PricingFeatureLight>
                <PricingFeatureLight>DPIA מלא כלול</PricingFeatureLight>
                <PricingFeatureLight>זמן תגובה: 4 שעות</PricingFeatureLight>
                <PricingFeatureLight>משתמשים ללא הגבלה</PricingFeatureLight>
                <PricingFeatureLight>SLA מובטח</PricingFeatureLight>
              </ul>
              <Link href="/contact" className="block">
                <Button variant="secondary" className="w-full py-5 rounded-xl bg-white text-slate-900 hover:bg-slate-100">צרו קשר</Button>
              </Link>
            </div>
          </div>

          {/* Upsell Services */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 text-sm mb-4">שירותים נוספים לפי דרישה:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['DPIA - הערכת השפעה', 'חוות דעת משפטית', 'הדרכות לעובדים', 'ביקורת תאימות', 'ליווי אירוע אבטחה'].map((service, i) => (
                <span key={i} className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-full">{service}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Checklist Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Side */}
            <div className="text-right">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                האם העסק שלך עומד בדרישות?
              </h2>
              <p className="text-slate-600 mb-8">
                תיקון 13 לחוק הגנת הפרטיות מחייב אלפי עסקים בישראל. הקנסות מגיעים עד 3.2 מיליון ש״ח.
              </p>
              <Link href="/calculator">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 h-auto rounded-xl font-semibold"
                  style={{ backgroundColor: '#10b981' }}
                >
                  התחל עכשיו - חינם לשבועיים
                  <ArrowLeft className="h-5 w-5 mr-2" />
                </Button>
              </Link>
            </div>

            {/* Checklist Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6 justify-end">
                <span className="font-bold text-slate-900">רשימת תאימות לתיקון 13</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <ul className="space-y-4">
                {[
                  'מינוי ממונה הגנת פרטיות (DPO)',
                  'מדיניות פרטיות מעודכנת',
                  'רישום מאגרי מידע (ROPA)',
                  'נהלי אבטחת מידע',
                  'תהליך לטיפול באירועי אבטחה'
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-end gap-3">
                    <span className="text-slate-700">{item}</span>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">עם MyDPO, כל הרשימה מסומנת ✓ תוך דקות</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section 
        className="py-24 px-6"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            האכיפה כבר כאן. אתם מוכנים?
          </h2>
          <p className="text-xl text-blue-100/80 mb-4">
            תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO.
          </p>
          <p className="text-blue-100/60 mb-10">
            אל תחכו לקנס - התחילו היום.
          </p>
          <Link href="/onboarding">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto rounded-xl font-semibold"
              style={{ backgroundColor: '#10b981' }}
            >
              התחילו עכשיו - חינם לשבועיים
              <ArrowLeft className="h-5 w-5 mr-2" />
            </Button>
          </Link>
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

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 justify-end text-right">
      <span className="text-slate-700 text-sm">{children}</span>
      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
    </li>
  )
}

function PricingFeatureLight({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 justify-end text-right">
      <span className="text-slate-300 text-sm">{children}</span>
      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
    </li>
  )
}

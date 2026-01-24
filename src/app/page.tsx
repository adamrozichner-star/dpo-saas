'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  FileText, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Building2,
  Users,
  Lock,
  Zap,
  AlertTriangle,
  Calculator
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">MyDPO</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/calculator" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  <Calculator className="h-4 w-4 ml-2" />
                  בדיקת חובת DPO
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">התחברות</Button>
              </Link>
              <Link href="/onboarding">
                <Button style={{backgroundColor: '#10b981'}} className="hover:opacity-90 text-white">התחל עכשיו</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Urgency Banner */}
      <div className="bg-red-600 text-white py-2 px-4 text-center text-sm">
        <span className="font-bold">⚠️ האכיפה כבר התחילה!</span>
        {' '}תיקון 13 לחוק הגנת הפרטיות נכנס לתוקף. עסקים ללא DPO חשופים לקנסות.
        {' '}
        <Link href="/calculator" className="underline font-semibold hover:no-underline">
          בדקו אם אתם חייבים →
        </Link>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-red-600 border-red-200 bg-red-50">
            <AlertTriangle className="h-3 w-3 ml-1" />
            תיקון 13 - אוגוסט 2025
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            ממונה הגנת פרטיות
            <br />
            <span style={{color: '#1e40af'}}>ב-500 ₪ לחודש</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            פתרון מלא לעמידה ברגולציה: ממונה אנושי מוסמך + מערכת AI שעושה את העבודה.
            <br />
            במקום להוציא עשרות אלפי שקלים - קבלו הכל במנוי חודשי פשוט.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" className="gap-2 text-lg px-8 text-white" style={{backgroundColor: '#10b981'}}>
                התחילו תוך 15 דקות
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/calculator">
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8" style={{borderColor: '#1e40af', color: '#1e40af'}}>
                <Calculator className="h-5 w-5" />
                בדיקה חינמית
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            14 ימי ניסיון חינם • ללא התחייבות • ביטול בכל עת
          </p>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold" style={{color: '#1e40af'}}>500+</div>
              <div className="text-gray-600">עסקים משתמשים</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{color: '#1e40af'}}>98%</div>
              <div className="text-gray-600">אוטומציה מלאה</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{color: '#1e40af'}}>15 דק׳</div>
              <div className="text-gray-600">זמן הצטרפות</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{color: '#1e40af'}}>24/7</div>
              <div className="text-gray-600">מענה AI זמין</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">מה כולל השירות?</h2>
            <p className="text-gray-600">כל מה שצריך לעמידה מלאה בתיקון 13</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="ממונה אנושי מוסמך"
              description="DPO מוסמך עם רישיון, שממונה רשמית על הארגון שלכם מול הרגולטור"
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="מסמכים אוטומטיים"
              description="מדיניות פרטיות, רישום מאגרים, ונהלי אבטחה - נוצרים ומתעדכנים אוטומטית"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="מענה AI לעובדים"
              description="בוט חכם שעונה על שאלות פרטיות 24/7, עם הסלמה לממונה במקרי קצה"
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="ניטור ובקרה"
              description="מעקב אחר שינויים, יומן ביקורת מלא, והתראות על בעיות פוטנציאליות"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="עדכונים שוטפים"
              description="המערכת מתעדכנת אוטומטית בהתאם לשינויי רגולציה וצרכי הארגון"
            />
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="מותאם לעסק שלכם"
              description="שאלון חכם שמאפיין את הפעילות ומייצר מסמכים רלוונטיים בדיוק"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">חבילות ומחירים</h2>
            <p className="text-gray-600">בחרו את החבילה המתאימה לעסק שלכם</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle>חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">₪500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <PricingFeature>ממונה הגנת פרטיות מוסמך</PricingFeature>
                  <PricingFeature>מסמכים אוטומטיים</PricingFeature>
                  <PricingFeature>בוט Q&A לעובדים</PricingFeature>
                  <PricingFeature>יומן ביקורת</PricingFeature>
                  <PricingFeature>תמיכה בדוא"ל</PricingFeature>
                  <PricingFeature>זמן תגובה: 72 שעות</PricingFeature>
                </ul>
                <Link href="/onboarding?tier=basic" className="block mt-6">
                  <Button className="w-full" size="lg" variant="outline" style={{borderColor: '#1e40af', color: '#1e40af'}}>בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Extended Plan */}
            <Card className="relative border-2 shadow-lg" style={{borderColor: '#1e40af'}}>
              <div className="absolute -top-3 right-4">
                <Badge style={{backgroundColor: '#1e40af'}}>הכי פופולרי</Badge>
              </div>
              <CardHeader>
                <CardTitle>חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">₪1,200</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <PricingFeature>כל מה שבחבילה הבסיסית</PricingFeature>
                  <PricingFeature>סקירה רבעונית של הממונה</PricingFeature>
                  <PricingFeature>30 דק׳ זמן DPO/חודש</PricingFeature>
                  <PricingFeature>ליווי באירועי אבטחה</PricingFeature>
                  <PricingFeature>תמיכה טלפונית</PricingFeature>
                  <PricingFeature>זמן תגובה: 24 שעות</PricingFeature>
                  <PricingFeature>עד 3 משתמשים</PricingFeature>
                </ul>
                <Link href="/onboarding?tier=extended" className="block mt-6">
                  <Button className="w-full text-white" size="lg" style={{backgroundColor: '#10b981'}}>בחירת חבילה</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="relative bg-gradient-to-b from-slate-50 to-slate-100">
              <div className="absolute -top-3 right-4">
                <Badge variant="secondary" className="bg-slate-800 text-white">
                  <Building2 className="h-3 w-3 ml-1" />
                  לארגונים
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>חבילה ארגונית</CardTitle>
                <CardDescription>לארגונים עם דרישות מורכבות</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">₪3,500</span>
                  <span className="text-gray-600"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <PricingFeature>כל מה שבחבילה המורחבת</PricingFeature>
                  <PricingFeature>2 שעות זמן DPO/חודש</PricingFeature>
                  <PricingFeature>סקירה חודשית</PricingFeature>
                  <PricingFeature>הדרכת עובדים רבעונית</PricingFeature>
                  <PricingFeature>DPIA מלא כלול</PricingFeature>
                  <PricingFeature>זמן תגובה: 4 שעות</PricingFeature>
                  <PricingFeature>משתמשים ללא הגבלה</PricingFeature>
                  <PricingFeature>SLA מובטח</PricingFeature>
                </ul>
                <Link href="/onboarding?tier=enterprise" className="block mt-6">
                  <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white" size="lg">צרו קשר</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          {/* Upsells */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">שירותים נוספים לפי דרישה:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">DPIA - הערכת השפעה</Badge>
              <Badge variant="outline">חוות דעת משפטית</Badge>
              <Badge variant="outline">הדרכות לעובדים</Badge>
              <Badge variant="outline">ביקורת תאימות</Badge>
              <Badge variant="outline">ליווי אירוע אבטחה</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-white" style={{background: 'linear-gradient(to left, #1e3a5f, #1e40af)'}}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">האכיפה כבר כאן. אתם מוכנים?</h2>
          <p className="text-xl opacity-90 mb-8">
            תיקון 13 לחוק הגנת הפרטיות מחייב מינוי DPO.
            <br />
            אל תחכו לקנס - התחילו היום.
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="gap-2 text-white" style={{backgroundColor: '#10b981'}}>
              התחילו עכשיו - חינם לשבועיים
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1e40af'}}>
                  <Shield className="h-5 w-5" />
                </div>
                <span className="font-bold">MyDPO</span>
              </div>
              <p className="text-sm">
                פתרון AI מקיף להגנת פרטיות ועמידה ברגולציה לעסקים בישראל.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">שירותים</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/onboarding" className="hover:text-white">מינוי ממונה</Link></li>
                <li><Link href="/#pricing" className="hover:text-white">חבילות ומחירים</Link></li>
                <li><Link href="/subscribe" className="hover:text-white">שדרוג חשבון</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">תמיכה</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white">צור קשר</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">לוח בקרה</Link></li>
                <li><Link href="/login" className="hover:text-white">התחברות</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">משפטי</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">תנאי שימוש</Link></li>
                <li><Link href="/privacy" className="hover:text-white">מדיניות פרטיות</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            © 2026 MyDPO. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="rounded-lg w-12 h-12 flex items-center justify-center mb-4" style={{backgroundColor: '#dbeafe'}}>
          <div style={{color: '#1e40af'}}>{icon}</div>
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{color: '#10b981'}} />
      <span>{children}</span>
    </li>
  )
}

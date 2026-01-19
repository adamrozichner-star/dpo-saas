'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, FileText, MessageSquare, Clock, CheckCircle2, ArrowLeft,
  Building2, Users, Lock, Zap, Star, ChevronDown, ChevronUp,
  AlertTriangle, Phone, Mail, Sparkles, ArrowRight, Menu, X
} from 'lucide-react'

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">DPO-Pro</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">יתרונות</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">איך זה עובד</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">מחירים</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">שאלות נפוצות</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost">התחברות</Button>
              </Link>
              <Link href="/onboarding">
                <Button className="bg-blue-600 hover:bg-blue-700">התחל בחינם</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white p-4 space-y-4">
            <a href="#features" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>יתרונות</a>
            <a href="#how-it-works" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>איך זה עובד</a>
            <a href="#pricing" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>מחירים</a>
            <a href="#faq" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>שאלות נפוצות</a>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">התחברות</Button></Link>
              <Link href="/onboarding" className="flex-1"><Button className="w-full bg-blue-600">התחל</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Urgency Badge */}
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm mb-6">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">תיקון 13 נכנס לתוקף - האכיפה כבר כאן</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                ממונה הגנת פרטיות
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-indigo-600">
                  ב-500₪ לחודש
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                ממונה אנושי מוסמך + מערכת AI שעושה 98% מהעבודה.
                <br />
                <strong className="text-gray-900">במקום לשלם עשרות אלפי ₪</strong> - קבלו הכל במנוי חודשי פשוט.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/onboarding">
                  <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 gap-2">
                    התחילו תוך 15 דקות
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                    צפייה במחירים
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>ללא התחייבות</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>הקמה תוך 15 דקות</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>DPO מוסמך</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="relative bg-white rounded-2xl shadow-2xl border p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-bold text-gray-900">ציון ציות: 98%</p>
                        <p className="text-sm text-gray-500">הארגון עומד בדרישות</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">תקין</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <FileText className="h-6 w-6 text-blue-600 mb-2" />
                      <p className="font-bold">4 מסמכים</p>
                      <p className="text-xs text-gray-500">מעודכנים</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <MessageSquare className="h-6 w-6 text-purple-600 mb-2" />
                      <p className="font-bold">AI Bot</p>
                      <p className="text-xs text-gray-500">זמין 24/7</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">עו״ד דנה כהן</p>
                        <p className="text-xs text-gray-500">הממונה שלכם</p>
                      </div>
                      <Badge variant="outline" className="mr-auto">מוסמך</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 border animate-bounce">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">98% אוטומציה</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-400">500+</div>
              <div className="text-gray-400 text-sm">עסקים משתמשים</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-400">98%</div>
              <div className="text-gray-400 text-sm">אוטומציה מלאה</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-400">15 דק׳</div>
              <div className="text-gray-400 text-sm">זמן הקמה</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-400">24/7</div>
              <div className="text-gray-400 text-sm">מענה AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-red-600 border-red-200 text-sm px-4 py-1">הבעיה</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            תיקון 13 מחייב אתכם למנות DPO
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            אלפי עסקים בישראל נדרשים עכשיו לעמוד בחוק הגנת הפרטיות.
            <br />
            הפתרונות הקיימים? <strong className="text-gray-900">יקרים מדי ולא מתאימים לעסקים קטנים.</strong>
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 text-right">
            <div className="bg-white p-6 rounded-xl border border-red-100">
              <div className="text-red-500 font-bold text-2xl mb-2">₪30,000+</div>
              <p className="text-gray-600 text-sm">עלות חד פעמית של ייעוץ משפטי והקמת מערך</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100">
              <div className="text-red-500 font-bold text-2xl mb-2">₪5,000+</div>
              <p className="text-gray-600 text-sm">עלות חודשית של ממונה חיצוני מסורתי</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100">
              <div className="text-red-500 font-bold text-2xl mb-2">שבועות</div>
              <p className="text-gray-600 text-sm">זמן הקמה והטמעה עם פתרונות מסורתיים</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-700 text-sm px-4 py-1">הפתרון</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">DPO אנושי + AI = הפתרון המושלם</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              ממונה מוסמך שאחראי רשמית + מערכת AI שעושה את כל העבודה השוטפת
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="ממונה אנושי מוסמך"
              description="DPO בעל רישיון, שממונה רשמית על הארגון מול הרגולטור. לא סתם תוכנה - אדם אמיתי."
              color="blue"
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="מסמכים אוטומטיים"
              description="מדיניות פרטיות, רישום מאגרים, נהלי אבטחה - נוצרים ב-AI ומאושרים ע״י הממונה."
              color="indigo"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="בוט Q&A חכם"
              description="עובדים שואלים שאלות? הבוט עונה מיידית 24/7. רק מקרי קצה מגיעים לממונה."
              color="purple"
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="יומן ביקורת"
              description="כל פעולה נרשמת. בביקורת? יש לכם תיעוד מלא ומסודר של כל מה שנעשה."
              color="green"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="עדכונים אוטומטיים"
              description="שינוי ברגולציה? המערכת מתעדכנת והמסמכים שלכם מתאימים תמיד."
              color="yellow"
            />
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="מותאם לעסק שלכם"
              description="שאלון חכם מאפיין את הפעילות ומייצר מסמכים רלוונטיים בדיוק."
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">איך זה עובד</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 צעדים ואתם מכוסים</h2>
            <p className="text-gray-600">תהליך פשוט שלוקח 15 דקות בלבד</p>
          </div>
          
          <div className="relative">
            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                number="1"
                title="ממלאים שאלון קצר"
                description="5 דקות של שאלות על העסק - גודל, תחום, סוגי מידע שאתם מנהלים"
                icon={<FileText className="h-6 w-6" />}
              />
              <StepCard
                number="2"
                title="המערכת יוצרת הכל"
                description="AI מייצר מסמכים מותאמים: מדיניות, רישום מאגרים, נהלים"
                icon={<Sparkles className="h-6 w-6" />}
              />
              <StepCard
                number="3"
                title="ממונה נכנס לתמונה"
                description="DPO מוסמך בודק, מאשר, ונרשם כממונה שלכם מול הרגולטור"
                icon={<Users className="h-6 w-6" />}
              />
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/onboarding">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
                התחילו עכשיו
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">מה הלקוחות אומרים</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">עסקים כמוכם כבר מכוסים</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="חסכנו עשרות אלפי שקלים. תוך שעה היה לנו ממונה מוסמך וכל המסמכים מוכנים."
              author="יוסי כהן"
              role="מנכ״ל, חברת הייטק"
              rating={5}
            />
            <TestimonialCard
              quote="הבוט עונה לעובדים 24/7. לא צריך לחפש מי מומחה לפרטיות - יש תשובות מיידיות."
              author="מיכל לוי"
              role="מנהלת משאבי אנוש"
              rating={5}
            />
            <TestimonialCard
              quote="עברנו ביקורת של הרשות להגנת הפרטיות. הכל היה מתועד ומסודר. עברנו בקלות."
              author="אבי ישראלי"
              role="בעלים, משרד רואי חשבון"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">מחירים</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">חבילות שמתאימות לכל עסק</h2>
            <p className="text-gray-600">בחרו את החבילה המתאימה לכם. ניתן לשדרג בכל עת.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <Card className="relative overflow-hidden hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">חבילה בסיסית</CardTitle>
                <CardDescription>לעסקים קטנים ובינוניים</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold">₪500</span>
                  <span className="text-gray-500"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <PricingFeature>ממונה הגנת פרטיות מוסמך</PricingFeature>
                  <PricingFeature>מדיניות פרטיות מותאמת</PricingFeature>
                  <PricingFeature>רישום מאגרי מידע</PricingFeature>
                  <PricingFeature>נהלי אבטחת מידע</PricingFeature>
                  <PricingFeature>בוט Q&A לעובדים 24/7</PricingFeature>
                  <PricingFeature>יומן ביקורת מלא</PricingFeature>
                  <PricingFeature>עד 2 פניות לממונה ברבעון</PricingFeature>
                </ul>
                <Link href="/onboarding?tier=basic" className="block mt-6">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">התחילו עכשיו</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Extended Plan */}
            <Card className="relative overflow-visible border-2 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-blue-500 to-indigo-500" />
              <div className="absolute -top-4 right-4 z-10">
                <Badge className="bg-blue-600 shadow-md">הכי פופולרי</Badge>
              </div>
              <CardHeader className="pb-4 pt-8">
                <CardTitle className="text-xl">חבילה מורחבת</CardTitle>
                <CardDescription>לעסקים עם מידע רגיש</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold">₪1,200</span>
                  <span className="text-gray-500"> / חודש</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <PricingFeature highlight>כל מה שבחבילה הבסיסית</PricingFeature>
                  <PricingFeature>סקירה תקופתית של הממונה</PricingFeature>
                  <PricingFeature>זמינות מורחבת לשאלות</PricingFeature>
                  <PricingFeature>ליווי באירועי אבטחה</PricingFeature>
                  <PricingFeature>דוחות תאימות רבעוניים</PricingFeature>
                  <PricingFeature>עד 8 פניות לממונה ברבעון</PricingFeature>
                  <PricingFeature>עדיפות בתגובה</PricingFeature>
                </ul>
                <Link href="/onboarding?tier=extended" className="block mt-6">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">התחילו עכשיו</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          {/* Upsells */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">שירותים נוספים לפי דרישה:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="py-2 px-4">DPIA - הערכת השפעה</Badge>
              <Badge variant="outline" className="py-2 px-4">חוות דעת משפטית</Badge>
              <Badge variant="outline" className="py-2 px-4">הדרכות לעובדים</Badge>
              <Badge variant="outline" className="py-2 px-4">ביקורת תאימות</Badge>
              <Badge variant="outline" className="py-2 px-4">ליווי אירוע אבטחה</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">שאלות נפוצות</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">יש שאלות? יש תשובות</h2>
          </div>
          
          <div className="space-y-4">
            <FaqItem
              question="מה זה תיקון 13 ולמה אני צריך DPO?"
              answer="תיקון 13 לחוק הגנת הפרטיות מחייב עסקים שעומדים בקריטריונים מסוימים (כמות עובדים, סוג מידע שנאסף, היקף פעילות) למנות ממונה על הגנת פרטיות. הממונה אחראי לוודא שהארגון עומד בדרישות החוק."
              isOpen={openFaq === 0}
              onToggle={() => setOpenFaq(openFaq === 0 ? null : 0)}
            />
            <FaqItem
              question="האם הממונה שלכם הוא באמת מוסמך?"
              answer="בהחלט! הממונים שלנו הם עורכי דין ו/או בעלי הסמכה רשמית בתחום הגנת הפרטיות. הם נרשמים באופן רשמי כממונים של הארגון שלכם מול הרשות להגנת הפרטיות."
              isOpen={openFaq === 1}
              onToggle={() => setOpenFaq(openFaq === 1 ? null : 1)}
            />
            <FaqItem
              question="מה קורה אם יש לי שאלה דחופה?"
              answer="בחבילה הבסיסית יש לכם 2 פניות ברבעון לממונה האנושי. הבוט זמין 24/7 לשאלות שוטפות. בחבילה המורחבת יש זמינות מוגברת ועדיפות בתגובה."
              isOpen={openFaq === 2}
              onToggle={() => setOpenFaq(openFaq === 2 ? null : 2)}
            />
            <FaqItem
              question="כמה זמן לוקח להתחיל?"
              answer="15 דקות בלבד! ממלאים שאלון קצר, המערכת מייצרת את המסמכים, והממונה מאשר. תוך יום עסקים אתם מכוסים."
              isOpen={openFaq === 3}
              onToggle={() => setOpenFaq(openFaq === 3 ? null : 3)}
            />
            <FaqItem
              question="מה קורה אם אני רוצה לבטל?"
              answer="אין התחייבות! תוכלו לבטל בכל עת. המסמכים שנוצרו נשארים אצלכם."
              isOpen={openFaq === 4}
              onToggle={() => setOpenFaq(openFaq === 4 ? null : 4)}
            />
            <FaqItem
              question="האם זה מתאים לעסק קטן עם 5 עובדים?"
              answer="בהחלט! השירות שלנו נבנה בדיוק בשביל עסקים קטנים ובינוניים שלא יכולים להרשות לעצמם ממונה פרטי במשרה מלאה. גם עסק עם 5 עובדים יכול להיות מחויב בחוק, תלוי בסוג המידע שהוא מעבד."
              isOpen={openFaq === 5}
              onToggle={() => setOpenFaq(openFaq === 5 ? null : 5)}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">האכיפה כבר כאן. אתם מוכנים?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            אל תחכו לקנס. תוך 15 דקות יהיה לכם ממונה מוסמך וכל המסמכים הנדרשים.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6">
                התחילו עכשיו - בחינם
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6">
                דברו איתנו
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="font-bold">DPO-Pro</span>
              </div>
              <p className="text-sm">
                פתרון AI מקיף להגנת פרטיות ועמידה ברגולציה לעסקים בישראל.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">שירותים</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/onboarding" className="hover:text-white transition-colors">מינוי ממונה</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">חבילות ומחירים</Link></li>
                <li><Link href="/#faq" className="hover:text-white transition-colors">שאלות נפוצות</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">חשבון</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">התחברות</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">לוח בקרה</Link></li>
                <li><Link href="/dpo/login" className="hover:text-white transition-colors">כניסת ממונה</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">יצירת קשר</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:support@dpo-pro.co.il" className="hover:text-white transition-colors">support@dpo-pro.co.il</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+972-3-1234567" className="hover:text-white transition-colors">03-1234567</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 DPO-Pro. כל הזכויות שמורות.</p>
            <div className="flex gap-4 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============== COMPONENTS ==============

function FeatureCard({ icon, title, description, color }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string,
  color: 'blue' | 'indigo' | 'purple' | 'green' | 'yellow' | 'rose'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    rose: 'bg-rose-100 text-rose-600',
  }
  
  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white shadow">
      <CardContent className="pt-6">
        <div className={`rounded-xl w-12 h-12 flex items-center justify-center ${colorClasses[color]} mb-4`}>
          {icon}
        </div>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description, icon }: { 
  number: string, 
  title: string, 
  description: string,
  icon: React.ReactNode
}) {
  return (
    <div className="relative text-center">
      <div className="relative inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl text-2xl font-bold mb-4 shadow-lg shadow-blue-200">
        {number}
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function TestimonialCard({ quote, author, role, rating }: { 
  quote: string, 
  author: string, 
  role: string,
  rating: number
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex gap-1 mb-4">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-gray-700 mb-4 leading-relaxed">"{quote}"</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
            {author.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{author}</p>
            <p className="text-gray-500 text-xs">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PricingFeature({ children, highlight }: { children: React.ReactNode, highlight?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${highlight ? 'text-blue-500' : 'text-green-500'}`} />
      <span className={highlight ? 'font-medium' : ''}>{children}</span>
    </li>
  )
}

function FaqItem({ question, answer, isOpen, onToggle }: { 
  question: string, 
  answer: string, 
  isOpen: boolean,
  onToggle: () => void
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 md:p-5 text-right hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-gray-900">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 text-gray-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

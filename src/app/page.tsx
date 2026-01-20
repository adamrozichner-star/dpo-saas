'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, FileText, MessageSquare, Clock, CheckCircle2, ArrowLeft,
  Building2, Users, Lock, Zap, Star, ChevronDown, ChevronUp,
  AlertTriangle, Phone, Mail, Sparkles, ArrowRight, Menu, X,
  Database, Eye, UserCheck, Scale, ChevronLeft, XCircle, ChevronRight
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
              <a href="#check" className="text-gray-600 hover:text-gray-900 transition-colors">בדיקת חובה</a>
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">יתרונות</a>
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
            <a href="#check" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>בדיקת חובה</a>
            <a href="#features" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>יתרונות</a>
            <a href="#pricing" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>מחירים</a>
            <a href="#faq" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>שאלות נפוצות</a>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">התחברות</Button></Link>
              <Link href="/onboarding" className="flex-1"><Button className="w-full bg-blue-600">התחל</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Light Background with Superhero */}
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
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
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
                <a href="#check">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                    בדקו אם אתם חייבים DPO
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

            {/* Superhero Animation */}
            <div className="relative hidden lg:flex items-center justify-center">
              <SuperheroShieldAnimation />
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

      {/* Privacy Score Quiz Section */}
      <section id="check" className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-blue-100 text-blue-700 text-sm px-4 py-1">בדיקה חינמית</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">האם העסק שלכם חייב DPO?</h2>
            <p className="text-gray-600 text-lg">ענו על 4 שאלות קצרות וגלו תוך 30 שניות</p>
          </div>
          
          <PrivacyQuiz />
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 md:py-24 px-4">
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
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="text-red-500 font-bold text-2xl mb-2">₪30,000+</div>
              <p className="text-gray-600 text-sm">עלות חד פעמית של ייעוץ משפטי והקמת מערך</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="text-red-500 font-bold text-2xl mb-2">₪5,000+</div>
              <p className="text-gray-600 text-sm">עלות חודשית של ממונה חיצוני מסורתי</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="text-red-500 font-bold text-2xl mb-2">שבועות</div>
              <p className="text-gray-600 text-sm">זמן הקמה והטמעה עם פתרונות מסורתיים</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-16 md:py-24 px-4 bg-gray-50">
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
      <section id="how-it-works" className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">איך זה עובד</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 צעדים ואתם מכוסים</h2>
            <p className="text-gray-600">תהליך פשוט שלוקח 15 דקות בלבד</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="ממלאים שאלון קצר"
              description="5 דקות של שאלות על העסק - גודל, תחום, סוגי מידע שאתם מנהלים"
            />
            <StepCard
              number="2"
              title="המערכת יוצרת הכל"
              description="AI מייצר מסמכים מותאמים: מדיניות, רישום מאגרים, נהלים"
            />
            <StepCard
              number="3"
              title="ממונה נכנס לתמונה"
              description="DPO מוסמך בודק, מאשר, ונרשם כממונה שלכם מול הרגולטור"
            />
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
      <section className="py-16 md:py-24 px-4 bg-gray-50">
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
      <section id="pricing" className="py-16 md:py-24 px-4">
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
      <section id="faq" className="py-16 md:py-24 px-4 bg-gray-50">
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

// ============== SUPERHERO SHIELD ANIMATION ==============
function SuperheroShieldAnimation() {
  const [mounted, setMounted] = useState(false)
  const [deflectedThreats, setDeflectedThreats] = useState<number[]>([])
  
  useEffect(() => {
    setMounted(true)
    
    // Periodically add new deflected threats
    const interval = setInterval(() => {
      setDeflectedThreats(prev => {
        const newId = Date.now()
        // Keep only last 3 threats
        const updated = [...prev, newId].slice(-3)
        return updated
      })
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-[500px]">
      {/* Data elements to protect - Background */}
      <div className={`absolute top-4 right-4 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-white rounded-xl p-4 shadow-lg border">
          <FileText className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-xs text-gray-600 font-medium">מסמכים</p>
        </div>
      </div>
      
      <div className={`absolute top-24 right-24 transition-all duration-700 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-white rounded-xl p-4 shadow-lg border">
          <Database className="h-8 w-8 text-indigo-500 mb-2" />
          <p className="text-xs text-gray-600 font-medium">מאגרי מידע</p>
        </div>
      </div>
      
      <div className={`absolute bottom-24 right-8 transition-all duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-white rounded-xl p-4 shadow-lg border">
          <Users className="h-8 w-8 text-purple-500 mb-2" />
          <p className="text-xs text-gray-600 font-medium">נתוני לקוחות</p>
        </div>
      </div>

      {/* Superhero Character with Shield */}
      <div className={`absolute bottom-8 left-8 transition-all duration-1000 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
        <div className="relative">
          {/* Hero Body */}
          <svg width="180" height="280" viewBox="0 0 180 280" className="drop-shadow-2xl">
            {/* Cape */}
            <path 
              d="M90 70 L40 250 Q90 230 140 250 L90 70" 
              fill="url(#capeGradient)" 
              className="animate-cape"
            />
            
            {/* Body */}
            <ellipse cx="90" cy="160" rx="45" ry="60" fill="url(#bodyGradient)" />
            
            {/* Head */}
            <circle cx="90" cy="50" r="35" fill="#FFD5B8" />
            
            {/* Mask */}
            <path 
              d="M55 40 Q90 25 125 40 L125 55 Q90 65 55 55 Z" 
              fill="url(#maskGradient)"
            />
            
            {/* Eyes */}
            <ellipse cx="75" cy="48" rx="8" ry="5" fill="white" />
            <ellipse cx="105" cy="48" rx="8" ry="5" fill="white" />
            <circle cx="77" cy="48" r="3" fill="#333" />
            <circle cx="107" cy="48" r="3" fill="#333" />
            
            {/* Confident Smile */}
            <path d="M80 62 Q90 70 100 62" stroke="#333" strokeWidth="2" fill="none" />
            
            {/* Shield Arm */}
            <ellipse cx="35" cy="140" rx="20" ry="15" fill="#FFD5B8" transform="rotate(-30 35 140)" />
            
            {/* Legs */}
            <rect x="65" y="210" width="20" height="60" rx="10" fill="url(#bodyGradient)" />
            <rect x="95" y="210" width="20" height="60" rx="10" fill="url(#bodyGradient)" />
            
            {/* Boots */}
            <rect x="63" y="255" width="24" height="20" rx="5" fill="#1E40AF" />
            <rect x="93" y="255" width="24" height="20" rx="5" fill="#1E40AF" />
            
            {/* Belt */}
            <rect x="50" y="190" width="80" height="12" rx="3" fill="#FCD34D" />
            <circle cx="90" cy="196" r="8" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" />
            <text x="90" y="200" textAnchor="middle" fontSize="10" fill="#92400E" fontWeight="bold">D</text>
            
            <defs>
              <linearGradient id="capeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id="maskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E40AF" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* The Shield - Positioned in front */}
          <div className="absolute -left-4 top-20 animate-shield-pulse">
            <svg width="120" height="140" viewBox="0 0 120 140">
              {/* Shield glow */}
              <ellipse cx="60" cy="70" rx="55" ry="65" fill="url(#shieldGlow)" opacity="0.5" />
              
              {/* Main shield shape */}
              <path 
                d="M60 5 L110 25 L110 75 Q110 120 60 135 Q10 120 10 75 L10 25 Z" 
                fill="url(#shieldGradient)"
                stroke="url(#shieldBorder)"
                strokeWidth="3"
              />
              
              {/* Shield emblem */}
              <circle cx="60" cy="65" r="25" fill="white" opacity="0.9" />
              <path 
                d="M60 45 L65 55 L60 50 L55 55 Z M60 85 L55 75 L60 80 L65 75 Z M40 65 L50 60 L45 65 L50 70 Z M80 65 L70 70 L75 65 L70 60 Z" 
                fill="#2563EB"
              />
              <circle cx="60" cy="65" r="8" fill="#2563EB" />
              <text x="60" y="69" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">P</text>
              
              <defs>
                <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
                <radialGradient id="shieldGlow">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Incoming Threats being deflected */}
      {deflectedThreats.map((id, index) => (
        <div 
          key={id}
          className="absolute animate-threat-deflect"
          style={{
            left: '0%',
            top: `${30 + (index * 20)}%`,
          }}
        >
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {['איום', 'פריצה', 'דליפה'][index % 3]}
          </div>
        </div>
      ))}

      {/* Protection effect lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="protectLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Curved protection lines from shield to data */}
        <path 
          d="M100 180 Q200 100 280 60" 
          stroke="url(#protectLine)" 
          strokeWidth="2" 
          fill="none"
          strokeDasharray="10,5"
          className="animate-dash"
        />
        <path 
          d="M100 180 Q180 150 260 140" 
          stroke="url(#protectLine)" 
          strokeWidth="2" 
          fill="none"
          strokeDasharray="10,5"
          className="animate-dash-delayed"
        />
        <path 
          d="M100 200 Q180 230 270 220" 
          stroke="url(#protectLine)" 
          strokeWidth="2" 
          fill="none"
          strokeDasharray="10,5"
          className="animate-dash"
        />
      </svg>

      {/* Status badge */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="flex items-center gap-2 bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>הנתונים שלכם מוגנים</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes cape {
          0%, 100% { transform: skewX(-2deg); }
          50% { transform: skewX(2deg); }
        }
        @keyframes shield-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8)); }
        }
        @keyframes threat-deflect {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          30% { transform: translateX(80px) rotate(0deg); opacity: 1; }
          50% { transform: translateX(90px) rotate(-45deg); opacity: 1; }
          100% { transform: translateX(60px) translateY(-100px) rotate(-90deg); opacity: 0; }
        }
        @keyframes dash {
          to { stroke-dashoffset: -30; }
        }
        .animate-cape {
          animation: cape 3s ease-in-out infinite;
          transform-origin: top center;
        }
        .animate-shield-pulse {
          animation: shield-pulse 2s ease-in-out infinite;
        }
        .animate-threat-deflect {
          animation: threat-deflect 2s ease-out forwards;
        }
        .animate-dash {
          animation: dash 2s linear infinite;
        }
        .animate-dash-delayed {
          animation: dash 2s linear infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  )
}

// ============== PRIVACY QUIZ ==============
function PrivacyQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)
  
  const questions = [
    {
      question: "כמה עובדים יש בעסק?",
      options: [
        { value: "1-10", label: "1-10 עובדים", score: 1 },
        { value: "11-50", label: "11-50 עובדים", score: 2 },
        { value: "51-250", label: "51-250 עובדים", score: 3 },
        { value: "250+", label: "מעל 250 עובדים", score: 4 },
      ]
    },
    {
      question: "האם אתם אוספים מידע רגיש?",
      subtext: "(מידע רפואי, פיננסי, ביומטרי, דתי, מיני וכו׳)",
      options: [
        { value: "no", label: "לא", score: 0 },
        { value: "little", label: "כמות קטנה", score: 2 },
        { value: "yes", label: "כן, באופן קבוע", score: 4 },
      ]
    },
    {
      question: "האם אתם משתפים מידע עם צדדים שלישיים?",
      subtext: "(ספקים, שותפים, שירותי ענן וכו׳)",
      options: [
        { value: "no", label: "לא", score: 0 },
        { value: "local", label: "כן, בישראל בלבד", score: 1 },
        { value: "international", label: "כן, גם בחו״ל", score: 3 },
      ]
    },
    {
      question: "מה סוג העסק שלכם?",
      options: [
        { value: "retail", label: "קמעונאות / מסחר", score: 1 },
        { value: "services", label: "שירותים מקצועיים", score: 2 },
        { value: "health", label: "בריאות / רפואה", score: 4 },
        { value: "finance", label: "פיננסים / ביטוח", score: 4 },
        { value: "tech", label: "טכנולוגיה / SaaS", score: 3 },
        { value: "other", label: "אחר", score: 2 },
      ]
    },
  ]

  const handleAnswer = (questionIndex: number, value: string, score: number) => {
    setAnswers({ ...answers, [questionIndex]: value })
    
    if (questionIndex < questions.length - 1) {
      setTimeout(() => setStep(questionIndex + 1), 300)
    } else {
      setTimeout(() => setShowResult(true), 300)
    }
  }

  const calculateScore = () => {
    let total = 0
    questions.forEach((q, i) => {
      const answer = answers[i]
      const option = q.options.find(o => o.value === answer)
      if (option) total += option.score
    })
    return total
  }

  const getResult = () => {
    const score = calculateScore()
    if (score >= 10) {
      return {
        status: 'required',
        title: 'כנראה שאתם חייבים DPO',
        description: 'על פי המאפיינים שהזנתם, העסק שלכם כנראה נדרש למנות ממונה הגנת פרטיות לפי תיקון 13.',
        color: 'red',
        recommendation: 'מומלץ לפעול מהר לפני ביקורת'
      }
    } else if (score >= 5) {
      return {
        status: 'likely',
        title: 'ייתכן שאתם חייבים DPO',
        description: 'יש סיכוי סביר שאתם נדרשים למנות ממונה. מומלץ לבצע בדיקה מעמיקה יותר.',
        color: 'yellow',
        recommendation: 'כדאי להתייעץ עם מומחה'
      }
    } else {
      return {
        status: 'probably-not',
        title: 'כנראה שלא חייבים, אבל...',
        description: 'על פי הנתונים, ייתכן שאינכם מחויבים. עם זאת, עמידה בסטנדרטים יכולה להגן עליכם.',
        color: 'green',
        recommendation: 'שווה לשקול בכל מקרה'
      }
    }
  }

  const reset = () => {
    setStep(0)
    setAnswers({})
    setShowResult(false)
  }

  if (showResult) {
    const result = getResult()
    return (
      <Card className="max-w-2xl mx-auto overflow-hidden">
        <div className={`h-2 ${
          result.color === 'red' ? 'bg-red-500' : 
          result.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
        }`} />
        <CardContent className="p-6 md:p-8 text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            result.color === 'red' ? 'bg-red-100' : 
            result.color === 'yellow' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {result.color === 'red' ? (
              <AlertTriangle className={`h-8 w-8 text-red-500`} />
            ) : result.color === 'yellow' ? (
              <AlertTriangle className={`h-8 w-8 text-yellow-500`} />
            ) : (
              <CheckCircle2 className={`h-8 w-8 text-green-500`} />
            )}
          </div>
          
          <h3 className="text-2xl font-bold mb-2">{result.title}</h3>
          <p className="text-gray-600 mb-4">{result.description}</p>
          
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            result.color === 'red' ? 'bg-red-100 text-red-700' : 
            result.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}>
            {result.recommendation}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/onboarding">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                התחילו עכשיו ב-500₪/חודש
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" onClick={reset}>
              בדיקה מחדש
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[step]
  const progress = ((step) / questions.length) * 100

  return (
    <Card className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="h-2 bg-gray-100">
        <div 
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <CardContent className="p-6 md:p-8">
        <div className="text-sm text-gray-500 mb-2">שאלה {step + 1} מתוך {questions.length}</div>
        
        <h3 className="text-xl md:text-2xl font-bold mb-2">{currentQuestion.question}</h3>
        {currentQuestion.subtext && (
          <p className="text-gray-500 text-sm mb-4">{currentQuestion.subtext}</p>
        )}
        
        <div className="grid gap-3 mt-6">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(step, option.value, option.score)}
              className={`w-full p-4 text-right rounded-xl border-2 transition-all hover:border-blue-500 hover:bg-blue-50 ${
                answers[step] === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        {step > 0 && (
          <Button variant="ghost" className="mt-4" onClick={() => setStep(step - 1)}>
            <ChevronRight className="h-4 w-4 ml-1" />
            חזרה
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============== OTHER COMPONENTS ==============
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

function StepCard({ number, title, description }: { 
  number: string, 
  title: string, 
  description: string
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
    <div className="border rounded-xl overflow-hidden bg-white">
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

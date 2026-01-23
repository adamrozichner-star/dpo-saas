'use client'

import { useState } from 'react'
import { Shield, Check, MessageSquare, FileText, Bell, BarChart3, Lock, Users, ChevronLeft, Sparkles, Star } from 'lucide-react'

export default function BrandingPreview() {
  const [activeOption, setActiveOption] = useState(1)

  return (
    <div className="min-h-screen bg-slate-100 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">MyDPO - אפשרויות עיצוב</h1>
        <p className="text-center text-slate-600 mb-8">בחר את הסגנון המועדף עליך</p>
        
        {/* Option Selector */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3].map(opt => (
            <button
              key={opt}
              onClick={() => setActiveOption(opt)}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                activeOption === opt 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              אפשרות {opt}
            </button>
          ))}
        </div>

        {/* Option 1: Professional Blue */}
        {activeOption === 1 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-2">אפשרות 1</span>
              <h2 className="text-2xl font-bold text-slate-900">Professional Trust - כחול מקצועי</h2>
              <p className="text-slate-600">מראה אמין, רציני ומקצועי. מתאים לעסקים ותאגידים.</p>
            </div>

            {/* Landing Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold">MyDPO</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-blue-200">אודות</span>
                    <span className="text-blue-200">תמחור</span>
                    <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium">התחברות</button>
                  </div>
                </div>
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold mb-4">הממונה על הגנת הפרטיות שלך</h1>
                  <p className="text-xl text-blue-100 mb-8">עמידה בתיקון 13 בקלות ובמחיר הוגן</p>
                  <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition">
                    התחל בחינם ←
                  </button>
                </div>
              </div>
              
              {/* Features */}
              <div className="p-8 grid grid-cols-3 gap-6">
                {[
                  { icon: Shield, title: 'DPO מוסמך', desc: 'ממונה אנושי מוסמך לפי חוק' },
                  { icon: MessageSquare, title: 'צ\'אט חכם', desc: 'מענה מיידי 24/7 לכל שאלה' },
                  { icon: FileText, title: 'מסמכים מוכנים', desc: 'כל המסמכים הנדרשים בחוק' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <f.icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex h-[400px]">
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 text-white p-4">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="font-bold">MyDPO</span>
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-medium mb-4">
                    + שיחה חדשה
                  </button>
                  <div className="text-xs text-slate-500 mb-2">שיחות אחרונות</div>
                  <div className="space-y-1">
                    <div className="p-2 bg-slate-800 rounded-lg text-sm">מדיניות פרטיות</div>
                    <div className="p-2 hover:bg-slate-800 rounded-lg text-sm text-slate-400">אירוע אבטחה</div>
                  </div>
                </div>
                
                {/* Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold">הממונה שלך</h2>
                      <p className="text-sm text-blue-200">מוכן לעזור</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-50 p-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm max-w-md">
                      <p>היי! 👋 אני הממונה הדיגיטלי שלך. במה אוכל לעזור?</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                      <input className="flex-1 bg-slate-100 rounded-full px-4 py-3" placeholder="הקלד הודעה..." />
                      <button className="bg-blue-600 text-white p-3 rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Primary</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-800 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Dark</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Light</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Sidebar</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Success</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Option 2: Modern Gradient */}
        {activeOption === 2 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-2">אפשרות 2</span>
              <h2 className="text-2xl font-bold text-slate-900">Modern Gradient - סגול-ורוד מודרני</h2>
              <p className="text-slate-600">מראה צעיר, חדשני ודינמי. מתאים לסטארטאפים ועסקים מודרניים.</p>
            </div>

            {/* Landing Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-l from-violet-600 via-purple-600 to-fuchsia-600 text-white p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold">MyDPO</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">AI</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-purple-200">אודות</span>
                    <span className="text-purple-200">תמחור</span>
                    <button className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg font-medium border border-white/30">התחברות</button>
                  </div>
                </div>
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full mb-6">
                    <Sparkles className="w-4 h-4" />
                    <span>מופעל על ידי AI</span>
                  </div>
                  <h1 className="text-5xl font-black mb-4">פרטיות בקליק</h1>
                  <p className="text-xl text-purple-100 mb-8">DPO חכם שעובד בשבילך 24/7</p>
                  <div className="flex justify-center gap-4">
                    <button className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition shadow-xl">
                      נסה בחינם
                    </button>
                    <button className="bg-white/10 backdrop-blur border border-white/30 px-8 py-4 rounded-2xl font-bold text-lg">
                      צפה בדמו
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="p-8 grid grid-cols-3 gap-6 bg-gradient-to-b from-purple-50 to-white">
                {[
                  { icon: Shield, title: 'הגנה מלאה', desc: 'כיסוי רגולטורי מקצה לקצה', color: 'purple' },
                  { icon: Sparkles, title: 'AI חכם', desc: 'תשובות ומסמכים אוטומטיים', color: 'fuchsia' },
                  { icon: Bell, title: 'התראות חיות', desc: 'עדכונים בזמן אמת', color: 'violet' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
                    <div className={`w-14 h-14 bg-gradient-to-br from-${f.color}-500 to-${f.color}-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white`}>
                      <f.icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex h-[400px]">
                {/* Sidebar */}
                <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <span className="font-bold">MyDPO</span>
                  </div>
                  <button className="w-full bg-gradient-to-l from-purple-600 to-fuchsia-600 hover:opacity-90 py-2.5 rounded-xl font-medium mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    שיחה חדשה
                  </button>
                  <div className="text-xs text-slate-500 mb-2">שיחות אחרונות</div>
                  <div className="space-y-1">
                    <div className="p-2 bg-white/10 rounded-lg text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      מדיניות פרטיות
                    </div>
                    <div className="p-2 hover:bg-white/10 rounded-lg text-sm text-slate-400">אירוע אבטחה</div>
                  </div>
                </div>
                
                {/* Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold">MyDPO AI</h2>
                      <p className="text-sm text-purple-200">אונליין עכשיו</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-gradient-to-b from-purple-50/50 to-white p-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm max-w-md border border-purple-100">
                      <p>היי! ✨ אני ה-AI של MyDPO. מוכן לעזור עם כל שאלת פרטיות!</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                      <input className="flex-1 bg-slate-100 rounded-full px-4 py-3 border-2 border-transparent focus:border-purple-300" placeholder="שאל אותי משהו..." />
                      <button className="bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white p-3 rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Gradient</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-600 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Primary</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-fuchsia-500 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Accent</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Light</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Success</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Option 3: Clean Minimal */}
        {activeOption === 3 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-2">אפשרות 3</span>
              <h2 className="text-2xl font-bold text-slate-900">Clean & Minimal - ירוק נקי</h2>
              <p className="text-slate-600">מראה נקי, אמין ורגוע. מדגיש בטחון והגנה. מתאים לכולם.</p>
            </div>

            {/* Landing Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white border-b p-6">
                <div className="flex items-center justify-between mb-16">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-slate-900">MyDPO</span>
                  </div>
                  <div className="flex gap-6 items-center">
                    <span className="text-slate-600 hover:text-slate-900">אודות</span>
                    <span className="text-slate-600 hover:text-slate-900">תמחור</span>
                    <button className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition">התחברות</button>
                  </div>
                </div>
                <div className="text-center py-8 max-w-3xl mx-auto">
                  <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">הממונה על הגנת הפרטיות<br/><span className="text-emerald-500">שעובד בשבילך</span></h1>
                  <p className="text-xl text-slate-600 mb-8">פתרון פשוט, חוקי ומשתלם לעמידה בתיקון 13</p>
                  <div className="flex justify-center gap-4">
                    <button className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition">
                      התחל עכשיו
                    </button>
                    <button className="border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-slate-300 transition">
                      למד עוד
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="p-8 grid grid-cols-3 gap-8 bg-slate-50">
                {[
                  { icon: Shield, title: 'ציות מלא', desc: 'עמידה בכל דרישות החוק', check: true },
                  { icon: FileText, title: 'מסמכים מוכנים', desc: 'תבניות מאושרות משפטית', check: true },
                  { icon: Users, title: 'תמיכה אנושית', desc: 'ממונה מוסמך זמין בצורך', check: true },
                ].map((f, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <f.icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Preview */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex h-[400px]">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-l p-4">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-slate-900">MyDPO</span>
                  </div>
                  <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium mb-4">
                    + שיחה חדשה
                  </button>
                  <div className="text-xs text-slate-500 mb-2">שיחות אחרונות</div>
                  <div className="space-y-1">
                    <div className="p-3 bg-white rounded-xl text-sm border border-emerald-200 text-slate-900">מדיניות פרטיות</div>
                    <div className="p-3 hover:bg-white rounded-xl text-sm text-slate-600">אירוע אבטחה</div>
                  </div>
                </div>
                
                {/* Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="bg-white border-b p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">הממונה שלך</h2>
                      <p className="text-sm text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        מוכן לעזור
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 bg-white p-4">
                    <div className="bg-slate-50 rounded-2xl p-4 max-w-md border border-slate-200">
                      <p className="text-slate-800">שלום! 👋 אני כאן לעזור לך עם כל נושא הקשור לפרטיות ואבטחת מידע.</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                      <input className="flex-1 bg-slate-100 rounded-xl px-4 py-3 border-2 border-transparent focus:border-emerald-300 focus:bg-white" placeholder="הקלד הודעה..." />
                      <button className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Primary</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-600 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Dark</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Light</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-xl mb-2 border"></div>
                  <span className="text-xs text-slate-600">Background</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-xl mb-2"></div>
                  <span className="text-xs text-slate-600">Text</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-xl">
          <h3 className="text-xl font-bold mb-6 text-center">סיכום האפשרויות</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border-2 transition cursor-pointer ${activeOption === 1 ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setActiveOption(1)}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl mb-4"></div>
              <h4 className="font-bold mb-2">Professional Trust</h4>
              <p className="text-sm text-slate-600">כחול מקצועי ואמין. מתאים לעסקים מסורתיים, משרדי עו"ד, רו"ח.</p>
              <div className="mt-4 text-xs text-slate-500">✓ אמין ✓ רציני ✓ מקצועי</div>
            </div>
            <div className={`p-6 rounded-xl border-2 transition cursor-pointer ${activeOption === 2 ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setActiveOption(2)}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl mb-4"></div>
              <h4 className="font-bold mb-2">Modern Gradient</h4>
              <p className="text-sm text-slate-600">סגול-ורוד מודרני וחדשני. מתאים לסטארטאפים וחברות טכנולוגיה.</p>
              <div className="mt-4 text-xs text-slate-500">✓ צעיר ✓ חדשני ✓ דינמי</div>
            </div>
            <div className={`p-6 rounded-xl border-2 transition cursor-pointer ${activeOption === 3 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setActiveOption(3)}>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl mb-4"></div>
              <h4 className="font-bold mb-2">Clean & Minimal</h4>
              <p className="text-sm text-slate-600">ירוק נקי ורגוע. מדגיש בטחון והגנה. מתאים לכולם.</p>
              <div className="mt-4 text-xs text-slate-500">✓ נקי ✓ אמין ✓ אוניברסלי</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

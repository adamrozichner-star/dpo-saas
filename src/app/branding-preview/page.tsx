'use client'

import { useState } from 'react'
import { Shield, MessageSquare, FileText, ChevronLeft } from 'lucide-react'

export default function BrandingPreview() {
  const [activeOption, setActiveOption] = useState(1)

  const options = [
    { id: 1, name: 'Navy + Emerald', primary: '#1e40af', secondary: '#10b981' },
    { id: 2, name: 'Trust Blue + Gold', primary: '#0066CC', secondary: '#F5A623' },
    { id: 3, name: 'Soft Blue + Cyan', primary: '#3b82f6', secondary: '#06b6d4' },
  ]

  return (
    <div className="min-h-screen bg-slate-100 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">MyDPO - גוונים של כחול</h1>
        <p className="text-center text-slate-600 mb-8">מבוסס מחקר צבעים לאמון, ביטחון ורגיעה</p>
        
        {/* Research Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <h3 className="font-bold text-lg mb-3">🔬 תובנות מהמחקר</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="font-semibold text-blue-900 mb-1">כחול = אמון</p>
              <p className="text-blue-700">33% מהמותגים משתמשים בכחול. PayPal, Stripe, LinkedIn.</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <p className="font-semibold text-green-900 mb-1">ירוק = הצלחה</p>
              <p className="text-green-700">מעביר "הכל בסדר", חיובי, ומרגיע.</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl">
              <p className="font-semibold text-amber-900 mb-1">זהב = פעולה</p>
              <p className="text-amber-700">מושלם לכפתורי CTA. מעורר פעולה.</p>
            </div>
          </div>
        </div>
        
        {/* Option Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setActiveOption(opt.id)}
              className={`px-6 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeOption === opt.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded" style={{backgroundColor: opt.primary}}></div>
                <div className="w-4 h-4 rounded" style={{backgroundColor: opt.secondary}}></div>
              </div>
              {opt.name}
            </button>
          ))}
        </div>

        {/* Option 1: Navy + Emerald */}
        {activeOption === 1 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">אפשרות 1</span>
              <h2 className="text-2xl font-bold text-slate-900">Navy + Emerald - אמון קלאסי</h2>
              <p className="text-slate-600">כמו PayPal, LinkedIn. כחול כהה מקצועי + ירוק להצלחה.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="text-white p-6" style={{background: 'linear-gradient(to left, #1e3a5f, #1e40af)'}}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6" style={{color: '#1e40af'}} />
                    </div>
                    <span className="text-2xl font-bold">MyDPO</span>
                  </div>
                  <button className="text-white px-5 py-2 rounded-lg font-medium" style={{backgroundColor: '#10b981'}}>התחברות</button>
                </div>
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold mb-4">הממונה על הגנת הפרטיות שלך</h1>
                  <p className="text-xl text-blue-200 mb-8">עמידה בתיקון 13 בקלות ובמחיר הוגן</p>
                  <button className="text-white px-8 py-4 rounded-xl font-bold text-lg" style={{backgroundColor: '#10b981'}}>
                    התחל בחינם ←
                  </button>
                </div>
              </div>
              <div className="p-8 grid grid-cols-3 gap-6">
                {[
                  { icon: Shield, title: 'DPO מוסמך', desc: 'ממונה אנושי מוסמך לפי חוק' },
                  { icon: MessageSquare, title: 'צ\'אט חכם', desc: 'מענה מיידי 24/7' },
                  { icon: FileText, title: 'מסמכים מוכנים', desc: 'כל המסמכים הנדרשים' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#dbeafe'}}>
                      <f.icon className="w-7 h-7" style={{color: '#1e40af'}} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4 flex-wrap">
                {[
                  { color: '#1e40af', name: 'Primary', hex: '#1e40af' },
                  { color: '#1e3a5f', name: 'Dark', hex: '#1e3a5f' },
                  { color: '#10b981', name: 'CTA', hex: '#10b981' },
                  { color: '#dbeafe', name: 'Light', hex: '#dbeafe' },
                  { color: '#0f172a', name: 'Sidebar', hex: '#0f172a' },
                ].map((c, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-xl mb-2 shadow" style={{backgroundColor: c.color}}></div>
                    <span className="text-xs text-slate-600">{c.name}</span>
                    <p className="text-xs font-mono text-slate-400">{c.hex}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                💡 Navy הוא הכחול הקלאסי של אמון. Emerald מוסיף חיוביות.
              </div>
            </div>
          </div>
        )}

        {/* Option 2: Trust Blue + Gold */}
        {activeOption === 2 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">אפשרות 2</span>
              <h2 className="text-2xl font-bold text-slate-900">Trust Blue + Gold - חם ומזמין</h2>
              <p className="text-slate-600">כחול בינוני עם זהב חם. מקצועי אבל נגיש.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="text-white p-6" style={{background: 'linear-gradient(to left, #0066CC, #0052a3)'}}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6" style={{color: '#0066CC'}} />
                    </div>
                    <span className="text-2xl font-bold">MyDPO</span>
                  </div>
                  <button className="text-slate-900 px-5 py-2 rounded-lg font-bold" style={{backgroundColor: '#F5A623'}}>התחברות</button>
                </div>
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold mb-4">הממונה על הגנת הפרטיות שלך</h1>
                  <p className="text-xl text-blue-200 mb-8">עמידה בתיקון 13 בקלות ובמחיר הוגן</p>
                  <button className="text-slate-900 px-8 py-4 rounded-xl font-bold text-lg" style={{backgroundColor: '#F5A623'}}>
                    התחל בחינם ←
                  </button>
                </div>
              </div>
              <div className="p-8 grid grid-cols-3 gap-6">
                {[
                  { icon: Shield, title: 'DPO מוסמך', desc: 'ממונה אנושי מוסמך לפי חוק' },
                  { icon: MessageSquare, title: 'צ\'אט חכם', desc: 'מענה מיידי 24/7' },
                  { icon: FileText, title: 'מסמכים מוכנים', desc: 'כל המסמכים הנדרשים' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#e6f2ff'}}>
                      <f.icon className="w-7 h-7" style={{color: '#0066CC'}} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4 flex-wrap">
                {[
                  { color: '#0066CC', name: 'Primary', hex: '#0066CC' },
                  { color: '#0052a3', name: 'Dark', hex: '#0052a3' },
                  { color: '#F5A623', name: 'CTA', hex: '#F5A623' },
                  { color: '#e6f2ff', name: 'Light', hex: '#e6f2ff' },
                  { color: '#22c55e', name: 'Success', hex: '#22c55e' },
                ].map((c, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-xl mb-2 shadow" style={{backgroundColor: c.color}}></div>
                    <span className="text-xs text-slate-600">{c.name}</span>
                    <p className="text-xs font-mono text-slate-400">{c.hex}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                💡 כחול כמו Facebook/IKEA - מוכר ואמין. זהב מוסיף חמימות כמו Amazon.
              </div>
            </div>
          </div>
        )}

        {/* Option 3: Soft Blue + Cyan */}
        {activeOption === 3 && (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-2 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium mb-2">אפשרות 3</span>
              <h2 className="text-2xl font-bold text-slate-900">Soft Blue + Cyan - מודרני ומרגיע</h2>
              <p className="text-slate-600">כחול בהיר רך עם טורקיז. הכי מרגיע ונעים לעין.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="text-white p-6" style={{background: 'linear-gradient(to left, #3b82f6, #2563eb)'}}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6" style={{color: '#3b82f6'}} />
                    </div>
                    <span className="text-2xl font-bold">MyDPO</span>
                  </div>
                  <button className="text-white px-5 py-2 rounded-lg font-medium" style={{backgroundColor: '#06b6d4'}}>התחברות</button>
                </div>
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold mb-4">הממונה על הגנת הפרטיות שלך</h1>
                  <p className="text-xl text-blue-200 mb-8">עמידה בתיקון 13 בקלות ובמחיר הוגן</p>
                  <button className="text-white px-8 py-4 rounded-xl font-bold text-lg" style={{backgroundColor: '#06b6d4'}}>
                    התחל בחינם ←
                  </button>
                </div>
              </div>
              <div className="p-8 grid grid-cols-3 gap-6" style={{backgroundColor: '#f0f9ff'}}>
                {[
                  { icon: Shield, title: 'DPO מוסמך', desc: 'ממונה אנושי מוסמך לפי חוק' },
                  { icon: MessageSquare, title: 'צ\'אט חכם', desc: 'מענה מיידי 24/7' },
                  { icon: FileText, title: 'מסמכים מוכנים', desc: 'כל המסמכים הנדרשים' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-6 bg-white rounded-2xl shadow-sm">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#e0f2fe'}}>
                      <f.icon className="w-7 h-7" style={{color: '#0284c7'}} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold mb-4">פלטת צבעים</h3>
              <div className="flex gap-4 flex-wrap">
                {[
                  { color: '#3b82f6', name: 'Primary', hex: '#3b82f6' },
                  { color: '#2563eb', name: 'Dark', hex: '#2563eb' },
                  { color: '#06b6d4', name: 'CTA', hex: '#06b6d4' },
                  { color: '#e0f2fe', name: 'Light', hex: '#e0f2fe' },
                  { color: '#22c55e', name: 'Success', hex: '#22c55e' },
                ].map((c, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-xl mb-2 shadow" style={{backgroundColor: c.color}}></div>
                    <span className="text-xs text-slate-600">{c.name}</span>
                    <p className="text-xs font-mono text-slate-400">{c.hex}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-cyan-50 rounded-lg text-sm text-cyan-800">
                💡 Blue-500 הוא הכחול של Tailwind - מודרני ונקי. Cyan מוסיף רעננות וטכנולוגיה.
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-xl">
          <h3 className="text-xl font-bold mb-6 text-center">השוואה מהירה</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border-2 cursor-pointer ${activeOption === 1 ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} onClick={() => setActiveOption(1)}>
              <div className="flex gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#1e40af'}}></div>
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#10b981'}}></div>
              </div>
              <h4 className="font-bold mb-2">Navy + Emerald</h4>
              <p className="text-sm text-slate-600 mb-3">קלאסי ומוכח. כמו הבנקים.</p>
              <div className="text-xs text-slate-500">✓ אמין ✓ מקצועי ✓ ירוק = הצלחה</div>
            </div>
            <div className={`p-6 rounded-xl border-2 cursor-pointer ${activeOption === 2 ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} onClick={() => setActiveOption(2)}>
              <div className="flex gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#0066CC'}}></div>
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#F5A623'}}></div>
              </div>
              <h4 className="font-bold mb-2">Trust Blue + Gold</h4>
              <p className="text-sm text-slate-600 mb-3">חם ומזמין. מקצועי + נגיש.</p>
              <div className="text-xs text-slate-500">✓ חמים ✓ יוקרתי ✓ מזמין פעולה</div>
            </div>
            <div className={`p-6 rounded-xl border-2 cursor-pointer ${activeOption === 3 ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`} onClick={() => setActiveOption(3)}>
              <div className="flex gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#3b82f6'}}></div>
                <div className="w-8 h-8 rounded-lg" style={{backgroundColor: '#06b6d4'}}></div>
              </div>
              <h4 className="font-bold mb-2">Soft Blue + Cyan</h4>
              <p className="text-sm text-slate-600 mb-3">מרגיע ומודרני. טכנולוגי.</p>
              <div className="text-xs text-slate-500">✓ מרגיע ✓ מודרני ✓ נעים לעין</div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl text-center">
            <p className="text-slate-700">
              <strong>🎯 המלצה:</strong> עסקים מסורתיים → <strong>Navy + Emerald</strong> | 
              חם ונגיש → <strong>Trust Blue + Gold</strong> | 
              מודרני → <strong>Soft Blue + Cyan</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

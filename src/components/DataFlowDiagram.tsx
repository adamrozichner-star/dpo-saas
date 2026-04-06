'use client'

import { useState } from 'react'
import { Database, Globe, Server, Users, AlertTriangle, X, ZoomIn, ZoomOut } from 'lucide-react'

interface DataNode {
  id: string
  label: string
  type: 'collection' | 'database' | 'storage' | 'processor'
  x: number
  y: number
  sensitive?: boolean
  details?: string
}

interface DataFlowDiagramProps {
  databases?: Array<{ name: string; purpose: string; dataTypes?: string[] }>
  processors?: Array<{ name: string; purpose: string; location?: string }>
}

export default function DataFlowDiagram({ databases = [], processors = [] }: DataFlowDiagramProps) {
  const [selectedNode, setSelectedNode] = useState<DataNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const collectionNodes: DataNode[] = [
    { id: 'web', label: 'אתר אינטרנט', type: 'collection', x: 80, y: 60, details: 'נקודת איסוף: טפסים, עוגיות, אנליטיקה' },
    { id: 'crm', label: 'CRM / מערכת ניהול', type: 'collection', x: 80, y: 140, details: 'נקודת איסוף: פרטי לקוחות, היסטוריה' },
    { id: 'hr', label: 'משאבי אנוש', type: 'collection', x: 80, y: 220, details: 'נקודת איסוף: פרטי עובדים, שכר', sensitive: true },
  ]

  const dbNodes: DataNode[] = databases.length > 0
    ? databases.map((db, i) => ({ id: `db-${i}`, label: db.name, type: 'database' as const, x: 300, y: 60 + i * 80, details: `מטרה: ${db.purpose}`, sensitive: db.dataTypes?.some(t => ['health', 'biometric', 'בריאות', 'ביומטרי'].some(s => t.includes(s))) }))
    : [{ id: 'db-main', label: 'מאגר ראשי', type: 'database' as const, x: 300, y: 80, details: 'מאגר המידע הראשי' }, { id: 'db-backup', label: 'גיבוי', type: 'database' as const, x: 300, y: 180, details: 'מאגר גיבוי מוצפן' }]

  const storageNode: DataNode = { id: 'storage', label: 'אחסון ענן', type: 'storage', x: 500, y: 140, details: 'שרתי אחסון מאובטחים' }

  const processorNodes: DataNode[] = processors.length > 0
    ? processors.map((p, i) => ({ id: `proc-${i}`, label: p.name, type: 'processor' as const, x: 680, y: 60 + i * 80, details: `מטרה: ${p.purpose}${p.location ? ` (${p.location})` : ''}` }))
    : [{ id: 'proc-analytics', label: 'אנליטיקה', type: 'processor' as const, x: 680, y: 80, details: 'עיבוד נתונים סטטיסטיים' }, { id: 'proc-email', label: 'שירות מיילים', type: 'processor' as const, x: 680, y: 180, details: 'שליחת מיילים ללקוחות' }]

  const allNodes = [...collectionNodes, ...dbNodes, storageNode, ...processorNodes]

  const flows = [
    ...collectionNodes.map(c => ({ from: c.id, to: dbNodes[0]?.id || 'db-main' })),
    ...dbNodes.map(db => ({ from: db.id, to: 'storage' })),
    ...processorNodes.map(p => ({ from: 'storage', to: p.id })),
  ]

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'collection': return { fill: '#dbeafe', stroke: '#3b82f6' }
      case 'database': return { fill: '#fef3c7', stroke: '#f59e0b' }
      case 'storage': return { fill: '#d1fae5', stroke: '#10b981' }
      case 'processor': return { fill: '#ede9fe', stroke: '#8b5cf6' }
      default: return { fill: '#f1f5f9', stroke: '#64748b' }
    }
  }

  const svgHeight = Math.max(300, allNodes.reduce((max, n) => Math.max(max, n.y + 60), 0))

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
      <div className="flex items-start sm:items-center justify-between mb-3 flex-col sm:flex-row gap-2">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Database className="h-4 w-4 text-indigo-500" />מפת זרימת מידע</h3>
        <div className="flex gap-2 sm:gap-3 text-xs text-stone-500 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> איסוף</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> מאגרים</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> אחסון</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-200 inline-block" /> מעבדים</span>
        </div>
      </div>
      <div className="flex gap-1 mb-2">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"><ZoomIn className="h-4 w-4 text-stone-600" /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"><ZoomOut className="h-4 w-4 text-stone-600" /></button>
        <span className="text-xs text-stone-400 self-center mr-2">{Math.round(zoom * 100)}%</span>
      </div>
      <p className="text-xs text-stone-400 mb-1 sm:hidden">← גללו ימינה לצפייה מלאה →</p>
      <div className="relative overflow-x-auto">
        <svg width={780 * zoom} height={svgHeight * zoom} className="w-full" viewBox={`0 0 780 ${svgHeight}`} style={{ minWidth: 780 * zoom }}>
          <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker></defs>
          {flows.map((flow, i) => {
            const from = allNodes.find(n => n.id === flow.from)
            const to = allNodes.find(n => n.id === flow.to)
            if (!from || !to) return null
            return <line key={i} x1={from.x + 60} y1={from.y} x2={to.x - 60} y2={to.y} stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrowhead)" strokeDasharray="6 3" />
          })}
          {allNodes.map(node => {
            const colors = getNodeColor(node.type)
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(node)} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} style={{ transition: 'transform 0.15s', transform: hoveredNode === node.id ? 'scale(1.05)' : 'scale(1)', transformOrigin: `${node.x}px ${node.y}px` }}>
                <rect x={node.x - 55} y={node.y - 25} width="110" height="50" rx="10" fill={colors.fill} stroke={colors.stroke} strokeWidth={hoveredNode === node.id ? '3' : '2'} />
                {node.sensitive && <><circle cx={node.x + 45} cy={node.y - 18} r="8" fill="#ef4444" /><text x={node.x + 45} y={node.y - 14} textAnchor="middle" fontSize="10" fill="white">!</text></>}
                <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151" className="select-none">{node.label.length > 14 ? node.label.slice(0, 12) + '...' : node.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      {selectedNode && (
        <div className="mt-3 p-3 rounded-lg bg-stone-50 border border-stone-200 relative">
          <button onClick={() => setSelectedNode(null)} className="absolute top-2 left-2 text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 mb-2">
            {selectedNode.sensitive && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <h4 className="font-semibold text-stone-800">{selectedNode.label}</h4>
          </div>
          <p className="text-sm text-stone-600">{selectedNode.details}</p>
          {selectedNode.sensitive && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />מכיל מידע רגיש — נדרשת הגנה מוגברת</p>}
        </div>
      )}
    </div>
  )
}

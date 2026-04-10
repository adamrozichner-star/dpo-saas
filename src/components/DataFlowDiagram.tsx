'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Database, AlertTriangle, X, ZoomIn, ZoomOut, ArrowLeft, Pencil, Save, RotateCcw, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

// =============================================
// Label maps (mirrors onboarding options)
// =============================================
const DB_LABELS: Record<string, string> = {
  customers: 'לקוחות',
  cvs: 'קו"ח / מועמדים',
  employees: 'עובדים',
  cameras: 'מצלמות',
  website_leads: 'לידים מהאתר',
  suppliers_id: 'עוסק מורשה',
  payments: 'תשלומים',
  medical: 'רפואי',
}

const STORAGE_LABELS: Record<string, string> = {
  email: 'מייל',
  crm: 'CRM',
  cloud: 'ענן',
  paper: 'פיזי',
  local: 'מחשב מקומי',
  erp: 'ERP / שכר',
}

const PROCESSOR_LABELS: Record<string, string> = {
  crm_saas: 'CRM / מערכת ניהול',
  payroll: 'שכר / HR',
  marketing: 'שיווק / דיוור',
  cloud_hosting: 'אחסון ענן',
  call_center: 'מוקד שירות',
  accounting: 'הנה"ח / רו"ח',
}

const DB_FIELDS: Record<string, string[]> = {
  customers: ['שם', 'טלפון', 'אימייל', 'כתובת', 'ת.ז', 'מידע פיננסי', 'היסטוריית רכישות'],
  cvs: ['שם', 'טלפון', 'אימייל', 'ת.ז', 'ניסיון תעסוקתי', 'השכלה', 'המלצות'],
  employees: ['שם', 'ת.ז', 'כתובת', 'שכר', 'חשבון בנק', 'ביצועים', 'מידע רפואי'],
  cameras: ['צילום פנים', 'מיקום', 'תאריך ושעה'],
  website_leads: ['שם', 'טלפון', 'אימייל', 'כתובת IP', 'עמודים שנצפו'],
  suppliers_id: ['שם', 'ת.ז / ח.פ', 'טלפון', 'חשבון בנק', 'פרטי חוזה'],
  payments: ['שם', 'מספר כרטיס', 'תוקף', 'CVV', 'כתובת חיוב'],
  medical: ['שם', 'ת.ז', 'מידע רפואי', 'אבחנות', 'תרופות', 'ביטוח'],
}

const SENSITIVE_FIELDS = new Set([
  'ת.ז', 'מידע פיננסי', 'שכר', 'חשבון בנק', 'מידע רפואי',
  'אבחנות', 'תרופות', 'מספר כרטיס', 'CVV', 'צילום פנים', 'ביצועים', 'כתובת IP',
])

// Collection point mapping: which DB types imply which collection sources
const COLLECTION_SOURCES: Record<string, { id: string; label: string }[]> = {
  customers: [{ id: 'col-web', label: 'אתר אינטרנט' }, { id: 'col-crm', label: 'קבלת פנים' }],
  cvs: [{ id: 'col-web', label: 'אתר אינטרנט' }, { id: 'col-email', label: 'מייל' }],
  employees: [{ id: 'col-hr', label: 'משאבי אנוש' }],
  cameras: [{ id: 'col-cam', label: 'מצלמות אבטחה' }],
  website_leads: [{ id: 'col-web', label: 'אתר אינטרנט' }],
  suppliers_id: [{ id: 'col-manual', label: 'הזנה ידנית' }],
  payments: [{ id: 'col-web', label: 'אתר אינטרנט' }, { id: 'col-pos', label: 'קופה / סליקה' }],
  medical: [{ id: 'col-clinic', label: 'קליניקה / מרפאה' }],
}

// =============================================
// Types
// =============================================
interface DataNode {
  id: string
  label: string
  type: 'collection' | 'database' | 'storage' | 'processor'
  x: number
  y: number
  sensitive?: boolean
  details?: NodeDetails
}

interface NodeDetails {
  description: string
  fields?: string[]
  sensitiveFields?: string[]
  volume?: string
  retention?: string
  accessLevel?: string
}

interface DataEdge {
  from: string
  to: string
  details?: EdgeDetails
}

interface EdgeDetails {
  sourceLabel: string
  destLabel: string
  dataTypes?: string[]
  method?: string
  frequency?: string
}

interface DataFlowDiagramProps {
  orgData?: any
  onboardingAnswers?: any
  ropaRecords?: any[]
  supabase?: any
  orgId?: string
}

// =============================================
// Node & edge builder
// =============================================
function buildDiagram(v3: any) {
  const databases: string[] = [...(v3.databases || []), ...(v3.customDatabases || [])]
  const storageList: string[] = [...(v3.storage || []), ...(v3.customStorage || [])]
  const processorList: string[] = [...(v3.processors || []), ...(v3.customProcessors || [])]
  const dbDetails: Record<string, any> = v3.dbDetails || {}

  if (databases.length === 0 && storageList.length === 0 && processorList.length === 0) {
    return { nodes: [], edges: [], empty: true }
  }

  const nodes: DataNode[] = []
  const edges: DataEdge[] = []
  const seenCollections = new Map<string, DataNode>()

  // --- Column positions (RTL: collection right, processors left) ---
  const colX = { collection: 65, database: 225, storage: 370, processor: 515 }

  // --- Database nodes (column 2) ---
  databases.forEach((dbKey, i) => {
    const isCustom = !DB_LABELS[dbKey]
    const label = DB_LABELS[dbKey] || dbKey
    const fields = DB_FIELDS[dbKey] || dbDetails[dbKey]?.fields || []
    const sensitiveFields = fields.filter((f: string) => SENSITIVE_FIELDS.has(f))
    const hasSensitive = sensitiveFields.length > 0 || ['medical', 'cameras', 'payments'].includes(dbKey)
    const detail = dbDetails[dbKey] || {}

    const node: DataNode = {
      id: `db-${dbKey}`,
      label,
      type: 'database',
      x: colX.database,
      y: 50 + i * 70,
      sensitive: hasSensitive,
      details: {
        description: `מאגר מידע: ${label}`,
        fields,
        sensitiveFields,
        volume: detail.size,
        retention: detail.retention,
        accessLevel: detail.access,
      },
    }
    nodes.push(node)

    // Derive collection sources for this DB
    const sources = COLLECTION_SOURCES[dbKey] || [{ id: 'col-general', label: 'הזנה ידנית' }]
    sources.forEach(src => {
      if (!seenCollections.has(src.id)) {
        seenCollections.set(src.id, {
          id: src.id,
          label: src.label,
          type: 'collection',
          x: colX.collection,
          y: 0, // positioned later
          details: { description: `נקודת איסוף: ${src.label}` },
        })
      }
      edges.push({
        from: src.id,
        to: node.id,
        details: {
          sourceLabel: src.label,
          destLabel: label,
          dataTypes: fields.slice(0, 4),
          method: isCustom ? 'ידני / API' : 'אוטומטי',
          frequency: 'שוטף',
        },
      })
    })
  })

  // Position collection nodes
  const colNodes = Array.from(seenCollections.values())
  colNodes.forEach((n, i) => { n.y = 50 + i * 70 })
  nodes.push(...colNodes)

  // --- Storage nodes (column 3) ---
  storageList.forEach((sKey, i) => {
    const isCustom = !STORAGE_LABELS[sKey]
    const label = STORAGE_LABELS[sKey] || sKey

    nodes.push({
      id: `stor-${sKey}`,
      label,
      type: 'storage',
      x: colX.storage,
      y: 50 + i * 70,
      details: { description: `מערכת אחסון: ${label}` },
    })

    // Connect each DB to each storage
    databases.forEach(dbKey => {
      edges.push({
        from: `db-${dbKey}`,
        to: `stor-${sKey}`,
        details: {
          sourceLabel: DB_LABELS[dbKey] || dbKey,
          destLabel: label,
          method: isCustom ? 'ידני' : sKey === 'cloud' ? 'סנכרון ענן' : sKey === 'email' ? 'מייל' : 'העברה',
          frequency: sKey === 'paper' ? 'לפי צורך' : 'שוטף',
        },
      })
    })
  })

  // --- Processor nodes (column 4) ---
  processorList.forEach((pKey, i) => {
    const isCustom = !PROCESSOR_LABELS[pKey]
    const label = PROCESSOR_LABELS[pKey] || pKey

    nodes.push({
      id: `proc-${pKey}`,
      label,
      type: 'processor',
      x: colX.processor,
      y: 50 + i * 70,
      details: { description: `ספק חיצוני: ${label}` },
    })

    // Connect storage to processors, or DB directly if no storage
    if (storageList.length > 0) {
      edges.push({
        from: `stor-${storageList[0]}`,
        to: `proc-${pKey}`,
        details: {
          sourceLabel: STORAGE_LABELS[storageList[0]] || storageList[0],
          destLabel: label,
          method: isCustom ? 'API / ידני' : 'API',
          frequency: 'שוטף',
        },
      })
    } else if (databases.length > 0) {
      edges.push({
        from: `db-${databases[0]}`,
        to: `proc-${pKey}`,
        details: {
          sourceLabel: DB_LABELS[databases[0]] || databases[0],
          destLabel: label,
          method: 'API',
          frequency: 'שוטף',
        },
      })
    }
  })

  return { nodes, edges, empty: false }
}

// =============================================
// Component
// =============================================
const NODE_TYPE_OPTIONS: { v: DataNode['type']; l: string }[] = [
  { v: 'collection', l: 'איסוף' },
  { v: 'database', l: 'מאגר' },
  { v: 'storage', l: 'אחסון' },
  { v: 'processor', l: 'מעבד' },
]

export default function DataFlowDiagram({ orgData, onboardingAnswers, ropaRecords, supabase, orgId }: DataFlowDiagramProps) {
  const [selectedNode, setSelectedNode] = useState<DataNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetails | null>(null)
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [customNodes, setCustomNodes] = useState<DataNode[] | null>(null)
  const [customEdges, setCustomEdges] = useState<DataEdge[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddNode, setShowAddNode] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<DataNode['type']>('database')
  const [newNodeSensitive, setNewNodeSensitive] = useState(false)
  const [connectMode, setConnectMode] = useState<string | null>(null) // source node id

  // Load overrides
  useEffect(() => {
    if (orgData?.data_flow_overrides?.nodes) {
      setCustomNodes(orgData.data_flow_overrides.nodes)
      setCustomEdges(orgData.data_flow_overrides.edges || [])
    }
  }, [orgData?.data_flow_overrides])

  const v3 = onboardingAnswers || {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoDiagram = useMemo(() => buildDiagram(v3), [JSON.stringify(v3)])

  const isUsingOverrides = customNodes !== null
  const allNodes = isUsingOverrides ? customNodes! : autoDiagram.nodes
  const flows = isUsingOverrides ? (customEdges || []) : autoDiagram.edges
  const empty = !isUsingOverrides && autoDiagram.empty

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

  const closePanel = () => { setSelectedNode(null); setSelectedEdge(null); setSelectedEdgeIndex(null) }

  const enterEditMode = () => {
    if (!isUsingOverrides) {
      setCustomNodes([...autoDiagram.nodes])
      setCustomEdges([...autoDiagram.edges])
    }
    setEditMode(true)
    closePanel()
  }

  const handleSave = async () => {
    if (!supabase || !orgId) return
    setSaving(true)
    try {
      await supabase.from('organizations').update({
        data_flow_overrides: { nodes: customNodes, edges: customEdges, lastModified: new Date().toISOString() }
      }).eq('id', orgId)
      setEditMode(false)
    } catch (e) { console.error('Failed to save diagram:', e) }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!supabase || !orgId) return
    setSaving(true)
    try {
      await supabase.from('organizations').update({ data_flow_overrides: null }).eq('id', orgId)
      setCustomNodes(null)
      setCustomEdges(null)
      setEditMode(false)
    } catch (e) { console.error('Failed to reset diagram:', e) }
    setSaving(false)
  }

  const removeNode = (nodeId: string) => {
    if (!customNodes || !customEdges) return
    setCustomNodes(customNodes.filter(n => n.id !== nodeId))
    setCustomEdges(customEdges.filter(e => e.from !== nodeId && e.to !== nodeId))
    closePanel()
  }

  const removeEdge = (idx: number) => {
    if (!customEdges) return
    setCustomEdges(customEdges.filter((_, i) => i !== idx))
    closePanel()
  }

  const addNode = () => {
    if (!newNodeLabel.trim() || !customNodes) return
    const colX: Record<string, number> = { collection: 65, database: 225, storage: 370, processor: 515 }
    const sameTypeNodes = customNodes.filter(n => n.type === newNodeType)
    const y = 50 + sameTypeNodes.length * 70
    const id = `custom-${Date.now()}`
    setCustomNodes([...customNodes, {
      id, label: newNodeLabel.trim(), type: newNodeType,
      x: colX[newNodeType] || 225, y,
      sensitive: newNodeSensitive,
      details: { description: newNodeLabel.trim() },
    }])
    setNewNodeLabel('')
    setNewNodeSensitive(false)
    setShowAddNode(false)
  }

  const handleNodeClick = (node: DataNode) => {
    if (editMode && connectMode !== null) {
      if (connectMode === '__pick__') {
        // First click: set source node
        setConnectMode(node.id)
      } else if (connectMode === node.id) {
        // Clicked same node: cancel
        setConnectMode(null)
      } else if (customEdges) {
        // Second click on different node: create edge
        const fromNode = allNodes.find(n => n.id === connectMode)
        setCustomEdges([...customEdges, {
          from: connectMode, to: node.id,
          details: { sourceLabel: fromNode?.label || '', destLabel: node.label, method: 'ידני', frequency: 'שוטף' },
        }])
        setConnectMode(null)
      }
    } else {
      setSelectedEdge(null)
      setSelectedEdgeIndex(null)
      setSelectedNode(node)
    }
  }

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

      {empty ? (
        <div className="text-center py-12">
          <Database className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500 mb-3">השלימו את ההרשמה כדי לראות את מפת הזרימה שלכם</p>
          <Link href="/onboarding" className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            להרשמה
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-2 flex-wrap">
            <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"><ZoomIn className="h-4 w-4 text-stone-600" /></button>
            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"><ZoomOut className="h-4 w-4 text-stone-600" /></button>
            <span className="text-xs text-stone-400 self-center mr-2">{Math.round(zoom * 100)}%</span>
            <div className="mr-auto flex gap-1">
              {!editMode ? (
                <button onClick={enterEditMode} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs text-stone-600 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> ערוך מפה
                </button>
              ) : (
                <>
                  <button onClick={() => setShowAddNode(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-xs text-indigo-600 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> הוסף צומת
                  </button>
                  <button onClick={() => setConnectMode(connectMode ? null : '__pick__')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${connectMode ? 'bg-amber-200 text-amber-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'}`}>
                    🔗 חבר
                  </button>
                  <button onClick={handleReset} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs text-stone-600 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> אפס
                  </button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs text-white transition-colors">
                    <Save className="h-3.5 w-3.5" /> {saving ? 'שומר...' : 'שמור'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs text-stone-600 transition-colors">
                    <X className="h-3.5 w-3.5" /> בטל
                  </button>
                </>
              )}
            </div>
          </div>
          {connectMode === '__pick__' && <p className="text-xs text-amber-600 mb-1">לחץ על צומת מקור</p>}
          {connectMode && connectMode !== '__pick__' && <p className="text-xs text-amber-600 mb-1">נבחר מקור: {allNodes.find(n => n.id === connectMode)?.label} — לחץ על צומת יעד</p>}
          {showAddNode && (
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">שם</label>
                  <input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} className="px-2 py-1 text-sm border border-stone-300 rounded-md w-36" placeholder="שם הצומת" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">סוג</label>
                  <select value={newNodeType} onChange={e => setNewNodeType(e.target.value as DataNode['type'])} className="px-2 py-1 text-sm border border-stone-300 rounded-md">
                    {NODE_TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-1 text-xs text-stone-600">
                  <input type="checkbox" checked={newNodeSensitive} onChange={e => setNewNodeSensitive(e.target.checked)} /> רגיש
                </label>
                <button onClick={addNode} disabled={!newNodeLabel.trim()} className="px-3 py-1 bg-indigo-500 text-white rounded-md text-xs font-medium hover:bg-indigo-600 disabled:opacity-50">הוסף</button>
                <button onClick={() => setShowAddNode(false)} className="px-3 py-1 bg-stone-200 text-stone-600 rounded-md text-xs">ביטול</button>
              </div>
            </div>
          )}
          <p className="text-xs text-stone-400 mb-1 sm:hidden">← גללו ימינה לצפייה מלאה →</p>
          <div className="relative overflow-x-auto -mx-1">
            <svg width="100%" height={svgHeight * zoom} viewBox={`0 0 580 ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ minWidth: 580 * zoom, maxWidth: '100%' }}>
              <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker></defs>
              {flows.map((flow, i) => {
                const from = allNodes.find(n => n.id === flow.from)
                const to = allNodes.find(n => n.id === flow.to)
                if (!from || !to) return null
                const isHighlighted = hoveredNode === from.id || hoveredNode === to.id
                return (
                  <g key={i} className="cursor-pointer" onClick={() => { setSelectedNode(null); setSelectedEdge(flow.details || { sourceLabel: from.label, destLabel: to.label }); setSelectedEdgeIndex(i) }}>
                    <line x1={from.x + 60} y1={from.y} x2={to.x - 60} y2={to.y} stroke="transparent" strokeWidth="20" />
                    <line x1={from.x + 60} y1={from.y} x2={to.x - 60} y2={to.y} stroke={isHighlighted ? '#6366f1' : '#cbd5e1'} strokeWidth={isHighlighted ? '2.5' : '2'} markerEnd="url(#arrowhead)" strokeDasharray="6 3" className="transition-all duration-150" />
                  </g>
                )
              })}
              {allNodes.map(node => {
                const colors = getNodeColor(node.type)
                return (
                  <g key={node.id} className="cursor-pointer" onClick={() => handleNodeClick(node)} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)} style={{ transition: 'transform 0.15s', transform: hoveredNode === node.id ? 'scale(1.05)' : 'scale(1)', transformOrigin: `${node.x}px ${node.y}px` }}>
                    <rect x={node.x - 55} y={node.y - 25} width="110" height="50" rx="10" fill={connectMode === node.id ? '#fef3c7' : colors.fill} stroke={connectMode === node.id ? '#f59e0b' : colors.stroke} strokeWidth={connectMode === node.id ? '3' : hoveredNode === node.id ? '3' : '2'} />
                    {node.sensitive && <><circle cx={node.x + 45} cy={node.y - 18} r="8" fill="#ef4444" /><text x={node.x + 45} y={node.y - 14} textAnchor="middle" fontSize="10" fill="white">!</text></>}
                    <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151" className="select-none">{node.label.length > 14 ? node.label.slice(0, 12) + '...' : node.label}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </>
      )}

      {/* Node detail panel */}
      {selectedNode && (
        <div className="mt-3 p-4 rounded-lg bg-stone-50 border border-stone-200 relative">
          <button onClick={closePanel} className="absolute top-2 left-2 text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 mb-2">
            {selectedNode.sensitive && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <h4 className="font-semibold text-stone-800">{selectedNode.label}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: getNodeColor(selectedNode.type).fill, color: getNodeColor(selectedNode.type).stroke }}>
              {{ collection: 'איסוף', database: 'מאגר', storage: 'אחסון', processor: 'מעבד' }[selectedNode.type]}
            </span>
          </div>
          {selectedNode.details && (
            <div className="space-y-2 text-sm text-stone-600">
              <p>{selectedNode.details.description}</p>
              {selectedNode.details.fields && selectedNode.details.fields.length > 0 && (
                <div>
                  <span className="font-medium text-stone-700">שדות מידע: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.details.fields.map((f, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedNode.details!.sensitiveFields?.includes(f)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {selectedNode.details!.sensitiveFields?.includes(f) && '⚠️ '}{f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedNode.details.volume && <p><span className="font-medium text-stone-700">היקף: </span>{selectedNode.details.volume}</p>}
              {selectedNode.details.retention && <p><span className="font-medium text-stone-700">תקופת שמירה: </span>{selectedNode.details.retention}</p>}
              {selectedNode.details.accessLevel && <p><span className="font-medium text-stone-700">רמת גישה: </span>{selectedNode.details.accessLevel} אנשים</p>}
            </div>
          )}
          {selectedNode.sensitive && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />מכיל מידע רגיש — נדרשת הגנה מוגברת</p>}
          {editMode && (
            <button onClick={() => removeNode(selectedNode.id)} className="mt-3 flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> הסר צומת
            </button>
          )}
        </div>
      )}

      {/* Edge detail panel */}
      {selectedEdge && (
        <div className="mt-3 p-4 rounded-lg bg-stone-50 border border-stone-200 relative">
          <button onClick={closePanel} className="absolute top-2 left-2 text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
          <h4 className="font-semibold text-stone-800 mb-2">{selectedEdge.sourceLabel} ← {selectedEdge.destLabel}</h4>
          <div className="space-y-1.5 text-sm text-stone-600">
            {selectedEdge.dataTypes && selectedEdge.dataTypes.length > 0 && (
              <p><span className="font-medium text-stone-700">מידע מועבר: </span>{selectedEdge.dataTypes.join(', ')}</p>
            )}
            {selectedEdge.method && <p><span className="font-medium text-stone-700">אופן העברה: </span>{selectedEdge.method}</p>}
            {selectedEdge.frequency && <p><span className="font-medium text-stone-700">תדירות: </span>{selectedEdge.frequency}</p>}
          </div>
          {editMode && selectedEdgeIndex !== null && (
            <button onClick={() => removeEdge(selectedEdgeIndex)} className="mt-3 flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> הסר חיבור
            </button>
          )}
        </div>
      )}
    </div>
  )
}

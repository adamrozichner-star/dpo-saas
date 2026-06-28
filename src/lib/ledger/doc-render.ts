// =============================================================================
// Phase F1: documents as ledger renders. A document = a PURE function of the
// approved template body + the bound ledger/descriptive inputs. No IO, no clock
// (the caller fetches the ledger + descriptive rows and passes them in - the
// console-data pure-mapper pattern, so this runs in tsx verify against live data).
//
// renderDocument returns { content, fingerprint }:
//   content     - the template body with {{tokens}} substituted (markdown).
//   fingerprint - a stable hash of (the doc's bound INPUT SUBSET + templateId +
//                 templateVersion). Same ledger state + same template -> same
//                 fingerprint; a changed input OR a changed template version
//                 flips it. This is what the divergence flag compares against the
//                 pinned value, so it must be deterministic and volatile-free
//                 (no now()/dates baked into the inputs).
//
// Fingerprint uses a plain deterministic JS hash (browser + node safe) - it needs
// collision-resistance for change-detection, not cryptographic strength.
// =============================================================================

export type DocType = 'ropa' | 'processor_agreement' | 'dpo_appointment' | 'asset_db_definition'

export interface RenderOrg { name: string }
export interface RenderDpo { name: string | null; email: string | null; license_number: string | null }
export interface RenderProfile {
  data_types: unknown
  processing_purposes: unknown
  security_measures: unknown
  third_parties: unknown
}
export interface RenderAsset { name: string | null; details: unknown }
export interface RenderRecipient {
  name: string
  has_dpa: boolean | null
  dpa_signed_date: string | null
  dpa_expiry_date: string | null
}

export interface RenderContext {
  org: RenderOrg
  dpo: RenderDpo | null
  profile: RenderProfile | null
  assets: RenderAsset[]
  recipients: RenderRecipient[]
}

export interface DocTemplate {
  templateId: string
  version: number
  body: string
}

export interface RenderResult {
  content: string
  fingerprint: string
}

// ---- deterministic, browser+node-safe hash (cyrb53) ------------------------
function hashStr(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

// stable-key JSON so equal inputs always serialize identically
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null)
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  const keys = Object.keys(v as Record<string, unknown>).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical((v as Record<string, unknown>)[k])).join(',') + '}'
}

function substitute(body: string, tokens: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in tokens ? tokens[k] : ''))
}

const dash = (s: string | null | undefined) => (s && String(s).trim() ? String(s) : '-')
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : [])

// ---- per-doc binders: build the token map + the fingerprint INPUT SUBSET -----
// Each binder returns ONLY the ledger/descriptive values the doc actually uses,
// so the fingerprint changes exactly when a used input changes.

type Bound = { tokens: Record<string, string>; inputs: unknown }

function bindRopa(ctx: RenderContext): Bound {
  const assets = ctx.assets.map((a) => ({ name: dash(a.name) }))
  const recipients = ctx.recipients.map((r) => ({ name: r.name, has_dpa: !!r.has_dpa }))
  const categories = asList(ctx.profile?.data_types)
  const purposes = asList(ctx.profile?.processing_purposes)
  const tokens = {
    orgName: dash(ctx.org.name),
    dpoName: dash(ctx.dpo?.name),
    dpoEmail: dash(ctx.dpo?.email),
    assetsTable: assets.length ? assets.map((a) => `| ${a.name} |`).join('\n') : '| (אין נכסים) |',
    recipientsTable: recipients.length
      ? recipients.map((r) => `| ${r.name} | ${r.has_dpa ? 'יש הסכם' : 'אין הסכם'} |`).join('\n')
      : '| (אין מקבלי מידע) | - |',
    categories: categories.length ? categories.join(', ') : '-',
    purposes: purposes.length ? purposes.join(', ') : '-',
  }
  return { tokens, inputs: { org: ctx.org.name, dpo: ctx.dpo, assets, recipients, categories, purposes } }
}

function bindDpa(ctx: RenderContext): Bound {
  const recipients = ctx.recipients.map((r) => ({
    name: r.name, has_dpa: !!r.has_dpa, signed: r.dpa_signed_date, expiry: r.dpa_expiry_date,
  }))
  const missing = recipients.filter((r) => !r.has_dpa).map((r) => r.name)
  const tokens = {
    orgName: dash(ctx.org.name),
    dpoName: dash(ctx.dpo?.name),
    dpoEmail: dash(ctx.dpo?.email),
    vendorsTable: recipients.length
      ? recipients.map((r) => `| ${r.name} | ${r.has_dpa ? 'יש' : 'אין'} | ${dash(r.signed)} | ${dash(r.expiry)} |`).join('\n')
      : '| (אין ספקים) | - | - | - |',
    missingList: missing.length ? missing.map((n) => `- ${n}`).join('\n') : 'אין - לכל הספקים קיים הסכם.',
  }
  return { tokens, inputs: { org: ctx.org.name, dpo: ctx.dpo, recipients } }
}

function bindDpoAppointment(ctx: RenderContext): Bound {
  const tokens = {
    orgName: dash(ctx.org.name),
    dpoName: dash(ctx.dpo?.name),
    dpoEmail: dash(ctx.dpo?.email),
    dpoLicense: dash(ctx.dpo?.license_number),
  }
  return { tokens, inputs: { org: ctx.org.name, dpo: ctx.dpo } }
}

function bindAssetDbDefinition(ctx: RenderContext): Bound {
  const assets = ctx.assets.map((a) => ({ name: dash(a.name) }))
  const security = asList(ctx.profile?.security_measures)
  const dataTypes = asList(ctx.profile?.data_types)
  const tokens = {
    orgName: dash(ctx.org.name),
    dpoName: dash(ctx.dpo?.name),
    assetsBlock: assets.length ? assets.map((a) => `### ${a.name}`).join('\n') : '(אין מאגרים מוגדרים)',
    securityMeasures: security.length ? security.map((m) => `- ${m}`).join('\n') : '-',
    dataTypes: dataTypes.length ? dataTypes.join(', ') : '-',
  }
  return { tokens, inputs: { org: ctx.org.name, dpo: ctx.dpo, assets, security, dataTypes } }
}

const BINDERS: Record<DocType, (ctx: RenderContext) => Bound> = {
  ropa: bindRopa,
  processor_agreement: bindDpa,
  dpo_appointment: bindDpoAppointment,
  asset_db_definition: bindAssetDbDefinition,
}

export const DOC_TYPES: DocType[] = ['ropa', 'processor_agreement', 'dpo_appointment', 'asset_db_definition']

export function renderDocument(docType: DocType, template: DocTemplate, ctx: RenderContext): RenderResult {
  const binder = BINDERS[docType]
  if (!binder) throw new Error(`unknown doc type: ${docType}`)
  const { tokens, inputs } = binder(ctx)
  const content = substitute(template.body, tokens)
  const fingerprint = hashStr(canonical(inputs) + '|' + template.templateId + '|' + String(template.version))
  return { content, fingerprint }
}

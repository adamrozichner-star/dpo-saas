/**
 * PII Guard — Detects and masks sensitive personal information before
 * sending messages to external LLMs. Unmasks on the way back.
 *
 * Designed for Israeli PII patterns (ת.ז, phone, credit card, bank, email).
 * Session-scoped: the mask map lives only during a single request lifecycle.
 */

// =============================================
// Types
// =============================================
export interface PIIMaskResult {
  masked: string
  map: Map<string, string>       // placeholder → original
  detectedTypes: PIIType[]
}

export type PIIType =
  | 'israeli_id'
  | 'credit_card'
  | 'phone'
  | 'bank_account'
  | 'passport'
  | 'email'

interface PIIPattern {
  type: PIIType
  regex: RegExp
  validate?: (match: string) => boolean
  label: string
}

// =============================================
// Israeli ID Check-Digit Validator (Luhn-variant)
// =============================================
function isValidIsraeliID(id: string): boolean {
  const cleaned = id.replace(/\D/g, '')
  if (cleaned.length !== 9) return false

  // Israeli ID uses a Luhn-like algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i]) * ((i % 2) + 1)
    if (digit > 9) digit -= 9
    sum += digit
  }
  return sum % 10 === 0
}

// =============================================
// Luhn Algorithm for Credit Cards
// =============================================
function isValidLuhn(num: string): boolean {
  const cleaned = num.replace(/\D/g, '')
  if (cleaned.length < 13 || cleaned.length > 19) return false

  let sum = 0
  let alternate = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned[i])
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

// =============================================
// PII Patterns
// =============================================
const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'israeli_id',
    // 9 consecutive digits, optionally separated by dashes
    // Preceded by ת.ז, ת"ז, תעודת זהות, ID, or standalone
    regex: /(?:ת\.?ז\.?|ת"ז|תעודת\s*זהות|מספר\s*זהות|ID\s*:?\s*)[\s\-:]*(\d[\d\-]{7,10}\d)/gi,
    // No validate needed - explicit context prefix makes intent clear
    label: 'תעודת זהות',
  },
  {
    type: 'israeli_id',
    // Standalone 9-digit number (only mask if valid check digit to reduce false positives)
    regex: /(?<!\d)(\d{9})(?!\d)/g,
    validate: (match) => isValidIsraeliID(match),
    label: 'תעודת זהות',
  },
  {
    type: 'credit_card',
    // 13-19 digits, optionally separated by spaces or dashes
    regex: /(?<!\d)(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7})(?!\d)/g,
    validate: (match) => isValidLuhn(match),
    label: 'כרטיס אשראי',
  },
  {
    type: 'phone',
    // Israeli mobile: 05X-XXXXXXX (with various separators)
    regex: /(?<!\d)(0[5][0-9][\s\-.]?\d{3}[\s\-.]?\d{4})(?!\d)/g,
    label: 'טלפון נייד',
  },
  {
    type: 'phone',
    // Israeli landline: 0X-XXXXXXX
    regex: /(?<!\d)(0[2-9][\s\-.]?\d{7})(?!\d)/g,
    label: 'טלפון',
  },
  {
    type: 'bank_account',
    // Israeli bank account: bank code (2 digits) + branch (3 digits) + account (6-9 digits)
    // Usually preceded by context words
    regex: /(?:חשבון\s*(?:בנק|מספר)?|bank\s*account)[\s\-:]*(\d{2}[\s\-]?\d{3}[\s\-]?\d{6,9})/gi,
    label: 'חשבון בנק',
  },
  {
    type: 'passport',
    // Israeli passport: 7-9 digits, preceded by context
    regex: /(?:דרכון|passport)[\s\-:]*(\d{7,9})/gi,
    label: 'דרכון',
  },
  {
    type: 'email',
    // Standard email pattern
    regex: /(?<![a-zA-Z0-9._%+\-])([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})(?![a-zA-Z0-9])/g,
    label: 'אימייל',
  },
]

// =============================================
// Counter for unique placeholders per request
// =============================================
let _counter = 0
function nextPlaceholder(type: PIIType): string {
  _counter++
  const typeTag = type.toUpperCase().replace(/_/g, '')
  return `[${typeTag}_${String(_counter).padStart(3, '0')}]`
}

// =============================================
// Core: Mask PII in text
// =============================================
export function maskPII(text: string): PIIMaskResult {
  _counter = 0
  const map = new Map<string, string>()
  const detectedTypes = new Set<PIIType>()
  let masked = text

  // Process each pattern
  for (const pattern of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0

    // Collect all matches first to avoid mutation during iteration
    const matches: { full: string; captured: string; index: number }[] = []
    let match: RegExpExecArray | null

    // Create a fresh regex to avoid shared state issues
    const freshRegex = new RegExp(pattern.regex.source, pattern.regex.flags)

    while ((match = freshRegex.exec(masked)) !== null) {
      const captured = match[1] || match[0]
      const cleaned = captured.replace(/[\s\-\.]/g, '')

      // Skip if validation fails
      if (pattern.validate && !pattern.validate(cleaned)) continue

      // Skip very short matches that are likely false positives
      if (pattern.type === 'israeli_id' && cleaned.length !== 9) continue

      // Skip if already masked (contains brackets)
      if (captured.includes('[') && captured.includes(']')) continue

      matches.push({ full: match[0], captured, index: match.index })
    }

    // Apply replacements in reverse order to preserve indices
    for (const m of matches.reverse()) {
      // Check if this value was already replaced by a previous pattern
      if (!masked.includes(m.full)) continue

      const placeholder = nextPlaceholder(pattern.type)
      map.set(placeholder, m.captured)
      detectedTypes.add(pattern.type)

      // Replace the captured group within the full match
      if (m.full !== m.captured) {
        const replaced = m.full.replace(m.captured, placeholder)
        masked = masked.replace(m.full, replaced)
      } else {
        masked = masked.replace(m.full, placeholder)
      }
    }
  }

  return {
    masked,
    map,
    detectedTypes: Array.from(detectedTypes),
  }
}

// =============================================
// Core: Unmask PII in AI response
// =============================================
export function unmaskPII(text: string, map: Map<string, string>): string {
  let unmasked = text

  for (const [placeholder, original] of map) {
    // Replace all occurrences (AI might repeat placeholders)
    while (unmasked.includes(placeholder)) {
      unmasked = unmasked.replace(placeholder, original)
    }
  }

  return unmasked
}

// =============================================
// Client-side: Quick check if text contains PII
// (lighter version for pre-send warnings)
// =============================================
export function detectPIITypes(text: string): PIIType[] {
  const detected = new Set<PIIType>()

  for (const pattern of PII_PATTERNS) {
    const freshRegex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let match: RegExpExecArray | null

    while ((match = freshRegex.exec(text)) !== null) {
      const captured = match[1] || match[0]
      const cleaned = captured.replace(/[\s\-\.]/g, '')

      if (pattern.validate && !pattern.validate(cleaned)) continue
      if (pattern.type === 'israeli_id' && cleaned.length !== 9) continue

      detected.add(pattern.type)
      break // One match per type is enough for detection
    }
  }

  return Array.from(detected)
}

// =============================================
// Human-readable PII type labels (Hebrew)
// =============================================
export function piiTypeLabel(type: PIIType): string {
  const labels: Record<PIIType, string> = {
    israeli_id: 'תעודת זהות',
    credit_card: 'כרטיס אשראי',
    phone: 'מספר טלפון',
    bank_account: 'חשבון בנק',
    passport: 'מספר דרכון',
    email: 'כתובת אימייל',
  }
  return labels[type] || type
}

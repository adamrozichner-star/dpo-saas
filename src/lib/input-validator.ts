/**
 * Input Validator - Sanitization, length limits, and prompt injection detection
 * for all user-facing text inputs before they reach the LLM.
 */

// =============================================
// Types
// =============================================
export interface ValidationResult {
  valid: boolean
  sanitized: string
  reason?: string
  reasonHe?: string
}

interface ValidationConfig {
  maxLength: number
  maxTokenEstimate: number
  allowHtml: boolean
  checkInjection: boolean
}

// =============================================
// Preset Configs
// =============================================
export const VALIDATION_CONFIGS = {
  chat: {
    maxLength: 2000,
    maxTokenEstimate: 700,
    allowHtml: false,
    checkInjection: true,
  },
  questionnaire: {
    maxLength: 500,
    maxTokenEstimate: 200,
    allowHtml: false,
    checkInjection: true,
  },
  contextual: {
    maxLength: 1000,
    maxTokenEstimate: 400,
    allowHtml: false,
    checkInjection: true,
  },
  documentEdit: {
    maxLength: 5000,
    maxTokenEstimate: 1700,
    allowHtml: false,
    checkInjection: false,
  },
} as const

// =============================================
// Prompt Injection Patterns
// =============================================
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?previous/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+a/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /\[system\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /pretend\s+(?:you(?:'re|\s+are)\s+)?(?:a|an|to\s+be)/i,
  /act\s+as\s+(?:if\s+)?(?:you(?:'re|\s+are)\s+)?/i,
  /from\s+now\s+on\s+you\s+are/i,
  /switch\s+to\s+.*mode/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /unrestricted\s+mode/i,
  /do\s+anything\s+now/i,
  /bypass\s+(?:your\s+)?(?:safety|filter|restriction)/i,
  /what\s+(?:is|are)\s+your\s+(?:system|initial)\s+(?:prompt|instructions)/i,
  /repeat\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions)/i,
  /show\s+me\s+your\s+(?:system\s+)?(?:prompt|rules|instructions)/i,
]

// =============================================
// Core: Validate input
// =============================================
export function validateInput(
  text: string,
  config: ValidationConfig = VALIDATION_CONFIGS.chat
): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, sanitized: '', reason: 'empty', reasonHe: '\u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e8\u05d9\u05e7\u05d4' }
  }

  let sanitized = text.trim()

  // Strip HTML if not allowed
  if (!config.allowHtml) {
    sanitized = sanitized
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
  }

  // Length check
  if (sanitized.length > config.maxLength) {
    return {
      valid: false,
      sanitized: sanitized.substring(0, config.maxLength),
      reason: 'too_long',
      reasonHe: `\u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d0\u05e8\u05d5\u05db\u05d4 \u05de\u05d3\u05d9 (${sanitized.length}/${config.maxLength})`,
    }
  }

  // Token estimate check (~3 chars per token for Hebrew)
  const estimatedTokens = Math.ceil(sanitized.length / 3)
  if (estimatedTokens > config.maxTokenEstimate) {
    return {
      valid: false,
      sanitized,
      reason: 'too_many_tokens',
      reasonHe: '\u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d0\u05e8\u05d5\u05db\u05d4 \u05de\u05d3\u05d9, \u05e0\u05e1\u05d4 \u05dc\u05e7\u05e6\u05e8',
    }
  }

  // Prompt injection detection (log, don't block)
  if (config.checkInjection) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        console.warn(`[INPUT_VALIDATOR] Injection pattern detected: ${pattern.source}`)
        break
      }
    }
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').replace(/\s{3,}/g, '  ')

  return { valid: true, sanitized }
}

// =============================================
// Check if message looks like prompt injection
// (for audit logging, not blocking)
// =============================================
export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(text))
}

/**
 * Rate Limiter — In-memory sliding window rate limiting for API routes.
 *
 * Vercel serverless functions may cold-start, resetting counts.
 * This is acceptable for v1 — prevents sustained abuse within a warm instance.
 * Upgrade path: Redis or Supabase-backed for persistence.
 */

// =============================================
// Types
// =============================================
interface RateLimitEntry {
  timestamps: number[]
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInMs: number
  limit: number
}

// =============================================
// Preset Configurations
// =============================================
export const RATE_LIMITS = {
  // Main chat: 15 per minute, 100 per hour
  chat: { maxRequests: 15, windowMs: 60_000 },
  chatHourly: { maxRequests: 100, windowMs: 3_600_000 },

  // Contextual chat (lighter): 10 per minute
  contextual: { maxRequests: 10, windowMs: 60_000 },

  // Questionnaire helper: 10 total per session (long window)
  questionnaire: { maxRequests: 10, windowMs: 3_600_000 },

  // Document generation: 5 per hour
  documentGen: { maxRequests: 5, windowMs: 3_600_000 },

  // Escalations already limited per quarter in business logic
  // This is a safety net: 5 per hour
  escalation: { maxRequests: 5, windowMs: 3_600_000 },
} as const

// =============================================
// In-Memory Store (per serverless instance)
// =============================================
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL = 300_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - 3_600_000 // Remove entries older than 1 hour
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  })
}

// =============================================
// Core: Check rate limit
// =============================================
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowStart = now - config.windowMs

  // Get or create entry
  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  // Check limit
  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const resetInMs = oldestInWindow + config.windowMs - now

    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, resetInMs),
      limit: config.maxRequests,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetInMs: config.windowMs,
    limit: config.maxRequests,
  }
}

// =============================================
// Convenience: Build rate limit key
// =============================================
export function rateLimitKey(orgId: string, endpoint: string): string {
  return `${endpoint}:${orgId}`
}

// =============================================
// Convenience: Check multiple limits at once
// Returns the most restrictive result
// =============================================
export function checkMultipleRateLimits(
  orgId: string,
  endpoint: string,
  configs: RateLimitConfig[]
): RateLimitResult {
  for (const config of configs) {
    const key = `${endpoint}:${config.windowMs}:${orgId}`
    const result = checkRateLimit(key, config)
    if (!result.allowed) return result
  }

  // All passed — return the first one's result
  const key = `${endpoint}:${configs[0].windowMs}:${orgId}`
  return checkRateLimit(key, configs[0])
}

// =============================================
// Abuse Detection: Duplicate message detection
// =============================================
const recentMessages = new Map<string, { messages: string[]; timestamps: number[] }>()

export function isDuplicateAbuse(orgId: string, message: string, maxDupes = 3, windowMs = 300_000): boolean {
  const now = Date.now()
  const key = `dupes:${orgId}`
  let entry = recentMessages.get(key)

  if (!entry) {
    entry = { messages: [], timestamps: [] }
    recentMessages.set(key, entry)
  }

  // Clean old entries
  const cutoff = now - windowMs
  const validIndices = entry.timestamps.map((t, i) => t > cutoff ? i : -1).filter(i => i >= 0)
  entry.messages = validIndices.map(i => entry!.messages[i])
  entry.timestamps = validIndices.map(i => entry!.timestamps[i])

  // Count duplicates of this exact message
  const normalizedMsg = message.trim().toLowerCase()
  const dupeCount = entry.messages.filter(m => m === normalizedMsg).length

  // Record this message
  entry.messages.push(normalizedMsg)
  entry.timestamps.push(now)

  return dupeCount >= maxDupes
}

// =============================================
// Rapid-fire detection: too many messages in short burst
// =============================================
export function isRapidFire(orgId: string, maxInBurst = 5, burstWindowMs = 10_000): boolean {
  const key = rateLimitKey(orgId, 'burst')
  const config = { maxRequests: maxInBurst, windowMs: burstWindowMs }
  const result = checkRateLimit(key, config)
  return !result.allowed
}

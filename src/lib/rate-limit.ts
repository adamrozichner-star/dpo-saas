// Simple in-memory rate limiter
// For production, replace with @upstash/ratelimit + Redis

const requests = new Map<string, { count: number; reset: number }>()

export function rateLimit(identifier: string, limit = 10, windowMs = 60000): { success: boolean; remaining: number } {
  const now = Date.now()
  const record = requests.get(identifier)

  if (!record || now > record.reset) {
    requests.set(identifier, { count: 1, reset: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: limit - record.count }
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    requests.forEach((value, key) => {
      if (now > value.reset) requests.delete(key)
    })
  }
  setInterval(cleanup, 5 * 60 * 1000)
}
